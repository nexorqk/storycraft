import Link from 'next/link';
import type { ReactNode } from 'react';

const navItems = [
  { label: 'Dashboard', href: '/' },
  { label: 'Children', href: '/children' },
  { label: 'Templates', href: '#' },
  { label: 'Books', href: '#' },
  { label: 'Settings', href: '#' },
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
        <p className="brand-subtitle">AI books for children</p>
        <nav className="nav">
          {navItems.map((item) =>
            item.href === '#' ? (
              <span
                className="nav-item nav-item-disabled"
                data-active={item.label === active}
                key={item.label}
              >
                {item.label}
              </span>
            ) : (
              <Link
                className="nav-item"
                data-active={item.label === active}
                href={item.href}
                key={item.label}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>
      </aside>

      <section className="content">{children}</section>
    </main>
  );
}
