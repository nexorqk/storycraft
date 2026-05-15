# Bootstrap Status

Date: 2026-05-15

## Current Result

The first implementation slice is complete. The repository now has a working
pnpm monorepo foundation for the Storycraft AI SaaS project.

Created workspace structure:

- `apps/api`: NestJS backend.
- `apps/web`: Next.js frontend.
- `packages/db`: Prisma schema, seed script, and database package.
- `packages/shared`: shared TypeScript constants and types.

Configured local infrastructure:

- PostgreSQL through Docker Compose.
- Redis through Docker Compose.
- Garage as local S3-compatible object storage.

Configured backend foundation:

- NestJS application shell.
- Environment validation with `zod`.
- `/api/health` endpoint.
- Prisma service and module.
- Empty feature modules for `auth`, `users`, `children`, `templates`, `books`,
  `jobs`, `storage`, and `generation`.
- BullMQ root configuration through `REDIS_URL`.

Configured frontend foundation:

- Next.js application shell.
- First dashboard screen for the MVP workspace.
- Responsive base styling.

Configured database foundation:

- Initial Prisma schema for MVP entities:
  - `User`;
  - `Child`;
  - `Template`;
  - `Book`;
  - `BookPage`;
  - `Illustration`;
  - `Job`.
- Future-ready Stripe billing entities:
  - `Plan`;
  - `Subscription`;
  - `PaymentCustomer`;
  - `PaymentEvent`.
- Future support entities:
  - `Rating`;
  - `Referral`.
- Seed script for the free plan and an initial Russian book template.

Updated documentation:

- `AGENTS.md` now includes the real stack and development commands.
- `DRAFT.md` now explicitly includes BullMQ for queues.
- `IMPLEMENTATION_PLAN.md` remains the high-level implementation roadmap.

## Current Stack

- TypeScript
- pnpm workspaces
- NestJS
- Next.js
- Prisma
- PostgreSQL
- Redis
- BullMQ
- Garage / S3-compatible storage
- Stripe planned for future billing

## Commands

Install dependencies:

```bash
pnpm install
```

Generate Prisma client:

```bash
pnpm db:generate
```

Run local infrastructure:

```bash
docker compose up -d postgres redis garage
```

Run both apps:

```bash
pnpm dev
```

Run only the API:

```bash
pnpm dev:api
```

Run only the web app:

```bash
pnpm dev:web
```

Run checks:

```bash
pnpm typecheck
pnpm build
pnpm format:check
pnpm test
```

## Verification Completed

These checks passed after the bootstrap work:

```bash
pnpm db:generate
pnpm typecheck
pnpm build
pnpm format:check
docker compose config
```

`pnpm test` currently passes through placeholder scripts. Real test suites are
not implemented yet.

The web app was started and verified locally:

```bash
curl -I http://localhost:3000
```

Result: `HTTP/1.1 200 OK`.

## Known Notes

- Prisma emitted a deprecation warning for `package.json#prisma` seed config.
  This should be migrated to a Prisma config file before Prisma 7.
- `pnpm install` warned that some dependency build scripts were ignored. Prisma
  client generation still completed successfully through `pnpm db:generate`.
- There are no real database migrations yet; the Prisma schema exists, but the
  first migration still needs to be created.
- Auth, child profiles, templates API, book generation, storage, PDF generation,
  and real tests are not implemented yet.

## Recommended Next Step

Create the first database migration and finish the database foundation:

- start local PostgreSQL;
- run the initial Prisma migration;
- verify the schema applies cleanly;
- run the seed script;
- document any Garage setup steps needed for bucket creation;
- then move to backend auth with Google OAuth.
