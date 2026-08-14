import { formatNAD } from '@/utils/currency';

export interface ApprovalRequest {
  id: string;
  /** Convex entityType field */
  request_type: string;
  entity_id: string;
  requested_by: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated' | 'withdrawn';
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'normal';
  /** Convex metadata field — accessed through typed formatters */
  request_data: Record<string, unknown>;
  reviewer_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LoanApprovalFields {
  amount: number | null;
  monthlyPayment: number | null;
  termMonths: number | null;
  interestRate: number | null;
  creditScore: number | null;
  dti: number | null;
  recommendation: string | null;
}

export interface MetadataDisplayRow {
  key: string;
  label: string;
  value: string;
}

export interface CreditScoreBand {
  label: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  className: string;
}

export interface RecommendationConfig {
  label: string;
  className: string;
}

const MONEY_KEY_PATTERN = /(amount|payment|income|principal|repayment|balance|fee)/i;
const RATE_KEY_PATTERN = /(rate|apr|interest)/i;
const DTI_KEY_PATTERN = /dti/i;

export function isLoanRequestType(type: string): boolean {
  return type === 'loan' || type === 'loan_application';
}

export function isKycRequestType(type: string): boolean {
  return type === 'kyc';
}

export function matchesRequestTypeFilter(requestType: string, filterType: string): boolean {
  if (filterType === 'all') return true;
  if (filterType === 'loan') return isLoanRequestType(requestType);
  return requestType === filterType;
}

export function formatRequestTypeLabel(type: string): string {
  if (isLoanRequestType(type)) return 'LOAN';
  return type.replace(/_/g, ' ').toUpperCase();
}

export function getApprovalDialogTitle(type: string): string {
  if (isLoanRequestType(type)) return 'Loan Review';
  if (isKycRequestType(type)) return 'KYC Review';
  return 'Request Details';
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function parseLoanApprovalFields(data: Record<string, unknown>): LoanApprovalFields {
  const recommendation =
    typeof data.recommendation === 'string' && data.recommendation.trim() !== ''
      ? data.recommendation
      : null;

  return {
    amount: asFiniteNumber(data.amount),
    monthlyPayment: asFiniteNumber(data.monthlyPayment),
    termMonths: asFiniteNumber(data.termMonths),
    interestRate: asFiniteNumber(data.interestRate),
    creditScore: asFiniteNumber(data.creditScore),
    dti: asFiniteNumber(data.dti),
    recommendation,
  };
}

export function formatDti(dti: number): string {
  const percent = dti <= 1 ? dti * 100 : dti;
  return `${percent.toFixed(1)}%`;
}

export function getCreditScoreBand(score: number): CreditScoreBand {
  if (score >= 750) return { label: 'Excellent', className: 'text-green-600' };
  if (score >= 670) return { label: 'Good', className: 'text-blue-600' };
  if (score >= 580) return { label: 'Fair', className: 'text-yellow-600' };
  return { label: 'Poor', className: 'text-red-600' };
}

export function getRecommendationConfig(recommendation: string): RecommendationConfig {
  const normalized = recommendation.toLowerCase();
  if (normalized === 'approve') {
    return {
      label: 'Approve',
      className: 'bg-green-100 text-green-800 border-green-200',
    };
  }
  if (normalized === 'reject') {
    return {
      label: 'Reject',
      className: 'bg-red-100 text-red-800 border-red-200',
    };
  }
  return {
    label: 'Manual Review',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };
}

export function humanizeMetadataKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function formatMetadataValue(key: string, value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (isPlainObject(value)) return null;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    const items = value
      .map((item) => (typeof item === 'string' || typeof item === 'number' ? String(item) : null))
      .filter((item): item is string => item !== null);
    return items.length > 0 ? items.join(', ') : null;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    if (DTI_KEY_PATTERN.test(key)) return formatDti(value);
    if (MONEY_KEY_PATTERN.test(key)) return formatNAD(value);
    if (RATE_KEY_PATTERN.test(key)) return `${value}%`;
    return String(value);
  }
  if (typeof value === 'string') return value;
  return null;
}

export function listMetadataRows(data: Record<string, unknown>): MetadataDisplayRow[] {
  const rows: MetadataDisplayRow[] = [];
  for (const [key, raw] of Object.entries(data)) {
    const value = formatMetadataValue(key, raw);
    if (value === null) continue;
    rows.push({
      key,
      label: humanizeMetadataKey(key),
      value,
    });
  }
  return rows;
}
