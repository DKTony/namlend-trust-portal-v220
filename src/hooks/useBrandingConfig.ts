/**
 * useBrandingConfig Hook
 * Manages branding configuration state, handlers, and persistence
 */

import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { BrandingService } from '@/services/brandingService';
import { useBranding } from '@/context/BrandingContext';
import { BrandingConfig, DEFAULT_BRANDING } from '@/types/branding';

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

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [originalConfig, setOriginalConfig] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [hasChanges, setHasChanges] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'favicon' | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  // File input refs
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  // Track changes
  useEffect(() => {
    const changed = JSON.stringify(config) !== JSON.stringify(originalConfig);
    setHasChanges(changed);
  }, [config, originalConfig]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const result = await BrandingService.getAdminBranding();
      if (result.success && result.data) {
        setConfig(result.data);
        setOriginalConfig(result.data);
      }
    } catch (error) {
      console.error('Load config error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load branding configuration',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

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

  // File upload handler
  const handleFileUpload = async (file: File, type: 'logo' | 'favicon') => {
    setUploading(type);
    try {
      const result = await BrandingService.uploadAsset(file, type);
      if (result.success && result.url) {
        updateAssets(type === 'logo' ? 'logo_url' : 'favicon_url', result.url);
        toast({
          title: 'Success',
          description: `${type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully`,
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Upload failed',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload file',
        variant: 'destructive',
      });
    }
    setUploading(null);
  };

  // File delete handler
  const handleDeleteAsset = async (type: 'logo' | 'favicon') => {
    const url = type === 'logo' ? config.assets.logo_url : config.assets.favicon_url;
    if (!url) return;

    try {
      const result = await BrandingService.deleteAsset(url);
      if (result.success) {
        updateAssets(type === 'logo' ? 'logo_url' : 'favicon_url', null);
        toast({
          title: 'Success',
          description: `${type === 'logo' ? 'Logo' : 'Favicon'} removed`,
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete asset',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete asset',
        variant: 'destructive',
      });
    }
  };

  // Save handler
  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await BrandingService.saveBranding(config);

      if (result.success) {
        setOriginalConfig(config);
        await refreshBranding();
        toast({
          title: 'Configuration Saved',
          description: 'Branding settings updated successfully.',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save configuration',
          variant: 'destructive',
        });
      }
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
