/** Tenant-scoped white-label branding editor state and persistence. */

import { useBranding } from '@/context/BrandingContext';
import { useToast } from '@/hooks/use-toast';
import { api, type Id } from '@/integrations/convex/api';
import { BrandingConfig, DEFAULT_BRANDING } from '@/types/branding';
import { useMutation, useQuery } from 'convex/react';
import { useEffect, useRef, useState } from 'react';

type AssetType = 'logo' | 'favicon';
type AssetIds = { logo: Id<'_storage'> | null; favicon: Id<'_storage'> | null };

export interface UseBrandingConfigReturn {
  loading: boolean;
  saving: boolean;
  config: BrandingConfig;
  hasChanges: boolean;
  uploading: AssetType | null;
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
  handleFileUpload: (file: File, type: AssetType) => Promise<void>;
  handleDeleteAsset: (type: AssetType) => Promise<void>;
  handleSave: () => Promise<void>;
  handleReset: () => void;
  handleDiscard: () => void;
}

const EMPTY_ASSETS: AssetIds = { logo: null, favicon: null };
const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);

function mergeConfig(value: Partial<BrandingConfig> | undefined): BrandingConfig {
  return {
    general: { ...DEFAULT_BRANDING.general, ...value?.general },
    colors: { ...DEFAULT_BRANDING.colors, ...value?.colors },
    assets: { ...DEFAULT_BRANDING.assets, ...value?.assets },
    meta: { ...DEFAULT_BRANDING.meta, ...value?.meta },
  };
}

export default function useBrandingConfig(): UseBrandingConfigReturn {
  const { toast } = useToast();
  const { refreshBranding, updateBrandingLocally } = useBranding();
  const tenantBranding = useQuery(api.systemConfig.getTenantBranding, {});
  const generateUploadUrl = useMutation(api.systemConfig.generateTenantBrandingUploadUrl);
  const saveBranding = useMutation(api.systemConfig.saveTenantBranding);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [originalConfig, setOriginalConfig] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [assetIds, setAssetIds] = useState<AssetIds>(EMPTY_ASSETS);
  const [originalAssetIds, setOriginalAssetIds] = useState<AssetIds>(EMPTY_ASSETS);
  const [uploading, setUploading] = useState<AssetType | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const initializedVersion = useRef<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const loading = tenantBranding === undefined;
  const hasChanges =
    JSON.stringify(config) !== JSON.stringify(originalConfig) ||
    JSON.stringify(assetIds) !== JSON.stringify(originalAssetIds);

  useEffect(() => {
    if (tenantBranding === undefined) return;
    const marker = tenantBranding
      ? `${tenantBranding.institutionId}:${tenantBranding.version}`
      : 'default';
    if (initializedVersion.current === marker) return;
    const nextConfig = mergeConfig(tenantBranding?.config as Partial<BrandingConfig> | undefined);
    const nextIds: AssetIds = {
      logo: tenantBranding?.assetStorageIds.logo ?? null,
      favicon: tenantBranding?.assetStorageIds.favicon ?? null,
    };
    setConfig(nextConfig);
    setOriginalConfig(nextConfig);
    setAssetIds(nextIds);
    setOriginalAssetIds(nextIds);
    initializedVersion.current = marker;
  }, [tenantBranding]);

  const updateGeneral = (key: keyof BrandingConfig['general'], value: string) =>
    setConfig((current) => ({ ...current, general: { ...current.general, [key]: value } }));

  const updateColors = (key: keyof BrandingConfig['colors'], value: string | boolean) =>
    setConfig((current) => ({ ...current, colors: { ...current.colors, [key]: value } }));

  const updateAssets = (
    key: keyof BrandingConfig['assets'],
    value: string | number | boolean | null
  ) => setConfig((current) => ({ ...current, assets: { ...current.assets, [key]: value } }));

  const updateMeta = (key: keyof BrandingConfig['meta'], value: string | null) =>
    setConfig((current) => ({ ...current, meta: { ...current.meta, [key]: value } }));

  useEffect(() => {
    if (previewMode) {
      for (const section of ['general', 'colors', 'assets', 'meta'] as const) {
        updateBrandingLocally(section, config[section]);
      }
    }
  }, [config, previewMode, updateBrandingLocally]);

  const handleFileUpload = async (file: File, type: AssetType) => {
    const maxBytes = type === 'logo' ? 2 * 1024 * 1024 : 512 * 1024;
    if (!ALLOWED_TYPES.has(file.type) || file.size > maxBytes) {
      toast({
        title: 'Invalid asset',
        description: `${type === 'logo' ? 'Logo' : 'Favicon'} must be PNG, JPEG, WebP, or ICO within the size limit.`,
        variant: 'destructive',
      });
      return;
    }

    setUploading(type);
    try {
      const uploadUrl = await generateUploadUrl({});
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!response.ok) throw new Error('Asset upload failed.');
      const uploaded = (await response.json()) as { storageId: Id<'_storage'> };
      const previewUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Unable to preview asset.'));
        reader.readAsDataURL(file);
      });
      setAssetIds((current) => ({ ...current, [type]: uploaded.storageId }));
      updateAssets(type === 'logo' ? 'logo_url' : 'favicon_url', previewUrl);
      toast({ title: 'Asset uploaded', description: 'Save the configuration to publish it.' });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Unable to upload asset.',
        variant: 'destructive',
      });
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteAsset = async (type: AssetType) => {
    setAssetIds((current) => ({ ...current, [type]: null }));
    updateAssets(type === 'logo' ? 'logo_url' : 'favicon_url', null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveBranding({
        general: config.general,
        colors: config.colors,
        assets: {
          logoStorageId: assetIds.logo,
          faviconStorageId: assetIds.favicon,
          logo_width: config.assets.logo_width,
          logo_height: config.assets.logo_height,
          show_company_name_with_logo: config.assets.show_company_name_with_logo,
        },
        meta: config.meta,
      });
      setOriginalConfig(config);
      setOriginalAssetIds(assetIds);
      await refreshBranding();
      toast({ title: 'Configuration saved', description: 'Tenant branding was updated.' });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unable to save branding.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_BRANDING);
    setAssetIds(EMPTY_ASSETS);
  };

  const handleDiscard = () => {
    setConfig(originalConfig);
    setAssetIds(originalAssetIds);
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
