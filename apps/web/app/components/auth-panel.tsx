'use client';

import { useEffect, useState } from 'react';

import {
  fetchCurrentUser,
  getGoogleAuthUrl,
  logoutCurrentUser,
  type PublicUser,
} from '../../lib/auth-api';

type AuthStatus = 'loading' | 'ready' | 'error';

function getDisplayName(user: PublicUser) {
  return user.name || user.email;
}

export function AuthPanel() {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function refreshSession(signal?: AbortSignal) {
    setStatus('loading');

    try {
      const result = await fetchCurrentUser(signal);
      setUser(result.user);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    void refreshSession(controller.signal);

    return () => {
      controller.abort();
    };
  }, []);

  function signIn() {
    window.location.assign(getGoogleAuthUrl());
  }

  async function logout() {
    setIsLoggingOut(true);

    try {
      await logoutCurrentUser();
      setUser(null);
      setStatus('ready');
    } finally {
      setIsLoggingOut(false);
    }
  }

  if (status === 'loading') {
    return (
      <section className="auth-panel" aria-busy="true">
        <div>
          <p className="panel-label">Session</p>
          <h2>Checking sign-in</h2>
        </div>
        <div className="auth-skeleton" />
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section className="auth-panel auth-panel-warning">
        <div>
          <p className="panel-label">Session</p>
          <h2>API unavailable</h2>
        </div>
        <div className="auth-actions">
          <button className="secondary-button" onClick={() => refreshSession()}>
            Retry
          </button>
          <button className="primary-button" onClick={signIn}>
            Continue with Google
          </button>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="auth-panel">
        <div>
          <p className="panel-label">Session</p>
          <h2>Signed out</h2>
        </div>
        <button className="primary-button" onClick={signIn}>
          Continue with Google
        </button>
      </section>
    );
  }

  return (
    <section className="auth-panel">
      <div className="user-summary">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className="user-avatar"
            height={44}
            src={user.avatarUrl}
            width={44}
          />
        ) : (
          <div className="user-avatar-fallback" aria-hidden="true">
            {getDisplayName(user).slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <p className="panel-label">Signed in</p>
          <h2>{getDisplayName(user)}</h2>
          <p className="user-email">{user.email}</p>
        </div>
      </div>

      <button
        className="secondary-button"
        disabled={isLoggingOut}
        onClick={logout}
      >
        {isLoggingOut ? 'Signing out' : 'Sign out'}
      </button>
    </section>
  );
}
