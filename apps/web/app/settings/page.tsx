'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { deleteAccount, exportAccountData } from '../../lib/account-api';
import { AppShell } from '../components/app-shell';
import { AuthPanel } from '../components/auth-panel';

export default function SettingsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    setError(null);
    setStatus(null);

    try {
      const data = await exportAccountData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `storycraft-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus('Export ready');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to export data');
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      'Delete your account, child profiles, books, PDFs, and illustrations?',
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    setStatus(null);

    try {
      await deleteAccount();
      router.push('/login');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to delete account');
      setIsDeleting(false);
    }
  }

  return (
    <AppShell active="Settings">
      <header className="page-header">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Settings</h1>
          <p className="header-copy">
            Manage your account data and privacy controls.
          </p>
        </div>
      </header>

      <AuthPanel />

      {error && <p className="empty-state error">{error}</p>}
      {status && <p className="empty-state">{status}</p>}

      <div className="panel">
        <div className="section-heading">
          <h2>Account Data</h2>
        </div>
        <div className="card-actions">
          <button
            className="secondary-button"
            disabled={isExporting || isDeleting}
            onClick={handleExport}
            type="button"
          >
            {isExporting ? 'Preparing...' : 'Export Data'}
          </button>
          <button
            className="danger-button"
            disabled={isDeleting}
            onClick={handleDelete}
            type="button"
          >
            {isDeleting ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
