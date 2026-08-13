import DashboardLayout from '@/components/Layout/DashboardLayout';
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
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { ThemedInput } from '@/components/ui/ThemedInput';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useKYCEligibility } from '@/hooks/useKYCEligibility';
import { api, type Id } from '@/integrations/convex/api';
import { cn } from '@/lib/utils';
import type { DocumentAccessResult, DocumentViewItem } from '@/types/documents';
import { uploadFileWithProgress } from '@/utils/uploadWithProgress';
import { useMutation } from 'convex/react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  Upload,
  XCircle,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

const DOCUMENT_CONFIG = {
  id_card: {
    label: 'National ID Card',
    description: 'A clear image or PDF showing all corners and readable identity details.',
  },
  proof_income: {
    label: 'Proof of Income',
    description: 'Your latest payslip or employment contract, no older than three months.',
  },
  bank_statement: {
    label: 'Bank Statement',
    description: 'A recent statement showing your name, account details, and transactions.',
  },
  employment_letter: {
    label: 'Employment Letter',
    description: 'A signed and recently dated confirmation from your employer.',
  },
} as const;

type KycDocumentType = keyof typeof DOCUMENT_CONFIG;

function formatBytes(value?: number) {
  if (!value) return 'Size unavailable';
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadDate(value?: number) {
  if (!value) return 'Date unavailable';
  return new Date(value).toLocaleDateString('en-NA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function statusPresentation(status: string) {
  if (status === 'approved') {
    return {
      label: 'Approved',
      icon: CheckCircle2,
      className: 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10',
    };
  }
  if (status === 'rejected') {
    return {
      label: 'Needs replacement',
      icon: XCircle,
      className: 'text-destructive border-destructive/30 bg-destructive/10',
    };
  }
  return {
    label: 'Pending',
    icon: Clock3,
    className: 'text-amber-600 border-amber-500/30 bg-amber-500/10',
  };
}

export default function KYC() {
  const { user } = useAuth();
  const { hasFeature } = useEntitlements();
  const navigate = useNavigate();
  const applicationsEnabled = hasFeature('clientApplications');
  const { overview, loading } = useKYCEligibility();
  const generateUploadUrl = useMutation(api.kycDocuments.generateUploadUrl);
  const recordDocument = useMutation(api.kycDocuments.recordDocument);
  const submitMyKyc = useMutation(api.kycDocuments.submitMyKyc);
  const requestDocumentAccess = useMutation(api.kycDocuments.requestDocumentAccess);
  const [uploadingDoc, setUploadingDoc] = useState<KycDocumentType | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [replacement, setReplacement] = useState<{
    documentType: KycDocumentType;
    file: File;
    previousStatus: DocumentViewItem['status'];
  } | null>(null);
  const [previewDocument, setPreviewDocument] = useState<DocumentViewItem | null>(null);
  const inputRefs = useRef<Partial<Record<KycDocumentType, HTMLInputElement | null>>>({});

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
  const requiredTypes = new Set(overview?.requiredDocumentTypes ?? []);
  const locked = overview?.status === 'submitted';

  if (!user) return <Navigate to="/auth" replace />;

  const handleTabChange = (tab: string) => {
    if (tab === 'documents') return;
    if (tab === 'budget') return navigate('/budget');
    navigate('/dashboard', { state: { tab } });
  };

  const uploadDocument = async (documentType: KycDocumentType, file: File) => {
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

    setUploadingDoc(documentType);
    setUploadProgress(0);
    try {
      const uploadUrl = await generateUploadUrl();
      const { storageId } = await uploadFileWithProgress(uploadUrl, file, setUploadProgress);
      await recordDocument({
        documentType,
        fileStorageId: storageId as Id<'_storage'>,
        fileName: file.name,
      });
      toast({
        title: documentByType.has(documentType) ? 'Replacement uploaded' : 'Document uploaded',
        description: 'The file is saved. Submit the completed package when you are ready.',
      });
    } catch {
      toast({
        title: 'Upload failed',
        description: 'The document could not be saved. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploadingDoc(null);
      setUploadProgress(0);
      if (inputRefs.current[documentType]) inputRefs.current[documentType]!.value = '';
    }
  };

  const handleFileSelection = (documentType: KycDocumentType, file?: File) => {
    if (!file) return;
    const currentDocument = documentByType.get(documentType);
    if (currentDocument) {
      setReplacement({ documentType, file, previousStatus: currentDocument.status });
      return;
    }
    void uploadDocument(documentType, file);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitMyKyc({});
      setSubmitConfirmOpen(false);
      toast({
        title: 'Documents submitted',
        description: 'Your KYC package is now waiting for staff review.',
      });
    } catch {
      toast({
        title: 'Submission failed',
        description: 'Check the required documents and try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const requestAccess = async (
    documentId: string,
    intent: 'preview' | 'download'
  ): Promise<DocumentAccessResult> =>
    requestDocumentAccess({ documentId: documentId as Id<'kycDocuments'>, intent });

  const renderCompletionActions = () => {
    if (overview?.status === 'verified') {
      return (
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <ThemedButton variant="outline" onClick={() => navigate('/dashboard')}>
            Back to dashboard
          </ThemedButton>
          {applicationsEnabled && (
            <ThemedButton onClick={() => navigate('/loan-application')}>
              Continue to loan application
            </ThemedButton>
          )}
        </div>
      );
    }
    if (overview?.status === 'submitted') {
      return (
        <div className="flex justify-end">
          <ThemedButton onClick={() => navigate('/dashboard')}>
            Done / Back to dashboard
          </ThemedButton>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Upload both required documents, then confirm the package for review.
        </p>
        <ThemedButton
          onClick={() => setSubmitConfirmOpen(true)}
          disabled={!overview?.canSubmit || Boolean(uploadingDoc)}
          data-testid="submit-kyc-button"
        >
          <Send className="mr-2 h-4 w-4" />
          {overview?.isResubmission ? 'Resubmit for review' : 'Submit for review'}
        </ThemedButton>
      </div>
    );
  };

  return (
    <DashboardLayout activeTab="documents" onTabChange={handleTabChange} title="KYC Documents">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className={cn('text-3xl font-bold', 'font-sans text-[#274F35]')}>KYC Documents</h1>
            {overview && (
              <Badge variant="outline" className="capitalize">
                {overview.status.replace(/_/g, ' ')}
              </Badge>
            )}
          </div>
          <p className="mt-2 text-muted-foreground">
            Your files remain visible here after upload, refresh, and sign-in on another device.
          </p>
        </div>

        {overview?.status === 'submitted' && (
          <div className="flex gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
            <ShieldCheck className="h-5 w-5 shrink-0 text-blue-500" />
            <div>
              <p className="font-medium text-foreground">Submitted for review</p>
              <p className="text-sm text-muted-foreground">
                Documents are locked while staff review them. You will receive a notification when
                the review is complete.
              </p>
            </div>
          </div>
        )}
        {overview?.status === 'verified' && (
          <div className="flex gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
            <div>
              <p className="font-medium text-foreground">Verification complete</p>
              <p className="text-sm text-muted-foreground">
                Your account is eligible to submit a loan application.
              </p>
            </div>
          </div>
        )}
        {overview?.status === 'rejected' && (
          <div className="flex gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="font-medium text-foreground">Replacement required</p>
              <p className="text-sm text-muted-foreground">
                Review the staff notes below and replace each rejected required document.
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {(Object.keys(DOCUMENT_CONFIG) as KycDocumentType[]).map((documentType) => {
              const config = DOCUMENT_CONFIG[documentType];
              const document = documentByType.get(documentType);
              const status = document ? statusPresentation(document.status) : null;
              const StatusIcon = status?.icon;
              const required = requiredTypes.has(documentType);
              return (
                <ThemedCard
                  key={documentType}
                  hoverEffect={false}
                  data-testid={`kyc-card-${documentType}`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <h2 className="font-semibold text-foreground">{config.label}</h2>
                        <Badge variant="secondary">{required ? 'Required' : 'Optional'}</Badge>
                        {status && StatusIcon && (
                          <Badge variant="outline" className={status.className}>
                            <StatusIcon className="mr-1 h-3.5 w-3.5" /> {status.label}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{config.description}</p>
                      {document && (
                        <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                          <p className="truncate font-medium text-foreground">
                            {document.fileName}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatBytes(document.fileSize)} · Version {document.version ?? 1} ·
                            Uploaded {formatUploadDate(document.createdAt)}
                          </p>
                          {document.reviewNotes && (
                            <p className="mt-2 text-xs text-destructive">
                              Review note: {document.reviewNotes}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {document && (
                        <Button
                          variant="outline"
                          onClick={() => setPreviewDocument(document)}
                          data-testid={`preview-${documentType}`}
                        >
                          <Eye className="mr-2 h-4 w-4" /> View
                        </Button>
                      )}
                      <div>
                        <ThemedInput
                          ref={(element) => {
                            inputRefs.current[documentType] = element;
                          }}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="sr-only"
                          disabled={locked || Boolean(uploadingDoc)}
                          onChange={(event) =>
                            handleFileSelection(documentType, event.target.files?.[0])
                          }
                          data-testid={`upload-${documentType}`}
                        />
                        <Button
                          type="button"
                          variant={document ? 'secondary' : 'default'}
                          disabled={locked || Boolean(uploadingDoc)}
                          onClick={() => inputRefs.current[documentType]?.click()}
                        >
                          {document ? (
                            <RefreshCw className="mr-2 h-4 w-4" />
                          ) : (
                            <Upload className="mr-2 h-4 w-4" />
                          )}
                          {document ? 'Replace' : 'Upload'}
                        </Button>
                      </div>
                    </div>
                  </div>
                  {uploadingDoc === documentType && (
                    <div className="mt-4 space-y-2" role="status">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Uploading securely…</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  )}
                </ThemedCard>
              );
            })}
          </div>
        )}

        <div className="sticky bottom-3 z-10 rounded-xl border border-border bg-background/95 p-4 shadow-lg backdrop-blur">
          {renderCompletionActions()}
        </div>
      </div>

      <AlertDialog open={submitConfirmOpen} onOpenChange={setSubmitConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {overview?.isResubmission
                ? 'Resubmit documents for review?'
                : 'Submit documents for review?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Confirm that the uploaded documents are correct. They will be locked until staff
              complete the review.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleSubmit();
              }}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Confirm and submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(replacement)}
        onOpenChange={(open) => !open && setReplacement(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {replacement?.previousStatus === 'approved'
                ? 'Replace an approved document?'
                : 'Replace this document?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              The existing version will remain in the compliance history. The replacement becomes
              the current version and must be reviewed again.
              {replacement?.previousStatus === 'approved' &&
                ' This reopens KYC verification and loan eligibility is paused until staff approve the replacement.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReplacement(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (!replacement) return;
                const next = replacement;
                setReplacement(null);
                void uploadDocument(next.documentType, next.file);
              }}
            >
              Upload replacement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DocumentPreviewDialog
        document={previewDocument}
        open={Boolean(previewDocument)}
        onOpenChange={(open) => !open && setPreviewDocument(null)}
        requestAccess={requestAccess}
      />
    </DashboardLayout>
  );
}
