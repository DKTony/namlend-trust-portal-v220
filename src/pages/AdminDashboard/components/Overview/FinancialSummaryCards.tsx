import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Users, AlertTriangle } from 'lucide-react';

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
  loading = false 
}) => {
  const formatCurrency = (amount: number) => {
    return `N$${amount.toLocaleString('en-NA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

const cards = [
    {
      title: 'Total Clients',
      value: metrics?.totalClients || 0,
      icon: Users,
      color: 'text-blue-600',
      format: (val: number) => val.toLocaleString()
    },
    {
      title: 'Total Disbursed',
      value: metrics?.totalDisbursed || 0,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      format: formatCurrency
    },
    {
      title: 'Total Repayments',
      value: metrics?.totalRepayments || 0,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      format: formatCurrency
    },
    {
      title: 'Overdue Payments',
      value: metrics?.overduePayments || 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      format: (val: number) => val.toLocaleString()
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-20"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">
                {card.format(card.value)}
              </div>
              <p className="text-xs text-muted-foreground">
                {card.title === 'Overdue Payments' && card.value > 0 
                  ? 'Requires attention' 
                  : 'Updated in real-time'
                }
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default FinancialSummaryCards;
