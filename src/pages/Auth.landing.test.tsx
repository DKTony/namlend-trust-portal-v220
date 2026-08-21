/**
 * Post-login landing.
 *
 * The bug these cover: the redirect fired as soon as `user` (the `getMyProfile` query) arrived,
 * without waiting for the tenant-role and platform-role queries. Until those settle every role
 * flag reads `false`, so staff and platform owners were routed to `/dashboard` as if they were
 * clients. `authReady` is what makes the decision wait.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@/components/auth/GoogleSignInButton', () => ({
  GoogleSignInButton: () => <button type="button">Continue with Google</button>,
}));

import Auth from './Auth';

type AuthState = Partial<ReturnType<typeof baseAuth>>;

function baseAuth() {
  return {
    // Explicitly nullable: the "no user" case below drives the signed-out branch.
    user: { id: 'u1', email: 'a@b.c' } as { id: string; email: string } | null,
    signIn: vi.fn(),
    signUp: vi.fn(),
    loading: false,
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    authReady: true,
    isLoanOfficer: false,
    isPlatformStaff: false,
  };
}

function renderAuth(auth: AuthState, search = '') {
  mockUseAuth.mockReturnValue({ ...baseAuth(), ...auth });

  return render(
    <MemoryRouter initialEntries={[`/auth${search}`]}>
      <Routes>
        <Route path="/" element={<div>LANDING HOME</div>} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<div>CLIENT DASHBOARD</div>} />
        <Route path="/admin" element={<div>BACKOFFICE</div>} />
        <Route path="/admin/approvals" element={<div>APPROVALS</div>} />
        <Route path="/platform" element={<div>PLATFORM CONSOLE</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockUseAuth.mockReset();
});

describe('post-login landing by role', () => {
  it('lands a client on /dashboard', () => {
    renderAuth({});
    expect(screen.getByText('CLIENT DASHBOARD')).toBeInTheDocument();
  });

  it('lands tenant staff on /admin', () => {
    renderAuth({ isLoanOfficer: true });
    expect(screen.getByText('BACKOFFICE')).toBeInTheDocument();
  });

  it('lands a pure platform owner on /platform, not /dashboard', () => {
    // Tenant role is `client` (isLoanOfficer false) — the platform plane must still win.
    renderAuth({ isPlatformStaff: true });
    expect(screen.getByText('PLATFORM CONSOLE')).toBeInTheDocument();
  });

  it('gives the platform plane precedence for a dual-role identity', () => {
    renderAuth({ isPlatformStaff: true, isLoanOfficer: true });
    expect(screen.getByText('PLATFORM CONSOLE')).toBeInTheDocument();
  });
});

describe('landing waits for the identity queries', () => {
  it('does not redirect while the role queries are still resolving', () => {
    // This is the exact race: profile has arrived, roles have not, so every flag reads false.
    renderAuth({ authReady: false, isLoanOfficer: true });

    expect(screen.queryByText('CLIENT DASHBOARD')).not.toBeInTheDocument();
    expect(screen.queryByText('BACKOFFICE')).not.toBeInTheDocument();
  });

  it('lands an admin on /admin once the role query settles', () => {
    const { rerender } = renderAuth({ authReady: false, isLoanOfficer: true });
    expect(screen.queryByText('BACKOFFICE')).not.toBeInTheDocument();

    mockUseAuth.mockReturnValue({ ...baseAuth(), authReady: true, isLoanOfficer: true });
    rerender(
      <MemoryRouter initialEntries={['/auth']}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<div>CLIENT DASHBOARD</div>} />
          <Route path="/admin" element={<div>BACKOFFICE</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('BACKOFFICE')).toBeInTheDocument();
  });

  it('stays on the form when there is no user', () => {
    renderAuth({ user: null });

    expect(screen.queryByText('CLIENT DASHBOARD')).not.toBeInTheDocument();
    expect(screen.getByTestId('email-input')).toBeInTheDocument();
  });
});

describe('landing honours ?mode=', () => {
  it('opens the signup form when mode=signup', () => {
    renderAuth({ user: null }, '?mode=signup');

    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
    expect(screen.queryByTestId('email-input')).not.toBeInTheDocument();
  });

  it('keeps the sign-in form when mode is absent', () => {
    renderAuth({ user: null });

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByTestId('login-button')).toBeInTheDocument();
  });

  it('switching to Sign in from ?mode=signup leaves the login form', () => {
    renderAuth({ user: null }, '?mode=signup');

    fireEvent.click(screen.getByTestId('auth-switch-to-login'));

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByTestId('login-button')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Create Account' })).not.toBeInTheDocument();
  });

  it('returns to the landing page from Back to home', () => {
    renderAuth({ user: null });

    fireEvent.click(screen.getByTestId('auth-back-home'));

    expect(screen.getByText('LANDING HOME')).toBeInTheDocument();
  });
});

describe('landing honours ?next=', () => {
  it('sends a permitted user to the requested deep link', () => {
    renderAuth({ isLoanOfficer: true }, '?next=%2Fadmin%2Fapprovals');
    expect(screen.getByText('APPROVALS')).toBeInTheDocument();
  });

  it('falls back to the user own console when they cannot open next', () => {
    // A client bounced off /admin/approvals must not be sent back into Access Denied.
    renderAuth({}, '?next=%2Fadmin%2Fapprovals');
    expect(screen.getByText('CLIENT DASHBOARD')).toBeInTheDocument();
  });

  it('ignores an external next instead of following it', () => {
    renderAuth({}, '?next=https%3A%2F%2Fevil.com');
    expect(screen.getByText('CLIENT DASHBOARD')).toBeInTheDocument();
  });
});
