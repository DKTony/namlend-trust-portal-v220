/**
 * LivePreview - Sidebar header preview with logo and company name
 * Part of BrandingConfig split
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, ShieldCheck } from 'lucide-react';
import { BrandingConfig } from '@/types/branding';

interface LivePreviewProps {
  config: BrandingConfig;
}

export function LivePreview({ config }: LivePreviewProps) {
  return (
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
              <h1 className="text-xl font-bold text-white">{config.general.company_name}</h1>
              <p className="text-xs text-zinc-400">{config.general.company_tagline}</p>
            </div>
          )}
        </div>
        {config.assets.favicon_url && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <img src={config.assets.favicon_url} alt="Favicon" className="w-4 h-4" />
            <span>Favicon will appear in browser tab</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default LivePreview;
