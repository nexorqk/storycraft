# Google OAuth

Date: 2026-05-15

## Scope

This slice adds the backend Google OAuth entrypoint and session cookie handling.
It does not add frontend login UI yet.

## Endpoints

- `GET /api/auth/google`: redirects the user to Google OAuth.
- `GET /api/auth/google/callback`: handles the Google callback, creates or
  updates the user, sets the session cookie, and redirects to the web origin.
- `GET /api/auth/me`: returns the current public user from the session cookie, or
  `null` when unauthenticated.
- `POST /api/auth/logout`: clears the session cookie.
- `SessionAuthGuard`: reusable guard for future authenticated user-owned routes.
- `CurrentUser`: reusable decorator for accessing the authenticated public user
  after `SessionAuthGuard`.

## Session Model

The API stores the session as a JWT in an httpOnly cookie.

Cookie settings:

- cookie name comes from `AUTH_COOKIE_NAME`;
- TTL comes from `AUTH_SESSION_TTL_SECONDS`;
- `httpOnly` is always enabled;
- `sameSite` is `lax`;
- `secure` is enabled in production.

## User Creation

On successful Google callback, the backend:

- reads the Google profile email;
- updates an existing user by `googleId` when present;
- links an existing email user to the Google ID when needed;
- creates a new user otherwise.

## Required Environment

```bash
API_ORIGIN=http://localhost:3001
WEB_ORIGIN=http://localhost:3000
GOOGLE_CLIENT_ID=replace-me
GOOGLE_CLIENT_SECRET=replace-me
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
SESSION_SECRET=replace-me
AUTH_COOKIE_NAME=storycraft_session
AUTH_SESSION_TTL_SECONDS=2592000
```

The Google OAuth app must allow this callback URL:

```text
http://localhost:3001/api/auth/google/callback
```

## Verification Completed

Database setup:

```bash
DATABASE_URL='postgresql://storycraft:storycraft@localhost:5432/storycraft?schema=public' \
  pnpm --filter @storycraft/db exec prisma migrate dev --schema prisma/schema.prisma --name init

DATABASE_URL='postgresql://storycraft:storycraft@localhost:5432/storycraft?schema=public' \
  pnpm --filter @storycraft/db exec prisma migrate dev --schema prisma/schema.prisma --name add_rating_book_relation

DATABASE_URL='postgresql://storycraft:storycraft@localhost:5432/storycraft?schema=public' \
  pnpm db:seed
```

Static checks:

```bash
pnpm typecheck
pnpm build
pnpm format:check
```

Runtime checks with local placeholder Google credentials:

```bash
DATABASE_URL='postgresql://storycraft:storycraft@localhost:5432/storycraft?schema=public' \
SESSION_SECRET='local-development-session-secret' \
GOOGLE_CLIENT_ID='replace-me' \
GOOGLE_CLIENT_SECRET='replace-me' \
pnpm dev:api

curl -i http://localhost:3001/api/auth/me
curl -I http://localhost:3001/api/auth/google
curl -i -X POST http://localhost:3001/api/auth/logout
```

Observed results:

- `/api/auth/me` returned `{"user": null}` without a session cookie.
- `/api/auth/google` returned `302 Found` with a Google OAuth `Location`.
- `/api/auth/logout` cleared the session cookie.

## Next Step

Add frontend login/logout UI and call `/api/auth/me` from the web app shell.
