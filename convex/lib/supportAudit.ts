/**
 * Support-access enforcement helpers.
 *
 * Platform support can see L0 platform health by default, but tenant-specific safe metadata
 * requires an active L1 support session. Platform owners bypass this support-session gate.
 */

import { GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import { ConvexError } from 'convex/values';
import { DataModel, Id } from '../_generated/dataModel';
import { assertPlatformSupport, getPlatformRole } from './platformAuth';

type AnyCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

export type SafeSupportResourceCategory =
  | 'platform_health'
  | 'tenant_metadata'
  | 'rollout_status'
  | 'error_counts'
  | 'subscription_status'
  | 'tenant_entitlements'
  | 'resolved_entitlements';

export async function assertTenantSupportReadAccess(
  ctx: AnyCtx,
  institutionId: Id<'institutions'>,
  _resourceCategory: SafeSupportResourceCategory
): Promise<Id<'users'>> {
  const actorUserId = await assertPlatformSupport(ctx);
  const role = await getPlatformRole(ctx, actorUserId);
  if (role === 'platform_owner') return actorUserId;

  const sessions = await ctx.db
    .query('supportAccessAudit')
    .withIndex('by_actor', (q) => q.eq('actorUserId', actorUserId))
    .collect();
  const activeL1 = sessions.find(
    (session) =>
      session.accessType === 'L1' &&
      session.institutionId === institutionId &&
      session.endedAt === undefined
  );

  if (!activeL1) {
    throw new ConvexError({
      code: 'SUPPORT_SESSION_REQUIRED',
      message: 'Tenant-specific support reads require an active L1 support session.',
    });
  }

  return actorUserId;
}
