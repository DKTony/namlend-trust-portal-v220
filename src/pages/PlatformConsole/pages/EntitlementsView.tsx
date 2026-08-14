/**
 * Entitlements — inspect AND dispatch a tenant's feature set.
 *
 * Pick a tenant (deep-linkable via ?tenant=), see the resolved feature set
 * (`getResolvedEntitlements`) and the raw override rows (`getTenantEntitlements`). Owners can
 * flip an add-on on/off per tenant via `setTenantEntitlement` — the "deploy a feature to a
 * tenant" lever. Reads are platform-staff; the mutation is owner-guarded on the backend.
 */

import { ThemedCard } from '@/components/ui/ThemedCard';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { FEATURES, getFeature } from '@/config/features';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/integrations/convex/api';
import { BACKEND_CATALOG_STALE_HINT, handleMutationError } from '@/lib/mutationError';
import { cn } from '@/lib/utils';
import type { Doc, Id } from '@/types/convex';
import { useMutation, useQuery } from 'convex/react';
import React, { Component, type ReactNode, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import EnforcementControls from '../components/EnforcementControls';

/** Tenant-grantable switches (core/always-on features cannot be revoked). */
const DISPATCHABLE = FEATURES.filter((f) => f.console !== 'platform' && !f.alwaysOn);
const DISPATCH_GROUPS = [
  {
    console: 'backoffice',
    label: 'Backoffice add-ons',
    features: DISPATCHABLE.filter((feature) => feature.console === 'backoffice'),
  },
  {
    console: 'client',
    label: 'Client Portal',
    features: DISPATCHABLE.filter((feature) => feature.console === 'client'),
  },
];

/** Shape returned by the platform-gated listTenants query (subset used by the selector). */
interface TenantOption {
  _id: Id<'institutions'>;
  name: string;
  shortCode: string;
}

function formatDate(ms?: number) {
  return ms ? new Date(ms).toLocaleDateString() : 'open-ended';
}

function CatalogStaleBanner() {
  return (
    <div
      data-testid="catalog-stale-banner"
      className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800"
    >
      {BACKEND_CATALOG_STALE_HINT}
    </div>
  );
}

class CatalogHandshakeBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

interface DispatchPanelProps {
  selected: TenantOption;
  resolved: string[] | undefined;
  rows: Doc<'tenantEntitlements'>[] | undefined;
  subscription:
    | {
        planCode?: string;
        status: string;
        effectiveFrom: number;
        effectiveTo?: number;
      }
    | null
    | undefined;
  enforcementOn: boolean | undefined;
  forceStale?: boolean;
  serverKeys?: Set<string> | null;
}

const DispatchSwitches: React.FC<{
  selected: TenantOption;
  resolved: string[];
  rows: Doc<'tenantEntitlements'>[] | undefined;
  serverKeys: Set<string> | null;
  forceDisabled: boolean;
}> = ({ selected, resolved, rows, serverKeys, forceDisabled }) => {
  const { toast } = useToast();
  const setTenantEntitlement = useMutation(api.platform.entitlements.setTenantEntitlement);
  const [pending, setPending] = useState<string | null>(null);
  const resolvedSet = new Set(resolved);

  const canDispatch = (key: string) =>
    !forceDisabled && (serverKeys === null || serverKeys.has(key));

  const dispatch = async (featureKey: string, enabled: boolean) => {
    if (!canDispatch(featureKey)) return;
    const feature = getFeature(featureKey);
    const missingDependencies = (feature?.dependsOn ?? []).filter((key) => !resolvedSet.has(key));
    if (enabled && missingDependencies.length > 0) {
      toast({
        title: 'Enable dependency first',
        description: `${feature?.name ?? featureKey} requires ${missingDependencies.map((key) => getFeature(key)?.name ?? key).join(', ')}.`,
        variant: 'destructive',
      });
      return;
    }
    const activeDependent = DISPATCHABLE.find(
      (candidate) => resolvedSet.has(candidate.key) && candidate.dependsOn?.includes(featureKey)
    );
    if (!enabled && activeDependent) {
      toast({
        title: 'Dependency still in use',
        description: `${feature?.name ?? featureKey} cannot be disabled while ${activeDependent.name} remains enabled.`,
        variant: 'destructive',
      });
      return;
    }
    setPending(featureKey);
    try {
      await setTenantEntitlement({
        institutionId: selected._id,
        featureKey,
        source: 'manual_override',
        enabled,
        rolloutState: enabled ? 'enabled' : 'off',
        reason: `Platform Console dispatch (${enabled ? 'enabled' : 'disabled'})`,
      });
      toast({
        title: enabled ? 'Feature enabled' : 'Feature disabled',
        description: `${getFeature(featureKey)?.name ?? featureKey} for ${selected.name}.`,
      });
    } catch (err) {
      toast({
        title: 'Dispatch failed',
        description: handleMutationError(err, 'Could not update the entitlement.'),
        variant: 'destructive',
      });
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-5">
      {DISPATCH_GROUPS.map((group) => (
        <section key={group.console}>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {group.features.map((f) => {
              const missingDependencies = (f.dependsOn ?? []).filter(
                (key) => !resolvedSet.has(key)
              );
              const row = (rows ?? []).find(
                (r: Doc<'tenantEntitlements'>) => r.featureKey === f.key && !r.effectiveTo
              );
              const unknownToBackend = serverKeys !== null && !serverKeys.has(f.key);
              return (
                <div
                  key={f.key}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{f.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{f.key}</p>
                    {(f.dependsOn?.length ?? 0) > 0 && (
                      <p
                        className={cn(
                          'mt-1 text-xs',
                          missingDependencies.length > 0
                            ? 'text-amber-600'
                            : 'text-muted-foreground'
                        )}
                      >
                        Depends on {f.dependsOn?.join(', ')}
                      </p>
                    )}
                    {unknownToBackend && (
                      <p className="mt-1 text-xs text-amber-700">Not in backend catalog</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Rollout: {row?.rolloutState ?? 'plan/default'}
                    </p>
                  </div>
                  <Switch
                    checked={resolvedSet.has(f.key)}
                    disabled={pending === f.key || !canDispatch(f.key)}
                    onCheckedChange={(v) => dispatch(f.key, v)}
                    aria-label={`Toggle ${f.name}`}
                    data-testid={`entitlement-switch-${f.key}`}
                  />
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};

const HandshakeDispatch: React.FC<Omit<DispatchPanelProps, 'forceStale' | 'serverKeys'>> = (
  props
) => {
  const manifestKeys = useQuery(api.platform.entitlements.listManifestKeys, {});
  const serverKeys = manifestKeys === undefined ? null : new Set(manifestKeys);
  const catalogStale =
    serverKeys !== null && DISPATCHABLE.some((feature) => !serverKeys.has(feature.key));

  return <DispatchPanelBody {...props} serverKeys={serverKeys} forceStale={catalogStale} />;
};

const DispatchPanelBody: React.FC<DispatchPanelProps> = ({
  selected,
  resolved,
  rows,
  subscription,
  enforcementOn,
  forceStale = false,
  serverKeys = null,
}) => (
  <ThemedCard className="space-y-3">
    <h3 className="text-sm font-semibold">Dispatch add-ons</h3>
    <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
      <div className="rounded-md border px-3 py-2">
        <p className="text-muted-foreground">Enforcement</p>
        <p className="mt-1 font-medium">
          {enforcementOn === undefined ? 'Checking…' : enforcementOn ? 'On' : 'Off (inert)'}
        </p>
      </div>
      <div className="rounded-md border px-3 py-2">
        <p className="text-muted-foreground">Active plan</p>
        <p className="mt-1 font-medium">
          {subscription === undefined
            ? 'Loading…'
            : (subscription?.planCode ?? 'No active subscription')}
        </p>
      </div>
      <div className="rounded-md border px-3 py-2">
        <p className="text-muted-foreground">Subscription window</p>
        <p className="mt-1 font-medium">
          {subscription
            ? `${subscription.status} · ${formatDate(subscription.effectiveFrom)} to ${formatDate(subscription.effectiveTo)}`
            : 'No active/trial row'}
        </p>
      </div>
    </div>
    <p className="text-xs text-muted-foreground">
      Toggling writes a manual override for this tenant. Unknown feature keys are rejected
      server-side by the code manifest authority rule.
    </p>
    {forceStale && <CatalogStaleBanner />}
    {resolved === undefined ? (
      <p className="text-sm text-muted-foreground" data-testid="entitlements-resolving">
        Resolving feature switches…
      </p>
    ) : (
      <DispatchSwitches
        selected={selected}
        resolved={resolved}
        rows={rows}
        serverKeys={serverKeys}
        forceDisabled={forceStale && serverKeys === null}
      />
    )}
  </ThemedCard>
);

const EntitlementsView: React.FC = () => {
  const { isPlatformOwner } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const tenants = useQuery(api.platform.tenants.listTenants, {}) as TenantOption[] | undefined;
  const backfillClientFeatures = useMutation(
    api.platform.entitlements.backfillClientFeatureDefaults
  );
  const readiness = useQuery(api.platform.readiness.getEnforcementReadiness, {});

  const [selectedId, setSelectedId] = useState<string>(searchParams.get('tenant') ?? '');
  const [migrationBusy, setMigrationBusy] = useState(false);
  const [migrationReport, setMigrationReport] = useState<{
    dryRun: boolean;
    counts: { catalogToInsert: number; plansToUpdate: number; overrideConflicts: number };
  } | null>(null);

  useEffect(() => {
    if (!selectedId && tenants && tenants.length > 0) setSelectedId(tenants[0]._id);
  }, [tenants, selectedId]);

  const selected = tenants?.find((t: TenantOption) => t._id === selectedId);
  const resolved = useQuery(
    api.platform.entitlements.getResolvedEntitlements,
    selected ? { institutionId: selected._id } : 'skip'
  );
  const rows = useQuery(
    api.platform.entitlements.getTenantEntitlements,
    selected ? { institutionId: selected._id } : 'skip'
  ) as Doc<'tenantEntitlements'>[] | undefined;
  const subscription = useQuery(
    api.platform.tenants.getTenantSubscription,
    selected ? { institutionId: selected._id } : 'skip'
  );
  const enforcementOn = useQuery(api.platform.entitlements.isEntitlementEnforcementOn, {});

  const onSelect = (id: string) => {
    setSelectedId(id);
    setSearchParams(id ? { tenant: id } : {}, { replace: true });
  };

  const runClientFeatureBackfill = async (dryRun: boolean) => {
    setMigrationBusy(true);
    try {
      const report = await backfillClientFeatures({ dryRun });
      setMigrationReport(report);
      toast({
        title: dryRun ? 'Backfill dry run complete' : 'Client features backfilled',
        description: `${report.counts.catalogToInsert} catalogue rows, ${report.counts.plansToUpdate} plans, ${report.counts.overrideConflicts} override conflicts.`,
      });
    } catch (err) {
      toast({
        title: 'Backfill failed',
        description: handleMutationError(err, 'Could not run the client-feature backfill.'),
        variant: 'destructive',
      });
    } finally {
      setMigrationBusy(false);
    }
  };

  return (
    <div data-testid="platform-entitlements" className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Entitlements</h2>
          <p className="text-sm text-muted-foreground">
            Resolved feature set per tenant, the override rows behind it, and the dispatch lever.
          </p>
        </div>
        <label className="text-sm">
          <span className="mr-2 text-muted-foreground">Tenant:</span>
          <select
            data-testid="entitlements-tenant-select"
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
            value={selectedId}
            onChange={(e) => onSelect(e.target.value)}
          >
            {(tenants ?? []).map((t: TenantOption) => (
              <option key={t._id} value={t._id}>
                {t.name} ({t.shortCode})
              </option>
            ))}
          </select>
        </label>
      </div>

      {isPlatformOwner && <EnforcementControls />}

      {readiness && readiness.blockers.length > 0 && (
        <ThemedCard data-testid="entitlements-readiness-blockers">
          <h3 className="text-sm font-semibold">Activation blockers</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Missing catalogue or plan defaults are usually fixed by the client-feature backfill
            below.
          </p>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            {readiness.blockers.map((blocker: string) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </ThemedCard>
      )}

      {isPlatformOwner && (
        <ThemedCard className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">Client feature migration</h3>
              <p className="text-xs text-muted-foreground">
                Additive and idempotent. Review the dry run before applying; tenant overrides are
                reported and preserved.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={migrationBusy}
                onClick={() => void runClientFeatureBackfill(true)}
              >
                Dry run
              </Button>
              <Button
                disabled={migrationBusy || migrationReport?.dryRun !== true}
                onClick={() => void runClientFeatureBackfill(false)}
              >
                Apply backfill
              </Button>
            </div>
          </div>
          {migrationReport && (
            <p className="text-xs text-muted-foreground" data-testid="client-backfill-report">
              {migrationReport.dryRun ? 'Dry run' : 'Applied'}:{' '}
              {migrationReport.counts.catalogToInsert} catalogue row(s),{' '}
              {migrationReport.counts.plansToUpdate} plan(s),{' '}
              {migrationReport.counts.overrideConflicts} override conflict(s).
            </p>
          )}
        </ThemedCard>
      )}

      {!selected ? (
        <ThemedCard>
          <p className="text-sm text-muted-foreground">
            {tenants && tenants.length === 0
              ? 'No tenants yet — provision one first.'
              : 'Select a tenant to inspect its entitlements.'}
          </p>
        </ThemedCard>
      ) : (
        <>
          {isPlatformOwner && (
            <CatalogHandshakeBoundary
              fallback={
                <DispatchPanelBody
                  selected={selected}
                  resolved={resolved}
                  rows={rows}
                  subscription={subscription}
                  enforcementOn={enforcementOn}
                  forceStale
                  serverKeys={null}
                />
              }
            >
              <HandshakeDispatch
                selected={selected}
                resolved={resolved}
                rows={rows}
                subscription={subscription}
                enforcementOn={enforcementOn}
              />
            </CatalogHandshakeBoundary>
          )}

          <ThemedCard className="space-y-3">
            <h3 className="text-sm font-semibold">
              Resolved features {resolved ? `(${resolved.length})` : ''}
            </h3>
            {resolved === undefined ? (
              <p className="text-sm text-muted-foreground">Resolving…</p>
            ) : (
              <div className="space-y-3">
                {['backoffice', 'client'].map((consoleName) => {
                  const keys = resolved.filter(
                    (key: string) => getFeature(key)?.console === consoleName
                  );
                  if (keys.length === 0) return null;
                  return (
                    <section key={consoleName}>
                      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {consoleName === 'client' ? 'Client Portal' : 'Backoffice'} ({keys.length})
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {keys.map((key: string) => (
                          <span
                            key={key}
                            title={`${getFeature(key)?.category} · ${consoleName}`}
                            className="rounded border border-border px-2 py-0.5 text-xs"
                          >
                            {getFeature(key)?.name}
                          </span>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </ThemedCard>

          <ThemedCard className="space-y-3">
            <h3 className="text-sm font-semibold">Override rows</h3>
            {rows === undefined ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No per-tenant overrides — the resolved set comes from the plan + always-on features.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="py-1 pr-4">Feature</th>
                      <th className="py-1 pr-4">Source</th>
                      <th className="py-1 pr-4">Enabled</th>
                      <th className="py-1 pr-4">Rollout</th>
                      <th className="py-1 pr-4">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r: Doc<'tenantEntitlements'>) => (
                      <tr key={r._id} className="border-t">
                        <td className="py-1.5 pr-4">
                          {getFeature(r.featureKey)?.name ?? r.featureKey}
                        </td>
                        <td className="py-1.5 pr-4">{r.source}</td>
                        <td className="py-1.5 pr-4">
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.5 text-xs',
                              r.enabled
                                ? 'bg-emerald-500/15 text-emerald-600'
                                : 'bg-red-500/15 text-red-600'
                            )}
                          >
                            {r.enabled ? 'yes' : 'no'}
                          </span>
                        </td>
                        <td className="py-1.5 pr-4">{r.rolloutState}</td>
                        <td className="py-1.5 pr-4 text-muted-foreground">{r.reason ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ThemedCard>
        </>
      )}
    </div>
  );
};

export default EntitlementsView;
