# Storycraft Implementation Plan

## Product Decisions

- Billing will be added later through Stripe.
- The MVP includes a free plan.
- The first version generates books in Russian.
- Parent-side editing of generated text or pages is postponed.
- AI generation must be implemented behind provider abstractions so the project
  can start with one provider and switch or add providers later.

## Recommended Architecture

- Use a monorepo:
  - `apps/web` for the Next.js frontend;
  - `apps/api` for the NestJS backend;
  - `packages/db` for Prisma schema, migrations, and database client;
  - `packages/shared` for shared TypeScript types and contracts.
- Use PostgreSQL as the primary database.
- Use Prisma for database access.
- Use Redis and BullMQ for background queues.
- Use a PostgreSQL `jobs` table for persistent job state, history, errors, and
  debugging.
- Use Garage locally as S3-compatible object storage.
- Keep storage access behind a `StorageService` abstraction so production can use
  any S3-compatible provider.
- Use Google OAuth for authentication.
- Store generated illustrations and PDFs in object storage. Store object keys in
  PostgreSQL.
- Generate PDFs on the backend after story pages and illustrations are ready.

## MVP Scope

The MVP should allow a parent to:

- sign in with Google;
- create and manage child profiles;
- choose a book template;
- generate a Russian children's book for a selected child;
- see generation status;
- open the generated book;
- download the generated PDF.

The MVP should not include:

- paid billing flows;
- subscription checkout;
- Stripe integration;
- referral program mechanics;
- parent-side page or text editor;
- multi-language generation;
- public marketplace of templates.

## Data Model

Implement the initial Prisma schema around these core entities:

- `User`: parent account created through Google OAuth.
- `Child`: child profile owned by a user.
- `Template`: reusable book generation template.
- `Book`: generated book request and final book metadata.
- `BookPage`: generated page text and ordering.
- `Illustration`: generated image metadata and storage key.
- `Job`: persistent record for generation queue state.

Prepare the schema so these entities can be added later without redesigning the
core flow:

- `Subscription`;
- `Plan`;
- `PaymentProvider`;
- `PaymentCustomer`;
- `PaymentEvent`;
- `Rating`;
- `Referral`.

## Implementation Subtasks

### 1. Project Bootstrap

- Initialize the monorepo.
- Configure the workspace package manager.
- Create `apps/web`, `apps/api`, `packages/db`, and `packages/shared`.
- Add TypeScript configuration shared across the workspace.
- Add Docker Compose for PostgreSQL, Redis, and Garage.
- Add `.env.example` files for local development.
- Update `AGENTS.md` with real install, run, test, lint, and build commands once
  they exist.

### 2. Backend Foundation

- Create the NestJS API app.
- Add environment config validation.
- Add a health endpoint.
- Connect Prisma.
- Create initial modules:
  - `auth`;
  - `users`;
  - `children`;
  - `templates`;
  - `books`;
  - `jobs`;
  - `storage`;
  - `generation`.

### 3. Database Foundation

- Define the initial Prisma schema.
- Add migrations for MVP entities.
- Add seed data for starter book templates.
- Add database indexes for user ownership, book status, and job status.
- Ensure all user-owned records are scoped by `userId`.

### 4. Authentication

- Implement Google OAuth.
- Create or update the user on successful Google login.
- Use secure httpOnly cookies for the frontend session.
- Add a `/me` endpoint.
- Protect user-specific API routes.

### 5. Frontend Foundation

- Create the Next.js app.
- Add the main app layout.
- Add login and logout flows.
- Add a dashboard shell.
- Add pages for:
  - child profiles;
  - book creation;
  - book library;
  - book details and download.
- Add a typed API client.

### 6. Child Profiles

- Add CRUD endpoints for child profiles.
- Add frontend screens for listing, creating, editing, and deleting children.
- Validate required child profile fields.
- Ensure each parent only sees their own children.

### 7. Templates

- Add template listing endpoint.
- Seed initial Russian book templates.
- Add frontend template selection during book creation.
- Keep template structure simple for MVP, but include fields needed for AI
  prompting.

### 8. Book Creation Flow

- Add endpoint to create a book generation request.
- Validate selected child and template ownership/access.
- Create a `Book` record in a pending state.
- Create a related `Job` record.
- Enqueue a BullMQ job for generation.
- Show generation status in the frontend.

### 9. AI Generation Pipeline

- Create provider interfaces for:
  - story generation;
  - illustration generation.
- Implement one initial provider behind those interfaces.
- Generate Russian story content.
- Generate the book as ordered pages.
- Generate illustration prompts from page content.
- Generate illustrations for pages.
- Persist intermediate results so failed jobs can be inspected.
- Mark jobs and books as failed with useful error messages when generation fails.

### 10. Storage

- Implement S3-compatible storage access.
- Store generated illustrations and PDFs using stable object keys.
- Save object keys in PostgreSQL.
- Add signed URL generation for private downloads.
- Use Garage in local development.

### 11. PDF Generation

- Create a backend PDF generation service.
- Build PDFs from generated pages and illustrations.
- Save the final PDF to object storage.
- Store the PDF object key on the `Book`.
- Add an endpoint that returns a signed download URL.

### 12. Free Plan Limits

- Add a simple free-plan policy before paid billing exists.
- Track enough data to limit generation usage per user.
- Enforce free-plan limits when creating book generation requests.
- Return clear API errors when the free limit is reached.

### 13. Future Billing

- Add billing after the free-plan MVP is stable.
- Support Stripe as the payment provider.
- Keep Stripe checkout, customer IDs, subscription IDs, and webhook payloads
  isolated inside the billing module.
- Store normalized subscription state in the application database.
- Process provider webhooks idempotently and persist raw payment events for
  audit/debugging.

### 14. Testing And QA

- Add backend unit tests for core services.
- Add backend integration tests for auth-protected routes where practical.
- Add generation pipeline tests using mocked AI providers.
- Add API tests for book creation and job status.
- Add frontend smoke tests for login state, child creation, and book creation.
- Verify the full local Docker Compose setup.

## Suggested Build Order

1. Bootstrap monorepo and Docker Compose.
2. Add Prisma schema and database migrations.
3. Build NestJS foundation and auth.
4. Build Next.js foundation and dashboard.
5. Implement child profiles and templates.
6. Implement book creation and job tracking.
7. Implement AI generation with mocked providers first.
8. Add real AI provider integration.
9. Add storage and PDF generation.
10. Add free-plan limits.
11. Add tests and local setup documentation.
12. Add Stripe billing after the MVP flow is stable.

## Acceptance Criteria For MVP

- A parent can sign in with Google.
- A parent can create at least one child profile.
- A parent can choose a Russian book template.
- A parent can start book generation for a child.
- The system processes generation asynchronously.
- The UI shows pending, processing, completed, and failed states.
- The generated book contains Russian text and illustrations.
- The final PDF can be downloaded.
- Generated assets are stored in S3-compatible storage.
- Failed generation jobs are visible in persistent job records.
