/**
 * Tenants — platform-owner tenant registry + provisioning (Phase 4).
 *
 * Lists every tenant with its current plan and resolved feature count, and lets the OWNER
 * provision a new tenant (`provisionTenant`) or assign/change a plan / start a trial
 * (`setTenantSubscription`). Support staff see read-only. Backend `assertPlatformOwner` is the
 * real boundary; the owner-only UI gating here is just affordance.
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/integrations/convex/api';
import { handleMutationError } from '@/lib/mutationError';
import { cn } from '@/lib/utils';
import { useMutation, useQuery } from 'convex/react';
import { Plus, SlidersHorizontal } from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Id } from '../../../../convex/_generated/dataModel';

interface TenantRow {
  _id: Id<'institutions'>;
  name: string;
  shortCode: string;
  type: string;
  status: string;
  planCode: string | null;
  subscriptionStatus: string | null;
  featureCount: number;
}

interface PlanRow {
  _id: Id<'plans'>;
  planCode: string;
  name: string;
}

const INSTITUTION_TYPES = ['lender', 'bank', 'fintech', 'mno', 'regulator'];

const ProvisionDialog: React.FC<{ plans: PlanRow[]; onDone: () => void }> = ({ plans, onDone }) => {
  const provision = useMutation(api.platform.tenants.provisionTenant);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [type, setType] = useState('lender');
  const [planCode, setPlanCode] = useState('');
  const [trialDays, setTrialDays] = useState('');

  const submit = async () => {
    setBusy(true);
    try {
      await provision({
        name: name.trim(),
        shortCode: shortCode.trim().toUpperCase(),
        type: type as 'lender' | 'bank' | 'fintech' | 'mno' | 'regulator',
        planCode: planCode || undefined,
        trialDays: trialDays ? Number(trialDays) : undefined,
      });
      toast({ title: 'Tenant provisioned', description: `${name} (${shortCode}) created.` });
      setOpen(false);
      setName('');
      setShortCode('');
      setPlanCode('');
      setTrialDays('');
      onDone();
    } catch (err) {
      toast({
        title: 'Provisioning failed',
        description: handleMutationError(err, 'Could not provision the tenant.'),
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        data-testid="platform-tenants-provision"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Plus className="h-4 w-4" /> Provision tenant
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Provision tenant</DialogTitle>
            <DialogDescription>
              Creates the institution shell and an optional initial subscription. The tenant's first
              admin user is assigned separately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="t-name">Name</Label>
              <Input
                id="t-name"
                data-testid="tenant-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="t-code">Short code</Label>
              <Input
                id="t-code"
                data-testid="tenant-code-input"
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value)}
                placeholder="ACME"
              />
            </div>
            <div>
              <Label htmlFor="t-type">Type</Label>
              <select
                id="t-type"
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {INSTITUTION_TYPES.map((tp) => (
                  <option key={tp} value={tp}>
                    {tp}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="t-plan">Plan (optional)</Label>
              <select
                id="t-plan"
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={planCode}
                onChange={(e) => setPlanCode(e.target.value)}
              >
                <option value="">— none —</option>
                {plans.map((p) => (
                  <option key={p._id} value={p.planCode}>
                    {p.name} ({p.planCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="t-trial">Trial days (optional)</Label>
              <Input
                id="t-trial"
                type="number"
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
                placeholder="e.g. 30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              data-testid="tenant-submit"
              onClick={submit}
              disabled={busy || !name.trim() || !shortCode.trim()}
            >
              {busy ? 'Provisioning…' : 'Provision'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const AssignPlanDialog: React.FC<{ tenant: TenantRow; plans: PlanRow[]; onDone: () => void }> = ({
  tenant,
  plans,
  onDone,
}) => {
  const setSubscription = useMutation(api.platform.tenants.setTenantSubscription);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [planCode, setPlanCode] = useState(tenant.planCode ?? '');
  const [status, setStatus] = useState<'trial' | 'active'>('active');
  const [trialDays, setTrialDays] = useState('');
  const [reason, setReason] = useState('');

  const submit = async () => {
    setBusy(true);
    try {
      await setSubscription({
        institutionId: tenant._id,
        planCode,
        status,
        trialDays: status === 'trial' && trialDays ? Number(trialDays) : undefined,
        reason: reason.trim() || undefined,
      });
      toast({ title: 'Plan assigned', description: `${tenant.name} → ${planCode} (${status}).` });
      setOpen(false);
      onDone();
    } catch (err) {
      toast({
        title: 'Assignment failed',
        description: handleMutationError(err, 'Could not assign the plan.'),
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Assign plan
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign plan — {tenant.name}</DialogTitle>
            <DialogDescription>
              Closes the current subscription and opens a new one (temporal, non-destructive).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="a-plan">Plan</Label>
              <select
                id="a-plan"
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={planCode}
                onChange={(e) => setPlanCode(e.target.value)}
              >
                <option value="">— select —</option>
                {plans.map((p) => (
                  <option key={p._id} value={p.planCode}>
                    {p.name} ({p.planCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="a-status">Status</Label>
              <select
                id="a-status"
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'trial' | 'active')}
              >
                <option value="active">active</option>
                <option value="trial">trial</option>
              </select>
            </div>
            {status === 'trial' && (
              <div>
                <Label htmlFor="a-trial">Trial days</Label>
                <Input
                  id="a-trial"
                  type="number"
                  value={trialDays}
                  onChange={(e) => setTrialDays(e.target.value)}
                  placeholder="e.g. 30"
                />
              </div>
            )}
            <div>
              <Label htmlFor="a-reason">Reason (optional)</Label>
              <Input id="a-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy || !planCode}>
              {busy ? 'Saving…' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const TenantsView: React.FC = () => {
  const { isPlatformOwner } = useAuth();
  const tenants = useQuery(api.platform.tenants.listTenants, {}) as TenantRow[] | undefined;
  const plans = (useQuery(api.platform.plans.listPlans, {}) ?? []) as PlanRow[];
  // Re-render trigger after a mutation (Convex queries are reactive, so this is just for focus reset).
  const [, force] = useState(0);
  const onDone = () => force((n) => n + 1);

  return (
    <div data-testid="platform-tenants" className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Tenants</h2>
          <p className="text-sm text-muted-foreground">
            Institutions on the platform, their plan, and resolved feature count.
          </p>
        </div>
        {isPlatformOwner && plans !== undefined && (
          <ProvisionDialog plans={plans} onDone={onDone} />
        )}
      </div>

      {tenants === undefined ? (
        <div className="text-sm text-muted-foreground">Loading tenants…</div>
      ) : tenants.length === 0 ? (
        <ThemedCard>
          <p className="text-sm text-muted-foreground">
            No tenants yet — provision one, or run the control-plane seed.
          </p>
        </ThemedCard>
      ) : (
        <ThemedCard className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Tenant</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Plan</th>
                <th className="py-2 pr-4">Subscription</th>
                <th className="py-2 pr-4">Features</th>
                <th className="py-2 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t: TenantRow) => (
                <tr
                  key={t._id}
                  data-testid={`platform-tenant-row-${t.shortCode}`}
                  className="border-t"
                >
                  <td className="py-2 pr-4">
                    <div className="font-medium">{t.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{t.shortCode}</div>
                  </td>
                  <td className="py-2 pr-4">{t.type}</td>
                  <td className="py-2 pr-4">
                    {t.planCode ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="py-2 pr-4">
                    {t.subscriptionStatus ? (
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs',
                          t.subscriptionStatus === 'active'
                            ? 'bg-emerald-500/15 text-emerald-600'
                            : 'bg-amber-500/15 text-amber-600'
                        )}
                      >
                        {t.subscriptionStatus}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">none</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">{t.featureCount}</td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/platform/entitlements?tenant=${t._id}`}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors hover:bg-muted/50"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" /> Entitlements
                      </Link>
                      {isPlatformOwner && (
                        <AssignPlanDialog tenant={t} plans={plans} onDone={onDone} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ThemedCard>
      )}

      {!isPlatformOwner && (
        <p className="text-xs text-muted-foreground">
          Read-only — provisioning and plan assignment require platform owner privileges.
        </p>
      )}
    </div>
  );
};

export default TenantsView;
