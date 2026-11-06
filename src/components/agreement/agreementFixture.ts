/**
 * TEST DATA for agreement UI tests, built with the real merge logic so the UI is tested
 * against exactly what the backend produces.
 */
import type { Doc } from '../../../convex/_generated/dataModel';
import { buildAgreement } from '../../../convex/lib/agreement/merge';
import { OG_STANDARD_TERMS_V1 } from '../../../convex/lib/agreement/standardTerms';

export function agreementFixture(
  opts: { termMonths?: number; profile?: Partial<Doc<'profiles'>> } = {}
) {
  const loan = {
    loanNumber: 'OGFS-2026-000007',
    principal: 5000,
    interestRate: 24,
    termMonths: opts.termMonths ?? 3,
    status: 'approved',
  } as Doc<'loans'>;
  const profile = {
    fullName: 'Ndapewa Test Shilongo',
    firstNames: 'Ndapewa Test',
    surname: 'Shilongo',
    clientNumber: '000001',
    idNumber: '90010112345',
    phone: '+264 81 555 0101',
    addressLine1: '12 Test Street',
    city: 'Windhoek',
    employerName: 'Test Employer',
    workAddress: '1 Test Avenue',
    bankName: 'Test Bank',
    accountHolderName: 'Ndapewa Test Shilongo',
    accountNumber: '62012345678',
    accountType: 'Savings',
    branchCode: '280172',
    ...opts.profile,
  } as Doc<'profiles'>;
  const built = buildAgreement({
    loan,
    profile,
    settings: null,
    template: null,
    pricing: {},
    agreementDate: '2026-11-05',
    firstRepaymentDate: '2026-12-05',
  });
  return { built, template: OG_STANDARD_TERMS_V1 };
}
