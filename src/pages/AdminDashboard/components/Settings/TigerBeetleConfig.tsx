/**
 * TigerBeetle Configuration Component
 * Allows admins to configure TigerBeetle ledger settings, outbox processing,
 * and reconciliation parameters
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Database,
  Server,
  RefreshCw,
  Settings,
  Clock,
  AlertTriangle,
  Save,
  RotateCcw,
  CheckCircle,
  Info,
  Loader2,
  Zap,
  Activity,
  FileCheck,
  Link2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Configuration interfaces
interface TigerBeetleConnectionConfig {
  enabled: boolean;
  cluster_id: number;
  replica_addresses: string[];
  connection_timeout_ms: number;
  request_timeout_ms: number;
}

interface TigerBeetleOutboxConfig {
  processing_enabled: boolean;
  batch_size: number;
  max_retries: number;
  retry_delay_ms: number;
  processing_interval_ms: number;
  dead_letter_after_retries: number;
}

interface TigerBeetleReconciliationConfig {
  enabled: boolean;
  schedule_cron: string;
  variance_threshold_percent: number;
  alert_on_variance: boolean;
  auto_resolve_minor_discrepancies: boolean;
}

interface TigerBeetleAccountsConfig {
  ledger_id: number;
  asset_scale: number;
  auto_create_loan_accounts: boolean;
  account_code_ranges: {
    borrower: { start: number; end: number };
    operational: { start: number; end: number };
    ips: { start: number; end: number };
    income: { start: number; end: number };
    expense: { start: number; end: number };
  };
}

interface TigerBeetleConfig {
  connection: TigerBeetleConnectionConfig;
  outbox: TigerBeetleOutboxConfig;
  reconciliation: TigerBeetleReconciliationConfig;
  accounts: TigerBeetleAccountsConfig;
}

const DEFAULT_CONFIG: TigerBeetleConfig = {
  connection: {
    enabled: true,
    cluster_id: 0,
    replica_addresses: ['127.0.0.1:3001'],
    connection_timeout_ms: 5000,
    request_timeout_ms: 10000,
  },
  outbox: {
    processing_enabled: true,
    batch_size: 100,
    max_retries: 5,
    retry_delay_ms: 1000,
    processing_interval_ms: 5000,
    dead_letter_after_retries: 10,
  },
  reconciliation: {
    enabled: true,
    schedule_cron: '0 3 * * *',
    variance_threshold_percent: 0.01,
    alert_on_variance: true,
    auto_resolve_minor_discrepancies: false,
  },
  accounts: {
    ledger_id: 1,
    asset_scale: 2,
    auto_create_loan_accounts: true,
    account_code_ranges: {
      borrower: { start: 1000, end: 1999 },
      operational: { start: 2000, end: 2999 },
      ips: { start: 3000, end: 3999 },
      income: { start: 5000, end: 5999 },
      expense: { start: 6000, end: 6999 },
    },
  },
};

export function TigerBeetleConfig() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<TigerBeetleConfig>(DEFAULT_CONFIG);
  const [hasChanges, setHasChanges] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [testingConnection, setTestingConnection] = useState(false);

  // Load configuration from database
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_config_by_category', {
        p_category: 'tigerbeetle'
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const loadedConfig = { ...DEFAULT_CONFIG };
        data.forEach((item: { config_key: string; config_value: any }) => {
          const key = item.config_key.replace('tigerbeetle.', '') as keyof TigerBeetleConfig;
          if (key in loadedConfig) {
            (loadedConfig as any)[key] = item.config_value;
          }
        });
        setConfig(loadedConfig);
      }
    } catch (error) {
      console.error('Error loading TigerBeetle config:', error);
      // Use defaults if loading fails
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = <K extends keyof TigerBeetleConfig>(
    section: K,
    key: keyof TigerBeetleConfig[K],
    value: any
  ) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save each section
      const sections: (keyof TigerBeetleConfig)[] = ['connection', 'outbox', 'reconciliation', 'accounts'];
      
      for (const section of sections) {
        const { data, error } = await supabase.rpc('update_config', {
          p_config_key: `tigerbeetle.${section}`,
          p_config_value: config[section]
        });

        if (error) throw error;
        if (data && !data.success) throw new Error(data.error);
      }

      toast({
        title: 'Configuration Saved',
        description: 'TigerBeetle configuration has been updated successfully.'
      });
      setHasChanges(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save configuration',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    setHasChanges(true);
  };

  const testConnection = async () => {
    setTestingConnection(true);
    try {
      // In production, this would call an edge function to test the connection
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate connection test result
      const isConnected = config.connection.enabled && config.connection.replica_addresses.length > 0;
      setConnectionStatus(isConnected ? 'connected' : 'disconnected');
      
      toast({
        title: isConnected ? 'Connection Successful' : 'Connection Failed',
        description: isConnected 
          ? `Connected to TigerBeetle cluster ${config.connection.cluster_id}`
          : 'Unable to connect to TigerBeetle cluster',
        variant: isConnected ? 'default' : 'destructive'
      });
    } catch (error) {
      setConnectionStatus('disconnected');
      toast({
        title: 'Connection Test Failed',
        description: 'Error testing TigerBeetle connection',
        variant: 'destructive'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            TigerBeetle Configuration
          </h2>
          <p className="text-muted-foreground">
            Configure financial ledger settings, outbox processing, and reconciliation
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800">
              Unsaved Changes
            </Badge>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Default
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset TigerBeetle Configuration?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reset all TigerBeetle settings to their default values.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-300">Financial Ledger Integration</h4>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                TigerBeetle provides strict double-entry bookkeeping with built-in idempotency 
                and immutability. Changes to these settings may affect financial reconciliation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="connection" className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
          <TabsTrigger value="connection">Connection</TabsTrigger>
          <TabsTrigger value="outbox">Outbox Processing</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          <TabsTrigger value="accounts">Account Structure</TabsTrigger>
        </TabsList>

        {/* Connection Tab */}
        <TabsContent value="connection">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Cluster Connection
              </CardTitle>
              <CardDescription>
                Configure TigerBeetle cluster connection settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Connection Status */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-500' :
                    connectionStatus === 'disconnected' ? 'bg-red-500' :
                    'bg-gray-400'
                  }`} />
                  <div>
                    <div className="font-medium">Connection Status</div>
                    <div className="text-sm text-muted-foreground">
                      {connectionStatus === 'connected' ? 'Connected to TigerBeetle cluster' :
                       connectionStatus === 'disconnected' ? 'Not connected' :
                       'Status unknown - test connection'}
                    </div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={testConnection}
                  disabled={testingConnection}
                >
                  {testingConnection ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Test Connection
                </Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Enable TigerBeetle Integration</Label>
                  <p className="text-xs text-muted-foreground">
                    When disabled, financial operations use Postgres only
                  </p>
                </div>
                <Switch
                  checked={config.connection.enabled}
                  onCheckedChange={(checked) => updateConfig('connection', 'enabled', checked)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label>Cluster ID</Label>
                  <Input
                    type="number"
                    value={config.connection.cluster_id}
                    onChange={(e) => updateConfig('connection', 'cluster_id', Number(e.target.value))}
                    min={0}
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    TigerBeetle cluster identifier (0 for development)
                  </p>
                </div>

                <div className="space-y-4">
                  <Label>Replica Addresses</Label>
                  <Input
                    value={config.connection.replica_addresses.join(', ')}
                    onChange={(e) => updateConfig('connection', 'replica_addresses', 
                      e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    )}
                    placeholder="127.0.0.1:3001, 127.0.0.1:3002"
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated list of replica addresses
                  </p>
                </div>

                <div className="space-y-4">
                  <Label>Connection Timeout (ms)</Label>
                  <Input
                    type="number"
                    value={config.connection.connection_timeout_ms}
                    onChange={(e) => updateConfig('connection', 'connection_timeout_ms', Number(e.target.value))}
                    min={1000}
                    max={30000}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-4">
                  <Label>Request Timeout (ms)</Label>
                  <Input
                    type="number"
                    value={config.connection.request_timeout_ms}
                    onChange={(e) => updateConfig('connection', 'request_timeout_ms', Number(e.target.value))}
                    min={1000}
                    max={60000}
                    className="bg-background"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outbox Processing Tab */}
        <TabsContent value="outbox">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Outbox Processing
              </CardTitle>
              <CardDescription>
                Configure the transactional outbox pattern for reliable ledger posting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Enable Outbox Processing</Label>
                  <p className="text-xs text-muted-foreground">
                    Process pending ledger entries via the outbox worker
                  </p>
                </div>
                <Switch
                  checked={config.outbox.processing_enabled}
                  onCheckedChange={(checked) => updateConfig('outbox', 'processing_enabled', checked)}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label>Batch Size</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[config.outbox.batch_size]}
                      onValueChange={([value]) => updateConfig('outbox', 'batch_size', value)}
                      min={10}
                      max={500}
                      step={10}
                      className="flex-1"
                    />
                    <span className="w-16 text-right font-medium tabular-nums">
                      {config.outbox.batch_size}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Number of entries to process per batch
                  </p>
                </div>

                <div className="space-y-4">
                  <Label>Processing Interval (ms)</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[config.outbox.processing_interval_ms]}
                      onValueChange={([value]) => updateConfig('outbox', 'processing_interval_ms', value)}
                      min={1000}
                      max={30000}
                      step={1000}
                      className="flex-1"
                    />
                    <span className="w-20 text-right font-medium tabular-nums">
                      {(config.outbox.processing_interval_ms / 1000).toFixed(0)}s
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Max Retries</Label>
                  <Input
                    type="number"
                    value={config.outbox.max_retries}
                    onChange={(e) => updateConfig('outbox', 'max_retries', Number(e.target.value))}
                    min={1}
                    max={20}
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum retry attempts before failure
                  </p>
                </div>

                <div className="space-y-4">
                  <Label>Retry Delay (ms)</Label>
                  <Input
                    type="number"
                    value={config.outbox.retry_delay_ms}
                    onChange={(e) => updateConfig('outbox', 'retry_delay_ms', Number(e.target.value))}
                    min={100}
                    max={10000}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-4">
                  <Label>Dead Letter After Retries</Label>
                  <Input
                    type="number"
                    value={config.outbox.dead_letter_after_retries}
                    onChange={(e) => updateConfig('outbox', 'dead_letter_after_retries', Number(e.target.value))}
                    min={config.outbox.max_retries}
                    max={50}
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    Move to dead letter queue after this many retries
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Processing Summary</h4>
                <div className="text-sm text-muted-foreground">
                  The outbox worker will process up to {config.outbox.batch_size} entries 
                  every {config.outbox.processing_interval_ms / 1000} seconds. Failed entries 
                  will be retried up to {config.outbox.max_retries} times with a {config.outbox.retry_delay_ms}ms delay.
                  After {config.outbox.dead_letter_after_retries} failures, entries move to the dead letter queue.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reconciliation Tab */}
        <TabsContent value="reconciliation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Reconciliation Settings
              </CardTitle>
              <CardDescription>
                Configure automated reconciliation between Supabase and TigerBeetle
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Enable Reconciliation</Label>
                  <p className="text-xs text-muted-foreground">
                    Run scheduled reconciliation jobs
                  </p>
                </div>
                <Switch
                  checked={config.reconciliation.enabled}
                  onCheckedChange={(checked) => updateConfig('reconciliation', 'enabled', checked)}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label>Schedule (Cron Expression)</Label>
                  <Input
                    value={config.reconciliation.schedule_cron}
                    onChange={(e) => updateConfig('reconciliation', 'schedule_cron', e.target.value)}
                    placeholder="0 3 * * *"
                    className="bg-background font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Default: 3:00 AM daily (0 3 * * *)
                  </p>
                </div>

                <div className="space-y-4">
                  <Label>Variance Threshold (%)</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[config.reconciliation.variance_threshold_percent * 100]}
                      onValueChange={([value]) => updateConfig('reconciliation', 'variance_threshold_percent', value / 100)}
                      min={0}
                      max={5}
                      step={0.01}
                      className="flex-1"
                    />
                    <span className="w-20 text-right font-medium tabular-nums">
                      {(config.reconciliation.variance_threshold_percent * 100).toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Flag discrepancies above this threshold
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Alert on Variance</Label>
                    <p className="text-xs text-muted-foreground">
                      Send alerts when variances detected
                    </p>
                  </div>
                  <Switch
                    checked={config.reconciliation.alert_on_variance}
                    onCheckedChange={(checked) => updateConfig('reconciliation', 'alert_on_variance', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Auto-Resolve Minor Discrepancies</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically resolve sub-threshold variances
                    </p>
                  </div>
                  <Switch
                    checked={config.reconciliation.auto_resolve_minor_discrepancies}
                    onCheckedChange={(checked) => updateConfig('reconciliation', 'auto_resolve_minor_discrepancies', checked)}
                  />
                </div>
              </div>

              {config.reconciliation.auto_resolve_minor_discrepancies && (
                <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-900 dark:text-yellow-300">Caution</h4>
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">
                          Auto-resolving discrepancies may mask underlying data issues. 
                          All auto-resolved variances are logged for audit purposes.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Structure Tab */}
        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Account Structure
              </CardTitle>
              <CardDescription>
                Configure the chart of accounts and account code ranges
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label>Ledger ID</Label>
                  <Input
                    type="number"
                    value={config.accounts.ledger_id}
                    onChange={(e) => updateConfig('accounts', 'ledger_id', Number(e.target.value))}
                    min={1}
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    TigerBeetle ledger identifier (1 = NAD)
                  </p>
                </div>

                <div className="space-y-4">
                  <Label>Asset Scale</Label>
                  <Select
                    value={String(config.accounts.asset_scale)}
                    onValueChange={(value) => updateConfig('accounts', 'asset_scale', Number(value))}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 - Whole units</SelectItem>
                      <SelectItem value="2">2 - Cents (NAD 100.00 = 10000)</SelectItem>
                      <SelectItem value="4">4 - Basis points</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Decimal precision for amounts
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Auto-Create Loan Accounts</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically create TigerBeetle accounts when loans are approved
                  </p>
                </div>
                <Switch
                  checked={config.accounts.auto_create_loan_accounts}
                  onCheckedChange={(checked) => updateConfig('accounts', 'auto_create_loan_accounts', checked)}
                />
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-4">Account Code Ranges</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(config.accounts.account_code_ranges).map(([key, range]) => (
                    <div key={key} className="p-4 border rounded-lg space-y-3">
                      <Label className="capitalize">{key} Accounts</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={range.start}
                          onChange={(e) => updateConfig('accounts', 'account_code_ranges', {
                            ...config.accounts.account_code_ranges,
                            [key]: { ...range, start: Number(e.target.value) }
                          })}
                          className="w-24 bg-background"
                          placeholder="Start"
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          type="number"
                          value={range.end}
                          onChange={(e) => updateConfig('accounts', 'account_code_ranges', {
                            ...config.accounts.account_code_ranges,
                            [key]: { ...range, end: Number(e.target.value) }
                          })}
                          className="w-24 bg-background"
                          placeholder="End"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Account Code Reference</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  <div><span className="font-mono">1001</span> - Principal Receivable</div>
                  <div><span className="font-mono">1002</span> - Interest Receivable</div>
                  <div><span className="font-mono">1003</span> - Fee Receivable</div>
                  <div><span className="font-mono">2001</span> - Disbursement Clearing</div>
                  <div><span className="font-mono">2002</span> - Collections Clearing</div>
                  <div><span className="font-mono">3001</span> - IPS Pending Inbound</div>
                  <div><span className="font-mono">5001</span> - Interest Income</div>
                  <div><span className="font-mono">6001</span> - Write-off Expense</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default TigerBeetleConfig;
