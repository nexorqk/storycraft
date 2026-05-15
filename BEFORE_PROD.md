# До кода

| Пункт | Статус |
| --- | --- |
| MVP scope | Да, описан в IMPLEMENTATION_PLAN.md:32. |
| User flow | Да, есть create flow, library, book detail/download в web. |
| Структура шаблонов | Да, Template + TemplatePage в packages/db/prisma/schema.prisma:113. |
| AI provider strategy | Частично: интерфейсы есть, но runtime-выбор/mock-provider не оформлен. |
| Free-plan лимиты | Да, лимит применяется атомарно в apps/api/src/books/books.service.ts:146. Есть несостыковка: код использует лимит 3, seed free plan пишет 1. |
| Env-переменные | Частично: validation знает OpenAI/DALL-E/rate-limit переменные, но .env.example и apps/api/.env.example их не содержат. |
| Docker Compose | Да: Postgres, Redis, Garage, API, Web в docker-compose.yml:1. |
| Схема данных | Да, покрывает MVP + будущий billing/referral/rating. |

# До реального AI

| Пункт | Статус |
| --- | --- |
| Mock generation pipeline | Нет как runtime-фича. В тестах провайдеры мокируются, но приложение сразу использует OpenAiProvider и DallEProvider. |
| Job statuses | Да: QUEUED/PROCESSING/COMPLETED/FAILED, persistent Job, progress API. |
| Storage abstraction | Да: apps/api/src/storage/storage.service.ts:10. |
| Retries | Частично: BullMQ attempts: 2 есть, но автоматический retry не идемпотентен. Если сбой случится после создания части страниц, повтор может упасть на @@unique([bookId, pageNumber]). |
| Error logging | Частично: есть Logger и сохранение errorMessage, но нет production-grade structured logs/aggregation. |
| PDF prototype | Да: apps/api/src/pdf/pdf.service.ts:26. |

# До публичного запуска

| Пункт | Статус |
| --- | --- |
| Private storage | Частично: доступ идет через signed URLs, но нет явной bucket policy/infra-настройки приватности. |
| Signed URLs | Да: PDF и illustrations через getSignedDownloadUrl. |
| Privacy policy | Нет. |
| Usage limits | Да: free-plan + API rate limit. |
| Production logs | Нет, только базовый Nest logging. |
| Backups | Нет. |
| Нормальная обработка failed jobs | Частично: failed status, error message, UI retry есть; автоматические retries и частичные артефакты требуют доработки. |

