import React from 'react';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Calendar
} from 'lucide-react';
import { useLoanPortfolioMetrics } from '../../hooks/useLoanPortfolioMetrics';
import { formatNAD } from '@/utils/currency';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

const LoanPortfolioOverview: React.FC = () => {
  const { metrics, loading, error } = useLoanPortfolioMetrics();
  const { styles } = useTheme();

  const formatCurrency = (amount: number) => formatNAD(amount);

  const portfolioCards = [
    {
      title: 'Pending Applications',
      value: metrics?.pendingCount || 0,
      icon: Clock,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      description: 'Awaiting review',
      urgent: (metrics?.pendingCount || 0) > 10
    },
    {
      title: 'Approved This Month',
      value: metrics?.approvedThisMonth || 0,
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      description: 'Ready for disbursement'
    },
    {
      title: 'Total Portfolio Value',
      value: formatCurrency(metrics?.totalPortfolioValue || 0),
      icon: DollarSign,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      description: 'Active loans'
    },
    {
      title: 'Average Processing Time',
      value: `${metrics?.avgProcessingDays || 0} days`,
      icon: Calendar,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      description: 'Application to decision'
    },
    {
      title: 'Approval Rate',
      value: `${metrics?.approvalRate || 0}%`,
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      description: 'Last 30 days'
    },
    {
      title: 'High Risk Applications',
      value: metrics?.highRiskCount || 0,
      icon: AlertTriangle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      description: 'Requires special review',
      urgent: (metrics?.highRiskCount || 0) > 0
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <ThemedCard key={i} className="animate-pulse">
            <div className="pb-2">
              <div className="h-4 bg-muted rounded w-24"></div>
            </div>
            <div>
              <div className="h-8 bg-muted rounded w-16 mb-2"></div>
              <div className="h-3 bg-muted rounded w-20"></div>
            </div>
          </ThemedCard>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ThemedCard className="border-destructive/50 bg-destructive/10">
        <div className="pt-6">
          <div className="flex items-center space-x-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span>Failed to load portfolio metrics: {error}</span>
          </div>
        </div>
      </ThemedCard>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {portfolioCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <ThemedCard 
            key={index} 
            className={cn(
              "hover:shadow-lg transition-all duration-200",
              card.urgent && "ring-2 ring-red-200 dark:ring-red-800 shadow-md"
            )}
          >
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 mb-2">
              <h3 className="text-sm font-medium text-muted-foreground truncate mr-2" title={card.title}>
                {card.title}
                {card.urgent && (
                  <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 align-middle">
                    Urgent
                  </span>
                )}
              </h3>
              <div className={`p-2 rounded-full ${card.bgColor} shrink-0`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </div>
            <div>
              <div 
                className={cn("text-xl sm:text-2xl font-bold mb-1 truncate tabular-nums", styles.textClass)} 
                title={typeof card.value === 'string' ? card.value : card.value.toLocaleString()}
              >
                {typeof card.value === 'string' ? card.value : card.value.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground truncate" title={card.description}>
                {card.description}
              </p>
            </div>
          </ThemedCard>
        );
      })}
    </div>
  );
};

export default LoanPortfolioOverview;
