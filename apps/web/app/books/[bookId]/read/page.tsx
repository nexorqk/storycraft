'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import { AppShell } from '../../../components/app-shell';
import { AuthPanel } from '../../../components/auth-panel';
import type { BookDetail } from '../../../../lib/books-api';
import { getBook } from '../../../../lib/books-api';

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Preparing',
  COMPLETED: 'Story ready',
  FAILED: 'Failed',
};

export default function BookReaderPage() {
  const params = useParams();
  const bookId = params.bookId as string;

  const [book, setBook] = useState<BookDetail | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    getBook(bookId)
      .then((data) => {
        if (!cancelled) {
          setBook(data.book);
          setPageIndex(0);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load story');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [bookId]);

  const totalPages = book?.pages.length ?? 0;

  const goToPage = useCallback(
    (nextIndex: number) => {
      setPageIndex(
        Math.min(Math.max(nextIndex, 0), Math.max(totalPages - 1, 0)),
      );
    },
    [totalPages],
  );

  useEffect(() => {
    if (totalPages === 0) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        goToPage(pageIndex - 1);
      }

      if (event.key === 'ArrowRight') {
        goToPage(pageIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPage, pageIndex, totalPages]);

  if (loading) {
    return (
      <AppShell active="Books">
        <header className="page-header">
          <div>
            <p className="eyebrow">Reader</p>
            <h1>Loading story</h1>
          </div>
        </header>
        <AuthPanel />
        <p className="empty-state">Loading story...</p>
      </AppShell>
    );
  }

  if (error || !book) {
    return (
      <AppShell active="Books">
        <header className="page-header">
          <div>
            <p className="eyebrow">Reader</p>
            <h1>Story Not Found</h1>
          </div>
        </header>
        <AuthPanel />
        <p className="empty-state error">{error ?? 'Story not found'}</p>
        <div className="card-actions" style={{ marginTop: 16 }}>
          <a href="/books" className="secondary-button">
            Back to Library
          </a>
        </div>
      </AppShell>
    );
  }

  if (book.status !== 'COMPLETED') {
    return (
      <AppShell active="Books">
        <header className="page-header">
          <div>
            <p className="eyebrow">Reader</p>
            <h1>{book.title || book.template.title}</h1>
          </div>
        </header>
        <AuthPanel />
        <section className="panel">
          <h2>Story is not ready yet</h2>
          <p>
            Current status: {statusLabels[book.status] ?? book.status}. Open the
            story again after preparation finishes.
          </p>
          <div className="card-actions" style={{ marginTop: 16 }}>
            <a href={`/books/${book.id}`} className="primary-button">
              View details
            </a>
            <a href="/books" className="secondary-button">
              Back to Library
            </a>
          </div>
        </section>
      </AppShell>
    );
  }

  if (book.pages.length === 0) {
    return (
      <AppShell active="Books">
        <header className="page-header">
          <div>
            <p className="eyebrow">Reader</p>
            <h1>{book.title || book.template.title}</h1>
          </div>
        </header>
        <AuthPanel />
        <p className="empty-state">This story has no pages yet.</p>
        <div className="card-actions" style={{ marginTop: 16 }}>
          <a href={`/books/${book.id}`} className="secondary-button">
            Back to details
          </a>
        </div>
      </AppShell>
    );
  }

  const page = book.pages[pageIndex]!;
  const progressPercent = Math.round(
    ((pageIndex + 1) / book.pages.length) * 100,
  );

  return (
    <AppShell active="Books">
      <header className="page-header reader-titlebar">
        <div>
          <p className="eyebrow">Story reader</p>
          <h1>{book.title || book.template.title}</h1>
          <p className="header-copy">
            {book.child.name} &middot; Page {pageIndex + 1} of{' '}
            {book.pages.length}
          </p>
        </div>
        <div className="card-actions reader-header-actions">
          <a href={`/books/${book.id}`} className="secondary-button">
            Details
          </a>
          <a href="/books" className="secondary-button">
            Library
          </a>
        </div>
      </header>

      <AuthPanel />

      <section className="story-reader" aria-live="polite">
        <div className="reader-progress" aria-label="Reading progress">
          <span>{progressPercent}% complete</span>
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <article className="story-page-card" key={page.id}>
          <p className="story-page-number">Page {page.pageNumber}</p>
          <div className="story-page-text">
            {page.text.split(/\n+/).map((paragraph, index) => (
              <p key={`${page.id}-${index}`}>{paragraph}</p>
            ))}
          </div>
        </article>

        <nav className="story-page-list" aria-label="Story pages">
          {book.pages.map((item, index) => (
            <button
              aria-label={`Go to page ${item.pageNumber}`}
              aria-current={index === pageIndex ? 'page' : undefined}
              className="story-page-dot"
              data-active={index === pageIndex}
              key={item.id}
              type="button"
              onClick={() => goToPage(index)}
            >
              {item.pageNumber}
            </button>
          ))}
        </nav>

        <div className="reader-controls">
          <button
            className="secondary-button"
            type="button"
            disabled={pageIndex === 0}
            onClick={() => goToPage(pageIndex - 1)}
          >
            Previous
          </button>
          <span className="reader-page-count">
            {pageIndex + 1} / {book.pages.length}
          </span>
          <button
            className="primary-button"
            type="button"
            disabled={pageIndex === book.pages.length - 1}
            onClick={() => goToPage(pageIndex + 1)}
          >
            Next
          </button>
        </div>
      </section>
    </AppShell>
  );
}
