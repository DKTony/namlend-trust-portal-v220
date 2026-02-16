import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatNAD } from '@/utils/currency';

interface PromiseToPay {
  id: string;
  promised_amount: number;
  promised_date: string;
  status: string;
  notes?: string;
}

interface PromisesTabProps {
  promises: PromiseToPay[];
}

export function PromisesTab({ promises }: PromisesTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Promises to Pay</CardTitle>
      </CardHeader>
      <CardContent>
        {promises.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No promises recorded</div>
        ) : (
          <div className="space-y-3">
            {promises.map((ptp) => (
              <div key={ptp.id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{formatNAD(ptp.promised_amount)}</div>
                  <Badge
                    variant={
                      ptp.status === 'kept'
                        ? 'default'
                        : ptp.status === 'broken'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {ptp.status}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Promised for: {new Date(ptp.promised_date).toLocaleDateString()}
                </div>
                {ptp.notes && <p className="text-sm mt-2">{ptp.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
