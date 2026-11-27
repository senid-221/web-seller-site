# Web Seller Site

A responsive, single-owner digital products storefront starter.

## Included
- `index.html`: storefront, product categories, search, featured product cards and demo cart.
- `admin.html`: owner product-management form concept (not connected to a backend).

## Deploy on Vercel
1. Import this GitHub repository into Vercel.
2. Select **Other** as framework preset (or leave auto-detect).
3. Leave build command and output directory empty for this static HTML starter.
4. Deploy.

## Important limitations
This is a frontend prototype. It does not yet have customer/admin authentication, a database, real checkout, payment verification, order history, or protected digital downloads. Sample products and RWF prices are placeholders.

Before accepting real payments, implement:
- Server-side owner-only authentication and authorization.
- Database-backed products, customers and orders.
- Payment gateway integration with verified server-side webhooks.
- Private file storage and expiring download links issued only after confirmed payment.
- Order emails, support, terms and privacy policy.
