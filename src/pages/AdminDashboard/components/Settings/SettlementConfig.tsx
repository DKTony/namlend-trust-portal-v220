/**
 * Settlement & Reconciliation Configuration Component
 * Allows admins to configure settlement, IPS, and reconciliation settings
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
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
  ArrowRightLeft,
  DollarSign,
  FileText,
  AlertTriangle,
  Save,
  RotateCcw,
  Info,
  Loader2,
  Building2,
  Send,
  FileCheck,
  Shield,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery as useConvexQuery, useMutation as useConvexMutation } from 'convex/react';
import { api } from '@/integrations/convex/api';
import { formatNAD } from '@/utils/currency';

// Types
interface SettlementConfigGeneral {
  enabled: boolean;
  currency: string;
  scheme_version: string;
  auto_process_on_cutoff: boolean;
  require_manual_dispatch: boolean;
}
interface SettlementConfigNetting {
  bilateral_netting_enabled: boolean;
  include_interchange: boolean;
  separate_switching_fee_batch: boolean;
  minimum_net_amount: number;
  rounding_mode: string;
  rounding_precision: number;
}
interface SettlementConfigPacs009 {
  schema_version: string;
  message_id_prefix: string;
  end_to_end_id_prefix: string;
  local_instrument_code: string;
  settlement_method: string;
  validate_before_dispatch: boolean;
}
interface SettlementConfigTransport {
  sftp_enabled: boolean;
  sftp_host: string;
  sftp_port: number;
  sftp_username: string;
  sftp_outbound_path: string;
  sftp_inbound_path: string;
  file_naming_pattern: string;
  retry_dispatch_on_failure: boolean;
  max_dispatch_retries: number;
}
interface SettlementConfigReports {
  auto_generate_ntsl: boolean;
  auto_generate_raw_data: boolean;
  distribution_enabled: boolean;
  archive_reports: boolean;
  archive_retention_days: number;
}
interface SettlementConfigExposure {
  monitoring_enabled: boolean;
  alert_threshold_percent: number;
  notify_on_threshold_breach: boolean;
}

interface SettlementConfig {
  general: SettlementConfigGeneral;
  netting: SettlementConfigNetting;
  pacs009: SettlementConfigPacs009;
  transport: SettlementConfigTransport;
  reports: SettlementConfigReports;
  exposure: SettlementConfigExposure;
}

interface ConfigItem {
  config_key: string;
  category: string;
  config_value:
    | SettlementConfigGeneral
    | SettlementConfigNetting
    | SettlementConfigPacs009
    | SettlementConfigTransport
    | SettlementConfigReports
    | SettlementConfigExposure
    | IPSConfigConnection
    | IPSConfigTransactions
    | IPSConfigVpa
    | ReconciliationConfigGeneral
    | ReconciliationConfigVariance;
}

interface IPSConfigConnection {
  enabled: boolean;
  mock_mode: boolean;
  api_base_url: string;
  org_id: string;
  merchant_vpa: string;
  connection_timeout_ms: number;
}
interface IPSConfigTransactions {
  auto_post_to_ledger: boolean;
  pending_timeout_seconds: number;
  auto_void_on_timeout: boolean;
  require_otp_above_amount: number;
  daily_limit_per_user: number;
  monthly_limit_per_user: number;
}
interface IPSConfigVpa {
  auto_create_for_clients: boolean;
  vpa_suffix: string;
  allow_multiple_vpa: boolean;
}

interface IPSConfig {
  connection: IPSConfigConnection;
  transactions: IPSConfigTransactions;
  vpa: IPSConfigVpa;
}

interface ReconciliationConfigGeneral {
  enabled: boolean;
  auto_match_enabled: boolean;
  match_tolerance_amount: number;
  match_tolerance_days: number;
}
interface ReconciliationConfigVariance {
  auto_investigate_threshold: number;
  escalate_after_days: number;
  write_off_threshold: number;
  require_approval_for_writeoff: boolean;
}

interface ReconciliationConfig {
  general: ReconciliationConfigGeneral;
  variance: ReconciliationConfigVariance;
}

const DEFAULT_SETTLEMENT: SettlementConfig = {
  general: {
    enabled: true,
    currency: 'NAD',
    scheme_version: '1.0',
    auto_process_on_cutoff: false,
    require_manual_dispatch: true,
  },
  netting: {
    bilateral_netting_enabled: true,
    include_interchange: true,
    separate_switching_fee_batch: true,
    minimum_net_amount: 0.01,
    rounding_mode: 'HALF_UP',
    rounding_precision: 2,
  },
  pacs009: {
    schema_version: 'pacs.009.001.08',
    message_id_prefix: 'NAMLEND',
    end_to_end_id_prefix: 'NET',
    local_instrument_code: 'IPS',
    settlement_method: 'INGA',
    validate_before_dispatch: true,
  },
  transport: {
    sftp_enabled: false,
    sftp_host: '',
    sftp_port: 22,
    sftp_username: '',
    sftp_outbound_path: '/outbound',
    sftp_inbound_path: '/inbound',
    file_naming_pattern: '{run_id}_{batch_type}_{timestamp}.xml',
    retry_dispatch_on_failure: true,
    max_dispatch_retries: 3,
  },
  reports: {
    auto_generate_ntsl: true,
    auto_generate_raw_data: true,
    distribution_enabled: false,
    archive_reports: true,
    archive_retention_days: 2555,
  },
  exposure: {
    monitoring_enabled: true,
    alert_threshold_percent: 80,
    notify_on_threshold_breach: true,
  },
};

const DEFAULT_IPS: IPSConfig = {
  connection: {
    enabled: true,
    mock_mode: true,
    api_base_url: '',
    org_id: '',
    merchant_vpa: '',
    connection_timeout_ms: 30000,
  },
  transactions: {
    auto_post_to_ledger: true,
    pending_timeout_seconds: 300,
    auto_void_on_timeout: true,
    require_otp_above_amount: 10000,
    daily_limit_per_user: 100000,
    monthly_limit_per_user: 500000,
  },
  vpa: { auto_create_for_clients: true, vpa_suffix: '@namlend', allow_multiple_vpa: false },
};

const DEFAULT_RECON: ReconciliationConfig = {
  general: {
    enabled: true,
    auto_match_enabled: true,
    match_tolerance_amount: 0.01,
    match_tolerance_days: 3,
  },
  variance: {
    auto_investigate_threshold: 100,
    escalate_after_days: 7,
    write_off_threshold: 0.5,
    require_approval_for_writeoff: true,
  },
};

export function SettlementConfig() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settlement, setSettlement] = useState<SettlementConfig>(DEFAULT_SETTLEMENT);
  const [ips, setIPS] = useState<IPSConfig>(DEFAULT_IPS);
  const [recon, setRecon] = useState<ReconciliationConfig>(DEFAULT_RECON);
  const [hasChanges, setHasChanges] = useState(false);

  // Convex reactive queries for config categories
  const settlementConfig = useConvexQuery(api.systemConfig.getAllConfig, {
    category: 'settlement',
  });
  const ipsConfig = useConvexQuery(api.systemConfig.getAllConfig, { category: 'ips' });
  const reconConfig = useConvexQuery(api.systemConfig.getAllConfig, { category: 'reconciliation' });
  const setConfigMutation = useConvexMutation(api.systemConfig.setConfig);

  // Hydrate state from Convex config when data arrives
  useEffect(() => {
    if (settlementConfig === undefined || ipsConfig === undefined || reconConfig === undefined)
      return;
    setLoading(false);
    const s = { ...DEFAULT_SETTLEMENT };
    const i = { ...DEFAULT_IPS };
    const r = { ...DEFAULT_RECON };
    for (const item of settlementConfig) {
      const section = item.key?.split('.')[1];
      if (section && section in s) {
        Object.assign(s, { [section]: item.value });
      }
    }
    for (const item of ipsConfig) {
      const section = item.key?.split('.')[1];
      if (section && section in i) {
        Object.assign(i, { [section]: item.value });
      }
    }
    for (const item of reconConfig) {
      const section = item.key?.split('.')[1];
      if (section && section in r) {
        Object.assign(r, { [section]: item.value });
      }
    }
    setSettlement(s);
    setIPS(i);
    setRecon(r);
  }, [settlementConfig, ipsConfig, reconConfig]);

  const updateS = (
    section: keyof SettlementConfig,
    key: string,
    value: string | number | boolean
  ) => {
    setSettlement((p) => ({ ...p, [section]: { ...p[section], [key]: value } }));
    setHasChanges(true);
  };
  const updateI = (section: keyof IPSConfig, key: string, value: string | number | boolean) => {
    setIPS((p) => ({ ...p, [section]: { ...p[section], [key]: value } }));
    setHasChanges(true);
  };
  const updateR = (
    section: keyof ReconciliationConfig,
    key: string,
    value: string | number | boolean
  ) => {
    setRecon((p) => ({ ...p, [section]: { ...p[section], [key]: value } }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [k, v] of Object.entries(settlement))
        await setConfigMutation({ key: `settlement.${k}`, value: v, category: 'settlement' });
      for (const [k, v] of Object.entries(ips))
        await setConfigMutation({ key: `ips.${k}`, value: v, category: 'ips' });
      for (const [k, v] of Object.entries(recon))
        await setConfigMutation({
          key: `reconciliation.${k}`,
          value: v,
          category: 'reconciliation',
        });
      toast({ title: 'Configuration Saved', description: 'Settings updated successfully.' });
      setHasChanges(false);
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Unknown error';
      toast({ title: 'Error', description: errMsg, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleReset = () => {
    setSettlement(DEFAULT_SETTLEMENT);
    setIPS(DEFAULT_IPS);
    setRecon(DEFAULT_RECON);
    setHasChanges(true);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ArrowRightLeft className="h-6 w-6" />
            Settlement & Reconciliation
          </h2>
          <p className="text-muted-foreground">
            Configure IPP settlement, IPS integration, and reconciliation
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge
              variant="outline"
              className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400"
            >
              Unsaved Changes
            </Badge>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Configuration?</AlertDialogTitle>
                <AlertDialogDescription>
                  Reset all settings to defaults. Cannot be undone.
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
            Save
          </Button>
        </div>
      </div>

      {ips.connection.mock_mode && (
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <div>
                <h4 className="font-medium text-orange-900 dark:text-orange-300">
                  IPS Mock Mode Active
                </h4>
                <p className="text-sm text-orange-700 dark:text-orange-400">
                  Real transactions not processed. Configure API credentials for production.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="settlement" className="space-y-4">
        <TabsList className="grid grid-cols-1 md:grid-cols-3 w-full max-w-md">
          <TabsTrigger value="settlement">Settlement</TabsTrigger>
          <TabsTrigger value="ips">IPS/IPP</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
        </TabsList>

        <TabsContent value="settlement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Settlement Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Enable Settlement</Label>
                    <p className="text-xs text-muted-foreground">Enable settlement pipeline</p>
                  </div>
                  <Switch
                    checked={settlement.general.enabled}
                    onCheckedChange={(v) => updateS('general', 'enabled', v)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Require Manual Dispatch</Label>
                    <p className="text-xs text-muted-foreground">Admin approval before NISS</p>
                  </div>
                  <Switch
                    checked={settlement.general.require_manual_dispatch}
                    onCheckedChange={(v) => updateS('general', 'require_manual_dispatch', v)}
                  />
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={settlement.general.currency}
                    onValueChange={(v) => updateS('general', 'currency', v)}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NAD">NAD</SelectItem>
                      <SelectItem value="ZAR">ZAR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Scheme Version</Label>
                  <Input
                    value={settlement.general.scheme_version}
                    onChange={(e) => updateS('general', 'scheme_version', e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label>pacs.009 Schema</Label>
                  <Input
                    value={settlement.pacs009.schema_version}
                    onChange={(e) => updateS('pacs009', 'schema_version', e.target.value)}
                    className="bg-background font-mono text-sm"
                  />
                </div>
              </div>
              <Separator />
              <h4 className="font-medium">Netting Configuration</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Bilateral Netting</Label>
                  </div>
                  <Switch
                    checked={settlement.netting.bilateral_netting_enabled}
                    onCheckedChange={(v) => updateS('netting', 'bilateral_netting_enabled', v)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Include Interchange</Label>
                  </div>
                  <Switch
                    checked={settlement.netting.include_interchange}
                    onCheckedChange={(v) => updateS('netting', 'include_interchange', v)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Separate Switching Fee</Label>
                  </div>
                  <Switch
                    checked={settlement.netting.separate_switching_fee_batch}
                    onCheckedChange={(v) => updateS('netting', 'separate_switching_fee_batch', v)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Min Net Amount (NAD)</Label>
                  <Input
                    type="number"
                    value={settlement.netting.minimum_net_amount}
                    onChange={(e) =>
                      updateS('netting', 'minimum_net_amount', Number(e.target.value))
                    }
                    step="0.01"
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rounding Mode</Label>
                  <Select
                    value={settlement.netting.rounding_mode}
                    onValueChange={(v) => updateS('netting', 'rounding_mode', v)}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HALF_UP">Half Up</SelectItem>
                      <SelectItem value="FLOOR">Floor</SelectItem>
                      <SelectItem value="CEILING">Ceiling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <h4 className="font-medium">Reports & Exposure</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Auto-Generate NTSL</Label>
                  </div>
                  <Switch
                    checked={settlement.reports.auto_generate_ntsl}
                    onCheckedChange={(v) => updateS('reports', 'auto_generate_ntsl', v)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Archive Reports</Label>
                  </div>
                  <Switch
                    checked={settlement.reports.archive_reports}
                    onCheckedChange={(v) => updateS('reports', 'archive_reports', v)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Exposure Monitoring</Label>
                  </div>
                  <Switch
                    checked={settlement.exposure.monitoring_enabled}
                    onCheckedChange={(v) => updateS('exposure', 'monitoring_enabled', v)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Alert Threshold (%)</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[settlement.exposure.alert_threshold_percent]}
                      onValueChange={([v]) => updateS('exposure', 'alert_threshold_percent', v)}
                      min={50}
                      max={100}
                      step={5}
                      className="flex-1"
                    />
                    <span className="w-12 text-right font-medium">
                      {settlement.exposure.alert_threshold_percent}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ips" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                IPS Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Enable IPS</Label>
                    <p className="text-xs text-muted-foreground">Enable instant payments</p>
                  </div>
                  <Switch
                    checked={ips.connection.enabled}
                    onCheckedChange={(v) => updateI('connection', 'enabled', v)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-orange-50 dark:bg-orange-900/20">
                  <div>
                    <Label className="text-orange-700 dark:text-orange-300">Mock Mode</Label>
                    <p className="text-xs text-orange-600 dark:text-orange-400">
                      Simulate responses
                    </p>
                  </div>
                  <Switch
                    checked={ips.connection.mock_mode}
                    onCheckedChange={(v) => updateI('connection', 'mock_mode', v)}
                  />
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>API Base URL</Label>
                  <Input
                    value={ips.connection.api_base_url}
                    onChange={(e) => updateI('connection', 'api_base_url', e.target.value)}
                    placeholder="https://api.ips.bon.na"
                    className="bg-background"
                    disabled={ips.connection.mock_mode}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Organization ID</Label>
                  <Input
                    value={ips.connection.org_id}
                    onChange={(e) => updateI('connection', 'org_id', e.target.value)}
                    placeholder="NAMLEND001"
                    className="bg-background"
                    disabled={ips.connection.mock_mode}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Merchant VPA</Label>
                  <Input
                    value={ips.connection.merchant_vpa}
                    onChange={(e) => updateI('connection', 'merchant_vpa', e.target.value)}
                    placeholder="merchant@namlend"
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Connection Timeout (ms)</Label>
                  <Input
                    type="number"
                    value={ips.connection.connection_timeout_ms}
                    onChange={(e) =>
                      updateI('connection', 'connection_timeout_ms', Number(e.target.value))
                    }
                    className="bg-background"
                  />
                </div>
              </div>
              <Separator />
              <h4 className="font-medium">Transaction Limits</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Require OTP Above (NAD)</Label>
                  <Input
                    type="number"
                    value={ips.transactions.require_otp_above_amount}
                    onChange={(e) =>
                      updateI('transactions', 'require_otp_above_amount', Number(e.target.value))
                    }
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Daily Limit (NAD)</Label>
                  <Input
                    type="number"
                    value={ips.transactions.daily_limit_per_user}
                    onChange={(e) =>
                      updateI('transactions', 'daily_limit_per_user', Number(e.target.value))
                    }
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Monthly Limit (NAD)</Label>
                  <Input
                    type="number"
                    value={ips.transactions.monthly_limit_per_user}
                    onChange={(e) =>
                      updateI('transactions', 'monthly_limit_per_user', Number(e.target.value))
                    }
                    className="bg-background"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Auto-Post to Ledger</Label>
                  </div>
                  <Switch
                    checked={ips.transactions.auto_post_to_ledger}
                    onCheckedChange={(v) => updateI('transactions', 'auto_post_to_ledger', v)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Auto-Void on Timeout</Label>
                  </div>
                  <Switch
                    checked={ips.transactions.auto_void_on_timeout}
                    onCheckedChange={(v) => updateI('transactions', 'auto_void_on_timeout', v)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Auto-Create VPA</Label>
                  </div>
                  <Switch
                    checked={ips.vpa.auto_create_for_clients}
                    onCheckedChange={(v) => updateI('vpa', 'auto_create_for_clients', v)}
                  />
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Limit Summary</h4>
                <p className="text-sm text-muted-foreground">
                  Daily: {formatNAD(ips.transactions.daily_limit_per_user)} | Monthly:{' '}
                  {formatNAD(ips.transactions.monthly_limit_per_user)} | OTP above:{' '}
                  {formatNAD(ips.transactions.require_otp_above_amount)}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconciliation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Reconciliation Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Enable Reconciliation</Label>
                    <p className="text-xs text-muted-foreground">Enable auto-matching</p>
                  </div>
                  <Switch
                    checked={recon.general.enabled}
                    onCheckedChange={(v) => updateR('general', 'enabled', v)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Auto-Match Enabled</Label>
                    <p className="text-xs text-muted-foreground">Automatically match payments</p>
                  </div>
                  <Switch
                    checked={recon.general.auto_match_enabled}
                    onCheckedChange={(v) => updateR('general', 'auto_match_enabled', v)}
                  />
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Match Tolerance (NAD)</Label>
                  <Input
                    type="number"
                    value={recon.general.match_tolerance_amount}
                    onChange={(e) =>
                      updateR('general', 'match_tolerance_amount', Number(e.target.value))
                    }
                    step="0.01"
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Match Tolerance (Days)</Label>
                  <Input
                    type="number"
                    value={recon.general.match_tolerance_days}
                    onChange={(e) =>
                      updateR('general', 'match_tolerance_days', Number(e.target.value))
                    }
                    min={1}
                    max={30}
                    className="bg-background"
                  />
                </div>
              </div>
              <Separator />
              <h4 className="font-medium">Variance Handling</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Auto-Investigate Threshold (NAD)</Label>
                  <Input
                    type="number"
                    value={recon.variance.auto_investigate_threshold}
                    onChange={(e) =>
                      updateR('variance', 'auto_investigate_threshold', Number(e.target.value))
                    }
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Escalate After (Days)</Label>
                  <Input
                    type="number"
                    value={recon.variance.escalate_after_days}
                    onChange={(e) =>
                      updateR('variance', 'escalate_after_days', Number(e.target.value))
                    }
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Write-off Threshold (NAD)</Label>
                  <Input
                    type="number"
                    value={recon.variance.write_off_threshold}
                    onChange={(e) =>
                      updateR('variance', 'write_off_threshold', Number(e.target.value))
                    }
                    step="0.01"
                    className="bg-background"
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Require Approval for Write-off</Label>
                  </div>
                  <Switch
                    checked={recon.variance.require_approval_for_writeoff}
                    onCheckedChange={(v) => updateR('variance', 'require_approval_for_writeoff', v)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SettlementConfig;
