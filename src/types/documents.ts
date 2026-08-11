export type DocumentReviewStatus = 'pending' | 'approved' | 'rejected';
export type DocumentAccessIntent = 'preview' | 'download';

export interface DocumentViewItem {
  id: string;
  documentType: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string | null;
  fileAvailable: boolean;
  status: DocumentReviewStatus;
  reviewNotes?: string;
  reviewedAt?: number;
  submittedAt?: number;
  createdAt?: number;
  uploadedAt?: number;
  version?: number;
  isCurrent?: boolean;
}

export interface DocumentAccessResult {
  url: string | null;
  fileName: string;
  mimeType?: string | null;
  fileSize?: number;
}
