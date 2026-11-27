# Web Seller Site

Single-owner digital products storefront with an Express API and PostgreSQL/Prisma backend. The storefront retains the original navy, blue and yellow visual design.

## Implemented
- Live storefront catalogue loaded from PostgreSQL (no sample products used as live inventory).
- Owner authentication with bcrypt password hashes and signed JWT sessions.
- Owner-only product create, edit, archive and inventory APIs.
- Checkout creates orders from server-side product prices.
- Flutterwave, Stripe Checkout and MTN MoMo Collections adapters.
- Payment confirmation via Flutterwave transaction verification, Stripe signed webhook and MTN status polling.
- Owner dashboard for product inventory and customer order review.
- API health endpoint, CORS allowlist, Helmet and request rate limiting.

## Setup
1. Use Node.js 20+ and a PostgreSQL database (Neon is supported).
2. Copy `.env.example` to `.env`. Set pooled Neon `DATABASE_URL`, direct `DIRECT_URL`, strong `JWT_SECRET` (32+ characters), `ADMIN_EMAIL` and `ADMIN_PASSWORD` (12+ characters).
3. Run `npm install`.
4. For development, run `npm run db:dev -- --name initial`; for deploy after migrations are committed, run `npm run db:migrate`.
5. Run `npm run db:seed` to create the owner account.
6. Run `npm run dev`. Health endpoint: `GET /api/health`.

## API
- `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/products`, `GET /api/products/admin/all`
- `POST /api/products`, `PATCH /api/products/:id`, `DELETE /api/products/:id`
- `POST /api/orders/checkout`, `GET /api/orders/:orderNumber`, `GET /api/orders/admin/all`
- `POST /api/payments/webhooks/flutterwave`, `POST /api/payments/webhooks/stripe`
- `GET /api/payments/mtn/:paymentId/status`

## Deploy
Deploy the API to Render or another Node host with build command `npm install` and start command `npm start`. Configure all server environment variables, run `npm run db:migrate` and `npm run db:seed`, and set CORS_ORIGINS to the exact storefront origin. On Vercel, set `window.WEB_SELLER_API_BASE` in `api-config.js` to the deployed API URL ending in `/api`.

Payment provider credentials must remain on the server. Set the webhook URLs in the merchant dashboards and test successful, pending, failed and duplicate notifications using sandbox credentials before going live. Availability, RWF settlement, fees and approval depend on each merchant account.

## Remaining before production launch
Private digital-file storage and expiring download links, email receipts, refund/reconciliation workflows, audit logging, database backups, monitoring, privacy/terms pages and end-to-end provider sandbox tests are still required. The repository code does not configure external merchant accounts, Neon, Render or Vercel automatically. Do not grant download access based on a browser redirect; only verified payment state can unlock files.
