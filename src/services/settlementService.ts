/**
 * Settlement Service
 * Handles all settlement-related operations for the IRCS Back Office
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  SettlementRunSummary,
  SettlementRunDetails,
  Pacs009BatchDetails,
  ReportListItem,
  AdjustmentListItem,
  TimeoutListItem,
  SettlementStatistics,
  SettlementRunState,
  SettlementReportType,
  SettlementParticipant,
  SettlementPacs009Batch,
  SettlementReport,
  SettlementAdjustment,
  SettlementTimeoutTransaction,
} from '@/types/settlement';

// ============================================================================
// SETTLEMENT RUNS
// ============================================================================

/**
 * Get settlement runs with optional filters
 */
export async function getSettlementRuns(params?: {
  dateFrom?: string;
  dateTo?: string;
  state?: SettlementRunState;
  limit?: number;
}): Promise<SettlementRunSummary[]> {
  const { data, error } = await supabase.rpc('get_settlement_runs', {
    p_date_from: params?.dateFrom || null,
    p_date_to: params?.dateTo || null,
    p_state: params?.state || null,
    p_limit: params?.limit || 50,
  });

  if (error) {
    console.error('Error fetching settlement runs:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get detailed information about a settlement run
 */
export async function getSettlementRunDetails(
  runId: string
): Promise<SettlementRunDetails | null> {
  const { data, error } = await supabase.rpc('get_settlement_run_details', {
    p_run_id: runId,
  });

  if (error) {
    console.error('Error fetching settlement run details:', error);
    throw error;
  }

  return data as SettlementRunDetails | null;
}

// ============================================================================
// PACS.009 BATCHES
// ============================================================================

/**
 * Get pacs.009 batch details including instructions
 */
export async function getPacs009BatchDetails(
  batchId: string
): Promise<Pacs009BatchDetails | null> {
  const { data, error } = await supabase.rpc('get_pacs009_batch', {
    p_batch_id: batchId,
  });

  if (error) {
    console.error('Error fetching pacs.009 batch:', error);
    throw error;
  }

  return data as Pacs009BatchDetails | null;
}

/**
 * Get all pacs.009 batches for a run
 */
export async function getPacs009Batches(
  runId: string
): Promise<SettlementPacs009Batch[]> {
  const { data, error } = await supabase
    .from('settlement_pacs009_batches')
    .select('*')
    .eq('run_id', runId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching pacs.009 batches:', error);
    throw error;
  }

  return (data as SettlementPacs009Batch[]) || [];
}

// ============================================================================
// REPORTS
// ============================================================================

/**
 * Get settlement reports with optional filters
 */
export async function getSettlementReports(params?: {
  runId?: string;
  reportType?: SettlementReportType;
  participantId?: string;
}): Promise<ReportListItem[]> {
  const { data, error } = await supabase.rpc('get_settlement_reports', {
    p_run_id: params?.runId || null,
    p_report_type: params?.reportType || null,
    p_participant_id: params?.participantId || null,
  });

  if (error) {
    console.error('Error fetching settlement reports:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a specific report's content
 */
export async function getReportContent(
  reportId: string
): Promise<SettlementReport | null> {
  const { data, error } = await supabase
    .from('settlement_reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (error) {
    console.error('Error fetching report content:', error);
    throw error;
  }

  return data as SettlementReport | null;
}

// ============================================================================
// ADJUSTMENTS
// ============================================================================

/**
 * Get settlement adjustments with optional filters
 */
export async function getSettlementAdjustments(params?: {
  status?: string;
  runId?: string;
}): Promise<AdjustmentListItem[]> {
  const { data, error } = await supabase.rpc('get_settlement_adjustments', {
    p_status: params?.status || null,
    p_run_id: params?.runId || null,
  });

  if (error) {
    console.error('Error fetching adjustments:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a specific adjustment
 */
export async function getAdjustment(
  adjustmentId: string
): Promise<SettlementAdjustment | null> {
  const { data, error } = await supabase
    .from('settlement_adjustments')
    .select('*')
    .eq('id', adjustmentId)
    .single();

  if (error) {
    console.error('Error fetching adjustment:', error);
    throw error;
  }

  return data as SettlementAdjustment | null;
}

/**
 * Update adjustment status
 */
export async function updateAdjustmentStatus(
  adjustmentId: string,
  status: string,
  notes?: string
): Promise<void> {
  const { error } = await supabase
    .from('settlement_adjustments')
    .update({
      status,
      response_notes: notes,
      responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', adjustmentId);

  if (error) {
    console.error('Error updating adjustment:', error);
    throw error;
  }
}

// ============================================================================
// TIMEOUT TRANSACTIONS
// ============================================================================

/**
 * Get timeout transactions
 */
export async function getTimeoutTransactions(
  status?: string
): Promise<TimeoutListItem[]> {
  const { data, error } = await supabase.rpc('get_timeout_transactions', {
    p_status: status || 'pending',
  });

  if (error) {
    console.error('Error fetching timeout transactions:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a specific timeout transaction
 */
export async function getTimeoutTransaction(
  timeoutId: string
): Promise<SettlementTimeoutTransaction | null> {
  const { data, error } = await supabase
    .from('settlement_timeout_transactions')
    .select('*')
    .eq('id', timeoutId)
    .single();

  if (error) {
    console.error('Error fetching timeout transaction:', error);
    throw error;
  }

  return data as SettlementTimeoutTransaction | null;
}

/**
 * Resolve a timeout transaction
 */
export async function resolveTimeoutTransaction(
  timeoutId: string,
  status: 'resolved' | 'written_off',
  notes: string
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('settlement_timeout_transactions')
    .update({
      status,
      resolution_notes: notes,
      resolved_at: new Date().toISOString(),
      resolved_by: userData?.user?.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', timeoutId);

  if (error) {
    console.error('Error resolving timeout transaction:', error);
    throw error;
  }
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get settlement statistics for a date range
 */
export async function getSettlementStatistics(
  dateFrom?: string,
  dateTo?: string
): Promise<SettlementStatistics> {
  const { data, error } = await supabase.rpc('get_settlement_statistics', {
    p_date_from: dateFrom || null,
    p_date_to: dateTo || null,
  });

  if (error) {
    console.error('Error fetching settlement statistics:', error);
    throw error;
  }

  return data as SettlementStatistics;
}

// ============================================================================
// PARTICIPANTS
// ============================================================================

/**
 * Get all settlement participants
 */
export async function getSettlementParticipants(): Promise<
  SettlementParticipant[]
> {
  const { data, error } = await supabase
    .from('settlement_participants')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching participants:', error);
    throw error;
  }

  return (data as SettlementParticipant[]) || [];
}

/**
 * Get a specific participant
 */
export async function getParticipant(
  participantId: string
): Promise<SettlementParticipant | null> {
  const { data, error } = await supabase
    .from('settlement_participants')
    .select('*')
    .eq('id', participantId)
    .single();

  if (error) {
    console.error('Error fetching participant:', error);
    throw error;
  }

  return data as SettlementParticipant | null;
}

// ============================================================================
// ACKNOWLEDGEMENTS
// ============================================================================

/**
 * Get acknowledgements for a run
 */
export async function getAcknowledgements(runId: string) {
  const { data, error } = await supabase
    .from('settlement_acknowledgements')
    .select('*')
    .eq('run_id', runId)
    .order('received_at', { ascending: false });

  if (error) {
    console.error('Error fetching acknowledgements:', error);
    throw error;
  }

  return data || [];
}

// ============================================================================
// PACS.009 XML PARSING HELPERS
// ============================================================================

/**
 * Parse pacs.009 XML content for display
 */
export function parsePacs009Xml(xmlContent: string): {
  groupHeader: {
    msgId: string;
    creDtTm: string;
    nbOfTxs: number;
    ctrlSum: number;
    sttlmDt: string;
  };
  transactions: Array<{
    instrId: string;
    endToEndId: string;
    amount: number;
    currency: string;
    dbtrBic: string;
    cdtrBic: string;
  }>;
} | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');

    // Check for parsing errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      console.error('XML parsing error:', parseError.textContent);
      return null;
    }

    // Extract group header
    const grpHdr = doc.querySelector('GrpHdr');
    const groupHeader = {
      msgId: grpHdr?.querySelector('MsgId')?.textContent || '',
      creDtTm: grpHdr?.querySelector('CreDtTm')?.textContent || '',
      nbOfTxs: parseInt(grpHdr?.querySelector('NbOfTxs')?.textContent || '0'),
      ctrlSum: parseFloat(grpHdr?.querySelector('CtrlSum')?.textContent || '0'),
      sttlmDt:
        grpHdr?.querySelector('SttlmInf SttlmDt')?.textContent ||
        grpHdr?.querySelector('IntrBkSttlmDt')?.textContent ||
        '',
    };

    // Extract transactions
    const txnElements = doc.querySelectorAll('CdtTrfTxInf');
    const transactions = Array.from(txnElements).map((txn) => ({
      instrId: txn.querySelector('PmtId InstrId')?.textContent || '',
      endToEndId: txn.querySelector('PmtId EndToEndId')?.textContent || '',
      amount: parseFloat(
        txn.querySelector('IntrBkSttlmAmt')?.textContent || '0'
      ),
      currency:
        txn.querySelector('IntrBkSttlmAmt')?.getAttribute('Ccy') || 'NAD',
      dbtrBic:
        txn.querySelector('DbtrAgt FinInstnId BICFI')?.textContent || '',
      cdtrBic:
        txn.querySelector('CdtrAgt FinInstnId BICFI')?.textContent || '',
    }));

    return { groupHeader, transactions };
  } catch (error) {
    console.error('Error parsing pacs.009 XML:', error);
    return null;
  }
}

/**
 * Format XML for display with syntax highlighting
 */
export function formatXmlForDisplay(xmlContent: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');
    const serializer = new XMLSerializer();
    let formatted = serializer.serializeToString(doc);

    // Add indentation
    formatted = formatted
      .replace(/></g, '>\n<')
      .replace(/(<[^/][^>]*>)([^<]+)(<\/)/g, '$1\n  $2\n$3');

    return formatted;
  } catch {
    return xmlContent;
  }
}

// ============================================================================
// REPORT DATA HELPERS
// ============================================================================

/**
 * Parse NTSL report data
 */
export interface NTSLReportData {
  participant: string;
  participantBic: string;
  settlementDate: string;
  windowId: string;
  credits: number;
  debits: number;
  netPosition: number;
  interchangeOwed: number;
  interchangePaid: number;
  switchingFee: number;
  transactions: Array<{
    txId: string;
    counterparty: string;
    amount: number;
    type: 'credit' | 'debit';
    category: string;
  }>;
}

export function parseNTSLReport(
  reportData: Record<string, unknown>
): NTSLReportData | null {
  try {
    return reportData as unknown as NTSLReportData;
  } catch {
    return null;
  }
}

/**
 * Parse Raw Data report
 */
export interface RawDataReportEntry {
  txId: string;
  timestamp: string;
  remitterParticipant: string;
  beneficiaryParticipant: string;
  amount: number;
  currency: string;
  productType: string;
  status: string;
  interchangeAmount: number;
  switchingFee: number;
}

export function parseRawDataReport(
  reportData: Record<string, unknown>
): RawDataReportEntry[] {
  try {
    if (Array.isArray(reportData.transactions)) {
      return reportData.transactions as RawDataReportEntry[];
    }
    return [];
  } catch {
    return [];
  }
}
