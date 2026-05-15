# Child Profiles

Date: 2026-05-15

## Scope

This slice adds parent-owned child profile management.

## Backend

Protected API endpoints:

- `GET /api/children`
- `POST /api/children`
- `PATCH /api/children/:childId`
- `DELETE /api/children/:childId`

All endpoints use `SessionAuthGuard`; each query is scoped by the authenticated
parent user ID.

Child fields:

- `name`;
- `birthDate`;
- `interests`;
- `readingLevel`.

## Frontend

Added `/children` with:

- child profile list;
- create form;
- edit flow;
- delete action;
- signed-out/API-error empty state.

The dashboard navigation now links to `/children`.

## Verification

Static checks:

```bash
pnpm typecheck
pnpm build
pnpm format:check
pnpm test
```

Runtime checks completed:

- `GET /api/children` without a session returned `401 Unauthorized`;
- `GET /children` returned `HTTP/1.1 200 OK` in the web app;
- with a temporary local user and signed session cookie:
  - `GET /api/children` returned an empty list;
  - `POST /api/children` created a child profile;
  - `PATCH /api/children/:childId` updated the profile;
  - `GET /api/children` returned the created profile;
  - `DELETE /api/children/:childId` returned `{"ok": true}`;
  - the temporary test user was deleted after verification.

Manual browser check:

- open `http://localhost:3000/children`;
- sign in with Google if needed;
- create, edit, and delete a child profile.

## Next Step

Build templates API and template selection UI for the book creation flow.
