/**
 * NamLend Trust Portal — Convex Schema
 * Full document model for all 55+ domain tables.
 * Replaces PostgreSQL + RLS with typed Convex documents + auth-guard functions.
 */

import { authTables } from '@convex-dev/auth/server';
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// ---------------------------------------------------------------------------
// Shared validator fragments
// ---------------------------------------------------------------------------

/** 13-state settlement run FSM as per IRCS Back Office spec */
export const settlementRunState = v.union(
  v.literal('collecting'),
  v.literal('cutoff_reached'),
  v.literal('prepare_inputs'),
  v.literal('netting'),
  v.literal('generated'),
  v.literal('dispatched'),
  v.literal('sent_to_swift'),
  v.literal('swift_validated'),
  v.literal('sent_to_niss'),
  v.literal('niss_accepted'),
  v.literal('failed_validation'),
  v.literal('settled'),
  v.literal('closed'),
  v.literal('adjustment_pending')
);

export const kycStatus = v.union(
  v.literal('pending'),
  v.literal('submitted'),
  v.literal('verified'),
  v.literal('rejected')
);

export const loanStatus = v.union(
  v.literal('draft'),
  v.literal('submitted'),
  v.literal('under_review'),
  v.literal('approved'),
  v.literal('rejected'),
  v.literal('funded'),
  v.literal('active'),
  v.literal('paid_off'),
  v.literal('defaulted'),
  v.literal('written_off')
);

/**
 * Payment-schedule installment status.
 * 'partially_paid' is sticky: overdue-ness of a partially paid installment is
 * derived from dueDate < now by consumers; the daily cron only transitions
 * scheduled → overdue.
 */
export const paymentScheduleStatus = v.union(
  v.literal('scheduled'),
  v.literal('paid'),
  v.literal('partially_paid'),
  v.literal('overdue'),
  v.literal('waived')
);

/** txStatus: used for disbursements and as a base for other status unions */
export const txStatus = v.union(
  v.literal('pending'),
  v.literal('processing'),
  v.literal('completed'),
  v.literal('failed'),
  v.literal('reversed'),
  v.literal('cancelled')
);

/** Payment transaction status (extends txStatus with "refunded") */
export const paymentTxStatus = v.union(
  v.literal('pending'),
  v.literal('processing'),
  v.literal('completed'),
  v.literal('failed'),
  v.literal('reversed'),
  v.literal('refunded')
);

/** Approval request status */
export const approvalRequestStatus = v.union(
  v.literal('pending'),
  v.literal('approved'),
  v.literal('rejected'),
  v.literal('escalated'),
  v.literal('withdrawn')
);

/** IPS transaction status */
export const ipsTransactionStatus = v.union(
  v.literal('pending'),
  v.literal('processing'),
  v.literal('completed'),
  v.literal('failed'),
  v.literal('reversed'),
  v.literal('timeout')
);

export const ippDisputeCaseType = v.union(
  v.literal('refund'),
  v.literal('chargeback'),
  v.literal('pre_arbitration'),
  v.literal('arbitration'),
  v.literal('tcc'),
  v.literal('ret'),
  v.literal('drc'),
  v.literal('rrc'),
  v.literal('complaint')
);

export const ippDisputeStatus = v.union(
  v.literal('opened'),
  v.literal('awaiting_response'),
  v.literal('accepted'),
  v.literal('rejected'),
  v.literal('represented'),
  v.literal('escalated'),
  v.literal('resolved'),
  v.literal('deemed_accepted'),
  v.literal('closed')
);

export const ippRiskSeverity = v.union(
  v.literal('low'),
  v.literal('medium'),
  v.literal('high'),
  v.literal('critical')
);

export const ippListingStatus = v.union(
  v.literal('active'),
  v.literal('appealed'),
  v.literal('revoked'),
  v.literal('expired')
);

/** Loan credit recommendation */
export const loanRecommendation = v.union(
  v.literal('approve'),
  v.literal('review'),
  v.literal('reject')
);

/** Event journal actor type */
export const eventActorType = v.union(
  v.literal('user'),
  v.literal('system'),
  v.literal('webhook'),
  v.literal('cron')
);

/** Snapshot type for regulatory point-in-time captures */
export const snapshotType = v.union(
  v.literal('end_of_day'),
  v.literal('end_of_month'),
  v.literal('end_of_quarter'),
  v.literal('end_of_year'),
  v.literal('ad_hoc')
);

/** Ontology relationship status */
export const relationshipStatus = v.union(
  v.literal('active'),
  v.literal('inactive'),
  v.literal('superseded')
);

/** Mandate type */
export const mandateType = v.union(
  v.literal('debit_order'),
  v.literal('once_off_debit'),
  v.literal('recurring_collection'),
  v.literal('ipp_mandate')
);

/** Mandate status */
export const mandateStatus = v.union(
  v.literal('draft'),
  v.literal('pending_authorization'),
  v.literal('active'),
  v.literal('suspended'),
  v.literal('revoked'),
  v.literal('expired')
);

/** Mandate execution status */
export const mandateExecutionStatus = v.union(
  v.literal('pending'),
  v.literal('processing'),
  v.literal('completed'),
  v.literal('failed'),
  v.literal('reversed')
);

/** Mandate frequency */
export const mandateFrequency = v.union(
  v.literal('once'),
  v.literal('weekly'),
  v.literal('fortnightly'),
  v.literal('monthly'),
  v.literal('quarterly')
);

/** Consent type (POPIA-aligned) */
export const consentType = v.union(
  v.literal('data_processing'),
  v.literal('debit_mandate'),
  v.literal('credit_check'),
  v.literal('communication'),
  v.literal('data_sharing')
);

/** Consent status */
export const consentStatus = v.union(
  v.literal('granted'),
  v.literal('withdrawn'),
  v.literal('expired')
);

/** Institution type */
export const institutionType = v.union(
  v.literal('lender'),
  v.literal('bank'),
  v.literal('fintech'),
  v.literal('mno'),
  v.literal('regulator')
);

/** Institution status */
export const institutionStatus = v.union(
  v.literal('active'),
  v.literal('suspended'),
  v.literal('deregistered')
);

/** Payment rail status */
export const paymentRailStatus = v.union(
  v.literal('active'),
  v.literal('degraded'),
  v.literal('offline'),
  v.literal('decommissioned')
);

/** Product category */
export const productCategory = v.union(
  v.literal('loan'),
  v.literal('savings'),
  v.literal('insurance'),
  v.literal('investment')
);

/** Product status */
export const productStatus = v.union(
  v.literal('draft'),
  v.literal('active'),
  v.literal('discontinued')
);

/** Generalized account type */
export const accountType = v.union(
  v.literal('loan_principal'),
  v.literal('loan_interest'),
  v.literal('loan_fees'),
  v.literal('savings'),
  v.literal('clearing'),
  v.literal('income'),
  v.literal('suspense')
);

/** Account status */
export const accountStatus = v.union(v.literal('active'), v.literal('frozen'), v.literal('closed'));

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export default defineSchema({
  // authTables provides: users, authSessions, authAccounts, authRefreshTokens, authVerificationCodes, authRateLimits
  ...authTables,

  // ==========================================================================
  // IDENTITY & ACCESS
  // ==========================================================================

  /** Extended user profile — NamLend-specific fields beyond authTables.users */
  profiles: defineTable({
    userId: v.id('users'),
    institutionId: v.optional(v.id('institutions')),
    email: v.string(),
    fullName: v.optional(v.string()),
    phone: v.optional(v.string()),
    idNumber: v.optional(v.string()),
    idType: v.optional(v.string()),
    /**
     * Which sign-in path created this profile ('password' | 'google' | 'self_heal').
     * Drives the post-signup completion gate: OAuth gives us no phone or ID number,
     * so Google sign-ups must be asked for them. Deliberately an explicit marker
     * rather than inferring "incomplete" from blank fields — every profile that
     * predates this field has it undefined and is therefore never gated, which is
     * what stops the existing user base being trapped behind the new step.
     */
    signupSource: v.optional(v.string()),
    /** Set once phone + ID number have been supplied. Undefined = gate still live. */
    onboardingCompletedAt: v.optional(v.number()),
    address: v.optional(v.string()),
    addressLine1: v.optional(v.string()),
    addressLine2: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()), // ISO date string
    employmentStatus: v.optional(v.string()),
    employerName: v.optional(v.string()),
    employerPhone: v.optional(v.string()),
    employerContactPerson: v.optional(v.string()),
    monthlyIncome: v.optional(v.number()),
    bankName: v.optional(v.string()),
    accountNumber: v.optional(v.string()),
    branchCode: v.optional(v.string()),
    branchName: v.optional(v.string()),
    creditScore: v.optional(v.number()),
    profileCompletionPercentage: v.optional(v.number()),
    loanApplicationEligible: v.optional(v.boolean()),
    idDocumentVerified: v.optional(v.boolean()),
    bankStatementsVerified: v.optional(v.boolean()),
    payslipVerified: v.optional(v.boolean()),
    documentsComplete: v.optional(v.boolean()),
    kycStatus,
    status: v.optional(
      v.union(v.literal('active'), v.literal('deactivated'), v.literal('suspended'))
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_institutionId', ['institutionId']),

  /**
   * Role assignments — one row per user.
   * `tenant_admin` is the multi-tenant successor to `admin`; both are accepted by the
   * staff/admin guards during the additive transition (Phase 0). `institutionId` binds
   * tenant users to their tenant (optional during transition; required once tenancy is
   * enforced in Phase 1). Platform staff are NOT in this table — see `platformAdmins`.
   */
  userRoles: defineTable({
    userId: v.id('users'),
    role: v.union(
      v.literal('client'),
      v.literal('loan_officer'),
      v.literal('admin'),
      v.literal('tenant_admin')
    ),
    institutionId: v.optional(v.id('institutions')),
    assignedBy: v.optional(v.id('users')),
    createdAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_institutionId', ['institutionId']),

  /** KYC document uploads — linked to Convex File Storage */
  kycDocuments: defineTable({
    userId: v.id('users'),
    institutionId: v.optional(v.id('institutions')),
    documentType: v.string(),
    documentNumber: v.optional(v.string()),
    /** Original browser filename. Legacy rows may not have retained it. */
    fileName: v.optional(v.string()),
    fileStorageId: v.optional(v.id('_storage')),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    sha256: v.optional(v.string()),
    /** Versioning is additive so historical compliance records are never overwritten. */
    version: v.optional(v.number()),
    isCurrent: v.optional(v.boolean()),
    submittedAt: v.optional(v.number()),
    reviewedAt: v.optional(v.number()),
    supersededAt: v.optional(v.number()),
    supersededBy: v.optional(v.id('kycDocuments')),
    status: v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected')),
    reviewedBy: v.optional(v.id('users')),
    reviewNotes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_userId_documentType', ['userId', 'documentType'])
    .index('by_fileStorageId', ['fileStorageId'])
    .index('by_institutionId', ['institutionId']),

  /**
   * Short-lived access grants for document preview/download.
   *
   * `ctx.storage.getUrl()` returns a PERMANENT unauthenticated URL — a lifelong bearer
   * token to an ID scan for anyone who ever sees it. Instead, `requestDocumentAccess`
   * mints a grant row and the browser fetches `/documents/fetch?grant=<nonce>` on the
   * Convex site, which validates expiry server-side and streams the blob. DB-backed
   * rather than HMAC-signed: no shared secret to manage, revocable, and the row itself
   * is the fetch-audit record. Rows are retained after expiry (access history).
   */
  documentAccessGrants: defineTable({
    nonce: v.string(),
    storageId: v.id('_storage'),
    sourceTable: v.union(v.literal('kycDocuments'), v.literal('loanDocuments')),
    documentId: v.string(),
    /** Who was authorized — the guard already passed when the grant was minted. */
    actorId: v.id('users'),
    intent: v.union(v.literal('preview'), v.literal('download')),
    fileName: v.string(),
    mimeType: v.optional(v.string()),
    expiresAt: v.number(),
    createdAt: v.number(),
    fetchCount: v.number(),
    lastFetchedAt: v.optional(v.number()),
  }).index('by_nonce', ['nonce']),

  // ==========================================================================
  // LENDING CORE
  // ==========================================================================

  /**
   * Loan applications and lifecycle.
   * APR (interestRate) is server-validated against APR_LIMIT=32 on every write.
   */
  loans: defineTable({
    userId: v.id('users'),
    id: v.optional(v.string()),
    loanNumber: v.optional(v.string()),
    amount: v.optional(v.number()),
    principal: v.number(),
    interestRate: v.number(), // APR — validated <= 32% (Namibian law)
    termMonths: v.number(),
    monthlyPayment: v.optional(v.number()),
    totalRepayment: v.optional(v.number()),
    purpose: v.optional(v.string()),
    status: loanStatus,
    currentStage: v.optional(v.string()),
    outstandingBalance: v.optional(v.number()),
    totalPaid: v.optional(v.number()),
    creditScore: v.optional(v.number()),
    debtToIncomeRatio: v.optional(v.number()),
    recommendation: v.optional(loanRecommendation),
    disbursedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    rejectedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    metadata: v.optional(v.any()),
    // Financial data submitted with application (used for credit scoring)
    monthlyIncome: v.optional(v.number()),
    monthlyExpenses: v.optional(v.number()),
    existingDebt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Ontology forward-compatible fields (Phases 4-6)
    institutionId: v.optional(v.id('institutions')),
    productVersionId: v.optional(v.id('productVersions')),
    accountId: v.optional(v.id('accounts')),
    correlationId: v.optional(v.string()), // Tracks event chain across loan lifecycle
  })
    .index('by_userId', ['userId'])
    .index('by_status', ['status'])
    .index('by_loanNumber', ['loanNumber'])
    .index('by_institutionId', ['institutionId']),

  /** Loan supporting documents via Convex File Storage */
  loanDocuments: defineTable({
    institutionId: v.optional(v.id('institutions')),
    loanId: v.id('loans'),
    userId: v.id('users'),
    uploadedBy: v.optional(v.id('users')),
    documentType: v.string(),
    fileName: v.string(),
    fileStorageId: v.id('_storage'),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    sha256: v.optional(v.string()),
    version: v.optional(v.number()),
    isCurrent: v.optional(v.boolean()),
    reviewedBy: v.optional(v.id('users')),
    reviewedAt: v.optional(v.number()),
    reviewNotes: v.optional(v.string()),
    supersededAt: v.optional(v.number()),
    supersededBy: v.optional(v.id('loanDocuments')),
    status: v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected')),
    uploadedAt: v.number(),
  })
    .index('by_loanId', ['loanId'])
    .index('by_loanId_documentType', ['loanId', 'documentType'])
    .index('by_fileStorageId', ['fileStorageId']),

  /** Approval decisions on each loan — immutable after write */
  loanApprovals: defineTable({
    institutionId: v.optional(v.id('institutions')),
    loanId: v.id('loans'),
    reviewedBy: v.optional(v.id('users')),
    decision: v.union(
      v.literal('approved'),
      v.literal('rejected'),
      v.literal('pending'),
      v.literal('more_info')
    ),
    notes: v.optional(v.string()),
    stage: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_loanId', ['loanId']),

  // ==========================================================================
  // DISBURSEMENTS
  // ==========================================================================

  disbursements: defineTable({
    loanId: v.id('loans'),
    userId: v.id('users'),
    amount: v.number(),
    method: v.union(
      v.literal('bank_transfer'),
      v.literal('ips'),
      v.literal('mobile_money'),
      v.literal('cash'),
      v.literal('cheque')
    ),
    status: txStatus,
    referenceNumber: v.optional(v.string()),
    bankName: v.optional(v.string()),
    accountNumber: v.optional(v.string()),
    accountName: v.optional(v.string()),
    branchCode: v.optional(v.string()),
    ipsTransactionId: v.optional(v.id('ipsTransactions')),
    initiatedBy: v.optional(v.id('users')),
    processedAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Ontology forward-compatible fields (Phases 4-5)
    institutionId: v.optional(v.id('institutions')),
    railId: v.optional(v.id('paymentRails')),
  })
    .index('by_loanId', ['loanId'])
    .index('by_userId', ['userId'])
    .index('by_status', ['status'])
    .index('by_loanId_status', ['loanId', 'status'])
    .index('by_institutionId', ['institutionId']),

  // ==========================================================================
  // PAYMENTS
  // ==========================================================================

  paymentTransactions: defineTable({
    loanId: v.id('loans'),
    userId: v.id('users'),
    amount: v.number(),
    principalPaid: v.optional(v.number()),
    interestPaid: v.optional(v.number()),
    feesPaid: v.optional(v.number()),
    method: v.string(),
    paymentMethod: v.optional(v.string()),
    status: v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('reversed'),
      v.literal('refunded')
    ),
    referenceNumber: v.optional(v.string()),
    externalTransactionId: v.optional(v.string()),
    ipsTransactionId: v.optional(v.id('ipsTransactions')),
    paymentDate: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    paidAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Ontology forward-compatible field (Phase 4)
    institutionId: v.optional(v.id('institutions')),
  })
    .index('by_loanId', ['loanId'])
    .index('by_userId', ['userId'])
    .index('by_status', ['status'])
    .index('by_externalTransactionId', ['externalTransactionId'])
    .index('by_referenceNumber', ['referenceNumber'])
    .index('by_institutionId', ['institutionId']),

  paymentSchedules: defineTable({
    institutionId: v.optional(v.id('institutions')),
    loanId: v.id('loans'),
    installmentNumber: v.number(),
    dueDate: v.number(),
    principalDue: v.number(),
    interestDue: v.number(),
    totalDue: v.number(),
    paidAt: v.optional(v.number()),
    paidAmount: v.optional(v.number()),
    // Decomposition of paidAmount for cent-exact ledger derivation and
    // reversals. Invariant: paidAmount === principalPaidAmount + interestPaidAmount
    // (compared in integer cents). Legacy rows without these fields are
    // decomposed interest-first on read.
    principalPaidAmount: v.optional(v.number()),
    interestPaidAmount: v.optional(v.number()),
    status: paymentScheduleStatus,
    createdAt: v.number(),
  })
    .index('by_loanId', ['loanId'])
    .index('by_status', ['status']),

  /** Client payment-reschedule requests (self-service portal → staff review). */
  rescheduleRequests: defineTable({
    institutionId: v.optional(v.id('institutions')),
    userId: v.id('users'),
    loanId: v.id('loans'),
    originalDueDate: v.string(),
    requestedDate: v.string(),
    reason: v.string(),
    status: v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected')),
    adminNotes: v.optional(v.string()),
    reviewedBy: v.optional(v.id('users')),
    reviewedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_status', ['status']),

  /** Staff→client messages logged by the admin Communication Center. */
  communications: defineTable({
    institutionId: v.optional(v.id('institutions')),
    /** Recipient client. */
    userId: v.id('users'),
    sentBy: v.id('users'),
    type: v.union(v.literal('email'), v.literal('sms'), v.literal('call'), v.literal('in_app')),
    subject: v.string(),
    message: v.string(),
    status: v.union(
      v.literal('sent'),
      v.literal('delivered'),
      v.literal('read'),
      v.literal('replied'),
      v.literal('failed')
    ),
    priority: v.union(
      v.literal('low'),
      v.literal('medium'),
      v.literal('high'),
      v.literal('urgent')
    ),
    inReplyTo: v.optional(v.id('communications')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_status', ['status']),

  /** Client support tickets managed from the admin console. */
  supportTickets: defineTable({
    institutionId: v.optional(v.id('institutions')),
    /** Client the ticket concerns. */
    userId: v.id('users'),
    subject: v.string(),
    description: v.string(),
    category: v.union(
      v.literal('technical'),
      v.literal('billing'),
      v.literal('loan'),
      v.literal('account'),
      v.literal('general')
    ),
    priority: v.union(
      v.literal('low'),
      v.literal('medium'),
      v.literal('high'),
      v.literal('urgent')
    ),
    status: v.union(
      v.literal('open'),
      v.literal('in_progress'),
      v.literal('resolved'),
      v.literal('closed')
    ),
    assignedTo: v.optional(v.id('users')),
    responses: v.array(
      v.object({
        byUserId: v.id('users'),
        byName: v.string(),
        message: v.string(),
        at: v.number(),
      })
    ),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_status', ['status']),

  /**
   * Per-(payment × installment) allocation ledger — records exactly which
   * cents of each completed payment settled which installment, enabling
   * cent-exact reversals. Append-only (7-year retention; no hard deletes).
   */
  paymentAllocations: defineTable({
    paymentId: v.id('paymentTransactions'),
    /** Absent for direct-principal allocations (loans without schedule rows). */
    scheduleId: v.optional(v.id('paymentSchedules')),
    loanId: v.id('loans'),
    institutionId: v.optional(v.id('institutions')),
    principalCents: v.number(),
    interestCents: v.number(),
    /** True when this allocation waived the row (unearned-interest rebate on settlement). */
    waived: v.optional(v.boolean()),
    /** Set when a reversal un-applied this allocation. */
    reversedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_paymentId', ['paymentId'])
    .index('by_scheduleId', ['scheduleId'])
    .index('by_loanId', ['loanId']),

  // ==========================================================================
  // APPROVAL WORKFLOW
  // ==========================================================================

  approvalRequests: defineTable({
    entityType: v.string(),
    entityId: v.string(), // Convex document ID as string
    requestType: v.string(),
    status: v.union(
      v.literal('pending'),
      v.literal('approved'),
      v.literal('rejected'),
      v.literal('escalated'),
      v.literal('withdrawn')
    ),
    requestedBy: v.id('users'),
    currentApprover: v.optional(v.id('users')),
    priority: v.optional(
      v.union(v.literal('low'), v.literal('medium'), v.literal('high'), v.literal('urgent'))
    ),
    dueBy: v.optional(v.number()),
    notes: v.optional(v.string()),
    metadata: v.optional(v.any()),
    institutionId: v.optional(v.id('institutions')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_entityId', ['entityId'])
    .index('by_status', ['status'])
    .index('by_requestedBy', ['requestedBy'])
    .index('by_institutionId', ['institutionId']),

  approvalHistory: defineTable({
    approvalRequestId: v.id('approvalRequests'),
    action: v.string(),
    actorId: v.id('users'),
    fromStatus: v.string(),
    toStatus: v.string(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_approvalRequestId', ['approvalRequestId']),

  workflowDefinitions: defineTable({
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
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  workflowInstances: defineTable({
    definitionId: v.id('workflowDefinitions'),
    entityId: v.string(),
    entityType: v.string(),
    currentStage: v.string(),
    status: v.union(
      v.literal('active'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('cancelled')
    ),
    context: v.optional(v.any()),
    startedBy: v.id('users'),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_entityId', ['entityId']),

  // ==========================================================================
  // NOTIFICATIONS
  // ==========================================================================

  notifications: defineTable({
    institutionId: v.optional(v.id('institutions')),
    userId: v.id('users'),
    type: v.optional(v.string()),
    channel: v.optional(
      v.union(v.literal('in_app'), v.literal('email'), v.literal('sms'), v.literal('whatsapp'))
    ),
    title: v.string(),
    body: v.optional(v.string()),
    message: v.optional(v.string()), // alias used by createNotification
    category: v.optional(
      v.union(
        v.literal('loan'),
        v.literal('payment'),
        v.literal('kyc'),
        v.literal('account'),
        v.literal('general'),
        v.literal('marketing')
      )
    ),
    priority: v.optional(
      v.union(v.literal('low'), v.literal('normal'), v.literal('high'), v.literal('urgent'))
    ),
    actionUrl: v.optional(v.string()),
    actionLabel: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    /** Stable per-recipient lifecycle key used to make notification fan-out replay-safe. */
    dedupeKey: v.optional(v.string()),
    isRead: v.boolean(),
    readAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_userId_isRead', ['userId', 'isRead'])
    .index('by_userId_dedupeKey', ['userId', 'dedupeKey']),

  notificationTemplates: defineTable({
    name: v.string(),
    channel: v.string(),
    subject: v.optional(v.string()),
    body: v.string(),
    variables: v.optional(v.array(v.string())),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_name', ['name']),

  notificationQueue: defineTable({
    userId: v.id('users'),
    channel: v.string(),
    templateId: v.optional(v.id('notificationTemplates')),
    recipient: v.optional(v.string()), // phone number or email
    subject: v.optional(v.string()),
    body: v.optional(v.string()),
    content: v.optional(v.string()), // alias used by enqueueNotification
    status: v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('sending'),
      v.literal('sent'),
      v.literal('failed')
    ),
    attempts: v.optional(v.number()),
    retryCount: v.optional(v.number()), // alias used by enqueueNotification
    scheduledAt: v.optional(v.number()),
    lastAttemptAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index('by_status', ['status']),

  /** User notification preferences per channel/category */
  notificationPreferences: defineTable({
    institutionId: v.optional(v.id('institutions')),
    userId: v.id('users'),
    channel: v.string(),
    category: v.string(),
    enabled: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_userId', ['userId']),

  communicationLogs: defineTable({
    institutionId: v.optional(v.id('institutions')),
    userId: v.id('users'),
    channel: v.string(),
    direction: v.union(v.literal('inbound'), v.literal('outbound')),
    recipient: v.string(),
    subject: v.optional(v.string()),
    body: v.string(),
    status: v.string(),
    externalId: v.optional(v.string()),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index('by_userId', ['userId']),

  // ==========================================================================
  // IPS/IPP TRANSACTIONS
  // ==========================================================================

  /**
   * IPS transactions — 54-column equivalent.
   * Idempotency enforced via by_msgId index + uniqueness check in mutation.
   */
  ipsTransactions: defineTable({
    institutionId: v.optional(v.id('institutions')),
    msgId: v.string(), // idempotency key — unique per transaction
    txType: v.union(
      v.literal('credit_transfer'),
      v.literal('request_to_pay'),
      v.literal('reversal')
    ),
    direction: v.union(v.literal('inbound'), v.literal('outbound')),
    useCaseType: v.optional(
      v.union(
        v.literal('P2P'),
        v.literal('P2M'),
        v.literal('ATM'),
        v.literal('G2P'),
        v.literal('B2P')
      )
    ),
    status: v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('reversed'),
      v.literal('timeout')
    ),
    amount: v.number(),
    currency: v.string(),
    debtorVpa: v.optional(v.string()),
    creditorVpa: v.optional(v.string()),
    debtorName: v.optional(v.string()),
    creditorName: v.optional(v.string()),
    debtorBic: v.optional(v.string()),
    creditorBic: v.optional(v.string()),
    endToEndId: v.optional(v.string()),
    remittanceInfo: v.optional(v.string()),
    loanId: v.optional(v.id('loans')),
    userId: v.optional(v.id('users')),
    disbursementId: v.optional(v.id('disbursements')),
    paymentId: v.optional(v.id('paymentTransactions')),
    clientRequestId: v.optional(v.string()),
    purposeCode: v.optional(v.string()),
    initiationMode: v.optional(v.string()),
    channel: v.optional(v.string()),
    limitScopeKey: v.optional(v.string()),
    ackAt: v.optional(v.number()),
    callbackAt: v.optional(v.number()),
    transport: v.optional(v.any()),
    externalRef: v.optional(v.string()),
    rawRequest: v.optional(v.any()),
    rawResponse: v.optional(v.any()),
    errorCode: v.optional(v.string()),
    errorDescription: v.optional(v.string()),
    settlementDate: v.optional(v.string()),
    initiatedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_msgId', ['msgId'])
    .index('by_status', ['status'])
    .index('by_loanId', ['loanId'])
    .index('by_userId', ['userId'])
    .index('by_clientRequestId', ['clientRequestId'])
    .index('by_settlementDate_status', ['settlementDate', 'status']),

  vpaRegistry: defineTable({
    institutionId: v.optional(v.id('institutions')),
    userId: v.id('users'),
    vpa: v.string(),
    vpaType: v.union(v.literal('collection'), v.literal('disbursement'), v.literal('personal')),
    bankBic: v.optional(v.string()),
    accountNumber: v.optional(v.string()),
    isDefault: v.boolean(),
    status: v.union(v.literal('active'), v.literal('inactive'), v.literal('suspended')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_vpa', ['vpa']),

  ipsApiLogs: defineTable({
    institutionId: v.optional(v.id('institutions')),
    transactionId: v.optional(v.id('ipsTransactions')),
    method: v.string(),
    endpoint: v.string(),
    requestMsgId: v.optional(v.string()),
    requestBody: v.optional(v.any()),
    responseStatus: v.optional(v.number()),
    responseBody: v.optional(v.any()),
    durationMs: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    // Phase 1: XML protocol support fields
    direction: v.optional(
      v.union(v.literal('OUTBOUND'), v.literal('INBOUND'), v.literal('CALLBACK'))
    ),
    contentType: v.optional(v.union(v.literal('json'), v.literal('xml'))),
    apiName: v.optional(v.string()), // e.g. "ReqPay", "RespPay", "ReqValAdd"
    rawXml: v.optional(v.string()), // full XML body for audit trail
    correlationId: v.optional(v.string()), // for tracing async Req→Resp pairs
    createdAt: v.number(),
  })
    .index('by_transactionId', ['transactionId'])
    .index('by_requestMsgId', ['requestMsgId', 'createdAt']),

  ipsAlerts: defineTable({
    transactionId: v.optional(v.id('ipsTransactions')),
    alertType: v.string(),
    severity: v.union(v.literal('info'), v.literal('warning'), v.literal('critical')),
    message: v.string(),
    isResolved: v.boolean(),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.id('users')),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index('by_isResolved', ['isResolved']),

  ippRiskEvents: defineTable({
    transactionId: v.optional(v.id('ipsTransactions')),
    userId: v.optional(v.id('users')),
    aliasId: v.optional(v.id('ipsAliasDirectory')),
    score: v.number(),
    severity: ippRiskSeverity,
    decision: v.union(
      v.literal('pass'),
      v.literal('alert'),
      v.literal('block'),
      v.literal('simulation')
    ),
    triggeredRules: v.array(v.string()),
    reason: v.string(),
    status: v.union(v.literal('open'), v.literal('reviewing'), v.literal('resolved')),
    alertId: v.optional(v.id('ipsAlerts')),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.id('users')),
  })
    .index('by_transactionId', ['transactionId'])
    .index('by_userId', ['userId'])
    .index('by_status', ['status'])
    .index('by_severity', ['severity']),

  ippHandleListings: defineTable({
    userId: v.optional(v.id('users')),
    aliasId: v.optional(v.id('ipsAliasDirectory')),
    addr: v.string(),
    listingType: v.union(v.literal('hotlist'), v.literal('blacklist')),
    status: ippListingStatus,
    source: v.union(
      v.literal('manual'),
      v.literal('fraud_rule'),
      v.literal('operator_instruction'),
      v.literal('sanctions'),
      v.literal('court_order')
    ),
    reasonCode: v.optional(v.string()),
    reasonDescription: v.string(),
    evidence: v.optional(v.any()),
    effectiveAt: v.number(),
    expiresAt: v.optional(v.number()),
    reviewDueAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    revokedBy: v.optional(v.id('users')),
    createdBy: v.optional(v.id('users')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_addr_status', ['addr', 'status'])
    .index('by_userId_status', ['userId', 'status'])
    .index('by_aliasId', ['aliasId'])
    .index('by_status', ['status'])
    .index('by_reviewDueAt', ['reviewDueAt']),

  ipsOnboardingApplications: defineTable({
    userId: v.id('users'),
    /** IPS-mandated onboarding state — matches IPPOnboardingState in src/types/ips.ts */
    status: v.union(
      v.literal('NOT_STARTED'),
      v.literal('DEVICE_BINDING_REQUIRED'),
      v.literal('DEVICE_BOUND'),
      v.literal('SOV_SELECTION_PENDING'),
      v.literal('SOV_SELECTED'),
      v.literal('ACCOUNTS_LISTED'),
      v.literal('VERIFICATION_PENDING'),
      v.literal('VERIFIED'),
      v.literal('IPS_PIN_SETTING'),
      v.literal('IPS_PIN_SET'),
      v.literal('ALIAS_REGISTRATION_PENDING'),
      v.literal('ALIAS_REGISTERED'),
      v.literal('READY_FOR_IPP_PAYMENTS'),
      v.literal('SUSPENDED'),
      v.literal('DEREGISTERED'),
      // Legacy states kept for backward compatibility with existing records
      v.literal('step_1_identity'),
      v.literal('step_2_bank_details'),
      v.literal('step_3_documents'),
      v.literal('step_4_vpa_selection'),
      v.literal('step_5_review'),
      v.literal('step_6_submitted'),
      v.literal('step_7_approved'),
      v.literal('rejected')
    ),
    // Device binding
    deviceBindingId: v.optional(v.id('ipsDeviceBindings')),
    mobileNumberNormalized: v.optional(v.string()),
    // SoV provider selection
    sovProviderCode: v.optional(v.string()),
    sovProviderName: v.optional(v.string()),
    availableSovProviders: v.optional(
      v.array(
        v.object({
          providerCode: v.string(),
          providerName: v.string(),
          providerHandle: v.optional(v.string()),
          providerOrgId: v.optional(v.string()),
          providerIfsc: v.optional(v.string()),
          active: v.optional(v.string()),
          mobRegFormat: v.optional(v.string()),
          featureSupported: v.optional(v.string()),
          supportsDebitCard: v.optional(v.boolean()),
          supportsWalletPin: v.optional(v.boolean()),
        })
      )
    ),
    // Account selection
    selectedAccountRef: v.optional(v.string()),
    selectedAccountMasked: v.optional(v.string()),
    selectedAccountIfsc: v.optional(v.string()),
    selectedAccountType: v.optional(v.string()),
    selectedAccountHolderName: v.optional(v.string()),
    selectedAccountAeba: v.optional(v.string()),
    selectedAccountMbeba: v.optional(v.string()),
    selectedAccountCredsAllowed: v.optional(
      v.array(
        v.object({
          type: v.string(),
          subType: v.string(),
          dType: v.optional(v.string()),
          dLength: v.optional(v.string()),
        })
      )
    ),
    availableAccounts: v.optional(
      v.array(
        v.object({
          accountRef: v.string(),
          maskedAccountNumber: v.optional(v.string()),
          accountType: v.optional(v.string()),
          accountHolderName: v.optional(v.string()),
          ifsc: v.optional(v.string()),
          mmid: v.optional(v.string()),
          aeba: v.optional(v.string()),
          mbeba: v.optional(v.string()),
          aadhaarNo: v.optional(v.string()),
          credsAllowed: v.optional(
            v.array(
              v.object({
                type: v.string(),
                subType: v.string(),
                dType: v.optional(v.string()),
                dLength: v.optional(v.string()),
              })
            )
          ),
          verificationMethods: v.optional(v.array(v.string())),
        })
      )
    ),
    // Verification method
    verificationMethod: v.optional(v.union(v.literal('debit_card'), v.literal('mno'))),
    // IPS PIN
    ipsPinSet: v.optional(v.boolean()),
    // Alias
    aliasAddr: v.optional(v.string()),
    aliasId: v.optional(v.id('ipsAliasDirectory')),
    aliasRegistrationRequestMsgId: v.optional(v.string()),
    aliasRegistrationRequestedAt: v.optional(v.number()),
    aliasRegistrationConfirmedAt: v.optional(v.number()),
    aliasAvailabilityStatus: v.optional(
      v.union(
        v.literal('pending'),
        v.literal('available'),
        v.literal('unavailable'),
        v.literal('failed')
      )
    ),
    aliasAvailabilityCheckedAt: v.optional(v.number()),
    aliasAvailabilityRequestMsgId: v.optional(v.string()),
    // Error tracking
    lastErrorCode: v.optional(v.string()),
    lastErrorMessage: v.optional(v.string()),
    // Legacy fields (kept for existing records)
    identityData: v.optional(v.any()),
    bankDetails: v.optional(v.any()),
    selectedVpa: v.optional(v.string()),
    submittedAt: v.optional(v.number()),
    approvedAt: v.optional(v.number()),
    rejectedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_status', ['status'])
    .index('by_aliasId', ['aliasId']),

  ipsDeviceBindings: defineTable({
    userId: v.id('users'),
    onboardingId: v.id('ipsOnboardingApplications'),
    deviceId: v.string(),
    deviceName: v.optional(v.string()),
    publicKey: v.string(),
    status: v.union(v.literal('active'), v.literal('revoked'), v.literal('expired')),
    boundAt: v.number(),
    expiresAt: v.optional(v.number()),
  }).index('by_userId', ['userId']),

  // IPN Alias Directory — centralized alias registry synced with IPN
  ipsAliasDirectory: defineTable({
    userId: v.id('users'),
    /** Full alias address (e.g., "john@namlend", "812345678@namlend") */
    addr: v.string(),
    /** Entity type per IPN spec */
    entityType: v.union(v.literal('PERSON'), v.literal('ENTITY')),
    /** Identifier type: MOBILE (9-digit normalized) or NUMERICID */
    idType: v.union(v.literal('MOBILE'), v.literal('NUMERICID')),
    /** Normalized identifier value (9-digit mobile or numeric ID) */
    idValue: v.string(),
    /** IPN Alias Directory lifecycle status */
    status: v.union(
      v.literal('NEW'),
      v.literal('ACTIVE'),
      v.literal('INACTIVE'),
      v.literal('BLOCKED'),
      v.literal('DEREGISTERED'),
      v.literal('PORTED')
    ),
    /** Central Mapper ID returned by IPN on successful registration */
    cmId: v.optional(v.string()),
    /** Alias expiration timestamp (if time-limited) */
    expiryTs: v.optional(v.number()),
    /** Linked bank account reference */
    linkedAccountRef: v.optional(v.string()),
    /** Linked bank BIC/SWIFT code */
    linkedBankBic: v.optional(v.string()),
    /** Account holder name (from bank verification) */
    accountHolderName: v.optional(v.string()),
    /** Whether this alias has been synced with IPN directory */
    syncedWithIps: v.boolean(),
    /** Last successful sync timestamp */
    lastSyncAt: v.optional(v.number()),
    /** Last sync error message (cleared on success) */
    syncError: v.optional(v.string()),
    /** Whether this is the user's default/primary alias */
    isDefault: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_addr', ['addr'])
    .index('by_status', ['status'])
    .index('by_idValue', ['idValue'])
    .index('by_syncedWithIps', ['syncedWithIps']),

  // ==========================================================================
  // SETTLEMENT SYSTEM
  // ==========================================================================

  settlementParticipants: defineTable({
    routingCode: v.string(),
    swiftBic: v.string(),
    name: v.string(),
    participantType: v.union(v.literal('direct'), v.literal('sponsored')),
    sponsorId: v.optional(v.id('settlementParticipants')),
    nissAccountRef: v.optional(v.string()),
    isOperator: v.boolean(),
    status: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_routingCode', ['routingCode']),

  settlementWindows: defineTable({
    windowId: v.string(),
    dayOfWeek: v.number(), // 0=Sun … 6=Sat
    cutoffTime: v.string(), // "HH:mm"
    enabled: v.boolean(),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_windowId', ['windowId']),

  settlementHolidays: defineTable({
    holidayDate: v.string(), // "YYYY-MM-DD"
    description: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_holidayDate', ['holidayDate']),

  settlementFeeRules: defineTable({
    feeType: v.string(),
    productType: v.optional(v.string()),
    rateType: v.union(v.literal('percentage'), v.literal('fixed'), v.literal('tiered')),
    rateValue: v.optional(v.number()),
    rateTiers: v.optional(v.any()),
    direction: v.optional(v.string()),
    effectiveFrom: v.string(),
    effectiveTo: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  /**
   * Settlement runs — immutable once state reaches settled/closed.
   * runId is a human-readable slug like "SR-20260222-W3".
   */
  settlementRuns: defineTable({
    runId: v.string(),
    windowId: v.string(),
    settlementDate: v.string(), // "YYYY-MM-DD"
    currency: v.string(),
    schemeVersion: v.string(),
    state: settlementRunState,
    amendmentSeq: v.number(),
    transactionCount: v.number(),
    totalPrincipal: v.number(),
    totalInterchange: v.number(),
    totalSwitchingFee: v.number(),
    netInstructionCount: v.number(),
    cutoffAt: v.optional(v.number()),
    nettingCompletedAt: v.optional(v.number()),
    generatedAt: v.optional(v.number()),
    dispatchedAt: v.optional(v.number()),
    settledAt: v.optional(v.number()),
    closedAt: v.optional(v.number()),
    createdBy: v.optional(v.id('users')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_runId', ['runId'])
    .index('by_state', ['state'])
    .index('by_settlementDate', ['settlementDate']),

  /** Gross bilateral obligations — append-only after initial write */
  settlementObligations: defineTable({
    runId: v.id('settlementRuns'),
    sourceParticipantId: v.id('settlementParticipants'),
    targetParticipantId: v.id('settlementParticipants'),
    category: v.union(
      v.literal('principal'),
      v.literal('interchange'),
      v.literal('switching_fee'),
      v.literal('penalty'),
      v.literal('adjustment')
    ),
    amount: v.number(),
    sourceTxId: v.optional(v.id('ipsTransactions')),
    feeRuleId: v.optional(v.id('settlementFeeRules')),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index('by_runId', ['runId']),

  settlementExposures: defineTable({
    runId: v.id('settlementRuns'),
    participantId: v.id('settlementParticipants'),
    grossPayables: v.number(),
    grossReceivables: v.number(),
    netPosition: v.number(),
    switchingFeePayable: v.number(),
    interchangeNet: v.number(),
    calculatedAt: v.number(),
  }).index('by_runId', ['runId']),

  settlementNetInstructions: defineTable({
    runId: v.id('settlementRuns'),
    instructionId: v.string(),
    sourceParticipantId: v.id('settlementParticipants'),
    targetParticipantId: v.id('settlementParticipants'),
    amount: v.number(),
    categoryGroup: v.string(),
    batchType: v.union(v.literal('main'), v.literal('switching_fee')),
    endToEndId: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_runId', ['runId']),

  settlementPacs009Batches: defineTable({
    runId: v.id('settlementRuns'),
    batchType: v.union(v.literal('main'), v.literal('switching_fee')),
    msgId: v.string(),
    fileName: v.string(),
    fileContent: v.optional(v.string()), // XML payload stored inline
    fileChecksum: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    instructionCount: v.number(),
    totalAmount: v.number(),
    status: v.string(),
    dispatchedAt: v.optional(v.number()),
    validatedAt: v.optional(v.number()),
    acceptedAt: v.optional(v.number()),
    failedAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_runId', ['runId'])
    .index('by_msgId', ['msgId']),

  settlementReports: defineTable({
    runId: v.id('settlementRuns'),
    participantId: v.optional(v.id('settlementParticipants')),
    reportType: v.union(
      v.literal('raw_data'),
      v.literal('ntsl'),
      v.literal('adjustment'),
      v.literal('pending_adjustment_response'),
      v.literal('pending_status'),
      v.literal('timeout')
    ),
    fileName: v.string(),
    fileContent: v.optional(v.string()),
    fileChecksum: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    reportData: v.optional(v.any()),
    distributedAt: v.optional(v.number()),
    distributionChannel: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_runId', ['runId']),

  settlementAdjustments: defineTable({
    runId: v.optional(v.id('settlementRuns')),
    originalTxId: v.optional(v.id('ipsTransactions')),
    adjustmentType: v.string(),
    sourceParticipantId: v.id('settlementParticipants'),
    targetParticipantId: v.id('settlementParticipants'),
    amount: v.number(),
    currency: v.string(),
    reasonCode: v.optional(v.string()),
    reasonDescription: v.optional(v.string()),
    status: v.string(),
    responseRequiredBy: v.optional(v.number()),
    respondedAt: v.optional(v.number()),
    responseNotes: v.optional(v.string()),
    settledInRunId: v.optional(v.id('settlementRuns')),
    createdBy: v.optional(v.id('users')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_runId', ['runId'])
    .index('by_status', ['status'])
    .index('by_originalTxId', ['originalTxId'])
    .index('by_responseRequiredBy', ['responseRequiredBy']),

  settlementTimeoutTransactions: defineTable({
    runId: v.optional(v.id('settlementRuns')),
    originalTxId: v.string(),
    participantId: v.id('settlementParticipants'),
    counterpartyId: v.id('settlementParticipants'),
    amount: v.number(),
    timeoutReason: v.optional(v.string()),
    status: v.string(),
    resolutionNotes: v.optional(v.string()),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.id('users')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_status', ['status'])
    .index('by_runId', ['runId'])
    .index('by_originalTxId', ['originalTxId']),

  settlementAcknowledgements: defineTable({
    msgId: v.string(),
    ackType: v.union(v.literal('xsys_001'), v.literal('xsys_002'), v.literal('xsys_003')),
    batchId: v.optional(v.id('settlementPacs009Batches')),
    runId: v.optional(v.id('settlementRuns')),
    rawPayload: v.optional(v.string()),
    errorCode: v.optional(v.string()),
    errorDescription: v.optional(v.string()),
    receivedAt: v.number(),
    processedAt: v.optional(v.number()),
    correlationKeys: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index('by_msgId', ['msgId'])
    .index('by_batchId', ['batchId'])
    .index('by_runId', ['runId']),

  ippDisputeCases: defineTable({
    caseId: v.string(),
    originalTxId: v.optional(v.id('ipsTransactions')),
    runId: v.optional(v.id('settlementRuns')),
    caseType: ippDisputeCaseType,
    status: ippDisputeStatus,
    amount: v.number(),
    currency: v.string(),
    reasonCode: v.optional(v.string()),
    reasonDescription: v.string(),
    sourceParticipantId: v.optional(v.id('settlementParticipants')),
    targetParticipantId: v.optional(v.id('settlementParticipants')),
    raisedByUserId: v.optional(v.id('users')),
    assignedTo: v.optional(v.id('users')),
    responseDueAt: v.optional(v.number()),
    resolvedAt: v.optional(v.number()),
    resolutionNotes: v.optional(v.string()),
    settlementAdjustmentId: v.optional(v.id('settlementAdjustments')),
    evidence: v.optional(v.any()),
    retentionUntil: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_caseId', ['caseId'])
    .index('by_originalTxId', ['originalTxId'])
    .index('by_runId', ['runId'])
    .index('by_status', ['status'])
    .index('by_responseDueAt', ['responseDueAt']),

  ippTransactionReceipts: defineTable({
    transactionId: v.id('ipsTransactions'),
    userId: v.optional(v.id('users')),
    receiptNumber: v.string(),
    terminalStatus: ipsTransactionStatus,
    amount: v.number(),
    currency: v.string(),
    direction: v.string(),
    payerAlias: v.optional(v.string()),
    payeeAlias: v.optional(v.string()),
    reason: v.optional(v.string()),
    notificationId: v.optional(v.id('notifications')),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index('by_transactionId', ['transactionId'])
    .index('by_userId', ['userId'])
    .index('by_receiptNumber', ['receiptNumber']),

  // ==========================================================================
  // TIGERBEETLE (Shadow Ledger + Outbox)
  // ==========================================================================

  /**
   * Outbox pattern — atomic with the triggering financial write.
   * Scheduler (every 30s) claims entries and posts to TigerBeetle at localhost:3001.
   */
  tigerBeetleOutbox: defineTable({
    eventType: v.string(), // CREATE_ACCOUNT | DISBURSEMENT | REPAYMENT | REPAYMENT_REVERSAL | LATE_FEE | IPS_INITIATE | IPS_COMPLETE | IPS_REVERSE
    sourceTable: v.string(),
    sourceId: v.string(), // Convex document ID
    payload: v.any(),
    status: v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('dead_letter')
    ),
    retryCount: v.number(),
    nextRetryAt: v.optional(v.number()),
    processedAt: v.optional(v.number()),
    tbTransferIds: v.optional(v.array(v.string())),
    lastError: v.optional(v.string()),
    // Deterministic idempotency key for money-movement entries. Each money movement
    // maps to exactly one ledger row; duplicate enqueues (double-click, webhook/IPS
    // replay, retry) are no-ops. See convex/lib/outbox.ts:enqueueOutboxIdempotent.
    idempotencyKey: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_status', ['status'])
    .index('by_sourceId', ['sourceId'])
    .index('by_idempotencyKey', ['idempotencyKey']),

  tigerBeetleAccounts: defineTable({
    entityType: v.string(), // LOAN_PRINCIPAL | LOAN_INTEREST | LOAN_FEE | etc.
    entityId: v.string(), // Convex document ID
    tbAccountIdHigh: v.number(),
    tbAccountIdLow: v.number(),
    ledger: v.number(),
    code: v.number(),
    status: v.union(v.literal('pending'), v.literal('created'), v.literal('failed')),
    createdInTbAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index('by_entityId', ['entityType', 'entityId']),

  /** Shadow transfer log — append-only, 7-year retention */
  tigerBeetleTransfers: defineTable({
    tbTransferIdHigh: v.number(),
    tbTransferIdLow: v.number(),
    amount: v.number(),
    tbLedger: v.number(),
    tbCode: v.number(),
    sourceTable: v.string(),
    sourceId: v.string(),
    outboxId: v.id('tigerBeetleOutbox'),
    isPosted: v.boolean(),
    userData128: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_outboxId', ['outboxId']),

  tigerBeetleReconciliation: defineTable({
    runDate: v.string(),
    entityType: v.optional(v.string()),
    tbBalance: v.number(),
    dbBalance: v.number(),
    variance: v.number(),
    status: v.union(v.literal('matched'), v.literal('variance_detected'), v.literal('resolved')),
    notes: v.optional(v.string()),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
  }),

  /**
   * Durable record of loan post-submission processing failures (scoring, DTI,
   * recommendation, approval-request creation). Makes background failures
   * observable and retryable instead of silently swallowed. See
   * convex/loanProcessing.ts and convex/actions/processLoanApplication.ts.
   */
  loanProcessingFailures: defineTable({
    loanId: v.id('loans'),
    stage: v.union(
      v.literal('scoring'),
      v.literal('recordScore'),
      v.literal('approvalRequest'),
      v.literal('notification'),
      v.literal('unknown')
    ),
    status: v.union(
      v.literal('open'),
      v.literal('retrying'),
      v.literal('resolved'),
      v.literal('dead_letter')
    ),
    attemptCount: v.number(),
    lastErrorCode: v.optional(v.string()),
    lastErrorMessage: v.optional(v.string()),
    nextRetryAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_loanId', ['loanId'])
    .index('by_status', ['status']),

  // ==========================================================================
  // AUDIT & COMPLIANCE (7-year retention — no hard deletes)
  // ==========================================================================

  auditLogs: defineTable({
    userId: v.optional(v.id('users')),
    userRole: v.optional(v.string()),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    oldState: v.optional(v.any()),
    newState: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_entityId', ['entityType', 'entityId'])
    .index('by_timestamp', ['timestamp']),

  viewLogs: defineTable({
    userId: v.id('users'),
    entityType: v.string(),
    entityId: v.string(),
    viewDurationMs: v.optional(v.number()),
    fieldsViewed: v.optional(v.array(v.string())),
    ipAddress: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    timestamp: v.number(),
  }).index('by_userId', ['userId']),

  stateTransitions: defineTable({
    entityType: v.string(),
    entityId: v.string(),
    fromState: v.string(),
    toState: v.string(),
    transitionReason: v.optional(v.string()),
    triggeredBy: v.optional(v.id('users')),
    workflowInstanceId: v.optional(v.id('workflowInstances')),
    timestamp: v.number(),
  }).index('by_entityId', ['entityType', 'entityId']),

  complianceReports: defineTable({
    institutionId: v.optional(v.id('institutions')),
    reportType: v.union(
      v.literal('monthly_approvals'),
      v.literal('user_activity'),
      v.literal('state_changes'),
      v.literal('view_access'),
      v.literal('security_audit')
    ),
    periodStart: v.string(),
    periodEnd: v.string(),
    generatedAt: v.number(),
    generatedBy: v.id('users'),
    reportData: v.any(),
    fileUrl: v.optional(v.string()),
    status: v.union(v.literal('pending'), v.literal('completed'), v.literal('failed')),
  }),

  ippComplianceEvidence: defineTable({
    evidenceType: v.union(
      v.literal('incident'),
      v.literal('dispute'),
      v.literal('hotlist'),
      v.literal('blacklist'),
      v.literal('settlement'),
      v.literal('timeout'),
      v.literal('audit')
    ),
    entityType: v.string(),
    entityId: v.string(),
    summary: v.string(),
    severity: v.optional(v.union(v.literal('info'), v.literal('warning'), v.literal('critical'))),
    status: v.union(
      v.literal('open'),
      v.literal('reported'),
      v.literal('resolved'),
      v.literal('archived')
    ),
    reportDueAt: v.optional(v.number()),
    reportedAt: v.optional(v.number()),
    retentionUntil: v.number(),
    metadata: v.optional(v.any()),
    createdBy: v.optional(v.id('users')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_entity', ['entityType', 'entityId'])
    .index('by_status', ['status'])
    .index('by_evidenceType', ['evidenceType']),

  // ==========================================================================
  // RECONCILIATION
  // ==========================================================================

  reconciliationRuns: defineTable({
    institutionId: v.optional(v.id('institutions')),
    runDate: v.optional(v.string()),
    periodStart: v.optional(v.string()),
    periodEnd: v.optional(v.string()),
    source: v.optional(v.string()),
    status: v.union(
      v.literal('pending'),
      v.literal('running'),
      v.literal('completed'),
      v.literal('failed')
    ),
    matchedCount: v.number(),
    unmatchedCount: v.number(),
    totalAmount: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    triggeredBy: v.optional(v.id('users')),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }),

  bankTransactions: defineTable({
    institutionId: v.optional(v.id('institutions')),
    runId: v.optional(v.id('reconciliationRuns')),
    externalId: v.optional(v.string()),
    transactionDate: v.string(),
    transactionType: v.optional(v.union(v.literal('credit'), v.literal('debit'))),
    amount: v.number(),
    direction: v.optional(v.union(v.literal('credit'), v.literal('debit'))),
    description: v.optional(v.string()),
    reference: v.optional(v.string()),
    source: v.optional(v.string()),
    matchedTo: v.optional(v.string()), // Convex document ID of matched payment
    matchedPaymentId: v.optional(v.id('paymentTransactions')),
    matchedTable: v.optional(v.string()),
    matchConfidence: v.optional(v.number()), // 0–100
    matchNotes: v.optional(v.string()),
    matchedAt: v.optional(v.number()),
    status: v.union(
      v.literal('unmatched'),
      v.literal('matched'),
      v.literal('disputed'),
      v.literal('excluded'),
      v.literal('ignored')
    ),
    importedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_status', ['status'])
    .index('by_externalId', ['externalId'])
    .index('by_runId', ['runId']),

  // ==========================================================================
  // COLLECTIONS
  // ==========================================================================

  collectionsInteractions: defineTable({
    institutionId: v.optional(v.id('institutions')),
    loanId: v.id('loans'),
    userId: v.optional(v.id('users')),
    agentId: v.optional(v.id('users')),
    interactionType: v.optional(v.string()), // legacy: call | sms | email | visit | payment_promise
    activityType: v.optional(v.string()), // call_attempt | sms_sent | email_sent | promise_to_pay | ...
    activityStatus: v.optional(v.string()), // completed | pending | failed | scheduled
    contactMethod: v.optional(v.string()), // phone | sms | email | in_person | letter | whatsapp
    outcome: v.optional(v.string()),
    notes: v.optional(v.string()),
    promiseDate: v.optional(v.number()),
    promiseAmount: v.optional(v.number()),
    promiseFulfilled: v.optional(v.boolean()),
    nextAction: v.optional(v.string()),
    nextActionType: v.optional(v.string()),
    nextActionDate: v.optional(v.number()),
    assignedTo: v.optional(v.id('users')),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index('by_loanId', ['loanId']),

  overdueReminders: defineTable({
    institutionId: v.optional(v.id('institutions')),
    loanId: v.id('loans'),
    userId: v.id('users'),
    channel: v.string(),
    templateId: v.optional(v.id('notificationTemplates')),
    daysOverdue: v.number(),
    amount: v.number(),
    status: v.union(v.literal('pending'), v.literal('sent'), v.literal('failed')),
    sent: v.optional(v.boolean()), // convenience boolean used by collections.ts
    sentAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index('by_loanId', ['loanId']),

  promiseToPay: defineTable({
    institutionId: v.optional(v.id('institutions')),
    loanId: v.id('loans'),
    userId: v.id('users'),
    amount: v.number(),
    promiseDate: v.number(),
    status: v.union(
      v.literal('pending'),
      v.literal('kept'),
      v.literal('broken'),
      v.literal('rescheduled')
    ),
    notes: v.optional(v.string()),
    createdBy: v.id('users'),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_loanId', ['loanId']),

  // ==========================================================================
  // SYSTEM CONFIGURATION
  // ==========================================================================

  systemConfiguration: defineTable({
    key: v.string(),
    value: v.any(),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    updatedBy: v.optional(v.id('users')),
    deletedAt: v.optional(v.number()),
    createdAt: v.optional(v.number()),
    updatedAt: v.number(),
    // Temporal versioning (Phase 1 — ontology engine)
    effectiveFrom: v.optional(v.number()),
    effectiveTo: v.optional(v.number()),
    version: v.optional(v.number()),
  })
    .index('by_key', ['key'])
    .index('by_key_effective', ['key', 'effectiveFrom']),

  // ==========================================================================
  // ONTOLOGY ENGINE — Event Journal & Temporal Foundation (Phase 1)
  // ==========================================================================

  /**
   * Unified event journal — the financial event stream with causality tracking.
   * Supplements (not replaces) stateTransitions + auditLogs.
   * Every state-changing mutation writes here via emitEvent() fire-and-forget.
   */
  eventJournal: defineTable({
    eventType: v.string(), // e.g. "loan.created", "payment.completed", "mandate.executed"
    entityType: v.string(), // e.g. "loans", "paymentTransactions", "mandates"
    entityId: v.string(), // Convex document ID as string (polymorphic reference)
    domainSource: v.string(), // e.g. "lending", "payments", "settlement", "mandates"
    payload: v.optional(v.any()), // Event-specific data (typed per eventType)
    correlationId: v.string(), // Groups related events (e.g. all events in one loan lifecycle)
    causationId: v.optional(v.string()), // The event that caused this event
    actorId: v.optional(v.id('users')), // Who triggered this (undefined for system events)
    actorType: eventActorType, // "user" | "system" | "webhook" | "cron"
    version: v.number(), // Monotonic per entityId for ordering
    occurredAt: v.number(), // When the event happened (business time)
    recordedAt: v.number(), // When it was written (system time)
    metadata: v.optional(v.any()), // Additional context
  })
    .index('by_entityId', ['entityType', 'entityId'])
    .index('by_correlationId', ['correlationId'])
    .index('by_causationId', ['causationId'])
    .index('by_eventType', ['eventType'])
    .index('by_occurredAt', ['occurredAt'])
    .index('by_domainSource', ['domainSource']),

  /**
   * Regulatory point-in-time snapshots — end-of-day/month/year captures.
   * Immutable once created. Enables "show me the portfolio as of date X" queries.
   */
  snapshots: defineTable({
    snapshotType: snapshotType,
    snapshotDate: v.string(), // "YYYY-MM-DD"
    entityType: v.optional(v.string()), // Scope: specific table or undefined for aggregate
    entityId: v.optional(v.string()), // Scope: specific entity or undefined for aggregate
    data: v.any(), // Frozen state at snapshot time
    generatedAt: v.number(),
    generatedBy: v.optional(v.id('users')), // undefined for system-generated
    metadata: v.optional(v.any()),
  })
    .index('by_date', ['snapshotDate'])
    .index('by_type_date', ['snapshotType', 'snapshotDate'])
    .index('by_entity', ['entityType', 'entityId']),

  // ==========================================================================
  // ONTOLOGY ENGINE — Entity Relationships / Knowledge Graph (Phase 3)
  // ==========================================================================

  /**
   * Entity relationship graph — typed, temporal edges between any entities.
   * Append-only: to "delete" a relationship, set effectiveTo and status=inactive.
   */
  relationships: defineTable({
    sourceEntityType: v.string(),
    sourceEntityId: v.string(),
    targetEntityType: v.string(),
    targetEntityId: v.string(),
    relationshipType: v.string(), // "borrowed", "secured_by", "authorized", "disbursed_via", etc.
    status: relationshipStatus,
    effectiveFrom: v.number(),
    effectiveTo: v.optional(v.number()),
    strength: v.optional(v.number()), // 0-100 for weighted graph queries
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index('by_source', ['sourceEntityType', 'sourceEntityId'])
    .index('by_target', ['targetEntityType', 'targetEntityId'])
    .index('by_type', ['relationshipType'])
    .index('by_source_type', ['sourceEntityType', 'sourceEntityId', 'relationshipType']),

  // ==========================================================================
  // ONTOLOGY ENGINE — Mandates & Authorization (Phase 2)
  // ==========================================================================

  /**
   * Debit mandates — authorization for creditors to debit debtor accounts.
   * The missing "keystone" entity that enables collections enforcement.
   */
  mandates: defineTable({
    mandateRef: v.string(), // Unique reference: "MDT-{YYYYMMDD}-{seq}"
    mandateType: mandateType,
    status: mandateStatus,
    // Debtor (flattened for Convex indexing)
    debtorUserId: v.id('users'),
    debtorAccountRef: v.optional(v.string()), // Bank account or VPA
    debtorName: v.optional(v.string()),
    // Creditor
    creditorEntityType: v.string(), // "institution" or "user"
    creditorEntityId: v.string(),
    creditorAccountRef: v.optional(v.string()),
    creditorName: v.optional(v.string()),
    // Linked entities
    loanId: v.optional(v.id('loans')),
    institutionId: v.optional(v.id('institutions')),
    // Financial terms
    amount: v.number(), // Authorized amount per execution
    currency: v.string(), // "NAD"
    frequency: v.optional(mandateFrequency),
    collectionDay: v.optional(v.number()), // Day of month for recurring (1-31)
    maxExecutions: v.optional(v.number()), // Limit total executions
    executionCount: v.number(), // Current count
    // Temporal
    firstExecutionDate: v.optional(v.number()),
    nextExecutionDate: v.optional(v.number()),
    lastExecutionDate: v.optional(v.number()),
    effectiveFrom: v.number(),
    effectiveTo: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    // Authorization
    authorizedAt: v.optional(v.number()),
    authorizedVia: v.optional(v.string()), // "digital_signature" | "otp_confirmation" | "branch_sign" | "ipp_auth"
    revokedAt: v.optional(v.number()),
    revocationReason: v.optional(v.string()),
    // Tracking
    correlationId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_mandateRef', ['mandateRef'])
    .index('by_debtorUserId', ['debtorUserId'])
    .index('by_loanId', ['loanId'])
    .index('by_status', ['status'])
    .index('by_nextExecutionDate', ['nextExecutionDate'])
    .index('by_institutionId', ['institutionId']),

  /**
   * Mandate execution records — each time a mandate is exercised against a debtor.
   */
  mandateExecutions: defineTable({
    institutionId: v.optional(v.id('institutions')),
    mandateId: v.id('mandates'),
    executionNumber: v.number(),
    amount: v.number(),
    status: mandateExecutionStatus,
    paymentTransactionId: v.optional(v.id('paymentTransactions')),
    railUsed: v.optional(v.string()),
    failureReason: v.optional(v.string()),
    attemptNumber: v.optional(v.number()),
    executedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    correlationId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_mandateId', ['mandateId'])
    .index('by_status', ['status']),

  /**
   * POPIA-aligned consent records — what the person agreed to, when, and how.
   */
  consentRecords: defineTable({
    institutionId: v.optional(v.id('institutions')),
    userId: v.id('users'),
    consentType: consentType,
    status: consentStatus,
    entityType: v.optional(v.string()), // What entity this consent relates to
    entityId: v.optional(v.string()),
    grantedAt: v.number(),
    withdrawnAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    legalBasis: v.optional(v.string()), // POPIA section reference
    description: v.string(), // Exact text the user agreed to
    collectionMethod: v.optional(v.string()), // "digital_acceptance" | "wet_signature" | "verbal_recorded"
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_status', ['status'])
    .index('by_userId_type', ['userId', 'consentType']),

  // ==========================================================================
  // ONTOLOGY ENGINE — Multi-Institution Model (Phase 4)
  // ==========================================================================

  /**
   * Institution registry — banks, fintechs, MNOs, regulators.
   * Enables multi-tenancy when NamLend becomes infrastructure.
   */
  institutions: defineTable({
    name: v.string(),
    shortCode: v.string(), // "NAMLEND", "NAMPOST", "BON", etc.
    type: institutionType,
    registrationNumber: v.optional(v.string()),
    regulatoryLicense: v.optional(v.string()),
    status: institutionStatus,
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    address: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_shortCode', ['shortCode'])
    .index('by_status', ['status']),

  /**
   * Per-institution configuration with temporal versioning.
   */
  institutionConfig: defineTable({
    institutionId: v.id('institutions'),
    key: v.string(),
    value: v.any(),
    effectiveFrom: v.number(),
    effectiveTo: v.optional(v.number()),
    version: v.number(),
    updatedBy: v.optional(v.id('users')),
    createdAt: v.number(),
  }).index('by_institution_key', ['institutionId', 'key']),

  // ==========================================================================
  // PLATFORM CONTROL PLANE (multi-tenant SaaS) — Phase 0 (additive, inert)
  // See docs/architecture/multi-tenant-platform-blueprint.md
  // ==========================================================================

  /**
   * Platform staff — cross-tenant, OUTSIDE the tenant role model (`userRoles`).
   * This is the only source of truth for who may access the Platform Console.
   */
  platformAdmins: defineTable({
    userId: v.id('users'),
    platformRole: v.union(v.literal('platform_owner'), v.literal('platform_support')),
    status: v.union(v.literal('active'), v.literal('suspended')),
    createdBy: v.optional(v.id('users')),
    createdAt: v.number(),
    lastReviewedAt: v.optional(v.number()),
  }).index('by_userId', ['userId']),

  /** Commercial plan/tier catalog — each plan grants a default set of feature keys. */
  plans: defineTable({
    planCode: v.string(),
    name: v.string(),
    status: v.union(v.literal('active'), v.literal('retired')),
    defaultFeatures: v.array(v.string()), // featureKeys (validated against the code manifest)
    limits: v.optional(v.any()), // e.g. { maxOperators, maxActiveLoans }
    effectiveFrom: v.number(),
    effectiveTo: v.optional(v.number()),
  }).index('by_planCode', ['planCode']),

  /** Active commercial relationship: which plan a tenant is on, and its status. */
  tenantSubscriptions: defineTable({
    institutionId: v.id('institutions'),
    planCode: v.string(),
    status: v.union(
      v.literal('trial'),
      v.literal('active'),
      v.literal('suspended'),
      v.literal('expired'),
      v.literal('cancelled')
    ),
    effectiveFrom: v.number(),
    effectiveTo: v.optional(v.number()),
    billingRef: v.optional(v.string()),
    createdBy: v.optional(v.id('users')),
    reason: v.optional(v.string()),
  }).index('by_institutionId', ['institutionId']),

  /**
   * Resolved/overridable per-tenant feature grants. The owner console writes these;
   * both planes read them. Temporal (trials/expiry) and rollout-aware.
   */
  tenantEntitlements: defineTable({
    institutionId: v.id('institutions'),
    featureKey: v.string(),
    source: v.union(
      v.literal('plan'),
      v.literal('addon'),
      v.literal('trial'),
      v.literal('manual_override'),
      v.literal('removal')
    ),
    enabled: v.boolean(),
    rolloutState: v.union(
      v.literal('off'),
      v.literal('internal'),
      v.literal('pilot'),
      v.literal('enabled'),
      v.literal('deprecated')
    ),
    effectiveFrom: v.number(),
    effectiveTo: v.optional(v.number()),
    reason: v.optional(v.string()),
    changedBy: v.optional(v.id('users')),
    changedAt: v.number(),
  })
    .index('by_institution_feature', ['institutionId', 'featureKey'])
    .index('by_institutionId', ['institutionId']),

  /**
   * DB mirror of the feature catalog for owner display/sell/rollout.
   * AUTHORITY RULE: a row here is valid only if `featureKey` exists in the code
   * manifest (`src/config/features.ts`); the DB may not invent enforceable features.
   */
  featuresCatalog: defineTable({
    featureKey: v.string(),
    name: v.string(),
    category: v.string(),
    console: v.union(v.literal('platform'), v.literal('backoffice'), v.literal('client')),
    supportStatus: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_featureKey', ['featureKey']),

  /**
   * Platform-owned regulatory guardrails — non-negotiable constraints a tenant may
   * tighten but never relax (APR cap, retention, KYC minimums), optionally per-jurisdiction.
   */
  platformGuardrails: defineTable({
    code: v.string(), // "APR_CAP", "RETENTION_YEARS", "KYC_MIN", ...
    jurisdiction: v.optional(v.string()),
    valueType: v.union(
      v.literal('number'),
      v.literal('string'),
      v.literal('boolean'),
      v.literal('json')
    ),
    value: v.string(),
    effectiveFrom: v.number(),
    effectiveTo: v.optional(v.number()),
    updatedBy: v.optional(v.id('users')),
  }).index('by_code', ['code']),

  /**
   * Audit of platform-support access to tenant scope — heavier than tenant-admin audit
   * because support crosses tenant boundaries (POPIA / OWASP multi-tenant guidance).
   */
  supportAccessAudit: defineTable({
    actorUserId: v.id('users'),
    platformRole: v.string(),
    institutionId: v.optional(v.id('institutions')),
    accessType: v.union(v.literal('L0'), v.literal('L1'), v.literal('L2'), v.literal('L3')),
    reason: v.optional(v.string()),
    approvedBy: v.optional(v.id('users')),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    viewedResources: v.optional(v.array(v.string())),
    impersonatedUserId: v.optional(v.id('users')),
    ticketRef: v.optional(v.string()),
  })
    .index('by_actor', ['actorUserId'])
    .index('by_institution', ['institutionId']),

  // ==========================================================================
  // ONTOLOGY ENGINE — Payment Rail Abstraction (Phase 5)
  // ==========================================================================

  /**
   * Payment rails as first-class entities with cost, availability, and health.
   */
  paymentRails: defineTable({
    railCode: v.string(), // "ips", "bank_transfer", "mobile_money_mtc", "cash", "cheque"
    displayName: v.string(),
    provider: v.optional(v.string()), // "Namclear", "MTC", "TN Mobile", etc.
    status: paymentRailStatus,
    availability: v.object({
      businessHoursOnly: v.boolean(),
      startTime: v.optional(v.string()), // "HH:mm"
      endTime: v.optional(v.string()),
      excludeWeekends: v.boolean(),
      excludeHolidays: v.boolean(),
    }),
    costModel: v.object({
      fixedFeeNAD: v.optional(v.number()),
      percentageFee: v.optional(v.number()),
      minFeeNAD: v.optional(v.number()),
      maxFeeNAD: v.optional(v.number()),
    }),
    settlementLatencyMinutes: v.optional(v.number()),
    retryPolicy: v.object({
      maxRetries: v.number(),
      backoffMultiplier: v.number(),
      initialDelayMs: v.number(),
    }),
    supportedDirections: v.array(
      v.union(v.literal('disbursement'), v.literal('collection'), v.literal('both'))
    ),
    lastHealthCheck: v.optional(v.number()),
    lastHealthStatus: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_railCode', ['railCode'])
    .index('by_status', ['status']),

  // ==========================================================================
  // ONTOLOGY ENGINE — Financial Product Abstraction (Phase 6)
  // ==========================================================================

  /**
   * Product catalog — configurable financial product definitions.
   */
  productDefinitions: defineTable({
    productCode: v.string(), // "personal_loan", "micro_loan", "stokvel_pool"
    name: v.string(),
    category: productCategory,
    status: productStatus,
    description: v.optional(v.string()),
    institutionId: v.optional(v.id('institutions')),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_productCode', ['productCode'])
    .index('by_status', ['status'])
    .index('by_category', ['category']),

  /**
   * Immutable versioned product configurations.
   */
  productVersions: defineTable({
    productId: v.id('productDefinitions'),
    versionNumber: v.number(),
    isCurrentVersion: v.boolean(),
    config: v.object({
      minAmount: v.optional(v.number()),
      maxAmount: v.optional(v.number()),
      minTermMonths: v.optional(v.number()),
      maxTermMonths: v.optional(v.number()),
      defaultInterestRate: v.optional(v.number()),
      maxInterestRate: v.optional(v.number()), // Must be <= APR_LIMIT (32%)
      fees: v.optional(v.any()),
      eligibilityCriteria: v.optional(v.any()),
      allowedRails: v.optional(v.array(v.string())),
      requiresMandate: v.optional(v.boolean()),
      requiresKYC: v.optional(v.boolean()),
    }),
    effectiveFrom: v.number(),
    effectiveTo: v.optional(v.number()),
    approvedBy: v.optional(v.id('users')),
    changeReason: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index('by_productId', ['productId'])
    .index('by_productId_current', ['productId', 'isCurrentVersion']),

  /**
   * Generalized ledger accounts — balances for any financial product instance.
   */
  accounts: defineTable({
    accountNumber: v.string(),
    accountType: accountType,
    ownerId: v.optional(v.id('users')),
    ownerType: v.optional(v.string()), // "user" | "institution" | "system"
    productInstanceId: v.optional(v.string()), // Loan ID or other product instance
    balance: v.number(),
    currency: v.string(), // "NAD"
    status: accountStatus,
    institutionId: v.optional(v.id('institutions')),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_accountNumber', ['accountNumber'])
    .index('by_owner', ['ownerId'])
    .index('by_productInstance', ['productInstanceId']),

  // ==========================================================================
  // ONTOLOGY ENGINE — Portfolio Projections (Phase 2)
  // ==========================================================================

  /**
   * Materialized portfolio metrics — incrementally updated by domain events.
   * Replaces full-scan analytics with O(1) reads. Each metric is keyed by
   * a unique string (e.g., "active_loan_count", "total_disbursed").
   */
  portfolioMetrics: defineTable({
    metricKey: v.string(),
    value: v.number(),
    lastEventId: v.optional(v.string()), // Idempotency guard
    updatedAt: v.number(),
  }).index('by_metricKey', ['metricKey']),

  // ==========================================================================
  // ONTOLOGY ENGINE — Business Rules as Data (Phase 3A)
  // ==========================================================================

  /**
   * Declarative business rules stored as typed data.
   * Close-and-insert versioning: to update, set effectiveTo on the old version
   * and insert a new row. Rules have a hardcoded fallback in code so the system
   * works identically before any rules are seeded.
   *
   * Value types: "number" → parseFloat(value), "json" → JSON.parse(value),
   *              "string" → value as-is, "boolean" → value === "true"
   */
  businessRules: defineTable({
    ruleCode: v.string(), // Unique key, e.g., "APR_LIMIT", "RAIL_WEIGHTS"
    category: v.string(), // "regulatory", "scoring", "payments", "products"
    displayName: v.string(),
    description: v.optional(v.string()),
    valueType: v.union(
      v.literal('number'),
      v.literal('json'),
      v.literal('string'),
      v.literal('boolean')
    ),
    value: v.string(), // Stored as string; parsed by valueType
    effectiveFrom: v.number(), // Timestamp
    effectiveTo: v.optional(v.number()), // Undefined = currently active
    version: v.number(),
    createdBy: v.optional(v.id('users')),
    createdAt: v.number(),
  })
    .index('by_ruleCode', ['ruleCode'])
    .index('by_category', ['category'])
    .index('by_ruleCode_effective', ['ruleCode', 'effectiveTo']),
});
