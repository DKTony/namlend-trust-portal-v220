import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import type { DocumentViewItem } from '@/types/documents';
import { DocumentPreviewDialog } from './DocumentPreviewDialog';

const baseDocument: DocumentViewItem = {
  id: 'document-1',
  documentType: 'proof_income',
  fileName: 'payslip.pdf',
  fileSize: 2048,
  mimeType: 'application/pdf',
  fileAvailable: true,
  status: 'pending',
  reviewNotes: 'Check the most recent period.',
  version: 2,
};

describe('DocumentPreviewDialog', () => {
  test('requests authenticated preview access and embeds a PDF with metadata', async () => {
    const requestAccess = vi.fn().mockResolvedValue({
      url: 'https://files.example.test/payslip.pdf',
      fileName: 'payslip.pdf',
      fileSize: 2048,
      mimeType: 'application/pdf',
    });
    render(
      <DocumentPreviewDialog
        document={baseDocument}
        open
        onOpenChange={vi.fn()}
        requestAccess={requestAccess}
      />
    );

    const frame = await screen.findByTitle('Preview of payslip.pdf');
    expect(frame).toHaveAttribute('src', 'https://files.example.test/payslip.pdf');
    expect(screen.getByText(/proof income · 2.0 KB/i)).toBeInTheDocument();
    expect(screen.getByText(/Check the most recent period/i)).toBeInTheDocument();
    expect(requestAccess).toHaveBeenCalledWith('document-1', 'preview');
  });

  test('renders images inline', async () => {
    const requestAccess = vi.fn().mockResolvedValue({
      url: 'https://files.example.test/identity.png',
      fileName: 'identity.png',
      mimeType: 'image/png',
    });
    render(
      <DocumentPreviewDialog
        document={{ ...baseDocument, fileName: 'identity.png', mimeType: 'image/png' }}
        open
        onOpenChange={vi.fn()}
        requestAccess={requestAccess}
      />
    );

    expect(await screen.findByAltText('Preview of identity.png')).toHaveAttribute(
      'src',
      'https://files.example.test/identity.png'
    );
  });

  test('shows the retained legacy fallback without requesting an unavailable file', async () => {
    const requestAccess = vi.fn();
    render(
      <DocumentPreviewDialog
        document={{ ...baseDocument, fileAvailable: false }}
        open
        onOpenChange={vi.fn()}
        requestAccess={requestAccess}
      />
    );

    expect(screen.getByText('Legacy file unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download/i })).toBeDisabled();
    await waitFor(() => expect(requestAccess).not.toHaveBeenCalled());
  });
});
