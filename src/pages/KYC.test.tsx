import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { KYCOverview } from '@/hooks/useKYCEligibility';
import type { Id } from '@/integrations/convex/api';
import KYC from './KYC';

const mockEligibility = vi.fn();
const mockHasFeature = vi.fn();

vi.mock('@/hooks/useKYCEligibility', () => ({
  useKYCEligibility: () => mockEligibility(),
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { _id: 'client-1' }, loading: false }),
}));
vi.mock('@/hooks/useEntitlements', () => ({
  useEntitlements: () => ({ hasFeature: mockHasFeature }),
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('convex/react', () => ({ useMutation: () => vi.fn() }));
vi.mock('@/components/Layout/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

function overview(overrides: Partial<KYCOverview> = {}): KYCOverview {
  return {
    status: 'pending',
    eligible: false,
    canSubmit: true,
    requiredDocumentTypes: ['id_card', 'proof_income'],
    optionalDocumentTypes: ['bank_statement', 'employment_letter'],
    missingRequiredDocumentTypes: [],
    approvedRequiredDocumentTypes: [],
    rejectedRequiredDocumentTypes: [],
    documents: [
      {
        id: 'id-document' as Id<'kycDocuments'>,
        documentType: 'id_card',
        fileName: 'national-id.png',
        fileSize: 2048,
        mimeType: 'image/png',
        version: 1,
        isCurrent: true,
        fileAvailable: true,
        status: 'pending',
        submittedAt: undefined,
        reviewedAt: undefined,
        reviewNotes: undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'income-document' as Id<'kycDocuments'>,
        documentType: 'proof_income',
        fileName: 'august-payslip.pdf',
        fileSize: 4096,
        mimeType: 'application/pdf',
        version: 2,
        isCurrent: true,
        fileAvailable: true,
        status: 'pending',
        submittedAt: undefined,
        reviewedAt: undefined,
        reviewNotes: undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    history: [],
    openRequestId: undefined,
    isResubmission: false,
    allSubmittedDocumentsDecided: false,
    ...overrides,
  };
}

describe('KYC persisted workflow screen', () => {
  beforeEach(() => {
    mockEligibility.mockReset();
    mockHasFeature.mockImplementation(() => true);
  });

  test('renders persisted file metadata and requires confirmation before submission', () => {
    mockEligibility.mockReturnValue({ overview: overview(), loading: false });
    render(
      <MemoryRouter>
        <KYC />
      </MemoryRouter>
    );

    expect(screen.getByText('national-id.png')).toBeInTheDocument();
    expect(screen.getByText('august-payslip.pdf')).toBeInTheDocument();
    expect(screen.getByText(/Version 2/i)).toBeInTheDocument();
    const submit = screen.getByTestId('submit-kyc-button');
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    expect(screen.getByText('Submit documents for review?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm and submit/i })).toBeInTheDocument();
  });

  test('locks file controls after submission and shows an explicit completion action', () => {
    mockEligibility.mockReturnValue({
      overview: overview({ status: 'submitted', canSubmit: false }),
      loading: false,
    });
    render(
      <MemoryRouter>
        <KYC />
      </MemoryRouter>
    );

    expect(screen.getByText(/submitted for review/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /done \/ back to dashboard/i })).toBeInTheDocument();
    screen
      .getAllByRole('button', { name: /replace/i })
      .forEach((button) => expect(button).toBeDisabled());
  });

  test('surfaces rejection notes and a resubmit action', () => {
    const rejected = overview({ status: 'rejected', canSubmit: false, isResubmission: true });
    rejected.documents[1] = {
      ...rejected.documents[1],
      status: 'rejected',
      reviewNotes: 'Upload a full, uncropped payslip.',
    };
    mockEligibility.mockReturnValue({ overview: rejected, loading: false });
    render(
      <MemoryRouter>
        <KYC />
      </MemoryRouter>
    );

    expect(screen.getByText(/Upload a full, uncropped payslip/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resubmit for review/i })).toBeDisabled();
  });

  test('hides the loan-application continuation when applications are disabled', () => {
    mockEligibility.mockReturnValue({
      overview: overview({ status: 'verified', eligible: true, canSubmit: false }),
      loading: false,
    });
    mockHasFeature.mockImplementation((featureKey: string) => featureKey !== 'clientApplications');

    render(
      <MemoryRouter>
        <KYC />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /continue to loan application/i })
    ).not.toBeInTheDocument();
  });
});
