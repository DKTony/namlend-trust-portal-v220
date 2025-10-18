import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  Plus,
  MessageSquare,
  AlertCircle,
  UserCheck
} from 'lucide-react';

// Sub-components
import ClientPortfolioOverview from './ClientPortfolioOverview';
import ClientsList from './ClientsList';
import CommunicationCenter from './CommunicationCenter';
import SupportTickets from './SupportTickets';
import ClientProfileModal from '@/components/ClientProfileModal';

interface ClientManagementDashboardProps {
  onClientSelect?: (clientId: string) => void;
}

const ClientManagementDashboard: React.FC<ClientManagementDashboardProps> = ({ 
  onClientSelect 
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const handleClientSelection = (clientId: string) => {
    setSelectedClient(clientId);
    onClientSelect?.(clientId);
  };

  const handleCloseProfile = () => {
    setSelectedClient(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Client Management</h2>
          <p className="text-muted-foreground">
            Manage client relationships, profiles, and communications
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Client Portfolio Overview */}
      <ClientPortfolioOverview />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            All Clients
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Active Clients
          </TabsTrigger>
          <TabsTrigger value="communications" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Communications
          </TabsTrigger>
          <TabsTrigger value="support" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Support Tickets
          </TabsTrigger>
        </TabsList>

        {/* Search and Filter Bar */}
        <div className="flex space-x-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by client name, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending Verification</option>
          </select>
        </div>

        {/* Tab Content */}
        <TabsContent value="overview" className="space-y-4">
          <ClientsList
            status="all"
            searchTerm={searchTerm}
            onClientSelect={handleClientSelection}
          />
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <ClientsList
            status="active"
            searchTerm={searchTerm}
            onClientSelect={handleClientSelection}
          />
        </TabsContent>

        <TabsContent value="communications" className="space-y-4">
          <CommunicationCenter />
        </TabsContent>

        <TabsContent value="support" className="space-y-4">
          <SupportTickets />
        </TabsContent>
      </Tabs>

      {/* Client Profile Modal */}
      <ClientProfileModal
        open={selectedClient !== null}
        onClose={handleCloseProfile}
        userId={selectedClient}
      />
    </div>
  );
};

export default ClientManagementDashboard;
