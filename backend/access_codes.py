"""God-mode access codes.

Codes let the admin grant free/comp access to specific products (or ALL products).
Rules:
- Admins always have access to everything (bypassed at check time — no code needed).
- Codes can be universal (all products) or product-scoped.
- Codes are reusable up to `max_redemptions` (default 1). One redemption per user.
- Codes can be revoked; revoked codes cannot be redeemed but existing redemptions remain valid.
- Redeeming a code creates an active entitlement for the user.
"""
from __future__ import annotations
import secrets
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field


class AccessCodeIn(BaseModel):
    label: str = Field(min_length=1, max_length=80)
    scope: str = Field(default="universal")  # "universal" | "product"
    product_slugs: List[str] = Field(default_factory=list)
    max_redemptions: int = Field(default=1, ge=1, le=10000)
    note: Optional[str] = Field(default=None, max_length=280)


class RedeemIn(BaseModel):
    code: str = Field(min_length=4, max_length=64)


def _generate_code() -> str:
    # 12-char human-friendly code: TRILLION-XXXX-XXXX
    alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
    part = lambda: "".join(secrets.choice(alphabet) for _ in range(4))
    return f"TAT-{part()}-{part()}"


def build_access_codes_router(db, get_current_user, require_admin, audit):
    r = APIRouter()

    @r.post("/admin/access-codes", status_code=201)
    async def create_code(payload: AccessCodeIn, user=Depends(require_admin)):
        if payload.scope not in ("universal", "product"):
            raise HTTPException(400, "scope must be 'universal' or 'product'")
        if payload.scope == "product" and not payload.product_slugs:
            raise HTTPException(400, "product_slugs required for product-scoped codes")
        # Validate product slugs exist
        for slug in payload.product_slugs:
            if not await db.products.find_one({"slug": slug}, {"_id": 1}):
                raise HTTPException(400, f"Unknown product: {slug}")
        code = _generate_code()
        doc = {
            "code": code,
            "label": payload.label.strip(),
            "scope": payload.scope,
            "product_slugs": payload.product_slugs,
            "max_redemptions": payload.max_redemptions,
            "redemptions": 0,
            "note": payload.note,
            "revoked": False,
            "created_by": user["id"],
            "created_at": datetime.now(timezone.utc),
        }
        await db.access_codes.insert_one(doc)
        await audit(user["id"], "access_code.create", code, {"scope": payload.scope, "slugs": payload.product_slugs})
        doc["id"] = str(doc.pop("_id"))
        doc["created_at"] = doc["created_at"].isoformat()
        return doc

    @r.get("/admin/access-codes")
    async def list_codes(user=Depends(require_admin)):
        out = []
        async for d in db.access_codes.find().sort("created_at", -1).limit(200):
            d["id"] = str(d.pop("_id"))
            if isinstance(d.get("created_at"), datetime):
                d["created_at"] = d["created_at"].isoformat()
            out.append(d)
        return out

    @r.post("/admin/access-codes/{code}/revoke")
    async def revoke_code(code: str, user=Depends(require_admin)):
        result = await db.access_codes.update_one({"code": code}, {"$set": {"revoked": True}})
        if result.matched_count == 0:
            raise HTTPException(404, "Code not found")
        await audit(user["id"], "access_code.revoke", code)
        return {"ok": True}

    @r.post("/redeem")
    async def redeem(payload: RedeemIn, user=Depends(get_current_user)):
        code = payload.code.strip().upper()
        doc = await db.access_codes.find_one({"code": code})
        if not doc or doc.get("revoked"):
            raise HTTPException(404, "Invalid or revoked code")
        if doc.get("redemptions", 0) >= doc.get("max_redemptions", 1):
            raise HTTPException(410, "This code has reached its redemption limit")
        # already redeemed by this user?
        already = await db.code_redemptions.find_one({"code": code, "user_id": user["id"]})
        if already:
            raise HTTPException(409, "You have already redeemed this code")
        # Determine which products to unlock
        if doc["scope"] == "universal":
            products = [p async for p in db.products.find({}, {"slug": 1})]
            slugs = [p["slug"] for p in products]
        else:
            slugs = doc.get("product_slugs", [])

        now = datetime.now(timezone.utc)
        # Grant entitlements
        for slug in slugs:
            key = {"user_id": user["id"], "product_slug": slug, "source": "access_code", "code": code}
            await db.entitlements.update_one(
                key,
                {"$setOnInsert": {**key, "mode": "comp", "active": True, "created_at": now}},
                upsert=True,
            )
        # Log redemption + increment counter atomically
        await db.code_redemptions.insert_one({
            "code": code, "user_id": user["id"], "granted_slugs": slugs,
            "created_at": now,
        })
        await db.access_codes.update_one({"code": code}, {"$inc": {"redemptions": 1}})
        await audit(user["id"], "access_code.redeem", code, {"slugs": slugs})
        return {"ok": True, "granted_products": slugs, "scope": doc["scope"]}

    return r


async def user_has_access(db, user: Optional[dict], product_slug: str) -> bool:
    """Server-side access check. Admin bypasses everything."""
    if not user:
        return False
    if user.get("role") == "admin":
        return True
    # Direct product entitlement OR universal access code — both must be active
    e = await db.entitlements.find_one({
        "user_id": user["id"],
        "active": True,
        "$or": [
            {"product_slug": product_slug},
            {"product_slug": "__universal__"},
        ],
    })
    return e is not None
