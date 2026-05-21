# Storycraft

AI-generated Russian children's books in PDF format.

**Live:** https://storycraftbooks.com

Storycraft helps parents create personalized children's books with unique stories and illustrations tailored to their child's interests. The platform generates complete books in Russian, including custom illustrations, and delivers them as downloadable PDFs.

## Stack

- **Backend:** NestJS (API)
- **Frontend:** Next.js (Web)
- **Database:** PostgreSQL + Prisma
- **Queue:** Redis + BullMQ
- **Storage:** S3-compatible (Garage locally)
- **AI:** OpenAI (GPT-4o-mini, DALL-E 3)

## Features

- Google OAuth authentication
- Child profile management
- AI story generation in Russian
- DALL-E illustration generation
- PDF generation and download
- Dark/light theme support
- Account data export and deletion

## Local Development

```bash
# Install dependencies
pnpm install

# Start infrastructure
docker compose up -d postgres redis garage

# Generate Prisma client
pnpm db:generate

# Run both apps
pnpm dev
```

## Deploy

```bash
./scripts/deploy.sh
```

## License

Private — not open source.
