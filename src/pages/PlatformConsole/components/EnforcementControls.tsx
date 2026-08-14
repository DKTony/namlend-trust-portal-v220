import { ThemedCard } from '@/components/ui/ThemedCard';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/integrations/convex/api';
import { handleMutationError } from '@/lib/mutationError';
import { useMutation, useQuery } from 'convex/react';
import React, { useState } from 'react';

/**
 * Owner-only kill-switch controls for TENANCY_ENFORCEMENT and ENTITLEMENT_ENFORCEMENT.
 * Enable-entitlements stays blocked until readiness is green and tenancy is on.
 */
const EnforcementControls: React.FC = () => {
  const { isPlatformOwner } = useAuth();
  const { toast } = useToast();
  const readiness = useQuery(api.platform.readiness.getEnforcementReadiness, {});
  const setEntitlementEnforcement = useMutation(
    api.platform.entitlements.setEntitlementEnforcement
  );
  const updateRule = useMutation(api.ontology.businessRules.updateRule);
  const createRule = useMutation(api.ontology.businessRules.createRule);

  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<'tenancy' | 'entitlements' | null>(null);

  if (!isPlatformOwner) return null;

  const tenancyOn = readiness?.flags.tenancyEnforced === true;
  const entitlementsOn = readiness?.flags.entitlementEnforced === true;
  const canEnableEntitlements = readiness?.readyForEntitlements === true && tenancyOn;
  const reasonReady = reason.trim().length > 0;

  const upsertTenancy = async (enabled: boolean) => {
    try {
      await updateRule({
        ruleCode: 'TENANCY_ENFORCEMENT',
        value: String(enabled),
        description: reason.trim(),
      });
    } catch (err) {
      const message = handleMutationError(err, '');
      if (!/No active rule found/i.test(message)) throw err;
      await createRule({
        ruleCode: 'TENANCY_ENFORCEMENT',
        category: 'platform',
        displayName: 'Tenancy Enforcement',
        description: reason.trim(),
        valueType: 'boolean',
        value: String(enabled),
      });
    }
  };

  const onToggleTenancy = async (enabled: boolean) => {
    if (!reasonReady) {
      toast({
        title: 'Reason required',
        description: 'Record why tenancy enforcement is changing.',
        variant: 'destructive',
      });
      return;
    }
    setBusy('tenancy');
    try {
      await upsertTenancy(enabled);
      toast({
        title: enabled ? 'Tenancy enforcement on' : 'Tenancy enforcement off',
        description: 'Tenant isolation uses this kill-switch. Existing sessions stay signed in.',
      });
      setReason('');
    } catch (err) {
      toast({
        title: 'Could not update tenancy enforcement',
        description: handleMutationError(err, 'Could not update tenancy enforcement.'),
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  const onToggleEntitlements = async (enabled: boolean) => {
    if (!reasonReady) {
      toast({
        title: 'Reason required',
        description: 'Record why entitlement enforcement is changing.',
        variant: 'destructive',
      });
      return;
    }
    setBusy('entitlements');
    try {
      await setEntitlementEnforcement({ enabled, reason: reason.trim() });
      toast({
        title: enabled ? 'Entitlement enforcement on' : 'Entitlement enforcement off',
        description: enabled
          ? 'Tenants now see only entitled features.'
          : 'Feature gates are inert until this is turned back on.',
      });
      setReason('');
    } catch (err) {
      toast({
        title: 'Could not update entitlement enforcement',
        description: handleMutationError(err, 'Could not update entitlement enforcement.'),
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <ThemedCard className="space-y-4" data-testid="platform-enforcement-controls">
      <div>
        <h3 className="text-sm font-semibold">Enforcement kill-switches</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          These flags stay off until go-live. Enabling entitlements requires tenancy on and a green
          readiness check. A reason is audited with every change.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <div className="rounded-md border px-3 py-2">
          <p className="text-muted-foreground">Tenancy</p>
          <p className="mt-1 font-medium">
            {readiness === undefined ? 'Checking…' : tenancyOn ? 'On' : 'Off (inert)'}
          </p>
        </div>
        <div className="rounded-md border px-3 py-2">
          <p className="text-muted-foreground">Entitlements</p>
          <p className="mt-1 font-medium">
            {readiness === undefined ? 'Checking…' : entitlementsOn ? 'On' : 'Off (inert)'}
          </p>
        </div>
      </div>

      {readiness && readiness.blockers.length > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <p className="text-xs font-medium text-amber-800">Activation blockers</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-amber-800">
            {readiness.blockers.map((blocker: string) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="enforcement-reason">Reason</Label>
        <Textarea
          id="enforcement-reason"
          data-testid="enforcement-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Why this flag is changing (required)"
          rows={2}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant="outline"
          disabled={busy !== null || !reasonReady || readiness === undefined}
          onClick={() => void onToggleTenancy(!tenancyOn)}
          data-testid="tenancy-enforcement-toggle"
        >
          {busy === 'tenancy' ? 'Saving…' : tenancyOn ? 'Turn tenancy off' : 'Turn tenancy on'}
        </Button>
        <Button
          disabled={
            busy !== null ||
            !reasonReady ||
            readiness === undefined ||
            (!entitlementsOn && !canEnableEntitlements)
          }
          onClick={() => void onToggleEntitlements(!entitlementsOn)}
          data-testid="entitlement-enforcement-toggle"
          title={
            !entitlementsOn && !canEnableEntitlements
              ? 'Resolve readiness blockers and enable tenancy first'
              : undefined
          }
        >
          {busy === 'entitlements'
            ? 'Saving…'
            : entitlementsOn
              ? 'Turn entitlements off'
              : 'Turn entitlements on'}
        </Button>
      </div>
      {!entitlementsOn && !canEnableEntitlements && readiness !== undefined && (
        <p className="text-xs text-muted-foreground">
          Entitlement enforcement cannot turn on until tenancy is active and every readiness blocker
          is cleared.
        </p>
      )}
    </ThemedCard>
  );
};

export default EnforcementControls;
