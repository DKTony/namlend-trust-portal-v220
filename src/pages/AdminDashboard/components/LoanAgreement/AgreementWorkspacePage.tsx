/**
 * Contract Preparation — the screen an administrator lands on immediately after
 * approving a loan (spec §3 step 2), and the "View contract" target from the loans
 * register and the loan details screen.
 */

import { AgreementDocument } from '@/components/agreement/AgreementDocument';
import {
  AGREEMENT_STATUS_LABEL,
  AGREEMENT_STATUS_TONE,
  type AgreementStatusValue,
} from '@/components/agreement/agreementStatus';
import { convexErrorIssues } from '@/components/agreement/errors';
import { LifecycleStepper } from '@/components/agreement/LifecycleStepper';
import { useAgreementPdf } from '@/components/agreement/useAgreementPdf';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/convex/api';
import { handleMutationError } from '@/lib/mutationError';
import { cn } from '@/lib/utils';
import { formatNAD } from '@/utils/currency';
import { useMutation, useQuery } from 'convex/react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  FilePen,
  FileSignature,
  History,
  Loader2,
  Printer,
  RefreshCw,
  Save,
  Send,
  Settings,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Id } from '../../../../../convex/_generated/dataModel';
import type { ReadinessIssue } from '../../../../../convex/lib/agreement/merge';
import { BorrowerDetailsDialog } from './BorrowerDetailsDialog';
import { ReasonDialog } from './ReasonDialog';

const CATEGORY_LABEL: Record<ReadinessIssue['category'], string> = {
  application: 'Borrower details (client records)',
  contract: 'Contract details',
  loan: 'Loan terms and calculations',
  company: 'Company information and pricing',
  template: 'Standard Terms',
};

export default function AgreementWorkspacePage() {
  const { loanId } = useParams<{ loanId: string }>();
  const data = useQuery(
    api.loanAgreements.getWorkspace,
    loanId ? { loanId: loanId as Id<'loans'> } : 'skip'
  );
  const { toast } = useToast();
  const openPdf = useAgreementPdf();
  const generate = useMutation(api.loanAgreements.generateForLoan);
  const saveDraft = useMutation(api.loanAgreements.saveDraft);
  const finalize = useMutation(api.loanAgreements.finalize);
  const send = useMutation(api.loanAgreements.send);
  const revise = useMutation(api.loanAgreements.revise);
  const cancel = useMutation(api.loanAgreements.cancel);
  const retry = useMutation(api.loanAgreements.retryRender);

  const [busy, setBusy] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirm, setConfirm] = useState<'finalize' | 'send' | null>(null);
  const [reason, setReason] = useState<'revise' | 'cancel' | null>(null);
  const [blockers, setBlockers] = useState<string[]>([]);
  const [firstRepaymentDate, setFirstRepaymentDate] = useState('');
  const [placeOfSigning, setPlaceOfSigning] = useState('');

  const agreement = data?.agreement ?? null;
  useEffect(() => {
    setFirstRepaymentDate(agreement?.firstRepaymentDate ?? '');
    setPlaceOfSigning(agreement?.placeOfSigning ?? '');
  }, [agreement?._id, agreement?.firstRepaymentDate, agreement?.placeOfSigning]);

  const run = async (key: string, fn: () => Promise<unknown>, success: string) => {
    setBusy(key);
    setBlockers([]);
    try {
      await fn();
      toast({ title: success });
    } catch (error) {
      setBlockers(convexErrorIssues(error));
      toast({
        title: 'Action not completed',
        description: handleMutationError(error, 'Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  if (data === undefined) {
    return (
      <div className="flex items-center justify-center py-24" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="sr-only">Loading agreement…</span>
      </div>
    );
  }

  const { loan, view, template, history, drift } = data;
  const title = agreement ? `Loan Agreement ${agreement.agreementNumber}` : 'Loan Agreement';
  const subtitle = [
    loan.applicantName,
    loan.loanNumber && `Loan ${loan.loanNumber}`,
    formatNAD(loan.principal),
    `${loan.termMonths} month(s) at ${loan.interestRate}% p.a.`,
  ]
    .filter(Boolean)
    .join(' · ');

  if (!agreement) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={title}
          description={subtitle}
          backLink="/admin/loans"
          icon={<FileSignature className="h-6 w-6" />}
        />
        <Card>
          <CardContent className="flex flex-col items-start gap-4 p-6">
            <p className="text-muted-foreground">
              {loan.status === 'approved'
                ? 'This approved loan does not have an agreement yet — it was approved before agreements were generated automatically.'
                : `Agreements are prepared for approved loans. This loan is '${loan.status}'.`}
            </p>
            {loan.status === 'approved' && (
              <Button
                disabled={busy !== null}
                onClick={() =>
                  run('generate', () => generate({ loanId: loan._id }), 'Agreement generated')
                }
              >
                {busy === 'generate' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FilePen className="mr-2 h-4 w-4" />
                )}
                Generate agreement
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = agreement.status as AgreementStatusValue;
  const isDraft = status === 'draft';
  const pdfReady = agreement.pdfStatus === 'ready';
  const issues = (view?.issues ?? []) as ReadinessIssue[];
  const blocking = issues.filter((i) => i.blocking);
  const warnings = issues.filter((i) => !i.blocking);
  const borrowerMissing = blocking.some((i) => i.category === 'application');
  const draftDirty =
    isDraft &&
    (firstRepaymentDate !== (agreement.firstRepaymentDate ?? '') ||
      placeOfSigning !== (agreement.placeOfSigning ?? ''));
  const canRevise =
    !['draft', 'superseded', 'cancelled'].includes(status) && loan.status === 'approved';
  const canCancel = ['draft', 'ready', 'sent', 'viewed'].includes(status);
  const tomorrow = new Date(Date.now() + 2 * 3600_000 + 86_400_000).toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={subtitle}
        backLink="/admin/loans"
        icon={<FileSignature className="h-6 w-6" />}
        actions={
          <Badge variant="outline" className={cn('text-sm', AGREEMENT_STATUS_TONE[status])}>
            {AGREEMENT_STATUS_LABEL[status]}
          </Badge>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <LifecycleStepper status={status} />
          <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Agreement actions">
            {isDraft && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setDetailsOpen(true)}
                  disabled={!data.borrowerSource}
                >
                  <FilePen className="mr-2 h-4 w-4" />
                  Edit missing fields
                  {borrowerMissing && (
                    <span
                      className="ml-2 h-2 w-2 rounded-full bg-amber-500"
                      aria-label="fields missing"
                    />
                  )}
                </Button>
                <Button
                  onClick={() => setConfirm('finalize')}
                  disabled={busy !== null || blocking.length > 0 || draftDirty}
                  title={
                    blocking.length
                      ? 'Resolve the readiness issues first'
                      : draftDirty
                        ? 'Save the draft first'
                        : undefined
                  }
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Finalize contract
                </Button>
              </>
            )}
            {!isDraft && (
              <>
                <Button
                  variant="outline"
                  disabled={!pdfReady}
                  onClick={() => openPdf(agreement._id, 'view')}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View PDF
                </Button>
                <Button
                  variant="outline"
                  disabled={!pdfReady}
                  onClick={() => openPdf(agreement._id, 'print')}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
                <Button
                  variant="outline"
                  disabled={!pdfReady}
                  onClick={() => openPdf(agreement._id, 'download')}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </>
            )}
            {status === 'ready' && (
              <Button
                onClick={() => setConfirm('send')}
                disabled={!pdfReady || busy !== null || drift.length > 0}
              >
                <Send className="mr-2 h-4 w-4" />
                Send to client
              </Button>
            )}
            {status === 'archived' && agreement.executedPdfStorageId && (
              <Button
                variant="outline"
                onClick={() => openPdf(agreement._id, 'download', 'executed')}
              >
                <Download className="mr-2 h-4 w-4" />
                Signed copy
              </Button>
            )}
            {agreement.pdfStatus === 'failed' && (
              <Button
                variant="outline"
                onClick={() =>
                  run(
                    'retry',
                    () => retry({ agreementId: agreement._id }),
                    'PDF generation restarted'
                  )
                }
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry PDF
              </Button>
            )}
            {canRevise && (
              <Button variant="outline" onClick={() => setReason('revise')}>
                <History className="mr-2 h-4 w-4" />
                Create revised version
              </Button>
            )}
            {canCancel && (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => setReason('cancel')}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancel agreement
              </Button>
            )}
          </div>
          {status === 'ready' && !pdfReady && agreement.pdfStatus !== 'failed' && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <Loader2 className="h-4 w-4 animate-spin" /> Generating the print-ready PDF…
            </p>
          )}
          {agreement.pdfStatus === 'failed' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>PDF generation failed</AlertTitle>
              <AlertDescription>
                {agreement.pdfError ?? 'Unknown error.'} Retry, or contact support if it persists.
              </AlertDescription>
            </Alert>
          )}
          {blockers.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Not completed</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5">
                  {blockers.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {drift.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Source records changed after this agreement was finalized</AlertTitle>
          <AlertDescription>
            Changed: {drift.join(', ')}. The agreement still shows the values that were frozen. If
            the change is legally relevant, create a revised version.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          {view && (
            <AgreementDocument
              template={template?.content ?? null}
              fields={view.fields}
              schedule={view.schedule}
              totals={view.totals}
              agreementNumber={agreement.agreementNumber}
              templateVersion={agreement.templateVersion ?? template?.version}
              highlightMissing={isDraft}
              acceptance={agreement.acceptance ?? null}
            />
          )}
        </div>

        <aside className="space-y-4">
          {isDraft && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Readiness</CardTitle>
                <CardDescription>
                  {blocking.length === 0
                    ? 'Everything required is in place.'
                    : `${blocking.length} issue(s) block finalization.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {blocking.length === 0 && (
                  <p className="flex items-center gap-2 text-sm text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    Ready to finalize
                  </p>
                )}
                {(Object.keys(CATEGORY_LABEL) as ReadinessIssue['category'][]).map((cat) => {
                  const group = blocking.filter((i) => i.category === cat);
                  if (!group.length) return null;
                  return (
                    <div key={cat} className="space-y-1.5">
                      <p className="text-sm font-medium">{CATEGORY_LABEL[cat]}</p>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {group.map((i) => (
                          <li key={i.message} className="flex gap-2">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                            {i.message}
                          </li>
                        ))}
                      </ul>
                      {cat === 'application' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDetailsOpen(true)}
                          disabled={!data.borrowerSource}
                        >
                          Complete borrower details
                        </Button>
                      )}
                      {(cat === 'company' || cat === 'template') && (
                        <Button size="sm" variant="outline" asChild>
                          <Link to="/admin/settings/loan-agreement">
                            <Settings className="mr-2 h-3.5 w-3.5" />
                            Open agreement settings
                          </Link>
                        </Button>
                      )}
                    </div>
                  );
                })}
                {warnings.map((w) => (
                  <p key={w.message} className="text-xs text-muted-foreground">
                    Note: {w.message}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

          {isDraft && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Contract details</CardTitle>
                <CardDescription>
                  Set while preparing. The repayment schedule is anchored to the first repayment
                  date.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="first-repayment">First repayment date</Label>
                  <Input
                    id="first-repayment"
                    type="date"
                    min={tomorrow}
                    value={firstRepaymentDate}
                    onChange={(e) => setFirstRepaymentDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="place">Place of signing (optional)</Label>
                  <Input
                    id="place"
                    value={placeOfSigning}
                    maxLength={80}
                    placeholder="Confirmed by the borrower on acceptance"
                    onChange={(e) => setPlaceOfSigning(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={!draftDirty || busy !== null}
                  onClick={() =>
                    run(
                      'save',
                      () =>
                        saveDraft({
                          agreementId: agreement._id,
                          firstRepaymentDate: firstRepaymentDate || undefined,
                          placeOfSigning,
                        }),
                      'Draft saved'
                    )
                  }
                >
                  {busy === 'save' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save draft
                </Button>
              </CardContent>
            </Card>
          )}

          {agreement.acceptance && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Acceptance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Accepted by:</span>{' '}
                  {agreement.acceptance.typedName}
                </p>
                <p>
                  <span className="text-muted-foreground">At:</span>{' '}
                  {new Date(agreement.acceptance.acceptedAt).toLocaleString('en-NA', {
                    timeZone: 'Africa/Windhoek',
                  })}
                </p>
                <p>
                  <span className="text-muted-foreground">Place:</span>{' '}
                  {agreement.acceptance.placeOfSigning}
                </p>
                <p className="break-all text-xs text-muted-foreground">
                  Document SHA-256: {agreement.acceptance.documentSha256}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Version history</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {history.map((h) => (
                  <li key={h._id} className="flex items-start justify-between gap-2 text-sm">
                    <span>
                      <span className="font-medium">v{h.version}</span>{' '}
                      <span className="text-muted-foreground">
                        {new Date(h.createdAt).toLocaleDateString('en-NA')}
                      </span>
                      {h.cancelReason && (
                        <span className="block text-xs text-muted-foreground">
                          {h.cancelReason}
                        </span>
                      )}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'shrink-0 text-xs',
                        AGREEMENT_STATUS_TONE[h.status as AgreementStatusValue]
                      )}
                    >
                      {AGREEMENT_STATUS_LABEL[h.status as AgreementStatusValue]}
                    </Badge>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </aside>
      </div>

      {data.borrowerSource && view && (
        <BorrowerDetailsDialog
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          loanId={loan._id}
          fields={view.fields}
          source={data.borrowerSource}
          fullName={loan.applicantName}
        />
      )}

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === 'finalize'
                ? 'Finalize this agreement?'
                : 'Send the agreement to the client?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === 'finalize'
                ? 'The content is locked and a print-ready PDF is generated and fingerprinted. Any later change needs a revised version.'
                : `${loan.applicantName ?? 'The client'} will be notified in the app and can review and accept the agreement from their account.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const which = confirm;
                setConfirm(null);
                if (which === 'finalize')
                  void run(
                    'finalize',
                    () => finalize({ agreementId: agreement._id }),
                    'Agreement finalized'
                  );
                if (which === 'send')
                  void run(
                    'send',
                    () => send({ agreementId: agreement._id }),
                    'Agreement sent to the client'
                  );
              }}
            >
              {confirm === 'finalize' ? 'Finalize' : 'Send'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReasonDialog
        open={reason === 'revise'}
        onOpenChange={(o) => !o && setReason(null)}
        title="Create a revised version"
        description="This version is kept but marked superseded, and a new draft is created from the current records. The client must accept the new version."
        confirmLabel="Create revision"
        onConfirm={(r) =>
          run(
            'revise',
            () => revise({ agreementId: agreement._id, reason: r }),
            'Revised draft created'
          )
        }
      />
      <ReasonDialog
        open={reason === 'cancel'}
        onOpenChange={(o) => !o && setReason(null)}
        title="Cancel this agreement"
        description="The agreement is withdrawn and the client can no longer accept it. It stays on record."
        confirmLabel="Cancel agreement"
        destructive
        onConfirm={(r) =>
          run(
            'cancel',
            () => cancel({ agreementId: agreement._id, reason: r }),
            'Agreement cancelled'
          )
        }
      />
    </div>
  );
}
