/**
 * Tenant-aware white-label branding.
 *
 * OG Financial Services is the immutable public/unentitled fallback. Authenticated tenants may
 * receive an institution-scoped override only when `whiteLabelBranding` is enabled.
 */

import { useEntitlements } from '@/hooks/useEntitlements';
import { api } from '@/integrations/convex/api';
import { BrandingConfig, BrandingContextType, DEFAULT_BRANDING } from '@/types/branding';
import { useConvexAuth, useQuery } from 'convex/react';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

interface BrandingProviderProps {
  children: ReactNode;
}

function mergeBranding(value: Partial<BrandingConfig> | undefined): BrandingConfig {
  return {
    general: { ...DEFAULT_BRANDING.general, ...value?.general },
    colors: { ...DEFAULT_BRANDING.colors, ...value?.colors },
    assets: { ...DEFAULT_BRANDING.assets, ...value?.assets },
    meta: { ...DEFAULT_BRANDING.meta, ...value?.meta },
  };
}

function applyBrandingToDocument(branding: BrandingConfig): void {
  const titleTemplate = branding.meta.page_title_template || '{company_name} - {page_name}';
  const currentPageName = document.title.split(' - ').pop() || 'Dashboard';
  document.title = titleTemplate
    .replace('{company_name}', branding.general.company_name)
    .replace('{page_name}', currentPageName);

  let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!favicon) {
    favicon = document.createElement('link');
    favicon.rel = 'icon';
    document.head.appendChild(favicon);
  }
  favicon.href =
    branding.assets.favicon_url ?? DEFAULT_BRANDING.assets.favicon_url ?? '/favicon.svg';

  const root = document.documentElement;
  const colors = branding.colors.use_custom_colors ? branding.colors : DEFAULT_BRANDING.colors;
  root.style.setProperty('--brand-primary', colors.primary_color);
  root.style.setProperty('--brand-secondary', colors.secondary_color);
  root.style.setProperty('--brand-accent', colors.accent_color);

  let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!description) {
    description = document.createElement('meta');
    description.name = 'description';
    document.head.appendChild(description);
  }
  description.content = branding.meta.meta_description;
}

const FALLBACK_CONTEXT: BrandingContextType = {
  config: DEFAULT_BRANDING,
  loading: false,
  error: null,
  refreshBranding: async () => {},
  updateBrandingLocally: () => {},
};

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const BrandingProvider: React.FC<BrandingProviderProps> = ({ children }) => {
  const { isAuthenticated } = useConvexAuth();
  const { hasFeature, isLoading: entitlementsLoading } = useEntitlements();
  const profile = useQuery(api.users.getMyProfile, isAuthenticated ? {} : 'skip');
  const brandingEnabled =
    isAuthenticated &&
    profile?.institutionId !== undefined &&
    !entitlementsLoading &&
    hasFeature('whiteLabelBranding');
  const tenantBranding = useQuery(
    api.systemConfig.getTenantBranding,
    brandingEnabled ? {} : 'skip'
  );
  const [preview, setPreview] = useState<BrandingConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  const serverConfig = useMemo(
    () => mergeBranding(tenantBranding?.config as Partial<BrandingConfig> | undefined),
    [tenantBranding]
  );
  const config = brandingEnabled ? (preview ?? serverConfig) : DEFAULT_BRANDING;
  const loading = Boolean(
    isAuthenticated &&
    (profile === undefined ||
      entitlementsLoading ||
      (brandingEnabled && tenantBranding === undefined))
  );

  useEffect(() => {
    setPreview(null);
    setError(null);
  }, [brandingEnabled, tenantBranding?.institutionId, tenantBranding?.version]);

  useEffect(() => {
    try {
      applyBrandingToDocument(config);
      setError(null);
    } catch (brandingError) {
      setError(
        brandingError instanceof Error ? brandingError.message : 'Unable to apply branding.'
      );
      applyBrandingToDocument(DEFAULT_BRANDING);
    }
  }, [config]);

  const refreshBranding = useCallback(async () => {
    setPreview(null);
    applyBrandingToDocument(brandingEnabled ? serverConfig : DEFAULT_BRANDING);
  }, [brandingEnabled, serverConfig]);

  const updateBrandingLocally = useCallback(
    (section: keyof BrandingConfig, values: Partial<BrandingConfig[keyof BrandingConfig]>) => {
      if (!brandingEnabled) return;
      setPreview((current) => ({
        ...(current ?? serverConfig),
        [section]: { ...(current ?? serverConfig)[section], ...values },
      }));
    },
    [brandingEnabled, serverConfig]
  );

  const value = useMemo<BrandingContextType>(
    () => ({ config, loading, error, refreshBranding, updateBrandingLocally }),
    [config, error, loading, refreshBranding, updateBrandingLocally]
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
};

export const useBranding = (): BrandingContextType => {
  const context = useContext(BrandingContext);
  if (!context) throw new Error('useBranding must be used within a BrandingProvider');
  return context;
};

export const useBrandingSafe = (): BrandingContextType =>
  useContext(BrandingContext) ?? FALLBACK_CONTEXT;

export { BrandingContext };
export default BrandingProvider;
