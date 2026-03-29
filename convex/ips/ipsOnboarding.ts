/**
 * IPP Onboarding — IPS-mandated state machine.
 *
 * Official flow (Product Rules v0.5):
 *   NOT_STARTED → DEVICE_BINDING_REQUIRED → DEVICE_BOUND
 *   → SOV_SELECTION_PENDING → SOV_SELECTED → ACCOUNTS_LISTED
 *   → VERIFICATION_PENDING → VERIFIED
 *   → IPS_PIN_SETTING → IPS_PIN_SET
 *   → ALIAS_REGISTRATION_PENDING → ALIAS_REGISTERED
 *   → READY_FOR_IPP_PAYMENTS
 *
 * Each step has a dedicated mutation with validation, audit logging,
 * and optional IPS API scheduling.
 */

import { v } from 'convex/values';
import { query, mutation, internalMutation } from '../_generated/server';
import { internal } from '../_generated/api';
import { ConvexError } from 'convex/values';
import { assertAuthenticated, assertStaff, assertOwnerOrStaff } from '../lib/auth';
import { scheduleAuditLog } from '../lib/audit';
import { normalizeNamibianMobile, isValidNamibianMobile } from '../lib/ipsPhoneNormalize';

// ---------------------------------------------------------------------------
// Valid transitions — enforced by each mutation
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Record<string, string[]> = {
  NOT_STARTED: ['DEVICE_BINDING_REQUIRED'],
  DEVICE_BINDING_REQUIRED: ['DEVICE_BOUND'],
  DEVICE_BOUND: ['SOV_SELECTION_PENDING'],
  SOV_SELECTION_PENDING: ['SOV_SELECTED'],
  SOV_SELECTED: ['ACCOUNTS_LISTED'],
  ACCOUNTS_LISTED: ['VERIFICATION_PENDING'],
  VERIFICATION_PENDING: ['VERIFIED'],
  VERIFIED: ['IPS_PIN_SETTING'],
  IPS_PIN_SETTING: ['IPS_PIN_SET'],
  IPS_PIN_SET: ['ALIAS_REGISTRATION_PENDING'],
  ALIAS_REGISTRATION_PENDING: ['ALIAS_REGISTERED'],
  ALIAS_REGISTERED: ['READY_FOR_IPP_PAYMENTS'],
  // Terminal / special transitions
  READY_FOR_IPP_PAYMENTS: ['SUSPENDED', 'DEREGISTERED'],
  SUSPENDED: ['DEVICE_BINDING_REQUIRED'], // re-enrollment
  // Legacy step compatibility — allow advancing to new states
  step_1_identity: ['DEVICE_BINDING_REQUIRED', 'step_2_bank_details'],
  step_2_bank_details: ['SOV_SELECTION_PENDING', 'step_3_documents'],
  step_3_documents: ['ACCOUNTS_LISTED', 'step_4_vpa_selection'],
  step_4_vpa_selection: ['ALIAS_REGISTRATION_PENDING', 'step_5_review'],
  step_5_review: ['step_6_submitted'],
  step_6_submitted: ['step_7_approved', 'rejected'],
  step_7_approved: ['READY_FOR_IPP_PAYMENTS'],
};

function assertValidTransition(currentStatus: string, targetStatus: string) {
  const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(targetStatus)) {
    throw new ConvexError({
      code: 'INVALID_TRANSITION',
      message: `Cannot transition from '${currentStatus}' to '${targetStatus}'.`,
    });
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getMyOnboarding = query({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    return ctx.db
      .query('ipsOnboardingApplications')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();
  },
});

export const adminListOnboarding = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, limit }) => {
    await assertStaff(ctx);
    const all = await ctx.db
      .query('ipsOnboardingApplications')
      .order('desc')
      .take(limit ?? 100);
    if (status) return all.filter((a) => a.status === status);
    return all;
  },
});

// ---------------------------------------------------------------------------
// Start Onboarding
// ---------------------------------------------------------------------------

export const startOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);

    const existing = await ctx.db
      .query('ipsOnboardingApplications')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();

    if (existing && existing.status !== 'rejected' && existing.status !== 'DEREGISTERED') {
      throw new ConvexError({
        code: 'ALREADY_EXISTS',
        message: 'An active onboarding application already exists.',
      });
    }

    const now = Date.now();
    return ctx.db.insert('ipsOnboardingApplications', {
      userId,
      status: 'DEVICE_BINDING_REQUIRED',
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ---------------------------------------------------------------------------
// Step 1: Complete Device Binding
// ---------------------------------------------------------------------------

export const completeDeviceBinding = mutation({
  args: {
    applicationId: v.id('ipsOnboardingApplications'),
    mobileNumber: v.string(),
    deviceId: v.string(),
    publicKey: v.string(),
    deviceName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const app = await ctx.db.get(args.applicationId);
    if (!app) throw new ConvexError({ code: 'NOT_FOUND', message: 'Application not found.' });
    await assertOwnerOrStaff(ctx, app.userId);
    assertValidTransition(app.status, 'DEVICE_BOUND');

    // Normalize mobile
    const normalized = normalizeNamibianMobile(args.mobileNumber);
    if (!normalized || !isValidNamibianMobile(normalized)) {
      throw new ConvexError({
        code: 'INVALID_MOBILE',
        message: 'Invalid Namibian mobile number.',
      });
    }

    // Create device binding record
    const now = Date.now();
    const bindingId = await ctx.db.insert('ipsDeviceBindings', {
      userId,
      onboardingId: args.applicationId,
      deviceId: args.deviceId,
      deviceName: args.deviceName,
      publicKey: args.publicKey,
      status: 'active',
      boundAt: now,
    });

    await ctx.db.patch(args.applicationId, {
      status: 'DEVICE_BOUND',
      deviceBindingId: bindingId,
      mobileNumberNormalized: normalized,
      updatedAt: now,
    });

    scheduleAuditLog(
      ctx,
      'ips_onboarding',
      args.applicationId,
      'DEVICE_BINDING',
      app.status,
      'DEVICE_BOUND'
    );

    // Schedule ReqRegMob via IPS action (when not in json_mock mode)
    await ctx.scheduler.runAfter(0, internal.actions.ipsOnboardingAdapter.reqRegMob, {
      applicationId: args.applicationId,
      mobileNumber: normalized,
      deviceId: args.deviceId,
    });
  },
});

// ---------------------------------------------------------------------------
// Step 2: Select SoV Provider
// ---------------------------------------------------------------------------

export const selectSovProvider = mutation({
  args: {
    applicationId: v.id('ipsOnboardingApplications'),
    providerCode: v.string(),
    providerName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const app = await ctx.db.get(args.applicationId);
    if (!app) throw new ConvexError({ code: 'NOT_FOUND', message: 'Application not found.' });
    await assertOwnerOrStaff(ctx, app.userId);
    assertValidTransition(app.status, 'SOV_SELECTED');

    const now = Date.now();
    await ctx.db.patch(args.applicationId, {
      status: 'SOV_SELECTED',
      sovProviderCode: args.providerCode,
      sovProviderName: args.providerName,
      updatedAt: now,
    });

    scheduleAuditLog(
      ctx,
      'ips_onboarding',
      args.applicationId,
      'SOV_SELECTED',
      app.status,
      'SOV_SELECTED'
    );

    // Schedule ReqListAccount to fetch user's accounts at this provider
    if (app.mobileNumberNormalized) {
      await ctx.scheduler.runAfter(0, internal.actions.ipsOnboardingAdapter.reqListAccount, {
        applicationId: args.applicationId,
        mobileNumber: app.mobileNumberNormalized,
        providerCode: args.providerCode,
      });
    }
  },
});

// ---------------------------------------------------------------------------
// Step 3: Select Account
// ---------------------------------------------------------------------------

export const selectAccount = mutation({
  args: {
    applicationId: v.id('ipsOnboardingApplications'),
    accountRef: v.string(),
    accountMasked: v.string(),
    accountIfsc: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const app = await ctx.db.get(args.applicationId);
    if (!app) throw new ConvexError({ code: 'NOT_FOUND', message: 'Application not found.' });
    await assertOwnerOrStaff(ctx, app.userId);
    assertValidTransition(app.status, 'ACCOUNTS_LISTED');

    const now = Date.now();
    await ctx.db.patch(args.applicationId, {
      status: 'ACCOUNTS_LISTED',
      selectedAccountRef: args.accountRef,
      selectedAccountMasked: args.accountMasked,
      selectedAccountIfsc: args.accountIfsc,
      updatedAt: now,
    });

    scheduleAuditLog(
      ctx,
      'ips_onboarding',
      args.applicationId,
      'ACCOUNT_SELECTED',
      app.status,
      'ACCOUNTS_LISTED'
    );
  },
});

// ---------------------------------------------------------------------------
// Step 4: Start Verification (triggers OTP)
// ---------------------------------------------------------------------------

export const startVerification = mutation({
  args: {
    applicationId: v.id('ipsOnboardingApplications'),
    verificationMethod: v.union(v.literal('debit_card'), v.literal('mno')),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const app = await ctx.db.get(args.applicationId);
    if (!app) throw new ConvexError({ code: 'NOT_FOUND', message: 'Application not found.' });
    await assertOwnerOrStaff(ctx, app.userId);
    assertValidTransition(app.status, 'VERIFICATION_PENDING');

    const now = Date.now();
    await ctx.db.patch(args.applicationId, {
      status: 'VERIFICATION_PENDING',
      verificationMethod: args.verificationMethod,
      updatedAt: now,
    });

    scheduleAuditLog(
      ctx,
      'ips_onboarding',
      args.applicationId,
      'VERIFICATION_STARTED',
      app.status,
      'VERIFICATION_PENDING'
    );

    // Schedule verification API call
    await ctx.scheduler.runAfter(0, internal.actions.ipsOnboardingAdapter.startVerification, {
      applicationId: args.applicationId,
      verificationMethod: args.verificationMethod,
      mobileNumber: app.mobileNumberNormalized ?? '',
      providerCode: app.sovProviderCode ?? '',
      accountRef: app.selectedAccountRef ?? '',
    });
  },
});

// ---------------------------------------------------------------------------
// Step 5: Submit OTP
// ---------------------------------------------------------------------------

export const submitOtp = mutation({
  args: {
    applicationId: v.id('ipsOnboardingApplications'),
    otpCode: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const app = await ctx.db.get(args.applicationId);
    if (!app) throw new ConvexError({ code: 'NOT_FOUND', message: 'Application not found.' });
    await assertOwnerOrStaff(ctx, app.userId);

    if (app.status !== 'VERIFICATION_PENDING') {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: 'OTP can only be submitted during verification.',
      });
    }

    if (!args.otpCode || args.otpCode.length !== 6) {
      throw new ConvexError({
        code: 'INVALID_OTP',
        message: 'OTP must be exactly 6 digits.',
      });
    }

    // Schedule OTP verification via IPS
    await ctx.scheduler.runAfter(0, internal.actions.ipsOnboardingAdapter.reqOtp, {
      applicationId: args.applicationId,
      otpCode: args.otpCode,
    });

    // Note: status transitions to VERIFIED via the action callback (updateOnboardingStatus)
  },
});

// ---------------------------------------------------------------------------
// Step 6: Set IPS PIN
// ---------------------------------------------------------------------------

export const setupIpsPin = mutation({
  args: {
    applicationId: v.id('ipsOnboardingApplications'),
    // PIN is NOT stored — only a flag. Actual PIN is encrypted and sent to IPS.
    pinLength: v.number(), // Client validates 6-digit; we just verify it was provided
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const app = await ctx.db.get(args.applicationId);
    if (!app) throw new ConvexError({ code: 'NOT_FOUND', message: 'Application not found.' });
    await assertOwnerOrStaff(ctx, app.userId);
    // Two-stage transition: VERIFIED → IPS_PIN_SETTING → (action callback) → IPS_PIN_SET
    assertValidTransition(app.status, 'IPS_PIN_SETTING');

    if (args.pinLength !== 6) {
      throw new ConvexError({
        code: 'INVALID_PIN',
        message: 'IPS PIN must be exactly 6 digits.',
      });
    }

    const now = Date.now();
    await ctx.db.patch(args.applicationId, {
      status: 'IPS_PIN_SETTING',
      updatedAt: now,
    });

    scheduleAuditLog(
      ctx,
      'ips_onboarding',
      args.applicationId,
      'PIN_SETTING',
      app.status,
      'IPS_PIN_SETTING'
    );

    // Schedule ReqSetCre via IPS action
    await ctx.scheduler.runAfter(0, internal.actions.ipsOnboardingAdapter.reqSetCre, {
      applicationId: args.applicationId,
      operation: 'SET',
      deviceId: app.deviceBindingId ? 'bound' : 'unknown',
    });
  },
});

// ---------------------------------------------------------------------------
// Step 7: Create Handle / VPA
// ---------------------------------------------------------------------------

export const createHandle = mutation({
  args: {
    applicationId: v.id('ipsOnboardingApplications'),
    vpaUsername: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const app = await ctx.db.get(args.applicationId);
    if (!app) throw new ConvexError({ code: 'NOT_FOUND', message: 'Application not found.' });
    await assertOwnerOrStaff(ctx, app.userId);
    assertValidTransition(app.status, 'ALIAS_REGISTRATION_PENDING');

    if (!args.vpaUsername || args.vpaUsername.length < 3) {
      throw new ConvexError({
        code: 'INVALID_VPA',
        message: 'VPA username must be at least 3 characters.',
      });
    }

    // Build full alias address
    const handle = app.sovProviderCode?.toLowerCase() ?? 'namlend';
    const addr = `${args.vpaUsername}@${handle}`;

    // Check alias availability via local registry
    const existingAlias = await ctx.db
      .query('ipsAliasDirectory')
      .withIndex('by_addr', (q) => q.eq('addr', addr))
      .first();

    if (existingAlias && existingAlias.status !== 'DEREGISTERED') {
      throw new ConvexError({
        code: 'ALIAS_TAKEN',
        message: `The address '${addr}' is already taken. Please choose another.`,
      });
    }

    const now = Date.now();
    await ctx.db.patch(args.applicationId, {
      status: 'ALIAS_REGISTRATION_PENDING',
      aliasAddr: addr,
      selectedVpa: addr, // backward compat
      updatedAt: now,
    });

    scheduleAuditLog(
      ctx,
      'ips_onboarding',
      args.applicationId,
      'HANDLE_CREATED',
      app.status,
      'ALIAS_REGISTRATION_PENDING'
    );
  },
});

// ---------------------------------------------------------------------------
// Step 8: Register Alias with IPN
// ---------------------------------------------------------------------------

export const registerAlias = mutation({
  args: {
    applicationId: v.id('ipsOnboardingApplications'),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const app = await ctx.db.get(args.applicationId);
    if (!app) throw new ConvexError({ code: 'NOT_FOUND', message: 'Application not found.' });
    await assertOwnerOrStaff(ctx, app.userId);

    if (app.status !== 'ALIAS_REGISTRATION_PENDING' || !app.aliasAddr) {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: 'Alias must be created before registration.',
      });
    }

    // Create local alias entry + schedule IPN sync (Phase 2 alias directory)
    const aliasId = await ctx.db.insert('ipsAliasDirectory', {
      userId,
      addr: app.aliasAddr,
      entityType: 'PERSON',
      idType: app.mobileNumberNormalized ? 'MOBILE' : 'NUMERICID',
      idValue: app.mobileNumberNormalized ?? userId,
      status: 'NEW',
      syncedWithIps: false,
      isDefault: true,
      linkedAccountRef: app.selectedAccountRef,
      linkedBankBic: app.selectedAccountIfsc,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.patch(args.applicationId, {
      aliasId,
      updatedAt: Date.now(),
    });

    // Schedule IPN registration
    await ctx.scheduler.runAfter(0, internal.actions.ipsAliasAdapter.reqRegMapper, {
      aliasId,
      operation: 'ADD',
      addr: app.aliasAddr,
      entityType: 'PERSON',
      idType: app.mobileNumberNormalized ? 'MOBILE' : 'NUMERICID',
      idValue: app.mobileNumberNormalized ?? userId,
      linkedAccountRef: app.selectedAccountRef,
      linkedBankBic: app.selectedAccountIfsc,
    });

    scheduleAuditLog(
      ctx,
      'ips_onboarding',
      args.applicationId,
      'ALIAS_REGISTRATION',
      app.status,
      'ALIAS_REGISTRATION_PENDING'
    );
  },
});

// ---------------------------------------------------------------------------
// Step 9: Confirm / Finalize Onboarding
// ---------------------------------------------------------------------------

export const confirmOnboarding = mutation({
  args: {
    applicationId: v.id('ipsOnboardingApplications'),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const app = await ctx.db.get(args.applicationId);
    if (!app) throw new ConvexError({ code: 'NOT_FOUND', message: 'Application not found.' });
    await assertOwnerOrStaff(ctx, app.userId);

    // Allow finalization from ALIAS_REGISTERED or ALIAS_REGISTRATION_PENDING
    if (app.status !== 'ALIAS_REGISTERED' && app.status !== 'ALIAS_REGISTRATION_PENDING') {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: `Cannot finalize from '${app.status}'. Alias must be registered first.`,
      });
    }

    const now = Date.now();
    await ctx.db.patch(args.applicationId, {
      status: 'READY_FOR_IPP_PAYMENTS',
      approvedAt: now,
      updatedAt: now,
    });

    scheduleAuditLog(
      ctx,
      'ips_onboarding',
      args.applicationId,
      'ONBOARDING_COMPLETE',
      app.status,
      'READY_FOR_IPP_PAYMENTS'
    );
  },
});

// ---------------------------------------------------------------------------
// Staff: Review / Approve / Reject
// ---------------------------------------------------------------------------

export const reviewOnboarding = mutation({
  args: {
    applicationId: v.id('ipsOnboardingApplications'),
    decision: v.union(v.literal('approved'), v.literal('rejected')),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, { applicationId, decision, rejectionReason }) => {
    await assertStaff(ctx);
    const app = await ctx.db.get(applicationId);
    if (!app) throw new ConvexError({ code: 'NOT_FOUND', message: 'Application not found.' });

    const now = Date.now();
    if (decision === 'approved') {
      await ctx.db.patch(applicationId, {
        status: 'READY_FOR_IPP_PAYMENTS',
        approvedAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(applicationId, {
        status: 'DEREGISTERED',
        rejectedAt: now,
        rejectionReason,
        updatedAt: now,
      });
    }

    scheduleAuditLog(
      ctx,
      'ips_onboarding',
      applicationId,
      decision === 'approved' ? 'APPROVE' : 'REJECT',
      app.status,
      decision === 'approved' ? 'READY_FOR_IPP_PAYMENTS' : 'DEREGISTERED',
      rejectionReason
    );
  },
});

// ---------------------------------------------------------------------------
// Internal: Update onboarding status from actions (no auth needed)
// ---------------------------------------------------------------------------

export const updateOnboardingStatus = internalMutation({
  args: {
    applicationId: v.id('ipsOnboardingApplications'),
    status: v.string(),
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.applicationId);
    if (!app) return;

    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.errorCode) updates.lastErrorCode = args.errorCode;
    if (args.errorMessage) updates.lastErrorMessage = args.errorMessage;
    // Clear errors on success
    if (!args.errorCode && !args.errorMessage) {
      updates.lastErrorCode = undefined;
      updates.lastErrorMessage = undefined;
    }

    await ctx.db.patch(args.applicationId, updates);

    scheduleAuditLog(
      ctx,
      'ips_onboarding',
      args.applicationId,
      'STATUS_UPDATE',
      app.status,
      args.status
    );
  },
});

// ---------------------------------------------------------------------------
// Legacy: Generic advance step (kept for backward compatibility)
// ---------------------------------------------------------------------------

const LEGACY_TRANSITIONS: Record<string, string> = {
  step_1_identity: 'step_2_bank_details',
  step_2_bank_details: 'step_3_documents',
  step_3_documents: 'step_4_vpa_selection',
  step_4_vpa_selection: 'step_5_review',
  step_5_review: 'step_6_submitted',
  step_6_submitted: 'step_7_approved',
};

export const advanceOnboardingStep = mutation({
  args: {
    applicationId: v.id('ipsOnboardingApplications'),
    stepData: v.any(),
    selectedVpa: v.optional(v.string()),
  },
  handler: async (ctx, { applicationId, stepData, selectedVpa }) => {
    const userId = await assertAuthenticated(ctx);
    const app = await ctx.db.get(applicationId);
    if (!app) throw new ConvexError({ code: 'NOT_FOUND', message: 'Application not found.' });
    await assertOwnerOrStaff(ctx, app.userId);

    const nextStep = LEGACY_TRANSITIONS[app.status];
    if (!nextStep) {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: `Cannot advance from '${app.status}'.`,
      });
    }

    const updates: Record<string, unknown> = {
      status: nextStep,
      updatedAt: Date.now(),
    };

    switch (app.status) {
      case 'step_1_identity':
        updates.identityData = stepData;
        break;
      case 'step_2_bank_details':
        updates.bankDetails = stepData;
        break;
      case 'step_4_vpa_selection':
        updates.selectedVpa = selectedVpa;
        break;
      case 'step_5_review':
        updates.submittedAt = Date.now();
        break;
    }

    await ctx.db.patch(applicationId, updates);
    scheduleAuditLog(ctx, 'ips_onboarding', applicationId, 'ADVANCE_STEP', app.status, nextStep);
  },
});
