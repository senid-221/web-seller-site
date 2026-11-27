# Web Seller Site

A single-owner digital products store. The original storefront visual design is retained; the application now includes a Node.js API, PostgreSQL/Prisma data model, owner authentication, product management endpoints, order creation and payment-provider integrations.

## Architecture

- **Storefront:** existing responsive `index.html` design (static frontend).
- **API:** Node.js 20+, Express 5.
- **Database:** PostgreSQL (Neon compatible) with Prisma.
- **Authentication:** bcrypt password hashes and short-lived signed JWTs; owner role is seeded from environment variables.
- **Payments:** provider adapters for Flutterwave, Stripe Checkout and MTN MoMo Collections. A payment is only marked paid after a server-side provider verification/webhook.
- **Currency:** integer minor units are not assumed for RWF. Stripe amounts are converted to the provider's smallest unit; validate currency/provider support with your merchant account before going live.

## Local setup

1. Install Node.js 20+ and PostgreSQL, or create a Neon PostgreSQL database.
2. Copy `.env.example` to `.env` and set every required value. Use Neon pooled `DATABASE_URL` for runtime and direct `DIRECT_URL` for migrations.
3. Install dependencies: `npm install`.
4. Create/apply the database schema: `npm run db:dev` (local development) or `npm run db:migrate` (deployment after migration files are committed).
5. Create the owner account: `npm run db:seed`.
6. Start API: `npm run dev`; health check: `GET http://localhost:4000/api/health`.

## API

- `POST /api/auth/login` — owner/customer login; returns JWT.
- `GET /api/auth/me` — current authenticated account.
- `GET /api/products` — active products; supports `q` and `category`.
- `GET /api/products/admin/all` — owner-only inventory.
- `POST /api/products`, `PATCH /api/products/:id`, `DELETE /api/products/:id` — owner-only product CRUD (delete archives).
- `POST /api/orders/checkout` — creates order/payment. Body: `{ email, name?, phone?, provider, items: [{ productId, quantity }] }`.
- `GET /api/orders/:orderNumber` — order status.
- `POST /api/payments/webhooks/flutterwave` and `POST /api/payments/webhooks/stripe` — verified provider callbacks.
- `GET /api/payments/mtn/:paymentId/status` — server-side MTN payment status verification.

## Payment setup

Configure only providers for which you have approved merchant credentials. Never put secret keys in frontend code. Set webhook URLs in each provider dashboard to the deployed API. Flutterwave requires its webhook hash and server-side transaction verification. Stripe requires its webhook signing secret and Checkout configuration. MTN MoMo requires a Collections product subscription, API user/key and correct target environment. Test with sandbox credentials and real webhook delivery before enabling production payments.

**Important:** provider availability, currency support, settlement, fees, and account approval depend on your merchant agreement and country. Do not assume a provider is live merely because its environment variables are present.

## Deployment

Deploy the API as a Node service (Render, Railway, or another persistent Node host) with the environment variables above. Set the build command to `npm install` and start command to `npm start`. Run `npm run db:migrate` and `npm run db:seed` as controlled release/setup steps. Deploy the existing static storefront to Vercel or serve it from a static host. Configure `CORS_ORIGINS` to the exact production storefront origin(s), and update the frontend to call the deployed API.

## Production checklist before accepting real orders

- Commit and review a Prisma migration generated with `npm run db:dev`; do not use `db push` as a production migration strategy.
- Configure a persistent PostgreSQL database, strong unique JWT secret, owner password, TLS and exact CORS origins.
- Configure and test provider webhooks, duplicate-event handling, amount/currency checks, refunds and reconciliation. Never trust a browser redirect as proof of payment.
- Complete the storefront/admin UI integration with the API; current `index.html` cart and `admin.html` are still the original prototype UI and are not yet wired to these endpoints.
- Add private object storage and signed, expiring download delivery before selling downloadable files. Do not expose private files from a public web directory.
- Add email receipts, customer order history, audit logs, backups, monitoring, privacy/terms pages and security review.
- Run provider-specific sandbox tests, including failed, pending, duplicate and out-of-order webhook events.

This repository contains a backend foundation, not a claim that live payment accounts, credentials, hosting or production verification have already been configured.
