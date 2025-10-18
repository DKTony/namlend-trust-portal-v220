import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  DollarSign, 
  FileText, 
  CreditCard, 
  MessageSquare,
  Edit,
  AlertTriangle,
  CheckCircle,
  Clock,
  Star,
  Download,
  Eye
} from 'lucide-react';
import { useClientProfile } from '../../hooks/useClientProfile';

interface ClientProfileProps {
  clientId: string;
  onClose: () => void;
}

const ClientProfile: React.FC<ClientProfileProps> = ({ clientId, onClose }) => {
  const { client, loading, error } = useClientProfile(clientId);
  const [activeTab, setActiveTab] = useState('overview');

  const formatCurrency = (amount: number) => {
    return `N$${amount.toLocaleString('en-NA', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'long',
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
      active: <CheckCircle className="h-4 w-4 mr-1" />,
      inactive: <Clock className="h-4 w-4 mr-1" />,
      suspended: <AlertTriangle className="h-4 w-4 mr-1" />,
      pending: <Clock className="h-4 w-4 mr-1" />
    };

    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {icons[status as keyof typeof icons]}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="grid grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Client</h3>
            <p className="text-gray-600 mb-4">{error || 'Client not found'}</p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold flex items-center">
                {client.fullName}
                {client.isPremium && (
                  <Star className="h-5 w-5 text-yellow-500 ml-2" />
                )}
              </h2>
              <div className="flex items-center space-x-2 mt-1">
                {getStatusBadge(client.status)}
                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                  ID: {client.id}
                </Badge>
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                  KYC: {client.kycSource}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
            <Button variant="outline" size="sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              Contact
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Portfolio</p>
                    <p className="text-2xl font-bold">{formatCurrency(client.totalValue)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Loans</p>
                    <p className="text-2xl font-bold">{client.activeLoans}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Credit Score</p>
                    <p className="text-2xl font-bold">{client.creditScore}</p>
                  </div>
                  <CreditCard className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Member Since</p>
                    <p className="text-lg font-semibold">{formatDate(client.joinedAt)}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Information Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="loans">Loans</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium">{client.email}</p>
                      </div>
                    </div>
                    {client.phone && (
                      <div className="flex items-center space-x-3">
                        <Phone className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Phone</p>
                          <p className="font-medium">{client.phone}</p>
                        </div>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-center space-x-3">
                        <MapPin className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Address</p>
                          <p className="font-medium">{client.address}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Date of Birth</p>
                        <p className="font-medium">{client.dateOfBirth ? formatDate(client.dateOfBirth) : 'Not provided'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Financial Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Borrowed</span>
                      <span className="font-semibold">{formatCurrency(client.totalBorrowed)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Repaid</span>
                      <span className="font-semibold">{formatCurrency(client.totalRepaid)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Outstanding Balance</span>
                      <span className="font-semibold">{formatCurrency(client.outstandingBalance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Monthly Income</span>
                      <span className="font-semibold">{formatCurrency(client.monthlyIncome)}</span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Risk Level</span>
                        <Badge variant="outline" className={
                          client.riskLevel === 'low' ? 'bg-green-100 text-green-800' :
                          client.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {client.riskLevel} Risk
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* KYC Status */}
              <Card>
                <CardHeader>
                  <CardTitle>KYC & Verification Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span>Identity Verification</span>
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span>Address Verification</span>
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span>Income Verification</span>
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="loans" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Loan History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Loan history will be displayed here</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Payment history will be displayed here</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Download className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Client documents will be displayed here</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Activity log will be displayed here</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ClientProfile;
