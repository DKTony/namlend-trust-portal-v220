/**
 * Server side of the document-grant flow — see convex/lib/documentGrants.ts for the
 * design. The single internal mutation here is invoked by the `/documents/fetch` HTTP
 * route to validate a grant transactionally before the blob is streamed.
 */

import { v } from 'convex/values';
import { internalMutation } from './_generated/server';
import { scheduleAuditEntry } from './lib/audit';

/**
 * Validate a grant nonce and record the fetch. Returns what the HTTP route needs to
 * stream the file, or `null` when the grant is unknown or expired (the route answers
 * 404/410 — deliberately indistinguishable from a bad nonce to outsiders).
 *
 * Expired grants are retained, not deleted: the rows are the access-history record,
 * and this repo's retention rule forbids hard deletes anyway.
 */
export const consumeGrant = internalMutation({
  args: { nonce: v.string() },
  handler: async (ctx, { nonce }) => {
    const grant = await ctx.db
      .query('documentAccessGrants')
      .withIndex('by_nonce', (q) => q.eq('nonce', nonce))
      .unique();
    if (!grant) return null;

    const now = Date.now();
    if (grant.expiresAt < now) return null;

    await ctx.db.patch(grant._id, {
      fetchCount: grant.fetchCount + 1,
      lastFetchedAt: now,
    });

    // The REQUEST was audited when the guard passed and the grant was minted; this is
    // the complementary record of actual retrieval.
    scheduleAuditEntry(ctx, {
      entityType: grant.sourceTable,
      entityId: grant.documentId,
      action: 'FETCH',
      newState: { intent: grant.intent, fetchCount: grant.fetchCount + 1 },
      userId: grant.actorId,
    });

    return {
      storageId: grant.storageId,
      fileName: grant.fileName,
      mimeType: grant.mimeType,
      intent: grant.intent,
    };
  },
});
