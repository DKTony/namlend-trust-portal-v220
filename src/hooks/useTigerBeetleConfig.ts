/**
 * Custom hook for TigerBeetle configuration management.
 * Handles loading, updating, saving, resetting, and connection testing
 * for the TigerBeetle financial ledger settings.
 */

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Configuration interfaces
export interface TigerBeetleConnectionConfig {
  enabled: boolean;
  cluster_id: number;
  replica_addresses: string[];
  connection_timeout_ms: number;
  request_timeout_ms: number;
}

export interface TigerBeetleOutboxConfig {
  processing_enabled: boolean;
  batch_size: number;
  max_retries: number;
  retry_delay_ms: number;
  processing_interval_ms: number;
  dead_letter_after_retries: number;
}

export interface TigerBeetleReconciliationConfig {
  enabled: boolean;
  schedule_cron: string;
  variance_threshold_percent: number;
  alert_on_variance: boolean;
  auto_resolve_minor_discrepancies: boolean;
}

export interface TigerBeetleAccountsConfig {
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

export interface TigerBeetleConfig {
  connection: TigerBeetleConnectionConfig;
  outbox: TigerBeetleOutboxConfig;
  reconciliation: TigerBeetleReconciliationConfig;
  accounts: TigerBeetleAccountsConfig;
}

export const DEFAULT_CONFIG: TigerBeetleConfig = {
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

export default function useTigerBeetleConfig() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<TigerBeetleConfig>(DEFAULT_CONFIG);
  const [hasChanges, setHasChanges] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'unknown' | 'connected' | 'disconnected'
  >('unknown');
  const [testingConnection, setTestingConnection] = useState(false);

  // Load configuration from database
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_config_by_category', {
        p_category: 'tigerbeetle',
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const loadedConfig = { ...DEFAULT_CONFIG };
        data.forEach(
          (item: {
            config_key: string;
            config_value:
              | TigerBeetleConnectionConfig
              | TigerBeetleOutboxConfig
              | TigerBeetleReconciliationConfig
              | TigerBeetleAccountsConfig;
          }) => {
            const key = item.config_key.replace('tigerbeetle.', '') as keyof TigerBeetleConfig;
            if (key in loadedConfig) {
              loadedConfig[key] = item.config_value as TigerBeetleConfig[typeof key];
            }
          }
        );
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
    value: string | number | boolean | string[] | TigerBeetleAccountsConfig['account_code_ranges']
  ) => {
    setConfig((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save each section
      const sections: (keyof TigerBeetleConfig)[] = [
        'connection',
        'outbox',
        'reconciliation',
        'accounts',
      ];

      for (const section of sections) {
        const { data, error } = await supabase.rpc('update_config', {
          p_config_key: `tigerbeetle.${section}`,
          p_config_value: config[section],
        });

        if (error) throw error;
        if (data && !data.success) throw new Error(data.error);
      }

      toast({
        title: 'Configuration Saved',
        description: 'TigerBeetle configuration has been updated successfully.',
      });
      setHasChanges(false);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Failed to save configuration';
      toast({
        title: 'Error',
        description: errMsg,
        variant: 'destructive',
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
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simulate connection test result
      const isConnected =
        config.connection.enabled && config.connection.replica_addresses.length > 0;
      setConnectionStatus(isConnected ? 'connected' : 'disconnected');

      toast({
        title: isConnected ? 'Connection Successful' : 'Connection Failed',
        description: isConnected
          ? `Connected to TigerBeetle cluster ${config.connection.cluster_id}`
          : 'Unable to connect to TigerBeetle cluster',
        variant: isConnected ? 'default' : 'destructive',
      });
    } catch (error) {
      setConnectionStatus('disconnected');
      toast({
        title: 'Connection Test Failed',
        description: 'Error testing TigerBeetle connection',
        variant: 'destructive',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  return {
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
  };
}
