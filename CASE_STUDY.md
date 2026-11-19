# Case study — FoodHub: online ordering and restaurant operations in one app

**Type:** portfolio project (demo restaurant, sample menu; not a client engagement)
**Market:** Kazakhstan: prices in KZT, Kazakh / Russian / English, Almaty time zone
**Stack:** Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS 4, Prisma 7, Neon PostgreSQL,
Better Auth, next-intl, Zustand, Recharts, Vitest, Playwright; deployed on Vercel.

## The problem

A small restaurant usually ends up with several disconnected tools:

- a website that only shows the menu;
- orders arriving by phone or messenger;
- a kitchen working from handwritten notes;
- no reliable numbers on what sells and when.

FoodHub replaces them with one system, where the customer, the kitchen and the manager work on the same order record.

## What was built

- **Storefront.** Menu with search and filters, plus product pages with sizes and modifier groups (required sauce, optional toppings). It has a cart, a delivery/pickup checkout and a private order-tracking page that updates on its own.
- **Customer accounts.** Order history, saved addresses and favourites. A guest cart merges into the account cart on sign-in.
- **Kitchen display.** A four-column live board (New → Confirmed → Preparing → Ready) with timers, priority colours, a chime for new orders and one-tap status changes.
- **Admin panel.**
  - Orders, plus a menu editor for products, variants, modifiers, availability and categories.
  - Promo codes, customers and staff roles, and restaurant settings (delivery fee, minimum order, opening hours).
  - Analytics: revenue by day, week or month, average order value, top dishes, peak hours, coupon usage, and CSV export.
- **Three languages.** Kazakh is the default; Russian and English are also available, including validation messages and order statuses.
- **Public demo mode.**
  - One-click demo accounts for all four roles, plus a floating bar to switch between them.
  - Every switch creates a real server session, so the demo is restricted by the same permission checks as real users.
  - A nightly job restores the menu and clears visitor data.

## Engineering decisions that matter

**The server owns every price.** The browser sends only product, size and modifier IDs. The total (modifiers, coupon, delivery fee, minimum order) is recalculated from the database in one transaction. The order stores a snapshot of names and prices, so later menu edits never change past receipts. Pricing lives in pure functions with their own unit tests.

**Checkout is idempotent.** Each checkout carries an idempotency key. A double click or a retried request on a slow mobile network returns the same order instead of creating two. Coupon usage limits are enforced with an atomic conditional update, not a read-then-write.

**Order status is a state machine.** The allowed transitions are explicit, and each transition is checked against the actor's role (guest, customer, kitchen, manager, admin). Every change is written to a status history with the actor, which drives both the tracking page and the audit trail.

**Order tracking is private without an account.** A guest's tracking link carries an HMAC-derived token. The database stores only its hash, and a link without the token returns "not found".

**Built for a serverless Postgres.** Neon suspends idle databases, and the first query after that can take several seconds or drop a connection:

- **Reads:** retried with back-off.
- **Writes:** never retried automatically; checkout relies on its idempotency key instead.
- **Transactions:** time limits were raised after a real "unable to start a transaction" failure was reproduced.

**Correct Kazakh formatting.** Browsers ship incomplete locale data for `kk-KZ`, which caused server/client hydration mismatches. Money and dates are formatted deterministically (`12 950 ₸`), with tests.

**A public demo that can't be broken.** Demo accounts can explore every panel but cannot:

- change roles or settings;
- delete or archive data;
- change passwords or revoke sessions.

Other customers' personal data is masked for them. The restrictions are enforced in the auth layer and in the server actions, not just hidden in the UI. The nightly reset compares the database with the seed and writes only the differences; real user accounts are never touched.

## Quality and verification

| Check | Result |
|---|---|
| TypeScript strict + ESLint | clean |
| Unit tests (Vitest) | 58: pricing, validation, status machine, formatting, retry logic, demo masking |
| Integration tests (real PostgreSQL) | 20: checkout and pricing, coupon limits, idempotency, status permissions, admin actions, demo restrictions, nightly reset |
| End-to-end, with database (Playwright) | 11: sign-up → order → history; guest checkout and cancellation; kitchen workflow; admin product lifecycle; access control; mobile navigation |
| End-to-end, preview build (Playwright) | 38: every public page in all three languages |
| Production build | passes |

Integration and E2E tests run against a separate test database, never the live one.

**Bugs found and fixed through this testing:**

- The cart quantities doubled after a page reload for signed-in users.
- Cart changes were lost on fast navigation.
- The checkout form showed the missing-address error only after the phone was fixed, instead of all errors at once.

## Honest limitations

These are not included, because each needs a real external service and a business account:

- online card payments (only cash on delivery or at pickup);
- SMS or email notifications;
- delivery-courier tracking.

The architecture leaves room for them: payment is tracked separately from order status, and the order flow already has the states a payment webhook would need.

On the free Neon tier, the first request after a quiet period takes about 6–7 seconds while the database wakes up. A paid tier can keep it always on.

## Links

- Live demo: *(added after deployment)*
- Source code: *(added after publishing the repository)*
- Five-minute walkthrough: [DEMO_GUIDE.md](DEMO_GUIDE.md)
