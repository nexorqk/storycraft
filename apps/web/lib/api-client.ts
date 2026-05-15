import { API_URL } from './auth-api';

const CSRF_COOKIE_NAME = 'storycraft_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${CSRF_COOKIE_NAME}=`));

  if (!match) {
    return null;
  }

  return decodeURIComponent(match.split('=')[1] ?? '');
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method?.toUpperCase() ?? 'GET';
  const headers = new Headers(init?.headers);

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (MUTATING_METHODS.has(method)) {
    const csrfToken = getCsrfToken();

    if (csrfToken) {
      headers.set(CSRF_HEADER_NAME, csrfToken);
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    let message = `Request failed with ${response.status}`;

    try {
      const payload = (await response.json()) as { message?: unknown };

      if (typeof payload.message === 'string') {
        message = payload.message;
      }
    } catch {
      // Fall through to the generic status message.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}