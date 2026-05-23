import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { AppShell } from './components/app-shell';
import { AuthPanel } from './components/auth-panel';
import { API_URL } from '../lib/auth-api';

const sections = [
  {
    title: 'Child profiles',
    body: 'Profiles for children connected to the signed-in parent account.',
    status: 'Ready',
  },
  {
    title: 'Book templates',
    body: 'Russian story templates with reusable personalization placeholders.',
    status: 'Ready',
  },
  {
    title: 'Story preparation',
    body: 'Persistent async state for prepared books and reader pages.',
    status: 'Ready',
  },
];

async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('storycraft_session');

    if (!sessionCookie) {
      return null;
    }

    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        Cookie: `storycraft_session=${sessionCookie.value}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.user;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <AppShell active="Dashboard">
      <header className="page-header">
        <div>
          <p className="eyebrow">Welcome back</p>
          <h1>Storycraft workspace</h1>
          <p className="header-copy">
            Russian children stories, parent profiles, preparation jobs, and
            interactive reader pages.
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
