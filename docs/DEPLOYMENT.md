# Deployment — Vercel + Neon

## 1. Neon

1. Create a project at https://console.neon.tech (region close to Kazakhstan, e.g. `aws-eu-central-1` Frankfurt).
2. *Connection details* → copy both strings:
   - **Pooled** (host contains `-pooler`) → `DATABASE_URL`
   - **Direct** (no `-pooler`) → `DIRECT_URL`
3. Optional: create a `test` branch for automated tests (`TEST_DATABASE_URL`) and a `preview` branch for Vercel preview deployments.

## 2. Apply the schema and seed (from your machine)

```bash
npm run db:deploy
```

```bash
npm run db:seed
```

Set `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (≥ 12 chars) in `.env` before seeding to create the first admin. Re-running the seed is safe: it upserts the catalog and never changes existing passwords.

## 3. Vercel

1. Push the repository to GitHub/GitLab and import it in Vercel (framework: Next.js; build command from `package.json`: `prisma generate && next build`).
2. Project → Settings → Environment Variables (Production, and Preview with the preview branch URLs):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon pooled URL |
| `DIRECT_URL` | Neon direct URL |
| `BETTER_AUTH_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `BETTER_AUTH_URL` | `https://<your-domain>` |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-domain>` |
| `DEMO_PASSWORD` | showcase only: shared demo-account password (then run `npm run db:seed`) |
| `DEMO_RESET_ENABLED` | showcase only: `true` to enable the nightly reset — never on a real restaurant |
| `CRON_SECRET` | showcase only: 16+ random characters; Vercel Cron sends it as `Authorization: Bearer …` |

`vercel.json` pins the functions to **fra1** (Frankfurt) — create the Neon project in AWS eu-central-1 (Frankfurt) too, otherwise every query crosses regions. It also schedules `/api/cron/demo-reset` daily at 21:00 UTC (02:00 Almaty); the route answers 404 unless `DEMO_RESET_ENABLED="true"`. Vercel Hobby allows one run per day, which is all this needs.

3. Migrations: either run `npm run db:deploy` before each release, or set the Vercel **Build Command** to `npm run db:deploy && npm run build` so migrations apply automatically (requires `DIRECT_URL`).
4. Deploy. Public pages are ISR (5 min) and are refreshed immediately after admin edits.

The Neon integration in the Vercel Marketplace can create `DATABASE_URL` and preview branches automatically; keep `DIRECT_URL` for Prisma.

## Production checklist

- [ ] Strong unique `BETTER_AUTH_SECRET` per environment (rotating it invalidates sessions and existing tracking links).
- [ ] `BETTER_AUTH_URL` / `NEXT_PUBLIC_SITE_URL` match the real domain (auth origin checks depend on it).
- [ ] Real restaurant phone, email, address and hours entered in **Admin → Settings** (seed values are demo placeholders).
- [ ] Replace demo menu/photos as needed (Admin → Products).
- [ ] Not included and requiring external services: transactional email (verification, password reset, order emails), online card payments (verified provider + server-side confirmation + signed webhooks), error monitoring, WAF/bot protection. Rate limiting is DB-backed and works on Vercel as-is.
- [ ] Showcase vs. real restaurant: for a real restaurant leave `DEMO_PASSWORD` empty and `DEMO_RESET_ENABLED` unset, and remove the demo users (`*@foodhub.example.com`).
- [ ] Neon free tier suspends the compute after ~5 min idle; the first request after that takes several seconds (reads are retried automatically). For a client-facing demo, open the site once shortly before showing it, or use a plan that allows disabling auto-suspend.
- [ ] Neon: enable point-in-time restore / backups appropriate for your plan.
