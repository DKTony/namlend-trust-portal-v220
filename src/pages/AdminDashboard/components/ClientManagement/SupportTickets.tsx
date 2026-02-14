import React, { useState } from 'react';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedBadge } from '@/components/ui/ThemedBadge';
import { 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  User, 
  Calendar, 
  MessageSquare,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { useSupportTickets } from '../../hooks/useSupportTickets';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface SupportTicket {
  id: string;
  clientId: string;
  clientName: string;
  subject: string;
  description: string;
  category: 'technical' | 'billing' | 'loan' | 'account' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  responseTime?: number; // in hours
  resolutionTime?: number; // in hours
}

const SupportTickets: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const { styles } = useTheme();
  
  const { tickets, loading, error, refetch } = useSupportTickets(activeFilter, searchTerm);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      open: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800',
      'in-progress': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
      resolved: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800',
      closed: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700'
    };

    const icons = {
      open: <AlertCircle className="h-3 w-3 mr-1" />,
      'in-progress': <Clock className="h-3 w-3 mr-1" />,
      resolved: <CheckCircle className="h-3 w-3 mr-1" />,
      closed: <CheckCircle className="h-3 w-3 mr-1" />
    };

    return (
      <ThemedBadge className={variants[status as keyof typeof variants]}>
        {icons[status as keyof typeof icons]}
        <span className="capitalize">{status.replace('-', ' ')}</span>
      </ThemedBadge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      low: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
      medium: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-800',
      urgent: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800'
    };

    return (
      <ThemedBadge className={variants[priority as keyof typeof variants]}>
        <span className="capitalize">{priority}</span>
      </ThemedBadge>
    );
  };

  const getCategoryBadge = (category: string) => {
    const variants = {
      technical: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 border-purple-200 dark:border-purple-800',
      billing: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800',
      loan: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      account: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-800',
      general: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700'
    };

    return (
      <ThemedBadge className={variants[category as keyof typeof variants]}>
        <span className="capitalize">{category}</span>
      </ThemedBadge>
    );
  };

  const filterOptions = [
    { value: 'all', label: 'All Tickets', count: tickets?.length || 0 },
    { value: 'open', label: 'Open', count: tickets?.filter(t => t.status === 'open').length || 0 },
    { value: 'in-progress', label: 'In Progress', count: tickets?.filter(t => t.status === 'in-progress').length || 0 },
    { value: 'urgent', label: 'Urgent', count: tickets?.filter(t => t.priority === 'urgent').length || 0 },
    { value: 'resolved', label: 'Resolved', count: tickets?.filter(t => t.status === 'resolved').length || 0 }
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <ThemedCard key={i} className="animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-muted rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
              <div className="h-6 bg-muted rounded w-16"></div>
            </div>
          </ThemedCard>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className={cn("text-lg font-semibold", styles.textClass)}>Support Tickets</h3>
          <p className="text-sm text-muted-foreground">Manage client support requests and issues</p>
        </div>
        <div className="flex space-x-2">
          <ThemedButton variant="secondary" className="h-9 px-3 text-xs">
            <Filter className="mr-2 h-3.5 w-3.5" />
            Advanced Filters
          </ThemedButton>
          <ThemedButton className="h-9 px-3 text-xs">
            <Plus className="mr-2 h-3.5 w-3.5" />
            New Ticket
          </ThemedButton>
        </div>
      </div>

      {/* Support Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ThemedCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Open Tickets</p>
              <p className={cn("text-2xl font-bold text-red-600 dark:text-red-400", styles.textClass)}>{tickets?.filter(t => t.status === 'open').length || 0}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
        </ThemedCard>
        <ThemedCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className={cn("text-2xl font-bold text-yellow-600 dark:text-yellow-400", styles.textClass)}>{tickets?.filter(t => t.status === 'in-progress').length || 0}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
        </ThemedCard>
        <ThemedCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Resolved Today</p>
              <p className={cn("text-2xl font-bold text-green-600 dark:text-green-400", styles.textClass)}>12</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </ThemedCard>
        <ThemedCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Response</p>
              <p className={cn("text-2xl font-bold", styles.textClass)}>45m</p>
            </div>
            <MessageSquare className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </ThemedCard>
      </div>

      {/* Filters and Search */}
      <div className="flex space-x-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <input
            type="text"
            placeholder="Search tickets by subject, client, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-input text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex space-x-2">
          {filterOptions.map((option) => (
            <ThemedButton
              key={option.value}
              variant={activeFilter === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter(option.value)}
              className="flex items-center space-x-1"
            >
              <span>{option.label}</span>
              {option.count > 0 && (
                <ThemedBadge variant="secondary" className="ml-1 text-xs">
                  {option.count}
                </ThemedBadge>
              )}
            </ThemedButton>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      {error ? (
        <ThemedCard className="border-destructive/50 bg-destructive/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>Failed to load tickets: {error}</span>
            </div>
            <ThemedButton variant="secondary" onClick={refetch}>
              Retry
            </ThemedButton>
          </div>
        </ThemedCard>
      ) : !tickets || tickets.length === 0 ? (
        <ThemedCard>
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className={cn("text-lg font-medium mb-2", styles.textClass)}>No tickets found</h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? `No tickets match "${searchTerm}"`
                : `No ${activeFilter === 'all' ? '' : activeFilter} tickets at this time`
              }
            </p>
          </div>
        </ThemedCard>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <ThemedCard 
              key={ticket.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedTicket(ticket.id)}
            >
              <div className="flex flex-col md:flex-row gap-4">
                {/* Priority Indicator Strip */}
                <div className={cn(
                  "hidden md:block w-1 rounded-full",
                  ticket.priority === 'urgent' ? 'bg-red-500' :
                  ticket.priority === 'high' ? 'bg-orange-500' :
                  ticket.priority === 'medium' ? 'bg-blue-500' : 'bg-gray-300'
                )} />

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">#{ticket.id.substring(0, 8)}</span>
                      <h4 className={cn("font-semibold text-lg truncate", styles.textClass)}>{ticket.subject}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(ticket.status)}
                      {getPriorityBadge(ticket.priority)}
                      {getCategoryBadge(ticket.category)}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center space-x-1 min-w-0">
                      <User className="h-4 w-4 shrink-0" />
                      <span className="truncate" title={ticket.clientName}>{ticket.clientName}</span>
                    </div>
                    {ticket.assignedTo && (
                      <div className="flex items-center space-x-1 min-w-0">
                        <User className="h-4 w-4 shrink-0" />
                        <span className="truncate" title={ticket.assignedTo}>Assigned to {ticket.assignedTo}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-foreground line-clamp-2 mb-3" title={ticket.description}>
                    {ticket.description}
                  </p>

                  {/* Response/Resolution Times */}
                  {(ticket.responseTime || ticket.resolutionTime) && (
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground mb-3">
                      {ticket.responseTime && (
                        <span className="tabular-nums">Response: {ticket.responseTime}h</span>
                      )}
                      {ticket.resolutionTime && (
                        <span className="tabular-nums">Resolution: {ticket.resolutionTime}h</span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
                    <ThemedButton variant="secondary" className="h-8 px-3 text-xs shrink-0" onClick={(e) => { e.stopPropagation(); setSelectedTicket(ticket.id); }}>
                      <Eye className="h-3.5 w-3.5 mr-2" />
                      View Details
                    </ThemedButton>
                    <ThemedButton variant="secondary" className="h-8 px-3 text-xs shrink-0" onClick={(e) => e.stopPropagation()}>
                      <MessageSquare className="h-3.5 w-3.5 mr-2" />
                      Add Response
                    </ThemedButton>
                    {ticket.status === 'open' && (
                      <ThemedButton variant="secondary" className="h-8 px-3 text-xs shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Edit className="h-3.5 w-3.5 mr-2" />
                        Assign
                      </ThemedButton>
                    )}
                    {ticket.status === 'in-progress' && (
                      <ThemedButton className="h-8 px-3 text-xs bg-green-600 hover:bg-green-700 text-white shrink-0" onClick={(e) => e.stopPropagation()}>
                        <CheckCircle className="h-3.5 w-3.5 mr-2" />
                        Mark Resolved
                      </ThemedButton>
                    )}
                  </div>
                </div>

                {/* Last Updated */}
                <div className="flex-shrink-0 text-right ml-2">
                  <div className="text-xs text-muted-foreground">
                    Updated
                  </div>
                  <div className="text-sm font-medium tabular-nums text-foreground">
                    {formatDate(ticket.updatedAt)}
                  </div>
                </div>
              </div>
            </ThemedCard>
          ))}
        </div>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <ThemedCard className="max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto m-0 p-0">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className={cn("text-lg font-semibold", styles.textClass)}>Ticket Details</h3>
                <ThemedButton variant="ghost" className="h-8 w-8 p-0" onClick={() => setSelectedTicket(null)}>
                  ×
                </ThemedButton>
              </div>
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Ticket details will be displayed here</p>
              </div>
            </div>
          </ThemedCard>
        </div>
      )}
    </div>
  );
};

export default SupportTickets;
