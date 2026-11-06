/**
 * Loan agreements — generation, preparation, issue, acceptance and archive.
 *
 *   approve loan ──► draft ──finalize──► ready ──send──► sent ──open──► viewed
 *                     ▲                                      │              │
 *                     └──────── revise (new version) ◄───────┴──── accept ──┴──► accepted ──► archived
 *
 * Every public function guards explicitly (there is no RLS): staff functions are
 * tenant-scoped, client functions are owner-only, settings and template functions are
 * admin-only. Every state change writes the audit log and the event journal.
 *
 * Design: docs/LOAN_AGREEMENT.md. Field mapping: lib/agreement/merge.ts.
 */

import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { internalMutation, internalQuery, mutation, query } from './_generated/server';
import {
  configurationIssues,
  driftedFields,
  fieldMap,
  isIsoDate,
  namibianDate,
  REQUIRED_LENDER_FIELDS,
  unresolvedDraftingNotes,
  type ReadinessIssue,
} from './lib/agreement/merge';
import {
  activeTemplate,
  buildLive,
  createDraftAgreement,
  currentAgreement,
  findSettings,
  listTemplates,
  pricingForInstitution,
  profileForUser,
} from './lib/agreement/service';
import { OG_STANDARD_TERMS_V1, SOURCE_COMPANY_DETAILS } from './lib/agreement/standardTerms';
import {
  CLIENT_VISIBLE_STATUSES,
  lenderDetails,
  type AgreementSnapshot,
} from './lib/agreement/types';
import {
  CORRECTABLE_PROFILE_FIELDS,
  idLast4,
  normaliseName,
  validateProfileValue,
  type CorrectableProfileField,
} from './lib/agreement/validation';
import { auditAgreement } from './lib/agreement/audit';
import {
  assertAdmin,
  assertOwnerOrTenantStaff,
  assertStaff,
  assertTenantAdmin,
  assertTenantStaff,
} from './lib/auth';
import { createDocumentGrant } from './lib/documentGrants';
import { getEffectiveCreditPolicy } from './lib/creditPolicy';
import { emitDomainEvent } from './lib/domainEvents';
import { assertSameTenant, getCallerInstitution, tenantReadScope } from './lib/tenancy';

type Ctx = Parameters<typeof assertStaff>[0];

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

async function loadLoan(ctx: Ctx, loanId: Id<'loans'>): Promise<Doc<'loans'>> {
  const loan = await ctx.db.get(loanId);
  if (!loan) throw new ConvexError({ code: 'NOT_FOUND', message: 'Loan not found.' });
  return loan;
}

async function loadAgreement(ctx: Ctx, agreementId: Id<'loanAgreements'>) {
  const agreement = await ctx.db.get(agreementId);
  if (!agreement) throw new ConvexError({ code: 'NOT_FOUND', message: 'Agreement not found.' });
  return agreement;
}

/** Staff of the loan's own tenant. Being authenticated, or staff elsewhere, is not enough. */
async function assertStaffForLoan(ctx: Ctx, loan: Doc<'loans'>): Promise<Id<'users'>> {
  const staffId = loan.institutionId
    ? await assertTenantStaff(ctx, loan.institutionId)
    : await assertStaff(ctx);
  assertSameTenant(await tenantReadScope(ctx), loan.institutionId);
  return staffId;
}

/** Admin of the caller's own institution, for settings and templates. */
async function adminScope(ctx: Ctx) {
  const { institutionId } = await getCallerInstitution(ctx);
  const adminId = institutionId
    ? await assertTenantAdmin(ctx, institutionId)
    : await assertAdmin(ctx);
  return { adminId, institutionId: institutionId ?? undefined };
}

async function staffScope(ctx: Ctx) {
  const { institutionId } = await getCallerInstitution(ctx);
  const staffId = institutionId
    ? await assertTenantStaff(ctx, institutionId)
    : await assertStaff(ctx);
  return { staffId, institutionId: institutionId ?? undefined };
}

function fail(code: string, message: string): never {
  throw new ConvexError({ code, message });
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function termsChanged(loan: Doc<'loans'>, snapshot: AgreementSnapshot): boolean {
  const t = snapshot.loanTerms;
  return (
    t.principal !== loan.principal ||
    t.interestRate !== loan.interestRate ||
    t.termMonths !== loan.termMonths
  );
}

const blocking = (issues: ReadinessIssue[]) => issues.filter((i) => i.blocking);

// ---------------------------------------------------------------------------
// Staff: workspace and register
// ---------------------------------------------------------------------------

/**
 * Everything the contract-preparation screen needs for one loan: the current agreement,
 * its version history, the merged view (live for drafts, frozen once finalized) and the
 * readiness issues that gate finalization.
 */
export const getWorkspace = query({
  args: { loanId: v.id('loans') },
  handler: async (ctx, { loanId }) => {
    const loan = await loadLoan(ctx, loanId);
    await assertStaffForLoan(ctx, loan);

    const agreement = await currentAgreement(ctx, loanId);
    const history = (
      await ctx.db
        .query('loanAgreements')
        .withIndex('by_loanId', (q) => q.eq('loanId', loanId))
        .collect()
    )
      .sort((a, b) => b.version - a.version)
      .map((a) => ({
        _id: a._id,
        version: a.version,
        status: a.status,
        agreementNumber: a.agreementNumber,
        createdAt: a.createdAt,
        finalizedAt: a.finalizedAt,
        sentAt: a.sentAt,
        acceptedAt: a.acceptance?.acceptedAt,
        cancelReason: a.cancelReason,
      }));

    const profile = await profileForUser(ctx, loan.userId);
    const loanSummary = {
      _id: loan._id,
      loanNumber: loan.loanNumber ?? null,
      status: loan.status,
      principal: loan.principal,
      interestRate: loan.interestRate,
      termMonths: loan.termMonths,
      applicantName: profile?.fullName ?? null,
    };
    if (!agreement)
      return {
        loan: loanSummary,
        agreement: null,
        history,
        view: null,
        template: null,
        drift: [],
        borrowerSource: null,
      };

    const today = namibianDate(Date.now());
    if (agreement.status === 'draft') {
      const { built, template } = await buildLive(ctx, loan, agreement, today);
      return {
        loan: loanSummary,
        agreement,
        history,
        view: built,
        template: template && {
          _id: template._id,
          version: template.version,
          status: template.status,
          content: template.content,
        },
        drift: [],
        // The profile columns behind each borrower field, for the correction form.
        borrowerSource: Object.fromEntries(
          CORRECTABLE_PROFILE_FIELDS.map((f) => [f, (profile?.[f] as string | undefined) ?? null])
        ) as Record<CorrectableProfileField, string | null>,
      };
    }

    // Finalized: show exactly what was frozen, and say whether the sources have moved.
    const template = agreement.templateId ? await ctx.db.get(agreement.templateId) : null;
    const frozen = agreement.snapshot!;
    const { built: live } = await buildLive(ctx, loan, agreement, today, template);
    const settled = ['superseded', 'cancelled', 'archived'].includes(agreement.status);
    return {
      loan: loanSummary,
      agreement,
      history,
      view: { ...frozen, issues: [] as ReadinessIssue[] },
      template: template && {
        _id: template._id,
        version: template.version,
        status: template.status,
        content: template.content,
      },
      drift: settled
        ? []
        : [
            ...driftedFields(frozen, live),
            ...(termsChanged(loan, frozen) ? ['Approved loan terms'] : []),
          ],
      borrowerSource: null,
    };
  },
});

/** Approved-loans register with each loan's agreement status ("pending contract" if none). */
export const listRegister = query({
  args: {},
  handler: async (ctx) => {
    await staffScope(ctx);
    const scope = await tenantReadScope(ctx);
    const rows = [];
    for (const status of ['approved', 'funded', 'active'] as const) {
      const loans = await ctx.db
        .query('loans')
        .withIndex('by_status', (q) => q.eq('status', status))
        .order('desc')
        .take(200);
      for (const loan of loans) {
        if (scope && loan.institutionId !== undefined && loan.institutionId !== scope) continue;
        const [agreement, profile] = await Promise.all([
          currentAgreement(ctx, loan._id),
          profileForUser(ctx, loan.userId),
        ]);
        rows.push({
          loanId: loan._id,
          loanNumber: loan.loanNumber ?? null,
          loanStatus: loan.status,
          applicantName: profile?.fullName ?? null,
          principal: loan.principal,
          agreementId: agreement?._id ?? null,
          agreementStatus: agreement?.status ?? 'pending_contract',
          agreementNumber: agreement?.agreementNumber ?? null,
          updatedAt: agreement?.updatedAt ?? loan.updatedAt,
        });
      }
    }
    return rows.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

// ---------------------------------------------------------------------------
// Staff: preparation
// ---------------------------------------------------------------------------

/** Generate the agreement for an approved loan that has none (e.g. approved before this feature). */
export const generateForLoan = mutation({
  args: { loanId: v.id('loans') },
  handler: async (ctx, { loanId }) => {
    const loan = await loadLoan(ctx, loanId);
    const staffId = await assertStaffForLoan(ctx, loan);
    if (loan.status !== 'approved') {
      fail(
        'INVALID_STATE',
        `Agreements are generated for approved loans. This loan is '${loan.status}'.`
      );
    }
    return createDraftAgreement(ctx, { loan, actorUserId: staffId });
  },
});

const borrowerValues = v.object(
  Object.fromEntries(CORRECTABLE_PROFILE_FIELDS.map((f) => [f, v.optional(v.string())])) as Record<
    CorrectableProfileField,
    ReturnType<typeof v.optional<ReturnType<typeof v.string>>>
  >
);

/**
 * Complete or correct the borrower's details from the agreement workspace. Written to
 * the PROFILE — the source record — so there is exactly one copy of each fact and the
 * draft reflects it immediately. Only while the agreement is still a draft: a
 * finalized agreement is changed by revising it.
 */
export const updateBorrowerDetails = mutation({
  args: { loanId: v.id('loans'), values: borrowerValues },
  handler: async (ctx, { loanId, values }) => {
    const loan = await loadLoan(ctx, loanId);
    const staffId = await assertStaffForLoan(ctx, loan);
    const agreement = await currentAgreement(ctx, loanId);
    if (!agreement || agreement.status !== 'draft') {
      fail(
        'INVALID_STATE',
        'Borrower details can be corrected here only while the agreement is a draft.'
      );
    }
    const profile = await profileForUser(ctx, loan.userId);
    if (!profile) fail('NOT_FOUND', 'Borrower profile not found.');

    const patch: Partial<Record<CorrectableProfileField, string | undefined>> = {};
    const errors: Record<string, string> = {};
    for (const field of CORRECTABLE_PROFILE_FIELDS) {
      const raw = values[field];
      if (raw === undefined) continue;
      if (
        field === 'idNumber' &&
        profile.idNumber?.trim() &&
        profile.idNumber.trim() !== raw.trim()
      ) {
        // Identity evidence tied to KYC: fill when missing, never overwrite from here.
        errors[field] = 'An ID number is already on file; change it through KYC review.';
        continue;
      }
      const error = validateProfileValue(field, raw);
      if (error) errors[field] = error;
      else patch[field] = raw.trim() || undefined;
    }
    if (Object.keys(errors).length) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'Some values are invalid.',
        fields: errors,
      });
    }
    const changed = Object.keys(patch);
    if (!changed.length) return { changed };

    const nameUpdate =
      !profile.fullName?.trim() &&
      (patch.firstNames ?? profile.firstNames) &&
      (patch.surname ?? profile.surname)
        ? {
            fullName: `${patch.firstNames ?? profile.firstNames} ${patch.surname ?? profile.surname}`,
          }
        : {};
    await ctx.db.patch(profile._id, { ...patch, ...nameUpdate, updatedAt: Date.now() });

    // Field NAMES only — the audit trail records who corrected what, not the PII itself.
    auditAgreement(
      ctx,
      staffId,
      'profile',
      profile._id,
      'AGREEMENT_CORRECTION',
      'incomplete',
      'updated',
      `Loan ${loan.loanNumber ?? loanId}: ${changed.join(', ')}`
    );
    emitDomainEvent(
      ctx,
      'user.profile_updated',
      'profiles',
      profile._id,
      { userId: loan.userId, fields: changed, via: 'loan_agreement', loanId },
      { actorId: staffId, actorType: 'user' }
    );
    return { changed };
  },
});

/** Save contract-specific fields on a draft ("Save Draft"). */
export const saveDraft = mutation({
  args: {
    agreementId: v.id('loanAgreements'),
    firstRepaymentDate: v.optional(v.string()),
    placeOfSigning: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agreement = await loadAgreement(ctx, args.agreementId);
    const loan = await loadLoan(ctx, agreement.loanId);
    const staffId = await assertStaffForLoan(ctx, loan);
    if (agreement.status !== 'draft') fail('INVALID_STATE', 'Only a draft can be edited.');

    const patch: Partial<Doc<'loanAgreements'>> = {};
    if (args.firstRepaymentDate !== undefined) {
      if (!isIsoDate(args.firstRepaymentDate))
        fail('VALIDATION_ERROR', 'First repayment date must be a valid date.');
      if (args.firstRepaymentDate <= namibianDate(Date.now())) {
        fail('VALIDATION_ERROR', 'The first repayment date must be in the future.');
      }
      patch.firstRepaymentDate = args.firstRepaymentDate;
    }
    if (args.placeOfSigning !== undefined) {
      const place = args.placeOfSigning.trim();
      if (place.length > 80)
        fail('VALIDATION_ERROR', 'Place of signing must be 80 characters or fewer.');
      patch.placeOfSigning = place || undefined;
    }
    await ctx.db.patch(agreement._id, { ...patch, updatedAt: Date.now() });
    auditAgreement(
      ctx,
      staffId,
      'loanAgreement',
      agreement._id,
      'SAVE_DRAFT',
      'draft',
      'draft',
      Object.keys(patch).join(', ')
    );
    emitDomainEvent(
      ctx,
      'loan.agreement.draft_saved',
      'loanAgreements',
      agreement._id,
      { fields: Object.keys(patch) },
      { actorId: staffId, actorType: 'user' }
    );
  },
});

/**
 * Validate and lock the agreement. The merged view is frozen into `snapshot`, the
 * template version is pinned, and a PDF is rendered and hashed. From here the content
 * cannot change; a correction means a new version.
 */
export const finalize = mutation({
  args: { agreementId: v.id('loanAgreements') },
  handler: async (ctx, { agreementId }) => {
    const agreement = await loadAgreement(ctx, agreementId);
    const loan = await loadLoan(ctx, agreement.loanId);
    const staffId = await assertStaffForLoan(ctx, loan);
    if (agreement.status !== 'draft')
      fail('INVALID_STATE', `Only a draft can be finalized (this one is '${agreement.status}').`);
    if (loan.status !== 'approved')
      fail(
        'INVALID_STATE',
        `The loan must be approved to finalize its agreement (it is '${loan.status}').`
      );

    const now = Date.now();
    const { built, template } = await buildLive(ctx, loan, agreement, namibianDate(now));
    const blockers = blocking(built.issues);
    if (blockers.length || !template) {
      throw new ConvexError({
        code: 'NOT_READY',
        message: `The agreement cannot be finalized: ${blockers.length} issue(s) remain.`,
        issues: blockers.map((i) => i.message),
      });
    }
    const { issues: _issues, ...snapshot } = built;
    await ctx.db.patch(agreementId, {
      status: 'ready',
      snapshot,
      templateId: template._id,
      templateVersion: template.version,
      pdfStatus: 'pending',
      finalizedBy: staffId,
      finalizedAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.actions.loanAgreementPdf.render, {
      agreementId,
      kind: 'issued',
    });

    auditAgreement(
      ctx,
      staffId,
      'loanAgreement',
      agreementId,
      'FINALIZE',
      'draft',
      'ready',
      `Loan ${loan.loanNumber}, terms v${template.version}`
    );
    emitDomainEvent(
      ctx,
      'loan.agreement.finalized',
      'loanAgreements',
      agreementId,
      { loanId: loan._id, templateVersion: template.version },
      { actorId: staffId, actorType: 'user' }
    );
  },
});

/** Issue the finalized agreement to the borrower and notify them. */
export const send = mutation({
  args: { agreementId: v.id('loanAgreements') },
  handler: async (ctx, { agreementId }) => {
    const agreement = await loadAgreement(ctx, agreementId);
    const loan = await loadLoan(ctx, agreement.loanId);
    const staffId = await assertStaffForLoan(ctx, loan);
    if (agreement.status !== 'ready')
      fail(
        'INVALID_STATE',
        `Only a finalized agreement can be sent (this one is '${agreement.status}').`
      );
    if (agreement.pdfStatus !== 'ready')
      fail('NOT_READY', 'The agreement PDF is still being prepared. Try again in a moment.');
    if (loan.status !== 'approved')
      fail('INVALID_STATE', `The loan is '${loan.status}', so its agreement cannot be issued.`);
    if (termsChanged(loan, agreement.snapshot!))
      fail(
        'TERMS_CHANGED',
        'The approved loan terms changed after finalization. Create a revised version.'
      );

    const now = Date.now();
    await ctx.db.patch(agreementId, {
      status: 'sent',
      sentBy: staffId,
      sentAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
      userId: agreement.userId,
      title: 'Your loan agreement is ready',
      message: `Agreement ${agreement.agreementNumber} for loan ${loan.loanNumber} is ready for you to review and accept.`,
      category: 'loan',
      priority: 'high',
      actionUrl: `/loans/${loan._id}/agreement`,
      actionLabel: 'Review agreement',
      dedupeKey: `agreement:${agreementId}:sent`,
      entityType: 'loanAgreements',
      entityId: agreementId,
      metadata: { loanId: loan._id, agreementId },
    });
    auditAgreement(
      ctx,
      staffId,
      'loanAgreement',
      agreementId,
      'SEND',
      'ready',
      'sent',
      `Loan ${loan.loanNumber}`
    );
    emitDomainEvent(
      ctx,
      'loan.agreement.sent',
      'loanAgreements',
      agreementId,
      { loanId: loan._id, channel: 'in_app_notification' },
      { actorId: staffId, actorType: 'user' }
    );
  },
});

/**
 * Replace the current agreement with a new draft version — used when legally relevant
 * information changed after finalization. The old version is kept, marked superseded.
 */
export const revise = mutation({
  args: { agreementId: v.id('loanAgreements'), reason: v.string() },
  handler: async (ctx, { agreementId, reason }) => {
    const agreement = await loadAgreement(ctx, agreementId);
    const loan = await loadLoan(ctx, agreement.loanId);
    const staffId = await assertStaffForLoan(ctx, loan);
    if (!agreement.isCurrent || ['draft', 'superseded', 'cancelled'].includes(agreement.status)) {
      fail(
        'INVALID_STATE',
        'Only the current finalized agreement can be revised. Edit a draft directly.'
      );
    }
    if (loan.status !== 'approved')
      fail('INVALID_STATE', `The loan is '${loan.status}'; it can no longer be revised.`);
    if (!reason.trim()) fail('VALIDATION_ERROR', 'Give a reason for the revision.');

    const now = Date.now();
    await ctx.db.patch(agreementId, { status: 'superseded', supersededAt: now, updatedAt: now });
    const nextId = await createDraftAgreement(ctx, { loan, actorUserId: staffId });
    await ctx.db.patch(agreementId, { supersededBy: nextId });
    auditAgreement(
      ctx,
      staffId,
      'loanAgreement',
      agreementId,
      'SUPERSEDE',
      agreement.status,
      'superseded',
      reason.trim()
    );
    emitDomainEvent(
      ctx,
      'loan.agreement.superseded',
      'loanAgreements',
      agreementId,
      { loanId: loan._id, supersededBy: nextId, reason: reason.trim() },
      { actorId: staffId, actorType: 'user' }
    );
    return nextId;
  },
});

/** Withdraw an agreement that has not been accepted. */
export const cancel = mutation({
  args: { agreementId: v.id('loanAgreements'), reason: v.string() },
  handler: async (ctx, { agreementId, reason }) => {
    const agreement = await loadAgreement(ctx, agreementId);
    const loan = await loadLoan(ctx, agreement.loanId);
    const staffId = await assertStaffForLoan(ctx, loan);
    if (['accepted', 'archived', 'superseded', 'cancelled'].includes(agreement.status)) {
      fail('INVALID_STATE', `An agreement that is '${agreement.status}' cannot be cancelled.`);
    }
    if (!reason.trim()) fail('VALIDATION_ERROR', 'Give a reason for cancelling.');
    const now = Date.now();
    await ctx.db.patch(agreementId, {
      status: 'cancelled',
      cancelledBy: staffId,
      cancelledAt: now,
      cancelReason: reason.trim(),
      updatedAt: now,
    });
    auditAgreement(
      ctx,
      staffId,
      'loanAgreement',
      agreementId,
      'CANCEL',
      agreement.status,
      'cancelled',
      reason.trim()
    );
    emitDomainEvent(
      ctx,
      'loan.agreement.cancelled',
      'loanAgreements',
      agreementId,
      { loanId: loan._id, reason: reason.trim() },
      { actorId: staffId, actorType: 'user' }
    );
  },
});

// ---------------------------------------------------------------------------
// Documents (staff or the borrower)
// ---------------------------------------------------------------------------

/**
 * Short-lived, single-purpose URL for the agreement PDF. Never a permanent storage URL:
 * the document carries ID and banking details. Each request is audited with its purpose
 * (view / print / download), and each actual fetch is audited by the grant endpoint.
 */
export const requestDocument = mutation({
  args: {
    agreementId: v.id('loanAgreements'),
    purpose: v.union(v.literal('view'), v.literal('print'), v.literal('download')),
    copy: v.optional(v.union(v.literal('issued'), v.literal('executed'))),
  },
  handler: async (ctx, { agreementId, purpose, copy = 'issued' }) => {
    const agreement = await loadAgreement(ctx, agreementId);
    const loan = await loadLoan(ctx, agreement.loanId);
    const actorId = await assertOwnerOrTenantStaff(ctx, agreement.userId, loan.institutionId);
    assertSameTenant(await tenantReadScope(ctx), loan.institutionId);
    const isOwner = actorId === agreement.userId;
    if (isOwner && !CLIENT_VISIBLE_STATUSES.includes(agreement.status)) {
      fail('NOT_FOUND', 'Agreement not found.');
    }
    const storageId = copy === 'executed' ? agreement.executedPdfStorageId : agreement.pdfStorageId;
    if (!storageId)
      fail(
        'NOT_READY',
        copy === 'executed'
          ? 'The signed copy is not available yet.'
          : 'The agreement PDF is not available yet.'
      );

    const url = await createDocumentGrant(ctx, {
      storageId,
      sourceTable: 'loanAgreements',
      documentId: agreementId,
      actorId,
      intent: purpose === 'download' ? 'download' : 'preview',
      fileName: `${agreement.agreementNumber}${copy === 'executed' ? '-signed' : ''}.pdf`,
      mimeType: 'application/pdf',
    });
    auditAgreement(
      ctx,
      actorId,
      'loanAgreement',
      agreementId,
      `DOCUMENT_${purpose.toUpperCase()}`,
      agreement.status,
      agreement.status,
      `${isOwner ? 'borrower' : 'staff'}, ${copy} copy`
    );
    return url;
  },
});

// ---------------------------------------------------------------------------
// Borrower
// ---------------------------------------------------------------------------

/** The borrower's agreement for a loan — only once it has been issued to them. */
export const getMyAgreement = query({
  args: { loanId: v.id('loans') },
  handler: async (ctx, { loanId }) => {
    const loan = await ctx.db.get(loanId);
    if (!loan) return null;
    const callerId = await assertOwnerOrTenantStaff(ctx, loan.userId, loan.institutionId);
    if (callerId !== loan.userId) return null; // staff use getWorkspace
    const agreements = await ctx.db
      .query('loanAgreements')
      .withIndex('by_loanId', (q) => q.eq('loanId', loanId))
      .collect();
    // The current visible one, or the latest archived (an executed contract stays visible).
    const visible = agreements
      .filter((a) => CLIENT_VISIBLE_STATUSES.includes(a.status))
      .sort((a, b) => b.version - a.version)[0];
    if (!visible?.snapshot) return null;
    const template = visible.templateId ? await ctx.db.get(visible.templateId) : null;
    return {
      _id: visible._id,
      agreementNumber: visible.agreementNumber,
      status: visible.status,
      version: visible.version,
      sentAt: visible.sentAt,
      viewedAt: visible.viewedAt,
      snapshot: visible.snapshot,
      template: template ? { version: template.version, content: template.content } : null,
      hasIssuedPdf: Boolean(visible.pdfStorageId),
      hasExecutedPdf: Boolean(visible.executedPdfStorageId),
      acceptance: visible.acceptance
        ? {
            acceptedAt: visible.acceptance.acceptedAt,
            typedName: visible.acceptance.typedName,
            placeOfSigning: visible.acceptance.placeOfSigning,
          }
        : null,
      canAccept: ['sent', 'viewed'].includes(visible.status) && loan.status === 'approved',
    };
  },
});

/** First time the borrower opens the agreement. Idempotent. */
export const markViewed = mutation({
  args: { agreementId: v.id('loanAgreements') },
  handler: async (ctx, { agreementId }) => {
    const agreement = await loadAgreement(ctx, agreementId);
    const loan = await loadLoan(ctx, agreement.loanId);
    const callerId = await assertOwnerOrTenantStaff(ctx, agreement.userId, loan.institutionId);
    if (callerId !== agreement.userId || agreement.status !== 'sent') return;
    const now = Date.now();
    await ctx.db.patch(agreementId, { status: 'viewed', viewedAt: now, updatedAt: now });
    auditAgreement(
      ctx,
      callerId,
      'loanAgreement',
      agreementId,
      'VIEW',
      'sent',
      'viewed',
      `Loan ${loan.loanNumber}`
    );
    emitDomainEvent(
      ctx,
      'loan.agreement.viewed',
      'loanAgreements',
      agreementId,
      { loanId: loan._id },
      { actorId: callerId, actorType: 'user' }
    );
  },
});

/**
 * The borrower accepts the agreement. Binding evidence recorded:
 *   - the exact acceptance statement shown (also as a POPIA consent record);
 *   - their typed full name, matched against the agreement;
 *   - the last four characters of their ID, matched against the agreement;
 *   - where they are signing;
 *   - the SHA-256 of the exact PDF they were shown.
 * Executed copy rendering follows, after which the agreement is archived.
 */
export const accept = mutation({
  args: {
    agreementId: v.id('loanAgreements'),
    typedName: v.string(),
    idNumberLast4: v.string(),
    placeOfSigning: v.string(),
    agreed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const agreement = await loadAgreement(ctx, args.agreementId);
    const loan = await loadLoan(ctx, agreement.loanId);
    const callerId = await assertOwnerOrTenantStaff(ctx, agreement.userId, loan.institutionId);
    if (callerId !== agreement.userId)
      fail('FORBIDDEN', 'Only the borrower can accept this agreement.');
    if (!['sent', 'viewed'].includes(agreement.status))
      fail('INVALID_STATE', `This agreement cannot be accepted (it is '${agreement.status}').`);
    if (loan.status !== 'approved')
      fail('INVALID_STATE', 'This loan is no longer awaiting acceptance.');
    if (!agreement.snapshot || !agreement.pdfSha256)
      fail('NOT_READY', 'The agreement is not ready to accept.');
    if (termsChanged(loan, agreement.snapshot))
      fail(
        'TERMS_CHANGED',
        'The loan terms changed after this agreement was issued. A revised agreement will be sent to you.'
      );
    if (!args.agreed)
      fail('VALIDATION_ERROR', 'Confirm that you have read and accept the agreement.');

    const fields = fieldMap(agreement.snapshot.fields);
    const errors: Record<string, string> = {};
    if (normaliseName(args.typedName) !== normaliseName(fields.fullName ?? '')) {
      errors.typedName = 'Type your full name exactly as it appears on the agreement.';
    }
    if (
      idLast4(args.idNumberLast4) !== idLast4(fields.idNumber ?? '') ||
      args.idNumberLast4.trim().length !== 4
    ) {
      errors.idNumberLast4 =
        'The last four characters do not match the ID number on the agreement.';
    }
    const place = args.placeOfSigning.trim();
    if (place.length < 2 || place.length > 80)
      errors.placeOfSigning = 'Enter the town or city where you are signing.';
    if (Object.keys(errors).length) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'Please check the highlighted fields.',
        fields: errors,
      });
    }

    const template = agreement.templateId ? await ctx.db.get(agreement.templateId) : null;
    const statement = [
      template?.content.scheduleAcceptance ?? '',
      `Agreement ${agreement.agreementNumber}, document SHA-256 ${agreement.pdfSha256}.`,
    ]
      .join(' ')
      .trim();
    const now = Date.now();
    const consentRecordId = await ctx.db.insert('consentRecords', {
      institutionId: loan.institutionId,
      userId: callerId,
      consentType: 'loan_agreement',
      status: 'granted',
      entityType: 'loanAgreements',
      entityId: agreement._id,
      grantedAt: now,
      description: statement,
      collectionMethod: 'digital_acceptance',
      metadata: { agreementNumber: agreement.agreementNumber, documentSha256: agreement.pdfSha256 },
      createdAt: now,
    });
    await ctx.db.patch(agreement._id, {
      status: 'accepted',
      placeOfSigning: place,
      acceptance: {
        userId: callerId,
        acceptedAt: now,
        typedName: args.typedName.trim(),
        idNumberLast4: idLast4(args.idNumberLast4),
        placeOfSigning: place,
        statement,
        documentSha256: agreement.pdfSha256,
        consentRecordId,
      },
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.actions.loanAgreementPdf.render, {
      agreementId: agreement._id,
      kind: 'executed',
    });
    await ctx.scheduler.runAfter(0, internal.notifications.createStaffNotifications, {
      institutionId: loan.institutionId,
      title: 'Loan agreement accepted',
      message: `The borrower accepted agreement ${agreement.agreementNumber} for loan ${loan.loanNumber}.`,
      category: 'loan',
      priority: 'normal',
      actionUrl: `/admin/loans/${loan._id}/agreement`,
      actionLabel: 'View agreement',
      dedupeKey: `agreement:${agreement._id}:accepted:staff`,
      entityType: 'loanAgreements',
      entityId: agreement._id,
      metadata: { loanId: loan._id },
    });
    auditAgreement(
      ctx,
      callerId,
      'loanAgreement',
      agreement._id,
      'ACCEPT',
      agreement.status,
      'accepted',
      `Loan ${loan.loanNumber}, document ${agreement.pdfSha256}`
    );
    emitDomainEvent(
      ctx,
      'loan.agreement.accepted',
      'loanAgreements',
      agreement._id,
      { loanId: loan._id, documentSha256: agreement.pdfSha256, consentRecordId },
      { actorId: callerId, actorType: 'user' }
    );
  },
});

// ---------------------------------------------------------------------------
// Admin: settings and Standard Terms
// ---------------------------------------------------------------------------

export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const { institutionId } = await adminScope(ctx);
    const [settings, templates, active, pricing, policy] = await Promise.all([
      findSettings(ctx, institutionId),
      listTemplates(ctx, institutionId),
      activeTemplate(ctx, institutionId),
      pricingForInstitution(ctx, institutionId),
      getEffectiveCreditPolicy(ctx, institutionId),
    ]);
    const institution = institutionId ? await ctx.db.get(institutionId) : null;
    const missingLender = REQUIRED_LENDER_FIELDS.filter((f) => !settings?.lender[f]?.trim());
    return {
      settings,
      institutionName: institution?.legalName ?? institution?.name ?? null,
      sourceDefaults: SOURCE_COMPANY_DETAILS,
      templates: templates.map((t) => ({
        _id: t._id,
        version: t.version,
        status: t.status,
        source: t.source,
        changeSummary: t.changeSummary,
        createdAt: t.createdAt,
        approvedAt: t.approvedAt,
        unresolvedNotes: unresolvedDraftingNotes(t.content),
        content: t.content,
      })),
      issues: configurationIssues(settings, active, pricing),
      // Read-only here: fees are configured once, in Credit Policy.
      creditPolicyFees: {
        originationFeePercent: policy.originationFeePercent,
        latePaymentFeePercent: policy.latePaymentFeePercent,
      },
      missingLender,
      missingRepresentative:
        !settings?.representativeName?.trim() || !settings?.representativeDesignation?.trim(),
    };
  },
});

export const saveSettings = mutation({
  args: {
    lender: lenderDetails,
    representativeName: v.optional(v.string()),
    representativeDesignation: v.optional(v.string()),
    defaultRepaymentMethod: v.optional(v.string()),
    requireAcceptedAgreementForDisbursement: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { adminId, institutionId } = await adminScope(ctx);
    const trim = (s?: string) => s?.trim() || undefined;
    const lender = Object.fromEntries(
      Object.entries(args.lender).map(([k, val]) => [k, trim(val)])
    );
    const now = Date.now();
    const existing = await findSettings(ctx, institutionId);
    const values = {
      lender,
      representativeName: trim(args.representativeName),
      representativeDesignation: trim(args.representativeDesignation),
      defaultRepaymentMethod: trim(args.defaultRepaymentMethod),
      requireAcceptedAgreementForDisbursement: args.requireAcceptedAgreementForDisbursement,
      // Any change must be re-approved before it can reach a customer contract.
      approvedBy: undefined,
      approvedAt: undefined,
      updatedBy: adminId,
      updatedAt: now,
    };
    const id = existing
      ? (await ctx.db.patch(existing._id, values), existing._id)
      : await ctx.db.insert('agreementSettings', { ...values, institutionId, createdAt: now });
    auditAgreement(
      ctx,
      adminId,
      'agreementSettings',
      id,
      'UPDATE',
      existing ? 'configured' : 'none',
      'pending_approval'
    );
    emitDomainEvent(
      ctx,
      'loan.agreement.settings_updated',
      'agreementSettings',
      id,
      { requireAcceptedAgreementForDisbursement: args.requireAcceptedAgreementForDisbursement },
      { actorId: adminId, actorType: 'user' }
    );
    return id;
  },
});

export const approveSettings = mutation({
  args: {},
  handler: async (ctx) => {
    const { adminId, institutionId } = await adminScope(ctx);
    const settings = await findSettings(ctx, institutionId);
    if (!settings) fail('NOT_FOUND', 'Save the agreement settings first.');
    const missing = REQUIRED_LENDER_FIELDS.filter((f) => !settings.lender[f]?.trim());
    if (!settings.representativeName?.trim()) missing.push('representativeName' as never);
    if (!settings.representativeDesignation?.trim())
      missing.push('representativeDesignation' as never);
    if (missing.length) {
      throw new ConvexError({
        code: 'NOT_READY',
        message: 'Complete the required company details before approving.',
        fields: missing,
      });
    }
    if (settings.lender.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.lender.email)) {
      fail('VALIDATION_ERROR', 'The company email address is not valid.');
    }
    const now = Date.now();
    await ctx.db.patch(settings._id, { approvedBy: adminId, approvedAt: now, updatedAt: now });
    auditAgreement(
      ctx,
      adminId,
      'agreementSettings',
      settings._id,
      'APPROVE',
      'pending_approval',
      'approved'
    );
    emitDomainEvent(
      ctx,
      'loan.agreement.settings_approved',
      'agreementSettings',
      settings._id,
      {},
      { actorId: adminId, actorType: 'user' }
    );
  },
});

/** Load the supplied source document's Standard Terms as version 1 (unapproved). */
export const importSourceTemplate = mutation({
  args: {},
  handler: async (ctx) => {
    const { adminId, institutionId } = await adminScope(ctx);
    if ((await listTemplates(ctx, institutionId)).length)
      fail('ALREADY_EXISTS', 'Standard Terms are already loaded for this institution.');
    const now = Date.now();
    const id = await ctx.db.insert('agreementTemplates', {
      institutionId,
      version: 1,
      status: 'draft',
      content: OG_STANDARD_TERMS_V1,
      contentSha256: await sha256Hex(JSON.stringify(OG_STANDARD_TERMS_V1)),
      source: 'source_document',
      changeSummary: 'Verbatim import of the supplied source document.',
      createdBy: adminId,
      createdAt: now,
    });
    auditAgreement(
      ctx,
      adminId,
      'agreementTemplate',
      id,
      'IMPORT',
      'none',
      'draft',
      'v1 from source document'
    );
    emitDomainEvent(
      ctx,
      'loan.agreement.template_imported',
      'agreementTemplates',
      id,
      { version: 1 },
      { actorId: adminId, actorType: 'user' }
    );
    return id;
  },
});

/**
 * Create a new template version with revised wording for whole clauses — the way a
 * drafting note is replaced with final, approved wording. Only clauses that are a single
 * paragraph can be revised here; the earlier version is never modified.
 */
export const reviseTemplate = mutation({
  args: {
    fromTemplateId: v.id('agreementTemplates'),
    clauses: v.array(v.object({ number: v.number(), text: v.string() })),
    changeSummary: v.string(),
  },
  handler: async (ctx, args) => {
    const { adminId, institutionId } = await adminScope(ctx);
    const base = await ctx.db.get(args.fromTemplateId);
    if (!base || base.institutionId !== institutionId) fail('NOT_FOUND', 'Template not found.');
    if (!args.changeSummary.trim()) fail('VALIDATION_ERROR', 'Describe what changed.');
    if (!args.clauses.length) fail('VALIDATION_ERROR', 'Revise at least one clause.');

    const edits = new Map(args.clauses.map((c) => [c.number, c.text.trim()]));
    const content = {
      ...base.content,
      clauses: base.content.clauses.map((clause) => {
        const text = edits.get(clause.number);
        if (text === undefined) return clause;
        if (clause.blocks.length !== 1 || clause.blocks[0].type !== 'paragraph') {
          fail(
            'VALIDATION_ERROR',
            `Clause ${clause.number} is not a single paragraph and cannot be revised here.`
          );
        }
        if (!text || text.length > 4000)
          fail('VALIDATION_ERROR', `Clause ${clause.number} must be 1–4000 characters.`);
        return { ...clause, blocks: [{ type: 'paragraph' as const, text }] };
      }),
    };
    for (const n of edits.keys()) {
      if (!base.content.clauses.some((c) => c.number === n))
        fail('VALIDATION_ERROR', `There is no clause ${n}.`);
    }
    const version = (await listTemplates(ctx, institutionId))[0].version + 1;
    const now = Date.now();
    const id = await ctx.db.insert('agreementTemplates', {
      institutionId,
      version,
      status: 'draft',
      content,
      contentSha256: await sha256Hex(JSON.stringify(content)),
      source: 'revision',
      basedOnVersion: base.version,
      changeSummary: args.changeSummary.trim(),
      createdBy: adminId,
      createdAt: now,
    });
    auditAgreement(
      ctx,
      adminId,
      'agreementTemplate',
      id,
      'REVISE',
      `v${base.version}`,
      `v${version} draft`,
      `Clauses ${[...edits.keys()].join(', ')}: ${args.changeSummary.trim()}`
    );
    emitDomainEvent(
      ctx,
      'loan.agreement.template_revised',
      'agreementTemplates',
      id,
      { version, basedOnVersion: base.version, clauses: [...edits.keys()] },
      { actorId: adminId, actorType: 'user' }
    );
    return id;
  },
});

/** Approve a template version for customer issue. Blocked while drafting notes remain. */
export const approveTemplate = mutation({
  args: { templateId: v.id('agreementTemplates') },
  handler: async (ctx, { templateId }) => {
    const { adminId, institutionId } = await adminScope(ctx);
    const template = await ctx.db.get(templateId);
    if (!template || template.institutionId !== institutionId)
      fail('NOT_FOUND', 'Template not found.');
    if (template.status !== 'draft')
      fail('INVALID_STATE', `Version ${template.version} is already ${template.status}.`);
    const notes = unresolvedDraftingNotes(template.content);
    if (notes.length) {
      throw new ConvexError({
        code: 'NOT_READY',
        message: `Version ${template.version} still contains ${notes.length} drafting note(s) in clause(s) ${notes.map((n) => n.clause).join(', ')}. Revise them with final wording first.`,
      });
    }
    const now = Date.now();
    for (const other of await listTemplates(ctx, institutionId)) {
      if (other.status === 'approved') {
        await ctx.db.patch(other._id, { status: 'retired', retiredAt: now });
        auditAgreement(
          ctx,
          adminId,
          'agreementTemplate',
          other._id,
          'RETIRE',
          'approved',
          'retired',
          `Replaced by v${template.version}`
        );
      }
    }
    await ctx.db.patch(templateId, { status: 'approved', approvedBy: adminId, approvedAt: now });
    auditAgreement(
      ctx,
      adminId,
      'agreementTemplate',
      templateId,
      'APPROVE',
      'draft',
      'approved',
      `v${template.version}`
    );
    emitDomainEvent(
      ctx,
      'loan.agreement.template_approved',
      'agreementTemplates',
      templateId,
      { version: template.version },
      { actorId: adminId, actorType: 'user' }
    );
  },
});

// ---------------------------------------------------------------------------
// Internal: PDF rendering callbacks (convex/actions/loanAgreementPdf.ts)
// ---------------------------------------------------------------------------

export const getRenderInput = internalQuery({
  args: { agreementId: v.id('loanAgreements') },
  handler: async (ctx, { agreementId }) => {
    const agreement = await ctx.db.get(agreementId);
    if (!agreement?.snapshot || !agreement.templateId) return null;
    const template = await ctx.db.get(agreement.templateId);
    if (!template) return null;
    return {
      agreementNumber: agreement.agreementNumber,
      version: agreement.version,
      status: agreement.status,
      finalizedAt: agreement.finalizedAt ?? agreement.createdAt,
      snapshot: agreement.snapshot,
      template: template.content,
      templateVersion: template.version,
      issuedSha256: agreement.pdfSha256 ?? null,
      acceptance: agreement.acceptance ?? null,
    };
  },
});

export const recordRendered = internalMutation({
  args: {
    agreementId: v.id('loanAgreements'),
    kind: v.union(v.literal('issued'), v.literal('executed')),
    storageId: v.id('_storage'),
    sha256: v.string(),
  },
  handler: async (ctx, { agreementId, kind, storageId, sha256 }) => {
    const agreement = await ctx.db.get(agreementId);
    if (!agreement) return;
    const now = Date.now();
    if (kind === 'issued') {
      // Idempotent against a retried render: the first hash is the one that counts,
      // because it may already have been shown to the borrower.
      if (agreement.pdfStorageId) return;
      await ctx.db.patch(agreementId, {
        pdfStatus: 'ready',
        pdfStorageId: storageId,
        pdfSha256: sha256,
        pdfError: undefined,
        updatedAt: now,
      });
      auditAgreement(
        ctx,
        undefined,
        'loanAgreement',
        agreementId,
        'RENDER',
        agreement.status,
        agreement.status,
        `issued copy ${sha256}`
      );
      return;
    }
    if (agreement.executedPdfStorageId || agreement.status !== 'accepted') return;
    await ctx.db.patch(agreementId, {
      executedPdfStorageId: storageId,
      executedPdfSha256: sha256,
      status: 'archived',
      archivedAt: now,
      updatedAt: now,
    });
    auditAgreement(
      ctx,
      undefined,
      'loanAgreement',
      agreementId,
      'ARCHIVE',
      'accepted',
      'archived',
      `executed copy ${sha256}`
    );
    emitDomainEvent(
      ctx,
      'loan.agreement.archived',
      'loanAgreements',
      agreementId,
      { loanId: agreement.loanId, executedSha256: sha256 },
      { actorType: 'system' }
    );
  },
});

export const recordRenderFailed = internalMutation({
  args: {
    agreementId: v.id('loanAgreements'),
    kind: v.union(v.literal('issued'), v.literal('executed')),
    error: v.string(),
  },
  handler: async (ctx, { agreementId, kind, error }) => {
    const agreement = await ctx.db.get(agreementId);
    if (!agreement) return;
    if (kind === 'issued')
      await ctx.db.patch(agreementId, {
        pdfStatus: 'failed',
        pdfError: error.slice(0, 500),
        updatedAt: Date.now(),
      });
    await ctx.db.insert('loanProcessingFailures', {
      loanId: agreement.loanId,
      stage: 'agreementGeneration',
      status: 'open',
      attemptCount: 1,
      lastErrorCode: `PDF_${kind.toUpperCase()}`,
      lastErrorMessage: error.slice(0, 500),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    auditAgreement(
      ctx,
      undefined,
      'loanAgreement',
      agreementId,
      'RENDER_FAILED',
      agreement.status,
      agreement.status,
      `${kind}: ${error.slice(0, 200)}`
    );
  },
});

/** Staff: retry a failed PDF render. */
export const retryRender = mutation({
  args: { agreementId: v.id('loanAgreements') },
  handler: async (ctx, { agreementId }) => {
    const agreement = await loadAgreement(ctx, agreementId);
    const loan = await loadLoan(ctx, agreement.loanId);
    await assertStaffForLoan(ctx, loan);
    if (agreement.status === 'ready' && agreement.pdfStatus === 'failed') {
      await ctx.db.patch(agreementId, { pdfStatus: 'pending', updatedAt: Date.now() });
      await ctx.scheduler.runAfter(0, internal.actions.loanAgreementPdf.render, {
        agreementId,
        kind: 'issued',
      });
    } else if (agreement.status === 'accepted' && !agreement.executedPdfStorageId) {
      await ctx.scheduler.runAfter(0, internal.actions.loanAgreementPdf.render, {
        agreementId,
        kind: 'executed',
      });
    } else {
      fail('INVALID_STATE', 'There is nothing to retry for this agreement.');
    }
  },
});
