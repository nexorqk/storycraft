'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { fetchCurrentUser, type PublicUser } from '../lib/auth-api';
import { AppShell } from './components/app-shell';
import { AuthPanel } from './components/auth-panel';

const sections = [
  {
    title: 'Child profiles',
    body: 'Profiles for children connected to the signed-in parent account.',
    status: 'Ready',
  },
  {
    title: 'Book templates',
    body: 'Russian story structures with generation and illustration prompts.',
    status: 'Ready',
  },
  {
    title: 'Generation jobs',
    body: 'Persistent async state for books, illustrations, and PDFs.',
    status: 'Ready',
  },
];

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    fetchCurrentUser(controller.signal)
      .then((result) => {
        if (result.user) {
          setUser(result.user);
        } else {
          router.replace('/login');
        }
      })
      .catch(() => {
        router.replace('/login');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [router]);

  if (loading) {
    return (
      <div className="auth-callback">
        <div className="auth-callback-card">
          <div className="auth-callback-spinner" />
          <h2>Loading</h2>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AppShell active="Dashboard">
      <header className="page-header">
        <div>
          <p className="eyebrow">Welcome back</p>
          <h1>Storycraft workspace</h1>
          <p className="header-copy">
            Russian children books, parent profiles, generation jobs, and
            downloadable PDFs.
          </p>
        </div>
        <span className="status-pill">Free plan first</span>
      </header>

      <AuthPanel />

      <div className="grid">
        {sections.map((section) => (
          <article className="panel" key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
            <div className="panel-status">{section.status}</div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
