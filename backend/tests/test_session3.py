"""Session-3 backend tests: 3 AppForge tiers, payment links, god-mode admin, access codes,
AppForge LLM generation, admin dashboard, settings."""
import os
import io
import uuid
import zipfile
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip()
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "anselm.perkins@gmail.com"
ADMIN_PASSWORD = "Trillion@Master2026"

APPFORGE_TIERS = {
    "appforge-starter": {"price": 49, "url_prefix": "https://buy.stripe.com/eVq"},
    "appforge-builder": {"price": 149, "url_prefix": "https://buy.stripe.com/00w7"},
    "appforge-studio":  {"price": 399, "url_prefix": "https://buy.stripe.com/aFa8"},
}


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def anon():
    return requests.Session()


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    j = r.json()
    assert j.get("role") == "admin", f"expected admin role, got {j}"
    return s


def _make_customer():
    s = requests.Session()
    email = f"TEST_s3_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{API}/auth/register", json={
        "email": email, "password": "Passw0rd!!", "name": "Test S3"
    })
    assert r.status_code == 200, r.text
    s.email = email
    return s


@pytest.fixture()
def customer_session():
    return _make_customer()


# ---------- Auth: master admin god-mode ----------
def test_master_admin_login(admin_session):
    r = admin_session.get(f"{API}/auth/me")
    assert r.status_code == 200
    j = r.json()
    assert j["email"] == ADMIN_EMAIL.lower()
    assert j["role"] == "admin"


def test_old_admin_removed():
    r = requests.post(f"{API}/auth/login", json={
        "email": "admin@trillionaitech.com", "password": "Admin@Trillion2026"
    })
    assert r.status_code == 401


# ---------- Products: 3 AppForge tiers with payment_link ----------
def test_products_include_three_appforge_tiers(anon):
    r = anon.get(f"{API}/products")
    assert r.status_code == 200
    data = r.json()
    slugs = {p["slug"] for p in data}
    assert "appforge" not in slugs, "old single 'appforge' product should be removed"
    for slug in APPFORGE_TIERS:
        assert slug in slugs, f"missing tier: {slug}"
    by_slug = {p["slug"]: p for p in data}
    for slug, meta in APPFORGE_TIERS.items():
        p = by_slug[slug]
        assert p.get("payment_link", "").startswith(meta["url_prefix"]), \
            f"{slug} payment_link mismatch: {p.get('payment_link')}"
        assert p.get("trial_days") == 7, f"{slug} trial_days should be 7"
        assert p.get("price") in (meta["price"], float(meta["price"]))
    assert len(data) >= 12


# ---------- Payment links checkout ----------
@pytest.mark.parametrize("slug", list(APPFORGE_TIERS.keys()))
def test_checkout_returns_payment_link(anon, slug):
    r = anon.post(f"{API}/payments/checkout", json={
        "product_slug": slug, "origin_url": BASE_URL
    })
    assert r.status_code == 200, r.text
    j = r.json()
    assert j.get("mode") == "payment_link"
    assert j["checkout_url"].startswith(APPFORGE_TIERS[slug]["url_prefix"])


# ---------- AppForge access ----------
def test_appforge_access_admin(admin_session):
    r = admin_session.get(f"{API}/appforge/access")
    assert r.status_code == 200
    j = r.json()
    assert j["has_access"] is True
    assert j["is_admin"] is True


def test_appforge_access_anon(anon):
    r = anon.get(f"{API}/appforge/access")
    assert r.status_code == 200
    j = r.json()
    assert j["has_access"] is False
    assert j["reason"] == "signin_required"
    assert set(j["tiers"]) == set(APPFORGE_TIERS.keys())


def test_appforge_access_fresh_customer(customer_session):
    r = customer_session.get(f"{API}/appforge/access")
    assert r.status_code == 200
    j = r.json()
    assert j["has_access"] is False


def test_appforge_generate_denied_for_fresh_customer(customer_session):
    r = customer_session.post(f"{API}/appforge/generate", json={
        "prompt": "a simple todo webapp", "kind": "webapp"
    })
    assert r.status_code == 402


# ---------- AppForge generation (admin, LLM call, slow) ----------
@pytest.mark.slow
def test_appforge_generate_admin_and_download(admin_session):
    r = admin_session.post(f"{API}/appforge/generate", json={
        "prompt": "a minimal todo webapp with add and remove",
        "kind": "webapp",
    }, timeout=120)
    assert r.status_code == 200, r.text
    j = r.json()
    for k in ("gen_id", "name", "kind", "summary", "stack", "files", "file_count", "download_url"):
        assert k in j, f"missing {k}"
    assert j["file_count"] >= 3
    assert isinstance(j["files"], list) and len(j["files"]) >= 3

    # Download zip
    dl = admin_session.get(f"{BASE_URL}{j['download_url']}", timeout=30)
    assert dl.status_code == 200
    assert dl.headers.get("content-type", "").startswith("application/zip")
    zf = zipfile.ZipFile(io.BytesIO(dl.content))
    assert len(zf.namelist()) >= 3


# ---------- Access codes ----------
def test_access_code_universal_flow(admin_session):
    # Create universal code
    r = admin_session.post(f"{API}/admin/access-codes", json={
        "label": "TEST_universal_" + uuid.uuid4().hex[:6],
        "scope": "universal",
        "max_redemptions": 2,
    })
    assert r.status_code == 201, r.text
    code = r.json()["code"]
    assert code.startswith("TAT-")
    parts = code.split("-")
    assert len(parts) == 3 and len(parts[1]) == 4 and len(parts[2]) == 4

    # list should contain it
    r = admin_session.get(f"{API}/admin/access-codes")
    assert r.status_code == 200
    assert any(c["code"] == code for c in r.json())

    # Fresh customer redeems
    cust = _make_customer()
    r = cust.post(f"{API}/redeem", json={"code": code})
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["ok"] is True
    assert j["scope"] == "universal"
    assert isinstance(j["granted_products"], list) and len(j["granted_products"]) > 0

    # Now that customer has AppForge access
    r = cust.get(f"{API}/appforge/access")
    assert r.status_code == 200
    assert r.json()["has_access"] is True

    # Second redeem by same user = 409
    r = cust.post(f"{API}/redeem", json={"code": code})
    assert r.status_code == 409

    # Revoke
    r = admin_session.post(f"{API}/admin/access-codes/{code}/revoke")
    assert r.status_code == 200

    # New fresh customer can't redeem revoked code (404)
    cust2 = _make_customer()
    r = cust2.post(f"{API}/redeem", json={"code": code})
    assert r.status_code == 404


def test_access_code_product_scoped(admin_session):
    r = admin_session.post(f"{API}/admin/access-codes", json={
        "label": "TEST_product_" + uuid.uuid4().hex[:6],
        "scope": "product",
        "product_slugs": ["appforge-studio"],
        "max_redemptions": 1,
    })
    assert r.status_code == 201, r.text
    code = r.json()["code"]

    cust = _make_customer()
    r = cust.post(f"{API}/redeem", json={"code": code})
    assert r.status_code == 200
    j = r.json()
    assert j["scope"] == "product"
    assert j["granted_products"] == ["appforge-studio"]

    # customer now has AppForge access via tier entitlement
    r = cust.get(f"{API}/appforge/access")
    assert r.json()["has_access"] is True


def test_access_code_creation_forbidden_for_customer(customer_session):
    r = customer_session.post(f"{API}/admin/access-codes", json={
        "label": "TEST_x", "scope": "universal", "max_redemptions": 1
    })
    assert r.status_code == 403


# ---------- Admin: users, transactions, entitlements... ----------
def test_admin_users_list(admin_session):
    r = admin_session.get(f"{API}/admin/users")
    assert r.status_code == 200
    users = r.json()
    admin = next((u for u in users if u["email"] == ADMIN_EMAIL.lower()), None)
    assert admin is not None
    assert admin["role"] == "admin"


def test_admin_users_role_change_and_delete(admin_session):
    # Create a fresh customer to promote/demote/delete
    cust = _make_customer()
    r = admin_session.get(f"{API}/admin/users?q={cust.email}")
    assert r.status_code == 200
    users = r.json()
    target = next((u for u in users if u["email"] == cust.email.lower()), None)
    assert target is not None
    uid = target["id"]

    # Promote to admin
    r = admin_session.put(f"{API}/admin/users/{uid}/role", json={"role": "admin"})
    assert r.status_code == 200
    # Demote back
    r = admin_session.put(f"{API}/admin/users/{uid}/role", json={"role": "customer"})
    assert r.status_code == 200

    # Cannot demote self
    me = admin_session.get(f"{API}/auth/me").json()
    r = admin_session.put(f"{API}/admin/users/{me['id']}/role", json={"role": "customer"})
    assert r.status_code == 400

    # Delete
    r = admin_session.delete(f"{API}/admin/users/{uid}")
    assert r.status_code == 200


def test_admin_endpoints_access(admin_session, customer_session):
    endpoints = [
        "/admin/transactions", "/admin/entitlements", "/admin/waitlist",
        "/admin/contact-messages", "/admin/appforge-generations", "/admin/audit-logs",
    ]
    for ep in endpoints:
        r = admin_session.get(f"{API}{ep}")
        assert r.status_code == 200, f"admin {ep} -> {r.status_code}"
        # anon
        r = requests.get(f"{API}{ep}")
        assert r.status_code == 401, f"anon {ep} -> {r.status_code}"
        # non-admin
        r = customer_session.get(f"{API}{ep}")
        assert r.status_code == 403, f"customer {ep} -> {r.status_code}"


def test_admin_grant_universal_entitlement(admin_session):
    cust = _make_customer()
    r = admin_session.post(f"{API}/admin/entitlements", json={
        "email": cust.email, "product_slug": "__universal__"
    })
    assert r.status_code == 201, r.text

    # customer now has appforge access
    r = cust.get(f"{API}/appforge/access")
    assert r.json()["has_access"] is True


# ---------- Admin settings ----------
def test_admin_settings_get(admin_session):
    r = admin_session.get(f"{API}/admin/settings")
    assert r.status_code == 200
    j = r.json()
    assert "stripe_mode" in j
    assert j["stripe_mode"] in ("live", "test")
    assert "stripe_secret_key_masked" in j


def test_admin_settings_update_tax_mode(admin_session):
    r = admin_session.put(f"{API}/admin/settings", json={"stripe_tax_mode": "diy"})
    assert r.status_code == 200
    r = admin_session.get(f"{API}/admin/settings")
    assert r.json()["stripe_tax_mode"] == "diy"


def test_admin_settings_invalid_stripe_key(admin_session):
    r = admin_session.put(f"{API}/admin/settings", json={"stripe_secret_key": "not_a_key_123"})
    assert r.status_code == 400
