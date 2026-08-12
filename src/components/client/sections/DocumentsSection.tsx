import { DocumentPreviewDialog } from '@/components/documents/DocumentPreviewDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, type Id } from '@/integrations/convex/api';
import { cn } from '@/lib/utils';
import type { DocumentAccessResult, DocumentViewItem } from '@/types/documents';
import { useMutation, useQuery } from 'convex/react';
import { AlertCircle, CheckCircle, Eye, FileText, ShieldCheck, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LABELS: Record<string, string> = {
  id_card: 'National ID Card',
  proof_income: 'Proof of Income',
  bank_statement: 'Bank Statement',
  employment_letter: 'Employment Letter',
};

function formatDocumentMetadata(document: DocumentViewItem) {
  const size = document.fileSize
    ? document.fileSize < 1024 * 1024
      ? `${(document.fileSize / 1024).toFixed(1)} KB`
      : `${(document.fileSize / (1024 * 1024)).toFixed(1)} MB`
    : 'Size unavailable';
  const date = document.createdAt
    ? new Date(document.createdAt).toLocaleDateString('en-NA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Date unavailable';
  return `${document.fileName} · ${size} · ${date}`;
}

export function DocumentsSection() {
  const navigate = useNavigate();
  const overview = useQuery(api.kycDocuments.getMyKycOverview, {});
  const requestDocumentAccess = useMutation(api.kycDocuments.requestDocumentAccess);
  const [previewDocument, setPreviewDocument] = useState<DocumentViewItem | null>(null);
  const documentByType = useMemo(
    () =>
      new Map(
        (overview?.documents ?? []).map((document) => [
          document.documentType,
          document as DocumentViewItem,
        ])
      ),
    [overview?.documents]
  );

  const requestAccess = async (
    documentId: string,
    intent: 'preview' | 'download'
  ): Promise<DocumentAccessResult> =>
    requestDocumentAccess({ documentId: documentId as Id<'kycDocuments'>, intent });

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 p-6">
        <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <ShieldCheck className="h-5 w-5 text-blue-500" />
          Document Verification
        </h3>
        <Button size="sm" variant="outline" onClick={() => navigate('/kyc')}>
          <Upload className="mr-2 h-3.5 w-3.5" /> Manage documents
        </Button>
      </div>

      <div className="space-y-4 p-6">
        {overview === undefined ? (
          <div className="space-y-3">
            {[0, 1].map((item) => (
              <div key={item} className="h-20 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : (
          [...overview.requiredDocumentTypes, ...overview.optionalDocumentTypes].map(
            (documentType) => {
              const document = documentByType.get(documentType);
              const required = overview.requiredDocumentTypes.includes(
                documentType as (typeof overview.requiredDocumentTypes)[number]
              );
              return (
                <div
                  key={documentType}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background',
                        document?.status === 'approved'
                          ? 'text-green-500'
                          : document?.status === 'rejected'
                            ? 'text-destructive'
                            : 'text-yellow-500'
                      )}
                    >
                      {document?.status === 'approved' ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : document?.status === 'rejected' ? (
                        <AlertCircle className="h-5 w-5" />
                      ) : (
                        <FileText className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {LABELS[documentType] ?? documentType.replace(/_/g, ' ')}
                      </p>
                      {document && (
                        <p className="mt-1 max-w-md truncate text-xs text-muted-foreground">
                          {formatDocumentMetadata(document)}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {document?.status ?? 'not uploaded'}
                        </Badge>
                        {required && <Badge variant="secondary">Required</Badge>}
                        {document?.reviewNotes && (
                          <span className="text-xs text-destructive">{document.reviewNotes}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {document && (
                      <Button variant="ghost" onClick={() => setPreviewDocument(document)}>
                        <Eye className="mr-2 h-4 w-4" /> View
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => navigate('/kyc')}>
                      {document ? 'Replace' : 'Upload'}
                    </Button>
                  </div>
                </div>
              );
            }
          )
        )}

        {overview && !overview.eligible && (
          <div className="flex gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-yellow-600 " />
            <div>
              <p className="text-sm font-medium text-yellow-700 ">
                {overview.status === 'submitted' ? 'Under review' : 'Action required'}
              </p>
              <p className="mt-1 text-xs text-yellow-700/80 ">
                {overview.status === 'submitted'
                  ? 'Your documents are waiting for staff review.'
                  : 'Complete and submit the required documents to unlock loan applications.'}
              </p>
            </div>
          </div>
        )}
      </div>

      <DocumentPreviewDialog
        document={previewDocument}
        open={Boolean(previewDocument)}
        onOpenChange={(open) => !open && setPreviewDocument(null)}
        requestAccess={requestAccess}
      />
    </div>
  );
}
