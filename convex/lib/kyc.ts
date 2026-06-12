import { GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import { ConvexError } from 'convex/values';
import { DataModel, Id } from '../_generated/dataModel';

type AnyCtx = GenericMutationCtx<DataModel> | GenericQueryCtx<DataModel>;

export async function assertKycVerifiedForUser(ctx: AnyCtx, userId: Id<'users'>, action: string) {
  const profile = await ctx.db
    .query('profiles')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .first();

  if (!profile || profile.kycStatus !== 'verified') {
    throw new ConvexError({
      code: 'KYC_REQUIRED',
      message: `Verified KYC is required to ${action}.`,
    });
  }

  return profile;
}
