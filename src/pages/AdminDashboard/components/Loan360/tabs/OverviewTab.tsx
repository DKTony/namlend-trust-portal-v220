import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  CreditCard,
  User,
  DollarSign,
  ChevronRight,
  MessageSquare,
  Phone,
  FileText,
  History,
} from 'lucide-react';
import { formatNAD } from '@/utils/currency';

interface OverviewTabProps {
  loan: {
    purpose: string;
    term_months: number;
    interest_rate: number;
    monthly_payment: number;
    total_repayment: number;
    created_at: string;
    disbursed_at?: string;
  };
  client: {
    id_number: string;
    employment_status: string;
    employer_name?: string;
    monthly_income: number;
  };
  totalPaid: number;
  remainingBalance: number;
  progressPercent: number;
  paymentsMade: number;
  monthlyPayment: number;
}

export function OverviewTab({
  loan,
  client,
  totalPaid,
  remainingBalance,
  progressPercent,
  paymentsMade,
  monthlyPayment,
}: OverviewTabProps) {
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
    </div>
  );
}
