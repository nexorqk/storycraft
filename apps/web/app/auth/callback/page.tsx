'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { fetchCurrentUser } from '../../../lib/auth-api';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [message, setMessage] = useState('Signing you in...');
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const controller = new AbortController();

    fetchCurrentUser(controller.signal)
      .then((result) => {
        if (result.user) {
          setMessage('Welcome!');
          setTimeout(() => {
            router.replace('/');
          }, 500);
        } else {
          setStatus('error');
          setMessage('Not signed in. Redirecting to login...');
          setTimeout(() => {
            router.replace('/login');
          }, 2000);
        }
      })
      .catch((error) => {
        setStatus('error');
        const errorMessage = error?.message || 'Unknown error';
        setMessage(`Something went wrong (${errorMessage}). Redirecting to login...`);
        setTimeout(() => {
          router.replace('/login');
        }, 2000);
      });

    return () => controller.abort();
  }, [router]);

  return (
    <div className="auth-callback">
      <div className="auth-callback-card">
        <div className="auth-callback-spinner" />
        <h2>{status === 'loading' ? 'Signing you in' : 'Sign in failed'}</h2>
        <p>{message}</p>
      </div>
    </div>
  );
}
