/**
 * Admin portal sidebar navigation configuration.
 * Groups and items for the grouped sidebar component.
 */

import {
  TrendingUp,
  FileText,
  UserCheck,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  CheckSquare,
  Users,
  BarChart3,
  Database,
  Settings,
  Palette,
  Building2,
  Route,
  Package,
  GitBranch,
  ShieldCheck,
  FileSignature,
  LayoutDashboard,
} from 'lucide-react';
import type { NavGroup } from '@/types/navigation';

const allGroups: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [{ id: 'overview', label: 'Dashboard', path: '/admin/overview', icon: LayoutDashboard }],
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
      { id: 'ledger', label: 'TigerBeetle Ledger', path: '/admin/ledger', icon: Database },
      {
        id: 'reconciliation',
        label: 'Reconciliation',
        path: '/admin/reconciliation',
        icon: DollarSign,
      },
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    adminOnly: true,
    items: [
      { id: 'institutions', label: 'Institutions', path: '/admin/institutions', icon: Building2 },
      { id: 'products', label: 'Products', path: '/admin/products', icon: Package },
      { id: 'payment-rails', label: 'Payment Rails', path: '/admin/payment-rails', icon: Route },
      {
        id: 'business-rules',
        label: 'Business Rules',
        path: '/admin/business-rules',
        icon: Settings,
      },
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
      {
        id: 'tigerbeetle-config',
        label: 'TB Config',
        path: '/admin/settings/tigerbeetle',
        icon: Database,
      },
      {
        id: 'settlement-config',
        label: 'Settlement',
        path: '/admin/settings/settlement',
        icon: DollarSign,
      },
      { id: 'branding', label: 'Branding', path: '/admin/settings/branding', icon: Palette },
    ],
  },
];

/**
 * Returns the admin nav groups filtered by role.
 * When isAdmin is false, groups and items marked adminOnly are excluded.
 */
export function getAdminNavGroups(isAdmin: boolean): NavGroup[] {
  if (isAdmin) return allGroups;

  return allGroups
    .filter((g) => !g.adminOnly)
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => !item.adminOnly),
    }));
}
