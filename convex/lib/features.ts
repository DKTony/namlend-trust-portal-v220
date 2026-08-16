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
    key: 'tenantInvites',
    name: 'Tenant Email Invites',
    category: 'lending',
    console: 'backoffice',
    navItems: ['users', 'clients'],
    dependsOn: ['tenantUsers'],
    killSwitchable: true,
    defaultAvailability: ['enterprise', 'all_features'],
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
    name: 'POPIA Consent Management',
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

  // --- Client Portal surfaces ---
  // These keys intentionally remain distinct from similarly named backoffice capabilities.
  {
    key: 'clientOverview',
    name: 'Overview',
    category: 'lending',
    console: 'client',
    requiredRoles: ['client'],
    navItems: ['overview'],
    backendCapabilities: ['client-dashboard-overview'],
    killSwitchable: true,
  },
  {
    key: 'clientLoans',
    name: 'My Loans',
    category: 'lending',
    console: 'client',
    requiredRoles: ['client'],
    navItems: ['loans'],
    backendCapabilities: ['client-loan-history'],
    killSwitchable: true,
  },
  {
    key: 'clientApplications',
    name: 'Applications',
    category: 'lending',
    console: 'client',
    requiredRoles: ['client'],
    navItems: ['applications'],
    backendCapabilities: ['client-loan-draft', 'client-loan-submission'],
    dependsOn: ['clientDocuments'],
    killSwitchable: true,
  },
  {
    key: 'clientPayments',
    name: 'Payments',
    category: 'payments',
    console: 'client',
    requiredRoles: ['client'],
    navItems: ['payments'],
    backendCapabilities: ['client-payment-surface'],
    killSwitchable: true,
  },
  {
    key: 'clientBanking',
    name: 'Banking',
    category: 'payments',
    console: 'client',
    requiredRoles: ['client'],
    navItems: ['banking'],
    backendCapabilities: ['client-ipp-onboarding', 'client-ipp-alias', 'client-instant-payment'],
    dependsOn: ['ippOnboarding'],
    killSwitchable: true,
  },
  {
    key: 'clientBudget',
    name: 'Budget & Finance',
    category: 'analytics',
    console: 'client',
    requiredRoles: ['client'],
    navItems: ['budget'],
    backendCapabilities: ['client-budget-surface'],
    killSwitchable: true,
  },
  {
    key: 'clientDocuments',
    name: 'Documents',
    category: 'compliance',
    console: 'client',
    requiredRoles: ['client'],
    navItems: ['documents'],
    backendCapabilities: ['client-kyc-upload', 'client-kyc-submission', 'client-document-access'],
    complianceClass: 'feature_rule',
    killSwitchable: true,
  },
  {
    key: 'clientSelfService',
    name: 'Self Service',
    category: 'collections',
    console: 'client',
    requiredRoles: ['client'],
    navItems: ['self-service'],
    backendCapabilities: ['client-reschedule-request'],
    killSwitchable: true,
  },
  {
    key: 'clientProfile',
    name: 'Profile',
    category: 'compliance',
    console: 'client',
    requiredRoles: ['client'],
    navItems: ['profile'],
    backendCapabilities: ['optional-client-profile-surface'],
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

/** Client Portal features in catalogue/navigation fallback order. */
export const CLIENT_FEATURES: readonly FeatureDef[] = FEATURES.filter(
  (feature) => feature.console === 'client'
);

/** Features that commercial plans and tenant overrides are allowed to grant. */
export const TENANT_GRANTABLE_FEATURES: readonly FeatureDef[] = FEATURES.filter(
  (feature) => feature.console !== 'platform'
);

export const TENANT_GRANTABLE_FEATURE_KEYS: ReadonlySet<string> = new Set(
  TENANT_GRANTABLE_FEATURES.map((feature) => feature.key)
);

export function isTenantGrantableFeatureKey(key: string): boolean {
  return TENANT_GRANTABLE_FEATURE_KEYS.has(key);
}

export interface MissingFeatureDependency {
  featureKey: string;
  dependency: string;
}

/** Return every direct dependency omitted from the supplied resolved feature set. */
export function getMissingFeatureDependencies(
  featureKeys: Iterable<string>
): MissingFeatureDependency[] {
  const enabled = new Set(featureKeys);
  return TENANT_GRANTABLE_FEATURES.flatMap((feature) =>
    enabled.has(feature.key)
      ? (feature.dependsOn ?? [])
          .filter((dependency) => !enabled.has(dependency))
          .map((dependency) => ({ featureKey: feature.key, dependency }))
      : []
  );
}

/** Expand a feature set with the complete transitive dependency closure. */
export function withFeatureDependencyClosure(featureKeys: Iterable<string>): string[] {
  const expanded = new Set(featureKeys);
  let changed = true;
  while (changed) {
    changed = false;
    for (const featureKey of [...expanded]) {
      const feature = getFeature(featureKey);
      for (const dependency of feature?.dependsOn ?? []) {
        if (!expanded.has(dependency)) {
          expanded.add(dependency);
          changed = true;
        }
      }
    }
  }
  return [...expanded];
}

/** Serializable catalogue metadata derived from the canonical manifest. */
export function getFeatureCatalogMetadata(feature: FeatureDef): Record<string, unknown> {
  return {
    ...(feature.requiredRoles ? { requiredRoles: feature.requiredRoles } : {}),
    ...(feature.navItems ? { navItems: feature.navItems } : {}),
    ...(feature.backendCapabilities ? { backendCapabilities: feature.backendCapabilities } : {}),
    ...(feature.dependsOn ? { dependsOn: feature.dependsOn } : {}),
    ...(feature.killSwitchable !== undefined ? { killSwitchable: feature.killSwitchable } : {}),
    ...(feature.alwaysOn !== undefined ? { alwaysOn: feature.alwaysOn } : {}),
  };
}
