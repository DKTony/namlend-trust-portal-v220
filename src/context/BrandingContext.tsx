/**
 * Immutable first-party brand identity.
 *
 * Historical `branding.*` configuration rows remain in Convex for audit and
 * migration evidence, but they cannot alter the customer-facing identity.
 */

import { BrandingContextType, DEFAULT_BRANDING } from '@/types/branding';
import React, { createContext, ReactNode, useContext } from 'react';

interface BrandingProviderProps {
  children: ReactNode;
}

const IMMUTABLE_BRANDING_CONTEXT: BrandingContextType = Object.freeze({
  config: DEFAULT_BRANDING,
  loading: false,
  error: null,
});

const BrandingContext = createContext<BrandingContextType>(IMMUTABLE_BRANDING_CONTEXT);

export const BrandingProvider: React.FC<BrandingProviderProps> = ({ children }) => (
  <BrandingContext.Provider value={IMMUTABLE_BRANDING_CONTEXT}>{children}</BrandingContext.Provider>
);

export const useBranding = (): BrandingContextType => useContext(BrandingContext);

export const useBrandingSafe = (): BrandingContextType => useContext(BrandingContext);

export { BrandingContext };
export default BrandingProvider;
