import { TigerBeetleBalance } from '@/components/finance/TigerBeetleBalance';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatNAD } from '@/utils/currency';
import { AlertCircle, CheckCircle, Mail, Phone, User } from 'lucide-react';

interface LoanSummaryCardsProps {
  loan: {
    id: string;
    amount: number;
    status: string;
    total_repayment: number;
  };
  client: {
    first_name: string;
    last_name: string;
    phone_number: string;
    email: string;
    verified: boolean;
    employment_status: string;
  };
  remainingBalance: number;
  progressPercent: number;
  getStatusColor: (status: string) => string;
}

export function LoanSummaryCards({
  loan,
  client,
  remainingBalance,
  progressPercent,
  getStatusColor,
}: LoanSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
      <Card className="col-span-2">
        <CardContent className="pt-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3
                className="font-semibold text-lg truncate"
                title={`${client.first_name} ${client.last_name}`}
              >
                {client.first_name} {client.last_name}
              </h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1 min-w-0">
                  <Phone className="h-3 w-3 shrink-0" />
                  <span className="truncate">{client.phone_number}</span>
                </span>
                <span className="flex items-center gap-1 min-w-0">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate" title={client.email}>
                    {client.email}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant={client.verified ? 'default' : 'secondary'} className="shrink-0">
                  {client.verified ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <AlertCircle className="h-3 w-3 mr-1" />
                  )}
                  {client.verified ? 'Verified' : 'Unverified'}
                </Badge>
                <Badge
                  variant="outline"
                  className="shrink-0 truncate max-w-[150px]"
                  title={client.employment_status}
                >
                  {client.employment_status}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="text-sm text-muted-foreground mb-1 truncate">Loan Amount</div>
          <div className="text-2xl font-bold truncate tabular-nums" title={formatNAD(loan.amount)}>
            {formatNAD(loan.amount)}
          </div>
          <Badge className={cn('mt-2 shrink-0', getStatusColor(loan.status))}>
            {loan.status.replace('_', ' ')}
          </Badge>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm text-muted-foreground truncate">Remaining Balance</div>
            <TigerBeetleBalance loanId={loan.id} compact showDetails={false} />
          </div>
          <div
            className="text-2xl font-bold truncate tabular-nums"
            title={formatNAD(remainingBalance)}
          >
            {formatNAD(remainingBalance)}
          </div>
          <Progress value={progressPercent} className="mt-2 h-2" />
          <div className="text-xs text-muted-foreground mt-1 truncate tabular-nums">
            {progressPercent.toFixed(1)}% paid
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
