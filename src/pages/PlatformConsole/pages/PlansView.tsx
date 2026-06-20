/**
 * Plans & Feature Catalog (Phase 4) — read for all platform staff, create/edit for owners.
 *
 * Reads `listPlans`; owners can upsert a plan (`upsertPlan`, owner-guarded). The feature picker
 * is built from the code manifest (`FEATURES`) and excludes platform-console features (those are
 * gated by platform role, not sold to tenants); always-on core features are locked on.
 */

import { ThemedCard } from '@/components/ui/ThemedCard';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FEATURES, getFeature } from '@/config/features';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/integrations/convex/api';
import { handleMutationError } from '@/lib/mutationError';
import { cn } from '@/lib/utils';
import type { Doc } from '@/types/convex';
import { useMutation, useQuery } from 'convex/react';
import { Pencil, Plus } from 'lucide-react';
import React, { useMemo, useState } from 'react';

/** Features a plan may grant: everything except platform-console capabilities. */
const SELECTABLE_FEATURES = FEATURES.filter((f) => f.console !== 'platform');

const PlanDialog: React.FC<{ existing?: Doc<'plans'>; trigger: React.ReactNode }> = ({
  existing,
  trigger,
}) => {
  const upsertPlan = useMutation(api.platform.plans.upsertPlan);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [planCode, setPlanCode] = useState(existing?.planCode ?? '');
  const [name, setName] = useState(existing?.name ?? '');
  const [selected, setSelected] = useState<Set<string>>(
    () =>
      new Set(
        existing?.defaultFeatures ?? SELECTABLE_FEATURES.filter((f) => f.alwaysOn).map((f) => f.key)
      )
  );

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const submit = async () => {
    setBusy(true);
    try {
      // Always-on features are implicitly part of every plan; include them defensively.
      const features = new Set(selected);
      for (const f of SELECTABLE_FEATURES) if (f.alwaysOn) features.add(f.key);
      await upsertPlan({
        planCode: planCode.trim(),
        name: name.trim(),
        defaultFeatures: [...features],
      });
      toast({ title: 'Plan saved', description: `${name} (${planCode}).` });
      setOpen(false);
    } catch (err) {
      toast({
        title: 'Save failed',
        description: handleMutationError(err, 'Could not save the plan.'),
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{existing ? `Edit plan — ${existing.name}` : 'New plan'}</DialogTitle>
            <DialogDescription>
              Feature keys are validated against the code manifest on save.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="p-code">Plan code</Label>
              <Input
                id="p-code"
                value={planCode}
                disabled={!!existing}
                onChange={(e) => setPlanCode(e.target.value)}
                placeholder="growth"
              />
            </div>
            <div>
              <Label htmlFor="p-name">Name</Label>
              <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Default features</Label>
              <div className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
                {SELECTABLE_FEATURES.map((f) => (
                  <label
                    key={f.key}
                    className="flex items-center gap-2 rounded border px-2 py-1 text-sm"
                    title={`${f.category} · ${f.console}`}
                  >
                    <input
                      type="checkbox"
                      checked={f.alwaysOn || selected.has(f.key)}
                      disabled={f.alwaysOn}
                      onChange={() => toggle(f.key)}
                    />
                    <span className={cn(f.alwaysOn && 'text-muted-foreground')}>
                      {f.name}
                      {f.alwaysOn && ' (core)'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy || !planCode.trim() || !name.trim()}>
              {busy ? 'Saving…' : 'Save plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const PlansView: React.FC = () => {
  const { isPlatformOwner } = useAuth();
  const plans = useQuery(api.platform.plans.listPlans, {}) as Doc<'plans'>[] | undefined;
  const sorted = useMemo(
    () => [...(plans ?? [])].sort((a, b) => a.planCode.localeCompare(b.planCode)),
    [plans]
  );

  return (
    <div data-testid="platform-plans" className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Plans &amp; Feature Catalog</h2>
          <p className="text-sm text-muted-foreground">
            Commercial plans and the features each grants by default.
          </p>
        </div>
        {isPlatformOwner && (
          <PlanDialog
            trigger={
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> New plan
              </Button>
            }
          />
        )}
      </div>

      {plans === undefined ? (
        <div className="text-sm text-muted-foreground">Loading plans…</div>
      ) : sorted.length === 0 ? (
        <ThemedCard>
          <p className="text-sm text-muted-foreground">
            No plans defined yet. Create one, or seed the control plane.
          </p>
        </ThemedCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {sorted.map((plan: Doc<'plans'>) => (
            <ThemedCard key={plan._id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{plan.name}</h3>
                  <p className="font-mono text-xs text-muted-foreground">{plan.planCode}</p>
                </div>
                <div className="flex items-center gap-2">
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
                  {isPlatformOwner && (
                    <PlanDialog
                      existing={plan}
                      trigger={
                        <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                      }
                    />
                  )}
                </div>
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
