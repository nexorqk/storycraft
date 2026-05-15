'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

import { AppShell } from '../../components/app-shell';
import { AuthPanel } from '../../components/auth-panel';
import type { BookDetail } from '../../../lib/books-api';
import { getBook, generateBook, getBookProgress } from '../../../lib/books-api';

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
  const [progress, setProgress] = useState<{
    progress: number;
    status: string;
    completedPages?: number;
    totalPages?: number;
    error?: string;
  } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const startPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
    }

    pollRef.current = setInterval(() => {
      getBookProgress(bookId)
        .then((data) => {
          setProgress(data.progress);

          if (
            data.progress.status === 'completed' ||
            data.progress.status === 'failed'
          ) {
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
            loadBook();
          }
        })
        .catch(() => {
          // Silently ignore polling errors
        });
    }, 3000);
  }, [bookId, loadBook]);

  useEffect(() => {
    if (book?.status === 'PROCESSING') {
      startPolling();
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [book?.status, startPolling]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError(null);

    try {
      await generateBook(bookId);
      setProgress({ progress: 0, status: 'queued' });
      startPolling();
      loadBook();
    } catch (err: unknown) {
      setGenerateError(
        err instanceof Error ? err.message : 'Failed to start generation',
      );
    } finally {
      setGenerating(false);
    }
  };

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

  const isGenerating =
    book.status === 'PROCESSING' ||
    (progress &&
      (progress.status === 'queued' ||
        progress.status === 'starting' ||
        progress.status === 'generating'));

  const canGenerate = book.status === 'PENDING' || book.status === 'FAILED';

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

      {generateError && (
        <div className="panel panel-error">
          <h2>Generation Error</h2>
          <p>{generateError}</p>
        </div>
      )}

      {book.errorMessage && (
        <div className="panel panel-error">
          <h2>Previous Error</h2>
          <p>{book.errorMessage}</p>
        </div>
      )}

      {isGenerating && progress && (
        <div className="panel">
          <div className="section-heading">
            <h2>Generating your book</h2>
          </div>

          <div className="progress-container">
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
            <div className="progress-info">
              <span className="progress-percent">{progress.progress}%</span>
              <span className="progress-status">
                {progress.status === 'generating' &&
                progress.completedPages != null &&
                progress.totalPages != null
                  ? `Page ${progress.completedPages} of ${progress.totalPages}`
                  : (statusLabels[progress.status] ?? progress.status)}
              </span>
            </div>
          </div>

          <p className="panel-status" style={{ marginTop: 12 }}>
            This may take a few minutes. The page will update automatically.
          </p>
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

      {canGenerate && (
        <div className="panel">
          <h2>
            {book.status === 'FAILED'
              ? 'Generation failed'
              : 'Ready to generate'}
          </h2>
          <p>
            {book.status === 'FAILED'
              ? 'You can retry generation. Previous pages will be cleared.'
              : "Start generating your personalized Russian children's book."}
          </p>
          <div className="card-actions" style={{ marginTop: 16 }}>
            <button
              className="primary-button"
              type="button"
              disabled={generating}
              onClick={handleGenerate}
            >
              {generating ? 'Starting...' : 'Generate Book'}
            </button>
          </div>
        </div>
      )}

      <div className="book-detail-layout">
        <div className="panel">
          <div className="section-heading">
            <h2>Pages</h2>
          </div>

          {book.pages.length === 0 ? (
            <p className="empty-state">
              {isGenerating
                ? 'Pages are being generated...'
                : 'No pages generated yet.'}
            </p>
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
