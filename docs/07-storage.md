# Storage (S3/Garage)

Date: 2026-05-15

## Scope

This slice implements S3-compatible object storage access for uploading and
downloading generated assets (illustrations, PDFs).

## Backend

### StorageService

Located in `apps/api/src/storage/storage.service.ts`.

Methods:

- `uploadFile(key, body, contentType?)`: uploads a file (Buffer or string) to
  the configured bucket;
- `getSignedDownloadUrl(key, expiresIn?)`: generates a presigned download URL
  valid for the specified number of seconds (default: 3600);
- `buildKey(...parts)`: utility for constructing object keys from path segments.

### S3Client Configuration

The S3 client is configured from environment variables:

| Variable | Default | Description |
|---|---|---|
| `S3_ENDPOINT` | `http://localhost:3900` | S3 API endpoint (Garage locally) |
| `S3_REGION` | `garage` | S3 region |
| `S3_BUCKET` | `storycraft-local` | Bucket name |
| `S3_ACCESS_KEY_ID` | `replace-me` | Access key |
| `S3_SECRET_ACCESS_KEY` | `replace-me` | Secret key |
| `S3_FORCE_PATH_STYLE` | `true` | Use path-style URLs (required for Garage/MinIO) |

### Dependencies

- `@aws-sdk/client-s3` — S3 client and commands.
- `@aws-sdk/s3-request-presigner` — presigned URL generation.

### Module

`StorageModule` exports `StorageService` for injection into other modules
(books, generation, PDF generation).

## Infrastructure

Garage runs in Docker Compose as `garage` service:

- S3 API on port 3900;
- RPC on port 3901;
- Web gateway on port 3902;
- Admin API on port 3903.

Configuration lives in `infra/garage/garage.toml`.

The local bucket `storycraft-local` must be created before use (manual step or
startup script).

## Design

- Storage access is behind a `StorageService` abstraction so production can use
  any S3-compatible provider (Garage, AWS S3, Cloudflare R2, etc.).
- Object keys are stored in PostgreSQL on the relevant entities (`Book.pdfObjectKey`,
  `Illustration.objectKey`).
- Downloads use presigned URLs rather than proxying file content through the API.

## Verification

Static checks:

```bash
pnpm typecheck
pnpm build
pnpm format:check
pnpm test
```

## Next Step

Add illustration and PDF upload flows in the generation pipeline:

- upload generated illustrations to `illustrations/{bookId}/{pageNumber}.{ext}`;
- upload final PDF to `books/{bookId}.pdf`;
- store object keys in PostgreSQL;
- add a download endpoint that returns a presigned URL.
