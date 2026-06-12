/**
 * useBrandingConfig Hook — Convex-native.
 * Manages branding configuration state, handlers, and persistence via Convex systemConfig.
 */

import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery as useConvexQuery, useMutation } from 'convex/react';
import { api } from '@/integrations/convex/api';
import { useBranding } from '@/context/BrandingContext';
import { BrandingConfig, DEFAULT_BRANDING, BRANDING_CONFIG_KEYS } from '@/types/branding';

export interface UseBrandingConfigReturn {
  loading: boolean;
  saving: boolean;
  config: BrandingConfig;
  hasChanges: boolean;
  uploading: 'logo' | 'favicon' | null;
  previewMode: boolean;
  logoInputRef: React.RefObject<HTMLInputElement>;
  faviconInputRef: React.RefObject<HTMLInputElement>;
  setPreviewMode: (mode: boolean) => void;
  updateGeneral: (key: keyof BrandingConfig['general'], value: string) => void;
  updateColors: (key: keyof BrandingConfig['colors'], value: string | boolean) => void;
  updateAssets: (
    key: keyof BrandingConfig['assets'],
    value: string | number | boolean | null
  ) => void;
  updateMeta: (key: keyof BrandingConfig['meta'], value: string | null) => void;
  handleFileUpload: (file: File, type: 'logo' | 'favicon') => Promise<void>;
  handleDeleteAsset: (type: 'logo' | 'favicon') => Promise<void>;
  handleSave: () => Promise<void>;
  handleReset: () => void;
  handleDiscard: () => void;
}

export default function useBrandingConfig(): UseBrandingConfigReturn {
  const { toast } = useToast();
  const { refreshBranding } = useBranding();
  const setConfigMutation = useMutation(api.systemConfig.setConfig);

  // Load branding config from Convex (reactive)
  const brandingConfigs = useConvexQuery(api.systemConfig.getAllConfig, { category: 'branding' });

  // State
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [originalConfig, setOriginalConfig] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [hasChanges, setHasChanges] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'favicon' | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const loading = brandingConfigs === undefined;

  // File input refs
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // Parse Convex config items into BrandingConfig when data loads
  useEffect(() => {
    if (brandingConfigs && !initialized) {
      const parsed = { ...DEFAULT_BRANDING };
      for (const item of brandingConfigs) {
        const section = item.key.replace('branding.', '') as keyof BrandingConfig;
        if (section in parsed && item.value) {
          (parsed as Record<string, unknown>)[section] = item.value;
        }
      }
      setConfig(parsed);
      setOriginalConfig(parsed);
      setInitialized(true);
    }
  }, [brandingConfigs, initialized]);

  // Track changes
  useEffect(() => {
    const changed = JSON.stringify(config) !== JSON.stringify(originalConfig);
    setHasChanges(changed);
  }, [config, originalConfig]);

  // Update handlers for each section
  const updateGeneral = (key: keyof typeof config.general, value: string) => {
    setConfig((prev) => ({
      ...prev,
      general: { ...prev.general, [key]: value },
    }));
  };

  const updateColors = (key: keyof typeof config.colors, value: string | boolean) => {
    setConfig((prev) => ({
      ...prev,
      colors: { ...prev.colors, [key]: value },
    }));
  };

  const updateAssets = (
    key: keyof typeof config.assets,
    value: string | number | boolean | null
  ) => {
    setConfig((prev) => ({
      ...prev,
      assets: { ...prev.assets, [key]: value },
    }));
  };

  const updateMeta = (key: keyof typeof config.meta, value: string | null) => {
    setConfig((prev) => ({
      ...prev,
      meta: { ...prev.meta, [key]: value },
    }));
  };

  // File upload handler — stores as data URL in config (Convex storage integration is a future enhancement)
  const handleFileUpload = async (file: File, type: 'logo' | 'favicon') => {
    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/x-icon'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Error',
        description: 'Invalid file type. Allowed: PNG, JPEG, GIF, SVG, ICO',
        variant: 'destructive',
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'File too large. Maximum size is 5MB',
        variant: 'destructive',
      });
      return;
    }
    setUploading(type);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      updateAssets(type === 'logo' ? 'logo_url' : 'favicon_url', dataUrl);
      toast({
        title: 'Success',
        description: `${type === 'logo' ? 'Logo' : 'Favicon'} loaded. Save to persist.`,
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to read file', variant: 'destructive' });
    }
    setUploading(null);
  };

  // File delete handler
  const handleDeleteAsset = async (type: 'logo' | 'favicon') => {
    updateAssets(type === 'logo' ? 'logo_url' : 'favicon_url', null);
    toast({
      title: 'Success',
      description: `${type === 'logo' ? 'Logo' : 'Favicon'} removed. Save to persist.`,
    });
  };

  // Save handler — writes each branding section to Convex systemConfig
  const handleSave = async () => {
    setSaving(true);
    try {
      const sections: (keyof BrandingConfig)[] = ['general', 'colors', 'assets', 'meta'];
      for (const section of sections) {
        await setConfigMutation({
          key: BRANDING_CONFIG_KEYS[section],
          value: config[section],
          category: 'branding',
          description: `Branding ${section} configuration`,
          isPublic: true,
        });
      }
      setOriginalConfig(config);
      await refreshBranding();
      toast({
        title: 'Configuration Saved',
        description: 'Branding settings updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save configuration',
        variant: 'destructive',
      });
    }
    setSaving(false);
  };

  // Reset handler
  const handleReset = () => {
    setConfig(DEFAULT_BRANDING);
  };

  // Discard changes
  const handleDiscard = () => {
    setConfig(originalConfig);
  };

  return {
    loading,
    saving,
    config,
    hasChanges,
    uploading,
    previewMode,
    logoInputRef,
    faviconInputRef,
    setPreviewMode,
    updateGeneral,
    updateColors,
    updateAssets,
    updateMeta,
    handleFileUpload,
    handleDeleteAsset,
    handleSave,
    handleReset,
    handleDiscard,
  };
}
