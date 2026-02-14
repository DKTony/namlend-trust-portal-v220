import { supabase } from '@/integrations/supabase/client';
import { LoanRecord, DisbursementPayload } from '@/types/services';
import { 
  ServiceResult, 
  withSingleResult, 
  withMeasuredServiceResult,
  mapResult 
} from '@/utils/serviceUtils';

export type LoanStatus = 'pending' | 'approved' | 'rejected' | 'disbursed';

export interface GetLoanByIdInput { loanId: string }
export interface UpdateLoanStatusInput { loanId: string; status: LoanStatus }
export interface CreateDisbursementInput {
  loanId: string;
  amount: number;
  method?: string;
  scheduled_at?: string; // ISO string
}

export async function getLoanById(
  { loanId }: GetLoanByIdInput
): Promise<ServiceResult<LoanRecord>> {
  return withSingleResult<LoanRecord>(
    () => supabase.from('loans').select('*').eq('id', loanId).single(),
    'getLoanById',
    'Loan not found',
    { loanId }
  );
}

export async function updateLoanStatus(
  { loanId, status }: UpdateLoanStatusInput
): Promise<ServiceResult<null>> {
  return withMeasuredServiceResult<null>(
    () => supabase
      .from('loans')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', loanId)
      .select(),
    'updateLoanStatus',
    { loanId, status }
  );
}

export async function createDisbursement(
  { loanId, amount, method, scheduled_at }: CreateDisbursementInput
): Promise<ServiceResult<string>> {
  const payload: DisbursementPayload = { loan_id: loanId, amount, status: 'pending' };
  if (method) payload.method = method;
  if (scheduled_at) payload.scheduled_at = scheduled_at;

  const result = await withMeasuredServiceResult<{ id: string }>(
    () => supabase.from('disbursements').insert([payload]).select('id').single(),
    'createDisbursement',
    { loanId, amount }
  );

  return mapResult(result, (data) => data.id);
}
