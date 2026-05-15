import { API_URL } from './auth-api';

export type ChildProfile = {
  id: string;
  name: string;
  birthDate: string | null;
  interests: string[];
  readingLevel: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChildPayload = {
  name: string;
  birthDate?: string;
  interests?: string[];
  readingLevel?: string;
};

async function parseApiError(response: Response) {
  try {
    const payload = (await response.json()) as { message?: unknown };

    if (typeof payload.message === 'string') {
      return payload.message;
    }
  } catch {
    // Fall through to the generic status message.
  }

  return `Request failed with ${response.status}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  return (await response.json()) as T;
}

export async function listChildren() {
  return request<{ children: ChildProfile[] }>('/children');
}

export async function createChild(payload: ChildPayload) {
  return request<{ child: ChildProfile }>('/children', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateChild(childId: string, payload: ChildPayload) {
  return request<{ child: ChildProfile }>(`/children/${childId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteChild(childId: string) {
  return request<{ ok: true }>(`/children/${childId}`, {
    method: 'DELETE',
  });
}
