"""Backend API tests for Trillion AI Tech."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
if not BASE_URL:
    # fallback: read from frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE_URL}/api"
ADMIN_EMAIL = "anselm.perkins@gmail.com"
ADMIN_PASSWORD = "Trillion@Master2026"


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def anon():
    return requests.Session()


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    assert r.json().get("role") == "admin"
    return s


@pytest.fixture(scope="module")
def customer_session():
    s = requests.Session()
    email = f"TEST_cust_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "Passw0rd!!", "name": "Test Cust"})
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    s.email = email  # type: ignore
    return s


# ---------- Health ----------
def test_health(anon):
    r = anon.get(f"{API}/health")
    assert r.status_code == 200
    j = r.json()
    assert j["status"] == "ok"
    assert j["db"] == "connected"


# ---------- Products ----------
def test_products_list(anon):
    r = anon.get(f"{API}/products")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 10
    p = data[0]
    for k in ("id", "slug", "name", "category", "status", "featured", "price", "billing_type"):
        assert k in p, f"missing {k}"


def test_products_filter_category(anon):
    r = anon.get(f"{API}/products?category=agents")
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 1
    assert all(p["category"] == "agents" for p in data)


def test_products_filter_status(anon):
    r = anon.get(f"{API}/products?status=coming-soon")
    assert r.status_code == 200
    data = r.json()
    assert all(p["status"] == "coming-soon" for p in data)


def test_products_filter_featured(anon):
    r = anon.get(f"{API}/products?featured=true")
    assert r.status_code == 200
    assert all(p["featured"] is True for p in r.json())


def test_products_search_nodefall(anon):
    r = anon.get(f"{API}/products?q=nodefall")
    assert r.status_code == 200
    data = r.json()
    assert any(p["slug"] == "nodefall" for p in data)


def test_product_detail(anon):
    r = anon.get(f"{API}/products/nodefall")
    assert r.status_code == 200
    assert r.json()["slug"] == "nodefall"


def test_product_detail_404(anon):
    r = anon.get(f"{API}/products/does-not-exist")
    assert r.status_code == 404


# ---------- Auth ----------
def test_register_and_me():
    s = requests.Session()
    email = f"TEST_reg_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "Passw0rd!!", "name": "Reg User"})
    assert r.status_code == 200
    body = r.json()
    assert body["role"] == "customer"
    # cookies set
    assert "access_token" in s.cookies
    # /me
    r = s.get(f"{API}/auth/me")
    assert r.status_code == 200
    assert r.json()["email"] == email.lower()


def test_register_duplicate(customer_session):
    r = requests.post(f"{API}/auth/register", json={
        "email": customer_session.email, "password": "Passw0rd!!", "name": "Dup"
    })
    assert r.status_code == 409


def test_admin_login(admin_session):
    r = admin_session.get(f"{API}/auth/me")
    assert r.status_code == 200
    assert r.json()["role"] == "admin"


def test_login_wrong_password():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong_pw_xxxx"})
    assert r.status_code == 401


def test_brute_force_lockout():
    s = requests.Session()
    email = f"TEST_bf_{uuid.uuid4().hex[:6]}@example.com"
    # register user
    s.post(f"{API}/auth/register", json={"email": email, "password": "Passw0rd!!", "name": "BF"})
    # attempt 5 wrong logins
    codes = []
    for _ in range(6):
        r = requests.post(f"{API}/auth/login", json={"email": email, "password": "wrongpw11"})
        codes.append(r.status_code)
    # 6th (or later) should be 429
    assert 429 in codes, f"no lockout observed: {codes}"


def test_me_unauth():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_logout(customer_session):
    r = customer_session.post(f"{API}/auth/logout")
    assert r.status_code == 200
    # after logout, /me should be 401 (cookies cleared)
    # NOTE: re-login for further module use
    r2 = customer_session.post(f"{API}/auth/login", json={
        "email": customer_session.email, "password": "Passw0rd!!"
    })
    assert r2.status_code == 200


# ---------- Waitlist ----------
def test_waitlist():
    email = f"TEST_wl_{uuid.uuid4().hex[:6]}@example.com"
    r = requests.post(f"{API}/waitlist", json={"email": email, "product_slug": "nodefall"})
    assert r.status_code == 200
    assert r.json()["ok"] is True
    # idempotent
    r2 = requests.post(f"{API}/waitlist", json={"email": email, "product_slug": "nodefall"})
    assert r2.status_code == 200


# ---------- Contact ----------
def test_contact():
    r = requests.post(f"{API}/contact", json={
        "name": "Test", "email": "test@example.com",
        "subject": "Hello", "message": "This is a test message"
    })
    assert r.status_code == 200
    assert r.json()["ok"] is True


# ---------- Search ----------
def test_search():
    r = requests.get(f"{API}/search?q=agent")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---------- Admin ----------
def test_admin_stats_unauth():
    r = requests.get(f"{API}/admin/stats")
    assert r.status_code == 401


def test_admin_stats(admin_session):
    r = admin_session.get(f"{API}/admin/stats")
    assert r.status_code == 200
    j = r.json()
    for k in ("users", "products", "active_products", "coming_soon", "waitlist", "audit_logs"):
        assert k in j


def test_admin_create_forbidden_for_customer(customer_session):
    r = customer_session.post(f"{API}/admin/products", json={
        "slug": "test-cust-block", "name": "X", "short_description": "x", "category": "apps"
    })
    assert r.status_code == 403


TEST_SLUG = "affectionate-torvalds-4"


def test_admin_crud_flow(admin_session):
    # cleanup if exists
    admin_session.delete(f"{API}/admin/products/{TEST_SLUG}")

    # CREATE
    payload = {
        "slug": TEST_SLUG, "name": "Affectionate Torvalds",
        "short_description": "test product", "category": "tools",
        "status": "active", "featured": False, "billing_type": "free"
    }
    r = admin_session.post(f"{API}/admin/products", json=payload)
    assert r.status_code == 201, r.text
    assert r.json()["slug"] == TEST_SLUG

    # Duplicate slug -> 409
    r_dup = admin_session.post(f"{API}/admin/products", json=payload)
    assert r_dup.status_code == 409

    # Invalid slug -> 422
    bad = dict(payload); bad["slug"] = "BAD SLUG!!"
    r_bad = admin_session.post(f"{API}/admin/products", json=bad)
    assert r_bad.status_code == 422

    # UPDATE
    upd = dict(payload); upd["name"] = "Affectionate Torvalds Updated"
    r = admin_session.put(f"{API}/admin/products/{TEST_SLUG}", json=upd)
    assert r.status_code == 200
    assert r.json()["name"] == "Affectionate Torvalds Updated"

    # verify persisted
    r = requests.get(f"{API}/products/{TEST_SLUG}")
    assert r.status_code == 200
    assert r.json()["name"] == "Affectionate Torvalds Updated"

    # DELETE
    r = admin_session.delete(f"{API}/admin/products/{TEST_SLUG}")
    assert r.status_code == 200

    # verify deletion
    r = requests.get(f"{API}/products/{TEST_SLUG}")
    assert r.status_code == 404

    # audit-logs contain entries
    r = admin_session.get(f"{API}/admin/audit-logs")
    assert r.status_code == 200
    logs = r.json()
    assert any(l.get("action") == "product.create" for l in logs)
    assert any(l.get("action") == "product.delete" for l in logs)
