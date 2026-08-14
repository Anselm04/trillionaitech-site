"""Trillion AI Tech — Stripe catalog setup.

Creates Stripe products + prices from the seed catalog. Idempotent — safe to run repeatedly.
Lookup keys follow the pattern: {product_slug}_{billing_type} (e.g. appforge_monthly).
Only products with a non-free billing_type get Stripe prices.
"""
from dotenv import load_dotenv
load_dotenv()

import os
import stripe
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY") or "sk_test_emergent"

INTERVAL_MAP = {"monthly": "month", "annual": "year"}
DIGITAL_TAX_CODE = "txcd_10103001"  # SaaS / digital services


def lookup_key_for(slug: str, billing_type: str) -> str:
    return f"{slug.replace('-', '_')}_{billing_type}"


def get_or_create_product(name: str, emergent_id: str, tax_code: str = DIGITAL_TAX_CODE):
    for p in stripe.Product.list(active=True, limit=100).auto_paging_iter():
        if p.to_dict().get("metadata", {}).get("emergent_product_id") == emergent_id:
            return p
    return stripe.Product.create(
        name=name,
        tax_code=tax_code,
        metadata={"managed_by": "emergent", "emergent_product_id": emergent_id},
    )


def ensure_price(product_id: str, lookup_key: str, amount_cents: int, currency: str, interval: str | None):
    existing = stripe.Price.list(lookup_keys=[lookup_key], active=True, limit=1).data
    if existing:
        p = existing[0]
        recurring_matches = (interval is None and not p.recurring) or (
            p.recurring and p.recurring.interval == interval
        )
        if p.unit_amount == amount_cents and p.currency == currency and recurring_matches:
            return p
        # Mismatch → deactivate and recreate
        stripe.Price.modify(p.id, active=False)
    kwargs = dict(
        product=product_id,
        unit_amount=amount_cents,
        currency=currency,
        lookup_key=lookup_key,
        transfer_lookup_key=True,
    )
    if interval:
        kwargs["recurring"] = {"interval": interval}
    return stripe.Price.create(**kwargs)


async def sync_catalog():
    mongo = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = mongo[os.environ["DB_NAME"]]
    async for prod in db.products.find({}):
        billing = prod.get("billing_type") or "free"
        price = prod.get("price")
        if billing == "free" or price is None or price <= 0:
            continue
        slug = prod["slug"]
        name = prod["name"]
        currency = (prod.get("currency") or "USD").lower()
        interval = INTERVAL_MAP.get(billing)  # None for one-time
        lookup = lookup_key_for(slug, billing)
        amount_cents = int(round(float(price) * 100))
        stripe_product = get_or_create_product(name=name, emergent_id=slug)
        stripe_price = ensure_price(stripe_product.id, lookup, amount_cents, currency, interval)
        # Persist ids on the product for admin visibility
        await db.products.update_one(
            {"_id": prod["_id"]},
            {"$set": {
                "stripe_product_id": stripe_product.id,
                "stripe_price_id": stripe_price.id,
                "stripe_lookup_key": lookup,
            }},
        )
        print(f"[stripe] {slug} → {lookup}  {stripe_price.id}")
    mongo.close()


if __name__ == "__main__":
    asyncio.run(sync_catalog())
