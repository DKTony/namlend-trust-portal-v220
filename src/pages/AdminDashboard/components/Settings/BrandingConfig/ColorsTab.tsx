/**
 * ColorsTab - Custom color scheme configuration
 * Part of BrandingConfig split
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { BrandingConfig } from '@/types/branding';
import { Palette } from 'lucide-react';

interface ColorsTabProps {
  config: BrandingConfig;
  onUpdateColors: (key: keyof BrandingConfig['colors'], value: string | boolean) => void;
}

export function ColorsTab({ config, onUpdateColors }: ColorsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Color Scheme
        </CardTitle>
        <CardDescription>Customize brand colors (affects buttons, links, accents)</CardDescription>
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
            onCheckedChange={(v) => onUpdateColors('use_custom_colors', v)}
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
                  onChange={(e) => onUpdateColors('primary_color', e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  id="primary_color"
                  value={config.colors.primary_color}
                  onChange={(e) => onUpdateColors('primary_color', e.target.value)}
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
                  onChange={(e) => onUpdateColors('secondary_color', e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  id="secondary_color"
                  value={config.colors.secondary_color}
                  onChange={(e) => onUpdateColors('secondary_color', e.target.value)}
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
                  onChange={(e) => onUpdateColors('accent_color', e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  id="accent_color"
                  value={config.colors.accent_color}
                  onChange={(e) => onUpdateColors('accent_color', e.target.value)}
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
  );
}

export default ColorsTab;
