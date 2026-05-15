import { request } from './api-client';

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
