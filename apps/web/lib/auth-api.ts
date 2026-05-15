export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  locale: string;
  freeGenerationsUsed: number;
  createdAt: string;
  updatedAt: string;
};

export type AuthMeResponse = {
  user: PublicUser | null;
};

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ??
  'http://localhost:3001/api';

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

export function getGoogleAuthUrl() {
  return `${API_URL}/auth/google`;
}

export async function fetchCurrentUser(signal?: AbortSignal) {
  const response = await fetch(`${API_URL}/auth/me`, {
    credentials: 'include',
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw new Error(`Auth check failed with ${response.status}`);
  }

  return (await response.json()) as AuthMeResponse;
}

export async function logoutCurrentUser() {
  const csrfToken = getCsrfToken();
  const headers: Record<string, string> = {};

  if (csrfToken) {
    headers[CSRF_HEADER_NAME] = csrfToken;
  }

  const response = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Logout failed with ${response.status}`);
  }
}
