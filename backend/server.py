from dotenv import load_dotenv
load_dotenv()

import os
import re
import jwt
import bcrypt
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Literal
from contextlib import asynccontextmanager

from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response, status, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from pydantic import BaseModel, EmailStr, Field, field_validator

from email_service import send_email, render_email
from enhancements import (
    build_payments_router,
    build_uploads_router,
    build_public_uploads_router,
    build_analytics_router,
)

# ------------------------------------------------------------
# Configuration
# ------------------------------------------------------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@trillionaitech.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")

# ------------------------------------------------------------
# DB
# ------------------------------------------------------------
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ------------------------------------------------------------
# Password + JWT helpers
# ------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=60),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=3600, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=604800, path="/")

def clear_auth_cookies(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")

# ------------------------------------------------------------
# Auth dependency
# ------------------------------------------------------------
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        try:
            uid = ObjectId(payload["sub"])
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid token subject")
        user = await db.users.find_one({"_id": uid})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["id"] = str(user.pop("_id"))
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_optional_user(request: Request) -> Optional[dict]:
    try:
        return await get_current_user(request)
    except HTTPException:
        return None

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ------------------------------------------------------------
# Models
# ------------------------------------------------------------
Category = Literal["apps", "agents", "tools", "software", "games"]
ProductStatus = Literal["active", "coming-soon", "beta", "maintenance", "retired"]
BillingType = Literal["free", "one-time", "monthly", "annual"]

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=100)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ForgotPassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    token: str
    password: str = Field(min_length=8, max_length=128)

class ProductIn(BaseModel):
    slug: str = Field(min_length=2, max_length=80)
    name: str = Field(min_length=1, max_length=120)
    short_description: str = Field(min_length=1, max_length=280)
    description: str = Field(default="", max_length=8000)
    category: Category
    subcategory: Optional[str] = None
    status: ProductStatus = "coming-soon"
    featured: bool = False
    image: Optional[str] = None
    logo: Optional[str] = None
    screenshots: List[str] = []
    features: List[str] = []
    billing_type: BillingType = "free"
    price: Optional[float] = None
    currency: str = "USD"
    stripe_product_id: Optional[str] = None
    stripe_price_id: Optional[str] = None
    external_url: Optional[str] = None
    demo_url: Optional[str] = None
    documentation_url: Optional[str] = None
    github_url: Optional[str] = None
    release_date: Optional[str] = None
    version: Optional[str] = None
    tags: List[str] = []
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None

    @field_validator("slug")
    @classmethod
    def slug_format(cls, v: str) -> str:
        v = v.lower().strip()
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", v):
            raise ValueError("slug must be lowercase kebab-case (a-z, 0-9, hyphens)")
        return v

class WaitlistIn(BaseModel):
    email: EmailStr
    product_slug: Optional[str] = None
    source: Optional[str] = None

class ContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    subject: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1, max_length=4000)

# ------------------------------------------------------------
# Serialization
# ------------------------------------------------------------
def product_out(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    doc.pop("created_by", None)
    for k in ("created_at", "updated_at"):
        v = doc.get(k)
        if isinstance(v, datetime):
            doc[k] = v.isoformat()
    return doc

def public_user(user: dict) -> dict:
    return {"id": user["id"], "email": user["email"], "name": user.get("name"), "role": user.get("role", "customer")}

# ------------------------------------------------------------
# Audit log
# ------------------------------------------------------------
async def audit(actor_id: Optional[str], action: str, target: Optional[str] = None, meta: Optional[dict] = None):
    await db.audit_logs.insert_one({
        "actor_id": actor_id,
        "action": action,
        "target": target,
        "meta": meta or {},
        "created_at": datetime.now(timezone.utc),
    })

# ------------------------------------------------------------
# Brute-force protection
# ------------------------------------------------------------
async def check_lockout(identifier: str):
    doc = await db.login_attempts.find_one({"identifier": identifier})
    if doc and doc.get("count", 0) >= 5:
        last = doc.get("last_attempt")
        if last is not None:
            if last.tzinfo is None:
                last = last.replace(tzinfo=timezone.utc)
            if (datetime.now(timezone.utc) - last) < timedelta(minutes=15):
                raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")
        await db.login_attempts.delete_one({"identifier": identifier})

async def record_failed(identifier: str):
    await db.login_attempts.update_one(
        {"identifier": identifier},
        {"$inc": {"count": 1}, "$set": {"last_attempt": datetime.now(timezone.utc)}},
        upsert=True,
    )

async def clear_failed(identifier: str):
    await db.login_attempts.delete_one({"identifier": identifier})

# ------------------------------------------------------------
# Startup: indexes + admin seed + product seed
# ------------------------------------------------------------
SEED_PRODUCTS = [
    {
        "slug": "appforge",
        "name": "AppForge",
        "short_description": "AI-assisted application development platform with automated deployment pipelines.",
        "description": "AppForge is a full-stack application platform that blends AI-assisted coding with production-grade deployment pipelines. Ship faster with generated scaffolding, integrated observability, and zero-config infra.",
        "category": "apps",
        "status": "beta",
        "featured": True,
        "features": ["AI code generation", "One-click deploy", "Integrated observability", "Zero-config databases"],
        "billing_type": "monthly",
        "price": 29.0,
        "tags": ["ai", "development", "platform"],
        "version": "0.9.0",
        "image": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=srgb&fm=jpg&q=85",
    },
    {
        "slug": "signal-desk",
        "name": "Signal Desk",
        "short_description": "Workbench for supervised AI agents with transparent execution and approval gates.",
        "description": "Signal Desk gives teams full visibility into what autonomous agents are doing. Every action is logged, previewed, and gate-checked before running.",
        "category": "agents",
        "status": "coming-soon",
        "featured": True,
        "features": ["Step-by-step execution", "Approval gates", "Full audit trail", "Multi-agent orchestration"],
        "billing_type": "monthly",
        "price": 49.0,
        "tags": ["agents", "workflow", "governance"],
    },
    {
        "slug": "autoflow-agent",
        "name": "AutoFlow Agent",
        "short_description": "Autonomous workflow automation for repetitive tasks with human oversight.",
        "description": "Deploy AutoFlow to eliminate repetitive work. Connect your stack, define outcomes, and let the agent handle the rest — with human checkpoints when it matters.",
        "category": "agents",
        "status": "active",
        "featured": True,
        "features": ["100+ integrations", "Human-in-the-loop", "Real-time dashboards", "Custom skills"],
        "billing_type": "monthly",
        "price": 39.0,
        "tags": ["automation", "ai", "workflow"],
    },
    {
        "slug": "devtoolkit-pro",
        "name": "DevToolkit Pro",
        "short_description": "Essential developer utilities and code generation tools for modern software.",
        "description": "A precision toolkit for engineers: schema generators, migration helpers, log explorers, and a fast CLI that plugs into your existing workflow.",
        "category": "tools",
        "status": "active",
        "featured": False,
        "features": ["Schema tools", "Log explorer", "Fast CLI", "IDE plugins"],
        "billing_type": "one-time",
        "price": 79.0,
        "tags": ["developer", "cli", "productivity"],
    },
    {
        "slug": "studio-suite",
        "name": "Studio Suite",
        "short_description": "Creative software suite for digital content creation with AI enhancement.",
        "description": "Studio Suite pairs a modern design surface with AI-native tools for image, video, and copy work. Built for small teams shipping brand-quality output.",
        "category": "software",
        "status": "coming-soon",
        "featured": True,
        "features": ["AI image tools", "Vector + raster", "Team libraries", "Version history"],
        "billing_type": "annual",
        "price": 199.0,
        "tags": ["creative", "design", "ai"],
    },
    {
        "slug": "nodefall",
        "name": "Nodefall",
        "short_description": "Grid-based reaction game about reading patterns under pressure.",
        "description": "Nodefall is a minimal, addictive reaction game about pattern-recognition. Simple mechanics, escalating chaos, endless replay.",
        "category": "games",
        "status": "active",
        "featured": True,
        "features": ["Endless mode", "Global leaderboards", "60fps play", "One-tap controls"],
        "billing_type": "free",
        "price": 0.0,
        "tags": ["puzzle", "arcade", "reaction"],
    },
    {
        "slug": "quantum-shift",
        "name": "Quantum Shift",
        "short_description": "Mind-bending puzzle platformer that plays with time and space.",
        "description": "Rewind, fork, and phase-shift your way through 60 hand-crafted levels. Quantum Shift respects your intelligence.",
        "category": "games",
        "status": "coming-soon",
        "featured": False,
        "features": ["Time rewind mechanic", "60 levels", "Original score", "Speed-run mode"],
        "billing_type": "one-time",
        "price": 19.0,
        "tags": ["puzzle", "platformer", "sci-fi"],
    },
    {
        "slug": "research-assistant",
        "name": "Research Assistant",
        "short_description": "AI companion that gathers, organizes, and synthesizes information.",
        "description": "A model-driven research workspace: source capture, structured notes, cross-referenced summaries. Ship briefs 5× faster.",
        "category": "agents",
        "status": "coming-soon",
        "featured": False,
        "features": ["Source capture", "Structured notes", "Auto-summaries", "Cite-as-you-go"],
        "billing_type": "monthly",
        "price": 19.0,
        "tags": ["research", "writing", "ai"],
    },
    {
        "slug": "codestream",
        "name": "CodeStream",
        "short_description": "Real-time collaborative code editor with AI pair programming.",
        "description": "CodeStream brings the pair-programming feel back to distributed teams — with an AI partner that never sleeps.",
        "category": "tools",
        "status": "coming-soon",
        "featured": False,
        "features": ["Live cursors", "AI review", "Instant sandboxes", "Git-native"],
        "billing_type": "monthly",
        "price": 15.0,
        "tags": ["collaboration", "editor", "ai"],
    },
    {
        "slug": "dataviz-pro",
        "name": "DataViz Pro",
        "short_description": "Professional data visualization and analytics for business intelligence.",
        "description": "Explore, model, and share data at production scale. DataViz Pro sits on top of your warehouse and turns questions into dashboards in minutes.",
        "category": "software",
        "status": "coming-soon",
        "featured": False,
        "features": ["Warehouse-native", "Live dashboards", "SQL + no-code", "Row-level security"],
        "billing_type": "annual",
        "price": 349.0,
        "tags": ["analytics", "visualization", "bi"],
    },
]

async def seed_products():
    for p in SEED_PRODUCTS:
        doc = dict(p)
        doc.setdefault("subcategory", None)
        doc.setdefault("image", None)
        doc.setdefault("logo", None)
        doc.setdefault("screenshots", [])
        doc.setdefault("currency", "USD")
        doc.setdefault("stripe_product_id", None)
        doc.setdefault("stripe_price_id", None)
        doc.setdefault("external_url", None)
        doc.setdefault("demo_url", None)
        doc.setdefault("documentation_url", None)
        doc.setdefault("github_url", None)
        doc.setdefault("release_date", None)
        doc.setdefault("version", None)
        doc.setdefault("seo_title", None)
        doc.setdefault("seo_description", None)
        doc["updated_at"] = datetime.now(timezone.utc)
        doc["created_at"] = datetime.now(timezone.utc)
        # Only insert if slug doesn't exist — never overwrite admin edits on restart
        await db.products.update_one(
            {"slug": doc["slug"]},
            {"$setOnInsert": doc},
            upsert=True,
        )

async def seed_admin():
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if existing is None:
        await db.users.insert_one({
            "email": ADMIN_EMAIL.lower(),
            "password_hash": hash_password(ADMIN_PASSWORD),
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc),
        })
    elif not verify_password(ADMIN_PASSWORD, existing["password_hash"]):
        await db.users.update_one(
            {"email": ADMIN_EMAIL.lower()},
            {"$set": {"password_hash": hash_password(ADMIN_PASSWORD), "role": "admin"}},
        )

@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.users.create_index("email", unique=True)
    await db.products.create_index("slug", unique=True)
    await db.products.create_index("category")
    await db.products.create_index("status")
    await db.products.create_index([("featured", -1), ("created_at", -1)])
    await db.login_attempts.create_index("identifier")
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.waitlist.create_index([("email", 1), ("product_slug", 1)], unique=True)
    await db.audit_logs.create_index("created_at")
    await db.payment_transactions.create_index("session_id", unique=True)
    await db.payment_transactions.create_index("user_id")
    await db.entitlements.create_index([("user_id", 1), ("product_slug", 1), ("session_id", 1)], unique=True)
    await db.entitlements.create_index("user_id")
    await db.uploads.create_index("upload_id", unique=True)
    await db.events.create_index("created_at")
    await db.events.create_index([("name", 1), ("created_at", -1)])
    await seed_admin()
    await seed_products()
    yield
    client.close()

app = FastAPI(title="Trillion AI Tech API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "https://trillionaitech.com"],
    allow_origin_regex=r"https://.*\.emergentagent\.com|https://.*\.preview\.emergentagent\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def security_headers(request: Request, call_next):
    resp = await call_next(request)
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    resp.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return resp

import logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("trillion")

@app.exception_handler(Exception)
async def catch_all(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

api = APIRouter(prefix="/api")

# ------------------------------------------------------------
# Health
# ------------------------------------------------------------
@api.get("/")
async def root():
    return {"service": "Trillion AI Tech API", "status": "ok"}

@api.get("/health")
async def health():
    try:
        await db.command("ping")
        return {"status": "ok", "db": "connected"}
    except Exception:
        raise HTTPException(status_code=503, detail="Database unavailable")

# ------------------------------------------------------------
# Auth
# ------------------------------------------------------------
@api.post("/auth/register")
async def register(payload: UserRegister, request: Request, response: Response):
    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Account with this email already exists")
    result = await db.users.insert_one({
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": payload.name.strip(),
        "role": "customer",
        "created_at": datetime.now(timezone.utc),
    })
    uid = str(result.inserted_id)
    access = create_access_token(uid, email, "customer")
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    await audit(uid, "user.register", uid, {"email": email})
    return {"id": uid, "email": email, "name": payload.name, "role": "customer", "access_token": access}

@api.post("/auth/login")
async def login(payload: UserLogin, request: Request, response: Response):
    email = payload.email.lower().strip()
    # Account lockout keyed on email only (works behind rotating proxy IPs)
    identifier = f"email:{email}"
    await check_lockout(identifier)
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        await record_failed(identifier)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await clear_failed(identifier)
    uid = str(user["_id"])
    role = user.get("role", "customer")
    access = create_access_token(uid, email, role)
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    await audit(uid, "user.login", uid)
    return {"id": uid, "email": email, "name": user.get("name"), "role": role, "access_token": access}

@api.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
    await audit(user["id"], "user.logout", user["id"])
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)

@api.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    tok = request.cookies.get("refresh_token")
    if not tok:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(tok, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(str(user["_id"]), user["email"], user.get("role", "customer"))
        response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=3600, path="/")
        return {"ok": True}
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@api.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPassword, background: BackgroundTasks):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "user_id": str(user["_id"]),
            "token": token,
            "used": False,
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
            "created_at": datetime.now(timezone.utc),
        })
        reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
        html = render_email(
            heading="Reset your password",
            body_html=(
                "Someone (hopefully you) requested a password reset for your Trillion AI Tech account. "
                "Click the button below to choose a new password. This link expires in 60 minutes."
            ),
            cta_url=reset_url,
            cta_label="Reset password",
        )
        text = f"Reset your Trillion AI Tech password: {reset_url}\nThis link expires in 60 minutes."
        background.add_task(send_email, email, "Reset your Trillion AI Tech password", html, text)
        logger.info("[password reset] issued for %s", email)
    return {"ok": True, "message": "If this email exists, a reset link was sent."}

@api.post("/auth/reset-password")
async def reset_password(payload: ResetPassword):
    doc = await db.password_reset_tokens.find_one({"token": payload.token, "used": False})
    if not doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    if doc["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token expired")
    await db.users.update_one({"_id": ObjectId(doc["user_id"])}, {"$set": {"password_hash": hash_password(payload.password)}})
    await db.password_reset_tokens.update_one({"_id": doc["_id"]}, {"$set": {"used": True}})
    await audit(doc["user_id"], "user.reset_password", doc["user_id"])
    return {"ok": True}

# ------------------------------------------------------------
# Products (public)
# ------------------------------------------------------------
@api.get("/products")
async def list_products(
    category: Optional[str] = None,
    status_: Optional[str] = Query(None, alias="status"),
    featured: Optional[bool] = None,
    q: Optional[str] = None,
    limit: int = Query(100, ge=1, le=200),
):
    query: dict = {}
    if category:
        query["category"] = category
    if status_:
        query["status"] = status_
    if featured is not None:
        query["featured"] = featured
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [{"name": rx}, {"short_description": rx}, {"description": rx}, {"tags": rx}]
    cursor = db.products.find(query).sort([("featured", -1), ("created_at", -1)]).limit(limit)
    return [product_out(d) async for d in cursor]

@api.get("/products/{slug}")
async def get_product(slug: str):
    doc = await db.products.find_one({"slug": slug})
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    return product_out(doc)

# ------------------------------------------------------------
# Products (admin)
# ------------------------------------------------------------
@api.post("/admin/products", status_code=201)
async def create_product(payload: ProductIn, user: dict = Depends(require_admin)):
    if await db.products.find_one({"slug": payload.slug}):
        raise HTTPException(status_code=409, detail="Product slug already exists")
    doc = payload.model_dump()
    doc["created_at"] = datetime.now(timezone.utc)
    doc["updated_at"] = datetime.now(timezone.utc)
    doc["created_by"] = user["id"]
    result = await db.products.insert_one(doc)
    await audit(user["id"], "product.create", str(result.inserted_id), {"slug": payload.slug})
    doc["_id"] = result.inserted_id
    return product_out(doc)

@api.put("/admin/products/{slug}")
async def update_product(slug: str, payload: ProductIn, user: dict = Depends(require_admin)):
    existing = await db.products.find_one({"slug": slug})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    if payload.slug != slug and await db.products.find_one({"slug": payload.slug}):
        raise HTTPException(status_code=409, detail="New slug already used")
    doc = payload.model_dump()
    doc["updated_at"] = datetime.now(timezone.utc)
    await db.products.update_one({"_id": existing["_id"]}, {"$set": doc})
    await audit(user["id"], "product.update", str(existing["_id"]), {"slug": slug})
    updated = await db.products.find_one({"_id": existing["_id"]})
    return product_out(updated)

@api.delete("/admin/products/{slug}")
async def delete_product(slug: str, user: dict = Depends(require_admin)):
    existing = await db.products.find_one({"slug": slug})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    await db.products.delete_one({"_id": existing["_id"]})
    await audit(user["id"], "product.delete", str(existing["_id"]), {"slug": slug})
    return {"ok": True}

@api.get("/admin/audit-logs")
async def admin_audit(user: dict = Depends(require_admin), limit: int = Query(100, ge=1, le=500)):
    cursor = db.audit_logs.find().sort("created_at", -1).limit(limit)
    out = []
    async for d in cursor:
        d["id"] = str(d.pop("_id"))
        if isinstance(d.get("created_at"), datetime):
            d["created_at"] = d["created_at"].isoformat()
        out.append(d)
    return out

@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_admin)):
    return {
        "users": await db.users.count_documents({}),
        "products": await db.products.count_documents({}),
        "active_products": await db.products.count_documents({"status": "active"}),
        "coming_soon": await db.products.count_documents({"status": "coming-soon"}),
        "waitlist": await db.waitlist.count_documents({}),
        "audit_logs": await db.audit_logs.count_documents({}),
        "paid_transactions": await db.payment_transactions.count_documents({"payment_status": "paid"}),
        "entitlements": await db.entitlements.count_documents({"active": True}),
        "events_7d": await db.events.count_documents({"created_at": {"$gte": datetime.now(timezone.utc) - timedelta(days=7)}}),
    }

# ------------------------------------------------------------
# Waitlist (Coming Soon "Notify me")
# ------------------------------------------------------------
@api.post("/waitlist")
async def join_waitlist(payload: WaitlistIn, background: BackgroundTasks):
    email = payload.email.lower().strip()
    doc = {
        "email": email,
        "product_slug": payload.product_slug,
        "source": payload.source,
        "created_at": datetime.now(timezone.utc),
    }
    inserted = True
    try:
        await db.waitlist.insert_one(doc)
    except Exception as e:
        if "duplicate key" in str(e).lower():
            inserted = False
        else:
            logger.warning("Waitlist insert failed: %s", e)
            inserted = False
    # Only send confirmation on first join for this email+slug
    if inserted:
        product_name = "Trillion AI Tech"
        if payload.product_slug:
            p = await db.products.find_one({"slug": payload.product_slug}, {"name": 1})
            if p:
                product_name = p["name"]
        subject = f"You're on the waitlist for {product_name}"
        html = render_email(
            heading="You're on the list.",
            body_html=(
                f"Thanks for joining the <strong>{product_name}</strong> waitlist. "
                "We'll email you the moment it's ready — no marketing spam, just the launch."
            ),
            cta_url="https://trillionaitech.com/products",
            cta_label="Browse the catalogue",
        )
        text = f"You're on the waitlist for {product_name}. We'll email you the moment it's ready."
        background.add_task(send_email, email, subject, html, text)
    return {"ok": True, "message": "You're on the list. We'll email you when it's ready."}

# ------------------------------------------------------------
# Contact
# ------------------------------------------------------------
@api.post("/contact")
async def contact(payload: ContactIn):
    await db.contact_messages.insert_one({
        "name": payload.name,
        "email": payload.email.lower().strip(),
        "subject": payload.subject,
        "message": payload.message,
        "created_at": datetime.now(timezone.utc),
    })
    return {"ok": True, "message": "Thanks — we'll reply within 2 business days."}

# ------------------------------------------------------------
# Search (product-scoped)
# ------------------------------------------------------------
@api.get("/search")
async def search(q: str = Query(..., min_length=1, max_length=100)):
    rx = {"$regex": re.escape(q), "$options": "i"}
    cursor = db.products.find({"$or": [{"name": rx}, {"short_description": rx}, {"tags": rx}]}).limit(30)
    return [product_out(d) async for d in cursor]

app.include_router(api)

# Mount enhancement routers (Stripe payments, uploads, analytics) under /api
_payments = build_payments_router(db, get_optional_user, get_current_user, audit)
_uploads_admin = build_uploads_router(db, require_admin, audit)
_uploads_public = build_public_uploads_router(db)
_analytics = build_analytics_router(db, get_optional_user, require_admin)
app.include_router(_payments, prefix="/api")
app.include_router(_uploads_admin, prefix="/api")
app.include_router(_uploads_public, prefix="/api")
app.include_router(_analytics, prefix="/api")
