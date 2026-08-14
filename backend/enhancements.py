"""Trillion AI Tech — Stripe payments, image uploads, analytics."""
from __future__ import annotations
import os
import base64
import io
import logging
import secrets
from datetime import datetime, timezone
from typing import Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, Request, Response, Query
from fastapi.responses import Response as FastResponse
from pydantic import BaseModel, Field, EmailStr

import stripe

logger = logging.getLogger("trillion.enhancements")

# Set Stripe API key
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY") or "sk_test_emergent"
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

# tax_mode: "full" = SMP (managed), "calc_only" = Stripe Tax, "diy" = no tax
TAX_MODE: Literal["full", "calc_only", "diy"] = os.environ.get("STRIPE_TAX_MODE", "full")  # US + digital → full

MAX_IMAGE_BYTES = 2 * 1024 * 1024  # 2 MB
ALLOWED_MIME = {"image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"}


# ---------------------------- Pydantic ----------------------------
class CheckoutRequest(BaseModel):
    product_slug: str = Field(min_length=1)
    origin_url: str = Field(min_length=1)


class UploadIn(BaseModel):
    filename: str = Field(min_length=1, max_length=200)
    content_type: str
    data_base64: str  # data URL or raw base64


class EventIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    props: Optional[dict] = None
    path: Optional[str] = None
    referrer: Optional[str] = None


# ---------------------------- Payments ----------------------------
def build_payments_router(db, get_optional_user, get_current_user, audit):
    r = APIRouter()

    @r.post("/payments/checkout")
    async def create_checkout(payload: CheckoutRequest, request: Request, user=Depends(get_optional_user)):
        product = await db.products.find_one({"slug": payload.product_slug})
        if not product:
            raise HTTPException(404, "Product not found")
        if product.get("status") in ("coming-soon", "retired", "maintenance"):
            raise HTTPException(400, "Product is not currently available for purchase")
        billing = product.get("billing_type") or "free"
        if billing == "free":
            raise HTTPException(400, "Product is free — no checkout required")

        # Prefer Stripe hosted Payment Link if configured (works with any Stripe account, no API key required)
        payment_link = product.get("payment_link")
        if payment_link:
            # Record intent; correlation via webhook when live API key is present, otherwise via manual reconciliation
            await db.payment_transactions.insert_one({
                "session_id": f"link_{secrets.token_urlsafe(10)}",
                "user_id": (user or {}).get("id"),
                "product_slug": payload.product_slug,
                "mode": "payment_link",
                "status": "initiated",
                "payment_status": "pending",
                "checkout_url": payment_link,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            })
            await audit((user or {}).get("id"), "payment.link_redirect", payload.product_slug,
                        {"slug": payload.product_slug})
            return {"checkout_url": payment_link, "mode": "payment_link"}

        # Fallback: dynamic Stripe Checkout Session (requires our own API key)
        lookup_key = product.get("stripe_lookup_key")
        if not lookup_key:
            raise HTTPException(400, "Product is not yet available for purchase (Stripe not configured)")
        prices = stripe.Price.list(lookup_keys=[lookup_key], active=True, limit=1).data
        if not prices:
            raise HTTPException(500, "Stripe price not found for this product")
        price = prices[0]
        mode = "subscription" if price.recurring else "payment"
        origin = payload.origin_url.rstrip("/")
        kwargs = dict(
            line_items=[{"price": price.id, "quantity": 1}],
            mode=mode,
            success_url=f"{origin}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{origin}/payment/cancel?slug={payload.product_slug}",
            metadata={
                "user_id": (user or {}).get("id", ""),
                "product_slug": payload.product_slug,
                "lookup_key": lookup_key,
            },
        )
        # tax handling
        if TAX_MODE == "full":
            try:
                session = stripe.checkout.Session.create(**kwargs, managed_payments={"enabled": True})
            except stripe.error.InvalidRequestError as e:
                msg = (getattr(e, "user_message", "") or "").lower()
                if "managed payments" in msg or "ineligible" in msg:
                    session = stripe.checkout.Session.create(
                        **kwargs, automatic_tax={"enabled": True}, billing_address_collection="required",
                    )
                else:
                    raise
        elif TAX_MODE == "calc_only":
            session = stripe.checkout.Session.create(
                **kwargs, automatic_tax={"enabled": True}, billing_address_collection="required",
            )
        else:
            session = stripe.checkout.Session.create(**kwargs)

        await db.payment_transactions.insert_one({
            "session_id": session.id,
            "user_id": (user or {}).get("id"),
            "product_slug": payload.product_slug,
            "lookup_key": lookup_key,
            "amount": (price.unit_amount or 0),
            "currency": price.currency,
            "mode": mode,
            "status": "initiated",
            "payment_status": "pending",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        })
        await audit((user or {}).get("id"), "payment.checkout_created", session.id,
                    {"slug": payload.product_slug, "lookup_key": lookup_key})
        return {"checkout_url": session.url, "session_id": session.id}

    @r.get("/payments/status/{session_id}")
    async def payment_status(session_id: str):
        record = await db.payment_transactions.find_one({"session_id": session_id})
        if not record:
            raise HTTPException(404, "Transaction not found")
        if record.get("payment_status") != "paid":
            try:
                s = stripe.checkout.Session.retrieve(session_id)
                if s.payment_status == "paid" or s.status == "complete":
                    await db.payment_transactions.update_one(
                        {"session_id": session_id, "payment_status": {"$ne": "paid"}},
                        {"$set": {
                            "status": "completed", "payment_status": "paid",
                            "stripe_subscription_id": s.subscription,
                            "stripe_payment_intent_id": s.payment_intent,
                            "updated_at": datetime.now(timezone.utc),
                        }},
                    )
                    await _apply_entitlement(db, session_id)
                    record = await db.payment_transactions.find_one({"session_id": session_id})
            except stripe.error.StripeError:
                pass
        return {
            "session_id": record["session_id"],
            "status": record["status"],
            "payment_status": record["payment_status"],
            "product_slug": record.get("product_slug"),
        }

    @r.post("/stripe/webhook")
    async def stripe_webhook(request: Request):
        payload = await request.body()
        sig = request.headers.get("stripe-signature", "")
        try:
            event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
        except stripe.error.SignatureVerificationError:
            raise HTTPException(400, "Invalid signature")
        obj, t = event["data"]["object"], event["type"]
        if t == "checkout.session.completed":
            await db.payment_transactions.update_one(
                {"session_id": obj["id"], "payment_status": {"$ne": "paid"}},
                {"$set": {
                    "status": "completed",
                    "payment_status": obj.get("payment_status", "paid"),
                    "stripe_subscription_id": obj.get("subscription"),
                    "stripe_payment_intent_id": obj.get("payment_intent"),
                    "updated_at": datetime.now(timezone.utc),
                }},
            )
            await _apply_entitlement(db, obj["id"])
        elif t == "checkout.session.async_payment_succeeded":
            await db.payment_transactions.update_one(
                {"session_id": obj["id"]},
                {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc)}},
            )
            await _apply_entitlement(db, obj["id"])
        elif t == "checkout.session.async_payment_failed":
            await db.payment_transactions.update_one(
                {"session_id": obj["id"]},
                {"$set": {"status": "failed", "payment_status": "failed",
                          "updated_at": datetime.now(timezone.utc)}},
            )
        elif t == "checkout.session.expired":
            await db.payment_transactions.update_one(
                {"session_id": obj["id"]},
                {"$set": {"status": "expired", "payment_status": "expired",
                          "updated_at": datetime.now(timezone.utc)}},
            )
        elif t == "charge.refunded":
            await db.payment_transactions.update_one(
                {"stripe_payment_intent_id": obj.get("payment_intent")},
                {"$set": {"status": "refunded", "payment_status": "refunded",
                          "updated_at": datetime.now(timezone.utc)}},
            )
        elif t == "customer.subscription.deleted":
            await db.entitlements.update_many(
                {"stripe_subscription_id": obj["id"]},
                {"$set": {"active": False, "cancelled_at": datetime.now(timezone.utc)}},
            )
        return {"status": "ok"}

    @r.get("/account/entitlements")
    async def my_entitlements(user=Depends(get_current_user)):
        cursor = db.entitlements.find({"user_id": user["id"], "active": True})
        out = []
        async for e in cursor:
            e["id"] = str(e.pop("_id"))
            for k in ("created_at", "cancelled_at"):
                if isinstance(e.get(k), datetime):
                    e[k] = e[k].isoformat()
            out.append(e)
        return out

    @r.get("/account/transactions")
    async def my_transactions(user=Depends(get_current_user)):
        cursor = db.payment_transactions.find({"user_id": user["id"]}).sort("created_at", -1).limit(50)
        out = []
        async for t in cursor:
            t["id"] = str(t.pop("_id"))
            if isinstance(t.get("created_at"), datetime):
                t["created_at"] = t["created_at"].isoformat()
            if isinstance(t.get("updated_at"), datetime):
                t["updated_at"] = t["updated_at"].isoformat()
            out.append(t)
        return out

    return r


async def _apply_entitlement(db, session_id: str):
    """Grant a durable entitlement for a paid session. Idempotent."""
    txn = await db.payment_transactions.find_one({"session_id": session_id})
    if not txn or txn.get("payment_status") != "paid":
        return
    if not txn.get("user_id") or not txn.get("product_slug"):
        return
    key = {"user_id": txn["user_id"], "product_slug": txn["product_slug"], "session_id": session_id}
    await db.entitlements.update_one(
        key,
        {"$setOnInsert": {
            **key,
            "mode": txn.get("mode"),
            "lookup_key": txn.get("lookup_key"),
            "stripe_subscription_id": txn.get("stripe_subscription_id"),
            "stripe_payment_intent_id": txn.get("stripe_payment_intent_id"),
            "active": True,
            "created_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )


# ---------------------------- Uploads ----------------------------
def build_uploads_router(db, require_admin, audit):
    r = APIRouter()

    @r.post("/admin/uploads")
    async def upload_image(payload: UploadIn, user=Depends(require_admin)):
        raw = payload.data_base64
        if raw.startswith("data:"):
            # data:image/png;base64,XXXX
            try:
                _, b64 = raw.split(",", 1)
            except ValueError:
                raise HTTPException(400, "Invalid data URL")
        else:
            b64 = raw
        try:
            binary = base64.b64decode(b64, validate=True)
        except Exception:
            raise HTTPException(400, "Invalid base64 data")
        if len(binary) > MAX_IMAGE_BYTES:
            raise HTTPException(413, "Image exceeds 2 MB limit")
        content_type = (payload.content_type or "").lower()
        if content_type not in ALLOWED_MIME:
            raise HTTPException(415, f"Unsupported image type: {content_type}")
        upload_id = secrets.token_urlsafe(12)
        await db.uploads.insert_one({
            "upload_id": upload_id,
            "filename": payload.filename[:200],
            "content_type": content_type,
            "size": len(binary),
            "data": binary,
            "uploaded_by": user["id"],
            "created_at": datetime.now(timezone.utc),
        })
        await audit(user["id"], "upload.create", upload_id, {"filename": payload.filename, "size": len(binary)})
        return {"upload_id": upload_id, "url": f"/api/uploads/{upload_id}"}

    return r


def build_public_uploads_router(db):
    r = APIRouter()

    @r.get("/uploads/{upload_id}")
    async def get_upload(upload_id: str):
        doc = await db.uploads.find_one({"upload_id": upload_id})
        if not doc:
            raise HTTPException(404, "Not found")
        return FastResponse(
            content=doc["data"],
            media_type=doc["content_type"],
            headers={
                "Cache-Control": "public, max-age=31536000, immutable",
                "Content-Length": str(len(doc["data"])),
            },
        )

    return r


# ---------------------------- Analytics ----------------------------
def build_analytics_router(db, get_optional_user, require_admin):
    r = APIRouter()

    ALLOWED_EVENTS = {
        "page_view", "product_view", "product_launch", "signup",
        "login", "waitlist_join", "checkout_start", "checkout_success",
        "search",
    }

    @r.post("/events")
    async def track_event(payload: EventIn, request: Request, user=Depends(get_optional_user)):
        # Whitelist events to prevent abuse
        if payload.name not in ALLOWED_EVENTS:
            return {"ok": True}  # silently accept unknown to avoid probing
        # Bound props size to avoid abuse
        props = payload.props or {}
        if len(str(props)) > 2000:
            props = {}
        # Truncate paths/referrers
        path = (payload.path or "")[:200]
        referrer = (payload.referrer or "")[:200]
        await db.events.insert_one({
            "name": payload.name,
            "props": props,
            "path": path,
            "referrer": referrer,
            "user_id": (user or {}).get("id"),
            "ua": (request.headers.get("user-agent") or "")[:200],
            "created_at": datetime.now(timezone.utc),
        })
        return {"ok": True}

    @r.get("/admin/analytics")
    async def analytics(user=Depends(require_admin), days: int = Query(14, ge=1, le=90)):
        from datetime import timedelta
        since = datetime.now(timezone.utc) - timedelta(days=days)
        pipeline_by_name = [
            {"$match": {"created_at": {"$gte": since}}},
            {"$group": {"_id": "$name", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        pipeline_top_products = [
            {"$match": {"name": "product_view", "created_at": {"$gte": since}}},
            {"$group": {"_id": "$props.slug", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10},
        ]
        pipeline_daily = [
            {"$match": {"created_at": {"$gte": since}}},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "count": {"$sum": 1},
            }},
            {"$sort": {"_id": 1}},
        ]
        by_name = [x async for x in db.events.aggregate(pipeline_by_name)]
        top_products = [x async for x in db.events.aggregate(pipeline_top_products)]
        daily = [x async for x in db.events.aggregate(pipeline_daily)]
        totals = {
            "events_total": await db.events.count_documents({"created_at": {"$gte": since}}),
            "signups": await db.events.count_documents({"name": "signup", "created_at": {"$gte": since}}),
            "waitlist_joins": await db.events.count_documents({"name": "waitlist_join", "created_at": {"$gte": since}}),
            "checkout_starts": await db.events.count_documents({"name": "checkout_start", "created_at": {"$gte": since}}),
            "product_views": await db.events.count_documents({"name": "product_view", "created_at": {"$gte": since}}),
        }
        return {
            "days": days,
            "totals": totals,
            "by_name": [{"name": r["_id"], "count": r["count"]} for r in by_name if r["_id"]],
            "top_products": [{"slug": r["_id"], "count": r["count"]} for r in top_products if r["_id"]],
            "daily": [{"day": r["_id"], "count": r["count"]} for r in daily],
        }

    return r
