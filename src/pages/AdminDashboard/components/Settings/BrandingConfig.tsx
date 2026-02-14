/**
 * Branding Configuration Component
 * Admin interface for white-label customization
 *
 * Allows administrators to customize:
 * - Company name and tagline
 * - Logo and favicon uploads
 * - Color scheme
 * - SEO metadata
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Palette,
  Image,
  Building2,
  Globe,
  Save,
  RotateCcw,
  Info,
  Loader2,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BrandingService } from '@/services/brandingService';
import { useBranding } from '@/context/BrandingContext';
import { BrandingConfig, DEFAULT_BRANDING } from '@/types/branding';
import { cn } from '@/lib/utils';

export function BrandingConfigComponent() {
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
            <Palette className="h-6 w-6" />
            Branding & White Label
          </h2>
          <p className="text-muted-foreground">
            Customize your platform's appearance and identity
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {hasChanges && (
            <Badge
              variant="outline"
              className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400"
            >
              Unsaved Changes
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? (
              <EyeOff className="h-4 w-4 mr-2" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            {previewMode ? 'Hide Preview' : 'Preview'}
          </Button>
          {hasChanges && (
            <Button variant="ghost" size="sm" onClick={handleDiscard}>
              Discard
            </Button>
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
                <AlertDialogTitle>Reset Branding?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reset all branding settings to defaults. This action
                  cannot be undone after you save.
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

      {/* Live Preview */}
      {previewMode && (
        <Card className="border-2 border-dashed border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Live Preview - Sidebar Header
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 bg-zinc-900 rounded-lg">
              {config.assets.logo_url ? (
                <img
                  src={config.assets.logo_url}
                  alt="Logo"
                  style={{
                    width: config.assets.logo_width,
                    height: config.assets.logo_height,
                  }}
                  className="object-contain"
                />
              ) : (
                <div
                  className="flex items-center justify-center bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl shadow-lg"
                  style={{
                    width: Math.min(config.assets.logo_width, 40),
                    height: Math.min(config.assets.logo_height, 40),
                  }}
                >
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
              )}
              {config.assets.show_company_name_with_logo && (
                <div>
                  <h1 className="text-xl font-bold text-white">
                    {config.general.company_name}
                  </h1>
                  <p className="text-xs text-zinc-400">
                    {config.general.company_tagline}
                  </p>
                </div>
              )}
            </div>
            {config.assets.favicon_url && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <img
                  src={config.assets.favicon_url}
                  alt="Favicon"
                  className="w-4 h-4"
                />
                <span>Favicon will appear in browser tab</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Configuration Tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="general">Company</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="meta">SEO</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Information
              </CardTitle>
              <CardDescription>
                Basic company details displayed throughout the platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    value={config.general.company_name}
                    onChange={(e) => updateGeneral('company_name', e.target.value)}
                    placeholder="NamLend"
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_tagline">Tagline</Label>
                  <Input
                    id="company_tagline"
                    value={config.general.company_tagline}
                    onChange={(e) => updateGeneral('company_tagline', e.target.value)}
                    placeholder="Trust & Finance"
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support_email">Support Email</Label>
                  <Input
                    id="support_email"
                    type="email"
                    value={config.general.support_email}
                    onChange={(e) => updateGeneral('support_email', e.target.value)}
                    placeholder="support@company.com"
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support_phone">Support Phone</Label>
                  <Input
                    id="support_phone"
                    value={config.general.support_phone}
                    onChange={(e) => updateGeneral('support_phone', e.target.value)}
                    placeholder="+264 61 123 456"
                    className="bg-background"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Logo & Favicon
              </CardTitle>
              <CardDescription>
                Upload your brand assets (PNG, JPEG, SVG, ICO - max 5MB)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Logo</Label>
                <div className="flex items-start gap-4">
                  <div className="w-32 h-20 border rounded-lg flex items-center justify-center bg-muted overflow-hidden">
                    {config.assets.logo_url ? (
                      <img
                        src={config.assets.logo_url}
                        alt="Logo"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml"
                      onChange={(e) =>
                        e.target.files?.[0] &&
                        handleFileUpload(e.target.files[0], 'logo')
                      }
                      className="hidden"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploading === 'logo'}
                      >
                        {uploading === 'logo' ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Upload Logo
                      </Button>
                      {config.assets.logo_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAsset('logo')}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Recommended: 240x80px transparent PNG
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="logo_width">Display Width (px)</Label>
                    <Input
                      id="logo_width"
                      type="number"
                      value={config.assets.logo_width}
                      onChange={(e) =>
                        updateAssets('logo_width', Number(e.target.value))
                      }
                      min={40}
                      max={300}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="logo_height">Display Height (px)</Label>
                    <Input
                      id="logo_height"
                      type="number"
                      value={config.assets.logo_height}
                      onChange={(e) =>
                        updateAssets('logo_height', Number(e.target.value))
                      }
                      min={20}
                      max={100}
                      className="bg-background"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Show Company Name with Logo</Label>
                    <p className="text-xs text-muted-foreground">
                      Display text alongside logo in sidebar
                    </p>
                  </div>
                  <Switch
                    checked={config.assets.show_company_name_with_logo}
                    onCheckedChange={(v) =>
                      updateAssets('show_company_name_with_logo', v)
                    }
                  />
                </div>
              </div>

              <Separator />

              {/* Favicon Upload */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Favicon</Label>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 border rounded-lg flex items-center justify-center bg-muted overflow-hidden">
                    {config.assets.favicon_url ? (
                      <img
                        src={config.assets.favicon_url}
                        alt="Favicon"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <Globe className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      ref={faviconInputRef}
                      type="file"
                      accept="image/png,image/x-icon,image/vnd.microsoft.icon"
                      onChange={(e) =>
                        e.target.files?.[0] &&
                        handleFileUpload(e.target.files[0], 'favicon')
                      }
                      className="hidden"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => faviconInputRef.current?.click()}
                        disabled={uploading === 'favicon'}
                      >
                        {uploading === 'favicon' ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Upload Favicon
                      </Button>
                      {config.assets.favicon_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAsset('favicon')}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Recommended: 32x32px or 64x64px PNG/ICO
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Colors Tab */}
        <TabsContent value="colors">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Color Scheme
              </CardTitle>
              <CardDescription>
                Customize brand colors (affects buttons, links, accents)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div>
                  <Label>Enable Custom Colors</Label>
                  <p className="text-xs text-muted-foreground">
                    Override default theme colors with custom brand colors
                  </p>
                </div>
                <Switch
                  checked={config.colors.use_custom_colors}
                  onCheckedChange={(v) => updateColors('use_custom_colors', v)}
                />
              </div>

              <div
                className={cn(
                  'space-y-4',
                  !config.colors.use_custom_colors && 'opacity-50 pointer-events-none'
                )}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="primary_color">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={config.colors.primary_color}
                        onChange={(e) =>
                          updateColors('primary_color', e.target.value)
                        }
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        id="primary_color"
                        value={config.colors.primary_color}
                        onChange={(e) =>
                          updateColors('primary_color', e.target.value)
                        }
                        placeholder="#0EA5E9"
                        className="bg-background flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondary_color">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={config.colors.secondary_color}
                        onChange={(e) =>
                          updateColors('secondary_color', e.target.value)
                        }
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        id="secondary_color"
                        value={config.colors.secondary_color}
                        onChange={(e) =>
                          updateColors('secondary_color', e.target.value)
                        }
                        placeholder="#10B981"
                        className="bg-background flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accent_color">Accent Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={config.colors.accent_color}
                        onChange={(e) =>
                          updateColors('accent_color', e.target.value)
                        }
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        id="accent_color"
                        value={config.colors.accent_color}
                        onChange={(e) =>
                          updateColors('accent_color', e.target.value)
                        }
                        placeholder="#8b5cf6"
                        className="bg-background flex-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Color Preview */}
                <div className="p-4 border rounded-lg">
                  <Label className="mb-4 block">Color Preview</Label>
                  <div className="flex gap-4 flex-wrap">
                    <button
                      className="px-4 py-2 rounded-lg text-white font-medium transition-transform hover:scale-105"
                      style={{ backgroundColor: config.colors.primary_color }}
                    >
                      Primary Button
                    </button>
                    <button
                      className="px-4 py-2 rounded-lg text-white font-medium transition-transform hover:scale-105"
                      style={{ backgroundColor: config.colors.secondary_color }}
                    >
                      Secondary
                    </button>
                    <button
                      className="px-4 py-2 rounded-lg text-white font-medium transition-transform hover:scale-105"
                      style={{ backgroundColor: config.colors.accent_color }}
                    >
                      Accent
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Meta Tab */}
        <TabsContent value="meta">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                SEO & Metadata
              </CardTitle>
              <CardDescription>
                Configure page titles and meta information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="page_title_template">Page Title Template</Label>
                <Input
                  id="page_title_template"
                  value={config.meta.page_title_template}
                  onChange={(e) =>
                    updateMeta('page_title_template', e.target.value)
                  }
                  placeholder="{company_name} - {page_name}"
                  className="bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  Available placeholders: {'{company_name}'}, {'{page_name}'}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta_description">Meta Description</Label>
                <Input
                  id="meta_description"
                  value={config.meta.meta_description}
                  onChange={(e) => updateMeta('meta_description', e.target.value)}
                  placeholder="Professional loan management platform"
                  className="bg-background"
                />
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium mb-1">Preview in browser tab:</p>
                    <p className="font-mono text-xs bg-background px-2 py-1 rounded">
                      {config.meta.page_title_template
                        .replace('{company_name}', config.general.company_name)
                        .replace('{page_name}', 'Dashboard')}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default BrandingConfigComponent;
