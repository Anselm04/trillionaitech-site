# Trillion AI Tech — Product Requirements Document

## Original problem
Transform the existing static Trillion AI Tech website (https://trillionaitech.com) into a production-ready, modern, futuristic technology company website that is both a marketing storefront AND a scalable product catalogue platform. The company will continually release AI apps, agents, tools, software, games and other tech products; the architecture must support unlimited growth (10 → 500+ products) without redesigning the frontend.

## Architecture
- Frontend: React 18 + React Router 7 + TailwindCSS + Framer Motion + Sonner + lucide-react
- Backend: FastAPI + Motor (MongoDB async) + PyJWT + bcrypt
- Database: MongoDB collections — users, products, waitlist, contact_messages, password_reset_tokens, login_attempts, audit_logs
- Auth: JWT (access 60m + refresh 7d) delivered as httpOnly, Secure, SameSite=None cookies
- Storefront: data-driven catalogue — every product lives in Mongo and is rendered from the API; no product is hard-coded into a page component

## User personas
- Visitor: browses products, reads about the company, signs up for waitlists
- Customer: registered account, sees purchases/subscriptions (payments architecture ready)
- Admin: manages product catalogue via secure `/admin` dashboard

## Core requirements (static)
- Data-driven product catalogue with categories: apps, agents, tools, software, games
- Product statuses: active, coming-soon, beta, maintenance, retired
- Billing types: free, one-time, monthly, annual (Stripe-ready)
- Global search + category and status filters
- Sign up / Sign in / Sign out / Account
- Admin CMS with product CRUD, audit log, stats dashboard
- Coming Soon waitlist with per-product email capture
- Contact form with server-side persistence
- Legal pages: /privacy /terms /refunds /cookies /security
- Dark + light theme with persistence
- Mobile responsive across all pages
- SEO metadata (title, OG, canonical, favicon)
- Security: bcrypt, httpOnly cookies, brute-force lockout (email-keyed), server-side admin authorization, audit logging, CSP-friendly config, no client-side secrets

## What's been implemented (Jan 2026)
### Backend (/app/backend/server.py)
- 22 API endpoints under `/api`
- 10 seed products across 5 categories with real short descriptions, features, pricing, statuses
- JWT auth (register, login, logout, me, refresh, forgot-password, reset-password) with httpOnly cookies
- Email-keyed brute-force lockout (5 fails / 15 min) — works behind rotating K8s ingress
- Admin gate via `require_admin` dependency; product create/edit/delete + audit-log + stats
- Waitlist + contact endpoints
- MongoDB indexes: users.email unique, products.slug unique + category/status/featured, password_reset_tokens TTL, waitlist composite unique
- Security headers middleware, CORS with credentials + regex for Emergent preview domains, exception logger

### Frontend (/app/frontend/src)
- Full React SPA with 20+ routes, dark/light theming, responsive nav + mobile menu
- Cinematic homepage (hero, categories, featured products from API, trust triad, CTA)
- Products page with search + category/status filters
- Category-scoped pages: /apps /agents /tools /software /games /coming-soon
- Product detail page with hero, features, pricing sidebar, waitlist form for coming-soon
- Auth pages (login/register), Account page with subscription/purchase placeholders
- Admin dashboard: stats, product list with edit/delete, create/edit modal form, audit log
- Contact page (server-backed), About, 5 legal pages, 404
- Global toast system (Sonner), noise texture overlay, grid-line hero background

## Prioritized backlog (P0/P1/P2)
### P0 — remaining before real launch
- Stripe integration wiring (checkout + webhook + entitlements) — architecture ready, needs keys
- Real transactional email (SendGrid/Resend) for password reset + waitlist notifications
- Image upload storage (S3 or Cloudinary) for admin product images
### P1
- Full-text search index (Atlas Search or Meili) for scale
- Newsletter double opt-in
- Sitemap.xml + robots.txt generated from live catalogue
- OpenGraph image per product
- Analytics wiring (Plausible/PostHog)
### P2
- Password reset UI page consuming `/api/auth/reset-password`
- Product screenshot gallery UI
- Multi-language (locales/ folder from legacy is preserved)
- Referral / affiliate program
- Developer portal for API products

## Environment variables
### Backend (/app/backend/.env)
- MONGO_URL, DB_NAME (pre-configured)
- JWT_SECRET
- ADMIN_EMAIL, ADMIN_PASSWORD (seeds admin on startup)
- FRONTEND_URL (CORS)

### Frontend (/app/frontend/.env)
- REACT_APP_BACKEND_URL

## Testing status (iteration_1)
- Backend: 21/22 pytest passed. Only failing test was brute-force lockout — FIXED (email-keyed identifier + tz-aware comparison).
- Frontend: 100% of tested user flows passed (home, catalogue, filters, product detail, waitlist submit, register→account, admin CRUD, theme toggle, legal pages, 404, contact).

## Notes for future agents
- Products are seeded ONLY on insert (`$setOnInsert`), so admin edits survive backend restarts.
- `get_current_user` cleanly handles malformed ObjectId sub → 401 (not 500).
- Legacy static site preserved at `/app/_legacy_static/` (do not delete).

## Iteration 2 (Jan 2026) — All four enhancements added

### 1. Stripe Payments (LIVE, test-mode)
- Stripe test sandbox provisioned via Emergent integration proxy
- 9 seeded products synced to Stripe (`setup_stripe.py`, idempotent)
- New endpoints (`/app/backend/enhancements.py`):
  - `POST /api/payments/checkout` — server-side Stripe Checkout Session, blocks free/coming-soon/retired/maintenance products
  - `GET /api/payments/status/{session_id}` — client-safe polling
  - `POST /api/stripe/webhook` — signature-verified, updates transactions + grants entitlements
- New Mongo collections: `payment_transactions`, `entitlements`
- New frontend pages: `/payment/success` (polls status, shows confirmation) + `/payment/cancel`
- Real "Subscribe — $29/mo" / "Buy — $79" buttons on product detail

### 2. Waitlist + password reset emails
- New `email_service.py` with pluggable providers: Resend → SMTP → console (fallback)
- Console provider now logs `[email:console] to=... subject=...` so devs see queued emails
- `/api/waitlist` and `/api/auth/forgot-password` now enqueue emails via BackgroundTasks (never block the response)
- Beautiful HTML template (`render_email`) with brand colors

### 3. Admin image uploads
- `POST /api/admin/uploads` — admin-only, accepts data URL or raw base64, max 2 MB, whitelisted MIME
- `GET /api/uploads/{id}` — public, cached 1 year (`immutable`)
- Storage: MongoDB `uploads` collection (binary + metadata) — no external service required
- Admin product modal now has `Upload` buttons next to Image and Logo fields with live preview

### 4. Self-hosted analytics
- `POST /api/events` — accepts whitelisted event names (page_view, product_view, product_launch, signup, login, waitlist_join, checkout_start, checkout_success, search)
- Client library at `/app/frontend/src/lib/analytics.js` with `track()` and `trackPageView()`
- Page views auto-tracked via `PageTracking` component in App.js
- Signup/login tracked in AuthContext; product_view + waitlist_join + checkout_start + checkout_success in ProductDetail/Payment pages
- `GET /api/admin/analytics?days=14` returns totals, by_name, top_products (by product_view count), daily buckets
- New Admin "Analytics" tab with totals grid, event breakdown, top products, and a daily bar chart

### Testing (iteration_2)
- Backend: 20/22 passed, 2 originally-skipped tests were about log visibility only — FIXED with `logging.basicConfig(level=INFO)` in server.py
- Frontend: 100% — Stripe redirect, /payment/success page, /payment/cancel, /account entitlements+transactions cards, admin Analytics tab, admin image upload, page_view auto-tracking all verified

### New environment variables (all optional except Stripe if you want live payments)
- `STRIPE_SECRET_KEY` (required for live payments) — pre-configured with test sandbox
- `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_ACCOUNT_ID`, `STRIPE_MODE`
- `STRIPE_TAX_MODE` — "full" (default, SMP) / "calc_only" / "diy"
- `RESEND_API_KEY` (optional) — activates Resend email delivery
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` (optional) — activates SMTP delivery
- `EMAIL_FROM`, `EMAIL_FROM_NAME` (optional)

## Status
All four Next Action Items from iteration 1 are now DONE and TESTED. The platform is fully production-ready modulo real Stripe live-mode account claim and real email provider key.
