import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/integrations/convex/api';
import { formatNAD } from '@/utils/currency';
import { useQuery as useConvexQuery } from 'convex/react';
import {
  AlertTriangle,
  Calendar,
  Clock,
  DollarSign,
  History,
  Mail,
  Phone,
  Plus,
  TrendingUp,
  User,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { Id } from '../../../../../convex/_generated/dataModel';
import RecordActivityModal from './RecordActivityModal';

interface CollectionQueueItem {
  loan_id: string;
  user_id: string;
  client_name: string;
  amount_overdue: number;
  total_overdue: number;
  days_overdue: number;
  outstanding_balance: number;
  priority_score: number;
  last_contact_date: string | null;
  next_action_date: string | null;
  status: string;
  phone_number: string;
  email: string;
  overdue_installments: number;
  last_contact_type: string | null;
  promise_date: string | null;
  promise_amount: number | null;
}

interface CollectionActivity {
  id: string;
  loan_id: string;
  activity_type: string;
  contact_method: string;
  outcome: string;
  notes?: string;
  promise_amount?: number | null;
  promise_date?: string | null;
  promise_fulfilled?: boolean;
  created_at: string;
}

interface RawCollectionQueueItem {
  _id?: unknown;
  loanId?: unknown;
  userId?: unknown;
  clientName?: string;
  firstName?: string;
  lastName?: string;
  amount?: number;
  amountOverdue?: number;
  amountOwed?: number;
  daysOverdue?: number;
  email?: string;
  lastContactDate?: string | null;
  lastContactType?: string | null;
  nextActionDate?: string | null;
  outstandingBalance?: number;
  overdueInstallments?: number;
  phone?: string;
  priorityScore?: number;
  promiseAmount?: number | null;
  promiseDate?: string | null;
  status?: string;
}

export const CollectionsWorkqueue: React.FC = () => {
  const [selectedLoan, setSelectedLoan] = useState<CollectionQueueItem | null>(null);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);

  // Convex reactive query for collections queue
  const rawQueue = useConvexQuery(api.collections.getCollectionsQueue, {});

  const loading = rawQueue === undefined;
  const error: string | null = null;

  const queue: CollectionQueueItem[] = useMemo(() => {
    if (!rawQueue) return [];
    return (rawQueue as unknown as RawCollectionQueueItem[]).map((item) => {
      // amountOwed (remaining after partial payments) is preferred — a
      // past-due partially_paid installment owes totalDue − paidAmount.
      const amountOverdue = item.amountOwed ?? item.amountOverdue ?? item.amount ?? 0;
      return {
        loan_id: String(item.loanId ?? item._id ?? ''),
        user_id: String(item.userId ?? ''),
        client_name:
          (item.clientName ?? `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim()) || 'Unknown',
        amount_overdue: amountOverdue,
        total_overdue: amountOverdue,
        days_overdue: item.daysOverdue ?? 0,
        outstanding_balance: item.outstandingBalance ?? item.amount ?? 0,
        priority_score: item.priorityScore ?? item.daysOverdue ?? 0,
        last_contact_date: item.lastContactDate ?? null,
        next_action_date: item.nextActionDate ?? null,
        status: item.status ?? 'overdue',
        phone_number: item.phone ?? '',
        email: item.email ?? '',
        overdue_installments: item.overdueInstallments ?? 1,
        last_contact_type: item.lastContactType ?? null,
        promise_date: item.promiseDate ?? null,
        promise_amount: item.promiseAmount ?? null,
      };
    });
  }, [rawQueue]);

  // Reactive query for activity history of the expanded loan
  const rawActivities = useConvexQuery(
    api.collections.listInteractionsByLoan,
    expandedLoan ? { loanId: expandedLoan as Id<'loans'> } : 'skip'
  );

  // Build activities map from reactive query result
  const activities: Record<string, CollectionActivity[]> = useMemo(() => {
    if (!expandedLoan || !rawActivities) return {};
    return {
      [expandedLoan]: rawActivities.map((a: any) => ({
        id: String(a._id),
        loan_id: String(a.loanId),
        activity_type: a.activityType ?? '',
        contact_method: a.contactMethod ?? '',
        outcome: a.outcome ?? '',
        notes: a.notes,
        created_at: a.createdAt ? new Date(a.createdAt).toISOString() : '',
      })),
    };
  }, [expandedLoan, rawActivities]);

  const loadQueue = () => {}; // Convex is reactive

  const handleExpandLoan = (loanId: string) => {
    if (expandedLoan === loanId) {
      setExpandedLoan(null);
    } else {
      setExpandedLoan(loanId);
    }
  };

  const handleRecordActivity = (item: CollectionQueueItem) => {
    setSelectedLoan(item);
    setActivityModalOpen(true);
  };

  const handleActivitySuccess = () => {
    // Both queue and activities are Convex reactive queries — auto-refresh
    loadQueue();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPriorityBadge = (score: number) => {
    if (score >= 100) {
      return <Badge className="bg-red-100  text-red-800  border-red-200 ">Critical</Badge>;
    } else if (score >= 50) {
      return <Badge className="bg-orange-100  text-orange-800  border-orange-200 ">High</Badge>;
    } else if (score >= 20) {
      return <Badge className="bg-yellow-100  text-yellow-800  border-yellow-200 ">Medium</Badge>;
    } else {
      return <Badge className="bg-blue-100  text-blue-800  border-blue-200 ">Low</Badge>;
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
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200  bg-red-50 ">
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
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 text-muted-foreground/60" />
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
                <p className="text-xs text-muted-foreground">Total Accounts</p>
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
                <p className="text-xs text-muted-foreground">Total Overdue</p>
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
                <p className="text-xs text-muted-foreground">Critical Cases</p>
                <p className="text-2xl font-bold">
                  {queue.filter((item) => item.priority_score >= 100).length}
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
                <p className="text-xs text-muted-foreground">Avg Days Overdue</p>
                <p className="text-2xl font-bold">
                  {Math.round(
                    queue.reduce((sum, item) => sum + item.days_overdue, 0) / queue.length
                  )}
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
                            <h3 className="font-semibold text-foreground">{item.client_name}</h3>
                            {getPriorityBadge(item.priority_score)}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
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
                        <p className="text-sm text-muted-foreground">Overdue Amount</p>
                        <p className="text-xl font-bold text-red-600">
                          {formatNAD(item.total_overdue)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.overdue_installments} installment
                          {item.overdue_installments > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {/* Last Contact & Promise Info */}
                    <div className="flex items-center justify-between text-sm bg-muted/50 rounded p-2">
                      <div className="flex items-center space-x-4">
                        {item.last_contact_date && (
                          <div className="flex items-center space-x-1 text-muted-foreground">
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
                              Promise: {formatNAD(item.promise_amount || 0)} on{' '}
                              {formatDate(item.promise_date)}
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
                        <Button size="sm" onClick={() => handleRecordActivity(item)}>
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
                              <div key={activity.id} className="bg-muted/50 rounded p-3 text-sm">
                                <div className="flex items-start justify-between mb-1">
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="outline" className="text-xs">
                                      {activity.activity_type.replace('_', ' ')}
                                    </Badge>
                                    {activity.contact_method && (
                                      <span className="text-xs text-muted-foreground">
                                        via {activity.contact_method}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDate(activity.created_at)}
                                  </span>
                                </div>
                                {activity.outcome && (
                                  <p className="text-foreground mb-1">{activity.outcome}</p>
                                )}
                                {activity.notes && (
                                  <p className="text-muted-foreground text-xs">{activity.notes}</p>
                                )}
                                {activity.promise_date && (
                                  <div className="mt-2 text-xs text-blue-600 flex items-center space-x-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    <span>
                                      Promise: {formatNAD(activity.promise_amount || 0)} on{' '}
                                      {formatDate(activity.promise_date)}
                                      {activity.promise_fulfilled && ' ✓ Fulfilled'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            No activity history yet
                          </p>
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
