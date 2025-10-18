import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  DollarSign, 
  FileText, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin,
  Briefcase,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  Eye
} from 'lucide-react';

interface LoanReviewPanelProps {
  loanId: string;
  onClose: () => void;
  onApprove: (loanId: string, comments?: string) => void;
  onReject: (loanId: string, reason: string) => void;
}

interface LoanDetails {
  id: string;
  applicantName: string;
  applicantEmail: string;
  phone: string;
  address: string;
  amount: number;
  purpose: string;
  term: number;
  interestRate: number;
  monthlyIncome: number;
  employmentStatus: string;
  employer: string;
  creditScore: number;
  riskScore: number;
  submittedAt: string;
  documents: Array<{
    id: string;
    name: string;
    type: string;
    status: 'verified' | 'pending' | 'rejected';
    uploadedAt: string;
  }>;
  creditHistory: Array<{
    type: string;
    amount: number;
    status: string;
    date: string;
  }>;
}

const LoanReviewPanel: React.FC<LoanReviewPanelProps> = ({
  loanId,
  onClose,
  onApprove,
  onReject
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [comments, setComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);

  // Mock data - replace with actual API call
  const loanDetails: LoanDetails = {
    id: loanId,
    applicantName: 'John Doe',
    applicantEmail: 'john.doe@email.com',
    phone: '+264 81 123 4567',
    address: '123 Independence Ave, Windhoek, Namibia',
    amount: 50000,
    purpose: 'Business expansion',
    term: 24,
    interestRate: 18.5,
    monthlyIncome: 15000,
    employmentStatus: 'Employed',
    employer: 'ABC Corporation',
    creditScore: 720,
    riskScore: 35,
    submittedAt: '2025-01-01T10:00:00Z',
    documents: [
      { id: '1', name: 'ID Document', type: 'identity', status: 'verified', uploadedAt: '2025-01-01T10:00:00Z' },
      { id: '2', name: 'Proof of Income', type: 'income', status: 'verified', uploadedAt: '2025-01-01T10:05:00Z' },
      { id: '3', name: 'Bank Statements', type: 'financial', status: 'pending', uploadedAt: '2025-01-01T10:10:00Z' },
      { id: '4', name: 'Business Plan', type: 'business', status: 'verified', uploadedAt: '2025-01-01T10:15:00Z' }
    ],
    creditHistory: [
      { type: 'Personal Loan', amount: 25000, status: 'Paid', date: '2024-06-15' },
      { type: 'Credit Card', amount: 5000, status: 'Active', date: '2023-12-01' },
      { type: 'Vehicle Loan', amount: 80000, status: 'Paid', date: '2022-03-20' }
    ]
  };

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

  const getRiskLevel = (score: number) => {
    if (score >= 70) return { label: 'High', color: 'bg-red-100 text-red-800 border-red-200' };
    if (score >= 40) return { label: 'Medium', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    return { label: 'Low', color: 'bg-green-100 text-green-800 border-green-200' };
  };

  const getDocumentStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      onApprove(loanId, comments);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      onReject(loanId, rejectionReason);
    } finally {
      setLoading(false);
    }
  };

  const riskLevel = getRiskLevel(loanDetails.riskScore);
  const monthlyPayment = (loanDetails.amount * (loanDetails.interestRate / 100 / 12)) / 
    (1 - Math.pow(1 + (loanDetails.interestRate / 100 / 12), -loanDetails.term));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">Loan Application Review</h2>
            <p className="text-gray-600">Application ID: {loanId}</p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <XCircle className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-200px)]">
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="financial">Financial</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="history">Credit History</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                {/* Applicant Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-5 w-5" />
                      <span>Applicant Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Full Name</label>
                        <p className="text-lg font-semibold">{loanDetails.applicantName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <p className="flex items-center space-x-2">
                          <Mail className="h-4 w-4" />
                          <span>{loanDetails.applicantEmail}</span>
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Phone</label>
                        <p className="flex items-center space-x-2">
                          <Phone className="h-4 w-4" />
                          <span>{loanDetails.phone}</span>
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Address</label>
                        <p className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4" />
                          <span>{loanDetails.address}</span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Loan Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <DollarSign className="h-5 w-5" />
                      <span>Loan Details</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Requested Amount</label>
                          <p className="text-2xl font-bold text-green-600">{formatCurrency(loanDetails.amount)}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Purpose</label>
                          <p className="text-lg">{loanDetails.purpose}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Risk Assessment</label>
                          <Badge variant="outline" className={riskLevel.color}>
                            {riskLevel.label} Risk ({loanDetails.riskScore}%)
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Term</label>
                          <p className="text-lg">{loanDetails.term} months</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Interest Rate</label>
                          <p className="text-lg">{loanDetails.interestRate}% per annum</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Monthly Payment</label>
                          <p className="text-lg font-semibold">{formatCurrency(monthlyPayment)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="financial" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Briefcase className="h-5 w-5" />
                      <span>Financial Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Monthly Income</label>
                          <p className="text-xl font-semibold">{formatCurrency(loanDetails.monthlyIncome)}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Employment Status</label>
                          <p className="text-lg">{loanDetails.employmentStatus}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Employer</label>
                          <p className="text-lg">{loanDetails.employer}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Credit Score</label>
                          <p className="text-xl font-semibold">{loanDetails.creditScore}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Debt-to-Income Ratio</label>
                          <p className="text-lg">{((monthlyPayment / loanDetails.monthlyIncome) * 100).toFixed(1)}%</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Application Date</label>
                          <p className="text-lg">{formatDate(loanDetails.submittedAt)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="h-5 w-5" />
                      <span>Required Documents</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {loanDetails.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            {getDocumentStatusIcon(doc.status)}
                            <div>
                              <p className="font-medium">{doc.name}</p>
                              <p className="text-sm text-gray-500">
                                Uploaded {formatDate(doc.uploadedAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant="outline" 
                              className={
                                doc.status === 'verified' ? 'bg-green-100 text-green-800 border-green-200' :
                                doc.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                'bg-red-100 text-red-800 border-red-200'
                              }
                            >
                              {doc.status}
                            </Badge>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <CreditCard className="h-5 w-5" />
                      <span>Credit History</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {loanDetails.creditHistory.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">{item.type}</p>
                            <p className="text-sm text-gray-500">{formatDate(item.date)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(item.amount)}</p>
                            <Badge 
                              variant="outline"
                              className={
                                item.status === 'Paid' ? 'bg-green-100 text-green-800 border-green-200' :
                                item.status === 'Active' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                'bg-red-100 text-red-800 border-red-200'
                              }
                            >
                              {item.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Decision Panel */}
          <div className="w-80 border-l bg-gray-50 p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Decision Panel</h3>
              
              {/* Quick Stats */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Risk Score:</span>
                  <Badge variant="outline" className={riskLevel.color}>
                    {loanDetails.riskScore}%
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Credit Score:</span>
                  <span className="font-medium">{loanDetails.creditScore}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">DTI Ratio:</span>
                  <span className="font-medium">{((monthlyPayment / loanDetails.monthlyIncome) * 100).toFixed(1)}%</span>
                </div>
              </div>

              {/* Comments */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Comments (Optional)</label>
                <Textarea
                  placeholder="Add any comments or notes about this application..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Rejection Reason */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Rejection Reason</label>
                <Textarea
                  placeholder="Required if rejecting the application..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                <Button
                  onClick={handleApprove}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {loading ? 'Processing...' : 'Approve Application'}
                </Button>
                
                <Button
                  onClick={handleReject}
                  disabled={loading || !rejectionReason.trim()}
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {loading ? 'Processing...' : 'Reject Application'}
                </Button>

                <Button
                  onClick={onClose}
                  variant="ghost"
                  className="w-full"
                >
                  Close Review
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanReviewPanel;
