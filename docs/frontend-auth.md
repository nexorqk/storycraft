# Frontend Auth

Date: 2026-05-15

## Scope

This slice connects the Next.js app shell to the backend auth endpoints.

## Added

- Client-side auth API helper for:
  - `GET /api/auth/me`;
  - `POST /api/auth/logout`;
  - Google OAuth redirect URL generation.
- Dashboard auth panel.
- Google sign-in button.
- Logout button.
- Signed-in, signed-out, loading, and API-unavailable states.

## Behavior

- The web app reads `NEXT_PUBLIC_API_URL`.
- Auth requests use `credentials: 'include'` so the API httpOnly cookie is sent.
- Unauthenticated users see a Google sign-in action.
- Authenticated users see their public profile and can sign out.

## Verification

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
DATABASE_URL='postgresql://storycraft:storycraft@localhost:5432/storycraft?schema=public' \
SESSION_SECRET='local-development-session-secret' \
GOOGLE_CLIENT_ID='replace-me' \
GOOGLE_CLIENT_SECRET='replace-me' \
pnpm dev:api

pnpm dev:web

curl -I http://localhost:3000
curl -i http://localhost:3001/api/auth/me
curl -I http://localhost:3001/api/auth/google
```

Observed local state with placeholder Google credentials:

- the web app returned `HTTP/1.1 200 OK`;
- `/api/auth/me` returns `{"user": null}` without a session cookie;
- `/api/auth/google` returned `302 Found` with a Google OAuth `Location`;
- the server-rendered page includes the auth panel mount point.

## Next Step

Build child profile API endpoints and screens behind `SessionAuthGuard`.
