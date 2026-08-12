import { ThemedBadge } from '@/components/ui/ThemedBadge';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { cn } from '@/lib/utils';
import { formatNAD } from '@/utils/currency';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  Mail,
  MapPin,
  Phone,
  Star,
  User,
} from 'lucide-react';
import React from 'react';
import { useClientsList } from '../../hooks/useClientsList';

interface ClientsListProps {
  status: 'all' | 'active' | 'inactive' | 'suspended' | 'pending';
  searchTerm: string;
  onClientSelect: (clientId: string) => void;
}

const ClientsList: React.FC<ClientsListProps> = ({ status, searchTerm, onClientSelect }) => {
  const { clients, loading, error, refetch } = useClientsList(status, searchTerm);

  const formatCurrency = formatNAD;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100  text-green-800  border-green-200 ',
      inactive: 'bg-gray-100  text-gray-800  border-gray-200 ',
      suspended: 'bg-red-100  text-red-800  border-red-200 ',
      pending: 'bg-yellow-100  text-yellow-800  border-yellow-200 ',
    };

    const icons = {
      active: <CheckCircle className="h-3 w-3 mr-1" />,
      inactive: <Clock className="h-3 w-3 mr-1" />,
      suspended: <AlertTriangle className="h-3 w-3 mr-1" />,
      pending: <Clock className="h-3 w-3 mr-1" />,
    };

    return (
      <ThemedBadge
        className={variants[status as keyof typeof variants] || 'bg-gray-100  text-gray-800 '}
      >
        {icons[status as keyof typeof icons]}
        <span className="capitalize">{status}</span>
      </ThemedBadge>
    );
  };

  const getRiskBadge = (riskLevel: string) => {
    const variants = {
      low: 'bg-green-100  text-green-800  border-green-200 ',
      medium: 'bg-yellow-100  text-yellow-800  border-yellow-200 ',
      high: 'bg-red-100  text-red-800  border-red-200 ',
    };

    return (
      <ThemedBadge className={variants[riskLevel as keyof typeof variants]}>
        {riskLevel === 'high' && <AlertTriangle className="h-3 w-3 mr-1" />}
        <span className="capitalize">{riskLevel} Risk</span>
      </ThemedBadge>
    );
  };

  const getKycBadge = (kycStatus: string) => {
    const variants = {
      verified: 'bg-green-100  text-green-800  border-green-200 ',
      pending: 'bg-yellow-100  text-yellow-800  border-yellow-200 ',
      rejected: 'bg-red-100  text-red-800  border-red-200 ',
    };

    return (
      <ThemedBadge className={variants[kycStatus as keyof typeof variants]}>
        <span className="capitalize">{kycStatus}</span>
      </ThemedBadge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <ThemedCard key={i} className="animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-muted rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
              <div className="h-8 bg-muted rounded w-20"></div>
            </div>
          </ThemedCard>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ThemedCard className="border-destructive/50 bg-destructive/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span>Failed to load clients: {error}</span>
          </div>
          <ThemedButton variant="secondary" onClick={refetch}>
            Retry
          </ThemedButton>
        </div>
      </ThemedCard>
    );
  }

  if (!clients || clients.length === 0) {
    return (
      <ThemedCard>
        <div className="text-center py-8">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className={cn('text-lg font-medium mb-2', 'font-sans text-[#274F35]')}>
            No clients found
          </h3>
          <p className="text-muted-foreground">
            {searchTerm
              ? `No clients match "${searchTerm}"`
              : `No ${status === 'all' ? '' : status} clients at this time`}
          </p>
        </div>
      </ThemedCard>
    );
  }

  return (
    <div className="space-y-4">
      {clients.map((client) => (
        <ThemedCard
          key={client.id}
          className="hover:shadow-md transition-shadow duration-200 cursor-pointer"
          onClick={() => onClientSelect(client.id)}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Client Avatar */}
            <div className="flex-shrink-0">
              <div className="h-12 w-12 bg-blue-100  rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-blue-600 " />
              </div>
            </div>

            {/* Client Details */}
            <div className="flex-1 min-w-0">
              <div className="mb-2 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h3
                    className={cn(
                      'text-lg font-semibold flex items-center',
                      'font-sans text-[#274F35]'
                    )}
                  >
                    {client.fullName}
                    {client.isPremium && <Star className="h-4 w-4 text-yellow-500 ml-2" />}
                  </h3>
                  {getStatusBadge(client.status)}
                  {getRiskBadge(client.riskLevel)}
                  {getKycBadge(client.kycStatus)}
                </div>
                <div className="shrink-0 text-left lg:text-right">
                  <div
                    className={cn(
                      'text-xl sm:text-2xl font-bold truncate tabular-nums',
                      'font-sans text-[#274F35]'
                    )}
                    title={formatCurrency(client.totalValue)}
                  >
                    {formatCurrency(client.totalValue)}
                  </div>
                  <div className="text-sm text-muted-foreground">Portfolio Value</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2 min-w-0">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate" title={client.email}>
                    {client.email}
                  </span>
                </div>
                {client.phone && (
                  <div className="flex items-center space-x-2 shrink-0">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>{client.phone}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2 shrink-0">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>Joined {formatDate(client.joinedAt)}</span>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <DollarSign className="h-4 w-4 shrink-0" />
                  <span>
                    {client.totalLoans} loan{client.totalLoans !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Additional Details */}
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
                    {client.address && (
                      <div className="flex items-center space-x-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-xs">{client.address}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-muted-foreground">
                    Last activity: {formatDate(client.lastActivity)}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 gap-2 sm:w-40">
              <ThemedButton
                variant="secondary"
                className="h-9 w-full px-3 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onClientSelect(client.id);
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Profile
              </ThemedButton>
              <ThemedButton
                variant="ghost"
                className="h-9 w-full px-3 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle contact action
                }}
              >
                <Mail className="h-4 w-4 mr-2" />
                Contact
              </ThemedButton>
            </div>
          </div>
        </ThemedCard>
      ))}
    </div>
  );
};

export default ClientsList;
