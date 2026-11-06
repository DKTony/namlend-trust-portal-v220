/**
 * Loan agreement lifecycle (convex-test harness). Each `describe` maps to an acceptance
 * scenario in the brief (§11): A approval → contract, B missing information, C PDF,
 * D client delivery, E acceptance, F data consistency, G security and revision — plus
 * configuration governance, the disbursement gate and the audit trail.
 *
 * All borrower and company data below is TEST DATA. The clause wording used to resolve
 * the source document's drafting notes is a placeholder marked "TEST WORDING"; it is not
 * a proposal for the real contract.
 *
 * Run: npm run test:convex
 */
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { api } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { CREDIT_POLICY_KEY, DEFAULT_CREDIT_POLICY } from './lib/creditPolicy';
import { ensurePaymentSchedule } from './lib/scheduleGeneration';
import { SOURCE_COMPANY_DETAILS } from './lib/agreement/standardTerms';
import schema from './schema';

vi.stubEnv('CONVEX_SITE_URL', 'https://test.convex.site');
const modules = import.meta.glob('./**/*.*s');
type T = ReturnType<typeof convexTest>;
const as = (t: T, userId: Id<'users'>) => t.withIdentity({ subject: `${userId}|testsession` });
const settle = (t: T) => t.finishAllScheduledFunctions(() => vi.runAllTimers());

beforeEach(() => vi.useFakeTimers({ now: new Date('2026-11-05T08:00:00Z') }));
afterEach(() => vi.useRealTimers());

const COMPLETE_PROFILE = {
  fullName: 'Ndapewa Test Shilongo',
  firstNames: 'Ndapewa Test',
  surname: 'Shilongo',
  idNumber: '90010112345',
  phone: '+264 81 555 0101',
  addressLine1: '12 Test Street',
  city: 'Windhoek',
  postalCode: '10005',
  country: 'Namibia',
  employerName: 'Test Employer (Pty) Ltd',
  employeeNumber: 'EMP-0042',
  workAddress: '1 Test Avenue, Windhoek',
  bankName: 'Test Bank Namibia',
  accountHolderName: 'Ndapewa Test Shilongo',
  accountNumber: '62012345678',
  accountType: 'Savings',
  branchName: 'Maerua Mall',
  branchCode: '280172',
};

interface World {
  inst: Id<'institutions'>;
  admin: Id<'users'>;
  officer: Id<'users'>;
  borrower: Id<'users'>;
  stranger: Id<'users'>;
  otherAdmin: Id<'users'>;
  loanId: Id<'loans'>;
}

async function seedWorld(
  t: T,
  profile: Partial<typeof COMPLETE_PROFILE> = COMPLETE_PROFILE
): Promise<World> {
  return t.run(async (ctx) => {
    const now = Date.now();
    const inst = await ctx.db.insert('institutions', {
      name: 'OG Financial Services CC',
      shortCode: 'OGFS',
      type: 'lender',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    const other = await ctx.db.insert('institutions', {
      name: 'Other Lender',
      shortCode: 'OTHER',
      type: 'lender',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    const user = async (
      role: 'admin' | 'loan_officer' | 'client',
      institutionId: Id<'institutions'>,
      extra = {}
    ) => {
      const userId = await ctx.db.insert('users', {});
      await ctx.db.insert('profiles', {
        userId,
        institutionId,
        email: `${userId}@example.test`,
        kycStatus: 'verified',
        createdAt: now,
        updatedAt: now,
        ...extra,
      });
      await ctx.db.insert('userRoles', { userId, role, institutionId, createdAt: now });
      return userId;
    };
    const admin = await user('admin', inst);
    const officer = await user('loan_officer', inst);
    const borrower = await user('client', inst, { ...profile, clientNumber: '000001' });
    const stranger = await user('client', inst, { fullName: 'Other Client' });
    const otherAdmin = await user('admin', other);
    // Credit Policy is the fee source. 0% origination: this repayment engine charges no
    // fees, so a fee-free policy is the one an agreement can truthfully disclose.
    await ctx.db.insert('institutionConfig', {
      institutionId: inst,
      key: CREDIT_POLICY_KEY,
      value: { ...DEFAULT_CREDIT_POLICY, originationFeePercent: 0 },
      effectiveFrom: now - 1,
      version: 1,
      createdAt: now,
    });
    const loanId = await ctx.db.insert('loans', {
      userId: borrower,
      institutionId: inst,
      loanNumber: 'OGFS-2026-000007',
      principal: 5000,
      interestRate: 24,
      termMonths: 3,
      monthlyPayment: 1733.77,
      status: 'under_review',
      outstandingBalance: 5000,
      totalPaid: 0,
      creditScore: 720,
      debtToIncomeRatio: 0.2,
      recommendation: 'approve',
      monthlyIncome: 15000,
      monthlyExpenses: 3000,
      createdAt: now,
      updatedAt: now,
    });
    return { inst, admin, officer, borrower, stranger, otherAdmin, loanId };
  });
}

/** Import the Standard Terms, resolve the four drafting notes with TEST WORDING, approve. */
async function approveTerms(t: T, admin: Id<'users'>, existingV1?: Id<'agreementTemplates'>) {
  const a = as(t, admin);
  const v1 = existingV1 ?? (await a.mutation(api.loanAgreements.importSourceTemplate, {}));
  const v2 = await a.mutation(api.loanAgreements.reviseTemplate, {
    fromTemplateId: v1,
    clauses: [5, 13, 14, 15].map((n) => ({
      number: n,
      text: `TEST WORDING — final text for clause ${n} supplied by the test fixture.`,
    })),
    changeSummary: 'Test fixture: resolve drafting notes',
  });
  await a.mutation(api.loanAgreements.approveTemplate, { templateId: v2 });
  return v2;
}

async function approveSettings(t: T, admin: Id<'users'>) {
  const a = as(t, admin);
  await a.mutation(api.loanAgreements.saveSettings, {
    lender: { ...SOURCE_COMPANY_DETAILS.lender, website: 'https://example.test' },
    representativeName: 'Test Representative',
    representativeDesignation: 'Credit Manager',
    defaultRepaymentMethod: SOURCE_COMPANY_DETAILS.defaultRepaymentMethod,
    requireAcceptedAgreementForDisbursement: false,
  });
  await a.mutation(api.loanAgreements.approveSettings, {});
}

async function configure(t: T, w: World) {
  await approveTerms(t, w.admin);
  await approveSettings(t, w.admin);
}

/** Approve → finalize → render → send. Returns the agreement id. */
async function issue(t: T, w: World): Promise<Id<'loanAgreements'>> {
  await as(t, w.officer).mutation(api.loans.approveLoan, { loanId: w.loanId });
  const ws = await as(t, w.officer).query(api.loanAgreements.getWorkspace, { loanId: w.loanId });
  const id = ws.agreement!._id;
  await as(t, w.officer).mutation(api.loanAgreements.finalize, { agreementId: id });
  await settle(t);
  await as(t, w.officer).mutation(api.loanAgreements.send, { agreementId: id });
  await settle(t);
  return id;
}

const agreementRow = (t: T, id: Id<'loanAgreements'>) =>
  t.run((ctx) => ctx.db.get(id)) as Promise<Doc<'loanAgreements'>>;

// ---------------------------------------------------------------------------

describe('A — approval opens contract preparation', () => {
  test('approving a loan creates a populated draft agreement in the same transaction', async () => {
    const t = convexTest(schema, modules);
    const w = await seedWorld(t);
    await configure(t, w);
    await as(t, w.officer).mutation(api.loans.approveLoan, { loanId: w.loanId });

    const ws = await as(t, w.officer).query(api.loanAgreements.getWorkspace, { loanId: w.loanId });
    expect(ws.agreement).toMatchObject({
      status: 'draft',
      version: 1,
      isCurrent: true,
      agreementNumber: 'OGFS-2026-000007-AG1',
    });
    const f = Object.fromEntries(ws.view!.fields.map((x) => [x.key, x.value]));
    expect(f).toMatchObject({
      clientNumber: '000001',
      surname: 'Shilongo',
      firstNames: 'Ndapewa Test',
      idNumber: '90010112345',
      accountType: 'Savings',
      branchCode: '280172',
      loanReference: 'OGFS-2026-000007',
      creditAmount: 'N$5,000.00',
      interestRate: '24% per annum',
      repaymentMethod: 'EFT/CASH',
      registeredName: 'OG Financial Services CC',
      representativeName: 'Test Representative',
    });
    expect(ws.view!.schedule).toHaveLength(3);
    expect(ws.view!.issues.filter((i) => i.blocking)).toEqual([]);
  });

  test('a loan approved before the feature can have its agreement generated', async () => {
    const t = convexTest(schema, modules);
    const w = await seedWorld(t);
    await t.run((ctx) => ctx.db.patch(w.loanId, { status: 'approved' }));
    const id = await as(t, w.officer).mutation(api.loanAgreements.generateForLoan, {
      loanId: w.loanId,
    });
    expect((await agreementRow(t, id)).status).toBe('draft');
  });
});

describe('Configuration governance', () => {
  test('nothing can be finalized until terms and settings are approved', async () => {
    const t = convexTest(schema, modules);
    const w = await seedWorld(t);
    await as(t, w.officer).mutation(api.loans.approveLoan, { loanId: w.loanId });
    const ws = await as(t, w.officer).query(api.loanAgreements.getWorkspace, { loanId: w.loanId });
    const codes = ws.view!.issues.map((i) => i.code);
    expect(codes).toEqual(expect.arrayContaining(['TEMPLATE_MISSING', 'SETTINGS_MISSING']));
    await expect(
      as(t, w.officer).mutation(api.loanAgreements.finalize, { agreementId: ws.agreement!._id })
    ).rejects.toMatchObject({ data: { code: 'NOT_READY' } });
  });

  test('the source terms cannot be approved while drafting notes remain', async () => {
    const t = convexTest(schema, modules);
    const w = await seedWorld(t);
    const v1 = await as(t, w.admin).mutation(api.loanAgreements.importSourceTemplate, {});
    await expect(
      as(t, w.admin).mutation(api.loanAgreements.approveTemplate, { templateId: v1 })
    ).rejects.toMatchObject({ data: { code: 'NOT_READY' } });
    const settings = await as(t, w.admin).query(api.loanAgreements.getSettings, {});
    expect(settings.templates[0].unresolvedNotes.map((n) => n.clause)).toEqual([5, 13, 14, 15]);
    // v1 stays verbatim; the revision is a new version.
    await approveTerms(t, w.admin, v1);
    const after = await as(t, w.admin).query(api.loanAgreements.getSettings, {});
    expect(after.templates.map((x) => [x.version, x.status])).toEqual([
      [2, 'approved'],
      [1, 'draft'],
    ]);
  });

  test('a Credit Policy fee the repayment engine does not charge blocks issue', async () => {
    const t = convexTest(schema, modules);
    const w = await seedWorld(t);
    await configure(t, w);
    expect(
      (await as(t, w.admin).query(api.loanAgreements.getSettings, {})).issues.filter(
        (i) => i.blocking
      )
    ).toEqual([]);
    // The default policy's 2% origination fee is configured but never collected.
    await t.run(async (ctx) => {
      const row = await ctx.db
        .query('institutionConfig')
        .withIndex('by_institution_key', (q) =>
          q.eq('institutionId', w.inst).eq('key', CREDIT_POLICY_KEY)
        )
        .first();
      await ctx.db.patch(row!._id, {
        value: { ...DEFAULT_CREDIT_POLICY, originationFeePercent: 2 },
      });
    });
    const s = await as(t, w.admin).query(api.loanAgreements.getSettings, {});
    expect(s.creditPolicyFees.originationFeePercent).toBe(2);
    expect(s.issues.find((i) => i.code === 'FEES_NOT_SUPPORTED')?.message).toMatch(
      /2% origination fee/
    );
    await as(t, w.officer).mutation(api.loans.approveLoan, { loanId: w.loanId });
    const ws = await as(t, w.officer).query(api.loanAgreements.getWorkspace, { loanId: w.loanId });
    await expect(
      as(t, w.officer).mutation(api.loanAgreements.finalize, { agreementId: ws.agreement!._id })
    ).rejects.toMatchObject({ data: { code: 'NOT_READY' } });
  });

  test('with no saved Credit Policy the 0% default charges no fee and does not block issue', async () => {
    // Decision 2026-11-06: no origination fee, because the repayment engine collects none.
    expect(DEFAULT_CREDIT_POLICY.originationFeePercent).toBe(0);
    const t = convexTest(schema, modules);
    const w = await seedWorld(t);
    await t.run(async (ctx) => {
      for (const row of await ctx.db.query('institutionConfig').collect())
        await ctx.db.delete(row._id);
    });
    await configure(t, w);
    const s = await as(t, w.admin).query(api.loanAgreements.getSettings, {});
    expect(s.creditPolicyFees.originationFeePercent).toBe(0);
    expect(s.issues.map((i) => i.code)).not.toContain('FEES_NOT_SUPPORTED');
    await as(t, w.officer).mutation(api.loans.approveLoan, { loanId: w.loanId });
    const ws = await as(t, w.officer).query(api.loanAgreements.getWorkspace, { loanId: w.loanId });
    expect(Object.fromEntries(ws.view!.fields.map((f) => [f.key, f.value])).initiationFee).toBe(
      'N$0.00'
    );
    await as(t, w.officer).mutation(api.loanAgreements.finalize, {
      agreementId: ws.agreement!._id,
    });
    expect((await agreementRow(t, ws.agreement!._id)).status).toBe('ready');
  });

  test('editing settings withdraws their approval', async () => {
    const t = convexTest(schema, modules);
    const w = await seedWorld(t);
    await configure(t, w);
    await as(t, w.admin).mutation(api.loanAgreements.saveSettings, {
      lender: { ...SOURCE_COMPANY_DETAILS.lender, website: 'https://example.test' },
      representativeName: 'Another Representative',
      representativeDesignation: 'Credit Manager',
      requireAcceptedAgreementForDisbursement: false,
    });
    expect(
      (await as(t, w.admin).query(api.loanAgreements.getSettings, {})).issues.map((i) => i.code)
    ).toContain('SETTINGS_NOT_APPROVED');
  });

  test('only admins of the institution manage settings', async () => {
    const t = convexTest(schema, modules);
    const w = await seedWorld(t);
    await expect(
      as(t, w.officer).mutation(api.loanAgreements.importSourceTemplate, {})
    ).rejects.toThrow();
    await expect(as(t, w.borrower).query(api.loanAgreements.getSettings, {})).rejects.toThrow();
  });
});

describe('B — missing information', () => {
  test('missing fields are flagged, corrected at the source record, and block finalization', async () => {
    const t = convexTest(schema, modules);
    const { accountType: _a, workAddress: _w, ...partial } = COMPLETE_PROFILE;
    const w = await seedWorld(t, partial);
    await configure(t, w);
    await as(t, w.officer).mutation(api.loans.approveLoan, { loanId: w.loanId });
    const officer = as(t, w.officer);
    let ws = await officer.query(api.loanAgreements.getWorkspace, { loanId: w.loanId });
    expect(
      ws
        .view!.issues.filter((i) => i.code === 'FIELD_MISSING')
        .map((i) => i.fieldKey)
        .sort()
    ).toEqual(['accountType', 'workAddress']);
    await expect(
      officer.mutation(api.loanAgreements.finalize, { agreementId: ws.agreement!._id })
    ).rejects.toMatchObject({ data: { code: 'NOT_READY' } });

    await expect(
      officer.mutation(api.loanAgreements.updateBorrowerDetails, {
        loanId: w.loanId,
        values: { accountType: 'Crypto' },
      })
    ).rejects.toMatchObject({ data: { code: 'VALIDATION_ERROR' } });
    await expect(
      officer.mutation(api.loanAgreements.updateBorrowerDetails, {
        loanId: w.loanId,
        values: { idNumber: '11111111111' },
      })
    ).rejects.toMatchObject({ data: { fields: { idNumber: expect.any(String) } } });

    await officer.mutation(api.loanAgreements.updateBorrowerDetails, {
      loanId: w.loanId,
      values: { accountType: 'Cheque', workAddress: '5 Test Road, Windhoek' },
    });
    // Written to the borrower's profile — the source — not to the agreement.
    const profile = await t.run((ctx) =>
      ctx.db
        .query('profiles')
        .withIndex('by_userId', (q) => q.eq('userId', w.borrower))
        .first()
    );
    expect(profile).toMatchObject({ accountType: 'Cheque', workAddress: '5 Test Road, Windhoek' });
    ws = await officer.query(api.loanAgreements.getWorkspace, { loanId: w.loanId });
    expect(ws.view!.issues.filter((i) => i.blocking)).toEqual([]);
  });
});

describe('C — finalization and PDF', () => {
  test('finalizing freezes the snapshot, pins the terms and stores a hashed PDF', async () => {
    const t = convexTest(schema, modules);
    const w = await seedWorld(t);
    const templateId = await (async () => {
      const id = await approveTerms(t, w.admin);
      await approveSettings(t, w.admin);
      return id;
    })();
    await as(t, w.officer).mutation(api.loans.approveLoan, { loanId: w.loanId });
    const { agreement } = await as(t, w.officer).query(api.loanAgreements.getWorkspace, {
      loanId: w.loanId,
    });
    await as(t, w.officer).mutation(api.loanAgreements.finalize, { agreementId: agreement!._id });
    await settle(t);

    const row = await agreementRow(t, agreement!._id);
    expect(row).toMatchObject({
      status: 'ready',
      pdfStatus: 'ready',
      templateId,
      templateVersion: 2,
    });
    expect(row.pdfSha256).toMatch(/^[0-9a-f]{64}$/);
    const head = await t.run(async (ctx) => {
      const blob = await ctx.storage.get(row.pdfStorageId!);
      return new TextDecoder().decode((await blob!.arrayBuffer()).slice(0, 5));
    });
    expect(head).toBe('%PDF-');

    // A finalized agreement cannot be edited; a later source change is reported as drift.
    await expect(
      as(t, w.officer).mutation(api.loanAgreements.saveDraft, {
        agreementId: row._id,
        placeOfSigning: 'X',
      })
    ).rejects.toMatchObject({ data: { code: 'INVALID_STATE' } });
    await t.run((ctx) => ctx.db.patch(row.userId, {}));
    await t.run(async (ctx) => {
      const p = await ctx.db
        .query('profiles')
        .withIndex('by_userId', (q) => q.eq('userId', w.borrower))
        .first();
      await ctx.db.patch(p!._id, { bankName: 'Different Test Bank' });
    });
    const ws = await as(t, w.officer).query(api.loanAgreements.getWorkspace, { loanId: w.loanId });
    expect(ws.drift).toEqual(['Bank name']);
    expect(Object.fromEntries(ws.view!.fields.map((x) => [x.key, x.value])).bankName).toBe(
      'Test Bank Namibia'
    );
  });

  test('staff get a short-lived document URL, never a storage URL', async () => {
    const t = convexTest(schema, modules);
    const w = await seedWorld(t);
    await configure(t, w);
    const id = await issue(t, w);
    const url = await as(t, w.officer).mutation(api.loanAgreements.requestDocument, {
      agreementId: id,
      purpose: 'print',
    });
    expect(url).toMatch(/^https:\/\/test\.convex\.site\/documents\/fetch\?grant=[0-9a-f]+$/);
  });
});

describe('D/E — delivery and acceptance', () => {
  test('the borrower is notified, views, accepts with matching details, and the signed copy is archived', async () => {
    const t = convexTest(schema, modules);
    const w = await seedWorld(t);
    await configure(t, w);
    const client = as(t, w.borrower);

    // Not visible to the borrower before it is sent.
    await as(t, w.officer).mutation(api.loans.approveLoan, { loanId: w.loanId });
    expect(await client.query(api.loanAgreements.getMyAgreement, { loanId: w.loanId })).toBeNull();
    const { agreement } = await as(t, w.officer).query(api.loanAgreements.getWorkspace, {
      loanId: w.loanId,
    });
    await as(t, w.officer).mutation(api.loanAgreements.finalize, { agreementId: agreement!._id });
    await settle(t);
    await as(t, w.officer).mutation(api.loanAgreements.send, { agreementId: agreement!._id });
    await settle(t);
    const id = agreement!._id;

    const note = await t.run((ctx) =>
      ctx.db
        .query('notifications')
        .filter((q) => q.eq(q.field('userId'), w.borrower))
        .collect()
    );
    expect(note.map((n) => n.actionUrl)).toContain(`/loans/${w.loanId}/agreement`);

    const mine = await client.query(api.loanAgreements.getMyAgreement, { loanId: w.loanId });
    expect(mine).toMatchObject({
      status: 'sent',
      canAccept: true,
      agreementNumber: 'OGFS-2026-000007-AG1',
    });
    await client.mutation(api.loanAgreements.markViewed, { agreementId: id });
    expect((await agreementRow(t, id)).status).toBe('viewed');

    const attempt = {
      agreementId: id,
      typedName: 'Ndapewa Test Shilongo',
      idNumberLast4: '2345',
      placeOfSigning: 'Windhoek',
      agreed: true,
    };
    await expect(
      client.mutation(api.loanAgreements.accept, { ...attempt, typedName: 'Someone Else' })
    ).rejects.toMatchObject({ data: { fields: { typedName: expect.any(String) } } });
    await expect(
      client.mutation(api.loanAgreements.accept, { ...attempt, idNumberLast4: '9999' })
    ).rejects.toMatchObject({ data: { fields: { idNumberLast4: expect.any(String) } } });
    await expect(
      client.mutation(api.loanAgreements.accept, { ...attempt, agreed: false })
    ).rejects.toMatchObject({ data: { code: 'VALIDATION_ERROR' } });

    await client.mutation(api.loanAgreements.accept, {
      ...attempt,
      typedName: '  ndapewa test   SHILONGO ',
    });
    let row = await agreementRow(t, id);
    expect(row.status).toBe('accepted');
    expect(row.acceptance).toMatchObject({
      idNumberLast4: '2345',
      placeOfSigning: 'Windhoek',
      documentSha256: row.pdfSha256,
    });
    const consent = await t.run((ctx) => ctx.db.get(row.acceptance!.consentRecordId));
    expect(consent).toMatchObject({
      consentType: 'loan_agreement',
      status: 'granted',
      entityId: id,
      collectionMethod: 'digital_acceptance',
    });
    expect(consent!.description).toContain(row.pdfSha256!);

    await settle(t);
    row = await agreementRow(t, id);
    expect(row.status).toBe('archived');
    expect(row.executedPdfSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(row.executedPdfSha256).not.toBe(row.pdfSha256);
    expect(
      await client.mutation(api.loanAgreements.requestDocument, {
        agreementId: id,
        purpose: 'download',
        copy: 'executed',
      })
    ).toContain('/documents/fetch?grant=');
    // An archived agreement cannot be accepted again or cancelled.
    await expect(client.mutation(api.loanAgreements.accept, attempt)).rejects.toMatchObject({
      data: { code: 'INVALID_STATE' },
    });
    await expect(
      as(t, w.officer).mutation(api.loanAgreements.cancel, { agreementId: id, reason: 'x' })
    ).rejects.toMatchObject({ data: { code: 'INVALID_STATE' } });
  });
});

describe('F — data consistency', () => {
  test('the accepted schedule becomes the loan repayment schedule, and the gate enforces acceptance', async () => {
    const t = convexTest(schema, modules);
    const w = await seedWorld(t);
    await approveTerms(t, w.admin);
    const a = as(t, w.admin);
    await a.mutation(api.loanAgreements.saveSettings, {
      lender: { ...SOURCE_COMPANY_DETAILS.lender, website: 'https://example.test' },
      representativeName: 'Test Representative',
      representativeDesignation: 'Credit Manager',
      defaultRepaymentMethod: 'EFT/CASH',
      requireAcceptedAgreementForDisbursement: true,
    });
    await a.mutation(api.loanAgreements.approveSettings, {});
    const id = await issue(t, w);

    await expect(
      as(t, w.officer).mutation(api.disbursements.initiateDisbursement, {
        loanId: w.loanId,
        amount: 5000,
        method: 'cash',
      })
    ).rejects.toMatchObject({ data: { code: 'AGREEMENT_NOT_ACCEPTED' } });

    await as(t, w.borrower).mutation(api.loanAgreements.accept, {
      agreementId: id,
      typedName: 'Ndapewa Test Shilongo',
      idNumberLast4: '2345',
      placeOfSigning: 'Windhoek',
      agreed: true,
    });
    await settle(t);
    await as(t, w.officer).mutation(api.disbursements.initiateDisbursement, {
      loanId: w.loanId,
      amount: 5000,
      method: 'cash',
    });

    const row = await agreementRow(t, id);
    const inserted = await t.run(async (ctx) => {
      const loan = (await ctx.db.get(w.loanId))!;
      await ensurePaymentSchedule(ctx, loan, Date.now() + 9 * 86_400_000); // disbursed 9 days later
      return ctx.db
        .query('paymentSchedules')
        .withIndex('by_loanId', (q) => q.eq('loanId', w.loanId))
        .collect();
    });
    expect(
      inserted.map((r) => [
        r.installmentNumber,
        r.dueDate,
        r.principalDue,
        r.interestDue,
        r.totalDue,
      ])
    ).toEqual(
      row.snapshot!.schedule.map((r) => [
        r.installmentNumber,
        r.dueDateMs,
        r.principalDue,
        r.interestDue,
        r.totalDue,
      ])
    );
    // Totals agree with the loan record and with the schedule rows.
    const s = row.snapshot!;
    expect(s.totals.instalmentAmount).toBe(1733.77);
    expect(s.schedule.reduce((sum, r) => sum + Math.round(r.principalDue * 100), 0)).toBe(500_000);
    expect(Math.round(s.totals.totalAmountRepayable * 100)).toBe(
      s.schedule.reduce((sum, r) => sum + Math.round(r.totalDue * 100), 0)
    );
  });
});

describe('G — security and revision', () => {
  test('other clients, other tenants and clients acting as staff are refused', async () => {
    const t = convexTest(schema, modules);
    const w = await seedWorld(t);
    await configure(t, w);
    const id = await issue(t, w);
    await expect(
      as(t, w.stranger).query(api.loanAgreements.getMyAgreement, { loanId: w.loanId })
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
    await expect(
      as(t, w.stranger).mutation(api.loanAgreements.requestDocument, {
        agreementId: id,
        purpose: 'download',
      })
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
    await expect(
      as(t, w.stranger).mutation(api.loanAgreements.accept, {
        agreementId: id,
        typedName: 'Ndapewa Test Shilongo',
        idNumberLast4: '2345',
        placeOfSigning: 'Windhoek',
        agreed: true,
      })
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
    await expect(
      as(t, w.otherAdmin).query(api.loanAgreements.getWorkspace, { loanId: w.loanId })
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
    await expect(
      as(t, w.borrower).query(api.loanAgreements.getWorkspace, { loanId: w.loanId })
    ).rejects.toThrow();
    await expect(
      as(t, w.borrower).mutation(api.loanAgreements.finalize, { agreementId: id })
    ).rejects.toThrow();
    await expect(
      t.query(api.loanAgreements.getMyAgreement, { loanId: w.loanId })
    ).rejects.toThrow();
  });

  test('changed loan terms block issue and acceptance; a revision supersedes the old version', async () => {
    const t = convexTest(schema, modules);
    const w = await seedWorld(t);
    await configure(t, w);
    const id = await issue(t, w);
    await t.run((ctx) => ctx.db.patch(w.loanId, { principal: 6000 }));
    await expect(
      as(t, w.borrower).mutation(api.loanAgreements.accept, {
        agreementId: id,
        typedName: 'Ndapewa Test Shilongo',
        idNumberLast4: '2345',
        placeOfSigning: 'Windhoek',
        agreed: true,
      })
    ).rejects.toMatchObject({ data: { code: 'TERMS_CHANGED' } });
    const ws = await as(t, w.officer).query(api.loanAgreements.getWorkspace, { loanId: w.loanId });
    expect(ws.drift).toContain('Approved loan terms');

    const next = await as(t, w.officer).mutation(api.loanAgreements.revise, {
      agreementId: id,
      reason: 'Principal changed',
    });
    expect(await agreementRow(t, id)).toMatchObject({
      status: 'superseded',
      isCurrent: false,
      supersededBy: next,
    });
    expect(await agreementRow(t, next)).toMatchObject({
      status: 'draft',
      isCurrent: true,
      version: 2,
      agreementNumber: 'OGFS-2026-000007-AG2',
    });
    // The borrower no longer sees an acceptable agreement until v2 is issued.
    expect(
      await as(t, w.borrower).query(api.loanAgreements.getMyAgreement, { loanId: w.loanId })
    ).toBeNull();
  });

  test('rejecting an approved loan cancels its open agreement', async () => {
    const t = convexTest(schema, modules);
    const w = await seedWorld(t);
    await configure(t, w);
    const id = await issue(t, w);
    await as(t, w.officer).mutation(api.loans.rejectLoan, {
      loanId: w.loanId,
      reason: 'Test rejection',
    });
    expect(await agreementRow(t, id)).toMatchObject({
      status: 'cancelled',
      cancelReason: 'Loan rejected: Test rejection',
    });
  });
});

describe('Audit trail', () => {
  test('every lifecycle step is recorded against the agreement', async () => {
    const t = convexTest(schema, modules);
    const w = await seedWorld(t);
    await configure(t, w);
    const id = await issue(t, w);
    await as(t, w.borrower).mutation(api.loanAgreements.markViewed, { agreementId: id });
    await as(t, w.borrower).mutation(api.loanAgreements.requestDocument, {
      agreementId: id,
      purpose: 'download',
    });
    await as(t, w.borrower).mutation(api.loanAgreements.accept, {
      agreementId: id,
      typedName: 'Ndapewa Test Shilongo',
      idNumberLast4: '2345',
      placeOfSigning: 'Windhoek',
      agreed: true,
    });
    await settle(t);
    const logs = await t.run(async (ctx) =>
      (await ctx.db.query('auditLogs').collect()).filter((l) => l.entityId === id)
    );
    const by = (action: string) => logs.find((l) => l.action === action);
    // Responsible user on every event: staff for preparation, the borrower for their own
    // actions, none for the system's rendering callbacks.
    expect(by('GENERATE')?.userId).toBe(w.officer);
    expect(by('FINALIZE')?.userId).toBe(w.officer);
    expect(by('SEND')?.userId).toBe(w.officer);
    expect(by('VIEW')?.userId).toBe(w.borrower);
    expect(by('DOCUMENT_DOWNLOAD')?.userId).toBe(w.borrower);
    expect(by('ACCEPT')?.userId).toBe(w.borrower);
    expect(by('RENDER')?.userId).toBeUndefined();
    expect(by('ARCHIVE')?.newState).toMatchObject({
      status: 'archived',
      detail: expect.stringMatching(/^executed copy [0-9a-f]{64}$/),
    });
    expect(by('SEND')?.newState).toMatchObject({ status: 'sent', detail: 'Loan OGFS-2026-000007' });
    // The lifecycle transition table now carries the actor too.
    const transitions = await t.run(async (ctx) =>
      ctx.db
        .query('stateTransitions')
        .withIndex('by_entityId', (q) => q.eq('entityType', 'loanAgreement').eq('entityId', id))
        .collect()
    );
    expect(transitions.find((x) => x.toState === 'accepted')?.triggeredBy).toBe(w.borrower);
  });
});
