/**
 * TigerBeetle Configuration Component
 * Allows admins to configure TigerBeetle ledger settings, outbox processing,
 * and reconciliation parameters.
 *
 * Refactored into sub-components for maintainability.
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import useTigerBeetleConfig from '@/hooks/useTigerBeetleConfig';
import { ConfigHeader } from '@/pages/AdminDashboard/components/Settings/TigerBeetleConfig/ConfigHeader';
import { ConnectionTab } from '@/pages/AdminDashboard/components/Settings/TigerBeetleConfig/ConnectionTab';
import { OutboxTab } from '@/pages/AdminDashboard/components/Settings/TigerBeetleConfig/OutboxTab';
import { ReconciliationTab } from '@/pages/AdminDashboard/components/Settings/TigerBeetleConfig/ReconciliationTab';
import { AccountsTab } from '@/pages/AdminDashboard/components/Settings/TigerBeetleConfig/AccountsTab';

export function TigerBeetleConfig() {
  const {
    loading,
    saving,
    config,
    hasChanges,
    connectionStatus,
    testingConnection,
    updateConfig,
    handleSave,
    handleReset,
    testConnection,
  } = useTigerBeetleConfig();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConfigHeader
        hasChanges={hasChanges}
        saving={saving}
        onSave={handleSave}
        onReset={handleReset}
      />

      <Tabs defaultValue="connection" className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
          <TabsTrigger value="connection">Connection</TabsTrigger>
          <TabsTrigger value="outbox">Outbox Processing</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          <TabsTrigger value="accounts">Account Structure</TabsTrigger>
        </TabsList>

        <TabsContent value="connection">
          <ConnectionTab
            config={config.connection}
            connectionStatus={connectionStatus}
            testingConnection={testingConnection}
            onUpdateConfig={(key, value) => updateConfig('connection', key, value)}
            onTestConnection={testConnection}
          />
        </TabsContent>

        <TabsContent value="outbox">
          <OutboxTab
            config={config.outbox}
            onUpdateConfig={(key, value) => updateConfig('outbox', key, value)}
          />
        </TabsContent>

        <TabsContent value="reconciliation">
          <ReconciliationTab
            config={config.reconciliation}
            onUpdateConfig={(key, value) => updateConfig('reconciliation', key, value)}
          />
        </TabsContent>

        <TabsContent value="accounts">
          <AccountsTab
            config={config.accounts}
            onUpdateConfig={(key, value) => updateConfig('accounts', key, value)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default TigerBeetleConfig;
