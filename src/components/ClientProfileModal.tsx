import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatNAD } from '@/utils/currency';
import { supabase } from '@/integrations/supabase/client';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  DollarSign,
  FileText,
  Calendar,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Eye
} from 'lucide-react';

interface ClientProfileModalProps {
  open: boolean;
  onClose: () => void;
  userId: string | null;
}

export const ClientProfileModal: React.FC<ClientProfileModalProps> = ({
  open,
  onClose,
  userId
}) => {
  const [profile, setProfile] = useState<any>(null);
  const [loans, setLoans] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId && open) {
      loadClientData();
    }
  }, [userId, open]);

  const loadClientData = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      setProfile(profileData);

      // Load loans
      const { data: loansData } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      setLoans(loansData || []);

      // Load payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*, loans!inner(user_id)')
        .eq('loans.user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      setPayments(paymentsData || []);

      // Load documents (if table exists)
      // const { data: docsData } = await supabase
      //   .from('documents')
      //   .select('*')
      //   .eq('user_id', userId)
      //   .order('created_at', { ascending: false });
      // setDocuments(docsData || []);

      // Load recent activities (approval requests, etc.)
      const { data: activitiesData } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false})
        .limit(10);

      setActivities(activitiesData || []);

    } catch (error) {
      console.error('Error loading client data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { bg: string; icon: React.ReactNode }> = {
      pending: { bg: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
      approved: { bg: 'bg-blue-100 text-blue-800', icon: <CheckCircle className="h-3 w-3" /> },
      active: { bg: 'bg-green-100 text-green-800', icon: <TrendingUp className="h-3 w-3" /> },
      completed: { bg: 'bg-gray-100 text-gray-800', icon: <CheckCircle className="h-3 w-3" /> },
      rejected: { bg: 'bg-red-100 text-red-800', icon: <AlertCircle className="h-3 w-3" /> }
    };

    const variant = variants[status] || variants.pending;
    return (
      <Badge className={`${variant.bg} flex items-center space-x-1`}>
        {variant.icon}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  if (!userId) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Client Profile</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading client data...</p>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Profile Header */}
            {profile && (
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-8 w-8 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">
                          {profile.first_name} {profile.last_name}
                        </h3>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4" />
                            <span>{profile.phone_number}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4" />
                            <span>ID: {profile.id_number}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Badge variant={profile.verified ? "default" : "outline"}>
                      {profile.verified ? 'Verified' : 'Unverified'}
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-xs text-gray-600">Employment</p>
                      <p className="font-medium capitalize">{profile.employment_status || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Monthly Income</p>
                      <p className="font-medium">{formatNAD(profile.monthly_income || 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Credit Score</p>
                      <p className="font-medium">{profile.credit_score || 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs */}
            <Tabs defaultValue="loans" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="loans">Loans ({loans.length})</TabsTrigger>
                <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
                <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
                <TabsTrigger value="activity">Activity ({activities.length})</TabsTrigger>
              </TabsList>

              {/* Loans Tab */}
              <TabsContent value="loans" className="space-y-3 mt-4">
                {loans.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p>No loans found</p>
                    </CardContent>
                  </Card>
                ) : (
                  loans.map((loan) => (
                    <Card key={loan.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-semibold text-lg">{formatNAD(loan.amount)}</h4>
                              {getStatusBadge(loan.status)}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>{loan.term_months} months</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <TrendingUp className="h-3 w-3" />
                                <span>{loan.interest_rate}% APR</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <FileText className="h-3 w-3" />
                                <span className="capitalize">{loan.purpose}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatDate(loan.created_at)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 mb-1">Loan ID</p>
                            <p className="font-mono text-sm">{loan.id.slice(-8)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Payments Tab */}
              <TabsContent value="payments" className="space-y-3 mt-4">
                {payments.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-gray-500">
                      <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p>No payments found</p>
                    </CardContent>
                  </Card>
                ) : (
                  payments.map((payment) => (
                    <Card key={payment.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-semibold text-lg text-green-600">
                                {formatNAD(payment.amount)}
                              </h4>
                              {getStatusBadge(payment.status)}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                              <div className="flex items-center space-x-1">
                                <FileText className="h-3 w-3" />
                                <span className="capitalize">{payment.payment_method}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatDate(payment.created_at)}</span>
                              </div>
                              {payment.reference_number && (
                                <div className="flex items-center space-x-1 col-span-2">
                                  <FileText className="h-3 w-3" />
                                  <span className="font-mono text-xs">{payment.reference_number}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 mb-1">Payment ID</p>
                            <p className="font-mono text-sm">{payment.id.slice(-8)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="space-y-3 mt-4">
                <Card>
                  <CardContent className="p-8 text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>Document management coming soon</p>
                    <p className="text-sm mt-2">ID documents, bank statements, and proof of income will appear here</p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="space-y-3 mt-4">
                {activities.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-gray-500">
                      <Clock className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p>No recent activity</p>
                    </CardContent>
                  </Card>
                ) : (
                  activities.map((activity) => (
                    <Card key={activity.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <FileText className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium">{activity.request_type}</h4>
                              {getStatusBadge(activity.status)}
                            </div>
                            <p className="text-sm text-gray-600">
                              Priority: <span className="capitalize">{activity.priority}</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(activity.created_at)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ClientProfileModal;
