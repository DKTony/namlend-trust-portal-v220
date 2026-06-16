/**
 * Tenant-scoped configuration APIs.
 *
 * This keeps tenant policy out of global `systemConfiguration`. Platform infrastructure
 * remains platform-owned; tenant credit policy lives in `institutionConfig` and is
 * validated against non-negotiable platform guardrails before it is persisted.
 */

import { GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import { ConvexError } from 'convex/values';
import { DataModel, Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { scheduleAuditLog } from './lib/audit';
import { assertAdmin } from './lib/auth';
import {
  CREDIT_POLICY_KEY,
  CreditPolicy,
  creditPolicyValidator,
  DEFAULT_CREDIT_POLICY,
  getCurrentCreditPolicyConfig,
  validateCreditPolicy,
} from './lib/creditPolicy';
import { assertCallerFeatureEnabled } from './lib/entitlements';
import { getCallerInstitution, isTenancyEnforced, resolveWriteInstitution } from './lib/tenancy';

type AnyCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

async function soleTenant(ctx: AnyCtx): Promise<Id<'institutions'> | null> {
  const institutions = await ctx.db.query('institutions').collect();
  const lenders = institutions.filter((i) => i.type === 'lender');
  if (lenders.length === 1) return lenders[0]._id;
  if (institutions.length === 1) return institutions[0]._id;
  return null;
}

async function resolveReadInstitution(ctx: AnyCtx): Promise<Id<'institutions'> | null> {
  const caller = await getCallerInstitution(ctx);
  if (caller.institutionId) return caller.institutionId;
  if (!(await isTenancyEnforced(ctx))) return soleTenant(ctx);
  return null;
}

export const getMyCreditPolicy = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx);
    const institutionId = await resolveReadInstitution(ctx);
    if (!institutionId) {
      return { policy: DEFAULT_CREDIT_POLICY, source: 'default' as const, institutionId: null };
    }

    const current = await getCurrentCreditPolicyConfig(ctx, institutionId);
    return {
      policy: (current?.value as CreditPolicy | undefined) ?? DEFAULT_CREDIT_POLICY,
      source: current ? ('tenant' as const) : ('default' as const),
      institutionId,
      version: current?.version,
    };
  },
});

export const setMyCreditPolicy = mutation({
  args: { policy: creditPolicyValidator },
  handler: async (ctx, { policy }) => {
    const adminId = await assertAdmin(ctx);
    await assertCallerFeatureEnabled(ctx, 'creditPolicy');
    validateCreditPolicy(policy);

    const institutionId = await resolveWriteInstitution(ctx);
    if (!institutionId) {
      throw new ConvexError({
        code: 'TENANT_CONTEXT_REQUIRED',
        message: 'Cannot resolve tenant for credit policy.',
      });
    }

    const now = Date.now();
    const current = await getCurrentCreditPolicyConfig(ctx, institutionId);
    const nextVersion = current ? current.version + 1 : 1;

    if (current) {
      await ctx.db.patch(current._id, { effectiveTo: now });
    }

    const configId = await ctx.db.insert('institutionConfig', {
      institutionId,
      key: CREDIT_POLICY_KEY,
      value: policy,
      effectiveFrom: now,
      version: nextVersion,
      updatedBy: adminId,
      createdAt: now,
    });

    scheduleAuditLog(
      ctx,
      'institutionConfig',
      configId,
      'SET_CREDIT_POLICY',
      current ? JSON.stringify(current.value) : 'none',
      JSON.stringify(policy),
      `Credit policy v${nextVersion}`
    );

    return configId;
  },
});
