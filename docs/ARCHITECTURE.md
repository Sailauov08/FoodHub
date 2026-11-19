# Architecture

One Next.js 16 App Router application. No separate backend: server components read data, **route handlers** serve JSON endpoints that need explicit HTTP semantics (checkout, quotes, polling, CSV), **server actions** handle authenticated mutations from forms (account, admin, kitchen).

```
src/
  app/
    [locale]/            locale segment (kk default without prefix, /ru, /en) — next-intl
      (store)/           public storefront + account (shared header/footer/cart drawer)
      admin/             management UI (MANAGER, ADMIN)
      kitchen/           kitchen display (KITCHEN, MANAGER, ADMIN)
    api/
      auth/[...all]      Better Auth handler
      cart/quote         POST  authoritative price quote
      cart               GET/PUT server cart for signed-in users (merge on sign-in)
      orders             POST  checkout (idempotent)
      orders/[id]        GET   status polling (owner / staff / token)
      orders/[id]/cancel POST  customer cancellation (PENDING only)
      kitchen/orders     GET   kitchen polling
      favorites          GET   favorite ids for the current user
      admin/reports      GET   CSV export (MANAGER, ADMIN)
    sitemap.ts, robots.ts
  actions/               server actions: account.ts, orders.ts (status), admin.ts
  server/                server-only services: orders, catalog, analytics, kitchen, restaurant, rate-limit, http
  lib/
    domain/              pure logic: pricing, coupons, totals, order-status, phone, money, hours  (unit tested)
    validation.ts        zod schemas shared by client forms and the server
    auth.ts / session.ts Better Auth config, session + RBAC helpers
    db.ts                Prisma client with the Neon serverless driver adapter
  i18n/                  routing, request config, navigation
  stores/cart.ts         Zustand cart persisted to localStorage (validated on load)
  components/            ui/ (design system), store/, admin/, kitchen/
messages/{kk,ru,en}.json
prisma/                  schema, migrations, seed
```

## Key decisions

| Decision | Why |
|---|---|
| **Prisma 7 + `@prisma/adapter-neon`** | Prisma 7 requires a driver adapter; Neon's serverless driver is designed for Vercel functions. Runtime uses the pooled URL; CLI uses the direct URL via `prisma.config.ts`. |
| **Better Auth** (instead of Auth.js) | Auth.js v5 is still beta; Better Auth is stable, actively maintained, has first-class Next.js + Prisma support, email/password with scrypt, DB sessions, built-in rate limiting (stored in PostgreSQL so it works on serverless), and CSRF/origin checks. |
| **Role on the user row, `input: false`** | Clients can never set their role. Staff are created by the seed from env or promoted by an admin. Role changes revoke the user's sessions. |
| **Authorization on the server** | Layouts call `requirePageRole`; every server action / route handler calls `assertRole`/`assertUser`; data queries are scoped by owner/restaurant. The proxy (middleware) only does locale routing. |
| **Money as `Int` KZT** | Tenge are used without fractional tiyn in practice; integers avoid float errors. Percent discounts are floored. |
| **Pure pricing module** | `lib/domain/pricing.ts` is used by the server (authoritative) and by the product configurator (display only). Checkout never trusts client prices — the request contains only ids and quantities. |
| **Idempotent checkout** | Client generates one UUID per checkout attempt (reused on network retries). `Order.idempotencyKey` is unique; a duplicate request returns the original order (only for the same customer). Concurrent duplicates are resolved via the unique constraint. |
| **Tracking tokens** | `token = HMAC(BETTER_AUTH_SECRET, idempotencyKey)`; only `sha256(token)` is stored. Replays can return the same link without storing secrets. Compared in constant time. |
| **Coupon limits** | Usage limit enforced with a conditional `UPDATE … WHERE usedCount < usageLimit` inside the order transaction; per-customer limits by account **or** phone; cancellations release a use. |
| **Soft deletion** | Products/variants/options are archived, not deleted, so historical orders stay intact; order items also keep name/price snapshots in all three languages. |
| **Near-real-time** | Polling (kitchen 5 s, tracking 8 s, admin orders 20 s) against the database. No in-memory event bus — safe on serverless. Managed realtime (e.g. Pusher/Ably) can be added later behind the same endpoints. |
| **Static where possible** | Public pages use ISR (`revalidate = 300`) and read the session on the client, so they stay cacheable. Admin edits call `revalidatePath` to refresh them. Account/admin/checkout/order pages are dynamic. |
| **shadcn/ui-style components** | Hand-written in `components/ui` on top of `radix-ui` primitives (same approach as shadcn/ui, without the CLI). |

## Order lifecycle

```
PENDING → CONFIRMED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED   (delivery)
                                     READY → PICKED_UP                    (pickup)
PENDING | CONFIRMED | PREPARING | READY → CANCELLED
```

| Actor | Allowed |
|---|---|
| Customer / token holder | PENDING → CANCELLED |
| KITCHEN | PENDING → CONFIRMED → PREPARING → READY |
| MANAGER / ADMIN | everything valid |

Every change: optimistic concurrency check, timestamp column, `OrderStatusHistory` row (actor id + role), audit log for staff. DELIVERED/PICKED_UP marks the cash payment `PAID`; cancelling an unpaid order marks it `VOIDED`.

## Analytics rules

- **Paid revenue** = Σ `Order.total` where `Payment.status = PAID`, bucketed by `Payment.paidAt` in Asia/Almaty.
- **AOV** = paid revenue / paid orders. Cancelled and unpaid orders never count.
- **Orders placed / status mix / peak hours / coupon usage** use `Order.createdAt` (peak hours and coupons exclude cancelled orders).
- Everything is computed from stored orders. No seeded analytics.

## Security summary

Server-side RBAC and ownership checks · zod validation at every boundary · scrypt password hashing · DB sessions with httpOnly, SameSite=Lax, Secure (in production) cookies · Better Auth origin checks for auth endpoints; Origin check for JSON POST/PUT handlers; Next.js server actions origin check · rate limits in PostgreSQL (sign-in 5/min, sign-up 3/min, checkout 10/10 min, quotes 120/min per IP) · parameterized SQL only · image URLs restricted to local files or `images.unsplash.com` · CSV formula-injection escaping · security headers (HSTS, nosniff, frame deny, referrer policy) · generic auth errors (no account enumeration) · structured logs without personal data · no stack traces in responses.

Not production-complete without external configuration: email verification / password reset (needs an email provider), WAF/DDoS protection, online payments (needs a verified provider + webhooks), error monitoring.
