import { describe, expect, it } from 'vitest';
import { formatNAD } from '@/utils/currency';
import {
  formatDti,
  formatMetadataValue,
  formatRequestTypeLabel,
  getApprovalDialogTitle,
  getCreditScoreBand,
  getRecommendationConfig,
  humanizeMetadataKey,
  isKycRequestType,
  isLoanRequestType,
  listMetadataRows,
  matchesRequestTypeFilter,
  parseLoanApprovalFields,
} from './approvalRequestView';

describe('approval request type helpers', () => {
  it('treats live Convex loan entityType and the legacy name as loan requests', () => {
    expect(isLoanRequestType('loan')).toBe(true);
    expect(isLoanRequestType('loan_application')).toBe(true);
    expect(isLoanRequestType('kyc')).toBe(false);
  });

  it('recognizes KYC packages', () => {
    expect(isKycRequestType('kyc')).toBe(true);
    expect(isKycRequestType('loan')).toBe(false);
  });

  it('matches the Loan Applications filter against both loan type names', () => {
    expect(matchesRequestTypeFilter('loan', 'loan')).toBe(true);
    expect(matchesRequestTypeFilter('loan_application', 'loan')).toBe(true);
    expect(matchesRequestTypeFilter('kyc', 'loan')).toBe(false);
    expect(matchesRequestTypeFilter('kyc', 'kyc')).toBe(true);
    expect(matchesRequestTypeFilter('loan', 'all')).toBe(true);
  });

  it('shows a short uppercase list label for loan and kyc', () => {
    expect(formatRequestTypeLabel('loan')).toBe('LOAN');
    expect(formatRequestTypeLabel('loan_application')).toBe('LOAN');
    expect(formatRequestTypeLabel('kyc')).toBe('KYC');
    expect(formatRequestTypeLabel('profile_update')).toBe('PROFILE UPDATE');
  });

  it('titles the review dialog by request type', () => {
    expect(getApprovalDialogTitle('loan')).toBe('Loan Review');
    expect(getApprovalDialogTitle('loan_application')).toBe('Loan Review');
    expect(getApprovalDialogTitle('kyc')).toBe('KYC Review');
    expect(getApprovalDialogTitle('payment')).toBe('Request Details');
  });
});

describe('loan approval field parsing', () => {
  const sample = {
    amount: 7890,
    creditScore: 640,
    dti: 0.030794411166894336,
    interestRate: 32,
    monthlyPayment: 2771.49700502049,
    recommendation: 'review',
    termMonths: 3,
  };

  it('extracts scoring metadata without requiring a nested JSON dump', () => {
    expect(parseLoanApprovalFields(sample)).toEqual({
      amount: 7890,
      monthlyPayment: 2771.49700502049,
      termMonths: 3,
      interestRate: 32,
      creditScore: 640,
      dti: 0.030794411166894336,
      recommendation: 'review',
    });
  });

  it('coerces numeric strings and ignores missing fields', () => {
    expect(parseLoanApprovalFields({ amount: '1500', termMonths: '6' })).toMatchObject({
      amount: 1500,
      termMonths: 6,
      monthlyPayment: null,
      recommendation: null,
    });
  });

  it('formats DTI ratios as a one-decimal percent', () => {
    expect(formatDti(0.030794411166894336)).toBe('3.1%');
    expect(formatDti(12.5)).toBe('12.5%');
  });

  it('bands credit scores for review display', () => {
    expect(getCreditScoreBand(800).label).toBe('Excellent');
    expect(getCreditScoreBand(700).label).toBe('Good');
    expect(getCreditScoreBand(640).label).toBe('Fair');
    expect(getCreditScoreBand(500).label).toBe('Poor');
  });

  it('maps underwriting recommendations to staff-facing badges', () => {
    expect(getRecommendationConfig('approve').label).toBe('Approve');
    expect(getRecommendationConfig('review').label).toBe('Manual Review');
    expect(getRecommendationConfig('reject').label).toBe('Reject');
  });
});

describe('generic metadata display', () => {
  it('humanizes camelCase and snake_case keys', () => {
    expect(humanizeMetadataKey('creditScore')).toBe('Credit Score');
    expect(humanizeMetadataKey('termMonths')).toBe('Term Months');
    expect(humanizeMetadataKey('required_document_types')).toBe('Required Document Types');
  });

  it('formats money, rates, booleans, and lists without raw JSON', () => {
    expect(formatMetadataValue('amount', 7890)).toBe(formatNAD(7890));
    expect(formatMetadataValue('interestRate', 32)).toBe('32%');
    expect(formatMetadataValue('userVerified', true)).toBe('Yes');
    expect(formatMetadataValue('requiredDocumentTypes', ['id_card', 'proof_income'])).toBe(
      'id_card, proof_income'
    );
    expect(formatMetadataValue('nested', { amount: 1 })).toBeNull();
  });

  it('lists only primitive metadata rows for unknown request types', () => {
    const rows = listMetadataRows({
      amount: 100,
      nested: { skip: true },
      note: 'staff flagged',
    });
    expect(rows.map((row) => row.key)).toEqual(['amount', 'note']);
    expect(rows[0]?.value).toBe(formatNAD(100));
    expect(rows[1]?.value).toBe('staff flagged');
  });
});
