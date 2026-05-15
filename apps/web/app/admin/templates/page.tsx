'use client';

import { useCallback, useEffect, useState } from 'react';

import { AppShell } from '../../components/app-shell';
import { AuthPanel } from '../../components/auth-panel';
import type { AdminTemplateSummary } from '../../../lib/admin-templates-api';
import { listAdminTemplates } from '../../../lib/admin-templates-api';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; templates: AdminTemplateSummary[] };

export default function AdminTemplatesPage() {
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(() => {
    let cancelled = false;

    listAdminTemplates()
      .then((data) => {
        if (!cancelled) {
          setState({ status: 'ready', templates: data.templates });
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

  useEffect(() => load(), [load]);

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
        <span className="status-pill">Admin</span>
      </header>

      <AuthPanel />

      {state.status === 'loading' && (
        <p className="empty-state">Loading templates...</p>
      )}

      {state.status === 'error' && (
        <p className="empty-state error">{state.message}</p>
      )}

      {state.status === 'ready' && state.templates.length === 0 && (
        <p className="empty-state">No templates found.</p>
      )}

      {state.status === 'ready' && state.templates.length > 0 && (
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
              </tr>
            </thead>
            <tbody>
              {state.templates.map((t) => (
                <tr key={t.id}>
                  <td className="admin-table-title">{t.title}</td>
                  <td className="admin-table-mono">{t.slug}</td>
                  <td>{t.pageCount}</td>
                  <td>{t.language.toUpperCase()}</td>
                  <td>
                    <span
                      className={`status-badge ${t.isActive ? 'active' : 'inactive'}`}
                    >
                      {t.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="admin-table-date">
                    {new Date(t.updatedAt).toLocaleDateString()}
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
