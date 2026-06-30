'use client';

import { useCallback, useEffect, useState } from 'react';

import { AppShell } from '../../components/app-shell';
import { AuthPanel } from '../../components/auth-panel';
import {
  listAdminUsers,
  getAdminUser,
  toggleUserRole,
  type AdminUserSummary,
  type AdminUserDetail,
} from '../../../lib/admin-users-api';

type ListView = { view: 'list' };
type DetailView = { view: 'detail'; userId: string };

type PageState = ListView | DetailView;

export default function AdminUsersPage() {
  const [page, setPage] = useState<PageState>({ view: 'list' });
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(() => {
    setLoading(true);
    setError(null);
    listAdminUsers()
      .then((data) => setUsers(data.users))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load users'),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => loadUsers(), [loadUsers]);

  if (page.view === 'detail') {
    return (
      <UserDetailPage
        userId={page.userId}
        onBack={() => setPage({ view: 'list' })}
        onRoleToggle={loadUsers}
      />
    );
  }

  return (
    <AppShell active="Admin">
      <header className="page-header">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Users</h1>
        </div>
      </header>

      <AdminSubNav active="Users" />

      <AuthPanel />

      {error && <p className="empty-state error">{error}</p>}

      {loading && users.length === 0 && (
        <p className="empty-state">Loading users...</p>
      )}

      {!loading && users.length === 0 && (
        <p className="empty-state">No users found.</p>
      )}

      {users.length > 0 && (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Books</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="admin-table-title">
                    <button
                      type="button"
                      className="link-button"
                      onClick={() =>
                        setPage({ view: 'detail', userId: u.id })
                      }
                    >
                      {u.name || u.email}
                    </button>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    {u.roles.map((r) => (
                      <span
                        key={r}
                        className={`status-badge ${r === 'ADMIN' ? 'active' : 'inactive'}`}
                      >
                        {r}
                      </span>
                    ))}
                  </td>
                  <td>{u.bookCount}</td>
                  <td className="admin-table-date">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="secondary-button small"
                      onClick={() =>
                        setPage({ view: 'detail', userId: u.id })
                      }
                    >
                      View
                    </button>
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

function UserDetailPage({
  userId,
  onBack,
  onRoleToggle,
}: {
  userId: string;
  onBack: () => void;
  onRoleToggle: () => void;
}) {
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getAdminUser(userId)
      .then((data) => setUser(data.user))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load user'),
      )
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => load(), [load]);

  const handleToggleAdmin = async () => {
    if (!user) return;

    setToggling(true);
    setError(null);

    try {
      const action = user.isAdmin ? 'remove' : 'add';
      await toggleUserRole(userId, 'ADMIN', action);
      await load();
      onRoleToggle();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to toggle admin role',
      );
    } finally {
      setToggling(false);
    }
  };

  if (loading || !user) {
    return (
      <AppShell active="Admin">
        <header className="page-header">
          <div>
            <p className="eyebrow">Administration</p>
            <h1>User</h1>
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
          <h1>{user.name || user.email}</h1>
          <p className="header-copy">
            {user.email} &middot;{' '}
            {user.roles.map((r) => (
              <span
                key={r}
                className={`status-badge ${r === 'ADMIN' ? 'active' : 'inactive'}`}
              >
                {r}
              </span>
            ))}
          </p>
        </div>
        <div className="card-actions">
          <button className="secondary-button" type="button" onClick={onBack}>
            Back to List
          </button>
        </div>
      </header>

      <AuthPanel />

      {error && <p className="empty-state error">{error}</p>}

      <div className="panel">
        <h2>Details</h2>
        <dl className="review-meta">
          <div>
            <dt>Name</dt>
            <dd>{user.name || '—'}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Locale</dt>
            <dd>{user.locale}</dd>
          </div>
          <div>
            <dt>Books</dt>
            <dd>{user.bookCount}</dd>
          </div>
          <div>
            <dt>Children</dt>
            <dd>{user.childCount}</dd>
          </div>
          <div>
            <dt>Free Generations Used</dt>
            <dd>{user.freeGenerationsUsed}</dd>
          </div>
          <div>
            <dt>Period Start</dt>
            <dd>
              {new Date(user.freeGenerationsPeriodStart).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{new Date(user.createdAt).toLocaleDateString()}</dd>
          </div>
        </dl>
      </div>

      <div className="panel">
        <h2>Admin Role</h2>
        <p>
          {user.isAdmin
            ? 'This user currently has the ADMIN role.'
            : 'This user does not have the ADMIN role.'}
        </p>
        <div className="card-actions" style={{ marginTop: 12 }}>
          <button
            className={user.isAdmin ? 'danger-button' : 'primary-button'}
            type="button"
            onClick={handleToggleAdmin}
            disabled={toggling}
          >
            {toggling
              ? 'Saving...'
              : user.isAdmin
                ? 'Remove ADMIN Role'
                : 'Grant ADMIN Role'}
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function AdminSubNav({ active }: { active: string }) {
  const items = [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Templates', href: '/admin/templates' },
    { label: 'Users', href: '/admin/users' },
    { label: 'Books', href: '/admin/books' },
  ];

  return (
    <nav className="admin-subnav" aria-label="Admin sections">
      {items.map((item) => (
        <a
          key={item.label}
          className="admin-subnav-link"
          data-active={item.label === active}
          href={item.href}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
