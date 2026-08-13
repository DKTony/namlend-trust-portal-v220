import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Payment from './Payment';

const mockHasFeature = vi.fn();
const mockUseQuery = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'client-1' } }),
}));
vi.mock('@/hooks/useEntitlements', () => ({
  useEntitlements: () => ({ hasFeature: mockHasFeature }),
}));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('convex/react', () => ({
  useMutation: () => vi.fn(),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));
vi.mock('@/components/Layout/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) =>
      typeof fallback === 'string'
        ? fallback
        : ({
            'noActiveLoans.title': 'No active loans',
            'noActiveLoans.description': 'You do not have an active loan.',
            'noActiveLoans.returnButton': 'Return to dashboard',
            title: 'Payments',
          }[key] ?? key),
  }),
}));

describe('Payment client feature actions', () => {
  beforeEach(() => {
    mockHasFeature.mockReset();
    mockUseQuery.mockReset();
    mockUseQuery.mockReturnValueOnce([]).mockReturnValueOnce(undefined);
  });

  it('does not offer a loan application from the empty state when applications are disabled', () => {
    mockHasFeature.mockImplementation((featureKey: string) => featureKey !== 'clientApplications');

    render(
      <MemoryRouter>
        <Payment />
      </MemoryRouter>
    );

    expect(screen.queryByRole('button', { name: /apply for a loan/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /return to dashboard/i })).toBeInTheDocument();
  });

  it('offers a loan application from the empty state when applications are enabled', () => {
    mockHasFeature.mockImplementation(() => true);

    render(
      <MemoryRouter>
        <Payment />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /apply for a loan/i })).toBeInTheDocument();
  });
});
