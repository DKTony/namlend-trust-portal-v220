import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ThemedBadge } from '@/components/ui/ThemedBadge';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { cn } from '@/lib/utils';
import { formatNAD } from '@/utils/currency';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Percent,
  ShieldCheck,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { KycReviewPanel } from './KycReviewPanel';
import {
  type ApprovalRequest,
  formatDti,
  formatRequestTypeLabel,
  getApprovalDialogTitle,
  getCreditScoreBand,
  getRecommendationConfig,
  isKycRequestType,
  isLoanRequestType,
  listMetadataRows,
  parseLoanApprovalFields,
} from './approvalRequestView';

interface ApprovalRequestDialogProps {
  request: ApprovalRequest | null;
  open: boolean;
  onClose: () => void;
  reviewNotes: string;
  onReviewNotesChange: (value: string) => void;
  processing: boolean;
  onApprove: () => void;
  onReject: () => void;
  onEscalate: () => void;
  onKycComplete: () => void;
  statusBadge: ReactNode;
  priorityBadge: ReactNode;
}

function displayValue(value: string | number | null | undefined, fallback = '—'): string {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function LoanReviewBody({ request }: { request: ApprovalRequest }) {
  const fields = parseLoanApprovalFields(request.request_data);
  const creditBand = fields.creditScore !== null ? getCreditScoreBand(fields.creditScore) : null;
  const recommendation =
    fields.recommendation !== null ? getRecommendationConfig(fields.recommendation) : null;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ThemedCard hoverEffect={false} className="p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Principal</span>
          </div>
          <p className="font-sans text-3xl font-bold tracking-tight text-[#274F35]">
            {fields.amount !== null ? formatNAD(fields.amount) : '—'}
          </p>
        </ThemedCard>
        <ThemedCard hoverEffect={false} className="p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Monthly</span>
          </div>
          <p className="text-3xl font-bold tracking-tight text-primary">
            {fields.monthlyPayment !== null ? formatNAD(fields.monthlyPayment) : '—'}
          </p>
        </ThemedCard>
      </div>

      <div>
        <h3 className="mb-4 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          <FileText className="h-4 w-4" />
          Contract Terms
        </h3>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
          {[
            {
              label: 'Term',
              value: fields.termMonths !== null ? `${fields.termMonths} mo` : '—',
              icon: Calendar,
            },
            {
              label: 'Rate',
              value: fields.interestRate !== null ? `${fields.interestRate}%` : '—',
              icon: Percent,
            },
            {
              label: 'DTI',
              value: fields.dti !== null ? formatDti(fields.dti) : '—',
              icon: TrendingUp,
            },
            {
              label: 'Recommendation',
              value: recommendation?.label ?? '—',
              icon: ShieldCheck,
            },
          ].map((item) => (
            <div key={item.label} className="bg-card p-4">
              <div className="mb-1.5 flex items-center gap-2 text-muted-foreground">
                <item.icon className="h-3.5 w-3.5" />
                <span className="text-[10px] font-medium uppercase tracking-wider">
                  {item.label}
                </span>
              </div>
              {item.label === 'Recommendation' && recommendation ? (
                <ThemedBadge className={cn('px-2.5 py-0.5', recommendation.className)}>
                  {recommendation.label}
                </ThemedBadge>
              ) : (
                <p className="font-sans text-sm font-semibold text-[#274F35]">{item.value}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ThemedCard hoverEffect={false} className="p-1">
          <div className="flex items-center justify-between rounded-xl p-3">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Credit Score
            </span>
            <div className="flex items-center gap-2">
              <span className="font-sans text-sm font-medium text-[#274F35]">
                {displayValue(fields.creditScore)}
              </span>
              {creditBand && (
                <span className={cn('text-xs font-medium', creditBand.className)}>
                  {creditBand.label}
                </span>
              )}
            </div>
          </div>
        </ThemedCard>
        <ThemedCard hoverEffect={false} className="p-1">
          <div className="flex items-center justify-between rounded-xl p-3">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Submitted
            </span>
            <span className="text-sm font-medium text-[#274F35]">
              {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
            </span>
          </div>
        </ThemedCard>
      </div>
    </div>
  );
}

function GenericRequestBody({ request }: { request: ApprovalRequest }) {
  const rows = listMetadataRows(request.request_data);

  if (rows.length === 0) {
    return (
      <ThemedCard hoverEffect={false} className="p-6 text-center text-sm text-muted-foreground">
        No additional request fields were provided for this item.
      </ThemedCard>
    );
  }

  return (
    <ThemedCard hoverEffect={false} className="p-1">
      {rows.map((row) => (
        <div
          key={row.key}
          className="flex items-start justify-between gap-4 rounded-xl p-3 hover:bg-accent/50"
        >
          <span className="text-sm text-muted-foreground">{row.label}</span>
          <span className="max-w-[60%] text-right font-sans text-sm font-medium text-[#274F35]">
            {row.value}
          </span>
        </div>
      ))}
    </ThemedCard>
  );
}

export function ApprovalRequestDialog({
  request,
  open,
  onClose,
  reviewNotes,
  onReviewNotesChange,
  processing,
  onApprove,
  onReject,
  onEscalate,
  onKycComplete,
  statusBadge,
  priorityBadge,
}: ApprovalRequestDialogProps) {
  const isKyc = request ? isKycRequestType(request.request_type) : false;
  const isLoan = request ? isLoanRequestType(request.request_type) : false;
  const canAct = request !== null && request.status !== 'approved' && request.status !== 'rejected';

  return (
    <Dialog
      open={open && request !== null}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        data-testid="approvals-review-dialog"
        className={cn(
          'gap-0 overflow-y-auto p-0 border-border',
          'rounded-2xl border border-[#DCE8D8] bg-white shadow-[0_12px_32px_rgba(39,79,53,0.06)]',
          isKyc
            ? 'max-w-5xl max-h-[min(90vh,calc(100dvh-2rem))]'
            : 'max-w-3xl max-h-[min(90vh,calc(100dvh-2rem))]'
        )}
      >
        {request && (
          <>
            <DialogHeader className="sticky top-0 z-10 border-b border-border bg-background/95 p-6 backdrop-blur-xl">
              <div className="mb-2 flex items-start justify-between gap-3 pr-8">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10">
                    {isLoan ? (
                      <DollarSign className="h-5 w-5 text-blue-500" />
                    ) : (
                      <FileText className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="font-sans text-xl font-bold tracking-tight text-[#274F35]">
                      {getApprovalDialogTitle(request.request_type)}
                    </DialogTitle>
                    <DialogDescription>Review and take action</DialogDescription>
                    <p className="mt-0.5 truncate font-mono text-sm text-muted-foreground">
                      #{request.entity_id.slice(-12) || request.id.slice(-12)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">{statusBadge}</div>
              </div>
            </DialogHeader>

            <div className="space-y-6 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Type</Label>
                  <p className="font-medium">{formatRequestTypeLabel(request.request_type)}</p>
                </div>
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Priority</Label>
                  <div className="mt-1">{priorityBadge}</div>
                </div>
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Submitted</Label>
                  <p className="text-sm">
                    {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Entity ID</Label>
                  <p className="truncate font-mono text-sm font-medium" title={request.entity_id}>
                    {request.entity_id}
                  </p>
                </div>
              </div>

              {isKyc ? (
                <KycReviewPanel
                  userId={request.requested_by}
                  requestId={request.id}
                  readOnly={!canAct}
                  onComplete={onKycComplete}
                />
              ) : isLoan ? (
                <LoanReviewBody request={request} />
              ) : (
                <GenericRequestBody request={request} />
              )}

              {!isKyc && (
                <>
                  {request.reviewer_notes && (
                    <div>
                      <Label className="text-xs uppercase text-muted-foreground">
                        Previous notes
                      </Label>
                      <p className="mt-1 text-sm">{request.reviewer_notes}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="review-notes">Review Notes</Label>
                    <Textarea
                      id="review-notes"
                      placeholder="Add your review notes..."
                      value={reviewNotes}
                      onChange={(event) => onReviewNotesChange(event.target.value)}
                      rows={3}
                    />
                  </div>

                  {canAct ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        onClick={onApprove}
                        disabled={processing}
                        className="w-full flex-1"
                        data-testid="approvals-approve-btn"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={onReject}
                        disabled={processing}
                        className="w-full flex-1"
                        data-testid="approvals-reject-btn"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        variant="outline"
                        onClick={onEscalate}
                        disabled={processing}
                        className="w-full sm:w-auto"
                        data-testid="approvals-requestinfo-btn"
                      >
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Escalate
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="rounded-lg bg-muted p-3 text-center text-sm text-muted-foreground"
                      data-testid="approvals-processed-state"
                    >
                      <CheckCircle className="mx-auto mb-1 h-5 w-5 text-green-500" />
                      This request has been {request.status}. No further action required.
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ApprovalRequestDialog;
