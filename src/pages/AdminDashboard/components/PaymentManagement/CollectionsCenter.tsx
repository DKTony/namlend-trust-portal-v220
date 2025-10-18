import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Filter,
  FileText,
  Target,
  TrendingUp,
  Users
} from 'lucide-react';

interface CollectionCase {
  id: string;
  clientName: string;
  loanId: string;
  totalOwed: number;
  daysOverdue: number;
  stage: 'early' | 'formal' | 'legal' | 'writeoff';
  assignedAgent: string;
  lastAction: string;
  lastActionDate: string;
  nextAction: string;
  nextActionDate: string;
  collectionStrategy: 'standard' | 'payment_plan' | 'settlement' | 'legal';
  recoveryProbability: number;
}

const CollectionsCenter: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<'all' | 'early' | 'formal' | 'legal' | 'writeoff'>('all');
  const [selectedCases, setSelectedCases] = useState<string[]>([]);

  // Mock collections data
  const collectionCases: CollectionCase[] = [
    {
      id: '1',
      clientName: 'John Nangolo',
      loanId: 'LOAN-001',
      totalOwed: 15500,
      daysOverdue: 45,
      stage: 'formal',
      assignedAgent: 'Sarah Williams',
      lastAction: 'Formal demand letter sent',
      lastActionDate: '2025-01-02',
      nextAction: 'Phone call follow-up',
      nextActionDate: '2025-01-06',
      collectionStrategy: 'standard',
      recoveryProbability: 75
    },
    {
      id: '2',
      clientName: 'Maria Shikongo',
      loanId: 'LOAN-045',
      totalOwed: 28900,
      daysOverdue: 78,
      stage: 'legal',
      assignedAgent: 'David Thompson',
      lastAction: 'Legal notice served',
      lastActionDate: '2024-12-28',
      nextAction: 'Court filing',
      nextActionDate: '2025-01-10',
      collectionStrategy: 'legal',
      recoveryProbability: 45
    },
    {
      id: '3',
      clientName: 'Peter Nghipondoka',
      loanId: 'LOAN-089',
      totalOwed: 8200,
      daysOverdue: 25,
      stage: 'early',
      assignedAgent: 'Lisa Johnson',
      lastAction: 'SMS reminder sent',
      lastActionDate: '2025-01-03',
      nextAction: 'Phone call',
      nextActionDate: '2025-01-05',
      collectionStrategy: 'payment_plan',
      recoveryProbability: 85
    },
    {
      id: '4',
      clientName: 'Sarah Amukoto',
      loanId: 'LOAN-067',
      totalOwed: 45600,
      daysOverdue: 120,
      stage: 'writeoff',
      assignedAgent: 'Michael Brown',
      lastAction: 'Write-off assessment',
      lastActionDate: '2024-12-15',
      nextAction: 'Final settlement offer',
      nextActionDate: '2025-01-08',
      collectionStrategy: 'settlement',
      recoveryProbability: 15
    },
    {
      id: '5',
      clientName: 'David Katanga',
      loanId: 'LOAN-023',
      totalOwed: 12300,
      daysOverdue: 35,
      stage: 'formal',
      assignedAgent: 'Sarah Williams',
      lastAction: 'Payment plan negotiated',
      lastActionDate: '2025-01-01',
      nextAction: 'Payment plan follow-up',
      nextActionDate: '2025-01-07',
      collectionStrategy: 'payment_plan',
      recoveryProbability: 90
    }
  ];

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'early': return 'bg-yellow-100 text-yellow-800';
      case 'formal': return 'bg-orange-100 text-orange-800';
      case 'legal': return 'bg-red-100 text-red-800';
      case 'writeoff': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStrategyColor = (strategy: string) => {
    switch (strategy) {
      case 'standard': return 'bg-blue-100 text-blue-800';
      case 'payment_plan': return 'bg-green-100 text-green-800';
      case 'settlement': return 'bg-purple-100 text-purple-800';
      case 'legal': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 70) return 'text-green-600';
    if (probability >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredCases = collectionCases.filter(case_ => {
    const matchesSearch = case_.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         case_.loanId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         case_.assignedAgent.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = stageFilter === 'all' || case_.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const handleSelectCase = (caseId: string) => {
    setSelectedCases(prev => 
      prev.includes(caseId) 
        ? prev.filter(id => id !== caseId)
        : [...prev, caseId]
    );
  };

  const handleBulkAction = (action: string) => {
    console.log(`Performing ${action} on cases:`, selectedCases);
    alert(`${action} action would be performed on ${selectedCases.length} selected cases.`);
  };

  const handleCaseAction = (caseId: string, action: string) => {
    console.log(`Performing ${action} on case ${caseId}`);
    alert(`${action} action would be performed on this case.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Collections Center</h2>
          <p className="text-muted-foreground">
            Manage collection cases and recovery strategies
          </p>
        </div>
        <Badge variant="destructive" className="text-sm">
          {filteredCases.length} active cases
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              NAD {collectionCases.reduce((sum, c) => sum + c.totalOwed, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {collectionCases.length} cases
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recovery Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">68%</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +5% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Legal Cases</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {collectionCases.filter(c => c.stage === 'legal').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Requiring legal action
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {new Set(collectionCases.map(c => c.assignedAgent)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Collection agents
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
              placeholder="Search by client name, loan ID, or agent..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <Select value={stageFilter} onValueChange={(value: any) => setStageFilter(value)}>
          <SelectTrigger className="w-48">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="early">Early Collection</SelectItem>
            <SelectItem value="formal">Formal Collection</SelectItem>
            <SelectItem value="legal">Legal Action</SelectItem>
            <SelectItem value="writeoff">Write-off</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {selectedCases.length > 0 && (
        <div className="flex items-center space-x-2 p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedCases.length} case(s) selected
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleBulkAction('Assign Agent')}
          >
            <User className="mr-2 h-4 w-4" />
            Assign Agent
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleBulkAction('Update Stage')}
          >
            <Target className="mr-2 h-4 w-4" />
            Update Stage
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleBulkAction('Generate Reports')}
          >
            <FileText className="mr-2 h-4 w-4" />
            Generate Reports
          </Button>
        </div>
      )}

      {/* Collection Cases List */}
      <Card>
        <CardHeader>
          <CardTitle>Collection Cases</CardTitle>
          <CardDescription>
            Active collection cases requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCases.map((case_) => (
              <div 
                key={case_.id} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedCases.includes(case_.id)}
                    onChange={() => handleSelectCase(case_.id)}
                    className="rounded"
                  />
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{case_.clientName}</span>
                      <Badge variant="outline" className="text-xs">
                        {case_.loanId}
                      </Badge>
                      <Badge 
                        variant="secondary" 
                        className={getStageColor(case_.stage)}
                      >
                        {case_.stage}
                      </Badge>
                      <Badge 
                        variant="secondary" 
                        className={getStrategyColor(case_.collectionStrategy)}
                      >
                        {case_.collectionStrategy.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>Owed: NAD {case_.totalOwed.toLocaleString()}</span>
                      <span>{case_.daysOverdue} days overdue</span>
                      <span>Agent: {case_.assignedAgent}</span>
                      <span className={getProbabilityColor(case_.recoveryProbability)}>
                        {case_.recoveryProbability}% recovery probability
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <span>Last: {case_.lastAction} ({new Date(case_.lastActionDate).toLocaleDateString()})</span>
                      <span>Next: {case_.nextAction} ({new Date(case_.nextActionDate).toLocaleDateString()})</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCaseAction(case_.id, 'Contact')}
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Contact
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCaseAction(case_.id, 'Update')}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Update
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCaseAction(case_.id, 'Escalate')}
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Escalate
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common collection tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Mail className="mr-2 h-4 w-4" />
              Send Bulk Reminders
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Generate Collection Report
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Follow-ups
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Target className="mr-2 h-4 w-4" />
              Update Recovery Targets
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Collection Notes</CardTitle>
            <CardDescription>Add notes for selected cases</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea 
              placeholder="Enter collection notes or updates..."
              className="min-h-[100px]"
            />
            <Button className="w-full">
              <FileText className="mr-2 h-4 w-4" />
              Save Notes
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CollectionsCenter;
