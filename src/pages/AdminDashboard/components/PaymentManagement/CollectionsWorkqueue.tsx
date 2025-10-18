import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatNAD } from '@/utils/currency';
import { 
  generateCollectionQueue, 
  CollectionQueueItem,
  getCollectionActivities,
  CollectionActivity
} from '@/services/collectionsService';
import { 
  Phone, 
  Mail, 
  MessageSquare, 
  User, 
  Calendar, 
  DollarSign, 
  AlertTriangle,
  Clock,
  TrendingUp,
  History,
  Plus
} from 'lucide-react';
import RecordActivityModal from './RecordActivityModal';

export const CollectionsWorkqueue: React.FC = () => {
  const [queue, setQueue] = useState<CollectionQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<CollectionQueueItem | null>(null);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);
  const [activities, setActivities] = useState<Record<string, CollectionActivity[]>>({});

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await generateCollectionQueue();
      
      if (result.success) {
        setQueue(result.queue || []);
      } else {
        setError(result.error || 'Failed to load collection queue');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error loading collection queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async (loanId: string) => {
    if (activities[loanId]) {
      // Already loaded
      return;
    }

    try {
      const result = await getCollectionActivities(loanId);
      if (result.success) {
        setActivities(prev => ({
          ...prev,
          [loanId]: result.activities || []
        }));
      }
    } catch (err) {
      console.error('Error loading activities:', err);
    }
  };

  const handleExpandLoan = async (loanId: string) => {
    if (expandedLoan === loanId) {
      setExpandedLoan(null);
    } else {
      setExpandedLoan(loanId);
      await loadActivities(loanId);
    }
  };

  const handleRecordActivity = (item: CollectionQueueItem) => {
    setSelectedLoan(item);
    setActivityModalOpen(true);
  };

  const handleActivitySuccess = () => {
    loadQueue();
    if (expandedLoan) {
      loadActivities(expandedLoan);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPriorityBadge = (score: number) => {
    if (score >= 100) {
      return <Badge className="bg-red-100 text-red-800 border-red-200">Critical</Badge>;
    } else if (score >= 50) {
      return <Badge className="bg-orange-100 text-orange-800 border-orange-200">High</Badge>;
    } else if (score >= 20) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Medium</Badge>;
    } else {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Low</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Collections Workqueue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (queue.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Collections Workqueue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="font-medium">No overdue accounts</p>
            <p className="text-sm mt-1">All payments are up to date!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Accounts</p>
                <p className="text-2xl font-bold">{queue.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Overdue</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatNAD(queue.reduce((sum, item) => sum + item.total_overdue, 0))}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Critical Cases</p>
                <p className="text-2xl font-bold">
                  {queue.filter(item => item.priority_score >= 100).length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Avg Days Overdue</p>
                <p className="text-2xl font-bold">
                  {Math.round(queue.reduce((sum, item) => sum + item.days_overdue, 0) / queue.length)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Recording Modal */}
      {selectedLoan && (
        <RecordActivityModal
          open={activityModalOpen}
          onClose={() => {
            setActivityModalOpen(false);
            setSelectedLoan(null);
          }}
          onSuccess={handleActivitySuccess}
          loanId={selectedLoan.loan_id}
          clientName={selectedLoan.client_name}
        />
      )}

      {/* Queue List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Prioritized Collection Queue</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {queue.map((item) => (
              <Card key={item.loan_id} className="border-l-4 border-l-red-500">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header Row */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                          <User className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{item.client_name}</h3>
                            {getPriorityBadge(item.priority_score)}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Phone className="h-3 w-3" />
                              <span>{item.phone_number}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{item.email}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{item.days_overdue} days overdue</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-sm text-gray-600">Overdue Amount</p>
                        <p className="text-xl font-bold text-red-600">
                          {formatNAD(item.total_overdue)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.overdue_installments} installment{item.overdue_installments > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {/* Last Contact & Promise Info */}
                    <div className="flex items-center justify-between text-sm bg-gray-50 rounded p-2">
                      <div className="flex items-center space-x-4">
                        {item.last_contact_date && (
                          <div className="flex items-center space-x-1 text-gray-600">
                            <Calendar className="h-3 w-3" />
                            <span>Last contact: {formatDate(item.last_contact_date)}</span>
                            {item.last_contact_type && (
                              <Badge variant="outline" className="ml-1 text-xs">
                                {item.last_contact_type}
                              </Badge>
                            )}
                          </div>
                        )}
                        {item.promise_date && (
                          <div className="flex items-center space-x-1 text-blue-600">
                            <AlertTriangle className="h-3 w-3" />
                            <span>
                              Promise: {formatNAD(item.promise_amount || 0)} on {formatDate(item.promise_date)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExpandLoan(item.loan_id)}
                      >
                        <History className="h-4 w-4 mr-2" />
                        {expandedLoan === item.loan_id ? 'Hide' : 'View'} History
                      </Button>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleRecordActivity(item)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Record Activity
                        </Button>
                      </div>
                    </div>

                    {/* Activity History (Expanded) */}
                    {expandedLoan === item.loan_id && (
                      <div className="mt-3 pt-3 border-t">
                        <h4 className="text-sm font-medium mb-2 flex items-center space-x-2">
                          <History className="h-4 w-4" />
                          <span>Activity History</span>
                        </h4>
                        {activities[item.loan_id] && activities[item.loan_id].length > 0 ? (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {activities[item.loan_id].map((activity) => (
                              <div key={activity.id} className="bg-gray-50 rounded p-3 text-sm">
                                <div className="flex items-start justify-between mb-1">
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="outline" className="text-xs">
                                      {activity.activity_type.replace('_', ' ')}
                                    </Badge>
                                    {activity.contact_method && (
                                      <span className="text-xs text-gray-500">
                                        via {activity.contact_method}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {formatDate(activity.created_at)}
                                  </span>
                                </div>
                                {activity.outcome && (
                                  <p className="text-gray-700 mb-1">{activity.outcome}</p>
                                )}
                                {activity.notes && (
                                  <p className="text-gray-600 text-xs">{activity.notes}</p>
                                )}
                                {activity.promise_date && (
                                  <div className="mt-2 text-xs text-blue-600 flex items-center space-x-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    <span>
                                      Promise: {formatNAD(activity.promise_amount || 0)} on {formatDate(activity.promise_date)}
                                      {activity.promise_fulfilled && ' ✓ Fulfilled'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No activity history yet</p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CollectionsWorkqueue;
