/**
 * Admin portal sidebar navigation configuration.
 * Groups and items for the grouped sidebar component.
 */

import { FEATURES, type FeatureDef } from '@/config/features';
import type { NavGroup } from '@/types/navigation';
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  CheckSquare,
  DollarSign,
  FileSignature,
  FileText,
  GitBranch,
  LayoutDashboard,
  Package,
  Palette,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';

const allGroups: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { id: 'overview', label: 'Dashboard', path: '/admin/overview', icon: LayoutDashboard },
      { id: 'tenant-info', label: 'Tenant Info', path: '/admin/tenant-info', icon: Building2 },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { id: 'loans', label: 'Loans', path: '/admin/loans', icon: FileText },
      { id: 'clients', label: 'Clients', path: '/admin/clients', icon: UserCheck },
      { id: 'payments', label: 'Payments', path: '/admin/payments', icon: DollarSign },
      { id: 'approvals', label: 'Approvals', path: '/admin/approvals', icon: CheckCircle2 },
      { id: 'collections', label: 'Collections', path: '/admin/collections', icon: AlertTriangle },
      {
        id: 'ipp-onboarding',
        label: 'IPP Onboarding',
        path: '/admin/ipp-onboarding',
        icon: UserCheck,
      },
    ],
  },
  {
    id: 'management',
    label: 'Management',
    adminOnly: true,
    items: [
      { id: 'users', label: 'User Management', path: '/admin/users', icon: Users },
      { id: 'batch', label: 'Batch Operations', path: '/admin/batch', icon: CheckSquare },
    ],
  },
  {
    id: 'finance',
    label: 'Finance & Ledger',
    adminOnly: true,
    items: [
      { id: 'analytics', label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
      {
        id: 'reconciliation',
        label: 'Reconciliation',
        path: '/admin/reconciliation',
        icon: DollarSign,
      },
    ],
  },
  {
    id: 'configuration',
    label: 'Configuration',
    adminOnly: true,
    items: [
      { id: 'products', label: 'Products', path: '/admin/products', icon: Package },
      { id: 'workflows', label: 'Workflows', path: '/admin/workflows', icon: GitBranch },
      { id: 'mandates', label: 'Mandates', path: '/admin/mandates', icon: FileSignature },
      { id: 'consent', label: 'POPIA Consent', path: '/admin/consent', icon: ShieldCheck },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    adminOnly: true,
    items: [
      {
        id: 'credit-policy',
        label: 'Credit Policy',
        path: '/admin/settings/credit-policy',
        icon: Settings,
      },
      { id: 'branding', label: 'Branding', path: '/admin/settings/branding', icon: Palette },
    ],
  },
];

/**
 * navItem id → owning feature, derived from the canonical manifest so the nav, the backend
 * guards, and the route table can never disagree about what a feature unlocks. Items with no
 * owning feature (e.g. Overview) are ungated.
 */
const FEATURE_BY_NAV_ITEM: Map<string, FeatureDef> = (() => {
  const map = new Map<string, FeatureDef>();
  for (const feature of FEATURES) {
    for (const navId of feature.navItems ?? []) map.set(navId, feature);
  }
  return map;
})();

/**
 * Entitlement context the backoffice nav consults. `hasFeature` is the inert-by-default gate
 * from `useEntitlements`: it returns true for everything until `ENTITLEMENT_ENFORCEMENT` is
 * switched on, so passing this in changes nothing in Phase 0/1.
 */
export interface NavEntitlementContext {
  enforced: boolean;
  hasFeature: (featureKey: string) => boolean;
}

function itemVisibleUnderEntitlements(itemId: string, ent?: NavEntitlementContext): boolean {
  if (!ent) return true; // no entitlement context → inert
  const feature = FEATURE_BY_NAV_ITEM.get(itemId);
  if (!feature) return true; // ungated nav item (Overview, etc.)
  // `hasFeature` already accounts for the kill-switch. Under enforcement, platform-console
  // features are absent from a tenant's resolved set, so the /admin shim sections fall away
  // automatically once entitlements are enforced — the intended end state.
  return ent.hasFeature(feature.key);
}

/**
 * Returns the admin nav groups filtered by role and (optionally) tenant entitlements.
 * When isAdmin is false, groups and items marked adminOnly are excluded. When an entitlement
 * context is supplied AND enforcement is on, items whose owning feature is not entitled are
 * hidden, and groups left empty are dropped. Omitting `entitlements` preserves prior behavior.
 */
export function getAdminNavGroups(
  isAdmin: boolean,
  entitlements?: NavEntitlementContext
): NavGroup[] {
  const roleScoped = isAdmin
    ? allGroups
    : allGroups
        .filter((g) => !g.adminOnly)
        .map((g) => ({
          ...g,
          items: g.items.filter((item) => !item.adminOnly),
        }));

  return roleScoped
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => itemVisibleUnderEntitlements(item.id, entitlements)),
    }))
    .filter((g) => g.items.length > 0);
}
