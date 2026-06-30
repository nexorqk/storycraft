import Link from 'next/link';
import type { ReactNode } from 'react';

import { ThemeToggle } from './theme-toggle';

const navItems = [
  { label: 'Dashboard', href: '/' },
  { label: 'Children', href: '/children' },
  { label: 'Templates', href: '/templates' },
  { label: 'Create', href: '/create' },
  { label: 'Books', href: '/books' },
  { label: 'Settings', href: '/settings' },
  { label: 'Admin', href: '/admin' },
];

type AppShellProps = {
  active: string;
  children: ReactNode;
};

export function AppShell({ active, children }: AppShellProps) {
  return (
    <main className="shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <p className="brand">Storycraft</p>
        <p className="brand-subtitle">Personalized stories for children</p>
        <nav className="nav">
          {navItems.map((item) => (
            <Link
              className="nav-item"
              data-active={item.label === active}
              href={item.href}
              key={item.label}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <ThemeToggle />
          <Link className="sidebar-link" href="/privacy">
            Privacy Policy
          </Link>
        </div>
      </aside>

      <section className="content">{children}</section>
    </main>
  );
}
