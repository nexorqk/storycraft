# Backend Foundation

Date: 2026-05-15

## Scope

This slice strengthens the NestJS API foundation before implementing auth or
business workflows.

## Added

- Global request ID middleware.
- `x-request-id` response header for every API request.
- Global exception filter with consistent JSON error responses.
- Global validation pipe with:
  - `whitelist`;
  - `forbidNonWhitelisted`;
  - `transform`.
- Cookie parsing middleware for future auth sessions.
- Shutdown hooks for graceful NestJS lifecycle handling.
- Liveness endpoint: `GET /api/health`.
- Readiness endpoint: `GET /api/health/ready`.
- Database readiness check through Prisma.

## Not Included

- Google OAuth implementation.
- Session persistence.
- User, child, template, or book endpoints.
- BullMQ processors or named queues.
- Storage service implementation.

## Expected API Behavior

Errors should use the common response shape:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": {},
  "path": "/api/example",
  "requestId": "request-id",
  "timestamp": "2026-05-15T00:00:00.000Z"
}
```

`details` is optional and is used when an exception carries structured context,
such as readiness check failures.

`GET /api/health` checks that the API process is alive.

`GET /api/health/ready` checks that required backend dependencies are ready.
Currently, it checks PostgreSQL through Prisma.

## Verification Completed

Static checks:

```bash
pnpm typecheck
pnpm build
pnpm format:check
pnpm test
```

Runtime checks:

```bash
docker compose up -d postgres redis
pnpm dev:api
curl -i http://localhost:3001/api/health
curl -i http://localhost:3001/api/health/ready
```

Both health endpoints returned `HTTP/1.1 200 OK`. The readiness endpoint returned
`"database": { "status": "ok" }`.

## Next Step

Move to Google OAuth:

- add auth dependencies;
- implement Google strategy;
- create or update users from Google profile data;
- issue secure httpOnly session cookies;
- add `/api/auth/me`;
- protect user-owned routes when they are introduced.
