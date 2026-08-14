"""Admin-only endpoints: users, transactions, entitlements, waitlist, contact, generations, settings."""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Optional, List, Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, EmailStr
from bson import ObjectId


class UserRoleIn(BaseModel):
    role: Literal["customer", "admin"]


class ManualEntitlementIn(BaseModel):
    email: EmailStr
    product_slug: str = Field(min_length=1)
    note: Optional[str] = Field(default=None, max_length=280)


class SettingsIn(BaseModel):
    stripe_secret_key: Optional[str] = None
    stripe_publishable_key: Optional[str] = None
    stripe_webhook_secret: Optional[str] = None
    stripe_tax_mode: Optional[Literal["full", "calc_only", "diy"]] = None
    email_provider: Optional[Literal["console", "resend", "smtp"]] = None
    resend_api_key: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = Field(default=None, ge=1, le=65535)
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    email_from: Optional[str] = None
    email_from_name: Optional[str] = None


def _iso(x):
    return x.isoformat() if isinstance(x, datetime) else x


def build_admin_router(db, require_admin, audit):
    r = APIRouter()

    # ---------------- Users ----------------
    @r.get("/admin/users")
    async def list_users(user=Depends(require_admin), q: Optional[str] = None, limit: int = Query(200, le=500)):
        query = {}
        if q:
            import re
            rx = {"$regex": re.escape(q), "$options": "i"}
            query["$or"] = [{"email": rx}, {"name": rx}]
        out = []
        async for u in db.users.find(query).sort("created_at", -1).limit(limit):
            out.append({
                "id": str(u["_id"]),
                "email": u["email"],
                "name": u.get("name"),
                "role": u.get("role", "customer"),
                "created_at": _iso(u.get("created_at")),
            })
        return out

    @r.put("/admin/users/{user_id}/role")
    async def change_role(user_id: str, payload: UserRoleIn, user=Depends(require_admin)):
        try:
            oid = ObjectId(user_id)
        except Exception:
            raise HTTPException(400, "Invalid user id")
        target = await db.users.find_one({"_id": oid})
        if not target:
            raise HTTPException(404, "User not found")
        # Do not allow demoting yourself
        if str(target["_id"]) == user["id"] and payload.role != "admin":
            raise HTTPException(400, "You cannot demote yourself")
        await db.users.update_one({"_id": oid}, {"$set": {"role": payload.role}})
        await audit(user["id"], "user.role_change", user_id, {"new_role": payload.role, "email": target["email"]})
        return {"ok": True, "role": payload.role}

    @r.delete("/admin/users/{user_id}")
    async def delete_user(user_id: str, user=Depends(require_admin)):
        try:
            oid = ObjectId(user_id)
        except Exception:
            raise HTTPException(400, "Invalid user id")
        target = await db.users.find_one({"_id": oid})
        if not target:
            raise HTTPException(404, "User not found")
        if str(target["_id"]) == user["id"]:
            raise HTTPException(400, "You cannot delete yourself")
        await db.users.delete_one({"_id": oid})
        # Revoke their entitlements
        await db.entitlements.update_many({"user_id": user_id}, {"$set": {"active": False, "cancelled_at": datetime.now(timezone.utc)}})
        await audit(user["id"], "user.delete", user_id, {"email": target["email"]})
        return {"ok": True}

    # ---------------- Transactions ----------------
    @r.get("/admin/transactions")
    async def list_transactions(user=Depends(require_admin), limit: int = Query(200, le=1000)):
        out = []
        async for t in db.payment_transactions.find().sort("created_at", -1).limit(limit):
            t["id"] = str(t.pop("_id"))
            for k in ("created_at", "updated_at"):
                t[k] = _iso(t.get(k))
            # Look up user email
            uid = t.get("user_id")
            if uid:
                try:
                    u = await db.users.find_one({"_id": ObjectId(uid)}, {"email": 1})
                    t["user_email"] = u["email"] if u else None
                except Exception:
                    t["user_email"] = None
            out.append(t)
        return out

    # ---------------- Entitlements ----------------
    @r.get("/admin/entitlements")
    async def list_entitlements(user=Depends(require_admin), active: Optional[bool] = None):
        query = {}
        if active is not None:
            query["active"] = active
        out = []
        async for e in db.entitlements.find(query).sort("created_at", -1).limit(500):
            e["id"] = str(e.pop("_id"))
            for k in ("created_at", "cancelled_at"):
                e[k] = _iso(e.get(k))
            uid = e.get("user_id")
            if uid:
                try:
                    u = await db.users.find_one({"_id": ObjectId(uid)}, {"email": 1})
                    e["user_email"] = u["email"] if u else None
                except Exception:
                    e["user_email"] = None
            out.append(e)
        return out

    @r.post("/admin/entitlements", status_code=201)
    async def grant_entitlement(payload: ManualEntitlementIn, user=Depends(require_admin)):
        target = await db.users.find_one({"email": payload.email.lower().strip()})
        if not target:
            raise HTTPException(404, "User not found")
        if payload.product_slug != "__universal__":
            product = await db.products.find_one({"slug": payload.product_slug}, {"_id": 1})
            if not product:
                raise HTTPException(404, "Product not found")
        key = {
            "user_id": str(target["_id"]),
            "product_slug": payload.product_slug,
            "source": "manual",
            "granted_by": user["id"],
        }
        await db.entitlements.update_one(
            {"user_id": key["user_id"], "product_slug": key["product_slug"], "source": "manual"},
            {"$setOnInsert": {**key, "mode": "comp", "active": True,
                              "note": payload.note, "created_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
        await audit(user["id"], "entitlement.grant", str(target["_id"]),
                    {"email": payload.email, "slug": payload.product_slug})
        return {"ok": True}

    @r.post("/admin/entitlements/{ent_id}/revoke")
    async def revoke_entitlement(ent_id: str, user=Depends(require_admin)):
        try:
            oid = ObjectId(ent_id)
        except Exception:
            raise HTTPException(400, "Invalid id")
        result = await db.entitlements.update_one(
            {"_id": oid},
            {"$set": {"active": False, "cancelled_at": datetime.now(timezone.utc)}},
        )
        if result.matched_count == 0:
            raise HTTPException(404, "Not found")
        await audit(user["id"], "entitlement.revoke", ent_id)
        return {"ok": True}

    # ---------------- Waitlist ----------------
    @r.get("/admin/waitlist")
    async def list_waitlist(user=Depends(require_admin), limit: int = Query(500, le=2000)):
        out = []
        async for w in db.waitlist.find().sort("created_at", -1).limit(limit):
            w["id"] = str(w.pop("_id"))
            w["created_at"] = _iso(w.get("created_at"))
            out.append(w)
        return out

    # ---------------- Contact messages ----------------
    @r.get("/admin/contact-messages")
    async def list_contact(user=Depends(require_admin), limit: int = Query(200, le=1000)):
        out = []
        async for m in db.contact_messages.find().sort("created_at", -1).limit(limit):
            m["id"] = str(m.pop("_id"))
            m["created_at"] = _iso(m.get("created_at"))
            out.append(m)
        return out

    @r.delete("/admin/contact-messages/{msg_id}")
    async def delete_contact(msg_id: str, user=Depends(require_admin)):
        try:
            oid = ObjectId(msg_id)
        except Exception:
            raise HTTPException(400, "Invalid id")
        result = await db.contact_messages.delete_one({"_id": oid})
        if result.deleted_count == 0:
            raise HTTPException(404, "Not found")
        await audit(user["id"], "contact.delete", msg_id)
        return {"ok": True}

    # ---------------- AppForge generations ----------------
    @r.get("/admin/appforge-generations")
    async def list_generations(user=Depends(require_admin), limit: int = Query(200, le=1000)):
        out = []
        async for g in db.appforge_generations.find({}, {"files": 0}).sort("created_at", -1).limit(limit):
            g["id"] = str(g.pop("_id"))
            g["created_at"] = _iso(g.get("created_at"))
            uid = g.get("user_id")
            if uid:
                try:
                    u = await db.users.find_one({"_id": ObjectId(uid)}, {"email": 1})
                    g["user_email"] = u["email"] if u else None
                except Exception:
                    g["user_email"] = None
            out.append(g)
        return out

    # ---------------- Settings ----------------
    @r.get("/admin/settings")
    async def get_settings(user=Depends(require_admin)):
        doc = await db.settings.find_one({"_id": "singleton"}) or {}
        # Mask secrets for display
        def mask(v):
            if not v: return None
            v = str(v)
            if len(v) < 12: return "•" * len(v)
            return v[:6] + "…" + v[-4:]
        return {
            "stripe_secret_key_masked": mask(doc.get("stripe_secret_key")),
            "stripe_publishable_key": doc.get("stripe_publishable_key"),
            "stripe_webhook_secret_masked": mask(doc.get("stripe_webhook_secret")),
            "stripe_tax_mode": doc.get("stripe_tax_mode"),
            "stripe_mode": ("live" if str(doc.get("stripe_secret_key", "")).startswith("sk_live_") else "test"),
            "email_provider": doc.get("email_provider"),
            "resend_api_key_masked": mask(doc.get("resend_api_key")),
            "smtp_host": doc.get("smtp_host"),
            "smtp_port": doc.get("smtp_port"),
            "smtp_user": doc.get("smtp_user"),
            "email_from": doc.get("email_from"),
            "email_from_name": doc.get("email_from_name"),
            "updated_at": _iso(doc.get("updated_at")),
        }

    @r.put("/admin/settings")
    async def update_settings(payload: SettingsIn, user=Depends(require_admin)):
        import os
        data = {k: v for k, v in payload.model_dump().items() if v is not None and v != ""}
        if not data:
            raise HTTPException(400, "Nothing to update")
        # Reject non-Stripe-shaped secret keys to prevent accidental garbage
        sk = data.get("stripe_secret_key")
        if sk and not (sk.startswith("sk_live_") or sk.startswith("sk_test_")):
            raise HTTPException(400, "stripe_secret_key must start with sk_live_ or sk_test_")
        data["updated_at"] = datetime.now(timezone.utc)
        await db.settings.update_one({"_id": "singleton"}, {"$set": data}, upsert=True)
        # Live-apply to process env so it takes effect without restart
        env_map = {
            "stripe_secret_key": "STRIPE_SECRET_KEY",
            "stripe_publishable_key": "STRIPE_PUBLISHABLE_KEY",
            "stripe_webhook_secret": "STRIPE_WEBHOOK_SECRET",
            "stripe_tax_mode": "STRIPE_TAX_MODE",
            "resend_api_key": "RESEND_API_KEY",
            "smtp_host": "SMTP_HOST",
            "smtp_port": "SMTP_PORT",
            "smtp_user": "SMTP_USER",
            "smtp_password": "SMTP_PASSWORD",
            "email_from": "EMAIL_FROM",
            "email_from_name": "EMAIL_FROM_NAME",
        }
        for k, envk in env_map.items():
            if k in data:
                os.environ[envk] = str(data[k])
        # Re-init stripe SDK
        try:
            import stripe
            if os.environ.get("STRIPE_SECRET_KEY"):
                stripe.api_key = os.environ["STRIPE_SECRET_KEY"]
        except Exception:
            pass
        await audit(user["id"], "settings.update", "singleton", {"keys": list(data.keys())})
        return {"ok": True}

    return r


async def load_settings_into_env(db):
    """Load saved settings from DB into process env at startup (DB overrides .env)."""
    import os
    doc = await db.settings.find_one({"_id": "singleton"})
    if not doc:
        return
    mapping = {
        "stripe_secret_key": "STRIPE_SECRET_KEY",
        "stripe_publishable_key": "STRIPE_PUBLISHABLE_KEY",
        "stripe_webhook_secret": "STRIPE_WEBHOOK_SECRET",
        "stripe_tax_mode": "STRIPE_TAX_MODE",
        "resend_api_key": "RESEND_API_KEY",
        "smtp_host": "SMTP_HOST",
        "smtp_port": "SMTP_PORT",
        "smtp_user": "SMTP_USER",
        "smtp_password": "SMTP_PASSWORD",
        "email_from": "EMAIL_FROM",
        "email_from_name": "EMAIL_FROM_NAME",
    }
    for k, envk in mapping.items():
        if k in doc and doc[k]:
            os.environ[envk] = str(doc[k])
    try:
        import stripe
        if os.environ.get("STRIPE_SECRET_KEY"):
            stripe.api_key = os.environ["STRIPE_SECRET_KEY"]
    except Exception:
        pass
