/**
 * Entitlements (Phase 4) — inspect AND dispatch a tenant's feature set.
 *
 * Pick a tenant (deep-linkable via ?tenant=), see the resolved feature set
 * (`getResolvedEntitlements`) and the raw override rows (`getTenantEntitlements`). Owners can
 * flip an add-on on/off per tenant via `setTenantEntitlement` — the "deploy a feature to a
 * tenant" lever. Reads are platform-staff; the mutation is owner-guarded on the backend.
 */

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/integrations/convex/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { handleMutationError } from '@/lib/mutationError';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { Switch } from '@/components/ui/switch';
import { FEATURES, getFeature } from '@/config/features';
import { cn } from '@/lib/utils';
import type { Doc } from '@/types/convex';

/** Backoffice add-ons an owner can dispatch per tenant (core/always-on can't be revoked). */
const DISPATCHABLE = FEATURES.filter((f) => f.console === 'backoffice' && !f.alwaysOn);

const EntitlementsView: React.FC = () => {
  const { isPlatformOwner } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const tenants = useQuery(api.ontology.institutions.listInstitutions, {});
  const setTenantEntitlement = useMutation(api.platform.entitlements.setTenantEntitlement);

  const [selectedId, setSelectedId] = useState<string>(searchParams.get('tenant') ?? '');
  const [pending, setPending] = useState<string | null>(null);

  // Default to the first tenant once the list loads (unless one is deep-linked).
  useEffect(() => {
    if (!selectedId && tenants && tenants.length > 0) setSelectedId(tenants[0]._id);
  }, [tenants, selectedId]);

  const selected = tenants?.find((t: Doc<'institutions'>) => t._id === selectedId);
  const resolved = useQuery(
    api.platform.entitlements.getResolvedEntitlements,
    selected ? { institutionId: selected._id } : 'skip'
  );
  const rows = useQuery(
    api.platform.entitlements.getTenantEntitlements,
    selected ? { institutionId: selected._id } : 'skip'
  );

  const onSelect = (id: string) => {
    setSelectedId(id);
    setSearchParams(id ? { tenant: id } : {}, { replace: true });
  };

  const dispatch = async (featureKey: string, enabled: boolean) => {
    if (!selected) return;
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

  const resolvedSet = new Set(resolved ?? []);

  return (
    <div className="space-y-6 p-4 sm:p-6">
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
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
            value={selectedId}
            onChange={(e) => onSelect(e.target.value)}
          >
            {((tenants ?? []) as Doc<'institutions'>[]).map((t: Doc<'institutions'>) => (
              <option key={t._id} value={t._id}>
                {t.name} ({t.shortCode})
              </option>
            ))}
          </select>
        </label>
      </div>

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
            <ThemedCard className="space-y-3">
              <h3 className="text-sm font-semibold">Dispatch add-ons</h3>
              <p className="text-xs text-muted-foreground">
                Toggling writes a manual override for this tenant. Effective immediately once
                entitlement enforcement is on.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {DISPATCHABLE.map((f) => (
                  <div
                    key={f.key}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{f.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{f.key}</p>
                    </div>
                    <Switch
                      checked={resolvedSet.has(f.key)}
                      disabled={pending === f.key || resolved === undefined}
                      onCheckedChange={(v) => dispatch(f.key, v)}
                    />
                  </div>
                ))}
              </div>
            </ThemedCard>
          )}

          <ThemedCard className="space-y-3">
            <h3 className="text-sm font-semibold">
              Resolved features {resolved ? `(${resolved.length})` : ''}
            </h3>
            {resolved === undefined ? (
              <p className="text-sm text-muted-foreground">Resolving…</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {resolved.map((key: string) => {
                  const known = getFeature(key);
                  return (
                    <span
                      key={key}
                      title={known ? `${known.category} · ${known.console}` : 'Unknown key'}
                      className="rounded border border-border px-2 py-0.5 text-xs"
                    >
                      {known ? known.name : key}
                    </span>
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
