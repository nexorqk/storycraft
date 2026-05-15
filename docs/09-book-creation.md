# Book Creation Flow

Date: 2026-05-15

## Scope

This slice implements the core user flow: select a template, choose a child
profile, customize the book, and create a `Book` record.

## Backend

### BooksService

Located in `apps/api/src/books/books.service.ts`.

Methods:

- `listBooks(userId)`: returns all books for the user with child and template
  summary info.
- `getBook(userId, bookId)`: returns full book detail including pages and
  illustrations.
- `createBook(userId, dto)`: creates a new book after validating child ownership
  and template existence.
- `deleteBook(userId, bookId)`: deletes a user-owned book.

### Endpoints

All under `/api/books`, protected by `SessionAuthGuard`:

- `GET /api/books` — list user's books.
- `GET /api/books/:bookId` — get book detail with pages and illustrations.
- `POST /api/books` — create a new book.
- `DELETE /api/books/:bookId` — delete a book.

### CreateBookDto

- `childId` (required, UUID): the child profile to personalize the book for.
- `templateId` (required, UUID): the template to base the book on.
- `title` (optional, max 200 chars): custom book title.
- `language` (optional, max 10 chars): defaults to `ru`.

### Validation

- Child must belong to the authenticated user.
- Template must exist and be active.
- Book is created with `PENDING` status.

## Frontend

### /create

Book creation wizard in three steps:

1. **Select**: choose a child profile and a template side-by-side.
2. **Customize**: set optional title and language, review selections.
3. **Submit**: create the book via `POST /api/books`.

After successful creation, shows a success screen with a link to the library.

### /books

User's book library:

- Lists all books with status badge (Pending, Processing, Completed, Failed).
- Shows child name, template name, and creation date.
- Delete action with confirmation.
- Empty state with "Create a Book" CTA.
- "Create New" button in the page header.

### Navigation

Dashboard navigation updated with:

- `Create` → `/create`
- `Books` → `/books`

## Verification

Static checks:

```bash
pnpm typecheck
pnpm build
pnpm format:check
pnpm test
```

Runtime checks (requires signed-in user with children and templates):

```bash
docker compose up -d postgres redis
pnpm dev:api
pnpm dev:web

# With session cookie:
curl -i -X POST http://localhost:3001/api/books \
  -H 'Content-Type: application/json' \
  -d '{"childId":"<id>","templateId":"<id>"}'

curl -i http://localhost:3001/api/books
```

## Next Step

Implement the AI generation pipeline:

- create provider interfaces for story and illustration generation;
- implement one initial provider behind those interfaces;
- enqueue a BullMQ job on book creation;
- generate Russian story content as ordered pages;
- generate illustration prompts from page content;
- persist intermediate results;
- mark jobs and books as failed with useful error messages.
