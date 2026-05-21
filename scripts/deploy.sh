#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

API_ORIGIN=$(grep '^API_ORIGIN=' .env | cut -d= -f2- | tr -d '"' || true)
WEB_ORIGIN=$(grep '^WEB_ORIGIN=' .env | cut -d= -f2- | tr -d '"' || true)
NODE_ENV=$(grep '^NODE_ENV=' .env | cut -d= -f2- | tr -d '"' || true)
USE_MOCK_AI=$(grep '^USE_MOCK_AI=' .env | cut -d= -f2- | tr -d '"' || true)

if [ -z "$API_ORIGIN" ] || [ -z "$WEB_ORIGIN" ]; then
  echo "Error: API_ORIGIN and WEB_ORIGIN must be set in .env"
  exit 1
fi

echo "=== Environment validation ==="
HAS_ISSUES=0

if [ "$NODE_ENV" != "production" ]; then
  echo "Warning: NODE_ENV is '$NODE_ENV', expected 'production'"
  HAS_ISSUES=1
fi

if [ "$USE_MOCK_AI" != "false" ]; then
  echo "Warning: USE_MOCK_AI is '$USE_MOCK_AI', expected 'false' in production"
  HAS_ISSUES=1
fi

if grep -qiE 'replace-me|changeme|^SESSION_SECRET=$' .env; then
  echo "Warning: .env contains unset placeholder secrets"
  HAS_ISSUES=1
fi

if grep -qiE 'localhost|127\.0\.0\.1' .env | grep -qiE 'API_ORIGIN|WEB_ORIGIN|GOOGLE_CALLBACK_URL|S3_ENDPOINT'; then
  echo "Warning: .env contains localhost URLs for production endpoints"
  HAS_ISSUES=1
fi

SESSION_SECRET_LEN=$(grep '^SESSION_SECRET=' .env | cut -d= -f2- | tr -d '"' | wc -c | tr -d ' ')
if [ "$SESSION_SECRET_LEN" -lt 32 ]; then
  echo "Warning: SESSION_SECRET must be at least 32 characters"
  HAS_ISSUES=1
fi

if [ "$HAS_ISSUES" -eq 1 ]; then
  echo ""
  echo "Fix .env before deploying, or set SKIP_ENV_CHECK=1 to ignore"
  exit 1
fi

echo "Environment OK"
echo ""
echo "=== Check for uncommitted changes ==="
if [ -n "$(git status --short)" ]; then
  echo "Error: you have uncommitted changes. Commit or stash them before deploying:"
  git status --short
  exit 1
fi

echo ""
echo "=== Release gates ==="
pnpm install --frozen-lockfile
pnpm db:generate
echo ""
echo "=== Auto-formatting ==="
pnpm format
if [ -n "$(git status --short)" ]; then
  echo ""
  echo "Formatting produced changes. Commit them before deploying:"
  git status --short
  echo ""
  echo "Run: pnpm format && git add -A && git commit -m 'style: autoformat' && git push"
  exit 1
fi
pnpm format:check
pnpm typecheck
pnpm test
pnpm build

echo ""
echo "=== Docker build ==="
docker compose build

echo ""
echo "=== Deploy ==="
docker compose up -d

echo ""
echo "=== Smoke checks ==="
STAGING_API_URL="$API_ORIGIN" STAGING_WEB_URL="$WEB_ORIGIN" pnpm smoke:staging

echo ""
echo "=== Deploy complete ==="
echo "API: $API_ORIGIN"
echo "Web: $WEB_ORIGIN"
