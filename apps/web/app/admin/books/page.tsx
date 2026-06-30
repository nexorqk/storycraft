'use client';

import { useCallback, useEffect, useState } from 'react';

import { AppShell } from '../../components/app-shell';
import { AuthPanel } from '../../components/auth-panel';
import {
  listAdminBooks,
  getAdminBook,
  retryAdminBook,
  type AdminBookSummary,
  type AdminBookDetail,
} from '../../../lib/admin-books-api';

type ListView = { view: 'list' };
type DetailView = { view: 'detail'; bookId: string };

type PageState = ListView | DetailView;

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};

export default function AdminBooksPage() {
  const [page, setPage] = useState<PageState>({ view: 'list' });
  const [books, setBooks] = useState<AdminBookSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBooks = useCallback(() => {
    setLoading(true);
    setError(null);
    listAdminBooks()
      .then((data) => setBooks(data.books))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load books'),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => loadBooks(), [loadBooks]);

  if (page.view === 'detail') {
    return (
      <BookDetailPage
        bookId={page.bookId}
        onBack={() => setPage({ view: 'list' })}
      />
    );
  }

  return (
    <AppShell active="Admin">
      <header className="page-header">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Books</h1>
          <p className="header-copy">
            All books across all users and templates.
          </p>
        </div>
      </header>

      <AdminSubNav active="Books" />

      <AuthPanel />

      {error && <p className="empty-state error">{error}</p>}

      {loading && books.length === 0 && (
        <p className="empty-state">Loading books...</p>
      )}

      {!loading && books.length === 0 && (
        <p className="empty-state">No books found.</p>
      )}

      {books.length > 0 && (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>User</th>
                <th>Template</th>
                <th>Status</th>
                <th>Pages</th>
                <th>Error</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {books.map((b) => (
                <tr key={b.id}>
                  <td className="admin-table-title">
                    <button
                      type="button"
                      className="link-button"
                      onClick={() =>
                        setPage({ view: 'detail', bookId: b.id })
                      }
                    >
                      {b.title || 'Untitled'}
                    </button>
                  </td>
                  <td>{b.userName}</td>
                  <td className="admin-table-mono">{b.templateSlug}</td>
                  <td>
                    <span
                      className={`status-badge ${b.status === 'COMPLETED' ? 'active' : b.status === 'FAILED' ? 'inactive' : ''}`}
                    >
                      {STATUS_LABELS[b.status] ?? b.status}
                    </span>
                  </td>
                  <td>{b.pageCount}</td>
                  <td className="admin-table-mono">
                    {b.errorMessage
                      ? b.errorMessage.slice(0, 50) +
                        (b.errorMessage.length > 50 ? '…' : '')
                      : '—'}
                  </td>
                  <td className="admin-table-date">
                    {new Date(b.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="secondary-button small"
                      onClick={() =>
                        setPage({ view: 'detail', bookId: b.id })
                      }
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}

function BookDetailPage({
  bookId,
  onBack,
}: {
  bookId: string;
  onBack: () => void;
}) {
  const [book, setBook] = useState<AdminBookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getAdminBook(bookId)
      .then((data) => setBook(data.book))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load book'),
      )
      .finally(() => setLoading(false));
  }, [bookId]);

  useEffect(() => load(), [load]);

  const handleRetry = async () => {
    if (!book) return;
    setRetrying(true);
    setError(null);

    try {
      await retryAdminBook(bookId);
      await load();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to retry book',
      );
    } finally {
      setRetrying(false);
    }
  };

  const statusLabel = book ? STATUS_LABELS[book.status] ?? book.status : '';
  const isFailed = book?.status === 'FAILED';

  if (loading || !book) {
    return (
      <AppShell active="Admin">
        <header className="page-header">
          <div>
            <p className="eyebrow">Administration</p>
            <h1>Book</h1>
          </div>
        </header>
        <AuthPanel />
        <p className="empty-state">Loading...</p>
      </AppShell>
    );
  }

  return (
    <AppShell active="Admin">
      <header className="page-header">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>{book.title || 'Untitled'}</h1>
          <p className="header-copy">
            {book.user.name || book.user.email} &middot;{' '}
            {book.template.title} &middot;{' '}
            <span
              className={`status-badge ${book.status === 'COMPLETED' ? 'active' : book.status === 'FAILED' ? 'inactive' : ''}`}
            >
              {statusLabel}
            </span>
          </p>
        </div>
        <div className="card-actions">
          <button className="secondary-button" type="button" onClick={onBack}>
            Back to List
          </button>
        </div>
      </header>

      <AuthPanel />

      {error && <p className="empty-state error">{error}</p>}

      <div className="panel">
        <h2>Details</h2>
        <dl className="review-meta">
          <div>
            <dt>User</dt>
            <dd>
              {book.user.name || book.user.email} ({book.user.email})
            </dd>
          </div>
          <div>
            <dt>Template</dt>
            <dd>
              {book.template.title} ({book.template.slug})
            </dd>
          </div>
          <div>
            <dt>Child</dt>
            <dd>{book.child?.name ?? '—'}</dd>
          </div>
          <div>
            <dt>Language</dt>
            <dd>{book.language.toUpperCase()}</dd>
          </div>
          <div>
            <dt>Cover Style</dt>
            <dd>{book.coverStyle}</dd>
          </div>
          <div>
            <dt>Pages</dt>
            <dd>{book.pages.length}</dd>
          </div>
          <div>
            <dt>Illustrations</dt>
            <dd>{book.illustrations.length}</dd>
          </div>
          <div>
            <dt>Error</dt>
            <dd>{book.errorMessage || '—'}</dd>
          </div>
          <div>
            <dt>PDF</dt>
            <dd>{book.pdfObjectKey ? 'Generated' : 'Not generated'}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{new Date(book.createdAt).toLocaleDateString()}</dd>
          </div>
          <div>
            <dt>Completed</dt>
            <dd>
              {book.completedAt
                ? new Date(book.completedAt).toLocaleDateString()
                : '—'}
            </dd>
          </div>
        </dl>
      </div>

      {isFailed && (
        <div className="panel">
          <h2>Retry</h2>
          <p>This book failed. You can retry generation.</p>
          <div className="card-actions" style={{ marginTop: 12 }}>
            <button
              className="primary-button"
              type="button"
              onClick={handleRetry}
              disabled={retrying}
            >
              {retrying ? 'Retrying...' : 'Retry Generation'}
            </button>
          </div>
        </div>
      )}

      {book.jobs.length > 0 && (
        <div className="panel">
          <h2>Jobs ({book.jobs.length})</h2>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Attempts</th>
                  <th>Error</th>
                  <th>Created</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {book.jobs.map((j) => (
                  <tr key={j.id}>
                    <td className="admin-table-mono">{j.type}</td>
                    <td>
                      <span
                        className={`status-badge ${j.status === 'COMPLETED' ? 'active' : j.status === 'FAILED' ? 'inactive' : ''}`}
                      >
                        {j.status}
                      </span>
                    </td>
                    <td>
                      {j.attempts}/{j.maxAttempts}
                    </td>
                    <td className="admin-table-mono">
                      {j.errorMessage
                        ? j.errorMessage.slice(0, 40) +
                          (j.errorMessage.length > 40 ? '…' : '')
                        : '—'}
                    </td>
                    <td className="admin-table-date">
                      {j.createdAt
                        ? new Date(j.createdAt).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="admin-table-date">
                      {j.completedAt
                        ? new Date(j.completedAt).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {book.pages.length > 0 && (
        <div className="panel">
          <h2>Pages ({book.pages.length})</h2>
          <ol className="catalog-pages-list">
            {book.pages.map((p) => (
              <li key={p.id} className="catalog-page-item">
                <div className="admin-page-header">
                  <span className="catalog-page-num">Page {p.pageNumber}</span>
                </div>
                <div className="admin-page-content">
                  <p style={{ whiteSpace: 'pre-wrap' }}>{p.text}</p>
                  {p.illustrationPrompt && (
                    <details>
                      <summary>Illustration Prompt</summary>
                      <p className="admin-prompt">{p.illustrationPrompt}</p>
                    </details>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </AppShell>
  );
}

function AdminSubNav({ active }: { active: string }) {
  const items = [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Templates', href: '/admin/templates' },
    { label: 'Users', href: '/admin/users' },
    { label: 'Books', href: '/admin/books' },
  ];

  return (
    <nav className="admin-subnav" aria-label="Admin sections">
      {items.map((item) => (
        <a
          key={item.label}
          className="admin-subnav-link"
          data-active={item.label === active}
          href={item.href}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
