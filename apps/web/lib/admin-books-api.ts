import { request } from './api-client';

export type AdminBookSummary = {
  id: string;
  title: string | null;
  status: string;
  language: string;
  childName: string | null;
  userName: string;
  userEmail: string;
  userId: string;
  templateSlug: string;
  templateTitle: string;
  pageCount: number;
  errorMessage: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminBookDetail = {
  id: string;
  title: string | null;
  status: string;
  language: string;
  coverStyle: string;
  childNameInStory: string | null;
  personalization: unknown;
  pdfObjectKey: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  user: { id: string; name: string | null; email: string; locale: string };
  template: { id: string; slug: string; title: string };
  child: { id: string; name: string; interests: string[] } | null;
  pages: {
    id: string;
    pageNumber: number;
    text: string;
    illustrationPrompt: string | null;
    createdAt: string;
  }[];
  illustrations: {
    id: string;
    pageId: string | null;
    status: string;
    prompt: string;
    objectKey: string | null;
    errorMessage: string | null;
    createdAt: string;
  }[];
  jobs: {
    id: string;
    type: string;
    status: string;
    attempts: number;
    maxAttempts: number;
    errorMessage: string | null;
    createdAt: string | null;
    completedAt: string | null;
  }[];
};

export async function listAdminBooks() {
  return request<{ books: AdminBookSummary[] }>('/admin/books');
}

export async function getAdminBook(bookId: string) {
  return request<{ book: AdminBookDetail }>(`/admin/books/${bookId}`);
}

export async function retryAdminBook(bookId: string) {
  return request<{ ok: boolean; message?: string }>(
    `/admin/books/${bookId}/retry`,
    { method: 'POST' },
  );
}
