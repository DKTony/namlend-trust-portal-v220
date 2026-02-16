/**
 * AssetsTab - Logo and favicon upload with preview
 * Part of BrandingConfig split
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Image, Globe, Upload, Trash2, Loader2, Building2 } from 'lucide-react';
import { BrandingConfig } from '@/types/branding';

interface AssetsTabProps {
  config: BrandingConfig;
  uploading: 'logo' | 'favicon' | null;
  logoInputRef: React.RefObject<HTMLInputElement>;
  faviconInputRef: React.RefObject<HTMLInputElement>;
  onFileUpload: (file: File, type: 'logo' | 'favicon') => Promise<void>;
  onDeleteAsset: (type: 'logo' | 'favicon') => Promise<void>;
  onUpdateAssets: (
    key: keyof BrandingConfig['assets'],
    value: string | number | boolean | null
  ) => void;
}

export function AssetsTab({
  config,
  uploading,
  logoInputRef,
  faviconInputRef,
  onFileUpload,
  onDeleteAsset,
  onUpdateAssets,
}: AssetsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Logo & Favicon
        </CardTitle>
        <CardDescription>Upload your brand assets (PNG, JPEG, SVG, ICO - max 5MB)</CardDescription>
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
                onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0], 'logo')}
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
                  <Button variant="ghost" size="icon" onClick={() => onDeleteAsset('logo')}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Recommended: 240x80px transparent PNG</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="logo_width">Display Width (px)</Label>
              <Input
                id="logo_width"
                type="number"
                value={config.assets.logo_width}
                onChange={(e) => onUpdateAssets('logo_width', Number(e.target.value))}
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
                onChange={(e) => onUpdateAssets('logo_height', Number(e.target.value))}
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
              onCheckedChange={(v) => onUpdateAssets('show_company_name_with_logo', v)}
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
                onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0], 'favicon')}
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
                  <Button variant="ghost" size="icon" onClick={() => onDeleteAsset('favicon')}>
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
  );
}

export default AssetsTab;
