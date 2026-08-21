import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

import LandingNavbar from './LandingNavbar';

function AuthPageProbe() {
  const location = useLocation();
  return <div>{`AUTH PAGE${location.search}`}</div>;
}

function baseAuth() {
  return {
    user: null as { id: string; email: string } | null,
    isLoanOfficer: false,
    isPlatformStaff: false,
    signOut: vi.fn(),
  };
}

function renderNavbar(auth: Partial<ReturnType<typeof baseAuth>> = {}) {
  mockUseAuth.mockReturnValue({ ...baseAuth(), ...auth });

  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <LandingNavbar />
              <div>LANDING</div>
            </>
          }
        />
        <Route path="/auth" element={<AuthPageProbe />} />
        <Route path="/dashboard" element={<div>CLIENT DASHBOARD</div>} />
        <Route path="/admin" element={<div>BACKOFFICE</div>} />
        <Route path="/platform" element={<div>PLATFORM CONSOLE</div>} />
        <Route path="/loan-application" element={<div>LOAN APPLICATION</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockUseAuth.mockReset();
});

describe('LandingNavbar — guests', () => {
  it('routes Sign In to /auth', () => {
    renderNavbar();

    fireEvent.click(screen.getByTestId('landing-signin-button'));

    expect(screen.getByText('AUTH PAGE')).toBeInTheDocument();
  });

  it('routes Sign Up to /auth?mode=signup', () => {
    renderNavbar();

    fireEvent.click(screen.getByTestId('landing-signup-button'));

    expect(screen.getByText('AUTH PAGE?mode=signup')).toBeInTheDocument();
  });

  it('exposes Sign In in the mobile menu', () => {
    renderNavbar();

    fireEvent.click(screen.getByTestId('landing-mobile-menu-trigger'));

    expect(screen.getByTestId('landing-signin-button-mobile')).toBeInTheDocument();
    expect(screen.getByTestId('landing-signup-button-mobile')).toBeInTheDocument();
  });
});

describe('LandingNavbar — signed-in visitors', () => {
  it('replaces Sign In with the client dashboard control', () => {
    renderNavbar({ user: { id: 'u1', email: 'a@b.c' } });

    expect(screen.queryByTestId('landing-signin-button')).not.toBeInTheDocument();
    expect(screen.getByTestId('landing-dashboard-button')).toHaveTextContent('Dashboard');
    expect(screen.getByTestId('landing-signout-button')).toBeInTheDocument();
  });

  it('sends tenant staff to the admin console', () => {
    renderNavbar({
      user: { id: 'u1', email: 'officer@b.c' },
      isLoanOfficer: true,
    });

    fireEvent.click(screen.getByTestId('landing-dashboard-button'));

    expect(screen.getByText('BACKOFFICE')).toBeInTheDocument();
  });
});
