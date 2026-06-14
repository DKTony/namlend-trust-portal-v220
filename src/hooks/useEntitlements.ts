/**
 * useEntitlements — the Backoffice-side read of the tenant's feature set.
 *
 * Resolves the caller tenant's entitled features (`resolveMyEntitlements`) together with the
 * `ENTITLEMENT_ENFORCEMENT` kill-switch (`isEntitlementEnforcementOn`). Until the owner flips
 * that switch (Phase 2), `enforced` is false and `hasFeature` returns true for everything —
 * the whole mechanism is inert, so nav/UI look identical to today.
 *
 * The backend `assertFeatureEnabled` guard is the real security boundary; this hook only
 * drives what the UI bothers to show.
 */

import { useMemo } from 'react';
import { useConvexAuth, useQuery } from 'convex/react';
import { api } from '@/integrations/convex/api';

export interface EntitlementContext {
  /** Resolved feature keys for the caller's tenant (always-on ∪ entitled add-ons). */
  entitlements: Set<string>;
  /** Whether tenant entitlement enforcement is switched on (else fully inert). */
  enforced: boolean;
  /** True while either underlying query is still resolving. */
  isLoading: boolean;
  /**
   * Should a feature-gated surface be shown? Permissive by default: visible unless
   * enforcement is ON and the tenant is not entitled. Permissive while loading to avoid a
   * flash of hidden content.
   */
  hasFeature: (featureKey: string) => boolean;
}

export function useEntitlements(): EntitlementContext {
  const { isAuthenticated } = useConvexAuth();
  const keys = useQuery(
    api.platform.entitlements.resolveMyEntitlements,
    isAuthenticated ? {} : 'skip'
  );
  const enforcedFlag = useQuery(
    api.platform.entitlements.isEntitlementEnforcementOn,
    isAuthenticated ? {} : 'skip'
  );

  const entitlements = useMemo(() => new Set<string>((keys as string[] | undefined) ?? []), [keys]);
  const enforced = enforcedFlag ?? false;
  const isLoading = isAuthenticated && (keys === undefined || enforcedFlag === undefined);

  const hasFeature = useMemo(
    () => (featureKey: string) => isLoading || !enforced || entitlements.has(featureKey),
    [isLoading, enforced, entitlements]
  );

  return { entitlements, enforced, isLoading, hasFeature };
}
