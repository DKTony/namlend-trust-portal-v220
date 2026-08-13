import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoanDetails from './LoanDetails';

const mockHasFeature = vi.fn();
const mockUseQuery = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'client-1' }, loading: false }),
}));
vi.mock('@/hooks/useEntitlements', () => ({
  useEntitlements: () => ({ hasFeature: mockHasFeature }),
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('convex/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));
vi.mock('@/components/Layout/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/components/ips', () => ({
  IPSHistoryList: () => <div data-testid="ips-history-list" />,
  IPSPaymentModal: () => <div data-testid="ips-payment-modal" />,
}));
vi.mock('@/components/documents/LoanDocumentsPanel', () => ({
  LoanDocumentsPanel: () => <div data-testid="loan-documents-panel" />,
}));

const activeLoan = {
  _id: 'abcdefghijk',
  userId: 'client-1',
  principal: 10_000,
  purpose: 'Education',
  termMonths: 12,
  interestRate: 20,
  monthlyPayment: 1_000,
  totalRepayment: 12_000,
  totalPaid: 2_000,
  outstandingBalance: 10_000,
  status: 'active',
  createdAt: Date.now(),
  disbursedAt: Date.now(),
};

function renderPage(enabledFeatures: string[]) {
  const enabled = new Set(enabledFeatures);
  mockHasFeature.mockImplementation((featureKey: string) => enabled.has(featureKey));
  mockUseQuery.mockReturnValueOnce(activeLoan).mockReturnValueOnce([]);

  return render(
    <MemoryRouter initialEntries={['/loans/abcdefghijk']}>
      <Routes>
        <Route path="/loans/:id" element={<LoanDetails />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('LoanDetails cross-feature actions', () => {
  beforeEach(() => {
    mockHasFeature.mockReset();
    mockUseQuery.mockReset();
  });

  it('retains historical payment reads while hiding disabled payment, IPS, and document controls', () => {
    renderPage([]);

    expect(screen.getByRole('tab', { name: 'Payments' })).toBeInTheDocument();
    expect(screen.queryByTestId('quick-actions-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ips-history-tab')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ips-payment-modal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('loan-documents-tab')).not.toBeInTheDocument();
    expect(screen.queryByTestId('loan-documents-panel')).not.toBeInTheDocument();
  });

  it('allows non-IPS repayment controls with Payments alone', () => {
    renderPage(['clientPayments']);

    expect(screen.getByTestId('quick-actions-card')).toBeInTheDocument();
    expect(screen.getByTestId('other-payment-button')).toBeInTheDocument();
    expect(screen.queryByTestId('ips-payment-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ips-history-tab')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ips-payment-modal')).not.toBeInTheDocument();
  });

  it('shows IPS and document controls only when their feature closure is enabled', () => {
    renderPage(['clientPayments', 'clientBanking', 'clientDocuments']);

    expect(screen.getByTestId('ips-payment-button')).toBeInTheDocument();
    expect(screen.getByTestId('ips-history-tab')).toBeInTheDocument();
    expect(screen.getByTestId('ips-payment-modal')).toBeInTheDocument();
    expect(screen.getByTestId('loan-documents-tab')).toBeInTheDocument();
  });
});
