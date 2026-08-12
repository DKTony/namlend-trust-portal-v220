/**
 * Immutable OG Financial Services identity types.
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
}

/**
 * Default branding values - used as fallback when database is unavailable
 */
export const DEFAULT_BRANDING: BrandingConfig = Object.freeze({
  general: Object.freeze({
    company_name: 'OG Financial Services',
    company_tagline: 'Finance that moves you forward',
    support_email: 'finance@mgholdingsptyltd.com',
    support_phone: '+264 81 417 4288',
  }),
  colors: Object.freeze({
    primary_color: '#3F713E',
    secondary_color: '#7CA05C',
    accent_color: '#274F35',
    use_custom_colors: true,
  }),
  assets: Object.freeze({
    logo_url: '/og-financial-logo-v2.svg',
    favicon_url: '/og-financial-favicon-v2.svg',
    logo_width: 220,
    logo_height: 72,
    show_company_name_with_logo: false,
  }),
  meta: Object.freeze({
    page_title_template: '{company_name} - {page_name}',
    meta_description:
      'Apply online with OG Financial Services, a NAMFISA-registered Namibian microlender.',
    og_image_url: '/og-financial-social-v2.png',
  }),
});
