/**
 * Approval workflow state machine.
 * Replaces 2 Supabase RPCs:
 *   submit_for_approval, process_approval_request
 *
 * Configurable per-entity workflow — any entity type (loans, disbursements, etc.)
 * can go through the approval pipeline.
 */

import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import { Id } from './_generated/dataModel';
import { internalMutation, mutation, query } from './_generated/server';
import { approveLoanCore } from './lib/approvalReadiness';
import { scheduleAuditEntry, scheduleAuditLog } from './lib/audit';
import { assertAdmin, assertAuthenticated, assertOwnerOrStaff, assertStaff } from './lib/auth';
import { emitDomainEvent } from './lib/domainEvents';
import { assertCallerFeatureEnabled } from './lib/entitlements';
import { emitRelationship } from './lib/relationshipEmitter';
import { applyTenantScope, resolveWriteInstitution, tenantReadScope } from './lib/tenancy';
import { approvalRequestStatus } from './schema';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getApprovalRequest = query({
  args: { requestId: v.id('approvalRequests') },
  handler: async (ctx, { requestId }) => {
    const request = await ctx.db.get(requestId);
    if (!request) {
      await assertAuthenticated(ctx);
      return null;
    }

    if (request.entityType === 'loan' || request.entityType === 'loans') {
      try {
        const loan = await ctx.db.get(request.entityId as Id<'loans'>);
        if (loan) {
          await assertOwnerOrStaff(ctx, loan.userId);
          return request;
        }
      } catch {
        // Fall through to staff-only when the entity id cannot be resolved.
      }
    }

    await assertStaff(ctx);
    return request;
  },
});

export const getApprovalsByEntity = query({
  args: { entityId: v.string() },
  handler: async (ctx, { entityId }) => {
    await assertStaff(ctx);
    const rows = await ctx.db
      .query('approvalRequests')
      .withIndex('by_entityId', (q) => q.eq('entityId', entityId))
      .order('desc')
      .collect();
    return applyTenantScope(rows, await tenantReadScope(ctx));
  },
});

/** Get the current user's own approval requests (for client dashboard). */
export const getMyApprovalRequests = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, limit }) => {
    const userId = await assertAuthenticated(ctx);
    const results = await ctx.db
      .query('approvalRequests')
      .withIndex('by_requestedBy', (q) => q.eq('requestedBy', userId))
      .order('desc')
      .take(limit ?? 100);
    if (status) {
      return results.filter((r) => r.status === status);
    }
    return results;
  },
});

export const adminListApprovals = query({
  args: {
    status: v.optional(approvalRequestStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, limit }) => {
    await assertStaff(ctx);
    const scope = await tenantReadScope(ctx);
    if (status) {
      const rows = await ctx.db
        .query('approvalRequests')
        .withIndex('by_status', (q) => q.eq('status', status))
        .order('desc')
        .take(limit ?? 100);
      return applyTenantScope(rows, scope);
    }
    const rows = await ctx.db
      .query('approvalRequests')
      .order('desc')
      .take(limit ?? 100);
    return applyTenantScope(rows, scope);
  },
});

export const getApprovalHistory = query({
  args: { requestId: v.id('approvalRequests') },
  handler: async (ctx, { requestId }) => {
    await assertStaff(ctx);
    return ctx.db
      .query('approvalHistory')
      .withIndex('by_approvalRequestId', (q) => q.eq('approvalRequestId', requestId))
      .order('desc')
      .collect();
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Submit an entity for approval.
 * Replaces `submit_for_approval` RPC.
 */
export const submitForApproval = mutation({
  args: {
    entityType: v.string(),
    entityId: v.string(),
    requestType: v.string(),
    priority: v.optional(
      v.union(v.literal('low'), v.literal('medium'), v.literal('high'), v.literal('urgent'))
    ),
    notes: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);

    // --- ENTITY VALIDATION ---
    // Only known entity types may be submitted, and the caller must own (or be staff
    // for) the referenced entity. This prevents arbitrary entityType/entityId injection.
    const ALLOWED_ENTITY_TYPES = ['loan'];
    if (!ALLOWED_ENTITY_TYPES.includes(args.entityType)) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: `Unsupported approval entity type '${args.entityType}'.`,
      });
    }

    if (args.entityType === 'loan') {
      const loan = await ctx.db.get(args.entityId as Id<'loans'>);
      if (!loan) {
        throw new ConvexError({ code: 'NOT_FOUND', message: 'Referenced loan not found.' });
      }
      await assertOwnerOrStaff(ctx, loan.userId);
      const TERMINAL = ['approved', 'funded', 'active', 'paid_off', 'written_off', 'rejected'];
      if (TERMINAL.includes(loan.status)) {
        throw new ConvexError({
          code: 'INVALID_STATE',
          message: `Loan in status '${loan.status}' cannot be submitted for approval.`,
        });
      }
    }

    // --- DEDUP ---
    // Idempotently return any existing open request for this entity.
    const existingOpen = (
      await ctx.db
        .query('approvalRequests')
        .withIndex('by_entityId', (q) => q.eq('entityId', args.entityId))
        .collect()
    ).find((r) => r.status === 'pending' || r.status === 'escalated');
    if (existingOpen) {
      return existingOpen._id;
    }

    const now = Date.now();
    const requestId = await ctx.db.insert('approvalRequests', {
      entityType: args.entityType,
      entityId: args.entityId,
      requestType: args.requestType,
      status: 'pending',
      requestedBy: userId,
      institutionId: await resolveWriteInstitution(ctx, {
        loanId: args.entityType === 'loan' ? (args.entityId as Id<'loans'>) : undefined,
      }),
      priority: args.priority,
      notes: args.notes,
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('approvalHistory', {
      approvalRequestId: requestId,
      action: 'SUBMITTED',
      actorId: userId,
      fromStatus: 'none',
      toStatus: 'pending',
      notes: args.notes,
      createdAt: now,
    });

    scheduleAuditLog(ctx, 'approval_request', requestId, 'SUBMIT', 'none', 'pending');

    // Ontology: entity → requires_approval → approvalRequest
    emitRelationship(
      ctx,
      { type: args.entityType, id: args.entityId },
      { type: 'approvalRequests', id: requestId },
      'requires_approval'
    );
    emitDomainEvent(
      ctx,
      'approval.submitted',
      'approvalRequests',
      requestId,
      {
        entityType: args.entityType,
        entityId: args.entityId,
        requestType: args.requestType,
        priority: args.priority,
      },
      { actorId: userId, actorType: 'user' }
    );

    // Notify requesting user that their application was received
    ctx.scheduler
      .runAfter(0, internal.notifications.createNotification, {
        userId,
        title: 'Application Received',
        message: 'Your loan application has been submitted and is pending review.',
        category: 'loan',
        priority: 'normal',
        actionUrl: '/dashboard',
        actionLabel: 'View Application',
      })
      .catch((err: unknown) =>
        console.error('[notification] submitForApproval notify failed:', err)
      );

    return requestId;
  },
});

/**
 * Process an approval request (approve / reject / escalate).
 * Replaces `process_approval_request` RPC.
 */
export const processApprovalRequest = mutation({
  args: {
    requestId: v.id('approvalRequests'),
    action: v.union(
      v.literal('approve'),
      v.literal('reject'),
      v.literal('escalate'),
      v.literal('withdraw')
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { requestId, action, notes }) => {
    const actorId = await assertStaff(ctx);
    const request = await ctx.db.get(requestId);
    if (!request)
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Approval request not found.' });

    if (request.status !== 'pending' && request.status !== 'escalated') {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: `Cannot process request in status '${request.status}'.`,
      });
    }

    type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'escalated' | 'withdrawn';
    const statusMap: Record<string, ApprovalStatus> = {
      approve: 'approved',
      reject: 'rejected',
      escalate: 'escalated',
      withdraw: 'withdrawn',
    };
    const newStatus = statusMap[action];

    await ctx.db.patch(requestId, {
      status: newStatus,
      currentApprover: actorId,
      updatedAt: Date.now(),
    });

    await ctx.db.insert('approvalHistory', {
      approvalRequestId: requestId,
      action: action.toUpperCase(),
      actorId: actorId,
      fromStatus: request.status,
      toStatus: newStatus,
      notes,
      createdAt: Date.now(),
    });

    scheduleAuditLog(
      ctx,
      'approval_request',
      requestId,
      action.toUpperCase(),
      request.status,
      newStatus,
      notes
    );
    emitRelationship(
      ctx,
      { type: 'approvalRequests', id: requestId },
      { type: 'users', id: actorId },
      'decided_by',
      { action, newStatus }
    );
    emitDomainEvent(
      ctx,
      action === 'approve'
        ? 'approval.approved'
        : action === 'reject'
          ? 'approval.rejected'
          : `approval.${action}`,
      'approvalRequests',
      requestId,
      { entityType: request.entityType, entityId: request.entityId, decision: action },
      { actorId, actorType: 'user' }
    );

    // If this request is for a loan, sync the loan status and notify the client
    if (request.entityType === 'loan' && request.entityId) {
      const loanId = request.entityId as Id<'loans'>;
      const loan = await ctx.db.get(loanId);

      if (loan) {
        if (action === 'approve') {
          // Route through the shared core so KYC / scoring / DTI / recommendation
          // invariants apply identically to the direct loans.approveLoan path.
          // A readiness failure throws and rolls back this entire mutation (fail-closed).
          await approveLoanCore(ctx, {
            loanId,
            actorUserId: actorId,
            source: 'approvalWorkflow',
            notes,
          });
        } else if (action === 'reject') {
          await ctx.db.patch(loanId, {
            status: 'rejected',
            rejectionReason: notes ?? 'Application rejected',
            rejectedAt: Date.now(),
            updatedAt: Date.now(),
          });
          scheduleAuditLog(ctx, 'loan', loanId, 'REJECT', loan.status, 'rejected', notes);
        }

        // Notify the loan applicant of the decision
        const notificationMessage =
          action === 'approve'
            ? 'Congratulations! Your loan application has been approved. A loan officer will be in touch to arrange disbursement.'
            : `Your loan application has been declined. ${notes ? `Reason: ${notes}` : 'Please contact us for more information.'}`;

        ctx.scheduler
          .runAfter(0, internal.notifications.createNotification, {
            userId: loan.userId,
            title: action === 'approve' ? 'Loan Approved' : 'Loan Application Update',
            message: notificationMessage,
            category: 'loan' as const,
            priority: action === 'approve' ? ('high' as const) : ('normal' as const),
            actionUrl: `/loans/${loanId}`,
            actionLabel: action === 'approve' ? 'View Loan' : 'View Details',
            metadata: { loanId, decision: action },
          })
          .catch((err: unknown) =>
            console.error('[notification] processApprovalRequest notify failed:', err)
          );
      }
    }
  },
});

// ---------------------------------------------------------------------------
// Workflow Definitions (admin)
// ---------------------------------------------------------------------------

export const createWorkflowDefinition = mutation({
  args: {
    name: v.string(),
    entityType: v.string(),
    stages: v.array(
      v.object({
        name: v.string(),
        order: v.number(),
        requiredRole: v.string(),
        actions: v.array(v.string()),
        conditions: v.optional(v.any()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    await assertCallerFeatureEnabled(ctx, 'workflows');
    const now = Date.now();
    const id = await ctx.db.insert('workflowDefinitions', {
      name: args.name,
      entityType: args.entityType,
      stages: args.stages,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    scheduleAuditEntry(ctx, {
      entityType: 'workflowDefinitions',
      entityId: id,
      action: 'CREATE',
      newState: { name: args.name, entityType: args.entityType, stageCount: args.stages.length },
    });
    emitRelationship(
      ctx,
      { type: 'workflowDefinitions', id },
      { type: 'system', id: args.entityType },
      'applies_to',
      { entityType: args.entityType }
    );
    return id;
  },
});

export const listWorkflowDefinitions = query({
  args: {},
  handler: async (ctx) => {
    await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'workflows');
    return ctx.db.query('workflowDefinitions').collect();
  },
});

/**
 * Create an approval request from a system process (no user context).
 * INTERNAL — called from processLoanApplication action.
 */
export const createSystemApprovalRequest = internalMutation({
  args: {
    entityType: v.string(),
    entityId: v.string(),
    requestType: v.string(),
    priority: v.optional(
      v.union(v.literal('low'), v.literal('medium'), v.literal('high'), v.literal('urgent'))
    ),
    details: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // DEDUP: if an open request already exists for this entity, return it.
    // This keeps processLoanApplication retries from creating duplicate requests.
    const existingOpen = (
      await ctx.db
        .query('approvalRequests')
        .withIndex('by_entityId', (q) => q.eq('entityId', args.entityId))
        .collect()
    ).find((r) => r.status === 'pending' || r.status === 'escalated');
    if (existingOpen) return existingOpen._id;

    // Use a system user as requestedBy — look up any admin or use a sentinel approach.
    // For system-generated requests we omit requestedBy from the direct insert.
    // The schema requires requestedBy: v.id("users"), so we find the first admin.
    // If no admin exists yet, skip creating the request gracefully.
    const adminRole = await ctx.db
      .query('userRoles')
      .filter((q) => q.or(q.eq(q.field('role'), 'admin'), q.eq(q.field('role'), 'tenant_admin')))
      .first();
    if (!adminRole) return null;

    const id = await ctx.db.insert('approvalRequests', {
      entityType: args.entityType,
      entityId: args.entityId,
      requestType: args.requestType,
      status: 'pending',
      requestedBy: adminRole.userId,
      institutionId: await resolveWriteInstitution(ctx, {
        loanId: args.entityType === 'loan' ? (args.entityId as Id<'loans'>) : undefined,
      }),
      priority: args.priority,
      metadata: args.details,
      createdAt: now,
      updatedAt: now,
    });
    scheduleAuditEntry(ctx, {
      entityType: 'approvalRequests',
      entityId: id,
      action: 'SYSTEM_CREATE',
      newState: {
        entityType: args.entityType,
        entityId: args.entityId,
        requestType: args.requestType,
        priority: args.priority,
      },
    });
    return id;
  },
});
