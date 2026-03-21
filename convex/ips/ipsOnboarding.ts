/**
 * IPP Onboarding — 7-step state machine.
 * Replaces ipsOnboardingService.ts.
 *
 * Steps: identity → bank_details → documents → vpa_selection → review → submitted → approved
 */

import { v } from 'convex/values';
import { query, mutation } from '../_generated/server';
import { ConvexError } from 'convex/values';
import { assertAuthenticated, assertStaff, assertOwnerOrStaff } from '../lib/auth';
import { scheduleAuditLog } from '../lib/audit';

const VALID_STEP_TRANSITIONS: Record<string, string> = {
  step_1_identity: 'step_2_bank_details',
  step_2_bank_details: 'step_3_documents',
  step_3_documents: 'step_4_vpa_selection',
  step_4_vpa_selection: 'step_5_review',
  step_5_review: 'step_6_submitted',
  step_6_submitted: 'step_7_approved',
};

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

/** Start a new onboarding application. */
export const startOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);

    const existing = await ctx.db
      .query('ipsOnboardingApplications')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();

    if (existing && existing.status !== 'rejected') {
      throw new ConvexError({
        code: 'ALREADY_EXISTS',
        message: 'An active onboarding application already exists.',
      });
    }

    const now = Date.now();
    return ctx.db.insert('ipsOnboardingApplications', {
      userId: userId,
      status: 'step_1_identity',
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Advance to the next onboarding step with step data. */
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

    const nextStep = VALID_STEP_TRANSITIONS[app.status];
    if (!nextStep) {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: `Cannot advance from step '${app.status}'.`,
      });
    }

    const updates: Record<string, unknown> = {
      status: nextStep,
      updatedAt: Date.now(),
    };

    // Store step data in appropriate field
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

/** Staff: approve or reject an onboarding application. */
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

    if (app.status !== 'step_6_submitted') {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: `Application must be submitted before review. Current: '${app.status}'.`,
      });
    }

    const now = Date.now();
    const updates: Record<string, unknown> = {
      status: decision === 'approved' ? 'step_7_approved' : 'rejected',
      updatedAt: now,
    };

    if (decision === 'approved') {
      updates.approvedAt = now;
    } else {
      updates.rejectedAt = now;
      updates.rejectionReason = rejectionReason;
    }

    await ctx.db.patch(applicationId, updates);

    scheduleAuditLog(
      ctx,
      'ips_onboarding',
      applicationId,
      decision === 'approved' ? 'APPROVE' : 'REJECT',
      'step_6_submitted',
      decision === 'approved' ? 'step_7_approved' : 'rejected',
      rejectionReason
    );
  },
});
