/**
 * Platform Overview — the owner console landing page (read-only, Phase 3).
 *
 * Composes existing platform-staff reads (tenant registry, plans, entitlement-enforcement
 * flag) into an at-a-glance health card plus orientation. Provisioning/management actions
 * arrive in Phase 4.
 */

import { ThemedCard } from '@/components/ui/ThemedCard';
import { FEATURES } from '@/config/features';
import { api } from '@/integrations/convex/api';
import { useQuery } from 'convex/react';
import {
  ArrowRight,
  Building2,
  Package,
  ShieldAlert,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: React.ReactNode;
}) {
  return (
    <ThemedCard className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="text-primary">{icon}</div>
    </ThemedCard>
  );
}

const PlatformOverview: React.FC = () => {
  // Platform-gated tenant read — a pure platform_owner is NOT tenant staff, so we must not
  // use the assertStaff-gated listInstitutions here.
  const tenants = useQuery(api.platform.tenants.listTenants, {});
  const plans = useQuery(api.platform.plans.listPlans, {});
  const entitlementEnforced = useQuery(api.platform.entitlements.isEntitlementEnforcementOn, {});
  const readiness = useQuery(api.platform.readiness.getEnforcementReadiness, {});

  const tenantCount = tenants?.length ?? '—';
  const planCount = plans?.length ?? '—';
  const platformFeatureCount = FEATURES.filter((f) => f.console === 'platform').length;
  const backofficeFeatureCount = FEATURES.filter((f) => f.console === 'backoffice').length;

  return (
    <div data-testid="platform-overview" className="space-y-6 p-4 sm:p-6">
      <div>
        <h2 className="text-xl font-semibold">Platform Overview</h2>
        <p className="text-sm text-muted-foreground">
          Application-owner control plane — tenants, plans, entitlements, and infrastructure.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tenants"
          value={tenantCount}
          hint="Institutions on the platform"
          icon={<Building2 className="h-6 w-6" />}
        />
        <StatCard
          label="Plans"
          value={planCount}
          hint={`${backofficeFeatureCount} backoffice · ${platformFeatureCount} platform features`}
          icon={<Package className="h-6 w-6" />}
        />
        <StatCard
          label="Entitlement Enforcement"
          value={
            entitlementEnforced === undefined ? '—' : entitlementEnforced ? 'On' : 'Off (inert)'
          }
          hint={
            entitlementEnforced
              ? 'Tenants see only entitled features'
              : 'Flip in Phase 2 to enforce feature gating'
          }
          icon={
            entitlementEnforced ? (
              <ToggleRight className="h-6 w-6" />
            ) : (
              <ToggleLeft className="h-6 w-6" />
            )
          }
        />
        <StatCard
          label="Activation Readiness"
          value={
            readiness === undefined ? '—' : readiness.readyForEntitlements ? 'Ready' : 'Blocked'
          }
          hint={
            readiness === undefined
              ? 'Checking readiness'
              : readiness.readyForEntitlements
                ? 'No activation blockers detected'
                : `${readiness.blockers.length} blocker(s)`
          }
          icon={
            readiness?.readyForEntitlements ? (
              <ShieldCheck className="h-6 w-6" />
            ) : (
              <ShieldAlert className="h-6 w-6" />
            )
          }
        />
      </div>

      {readiness && readiness.blockers.length > 0 && (
        <ThemedCard>
          <h3 className="text-sm font-semibold">Activation blockers</h3>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            {readiness.blockers.map((blocker: string) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </ThemedCard>
      )}

      <ThemedCard>
        <h3 className="text-sm font-semibold">Quick links</h3>
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            { to: '/platform/tenants', label: 'Manage tenant registry' },
            { to: '/platform/plans', label: 'Review plans & feature catalog' },
            { to: '/platform/entitlements', label: 'Inspect tenant entitlements' },
            { to: '/platform/guardrails', label: 'Platform guardrails (business rules)' },
          ].map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
              >
                <span>{l.label}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </ThemedCard>

      <p className="text-xs text-muted-foreground">
        Owner console. Provision tenants, edit plans, and dispatch entitlements from the sections
        above. Enforcement is inert until the kill-switch flags are flipped at go-live.
      </p>
    </div>
  );
};

export default PlatformOverview;
