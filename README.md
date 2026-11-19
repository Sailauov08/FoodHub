# FoodHub

Restaurant ordering and management platform for one restaurant in Kazakhstan (KZT, kk/ru/en).
Next.js 16 App Router · React 19 · TypeScript strict · Tailwind CSS 4 · Prisma 7 + Neon PostgreSQL · Better Auth · next-intl · Zustand · Recharts · Vitest · Playwright.

> Demo restaurant: the menu, address and contacts are sample content. No reviews, ratings or certifications are claimed.

## Features

- **Storefront** — premium dark design (hero carousel, categories, featured dishes, offers, story, CTA), menu with category/search/sort/availability filters, product pages with sizes and modifier groups, cart drawer + cart page, checkout (delivery/pickup, cash), order tracking with live status polling, offers, about, contact.
- **Accounts** — email/password sign-up & sign-in (Better Auth, scrypt hashing, DB sessions, httpOnly cookies), profile, saved addresses, favorites, order history, password change, sign out other devices. The guest cart merges into the account cart on sign-in.
- **Orders** — server-side price calculation from the database, coupon validation, delivery fee and minimum order rules, idempotent checkout, atomic transaction, item/modifier snapshots, status machine with history and actor, payment tracked separately from fulfillment, secure tracking links (HMAC token; only its hash is stored).
- **Kitchen display** (`/kitchen`) — four columns, timers, priority colors, comments, one-tap status changes, chime for genuinely new orders, 5-second polling (database is the source of truth).
- **Admin** (`/admin`) — dashboard, orders (filter/search/paginate, status actions, history), products (CRUD, variants, modifier groups, availability toggle, archive), categories, coupons, customers (role management for admins), analytics (revenue by day/week/month, AOV, status mix, top items, peak hours, coupon usage, CSV export), settings (contacts, delivery fee, free-delivery threshold, minimum order, ETAs, opening hours, accepting orders).
- **i18n** — Kazakh (default, no URL prefix), Russian (`/ru`), English (`/en`); localized currency/dates; translated validation and statuses.
- **SEO** — metadata, Open Graph, canonical + hreflang, sitemap, robots (private pages disallowed and `noindex`), JSON-LD (Restaurant, MenuItem).

## Demo accounts (portfolio showcase)

The login page shows one-click demo buttons. Signing in happens in a server action, so the shared `DEMO_PASSWORD` (created by `npm run db:seed`) never reaches the browser. While signed in as a demo account, a floating **Demo** bar lets visitors switch role in one click — each switch ends the current session and creates a real session for the other demo account, so permissions are enforced by the same server-side RBAC as for real users.

| Role | Email | Can |
|---|---|---|
| Admin | `admin@foodhub.example.com` | Everything in `/admin` except irreversible / account-level actions |
| Manager | `manager@foodhub.example.com` | Orders, menu, coupons, analytics |
| Kitchen | `kitchen@foodhub.example.com` | Kitchen display `/kitchen` |
| Customer | `customer@foodhub.example.com` | Ordering, history, addresses, favorites |

Demo accounts are restricted **on the server**: no role changes, restaurant settings, archiving/deleting, profile or password changes, session revocation; other customers' names, emails, phones and addresses are masked. `example.com` is a reserved domain, so these addresses belong to nobody. Your private admin account (`SEED_ADMIN_*`) is separate and unrestricted.

**Daily reset.** With `DEMO_RESET_ENABLED="true"` and `CRON_SECRET` set, Vercel Cron calls `/api/cron/demo-reset` every night (02:00 Almaty, `vercel.json`). It restores the seed menu, categories and promo codes, archives what visitors added, resets the demo accounts (and signs them out), clears the demo customer's addresses/favorites/cart, deletes orders older than `DEMO_ORDER_RETENTION_DAYS` (default 7) and removes expired sessions/rate-limit rows. It never deletes real users and only writes what differs from the seed. Manual run: `DEMO_RESET_ENABLED=true npm run demo:reset`. Do **not** enable it for a real restaurant.

Client walkthrough: [DEMO_GUIDE.md](DEMO_GUIDE.md).

## Preview mode (no database)

If `DATABASE_URL` is empty, the storefront runs read-only from the seed menu (`prisma/seed-data.ts`) so the design can be viewed: home, menu, product pages, cart with server-side price quotes and coupons, checkout form, offers, about, contact, kk/ru/en. Placing orders, sign-in/registration, account, admin and kitchen need the database. A banner shows when preview mode is active.

```bash
npm run dev
```

## Quick start

Requirements: Node.js ≥ 22, npm, a [Neon](https://neon.tech) PostgreSQL project.

```bash
npm install
```

```bash
cp .env.example .env
```

Fill `.env` — see [Environment variables](#environment-variables). Then:

```bash
npm run db:deploy
```

```bash
npm run db:seed
```

```bash
npm run dev
```

Open http://localhost:3000 (Kazakh), http://localhost:3000/ru, http://localhost:3000/en.

Staff accounts are created by the seed **only** from `SEED_ADMIN_*`, `SEED_MANAGER_*`, `SEED_KITCHEN_*` (password ≥ 12 chars). Admins can promote other registered users in **Admin → Customers**.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build (`prisma generate && next build`) / start |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm test` | Vitest (unit + integration; integration is skipped without `TEST_DATABASE_URL`) |
| `npm run test:e2e` | Playwright E2E (needs `TEST_DATABASE_URL`) |
| `npm run db:migrate` | Create/apply a new migration in development (`prisma migrate dev`) |
| `npm run db:deploy` | Apply committed migrations (`prisma migrate deploy`) |
| `npm run db:seed` | Idempotent seed: restaurant, settings, 7 categories, 34 products, 2 coupons, optional staff, demo accounts |
| `npm run demo:reset` | Showcase reset (same code as the cron route); requires `DEMO_RESET_ENABLED=true` |
| `npm run test:e2e:preview` | Playwright UI tests against a build without a database |

## Environment variables

| Name | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | Neon **pooled** connection string (host contains `-pooler`), used at runtime |
| `DIRECT_URL` | yes (migrations/seed) | Neon **direct** connection string, used by Prisma CLI |
| `BETTER_AUTH_SECRET` | yes | ≥ 32 random bytes; signs sessions and derives order tracking tokens |
| `BETTER_AUTH_URL` | yes | Public base URL, e.g. `https://foodhub.example.kz` |
| `NEXT_PUBLIC_SITE_URL` | yes | Same public URL (canonical links, sitemap) |
| `SEED_*_EMAIL` / `SEED_*_PASSWORD` | no | Initial ADMIN / MANAGER / KITCHEN accounts for `db:seed` |
| `DEMO_PASSWORD` | no | Shared password of the four demo accounts (≥ 12 chars); empty disables the demo |
| `DEMO_RESET_ENABLED` / `CRON_SECRET` | no | Enable the nightly showcase reset; Vercel Cron sends `Bearer $CRON_SECRET` |
| `DEMO_ORDER_RETENTION_DAYS` | no | Orders newer than this survive the reset (default 7) |
| `TEST_DATABASE_URL` | tests | A **separate** Neon branch — integration tests truncate it |

More: [ARCHITECTURE.md](ARCHITECTURE.md) · [TESTING.md](TESTING.md) · [DEPLOYMENT.md](DEPLOYMENT.md) · [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

Photo credits: [public/images/CREDITS.md](public/images/CREDITS.md) (Unsplash License).
