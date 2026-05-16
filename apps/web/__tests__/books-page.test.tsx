import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import BooksPage from '../app/books/page';
import * as booksApi from '../lib/books-api';
import * as authApi from '../lib/auth-api';

vi.mock('../lib/auth-api', () => ({
  fetchCurrentUser: vi.fn(),
  getGoogleAuthUrl: vi.fn(() => '/api/auth/google'),
  logoutCurrentUser: vi.fn(),
}));

vi.mock('../lib/books-api', () => ({
  listBooks: vi.fn(),
  deleteBook: vi.fn(),
  getBookProgress: vi.fn(),
  getPdfUrl: vi.fn(),
  getBooksUsage: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ children, ...props }: Record<string, unknown>) =>
    `<a data-mocked-link ${Object.entries(props)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ')}>${children}</a>`,
}));

vi.mock('next/navigation', () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

const mockListBooks = vi.mocked(booksApi.listBooks);
const mockDeleteBook = vi.mocked(booksApi.deleteBook);
const mockGetPdfUrl = vi.mocked(booksApi.getPdfUrl);
const mockGetBooksUsage = vi.mocked(booksApi.getBooksUsage);
const mockFetchCurrentUser = vi.mocked(authApi.fetchCurrentUser);

const sampleBooks = [
  {
    id: 'b1',
    title: 'Adventure Story',
    childNameInStory: null,
    coverStyle: 'default',
    language: 'ru',
    status: 'COMPLETED' as const,
    pdfObjectKey: 'pdfs/b1.pdf',
    errorMessage: null,
    completedAt: '2025-05-01T00:00:00Z',
    createdAt: '2025-04-01T00:00:00Z',
    updatedAt: '2025-05-01T00:00:00Z',
    child: { id: 'c1', name: 'Masha' },
    template: { id: 't1', slug: 'adventure', title: 'Adventure' },
  },
  {
    id: 'b2',
    title: null,
    childNameInStory: null,
    coverStyle: 'watercolor',
    language: 'ru',
    status: 'PENDING' as const,
    pdfObjectKey: null,
    errorMessage: null,
    completedAt: null,
    createdAt: '2025-04-02T00:00:00Z',
    updatedAt: '2025-04-02T00:00:00Z',
    child: { id: 'c2', name: 'Dmitry' },
    template: { id: 't2', slug: 'fantasy', title: 'Fantasy' },
  },
  {
    id: 'b3',
    title: 'Failed Book',
    childNameInStory: null,
    coverStyle: 'default',
    language: 'ru',
    status: 'FAILED' as const,
    pdfObjectKey: null,
    errorMessage: 'AI provider error',
    completedAt: null,
    createdAt: '2025-04-03T00:00:00Z',
    updatedAt: '2025-04-03T00:00:00Z',
    child: { id: 'c1', name: 'Masha' },
    template: { id: 't1', slug: 'adventure', title: 'Adventure' },
  },
];

const sampleUsage = {
  used: 1,
  limit: 3,
  remaining: 2,
  periodStart: '2025-04-01',
  periodEnd: '2025-05-01',
};

describe('BooksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchCurrentUser.mockResolvedValue({ user: null });
    mockGetPdfUrl.mockResolvedValue({ url: 'https://example.com/b1.pdf' });
  });

  it('shows loading state initially', () => {
    mockListBooks.mockReturnValue(new Promise(() => {}));
    mockGetBooksUsage.mockReturnValue(new Promise(() => {}));
    render(<BooksPage />);
    expect(screen.getByText('Loading books...')).toBeInTheDocument();
  });

  it('shows empty state when no books exist', async () => {
    mockListBooks.mockResolvedValue({ books: [] });
    mockGetBooksUsage.mockResolvedValue({ usage: sampleUsage });
    render(<BooksPage />);
    await screen.findByText('No books yet');
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('generations left')).toBeInTheDocument();
  });

  it('renders books with correct status labels', async () => {
    mockListBooks.mockResolvedValue({ books: sampleBooks });
    mockGetBooksUsage.mockResolvedValue({ usage: sampleUsage });
    render(<BooksPage />);
    await screen.findByText('Adventure Story');

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('shows error message for failed books', async () => {
    mockListBooks.mockResolvedValue({ books: sampleBooks });
    mockGetBooksUsage.mockResolvedValue({ usage: sampleUsage });
    render(<BooksPage />);
    await screen.findByText('Adventure Story');
    expect(screen.getByText('AI provider error')).toBeInTheDocument();
  });

  it('shows download link for completed books with pdf', async () => {
    mockListBooks.mockResolvedValue({ books: sampleBooks });
    mockGetBooksUsage.mockResolvedValue({ usage: sampleUsage });
    render(<BooksPage />);
    await screen.findByText('Adventure Story');

    await waitFor(() => {
      expect(mockGetPdfUrl).toHaveBeenCalledWith('b1');
    });
  });

  it('displays error state when loading fails', async () => {
    mockListBooks.mockRejectedValue(new Error('Unauthorized'));
    mockGetBooksUsage.mockRejectedValue(new Error('Unauthorized'));
    render(<BooksPage />);
    await screen.findByText('Unauthorized');
  });

  it('shows child and template info for each book', async () => {
    mockListBooks.mockResolvedValue({ books: sampleBooks });
    mockGetBooksUsage.mockResolvedValue({ usage: sampleUsage });
    render(<BooksPage />);
    await screen.findByText('Adventure Story');
    expect(screen.getAllByText('Child: Masha').length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByText('Template: Adventure').length,
    ).toBeGreaterThanOrEqual(1);
  });
});
