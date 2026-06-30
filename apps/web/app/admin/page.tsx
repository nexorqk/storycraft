'use client';

import { useEffect, useState } from 'react';

import { AppShell } from '../components/app-shell';
import { AuthPanel } from '../components/auth-panel';
import {
  getDashboard,
  type AdminDashboard,
} from '../../lib/admin-api';

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getDashboard()
      .then(setData)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load dashboard'),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell active="Admin">
      <header className="page-header">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Dashboard</h1>
        </div>
      </header>

      <AdminSubNav active="Dashboard" />

      <AuthPanel />

      {error && <p className="empty-state error">{error}</p>}

      {loading && <p className="empty-state">Loading dashboard...</p>}

      {data && (
        <div className="dashboard-grid">
          <StatCard label="Total Users" value={data.users} />
          <StatCard label="Total Books" value={data.books} />
          <StatCard label="Completed Books" value={data.completedBooks} />
          <StatCard label="Failed Books" value={data.failedBooks} type="danger" />
          <StatCard label="Templates" value={data.templates} />
          <StatCard label="Active Templates" value={data.activeTemplates} />
          <StatCard label="Pending Jobs" value={data.pendingJobs} />
          <StatCard label="Failed Jobs" value={data.failedJobs} type="danger" />
        </div>
      )}
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  type,
}: {
  label: string;
  value: number;
  type?: 'danger';
}) {
  return (
    <div className={`stat-card${type === 'danger' && value > 0 ? ' stat-card-danger' : ''}`}>
      <p className="stat-card-value">{value}</p>
      <p className="stat-card-label">{label}</p>
    </div>
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
