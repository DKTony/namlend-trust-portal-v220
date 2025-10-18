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
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      description: 'All registered clients',
      trend: '+12% this month'
    },
    {
      title: 'Active Clients',
      value: metrics?.activeClients || 0,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      description: 'Currently active accounts',
      trend: '+8% this month'
    },
    {
      title: 'Total Client Value',
      value: formatCurrency(metrics?.totalClientValue || 0),
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      description: 'Combined portfolio value',
      trend: '+15% this month'
    },
    {
      title: 'Average Client Value',
      value: formatCurrency(metrics?.avgClientValue || 0),
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      description: 'Per client portfolio',
      trend: '+5% this month'
    },
    {
      title: 'Premium Clients',
      value: metrics?.premiumClients || 0,
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      description: 'High-value clients',
      trend: '+3 this month'
    },
    {
      title: 'Pending Verifications',
      value: metrics?.pendingVerifications || 0,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      description: 'Awaiting KYC completion',
      urgent: (metrics?.pendingVerifications || 0) > 5
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-20"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-red-600">
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
            className={`hover:shadow-lg transition-all duration-200 ${card.borderColor} ${
              card.urgent ? 'ring-2 ring-orange-200 shadow-md' : ''
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
                {card.urgent && (
                  <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    Urgent
                  </span>
                )}
              </CardTitle>
              <div className={`p-2 rounded-full ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">
                {typeof card.value === 'string' ? card.value : card.value.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mb-1">
                {card.description}
              </p>
              {card.trend && (
                <p className="text-xs text-green-600 font-medium">
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
