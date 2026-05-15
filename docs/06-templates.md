# Templates

Date: 2026-05-15

## Scope

This slice adds template listing API and template selection UI for the book
creation flow.

## Backend

API endpoints:

- `GET /api/templates`: lists all active templates, ordered by title.
- `GET /api/templates/:slug`: returns a single active template by slug.

Templates are public; no authentication is required.

Template fields exposed to the frontend:

- `id`;
- `slug`;
- `title`;
- `description`;
- `language`;
- `ageMin`;
- `ageMax`;
- `pageCount`;
- `isActive`.

## Seed Data

Added three new Russian book templates alongside the existing one:

- `kindness-adventure-ru`: "Приключение о доброте" (ages 3–7, 8 pages).
- `forest-tale-ru`: "Сказка лесного зверя" (ages 4–8, 8 pages).
- `space-explorer-ru`: "Космический путешественник" (ages 5–10, 10 pages).
- `bedtime-dreams-ru`: "Сонные мечты" (ages 2–6, 6 pages).

## Frontend

Added `/templates` with:

- template card grid;
- age range, page count, and language metadata per card;
- select action button (placeholder for now);
- loading, error, and empty states.

The dashboard navigation now links to `/templates`.

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
pnpm dev:api

curl -i http://localhost:3001/api/templates
curl -i http://localhost:3001/api/templates/kindness-adventure-ru
```

Expected results:

- `GET /api/templates` returns a list of active templates;
- `GET /api/templates/:slug` returns the matching template or 404;
- `GET /templates` returns `HTTP/1.1 200 OK` in the web app.

## Next Step

Build the book creation flow:

- add `POST /api/books` endpoint;
- validate child and template selection;
- create a `Book` record in pending state;
- create and enqueue a `Job` for generation;
- show generation status in the frontend.
