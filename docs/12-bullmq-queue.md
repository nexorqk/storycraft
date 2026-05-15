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
  status?: string;         // 'starting' | 'generating' | 'completed' | 'failed'
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

The `/books` and `/books/[bookId]` pages can poll `GET /api/books/:id/progress`
to show a progress bar during generation.

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
