/**
 * Loan agreement — database-level helpers shared by the approval path, the
 * disbursement gate, payment-schedule generation and `convex/loanAgreements.ts`.
 */

import { GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import { ConvexError } from 'convex/values';
import { DataModel, Doc, Id } from '../../_generated/dataModel';
import { auditAgreement } from './audit';
import { emitDomainEvent } from '../domainEvents';
import type { PricingRule } from '../agreementPricing';
import { getEffectiveCreditPolicy } from '../creditPolicy';
import { allocateLoanNumber, ensureClientNumber } from '../referenceNumbers';
import { emitRelationship } from '../relationshipEmitter';
import { addMonthsClamped, buildAgreement, namibianDate, type BuiltAgreement } from './merge';

type MutCtx = GenericMutationCtx<DataModel>;
type AnyCtx = GenericQueryCtx<DataModel> | MutCtx;

/** Statuses after which an agreement can no longer change or be issued. */
export const TERMINAL_AGREEMENT_STATUSES = ['superseded', 'cancelled'] as const;

export async function findSettings(
  ctx: AnyCtx,
  institutionId: Id<'institutions'> | undefined
): Promise<Doc<'agreementSettings'> | null> {
  return ctx.db
    .query('agreementSettings')
    .withIndex('by_institution', (q) => q.eq('institutionId', institutionId))
    .first();
}

/** All template versions for an institution, newest first. */
export async function listTemplates(
  ctx: AnyCtx,
  institutionId: Id<'institutions'> | undefined
): Promise<Doc<'agreementTemplates'>[]> {
  const rows = await ctx.db
    .query('agreementTemplates')
    .withIndex('by_institution_version', (q) => q.eq('institutionId', institutionId))
    .collect();
  return rows.sort((a, b) => b.version - a.version);
}

/**
 * The template a NEW draft is generated against: the approved version if there is
 * one, otherwise the newest draft (so the preview still shows the terms, with a
 * "not approved" readiness issue). Retired versions are never used for new drafts.
 */
export async function activeTemplate(
  ctx: AnyCtx,
  institutionId: Id<'institutions'> | undefined
): Promise<Doc<'agreementTemplates'> | null> {
  const all = await listTemplates(ctx, institutionId);
  return all.find((t) => t.status === 'approved') ?? all.find((t) => t.status === 'draft') ?? null;
}

export async function currentAgreement(
  ctx: AnyCtx,
  loanId: Id<'loans'>
): Promise<Doc<'loanAgreements'> | null> {
  return ctx.db
    .query('loanAgreements')
    .withIndex('by_loanId_current', (q) => q.eq('loanId', loanId).eq('isCurrent', true))
    .first();
}

export async function productNameForLoan(ctx: AnyCtx, loan: Doc<'loans'>): Promise<string | null> {
  if (!loan.productVersionId) return null;
  const version = await ctx.db.get(loan.productVersionId);
  const product = version ? await ctx.db.get(version.productId) : null;
  return product?.name ?? null;
}

/** Agreement pricing, read from the institution's Credit Policy. */
export async function pricingForInstitution(
  ctx: AnyCtx,
  institutionId: Id<'institutions'> | undefined
): Promise<PricingRule> {
  const policy = await getEffectiveCreditPolicy(ctx, institutionId);
  return { initiationFeePercent: policy.originationFeePercent };
}

export async function profileForUser(
  ctx: AnyCtx,
  userId: Id<'users'>
): Promise<Doc<'profiles'> | null> {
  return ctx.db
    .query('profiles')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .first();
}

/**
 * Build an agreement from the CURRENT source records. Used for drafts (which track
 * their sources live) and to detect drift on finalized agreements.
 */
export async function buildLive(
  ctx: AnyCtx,
  loan: Doc<'loans'>,
  agreement: Pick<
    Doc<'loanAgreements'>,
    'firstRepaymentDate' | 'placeOfSigning' | 'templateId'
  > | null,
  agreementDate: string,
  templateOverride?: Doc<'agreementTemplates'> | null
): Promise<{ built: BuiltAgreement; template: Doc<'agreementTemplates'> | null }> {
  const template =
    templateOverride !== undefined
      ? templateOverride
      : await activeTemplate(ctx, loan.institutionId);
  const [profile, settings, productName, pricing] = await Promise.all([
    profileForUser(ctx, loan.userId),
    findSettings(ctx, loan.institutionId),
    productNameForLoan(ctx, loan),
    pricingForInstitution(ctx, loan.institutionId),
  ]);
  const built = buildAgreement({
    loan,
    profile,
    settings,
    template,
    pricing,
    productName,
    firstRepaymentDate: agreement?.firstRepaymentDate,
    placeOfSigning: agreement?.placeOfSigning,
    agreementDate,
  });
  return { built, template };
}

/**
 * Create the draft agreement for an approved loan — called from `approveLoanCore`, so
 * approval and contract preparation happen in one transaction.
 *
 * Deliberately tolerant: missing configuration or borrower data never fails an
 * approval. It produces a draft whose readiness issues say what is missing, and
 * finalization stays blocked until they are resolved. Idempotent: a loan with an open
 * agreement keeps it.
 */
export async function createDraftAgreement(
  ctx: MutCtx,
  opts: { loan: Doc<'loans'>; actorUserId: Id<'users'> }
): Promise<Id<'loanAgreements'>> {
  const existing = await currentAgreement(ctx, opts.loan._id);
  if (existing && !(TERMINAL_AGREEMENT_STATUSES as readonly string[]).includes(existing.status)) {
    return existing._id;
  }

  const now = Date.now();
  // A cancelled/superseded version stays on record but stops being current, so a
  // loan never has two current agreements.
  if (existing) await ctx.db.patch(existing._id, { isCurrent: false, updatedAt: now });

  let loanNumber = opts.loan.loanNumber;
  if (!loanNumber) {
    // Loans created before reference numbers existed get one now: the agreement
    // prints it as "Loan reference" and it must never change afterwards.
    loanNumber = await allocateLoanNumber(ctx, opts.loan.institutionId);
    await ctx.db.patch(opts.loan._id, { loanNumber, updatedAt: now });
  }
  const profile = await profileForUser(ctx, opts.loan.userId);
  if (profile) await ensureClientNumber(ctx, profile);

  const previous = await ctx.db
    .query('loanAgreements')
    .withIndex('by_loanId', (q) => q.eq('loanId', opts.loan._id))
    .collect();
  const version = previous.reduce((max, a) => Math.max(max, a.version), 0) + 1;

  const agreementId = await ctx.db.insert('loanAgreements', {
    institutionId: opts.loan.institutionId,
    loanId: opts.loan._id,
    userId: opts.loan.userId,
    version,
    isCurrent: true,
    status: 'draft',
    agreementNumber: `${loanNumber}-AG${version}`,
    // Default: one month after preparation. Staff confirm or change it before
    // finalizing; the schedule is anchored to it.
    firstRepaymentDate: addMonthsClamped(namibianDate(now), 1),
    generatedBy: opts.actorUserId,
    createdAt: now,
    updatedAt: now,
  });

  auditAgreement(
    ctx,
    opts.actorUserId,
    'loanAgreement',
    agreementId,
    'GENERATE',
    'none',
    'draft',
    `Loan ${loanNumber}, version ${version}`
  );
  emitDomainEvent(
    ctx,
    'loan.agreement.generated',
    'loanAgreements',
    agreementId,
    { loanId: opts.loan._id, loanNumber, version },
    { actorId: opts.actorUserId, actorType: 'user' }
  );
  emitRelationship(
    ctx,
    { type: 'loans', id: opts.loan._id },
    { type: 'loanAgreements', id: agreementId },
    'has_agreement'
  );
  return agreementId;
}

/**
 * Withdraw any open agreement when its loan is rejected after approval, so a borrower
 * can never accept a contract for a loan that no longer exists.
 */
export async function cancelOpenAgreements(
  ctx: MutCtx,
  loanId: Id<'loans'>,
  actorUserId: Id<'users'> | undefined,
  reason: string
): Promise<void> {
  const current = await currentAgreement(ctx, loanId);
  if (!current || ['superseded', 'cancelled', 'accepted', 'archived'].includes(current.status))
    return;
  const now = Date.now();
  await ctx.db.patch(current._id, {
    status: 'cancelled',
    cancelledBy: actorUserId,
    cancelledAt: now,
    cancelReason: reason,
    updatedAt: now,
  });
  auditAgreement(
    ctx,
    actorUserId,
    'loanAgreement',
    current._id,
    'CANCEL',
    current.status,
    'cancelled',
    reason
  );
  emitDomainEvent(
    ctx,
    'loan.agreement.cancelled',
    'loanAgreements',
    current._id,
    { loanId, reason },
    actorUserId ? { actorId: actorUserId, actorType: 'user' } : { actorType: 'system' }
  );
}

/**
 * Disbursement control. Enforced only when the institution's approved settings say
 * so — the business decides whether a signed agreement must precede disbursement.
 */
export async function assertAgreementAcceptedIfRequired(
  ctx: AnyCtx,
  loan: Doc<'loans'>
): Promise<void> {
  const settings = await findSettings(ctx, loan.institutionId);
  if (!settings?.requireAcceptedAgreementForDisbursement) return;
  const agreement = await currentAgreement(ctx, loan._id);
  if (!agreement || !['accepted', 'archived'].includes(agreement.status)) {
    throw new ConvexError({
      code: 'AGREEMENT_NOT_ACCEPTED',
      message: 'This loan cannot be disbursed until the borrower has accepted the loan agreement.',
    });
  }
}

/** The repayment schedule the borrower accepted, if any — used at disbursement. */
export async function acceptedSchedule(ctx: AnyCtx, loanId: Id<'loans'>) {
  const agreement = await currentAgreement(ctx, loanId);
  if (!agreement?.snapshot || !['accepted', 'archived'].includes(agreement.status)) return null;
  return agreement.snapshot.schedule;
}
