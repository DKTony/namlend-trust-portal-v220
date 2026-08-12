import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/integrations/convex/api';
import { cn } from '@/lib/utils';
import { useMutation, useQuery } from 'convex/react';
import { Activity, Clock, DollarSign, Plus, RefreshCw, Route } from 'lucide-react';
import { useState } from 'react';

const STATUS_STYLES = {
  active: 'bg-green-100  text-green-800  border-green-200 ',
  degraded: 'bg-yellow-100  text-yellow-800  border-yellow-200 ',
  offline: 'bg-red-100  text-red-800  border-red-200 ',
  maintenance: 'bg-blue-100  text-blue-800  border-blue-200 ',
} as const;

const HEALTH_STYLES = {
  healthy: 'text-green-600 ',
  degraded: 'text-yellow-600 ',
  unhealthy: 'text-red-600 ',
} as const;

interface PaymentRailRow {
  _id: string;
  displayName: string;
  railCode: string;
  status: string;
  lastHealthStatus?: string;
  settlementLatencyMinutes?: number;
  costModel: {
    fixedFeeNAD?: number;
    percentageFee?: number;
  };
  supportedDirections: string[];
  availability: {
    businessHoursOnly: boolean;
    startTime?: string;
    endTime?: string;
  };
}

export function PaymentRailsDashboard() {
  const rails = useQuery(api.ontology.paymentRails.listRails, {}) as PaymentRailRow[] | undefined;
  const seedRails = useMutation(api.ontology.paymentRails.seedDefaultRails);
  const { toast } = useToast();
  const { isPlatformSupport } = useAuth();
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    if (isPlatformSupport) return;
    setSeeding(true);
    try {
      await seedRails();
      toast({ title: 'Seeded', description: 'Default payment rails created.' });
    } catch (err) {
      toast({
        title: 'Seed Failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSeeding(false);
    }
  };

  const loading = rails === undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Route className="h-5 w-5" />
            Payment Rails
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Rail registry with health monitoring and cost models
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeed}
            disabled={seeding || isPlatformSupport}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', seeding && 'animate-spin')} />
            Seed Default Rails
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading payment rails...
          </CardContent>
        </Card>
      ) : !rails || rails.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Route className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No Payment Rails</p>
            <p className="text-sm text-muted-foreground mb-4">
              Seed the default rails (EFT, IPS Real-Time, Mobile Money) to enable disbursements.
            </p>
            <Button onClick={handleSeed} disabled={seeding || isPlatformSupport}>
              <Plus className="h-4 w-4 mr-2" />
              Seed Default Rails
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {rails.map((rail: PaymentRailRow) => {
            const statusStyle =
              STATUS_STYLES[rail.status as keyof typeof STATUS_STYLES] ?? STATUS_STYLES.offline;
            const healthStyle =
              HEALTH_STYLES[(rail.lastHealthStatus as keyof typeof HEALTH_STYLES) ?? 'degraded'] ??
              HEALTH_STYLES.degraded;

            return (
              <Card key={rail._id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{rail.displayName}</CardTitle>
                    <Badge variant="outline" className={statusStyle}>
                      {rail.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{rail.railCode}</p>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {/* Health */}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Activity className="h-3.5 w-3.5" />
                      Health
                    </span>
                    <span className={cn('font-medium', healthStyle)}>
                      {rail.lastHealthStatus ?? 'Unknown'}
                    </span>
                  </div>

                  {/* Latency */}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Settlement
                    </span>
                    <span>
                      {rail.settlementLatencyMinutes != null
                        ? rail.settlementLatencyMinutes < 60
                          ? `${rail.settlementLatencyMinutes}min`
                          : `${Math.round(rail.settlementLatencyMinutes / 60)}h`
                        : 'N/A'}
                    </span>
                  </div>

                  {/* Cost Model */}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      Cost
                    </span>
                    <span className="text-xs">
                      {rail.costModel.fixedFeeNAD
                        ? `N$${rail.costModel.fixedFeeNAD.toFixed(2)} fixed`
                        : ''}
                      {rail.costModel.fixedFeeNAD && rail.costModel.percentageFee ? ' + ' : ''}
                      {rail.costModel.percentageFee ? `${rail.costModel.percentageFee}%` : ''}
                      {!rail.costModel.fixedFeeNAD && !rail.costModel.percentageFee ? 'Free' : ''}
                    </span>
                  </div>

                  {/* Directions */}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Directions</span>
                    <div className="flex gap-1">
                      {rail.supportedDirections.map((d: string) => (
                        <Badge key={d} variant="secondary" className="text-xs px-1.5 py-0">
                          {d}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Availability */}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Hours</span>
                    <span className="text-xs">
                      {rail.availability.businessHoursOnly
                        ? `${rail.availability.startTime ?? '08:00'}–${rail.availability.endTime ?? '17:00'}`
                        : '24/7'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PaymentRailsDashboard;
