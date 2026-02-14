/**
 * Branding Configuration Types
 * White-label customization for NamLend backoffice
 * @module types/branding
 */

/**
 * General company branding information
 */
export interface BrandingGeneral {
  company_name: string;
  company_tagline: string;
  support_email: string;
  support_phone: string;
}

/**
 * Custom color scheme settings
 */
export interface BrandingColors {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  use_custom_colors: boolean;
}

/**
 * Logo and favicon asset URLs and display settings
 */
export interface BrandingAssets {
  logo_url: string | null;
  favicon_url: string | null;
  logo_width: number;
  logo_height: number;
  show_company_name_with_logo: boolean;
}

/**
 * Page metadata and SEO settings
 */
export interface BrandingMeta {
  page_title_template: string;
  meta_description: string;
  og_image_url: string | null;
}

/**
 * Complete branding configuration
 */
export interface BrandingConfig {
  general: BrandingGeneral;
  colors: BrandingColors;
  assets: BrandingAssets;
  meta: BrandingMeta;
}

/**
 * Branding context type for React context
 */
export interface BrandingContextType {
  config: BrandingConfig;
  loading: boolean;
  error: string | null;
  refreshBranding: () => Promise<void>;
  updateBrandingLocally: (
    section: keyof BrandingConfig,
    values: Partial<BrandingConfig[keyof BrandingConfig]>
  ) => void;
}

/**
 * Default branding values - used as fallback when database is unavailable
 */
export const DEFAULT_BRANDING: BrandingConfig = {
  general: {
    company_name: 'NamLend',
    company_tagline: 'Trust & Finance',
    support_email: 'support@namlend.com',
    support_phone: '+264 61 123 456',
  },
  colors: {
    primary_color: '#0EA5E9',
    secondary_color: '#10B981',
    accent_color: '#8b5cf6',
    use_custom_colors: false,
  },
  assets: {
    logo_url: null,
    favicon_url: null,
    logo_width: 120,
    logo_height: 40,
    show_company_name_with_logo: true,
  },
  meta: {
    page_title_template: '{company_name} - {page_name}',
    meta_description: 'Professional loan management platform',
    og_image_url: null,
  },
};

/**
 * Branding configuration keys as stored in system_configuration table
 */
export type BrandingConfigKey =
  | 'branding.general'
  | 'branding.colors'
  | 'branding.assets'
  | 'branding.meta';

/**
 * Maps branding section names to their config keys
 */
export const BRANDING_CONFIG_KEYS: Record<keyof BrandingConfig, BrandingConfigKey> = {
  general: 'branding.general',
  colors: 'branding.colors',
  assets: 'branding.assets',
  meta: 'branding.meta',
};
