import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/integrations/convex/api';
import { useQuery } from 'convex/react';
import { FileSignature } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Id } from '../../../convex/_generated/dataModel';
import { AGREEMENT_STATUS_LABEL, type AgreementStatusValue } from './agreementStatus';

/** Borrower's loan page: shown once an agreement has been issued to them. */
export function LoanAgreementCard({ loanId }: { loanId: string }) {
  const agreement = useQuery(api.loanAgreements.getMyAgreement, { loanId: loanId as Id<'loans'> });
  if (!agreement) return null;
  return (
    <Card
      className={agreement.canAccept ? 'border-primary/50 bg-primary/5' : undefined}
      data-testid="loan-agreement-card"
    >
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <FileSignature className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="font-medium">Loan agreement {agreement.agreementNumber}</p>
            <p className="text-sm text-muted-foreground">
              {agreement.canAccept
                ? 'Ready for you to review and accept.'
                : AGREEMENT_STATUS_LABEL[agreement.status as AgreementStatusValue]}
            </p>
          </div>
        </div>
        <Button asChild variant={agreement.canAccept ? 'default' : 'outline'}>
          <Link to={`/loans/${loanId}/agreement`}>
            {agreement.canAccept ? 'Review & accept' : 'View agreement'}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
