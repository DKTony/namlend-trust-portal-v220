import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatNAD } from '@/utils/currency';

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  status: string;
  paid_at: string;
  reference_number: string;
}

interface PaymentsTabProps {
  payments: Payment[];
}

export function PaymentsTab({ payments }: PaymentsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No payments recorded yet</div>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <div className="font-medium">{formatNAD(payment.amount)}</div>
                  <div className="text-sm text-muted-foreground">
                    {payment.payment_method.replace('_', ' ')} • Ref: {payment.reference_number}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(payment.paid_at).toLocaleString()}
                  </div>
                </div>
                <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                  {payment.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
