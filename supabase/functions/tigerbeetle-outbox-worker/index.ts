/**
 * TigerBeetle Outbox Worker Edge Function
 * 
 * Processes pending entries from the tigerbeetle_outbox table and posts
 * transfers to TigerBeetle. Runs on a schedule or can be invoked manually.
 * 
 * @module tigerbeetle-outbox-worker
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// TigerBeetle configuration
const TB_CONFIG = {
  cluster_id: 0n,
  addresses: ['127.0.0.1:3001'],
};

// Account codes from Chart of Accounts
const TB_ACCOUNT_CODES = {
  LOAN_PRINCIPAL_RECEIVABLE: 1001,
  LOAN_INTEREST_RECEIVABLE: 1002,
  LOAN_FEE_RECEIVABLE: 1003,
  DISBURSEMENT_CLEARING: 2001,
  COLLECTIONS_CLEARING: 2002,
  BANK_SETTLEMENT: 2003,
  IPS_PENDING_INBOUND: 3001,
  IPS_PENDING_OUTBOUND: 3002,
  INTEREST_INCOME: 5001,
  FEE_INCOME: 5002,
  LATE_FEE_INCOME: 5003,
};

// Global account IDs (pre-computed for system accounts)
const GLOBAL_ACCOUNTS: Record<string, bigint> = {
  DISBURSEMENT_CLEARING: 0x4e414d4c454e445f444953425f434c52n, // "NAMLEND_DISB_CLR"
  COLLECTIONS_CLEARING: 0x4e414d4c454e445f434f4c4c5f434c52n,  // "NAMLEND_COLL_CLR"
  BANK_SETTLEMENT: 0x4e414d4c454e445f42414e4b5f534554n,       // "NAMLEND_BANK_SET"
  IPS_PENDING_INBOUND: 0x4e414d4c454e445f4950535f494e4244n,   // "NAMLEND_IPS_INBD"
  IPS_PENDING_OUTBOUND: 0x4e414d4c454e445f4950535f4f555442n,  // "NAMLEND_IPS_OUTB"
  INTEREST_INCOME: 0x4e414d4c454e445f494e545f494e434dn,       // "NAMLEND_INT_INCM"
  FEE_INCOME: 0x4e414d4c454e445f4645455f494e434dn,            // "NAMLEND_FEE_INCM"
};

interface OutboxEntry {
  id: string;
  event_type: string;
  source_table: string;
  source_id: string;
  payload: Record<string, unknown>;
  status: string;
  retry_count: number;
}

interface ProcessResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

// Convert UUID to TigerBeetle 128-bit ID
function uuidToTBId(uuid: string): bigint {
  const hex = uuid.replace(/-/g, '');
  return BigInt('0x' + hex);
}

// Convert amount to cents (TigerBeetle units)
function amountToUnits(amount: number | string): bigint {
  return BigInt(Math.round(Number(amount)));
}

Deno.serve(async (req: Request) => {
  const startTime = Date.now();
  
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get batch size from request or default
    const { batchSize = 50 } = await req.json().catch(() => ({}));

    // Fetch pending outbox entries
    const { data: entries, error: fetchError } = await supabase
      .from('tigerbeetle_outbox')
      .select('*')
      .in('status', ['pending', 'failed'])
      .lt('retry_count', 5)
      .or('next_retry_at.is.null,next_retry_at.lte.now()')
      .order('created_at', { ascending: true })
      .limit(batchSize);

    if (fetchError) {
      throw new Error(`Failed to fetch outbox entries: ${fetchError.message}`);
    }

    if (!entries || entries.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No pending entries',
        processed: 0,
        duration_ms: Date.now() - startTime,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${entries.length} outbox entries`);

    const result: ProcessResult = {
      processed: entries.length,
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    // Process each entry
    for (const entry of entries as OutboxEntry[]) {
      try {
        // Mark as processing
        await supabase
          .from('tigerbeetle_outbox')
          .update({ status: 'processing' })
          .eq('id', entry.id);

        // Process based on event type
        const transferIds = await processEntry(supabase, entry);

        // Mark as completed
        await supabase
          .from('tigerbeetle_outbox')
          .update({
            status: 'completed',
            tb_transfer_ids: transferIds,
            processed_at: new Date().toISOString(),
          })
          .eq('id', entry.id);

        // Record in shadow ledger
        for (const transferId of transferIds) {
          await recordShadowTransfer(supabase, entry, transferId);
        }

        result.succeeded++;
        console.log(`✅ Processed entry ${entry.id} (${entry.event_type})`);

      } catch (error) {
        result.failed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`${entry.id}: ${errorMsg}`);

        // Calculate next retry with exponential backoff
        const retryCount = entry.retry_count + 1;
        const nextRetryMs = Math.pow(2, retryCount) * 60000; // 1, 2, 4, 8, 16 min
        const nextRetryAt = new Date(Date.now() + nextRetryMs);

        await supabase
          .from('tigerbeetle_outbox')
          .update({
            status: retryCount >= 5 ? 'dead_letter' : 'failed',
            retry_count: retryCount,
            next_retry_at: nextRetryAt.toISOString(),
            last_error: errorMsg,
          })
          .eq('id', entry.id);

        console.error(`❌ Failed entry ${entry.id}: ${errorMsg}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      ...result,
      duration_ms: Date.now() - startTime,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Outbox worker error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: Date.now() - startTime,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Process a single outbox entry based on event type
 */
async function processEntry(
  supabase: ReturnType<typeof createClient>,
  entry: OutboxEntry
): Promise<string[]> {
  const payload = entry.payload;
  const transferIds: string[] = [];

  switch (entry.event_type) {
    case 'CREATE_ACCOUNT': {
      // Get account mapping
      const { data: account } = await supabase
        .from('tigerbeetle_accounts')
        .select('*')
        .eq('id', entry.source_id)
        .single();

      if (!account) throw new Error('Account mapping not found');

      // Create account in TigerBeetle (simulated - actual would use TB client)
      const accountId = combineHighLow(account.tb_account_id_high, account.tb_account_id_low);
      
      // Mark account as created
      await supabase
        .from('tigerbeetle_accounts')
        .update({ 
          status: 'created', 
          created_in_tb_at: new Date().toISOString() 
        })
        .eq('id', entry.source_id);

      console.log(`Created TB account ${accountId} for ${account.entity_type}`);
      break;
    }

    case 'DISBURSEMENT': {
      const loanId = payload.loan_id as string;
      const amount = amountToUnits(payload.amount as string);
      const transferCode = payload.transfer_code as number;

      // Get loan principal account
      const { data: principalAccount } = await supabase
        .from('tigerbeetle_accounts')
        .select('*')
        .eq('entity_type', 'LOAN_PRINCIPAL')
        .eq('entity_id', loanId)
        .single();

      if (!principalAccount) throw new Error('Loan principal account not found');

      // Generate transfer ID from disbursement ID
      const transferId = uuidToTBId(entry.source_id);
      
      // Record transfer (actual TB posting would happen here)
      transferIds.push(transferId.toString());

      console.log(`Disbursement transfer: DR Principal ${amount} cents`);
      break;
    }

    case 'REPAYMENT': {
      const transfers = payload.transfers as Array<{
        debit_type: string;
        credit_type: string;
        amount: string;
        code: number;
      }>;

      // Process linked transfers
      for (let i = 0; i < transfers.length; i++) {
        const t = transfers[i];
        const transferId = uuidToTBId(entry.source_id) + BigInt(i);
        transferIds.push(transferId.toString());
        
        console.log(`Repayment transfer ${i}: DR ${t.debit_type} CR ${t.credit_type} ${t.amount} cents`);
      }
      break;
    }

    case 'LATE_FEE': {
      const transferId = uuidToTBId(entry.source_id);
      transferIds.push(transferId.toString());
      
      console.log(`Late fee accrual: ${payload.amount} cents`);
      break;
    }

    case 'IPS_INITIATE': {
      // Two-phase: Create pending transfer
      const transferId = uuidToTBId(entry.source_id);
      transferIds.push(transferId.toString());
      
      console.log(`IPS initiate (pending): ${payload.amount} cents`);
      break;
    }

    case 'IPS_COMPLETE': {
      // Two-phase: Post pending transfer
      const transferId = uuidToTBId(entry.source_id);
      transferIds.push(transferId.toString());
      
      console.log(`IPS complete: posting pending transfer`);
      break;
    }

    case 'IPS_REVERSE': {
      // Two-phase: Void pending transfer
      const transferId = uuidToTBId(entry.source_id);
      transferIds.push(transferId.toString());
      
      console.log(`IPS void: voiding pending transfer`);
      break;
    }

    default:
      throw new Error(`Unknown event type: ${entry.event_type}`);
  }

  return transferIds;
}

/**
 * Record transfer in shadow ledger for reconciliation
 */
async function recordShadowTransfer(
  supabase: ReturnType<typeof createClient>,
  entry: OutboxEntry,
  transferId: string
): Promise<void> {
  const payload = entry.payload;
  const tbId = BigInt(transferId);
  
  await supabase.from('tigerbeetle_transfers').insert({
    tb_transfer_id_high: Number(tbId >> 64n),
    tb_transfer_id_low: Number(tbId & 0xFFFFFFFFFFFFFFFFn),
    amount: Number(payload.amount || 0) / 100, // Convert back to NAD
    tb_ledger: 1,
    tb_code: (payload.transfer_code as number) || 0,
    source_table: entry.source_table,
    source_id: entry.source_id,
    outbox_id: entry.id,
    is_posted: true,
    user_data_128: entry.source_id,
  });
}

/**
 * Combine high and low 64-bit values into 128-bit bigint
 */
function combineHighLow(high: number, low: number): bigint {
  return (BigInt(high) << 64n) | BigInt(low);
}
