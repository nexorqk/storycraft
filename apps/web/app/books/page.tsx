'use client';

import { useCallback, useEffect, useState } from 'react';

import { AppShell } from '../components/app-shell';
import { AuthPanel } from '../components/auth-panel';
import type { BookSummary } from '../../lib/books-api';
import { listBooks, deleteBook } from '../../lib/books-api';

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

  const loadBooks = useCallback(() => {
    let cancelled = false;

    listBooks()
      .then((data) => {
        if (!cancelled) {
          setBooks(data.books);
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

  const handleDelete = async (bookId: string) => {
    if (!confirm('Delete this book? This cannot be undone.')) return;

    try {
      await deleteBook(bookId);
      setBooks((prev) => prev.filter((b) => b.id !== bookId));
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
        <a href="/create" className="primary-button">
          Create New
        </a>
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
          {books.map((book) => (
            <article className="book-card" key={book.id}>
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

              {book.errorMessage && (
                <p className="book-error">{book.errorMessage}</p>
              )}

              {book.status === 'COMPLETED' && book.pdfObjectKey && (
                <div className="card-actions">
                  <button className="primary-button" type="button">
                    Download PDF
                  </button>
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
          ))}
        </div>
      )}
    </AppShell>
  );
}
