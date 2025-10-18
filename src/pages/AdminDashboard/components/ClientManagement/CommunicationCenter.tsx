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
      sent: 'bg-blue-100 text-blue-800 border-blue-200',
      delivered: 'bg-green-100 text-green-800 border-green-200',
      read: 'bg-purple-100 text-purple-800 border-purple-200',
      replied: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      failed: 'bg-red-100 text-red-800 border-red-200'
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
      low: 'bg-gray-100 text-gray-800 border-gray-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      urgent: 'bg-red-100 text-red-800 border-red-200'
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
          <h3 className="text-lg font-semibold">Communication Center</h3>
          <p className="text-sm text-gray-600">Manage client communications and messages</p>
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
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Messages</p>
                <p className="text-2xl font-bold">{communications?.length || 0}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Replies</p>
                <p className="text-2xl font-bold">{communications?.filter(c => c.status === 'sent').length || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Response Rate</p>
                <p className="text-2xl font-bold">87%</p>
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
                <p className="text-2xl font-bold">2.4h</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
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
            placeholder="Search communications..."
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

      {/* Communications List */}
      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-red-600">
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
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No communications found</h3>
              <p className="text-gray-500">
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
            <Card key={comm.id} className="hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  {/* Communication Type Icon */}
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      {getTypeIcon(comm.type)}
                    </div>
                  </div>

                  {/* Communication Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-lg font-semibold text-gray-900 truncate">
                          {comm.subject}
                        </h4>
                        {getStatusBadge(comm.status)}
                        {getPriorityBadge(comm.priority)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(comm.createdAt)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>{comm.clientName}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {getTypeIcon(comm.type)}
                        <span className="capitalize">{comm.type}</span>
                      </div>
                    </div>

                    <p className="text-gray-700 line-clamp-2 mb-3">
                      {comm.message}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Reply
                      </Button>
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
                      {comm.status === 'failed' && (
                        <Button variant="outline" size="sm" className="text-red-600 border-red-200">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">New Message</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowComposer(false)}>
                  ×
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Recipient</label>
                  <select className="w-full p-2 border border-gray-300 rounded-md">
                    <option>Select a client...</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select className="w-full p-2 border border-gray-300 rounded-md">
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="in-app">In-App Message</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Subject</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Enter subject..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Message</label>
                  <textarea
                    rows={6}
                    className="w-full p-2 border border-gray-300 rounded-md"
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
