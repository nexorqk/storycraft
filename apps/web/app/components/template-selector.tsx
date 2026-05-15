'use client';

import { useEffect, useState } from 'react';

import type { TemplateInfo } from '../../lib/templates-api';
import { listTemplates } from '../../lib/templates-api';

type TemplateState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; templates: TemplateInfo[] };

export function TemplateSelector() {
  const [state, setState] = useState<TemplateState>({ status: 'loading' });

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

  if (state.status === 'loading') {
    return <p className="empty-state">Loading templates...</p>;
  }

  if (state.status === 'error') {
    return <p className="empty-state error">{state.message}</p>;
  }

  if (state.templates.length === 0) {
    return <p className="empty-state">No templates available yet.</p>;
  }

  return (
    <div className="template-grid">
      {state.templates.map((template) => (
        <article className="template-card" key={template.id}>
          <h2 className="template-title">{template.title}</h2>
          {template.description ? (
            <p className="template-description">{template.description}</p>
          ) : null}
          <dl className="template-meta">
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
          {template.pages.length > 0 && (
            <ol className="template-pages">
              {template.pages.map((page) => (
                <li key={page.pageNumber} className="template-page-item">
                  <span className="template-page-number">
                    {page.pageNumber}
                  </span>
                  <span className="template-page-prompt">
                    {page.textPrompt}
                  </span>
                </li>
              ))}
            </ol>
          )}
          <button
            className="template-action"
            type="button"
            onClick={() => {
              alert(
                `Template "${template.title}" selected (slug: ${template.slug})`,
              );
            }}
          >
            Select template
          </button>
        </article>
      ))}
    </div>
  );
}
