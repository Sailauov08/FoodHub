# Testing

## Unit tests (no database)

```bash
npm run test:unit
```

Covers pricing (variants, modifiers, min/max, availability, quantity), coupons (percent/fixed, caps, dates, limits, minimum), totals and delivery fee, the order status machine and role rules, KZ phone validation, money formatting, opening hours (incl. after-midnight), localized paths, zod schemas (checkout, coupons, modifier groups, image URLs) and translation key parity across kk/ru/en.

## Integration tests (real PostgreSQL)

Create a **separate Neon branch** for tests (Neon console → Branches → Create branch, e.g. `test`). Put its *direct* connection string in `.env`:

```
TEST_DATABASE_URL="postgresql://…@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require"
```

Apply migrations to it once:

```bash
npm run db:test:deploy
```

Then:

```bash
npm run test:integration
```

⚠️ These tests `TRUNCATE` every table of `TEST_DATABASE_URL`. They are skipped (reported as skipped, not passed) when it is not set.

Covered: atomic order creation with server prices and snapshots, concurrent idempotent checkout, idempotency conflicts, invalid lines / minimum order / closed restaurant, coupon usage limits (atomic) and release on cancel, per-customer coupon limits, tracking access (owner / staff / token / others), full status machine with RBAC + history + payment, paid-revenue analytics, admin RBAC (products, settings, roles, categories, coupons), server-side validation of admin input, staff-only status action.

## Preview-mode browser tests (no database)

```bash
npm run test:e2e:preview
```

Builds the app with `DATABASE_URL` empty, starts it on port 3200 and runs `e2e/preview.spec.ts`: every public route in kk/ru/en (status 200, one `h1`, correct `lang`, no horizontal overflow, no console errors), hero carousel + language switch, menu filter/search, product customization with server-calculated cart totals and coupons, invalid coupon message, checkout validation and the disabled order button, setup-required screens for account/admin/kitchen, mobile navigation + cart drawer, keyboard skip link.

## End-to-end with the database (Playwright)

```bash
npx playwright install chromium
```

```bash
npm run test:e2e
```

Global setup migrates and seeds `TEST_DATABASE_URL`, creates throw-away admin/kitchen accounts with random passwords (`e2e/.auth/staff.json`, git-ignored), then builds and starts the app on port 3100 against the test database. To test a running deployment instead set `E2E_BASE_URL` plus `E2E_ADMIN_EMAIL/PASSWORD` and `E2E_KITCHEN_EMAIL/PASSWORD`.

Scenarios: home + language switch, menu filter/search/product page, pizza customization + quantity changes with server totals, guest cash checkout + private tracking + cancellation, checkout validation, sign-up → order → history → sign-out → failed/successful sign-in, customers blocked from admin/kitchen, admin creates & archives a product visible on the menu, kitchen accepts → cooks → readies an order reflected on the customer's page, mobile navigation (no horizontal overflow) and mobile cart drawer.

## Results

Last full run (19 Nov 2026):

| Suite | Result |
|---|---|
| Unit (`npm run test:unit`) | 58 passed |
| Integration (`npm run test:integration`, separate test database) | 20 passed |
| E2E with database (`npm run test:e2e`) | 11 passed |
| E2E preview (`npm run test:e2e:preview`) | 38 passed |
| `npm run typecheck`, `npm run lint`, `npm run build` | clean |
