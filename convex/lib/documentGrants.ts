/**
 * Minting and consuming short-lived document access grants.
 *
 * Replaces raw `ctx.storage.getUrl()` in the document modules. That URL never expires
 * and carries no auth — once issued it is a permanent anonymous handle to the file,
 * and for KYC records (national ID scans, payslips, bank statements) that is an
 * unacceptable exposure: browser history, a copied link, or a forwarded screenshot
 * leaks the document forever, and nothing records who actually fetched it.
 *
 * The grant flow keeps the object-level guard where it already lives (the
 * `requestDocumentAccess` mutations), then:
 *   1. `createDocumentGrant` (here, called inside that guarded mutation) mints a
 *      single-purpose nonce row with a short expiry;
 *   2. the browser hits `GET /documents/fetch?grant=<nonce>` on the Convex site
 *      (`convex/http.ts`), which consumes the grant transactionally and streams the
 *      blob with the right Content-Type/Disposition;
 *   3. every fetch increments `fetchCount` and lands in the audit trail — the trail
 *      now records actual retrieval, not just URL issuance.
 *
 * DB-backed rather than HMAC-signed on purpose: Convex mutations restrict
 * nondeterministic crypto, a secret would be one more thing to rotate across
 * deployments, and a row can be revoked or inspected after the fact.
 */

import { GenericMutationCtx } from 'convex/server';
import { DataModel, Id } from '../_generated/dataModel';
import { scheduleAuditEntry } from './audit';

type MutCtx = GenericMutationCtx<DataModel>;

/** How long a minted URL stays fetchable. Preview dialogs re-request on each open. */
export const GRANT_TTL_MS = 5 * 60 * 1000;

export interface CreateGrantInput {
  storageId: Id<'_storage'>;
  sourceTable: 'kycDocuments' | 'loanDocuments' | 'institutionDocuments';
  documentId: string;
  actorId: Id<'users'>;
  intent: 'preview' | 'download';
  fileName: string;
  mimeType?: string;
}

/**
 * Mint a grant and return the URL the browser can load directly (img/iframe/anchor —
 * the nonce rides the query string, so no auth header is needed).
 *
 * MUST be called only after an object-level guard has passed on the document.
 */
export async function createDocumentGrant(ctx: MutCtx, input: CreateGrantInput): Promise<string> {
  const now = Date.now();
  // Two UUIDs (~244 bits) — unguessable for a 5-minute window by a wide margin.
  const nonce = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '');

  await ctx.db.insert('documentAccessGrants', {
    nonce,
    storageId: input.storageId,
    sourceTable: input.sourceTable,
    documentId: input.documentId,
    actorId: input.actorId,
    intent: input.intent,
    fileName: input.fileName,
    mimeType: input.mimeType,
    expiresAt: now + GRANT_TTL_MS,
    createdAt: now,
    fetchCount: 0,
  });

  scheduleAuditEntry(ctx, {
    entityType: input.sourceTable,
    entityId: input.documentId,
    action: 'GRANT_CREATE',
    newState: { intent: input.intent, expiresAt: now + GRANT_TTL_MS },
    userId: input.actorId,
  });

  const siteUrl = process.env.CONVEX_SITE_URL;
  if (!siteUrl) {
    // Deployment misconfiguration — CONVEX_SITE_URL is system-provided on real
    // deployments; failing loudly beats returning a URL that can never resolve.
    throw new Error('CONVEX_SITE_URL is not set; cannot build document access URL');
  }
  return `${siteUrl.replace(/\/$/, '')}/documents/fetch?grant=${nonce}`;
}
