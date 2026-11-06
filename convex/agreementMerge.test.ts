/**
 * Pure loan-agreement logic: dates, money formatting, the schedule, readiness, drift,
 * acceptance matching and the PDF renderer. No database. Test data only.
 *
 * Run: npm run test:convex
 */
import { PDFDocument } from 'pdf-lib';
import { describe, expect, test } from 'vitest';
import type { Doc, Id } from './_generated/dataModel';
import { generatePaymentSchedule } from './lib/amortization';
import {
  addMonthsClamped,
  buildAgreement,
  buildSchedule,
  driftedFields,
  formatNadCents,
  isIsoDate,
  namibianDate,
} from './lib/agreement/merge';
import { renderAgreementPdf } from './lib/agreement/render';
import { OG_STANDARD_TERMS_V1 } from './lib/agreement/standardTerms';
import { idLast4, normaliseName, validateProfileValue } from './lib/agreement/validation';

const loan = {
  _id: 'loan1' as Id<'loans'>,
  userId: 'u1' as Id<'users'>,
  loanNumber: 'OGFS-2026-000007',
  principal: 5000,
  interestRate: 24,
  termMonths: 3,
  monthlyPayment: 1733.77,
  status: 'approved',
  createdAt: 0,
  updatedAt: 0,
  _creationTime: 0,
} as unknown as Doc<'loans'>;

describe('dates', () => {
  test('month arithmetic clamps to the last day instead of overflowing', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsClamped('2028-01-31', 1)).toBe('2028-02-29'); // leap year
    expect(addMonthsClamped('2026-03-31', 1)).toBe('2026-04-30');
    expect(addMonthsClamped('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonthsClamped('2026-05-31', 0)).toBe('2026-05-31');
  });
  test('the calendar date is Windhoek time, not UTC', () => {
    expect(namibianDate(Date.UTC(2026, 11, 31, 22, 30))).toBe('2027-01-01');
    expect(namibianDate(Date.UTC(2026, 11, 31, 21, 30))).toBe('2026-12-31');
  });
  test('only real calendar dates are accepted', () => {
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('5 March')).toBe(false);
  });
});

describe('money', () => {
  test('formats from integer cents, independent of locale data', () => {
    expect(formatNadCents(0)).toBe('N$0.00');
    expect(formatNadCents(5)).toBe('N$0.05');
    expect(formatNadCents(173377)).toBe('N$1,733.77');
    expect(formatNadCents(123456789)).toBe('N$1,234,567.89');
  });
});

describe('schedule', () => {
  test('amounts are exactly the amortization engine’s; dates follow the agreed first repayment date', () => {
    const rows = buildSchedule(loan, '2026-01-31');
    const engine = generatePaymentSchedule(5000, 24, 3, new Date());
    expect(rows.map((r) => [r.principalDue, r.interestDue, r.totalDue])).toEqual(
      engine.map((r) => [r.principalDue, r.interestDue, r.totalDue])
    );
    expect(rows.map((r) => r.dueDate)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
    // Midday Windhoek renders as the same date in UTC and in UTC+10.
    for (const r of rows) {
      expect(new Date(r.dueDateMs).toISOString().slice(0, 10)).toBe(r.dueDate);
      expect(new Date(r.dueDateMs + 10 * 3600_000).toISOString().slice(0, 10)).toBe(r.dueDate);
    }
  });
});

describe('readiness', () => {
  const base = {
    loan,
    profile: null,
    settings: null,
    template: null,
    pricing: {},
    agreementDate: '2026-11-05',
  };
  test('nothing is invented: absent data is null and blocking', () => {
    const built = buildAgreement({ ...base, firstRepaymentDate: '2026-12-05' });
    const f = Object.fromEntries(built.fields.map((x) => [x.key, x.value]));
    expect(f.surname).toBeNull();
    expect(f.registeredName).toBeNull();
    expect(f.representativeName).toBeNull();
    const codes = new Set(built.issues.filter((i) => i.blocking).map((i) => i.code));
    expect([...codes].sort()).toEqual(['FIELD_MISSING', 'SETTINGS_MISSING', 'TEMPLATE_MISSING']);
  });
  test('without a first repayment date there is no schedule and money fields are blank', () => {
    const built = buildAgreement(base);
    expect(built.schedule).toEqual([]);
    const f = Object.fromEntries(built.fields.map((x) => [x.key, x.value]));
    expect(f.totalAmountRepayable).toBeNull();
    expect(built.issues.some((i) => i.fieldKey === 'firstRepaymentDate')).toBe(true);
  });
  test('a loan record that disagrees with the engine is flagged', () => {
    const built = buildAgreement({
      ...base,
      loan: { ...loan, monthlyPayment: 1700 } as Doc<'loans'>,
      firstRepaymentDate: '2026-12-05',
    });
    expect(built.issues.map((i) => i.code)).toContain('INSTALMENT_MISMATCH');
  });
  test('drift ignores execution fields but catches source changes', () => {
    const a = buildAgreement({ ...base, firstRepaymentDate: '2026-12-05' });
    const b = buildAgreement({
      ...base,
      firstRepaymentDate: '2026-12-05',
      agreementDate: '2026-11-09',
      placeOfSigning: 'Windhoek',
    });
    expect(driftedFields(a, b)).toEqual([]);
    const c = buildAgreement({
      ...base,
      loan: { ...loan, loanNumber: 'OGFS-2026-000008' } as Doc<'loans'>,
      firstRepaymentDate: '2026-12-05',
    });
    expect(driftedFields(a, c)).toEqual(['Loan reference']);
  });
});

describe('acceptance matching and field validation', () => {
  test('names compare by letters, not by spacing or case', () => {
    expect(normaliseName('  ndapewa   Test SHILONGO ')).toBe(
      normaliseName('Ndapewa Test Shilongo')
    );
    expect(normaliseName('van der Merwe')).not.toBe(normaliseName('Merwe'));
  });
  test('ID last four ignores separators', () => {
    expect(idLast4('900101 12345')).toBe('2345');
    expect(idLast4('p1234ab9')).toBe('34AB9'.slice(-4));
  });
  test('format rules', () => {
    expect(validateProfileValue('idNumber', '90010112345')).toBeNull();
    expect(validateProfileValue('idNumber', 'P1234567')).toBeNull();
    expect(validateProfileValue('idNumber', '123')).not.toBeNull();
    expect(validateProfileValue('phone', '+264 81 555 0101')).toBeNull();
    expect(validateProfileValue('accountType', 'Savings')).toBeNull();
    expect(validateProfileValue('accountType', 'Crypto')).not.toBeNull();
    expect(validateProfileValue('branchCode', '28017A')).not.toBeNull();
    expect(validateProfileValue('surname', 'van der Merwe')).toBeNull();
    expect(validateProfileValue('surname', "O'Neill-Shipanga")).toBeNull();
    expect(validateProfileValue('employeeNumber', '')).toBeNull(); // optional
    expect(validateProfileValue('workAddress', '')).not.toBeNull(); // required
  });
});

describe('PDF renderer', () => {
  const built = buildAgreement({
    loan,
    profile: {
      fullName: 'Test Borrower ǃNamib',
      firstNames: 'Test',
      surname: 'Borrower ǃNamib',
      idNumber: '90010112345',
    } as Doc<'profiles'>,
    settings: null,
    template: null,
    pricing: {},
    agreementDate: '2026-11-05',
    firstRepaymentDate: '2026-12-05',
  });
  const { issues: _i, ...snapshot } = built;
  const input = {
    agreementNumber: 'OGFS-2026-000007-AG1',
    templateVersion: 1,
    finalizedAt: Date.UTC(2026, 10, 5),
    snapshot,
    template: OG_STANDARD_TERMS_V1,
  };

  test('renders A4 pages with the terms and Schedule A, reproducibly', async () => {
    const a = await renderAgreementPdf(input);
    const b = await renderAgreementPdf(input);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true); // same input → same bytes → same SHA-256
    const doc = await PDFDocument.load(a);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(4);
    for (const page of doc.getPages())
      expect(page.getSize()).toEqual({ width: 595.28, height: 841.89 });
    expect(doc.getTitle()).toBe('Loan Agreement OGFS-2026-000007-AG1');
  });

  test('a name outside the PDF font’s character set does not fail the render', async () => {
    // "ǃ" (a click consonant) is not in WinAnsi; it must degrade, not throw.
    await expect(renderAgreementPdf(input)).resolves.toBeInstanceOf(Uint8Array);
  });

  test('the executed copy adds the acceptance record and hashes differently', async () => {
    const issued = await renderAgreementPdf(input);
    const executed = await renderAgreementPdf({
      ...input,
      acceptance: {
        acceptedAt: Date.UTC(2026, 10, 6, 9, 15),
        typedName: 'Test Borrower',
        idNumberLast4: '2345',
        placeOfSigning: 'Windhoek',
        documentSha256: 'a'.repeat(64),
        consentRecordId: 'consent123',
      },
    });
    expect(Buffer.from(issued).equals(Buffer.from(executed))).toBe(false);
    expect((await PDFDocument.load(executed)).getPageCount()).toBeGreaterThanOrEqual(
      (await PDFDocument.load(issued)).getPageCount()
    );
  });
});
