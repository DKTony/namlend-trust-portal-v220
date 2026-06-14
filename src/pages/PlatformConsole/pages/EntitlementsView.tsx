/**
 * Entitlements — read-only inspection of a tenant's resolved feature set (Phase 3).
 *
 * Pick a tenant, see (a) the resolved feature set the backend would enforce
 * (`getResolvedEntitlements`) and (b) the raw override rows (`getTenantEntitlements`) that
 * produced it. Both reads are platform-staff gated. The dispatch lever
 * (`setTenantEntitlement`, owner-guarded) gets its UI in Phase 4.
 */

import React, { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/integrations/convex/api';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { getFeature } from '@/config/features';
import { cn } from '@/lib/utils';
import type { Doc } from '@/types/convex';

const EntitlementsView: React.FC = () => {
  const tenants = useQuery(api.ontology.institutions.listInstitutions, {});
  const [selectedId, setSelectedId] = useState<string>('');

  // Default to the first tenant once the list loads.
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

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Entitlements</h2>
          <p className="text-sm text-muted-foreground">
            Resolved feature set per tenant and the override rows behind it.
          </p>
        </div>
        <label className="text-sm">
          <span className="mr-2 text-muted-foreground">Tenant:</span>
          <select
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
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
              ? 'No tenants yet — seed the control plane first.'
              : 'Select a tenant to inspect its entitlements.'}
          </p>
        </ThemedCard>
      ) : (
        <>
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
