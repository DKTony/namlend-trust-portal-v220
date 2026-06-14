/**
 * Plans & Feature Catalog — read-only view of the commercial plans (Phase 3).
 *
 * Reads `listPlans` (platform-staff gated). Each plan's `defaultFeatures` are cross-referenced
 * against the code manifest so unknown/renamed keys are visible. Plan editing is Phase 4
 * (`upsertPlan`, owner-guarded, already exists).
 */

import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/integrations/convex/api';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { getFeature } from '@/config/features';
import { cn } from '@/lib/utils';
import type { Doc } from '@/types/convex';

const PlansView: React.FC = () => {
  const plans = useQuery(api.platform.plans.listPlans, {});

  if (plans === undefined) {
    return <div className="p-6 text-sm text-muted-foreground">Loading plans…</div>;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h2 className="text-xl font-semibold">Plans &amp; Feature Catalog</h2>
        <p className="text-sm text-muted-foreground">
          Commercial plans and the features each grants by default. Read-only in this release.
        </p>
      </div>

      {plans.length === 0 ? (
        <ThemedCard>
          <p className="text-sm text-muted-foreground">
            No plans defined yet. Seed the control plane to create the default plans.
          </p>
        </ThemedCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {plans.map((plan: Doc<'plans'>) => (
            <ThemedCard key={plan._id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{plan.name}</h3>
                  <p className="font-mono text-xs text-muted-foreground">{plan.planCode}</p>
                </div>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    plan.status === 'active'
                      ? 'bg-emerald-500/15 text-emerald-600'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {plan.status}
                </span>
              </div>

              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                  Default features ({plan.defaultFeatures.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {plan.defaultFeatures.map((key: string) => {
                    const known = getFeature(key);
                    return (
                      <span
                        key={key}
                        title={known ? `${known.name} · ${known.category}` : 'Unknown feature key'}
                        className={cn(
                          'rounded border px-2 py-0.5 text-xs',
                          known
                            ? 'border-border text-foreground'
                            : 'border-amber-500/40 bg-amber-500/10 text-amber-600'
                        )}
                      >
                        {known ? known.name : `⚠ ${key}`}
                      </span>
                    );
                  })}
                </div>
              </div>
            </ThemedCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlansView;
