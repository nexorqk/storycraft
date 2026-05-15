'use client';

import { useCallback, useEffect, useState } from 'react';

import { AppShell } from '../../components/app-shell';
import { AuthPanel } from '../../components/auth-panel';
import type {
  AdminTemplateSummary,
  AdminTemplateDetail,
} from '../../../lib/admin-templates-api';
import {
  listAdminTemplates,
  getAdminTemplate,
  createAdminTemplate,
  updateAdminTemplate,
  deleteAdminTemplate,
  createAdminTemplatePage,
  updateAdminTemplatePage,
  deleteAdminTemplatePage,
} from '../../../lib/admin-templates-api';

type ListView = { view: 'list' };
type CreateView = { view: 'create' };
type EditView = { view: 'edit'; templateId: string };
type DetailView = { view: 'detail'; templateId: string };

type PageState = ListView | CreateView | EditView | DetailView;

export default function AdminTemplatesPage() {
  const [page, setPage] = useState<PageState>({ view: 'list' });
  const [templates, setTemplates] = useState<AdminTemplateSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = useCallback(() => {
    setLoading(true);
    setError(null);

    listAdminTemplates()
      .then((data) => {
        setTemplates(data.templates);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load templates');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => loadTemplates(), [loadTemplates]);

  const handleDelete = async (templateId: string) => {
    if (!confirm('Delete this template? This cannot be undone.')) return;

    try {
      await deleteAdminTemplate(templateId);
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const handleToggleActive = async (templateId: string, isActive: boolean) => {
    try {
      const result = await updateAdminTemplate(templateId, {
        isActive: !isActive,
      });
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === templateId
            ? { ...t, isActive: result.template.isActive }
            : t,
        ),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update template');
    }
  };

  if (page.view === 'create' || page.view === 'edit') {
    return (
      <TemplateForm
        templateId={page.view === 'edit' ? page.templateId : undefined}
        onSaved={() => {
          loadTemplates();
          setPage({ view: 'list' });
        }}
        onCancel={() => setPage({ view: 'list' })}
      />
    );
  }

  if (page.view === 'detail') {
    return (
      <TemplateDetail
        templateId={page.templateId}
        onBack={() => setPage({ view: 'list' })}
      />
    );
  }

  return (
    <AppShell active="Admin">
      <header className="page-header">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Templates</h1>
          <p className="header-copy">
            Manage book templates, pages, and cover configuration.
          </p>
        </div>
        <div className="card-actions">
          <button
            className="primary-button"
            type="button"
            onClick={() => setPage({ view: 'create' })}
          >
            New Template
          </button>
        </div>
      </header>

      <AuthPanel />

      {error && <p className="empty-state error">{error}</p>}

      {loading && templates.length === 0 && (
        <p className="empty-state">Loading templates...</p>
      )}

      {!loading && templates.length === 0 && (
        <p className="empty-state">No templates found.</p>
      )}

      {templates.length > 0 && (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Slug</th>
                <th>Pages</th>
                <th>Language</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id}>
                  <td className="admin-table-title">
                    <button
                      type="button"
                      className="link-button"
                      onClick={() =>
                        setPage({ view: 'detail', templateId: t.id })
                      }
                    >
                      {t.title}
                    </button>
                  </td>
                  <td className="admin-table-mono">{t.slug}</td>
                  <td>{t.pageCount}</td>
                  <td>{t.language.toUpperCase()}</td>
                  <td>
                    <button
                      type="button"
                      className={`status-badge ${t.isActive ? 'active' : 'inactive'}`}
                      onClick={() => handleToggleActive(t.id, t.isActive)}
                    >
                      {t.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="admin-table-date">
                    {new Date(t.updatedAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="card-actions">
                      <button
                        type="button"
                        className="secondary-button small"
                        onClick={() =>
                          setPage({ view: 'edit', templateId: t.id })
                        }
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger-button small"
                        onClick={() => handleDelete(t.id)}
                      >
                        Delete
                      </button>
                    </div>
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

function TemplateForm({
  templateId,
  onSaved,
  onCancel,
}: {
  templateId?: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const isEdit = !!templateId;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    slug: '',
    title: '',
    description: '',
    language: 'ru',
    ageMin: '',
    ageMax: '',
    pageCount: 8,
    storyPrompt: '',
    illustrationStylePrompt: '',
    isActive: true,
  });

  useEffect(() => {
    if (!templateId) return;

    setLoading(true);
    getAdminTemplate(templateId)
      .then((data) => {
        const t = data.template;
        setForm({
          slug: t.slug,
          title: t.title,
          description: t.description ?? '',
          language: t.language,
          ageMin: t.ageMin?.toString() ?? '',
          ageMax: t.ageMax?.toString() ?? '',
          pageCount: t.pageCount,
          storyPrompt: t.storyPrompt,
          illustrationStylePrompt: t.illustrationStylePrompt,
          isActive: t.isActive,
        });
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load template'),
      )
      .finally(() => setLoading(false));
  }, [templateId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const dto = {
      slug: form.slug,
      title: form.title,
      description: form.description || undefined,
      language: form.language,
      ageMin: form.ageMin ? Number(form.ageMin) : undefined,
      ageMax: form.ageMax ? Number(form.ageMax) : undefined,
      pageCount: form.pageCount,
      storyPrompt: form.storyPrompt,
      illustrationStylePrompt: form.illustrationStylePrompt,
      isActive: form.isActive,
    };

    try {
      if (isEdit && templateId) {
        await updateAdminTemplate(templateId, dto);
      } else {
        await createAdminTemplate(dto);
      }
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppShell active="Admin">
        <header className="page-header">
          <div>
            <p className="eyebrow">Administration</p>
            <h1>{isEdit ? 'Edit Template' : 'New Template'}</h1>
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
          <h1>{isEdit ? 'Edit Template' : 'New Template'}</h1>
        </div>
      </header>

      <AuthPanel />

      {error && <p className="empty-state error">{error}</p>}

      <div className="panel">
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="field">
            <label htmlFor="slug">Slug</label>
            <input
              id="slug"
              type="text"
              required
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="e.g. kindness-adventure-ru"
              disabled={isEdit}
            />
          </div>

          <div className="field">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Приключение о доброте"
            />
          </div>

          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Short description of the template"
              rows={2}
            />
          </div>

          <div className="admin-form-row">
            <div className="field">
              <label htmlFor="language">Language</label>
              <select
                id="language"
                value={form.language}
                onChange={(e) =>
                  setForm((f) => ({ ...f, language: e.target.value }))
                }
              >
                <option value="ru">Russian</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="ageMin">Min Age</label>
              <input
                id="ageMin"
                type="number"
                min={1}
                max={18}
                value={form.ageMin}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ageMin: e.target.value }))
                }
                placeholder="3"
              />
            </div>

            <div className="field">
              <label htmlFor="ageMax">Max Age</label>
              <input
                id="ageMax"
                type="number"
                min={1}
                max={18}
                value={form.ageMax}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ageMax: e.target.value }))
                }
                placeholder="7"
              />
            </div>

            <div className="field">
              <label htmlFor="pageCount">Pages</label>
              <input
                id="pageCount"
                type="number"
                min={4}
                max={20}
                required
                value={form.pageCount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, pageCount: Number(e.target.value) }))
                }
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="storyPrompt">Story Prompt</label>
            <textarea
              id="storyPrompt"
              required
              value={form.storyPrompt}
              onChange={(e) =>
                setForm((f) => ({ ...f, storyPrompt: e.target.value }))
              }
              placeholder="Instructions for the AI to generate the story"
              rows={3}
            />
          </div>

          <div className="field">
            <label htmlFor="illustrationStylePrompt">
              Illustration Style Prompt
            </label>
            <textarea
              id="illustrationStylePrompt"
              required
              value={form.illustrationStylePrompt}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  illustrationStylePrompt: e.target.value,
                }))
              }
              placeholder="Style instructions for illustrations"
              rows={2}
            />
          </div>

          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.checked }))
                }
              />
              Active
            </label>
          </div>

          <div className="card-actions">
            <button
              className="primary-button"
              type="submit"
              disabled={saving}
            >
              {saving ? 'Saving...' : isEdit ? 'Update Template' : 'Create Template'}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

function TemplateDetail({
  templateId,
  onBack,
}: {
  templateId: string;
  onBack: () => void;
}) {
  const [template, setTemplate] = useState<AdminTemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPage, setNewPage] = useState({
    pageNumber: 1,
    textPrompt: '',
    illustrationPrompt: '',
  });

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getAdminTemplate(templateId)
      .then((data) => setTemplate(data.template))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load template'),
      )
      .finally(() => setLoading(false));
  }, [templateId]);

  useEffect(() => load(), [load]);

  const handleAddPage = async () => {
    try {
      const result = await createAdminTemplatePage(templateId, newPage);
      setTemplate((prev) =>
        prev
          ? {
              ...prev,
              pages: [...prev.pages, result.page].sort(
                (a, b) => a.pageNumber - b.pageNumber,
              ),
            }
          : prev,
      );
      setNewPage({ pageNumber: (template?.pages.length ?? 0) + 1, textPrompt: '', illustrationPrompt: '' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add page');
    }
  };

  const handleUpdatePage = async (pageId: string, dto: { textPrompt?: string; illustrationPrompt?: string }) => {
    try {
      const result = await updateAdminTemplatePage(templateId, pageId, dto);
      setTemplate((prev) =>
        prev
          ? {
              ...prev,
              pages: prev.pages.map((p) =>
                p.id === pageId ? result.page : p,
              ),
            }
          : prev,
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update page');
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Delete this page?')) return;

    try {
      await deleteAdminTemplatePage(templateId, pageId);
      setTemplate((prev) =>
        prev
          ? { ...prev, pages: prev.pages.filter((p) => p.id !== pageId) }
          : prev,
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete page');
    }
  };

  if (loading || !template) {
    return (
      <AppShell active="Admin">
        <header className="page-header">
          <div>
            <p className="eyebrow">Administration</p>
            <h1>Template</h1>
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
          <h1>{template.title}</h1>
          <p className="header-copy">
            {template.slug} &middot; {template.language.toUpperCase()} &middot;{' '}
            {template.pageCount} pages &middot;{' '}
            <span
              className={`status-badge ${template.isActive ? 'active' : 'inactive'}`}
            >
              {template.isActive ? 'Active' : 'Inactive'}
            </span>
          </p>
        </div>
        <div className="card-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={onBack}
          >
            Back to List
          </button>
          <a href={`/admin/templates`} className="secondary-button">
          </a>
        </div>
      </header>

      <AuthPanel />

      {error && <p className="empty-state error">{error}</p>}

      <div className="panel">
        <h2>Details</h2>
        <dl className="review-meta">
          <div>
            <dt>Description</dt>
            <dd>{template.description || '—'}</dd>
          </div>
          <div>
            <dt>Age Range</dt>
            <dd>
              {template.ageMin ?? '?'}–{template.ageMax ?? '?'}
            </dd>
          </div>
          <div>
            <dt>Story Prompt</dt>
            <dd className="admin-prompt">{template.storyPrompt}</dd>
          </div>
          <div>
            <dt>Illustration Style</dt>
            <dd className="admin-prompt">
              {template.illustrationStylePrompt}
            </dd>
          </div>
        </dl>
      </div>

      <div className="panel">
        <h2>Pages ({template.pages.length})</h2>

        {template.pages.length === 0 && (
          <p className="empty-state">No pages yet.</p>
        )}

        <ol className="catalog-pages-list">
          {template.pages.map((page) => (
            <li key={page.id} className="catalog-page-item">
              <div className="admin-page-header">
                <span className="catalog-page-num">Page {page.pageNumber}</span>
                <div className="card-actions">
                  <button
                    className="danger-button small"
                    type="button"
                    onClick={() => handleDeletePage(page.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="admin-page-content">
                <div className="field">
                  <label>Text Prompt</label>
                  <textarea
                    value={page.textPrompt}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTemplate((prev) =>
                        prev
                          ? {
                              ...prev,
                              pages: prev.pages.map((p) =>
                                p.id === page.id
                                  ? { ...p, textPrompt: value }
                                  : p,
                              ),
                            }
                          : prev,
                      );
                    }}
                    onBlur={() =>
                      handleUpdatePage(page.id, {
                        textPrompt: page.textPrompt,
                      })
                    }
                    rows={2}
                  />
                </div>
                <div className="field">
                  <label>Illustration Prompt</label>
                  <textarea
                    value={page.illustrationPrompt}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTemplate((prev) =>
                        prev
                          ? {
                              ...prev,
                              pages: prev.pages.map((p) =>
                                p.id === page.id
                                  ? { ...p, illustrationPrompt: value }
                                  : p,
                              ),
                            }
                          : prev,
                      );
                    }}
                    onBlur={() =>
                      handleUpdatePage(page.id, {
                        illustrationPrompt: page.illustrationPrompt,
                      })
                    }
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="panel">
        <h2>Add Page</h2>

        <div className="admin-form-row">
          <div className="field">
            <label htmlFor="newPageNumber">Page Number</label>
            <input
              id="newPageNumber"
              type="number"
              min={1}
              value={newPage.pageNumber}
              onChange={(e) =>
                setNewPage((p) => ({
                  ...p,
                  pageNumber: Number(e.target.value),
                }))
              }
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="newTextPrompt">Text Prompt</label>
          <textarea
            id="newTextPrompt"
            value={newPage.textPrompt}
            onChange={(e) =>
              setNewPage((p) => ({ ...p, textPrompt: e.target.value }))
            }
            placeholder="What happens on this page?"
            rows={2}
          />
        </div>

        <div className="field">
          <label htmlFor="newIllustPrompt">Illustration Prompt</label>
          <textarea
            id="newIllustPrompt"
            value={newPage.illustrationPrompt}
            onChange={(e) =>
              setNewPage((p) => ({
                ...p,
                illustrationPrompt: e.target.value,
              }))
            }
            placeholder="Describe the illustration"
            rows={2}
          />
        </div>

        <div className="card-actions" style={{ marginTop: 12 }}>
          <button
            className="primary-button"
            type="button"
            onClick={handleAddPage}
            disabled={!newPage.textPrompt || !newPage.illustrationPrompt}
          >
            Add Page
          </button>
        </div>
      </div>
    </AppShell>
  );
}