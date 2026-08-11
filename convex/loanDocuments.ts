/** Versioned loan-supporting documents stored in Convex File Storage. */

import { ConvexError, v } from 'convex/values';
import type { Doc } from './_generated/dataModel';
import { internalMutation, mutation, query } from './_generated/server';
import { scheduleAuditEntry, scheduleAuditLog } from './lib/audit';
import { assertAuthenticated, assertOwnerOrTenantStaff, assertStaff } from './lib/auth';
import { createDocumentGrant } from './lib/documentGrants';
import {
  loanDocumentTypeValidator,
  validateOriginalFileName,
  validateStoredDocument,
} from './lib/documentPolicy';
import { tenantReadScope } from './lib/tenancy';

const CLIENT_UPLOAD_STATES = ['draft', 'submitted', 'under_review'];

function selectCurrentDocuments(documents: Doc<'loanDocuments'>[]) {
  const types = new Set(documents.map((document) => document.documentType));
  return [...types].flatMap((documentType) => {
    const candidates = documents
      .filter((document) => document.documentType === documentType)
      .sort((a, b) => b.uploadedAt - a.uploadedAt);
    const current =
      candidates.find((document) => document.isCurrent === true) ??
      candidates.find((document) => document.isCurrent !== false && !document.supersededAt) ??
      candidates[0];
    return current ? [current] : [];
  });
}

async function presentDocument(ctx: any, document: Doc<'loanDocuments'>) {
  const metadata = await ctx.db.system.get('_storage', document.fileStorageId);
  return {
    id: document._id,
    loanId: document.loanId,
    documentType: document.documentType,
    fileName: document.fileName,
    fileSize: document.fileSize ?? metadata?.size,
    mimeType: document.mimeType ?? metadata?.contentType,
    fileAvailable: Boolean(metadata),
    status: document.status,
    reviewNotes: document.reviewNotes,
    reviewedAt: document.reviewedAt,
    uploadedAt: document.uploadedAt,
    version: document.version ?? 1,
    isCurrent: document.isCurrent !== false && !document.supersededAt,
  };
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await assertAuthenticated(ctx);
    return ctx.storage.generateUploadUrl();
  },
});

export const recordDocument = mutation({
  args: {
    loanId: v.id('loans'),
    documentType: loanDocumentTypeValidator,
    fileName: v.string(),
    fileStorageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    const actorId = await assertAuthenticated(ctx);
    const loan = await ctx.db.get(args.loanId);
    if (!loan) throw new ConvexError({ code: 'NOT_FOUND', message: 'Loan not found.' });
    await assertOwnerOrTenantStaff(ctx, loan.userId, loan.institutionId);
    if (actorId === loan.userId && !CLIENT_UPLOAD_STATES.includes(loan.status)) {
      throw new ConvexError({
        code: 'DOCUMENTS_READ_ONLY',
        message: 'Supporting documents are read-only at this stage of the loan.',
      });
    }

    const duplicate = await ctx.db
      .query('loanDocuments')
      .withIndex('by_fileStorageId', (q) => q.eq('fileStorageId', args.fileStorageId))
      .first();
    if (duplicate) {
      if (duplicate.loanId === args.loanId && duplicate.documentType === args.documentType) {
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
    const sameType = await ctx.db
      .query('loanDocuments')
      .withIndex('by_loanId_documentType', (q) =>
        q.eq('loanId', args.loanId).eq('documentType', args.documentType)
      )
      .collect();
    const previousCurrent = selectCurrentDocuments(sameType)[0];
    const version =
      sameType.length === 0
        ? 1
        : Math.max(...sameType.map((document) => document.version ?? 1)) + 1;
    const now = Date.now();
    const documentId = await ctx.db.insert('loanDocuments', {
      loanId: args.loanId,
      userId: loan.userId,
      uploadedBy: actorId,
      institutionId: loan.institutionId,
      documentType: args.documentType,
      fileName,
      fileStorageId: args.fileStorageId,
      fileSize: stored.fileSize,
      mimeType: stored.mimeType,
      sha256: stored.sha256,
      version,
      isCurrent: true,
      status: 'pending',
      uploadedAt: now,
    });
    if (previousCurrent) {
      await ctx.db.patch(previousCurrent._id, {
        isCurrent: false,
        supersededAt: now,
        supersededBy: documentId,
      });
    }
    scheduleAuditEntry(ctx, {
      entityType: 'loanDocuments',
      entityId: documentId,
      action: previousCurrent ? 'REPLACE' : 'UPLOAD',
      newState: { loanId: args.loanId, documentType: args.documentType, version },
      userId: actorId,
    });
    return documentId;
  },
});

export const reviewDocument = mutation({
  args: {
    documentId: v.id('loanDocuments'),
    decision: v.union(v.literal('approved'), v.literal('rejected')),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { documentId, decision, notes }) => {
    const reviewerId = await assertStaff(ctx);
    const document = await ctx.db.get(documentId);
    if (!document) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Loan document not found.' });
    }
    const loan = await ctx.db.get(document.loanId);
    await assertOwnerOrTenantStaff(
      ctx,
      document.userId,
      document.institutionId ?? loan?.institutionId
    );
    const documents = await ctx.db
      .query('loanDocuments')
      .withIndex('by_loanId', (q) => q.eq('loanId', document.loanId))
      .collect();
    if (!selectCurrentDocuments(documents).some((item) => item._id === documentId)) {
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
      const metadata = await ctx.db.system.get('_storage', document.fileStorageId);
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
    });
    scheduleAuditLog(ctx, 'loanDocuments', documentId, 'REVIEW', oldStatus, decision, cleanNotes);
    scheduleAuditEntry(ctx, {
      entityType: 'loanDocuments',
      entityId: documentId,
      action: 'REVIEW',
      newState: { decision, documentType: document.documentType },
      userId: reviewerId,
    });
  },
});

export const getLoanDocuments = query({
  args: { loanId: v.id('loans'), includeHistory: v.optional(v.boolean()) },
  handler: async (ctx, { loanId, includeHistory }) => {
    // Guard first: the empty result for a missing loan must not be reachable
    // unauthenticated (existence probing aside, guards lead in this codebase).
    await assertAuthenticated(ctx);
    const loan = await ctx.db.get(loanId);
    if (!loan) return [];
    await assertOwnerOrTenantStaff(ctx, loan.userId, loan.institutionId);
    const documents = await ctx.db
      .query('loanDocuments')
      .withIndex('by_loanId', (q) => q.eq('loanId', loanId))
      .collect();
    const visible = includeHistory ? documents : selectCurrentDocuments(documents);
    return Promise.all(
      visible.sort((a, b) => b.uploadedAt - a.uploadedAt).map((doc) => presentDocument(ctx, doc))
    );
  },
});

/** See kycDocuments.getLegacyRemediationQueue — same pagination + scoping rationale. */
export const getLegacyRemediationQueue = query({
  args: { cursor: v.optional(v.string()), numItems: v.optional(v.number()) },
  handler: async (ctx, { cursor, numItems }) => {
    await assertStaff(ctx);
    const scope = await tenantReadScope(ctx);
    const page = await ctx.db
      .query('loanDocuments')
      .order('desc')
      .paginate({ numItems: Math.min(numItems ?? 100, 200), cursor: cursor ?? null });
    const unavailable = await Promise.all(
      page.page.map(async (document) => {
        const loan = await ctx.db.get(document.loanId);
        return {
          document,
          institutionId: document.institutionId ?? loan?.institutionId,
          metadata: await ctx.db.system.get('_storage', document.fileStorageId),
        };
      })
    );
    const items = unavailable
      .filter(({ metadata, institutionId }) => !metadata && (!scope || institutionId === scope))
      .map(({ document }) => ({
        id: document._id,
        loanId: document.loanId,
        userId: document.userId,
        documentType: document.documentType,
        uploadedAt: document.uploadedAt,
      }));
    return { items, continueCursor: page.continueCursor, isDone: page.isDone };
  },
});

export const requestDocumentAccess = mutation({
  args: {
    documentId: v.id('loanDocuments'),
    intent: v.union(v.literal('preview'), v.literal('download')),
  },
  handler: async (ctx, { documentId, intent }) => {
    const document = await ctx.db.get(documentId);
    if (!document) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Loan document not found.' });
    }
    const loan = await ctx.db.get(document.loanId);
    const actorId = await assertOwnerOrTenantStaff(
      ctx,
      document.userId,
      document.institutionId ?? loan?.institutionId
    );
    const metadata = await ctx.db.system.get('_storage', document.fileStorageId);
    // Short-lived grant instead of storage.getUrl — that URL is permanent and
    // unauthenticated. See convex/lib/documentGrants.ts.
    const url = metadata
      ? await createDocumentGrant(ctx, {
          storageId: document.fileStorageId,
          sourceTable: 'loanDocuments',
          documentId,
          actorId,
          intent,
          fileName: document.fileName,
          mimeType: document.mimeType ?? metadata.contentType ?? undefined,
        })
      : null;
    scheduleAuditEntry(ctx, {
      entityType: 'loanDocuments',
      entityId: documentId,
      action: intent === 'preview' ? 'PREVIEW' : 'DOWNLOAD',
      newState: { documentType: document.documentType, available: Boolean(url) },
      userId: actorId,
    });
    return {
      url,
      fileName: document.fileName,
      mimeType: document.mimeType ?? metadata?.contentType,
      fileSize: document.fileSize ?? metadata?.size,
    };
  },
});

/** Additive migration/report; historical loan-document rows are never removed. */
export const backfillLegacyDocumentMetadata = internalMutation({
  args: {
    dryRun: v.boolean(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { dryRun, limit, cursor }) => {
    const page = await ctx.db
      .query('loanDocuments')
      .order('asc')
      .paginate({ numItems: Math.min(limit ?? 100, 1000), cursor: cursor ?? null });
    const documents = page.page;
    const versionInfoById = new Map<string, { version: number; isCurrent: boolean }>();
    const siblingCache = new Map<string, Doc<'loanDocuments'>[]>();
    for (const document of documents) {
      const cacheKey = `${document.loanId}:${document.documentType}`;
      let siblings = siblingCache.get(cacheKey);
      if (!siblings) {
        siblings = await ctx.db
          .query('loanDocuments')
          .withIndex('by_loanId_documentType', (q) =>
            q.eq('loanId', document.loanId).eq('documentType', document.documentType)
          )
          .collect();
        siblingCache.set(cacheKey, siblings);
      }
      const oldestFirst = [...siblings].sort((a, b) => a.uploadedAt - b.uploadedAt);
      versionInfoById.set(document._id, {
        version: oldestFirst.findIndex((sibling) => sibling._id === document._id) + 1,
        isCurrent: selectCurrentDocuments(siblings)[0]?._id === document._id,
      });
    }
    let metadataRecovered = 0;
    let unavailable = 0;
    let versionMarkersAdded = 0;

    for (const document of documents) {
      const storageMetadata = await ctx.db.system.get('_storage', document.fileStorageId);
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
        });
      }
    }

    // Migrations that touch retained compliance rows must leave a trail — one
    // summary entry per page, not one per row.
    if (!dryRun && documents.length > 0) {
      scheduleAuditEntry(ctx, {
        entityType: 'loanDocuments',
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
