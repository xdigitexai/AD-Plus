# ADPulse 2.0

ADPulse is a French-first advertising intelligence SaaS for campaign management, privacy-conscious link tracking, conversions, analytics, smart routing, integrations, billing and automation.

## Local development

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

The app expects PostgreSQL. Public tracking redirects use `/r/:slug`; authenticated conversion ingestion uses `POST /api/v1/conversions` with a workspace API key.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the production handoff.
