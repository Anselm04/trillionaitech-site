"""Session-4 backend tests:
- POST /api/auth/change-password
- POST /api/admin/test-email
- POST /api/admin/test-stripe
- GET/PUT/POST AppForge V2 endpoints (get_generation, update_file, refine, preview)
"""
import os
import time
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://4360db21-8e9f-43f9-9458-b6dbe2dd3c8e.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"
# The ingress has a ~60s timeout that will 502 on AppForge LLM calls (30-90s).
# For long LLM calls we hit the backend directly on localhost:8001. Auth is still JWT so this is fine.
INTERNAL_API = "http://localhost:8001/api"

ADMIN_EMAIL = "anselm.perkins@gmail.com"
ADMIN_PW = "Trillion@Master2026"


# ---------- helpers ----------
def _login(email, pw):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=30)
    return r


def _register(email, pw, name="Test"):
    return requests.post(f"{API}/auth/register", json={"email": email, "password": pw, "name": name}, timeout=30)


@pytest.fixture(scope="module")
def admin_token():
    r = _login(ADMIN_EMAIL, ADMIN_PW)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def fresh_customer():
    email = f"TEST_s4_{int(time.time())}@example.com"
    pw = "TempPass@123"
    r = _register(email, pw)
    assert r.status_code in (200, 201), r.text
    tok = r.json()["access_token"]
    return {"email": email, "password": pw, "token": tok, "headers": {"Authorization": f"Bearer {tok}"}}


# ---------- change-password ----------
class TestChangePassword:
    def test_wrong_current(self, fresh_customer):
        r = requests.post(f"{API}/auth/change-password",
                          headers=fresh_customer["headers"],
                          json={"current_password": "WrongPass!!", "new_password": "NewPass@123"},
                          timeout=15)
        assert r.status_code == 401

    def test_same_password(self, fresh_customer):
        r = requests.post(f"{API}/auth/change-password",
                          headers=fresh_customer["headers"],
                          json={"current_password": fresh_customer["password"], "new_password": fresh_customer["password"]},
                          timeout=15)
        assert r.status_code == 400

    def test_success_and_login(self, fresh_customer):
        new_pw = "ChangedPass@456"
        r = requests.post(f"{API}/auth/change-password",
                          headers=fresh_customer["headers"],
                          json={"current_password": fresh_customer["password"], "new_password": new_pw},
                          timeout=15)
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True
        # Old password should now fail
        r2 = _login(fresh_customer["email"], fresh_customer["password"])
        assert r2.status_code == 401
        # New password works
        r3 = _login(fresh_customer["email"], new_pw)
        assert r3.status_code == 200


# ---------- admin diagnostics ----------
class TestAdminDiagnostics:
    def test_test_email_admin(self, admin_headers):
        r = requests.post(f"{API}/admin/test-email", headers=admin_headers, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("ok") is True
        assert "provider" in d
        assert d.get("sent_to") == ADMIN_EMAIL

    def test_test_email_non_admin(self, fresh_customer):
        r = requests.post(f"{API}/admin/test-email", headers=fresh_customer["headers"], timeout=15)
        assert r.status_code in (401, 403)

    def test_test_email_anon(self):
        r = requests.post(f"{API}/admin/test-email", timeout=15)
        assert r.status_code in (401, 403)

    def test_test_stripe_admin(self, admin_headers):
        r = requests.post(f"{API}/admin/test-stripe", headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        # When key configured, expect ok:true with account details
        if d.get("ok"):
            assert "account_id" in d
            assert "mode" in d
            assert "charges_enabled" in d
            assert "payouts_enabled" in d
            assert "country" in d
        else:
            pytest.skip(f"Stripe not configured or errored: {d.get('error')}")

    def test_test_stripe_non_admin(self, fresh_customer):
        r = requests.post(f"{API}/admin/test-stripe", headers=fresh_customer["headers"], timeout=15)
        assert r.status_code in (401, 403)


# ---------- AppForge V2 ----------
@pytest.fixture(scope="module")
def landing_generation(admin_headers):
    """Generate a landing project as admin (god-mode)."""
    r = requests.post(f"{INTERNAL_API}/appforge/generate",
                      headers=admin_headers,
                      json={"prompt": "One-page landing site: hero + 3 features + CTA button.", "kind": "landing"},
                      timeout=180)
    assert r.status_code == 200, f"generate failed: {r.status_code} {r.text[:400]}"
    d = r.json()
    assert d.get("gen_id")
    assert d.get("files")
    return d


class TestAppforgeGetGeneration:
    def test_get_owner(self, admin_headers, landing_generation):
        gid = landing_generation["gen_id"]
        r = requests.get(f"{API}/appforge/generations/{gid}", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["gen_id"] == gid
        assert isinstance(d.get("files"), list) and len(d["files"]) > 0
        assert "content" in d["files"][0]

    def test_get_non_owner(self, fresh_customer, landing_generation):
        gid = landing_generation["gen_id"]
        r = requests.get(f"{API}/appforge/generations/{gid}", headers=fresh_customer["headers"], timeout=15)
        assert r.status_code == 403

    def test_get_unknown(self, admin_headers):
        r = requests.get(f"{API}/appforge/generations/does-not-exist-xyz", headers=admin_headers, timeout=15)
        assert r.status_code == 404


class TestAppforgeUpdateFile:
    def test_update_existing(self, admin_headers, landing_generation):
        gid = landing_generation["gen_id"]
        first_path = landing_generation["files"][0]["path"]
        new_content = "// TEST_s4 edited content\n"
        r = requests.put(f"{API}/appforge/generations/{gid}/files",
                         headers=admin_headers,
                         json={"path": first_path, "content": new_content},
                         timeout=15)
        assert r.status_code == 200, r.text
        # Verify persisted
        g = requests.get(f"{API}/appforge/generations/{gid}", headers=admin_headers, timeout=15).json()
        found = next((f for f in g["files"] if f["path"] == first_path), None)
        assert found is not None
        assert found["content"] == new_content

    def test_create_new(self, admin_headers, landing_generation):
        gid = landing_generation["gen_id"]
        r = requests.put(f"{API}/appforge/generations/{gid}/files",
                         headers=admin_headers,
                         json={"path": "TEST_new_file.txt", "content": "hello"},
                         timeout=15)
        assert r.status_code == 200
        g = requests.get(f"{API}/appforge/generations/{gid}", headers=admin_headers, timeout=15).json()
        assert any(f["path"] == "TEST_new_file.txt" for f in g["files"])

    def test_path_traversal_rejected(self, admin_headers, landing_generation):
        gid = landing_generation["gen_id"]
        r = requests.put(f"{API}/appforge/generations/{gid}/files",
                         headers=admin_headers,
                         json={"path": "../etc/passwd", "content": "x"},
                         timeout=15)
        assert r.status_code == 400

    def test_non_owner_forbidden(self, fresh_customer, landing_generation):
        gid = landing_generation["gen_id"]
        r = requests.put(f"{API}/appforge/generations/{gid}/files",
                         headers=fresh_customer["headers"],
                         json={"path": "foo.txt", "content": "x"},
                         timeout=15)
        assert r.status_code == 403


class TestAppforgePreview:
    def test_preview_landing(self, admin_headers, landing_generation):
        gid = landing_generation["gen_id"]
        r = requests.get(f"{API}/appforge/preview/{gid}", headers=admin_headers, timeout=15)
        # Landing page should have index.html
        if r.status_code == 400:
            pytest.skip("Landing generation did not include index.html; preview unavailable")
        assert r.status_code == 200, r.text[:200]
        assert "text/html" in r.headers.get("content-type", "")
        assert "Content-Security-Policy" in r.headers
        assert "<" in r.text  # html-ish

    def test_preview_non_owner(self, fresh_customer, landing_generation):
        gid = landing_generation["gen_id"]
        r = requests.get(f"{API}/appforge/preview/{gid}", headers=fresh_customer["headers"], timeout=15)
        assert r.status_code == 403


class TestAppforgeRefine:
    def test_refine_fresh_customer_402(self, fresh_customer, landing_generation):
        gid = landing_generation["gen_id"]
        r = requests.post(f"{API}/appforge/refine",
                          headers=fresh_customer["headers"],
                          json={"gen_id": gid, "instructions": "add a testimonial section"},
                          timeout=30)
        # 402 (no access) OR 403 (not their generation) — either is a hard block on refine for a non-entitled non-owner.
        assert r.status_code in (402, 403)

    def test_refine_admin_success(self, admin_headers, landing_generation):
        gid = landing_generation["gen_id"]
        r = requests.post(f"{INTERNAL_API}/appforge/refine",
                          headers=admin_headers,
                          json={"gen_id": gid, "instructions": "add a pricing box"},
                          timeout=180)
        assert r.status_code == 200, f"refine failed: {r.status_code} {r.text[:400]}"
        d = r.json()
        assert d.get("gen_id") and d["gen_id"] != gid
        assert isinstance(d.get("files"), list) and len(d["files"]) > 0
