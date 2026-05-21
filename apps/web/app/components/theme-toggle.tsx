'use client';

import { useEffect, useState } from 'react';

type ThemeMode = 'system' | 'light' | 'dark';

function applyTheme(mode: ThemeMode) {
  const resolved =
    mode === 'system' && typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : mode === 'system'
        ? 'light'
        : mode;
  document.documentElement.setAttribute('data-theme', resolved);
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('system');

  useEffect(() => {
    const stored = localStorage.getItem('storycraft-theme') as ThemeMode | null;
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      setMode(stored);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('storycraft-theme', mode);
    applyTheme(mode);

    if (
      mode === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia
    ) {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        document.documentElement.setAttribute(
          'data-theme',
          e.matches ? 'dark' : 'light',
        );
      };
      mql.addEventListener('change', listener);
      return () => mql.removeEventListener('change', listener);
    }
  }, [mode]);

  return (
    <label className="theme-select-label" htmlFor="theme-select">
      Theme
      <select
        className="theme-select"
        id="theme-select"
        onChange={(e) => setMode(e.target.value as ThemeMode)}
        value={mode}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
