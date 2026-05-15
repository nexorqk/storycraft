# Admin Templates

Date: 2026-05-15

## Scope

This slice adds role-based admin access for managing templates, including
full CRUD for templates and their pages, protected by a `RolesGuard`.

## Database

### Prisma Schema

Added role-based access control models:

- `Role`: stores role names (`ADMIN`, `USER`) as unique enum values.
- `UserRole`: many-to-many join table between `User` and `Role`.
- `RoleName` enum: `ADMIN`, `USER`.

Migration: `20260515142633_add_roles`.

### Seed

The seed script creates `ADMIN` and `USER` roles on every run.

To assign admin role to a user:

```sql
INSERT INTO "UserRole" ("userId", "roleId")
SELECT u.id, r.id FROM "User" u, "Role" r
WHERE u.email = 'admin@example.com' AND r.name = 'ADMIN';
```

## Backend

### RolesGuard

Located in `apps/api/src/auth/roles.guard.ts`.

- Extends authentication check from `AuthService`.
- Reads required roles from `@Roles()` metadata.
- Queries `UserRole` + `Role` for the authenticated user.
- Throws `ForbiddenException` if user lacks required role.

### @Roles() Decorator

Located in `apps/api/src/auth/roles.decorator.ts`.

```ts
@Roles('ADMIN')
@UseGuards(RolesGuard)
```

### Admin Templates CRUD

Endpoints under `/admin/templates`, all protected by `RolesGuard` with
`@Roles('ADMIN')`:

- `GET /api/admin/templates` — list all templates (summary view).
- `GET /api/admin/templates/:templateId` — get template with pages.
- `POST /api/admin/templates` — create template.
- `PATCH /api/admin/templates/:templateId` — update template.
- `DELETE /api/admin/templates/:templateId` — delete template (cascade deletes pages).

### Admin Template Pages CRUD

Endpoints under `/admin/templates/:templateId/pages`:

- `POST /api/admin/templates/:templateId/pages` — add page to template.
- `PATCH /api/admin/templates/:templateId/pages/:pageId` — update page.
- `DELETE /api/admin/templates/:templateId/pages/:pageId` — delete page.

All page endpoints verify the page belongs to the specified template.

### DTOs

- `CreateAdminTemplateDto`: slug, title, description, language, ageMin, ageMax,
  pageCount, storyPrompt, illustrationStylePrompt, isActive.
- `UpdateAdminTemplateDto`: all fields optional.
- `CreateAdminTemplatePageDto`: pageNumber, textPrompt, illustrationPrompt.
- `UpdateAdminTemplatePageDto`: all fields optional.

## Frontend

Added `/admin/templates`:

- Table view listing all templates with title, slug, page count, language,
  status badge, and last updated date.
- Loading, error, and empty states.
- Uses `listAdminTemplates()` API client.

Admin API client in `apps/web/lib/admin-templates-api.ts` includes helpers
for all admin template and page CRUD operations.

## Verification

Static checks:

```bash
pnpm typecheck
pnpm build
pnpm format:check
pnpm test
```

Database:

```bash
DATABASE_URL='postgresql://storycraft:storycraft@localhost:5432/storycraft?schema=public' pnpm db:seed
```

Runtime checks (requires admin user):

```bash
docker compose up -d postgres redis
pnpm dev:api

# Assign admin role to a user first, then:
curl -i http://localhost:3001/api/admin/templates
curl -i http://localhost:3001/api/admin/templates/:templateId
```

Expected results:

- Without session: `403 Forbidden`;
- With non-admin session: `403 Forbidden`;
- With admin session: `200 OK` with template data.

## Next Step

Build the book creation flow:

- add `POST /api/books` endpoint;
- validate child and template selection;
- create a `Book` record in pending state;
- create and enqueue a `Job` for generation;
- show generation status in the frontend.
