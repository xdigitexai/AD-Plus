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
- `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`: leave empty until Meta OAuth is approved and configured.
- `PAYMENT_PROVIDER`: `disabled` until a real gateway adapter is installed.
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

## External callbacks reserved for later configuration

- Meta OAuth: `https://getadpulse.tech/api/integrations/meta/callback`
- Billing webhook: `https://getadpulse.tech/api/webhooks/billing/{provider}`
- Conversion API: `POST https://getadpulse.tech/api/v1/conversions` with `Authorization: Bearer <workspace-api-key>`
- Tracking redirect: `https://getadpulse.tech/r/{slug}`

Meta token exchange, ad-account synchronization, payment capture and external campaign mutations remain disabled until real provider credentials and adapters are supplied.
