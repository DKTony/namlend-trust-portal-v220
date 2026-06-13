/**
 * Feature manifest — the CODE source of truth for what the platform can enforce.
 *
 * AUTHORITY RULE (see docs/architecture/multi-tenant-platform-blueprint.md §4):
 *   - This manifest defines every valid `featureKey`. The database (`featuresCatalog`,
 *     `plans`, `tenantEntitlements`) may only reference keys that exist here — it may
 *     not invent enforceable behavior.
 *   - A feature may exist here before it is commercially available.
 *
 * Shared by the frontend (nav/route gating) and the backend (entitlement guards) so the
 * two can never drift. The `dependsOn` graph is the loose-coupling contract.
 */

export type FeatureConsole = 'platform' | 'backoffice' | 'client';
export type FeatureCategory =
  | 'lending'
  | 'collections'
  | 'payments'
  | 'analytics'
  | 'compliance'
  | 'branding'
  | 'platform';
export type ComplianceClass = 'guardrail' | 'tenant_policy' | 'feature_rule';

export interface FeatureDef {
  /** Stable identifier — referenced by plans, entitlements, nav, and backend guards. */
  key: string;
  name: string;
  category: FeatureCategory;
  console: FeatureConsole;
  /** Roles that can use the feature when it is enabled (informational in Phase 0). */
  requiredRoles?: string[];
  /** Admin nav item ids this feature powers (see src/config/adminNav.ts). */
  navItems?: string[];
  /** Backend capability tags this feature unlocks (for documentation/traceability). */
  backendCapabilities?: string[];
  /** Other feature keys this feature requires — the loose-coupling contract. */
  dependsOn?: string[];
  complianceClass?: ComplianceClass;
  /** Plans that include this feature by default (informational; plans table is authoritative). */
  defaultAvailability?: string[];
  killSwitchable?: boolean;
  /** Core lending — always on for every tenant regardless of plan. */
  alwaysOn?: boolean;
}

/**
 * The catalog. Core lending capabilities are `alwaysOn`; everything else is a gated
 * add-on that a plan/entitlement must grant. Categories mirror the current admin sections.
 */
export const FEATURES: readonly FeatureDef[] = [
  // --- Core lending (always on) ---
  {
    key: 'loans',
    name: 'Loans',
    category: 'lending',
    console: 'backoffice',
    navItems: ['loans'],
    alwaysOn: true,
  },
  {
    key: 'clients',
    name: 'Clients',
    category: 'lending',
    console: 'backoffice',
    navItems: ['clients'],
    alwaysOn: true,
  },
  {
    key: 'payments',
    name: 'Payments',
    category: 'payments',
    console: 'backoffice',
    navItems: ['payments'],
    alwaysOn: true,
  },
  {
    key: 'approvals',
    name: 'Approvals',
    category: 'lending',
    console: 'backoffice',
    navItems: ['approvals'],
    alwaysOn: true,
  },
  {
    key: 'tenantUsers',
    name: 'User Management',
    category: 'lending',
    console: 'backoffice',
    navItems: ['users'],
    alwaysOn: true,
  },
  {
    key: 'batchOps',
    name: 'Batch Operations',
    category: 'lending',
    console: 'backoffice',
    navItems: ['batch'],
    alwaysOn: true,
  },

  // --- Gated backoffice add-ons ---
  {
    key: 'collections',
    name: 'Collections',
    category: 'collections',
    console: 'backoffice',
    navItems: ['collections'],
    killSwitchable: true,
  },
  {
    key: 'mandates',
    name: 'Mandates / Debit Orders',
    category: 'collections',
    console: 'backoffice',
    navItems: ['mandates'],
    dependsOn: ['collections'],
    killSwitchable: true,
  },
  {
    key: 'ippOnboarding',
    name: 'IPP / IPS Onboarding',
    category: 'payments',
    console: 'backoffice',
    navItems: ['ipp-onboarding'],
    killSwitchable: true,
  },
  {
    key: 'products',
    name: 'Product Engine',
    category: 'lending',
    console: 'backoffice',
    navItems: ['products'],
    killSwitchable: true,
  },
  {
    key: 'whiteLabelBranding',
    name: 'White-label Branding',
    category: 'branding',
    console: 'backoffice',
    navItems: ['branding'],
    killSwitchable: true,
  },
  {
    key: 'creditPolicy',
    name: 'Credit Policy',
    category: 'compliance',
    console: 'backoffice',
    navItems: ['credit-policy'],
    complianceClass: 'tenant_policy',
    killSwitchable: true,
  },
  {
    key: 'popiaConsent',
    name: 'POPIA Consent',
    category: 'compliance',
    console: 'backoffice',
    navItems: ['consent'],
    complianceClass: 'tenant_policy',
    killSwitchable: true,
  },
  {
    key: 'advancedAnalytics',
    name: 'Advanced Analytics',
    category: 'analytics',
    console: 'backoffice',
    navItems: ['analytics'],
    killSwitchable: true,
  },
  {
    key: 'tenantReconciliation',
    name: 'Reconciliation',
    category: 'payments',
    console: 'backoffice',
    navItems: ['reconciliation'],
    killSwitchable: true,
  },
  {
    key: 'workflows',
    name: 'Workflow Builder',
    category: 'lending',
    console: 'backoffice',
    navItems: ['workflows'],
    killSwitchable: true,
  },

  // --- Platform-only (owner console) ---
  {
    key: 'tenantRegistry',
    name: 'Tenant Registry',
    category: 'platform',
    console: 'platform',
    navItems: ['institutions'],
  },
  {
    key: 'planManagement',
    name: 'Plans & Feature Catalog',
    category: 'platform',
    console: 'platform',
  },
  {
    key: 'entitlementDispatch',
    name: 'Entitlement Dispatch',
    category: 'platform',
    console: 'platform',
  },
  {
    key: 'platformGuardrails',
    name: 'Platform Guardrails',
    category: 'compliance',
    console: 'platform',
    navItems: ['business-rules'],
    complianceClass: 'guardrail',
  },
  {
    key: 'ledgerConfig',
    name: 'TigerBeetle / Ledger Config',
    category: 'platform',
    console: 'platform',
    navItems: ['ledger', 'tigerbeetle-config'],
  },
  {
    key: 'settlementConfig',
    name: 'Settlement / Rails Config',
    category: 'platform',
    console: 'platform',
    navItems: ['payment-rails', 'settlement-config'],
  },
  { key: 'supportConsole', name: 'Support Console', category: 'platform', console: 'platform' },
] as const;

/** Set of every valid feature key — the authority gate. */
export const FEATURE_KEYS: ReadonlySet<string> = new Set(FEATURES.map((f) => f.key));

/** Authority rule: is this key something the code knows how to enforce? */
export function isValidFeatureKey(key: string): boolean {
  return FEATURE_KEYS.has(key);
}

export function getFeature(key: string): FeatureDef | undefined {
  return FEATURES.find((f) => f.key === key);
}

/** Feature keys that are always available to every tenant regardless of plan. */
export const ALWAYS_ON_FEATURES: readonly string[] = FEATURES.filter((f) => f.alwaysOn).map(
  (f) => f.key
);
