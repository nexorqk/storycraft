import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CreateBookPage from '../app/create/page';
import * as authApi from '../lib/auth-api';
import * as booksApi from '../lib/books-api';
import * as childrenApi from '../lib/children-api';
import * as templatesApi from '../lib/templates-api';

vi.mock('../lib/auth-api', () => ({
  fetchCurrentUser: vi.fn(),
  getGoogleAuthUrl: vi.fn(() => '/api/auth/google'),
  logoutCurrentUser: vi.fn(),
}));

vi.mock('../lib/books-api', () => ({
  createBook: vi.fn(),
  getBooksUsage: vi.fn(),
  listBooks: vi.fn(),
  deleteBook: vi.fn(),
  getBookProgress: vi.fn(),
  getPdfUrl: vi.fn(),
}));

vi.mock('../lib/children-api', () => ({
  listChildren: vi.fn(),
  createChild: vi.fn(),
  updateChild: vi.fn(),
  deleteChild: vi.fn(),
}));

vi.mock('../lib/templates-api', () => ({
  listTemplates: vi.fn(),
  getTemplateBySlug: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ children, ...props }: Record<string, unknown>) =>
    `<a data-mocked-link ${Object.entries(props).map(([k, v]) => `${k}="${v}"`).join(' ')}>${children}</a>`,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
  useParams: vi.fn(),
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

const mockCreateBook = vi.mocked(booksApi.createBook);
const mockGetBooksUsage = vi.mocked(booksApi.getBooksUsage);
const mockListChildren = vi.mocked(childrenApi.listChildren);
const mockListTemplates = vi.mocked(templatesApi.listTemplates);
const mockUseSearchParams = vi.mocked(
  await import('next/navigation').then((m) => m.useSearchParams),
);

const sampleChildren = [
  {
    id: 'c1',
    name: 'Masha',
    birthDate: '2020-03-15' as string | null,
    interests: ['space'],
    readingLevel: 'beginner' as string | null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
];

const sampleTemplates = [
  {
    id: 't1',
    slug: 'adventure',
    title: 'Adventure Story',
    description: 'An exciting adventure',
    language: 'ru',
    ageMin: 4,
    ageMax: 8,
    pageCount: 8,
    isActive: true,
    pages: [
      { pageNumber: 1, textPrompt: 'Once upon a time', illustrationPrompt: 'A forest' },
    ],
  },
];

const sampleUsage = { used: 0, limit: 3, remaining: 3, periodStart: '2025-04-01', periodEnd: '2025-05-01' };

describe('CreateBookPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearchParams.mockReturnValue({
      get: vi.fn(() => null),
      getAll: vi.fn(() => []),
      has: vi.fn(() => false),
      forEach: vi.fn(),
      entries: vi.fn(() => []),
      keys: vi.fn(() => []),
      values: vi.fn(() => []),
      toString: vi.fn(() => ''),
      [Symbol.iterator]: vi.fn(() => []),
    } as unknown as ReturnType<typeof import('next/navigation').useSearchParams>);
    mockListChildren.mockResolvedValue({ children: sampleChildren });
    mockListTemplates.mockResolvedValue(sampleTemplates);
    mockGetBooksUsage.mockResolvedValue({ usage: sampleUsage });
  });

  it('renders child selection, template selection, and customization form', async () => {
    render(<CreateBookPage />);
    await screen.findByText('1. Choose a child');
    expect(screen.getByText('2. Choose a template')).toBeInTheDocument();
    expect(screen.getByText('3. Customize')).toBeInTheDocument();
    expect(screen.getByText('Masha')).toBeInTheDocument();
  });

  it('shows empty state when no children exist', async () => {
    mockListChildren.mockResolvedValue({ children: [] });
    render(<CreateBookPage />);
    await screen.findByText('No children yet.');
  });

  it('shows empty state when no templates exist', async () => {
    mockListTemplates.mockResolvedValue([]);
    render(<CreateBookPage />);
    await screen.findByText('No templates available.');
  });

  it('displays usage remaining on the page', async () => {
    render(<CreateBookPage />);
    await screen.findByText('generations left');
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('enables Review & Create button when child and template are selected', async () => {
    const user = userEvent.setup();
    render(<CreateBookPage />);
    await screen.findByText('Masha');

    const childButton = screen.getByRole('button', { name: /masha/i });
    await user.click(childButton);

    const templateButton = screen.getByRole('button', {
      name: /adventure story/i,
    });
    await user.click(templateButton);

    const reviewButton = screen.getByRole('button', { name: /review & create/i });
    expect(reviewButton).toBeEnabled();
  });

  it('navigates to review step and submits book creation', async () => {
    const user = userEvent.setup();
    mockCreateBook.mockResolvedValue({
      book: {
        id: 'b1',
        title: 'My Book',
        childNameInStory: null,
        coverStyle: 'default',
        language: 'ru',
        status: 'PENDING',
        pdfObjectKey: null,
        errorMessage: null,
        completedAt: null,
        createdAt: '2025-06-01T00:00:00Z',
        updatedAt: '2025-06-01T00:00:00Z',
        child: { id: 'c1', name: 'Masha' },
        template: { id: 't1', slug: 'adventure', title: 'Adventure Story' },
      },
    });

    render(<CreateBookPage />);
    await screen.findByText('Masha');

    await user.click(screen.getByRole('button', { name: /masha/i }));
    await user.click(screen.getByRole('button', { name: /adventure story/i }));
    await user.click(screen.getByRole('button', { name: /review & create/i }));

    await screen.findByText('Review your book');

    expect(screen.getByText('Child')).toBeInTheDocument();
    expect(screen.getByText('Adventure Story')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /create book/i }));

    expect(mockCreateBook).toHaveBeenCalledWith({
      childId: 'c1',
      templateId: 't1',
      title: undefined,
      childNameInStory: undefined,
      coverStyle: 'default',
      language: 'ru',
    });
  });

  it('shows error when book creation fails', async () => {
    const user = userEvent.setup();
    mockCreateBook.mockRejectedValue(new Error('Generation limit reached'));

    render(<CreateBookPage />);
    await screen.findByText('Masha');

    await user.click(screen.getByRole('button', { name: /masha/i }));
    await user.click(screen.getByRole('button', { name: /adventure story/i }));
    await user.click(screen.getByRole('button', { name: /review & create/i }));

    await screen.findByText('Review your book');
    await user.click(screen.getByRole('button', { name: /create book/i }));

    await screen.findByText('Generation limit reached');
  });
});