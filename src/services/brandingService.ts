/**
 * Branding Service
 * Manages white-label branding configuration for NamLend platform
 *
 * @module services/brandingService
 * @version 1.0.0
 */

import { supabase } from '@/integrations/supabase/client';
import { ServiceResult, withServiceResult } from '@/utils/serviceUtils';
import { debugLog } from '@/utils/debug';
import { handleDatabaseError } from '@/utils/errorHandler';
import {
  BrandingConfig,
  BrandingGeneral,
  BrandingColors,
  BrandingAssets,
  BrandingMeta,
  DEFAULT_BRANDING,
  BRANDING_CONFIG_KEYS,
} from '@/types/branding';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Raw config item from database
 */
interface ConfigItem {
  config_key: string;
  config_value: Record<string, unknown>;
}

/**
 * Asset upload result
 */
export interface UploadAssetResult {
  success: boolean;
  url?: string;
  error?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse raw database config items into BrandingConfig structure
 */
function parseConfigItems(items: ConfigItem[]): BrandingConfig {
  const config = { ...DEFAULT_BRANDING };

  items.forEach((item) => {
    const section = item.config_key.replace('branding.', '') as keyof BrandingConfig;
    if (section in config && item.config_value) {
      // Type-safe assignment based on section
      switch (section) {
        case 'general':
          config.general = item.config_value as BrandingGeneral;
          break;
        case 'colors':
          config.colors = item.config_value as BrandingColors;
          break;
        case 'assets':
          config.assets = item.config_value as BrandingAssets;
          break;
        case 'meta':
          config.meta = item.config_value as BrandingMeta;
          break;
      }
    }
  });

  return config;
}

// ============================================================================
// BRANDING SERVICE CLASS
// ============================================================================

export class BrandingService {
  /**
   * Get public branding configuration (available to all authenticated users)
   * Uses the get_public_branding_config RPC function
   */
  static async getPublicBranding(): Promise<ServiceResult<BrandingConfig>> {
    try {
      debugLog('🎨 Fetching public branding configuration');

      const { data, error } = await supabase.rpc('get_public_branding_config');

      if (error) {
        debugLog('❌ Error fetching public branding', error);
        // Return defaults on error - branding should never break the app
        return { success: true, data: DEFAULT_BRANDING };
      }

      if (!data || !Array.isArray(data) || data.length === 0) {
        debugLog('⚠️ No branding config found, using defaults');
        return { success: true, data: DEFAULT_BRANDING };
      }

      const config = parseConfigItems(data as ConfigItem[]);
      debugLog('✅ Public branding loaded', { companyName: config.general.company_name });

      return { success: true, data: config };
    } catch (error) {
      debugLog('❌ Unexpected error fetching public branding', error);
      // Return defaults on error - branding should never break the app
      return { success: true, data: DEFAULT_BRANDING };
    }
  }

  /**
   * Get admin branding configuration (admin only - includes all settings)
   * Uses the existing get_config_by_category RPC function
   */
  static async getAdminBranding(): Promise<ServiceResult<BrandingConfig>> {
    try {
      debugLog('🎨 Fetching admin branding configuration');

      const { data, error } = await supabase.rpc('get_config_by_category', {
        p_category: 'branding',
      });

      if (error) {
        debugLog('❌ Error fetching admin branding', error);
        return { success: false, error: error.message };
      }

      if (!data || !Array.isArray(data) || data.length === 0) {
        debugLog('⚠️ No branding config found, using defaults');
        return { success: true, data: DEFAULT_BRANDING };
      }

      const config = parseConfigItems(data as ConfigItem[]);
      debugLog('✅ Admin branding loaded', { companyName: config.general.company_name });

      return { success: true, data: config };
    } catch (error) {
      debugLog('❌ Unexpected error fetching admin branding', error);
      handleDatabaseError(error, 'getAdminBranding', {});
      return { success: false, error: 'Failed to load branding configuration' };
    }
  }

  /**
   * Update a specific branding configuration section (admin only)
   * Uses the existing update_config RPC function
   */
  static async updateBrandingSection<K extends keyof BrandingConfig>(
    section: K,
    values: BrandingConfig[K]
  ): Promise<ServiceResult<void>> {
    const configKey = BRANDING_CONFIG_KEYS[section];

    try {
      debugLog(`🎨 Updating branding.${section}`, { values });

      const { data, error } = await supabase.rpc('update_config', {
        p_config_key: configKey,
        p_config_value: values,
      });

      if (error) {
        debugLog(`❌ Error updating branding.${section}`, error);
        return { success: false, error: error.message };
      }

      debugLog(`✅ branding.${section} updated successfully`);
      return { success: true };
    } catch (error) {
      debugLog(`❌ Unexpected error updating branding.${section}`, error);
      handleDatabaseError(error, 'updateBrandingSection', { section, values });
      return { success: false, error: 'Failed to update branding configuration' };
    }
  }

  /**
   * Upload a branding asset (logo or favicon) to Supabase storage
   */
  static async uploadAsset(
    file: File,
    assetType: 'logo' | 'favicon'
  ): Promise<UploadAssetResult> {
    try {
      debugLog(`📤 Uploading ${assetType}`, { fileName: file.name, size: file.size });

      // Validate file type
      const validTypes = [
        'image/png',
        'image/jpeg',
        'image/gif',
        'image/svg+xml',
        'image/x-icon',
        'image/vnd.microsoft.icon',
      ];

      if (!validTypes.includes(file.type)) {
        debugLog(`❌ Invalid file type: ${file.type}`);
        return {
          success: false,
          error: 'Invalid file type. Allowed: PNG, JPEG, GIF, SVG, ICO',
        };
      }

      // Validate file size (5MB max)
      const MAX_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        debugLog(`❌ File too large: ${file.size} bytes`);
        return {
          success: false,
          error: 'File too large. Maximum size is 5MB',
        };
      }

      // Generate unique filename with timestamp
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `${assetType}-${Date.now()}.${fileExt}`;

      // Upload to branding-assets bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('branding-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        debugLog(`❌ Upload error`, uploadError);
        return { success: false, error: uploadError.message };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('branding-assets')
        .getPublicUrl(fileName);

      debugLog(`✅ ${assetType} uploaded successfully`, { url: urlData.publicUrl });

      return { success: true, url: urlData.publicUrl };
    } catch (error) {
      debugLog(`❌ Unexpected upload error`, error);
      handleDatabaseError(error, 'uploadAsset', { assetType });
      return { success: false, error: 'Failed to upload asset' };
    }
  }

  /**
   * Delete a branding asset from Supabase storage
   */
  static async deleteAsset(assetUrl: string): Promise<ServiceResult<void>> {
    try {
      // Extract filename from URL
      const urlParts = assetUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];

      if (!fileName) {
        return { success: false, error: 'Invalid asset URL' };
      }

      debugLog(`🗑️ Deleting asset`, { fileName });

      const { error } = await supabase.storage
        .from('branding-assets')
        .remove([fileName]);

      if (error) {
        debugLog(`❌ Delete error`, error);
        return { success: false, error: error.message };
      }

      debugLog(`✅ Asset deleted successfully`, { fileName });
      return { success: true };
    } catch (error) {
      debugLog(`❌ Unexpected delete error`, error);
      handleDatabaseError(error, 'deleteAsset', { assetUrl });
      return { success: false, error: 'Failed to delete asset' };
    }
  }

  /**
   * Save all branding sections at once (for bulk save operations)
   */
  static async saveBranding(config: BrandingConfig): Promise<ServiceResult<void>> {
    try {
      debugLog('🎨 Saving complete branding configuration');

      // Update each section sequentially to ensure audit trail
      const sections: (keyof BrandingConfig)[] = ['general', 'colors', 'assets', 'meta'];

      for (const section of sections) {
        const result = await BrandingService.updateBrandingSection(section, config[section]);
        if (!result.success) {
          debugLog(`❌ Failed to save branding.${section}`, result.error);
          return { success: false, error: `Failed to save ${section}: ${result.error}` };
        }
      }

      debugLog('✅ All branding sections saved successfully');
      return { success: true };
    } catch (error) {
      debugLog('❌ Unexpected error saving branding', error);
      handleDatabaseError(error, 'saveBranding', {});
      return { success: false, error: 'Failed to save branding configuration' };
    }
  }

  /**
   * Reset branding to defaults (admin only)
   */
  static async resetToDefaults(): Promise<ServiceResult<void>> {
    try {
      debugLog('🔄 Resetting branding to defaults');

      const result = await BrandingService.saveBranding(DEFAULT_BRANDING);

      if (result.success) {
        debugLog('✅ Branding reset to defaults');
      }

      return result;
    } catch (error) {
      debugLog('❌ Unexpected error resetting branding', error);
      handleDatabaseError(error, 'resetToDefaults', {});
      return { success: false, error: 'Failed to reset branding' };
    }
  }
}

export default BrandingService;
