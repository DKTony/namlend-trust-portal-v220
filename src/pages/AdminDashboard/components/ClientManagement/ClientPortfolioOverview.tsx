import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  UserCheck, 
  UserX, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  Star
} from 'lucide-react';
import { useClientPortfolioMetrics } from '../../hooks/useClientPortfolioMetrics';
import { formatNAD } from '@/utils/currency';

const ClientPortfolioOverview: React.FC = () => {
  const { metrics, loading, error } = useClientPortfolioMetrics();

  const formatCurrency = (amount: number) => formatNAD(amount);

  const portfolioCards = [
    {
      title: 'Total Clients',
      value: metrics?.totalClients || 0,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      description: 'All registered clients',
      trend: '+12% this month'
    },
    {
      title: 'Active Clients',
      value: metrics?.activeClients || 0,
      icon: UserCheck,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      description: 'Currently active accounts',
      trend: '+8% this month'
    },
    {
      title: 'Total Client Value',
      value: formatCurrency(metrics?.totalClientValue || 0),
      icon: DollarSign,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
      description: 'Combined portfolio value',
      trend: '+15% this month'
    },
    {
      title: 'Average Client Value',
      value: formatCurrency(metrics?.avgClientValue || 0),
      icon: TrendingUp,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-800',
      description: 'Per client portfolio',
      trend: '+5% this month'
    },
    {
      title: 'Premium Clients',
      value: metrics?.premiumClients || 0,
      icon: Star,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      description: 'High-value clients',
      trend: '+3 this month'
    },
    {
      title: 'Pending Verifications',
      value: metrics?.pendingVerifications || 0,
      icon: Clock,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-800',
      description: 'Awaiting KYC completion',
      urgent: (metrics?.pendingVerifications || 0) > 5
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse bg-card border-border">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16 mb-2"></div>
              <div className="h-3 bg-muted rounded w-20"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span>Failed to load client portfolio metrics: {error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {portfolioCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card 
            key={index} 
            className={`hover:shadow-lg transition-all duration-200 bg-card ${card.borderColor} ${
              card.urgent ? 'ring-2 ring-orange-200 dark:ring-orange-800 shadow-md' : ''
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground truncate mr-2" title={card.title}>
                {card.title}
                {card.urgent && (
                  <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 align-middle">
                    Urgent
                  </span>
                )}
              </CardTitle>
              <div className={`p-2 rounded-full ${card.bgColor} shrink-0`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div 
                className="text-xl sm:text-2xl font-bold mb-1 truncate tabular-nums text-foreground"
                title={typeof card.value === 'string' ? card.value : card.value.toLocaleString()}
              >
                {typeof card.value === 'string' ? card.value : card.value.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mb-1 truncate" title={card.description}>
                {card.description}
              </p>
              {card.trend && (
                <p className="text-xs text-green-600 dark:text-green-400 font-medium truncate" title={card.trend}>
                  {card.trend}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ClientPortfolioOverview;
