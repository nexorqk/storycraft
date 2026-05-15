# BullMQ Generation Queue

Date: 2026-05-15

## Scope

This slice adds asynchronous book generation through a BullMQ queue with
progress tracking, allowing the API to return immediately after book creation
while generation happens in the background.

## Architecture

### Queue: `generation`

Registered via `GenerationQueueModule` using `@nestjs/bullmq`.

- Queue name: `generation`
- Connection: shared Redis connection from `QueuesModule` (`BullModule.forRootAsync`)
- Job ID pattern: `book-{bookId}` (deduplicates generation requests)

### GenerationProcessor

Located in `apps/api/src/queues/generation.processor.ts`.

Extends `WorkerHost` from `@nestjs/bullmq`. Processes `generate-book` jobs:

1. Sets progress to 0, status to `starting`.
2. Fetches book and template page count.
3. Sets book status to `PROCESSING`.
4. Calls `GenerationService.generateBook()` with a progress callback.
5. Progress callback updates job progress (5–95%) with page count.
6. On success: progress 100%, status `completed`.
7. On failure: status `failed` with error message.

### Job Data

```ts
type GenerationJobData = {
  bookId: string;
  status?: string; // 'starting' | 'generating' | 'completed' | 'failed'
  completedPages?: number;
  totalPages?: number;
  error?: string;
};
```

### Job Options

- `jobId: book-{bookId}` — prevents duplicate jobs for the same book.
- `attempts: 2` — retries once on failure.
- `backoff: { type: 'exponential', delay: 5000 }` — 5s, then 10s delay.

## API Changes

### Book Creation

`POST /api/books` now enqueues a generation job immediately after creating
the `Book` record. The book starts with `PENDING` status.

### Progress Endpoint

`GET /api/books/:bookId/progress` — returns generation progress:

```json
{
  "progress": {
    "progress": 45,
    "status": "generating",
    "completedPages": 3,
    "totalPages": 8
  }
}
```

Possible statuses:

- `pending` — no job found yet.
- `starting` — job picked up, preparing.
- `generating` — actively generating pages.
- `completed` — all pages and illustrations done.
- `failed` — error occurred (includes `error` field).

## Module Structure

```
GenerationQueueModule
├── BullModule.registerQueue({ name: 'generation' })
├── PrismaModule
├── GenerationModule (GenerationService, OpenAiProvider, DallEProvider)
└── GenerationProcessor
```

`BooksModule` imports `GenerationQueueModule` to access the queue for enqueueing.

`AppModule` imports `GenerationQueueModule` to register the worker.

## Frontend Integration

### `/books` (Library)

- Polls progress for all PROCESSING books every 3 seconds.
- Shows inline progress bar with page count on each book card.
- Auto-refreshes the book list when generation completes or fails.

### `/books/[bookId]` (Book Detail)

- Shows "Generate Book" button for PENDING and FAILED books.
- Shows progress bar with polling (3s interval) for PROCESSING books.
- Auto-reloads book data when generation completes or fails.
- Displays error message if generation fails.

### API Client Functions

- `generateBook(bookId)` — triggers generation via `POST /api/books/:id/generate`.
- `getBookProgress(bookId)` — fetches progress via `GET /api/books/:id/progress`.

## Additional API Endpoints

### POST /api/books/:bookId/generate

Manually triggers generation for a book. Useful for retrying failed books.

- Validates book ownership.
- Rejects if book is already PROCESSING.
- Clears existing pages and illustrations before re-generating.
- Returns `{ bookId, jobId, status: 'queued' }`.

### GET /api/books/jobs/:jobId

Returns detailed job information from BullMQ:

```json
{
  "id": "book-abc123",
  "name": "generate-book",
  "state": "active",
  "progress": 45,
  "data": {
    "bookId": "abc123",
    "status": "generating",
    "completedPages": 3,
    "totalPages": 8
  },
  "attemptsMade": 0,
  "processedOn": "2026-05-15T00:00:00.000Z",
  "finishedOn": null,
  "failedReason": null
}
```

## Verification

Static checks:

```bash
pnpm typecheck
pnpm build
pnpm format:check
pnpm test
```

Runtime checks (requires Redis running):

```bash
docker compose up -d postgres redis
pnpm dev:api

# Create a book (with valid childId and templateId):
curl -X POST http://localhost:3001/api/books \
  -H 'Content-Type: application/json' \
  -H 'Cookie: storycraft_session=...' \
  -d '{"childId":"...","templateId":"..."}'

# Check progress:
curl http://localhost:3001/api/books/:bookId/progress
```

## Next Step

Add frontend progress polling on the book detail page:

- poll `/api/books/:id/progress` every 3 seconds while status is PROCESSING;
- show a progress bar with page count;
- auto-refresh when generation completes;
- show error state on failure.

## PDF Generation

After all pages and illustrations are generated, the pipeline automatically
creates a PDF using `@react-pdf/renderer`.

### PdfService

Located in `apps/api/src/pdf/pdf.service.ts`.

1. Fetches book with pages and illustrations.
2. Generates presigned download URLs for each illustration (valid 1 hour).
3. Renders a `BookDocument` React component to a PDF stream.
4. Converts the stream to a Buffer.
5. Uploads to S3 at `books/{bookId}/book.pdf`.
6. Returns the `objectKey` for storage on the Book record.

### BookDocument

Located in `apps/api/src/pdf/book-document.tsx`.

React-PDF component that renders:

- Cover page with title and child's name.
- One page per story page with illustration (if available) and text.
- Page numbers at the bottom.

### GET /api/books/:bookId/pdf-url

Returns a presigned download URL for the book's PDF:

```json
{
  "url": "https://s3.example.com/...?X-Amz-Signature=..."
}
```

Returns `{ "url": null }` if the book has no PDF yet.
