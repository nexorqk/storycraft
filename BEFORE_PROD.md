# Before Production

This file tracks repository-level readiness. External deployment steps are
listed separately because they require real provider accounts, secrets, domains,
or legal review.

## Done In Repo

| Area                           | Status                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| MVP scope and flow             | Done: Google auth, children, templates, create flow, library, book detail, PDF download.                                        |
| Real AI path                   | Done: provider abstractions, OpenAI text, DALL-E images, mock mode, retries, timeout handling, non-retryable provider errors.   |
| Queue state                    | Done: BullMQ job plus persistent `Job` records, progress API, failed job history.                                               |
| Storage privacy                | Done: signed URLs for PDFs/illustrations; book/account deletion removes object keys from S3-compatible storage.                 |
| Runtime readiness              | Done: readiness checks cover Postgres, BullMQ/Redis, and object storage.                                                        |
| Production env validation      | Done: production rejects placeholder secrets, mock AI, localhost origins, local DB/Redis/storage defaults.                      |
| Expensive operation guardrails | Done: generation kill switch, active generation limit, daily generation job limit, estimated book cost cap.                     |
| Safety gate                    | Done: local safety checks on user inputs and generated story/illustration prompts, plus provider content-policy error handling. |
| Account data rights            | Done: authenticated account export endpoint, account deletion endpoint, Settings UI, server-side session revocation.            |
| Migration command              | Done: `pnpm db:migrate:deploy` uses `prisma migrate deploy`; Prisma config lives in `packages/db/prisma.config.ts`.             |
| CI                             | Done: GitHub Actions runs install, Prisma generate, format, typecheck, tests, and build.                                        |
| Staging smoke check            | Done: `pnpm smoke:staging` checks API liveness/readiness, public templates, anonymous auth rejection, and web root.             |
| Formatting/tests               | Done: `pnpm format:check`, `pnpm typecheck`, `pnpm test`, and `pnpm build` are expected release gates.                          |

## Required Outside Repo

| Area              | Required action                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Domains and TLS   | Configure production `WEB_ORIGIN`, `API_ORIGIN`, and `GOOGLE_CALLBACK_URL` with HTTPS domains.                          |
| Secrets           | Set real Google OAuth, session, OpenAI, database, Redis, and S3 credentials in the deployment platform.                 |
| Object storage    | Create a private production bucket, deny public reads, enable encryption/versioning if the provider supports it.        |
| Backups           | Configure encrypted offsite Postgres backups, define retention, and run a restore drill before launch.                  |
| Monitoring        | Connect production logs, metrics, alerts, and error tracking to the chosen platform.                                    |
| Legal/compliance  | Review Privacy Policy, data deletion/export behavior, AI provider terms, and child-data obligations for target markets. |
| Provider controls | Configure OpenAI project limits/budgets and Google OAuth consent screen for public availability.                        |
| Incident process  | Assign on-call ownership and document how to disable generation with `GENERATION_ENABLED=false`.                        |

## Release Gate Commands

Run these before deploying a release:

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
```

After staging deploy:

```bash
STAGING_API_URL=https://api.staging.example.com \
STAGING_WEB_URL=https://staging.example.com \
pnpm smoke:staging
```

For production database migration:

```bash
pnpm db:migrate:deploy
```
