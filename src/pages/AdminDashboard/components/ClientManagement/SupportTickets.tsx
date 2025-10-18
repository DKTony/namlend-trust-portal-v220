import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
      open: 'bg-red-100 text-red-800 border-red-200',
      'in-progress': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      resolved: 'bg-green-100 text-green-800 border-green-200',
      closed: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    const icons = {
      open: <AlertCircle className="h-3 w-3 mr-1" />,
      'in-progress': <Clock className="h-3 w-3 mr-1" />,
      resolved: <CheckCircle className="h-3 w-3 mr-1" />,
      closed: <CheckCircle className="h-3 w-3 mr-1" />
    };

    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants]}>
        {icons[status as keyof typeof icons]}
        <span className="capitalize">{status.replace('-', ' ')}</span>
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      low: 'bg-gray-100 text-gray-800 border-gray-200',
      medium: 'bg-blue-100 text-blue-800 border-blue-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      urgent: 'bg-red-100 text-red-800 border-red-200'
    };

    return (
      <Badge variant="outline" className={variants[priority as keyof typeof variants]}>
        <span className="capitalize">{priority}</span>
      </Badge>
    );
  };

  const getCategoryBadge = (category: string) => {
    const variants = {
      technical: 'bg-purple-100 text-purple-800 border-purple-200',
      billing: 'bg-green-100 text-green-800 border-green-200',
      loan: 'bg-blue-100 text-blue-800 border-blue-200',
      account: 'bg-orange-100 text-orange-800 border-orange-200',
      general: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    return (
      <Badge variant="outline" className={variants[category as keyof typeof variants]}>
        <span className="capitalize">{category}</span>
      </Badge>
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
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Support Tickets</h3>
          <p className="text-sm text-gray-600">Manage client support requests and issues</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Advanced Filters
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Ticket
          </Button>
        </div>
      </div>

      {/* Support Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Open Tickets</p>
                <p className="text-2xl font-bold text-red-600">{tickets?.filter(t => t.status === 'open').length || 0}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">{tickets?.filter(t => t.status === 'in-progress').length || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resolved Today</p>
                <p className="text-2xl font-bold text-green-600">12</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold">1.2h</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex space-x-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search tickets by subject, client, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex space-x-2">
          {filterOptions.map((option) => (
            <Button
              key={option.value}
              variant={activeFilter === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter(option.value)}
              className="flex items-center space-x-1"
            >
              <span>{option.label}</span>
              {option.count > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {option.count}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span>Failed to load support tickets: {error}</span>
              </div>
              <Button variant="outline" size="sm" onClick={refetch}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : !tickets || tickets.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No support tickets found</h3>
              <p className="text-gray-500">
                {searchTerm 
                  ? `No tickets match "${searchTerm}"`
                  : 'No support tickets at this time'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <Card 
              key={ticket.id} 
              className={`hover:shadow-md transition-shadow duration-200 ${
                ticket.priority === 'urgent' ? 'ring-2 ring-red-200 shadow-md' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  {/* Ticket Priority Indicator */}
                  <div className="flex-shrink-0">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      ticket.priority === 'urgent' ? 'bg-red-100' :
                      ticket.priority === 'high' ? 'bg-orange-100' :
                      ticket.priority === 'medium' ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <AlertCircle className={`h-5 w-5 ${
                        ticket.priority === 'urgent' ? 'text-red-600' :
                        ticket.priority === 'high' ? 'text-orange-600' :
                        ticket.priority === 'medium' ? 'text-blue-600' : 'text-gray-600'
                      }`} />
                    </div>
                  </div>

                  {/* Ticket Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-lg font-semibold text-gray-900 truncate">
                          {ticket.subject}
                        </h4>
                        {getStatusBadge(ticket.status)}
                        {getPriorityBadge(ticket.priority)}
                        {getCategoryBadge(ticket.category)}
                      </div>
                      <div className="text-sm text-gray-500">
                        #{ticket.id.slice(-6)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>{ticket.clientName}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Created {formatDate(ticket.createdAt)}</span>
                      </div>
                      {ticket.assignedTo && (
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>Assigned to {ticket.assignedTo}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-gray-700 line-clamp-2 mb-3">
                      {ticket.description}
                    </p>

                    {/* Response/Resolution Times */}
                    {(ticket.responseTime || ticket.resolutionTime) && (
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mb-3">
                        {ticket.responseTime && (
                          <span>Response: {ticket.responseTime}h</span>
                        )}
                        {ticket.resolutionTime && (
                          <span>Resolution: {ticket.resolutionTime}h</span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedTicket(ticket.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Add Response
                      </Button>
                      {ticket.status === 'open' && (
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Assign
                        </Button>
                      )}
                      {ticket.status === 'in-progress' && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark Resolved
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Last Updated */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-xs text-gray-500">
                      Updated
                    </div>
                    <div className="text-sm font-medium">
                      {formatDate(ticket.updatedAt)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Ticket Details</h3>
                <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(null)}>
                  ×
                </Button>
              </div>
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Ticket details will be displayed here</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportTickets;
