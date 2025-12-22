import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TigerBeetleBalance {
  principal: number;
  interest: number;
  fees: number;
  total: number;
  currency: string;
}

interface AccountMapping {
  id: string;
  entity_type: string;
  entity_id: string;
  account_type: string;
  tb_account_id_high: string;
  tb_account_id_low: string;
  status: string;
}

interface TransferRecord {
  debit_amount: number;
  credit_amount: number;
  account_type: string;
}

/**
 * Fetch TigerBeetle balance for a loan
 * Uses shadow ledger (tigerbeetle_transfers) for browser-safe balance reads
 * 
 * In Phase 2+, this will call an Edge Function to read directly from TigerBeetle
 */
export async function getLoanBalance(loanId: string): Promise<TigerBeetleBalance> {
  // Get account mappings for this loan
  const { data: accounts, error: accountError } = await supabase
    .from('tigerbeetle_accounts')
    .select('*')
    .eq('entity_type', 'loan')
    .eq('entity_id', loanId);

  if (accountError) {
    console.warn('TigerBeetle account lookup failed, falling back to Supabase:', accountError);
    return getFallbackBalance(loanId);
  }

  if (!accounts || accounts.length === 0) {
    // Loan not yet in TigerBeetle, use Supabase fallback
    return getFallbackBalance(loanId);
  }

  // Get transfers from shadow ledger for these accounts
  const accountIds = accounts.map((a: AccountMapping) => a.id);
  
  const { data: transfers, error: transferError } = await supabase
    .from('tigerbeetle_transfers')
    .select('debit_amount, credit_amount, account_type')
    .in('account_id', accountIds)
    .eq('status', 'posted');

  if (transferError) {
    console.warn('TigerBeetle transfer lookup failed:', transferError);
    return getFallbackBalance(loanId);
  }

  // Calculate balances from transfers
  let principal = 0;
  let interest = 0;
  let fees = 0;

  for (const transfer of (transfers || []) as TransferRecord[]) {
    const netAmount = (transfer.debit_amount || 0) - (transfer.credit_amount || 0);
    
    switch (transfer.account_type) {
      case 'principal':
        principal += netAmount;
        break;
      case 'interest':
        interest += netAmount;
        break;
      case 'fees':
        fees += netAmount;
        break;
    }
  }

  return {
    principal: principal / 100, // Convert cents to NAD
    interest: interest / 100,
    fees: fees / 100,
    total: (principal + interest + fees) / 100,
    currency: 'NAD',
  };
}

/**
 * Fallback to Supabase loan_balance_summary view
 */
async function getFallbackBalance(loanId: string): Promise<TigerBeetleBalance> {
  const { data, error } = await supabase
    .from('loan_balance_summary')
    .select('*')
    .eq('loan_id', loanId)
    .single();

  if (error || !data) {
    return {
      principal: 0,
      interest: 0,
      fees: 0,
      total: 0,
      currency: 'NAD',
    };
  }

  return {
    principal: data.principal_balance || 0,
    interest: data.interest_balance || 0,
    fees: data.fees_balance || 0,
    total: data.total_balance || 0,
    currency: 'NAD',
  };
}

/**
 * React Query hook for TigerBeetle balance
 */
export function useTigerBeetleBalance(loanId: string | undefined) {
  return useQuery({
    queryKey: ['tigerbeetle-balance', loanId],
    queryFn: () => getLoanBalance(loanId!),
    enabled: !!loanId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Get multiple loan balances at once
 */
export async function getLoanBalances(loanIds: string[]): Promise<Map<string, TigerBeetleBalance>> {
  const balances = new Map<string, TigerBeetleBalance>();
  
  // Fetch in parallel
  const results = await Promise.all(
    loanIds.map(async (id) => ({
      id,
      balance: await getLoanBalance(id),
    }))
  );

  for (const { id, balance } of results) {
    balances.set(id, balance);
  }

  return balances;
}

export default useTigerBeetleBalance;
