import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LoanStatusTimeline, generateLoanTimeline } from '@/components/workflow/LoanStatusTimeline';

interface TimelineTabProps {
  loan: {
    status: string;
    created_at: string;
    disbursed_at?: string;
  };
}

export function TimelineTab({ loan }: TimelineTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <LoanStatusTimeline
          steps={generateLoanTimeline(
            loan.status,
            loan.created_at,
            loan.status !== 'pending' ? loan.created_at : undefined,
            loan.status === 'approved' || loan.status === 'active' || loan.status === 'disbursed'
              ? loan.created_at
              : undefined,
            loan.disbursed_at
          )}
          orientation="vertical"
        />
      </CardContent>
    </Card>
  );
}
