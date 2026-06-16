import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, ShieldCheck, User } from 'lucide-react';

interface OverviewSectionProps {
  profileCompletion: number;
  verifiedDocs: number;
  requiredDocs: number;
  isEligible: boolean;
}

export function OverviewSection({
  profileCompletion,
  verifiedDocs,
  requiredDocs,
  isEligible,
}: OverviewSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex items-center gap-3 mb-4 text-muted-foreground">
          <User className="h-5 w-5" />
          <span className="text-xs uppercase tracking-wider font-medium">Profile Status</span>
        </div>
        <div className="flex items-end gap-2 mb-2">
          <span className="text-3xl lg:text-4xl font-bold text-foreground tabular-nums tracking-tight">
            {profileCompletion}%
          </span>
          <span className="text-sm text-muted-foreground mb-1.5">complete</span>
        </div>
        <Progress
          value={profileCompletion}
          className="h-1.5 bg-muted"
          indicatorClassName="bg-blue-500"
        />
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex items-center gap-3 mb-4 text-muted-foreground">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-xs uppercase tracking-wider font-medium">Documents</span>
        </div>
        <div className="flex items-end gap-2 mb-2">
          <span className="text-3xl lg:text-4xl font-bold text-foreground tabular-nums tracking-tight">
            {verifiedDocs}
          </span>
          <span className="text-muted-foreground text-2xl font-light mb-0.5">/</span>
          <span className="text-2xl text-muted-foreground mb-0.5 tabular-nums">{requiredDocs}</span>
        </div>
        <p className="text-xs text-muted-foreground">Verified documents</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden group">
        <div
          className={cn(
            'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br',
            isEligible ? 'from-green-500/5' : 'from-yellow-500/5'
          )}
        />
        <div className="flex items-center gap-3 mb-4 text-muted-foreground">
          <CheckCircle className="h-5 w-5" />
          <span className="text-xs uppercase tracking-wider font-medium">Eligibility</span>
        </div>
        <div className="flex items-center gap-3 mt-2">
          {isEligible ? (
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20 shrink-0">
              <CheckCircle className="h-6 w-6 text-green-500 dark:text-green-400" />
            </div>
          ) : (
            <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 shrink-0">
              <AlertCircle className="h-6 w-6 text-yellow-500 dark:text-yellow-400" />
            </div>
          )}
          <div className="min-w-0">
            <p
              className={cn(
                'text-lg font-bold truncate',
                isEligible
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-yellow-600 dark:text-yellow-500'
              )}
            >
              {isEligible ? 'Eligible' : 'Ineligible'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {isEligible ? 'Ready for loan application' : 'Complete missing items'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
