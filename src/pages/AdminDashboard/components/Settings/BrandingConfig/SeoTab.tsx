/**
 * SeoTab - Page title template and meta description
 * Part of BrandingConfig split
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandingConfig } from '@/types/branding';
import { Globe, Info } from 'lucide-react';

interface SeoTabProps {
  config: BrandingConfig;
  onUpdateMeta: (key: keyof BrandingConfig['meta'], value: string | null) => void;
}

export function SeoTab({ config, onUpdateMeta }: SeoTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          SEO & Metadata
        </CardTitle>
        <CardDescription>Configure page titles and meta information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="page_title_template">Page Title Template</Label>
          <Input
            id="page_title_template"
            value={config.meta.page_title_template}
            onChange={(e) => onUpdateMeta('page_title_template', e.target.value)}
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
            onChange={(e) => onUpdateMeta('meta_description', e.target.value)}
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
  );
}

export default SeoTab;
