# До кода

| Пункт | Статус |
| --- | --- |
| MVP scope | Да, описан в IMPLEMENTATION_PLAN.md:32. |
| User flow | Да, есть create flow, library, book detail/download в web. |
| Структура шаблонов | Да, Template + TemplatePage в packages/db/prisma/schema.prisma:113. |
| AI provider strategy | Да, реализована через injection tokens (`STORY_PROVIDER`, `ILLUSTRATION_PROVIDER`) с поддержкой mock-провайдеров. |
| Free-plan лимиты | Да, лимит 3 книги в месяц. Seed и код синхронизированы. |
| Env-переменные | Да, `.env.example` содержит все переменные включая AI, rate-limiting. |
| Docker Compose | Да: Postgres, Redis, Garage, API, Web, и ежедневные бэкапы БД в docker-compose.yml. |
| Схема данных | Да, покрывает MVP + будущий billing/referral/rating. |

# До реального AI

| Пункт | Статус |
| --- | --- |
| Mock generation pipeline | Да: `USE_MOCK_AI=true` в `.env` включает `MockStoryProvider` и `MockIllustrationProvider`. Генерирует текст и PNG-заглушки без API ключей. |
| Job statuses | Да: QUEUED/PROCESSING/COMPLETED/FAILED, persistent Job, progress API. |
| Storage abstraction | Да: apps/api/src/storage/storage.service.ts:10. |
| Retries | Да: `GenerationService.cleanupPartialData()` очищает частичные данные перед каждой генерацией, делая retries идемпотентными. |
| Error logging | Да: `StructuredLogger` выводит JSON-логи в production, обычные логи в development. |
| PDF prototype | Да: apps/api/src/pdf/pdf.service.ts:26. |

# До публичного запуска

| Пункт | Статус |
| --- | --- |
| Private storage | Частично: доступ через signed URLs, bucket policy можно настроить при деплое. |
| Signed URLs | Да: PDF и illustrations через getSignedDownloadUrl. |
| Privacy policy | Да: страница `/privacy` с полной политикой конфиденциальности. |
| Usage limits | Да: free-plan (3 книги/мес) + API rate limit (1000/60с в dev). |
| Production logs | Да: `StructuredLogger` с JSON-форматом, уровнями логирования и контекстом. |
| Backups | Да: `db-backup` сервис в docker-compose делает ежедневные дампы PostgreSQL в `/infra/backups`. |
| Нормальная обработка failed jobs | Да: автоматическая очистка частичных данных перед retry, UI retry через `triggerGeneration()`. |
