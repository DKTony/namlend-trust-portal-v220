import { ThemedCard } from '@/components/ui/ThemedCard';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { formatNAD } from '@/utils/currency';
import { AlertTriangle, DollarSign, TrendingUp, Users } from 'lucide-react';
import React from 'react';

interface FinancialMetrics {
  totalClients: number;
  totalDisbursed: number;
  totalRepayments: number;
  overduePayments: number;
  totalLoans: number;
  pendingAmount: number;
  rejectedAmount: number;
}

interface FinancialSummaryCardsProps {
  metrics: FinancialMetrics | null;
  loading?: boolean;
}

const FinancialSummaryCards: React.FC<FinancialSummaryCardsProps> = ({
  metrics,
  loading = false,
}) => {
  const { styles } = useTheme();
  const formatCurrency = (amount: number) => formatNAD(amount);

  const cards = [
    {
      title: 'Total Clients',
      value: metrics?.totalClients || 0,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      format: (val: number) => val.toLocaleString(),
    },
    {
      title: 'Total Disbursed',
      value: metrics?.totalDisbursed || 0,
      icon: DollarSign,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      format: formatCurrency,
    },
    {
      title: 'Total Repayments',
      value: metrics?.totalRepayments || 0,
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      format: formatCurrency,
    },
    {
      title: 'Overdue Payments',
      value: metrics?.overduePayments || 0,
      icon: AlertTriangle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      format: (val: number) => val.toLocaleString(),
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <ThemedCard key={i} className="animate-pulse">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-24"></div>
              <div className="h-4 w-4 bg-muted rounded"></div>
            </div>
            <div>
              <div className="h-8 bg-muted rounded w-32 mb-2"></div>
              <div className="h-3 bg-muted rounded w-20"></div>
            </div>
          </ThemedCard>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <ThemedCard key={index} className="hover:shadow-lg transition-shadow duration-200">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">{card.title}</h3>
              <div className={`p-2 rounded-full ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </div>
            <div>
              <div
                className={cn(
                  'text-xl sm:text-2xl font-bold mb-1 truncate tabular-nums',
                  styles.textClass
                )}
                title={card.format(card.value)}
              >
                {card.format(card.value)}
              </div>
              <p className="text-xs text-muted-foreground">
                {card.title === 'Overdue Payments' && card.value > 0
                  ? 'Requires attention'
                  : 'Updated in real-time'}
              </p>
            </div>
          </ThemedCard>
        );
      })}
    </div>
  );
};

export default FinancialSummaryCards;
