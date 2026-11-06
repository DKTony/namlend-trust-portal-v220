'use node';
/**
 * Renders a loan agreement PDF from its frozen snapshot, stores it privately and
 * records its SHA-256. `issued` is the copy shown to the borrower; `executed` adds the
 * electronic acceptance record and archives the agreement.
 *
 * A failure is recorded (pdfStatus 'failed' + loanProcessingFailures) rather than
 * thrown, so staff see it in the workspace and can retry; it never rolls back the
 * finalize or accept that scheduled it.
 */

import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { internalAction } from '../_generated/server';
import { renderAgreementPdf } from '../lib/agreement/render';

async function sha256Hex(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export const render = internalAction({
  args: {
    agreementId: v.id('loanAgreements'),
    kind: v.union(v.literal('issued'), v.literal('executed')),
  },
  handler: async (ctx, { agreementId, kind }) => {
    try {
      const input = await ctx.runQuery(internal.loanAgreements.getRenderInput, { agreementId });
      if (!input) throw new Error('The agreement has no frozen snapshot or template to render.');
      if (kind === 'executed' && !input.acceptance)
        throw new Error('No acceptance has been recorded.');

      // Copy into an ArrayBuffer-backed array: pdf-lib's return type admits a
      // SharedArrayBuffer, which neither Web Crypto nor Blob accept.
      const bytes = new Uint8Array(
        await renderAgreementPdf({
          agreementNumber: input.agreementNumber,
          templateVersion: input.templateVersion,
          finalizedAt: input.finalizedAt,
          snapshot: input.snapshot,
          template: input.template,
          acceptance:
            kind === 'executed' && input.acceptance
              ? {
                  acceptedAt: input.acceptance.acceptedAt,
                  typedName: input.acceptance.typedName,
                  idNumberLast4: input.acceptance.idNumberLast4,
                  placeOfSigning: input.acceptance.placeOfSigning,
                  documentSha256: input.acceptance.documentSha256,
                  consentRecordId: input.acceptance.consentRecordId,
                }
              : null,
        })
      );
      const sha256 = await sha256Hex(bytes);
      const storageId = await ctx.storage.store(new Blob([bytes], { type: 'application/pdf' }));
      await ctx.runMutation(internal.loanAgreements.recordRendered, {
        agreementId,
        kind,
        storageId,
        sha256,
      });
    } catch (error) {
      await ctx.runMutation(internal.loanAgreements.recordRenderFailed, {
        agreementId,
        kind,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
});
