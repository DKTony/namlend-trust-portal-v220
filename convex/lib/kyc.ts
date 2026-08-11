import { GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import { ConvexError } from 'convex/values';
import { DataModel, Id } from '../_generated/dataModel';
import { getKycReadiness } from './kycReadiness';

type AnyCtx = GenericMutationCtx<DataModel> | GenericQueryCtx<DataModel>;

export async function assertKycVerifiedForUser(ctx: AnyCtx, userId: Id<'users'>, action: string) {
  const readiness = await getKycReadiness(ctx, userId);

  if (!readiness.profile || !readiness.eligible) {
    throw new ConvexError({
      code: 'KYC_REQUIRED',
      message: `Verified KYC is required to ${action}.`,
    });
  }

  return readiness.profile;
}
