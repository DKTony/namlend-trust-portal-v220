/**
 * Branding Context
 * Provides white-label branding configuration throughout the application
 *
 * @module context/BrandingContext
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  BrandingConfig,
  BrandingContextType,
  DEFAULT_BRANDING,
} from '@/types/branding';
import { BrandingService } from '@/services/brandingService';
import { debugLog } from '@/utils/debug';

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

interface BrandingProviderProps {
  children: ReactNode;
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
      document.documentElement.style.setProperty(
        '--brand-primary',
        branding.colors.primary_color
      );
      document.documentElement.style.setProperty(
        '--brand-secondary',
        branding.colors.secondary_color
      );
      document.documentElement.style.setProperty(
        '--brand-accent',
        branding.colors.accent_color
      );
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

  /**
   * Load branding configuration from cache or server
   */
  const loadBranding = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Try to load from cache first for instant display
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
          // Continue to fetch fresh data in background
        }
      }
    } catch (e) {
      debugLog('⚠️ Failed to load cached branding', e);
    }

    // Fetch fresh branding from server
    try {
      const result = await BrandingService.getPublicBranding();

      if (result.success && result.data) {
        setConfig(result.data);
        applyBrandingToDocument(result.data);

        // Update cache
        const cacheData: CachedBranding = {
          config: result.data,
          timestamp: Date.now(),
        };
        localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(cacheData));
        debugLog('🎨 Branding loaded and cached');
      } else if (result.error) {
        debugLog('⚠️ Branding load returned error, using defaults', result.error);
        setError(result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      debugLog('❌ Error loading branding', errorMessage);
      setError(errorMessage);
      // Keep using defaults or cached values
    } finally {
      setLoading(false);
    }
  }, [applyBrandingToDocument]);

  /**
   * Refresh branding from server (used after admin updates)
   */
  const refreshBranding = useCallback(async () => {
    debugLog('🔄 Refreshing branding');
    localStorage.removeItem(BRANDING_CACHE_KEY);
    await loadBranding();
  }, [loadBranding]);

  /**
   * Update branding locally (for preview before save)
   * Does NOT persist to server - used for real-time preview in settings
   */
  const updateBrandingLocally = useCallback(
    (
      section: keyof BrandingConfig,
      values: Partial<BrandingConfig[keyof BrandingConfig]>
    ) => {
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

  // Load branding on mount
  useEffect(() => {
    loadBranding();
  }, [loadBranding]);

  const contextValue: BrandingContextType = {
    config,
    loading,
    error,
    refreshBranding,
    updateBrandingLocally,
  };

  return (
    <BrandingContext.Provider value={contextValue}>
      {children}
    </BrandingContext.Provider>
  );
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
