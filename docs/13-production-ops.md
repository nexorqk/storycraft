# Production Operations Runbook

## Deployment Gates

Every release must pass:

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
```

Apply database migrations with:

```bash
pnpm db:migrate:deploy
```

Do not run `prisma migrate dev` against production.

## Required Environment

Production must set:

- `NODE_ENV=production`
- `USE_MOCK_AI=false`
- HTTPS `API_ORIGIN`, `WEB_ORIGIN`, and `GOOGLE_CALLBACK_URL`
- real `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- a high-entropy `SESSION_SECRET`
- production `DATABASE_URL` and `REDIS_URL`
- private production S3-compatible storage settings
- OpenAI credentials and model settings

The API refuses to boot in production when placeholder secrets, local endpoints,
or mock AI are configured.

## Kill Switches And Limits

- Set `GENERATION_ENABLED=false` to stop new generation requests without taking
  the app offline.
- Tune `GENERATION_MAX_ACTIVE_JOBS_PER_USER` to control per-user concurrency.
- Tune `GENERATION_DAILY_JOB_LIMIT_PER_USER` to cap retry churn and abuse.
- Tune `AI_MAX_ESTIMATED_BOOK_COST_USD` to reject unexpectedly expensive
  templates before queueing.

OpenAI provider-level budgets should also be configured in the provider account.

## Backups

The local `db-backup` Docker Compose service is only a development convenience.
Production backups must be provider-managed or run outside the app host.

Minimum production backup policy:

- encrypted PostgreSQL backups stored off-host;
- at least daily full backups before public launch;
- retention policy documented in the deployment platform;
- restore drill completed before launch and after major schema changes;
- alert when backups fail or when no recent successful backup exists.

Recommended restore drill:

1. Provision an empty staging database.
2. Restore the latest production-like backup.
3. Run `pnpm db:migrate:deploy` against the restored database.
4. Start API with staging credentials.
5. Verify `/api/health/ready` returns `200`.
6. Verify a sample account can list children/books.

## Readiness And Monitoring

Use:

- `/api/health` for liveness;
- `/api/health/ready` for readiness.

Readiness covers:

- PostgreSQL;
- BullMQ/Redis;
- object storage bucket access.

Production monitoring should alert on:

- non-2xx readiness for more than one check interval;
- queue growth or stuck active jobs;
- generation failure spikes;
- OpenAI auth/rate-limit/provider errors;
- S3 upload/delete failures;
- backup failures;
- high API 5xx rate.

## Data Rights

The API supports:

- `GET /api/account/export` for account data export;
- `DELETE /api/account` for account deletion.

Account deletion revokes sessions, removes generated storage objects, and deletes
the user row so database-owned records cascade through Prisma relations.

## Incident Flow

For runaway spend, provider incidents, or unsafe generation reports:

1. Set `GENERATION_ENABLED=false`.
2. Confirm new create/retry requests are rejected.
3. Pause queue workers if active jobs must stop immediately.
4. Inspect persistent `Job` records for affected book IDs.
5. Rotate provider credentials if auth keys may be compromised.
6. Re-enable generation only after a successful smoke test.
