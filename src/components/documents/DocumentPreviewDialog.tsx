import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  DocumentAccessIntent,
  DocumentAccessResult,
  DocumentViewItem,
} from '@/types/documents';
import { AlertCircle, Download, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface DocumentPreviewDialogProps {
  document: DocumentViewItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestAccess: (
    documentId: string,
    intent: DocumentAccessIntent
  ) => Promise<DocumentAccessResult>;
  /** Set when this preview is opened from another dialog so nested overlays stay clickable. */
  nested?: boolean;
}

function formatBytes(value?: number) {
  if (!value) return 'Size unavailable';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value?: number) {
  if (!value) return 'Upload date unavailable';
  return new Date(value).toLocaleDateString('en-NA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function DocumentPreviewDialog({
  document,
  open,
  onOpenChange,
  requestAccess,
  nested = false,
}: DocumentPreviewDialogProps) {
  const [access, setAccess] = useState<DocumentAccessResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deliberately NOT keyed on the `requestAccess` prop: every call site passes a fresh
  // arrow function per render, so depending on it re-fires the preview request — a
  // guarded MUTATION that writes audit + eventJournal rows — on every parent re-render
  // while the dialog is open (and reactive Convex queries re-render parents a lot).
  // The ref keeps the latest callback; the effect keys on what actually matters:
  // dialog open/closed and WHICH document is shown.
  const requestAccessRef = useRef(requestAccess);
  requestAccessRef.current = requestAccess;

  const documentId = document?.id ?? null;
  const fileAvailable = document?.fileAvailable ?? false;
  // Bumped by the "Try again" button to re-run the effect for the same document.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!open || !documentId || !fileAvailable) {
      setAccess(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const result = await requestAccessRef.current(documentId, 'preview');
        if (cancelled) return;
        setAccess(result);
        if (!result.url) setError('This stored file is no longer available.');
      } catch {
        if (!cancelled) setError('The document could not be opened. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, documentId, fileAvailable, reloadKey]);

  const handleDownload = async () => {
    if (!document) return;
    setLoading(true);
    setError(null);
    try {
      const result = await requestAccess(document.id, 'download');
      if (!result.url) {
        setError('This stored file is no longer available.');
        return;
      }
      const link = window.document.createElement('a');
      link.href = result.url;
      link.download = result.fileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
    } catch {
      setError('The document could not be downloaded. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async () => {
    if (!document) return;
    const target = window.open('', '_blank');
    if (target) target.opener = null;
    setLoading(true);
    setError(null);
    try {
      const result = await requestAccess(document.id, 'preview');
      if (!result.url) {
        target?.close();
        setError('This stored file is no longer available.');
        return;
      }
      if (target) target.location.href = result.url;
    } catch {
      target?.close();
      setError('The document could not be opened. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const mimeType = access?.mimeType ?? document?.mimeType ?? '';
  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={!nested}>
      <DialogContent className="pointer-events-auto z-[70] flex max-h-[min(92vh,900px)] max-w-5xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-5 py-4 pr-12">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="truncate text-base sm:text-lg">
              {document?.fileName ?? 'Document preview'}
            </DialogTitle>
            {document && (
              <Badge variant="outline" className="capitalize">
                {document.status}
              </Badge>
            )}
          </div>
          <DialogDescription>
            {document
              ? `${document.documentType.replace(/_/g, ' ')} · ${formatBytes(document.fileSize)} · Version ${document.version ?? 1} · ${formatDate(document.createdAt ?? document.uploadedAt)}`
              : 'Secure document preview'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto bg-muted/30 p-3 sm:p-5">
          {loading && !access ? (
            <div className="flex min-h-[360px] items-center justify-center" role="status">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !document?.fileAvailable || error ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 text-center">
              <AlertCircle className="h-10 w-10 text-amber-500" />
              <div>
                <p className="font-medium text-foreground">
                  {document?.fileAvailable ? 'Preview unavailable' : 'Legacy file unavailable'}
                </p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  {error ??
                    'This retained record does not have an associated storage file. Staff can request a replacement without deleting the history.'}
                </p>
              </div>
              {document?.fileAvailable && (
                <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
                  Try again
                </Button>
              )}
            </div>
          ) : access?.url && isImage ? (
            <img
              src={access.url}
              alt={`Preview of ${document.fileName}`}
              className="mx-auto max-h-[65vh] max-w-full rounded-lg border border-border bg-background object-contain"
            />
          ) : access?.url && isPdf ? (
            <iframe
              src={access.url}
              title={`Preview of ${document.fileName}`}
              className="h-[65vh] min-h-[420px] w-full rounded-lg border border-border bg-background"
            />
          ) : (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 text-center">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                An inline preview is not available for this file. Open or download it instead.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border bg-background px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {document?.reviewNotes && (
              <span>
                Review note: <span className="text-foreground">{document.reviewNotes}</span>
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {document?.fileAvailable && (
              <Button variant="outline" onClick={() => void handleOpen()} disabled={loading}>
                <ExternalLink className="mr-2 h-4 w-4" /> Open
              </Button>
            )}
            <Button
              onClick={() => void handleDownload()}
              disabled={!document?.fileAvailable || loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
