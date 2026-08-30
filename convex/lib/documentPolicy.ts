import { ConvexError, v } from 'convex/values';

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_DOCUMENT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;

export const KYC_DOCUMENT_TYPES = [
  'id_card',
  'proof_income',
  'bank_statement',
  'employment_letter',
] as const;
export type KycDocumentType = (typeof KYC_DOCUMENT_TYPES)[number];

export const REQUIRED_KYC_DOCUMENT_TYPES: readonly KycDocumentType[] = ['id_card', 'proof_income'];
export const OPTIONAL_KYC_DOCUMENT_TYPES: readonly KycDocumentType[] = [
  'bank_statement',
  'employment_letter',
];

const LOAN_UNDERWRITING_STATUSES = ['draft', 'submitted', 'under_review'] as const;

export function isRequiredKycDocumentType(documentType: string): boolean {
  return (REQUIRED_KYC_DOCUMENT_TYPES as readonly string[]).includes(documentType);
}

/**
 * Identity / in-package files stay locked while staff review a submitted KYC
 * package. Optional extras that were not part of that package remain uploadable.
 */
export function isKycUploadLocked(args: {
  kycStatus: string | undefined;
  documentType: string;
  currentSubmittedAt?: number;
}): boolean {
  if (args.kycStatus !== 'submitted') return false;
  if (isRequiredKycDocumentType(args.documentType)) return true;
  return args.currentSubmittedAt !== undefined;
}

/** Replacing a required identity document after verify/reject reopens KYC. Extras do not. */
export function shouldReopenKycOnUpload(args: {
  kycStatus: string | undefined;
  documentType: string;
}): boolean {
  if (args.kycStatus !== 'verified' && args.kycStatus !== 'rejected') return false;
  return isRequiredKycDocumentType(args.documentType);
}

export function isLoanUnderwritingStatus(status: string): boolean {
  return (LOAN_UNDERWRITING_STATUSES as readonly string[]).includes(status);
}

export const LOAN_DOCUMENT_TYPES = [
  'bank_statement',
  'proof_income',
  'employment_letter',
  'other',
] as const;
export type LoanDocumentType = (typeof LOAN_DOCUMENT_TYPES)[number];

export const kycDocumentTypeValidator = v.union(
  v.literal('id_card'),
  v.literal('proof_income'),
  v.literal('bank_statement'),
  v.literal('employment_letter')
);

export const loanDocumentTypeValidator = v.union(
  v.literal('bank_statement'),
  v.literal('proof_income'),
  v.literal('employment_letter'),
  v.literal('other')
);

export interface StoredFileMetadata {
  size: number;
  sha256: string;
  contentType?: string | null;
}

export function validateOriginalFileName(fileName: string): string {
  const clean = fileName.trim();
  if (!clean || clean.length > 255 || clean.includes('/') || clean.includes('\\')) {
    throw new ConvexError({
      code: 'INVALID_FILE_NAME',
      message: 'The selected file name is invalid.',
    });
  }
  return clean;
}

export function validateStoredDocument(metadata: StoredFileMetadata | null): {
  fileSize: number;
  mimeType: (typeof ACCEPTED_DOCUMENT_MIME_TYPES)[number];
  sha256: string;
} {
  if (!metadata) {
    throw new ConvexError({ code: 'FILE_NOT_FOUND', message: 'The uploaded file was not found.' });
  }
  if (metadata.size <= 0 || metadata.size > MAX_DOCUMENT_BYTES) {
    throw new ConvexError({
      code: 'FILE_TOO_LARGE',
      message: 'Documents must be 5 MB or smaller.',
    });
  }
  const mimeType = metadata.contentType ?? '';
  if (!ACCEPTED_DOCUMENT_MIME_TYPES.includes(mimeType as never)) {
    throw new ConvexError({
      code: 'UNSUPPORTED_FILE_TYPE',
      message: 'Only PDF, JPG, and PNG documents are accepted.',
    });
  }
  return {
    fileSize: metadata.size,
    mimeType: mimeType as (typeof ACCEPTED_DOCUMENT_MIME_TYPES)[number],
    sha256: metadata.sha256,
  };
}
