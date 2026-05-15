'use client';

import { useCallback, useEffect, useState } from 'react';

import { AppShell } from '../components/app-shell';
import { AuthPanel } from '../components/auth-panel';
import type { ChildProfile } from '../../lib/children-api';
import { listChildren } from '../../lib/children-api';
import type { TemplateInfo } from '../../lib/templates-api';
import { listTemplates } from '../../lib/templates-api';
import { createBook } from '../../lib/books-api';

type FormState = {
  childId: string;
  templateId: string;
  title: string;
  language: string;
};

type Step = 'select' | 'customize' | 'done' | 'error';

export default function CreateBookPage() {
  const [step, setStep] = useState<Step>('select');
  const [submitting, setSubmitting] = useState(false);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [form, setForm] = useState<FormState>({
    childId: '',
    templateId: '',
    title: '',
    language: 'ru',
  });
  const [error, setError] = useState<string | null>(null);
  const [createdBookId, setCreatedBookId] = useState<string | null>(null);

  const loadData = useCallback(() => {
    let cancelled = false;

    Promise.all([listChildren(), listTemplates()])
      .then(([c, t]) => {
        if (!cancelled) {
          setChildren(c.children);
          setTemplates(t);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load data');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => loadData(), [loadData]);

  const selectedTemplate = templates.find((t) => t.id === form.templateId);

  const handleSubmit = async () => {
    if (!form.childId || !form.templateId) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await createBook({
        childId: form.childId,
        templateId: form.templateId,
        title: form.title || undefined,
        language: form.language,
      });

      setCreatedBookId(result.book.id);
      setStep('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create book');
      setStep('error');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'done' && createdBookId) {
    return (
      <AppShell active="Create">
        <header className="page-header">
          <div>
            <p className="eyebrow">Success</p>
            <h1>Book Created</h1>
            <p className="header-copy">
              Your book is being generated. You can track its progress in the
              library.
            </p>
          </div>
        </header>

        <AuthPanel />

        <div className="panel">
          <p>Book ID: {createdBookId}</p>
          <div className="card-actions" style={{ marginTop: 16 }}>
            <a href="/books" className="primary-button">
              Go to Library
            </a>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setStep('select');
                setForm({
                  childId: '',
                  templateId: '',
                  title: '',
                  language: 'ru',
                });
                setCreatedBookId(null);
              }}
            >
              Create Another
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell active="Create">
      <header className="page-header">
        <div>
          <p className="eyebrow">New Book</p>
          <h1>Create a Book</h1>
          <p className="header-copy">
            Choose a template and a child profile to start generating a Russian
            children&apos;s book.
          </p>
        </div>
      </header>

      <AuthPanel />

      {error && step === 'error' && (
        <p className="empty-state error">{error}</p>
      )}

      {step === 'select' && (
        <div className="create-layout">
          <div className="form-panel">
            <div className="section-heading">
              <h2>1. Choose a child</h2>
            </div>

            {children.length === 0 ? (
              <p className="empty-state">
                No children yet.{' '}
                <a href="/children" style={{ color: 'var(--accent)' }}>
                  Add a child profile
                </a>
              </p>
            ) : (
              <div className="child-list">
                {children.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    className={`child-card ${form.childId === child.id ? 'child-card-selected' : ''}`}
                    onClick={() =>
                      setForm((f) => ({ ...f, childId: child.id }))
                    }
                  >
                    <h3>{child.name}</h3>
                    {child.birthDate && (
                      <p>
                        Born: {new Date(child.birthDate).toLocaleDateString()}
                      </p>
                    )}
                    {child.interests.length > 0 && (
                      <div className="tag-list">
                        {child.interests.map((interest) => (
                          <span key={interest} className="tag">
                            {interest}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="section-heading" style={{ marginTop: 24 }}>
              <h2>2. Choose a template</h2>
            </div>

            {templates.length === 0 ? (
              <p className="empty-state">No templates available.</p>
            ) : (
              <div
                className="template-grid"
                style={{ gridTemplateColumns: '1fr' }}
              >
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`template-card ${form.templateId === t.id ? 'template-card-selected' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, templateId: t.id }))}
                  >
                    <h2 className="template-title">{t.title}</h2>
                    {t.description && (
                      <p className="template-description">{t.description}</p>
                    )}
                    <dl className="template-meta">
                      <div>
                        <dt>Age</dt>
                        <dd>
                          {t.ageMin}
                          {t.ageMax ? `–${t.ageMax}` : '+'}
                        </dd>
                      </div>
                      <div>
                        <dt>Pages</dt>
                        <dd>{t.pages.length}</dd>
                      </div>
                    </dl>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="form-panel">
            <div className="section-heading">
              <h2>3. Customize</h2>
            </div>

            <div className="child-form">
              <div className="field">
                <span>Book title (optional)</span>
                <input
                  type="text"
                  placeholder="e.g. Adventures of Masha"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
              </div>

              <div className="field">
                <span>Language</span>
                <select
                  value={form.language}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, language: e.target.value }))
                  }
                  className="field-select"
                >
                  <option value="ru">Russian</option>
                </select>
              </div>

              {selectedTemplate && (
                <div className="panel" style={{ marginTop: 8 }}>
                  <h2>Selected template</h2>
                  <p>{selectedTemplate.title}</p>
                  <p className="panel-status">
                    {selectedTemplate.pages.length} pages
                  </p>
                </div>
              )}

              <div className="form-actions" style={{ marginTop: 16 }}>
                <button
                  className="primary-button"
                  type="button"
                  disabled={!form.childId || !form.templateId}
                  onClick={() => setStep('customize')}
                >
                  Review & Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 'customize' && (
        <div className="panel">
          <div className="section-heading">
            <h2>Review your book</h2>
          </div>

          <dl className="review-meta">
            <div>
              <dt>Child</dt>
              <dd>
                {children.find((c) => c.id === form.childId)?.name ?? '—'}
              </dd>
            </div>
            <div>
              <dt>Template</dt>
              <dd>{selectedTemplate?.title ?? '—'}</dd>
            </div>
            <div>
              <dt>Title</dt>
              <dd>{form.title || '(auto-generated)'}</dd>
            </div>
            <div>
              <dt>Language</dt>
              <dd>{form.language.toUpperCase()}</dd>
            </div>
          </dl>

          <div className="card-actions" style={{ marginTop: 20 }}>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setStep('select')}
            >
              Back
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? 'Creating...' : 'Create Book'}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
