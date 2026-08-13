/**
 * Guard behaviour around the auth-state race.
 *
 * The bug these cover: `useAuth().user` is built from the `getMyProfile` query, which resolves
 * independently of the Convex session. While it was in flight the guard saw `user === null` with
 * `loading === false` and redirected to `/auth?next=…` — so every hard load of a protected route
 * detoured through the login page.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';

const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

type AuthState = Partial<ReturnType<typeof baseAuth>>;

function baseAuth() {
  return {
    // Explicitly nullable: several cases below drive the signed-out / no-profile branches.
    user: { id: 'u1', email: 'a@b.c' } as { id: string; email: string } | null,
    loading: false,
    roleLoading: false,
    profileMissing: false,
    userRole: 'client' as string | null,
    isAdmin: false,
    isLoanOfficer: false,
    isPlatformStaff: false,
    isPlatformOwner: false,
    platformRoleLoading: false,
    signOut: vi.fn(),
  };
}

function renderAt(path: string, auth: AuthState, guard: Record<string, boolean> = {}) {
  mockUseAuth.mockReturnValue({ ...baseAuth(), ...auth });

  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute {...guard}>
              <div>ADMIN CONTENT</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute {...guard}>
              <div>DASHBOARD CONTENT</div>
            </ProtectedRoute>
          }
        />
        <Route path="/auth" element={<div>AUTH PAGE</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockUseAuth.mockReset();
});

describe('ProtectedRoute — session hydration', () => {
  it('shows a spinner instead of redirecting while the profile is still loading', () => {
    // `loading` now folds in the profile query, so this is the state during a hard page load.
    renderAt('/dashboard', { user: null, loading: true });

    expect(screen.queryByText('AUTH PAGE')).not.toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('redirects to /auth once loading has settled with no user', () => {
    renderAt('/dashboard', { user: null, loading: false });

    expect(screen.getByText('AUTH PAGE')).toBeInTheDocument();
  });

  it('renders the page for an authenticated user', () => {
    renderAt('/dashboard', {});

    expect(screen.getByText('DASHBOARD CONTENT')).toBeInTheDocument();
  });

  it('stops instead of looping when the session is valid but the profile is missing', () => {
    // Redirecting here would bounce off /auth (the session is live) and come straight back.
    renderAt('/dashboard', { user: null, profileMissing: true });

    expect(screen.queryByText('AUTH PAGE')).not.toBeInTheDocument();
    expect(screen.getByText("We couldn't load your profile")).toBeInTheDocument();
  });
});

describe('ProtectedRoute — role gates', () => {
  it('denies tenant staff access to client self-service routes', () => {
    renderAt(
      '/dashboard',
      { userRole: 'loan_officer', isLoanOfficer: true },
      { requireClient: true }
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText('Client privileges required.')).toBeInTheDocument();
  });

  it('admits the client role to client self-service routes', () => {
    renderAt('/dashboard', { userRole: 'client' }, { requireClient: true });

    expect(screen.getByText('DASHBOARD CONTENT')).toBeInTheDocument();
  });

  it('waits for the tenant role before deciding a client route', () => {
    renderAt('/dashboard', { userRole: null, roleLoading: true }, { requireClient: true });

    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('denies a client the backoffice, with a way out', () => {
    renderAt('/admin/approvals', { isLoanOfficer: false }, { requireLoanOfficer: true });

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText('Loan officer privileges required.')).toBeInTheDocument();
    expect(screen.getByTestId('access-denied-home')).toBeInTheDocument();
  });

  it('admits tenant staff to the backoffice', () => {
    renderAt('/admin/approvals', { isLoanOfficer: true }, { requireLoanOfficer: true });

    expect(screen.getByText('ADMIN CONTENT')).toBeInTheDocument();
  });

  it('waits for the role query before deciding a role-gated route', () => {
    renderAt('/admin/approvals', { roleLoading: true }, { requireLoanOfficer: true });

    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('waits for the platform-role query before deciding a platform route', () => {
    renderAt('/dashboard', { platformRoleLoading: true }, { requirePlatform: true });

    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('keeps the platform gate copy the platform E2E asserts on', () => {
    renderAt('/dashboard', { isPlatformStaff: false }, { requirePlatform: true });

    expect(screen.getByText('Platform staff privileges required.')).toBeInTheDocument();
  });
});
