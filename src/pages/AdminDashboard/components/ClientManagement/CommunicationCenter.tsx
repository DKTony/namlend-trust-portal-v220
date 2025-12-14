import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Mail, 
  Phone, 
  Send, 
  Search, 
  Filter, 
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Calendar
} from 'lucide-react';
import { useCommunications } from '../../hooks/useCommunications';

interface Communication {
  id: string;
  clientId: string;
  clientName: string;
  type: 'email' | 'sms' | 'call' | 'in-app';
  subject: string;
  message: string;
  status: 'sent' | 'delivered' | 'read' | 'replied' | 'failed';
  createdAt: string;
  updatedAt: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

const CommunicationCenter: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  
  const { communications, loading, error, refetch } = useCommunications(activeFilter, searchTerm);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      email: <Mail className="h-4 w-4" />,
      sms: <MessageSquare className="h-4 w-4" />,
      call: <Phone className="h-4 w-4" />,
      'in-app': <MessageSquare className="h-4 w-4" />
    };
    return icons[type as keyof typeof icons] || <MessageSquare className="h-4 w-4" />;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      sent: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      delivered: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800',
      read: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 border-purple-200 dark:border-purple-800',
      replied: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
      failed: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800'
    };

    const icons = {
      sent: <Clock className="h-3 w-3 mr-1" />,
      delivered: <CheckCircle className="h-3 w-3 mr-1" />,
      read: <CheckCircle className="h-3 w-3 mr-1" />,
      replied: <CheckCircle className="h-3 w-3 mr-1" />,
      failed: <AlertCircle className="h-3 w-3 mr-1" />
    };

    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants]}>
        {icons[status as keyof typeof icons]}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      low: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
      medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
      high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-800',
      urgent: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800'
    };

    return (
      <Badge variant="outline" className={variants[priority as keyof typeof variants]}>
        <span className="capitalize">{priority}</span>
      </Badge>
    );
  };

  const filterOptions = [
    { value: 'all', label: 'All Communications', count: communications?.length || 0 },
    { value: 'email', label: 'Emails', count: communications?.filter(c => c.type === 'email').length || 0 },
    { value: 'sms', label: 'SMS', count: communications?.filter(c => c.type === 'sms').length || 0 },
    { value: 'call', label: 'Calls', count: communications?.filter(c => c.type === 'call').length || 0 },
    { value: 'pending', label: 'Pending', count: communications?.filter(c => c.status === 'sent').length || 0 }
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
                <div className="h-6 bg-muted rounded w-16"></div>
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
          <h3 className="text-lg font-semibold text-foreground">Communication Center</h3>
          <p className="text-sm text-muted-foreground">Manage client communications and messages</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Advanced Filters
          </Button>
          <Button size="sm" onClick={() => setShowComposer(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Message
          </Button>
        </div>
      </div>

      {/* Communication Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-sm text-muted-foreground truncate">Total Messages</p>
                <p className="text-xl sm:text-2xl font-bold truncate tabular-nums text-foreground">{communications?.length || 0}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-600 dark:text-blue-400 shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-sm text-muted-foreground truncate">Pending Replies</p>
                <p className="text-xl sm:text-2xl font-bold truncate tabular-nums text-foreground">{communications?.filter(c => c.status === 'sent').length || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400 shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-sm text-muted-foreground truncate">Response Rate</p>
                <p className="text-xl sm:text-2xl font-bold truncate tabular-nums text-foreground">87%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400 shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-sm text-muted-foreground truncate">Avg Response Time</p>
                <p className="text-xl sm:text-2xl font-bold truncate tabular-nums text-foreground">2.4h</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600 dark:text-purple-400 shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex space-x-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <input
            type="text"
            placeholder="Search communications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-input text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex space-x-2">
          {filterOptions.map((option) => (
            <Button
              key={option.value}
              variant={activeFilter === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter(option.value)}
              className="flex items-center space-x-1 shrink-0"
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

      {/* Communications List */}
      {error ? (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span>Failed to load communications: {error}</span>
              </div>
              <Button variant="outline" size="sm" onClick={refetch}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : !communications || communications.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No communications found</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? `No communications match "${searchTerm}"`
                  : 'No communications at this time'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {communications.map((comm) => (
            <Card key={comm.id} className="hover:shadow-md transition-shadow duration-200 bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  {/* Communication Type Icon */}
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                      {getTypeIcon(comm.type)}
                    </div>
                  </div>

                  {/* Communication Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3 min-w-0 flex-1 mr-2">
                        <h4 className="text-lg font-semibold text-foreground truncate" title={comm.subject}>
                          {comm.subject}
                        </h4>
                        <div className="flex space-x-2 shrink-0">
                          {getStatusBadge(comm.status)}
                          {getPriorityBadge(comm.priority)}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground shrink-0 tabular-nums">
                        {formatDate(comm.createdAt)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3 flex-wrap">
                      <div className="flex items-center space-x-1 min-w-0">
                        <User className="h-4 w-4 shrink-0" />
                        <span className="truncate" title={comm.clientName}>{comm.clientName}</span>
                      </div>
                      <div className="flex items-center space-x-1 shrink-0">
                        {getTypeIcon(comm.type)}
                        <span className="capitalize">{comm.type}</span>
                      </div>
                    </div>

                    <p className="text-foreground line-clamp-2 mb-3" title={comm.message}>
                      {comm.message}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" className="shrink-0">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Reply
                      </Button>
                      <Button variant="ghost" size="sm" className="shrink-0">
                        View Details
                      </Button>
                      {comm.status === 'failed' && (
                        <Button variant="outline" size="sm" className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 shrink-0">
                          <Send className="h-4 w-4 mr-2" />
                          Resend
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Message Composer Modal */}
      {showComposer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background rounded-lg border border-border shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">New Message</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowComposer(false)}>
                  ×
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Recipient</label>
                  <select className="w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground">
                    <option>Select a client...</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Type</label>
                  <select className="w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground">
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="in-app">In-App Message</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Subject</label>
                  <input
                    type="text"
                    className="w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground"
                    placeholder="Enter subject..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Message</label>
                  <textarea
                    rows={6}
                    className="w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground"
                    placeholder="Enter your message..."
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowComposer(false)}>
                    Cancel
                  </Button>
                  <Button>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunicationCenter;
