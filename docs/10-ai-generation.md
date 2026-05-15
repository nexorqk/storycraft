# AI Generation (OpenAI)

Date: 2026-05-15

## Scope

This slice adds AI-powered story generation using OpenAI's gpt-4o-mini model,
personalized to the child's name, age, and interests.

## Backend

### StoryProvider Interface

Located in `apps/api/src/generation/types.ts`.

```ts
interface StoryProvider {
  generatePage(request: StoryPageRequest): Promise<StoryPageResult>;
}
```

- `StoryPageRequest`: child name, age, interests, template prompts, page number,
  page text prompt, and previous pages for context.
- `StoryPageResult`: generated story text (Russian) and illustration prompt
  (English).

### OpenAiProvider

Located in `apps/api/src/generation/openai.provider.ts`.

- Uses `openai` SDK v4.
- Model: `gpt-4o-mini` (configurable via `OPENAI_MODEL`).
- System prompt includes child age, interests, language rules, and illustration
  style.
- User prompt includes template story prompt, page-specific prompt, child name,
  and previous pages for continuity.
- Response is parsed from a structured `TEXT:` / `ILLUSTRATION:` format.

### GenerationService

Located in `apps/api/src/generation/generation.service.ts`.

Method: `generateBook(bookId: string)`

Flow:

1. Fetches book with child and template (including pages).
2. Sets book status to `PROCESSING`.
3. For each template page, calls `OpenAiProvider.generatePage()` with:
   - child name, age (calculated from birthDate), interests;
   - template story and illustration prompts;
   - page-specific text prompt;
   - all previously generated pages for context.
4. Creates `BookPage` records with generated text and illustration prompts.
5. Sets book status to `COMPLETED` with `completedAt` timestamp.
6. On failure: sets status to `FAILED` with error message.

### Environment Variables

| Variable         | Default       | Description         |
| ---------------- | ------------- | ------------------- |
| `OPENAI_API_KEY` | `replace-me`  | OpenAI API key      |
| `OPENAI_MODEL`   | `gpt-4o-mini` | OpenAI model to use |

### Dependencies

- `openai` — OpenAI SDK v4.

## Design Decisions

- **Provider abstraction**: `StoryProvider` interface allows swapping AI
  providers (e.g., Anthropic, local models) without changing generation logic.
- **Sequential generation**: Pages are generated one at a time with full context
  of previous pages for narrative continuity.
- **Russian text, English illustration prompts**: Story text is in Russian for
  the child; illustration prompts are in English for image generation models.
- **Age-aware**: Child's age is calculated from birthDate and included in the
  system prompt to adjust language complexity.

## Verification

Static checks:

```bash
pnpm typecheck
pnpm build
pnpm format:check
pnpm test
```

## Next Step

Integrate generation with book creation:

- enqueue a BullMQ job when a book is created;
- create a processor that calls `GenerationService.generateBook()`;
- update book status in real-time through polling or WebSocket;
- add illustration generation after text is ready.
