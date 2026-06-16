/**
 * FeatureGate — conditionally render children based on the caller tenant's entitlements.
 *
 * Inert by default: when `ENTITLEMENT_ENFORCEMENT` is off (Phase 0/1) every gate is open, so
 * wrapping a section changes nothing in production. Once the owner flips the switch, a gate
 * whose `feature` is not entitled renders `fallback` (default: nothing).
 *
 *   <FeatureGate feature="collections"><CollectionsPanel /></FeatureGate>
 *
 * This is a UX affordance, not a security control — the backend `assertFeatureEnabled` guard
 * is the boundary that actually blocks unentitled access.
 */

import { useEntitlements } from '@/hooks/useEntitlements';
import { ReactNode } from 'react';

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  const { hasFeature } = useEntitlements();
  return hasFeature(feature) ? <>{children}</> : <>{fallback}</>;
}

export default FeatureGate;
