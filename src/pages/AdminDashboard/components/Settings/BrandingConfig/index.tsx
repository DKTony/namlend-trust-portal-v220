/**
 * Branding Configuration Component
 * Admin interface for white-label customization.
 * Refactored into sub-components for maintainability.
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import useBrandingConfig from '@/hooks/useBrandingConfig';
import { Loader2 } from 'lucide-react';
import { AssetsTab } from './AssetsTab';
import { ColorsTab } from './ColorsTab';
import { ConfigHeader } from './ConfigHeader';
import { GeneralTab } from './GeneralTab';
import { LivePreview } from './LivePreview';
import { SeoTab } from './SeoTab';

export function BrandingConfigComponent() {
  const {
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
  } = useBrandingConfig();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConfigHeader
        hasChanges={hasChanges}
        saving={saving}
        previewMode={previewMode}
        onTogglePreview={() => setPreviewMode(!previewMode)}
        onDiscard={handleDiscard}
        onReset={handleReset}
        onSave={handleSave}
      />

      {previewMode && <LivePreview config={config} />}

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="general">Company</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="meta">SEO</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab config={config} onUpdateGeneral={updateGeneral} />
        </TabsContent>

        <TabsContent value="assets">
          <AssetsTab
            config={config}
            uploading={uploading}
            logoInputRef={logoInputRef}
            faviconInputRef={faviconInputRef}
            onFileUpload={handleFileUpload}
            onDeleteAsset={handleDeleteAsset}
            onUpdateAssets={updateAssets}
          />
        </TabsContent>

        <TabsContent value="colors">
          <ColorsTab config={config} onUpdateColors={updateColors} />
        </TabsContent>

        <TabsContent value="meta">
          <SeoTab config={config} onUpdateMeta={updateMeta} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default BrandingConfigComponent;
