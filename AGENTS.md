# AGENTS.md

Guidance for Codex and other AI coding agents working in this repository.

## Project Context

Storycraft is an early-stage AI SaaS project for generating Russian children's
books in PDF format.

The repository is a pnpm monorepo:

- `apps/api`: NestJS backend.
- `apps/web`: Next.js frontend.
- `packages/db`: Prisma schema, seed, and database package.
- `packages/shared`: shared TypeScript constants and types.

## Working Rules

- Inspect the repository before making changes.
- Keep edits small, focused, and tied to the user's request.
- Prefer existing project patterns once they exist.
- Use pnpm for package management.
- Use the existing NestJS, Next.js, Prisma, PostgreSQL, Redis, BullMQ, and
  S3-compatible storage conventions.
- Do not perform destructive operations unless the user explicitly asks for them.
- Preserve user work and unrelated local changes.
- Do not modify generated, vendored, or build output files unless the task clearly
  requires it.
- After each major implementation slice, commit the completed result before
  starting the next large slice, unless the user asks not to.

## Development Commands

- Install dependencies: `pnpm install`.
- Generate Prisma client: `pnpm db:generate`.
- Run local infrastructure: `docker compose up -d postgres redis garage`.
- Run both apps locally: `pnpm dev`.
- Run API only: `pnpm dev:api`.
- Run web only: `pnpm dev:web`.
- Typecheck all packages: `pnpm typecheck`.
- Build all packages: `pnpm build`.
- Run configured tests: `pnpm test`.
- Check formatting: `pnpm format:check`.
- Format files: `pnpm format`.

Database commands:

- Create and apply a local migration: `pnpm db:migrate`.
- Seed local data: `pnpm db:seed`.
- Open Prisma Studio: `pnpm db:studio`.

## Verification

Before finishing a task:

- run the relevant tests or checks if they exist;
- if no checks exist, say that clearly in the final response;
- summarize the commands run and the result.

## Communication

- State assumptions when the repo does not provide an answer.
- Report important constraints or missing setup instead of silently guessing.
- Mention files changed and verification performed in the final response.
