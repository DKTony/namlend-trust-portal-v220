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
}

// Loan-related TigerBeetle account types (matches tigerbeetle_accounts.entity_type)
const LOAN_ACCOUNT_TYPES = ['LOAN_PRINCIPAL', 'LOAN_INTEREST', 'LOAN_FEES'] as const;

interface TransferRecord {
  amount: number;
  debit_account_id: string;
  credit_account_id: string;
  is_posted: boolean;
}

/**
 * Fetch TigerBeetle balance for a loan
 * Uses shadow ledger (tigerbeetle_transfers) for browser-safe balance reads
 * 
 * In Phase 2+, this will call an Edge Function to read directly from TigerBeetle
 */
export async function getLoanBalance(loanId: string): Promise<TigerBeetleBalance> {
  // Get account mappings for this loan - use LOAN_* entity types, not 'loan'
  const { data: accounts, error: accountError } = await supabase
    .from('tigerbeetle_accounts')
    .select('id, entity_type')
    .in('entity_type', LOAN_ACCOUNT_TYPES)
    .eq('entity_id', loanId);

  if (accountError) {
    console.warn('TigerBeetle account lookup failed, falling back to Supabase:', accountError);
    return getFallbackBalance(loanId);
  }

  if (!accounts || accounts.length === 0) {
    // Loan not yet in TigerBeetle, use Supabase fallback
    return getFallbackBalance(loanId);
  }

  // Build a map of account IDs to their entity_type for categorization
  const accountIdToType = new Map<string, string>();
  for (const account of accounts as AccountMapping[]) {
    accountIdToType.set(account.id, account.entity_type);
  }
  const accountIds = accounts.map((a: AccountMapping) => a.id);
  
  // Get transfers from shadow ledger where these accounts are debited or credited
  const { data: transfers, error: transferError } = await supabase
    .from('tigerbeetle_transfers')
    .select('amount, debit_account_id, credit_account_id, is_posted')
    .or(`debit_account_id.in.(${accountIds.join(',')}),credit_account_id.in.(${accountIds.join(',')})`)
    .eq('is_posted', true);

  if (transferError) {
    console.warn('TigerBeetle transfer lookup failed:', transferError);
    return getFallbackBalance(loanId);
  }

  // Calculate balances from transfers
  // Debits increase the balance (money owed), credits decrease it (payments received)
  let principal = 0;
  let interest = 0;
  let fees = 0;

  for (const transfer of (transfers || []) as TransferRecord[]) {
    const amount = Number(transfer.amount) || 0;
    
    // Check if this loan's accounts are debited (increases balance)
    if (transfer.debit_account_id && accountIds.includes(transfer.debit_account_id)) {
      const accountType = accountIdToType.get(transfer.debit_account_id);
      switch (accountType) {
        case 'LOAN_PRINCIPAL':
          principal += amount;
          break;
        case 'LOAN_INTEREST':
          interest += amount;
          break;
        case 'LOAN_FEES':
          fees += amount;
          break;
      }
    }
    
    // Check if this loan's accounts are credited (decreases balance - payment received)
    if (transfer.credit_account_id && accountIds.includes(transfer.credit_account_id)) {
      const accountType = accountIdToType.get(transfer.credit_account_id);
      switch (accountType) {
        case 'LOAN_PRINCIPAL':
          principal -= amount;
          break;
        case 'LOAN_INTEREST':
          interest -= amount;
          break;
        case 'LOAN_FEES':
          fees -= amount;
          break;
      }
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
