/**
 * Loan document management via Convex File Storage.
 * Replaces: loan_documents table + document upload edge function.
 *
 * Pattern:
 *   1. Client calls generateUploadUrl() → gets a short-lived signed URL
 *   2. Client POSTs file directly to Convex Storage (browser → Convex CDN)
 *   3. Client calls recordDocument() with the returned storageId
 *   4. Staff calls getDocumentUrl() to retrieve a signed download URL
 */

import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { assertAuthenticated, assertOwnerOrStaff, assertStaff } from './lib/auth';

// ---------------------------------------------------------------------------
// Upload URL generation
// ---------------------------------------------------------------------------

/** Step 1: Get a short-lived signed upload URL for direct browser upload. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await assertAuthenticated(ctx);
    return ctx.storage.generateUploadUrl();
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Step 3: Record a document after upload. */
export const recordDocument = mutation({
  args: {
    loanId: v.id('loans'),
    documentType: v.string(),
    fileName: v.string(),
    fileStorageId: v.id('_storage'),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const loan = await ctx.db.get(args.loanId);
    if (!loan) throw new ConvexError({ code: 'NOT_FOUND', message: 'Loan not found.' });
    await assertOwnerOrStaff(ctx, loan.userId);

    return ctx.db.insert('loanDocuments', {
      loanId: args.loanId,
      userId,
      institutionId: loan.institutionId,
      documentType: args.documentType,
      fileName: args.fileName,
      fileStorageId: args.fileStorageId,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      status: 'pending',
      uploadedAt: Date.now(),
    });
  },
});

/** Staff: approve or reject a document. */
export const reviewDocument = mutation({
  args: {
    documentId: v.id('loanDocuments'),
    decision: v.union(v.literal('approved'), v.literal('rejected')),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { documentId, decision }) => {
    await assertStaff(ctx);
    await ctx.db.patch(documentId, { status: decision });
  },
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** List all documents for a loan. */
export const getLoanDocuments = query({
  args: { loanId: v.id('loans') },
  handler: async (ctx, { loanId }) => {
    const loan = await ctx.db.get(loanId);
    if (!loan) return [];
    await assertOwnerOrStaff(ctx, loan.userId);

    return ctx.db
      .query('loanDocuments')
      .withIndex('by_loanId', (q) => q.eq('loanId', loanId))
      .collect();
  },
});

/** Get a signed download URL for a document. */
export const getDocumentUrl = query({
  args: { documentId: v.id('loanDocuments') },
  handler: async (ctx, { documentId }) => {
    const doc = await ctx.db.get(documentId);
    if (!doc) return null;
    await assertOwnerOrStaff(ctx, doc.userId);
    return ctx.storage.getUrl(doc.fileStorageId);
  },
});
