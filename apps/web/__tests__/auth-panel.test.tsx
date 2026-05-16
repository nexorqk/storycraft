import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthPanel } from '../app/components/auth-panel';
import * as authApi from '../lib/auth-api';

const mockRouterPush = vi.fn();

vi.mock('../lib/auth-api', () => ({
  fetchCurrentUser: vi.fn(),
  getGoogleAuthUrl: vi.fn(() => '/api/auth/google'),
  logoutCurrentUser: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

const mockFetchCurrentUser = vi.mocked(authApi.fetchCurrentUser);
const mockLogoutCurrentUser = vi.mocked(authApi.logoutCurrentUser);

describe('AuthPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRouterPush.mockClear();
  });

  it('shows loading state on mount', () => {
    mockFetchCurrentUser.mockReturnValue(new Promise(() => {}));
    render(<AuthPanel />);
    expect(screen.getByText('Checking sign-in')).toBeInTheDocument();
    expect(
      screen.getByText('Checking sign-in').closest('section')!,
    ).toHaveAttribute('aria-busy', 'true');
  });

  it('shows signed-out state when user is null', async () => {
    mockFetchCurrentUser.mockResolvedValue({ user: null });
    render(<AuthPanel />);
    await screen.findByText('Signed out');
    expect(
      screen.getByRole('button', { name: /continue with google/i }),
    ).toBeInTheDocument();
  });

  it('shows signed-in state with user name', async () => {
    mockFetchCurrentUser.mockResolvedValue({
      user: {
        id: 'u1',
        email: 'alice@example.com',
        name: 'Alice',
        avatarUrl: null,
        locale: 'ru',
        freeGenerationsUsed: 0,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    });
    render(<AuthPanel />);
    await screen.findByText('Signed in');
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sign out/i }),
    ).toBeInTheDocument();
  });

  it('shows initials fallback when no avatar', async () => {
    mockFetchCurrentUser.mockResolvedValue({
      user: {
        id: 'u1',
        email: 'bob@example.com',
        name: 'Bob',
        avatarUrl: null,
        locale: 'ru',
        freeGenerationsUsed: 0,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    });
    render(<AuthPanel />);
    await screen.findByText('Signed in');
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('shows error state when fetch fails', async () => {
    mockFetchCurrentUser.mockRejectedValue(new Error('Network error'));
    render(<AuthPanel />);
    await screen.findByText('API unavailable');
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /continue with google/i }),
    ).toBeInTheDocument();
  });

  it('calls logoutCurrentUser and shows signed-out state on sign out', async () => {
    const user = userEvent.setup();
    mockFetchCurrentUser.mockResolvedValue({
      user: {
        id: 'u1',
        email: 'alice@example.com',
        name: 'Alice',
        avatarUrl: null,
        locale: 'ru',
        freeGenerationsUsed: 0,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    });
    mockLogoutCurrentUser.mockResolvedValue(undefined);
    render(<AuthPanel />);
    await screen.findByText('Signed in');

    await user.click(screen.getByRole('button', { name: /sign out/i }));
    expect(mockLogoutCurrentUser).toHaveBeenCalledOnce();
    expect(mockRouterPush).toHaveBeenCalledWith('/login');
  });
});
