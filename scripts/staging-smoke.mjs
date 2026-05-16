#!/usr/bin/env node

const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? 10_000);
const apiOrigin = normalizeOrigin(
  process.env.STAGING_API_URL ?? process.env.API_ORIGIN,
);
const webOrigin = normalizeOrigin(
  process.env.STAGING_WEB_URL ?? process.env.WEB_ORIGIN,
);
const skipWeb = process.env.SMOKE_SKIP_WEB === 'true';

if (!apiOrigin) {
  fail(
    'Set STAGING_API_URL or API_ORIGIN, for example https://api.staging.example.com',
  );
}

if (!skipWeb && !webOrigin) {
  fail(
    'Set STAGING_WEB_URL or WEB_ORIGIN, or set SMOKE_SKIP_WEB=true for API-only checks',
  );
}

const checks = [
  {
    name: 'API liveness',
    url: `${apiOrigin}/api/health`,
    expect: async (response) => {
      await expectStatus(response, 200);
      await expectJsonStatusOk(response);
    },
  },
  {
    name: 'API readiness',
    url: `${apiOrigin}/api/health/ready`,
    expect: async (response) => {
      await expectStatus(response, 200);
      await expectJsonStatusOk(response);
    },
  },
  {
    name: 'Public templates API',
    url: `${apiOrigin}/api/templates`,
    expect: async (response) => {
      await expectStatus(response, 200);
      const body = await response.json();
      if (!Array.isArray(body.templates)) {
        throw new Error('Expected templates array in response body');
      }
    },
  },
  {
    name: 'Protected books API rejects anonymous access',
    url: `${apiOrigin}/api/books`,
    expect: (response) => expectStatus(response, 401),
  },
];

if (!skipWeb) {
  checks.push({
    name: 'Web root',
    url: webOrigin,
    expect: (response) => expectStatus(response, 200),
  });
}

for (const check of checks) {
  await runCheck(check);
}

console.log(`Smoke checks passed (${checks.length}/${checks.length})`);

async function runCheck(check) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(check.url, {
      redirect: 'manual',
      signal: controller.signal,
    });
    await check.expect(response);
    console.log(`ok - ${check.name}`);
  } catch (error) {
    fail(`${check.name} failed: ${error.message}`);
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeOrigin(value) {
  return value ? value.replace(/\/$/, '') : null;
}

async function expectStatus(response, expectedStatus) {
  if (response.status !== expectedStatus) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `expected HTTP ${expectedStatus}, got ${response.status}${body ? `: ${body.slice(0, 300)}` : ''}`,
    );
  }
}

async function expectJsonStatusOk(response) {
  const body = await response.json();

  if (body.status !== 'ok') {
    throw new Error(`expected JSON status "ok", got ${JSON.stringify(body)}`);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
