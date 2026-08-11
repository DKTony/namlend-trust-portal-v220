import { LoanDocumentsPanel } from '@/components/documents/LoanDocumentsPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DocumentsTabProps {
  loanId: string;
}

export function DocumentsTab({ loanId }: DocumentsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loan documents</CardTitle>
      </CardHeader>
      <CardContent>
        <LoanDocumentsPanel loanId={loanId} allowReview />
      </CardContent>
    </Card>
  );
}
