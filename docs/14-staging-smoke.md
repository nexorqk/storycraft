# Staging Smoke Checks

Use this after deploying API and Web to staging, after applying migrations.

## Automated Checks

Set the staging origins and run:

```bash
STAGING_API_URL=https://api.staging.example.com \
STAGING_WEB_URL=https://staging.example.com \
pnpm smoke:staging
```

For API-only deployments:

```bash
STAGING_API_URL=https://api.staging.example.com \
SMOKE_SKIP_WEB=true \
pnpm smoke:staging
```

The script verifies:

- `GET /api/health` returns `200` and JSON `status: "ok"`;
- `GET /api/health/ready` returns `200` and JSON `status: "ok"`;
- `GET /api/templates` returns `200` with a `templates` array;
- `GET /api/books` returns `401` without a session;
- Web root returns `200` or redirects anonymous users to `/login`, unless
  `SMOKE_SKIP_WEB=true`.

## Manual Happy Path

Run this once with real staging provider credentials:

1. Sign in with Google.
2. Create a child profile with ordinary interests.
3. Create a book with `USE_MOCK_AI=false`.
4. Watch the book reach `COMPLETED`.
5. Open the book detail page and verify illustration URLs render.
6. Download the PDF.
7. Delete the book and confirm the object keys are gone from storage.
8. Export account data from Settings.
9. Delete the account from Settings and confirm the session is no longer valid.

## Failure Checks

- Set `GENERATION_ENABLED=false`, redeploy/restart API, and confirm new book
  creation returns a clear unavailable error.
- Temporarily lower `AI_MAX_ESTIMATED_BOOK_COST_USD` and confirm expensive
  templates are rejected before queueing.
- Confirm `/api/health/ready` fails if Redis or object storage is unavailable.
