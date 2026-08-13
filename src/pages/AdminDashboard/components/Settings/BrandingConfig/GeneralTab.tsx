/**
 * GeneralTab - Company information form
 * Part of BrandingConfig split
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandingConfig } from '@/types/branding';
import { Building2 } from 'lucide-react';

interface GeneralTabProps {
  config: BrandingConfig;
  onUpdateGeneral: (key: keyof BrandingConfig['general'], value: string) => void;
}

export function GeneralTab({ config, onUpdateGeneral }: GeneralTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Company Information
        </CardTitle>
        <CardDescription>Basic company details displayed throughout the platform</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="company_name">Company Name</Label>
            <Input
              id="company_name"
              value={config.general.company_name}
              onChange={(e) => onUpdateGeneral('company_name', e.target.value)}
              placeholder="NamLend"
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company_tagline">Tagline</Label>
            <Input
              id="company_tagline"
              value={config.general.company_tagline}
              onChange={(e) => onUpdateGeneral('company_tagline', e.target.value)}
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
              onChange={(e) => onUpdateGeneral('support_email', e.target.value)}
              placeholder="support@company.com"
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="support_phone">Support Phone</Label>
            <Input
              id="support_phone"
              value={config.general.support_phone}
              onChange={(e) => onUpdateGeneral('support_phone', e.target.value)}
              placeholder="+264 61 123 456"
              className="bg-background"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default GeneralTab;
