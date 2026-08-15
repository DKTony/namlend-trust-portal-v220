import { ThemedCard } from '@/components/ui/ThemedCard';
import { cn } from '@/lib/utils';
import { formatNAD } from '@/utils/currency';
import { AlertTriangle, Clock, DollarSign, Star, TrendingUp, UserCheck, Users } from 'lucide-react';
import React from 'react';
import { useClientPortfolioMetrics } from '../../hooks/useClientPortfolioMetrics';

const ClientPortfolioOverview: React.FC = () => {
  const { metrics, loading, error } = useClientPortfolioMetrics();

  const formatCurrency = (amount: number) => formatNAD(amount);

  const portfolioCards = [
    {
      title: 'Total Clients',
      value: metrics?.totalClients || 0,
      icon: Users,
      color: 'text-blue-600 ',
      bgColor: 'bg-blue-50 ',
      description: 'All registered clients',
    },
    {
      title: 'Active Clients',
      value: metrics?.activeClients || 0,
      icon: UserCheck,
      color: 'text-green-600 ',
      bgColor: 'bg-green-50 ',
      description: 'Currently active accounts',
    },
    {
      title: 'Total Client Value',
      value: formatCurrency(metrics?.totalClientValue || 0),
      icon: DollarSign,
      color: 'text-emerald-600 ',
      bgColor: 'bg-emerald-50 ',
      description: 'Combined portfolio value',
    },
    {
      title: 'Average Client Value',
      value: formatCurrency(metrics?.avgClientValue || 0),
      icon: TrendingUp,
      color: 'text-purple-600 ',
      bgColor: 'bg-purple-50 ',
      description: 'Per client portfolio',
    },
    {
      title: 'Premium Clients',
      value: metrics?.premiumClients || 0,
      icon: Star,
      color: 'text-yellow-600 ',
      bgColor: 'bg-yellow-50 ',
      description: 'High-value clients',
    },
    {
      title: 'Pending Verifications',
      value: metrics?.pendingVerifications || 0,
      icon: Clock,
      color: 'text-orange-600 ',
      bgColor: 'bg-orange-50 ',
      description: 'Awaiting KYC completion',
      urgent: (metrics?.pendingVerifications || 0) > 5,
    },
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
            <span>Failed to load client portfolio metrics: {error}</span>
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
              'hover:shadow-lg transition-all duration-200',
              card.urgent && 'ring-2 ring-orange-200  shadow-md'
            )}
          >
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 mb-2">
              <h3
                className="text-sm font-medium text-muted-foreground truncate mr-2"
                title={card.title}
              >
                {card.title}
                {card.urgent && (
                  <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100  text-orange-800  align-middle">
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
                className={cn(
                  'text-xl sm:text-2xl font-bold mb-1 truncate tabular-nums',
                  'font-sans text-[#274F35]'
                )}
                title={typeof card.value === 'string' ? card.value : card.value.toLocaleString()}
              >
                {typeof card.value === 'string' ? card.value : card.value.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mb-1 truncate" title={card.description}>
                {card.description}
              </p>
            </div>
          </ThemedCard>
        );
      })}
    </div>
  );
};

export default ClientPortfolioOverview;
