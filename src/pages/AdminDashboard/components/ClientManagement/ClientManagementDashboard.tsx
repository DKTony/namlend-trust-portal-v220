import React, { useState } from 'react';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Search,
  Filter,
  Download,
  Plus,
  MessageSquare,
  AlertCircle,
  UserCheck,
} from 'lucide-react';

// Sub-components
import ClientPortfolioOverview from './ClientPortfolioOverview';
import ClientsList from './ClientsList';
import CommunicationCenter from './CommunicationCenter';
import SupportTickets from './SupportTickets';
import ClientProfileModal from '@/components/modals/ClientProfileModal';

interface ClientManagementDashboardProps {
  onClientSelect?: (clientId: string) => void;
}

const ClientManagementDashboard: React.FC<ClientManagementDashboardProps> = ({
  onClientSelect,
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
        <div className="flex flex-wrap gap-2">
          <ThemedButton variant="secondary" className="h-9 px-3 text-xs">
            <Filter className="mr-2 h-3.5 w-3.5" />
            Filters
          </ThemedButton>
          <ThemedButton variant="secondary" className="h-9 px-3 text-xs">
            <Download className="mr-2 h-3.5 w-3.5" />
            Export
          </ThemedButton>
          <ThemedButton className="h-9 px-3 text-xs">
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add Client
          </ThemedButton>
        </div>
      </div>

      {/* Client Portfolio Overview */}
      <ClientPortfolioOverview />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Search by client name, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-input text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground"
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
