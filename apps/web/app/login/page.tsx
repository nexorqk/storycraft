'use client';

import { getGoogleAuthUrl } from '../../lib/auth-api';

export default function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <h1>Storycraft</h1>
          <p>AI-generated Russian children&apos;s books.</p>
        </div>

        <button
          className="login-google-btn"
          type="button"
          onClick={() => {
            window.location.assign(getGoogleAuthUrl());
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 48 48"
            fill="none"
            aria-hidden="true"
          >
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 7.09 5.9 4.54 14.27l7.98 6.21C13.79 14.09 18.38 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.21C.93 16.46 0 20.12 0 24c0 3.88.93 7.54 2.54 10.78l7.99-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.2C6.51 42.12 14.62 48 24 48z"
            />
          </svg>
          Continue with Google
        </button>

        <p className="login-note">
          Sign in to create personalized children&apos;s books.
        </p>
      </div>
    </div>
  );
}
