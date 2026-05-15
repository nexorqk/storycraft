'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import { AppShell } from '../../components/app-shell';
import { AuthPanel } from '../../components/auth-panel';
import type { BookDetail } from '../../../lib/books-api';
import { getBook } from '../../../lib/books-api';

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};

export default function BookDetailPage() {
  const params = useParams();
  const bookId = params.bookId as string;

  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBook = useCallback(() => {
    let cancelled = false;

    getBook(bookId)
      .then((data) => {
        if (!cancelled) {
          setBook(data.book);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load book');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [bookId]);

  useEffect(() => loadBook(), [loadBook]);

  if (loading) {
    return (
      <AppShell active="Books">
        <header className="page-header">
          <div>
            <p className="eyebrow">Loading</p>
            <h1>Book Details</h1>
          </div>
        </header>
        <AuthPanel />
        <p className="empty-state">Loading book...</p>
      </AppShell>
    );
  }

  if (error || !book) {
    return (
      <AppShell active="Books">
        <header className="page-header">
          <div>
            <p className="eyebrow">Error</p>
            <h1>Book Not Found</h1>
          </div>
        </header>
        <AuthPanel />
        <p className="empty-state error">{error ?? 'Book not found'}</p>
        <div className="card-actions" style={{ marginTop: 16 }}>
          <a href="/books" className="secondary-button">
            Back to Library
          </a>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell active="Books">
      <header className="page-header">
        <div>
          <p className="eyebrow">Book</p>
          <h1>{book.title || book.template.title}</h1>
          <p className="header-copy">
            {book.child.name} &middot; {book.template.title} &middot;{' '}
            {new Date(book.createdAt).toLocaleDateString()}
          </p>
        </div>
        <span
          className="status-pill"
          style={{
            color:
              book.status === 'COMPLETED'
                ? 'var(--success)'
                : book.status === 'FAILED'
                  ? 'var(--danger)'
                  : book.status === 'PROCESSING'
                    ? 'var(--accent)'
                    : 'var(--warning)',
          }}
        >
          {statusLabels[book.status]}
        </span>
      </header>

      <AuthPanel />

      {book.errorMessage && (
        <div className="panel panel-error">
          <h2>Error</h2>
          <p>{book.errorMessage}</p>
        </div>
      )}

      {book.status === 'COMPLETED' && book.pdfObjectKey && (
        <div className="panel panel-success">
          <h2>Your book is ready!</h2>
          <p>The PDF has been generated and is ready for download.</p>
          <div className="card-actions" style={{ marginTop: 16 }}>
            <button className="primary-button" type="button">
              Download PDF
            </button>
          </div>
        </div>
      )}

      {book.status === 'PENDING' || book.status === 'PROCESSING' ? (
        <div className="panel">
          <h2>Generation in progress</h2>
          <p>
            Your book is being generated. This may take a few minutes. Refresh
            the page to check status.
          </p>
          <div className="card-actions" style={{ marginTop: 16 }}>
            <button
              className="secondary-button"
              type="button"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
          </div>
        </div>
      ) : null}

      <div className="book-detail-layout">
        <div className="panel">
          <div className="section-heading">
            <h2>Pages</h2>
          </div>

          {book.pages.length === 0 ? (
            <p className="empty-state">No pages generated yet.</p>
          ) : (
            <ol className="catalog-pages-list">
              {book.pages.map((page) => (
                <li key={page.id} className="catalog-page-item">
                  <span className="catalog-page-num">{page.pageNumber}</span>
                  <div>
                    <p className="catalog-page-text">{page.text}</p>
                    {page.illustrationPrompt && (
                      <p className="catalog-page-illust">
                        🎨 {page.illustrationPrompt}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="panel">
          <div className="section-heading">
            <h2>Details</h2>
          </div>

          <dl className="review-meta">
            <div>
              <dt>Child</dt>
              <dd>{book.child.name}</dd>
            </div>
            <div>
              <dt>Template</dt>
              <dd>{book.template.title}</dd>
            </div>
            <div>
              <dt>Language</dt>
              <dd>{book.language.toUpperCase()}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{statusLabels[book.status]}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{new Date(book.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{new Date(book.updatedAt).toLocaleString()}</dd>
            </div>
          </dl>

          {book.completedAt && (
            <dl className="review-meta" style={{ marginTop: 12 }}>
              <div>
                <dt>Completed</dt>
                <dd>{new Date(book.completedAt).toLocaleString()}</dd>
              </div>
            </dl>
          )}
        </div>
      </div>

      <div className="card-actions" style={{ marginTop: 20 }}>
        <a href="/books" className="secondary-button">
          Back to Library
        </a>
      </div>
    </AppShell>
  );
}
