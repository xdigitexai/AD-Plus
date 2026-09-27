# ADPulse 2.0 — XDIGITEX deployment handoff

## Runtime and services

- Node.js 22 LTS or newer; npm 10 or newer.
- PostgreSQL 15 or newer with a dedicated database and user.
- A process manager such as systemd or PM2 behind the web server configured by XDIGITEX.
- No queue or cron worker is required for Sprint 1. Schedule automation evaluation and external-ad sync only when those workers are implemented.

## Environment

Copy `.env.example` to `.env` on the server and configure:

- `DATABASE_URL`: PostgreSQL connection URL. Require TLS when the database is remote.
- `AUTH_SECRET`: at least 32 random characters, unique to production.
- `TOKEN_ENCRYPTION_KEY`: exactly 64 hexadecimal characters (32 bytes); back it up securely because encrypted integration tokens depend on it.
- `APP_URL`: `https://getadpulse.tech`.
- `TRUST_PROXY`: `true` when requests pass through the production reverse proxy.
- `CURRENCY`: ISO 4217 code used for every amount the application stores and displays. Production uses `USD`; `src/lib/currency.ts` is the single source of truth and every column default follows it.
- `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`: leave empty until Meta OAuth is approved and configured.
- `PAYMENT_PROVIDER`: `xdigitex-pay` to route checkout through the Xdigitex Pay adapter, or `disabled`.
- `XDIGITEX_PAY_API_KEY`: Xdigitex Pay API key (`pg_…`), sent as the `X-API-Key` header. Required before any checkout can be created.
- `XDIGITEX_PAY_BASE_URL`: defaults to `https://pay.xdigitex.space/api`.
- `XDIGITEX_PAY_WEBHOOK_URL`: optional override; defaults to `{APP_URL}/api/webhooks/billing/xdigitex-pay`. Register the same value as `webhook_url` in the Xdigitex Pay dashboard.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`: temporary values used once by the seed command to create or promote the first administrator. Remove the password after seeding.

Do not commit `.env`.

## Install and release

```bash
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run build
npm run start
```

Run migrations before starting the new application process. `npm run db:seed` is idempotent for plans and the first admin.

## Operations

- Start command: `npm run start` (defaults to port 3000; set `PORT` if needed).
- Health endpoint: `GET /api/health` returns HTTP 200 only when PostgreSQL is reachable.
- Writable directories: none; uploads are not stored on the application filesystem.
- Database backups: enable daily PostgreSQL backups and test restoration.
- First admin: set `ADMIN_EMAIL` and a 12+ character `ADMIN_PASSWORD`, run `npm run db:seed`, then remove `ADMIN_PASSWORD` from the environment.

## External callbacks

- Meta OAuth: `https://getadpulse.tech/api/integrations/meta/callback`
- Billing webhook: `https://ad-plus.novaspack.com/api/webhooks/billing/xdigitex-pay` (POST, JSON)
- Conversion API: `POST https://getadpulse.tech/api/v1/conversions` with `Authorization: Bearer <workspace-api-key>`
- Tracking redirect: `https://getadpulse.tech/r/{slug}`

## Payments — Xdigitex Pay

`src/lib/billing/xdigitex-pay.ts` implements `BillingProvider` against the documented API
(`https://pay.xdigitex.space/docs`): `POST /payments/initiate` for checkout and
`GET /payments/{reference}/status` for verification. Checkout is created by
`POST /api/billing/checkout`; the webhook handler is
`POST /api/webhooks/billing/xdigitex-pay`.

The documentation defines no webhook signature, so the callback body is never trusted on its own:
the handler re-reads the authoritative status, amount and currency from
`GET /payments/{reference}/status` with the account API key before settling a payment. Each verified
callback is written to `PaymentEvent` under the unique key `(provider, providerReference, event)`,
so a replayed webhook can never credit the same payment twice.

There is one payment provider for the whole application — the schema has no per-country provider
setting. Xdigitex Pay serves its 14 documented countries from that single account and derives the
country, mobile network and mobile-money currency from the customer phone number.

### Gateways exposed to customers

`src/lib/billing/provider.ts` still types every gateway the API documents (`card`, `mobile`,
`safaricom`, `airtel`, `crypto`), but the interface only offers two:

- **Carte bancaire** (`card`) — the API answers with a `redirect_url` and the customer completes the
  payment on the hosted checkout page.
- **Mobile Money** (`mobile`) — the customer never leaves `ad-plus.novaspack.com`. `POST /api/billing/checkout`
  returns the reference with `redirectUrl: null`, and the panel polls
  `GET /api/billing/payments/{reference}/status`, which reads `GET /payments/{reference}/status`
  server-side and reports pending → completed/failed in place. The provider's own polling page
  (`checkout_url`) is recorded as payment metadata and is never used for navigation.

### Country, currency and the USD credit

The customer is never asked for a country or a currency. `src/lib/billing/countries.ts` resolves the
country from the phone number's dial code (the served corridors, plus other dial codes for naming only),
and falls back to the browser locale region (`navigator.language`) as a pre-selection; a typed dial code
wins. Above the served corridors the panel says so and the payment falls back to card. No redirect and no
extra step is involved.

The balance is always credited in USD. Card is charged in the plan currency. Mobile Money is charged in
the corridor's local currency, converted on the way out with the explicit table in `src/lib/billing/fx.ts`
(`XDIGITEX_PAY_RATES`, since the API documentation publishes no rate); `Payment.amount` holds the USD
price, and `src/lib/billing/settle.ts` credits that figure — never the gateway-reported amount, which it
only uses to check that the confirmed amount matches what was initiated.

Both the webhook and the in-app status poll settle through `src/lib/billing/settle.ts`, so the amount
check, the `PaymentEvent` unique key and the invoice/subscription updates are identical on both paths.

Meta token exchange, ad-account synchronization and external campaign mutations remain disabled until real provider credentials and adapters are supplied.
