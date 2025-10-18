import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AlertTriangle, 
  Calendar, 
  Phone, 
  Mail, 
  MessageSquare,
  DollarSign,
  Clock,
  User,
  Search,
  Filter
} from 'lucide-react';

interface OverduePayment {
  id: string;
  clientName: string;
  loanId: string;
  amount: number;
  daysOverdue: number;
  originalDueDate: string;
  lastContactDate?: string;
  contactMethod?: 'phone' | 'email' | 'sms';
  paymentPlan?: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  totalOwed: number;
}

const OverdueManager: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);

  // Mock overdue payments data
  const overduePayments: OverduePayment[] = [
    {
      id: '1',
      clientName: 'John Nangolo',
      loanId: 'LOAN-001',
      amount: 2500,
      daysOverdue: 15,
      originalDueDate: '2024-12-20',
      lastContactDate: '2025-01-02',
      contactMethod: 'phone',
      paymentPlan: false,
      riskLevel: 'medium',
      totalOwed: 2750
    },
    {
      id: '2',
      clientName: 'Maria Shikongo',
      loanId: 'LOAN-045',
      amount: 1800,
      daysOverdue: 32,
      originalDueDate: '2024-12-03',
      lastContactDate: '2024-12-28',
      contactMethod: 'email',
      paymentPlan: true,
      riskLevel: 'high',
      totalOwed: 2100
    },
    {
      id: '3',
      clientName: 'David Katanga',
      loanId: 'LOAN-023',
      amount: 3200,
      daysOverdue: 8,
      originalDueDate: '2024-12-27',
      riskLevel: 'low',
      totalOwed: 3200
    },
    {
      id: '4',
      clientName: 'Sarah Amukoto',
      loanId: 'LOAN-067',
      amount: 4500,
      daysOverdue: 45,
      originalDueDate: '2024-11-20',
      lastContactDate: '2024-12-15',
      contactMethod: 'sms',
      paymentPlan: true,
      riskLevel: 'high',
      totalOwed: 5200
    },
    {
      id: '5',
      clientName: 'Peter Nghipondoka',
      loanId: 'LOAN-089',
      amount: 1200,
      daysOverdue: 22,
      originalDueDate: '2024-12-13',
      lastContactDate: '2025-01-01',
      contactMethod: 'phone',
      paymentPlan: false,
      riskLevel: 'medium',
      totalOwed: 1350
    }
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysOverdueColor = (days: number) => {
    if (days <= 7) return 'text-yellow-600';
    if (days <= 30) return 'text-orange-600';
    return 'text-red-600';
  };

  const filteredPayments = overduePayments.filter(payment => {
    const matchesSearch = payment.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.loanId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = riskFilter === 'all' || payment.riskLevel === riskFilter;
    return matchesSearch && matchesRisk;
  });

  const handleSelectPayment = (paymentId: string) => {
    setSelectedPayments(prev => 
      prev.includes(paymentId) 
        ? prev.filter(id => id !== paymentId)
        : [...prev, paymentId]
    );
  };

  const handleBulkAction = (action: string) => {
    console.log(`Performing ${action} on payments:`, selectedPayments);
    alert(`${action} action would be performed on ${selectedPayments.length} selected payments.`);
  };

  const handleContactClient = (paymentId: string, method: 'phone' | 'email' | 'sms') => {
    console.log(`Contacting client for payment ${paymentId} via ${method}`);
    alert(`Initiating ${method} contact for overdue payment.`);
  };

  const handleCreatePaymentPlan = (paymentId: string) => {
    console.log(`Creating payment plan for payment ${paymentId}`);
    alert('Payment plan creation dialog would open here.');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Overdue Payments</h2>
          <p className="text-muted-foreground">
            Manage and track overdue loan payments
          </p>
        </div>
        <Badge variant="destructive" className="text-sm">
          {filteredPayments.length} overdue
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Overdue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              NAD {overduePayments.reduce((sum, p) => sum + p.totalOwed, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {overduePayments.length} payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {overduePayments.filter(p => p.riskLevel === 'high').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Plans</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {overduePayments.filter(p => p.paymentPlan).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Active payment plans
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Days Overdue</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {Math.round(overduePayments.reduce((sum, p) => sum + p.daysOverdue, 0) / overduePayments.length)}
            </div>
            <p className="text-xs text-muted-foreground">
              Days past due
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by client name or loan ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <Select value={riskFilter} onValueChange={(value: any) => setRiskFilter(value)}>
          <SelectTrigger className="w-48">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by risk" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk Levels</SelectItem>
            <SelectItem value="low">Low Risk</SelectItem>
            <SelectItem value="medium">Medium Risk</SelectItem>
            <SelectItem value="high">High Risk</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {selectedPayments.length > 0 && (
        <div className="flex items-center space-x-2 p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedPayments.length} payment(s) selected
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleBulkAction('Send Reminder')}
          >
            <Mail className="mr-2 h-4 w-4" />
            Send Reminders
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleBulkAction('Create Payment Plans')}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Create Payment Plans
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleBulkAction('Escalate')}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Escalate
          </Button>
        </div>
      )}

      {/* Overdue Payments List */}
      <Card>
        <CardHeader>
          <CardTitle>Overdue Payments</CardTitle>
          <CardDescription>
            Payments that are past their due date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPayments.map((payment) => (
              <div 
                key={payment.id} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedPayments.includes(payment.id)}
                    onChange={() => handleSelectPayment(payment.id)}
                    className="rounded"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{payment.clientName}</span>
                      <Badge variant="outline" className="text-xs">
                        {payment.loanId}
                      </Badge>
                      <Badge 
                        variant="secondary" 
                        className={getRiskColor(payment.riskLevel)}
                      >
                        {payment.riskLevel} risk
                      </Badge>
                      {payment.paymentPlan && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                          Payment Plan
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>Amount: NAD {payment.amount.toLocaleString()}</span>
                      <span>Total Owed: NAD {payment.totalOwed.toLocaleString()}</span>
                      <span className={getDaysOverdueColor(payment.daysOverdue)}>
                        {payment.daysOverdue} days overdue
                      </span>
                      <span>Due: {new Date(payment.originalDueDate).toLocaleDateString()}</span>
                      {payment.lastContactDate && (
                        <span>Last contact: {new Date(payment.lastContactDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleContactClient(payment.id, 'phone')}
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Call
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleContactClient(payment.id, 'email')}
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    Email
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleContactClient(payment.id, 'sms')}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    SMS
                  </Button>
                  {!payment.paymentPlan && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleCreatePaymentPlan(payment.id)}
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      Payment Plan
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OverdueManager;
