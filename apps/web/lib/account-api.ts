import { request } from './api-client';

export type AccountExport = {
  exportedAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    locale: string;
    freeGenerationsUsed: number;
    freeGenerationsPeriodStart: string;
    createdAt: string;
    updatedAt: string;
  };
  children: unknown[];
  books: unknown[];
  ratings: unknown[];
  subscriptions: unknown[];
  paymentCustomers: unknown[];
  referrals: unknown[];
  referredBy: unknown[];
};

export function exportAccountData() {
  return request<AccountExport>('/account/export');
}

export function deleteAccount() {
  return request<{ ok: true }>('/account', {
    method: 'DELETE',
  });
}
