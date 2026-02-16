/**
 * Loan Status Timeline Component
 * Shows the current status of a loan application with visual progress
 */

import { CheckCircle, Clock, XCircle, AlertCircle, Banknote, FileCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TimelineStep {
  status: string;
  label: string;
  date?: string;
  description?: string;
  complete: boolean;
  current?: boolean;
  rejected?: boolean;
}

interface LoanStatusTimelineProps {
  steps: TimelineStep[];
  className?: string;
  orientation?: 'vertical' | 'horizontal';
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  submitted: FileCheck,
  under_review: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  disbursed: Banknote,
  active: AlertCircle,
  completed: CheckCircle,
};

const getStatusIcon = (status: string, complete: boolean, current: boolean, rejected?: boolean) => {
  if (rejected) return XCircle;
  if (complete) return CheckCircle;
  if (current) return Clock;
  return STATUS_ICONS[status] || Clock;
};

export function LoanStatusTimeline({
  steps,
  className,
  orientation = 'vertical',
}: LoanStatusTimelineProps) {
  if (orientation === 'horizontal') {
    return (
      <div className={cn('w-full', className)}>
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = getStatusIcon(step.status, step.complete, !!step.current, step.rejected);
            const isLast = index === steps.length - 1;

            return (
              <div key={step.status} className="flex-1 flex flex-col items-center relative">
                {/* Connector line */}
                {!isLast && (
                  <div
                    className={cn(
                      'absolute top-4 left-1/2 w-full h-0.5',
                      step.complete
                        ? 'bg-[hsl(var(--status-approved))]'
                        : 'bg-gray-200 dark:bg-gray-800'
                    )}
                  />
                )}

                {/* Icon */}
                <div
                  className={cn(
                    'relative z-10 w-8 h-8 rounded-full flex items-center justify-center',
                    step.rejected && 'bg-[hsl(var(--status-rejected))] text-white',
                    step.complete &&
                      !step.rejected &&
                      'bg-[hsl(var(--status-approved))] text-white',
                    step.current &&
                      !step.rejected &&
                      'bg-[hsl(var(--status-pending))] text-white animate-pulse',
                    !step.complete &&
                      !step.current &&
                      !step.rejected &&
                      'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Label */}
                <div className="mt-2 text-center px-1 min-w-0">
                  <div
                    className={cn(
                      'text-[10px] sm:text-xs font-medium truncate',
                      step.current && 'text-[hsl(var(--status-pending))]',
                      step.complete && 'text-[hsl(var(--status-approved))]',
                      step.rejected && 'text-[hsl(var(--status-rejected))]'
                    )}
                  >
                    {step.label}
                  </div>
                  {step.date && (
                    <div className="text-xs text-muted-foreground mt-0.5">{step.date}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Vertical orientation (default)
  return (
    <div className={cn('py-4', className)}>
      {steps.map((step, index) => {
        const Icon = getStatusIcon(step.status, step.complete, !!step.current, step.rejected);
        const isLast = index === steps.length - 1;

        return (
          <div key={step.status} className="flex items-start mb-4 last:mb-0">
            {/* Status Icon and Connector */}
            <div className="flex flex-col items-center mr-4">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-all duration-300',
                  step.rejected && 'bg-[hsl(var(--status-rejected))] text-white',
                  step.complete && !step.rejected && 'bg-[hsl(var(--status-approved))] text-white',
                  step.current &&
                    !step.rejected &&
                    'bg-[hsl(var(--status-pending))] text-white animate-pulse shadow-md',
                  !step.complete &&
                    !step.current &&
                    !step.rejected &&
                    'bg-gray-100 text-gray-400 border-2 border-gray-200'
                )}
              >
                <Icon className="w-5 h-5" />
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div
                  className={cn(
                    'w-0.5 h-12 transition-colors duration-300',
                    step.complete ? 'bg-[hsl(var(--status-approved))]' : 'bg-gray-200'
                  )}
                />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pt-1 pb-2">
              <div
                className={cn(
                  'font-medium text-sm',
                  step.current && 'text-[hsl(var(--status-pending))]',
                  step.complete && !step.rejected && 'text-foreground',
                  step.rejected && 'text-[hsl(var(--status-rejected))]',
                  !step.complete && !step.current && 'text-muted-foreground'
                )}
              >
                {step.label}
                {step.current && (
                  <span className="ml-2 text-xs bg-[hsl(var(--status-pending-bg))] text-[hsl(var(--status-pending))] px-2 py-0.5 rounded-full">
                    In Progress
                  </span>
                )}
              </div>

              {step.date && <div className="text-xs text-muted-foreground mt-1">{step.date}</div>}

              {step.description && (
                <div
                  className={cn(
                    'text-sm mt-1',
                    step.rejected ? 'text-[hsl(var(--status-rejected))]' : 'text-muted-foreground'
                  )}
                >
                  {step.description}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Helper function to generate timeline steps from loan status
export function generateLoanTimeline(
  status: string,
  submittedAt?: string,
  reviewedAt?: string,
  approvedAt?: string,
  disbursedAt?: string,
  rejectionReason?: string
): TimelineStep[] {
  const formatDate = (date?: string) => {
    if (!date) return undefined;
    return new Date(date).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isRejected = status === 'rejected';
  const statusOrder = ['submitted', 'under_review', 'approved', 'disbursed'];
  const currentIndex = statusOrder.indexOf(status);

  const steps: TimelineStep[] = [
    {
      status: 'submitted',
      label: 'Application Submitted',
      date: formatDate(submittedAt),
      description: 'Your loan application has been received',
      complete: true,
      current: false,
    },
    {
      status: 'under_review',
      label: 'Under Review',
      date: formatDate(reviewedAt),
      description: isRejected
        ? rejectionReason || 'Application was not approved'
        : 'Our team is reviewing your application',
      complete: currentIndex >= 1 || isRejected,
      current: currentIndex === 1 && !isRejected,
      rejected: isRejected,
    },
    {
      status: 'approved',
      label: 'Approved',
      date: formatDate(approvedAt),
      description: 'Your loan has been approved',
      complete: currentIndex >= 2 && !isRejected,
      current: currentIndex === 2 && !isRejected,
      rejected: false,
    },
    {
      status: 'disbursed',
      label: 'Disbursed',
      date: formatDate(disbursedAt),
      description: 'Funds have been sent to your account',
      complete: currentIndex >= 3 && !isRejected,
      current: currentIndex === 3 && !isRejected,
      rejected: false,
    },
  ];

  // If rejected, only show up to under_review
  if (isRejected) {
    return steps.slice(0, 2);
  }

  return steps;
}

export default LoanStatusTimeline;
