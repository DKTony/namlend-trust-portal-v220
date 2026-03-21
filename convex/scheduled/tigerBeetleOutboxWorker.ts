/**
 * TigerBeetle Outbox Worker — Convex Action (no 1-second time limit).
 * Runs every 30 seconds via crons.ts.
 * Replaces: supabase/functions/tigerbeetle-outbox-worker/index.ts
 *
 * Claim/process/retry logic is identical to the Deno edge function:
 *   - Fetch pending + failed entries whose retry window has elapsed
 *   - POST to TigerBeetle HTTP API at localhost:3001 (shadow mode)
 *   - On success: mark completed, record shadow transfer
 *   - On failure: mark failed with exponential backoff (max 5 retries → dead_letter)
 */

import { internalAction } from '../_generated/server';
import { internal } from '../_generated/api';
import { Id } from '../_generated/dataModel';

// TigerBeetle HTTP API (shadow mode — records but doesn't control flow)
const TB_BASE_URL = 'http://127.0.0.1:3001';

// Account codes from Chart of Accounts (mirror of the edge function constants)
const GLOBAL_ACCOUNT_IDS: Record<string, string> = {
  DISBURSEMENT_CLEARING: '0x4e414d4c454e445f444953425f434c52',
  COLLECTIONS_CLEARING: '0x4e414d4c454e445f434f4c4c5f434c52',
  BANK_SETTLEMENT: '0x4e414d4c454e445f42414e4b5f534554',
  IPS_PENDING_INBOUND: '0x4e414d4c454e445f4950535f494e4244',
  IPS_PENDING_OUTBOUND: '0x4e414d4c454e445f4950535f4f555442',
  INTEREST_INCOME: '0x4e414d4c454e445f494e545f494e434d',
  FEE_INCOME: '0x4e414d4c454e445f4645455f494e434d',
};

interface OutboxEntry {
  _id: Id<'tigerBeetleOutbox'>;
  eventType: string;
  sourceTable: string;
  sourceId: string;
  payload: Record<string, unknown>;
  status: string;
  retryCount: number;
}

/**
 * Convert a Convex document ID to a TigerBeetle-compatible bigint string.
 * Hashes the string ID to a 128-bit number.
 */
function idToTBId(id: string): string {
  // Simple hash: take the first 32 hex chars of a SHA-256 equivalent
  // In production this would use a deterministic mapping
  let hash = BigInt(0);
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31n + BigInt(id.charCodeAt(i))) & ((1n << 128n) - 1n);
  }
  return hash.toString();
}

async function processEntry(entry: OutboxEntry): Promise<string[]> {
  const { eventType, payload } = entry;
  const transferIds: string[] = [];

  switch (eventType) {
    case 'CREATE_ACCOUNT': {
      // POST account creation to TigerBeetle
      await fetch(`${TB_BASE_URL}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: idToTBId(entry.sourceId) }),
      });
      break;
    }

    case 'DISBURSEMENT': {
      const transferId = idToTBId(entry.sourceId);
      await fetch(`${TB_BASE_URL}/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: transferId,
          debit_account_id: GLOBAL_ACCOUNT_IDS.DISBURSEMENT_CLEARING,
          credit_account_id: idToTBId(payload.loan_id as string),
          amount: payload.amount,
          code: payload.transfer_code ?? 1001,
          ledger: 1,
        }),
      });
      transferIds.push(transferId);
      break;
    }

    case 'REPAYMENT': {
      const transfers =
        (payload.transfers as Array<{
          debit_type: string;
          credit_type: string;
          amount: string;
          code: number;
        }>) ?? [];

      for (let i = 0; i < transfers.length; i++) {
        const t = transfers[i];
        const transferId = idToTBId(`${entry.sourceId}:${i}`);
        await fetch(`${TB_BASE_URL}/transfers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: transferId,
            debit_account_id: GLOBAL_ACCOUNT_IDS[t.debit_type] ?? t.debit_type,
            credit_account_id: GLOBAL_ACCOUNT_IDS[t.credit_type] ?? t.credit_type,
            amount: t.amount,
            code: t.code,
            ledger: 1,
          }),
        });
        transferIds.push(transferId);
      }
      break;
    }

    case 'IPS_INITIATE':
    case 'IPS_COMPLETE':
    case 'IPS_REVERSE':
    case 'LATE_FEE': {
      const transferId = idToTBId(entry.sourceId);
      await fetch(`${TB_BASE_URL}/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: transferId,
          amount: payload.amount,
          code: eventType === 'IPS_INITIATE' ? 3001 : eventType === 'IPS_REVERSE' ? 3003 : 3002,
          ledger: 1,
          flags:
            eventType === 'IPS_INITIATE'
              ? 'pending'
              : eventType === 'IPS_REVERSE'
                ? 'void_pending'
                : 'post_pending',
        }),
      });
      transferIds.push(transferId);
      break;
    }

    default:
      throw new Error(`Unknown event type: ${eventType}`);
  }

  return transferIds;
}

export const processOutbox = internalAction({
  args: {},
  handler: async (ctx) => {
    const startTime = Date.now();

    // Claim a batch of pending entries
    const entries: OutboxEntry[] = await ctx.runMutation(
      internal.tigerbeetle.outbox.claimPendingEntries,
      { batchSize: 50 }
    );

    if (entries.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    console.log(`[TB outbox] Processing ${entries.length} entries`);

    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const entry of entries) {
      try {
        const transferIds = await processEntry(entry);

        await ctx.runMutation(internal.tigerbeetle.outbox.completeEntry, {
          entryId: entry._id,
          tbTransferIds: transferIds,
        });

        // Record shadow transfers
        for (const transferId of transferIds) {
          const tbId = BigInt(transferId);
          await ctx.runMutation(internal.tigerbeetle.transfers.recordShadowTransfer, {
            tbTransferIdHigh: Number(tbId >> 64n),
            tbTransferIdLow: Number(tbId & 0xffffffffffffffffn),
            amount: Number(entry.payload.amount ?? 0) / 100,
            tbLedger: 1,
            tbCode: Number(entry.payload.transfer_code ?? 0),
            sourceTable: entry.sourceTable,
            sourceId: entry.sourceId,
            outboxId: entry._id,
            isPosted: true,
            userData128: entry.sourceId,
          });
        }

        succeeded++;
        console.log(`[TB outbox] ✅ ${entry._id} (${entry.eventType})`);
      } catch (error) {
        failed++;
        const msg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${entry._id}: ${msg}`);

        await ctx.runMutation(internal.tigerbeetle.outbox.failEntry, {
          entryId: entry._id,
          errorMessage: msg,
        });

        console.error(`[TB outbox] ❌ ${entry._id}: ${msg}`);
      }
    }

    const durationMs = Date.now() - startTime;
    console.log(`[TB outbox] Completed in ${durationMs}ms: ${succeeded} ok, ${failed} failed`);

    return {
      processed: entries.length,
      succeeded,
      failed,
      errors,
      durationMs,
    };
  },
});
