# Implementation plan & progress

Stack and module design: see [ARCHITECTURE.md](ARCHITECTURE.md). Infrastructure decision (2026-11-04): **Neon PostgreSQL + Vercel hosting** (no Docker).

## Progress checklist

| # | Stage | Status |
|---|---|---|
| 1 | Project initialization (Next 16, TS strict, Tailwind 4, ESLint, Vitest, Playwright) | ✅ Completed |
| 2 | Design system & routing (tokens, fonts, ui components, kk/ru/en locale routing) | ✅ Completed |
| 3 | Database schema, initial migration, idempotent seed (7 categories, 34 products, 2 coupons) | ✅ Completed — ⛔ not yet applied to a database (needs Neon URL) |
| 4 | Authentication & authorization (Better Auth, roles, server-side RBAC, rate limits) | ✅ Completed |
| 5 | Menu & products (filters, search, sort, variants, modifiers, availability) | ✅ Completed |
| 6 | Cart & pricing (persisted guest cart, server quotes, coupons, delivery fee, min order, account cart merge) | ✅ Completed |
| 7 | Checkout & orders (idempotent, transactional, snapshots, status machine, tracking, cancellation) | ✅ Completed |
| 8 | Customer accounts (profile, addresses, favorites, history, password, sessions) | ✅ Completed |
| 9 | Kitchen display (columns, timers, priority, sound, polling) | ✅ Completed |
| 10 | Admin (dashboard, orders, products, categories, coupons, customers/roles, settings, CSV) | ✅ Completed |
| 11 | Analytics (revenue day/week/month, AOV, status, top items, peak hours, coupons) | ✅ Completed |
| 12 | Internationalization (all UI strings kk/ru/en, localized formats) | ✅ Completed |
| 13 | UX, SEO, accessibility (skeletons, empty/error states, dialogs, focus, sitemap, robots, JSON-LD) | ✅ Completed |
| 14 | Automated tests (48 unit, 17 integration, 12 DB E2E scenarios, 38 preview-mode browser tests) | ✅ Unit + preview browser tests passing — integration / DB E2E ⛔ pending a test database |
| 15a | UI/UX audit & polish before database integration ([UI_AUDIT.md](UI_AUDIT.md)) | ✅ Completed — 19 findings fixed, 420-page-view responsive/i18n sweep |
| 15 | Deployment readiness (Vercel + Neon docs, env template, security headers) | ✅ Completed — deploy not performed (needs credentials/approval) |

## Blocked

- **Database credentials** (next phase): `DATABASE_URL` / `DIRECT_URL` (and a separate `TEST_DATABASE_URL` branch). Until then the app runs in preview mode: storefront fully viewable, ordering/auth/account/admin/kitchen show a setup-required screen; integration tests and DB E2E are skipped.

## Verification status (2026-11-19, Neon connected — main branch)

| Check | Result |
|---|---|
| Neon connection, `npm run db:deploy` | ✅ initial migration applied (Frankfurt region) |
| `npm run db:seed` (twice) | ✅ 7 categories, 34 products, 2 coupons; second run added 0 rows (idempotent) |
| `npm run typecheck` / `npm run lint` | ✅ 0 errors (2 known react-hook-form warnings) |
| `npm run test:unit` | ✅ 55/55 (incl. new connection-retry tests) |
| Guest flow on real DB (headless browser) | ✅ pickup order created, server totals, private tracking link (no token / wrong token → not found), cancellation → `CANCELLED`, payment `VOIDED`, history recorded |
| Customer flow on real DB | ✅ register → account, delivery order with WELCOME10 (−10%), order history, second WELCOME10 use refused (per customer/phone), address CRUD, saved address in checkout, favorites, logout, wrong/right password, customer blocked from `/admin` and kitchen API (403) |
| Bugs found and fixed in this phase | Cart quantities doubled on every full page load for signed-in users; changes lost when navigating right after adding; transient Neon `ErrorEvent` on compute wake-up (reads now retried, writes never); unreadable `[object ErrorEvent]` logs |
| Cold start | Neon free tier suspends after 5 min idle; first query after wake-up measured at ~6.7 s (normally ~0.6 s). Public pages are ISR-cached, so most visitors do not hit the database. |
| Demo accounts (admin, manager, kitchen, customer) | ✅ seeded (`isDemo` migration applied); one-click login panel; server-side restrictions verified: archive blocked, role selects hidden, settings view-only, emails/phones masked, `change-password` API → 403 |
| Demo role switcher (one-click login + floating role bar) | ✅ desktop 1366 px and phone 390 px: Manager → Kitchen → Customer → Admin, each switch verified server-side (session role and kitchen API 200/403); leave demo → 401; demo password absent from page HTML; customer names masked for demo viewers |
| Kitchen and manager/admin flows on real DB | ✅ kitchen saw a new order in 1.4 s and moved it Confirmed → Preparing → Ready (customer page updated); manager set Picked up; analytics paid revenue 6,980 ₸; CSV export 200; kitchen blocked from `/admin`, customer blocked from kitchen API |
| `npm run test:integration` | ⏸ BLOCKED — `TEST_DATABASE_URL` (separate Neon branch) not set; must not run on the main DB (it truncates tables) |
| `npm run test:e2e` (DB flows) | ⏸ BLOCKED — same |
| Test data in main DB | 4 orders and 4 test users (`e2e-…@example.com`) created by the verification flows — to be cleaned up before the demo goes public |

## Next commands once `.env` has Neon URLs

```bash
npm run db:deploy
```

```bash
npm run db:seed
```

```bash
npm run db:test:deploy
```

```bash
npm test
```

```bash
npm run build
```

```bash
npm run test:e2e
```
