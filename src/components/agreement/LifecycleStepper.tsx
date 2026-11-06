import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { LIFECYCLE_STEPS, stepIndex, type AgreementStatusValue } from './agreementStatus';

/** Forward progress of an agreement. Superseded/cancelled are shown by the status badge instead. */
export function LifecycleStepper({ status }: { status: AgreementStatusValue }) {
  const at = stepIndex(status);
  if (at < 0) return null;
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2" aria-label="Agreement progress">
      {LIFECYCLE_STEPS.map((step, i) => {
        // Steps are actions; reaching a status completes its step and the NEXT one is
        // what the agreement is waiting on (e.g. 'sent' → waiting for the client to view).
        // A draft is still being prepared, so its own step is the current one.
        const completedThrough = status === 'draft' ? -1 : at;
        const done = i <= completedThrough;
        const current = i === completedThrough + 1;
        return (
          <li key={step.status} className="flex items-center gap-1">
            <span
              aria-current={current ? 'step' : undefined}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
                done && 'border-primary bg-primary text-primary-foreground',
                current && 'border-primary bg-primary/10 text-primary',
                !done && !current && 'border-border text-muted-foreground'
              )}
            >
              {done ? (
                <Check className="h-3 w-3" aria-hidden />
              ) : (
                <span className="tabular-nums">{i + 1}</span>
              )}
              {step.label}
            </span>
            {i < LIFECYCLE_STEPS.length - 1 && <span className="h-px w-3 bg-border" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
