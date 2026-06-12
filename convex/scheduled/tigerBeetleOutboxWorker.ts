/**
 * TigerBeetle Outbox Worker — Convex Action (no 1-second time limit).
 * Runs every 30 seconds via crons.ts.
 * Replaces: supabase/functions/tigerbeetle-outbox-worker/index.ts
 *
 * Claim/process/retry logic is identical to the Deno edge function:
 *   - Fetch pending + failed entries whose retry window has elapsed
 *   - POST to TigerBeetle HTTP API when TIGERBEETLE_HTTP_URL is configured
 *   - Otherwise complete the shadow-ledger record in deterministic simulation mode
 *   - On success: mark completed, record shadow transfer
 *   - On failure: mark failed with exponential backoff (max 5 retries → dead_letter)
 */

import { internalAction } from '../_generated/server';
import { internal } from '../_generated/api';
import { Id } from '../_generated/dataModel';

// Optional TigerBeetle HTTP API. Convex remains authoritative; this is shadow evidence.
const TB_BASE_URL = process.env.TIGERBEETLE_HTTP_URL ?? process.env.TB_BASE_URL;

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

interface ProcessedTransfer {
  id: string;
  amountCents: number;
  code: number;
}

function transferCodeFor(entry: OutboxEntry): number {
  const payloadCode = Number(entry.payload.transfer_code);
  if (Number.isFinite(payloadCode) && payloadCode > 0) return payloadCode;
  if (entry.eventType === 'IPS_INITIATE') return 3001;
  if (entry.eventType === 'IPS_REVERSE') return 3003;
  if (entry.eventType === 'IPS_COMPLETE') return 3002;
  if (entry.eventType === 'LATE_FEE') return 5002;
  return 0;
}

function ipsAccountsFor(eventType: string, direction: unknown) {
  const inbound = direction === 'inbound';
  if (eventType === 'IPS_INITIATE') {
    return inbound
      ? {
          debit_account_id: GLOBAL_ACCOUNT_IDS.IPS_PENDING_INBOUND,
          credit_account_id: GLOBAL_ACCOUNT_IDS.COLLECTIONS_CLEARING,
        }
      : {
          debit_account_id: GLOBAL_ACCOUNT_IDS.DISBURSEMENT_CLEARING,
          credit_account_id: GLOBAL_ACCOUNT_IDS.IPS_PENDING_OUTBOUND,
        };
  }

  if (eventType === 'IPS_REVERSE') {
    return inbound
      ? {
          debit_account_id: GLOBAL_ACCOUNT_IDS.COLLECTIONS_CLEARING,
          credit_account_id: GLOBAL_ACCOUNT_IDS.IPS_PENDING_INBOUND,
        }
      : {
          debit_account_id: GLOBAL_ACCOUNT_IDS.IPS_PENDING_OUTBOUND,
          credit_account_id: GLOBAL_ACCOUNT_IDS.DISBURSEMENT_CLEARING,
        };
  }

  return inbound
    ? {
        debit_account_id: GLOBAL_ACCOUNT_IDS.IPS_PENDING_INBOUND,
        credit_account_id: GLOBAL_ACCOUNT_IDS.COLLECTIONS_CLEARING,
      }
    : {
        debit_account_id: GLOBAL_ACCOUNT_IDS.IPS_PENDING_OUTBOUND,
        credit_account_id: GLOBAL_ACCOUNT_IDS.BANK_SETTLEMENT,
      };
}

async function postTigerBeetle(path: string, body: Record<string, unknown>) {
  if (!TB_BASE_URL) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('TigerBeetle HTTP URL is required in production.');
    }
    return { simulated: true };
  }

  const response = await fetch(`${TB_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`TigerBeetle HTTP ${response.status} for ${path}: ${text.slice(0, 300)}`);
  }

  return { simulated: false };
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

function assertTransferAmountAndCode(amount: unknown, code: unknown, label: string) {
  const amountNumber = Number(amount);
  const codeNumber = Number(code);
  if (!Number.isInteger(amountNumber) || amountNumber <= 0) {
    throw new Error(`${label} has invalid amount.`);
  }
  if (!Number.isInteger(codeNumber) || codeNumber <= 0) {
    throw new Error(`${label} has invalid TigerBeetle code.`);
  }
  return { amountCents: amountNumber, code: codeNumber };
}

async function processEntry(entry: OutboxEntry): Promise<ProcessedTransfer[]> {
  const { eventType, payload } = entry;
  const transfersPosted: ProcessedTransfer[] = [];

  switch (eventType) {
    case 'CREATE_ACCOUNT': {
      // POST account creation to TigerBeetle
      await postTigerBeetle('/accounts', { id: idToTBId(entry.sourceId) });
      break;
    }

    case 'DISBURSEMENT': {
      const transferId = idToTBId(entry.sourceId);
      const transferCode = Number(payload.transfer_code ?? 1001);
      const { amountCents, code } = assertTransferAmountAndCode(
        payload.amount,
        transferCode,
        'DISBURSEMENT'
      );
      await postTigerBeetle('/transfers', {
        id: transferId,
        debit_account_id: GLOBAL_ACCOUNT_IDS.DISBURSEMENT_CLEARING,
        credit_account_id: idToTBId(payload.loan_id as string),
        amount: amountCents,
        code,
        ledger: 1,
      });
      transfersPosted.push({ id: transferId, amountCents, code });
      break;
    }

    case 'REPAYMENT': {
      const transfers =
        (payload.transfers as Array<{
          debit_type: string;
          credit_type: string;
          amount: number;
          code: number;
        }>) ?? [];
      if (transfers.length === 0) {
        throw new Error('REPAYMENT payload must include at least one transfer.');
      }

      for (let i = 0; i < transfers.length; i++) {
        const t = transfers[i];
        const { amountCents, code } = assertTransferAmountAndCode(
          t.amount,
          t.code,
          `REPAYMENT transfer ${i}`
        );
        const transferId = idToTBId(`${entry.sourceId}:${i}`);
        await postTigerBeetle('/transfers', {
          id: transferId,
          debit_account_id: GLOBAL_ACCOUNT_IDS[t.debit_type] ?? t.debit_type,
          credit_account_id: GLOBAL_ACCOUNT_IDS[t.credit_type] ?? t.credit_type,
          amount: amountCents,
          code,
          ledger: 1,
        });
        transfersPosted.push({ id: transferId, amountCents, code });
      }
      break;
    }

    case 'IPS_INITIATE':
    case 'IPS_COMPLETE':
    case 'IPS_REVERSE':
    case 'LATE_FEE': {
      const transferId = idToTBId(entry.sourceId);
      const { amountCents, code } = assertTransferAmountAndCode(
        payload.amount,
        transferCodeFor(entry),
        eventType
      );
      await postTigerBeetle('/transfers', {
        id: transferId,
        ...ipsAccountsFor(eventType, payload.direction),
        amount: amountCents,
        code,
        ledger: 1,
        flags:
          eventType === 'IPS_INITIATE'
            ? 'pending'
            : eventType === 'IPS_REVERSE'
              ? 'void_pending'
              : 'post_pending',
      });
      transfersPosted.push({ id: transferId, amountCents, code });
      break;
    }

    default:
      throw new Error(`Unknown event type: ${eventType}`);
  }

  return transfersPosted;
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
        const transfersPosted = await processEntry(entry);

        await ctx.runMutation(internal.tigerbeetle.outbox.completeEntry, {
          entryId: entry._id,
          tbTransferIds: transfersPosted.map((transfer) => transfer.id),
        });

        // Record shadow transfers
        for (const transfer of transfersPosted) {
          const tbId = BigInt(transfer.id);
          await ctx.runMutation(internal.tigerbeetle.transfers.recordShadowTransfer, {
            tbTransferIdHigh: Number(tbId >> 64n),
            tbTransferIdLow: Number(tbId & 0xffffffffffffffffn),
            amount: transfer.amountCents / 100,
            tbLedger: 1,
            tbCode: transfer.code,
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
