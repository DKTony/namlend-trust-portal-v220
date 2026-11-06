/** Labels and styling for agreement lifecycle statuses — shared by staff and client UI. */

export type AgreementStatusValue =
  | 'pending_contract'
  | 'draft'
  | 'ready'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'archived'
  | 'superseded'
  | 'cancelled';

export const AGREEMENT_STATUS_LABEL: Record<AgreementStatusValue, string> = {
  pending_contract: 'Pending contract',
  draft: 'Draft — in preparation',
  ready: 'Ready for client',
  sent: 'Sent to client',
  viewed: 'Viewed by client',
  accepted: 'Accepted — finalizing',
  archived: 'Accepted & archived',
  superseded: 'Superseded',
  cancelled: 'Cancelled',
};

/** Tailwind classes using the theme's semantic tokens. */
export const AGREEMENT_STATUS_TONE: Record<AgreementStatusValue, string> = {
  pending_contract:
    'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-900',
  draft: 'bg-muted text-foreground border-border',
  ready: 'bg-accent text-accent-foreground border-border',
  sent: 'bg-primary/10 text-primary border-primary/30',
  viewed: 'bg-primary/10 text-primary border-primary/30',
  accepted: 'bg-success/15 text-success border-success/30',
  archived: 'bg-success text-success-foreground border-success',
  superseded: 'bg-muted text-muted-foreground border-border line-through',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/30',
};

/** The forward path, for the progress stepper. */
export const LIFECYCLE_STEPS: { status: AgreementStatusValue; label: string }[] = [
  { status: 'draft', label: 'Prepare' },
  { status: 'ready', label: 'Finalize' },
  { status: 'sent', label: 'Send' },
  { status: 'viewed', label: 'Client views' },
  { status: 'accepted', label: 'Client accepts' },
  { status: 'archived', label: 'Archived' },
];

export function stepIndex(status: AgreementStatusValue): number {
  return LIFECYCLE_STEPS.findIndex((s) => s.status === status);
}
