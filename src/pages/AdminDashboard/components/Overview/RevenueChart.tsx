import { ThemedCard } from '@/components/ui/ThemedCard';
import { cn } from '@/lib/utils';
import { formatNAD } from '@/utils/currency';
import React from 'react';

interface RevenueData {
  month: string;
  revenue: number;
  disbursed: number;
  repayments: number;
}

interface RevenueChartProps {
  data: RevenueData[];
  loading?: boolean;
  chartType?: 'line' | 'bar';
}

const RevenueChart: React.FC<RevenueChartProps> = ({ data, loading = false }) => {
  if (loading) {
    return (
      <ThemedCard className="bg-card border-border">
        <div className="pb-4 border-b border-border mb-4">
          <h3 className={cn('text-lg font-semibold', 'font-sans text-[#274F35]')}>
            Disbursements and repayments
          </h3>
        </div>
        <div className="h-80 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading series…</div>
        </div>
      </ThemedCard>
    );
  }

  return (
    <ThemedCard>
      <div className="pb-4 border-b border-border mb-4">
        <h3 className={cn('text-lg font-semibold', 'font-sans text-[#274F35]')}>
          Disbursements and repayments
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Monthly points from Convex portfolio activity (not a live Bank of Namibia feed)
        </p>
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8">No monthly activity to display yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 pr-4">Month</th>
                <th className="py-2 pr-4 text-right">Disbursed (NAD)</th>
                <th className="py-2 text-right">Repayments (NAD)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.month} className="border-b border-border/60">
                  <td className="py-2 pr-4 font-medium">{row.month}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatNAD(row.disbursed)}</td>
                  <td className="py-2 text-right tabular-nums">{formatNAD(row.repayments)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ThemedCard>
  );
};

export default RevenueChart;
