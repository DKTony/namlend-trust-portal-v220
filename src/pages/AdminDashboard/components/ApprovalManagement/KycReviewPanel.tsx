import { DocumentPreviewDialog } from '@/components/documents/DocumentPreviewDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { api, type Id } from '@/integrations/convex/api';
import type { DocumentAccessResult, DocumentViewItem } from '@/types/documents';
import { useMutation, useQuery } from 'convex/react';
import { AlertCircle, CheckCircle2, Eye, FileText, Loader2, XCircle } from 'lucide-react';
import { useState } from 'react';

interface KycReviewPanelProps {
  userId: string;
  requestId: string;
  readOnly?: boolean;
  onComplete: () => void;
}

function formatBytes(value?: number) {
  if (!value) return 'Size unavailable';
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value?: number) {
  if (!value) return 'Date unavailable';
  return new Date(value).toLocaleDateString('en-NA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function KycReviewPanel({
  userId,
  requestId,
  readOnly = false,
  onComplete,
}: KycReviewPanelProps) {
  const { toast } = useToast();
  const overview = useQuery(api.kycDocuments.getUserKycOverview, {
    userId: userId as Id<'users'>,
  });
  const reviewDocument = useMutation(api.kycDocuments.reviewDocument);
  const completeReview = useMutation(api.kycDocuments.completeReview);
  const requestDocumentAccess = useMutation(api.kycDocuments.requestDocumentAccess);
  const [previewDocument, setPreviewDocument] = useState<DocumentViewItem | null>(null);
  const [rejectDocument, setRejectDocument] = useState<DocumentViewItem | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [processingDocumentId, setProcessingDocumentId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  const requestAccess = async (
    documentId: string,
    intent: 'preview' | 'download'
  ): Promise<DocumentAccessResult> =>
    requestDocumentAccess({ documentId: documentId as Id<'kycDocuments'>, intent });

  const decide = async (
    document: DocumentViewItem,
    decision: 'approved' | 'rejected',
    notes?: string
  ) => {
    setProcessingDocumentId(document.id);
    try {
      await reviewDocument({
        documentId: document.id as Id<'kycDocuments'>,
        decision,
        notes: notes?.trim() || undefined,
      });
      toast({
        title: decision === 'approved' ? 'Document approved' : 'Document rejected',
        description:
          decision === 'approved'
            ? 'The decision was saved. Complete the package review after deciding every file.'
            : 'The client will see this reason after the package review is completed.',
      });
      setRejectDocument(null);
      setRejectionNotes('');
    } catch {
      toast({
        title: 'Decision not saved',
        description: 'Please retry. The document decision was not changed.',
        variant: 'destructive',
      });
    } finally {
      setProcessingDocumentId(null);
    }
  };

  const finishReview = async () => {
    setCompleting(true);
    try {
      const result = await completeReview({
        requestId: requestId as Id<'approvalRequests'>,
      });
      toast({
        title: result.status === 'verified' ? 'KYC verified' : 'KYC returned to client',
        description:
          result.status === 'verified'
            ? 'The client is now eligible to continue to a loan application.'
            : 'The client can replace rejected required files and resubmit the package.',
      });
      onComplete();
    } catch {
      toast({
        title: 'Review not completed',
        description: 'Every submitted file must have a saved decision before completion.',
        variant: 'destructive',
      });
    } finally {
      setCompleting(false);
    }
  };

  if (overview === undefined) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border p-10 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading submitted package…
      </div>
    );
  }

  const submittedDocuments = overview.documents.filter((document) => document.submittedAt);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="font-medium">Submitted KYC package</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Preview and decide every submitted current file, then confirm completion below.
        </p>
      </div>

      {submittedDocuments.map((document) => {
        const item = document as DocumentViewItem;
        const processing = processingDocumentId === item.id;
        return (
          <div key={item.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.fileName}</p>
                  <p className="mt-1 text-xs capitalize text-muted-foreground">
                    {item.documentType.replace(/_/g, ' ')} · {formatBytes(item.fileSize)} · Version{' '}
                    {item.version ?? 1} · Uploaded {formatDate(item.createdAt)}
                  </p>
                  {!item.fileAvailable && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="h-3.5 w-3.5" /> Legacy file unavailable
                    </p>
                  )}
                  {item.reviewNotes && (
                    <p className="mt-2 text-xs text-muted-foreground">Note: {item.reviewNotes}</p>
                  )}
                </div>
              </div>
              <Badge
                variant="outline"
                className={
                  item.status === 'approved'
                    ? 'border-green-500/30 text-green-600'
                    : item.status === 'rejected'
                      ? 'border-destructive/30 text-destructive'
                      : 'border-yellow-500/30 text-yellow-600'
                }
              >
                {item.status}
              </Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
              <Button variant="outline" size="sm" onClick={() => setPreviewDocument(item)}>
                <Eye className="mr-2 h-4 w-4" /> Preview
              </Button>
              {!readOnly && (
                <>
                  <Button
                    size="sm"
                    disabled={processing || !item.fileAvailable}
                    onClick={() => decide(item, 'approved')}
                  >
                    {processing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={processing}
                    onClick={() => {
                      setRejectDocument(item);
                      setRejectionNotes(item.status === 'rejected' ? (item.reviewNotes ?? '') : '');
                    }}
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Reject
                  </Button>
                </>
              )}
            </div>
          </div>
        );
      })}

      {submittedDocuments.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
          No submitted current documents were found for this request.
        </div>
      )}

      {!readOnly && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              className="w-full"
              disabled={!overview.allSubmittedDocumentsDecided || completing}
              data-testid="kyc-complete-review"
            >
              {completing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete package review
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="pointer-events-auto z-[70]" overlayClassName="z-[70]">
            <AlertDialogHeader>
              <AlertDialogTitle>Complete this KYC review?</AlertDialogTitle>
              <AlertDialogDescription>
                Approved required files verify the client. Any rejected required file returns the
                package for replacement. This records the final staff decision.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep reviewing</AlertDialogCancel>
              <AlertDialogAction onClick={finishReview}>Confirm completion</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {readOnly && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-center text-sm text-muted-foreground">
          This package review is complete. Documents remain available for retrieval.
        </div>
      )}

      {!readOnly && !overview.allSubmittedDocumentsDecided && submittedDocuments.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Complete is enabled after every submitted file has an approved or rejected decision.
        </p>
      )}

      <DocumentPreviewDialog
        document={previewDocument}
        open={Boolean(previewDocument)}
        onOpenChange={(nextOpen) => !nextOpen && setPreviewDocument(null)}
        requestAccess={requestAccess}
        nested
      />

      <Dialog
        open={Boolean(rejectDocument)}
        onOpenChange={(nextOpen) => !nextOpen && setRejectDocument(null)}
        modal={false}
      >
        <DialogContent className="pointer-events-auto z-[70]">
          <DialogHeader>
            <DialogTitle>Reject document</DialogTitle>
            <DialogDescription>
              Explain exactly what the client must correct before resubmitting.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionNotes}
            onChange={(event) => setRejectionNotes(event.target.value)}
            placeholder="Required rejection reason"
            rows={4}
            data-testid="kyc-rejection-notes"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDocument(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectionNotes.trim() || processingDocumentId !== null}
              onClick={() => rejectDocument && decide(rejectDocument, 'rejected', rejectionNotes)}
            >
              Confirm rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
