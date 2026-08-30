/**
 * KYC document workflow.
 *
 * Uploads are versioned and retained. A client explicitly submits the current
 * package, staff decide each submitted document, and a separate completion step
 * is the only operation that changes the profile to verified or rejected.
 */

import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { internalMutation, mutation, query } from './_generated/server';
import { scheduleAuditEntry, scheduleAuditLog } from './lib/audit';
import { assertAuthenticated, assertOwnerOrTenantStaff, assertStaff } from './lib/auth';
import { createDocumentGrant } from './lib/documentGrants';
import { assertCallerClientFeatureEnabled } from './lib/entitlements';
import {
  OPTIONAL_KYC_DOCUMENT_TYPES,
  REQUIRED_KYC_DOCUMENT_TYPES,
  isKycUploadLocked,
  kycDocumentTypeValidator,
  shouldReopenKycOnUpload,
  validateOriginalFileName,
  validateStoredDocument,
} from './lib/documentPolicy';
import { getKycReadiness, selectCurrentKycDocuments } from './lib/kycReadiness';
import { resolveWriteInstitution, tenantReadScope } from './lib/tenancy';

function legacyFileName(document: Doc<'kycDocuments'>): string {
  const label = document.documentType.replace(/_/g, ' ');
  return document.fileName?.trim() || `${label} document`;
}

async function presentDocument(ctx: any, document: Doc<'kycDocuments'>) {
  const storageMetadata = document.fileStorageId
    ? await ctx.db.system.get('_storage', document.fileStorageId)
    : null;
  return {
    id: document._id,
    documentType: document.documentType,
    fileName: legacyFileName(document),
    fileSize: document.fileSize ?? storageMetadata?.size,
    mimeType: document.mimeType ?? storageMetadata?.contentType,
    version: document.version ?? 1,
    isCurrent: document.isCurrent !== false && !document.supersededAt,
    fileAvailable: Boolean(document.fileStorageId && storageMetadata),
    status: document.status,
    submittedAt: document.submittedAt,
    reviewedAt: document.reviewedAt,
    reviewNotes: document.reviewNotes,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

async function findOpenKycRequest(ctx: any, profileId: Id<'profiles'>) {
  const requests = await ctx.db
    .query('approvalRequests')
    .withIndex('by_entityId', (q: any) => q.eq('entityId', String(profileId)))
    .order('desc')
    .collect();
  return requests.find(
    (request: Doc<'approvalRequests'>) =>
      request.entityType === 'kyc' &&
      (request.status === 'pending' || request.status === 'escalated')
  );
}

async function buildOverview(ctx: any, userId: Id<'users'>) {
  const readiness = await getKycReadiness(ctx, userId);
  const currentIds = new Set(readiness.currentDocuments.map((document) => document._id));
  const currentDocuments = await Promise.all(
    readiness.currentDocuments.map((doc) => presentDocument(ctx, doc))
  );
  const history = await Promise.all(
    readiness.documents
      .filter((document) => !currentIds.has(document._id))
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((doc) => presentDocument(ctx, doc))
  );
  // One scan serves both: which request is open, and whether any KYC request ever existed.
  const kycRequests: Doc<'approvalRequests'>[] = readiness.profile
    ? (
        await ctx.db
          .query('approvalRequests')
          .withIndex('by_entityId', (q: any) => q.eq('entityId', String(readiness.profile!._id)))
          .order('desc')
          .collect()
      ).filter((request: Doc<'approvalRequests'>) => request.entityType === 'kyc')
    : [];
  const openRequest = kycRequests.find(
    (request) => request.status === 'pending' || request.status === 'escalated'
  );
  const hasPriorSubmission = kycRequests.length > 0;

  return {
    status: readiness.status,
    eligible: readiness.eligible,
    canSubmit: readiness.canSubmit,
    requiredDocumentTypes: [...REQUIRED_KYC_DOCUMENT_TYPES],
    optionalDocumentTypes: [...OPTIONAL_KYC_DOCUMENT_TYPES],
    missingRequiredDocumentTypes: readiness.missingRequiredDocumentTypes,
    approvedRequiredDocumentTypes: readiness.approvedRequiredDocumentTypes,
    rejectedRequiredDocumentTypes: readiness.rejectedRequiredDocumentTypes,
    documents: currentDocuments,
    history,
    openRequestId: openRequest?._id,
    isResubmission: hasPriorSubmission,
    allSubmittedDocumentsDecided: readiness.allSubmittedDocumentsDecided,
  };
}

export const getMyKycOverview = query({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    return buildOverview(ctx, userId);
  },
});

export const getUserKycOverview = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();
    await assertOwnerOrTenantStaff(ctx, userId, profile?.institutionId);
    return buildOverview(ctx, userId);
  },
});

/**
 * Staff view of KYC rows whose stored blob is missing (legacy remediation).
 *
 * Cursor-paginated: filtering happens per page AFTER the paginated read, so callers
 * walk `continueCursor` until `isDone` — a `.take(N)`-then-filter would sample only
 * the newest N rows globally and report an empty queue while broken legacy rows sit
 * further down. Tenant scoping uses the Phase-0-tolerant read scope, not
 * `requireTenantContext` (which throws for every staff account without a bound
 * tenant — i.e. all seeded ones).
 */
export const getLegacyRemediationQueue = query({
  args: { cursor: v.optional(v.string()), numItems: v.optional(v.number()) },
  handler: async (ctx, { cursor, numItems }) => {
    await assertStaff(ctx);
    const scope = await tenantReadScope(ctx);
    const page = await ctx.db
      .query('kycDocuments')
      .order('desc')
      .paginate({ numItems: Math.min(numItems ?? 100, 200), cursor: cursor ?? null });
    const storageChecks = await Promise.all(
      page.page.map(async (document) => {
        const profile = await ctx.db
          .query('profiles')
          .withIndex('by_userId', (q) => q.eq('userId', document.userId))
          .first();
        return {
          document,
          institutionId: document.institutionId ?? profile?.institutionId,
          metadata: document.fileStorageId
            ? await ctx.db.system.get('_storage', document.fileStorageId)
            : null,
        };
      })
    );
    const items = storageChecks
      .filter(({ metadata, institutionId }) => !metadata && (!scope || institutionId === scope))
      .map(({ document }) => ({
        id: document._id,
        userId: document.userId,
        documentType: document.documentType,
        status: document.status,
        createdAt: document.createdAt,
      }));
    return { items, continueCursor: page.continueCursor, isDone: page.isDone };
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await assertAuthenticated(ctx);
    await assertCallerClientFeatureEnabled(ctx, 'clientDocuments');
    return ctx.storage.generateUploadUrl();
  },
});

export const recordDocument = mutation({
  args: {
    documentType: kycDocumentTypeValidator,
    fileStorageId: v.id('_storage'),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    await assertCallerClientFeatureEnabled(ctx, 'clientDocuments');
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();
    if (!profile) {
      throw new ConvexError({ code: 'PROFILE_REQUIRED', message: 'Complete your profile first.' });
    }
    const sameType = await ctx.db
      .query('kycDocuments')
      .withIndex('by_userId_documentType', (q) =>
        q.eq('userId', userId).eq('documentType', args.documentType)
      )
      .collect();
    const previousCurrent = selectCurrentKycDocuments(sameType)[0];
    if (
      isKycUploadLocked({
        kycStatus: profile.kycStatus,
        documentType: args.documentType,
        currentSubmittedAt: previousCurrent?.submittedAt,
      })
    ) {
      throw new ConvexError({
        code: 'KYC_LOCKED',
        message: 'Your documents are under review and cannot be replaced yet.',
      });
    }

    const duplicate = await ctx.db
      .query('kycDocuments')
      .withIndex('by_fileStorageId', (q) => q.eq('fileStorageId', args.fileStorageId))
      .first();
    if (duplicate) {
      if (duplicate.userId === userId && duplicate.documentType === args.documentType) {
        return duplicate._id;
      }
      throw new ConvexError({
        code: 'FILE_ALREADY_RECORDED',
        message: 'This uploaded file has already been recorded.',
      });
    }

    const metadata = await ctx.db.system.get('_storage', args.fileStorageId);
    const stored = validateStoredDocument(metadata);
    const fileName = validateOriginalFileName(args.fileName);
    const version =
      sameType.length === 0
        ? 1
        : Math.max(...sameType.map((document) => document.version ?? 1)) + 1;
    const now = Date.now();
    const documentId = await ctx.db.insert('kycDocuments', {
      userId,
      institutionId: profile.institutionId ?? (await resolveWriteInstitution(ctx, { userId })),
      documentType: args.documentType,
      fileName,
      fileStorageId: args.fileStorageId,
      fileSize: stored.fileSize,
      mimeType: stored.mimeType,
      sha256: stored.sha256,
      version,
      isCurrent: true,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    if (previousCurrent) {
      await ctx.db.patch(previousCurrent._id, {
        isCurrent: false,
        supersededAt: now,
        supersededBy: documentId,
        updatedAt: now,
      });
    }
    if (
      shouldReopenKycOnUpload({
        kycStatus: profile.kycStatus,
        documentType: args.documentType,
      })
    ) {
      await ctx.db.patch(profile._id, { kycStatus: 'pending', updatedAt: now });
      scheduleAuditLog(ctx, 'profile', profile._id, 'KYC_REOPENED', profile.kycStatus, 'pending');
    }
    scheduleAuditEntry(ctx, {
      entityType: 'kycDocuments',
      entityId: documentId,
      action: previousCurrent ? 'REPLACE' : 'UPLOAD',
      newState: { documentType: args.documentType, version },
      userId,
    });
    return documentId;
  },
});

export const submitMyKyc = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    await assertCallerClientFeatureEnabled(ctx, 'clientDocuments');
    const readiness = await getKycReadiness(ctx, userId);
    const profile = readiness.profile;
    if (!profile) {
      throw new ConvexError({ code: 'PROFILE_REQUIRED', message: 'Complete your profile first.' });
    }

    // Authoritative twin of the browser-side ProfileCompletionGate: a KYC submission
    // without a phone number and national ID is unreviewable, and UI gates are UX
    // only — any client can call this mutation directly.
    if (!profile.phone?.trim() || !profile.idNumber?.trim()) {
      throw new ConvexError({
        code: 'PROFILE_INCOMPLETE',
        message: 'Add your phone number and ID number to your profile before submitting KYC.',
      });
    }

    const priorRequests = await ctx.db
      .query('approvalRequests')
      .withIndex('by_entityId', (q) => q.eq('entityId', String(profile._id)))
      .collect();
    const isResubmission = priorRequests.some((request) => request.entityType === 'kyc');
    const existingOpen = await findOpenKycRequest(ctx, profile._id);
    if (profile.kycStatus === 'submitted' && existingOpen) return existingOpen._id;
    if (!readiness.canSubmit) {
      throw new ConvexError({
        code: 'MISSING_KYC_DOCUMENTS',
        message: 'Upload valid replacements for all required documents before submitting.',
      });
    }

    const now = Date.now();
    await Promise.all(
      readiness.currentDocuments.map((document) =>
        ctx.db.patch(document._id, { submittedAt: now, updatedAt: now })
      )
    );

    const institutionId = profile.institutionId ?? (await resolveWriteInstitution(ctx, { userId }));
    let requestId = existingOpen?._id;
    if (!requestId) {
      requestId = await ctx.db.insert('approvalRequests', {
        entityType: 'kyc',
        entityId: String(profile._id),
        requestType: 'kyc_verification',
        status: 'pending',
        requestedBy: userId,
        institutionId,
        priority: 'medium',
        metadata: {
          requiredDocumentTypes: [...REQUIRED_KYC_DOCUMENT_TYPES],
          submittedDocumentCount: readiness.currentDocuments.length,
        },
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert('approvalHistory', {
        approvalRequestId: requestId,
        action: 'SUBMITTED',
        actorId: userId,
        fromStatus: 'none',
        toStatus: 'pending',
        createdAt: now,
      });
    }

    const oldStatus = profile.kycStatus;
    await ctx.db.patch(profile._id, { kycStatus: 'submitted', updatedAt: now });
    scheduleAuditLog(
      ctx,
      'profile',
      profile._id,
      isResubmission ? 'RESUBMIT_KYC' : 'SUBMIT_KYC',
      oldStatus,
      'submitted'
    );
    scheduleAuditEntry(ctx, {
      entityType: 'approvalRequests',
      entityId: requestId,
      action: 'KYC_SUBMIT',
      newState: { documentCount: readiness.currentDocuments.length },
      userId,
    });

    ctx.scheduler
      .runAfter(0, internal.notifications.createNotification, {
        userId,
        title: isResubmission ? 'KYC documents resubmitted' : 'KYC documents submitted',
        message: isResubmission
          ? 'Your replacement documents were resubmitted for review.'
          : 'Your documents were submitted for review. We will notify you when the review is complete.',
        category: 'kyc',
        priority: 'normal',
        actionUrl: '/kyc',
        actionLabel: 'View status',
        metadata: { requestId },
        dedupeKey: `kyc:${requestId}:submitted:client`,
        entityType: 'approvalRequests',
        entityId: String(requestId),
      })
      .catch(() => console.error('[notification] KYC submission notification enqueue failed'));

    ctx.scheduler
      .runAfter(0, internal.notifications.createStaffNotifications, {
        institutionId,
        title: isResubmission ? 'KYC Package Resubmitted' : 'New KYC Package',
        message: 'A client KYC package is ready for document review.',
        category: 'kyc',
        priority: 'high',
        actionUrl: '/admin/approvals',
        actionLabel: 'Review KYC',
        dedupeKey: `kyc:${requestId}:submitted:staff`,
        entityType: 'approvalRequests',
        entityId: String(requestId),
        metadata: { requestId, profileId: profile._id },
      })
      .catch(() => console.error('[notification] KYC staff fan-out enqueue failed'));
    return requestId;
  },
});

export const reviewDocument = mutation({
  args: {
    documentId: v.id('kycDocuments'),
    decision: v.union(v.literal('approved'), v.literal('rejected')),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { documentId, decision, notes }) => {
    const reviewerId = await assertStaff(ctx);
    const document = await ctx.db.get(documentId);
    if (!document) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'KYC document not found.' });
    }
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', document.userId))
      .first();
    await assertOwnerOrTenantStaff(
      ctx,
      document.userId,
      document.institutionId ?? profile?.institutionId
    );
    if (
      !profile ||
      profile.kycStatus !== 'submitted' ||
      !(await findOpenKycRequest(ctx, profile._id))
    ) {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: 'Only documents in an active submitted KYC package can be reviewed.',
      });
    }
    if (!document.submittedAt) {
      throw new ConvexError({
        code: 'NOT_SUBMITTED',
        message: 'The client has not submitted this document for review.',
      });
    }
    const current = selectCurrentKycDocuments(
      await ctx.db
        .query('kycDocuments')
        .withIndex('by_userId', (q) => q.eq('userId', document.userId))
        .collect()
    );
    if (!current.some((item) => item._id === documentId)) {
      throw new ConvexError({
        code: 'SUPERSEDED_DOCUMENT',
        message: 'Historical document versions cannot be reviewed.',
      });
    }
    const cleanNotes = notes?.trim();
    if (decision === 'rejected' && !cleanNotes) {
      throw new ConvexError({
        code: 'REJECTION_REASON_REQUIRED',
        message: 'A rejection reason is required.',
      });
    }
    if (decision === 'approved') {
      const metadata = document.fileStorageId
        ? await ctx.db.system.get('_storage', document.fileStorageId)
        : null;
      if (!metadata) {
        throw new ConvexError({
          code: 'FILE_NOT_FOUND',
          message: 'An unavailable legacy file cannot be approved. Request a replacement.',
        });
      }
    }

    const oldStatus = document.status;
    await ctx.db.patch(documentId, {
      status: decision,
      reviewedBy: reviewerId,
      reviewedAt: Date.now(),
      reviewNotes: cleanNotes,
      updatedAt: Date.now(),
    });
    scheduleAuditLog(
      ctx,
      'kycDocuments',
      documentId,
      'REVIEW',
      oldStatus,
      decision,
      cleanNotes,
      undefined
    );
    scheduleAuditEntry(ctx, {
      entityType: 'kycDocuments',
      entityId: documentId,
      action: 'REVIEW',
      newState: { decision, documentType: document.documentType },
      userId: reviewerId,
    });
  },
});

export const completeReview = mutation({
  args: { requestId: v.id('approvalRequests'), notes: v.optional(v.string()) },
  handler: async (ctx, { requestId, notes }) => {
    const reviewerId = await assertStaff(ctx);
    const request = await ctx.db.get(requestId);
    if (!request || request.entityType !== 'kyc') {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'KYC review request not found.' });
    }
    if (request.status !== 'pending' && request.status !== 'escalated') {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: `Cannot complete a review in status '${request.status}'.`,
      });
    }

    const profile = await ctx.db.get(request.entityId as Id<'profiles'>);
    if (!profile || profile.userId !== request.requestedBy) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Client profile not found.' });
    }
    await assertOwnerOrTenantStaff(
      ctx,
      profile.userId,
      request.institutionId ?? profile.institutionId
    );
    const readiness = await getKycReadiness(ctx, profile.userId);
    const submitted = readiness.currentDocuments.filter((document) => document.submittedAt);
    if (submitted.length === 0 || submitted.some((document) => document.status === 'pending')) {
      throw new ConvexError({
        code: 'REVIEW_INCOMPLETE',
        message: 'Decide every submitted document before completing the review.',
      });
    }
    const currentByType = new Map(
      readiness.currentDocuments.map((document) => [document.documentType, document])
    );
    const missingDecision = REQUIRED_KYC_DOCUMENT_TYPES.some((type) => {
      const document = currentByType.get(type);
      return (
        !document?.submittedAt ||
        document.status === 'pending' ||
        readiness.missingRequiredDocumentTypes.includes(type)
      );
    });
    if (missingDecision) {
      throw new ConvexError({
        code: 'REVIEW_INCOMPLETE',
        message: 'All required documents need a final decision.',
      });
    }

    const verified = REQUIRED_KYC_DOCUMENT_TYPES.every(
      (type) => currentByType.get(type)?.status === 'approved'
    );
    const profileStatus = verified ? 'verified' : 'rejected';
    const requestStatus = verified ? 'approved' : 'rejected';
    const now = Date.now();
    await ctx.db.patch(requestId, {
      status: requestStatus,
      currentApprover: reviewerId,
      notes: notes?.trim(),
      updatedAt: now,
    });
    await ctx.db.insert('approvalHistory', {
      approvalRequestId: requestId,
      action: 'COMPLETE_REVIEW',
      actorId: reviewerId,
      fromStatus: request.status,
      toStatus: requestStatus,
      notes: notes?.trim(),
      createdAt: now,
    });
    const oldProfileStatus = profile.kycStatus;
    await ctx.db.patch(profile._id, { kycStatus: profileStatus, updatedAt: now });
    scheduleAuditLog(
      ctx,
      'profile',
      profile._id,
      'COMPLETE_KYC_REVIEW',
      oldProfileStatus,
      profileStatus,
      notes?.trim()
    );
    scheduleAuditEntry(ctx, {
      entityType: 'approvalRequests',
      entityId: requestId,
      action: 'COMPLETE_KYC_REVIEW',
      newState: { outcome: profileStatus },
      userId: reviewerId,
    });

    ctx.scheduler
      .runAfter(0, internal.notifications.createNotification, {
        userId: profile.userId,
        title: verified ? 'KYC verification complete' : 'KYC documents need attention',
        message: verified
          ? 'Your identity verification is complete. You can now apply for a loan.'
          : 'One or more required documents were rejected. View the review notes and upload a replacement.',
        category: 'kyc',
        priority: verified ? 'high' : 'normal',
        actionUrl: '/kyc',
        actionLabel: verified ? 'Continue' : 'Review documents',
        metadata: { requestId, outcome: profileStatus },
        dedupeKey: `kyc:${requestId}:${profileStatus}:client`,
        entityType: 'approvalRequests',
        entityId: String(requestId),
      })
      .catch(() => console.error('[notification] KYC decision notification enqueue failed'));

    ctx.scheduler
      .runAfter(0, internal.notifications.createStaffNotifications, {
        institutionId: request.institutionId ?? profile.institutionId,
        title: verified ? 'KYC Package Verified' : 'KYC Action Required',
        message: verified
          ? 'A client KYC package completed verification.'
          : 'A client KYC package was rejected and requires replacement documents.',
        category: 'kyc',
        priority: verified ? 'normal' : 'high',
        actionUrl: '/admin/approvals',
        actionLabel: 'View KYC Queue',
        dedupeKey: `kyc:${requestId}:${profileStatus}:staff`,
        entityType: 'approvalRequests',
        entityId: String(requestId),
        metadata: { requestId, profileId: profile._id, outcome: profileStatus },
      })
      .catch(() => console.error('[notification] KYC decision staff fan-out failed'));

    return { status: profileStatus };
  },
});

export const requestDocumentAccess = mutation({
  args: {
    documentId: v.id('kycDocuments'),
    intent: v.union(v.literal('preview'), v.literal('download')),
  },
  handler: async (ctx, { documentId, intent }) => {
    const document = await ctx.db.get(documentId);
    if (!document) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'KYC document not found.' });
    }
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', document.userId))
      .first();
    const actorId = await assertOwnerOrTenantStaff(
      ctx,
      document.userId,
      document.institutionId ?? profile?.institutionId
    );
    await assertCallerClientFeatureEnabled(ctx, 'clientDocuments');
    const metadata = document.fileStorageId
      ? await ctx.db.system.get('_storage', document.fileStorageId)
      : null;
    // Short-lived grant instead of storage.getUrl — that URL is permanent and
    // unauthenticated. See convex/lib/documentGrants.ts.
    const url =
      metadata && document.fileStorageId
        ? await createDocumentGrant(ctx, {
            storageId: document.fileStorageId,
            sourceTable: 'kycDocuments',
            documentId,
            actorId,
            intent,
            fileName: legacyFileName(document),
            mimeType: document.mimeType ?? metadata.contentType ?? undefined,
          })
        : null;
    scheduleAuditEntry(ctx, {
      entityType: 'kycDocuments',
      entityId: documentId,
      action: intent === 'preview' ? 'PREVIEW' : 'DOWNLOAD',
      newState: { documentType: document.documentType, available: Boolean(url) },
      userId: actorId,
    });
    return {
      url,
      fileName: legacyFileName(document),
      mimeType: document.mimeType ?? metadata?.contentType,
      fileSize: document.fileSize ?? metadata?.size,
    };
  },
});

/** Additive legacy migration; historical rows and files are never removed. */
export const backfillLegacyDocumentMetadata = internalMutation({
  args: {
    dryRun: v.boolean(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { dryRun, limit, cursor }) => {
    const page = await ctx.db
      .query('kycDocuments')
      .order('asc')
      .paginate({ numItems: Math.min(limit ?? 100, 1000), cursor: cursor ?? null });
    const documents = page.page;
    const versionInfoById = new Map<string, { version: number; isCurrent: boolean }>();
    const siblingCache = new Map<string, Doc<'kycDocuments'>[]>();
    for (const document of documents) {
      const cacheKey = `${document.userId}:${document.documentType}`;
      let siblings = siblingCache.get(cacheKey);
      if (!siblings) {
        siblings = await ctx.db
          .query('kycDocuments')
          .withIndex('by_userId_documentType', (q) =>
            q.eq('userId', document.userId).eq('documentType', document.documentType)
          )
          .collect();
        siblingCache.set(cacheKey, siblings);
      }
      const oldestFirst = [...siblings].sort((a, b) => a.createdAt - b.createdAt);
      versionInfoById.set(document._id, {
        version: oldestFirst.findIndex((sibling) => sibling._id === document._id) + 1,
        isCurrent: selectCurrentKycDocuments(siblings)[0]?._id === document._id,
      });
    }
    let metadataRecovered = 0;
    let unavailable = 0;
    let versionMarkersAdded = 0;

    for (const document of documents) {
      const storageMetadata = document.fileStorageId
        ? await ctx.db.system.get('_storage', document.fileStorageId)
        : null;
      if (!storageMetadata) unavailable += 1;
      if (storageMetadata && (!document.fileSize || !document.mimeType || !document.sha256)) {
        metadataRecovered += 1;
      }
      if (document.isCurrent === undefined || document.version === undefined) {
        versionMarkersAdded += 1;
      }
      if (!dryRun) {
        const versionInfo = versionInfoById.get(document._id);
        await ctx.db.patch(document._id, {
          ...(storageMetadata && {
            fileSize: document.fileSize ?? storageMetadata.size,
            mimeType: document.mimeType ?? storageMetadata.contentType,
            sha256: document.sha256 ?? storageMetadata.sha256,
          }),
          version: document.version ?? versionInfo?.version ?? 1,
          isCurrent: versionInfo?.isCurrent ?? true,
          updatedAt: Date.now(),
        });
      }
    }
    // Migrations that touch retained compliance rows must leave a trail — one
    // summary entry per page, not one per row.
    if (!dryRun && documents.length > 0) {
      scheduleAuditEntry(ctx, {
        entityType: 'kycDocuments',
        entityId: 'backfillLegacyDocumentMetadata',
        action: 'BACKFILL',
        newState: {
          scanned: documents.length,
          metadataRecovered,
          unavailable,
          versionMarkersAdded,
        },
      });
    }
    return {
      scanned: documents.length,
      metadataRecovered,
      unavailable,
      versionMarkersAdded,
      dryRun,
      continueCursor: page.continueCursor,
      isDone: page.isDone,
    };
  },
});
