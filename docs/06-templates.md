# Templates

Date: 2026-05-15

## Scope

This slice adds template listing API, page-level template structure, and
template selection UI for the book creation flow.

## Database

### Prisma Schema

Added `TemplatePage` model:

- `id`: UUID primary key.
- `templateId`: FK to `Template` with cascade delete.
- `pageNumber`: 1-based page order within the template.
- `textPrompt`: AI prompt for generating this page's story text.
- `illustrationPrompt`: AI prompt for generating this page's illustration.
- Unique constraint on `(templateId, pageNumber)`.

Updated `BookPage`:

- Added optional `templatePageId` FK to `TemplatePage` with `SetNull` on delete.
- Links a generated book page back to the template page it was based on.

Migration: `20260515130204_add_template_pages`.

## Backend

API endpoints:

- `GET /api/templates`: lists all active templates with their pages, ordered by
  title.
- `GET /api/templates/:slug`: returns a single active template with pages by
  slug.

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
- `isActive`;
- `pages`: array of `{ pageNumber, textPrompt, illustrationPrompt }`.

## Seed Data

Four Russian book templates with page-level prompts (32 total pages):

- `kindness-adventure-ru`: "Приключение о доброте" (ages 3–7, 8 pages).
- `forest-tale-ru`: "Сказка лесного зверя" (ages 4–8, 8 pages).
- `space-explorer-ru`: "Космический путешественник" (ages 5–10, 10 pages).
- `bedtime-dreams-ru`: "Сонные мечты" (ages 2–6, 6 pages).

Each template page includes a `textPrompt` for story generation and an
`illustrationPrompt` for image generation, tailored to the narrative arc.

## Frontend

Added `/templates` with:

- template card grid;
- age range, page count, and language metadata per card;
- page list with numbered badges and text prompts;
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

Database seed:

```bash
DATABASE_URL='postgresql://storycraft:storycraft@localhost:5432/storycraft?schema=public' pnpm db:seed
```

Runtime checks:

```bash
docker compose up -d postgres redis
pnpm dev:api

curl -i http://localhost:3001/api/templates
curl -i http://localhost:3001/api/templates/kindness-adventure-ru
```

Expected results:

- `GET /api/templates` returns a list of active templates with pages;
- `GET /api/templates/:slug` returns the matching template with pages or 404;
- `GET /templates` returns `HTTP/1.1 200 OK` in the web app.

## Next Step

Build the book creation flow:

- add `POST /api/books` endpoint;
- validate child and template selection;
- create a `Book` record in pending state;
- create and enqueue a `Job` for generation;
- show generation status in the frontend.
