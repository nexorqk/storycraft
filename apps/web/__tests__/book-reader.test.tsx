import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import BookReaderPage from '../app/books/[bookId]/read/page';
import type { BookDetail } from '../lib/books-api';
import * as booksApi from '../lib/books-api';
import * as authApi from '../lib/auth-api';

vi.mock('../lib/auth-api', () => ({
  fetchCurrentUser: vi.fn(),
  getGoogleAuthUrl: vi.fn(() => '/api/auth/google'),
  logoutCurrentUser: vi.fn(),
}));

vi.mock('../lib/books-api', () => ({
  getBook: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({ bookId: 'b1' })),
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

const mockGetBook = vi.mocked(booksApi.getBook);
const mockFetchCurrentUser = vi.mocked(authApi.fetchCurrentUser);

const sampleBook: BookDetail = {
  id: 'b1',
  title: 'Потерянная звёздочка',
  childNameInStory: null,
  coverStyle: 'default',
  language: 'ru',
  personalization: null,
  status: 'COMPLETED',
  pdfObjectKey: null,
  errorMessage: null,
  completedAt: '2026-05-23T00:00:00.000Z',
  createdAt: '2026-05-23T00:00:00.000Z',
  updatedAt: '2026-05-23T00:00:00.000Z',
  child: { id: 'c1', name: 'Маша' },
  template: {
    id: 't1',
    slug: 'lost-star-no-ai-ru',
    title: 'Потерянная звёздочка',
  },
  pages: [
    {
      id: 'p1',
      pageNumber: 1,
      text: 'Маша нашла звезду.',
      illustrationPrompt: null,
    },
    {
      id: 'p2',
      pageNumber: 2,
      text: 'Звезда вернулась домой.',
      illustrationPrompt: null,
    },
  ],
  illustrations: [],
};

describe('BookReaderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchCurrentUser.mockResolvedValue({ user: null });
  });

  it('shows loading state while the story is fetched', () => {
    mockGetBook.mockReturnValue(new Promise(() => {}));

    render(<BookReaderPage />);

    expect(screen.getByText('Loading story...')).toBeInTheDocument();
  });

  it('renders completed book pages in order', async () => {
    mockGetBook.mockResolvedValue({ book: sampleBook });

    render(<BookReaderPage />);

    await screen.findByText('Маша нашла звезду.');
    expect(screen.getByText('50% complete')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /go to page 2/i }),
    ).toBeInTheDocument();
  });

  it('supports next and previous navigation', async () => {
    const user = userEvent.setup();
    mockGetBook.mockResolvedValue({ book: sampleBook });

    render(<BookReaderPage />);

    await screen.findByText('Маша нашла звезду.');
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Звезда вернулась домой.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /previous/i }));
    expect(screen.getByText('Маша нашла звезду.')).toBeInTheDocument();
  });

  it('handles completed books without pages', async () => {
    mockGetBook.mockResolvedValue({
      book: { ...sampleBook, pages: [] },
    });

    render(<BookReaderPage />);

    await screen.findByText('This story has no pages yet.');
  });

  it('handles loading errors', async () => {
    mockGetBook.mockRejectedValue(new Error('Unauthorized'));

    render(<BookReaderPage />);

    await screen.findByText('Unauthorized');
  });
});
