'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { AppShell } from '../components/app-shell';
import { AuthPanel } from '../components/auth-panel';
import type { BookSummary } from '../../lib/books-api';
import {
  listBooks,
  deleteBook,
  getBookProgress,
  getPdfUrl,
  getBooksUsage,
} from '../../lib/books-api';

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};

const statusColors: Record<string, string> = {
  PENDING: 'var(--warning)',
  PROCESSING: 'var(--accent)',
  COMPLETED: 'var(--success)',
  FAILED: 'var(--danger)',
};

export default function BooksPage() {
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressMap, setProgressMap] = useState<
    Record<
      string,
      { progress: number; completedPages?: number; totalPages?: number }
    >
  >({});
  const [pdfUrls, setPdfUrls] = useState<Record<string, string>>({});
  const [usage, setUsage] = useState<{
    used: number;
    limit: number;
    remaining: number;
  } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadBooks = useCallback(() => {
    let cancelled = false;

    Promise.all([listBooks(), getBooksUsage()])
      .then(([booksData, usageData]) => {
        if (!cancelled) {
          setBooks(booksData.books);
          setUsage(usageData.usage);

          const completedBooks = booksData.books.filter(
            (b) => b.status === 'COMPLETED' && b.pdfObjectKey,
          );

          for (const book of completedBooks) {
            getPdfUrl(book.id)
              .then((pdfData) => {
                if (!cancelled && pdfData.url) {
                  setPdfUrls((prev) => ({ ...prev, [book.id]: pdfData.url! }));
                }
              })
              .catch(() => {});
          }

          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load books');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => loadBooks(), [loadBooks]);

  useEffect(() => {
    const processingBooks = books.filter((b) => b.status === 'PROCESSING');

    if (processingBooks.length === 0) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    if (pollRef.current) {
      clearInterval(pollRef.current);
    }

    pollRef.current = setInterval(() => {
      for (const book of processingBooks) {
        getBookProgress(book.id)
          .then((data) => {
            setProgressMap((prev) => ({
              ...prev,
              [book.id]: {
                progress: data.progress.progress,
                completedPages: data.progress.completedPages,
                totalPages: data.progress.totalPages,
              },
            }));

            if (
              data.progress.status === 'completed' ||
              data.progress.status === 'failed'
            ) {
              loadBooks();
            }
          })
          .catch(() => {});
      }
    }, 3000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [books, loadBooks]);

  const handleDelete = async (bookId: string) => {
    if (!confirm('Delete this book? This cannot be undone.')) return;

    try {
      await deleteBook(bookId);
      setBooks((prev) => prev.filter((b) => b.id !== bookId));
      setProgressMap((prev) => {
        const next = { ...prev };
        delete next[bookId];
        return next;
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete book');
    }
  };

  return (
    <AppShell active="Books">
      <header className="page-header">
        <div>
          <p className="eyebrow">Library</p>
          <h1>My Books</h1>
          <p className="header-copy">
            View and manage your generated children&apos;s books.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {usage && (
            <div className="usage-badge">
              <span className="usage-count">{usage.remaining}</span>
              <span className="usage-label">
                {usage.remaining === 1 ? 'generation left' : 'generations left'}
              </span>
            </div>
          )}
          <a href="/create" className="primary-button">
            Create New
          </a>
        </div>
      </header>

      <AuthPanel />

      {loading && <p className="empty-state">Loading books...</p>}

      {error && <p className="empty-state error">{error}</p>}

      {!loading && !error && books.length === 0 && (
        <div className="panel">
          <h2>No books yet</h2>
          <p>Start by creating your first Russian children&apos;s book.</p>
          <div className="card-actions" style={{ marginTop: 16 }}>
            <a href="/create" className="primary-button">
              Create a Book
            </a>
          </div>
        </div>
      )}

      {!loading && !error && books.length > 0 && (
        <div className="book-list">
          {books.map((book) => {
            const prog = progressMap[book.id];
            const isProcessing = book.status === 'PROCESSING' && prog;

            return (
              <article className="book-card" key={book.id}>
                <a href={`/books/${book.id}`} className="book-card-link">
                  <div className="book-card-header">
                    <h3>{book.title || book.template.title}</h3>
                    <span
                      className="book-status"
                      style={{ color: statusColors[book.status] }}
                    >
                      {statusLabels[book.status]}
                    </span>
                  </div>

                  <div className="book-card-meta">
                    <span>Child: {book.child.name}</span>
                    <span>Template: {book.template.title}</span>
                    <span>
                      Created: {new Date(book.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {isProcessing && (
                    <div
                      className="progress-container"
                      style={{ marginTop: 8 }}
                    >
                      <div className="progress-bar-bg">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${prog.progress}%` }}
                        />
                      </div>
                      <div className="progress-info">
                        <span className="progress-percent">
                          {prog.progress}%
                        </span>
                        <span className="progress-status">
                          {prog.completedPages != null &&
                          prog.totalPages != null
                            ? `Page ${prog.completedPages} of ${prog.totalPages}`
                            : 'Generating...'}
                        </span>
                      </div>
                    </div>
                  )}
                </a>

                {book.errorMessage && (
                  <p className="book-error">{book.errorMessage}</p>
                )}

                {book.status === 'COMPLETED' && book.pdfObjectKey && (
                  <div className="card-actions">
                    {pdfUrls[book.id] ? (
                      <a
                        href={pdfUrls[book.id]}
                        className="primary-button"
                        download
                      >
                        Download PDF
                      </a>
                    ) : (
                      <button className="primary-button" type="button" disabled>
                        Preparing...
                      </button>
                    )}
                  </div>
                )}

                <div className="card-actions" style={{ marginTop: 8 }}>
                  <button
                    className="danger-button"
                    type="button"
                    onClick={() => handleDelete(book.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
