# UI / UX audit — FoodHub (pre-database)

Date: 2026-11-04 · Scope: everything testable **without** PostgreSQL (preview mode: `DATABASE_URL` empty).

## Method

1. Code review of every route, layout and component under `src/app/[locale]` and `src/components`.
2. Automated sweep — [`scripts/ui-audit.mjs`](scripts/ui-audit.mjs): 20 routes × 3 locales (kk/ru/en) × 7 widths (360, 390, 430, 768, 1024, 1440, 1920) = **420 page views**, checking HTTP status, console/hydration errors, horizontal overflow, touch targets < 24 px, images without `alt`, broken images, raw translation keys and the number of `<h1>`. Screenshots at 390 and 1440 px. With reduced motion enabled, to catch motion-related bugs.
3. Manual browser inspection (Playwright) of the hero, menu, product customization, cart, coupon, checkout validation, login, contact, mobile navigation and cart drawer.
4. New preview-mode browser test suite: [`e2e/preview.spec.ts`](e2e/preview.spec.ts).

Priorities: **P0** broken / wrong data · **P1** clearly visible defect or accessibility failure · **P2** polish.

## Findings and fixes

| # | Pri | Area | Finding | Fix | Status |
|---|---|---|---|---|---|
| 1 | P0 | Routing | Every un-prefixed Kazakh route except `/` returned 404. The proxy matcher regex had lost a backslash (`.*\..*` became `.*..*`), so the locale middleware only ran for `/`. | Restored `/((?!api\|_next\|_vercel\|.*\\..*).*)` in `src/proxy.ts`. | ✅ |
| 2 | P0 | Cart | The cart stayed on its skeleton forever: the persisted store rehydrated synchronously during `create()`, so `onRehydrateStorage` referenced the store before it existed. | `skipHydration: true` + `hydrateCart()` called from a client effect (SSR-safe). | ✅ |
| 3 | P0 | i18n / hydration | Prices rendered as `3 490 ₸` on the server but `3,490 ₸` in Chromium (incomplete `kk-KZ` ICU data), which caused hydration errors on every price. | Deterministic number/date formatting in `lib/domain/money.ts` (no locale-dependent `Intl` output); chart labels too. Unit tests added. | ✅ |
| 4 | P0 | Checkout | Nested `<form>`: the promo-code form sat inside the checkout form (invalid HTML, hydration error). | Coupon input is now a non-form group (Enter / button apply). | ✅ |
| 5 | P1 | Fonts | `next/font/google` timed out on this network (`fonts.gstatic.com`), breaking every page in dev. | Self-hosted fonts from npm (`@fontsource-variable/inter`, `@fontsource/noto-serif`) with Cyrillic/Kazakh glyphs. | ✅ |
| 6 | P1 | Preview mode | Without a database, Better Auth crashed at import and account/admin/kitchen redirected to a sign-in that could never work. | Lazy DB client; **setup-required screens** for account, admin and kitchen with exact setup steps. No fixture data shown as business data; kitchen board renders empty with polling and actions disabled. | ✅ |
| 7 | P1 | Hero (reduced motion) | Server and client rendered different `style`/`class` for users with *reduce motion* (hydration attribute mismatch). | `MotionConfig reducedMotion="user"`; CSS disables the float loop. | ✅ |
| 8 | P1 | Header | Nav labels wrapped onto two lines at 1024–1440 px (“Басты / бет”, “Тіркелу/ / Кіру”). | `whitespace-nowrap`, responsive font size and spacing. | ✅ |
| 9 | P1 | Accessibility | Touch targets below 24 px: language switcher (22 px), footer links, “Back to menu”, “Clear cart”. | Enlarged hit areas (min 28–40 px). | ✅ |
| 10 | P1 | Accessibility | Order-not-found page had no `<h1>`. | `EmptyState` supports a heading level; used `h1`. | ✅ |
| 11 | P2 | Hero | Slides 2–3 showed the rectangular edge of the photo background; the next slide's image sometimes appeared late. | Soft radial mask; all three hero images preloaded. | ✅ |
| 12 | P2 | Checkout UX | No sense of progress through the purchase flow. | `Cart → Details → Confirmation` stepper on cart and checkout (labels collapse to the active step on phones). | ✅ |
| 13 | P2 | Cart UX | Free-delivery hint was text only. | Animated progress bar towards the free-delivery threshold. | ✅ |
| 14 | P2 | Loading states | No skeletons for product detail and checkout. | `loading.tsx` for both. | ✅ |
| 15 | P2 | Preview banner | The fixed banner covered the bottom of the footer. | Spacer below the footer in preview mode. | ✅ |
| 16 | P2 | Microinteractions | Cart badge changed silently. | Badge zoom-in animation on count change; refined card hover (accent border + warm glow, disabled for reduced motion). | ✅ |
| 17 | P2 | Visual direction | Inner pages were flat graphite. | 70/30 direction: subtle warm/cool radial gradients behind inner pages, gradient card surfaces. | ✅ |
| 18 | P2 | Cart (preview) | “Checkout” was disabled in preview, so the checkout page could not be reviewed. | Checkout opens; only **Place order** is disabled, with an honest message. | ✅ |
| 19 | P2 | Assets | `/favicon.ico` returned 404. | Generated favicon matching the logo. | ✅ |

### Verified OK (no change needed)

- **No horizontal overflow** on any of the 420 page views (category chips and admin tables scroll inside their own containers by design).
- No broken images; every `<img>` has `alt` (decorative images use `alt=""`).
- No raw translation keys in kk/ru/en; translation key parity is enforced by a unit test.
- Exactly one `<h1>` per page (after fix 10); `lang` attribute matches the route locale.
- Focus rings visible (`:focus-visible` accent outline); skip link works; dialogs/sheets use Radix (focus trap, Esc to close, labelled).
- Reduced motion: global CSS override + Motion `reducedMotion="user"`.
- SEO: per-page metadata, canonical + hreflang, sitemap, robots disallowing private routes, JSON-LD; private pages are `noindex`.

## Not testable without the database (next phase)

| Area | Why blocked | What to verify after Neon is connected |
|---|---|---|
| Placing orders, tracking, cancellation | Needs `Order` tables | Full E2E (`npm run test:e2e`), idempotency, coupon limits |
| Sign-up / sign-in / sessions | Better Auth stores users and sessions in PostgreSQL | Auth flows, rate limits, role redirects |
| Account pages (orders, addresses, favorites, settings) | User data | Forms, empty states, pagination with real rows |
| Admin screens (orders, products, categories, coupons, customers, analytics, settings) | All read/write the DB | Table responsiveness with real data, CRUD dialogs, charts with real orders, CSV export |
| Kitchen workflow | Live orders | Polling, sound on new orders, status transitions, tablet layout with cards |
| Integration tests (17) | `TEST_DATABASE_URL` | `npm run test:integration` |

## Remaining recommendations (not done, by design or scope)

- Real brand photography (current images are Unsplash stock, credited in `public/images/CREDITS.md`).
- Admin tables are horizontally scrollable on phones rather than card-based; review with real data volumes before redesigning.
- Online payment UI is intentionally a disabled placeholder until a verified provider is integrated.
