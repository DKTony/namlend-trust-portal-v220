/**
 * Platform Console sidebar navigation.
 *
 * This nav is gated by PLATFORM ROLE (see ProtectedRoute requirePlatform), NOT by tenant
 * entitlements — "can this person run the platform" is orthogonal to "did a tenant buy a
 * feature". Sections mirror the `console: 'platform'` features in the manifest
 * (convex/lib/features.ts): tenant registry, plans/catalog, entitlement dispatch, business rules,
 * ledger/settlement infra, and support.
 */

import type { NavGroup } from '@/types/navigation';
import {
  Building2,
  Database,
  DollarSign,
  LayoutDashboard,
  LifeBuoy,
  Package,
  Route,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';

const allGroups: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { id: 'overview', label: 'Dashboard', path: '/platform/overview', icon: LayoutDashboard },
    ],
  },
  {
    id: 'tenants',
    label: 'Tenants',
    items: [
      { id: 'tenants', label: 'Tenant Registry', path: '/platform/tenants', icon: Building2 },
    ],
  },
  {
    id: 'commercial',
    label: 'Commercial',
    items: [
      { id: 'plans', label: 'Plans & Features', path: '/platform/plans', icon: Package },
      {
        id: 'entitlements',
        label: 'Entitlements',
        path: '/platform/entitlements',
        icon: SlidersHorizontal,
      },
    ],
  },
  {
    id: 'governance',
    label: 'Governance',
    items: [
      {
        id: 'guardrails',
        label: 'Business Rules',
        path: '/platform/guardrails',
        icon: ShieldCheck,
      },
    ],
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    items: [
      { id: 'ledger', label: 'TigerBeetle Ledger', path: '/platform/ledger', icon: Database },
      { id: 'tigerbeetle', label: 'TB Config', path: '/platform/tigerbeetle', icon: Database },
      { id: 'settlement', label: 'Settlement', path: '/platform/settlement', icon: DollarSign },
      {
        id: 'payment-rails',
        label: 'Payment Rails',
        path: '/platform/payment-rails',
        icon: Route,
      },
    ],
  },
  {
    id: 'support',
    label: 'Support',
    items: [{ id: 'support', label: 'Support Console', path: '/platform/support', icon: LifeBuoy }],
  },
];

/**
 * Returns the platform nav groups. Owner and support see the same sections so support can
 * inspect commercial and infrastructure surfaces; write affordances stay owner-only in each page.
 */
export function getPlatformNavGroups(_isPlatformOwner: boolean): NavGroup[] {
  return allGroups;
}
