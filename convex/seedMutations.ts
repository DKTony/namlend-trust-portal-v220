/**
 * Seed mutations — called by seed.ts action.
 * Separate file because mutations cannot live in 'use node' files.
 */

import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { internalMutation, internalQuery, type MutationCtx } from './_generated/server';
import { calculateMonthlyInstalment, calculateTotalRepayable } from './lib/amortization';
import { ensurePaymentSchedule } from './lib/scheduleGeneration';

/**
 * Mark a profile as an OAuth sign-up that hasn't completed onboarding, so the
 * "complete your profile" gate can be exercised without driving a real Google
 * handshake (which Google bot-blocks for automation).
 *
 * Internal-only, and it mutates nothing but the two marker fields.
 */
export const markProfileAsGoogleSignup = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const profile = await ctx.db
      .query('profiles')
      .filter((q) => q.eq(q.field('email'), email))
      .first();
    if (!profile) throw new Error('[seed] Test profile not found');
    await ctx.db.patch(profile._id, {
      signupSource: 'google',
      onboardingCompletedAt: undefined,
      phone: undefined,
      idNumber: undefined,
    });
    return profile._id;
  },
});

/** Elevate a user's role by email. */
export const elevateRole = internalMutation({
  args: {
    email: v.string(),
    role: v.union(v.literal('client'), v.literal('loan_officer'), v.literal('admin')),
  },
  handler: async (ctx, { email, role }) => {
    const profile = await ctx.db
      .query('profiles')
      .filter((q) => q.eq(q.field('email'), email))
      .first();

    if (!profile) {
      throw new Error('Test profile not found. Sign up via the app first.');
    }

    const existing = await ctx.db
      .query('userRoles')
      .withIndex('by_userId', (q) => q.eq('userId', profile.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { role });
      console.log(`[seed] Updated test-user role to '${role}'`);
    } else {
      await ctx.db.insert('userRoles', {
        userId: profile.userId,
        role,
        createdAt: Date.now(),
      });
      console.log(`[seed] Created test-user role as '${role}'`);
    }
  },
});

/** Password identities the protected E2E login smoke must be able to sign in as. */
export const E2E_PASSWORD_LOGIN_EMAILS = [
  'client1@test.namlend.com',
  'admin@test.namlend.com',
  'loan_officer@test.namlend.com',
  'platformowner@test.namlend.com',
] as const;

async function findPasswordAccount(ctx: MutationCtx, email: string) {
  return await ctx.db
    .query('authAccounts')
    .filter((q) =>
      q.and(q.eq(q.field('provider'), 'password'), q.eq(q.field('providerAccountId'), email))
    )
    .first();
}

async function upsertPasswordAccount(
  ctx: MutationCtx,
  userId: Id<'users'>,
  email: string,
  hashedPassword: string
): Promise<void> {
  const existing = await findPasswordAccount(ctx, email);
  if (existing) {
    await ctx.db.patch(existing._id, { secret: hashedPassword, userId });
    return;
  }
  await ctx.db.insert('authAccounts', {
    userId,
    provider: 'password',
    providerAccountId: email,
    secret: hashedPassword,
  });
}

async function ensureUserEmail(
  ctx: MutationCtx,
  userId: Id<'users'>,
  email: string
): Promise<void> {
  const user = await ctx.db.get(userId);
  if (user && user.email !== email) {
    await ctx.db.patch(userId, { email });
  }
}

/** Insert a single test user directly into auth tables + profiles + userRoles. */
export const createTestUser = internalMutation({
  args: {
    email: v.string(),
    hashedPassword: v.string(),
    role: v.union(v.literal('client'), v.literal('loan_officer'), v.literal('admin')),
    institutionId: v.id('institutions'),
  },
  returns: v.object({
    userId: v.id('users'),
    created: v.boolean(),
  }),
  handler: async (ctx, { email, hashedPassword, role, institutionId }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const now = Date.now();

    // authAccounts is what Password sign-in resolves. Always write/update `secret`
    // even when a profile already exists — a skipped hash left InvalidSecret on
    // re-seed, and a missing users.email broke Convex Auth's account lookup.
    const existingAccount = await findPasswordAccount(ctx, normalizedEmail);
    const existingProfile = await ctx.db
      .query('profiles')
      .filter((q) => q.eq(q.field('email'), normalizedEmail))
      .first();

    let userId: Id<'users'>;
    let created = false;
    if (existingAccount) {
      userId = existingAccount.userId;
    } else if (existingProfile) {
      userId = existingProfile.userId;
    } else {
      userId = await ctx.db.insert('users', { email: normalizedEmail });
      created = true;
    }

    await upsertPasswordAccount(ctx, userId, normalizedEmail, hashedPassword);
    await ensureUserEmail(ctx, userId, normalizedEmail);

    const profile =
      existingProfile?.userId === userId
        ? existingProfile
        : await ctx.db
            .query('profiles')
            .withIndex('by_userId', (q) => q.eq('userId', userId))
            .first();

    if (!profile) {
      await ctx.db.insert('profiles', {
        userId,
        email: normalizedEmail,
        phone: '+264811000000',
        idNumber: '90010100001',
        kycStatus: 'pending',
        createdAt: now,
        updatedAt: now,
      });
    } else {
      const profilePatch: {
        email?: string;
        monthlyIncome?: undefined;
        phone?: string;
        idNumber?: string;
        updatedAt?: number;
      } = {};
      if (profile.email !== normalizedEmail) profilePatch.email = normalizedEmail;
      // Deterministic reset: FinancialInfoStep always renders income-input for E2E.
      if (profile.monthlyIncome != null) profilePatch.monthlyIncome = undefined;
      if (!profile.phone?.trim() || !profile.idNumber?.trim()) {
        profilePatch.phone = profile.phone?.trim() || '+264811000000';
        profilePatch.idNumber = profile.idNumber?.trim() || '90010100001';
        profilePatch.updatedAt = now;
      }
      if (Object.keys(profilePatch).length > 0) {
        await ctx.db.patch(profile._id, profilePatch);
      }
    }

    const existingRole = await ctx.db
      .query('userRoles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();
    if (existingRole) {
      await ctx.db.patch(existingRole._id, { role, institutionId });
    } else {
      await ctx.db.insert('userRoles', {
        userId,
        role,
        institutionId,
        createdAt: now,
      });
    }

    console.log(
      `[seed] ${created ? 'Created' : 'Updated'} test user ${normalizedEmail} as '${role}'`
    );
    return { userId, created };
  },
});

/**
 * Seed a deterministic platform_owner test account (E2E only).
 *
 * AUTH-ACCOUNTS-FIRST: the password `authAccounts` row (providerAccountId === email) is the
 * single source of truth for the identity that login actually resolves to. We create-or-find
 * THAT exact userId and grant `platform_owner` to it. This is what makes the test robust: it can
 * never grant to a stale/duplicate `profiles` row whose userId diverges from the login identity
 * (the exact bug that blocked the manual /platform smoke). Idempotent — safe to re-run.
 *
 * The account keeps a non-staff tenant role (`client`) on purpose: a PURE platform_owner, so the
 * /platform test genuinely exercises the P1 guard-widening (assertAdminOrPlatformOwner /
 * assertStaffOrPlatformSupport) rather than passing via a tenant-admin path.
 */
export const seedPlatformOwnerForE2E = internalMutation({
  args: { ownerEmail: v.string(), hashedPassword: v.string() },
  returns: v.object({
    userId: v.id('users'),
    email: v.string(),
  }),
  handler: async (ctx, { ownerEmail, hashedPassword }) => {
    const now = Date.now();
    const normalizedEmail = ownerEmail.trim().toLowerCase();

    // 1. authAccounts is the login source of truth — find or create by it, and always
    // refresh `secret` so re-seeds cannot leave a stale hash.
    const authAccount = await findPasswordAccount(ctx, normalizedEmail);

    let userId: Id<'users'>;
    if (authAccount) {
      userId = authAccount.userId;
    } else {
      userId = await ctx.db.insert('users', { email: normalizedEmail });
    }
    await upsertPasswordAccount(ctx, userId, normalizedEmail, hashedPassword);
    await ensureUserEmail(ctx, userId, normalizedEmail);

    // 2. Ensure exactly one profile bound to this exact userId.
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();
    if (!profile) {
      await ctx.db.insert('profiles', {
        userId,
        email: normalizedEmail,
        kycStatus: 'pending',
        createdAt: now,
        updatedAt: now,
      });
    }

    // 3. Ensure a tenant role (client — platform role is orthogonal to tenant role).
    const roleRow = await ctx.db
      .query('userRoles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();
    if (!roleRow) {
      await ctx.db.insert('userRoles', { userId, role: 'client', createdAt: now });
    }

    // 4. Upsert platform_owner by the EXACT login userId (never by a divergent profile lookup).
    const existing = await ctx.db
      .query('platformAdmins')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();
    if (existing) {
      if (existing.platformRole !== 'platform_owner' || existing.status !== 'active') {
        await ctx.db.patch(existing._id, { platformRole: 'platform_owner', status: 'active' });
      }
    } else {
      await ctx.db.insert('platformAdmins', {
        userId,
        platformRole: 'platform_owner',
        status: 'active',
        createdAt: now,
      });
    }

    console.log('[seed] Platform-owner test account is ready');
    return { userId, email: normalizedEmail };
  },
});

/** Census used by seed logs and convex-test: password accounts for the four E2E emails. */
export const countE2EAuthAccounts = internalQuery({
  args: {},
  returns: v.object({
    count: v.number(),
    emails: v.array(v.string()),
  }),
  handler: async (ctx) => {
    const emails: string[] = [];
    for (const email of E2E_PASSWORD_LOGIN_EMAILS) {
      const account = await ctx.db
        .query('authAccounts')
        .filter((q) =>
          q.and(q.eq(q.field('provider'), 'password'), q.eq(q.field('providerAccountId'), email))
        )
        .first();
      if (account?.secret) emails.push(email);
    }
    console.log(
      `[seed] authAccounts with secrets for E2E emails: ${emails.length}/${E2E_PASSWORD_LOGIN_EMAILS.length} (${emails.join(', ') || 'none'})`
    );
    return { count: emails.length, emails };
  },
});

/** Seed approved KYC documents for a test user (for E2E testing). */
export const seedKycDocuments = internalMutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, { email }) => {
    const profile = await ctx.db
      .query('profiles')
      .filter((q) => q.eq(q.field('email'), email))
      .first();

    if (!profile) {
      throw new Error('Test profile not found');
    }

    const now = Date.now();

    // Check if KYC docs already exist
    const existingDocs = await ctx.db
      .query('kycDocuments')
      .withIndex('by_userId', (q) => q.eq('userId', profile.userId))
      .collect();

    const hasIdCard = existingDocs.some((d) => d.documentType === 'id_card');
    const hasProofIncome = existingDocs.some((d) => d.documentType === 'proof_income');

    // Create ID card document if missing
    if (!hasIdCard) {
      await ctx.db.insert('kycDocuments', {
        userId: profile.userId,
        documentType: 'id_card',
        documentNumber: 'TEST-ID-001',
        status: 'approved',
        createdAt: now,
        updatedAt: now,
      });
      console.log('[seed] Created approved test ID card');
    }

    // Create proof of income document if missing
    if (!hasProofIncome) {
      await ctx.db.insert('kycDocuments', {
        userId: profile.userId,
        documentType: 'proof_income',
        status: 'approved',
        createdAt: now,
        updatedAt: now,
      });
      console.log('[seed] Created approved test proof of income');
    }

    // Deterministic reset: withdraw any KYC approval request left open by a previous
    // (possibly failed) run. Without this the client stays in the "submitted" branch —
    // `submitMyKyc` early-returns on an open request and the UI hides the submit
    // button — so the document-workflow journey can only ever pass once per deployment.
    // Withdrawn rather than deleted: the 7-year retention rule admits no hard deletes.
    const openKycRequests = await ctx.db
      .query('approvalRequests')
      .withIndex('by_entityId', (q) => q.eq('entityId', String(profile._id)))
      .collect();
    for (const request of openKycRequests) {
      if (
        request.entityType === 'kyc' &&
        (request.status === 'pending' || request.status === 'escalated')
      ) {
        await ctx.db.patch(request._id, { status: 'withdrawn', updatedAt: now });
        console.log('[seed] Withdrew stale open test KYC request');
      }
    }

    // Update profile KYC status to verified
    await ctx.db.patch(profile._id, {
      kycStatus: 'verified',
      updatedAt: now,
    });

    console.log('[seed] Test KYC documents are ready');
  },
});

const E2E_LOAN_PURPOSE = 'E2E seeded active loan';

/**
 * Seed one mid-life ACTIVE loan (with amortization schedule and a first paid
 * installment) so payment-flow E2E specs have real data instead of skipping.
 * Idempotent: keyed on the loan purpose marker per user.
 */
const E2E_REVIEWABLE_LOAN_PURPOSE = 'E2E seeded reviewable loan';

/**
 * A loan parked in `submitted` so the loan-document journey has something to work on.
 *
 * `document-workflow.e2e.ts` hunts for a loan in draft/submitted/under_review — the only
 * states whose Documents tab allows uploading. Without one it walked every loan the test
 * client owns (73 and counting) before giving up, which cannot finish inside the test
 * timeout; and even if it had, the spec would have skipped, so loan-document upload was
 * never actually covered. Idempotent on `purpose`, like the active-loan seed.
 */
export const seedReviewableLoanForE2E = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const profile = await ctx.db
      .query('profiles')
      .filter((q) => q.eq(q.field('email'), email))
      .first();
    if (!profile) throw new Error('Test profile not found');

    const existing = (
      await ctx.db
        .query('loans')
        .withIndex('by_userId', (q) => q.eq('userId', profile.userId))
        .collect()
    ).find((l) => l.purpose === E2E_REVIEWABLE_LOAN_PURPOSE);
    if (existing) {
      // Re-arm it: an earlier run may have advanced the status out of the editable set.
      if (existing.status !== 'submitted') {
        await ctx.db.patch(existing._id, { status: 'submitted', updatedAt: Date.now() });
        console.log("[seed] Reset reviewable E2E loan to 'submitted'");
      }
      return existing._id;
    }

    const principal = 5000;
    const interestRate = 20; // within the 32% regulatory limit
    const termMonths = 6;
    const now = Date.now();

    const loanId = await ctx.db.insert('loans', {
      userId: profile.userId,
      institutionId: profile.institutionId,
      principal,
      interestRate,
      termMonths,
      purpose: E2E_REVIEWABLE_LOAN_PURPOSE,
      status: 'submitted',
      monthlyPayment: calculateMonthlyInstalment(principal, interestRate, termMonths),
      totalRepayment: calculateTotalRepayable(principal, interestRate, termMonths),
      outstandingBalance: principal,
      totalPaid: 0,
      createdAt: now,
      updatedAt: now,
    });
    console.log("[seed] Created reviewable ('submitted') E2E loan");
    return loanId;
  },
});

export const seedActiveLoanForE2E = internalMutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, { email }) => {
    const profile = await ctx.db
      .query('profiles')
      .filter((q) => q.eq(q.field('email'), email))
      .first();

    if (!profile) {
      throw new Error('Test profile not found');
    }

    const existing = (
      await ctx.db
        .query('loans')
        .withIndex('by_userId', (q) => q.eq('userId', profile.userId))
        .collect()
    ).find((l) => l.purpose === E2E_LOAN_PURPOSE);
    if (existing) {
      console.log('[seed] Active E2E loan already exists');
      return existing._id;
    }

    const principal = 10000;
    const interestRate = 20; // within the 32% regulatory limit
    const termMonths = 12;
    const now = Date.now();
    const disbursedAt = now - 45 * 24 * 60 * 60 * 1000; // 45 days ago → installment 1 due

    const monthlyPayment = calculateMonthlyInstalment(principal, interestRate, termMonths);
    const totalRepayment = calculateTotalRepayable(principal, interestRate, termMonths);

    const loanId = await ctx.db.insert('loans', {
      userId: profile.userId,
      principal,
      interestRate,
      termMonths,
      purpose: E2E_LOAN_PURPOSE,
      status: 'active',
      monthlyPayment,
      totalRepayment,
      // Placeholder balances — corrected below from the generated schedule
      outstandingBalance: principal,
      totalPaid: 0,
      disbursedAt,
      createdAt: disbursedAt,
      updatedAt: now,
    });

    const loan = await ctx.db.get(loanId);
    if (!loan) throw new Error('Seeded loan vanished — aborting');
    await ensurePaymentSchedule(ctx, loan, disbursedAt);

    // Mark installment #1 paid and reflect it on the loan so the UI shows a
    // realistic mid-life state (1 of 12 paid).
    const firstInstallment = (
      await ctx.db
        .query('paymentSchedules')
        .withIndex('by_loanId', (q) => q.eq('loanId', loanId))
        .collect()
    ).find((s) => s.installmentNumber === 1);

    if (firstInstallment) {
      const paidAt = disbursedAt + 30 * 24 * 60 * 60 * 1000;
      await ctx.db.patch(firstInstallment._id, {
        status: 'paid',
        paidAt,
        paidAmount: firstInstallment.totalDue,
      });
      await ctx.db.patch(loanId, {
        // outstandingBalance tracks remaining principal (see completePayment)
        outstandingBalance: Math.round((principal - firstInstallment.principalDue) * 100) / 100,
        totalPaid: firstInstallment.totalDue,
        updatedAt: now,
      });
      await ctx.db.insert('paymentTransactions', {
        loanId,
        userId: profile.userId,
        amount: firstInstallment.totalDue,
        principalPaid: firstInstallment.principalDue,
        interestPaid: firstInstallment.interestDue,
        method: 'ips',
        status: 'completed',
        referenceNumber: 'E2E-SEED-PAY-001',
        paymentDate: paidAt,
        paidAt,
        createdAt: paidAt,
        updatedAt: paidAt,
      });
    }

    console.log('[seed] Created active E2E loan with first installment paid');
    return loanId;
  },
});

/** Seed a confirmed IPP alias for a test user so UI/E2E flows do not depend on live callbacks. */
export const seedConfirmedIpsAlias = internalMutation({
  args: {
    email: v.string(),
    aliasAddr: v.string(),
    idValue: v.string(),
    linkedBankBic: v.optional(v.string()),
    linkedAccountRef: v.optional(v.string()),
    accountHolderName: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { email, aliasAddr, idValue, linkedBankBic, linkedAccountRef, accountHolderName, isDefault }
  ) => {
    const profile = await ctx.db
      .query('profiles')
      .filter((q) => q.eq(q.field('email'), email))
      .first();

    if (!profile) {
      throw new Error('Test profile not found');
    }

    const now = Date.now();
    const makeDefault = isDefault ?? true;
    const existing = await ctx.db
      .query('ipsAliasDirectory')
      .withIndex('by_addr', (q) => q.eq('addr', aliasAddr))
      .first();

    if (makeDefault) {
      const userAliases = await ctx.db
        .query('ipsAliasDirectory')
        .withIndex('by_userId', (q) => q.eq('userId', profile.userId))
        .collect();

      for (const alias of userAliases) {
        if (alias.addr !== aliasAddr && alias.isDefault) {
          await ctx.db.patch(alias._id, {
            isDefault: false,
            updatedAt: now,
          });
        }
      }
    }

    const confirmedAlias = {
      userId: profile.userId,
      addr: aliasAddr,
      entityType: 'PERSON' as const,
      idType: 'NUMERICID' as const,
      idValue,
      status: 'ACTIVE' as const,
      cmId: `CM-E2E-${aliasAddr}`,
      linkedAccountRef:
        linkedAccountRef ?? `E2E-${aliasAddr.replace(/[^a-z0-9]/gi, '').toUpperCase()}`,
      linkedBankBic: linkedBankBic ?? 'FIRNNANX',
      accountHolderName: accountHolderName ?? email.split('@')[0],
      syncedWithIps: true,
      lastSyncAt: now,
      syncError: undefined,
      isDefault: makeDefault,
      updatedAt: now,
    };

    if (existing) {
      if (existing.userId !== profile.userId) {
        throw new Error(`Alias ${aliasAddr} is already owned by another user.`);
      }

      await ctx.db.patch(existing._id, confirmedAlias);
      console.log('[seed] Confirmed existing test IPP alias');
      return existing._id;
    }

    const aliasId = await ctx.db.insert('ipsAliasDirectory', {
      ...confirmedAlias,
      createdAt: now,
    });
    console.log('[seed] Created confirmed test IPP alias');
    return aliasId;
  },
});

/**
 * Enable tenancy and entitlement enforcement only for the disposable E2E preview seed.
 *
 * This is deliberately internal and is invoked solely by `seedDisposableE2EPreview` after a
 * fresh Convex preview has been created. Production activation continues to use the audited,
 * readiness-gated platform-owner mutations.
 */
export const enableDisposableE2EEnforcement = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    for (const ruleCode of ['TENANCY_ENFORCEMENT', 'ENTITLEMENT_ENFORCEMENT'] as const) {
      const rules = await ctx.db
        .query('businessRules')
        .withIndex('by_ruleCode', (q) => q.eq('ruleCode', ruleCode))
        .collect();
      const current = rules.find((rule) => rule.effectiveTo === undefined);
      if (current?.valueType === 'boolean' && current.value === 'true') continue;
      if (current) await ctx.db.patch(current._id, { effectiveTo: now });
      await ctx.db.insert('businessRules', {
        ruleCode,
        category: 'platform',
        displayName:
          ruleCode === 'TENANCY_ENFORCEMENT'
            ? 'Tenancy Enforcement (disposable E2E)'
            : 'Entitlement Enforcement (disposable E2E)',
        description: 'Disposable Convex preview test fixture; never a production activation path.',
        valueType: 'boolean',
        value: 'true',
        effectiveFrom: now,
        version: (current?.version ?? 0) + 1,
        createdAt: now,
      });
    }
  },
});

/** Seed settlement participants required for IPP inter-participant clearing E2E flows. */
export const seedSettlementParticipants = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const participants = [
      {
        routingCode: 'NAMLEND',
        swiftBic: 'NAMLNANX',
        name: 'OG Financial Services',
        participantType: 'sponsored' as const,
        nissAccountRef: 'NISS-NAMLEND-E2E',
        isOperator: true,
      },
      {
        routingCode: 'FNB',
        swiftBic: 'FIRNNANX',
        name: 'First National Bank Namibia',
        participantType: 'direct' as const,
        nissAccountRef: 'NISS-FNB-E2E',
        isOperator: false,
      },
    ];

    for (const participant of participants) {
      const existing = await ctx.db
        .query('settlementParticipants')
        .withIndex('by_routingCode', (q) => q.eq('routingCode', participant.routingCode))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          ...participant,
          status: 'active',
          updatedAt: now,
        });
        console.log(`[seed] Updated settlement participant ${participant.routingCode}`);
      } else {
        await ctx.db.insert('settlementParticipants', {
          ...participant,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        });
        console.log(`[seed] Created settlement participant ${participant.routingCode}`);
      }
    }
  },
});
