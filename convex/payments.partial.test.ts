/**
 * Partial-payment integrity tests (Convex in-memory harness).
 *
 * Covers the cent-exact invariants of the allocation engine wired through the
 * real mutations:
 *   - a partial payment marks the installment partially_paid with an
 *     interest-first decomposition and reduces the loan by principal only
 *   - partial payments accumulate to exactly totalDue across payments
 *   - full-balance settlement on a fresh loan pays off with an all-principal
 *     ledger entry and waives (rebates) future installments
 *   - reversal restores schedule rows, loan balance, and posts mirrored legs
 *
 * Run: npm run test:convex
 */
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import { api, internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { generatePaymentSchedule, toCents } from './lib/amortization';
import schema from './schema';

const modules = import.meta.glob('./**/*.*s');

type Role = 'client' | 'loan_officer' | 'admin';

function asUser(t: ReturnType<typeof convexTest>, userId: Id<'users'>) {
  return t.withIdentity({ subject: `${userId}|testsession` });
}

async function seedUser(
  t: ReturnType<typeof convexTest>,
  opts: { role?: Role } = {}
): Promise<Id<'users'>> {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert('users', {});
    await ctx.db.insert('profiles', {
      userId,
      email: `${userId}@example.test`,
      kycStatus: 'verified',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    if (opts.role) {
      await ctx.db.insert('userRoles', { userId, role: opts.role, createdAt: Date.now() });
    }
    return userId;
  });
}

const PRINCIPAL = 10000;
const RATE = 20;
const TERM = 12;

/** Active loan with a real amortization schedule (all installments future-dated). */
async function seedActiveLoanWithSchedule(
  t: ReturnType<typeof convexTest>,
  userId: Id<'users'>
): Promise<{ loanId: Id<'loans'>; entries: ReturnType<typeof generatePaymentSchedule> }> {
  const disbursed = new Date();
  const entries = generatePaymentSchedule(PRINCIPAL, RATE, TERM, disbursed);
  const loanId = await t.run(async (ctx) => {
    const now = Date.now();
    const loanId = await ctx.db.insert('loans', {
      userId,
      principal: PRINCIPAL,
      interestRate: RATE,
      termMonths: TERM,
      status: 'active',
      outstandingBalance: PRINCIPAL,
      totalPaid: 0,
      disbursedAt: disbursed.getTime(),
      createdAt: now,
      updatedAt: now,
    });
    for (const e of entries) {
      await ctx.db.insert('paymentSchedules', {
        loanId,
        installmentNumber: e.installmentNumber,
        dueDate: e.dueDate,
        principalDue: e.principalDue,
        interestDue: e.interestDue,
        totalDue: e.totalDue,
        status: 'scheduled',
        createdAt: now,
      });
    }
    return loanId;
  });
  return { loanId, entries };
}

const getScheduleRows = (t: ReturnType<typeof convexTest>, loanId: Id<'loans'>) =>
  t.run(async (ctx) =>
    (
      await ctx.db
        .query('paymentSchedules')
        .withIndex('by_loanId', (q) => q.eq('loanId', loanId))
        .collect()
    ).sort((a, b) => a.installmentNumber - b.installmentNumber)
  );

const getOutbox = (t: ReturnType<typeof convexTest>, sourceId: string) =>
  t.run(async (ctx) =>
    ctx.db
      .query('tigerBeetleOutbox')
      .withIndex('by_sourceId', (q) => q.eq('sourceId', sourceId))
      .collect()
  );

type OutboxTransfer = { debit_type: string; credit_type: string; amount: number; code: number };
const transfersOf = (entry: Doc<'tigerBeetleOutbox'> | undefined): OutboxTransfer[] =>
  ((entry?.payload as Record<string, unknown> | undefined)?.transfers as OutboxTransfer[]) ?? [];

describe('partial payment allocation through completePayment', () => {
  test('partial payment: interest-first split, partially_paid status, principal-only balance reduction', async () => {
    const t = convexTest(schema, modules);
    const staff = await seedUser(t, { role: 'loan_officer' });
    const borrower = await seedUser(t);
    const { loanId, entries } = await seedActiveLoanWithSchedule(t, borrower);

    const interestDueCents = toCents(entries[0].interestDue);
    const payAmount = (interestDueCents + 5000) / 100; // full interest + N$50 principal

    const paymentId: Id<'paymentTransactions'> = await asUser(t, staff).mutation(
      api.payments.recordPayment,
      { loanId, amount: payAmount, method: 'manual' }
    );
    await asUser(t, staff).mutation(api.payments.completePayment, { paymentId });

    const rows = await getScheduleRows(t, loanId);
    expect(rows[0].status).toBe('partially_paid');
    expect(toCents(rows[0].paidAmount!)).toBe(interestDueCents + 5000);
    expect(toCents(rows[0].interestPaidAmount!)).toBe(interestDueCents);
    expect(toCents(rows[0].principalPaidAmount!)).toBe(5000);

    // Loan reduced by the PRINCIPAL portion only
    const loan = await t.run(async (ctx) => ctx.db.get(loanId));
    expect(toCents(loan!.outstandingBalance!)).toBe(toCents(PRINCIPAL) - 5000);
    expect(toCents(loan!.totalPaid!)).toBe(interestDueCents + 5000);

    // Derived split written back to the payment
    const payment = await t.run(async (ctx) => ctx.db.get(paymentId));
    expect(toCents(payment!.principalPaid!)).toBe(5000);
    expect(toCents(payment!.interestPaid!)).toBe(interestDueCents);

    // Ledger transfers conserve every cent of the payment
    const outbox = await getOutbox(t, paymentId);
    const repayment = outbox.find((e) => e.eventType === 'REPAYMENT');
    const transfers = transfersOf(repayment);
    expect(transfers.reduce((s, tr) => s + tr.amount, 0)).toBe(toCents(payAmount));
    expect(transfers.find((tr) => tr.code === 5001)?.amount).toBe(interestDueCents);
    expect(transfers.find((tr) => tr.code === 2001)?.amount).toBe(5000);

    // Allocation ledger row recorded
    const allocations = await t.run(async (ctx) =>
      ctx.db
        .query('paymentAllocations')
        .withIndex('by_paymentId', (q) => q.eq('paymentId', paymentId))
        .collect()
    );
    expect(allocations).toHaveLength(1);
    expect(allocations[0].principalCents + allocations[0].interestCents).toBe(toCents(payAmount));
  });

  test('partials accumulate to exactly totalDue and settle the installment', async () => {
    const t = convexTest(schema, modules);
    const staff = await seedUser(t, { role: 'loan_officer' });
    const borrower = await seedUser(t);
    const { loanId, entries } = await seedActiveLoanWithSchedule(t, borrower);

    const totalDueCents = toCents(entries[0].totalDue);
    const first = 333.33;
    const second = (totalDueCents - toCents(first)) / 100;

    for (const [i, amount] of [first, second].entries()) {
      const paymentId: Id<'paymentTransactions'> = await asUser(t, staff).mutation(
        api.payments.recordPayment,
        { loanId, amount, method: 'manual', referenceNumber: `acc-${i}` }
      );
      await asUser(t, staff).mutation(api.payments.completePayment, { paymentId });
    }

    const rows = await getScheduleRows(t, loanId);
    expect(rows[0].status).toBe('paid');
    expect(toCents(rows[0].paidAmount!)).toBe(totalDueCents);
    expect(toCents(rows[0].principalPaidAmount!) + toCents(rows[0].interestPaidAmount!)).toBe(
      totalDueCents
    );
    expect(rows[1].status).toBe('scheduled'); // untouched
  });

  test('full-balance settlement on a fresh loan: paid_off, all-principal ledger, future rows waived', async () => {
    const t = convexTest(schema, modules);
    const staff = await seedUser(t, { role: 'loan_officer' });
    const borrower = await seedUser(t);
    const { loanId } = await seedActiveLoanWithSchedule(t, borrower);

    const paymentId: Id<'paymentTransactions'> = await asUser(t, staff).mutation(
      api.payments.recordPayment,
      { loanId, amount: PRINCIPAL, method: 'manual' }
    );
    await asUser(t, staff).mutation(api.payments.completePayment, { paymentId });

    const loan = await t.run(async (ctx) => ctx.db.get(loanId));
    expect(loan!.status).toBe('paid_off');
    expect(loan!.outstandingBalance).toBe(0);

    const rows = await getScheduleRows(t, loanId);
    expect(rows.every((r) => r.status === 'paid' || r.status === 'waived')).toBe(true);
    expect(rows.some((r) => r.status === 'waived')).toBe(true); // unearned interest rebated

    const outbox = await getOutbox(t, paymentId);
    const transfers = transfersOf(outbox.find((e) => e.eventType === 'REPAYMENT'));
    // Nothing was due yet → truthfully all principal, no interest income
    expect(transfers).toHaveLength(1);
    expect(transfers[0].code).toBe(2001);
    expect(transfers[0].amount).toBe(toCents(PRINCIPAL));
  });
});

describe('reversePayment symmetry', () => {
  test('reversing a partial payment restores schedule, loan, and posts mirrored legs', async () => {
    const t = convexTest(schema, modules);
    const staff = await seedUser(t, { role: 'loan_officer' });
    const admin = await seedUser(t, { role: 'admin' });
    const borrower = await seedUser(t);
    const { loanId, entries } = await seedActiveLoanWithSchedule(t, borrower);

    const interestDueCents = toCents(entries[0].interestDue);
    const payAmount = (interestDueCents + 5000) / 100;
    const paymentId: Id<'paymentTransactions'> = await asUser(t, staff).mutation(
      api.payments.recordPayment,
      { loanId, amount: payAmount, method: 'manual' }
    );
    await asUser(t, staff).mutation(api.payments.completePayment, { paymentId });

    await asUser(t, admin).mutation(api.payments.reversePayment, {
      paymentId,
      reason: 'bank recall',
    });

    // Schedule row fully restored (future-dated → back to 'scheduled')
    const rows = await getScheduleRows(t, loanId);
    expect(rows[0].status).toBe('scheduled');
    expect(toCents(rows[0].paidAmount ?? 0)).toBe(0);
    expect(toCents(rows[0].principalPaidAmount ?? 0)).toBe(0);
    expect(toCents(rows[0].interestPaidAmount ?? 0)).toBe(0);

    // Loan balance and totalPaid restored to the cent
    const loan = await t.run(async (ctx) => ctx.db.get(loanId));
    expect(toCents(loan!.outstandingBalance!)).toBe(toCents(PRINCIPAL));
    expect(toCents(loan!.totalPaid!)).toBe(0);

    // Payment reversed; allocations stamped, not deleted
    const payment = await t.run(async (ctx) => ctx.db.get(paymentId));
    expect(payment!.status).toBe('reversed');
    const allocations = await t.run(async (ctx) =>
      ctx.db
        .query('paymentAllocations')
        .withIndex('by_paymentId', (q) => q.eq('paymentId', paymentId))
        .collect()
    );
    expect(allocations).toHaveLength(1);
    expect(allocations[0].reversedAt).toBeDefined();

    // Mirrored reversal legs with distinct codes, conserving posted cents
    const outbox = await getOutbox(t, paymentId);
    const reversal = outbox.find((e) => e.eventType === 'REPAYMENT_REVERSAL');
    const transfers = transfersOf(reversal);
    expect(transfers.reduce((s, tr) => s + tr.amount, 0)).toBe(toCents(payAmount));
    expect(transfers.find((tr) => tr.code === 2101)?.amount).toBe(5000);
    expect(transfers.find((tr) => tr.code === 5101)?.amount).toBe(interestDueCents);

    // Replay is a no-op (idempotent) — still exactly one reversal entry
    await asUser(t, admin).mutation(api.payments.reversePayment, { paymentId });
    const outboxAfter = await getOutbox(t, paymentId);
    expect(outboxAfter.filter((e) => e.eventType === 'REPAYMENT_REVERSAL')).toHaveLength(1);
  });

  test('reversing a settlement rolls paid_off back to active and un-waives rows', async () => {
    const t = convexTest(schema, modules);
    const staff = await seedUser(t, { role: 'loan_officer' });
    const admin = await seedUser(t, { role: 'admin' });
    const borrower = await seedUser(t);
    const { loanId } = await seedActiveLoanWithSchedule(t, borrower);

    const paymentId: Id<'paymentTransactions'> = await asUser(t, staff).mutation(
      api.payments.recordPayment,
      { loanId, amount: PRINCIPAL, method: 'manual' }
    );
    await asUser(t, staff).mutation(api.payments.completePayment, { paymentId });
    await asUser(t, admin).mutation(api.payments.reversePayment, { paymentId });

    const loan = await t.run(async (ctx) => ctx.db.get(loanId));
    expect(loan!.status).toBe('active');
    expect(toCents(loan!.outstandingBalance!)).toBe(toCents(PRINCIPAL));

    const rows = await getScheduleRows(t, loanId);
    expect(rows.every((r) => r.status === 'scheduled')).toBe(true); // all un-waived
  });
});

describe('getPaymentsTotalSince (admin "Total Payments Today")', () => {
  test('counts completed payments in-window and excludes reversed ones', async () => {
    const t = convexTest(schema, modules);
    const staff = await seedUser(t, { role: 'loan_officer' });
    const admin = await seedUser(t, { role: 'admin' });
    const borrower = await seedUser(t);
    const { loanId } = await seedActiveLoanWithSchedule(t, borrower);

    // Two completed payments today
    const keepId: Id<'paymentTransactions'> = await asUser(t, staff).mutation(
      api.payments.recordPayment,
      { loanId, amount: 500, method: 'manual', referenceNumber: 'keep' }
    );
    await asUser(t, staff).mutation(api.payments.completePayment, { paymentId: keepId });
    const reverseId: Id<'paymentTransactions'> = await asUser(t, staff).mutation(
      api.payments.recordPayment,
      { loanId, amount: 300, method: 'manual', referenceNumber: 'reverse' }
    );
    await asUser(t, staff).mutation(api.payments.completePayment, { paymentId: reverseId });

    const since = Date.now() - 60_000;
    const before = await asUser(t, staff).query(api.analytics.getPaymentsTotalSince, {
      sinceMs: since,
    });
    expect(before.count).toBe(2);
    expect(toCents(before.total)).toBe(toCents(800));

    // Reversing the second drops it out of the total (status → 'reversed')
    await asUser(t, admin).mutation(api.payments.reversePayment, { paymentId: reverseId });
    const after = await asUser(t, staff).query(api.analytics.getPaymentsTotalSince, {
      sinceMs: since,
    });
    expect(after.count).toBe(1);
    expect(toCents(after.total)).toBe(toCents(500));

    // A window that starts in the future counts nothing
    const future = await asUser(t, staff).query(api.analytics.getPaymentsTotalSince, {
      sinceMs: Date.now() + 60_000,
    });
    expect(future.count).toBe(0);
    expect(future.total).toBe(0);
  });
});

describe('IPS disbursement completion generates the amortization schedule', () => {
  test('loan funded via IPS rail gets schedule rows and payment fields', async () => {
    const t = convexTest(schema, modules);
    const borrower = await seedUser(t);

    const { loanId, txId } = await t.run(async (ctx) => {
      const now = Date.now();
      const loanId = await ctx.db.insert('loans', {
        userId: borrower,
        principal: 1350,
        interestRate: 20,
        termMonths: 3,
        status: 'approved',
        outstandingBalance: 1350,
        totalPaid: 0,
        createdAt: now,
        updatedAt: now,
      });
      const disbursementId = await ctx.db.insert('disbursements', {
        loanId,
        userId: borrower,
        amount: 1350,
        method: 'ips',
        status: 'processing',
        createdAt: now,
        updatedAt: now,
      });
      const txId = await ctx.db.insert('ipsTransactions', {
        msgId: `TEST-${now}`,
        txType: 'credit_transfer',
        direction: 'outbound',
        status: 'processing',
        amount: 1350,
        currency: 'NAD',
        loanId,
        userId: borrower,
        disbursementId,
        initiatedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      return { loanId, txId };
    });

    await t.mutation(internal.ips.ipsTransactions.updateIpsTransactionStatusInternal, {
      transactionId: txId,
      status: 'completed',
    });

    const loan = await t.run(async (ctx) => ctx.db.get(loanId));
    expect(loan!.status).toBe('funded');
    expect(loan!.monthlyPayment).toBeGreaterThan(0);
    expect(loan!.totalRepayment).toBeGreaterThan(0);

    const rows = await getScheduleRows(t, loanId);
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.status === 'scheduled')).toBe(true);
    // Schedule principal sums to the loan principal (cent-exact)
    expect(rows.reduce((s, r) => s + toCents(r.principalDue), 0)).toBe(toCents(1350));
  });
});
