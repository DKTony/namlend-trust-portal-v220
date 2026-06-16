/**
 * Branding Context
 * Provides white-label branding configuration throughout the application
 *
 * @module context/BrandingContext
 */

import { api } from '@/integrations/convex/api';
import { BrandingConfig, BrandingContextType, DEFAULT_BRANDING } from '@/types/branding';
import { debugLog } from '@/utils/debug';
import { useQuery as useConvexQuery } from 'convex/react';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

// ============================================================================
// CONSTANTS
// ============================================================================

const BRANDING_CACHE_KEY = 'namlend-branding-cache';
const BRANDING_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// TYPES
// ============================================================================

interface CachedBranding {
  config: BrandingConfig;
  timestamp: number;
}

interface PublicConfigItem {
  key: string;
  value: unknown;
}

interface BrandingProviderProps {
  children: ReactNode;
}

function parsePublicBrandingConfig(items: PublicConfigItem[]): BrandingConfig {
  const parsed = { ...DEFAULT_BRANDING };
  for (const item of items) {
    const section = item.key.replace('branding.', '') as keyof BrandingConfig;
    if (section in parsed && item.value) {
      (parsed as Record<string, unknown>)[section] = item.value;
    }
  }
  return parsed;
}

// ============================================================================
// CONTEXT
// ============================================================================

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export const BrandingProvider: React.FC<BrandingProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const brandingConfigs = useConvexQuery(api.systemConfig.getPublicConfig, {
    category: 'branding',
  });

  /**
   * Apply branding settings to the document (favicon, title, CSS variables)
   */
  const applyBrandingToDocument = useCallback((branding: BrandingConfig) => {
    debugLog('🎨 Applying branding to document', {
      companyName: branding.general.company_name,
      hasFavicon: !!branding.assets.favicon_url,
      hasLogo: !!branding.assets.logo_url,
    });

    // Update document title
    const titleTemplate = branding.meta.page_title_template || '{company_name}';
    const currentPageName = document.title.split(' - ').pop() || 'Dashboard';
    document.title = titleTemplate
      .replace('{company_name}', branding.general.company_name)
      .replace('{page_name}', currentPageName);

    // Update favicon dynamically
    if (branding.assets.favicon_url) {
      let faviconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!faviconLink) {
        faviconLink = document.createElement('link');
        faviconLink.rel = 'icon';
        document.head.appendChild(faviconLink);
      }
      faviconLink.href = branding.assets.favicon_url;
    }

    // Apply custom colors via CSS variables
    if (branding.colors.use_custom_colors) {
      document.documentElement.style.setProperty('--brand-primary', branding.colors.primary_color);
      document.documentElement.style.setProperty(
        '--brand-secondary',
        branding.colors.secondary_color
      );
      document.documentElement.style.setProperty('--brand-accent', branding.colors.accent_color);
    } else {
      // Remove custom properties to use defaults
      document.documentElement.style.removeProperty('--brand-primary');
      document.documentElement.style.removeProperty('--brand-secondary');
      document.documentElement.style.removeProperty('--brand-accent');
    }

    // Update meta description
    let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = branding.meta.meta_description;
  }, []);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(BRANDING_CACHE_KEY);
      if (cached) {
        const { config: cachedConfig, timestamp }: CachedBranding = JSON.parse(cached);
        const isCacheValid = Date.now() - timestamp < BRANDING_CACHE_TTL;

        if (isCacheValid) {
          debugLog('🎨 Using cached branding', {
            age: Math.round((Date.now() - timestamp) / 1000) + 's',
          });
          setConfig(cachedConfig);
          applyBrandingToDocument(cachedConfig);
          setLoading(false);
        }
      }
    } catch (e) {
      debugLog('⚠️ Failed to load cached branding', e);
    }
  }, [applyBrandingToDocument]);

  useEffect(() => {
    if (brandingConfigs === undefined) return;

    try {
      setError(null);
      const freshConfig =
        brandingConfigs.length > 0 ? parsePublicBrandingConfig(brandingConfigs) : DEFAULT_BRANDING;

      setConfig(freshConfig);
      applyBrandingToDocument(freshConfig);

      const cacheData: CachedBranding = {
        config: freshConfig,
        timestamp: Date.now(),
      };
      localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(cacheData));
      debugLog('🎨 Branding loaded from Convex public config and cached');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      debugLog('❌ Error loading branding', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [applyBrandingToDocument, brandingConfigs]);

  /**
   * Refresh branding from server (used after admin updates)
   */
  const refreshBranding = useCallback(async () => {
    debugLog('🔄 Refreshing branding');
    localStorage.removeItem(BRANDING_CACHE_KEY);
    if (brandingConfigs !== undefined) {
      const freshConfig =
        brandingConfigs.length > 0 ? parsePublicBrandingConfig(brandingConfigs) : DEFAULT_BRANDING;
      setConfig(freshConfig);
      applyBrandingToDocument(freshConfig);
    }
  }, [applyBrandingToDocument, brandingConfigs]);

  /**
   * Update branding locally (for preview before save)
   * Does NOT persist to server - used for real-time preview in settings
   */
  const updateBrandingLocally = useCallback(
    (section: keyof BrandingConfig, values: Partial<BrandingConfig[keyof BrandingConfig]>) => {
      setConfig((prev) => {
        const updated = {
          ...prev,
          [section]: { ...prev[section], ...values },
        };
        // Apply changes immediately for live preview
        applyBrandingToDocument(updated);
        return updated;
      });
    },
    [applyBrandingToDocument]
  );

  const contextValue: BrandingContextType = {
    config,
    loading,
    error,
    refreshBranding,
    updateBrandingLocally,
  };

  return <BrandingContext.Provider value={contextValue}>{children}</BrandingContext.Provider>;
};

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to access branding configuration
 * @throws Error if used outside BrandingProvider
 */
export const useBranding = (): BrandingContextType => {
  const context = useContext(BrandingContext);

  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }

  return context;
};

/**
 * Hook to access branding configuration with fallback for components
 * that may render before the provider is ready
 */
export const useBrandingSafe = (): BrandingContextType => {
  const context = useContext(BrandingContext);

  if (!context) {
    // Return a safe fallback for components that render early
    return {
      config: DEFAULT_BRANDING,
      loading: true,
      error: null,
      refreshBranding: async () => {},
      updateBrandingLocally: () => {},
    };
  }

  return context;
};

export { BrandingContext };
export default BrandingProvider;
