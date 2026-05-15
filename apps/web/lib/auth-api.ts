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

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ??
  'http://localhost:3001/api';

export function getGoogleAuthUrl() {
  return `${apiUrl}/auth/google`;
}

export async function fetchCurrentUser(signal?: AbortSignal) {
  const response = await fetch(`${apiUrl}/auth/me`, {
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
  const response = await fetch(`${apiUrl}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Logout failed with ${response.status}`);
  }
}
