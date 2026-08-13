import type { MenuItem } from '@/components/Layout/ThemedSidebar';
import {
  ClipboardList,
  CreditCard,
  FileText,
  Landmark,
  LayoutDashboard,
  PieChart,
  Settings,
  Users,
  Wallet,
} from 'lucide-react';

export interface ClientNavItem extends MenuItem {
  featureKey:
    | 'clientOverview'
    | 'clientLoans'
    | 'clientApplications'
    | 'clientPayments'
    | 'clientBanking'
    | 'clientBudget'
    | 'clientDocuments'
    | 'clientSelfService'
    | 'clientProfile';
  route?: string;
}

/** The single ordered Client Portal navigation source used by every adaptive shell. */
export const CLIENT_NAV_ITEMS: readonly ClientNavItem[] = [
  { featureKey: 'clientOverview', icon: LayoutDashboard, label: 'Overview', id: 'overview' },
  { featureKey: 'clientLoans', icon: Wallet, label: 'My Loans', id: 'loans' },
  {
    featureKey: 'clientApplications',
    icon: ClipboardList,
    label: 'Applications',
    id: 'applications',
  },
  { featureKey: 'clientPayments', icon: CreditCard, label: 'Payments', id: 'payments' },
  { featureKey: 'clientBanking', icon: Landmark, label: 'Banking', id: 'banking' },
  {
    featureKey: 'clientBudget',
    icon: PieChart,
    label: 'Budget & Finance',
    id: 'budget',
    route: '/budget',
  },
  {
    featureKey: 'clientDocuments',
    icon: FileText,
    label: 'Documents',
    id: 'documents',
    route: '/kyc',
  },
  { featureKey: 'clientSelfService', icon: Users, label: 'Self Service', id: 'self-service' },
  { featureKey: 'clientProfile', icon: Settings, label: 'Profile', id: 'profile' },
];

export const CLIENT_FEATURE_BY_TAB = new Map(
  CLIENT_NAV_ITEMS.map((item) => [item.id, item.featureKey] as const)
);

export function getEnabledClientNavItems(
  hasFeature: (featureKey: string) => boolean
): ClientNavItem[] {
  return CLIENT_NAV_ITEMS.filter((item) => hasFeature(item.featureKey));
}

export function normalizeClientTab(tab: string | undefined): string | undefined {
  return tab === 'dashboard' ? 'overview' : tab;
}
