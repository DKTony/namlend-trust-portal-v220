import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentsSection } from './DocumentsSection';

const mockHasFeature = vi.fn();
const mockUseQuery = vi.fn();

vi.mock('@/hooks/useEntitlements', () => ({
  useEntitlements: () => ({ hasFeature: mockHasFeature }),
}));
vi.mock('convex/react', () => ({
  useMutation: () => vi.fn(),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));
vi.mock('@/components/documents/DocumentPreviewDialog', () => ({
  DocumentPreviewDialog: () => null,
}));

describe('DocumentsSection client entitlement', () => {
  beforeEach(() => {
    mockHasFeature.mockReset();
    mockUseQuery.mockReset();
  });

  it('skips the client document query and renders nothing when documents are disabled', () => {
    mockHasFeature.mockImplementation(() => false);
    mockUseQuery.mockReturnValue(undefined);

    render(
      <MemoryRouter>
        <DocumentsSection />
      </MemoryRouter>
    );

    expect(mockUseQuery.mock.calls[0]?.[1]).toBe('skip');
    expect(screen.queryByTestId('documents-section')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /manage documents/i })).not.toBeInTheDocument();
  });

  it('renders the document controls and subscribes when documents are enabled', () => {
    mockHasFeature.mockImplementation(() => true);
    mockUseQuery.mockReturnValue({
      documents: [],
      requiredDocumentTypes: ['id_card'],
      optionalDocumentTypes: [],
      eligible: false,
      status: 'pending',
    });

    render(
      <MemoryRouter>
        <DocumentsSection />
      </MemoryRouter>
    );

    expect(mockUseQuery.mock.calls[0]?.[1]).toEqual({});
    expect(screen.getByTestId('documents-section')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /manage documents/i })).toBeInTheDocument();
  });
});
