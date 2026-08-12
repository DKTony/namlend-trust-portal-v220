/**
 * Settlement System Types
 * Based on IPP Settlement (IRCS Back Office) Developer Implementation Guide
 */

// ============================================================================
// ENUMS
// ============================================================================

export type SettlementRunState =
  | 'collecting'
  | 'cutoff_reached'
  | 'prepare_inputs'
  | 'netting'
  | 'generated'
  | 'dispatched'
  | 'sent_to_swift'
  | 'swift_validated'
  | 'sent_to_niss'
  | 'niss_accepted'
  | 'failed_validation'
  | 'settled'
  | 'closed'
  | 'adjustment_pending';

export type ObligationCategory =
  | 'principal'
  | 'interchange'
  | 'switching_fee'
  | 'penalty'
  | 'adjustment';

export type SettlementBatchType = 'main' | 'switching_fee';

export type AckType = 'xsys_001' | 'xsys_002' | 'xsys_003';

export type SettlementReportType =
  | 'raw_data'
  | 'ntsl'
  | 'adjustment'
  | 'pending_adjustment_response'
  | 'pending_status'
  | 'timeout';

export type ParticipantType = 'direct' | 'sponsored';

// ============================================================================
// DATABASE TYPES
// ============================================================================

export interface SettlementParticipant {
  id: string;
  routing_code: string;
  swift_bic: string;
  name: string;
  participant_type: ParticipantType;
  sponsor_id: string | null;
  niss_account_ref: string | null;
  is_operator: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SettlementWindow {
  id: string;
  window_id: string;
  day_of_week: number;
  cutoff_time: string;
  enabled: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettlementHoliday {
  id: string;
  holiday_date: string;
  description: string | null;
  created_at: string;
}

export interface SettlementFeeRule {
  id: string;
  fee_type: string;
  product_type: string | null;
  rate_type: 'percentage' | 'fixed' | 'tiered';
  rate_value: number | null;
  rate_tiers: Record<string, unknown> | null;
  direction: string | null;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettlementRun {
  id: string;
  run_id: string;
  window_id: string;
  settlement_date: string;
  currency: string;
  scheme_version: string;
  state: SettlementRunState;
  amendment_seq: number;
  transaction_count: number;
  total_principal: number;
  total_interchange: number;
  total_switching_fee: number;
  net_instruction_count: number;
  cutoff_at: string | null;
  netting_completed_at: string | null;
  generated_at: string | null;
  dispatched_at: string | null;
  settled_at: string | null;
  closed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettlementObligation {
  id: string;
  run_id: string;
  source_participant_id: string;
  target_participant_id: string;
  source_settlement_id: string;
  target_settlement_id: string;
  category: ObligationCategory;
  amount: number;
  source_tx_id: string | null;
  fee_rule_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface SettlementNetInstruction {
  id: string;
  run_id: string;
  instruction_id: string;
  source_participant_id: string;
  target_participant_id: string;
  amount: number;
  category_group: string;
  batch_type: SettlementBatchType;
  end_to_end_id: string | null;
  created_at: string;
}

export interface SettlementPacs009Batch {
  id: string;
  run_id: string;
  batch_type: SettlementBatchType;
  msg_id: string;
  file_name: string;
  file_path: string | null;
  file_content: string | null;
  file_checksum: string | null;
  file_size: number | null;
  instruction_count: number;
  total_amount: number;
  status: string;
  dispatched_at: string | null;
  validated_at: string | null;
  accepted_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettlementAcknowledgement {
  id: string;
  msg_id: string;
  ack_type: AckType;
  batch_id: string | null;
  run_id: string | null;
  raw_payload: string | null;
  error_code: string | null;
  error_description: string | null;
  received_at: string;
  processed_at: string | null;
  correlation_keys: Record<string, unknown> | null;
  created_at: string;
}

export interface SettlementReport {
  id: string;
  run_id: string;
  participant_id: string | null;
  report_type: SettlementReportType;
  file_name: string;
  file_path: string | null;
  file_content: string | null;
  file_checksum: string | null;
  file_size: number | null;
  report_data: Record<string, unknown> | null;
  distributed_at: string | null;
  distribution_channel: string | null;
  created_at: string;
}

export interface SettlementAdjustment {
  id: string;
  run_id: string | null;
  original_tx_id: string | null;
  adjustment_type: string;
  source_participant_id: string;
  target_participant_id: string;
  amount: number;
  currency: string;
  reason_code: string | null;
  reason_description: string | null;
  status: string;
  response_required_by: string | null;
  responded_at: string | null;
  response_notes: string | null;
  settled_in_run_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettlementTimeoutTransaction {
  id: string;
  run_id: string | null;
  original_tx_id: string;
  participant_id: string;
  counterparty_id: string;
  amount: number;
  timeout_reason: string | null;
  status: string;
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettlementExposure {
  id: string;
  run_id: string;
  participant_id: string;
  gross_payables: number;
  gross_receivables: number;
  net_position: number;
  switching_fee_payable: number;
  interchange_net: number;
  calculated_at: string;
}

// ============================================================================
// VIEW/DISPLAY TYPES
// ============================================================================

export interface SettlementRunSummary {
  id: string;
  run_id: string;
  window_id: string;
  settlement_date: string;
  state: SettlementRunState;
  transaction_count: number;
  total_principal: number;
  total_interchange: number;
  total_switching_fee: number;
  net_instruction_count: number;
  created_at: string;
  settled_at: string | null;
}

export interface SettlementRunDetails {
  run: SettlementRun;
  batches: SettlementPacs009Batch[];
  acknowledgements: SettlementAcknowledgement[];
  net_instructions: NetInstructionDisplay[];
  exposures: ExposureDisplay[];
}

export interface NetInstructionDisplay {
  id: string;
  instruction_id: string;
  source: string;
  source_bic: string;
  target: string;
  target_bic: string;
  amount: number;
  category_group: string;
  batch_type: SettlementBatchType;
}

export interface ExposureDisplay {
  participant: string;
  gross_payables: number;
  gross_receivables: number;
  net_position: number;
  switching_fee_payable: number;
  interchange_net: number;
}

export interface Pacs009BatchDetails {
  batch: SettlementPacs009Batch;
  run: SettlementRun;
  instructions: Pacs009InstructionDisplay[];
}

export interface Pacs009InstructionDisplay {
  instruction_id: string;
  end_to_end_id: string | null;
  source: string;
  source_bic: string;
  target: string;
  target_bic: string;
  amount: number;
  category_group: string;
}

export interface ReportListItem {
  id: string;
  run_id: string;
  run_date: string;
  window_id: string;
  participant_name: string | null;
  report_type: SettlementReportType;
  file_name: string;
  file_size: number | null;
  distributed_at: string | null;
  created_at: string;
}

export interface AdjustmentListItem {
  id: string;
  run_id: string | null;
  run_date: string | null;
  adjustment_type: string;
  source_participant: string;
  target_participant: string;
  amount: number;
  reason_code: string | null;
  reason_description: string | null;
  status: string;
  response_required_by: string | null;
  created_at: string;
}

export interface TimeoutListItem {
  id: string;
  run_id: string | null;
  run_date: string | null;
  participant: string;
  counterparty: string;
  amount: number;
  timeout_reason: string | null;
  status: string;
  created_at: string;
}

export interface SettlementStatistics {
  period: {
    from: string;
    to: string;
  };
  runs: {
    total: number;
    settled: number;
    failed: number;
    pending: number;
  };
  totals: {
    principal: number;
    interchange: number;
    switching_fee: number;
    transactions: number;
  };
  adjustments: {
    pending: number;
    approved: number;
    total_amount: number;
  };
  timeouts: {
    pending: number;
    resolved: number;
  };
}

// ============================================================================
// UI CONSTANTS
// ============================================================================

export const SETTLEMENT_STATE_LABELS: Record<SettlementRunState, string> = {
  collecting: 'Collecting',
  cutoff_reached: 'Cutoff Reached',
  prepare_inputs: 'Preparing Inputs',
  netting: 'Netting',
  generated: 'Generated',
  dispatched: 'Dispatched',
  sent_to_swift: 'Sent to SWIFT',
  swift_validated: 'SWIFT Validated',
  sent_to_niss: 'Sent to NISS',
  niss_accepted: 'NISS Accepted',
  failed_validation: 'Failed Validation',
  settled: 'Settled',
  closed: 'Closed',
  adjustment_pending: 'Adjustment Pending',
};

export const SETTLEMENT_STATE_COLORS: Record<SettlementRunState, string> = {
  collecting: 'bg-blue-100  text-blue-800 ',
  cutoff_reached: 'bg-yellow-100  text-yellow-800 ',
  prepare_inputs: 'bg-yellow-100  text-yellow-800 ',
  netting: 'bg-yellow-100  text-yellow-800 ',
  generated: 'bg-purple-100  text-purple-800 ',
  dispatched: 'bg-purple-100  text-purple-800 ',
  sent_to_swift: 'bg-indigo-100  text-indigo-800 ',
  swift_validated: 'bg-indigo-100  text-indigo-800 ',
  sent_to_niss: 'bg-indigo-100  text-indigo-800 ',
  niss_accepted: 'bg-green-100  text-green-800 ',
  failed_validation: 'bg-red-100  text-red-800 ',
  settled: 'bg-green-100  text-green-800 ',
  closed: 'bg-gray-100  text-gray-800 ',
  adjustment_pending: 'bg-orange-100  text-orange-800 ',
};

export const REPORT_TYPE_LABELS: Record<SettlementReportType, string> = {
  raw_data: 'Raw Data Report',
  ntsl: 'Net Settlement Report (NTSL)',
  adjustment: 'Adjustment File',
  pending_adjustment_response: 'Pending Adjustment Response',
  pending_status: 'Pending Status Report',
  timeout: 'Timeout Report',
};

export const REPORT_TYPE_ICONS: Record<SettlementReportType, string> = {
  raw_data: 'FileText',
  ntsl: 'FileSpreadsheet',
  adjustment: 'FileWarning',
  pending_adjustment_response: 'FileClock',
  pending_status: 'FileQuestion',
  timeout: 'FileX',
};

export const ACK_TYPE_LABELS: Record<AckType, string> = {
  xsys_001: 'Negative Acknowledgement',
  xsys_002: 'Positive Acknowledgement',
  xsys_003: 'Abort Notification',
};

export const ACK_TYPE_COLORS: Record<AckType, string> = {
  xsys_001: 'bg-red-100  text-red-800 ',
  xsys_002: 'bg-green-100  text-green-800 ',
  xsys_003: 'bg-orange-100  text-orange-800 ',
};

export const BATCH_TYPE_LABELS: Record<SettlementBatchType, string> = {
  main: 'MNSB Settlement Batch',
  switching_fee: 'Switching Fee Batch',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function isSettlementFinal(state: SettlementRunState): boolean {
  return ['settled', 'closed', 'failed_validation'].includes(state);
}

export function isSettlementSuccess(state: SettlementRunState): boolean {
  return ['niss_accepted', 'settled', 'closed'].includes(state);
}

export function isSettlementInProgress(state: SettlementRunState): boolean {
  return [
    'collecting',
    'cutoff_reached',
    'prepare_inputs',
    'netting',
    'generated',
    'dispatched',
    'sent_to_swift',
    'swift_validated',
    'sent_to_niss',
  ].includes(state);
}

export function getSettlementProgress(state: SettlementRunState): number {
  const progressMap: Record<SettlementRunState, number> = {
    collecting: 5,
    cutoff_reached: 10,
    prepare_inputs: 20,
    netting: 30,
    generated: 40,
    dispatched: 50,
    sent_to_swift: 60,
    swift_validated: 70,
    sent_to_niss: 80,
    niss_accepted: 90,
    settled: 100,
    closed: 100,
    failed_validation: 0,
    adjustment_pending: 95,
  };
  return progressMap[state] || 0;
}

export function formatWindowId(windowId: string, date: string): string {
  const d = new Date(date);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${windowId} - ${dayNames[d.getDay()]} ${d.toLocaleDateString()}`;
}
