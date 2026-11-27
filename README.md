# Web Seller Site

Single-owner digital products storefront. The existing navy/blue/yellow storefront styling and layout are retained. The backend foundation uses Express, Prisma and PostgreSQL (Neon-compatible).

## Features in this branch
- PostgreSQL data model for owner, products, orders, line items, payments and webhook events.
- Owner login using bcrypt password hashes and signed JWT bearer tokens.
- Owner-only product create, edit, archive and inventory APIs.
- Public product catalogue API.
- Checkout with server-calculated totals (never trust prices sent by the browser).
- Payment adapters for Flutterwave, Stripe Checkout and MTN MoMo Collections.
- Server-side payment confirmation: Flutterwave transaction verification, Stripe signed webhook and MTN status lookup.
- Basic API hardening: Helmet, CORS allowlist, JSON size limit and rate limiting.

## Local setup
1. Use Node.js 20+ and a PostgreSQL database (Neon works).
2. Copy `.env.example` to `.env`. Set DATABASE_URL (pooled Neon URL), DIRECT_URL (direct Neon URL), JWT_SECRET (32+ random characters), ADMIN_EMAIL and a strong ADMIN_PASSWORD (12+ characters).
3. Run `npm install`.
4. Run `npm run db:dev -- --name initial` to generate and apply the initial migration in development.
5. Run `npm run db:seed` to create/update the single owner account.
6. Run `npm run dev`; health endpoint is `/api/health`.

For production, commit the generated migration directory and run `npm run db:migrate` as a release step. Do not use `prisma db push` as the production migration process.

## API
- `POST /api/auth/login` — owner sign-in; returns a bearer token.
- `GET /api/auth/me` — validate owner session.
- `GET /api/products` — active products; optional `q` and `category`.
- `GET /api/products/admin/all` — owner inventory.
- `POST /api/products`, `PATCH /api/products/:id`, `DELETE /api/products/:id` — owner-only CRUD; delete archives.
- `POST /api/orders/checkout` — body: `{email,name?,phone?,provider,items:[{productId,quantity}]}`.
- `GET /api/orders/:orderNumber` — customer-facing order status.
- `GET /api/orders/admin/all` — owner order list.
- `POST /api/payments/webhooks/flutterwave` — signed webhook then transaction verification.
- `POST /api/payments/webhooks/stripe` — signed raw-body webhook.
- `GET /api/payments/mtn/:paymentId/status` — query MTN payment status.

## Payment setup
Configure only gateways for which your merchant account has active credentials and Rwanda/currency support. Set the Flutterwave webhook URL to `https://YOUR_API_HOST/api/payments/webhooks/flutterwave` and configure the webhook hash. Set Stripe webhook URL to `https://YOUR_API_HOST/api/payments/webhooks/stripe` and subscribe to `checkout.session.completed`. MTN MoMo needs the Collections product subscription, API user/key and correct target environment. Use sandbox credentials first. Provider availability, settlement currencies, fees and approval depend on your merchant account. Never expose provider secrets in frontend files.

## Deploy
Deploy the API to a persistent Node host (for example Render) with build command `npm install`, start command `npm start`, and environment variables from `.env.example`. Configure exact storefront origins in CORS_ORIGINS. Run `npm run db:migrate` and `npm run db:seed` after the migration is committed. Deploy the static storefront to Vercel and set `window.WEB_SELLER_API_BASE` in `api-config.js` to the API origin ending in `/api`.

## Not yet production-complete
This is a backend and integration foundation, not proof of live credentials or deployed infrastructure. Before taking live orders, complete the migration, wire/test the storefront and admin pages, add private object storage with expiring download grants, email receipts, refunds/reconciliation, audit logs, backups, monitoring, privacy/terms pages and provider sandbox tests. Never release digital files based on a browser redirect; grant downloads only after confirmed server-side payment.
