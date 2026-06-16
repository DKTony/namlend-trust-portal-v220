import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { formatNAD } from '@/utils/currency';
import {
  ChevronRight,
  CreditCard,
  DollarSign,
  FileText,
  History,
  MessageSquare,
  Phone,
  TrendingUp,
  User,
} from 'lucide-react';

interface OverviewTabProps {
  loan: {
    purpose: string;
    term_months: number;
    interest_rate: number;
    monthly_payment: number;
    total_repayment: number;
    created_at: string;
    disbursed_at?: string | null;
  };
  client: {
    id_number?: string;
    employment_status: string;
    employer_name?: string;
    monthly_income: number;
  };
  totalPaid: number;
  remainingBalance: number;
  progressPercent: number;
  paymentsMade: number;
  monthlyPayment: number;
  /** Canonical credit scoring fields from Convex loans table (N1) */
  creditScore?: number | null;
  debtToIncomeRatio?: number | null;
  recommendation?: 'approve' | 'review' | 'reject' | null;
}

const RECOMMENDATION_CONFIG = {
  approve: {
    label: 'Approve',
    className:
      'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800',
  },
  review: {
    label: 'Manual Review',
    className:
      'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  },
  reject: {
    label: 'Reject',
    className:
      'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800',
  },
} as const;

function getCreditScoreLabel(score: number): string {
  if (score >= 750) return 'Excellent';
  if (score >= 670) return 'Good';
  if (score >= 580) return 'Fair';
  return 'Poor';
}

function getCreditScoreClass(score: number): string {
  if (score >= 750) return 'text-green-600 dark:text-green-400';
  if (score >= 670) return 'text-blue-600 dark:text-blue-400';
  if (score >= 580) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

export function OverviewTab({
  loan,
  client,
  totalPaid,
  remainingBalance,
  progressPercent,
  paymentsMade,
  monthlyPayment,
  creditScore,
  debtToIncomeRatio,
  recommendation,
}: OverviewTabProps) {
  const hasScoringData = creditScore != null || debtToIncomeRatio != null || recommendation != null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Loan Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            ['Purpose', loan.purpose],
            ['Term', `${loan.term_months} months`],
            ['Interest Rate', `${loan.interest_rate}% APR`],
            ['Monthly Payment', formatNAD(loan.monthly_payment)],
            ['Total Repayment', formatNAD(loan.total_repayment)],
            ['Created', new Date(loan.created_at).toLocaleDateString()],
          ].map(([label, value]) => (
            <div key={label as string}>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
              <Separator className="mt-3" />
            </div>
          ))}
          {loan.disbursed_at && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Disbursed</span>
              <span className="font-medium">
                {new Date(loan.disbursed_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4" />
            Client Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">ID Number</span>
            <span className="font-medium">{client.id_number}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Employment</span>
            <span className="font-medium">{client.employment_status}</span>
          </div>
          {client.employer_name && (
            <>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Employer</span>
                <span className="font-medium">{client.employer_name}</span>
              </div>
            </>
          )}
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monthly Income</span>
            <span className="font-medium">{formatNAD(client.monthly_income)}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Debt-to-Income</span>
            <span className="font-medium">
              {client.monthly_income > 0
                ? ((monthlyPayment / client.monthly_income) * 100).toFixed(1)
                : 0}
              %
            </span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Payment Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payments Made</span>
            <span className="font-medium">{paymentsMade}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Paid</span>
            <span className="font-medium text-green-600 dark:text-green-400">
              {formatNAD(totalPaid)}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Remaining</span>
            <span className="font-medium text-orange-600 dark:text-orange-400">
              {formatNAD(remainingBalance)}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progressPercent.toFixed(1)}%</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ChevronRight className="h-4 w-4" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" size="sm" className="w-full justify-start">
            <MessageSquare className="h-4 w-4 mr-2" />
            Send Reminder
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start">
            <Phone className="h-4 w-4 mr-2" />
            Log Contact
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start">
            <FileText className="h-4 w-4 mr-2" />
            Generate Statement
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start">
            <History className="h-4 w-4 mr-2" />
            View Full History
          </Button>
        </CardContent>
      </Card>
      {/* Credit Scoring Card — spans full width, shown always (with fallback for missing data) */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Credit Scoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasScoringData ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Credit Score</p>
                {creditScore != null ? (
                  <>
                    <p
                      className={cn(
                        'text-3xl font-bold tabular-nums',
                        getCreditScoreClass(creditScore)
                      )}
                    >
                      {creditScore}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {getCreditScoreLabel(creditScore)} (300–850)
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Not available</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Debt-to-Income Ratio</p>
                {debtToIncomeRatio != null ? (
                  <>
                    <p
                      className={cn(
                        'text-3xl font-bold tabular-nums',
                        debtToIncomeRatio > 0.43
                          ? 'text-red-600 dark:text-red-400'
                          : debtToIncomeRatio > 0.36
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-green-600 dark:text-green-400'
                      )}
                    >
                      {(debtToIncomeRatio * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {debtToIncomeRatio > 0.43
                        ? 'High — above 43% threshold'
                        : debtToIncomeRatio > 0.36
                          ? 'Moderate'
                          : 'Healthy'}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Not available</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">AI Recommendation</p>
                {recommendation != null ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-sm px-3 py-1',
                      RECOMMENDATION_CONFIG[recommendation].className
                    )}
                  >
                    {RECOMMENDATION_CONFIG[recommendation].label}
                  </Badge>
                ) : (
                  <p className="text-sm text-muted-foreground">Not available</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Credit scoring data not yet computed for this loan.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
