import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConvexError } from 'convex/values';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { agreementFixture } from '@/components/agreement/agreementFixture';
import LoanAgreement from './LoanAgreement';

const markViewed = vi.fn().mockResolvedValue(undefined);
const accept = vi.fn();
let agreementValue: unknown;

vi.mock('convex/react', () => ({
  useQuery: () => agreementValue,
  useMutation: (ref: unknown) => {
    const name = String((ref as { _name?: string })?._name ?? ref);
    if (name.includes('markViewed')) return markViewed;
    if (name.includes('accept')) return accept;
    return vi.fn();
  },
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }), toast: vi.fn() }));
vi.mock('@/components/Layout/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/integrations/convex/api', () => ({
  api: {
    loanAgreements: {
      getMyAgreement: 'getMyAgreement',
      markViewed: 'markViewed',
      accept: 'accept',
      requestDocument: 'requestDocument',
    },
  },
}));

function issued(status: 'sent' | 'viewed' = 'sent') {
  const { built, template } = agreementFixture();
  const { issues: _i, ...snapshot } = built;
  return {
    _id: 'agreement1',
    agreementNumber: 'OGFS-2026-000007-AG1',
    status,
    version: 1,
    sentAt: 1,
    viewedAt: undefined,
    snapshot,
    template: { version: 2, content: template },
    hasIssuedPdf: true,
    hasExecutedPdf: false,
    acceptance: null,
    canAccept: true,
  };
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/loans/loan1/agreement']}>
      <Routes>
        <Route path="/loans/:id/agreement" element={<LoanAgreement />} />
      </Routes>
    </MemoryRouter>
  );

describe('LoanAgreement (borrower)', () => {
  beforeEach(() => {
    markViewed.mockClear();
    accept.mockReset();
  });

  test('records the first view exactly once', async () => {
    agreementValue = issued('sent');
    const { rerender } = renderPage();
    rerender(
      <MemoryRouter initialEntries={['/loans/loan1/agreement']}>
        <Routes>
          <Route path="/loans/:id/agreement" element={<LoanAgreement />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(markViewed).toHaveBeenCalledTimes(1));
    expect(markViewed).toHaveBeenCalledWith({ agreementId: 'agreement1' });
  });

  test('shows a waiting message before the agreement is issued', () => {
    agreementValue = null;
    renderPage();
    expect(screen.getByText(/not available yet/i)).toBeInTheDocument();
  });

  test('acceptance requires every confirmation, then submits exactly what was entered', async () => {
    agreementValue = issued('viewed');
    accept.mockResolvedValue(undefined);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /accept agreement/i }));
    const submit = screen.getByRole('button', { name: 'I accept' });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Type your full name'), {
      target: { value: 'Ndapewa Test Shilongo' },
    });
    fireEvent.change(screen.getByLabelText('Last 4 characters of your ID'), {
      target: { value: '2345' },
    });
    fireEvent.change(screen.getByLabelText('Signed at (town / city)'), {
      target: { value: 'Windhoek' },
    });
    expect(submit).toBeDisabled(); // not until the statement is agreed
    fireEvent.click(screen.getByRole('checkbox'));
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    await waitFor(() =>
      expect(accept).toHaveBeenCalledWith({
        agreementId: 'agreement1',
        typedName: 'Ndapewa Test Shilongo',
        idNumberLast4: '2345',
        placeOfSigning: 'Windhoek',
        agreed: true,
      })
    );
  });

  test('a mismatched name is reported against the field', async () => {
    agreementValue = issued('viewed');
    accept.mockRejectedValue(
      new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'x',
        fields: { typedName: 'Type your full name exactly as it appears on the agreement.' },
      })
    );
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /accept agreement/i }));
    fireEvent.change(screen.getByLabelText('Type your full name'), {
      target: { value: 'Someone Else' },
    });
    fireEvent.change(screen.getByLabelText('Last 4 characters of your ID'), {
      target: { value: '2345' },
    });
    fireEvent.change(screen.getByLabelText('Signed at (town / city)'), {
      target: { value: 'Windhoek' },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'I accept' }));
    expect(
      await screen.findByText('Type your full name exactly as it appears on the agreement.')
    ).toBeInTheDocument();
  });
});
