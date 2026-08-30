import { uploadFileWithProgress } from '@/utils/uploadWithProgress';
import { DocumentPreviewDialog } from './DocumentPreviewDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { api, type Id } from '@/integrations/convex/api';
import type { DocumentAccessResult, DocumentViewItem } from '@/types/documents';
import { isLoanUnderwritingStatus } from '../../../convex/lib/documentPolicy';
import { useMutation, useQuery } from 'convex/react';
import { AlertCircle, CheckCircle2, Eye, FileText, Loader2, Upload, XCircle } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const DOCUMENT_TYPES = {
  bank_statement: 'Bank statement',
  proof_income: 'Proof of income',
  employment_letter: 'Employment letter',
  other: 'Other supporting document',
} as const;
type LoanDocumentType = keyof typeof DOCUMENT_TYPES;

interface LoanDocumentsPanelProps {
  loanId: string;
  allowUpload?: boolean;
  allowReview?: boolean;
  loanStatus?: string;
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

export function LoanDocumentsPanel({
  loanId,
  allowUpload = false,
  allowReview = false,
  loanStatus,
}: LoanDocumentsPanelProps) {
  const { toast } = useToast();
  const documents = useQuery(api.loanDocuments.getLoanDocuments, {
    loanId: loanId as Id<'loans'>,
  });
  const generateUploadUrl = useMutation(api.loanDocuments.generateUploadUrl);
  const recordDocument = useMutation(api.loanDocuments.recordDocument);
  const requestDocumentAccess = useMutation(api.loanDocuments.requestDocumentAccess);
  const reviewDocument = useMutation(api.loanDocuments.reviewDocument);
  const [selectedType, setSelectedType] = useState<LoanDocumentType>('bank_statement');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [previewDocument, setPreviewDocument] = useState<DocumentViewItem | null>(null);
  const [rejectDocument, setRejectDocument] = useState<DocumentViewItem | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const currentDocuments = useMemo(() => (documents ?? []) as DocumentViewItem[], [documents]);
  const documentByType = useMemo(
    () => new Map(currentDocuments.map((document) => [document.documentType, document])),
    [currentDocuments]
  );

  const requestAccess = async (
    documentId: string,
    intent: 'preview' | 'download'
  ): Promise<DocumentAccessResult> =>
    requestDocumentAccess({ documentId: documentId as Id<'loanDocuments'>, intent });

  const upload = async (file: File) => {
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      toast({
        title: 'Unsupported file',
        description: 'Choose a PDF, JPG, or PNG document.',
        variant: 'destructive',
      });
      return;
    }
    if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
      toast({
        title: 'File is too large',
        description: 'Documents must be 5 MB or smaller.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      const uploadUrl = await generateUploadUrl();
      const { storageId } = await uploadFileWithProgress(uploadUrl, file, setUploadProgress);
      await recordDocument({
        loanId: loanId as Id<'loans'>,
        documentType: selectedType,
        fileName: file.name,
        fileStorageId: storageId as Id<'_storage'>,
      });
      toast({
        title: documentByType.has(selectedType) ? 'Replacement saved' : 'Document saved',
        description: 'The current document is now available in both portals.',
      });
    } catch {
      toast({
        title: 'Upload failed',
        description: 'The document was not recorded. Please retry.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setReplacementFile(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const chooseFile = (file?: File) => {
    if (!file) return;
    if (documentByType.has(selectedType)) {
      setReplacementFile(file);
      return;
    }
    void upload(file);
  };

  const decide = async (
    document: DocumentViewItem,
    decision: 'approved' | 'rejected',
    notes?: string
  ) => {
    setReviewingId(document.id);
    try {
      await reviewDocument({
        documentId: document.id as Id<'loanDocuments'>,
        decision,
        notes: notes?.trim() || undefined,
      });
      toast({
        title: decision === 'approved' ? 'Document approved' : 'Document rejected',
        description: 'The client can now see the saved review decision.',
      });
      setRejectDocument(null);
      setRejectionNotes('');
    } catch {
      toast({
        title: 'Review failed',
        description: 'The decision was not saved. Please retry.',
        variant: 'destructive',
      });
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="space-y-4" data-testid="loan-documents-panel">
      {allowUpload ? (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium">Document type</p>
              <Select
                value={selectedType}
                onValueChange={(value) => setSelectedType(value as LoanDocumentType)}
                disabled={uploading}
              >
                <SelectTrigger aria-label="Loan document type" data-testid="loan-document-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_TYPES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept="application/pdf,image/jpeg,image/png"
              onChange={(event) => chooseFile(event.target.files?.[0])}
              data-testid="loan-document-input"
            />
            <Button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              data-testid="loan-document-upload"
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {documentByType.has(selectedType) ? 'Replace file' : 'Upload file'}
            </Button>
          </div>
          {uploading && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Saving securely…</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            PDF, JPG, or PNG · maximum 5 MB. Replacements retain the previous version.
            {loanStatus && !isLoanUnderwritingStatus(loanStatus)
              ? ' New files are extra supporting documents for your officer; they do not reopen underwriting.'
              : ''}
          </p>
        </div>
      ) : (
        !allowReview && (
          <div className="flex gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <AlertCircle className="h-5 w-5 shrink-0" />
            Supporting documents are read-only at this stage of the loan.
          </div>
        )
      )}

      {documents === undefined ? (
        <div className="space-y-3">
          {[0, 1].map((item) => (
            <div key={item} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : currentDocuments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
          <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
          No loan-supporting documents uploaded yet.
        </div>
      ) : (
        currentDocuments.map((document) => (
          <div
            key={document.id}
            className="rounded-xl border border-border bg-card p-4"
            data-testid={`loan-document-${document.id}`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{document.fileName}</p>
                  <p className="mt-1 text-xs capitalize text-muted-foreground">
                    {DOCUMENT_TYPES[document.documentType as LoanDocumentType] ??
                      document.documentType.replace(/_/g, ' ')}{' '}
                    · {formatBytes(document.fileSize)} · Version {document.version ?? 1}
                    {' · '}Uploaded {formatDate(document.uploadedAt)}
                  </p>
                  {!document.fileAvailable && (
                    <p className="mt-2 text-xs text-destructive">Legacy file unavailable</p>
                  )}
                  {document.reviewNotes && (
                    <p className="mt-2 text-xs text-destructive">
                      Review note: {document.reviewNotes}
                    </p>
                  )}
                </div>
              </div>
              <Badge
                variant="outline"
                className={
                  document.status === 'approved'
                    ? 'text-green-600'
                    : document.status === 'rejected'
                      ? 'text-destructive'
                      : 'text-yellow-600'
                }
              >
                {document.status}
              </Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewDocument(document)}
                data-testid={`loan-document-preview-${document.id}`}
              >
                <Eye className="mr-2 h-4 w-4" /> Preview / download
              </Button>
              {allowReview && (
                <>
                  <Button
                    size="sm"
                    disabled={reviewingId === document.id || !document.fileAvailable}
                    onClick={() => decide(document, 'approved')}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={reviewingId === document.id}
                    onClick={() => {
                      setRejectDocument(document);
                      setRejectionNotes(
                        document.status === 'rejected' ? (document.reviewNotes ?? '') : ''
                      );
                    }}
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Reject
                  </Button>
                </>
              )}
            </div>
          </div>
        ))
      )}

      <DocumentPreviewDialog
        document={previewDocument}
        open={Boolean(previewDocument)}
        onOpenChange={(open) => !open && setPreviewDocument(null)}
        requestAccess={requestAccess}
      />

      <AlertDialog
        open={Boolean(replacementFile)}
        onOpenChange={(open) => {
          if (!open) setReplacementFile(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace the current document?</AlertDialogTitle>
            <AlertDialogDescription>
              The existing file remains in the compliance history. The new file becomes the current
              version and requires a fresh staff decision.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep existing file</AlertDialogCancel>
            <AlertDialogAction onClick={() => replacementFile && void upload(replacementFile)}>
              Upload replacement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(rejectDocument)}
        onOpenChange={(open) => !open && setRejectDocument(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject loan document</DialogTitle>
            <DialogDescription>
              Give the client a clear reason they can use to correct the file.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionNotes}
            onChange={(event) => setRejectionNotes(event.target.value)}
            placeholder="Required rejection reason"
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDocument(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectionNotes.trim() || reviewingId !== null}
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
