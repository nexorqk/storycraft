import { API_URL } from './auth-api';

export type BookSummary = {
  id: string;
  title: string | null;
  language: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  pdfObjectKey: string | null;
  errorMessage: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  child: {
    id: string;
    name: string;
  };
  template: {
    id: string;
    slug: string;
    title: string;
  };
};

export type BookDetail = BookSummary & {
  pages: {
    id: string;
    pageNumber: number;
    text: string;
    illustrationPrompt: string | null;
  }[];
  illustrations: {
    id: string;
    pageNumber: string | null;
    status: string;
    objectKey: string | null;
  }[];
};

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
    const message = await response.text();
    throw new Error(`Request failed: ${response.status} ${message}`);
  }

  return (await response.json()) as T;
}

export async function listBooks() {
  return request<{ books: BookSummary[] }>('/books');
}

export async function getBook(bookId: string) {
  return request<{ book: BookDetail }>(`/books/${bookId}`);
}

export async function createBook(dto: {
  childId: string;
  templateId: string;
  title?: string;
  language?: string;
}) {
  return request<{ book: BookSummary }>('/books', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function deleteBook(bookId: string) {
  return request<{ ok: true }>(`/books/${bookId}`, {
    method: 'DELETE',
  });
}

export async function generateBook(bookId: string) {
  return request<{ bookId: string; jobId: string; status: string }>(
    `/books/${bookId}/generate`,
    {
      method: 'POST',
    },
  );
}

export async function getBookProgress(bookId: string) {
  return request<{
    progress: {
      progress: number;
      status: string;
      completedPages?: number;
      totalPages?: number;
      error?: string;
    };
  }>(`/books/${bookId}/progress`);
}
