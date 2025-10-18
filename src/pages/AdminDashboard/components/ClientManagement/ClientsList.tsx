import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  DollarSign, 
  User, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Star
} from 'lucide-react';
import { useClientsList } from '../../hooks/useClientsList';

interface Client {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  joinedAt: string;
  totalLoans: number;
  totalValue: number;
  lastActivity: string;
  riskLevel: 'low' | 'medium' | 'high';
  isPremium: boolean;
  kycStatus: 'verified' | 'pending' | 'rejected';
}

interface ClientsListProps {
  status: 'all' | 'active' | 'inactive' | 'suspended' | 'pending';
  searchTerm: string;
  onClientSelect: (clientId: string) => void;
}

const ClientsList: React.FC<ClientsListProps> = ({
  status,
  searchTerm,
  onClientSelect
}) => {
  const { clients, loading, error, refetch } = useClientsList(status, searchTerm);

  const formatCurrency = (amount: number) => {
    return `N$${amount.toLocaleString('en-NA', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-800 border-green-200',
      inactive: 'bg-gray-100 text-gray-800 border-gray-200',
      suspended: 'bg-red-100 text-red-800 border-red-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };

    const icons = {
      active: <CheckCircle className="h-3 w-3 mr-1" />,
      inactive: <Clock className="h-3 w-3 mr-1" />,
      suspended: <AlertTriangle className="h-3 w-3 mr-1" />,
      pending: <Clock className="h-3 w-3 mr-1" />
    };

    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {icons[status as keyof typeof icons]}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  const getRiskBadge = (riskLevel: string) => {
    const variants = {
      low: 'bg-green-100 text-green-800 border-green-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      high: 'bg-red-100 text-red-800 border-red-200'
    };

    return (
      <Badge variant="outline" className={variants[riskLevel as keyof typeof variants]}>
        {riskLevel === 'high' && <AlertTriangle className="h-3 w-3 mr-1" />}
        <span className="capitalize">{riskLevel} Risk</span>
      </Badge>
    );
  };

  const getKycBadge = (kycStatus: string) => {
    const variants = {
      verified: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      rejected: 'bg-red-100 text-red-800 border-red-200'
    };

    return (
      <Badge variant="outline" className={variants[kycStatus as keyof typeof variants]}>
        <span className="capitalize">{kycStatus}</span>
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
              </div>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Failed to load clients: {error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={refetch}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!clients || clients.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
            <p className="text-gray-500">
              {searchTerm 
                ? `No clients match "${searchTerm}"`
                : `No ${status === 'all' ? '' : status} clients at this time`
              }
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {clients.map((client) => (
        <Card 
          key={client.id} 
          className="hover:shadow-md transition-shadow duration-200 cursor-pointer"
          onClick={() => onClientSelect(client.id)}
        >
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              {/* Client Avatar */}
              <div className="flex-shrink-0">
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
              </div>

              {/* Client Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      {client.fullName}
                      {client.isPremium && (
                        <Star className="h-4 w-4 text-yellow-500 ml-2" />
                      )}
                    </h3>
                    {getStatusBadge(client.status)}
                    {getRiskBadge(client.riskLevel)}
                    {getKycBadge(client.kycStatus)}
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-900">
                      {formatCurrency(client.totalValue)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Portfolio Value
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {formatDate(client.joinedAt)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4" />
                    <span>{client.totalLoans} loan{client.totalLoans !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      {client.address && (
                        <div className="flex items-center space-x-1 text-gray-500">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-xs">{client.address}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-gray-500">
                      Last activity: {formatDate(client.lastActivity)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClientSelect(client.id);
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Profile
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle contact action
                  }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Contact
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ClientsList;
