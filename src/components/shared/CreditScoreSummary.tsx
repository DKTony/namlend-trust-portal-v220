/**
 * Lightweight credit score summary — displays server-side scoring results
 * from the loan record (creditScore, debtToIncomeRatio, recommendation).
 *
 * Unlike CreditScoreDisplay.tsx (which requires full CreditFactors input),
 * this component works directly with the data stored on the loan document.
 */

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface CreditScoreSummaryProps {
  creditScore?: number | null;
  debtToIncomeRatio?: number | null;
  recommendation?: 'approve' | 'review' | 'reject' | null;
  compact?: boolean;
}

const SCORE_RANGES = [
  { min: 750, label: 'Excellent', color: 'text-emerald-400' },
  { min: 670, label: 'Good', color: 'text-sky-400' },
  { min: 580, label: 'Fair', color: 'text-amber-400' },
  { min: 0, label: 'Poor', color: 'text-red-400' },
] as const;

const RECOMMENDATION_CONFIG = {
  approve: {
    label: 'Approve',
    variant: 'default' as const,
    className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  review: {
    label: 'Manual Review',
    variant: 'default' as const,
    className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  reject: {
    label: 'Reject',
    variant: 'default' as const,
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
} as const;

function getScoreInfo(score: number) {
  return SCORE_RANGES.find((r) => score >= r.min) ?? SCORE_RANGES[SCORE_RANGES.length - 1];
}

export function CreditScoreSummary({
  creditScore,
  debtToIncomeRatio,
  recommendation,
  compact,
}: CreditScoreSummaryProps) {
  if (creditScore == null) {
    return <div className="text-sm text-zinc-500">Credit score not yet available</div>;
  }

  const scoreInfo = getScoreInfo(creditScore);
  const scorePercent = Math.round(((creditScore - 300) / 550) * 100); // 300-850 range

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <span className={`text-lg font-bold ${scoreInfo.color}`}>{creditScore}</span>
        <span className="text-xs text-zinc-500">{scoreInfo.label}</span>
        {recommendation && (
          <Badge className={RECOMMENDATION_CONFIG[recommendation].className}>
            {RECOMMENDATION_CONFIG[recommendation].label}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className={`text-2xl font-bold ${scoreInfo.color}`}>{creditScore}</span>
          <span className="text-sm text-zinc-500 ml-2">{scoreInfo.label}</span>
        </div>
        {recommendation && (
          <Badge className={RECOMMENDATION_CONFIG[recommendation].className}>
            {RECOMMENDATION_CONFIG[recommendation].label}
          </Badge>
        )}
      </div>
      <Progress value={scorePercent} className="h-2" />
      <div className="flex justify-between text-xs text-zinc-500">
        <span>300</span>
        <span>850</span>
      </div>
      {debtToIncomeRatio != null && (
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Debt-to-Income Ratio</span>
          <span className={debtToIncomeRatio > 0.4 ? 'text-amber-400' : 'text-zinc-300'}>
            {(debtToIncomeRatio * 100).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}
