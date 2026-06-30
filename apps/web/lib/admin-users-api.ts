import { request } from './api-client';

export type AdminUserSummary = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  locale: string;
  roles: string[];
  bookCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminUserDetail = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  locale: string;
  freeGenerationsUsed: number;
  freeGenerationsPeriodStart: string;
  roles: string[];
  bookCount: number;
  childCount: number;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function listAdminUsers() {
  return request<{ users: AdminUserSummary[] }>('/admin/users');
}

export async function getAdminUser(userId: string) {
  return request<{ user: AdminUserDetail }>(`/admin/users/${userId}`);
}

export async function toggleUserRole(
  userId: string,
  role: string,
  action: 'add' | 'remove',
) {
  return request<{ ok: true }>(`/admin/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role, action }),
  });
}
