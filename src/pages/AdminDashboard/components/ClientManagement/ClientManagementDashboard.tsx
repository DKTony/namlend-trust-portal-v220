import { AdaptiveTabs, ResponsiveActionBar } from '@/components/adaptive';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import {
  AlertCircle,
  Download,
  Filter,
  MessageSquare,
  Plus,
  Search,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import React, { useState } from 'react';

// Sub-components
import ClientProfileModal from '@/components/modals/ClientProfileModal';
import ClientPortfolioOverview from './ClientPortfolioOverview';
import ClientsList from './ClientsList';
import CommunicationCenter from './CommunicationCenter';
import SupportTickets from './SupportTickets';

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
      <ResponsiveActionBar
        title={<h2 className="text-2xl font-bold tracking-tight">Client Management</h2>}
        description={
          <p className="text-muted-foreground">
            Manage client relationships, profiles, and communications
          </p>
        }
        actions={
          <>
            <ThemedButton
              variant="secondary"
              className="h-9 px-3 text-xs"
              disabled
              title="Extra client filters are not implemented; use search and status below"
            >
              <Filter className="mr-2 h-3.5 w-3.5" />
              Filters
            </ThemedButton>
            <ThemedButton
              variant="secondary"
              className="h-9 px-3 text-xs"
              disabled
              title="Client CSV export is not implemented"
            >
              <Download className="mr-2 h-3.5 w-3.5" />
              Export
            </ThemedButton>
            <ThemedButton
              className="h-9 px-3 text-xs"
              disabled
              title="Clients register at /auth; there is no invite mailer"
            >
              <Plus className="mr-2 h-3.5 w-3.5" />
              Add Client
            </ThemedButton>
          </>
        }
      />

      {/* Client Portfolio Overview */}
      <ClientPortfolioOverview />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <AdaptiveTabs
          desktopColumns={5}
          items={[
            { value: 'overview', label: 'All Clients', shortLabel: 'All', icon: Users },
            {
              value: 'recent',
              label: 'Recently enrolled',
              shortLabel: 'New',
              icon: UserPlus,
            },
            { value: 'active', label: 'Active Clients', shortLabel: 'Active', icon: UserCheck },
            {
              value: 'communications',
              label: 'Communications',
              shortLabel: 'Messages',
              icon: MessageSquare,
            },
            {
              value: 'support',
              label: 'Support Tickets',
              shortLabel: 'Support',
              icon: AlertCircle,
            },
          ]}
        />

        {/* Search and Filter Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground sm:w-56"
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

        <TabsContent value="recent" className="space-y-4">
          <ClientsList
            status="recent"
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
