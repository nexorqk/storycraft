'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

import { AppShell } from '../components/app-shell';
import { AuthPanel } from '../components/auth-panel';
import type { TemplateInfo } from '../../lib/templates-api';
import { listTemplates } from '../../lib/templates-api';

type TemplateState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; templates: TemplateInfo[] };

function TemplatesContent() {
  const [state, setState] = useState<TemplateState>({ status: 'loading' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    listTemplates()
      .then((templates) => {
        if (!cancelled) {
          setState({ status: 'ready', templates });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : 'Failed to load templates';
          setState({ status: 'error', message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedTemplate =
    state.status === 'ready'
      ? state.templates.find((t) => t.id === selectedId)
      : null;

  const handleUseTemplate = (templateId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('templateId', templateId);
    router.push(`/create?${params.toString()}`);
  };

  return (
    <AppShell active="Templates">
      <header className="page-header">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>Book Templates</h1>
          <p className="header-copy">
            Browse our collection of Russian children&apos;s book templates.
            Pick one and personalize it for your child.
          </p>
        </div>
        <span className="status-pill">
          {state.status === 'ready'
            ? `${state.templates.length} available`
            : 'Ready'}
        </span>
      </header>

      <AuthPanel />

      {state.status === 'loading' && (
        <p className="empty-state">Loading templates...</p>
      )}

      {state.status === 'error' && (
        <p className="empty-state error">{state.message}</p>
      )}

      {state.status === 'ready' && state.templates.length === 0 && (
        <p className="empty-state">No templates available yet.</p>
      )}

      {state.status === 'ready' && state.templates.length > 0 && (
        <div className="catalog-layout">
          <div className="catalog-grid">
            {state.templates.map((template) => (
              <article
                className={`catalog-card ${selectedId === template.id ? 'catalog-card-selected' : ''}`}
                key={template.id}
                onClick={() => setSelectedId(template.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSelectedId(template.id);
                  }
                }}
              >
                <div className="catalog-card-cover">
                  <span className="catalog-card-icon">📖</span>
                </div>
                <div className="catalog-card-body">
                  <h2 className="catalog-card-title">{template.title}</h2>
                  {template.description && (
                    <p className="catalog-card-description">
                      {template.description}
                    </p>
                  )}
                  <dl className="catalog-card-meta">
                    <div>
                      <dt>Age</dt>
                      <dd>
                        {template.ageMin}
                        {template.ageMax ? `–${template.ageMax}` : '+'}
                      </dd>
                    </div>
                    <div>
                      <dt>Pages</dt>
                      <dd>{template.pages.length}</dd>
                    </div>
                    <div>
                      <dt>Language</dt>
                      <dd>{template.language.toUpperCase()}</dd>
                    </div>
                  </dl>
                </div>
                <div className="catalog-card-actions">
                  <button
                    className="primary-button full-width"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUseTemplate(template.id);
                    }}
                  >
                    Use this template
                  </button>
                </div>
              </article>
            ))}
          </div>

          {selectedTemplate && (
            <aside className="catalog-detail-panel">
              <div className="section-heading">
                <h2>{selectedTemplate.title}</h2>
              </div>
              {selectedTemplate.description && (
                <p className="catalog-detail-description">
                  {selectedTemplate.description}
                </p>
              )}
              <dl className="catalog-detail-meta">
                <div>
                  <dt>Age range</dt>
                  <dd>
                    {selectedTemplate.ageMin}–{selectedTemplate.ageMax ?? '+'}
                  </dd>
                </div>
                <div>
                  <dt>Pages</dt>
                  <dd>{selectedTemplate.pages.length}</dd>
                </div>
                <div>
                  <dt>Language</dt>
                  <dd>{selectedTemplate.language.toUpperCase()}</dd>
                </div>
              </dl>

              <div className="section-heading" style={{ marginTop: 20 }}>
                <h3>Story pages</h3>
              </div>
              <ol className="catalog-pages-list">
                {selectedTemplate.pages.map((page) => (
                  <li key={page.pageNumber} className="catalog-page-item">
                    <span className="catalog-page-num">{page.pageNumber}</span>
                    <div>
                      <p className="catalog-page-text">{page.textPrompt}</p>
                      <p className="catalog-page-illust">
                        🎨 {page.illustrationPrompt}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <button
                className="primary-button full-width"
                type="button"
                style={{ marginTop: 20 }}
                onClick={() => handleUseTemplate(selectedTemplate.id)}
              >
                Start creating
              </button>
            </aside>
          )}
        </div>
      )}
    </AppShell>
  );
}

export default function TemplatesPage() {
  return (
    <Suspense
      fallback={
        <AppShell active="Templates">
          <header className="page-header">
            <div>
              <p className="eyebrow">Loading</p>
              <h1>Book Templates</h1>
            </div>
          </header>
          <AuthPanel />
          <p className="empty-state">Loading...</p>
        </AppShell>
      }
    >
      <TemplatesContent />
    </Suspense>
  );
}
