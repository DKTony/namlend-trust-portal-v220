# NamLend Trust - Complete Functionality Map

**Version**: 3.1.0  
**Created**: December 7, 2025  
**Updated**: December 27, 2025  
**Purpose**: Comprehensive mapping of all features, services, and database dependencies for wiring verification

---

## Quick Reference: Feature → Service → Tables

| Feature | Service | Tables Affected | Status |
|---------|---------|-----------------|--------|
| Auth & Login | useAuth | auth.users, profiles, user_roles | ✅ Working |
| Loan Application | approvalWorkflow | approval_requests, loans | ✅ Working |
| Loan Approval | approvalWorkflow, loanService | loans, disbursements, approval_requests, approval_workflow_history | ✅ Working |
| Disbursement | disbursementService | disbursements, loans, audit_logs | ✅ Working |
| Payments | paymentService, paymentGateway | payments, payment_schedules, payment_transactions | ✅ Working |
| **IPS Payments** | ipsService | ips_transactions, ips_vpa_registry, ips_api_logs | ✅ Working (Mock Mode) |
| **IPP Onboarding** | ipsOnboardingService | ips_onboarding, ips_device_bindings, ips_alias_directory, ips_sov_providers | ✅ Working |
| Collections | collectionsService | collections_activities, promise_to_pay, reschedule_requests, collections_interactions | ✅ Working |
| Credit Scoring | creditScoring | credit_scores, credit_score_factors, profiles | ✅ Working |
| Notifications | notificationService | notifications, notification_queue, notification_templates | ✅ Working |
| SMS Gateway | smsGateway, Edge Function | communication_logs, notification_queue | ✅ Wired (needs API keys) |
| WhatsApp | whatsappGateway, Edge Function | communication_logs, whatsapp_conversations | ✅ Wired (needs API keys) |
| Payment Webhooks | Edge Function | payment_webhooks, payment_transactions, payments | ✅ Wired |
| Audit Trail | auditService | audit_logs, view_logs, state_transitions | ✅ Working |
| KYC Documents | approvalWorkflow | kyc_documents, approval_requests, profiles | ✅ Working |

> **IPP Documentation**: See [IPP_INTEGRATION.md](./IPP_INTEGRATION.md) for Instant Payment Platform integration details.

---

## 1. Authentication & Authorization

### 1.1 User Authentication
**Service**: `src/hooks/useAuth.tsx`  
**UI Components**: `src/pages/Auth.tsx`

#### Flow:
```
User Login → Supabase Auth → Fetch Profile → Fetch Role → Set Context
```

#### Tables Affected:
| Table | Operation | Fields |
|-------|-----------|--------|
| `auth.users` | READ | id, email |
| `profiles` | READ/CREATE | user_id, first_name, last_name, phone_number |
| `user_roles` | READ | user_id, role |

#### Functions Called:
- `supabase.auth.signInWithPassword()`
- `supabase.auth.signUp()`
- `supabase.auth.signOut()`
- `supabase.auth.resetPasswordForEmail()`

#### Wiring Status: ✅ WORKING

---

### 1.2 Role Management
**Service**: `src/services/roleManagementService.ts`

#### Roles:
- `client` - Default, can view own data, submit applications
- `loan_officer` - Can process applications, view assigned clients
- `admin` - Full access, can approve/reject, manage users

#### Tables Affected:
| Table | Operation | Fields |
|-------|-----------|--------|
| `user_roles` | READ/INSERT/UPDATE | user_id, role, created_at |

#### RPC Functions:
- `assign_user_role(p_user_id, p_role)`

---

## 2. Loan Application Flow

### 2.1 Submit Loan Application
**Service**: `src/services/approvalWorkflow.ts`  
**UI Component**: `src/pages/LoanApplication.tsx`

#### Flow:
```
Client fills form → Validate (32% APR) → submitApprovalRequest() → approval_requests → Admin notified
```

#### Tables Affected:
| Table | Operation | Fields |
|-------|-----------|--------|
| `approval_requests` | INSERT | user_id, request_type='loan_application', request_data (JSON), status='pending', priority |

#### Service Function:
```typescript
submitApprovalRequest({
  user_id: string,
  request_type: 'loan_application',
  request_data: {
    amount, term_months, interest_rate, monthly_payment,
    total_repayment, purpose, employment_status, monthly_income,
    monthly_expenses, existing_debt
  },
  priority: 'normal'
})
```

#### Wiring Status: ✅ WORKING

---

### 2.2 Admin Reviews Application
**Service**: `src/services/approvalWorkflow.ts`  
**UI Component**: `src/pages/AdminDashboard/components/ApprovalManagement/`

#### Flow:
```
Admin views queue → getAllApprovalRequests() → Review → updateApprovalStatus() → Process
```

#### Tables Affected:
| Table | Operation | Fields |
|-------|-----------|--------|
| `approval_requests` | READ/UPDATE | status, reviewer_id, reviewed_at, review_notes |
| `approval_requests_expanded` | READ (VIEW) | Joined with profiles |
| `approval_workflow_history` | INSERT (trigger) | previous_status, new_status, changed_by |
| `approval_notifications` | INSERT (trigger) | recipient_id, notification_type |

#### Service Functions:
```typescript
getAllApprovalRequests(filters?: { status, requestType, priority, assignedTo })
updateApprovalStatus(requestId, status, reviewNotes?, assignedTo?)
getApprovalHistory(requestId)
```

#### Wiring Status: ✅ WORKING

---

### 2.3 Process Approved Loan
**Service**: `src/services/approvalWorkflow.ts`, `src/services/disbursementService.ts`

#### Flow:
```
Admin approves → processApprovedLoanApplication() → Create loan record → Create disbursement → Generate payment schedule
```

#### Tables Affected:
| Table | Operation | Fields |
|-------|-----------|--------|
| `loans` | INSERT | user_id, amount, term_months, interest_rate, monthly_payment, total_repayment, status='approved' |
| `disbursements` | INSERT | loan_id, amount, status='pending' |
| `payment_schedules` | INSERT (via RPC) | loan_id, installment_number, due_date, amounts |
| `approval_requests` | UPDATE | status='approved', reference_id=loan_id |

#### RPC Functions:
- `process_approval_transaction(request_id)` - Atomic transaction
- `create_disbursement_on_approval(p_loan_id)`
- `generate_payment_schedule(p_loan_id)`

#### Wiring Status: ✅ WORKING

---

## 3. Disbursement Management

### 3.1 Disbursement Workflow
**Service**: `src/services/disbursementService.ts`  
**UI Component**: `src/pages/AdminDashboard/components/PaymentManagement/DisbursementManager.tsx`

#### Status Flow:
```
pending → approved → processing → completed
                  ↘ failed
```

#### Tables Affected:
| Table | Operation | Fields |
|-------|-----------|--------|
| `disbursements` | READ/UPDATE | status, payment_method, payment_reference, processed_at, processing_notes |
| `loans` | UPDATE | status (to 'funded' on completion), disbursed_at |
| `audit_logs` | INSERT (trigger) | action, entity_type, old_state, new_state |

#### Service Functions:
```typescript
// Get pending queue
getPendingDisbursements(): Promise<Disbursement[]>

// Progress through states
approveDisbursement(disbursementId, notes?)
markDisbursementProcessing(disbursementId, notes?)
completeDisbursement(disbursementId, paymentMethod, paymentReference, notes?)
failDisbursement(disbursementId, reason)
```

#### RPC Functions:
- `get_pending_disbursements()`
- `approve_disbursement(p_disbursement_id, p_notes)`
- `mark_disbursement_processing(p_disbursement_id, p_notes)`
- `complete_disbursement(p_disbursement_id, p_payment_method, p_payment_reference, p_notes)`
- `fail_disbursement(p_disbursement_id, p_reason)`

#### Wiring Status: ✅ WORKING

---

## 4. Payment Management

### 4.1 Record Payment
**Service**: `src/services/paymentService.ts`

#### Tables Affected:
| Table | Operation | Fields |
|-------|-----------|--------|
| `payments` | INSERT | loan_id, amount, payment_method, reference_number, status |

#### Service Function:
```typescript
recordPayment({
  loanId: string,
  amount: number,
  payment_method: string,
  reference_number?: string
})
```

#### Wiring Status: ✅ WORKING

---

### 4.2 Payment Schedule
**Service**: `src/services/paymentService.ts`

#### Tables Affected:
| Table | Operation | Fields |
|-------|-----------|--------|
| `payment_schedules` | INSERT/UPDATE | loan_id, installment_number, due_date, principal_amount, interest_amount, total_amount, amount_paid, balance, status |

#### RPC Functions:
- `generate_payment_schedule(p_loan_id)` - Creates amortization schedule
- `get_payment_schedule(p_loan_id)` - Returns schedule with status
- `apply_payment_to_schedule(p_payment_id, p_amount)` - Applies payment to oldest due
- `mark_overdue_payments()` - Scheduled job to mark overdue

#### Wiring Status: ⚠️ NEEDS VERIFICATION - RPC functions may need testing

---

### 4.3 Payment Gateway Integration
**Service**: `src/services/paymentGateway.ts`

#### Supported Providers:
- `bank_transfer` - Manual EFT
- `mobile_money_mtc` - MTC MoMo (*140#)
- `mobile_money_tn` - TN Mobile (*111#)
- `paytoday` - Online payment
- `cash` - In-person

#### Tables Affected:
| Table | Operation | Fields |
|-------|-----------|--------|
| `payments` | INSERT | loan_id, user_id, amount, payment_method, status, reference_number, metadata |
| `payment_transactions` | INSERT | loan_id, provider, reference_number, amount, status, payment_method |
| `payment_webhooks` | INSERT | provider, event_type, reference_number, payload |

#### Service Functions:
```typescript
initiatePayment(request: PaymentRequest): Promise<PaymentResponse>
verifyPayment(transactionId, provider): Promise<PaymentVerification>
handlePaymentWebhook(provider, reference, status, providerData)
getPaymentHistory(loanId)
```

#### Wiring Status: ⚠️ PARTIAL
- **Working**: Payment record creation, reference generation
- **Not Wired**: Actual API integrations (requires API keys)
- **Not Wired**: Webhook handlers (need Supabase Edge Function)

---

### 4.4 Late Fees
**Service**: `src/services/paymentService.ts`

#### RPC Functions:
- `calculate_late_fee(p_schedule_id)` - Returns late fee calculation
- `waive_late_fee(p_late_fee_id, p_reason)` - Waives fee with audit

#### Tables Affected:
| Table | Operation | Fields |
|-------|-----------|--------|
| `late_fees` | INSERT/UPDATE | schedule_id, fee_amount, waived, waive_reason |

#### Wiring Status: ⚠️ NEEDS VERIFICATION

---

## 5. Collections Management

### 5.1 Collections Queue
**Service**: `src/services/collectionsService.ts`  
**UI Component**: `src/pages/AdminDashboard/components/CollectionsManagement/`

#### Tables Affected:
| Table | Operation | Fields |
|-------|-----------|--------|
| `collections_queue` | READ (VIEW) | loan_id, user_id, client_name, total_overdue, days_overdue, risk_bucket |

#### Risk Buckets:
- `current` - Not overdue
- `bucket_1_30` - 1-30 days overdue
- `bucket_31_60` - 31-60 days overdue
- `bucket_61_90` - 61-90 days overdue
- `bucket_90_plus` - 90+ days overdue

#### Service Functions:
```typescript
getCollectionsQueue(filters?: { riskBucket, search })
getCollectionsStats()
```

#### RPC Functions:
- `generate_collection_queue()` - Generates prioritized queue
- `get_collections_stats()` - Returns statistics

#### Wiring Status: ⚠️ NEEDS VERIFICATION - View may need to be created

---

### 5.2 Promise to Pay (PTP)
**Service**: `src/services/collectionsService.ts`

#### Tables Affected:
| Table | Operation | Fields |
|-------|-----------|--------|
| `promise_to_pay` | INSERT/UPDATE | loan_id, user_id, promised_amount, promised_date, status, follow_up_date |

#### Service Functions:
```typescript
createPromiseToPay(loanId, promisedAmount, promisedDate, notes?, followUpDate?)
resolvePromiseToPay(ptpId, status: 'kept'|'broken'|'cancelled', notes?)
getPromisesToPay(loanId?)
```

#### RPC Functions:
- `create_promise_to_pay(...)`
- `resolve_promise_to_pay(...)`

#### Wiring Status: ⚠️ NEEDS VERIFICATION

---

### 5.3 Collection Activities
**Service**: `src/services/collectionsService.ts`

#### Activity Types:
- `call_attempt`, `sms_sent`, `email_sent`, `whatsapp_sent`
- `promise_to_pay`, `payment_received`
- `escalation`, `legal_notice`, `field_visit`, `letter_sent`, `note`

#### Tables Affected:
| Table | Operation | Fields |
|-------|-----------|--------|
| `collection_activities` | INSERT | loan_id, activity_type, activity_status, contact_method, outcome, notes |
| `collections_interactions` | INSERT | loan_id, interaction_type, outcome, notes, next_action |

#### Service Functions:
```typescript
recordCollectionActivity(input: RecordActivityInput)
logInteraction(loanId, interactionType, outcome?, notes?, nextAction?, nextActionDate?)
getCollectionActivities(loanId)
getInteractions(loanId)
```

#### RPC Functions:
- `record_collection_activity(...)`
- `log_collections_interaction(...)`

#### Wiring Status: ⚠️ NEEDS VERIFICATION

---

### 5.4 Payment Reschedule
**Service**: `src/services/collectionsService.ts`

#### Tables Affected:
| Table | Operation | Fields |
|-------|-----------|--------|
| `reschedule_requests` | INSERT/UPDATE | loan_id, user_id, original_due_date, requested_date, reason, status, admin_notes |

#### Service Functions:
```typescript
requestReschedule(loanId, originalDueDate, requestedDate, reason) // Client
processRescheduleRequest(requestId, status, adminNotes?) // Admin
getRescheduleRequests(status?)
```

#### RPC Functions:
- `request_payment_reschedule(...)`
- `process_reschedule_request(...)`

#### Wiring Status: ⚠️ NEEDS VERIFICATION

---

## 6. Credit Scoring

### 6.1 Calculate Credit Score
**Service**: `src/services/creditScoring.ts`

#### Scoring Factors (Weights):
- Income: 25%
- Debt-to-Income Ratio: 20%
- Employment Stability: 15%
- Payment History: 20%
- Verification Status: 10%
- Loan History: 10%

#### Score Ranges:
- EXCELLENT: 750-850 (Low risk)
- GOOD: 670-749 (Medium risk)
- FAIR: 580-669 (High risk)
- POOR: 300-579 (Very high risk)

#### Tables Affected:
| Table | Operation | Fields |
|-------|-----------|--------|
| `credit_scores` | INSERT/UPDATE | user_id, loan_id, score, score_range, risk_level, max_approved_amount, suggested_interest_rate, is_current |
| `credit_score_factors` | INSERT | credit_score_id, category, factor, impact, weight, description |
| `profiles` | READ | monthly_income, employment_status, verified |
| `loans` | READ | status (for history) |
| `payments` | READ | status (for late payment history) |

#### Service Functions:
```typescript
calculateCreditScore(factors: CreditFactors): CreditScore
getLoanRecommendation(factors, creditScore): LoanRecommendation
getCreditFactorsForUser(userId): CreditFactors
saveCreditScore(userId, score, loanId?)
calculateCreditScoreDB(userId, loanId?) // Uses RPC
getCurrentCreditScore(userId?)
```

#### RPC Functions:
- `calculate_credit_score(p_user_id, p_loan_id, p_input_data)`
- `get_current_credit_score(p_user_id)`

#### Wiring Status: ⚠️ PARTIAL
- **Working**: Client-side calculation
- **Not Verified**: Database RPC functions, factor storage

---

## 7. Notifications

### 7.1 In-App Notifications
**Service**: `src/services/notificationService.ts`

#### Tables Affected:
| Table | Operation | Fields |
|-------|-----------|--------|
| `notifications` | READ/INSERT/UPDATE | user_id, title, message, category, priority, is_read, read_at |
| `notification_templates` | READ | code, name, channels, title, body |
| `notification_queue` | INSERT | user_id, channel, recipient, content, status, scheduled_at |
| `notification_preferences` | READ/UPSERT | user_id, channel, category, enabled |

#### Service Functions:
```typescript
getNotifications(filters?: { category, isRead, limit, offset })
getUnreadCount()
markAsRead(notificationId)
markAllAsRead()
queueNotification(userId, templateCode, data, scheduledAt?)
subscribeToNotifications(userId, onNotification) // Real-time
```

#### RPC Functions:
- `get_unread_notification_count()`
- `mark_notification_read(p_notification_id)`
- `mark_all_notifications_read()`
- `queue_notification(p_user_id, p_template_code, p_data, p_scheduled_at)`

#### Notification Templates:
- `LOAN_SUBMITTED`, `LOAN_UNDER_REVIEW`, `LOAN_APPROVED`, `LOAN_REJECTED`, `LOAN_DISBURSED`
- `PAYMENT_DUE_7_DAYS`, `PAYMENT_DUE_3_DAYS`, `PAYMENT_DUE_1_DAY`, `PAYMENT_OVERDUE`
- `PAYMENT_RECEIVED`, `LOAN_COMPLETED`, `KYC_APPROVED`, `KYC_REJECTED`

#### Wiring Status: ⚠️ PARTIAL
- **Working**: Graceful fallback when tables don't exist
- **Not Verified**: RPC functions, templates, queue processing

---

### 7.2 SMS Notifications
**Service**: `src/services/smsGateway.ts`

#### Provider: Africa's Talking

#### Tables Affected:
| Table | Operation | Fields |
|-------|-----------|--------|
| `communication_logs` | INSERT | user_id, loan_id, channel='sms', recipient, content, status, provider, provider_message_id |
| `notification_queue` | INSERT | user_id, channel='sms', recipient, content, status |

#### Service Functions:
```typescript
sendSMS(request: SMSRequest)
sendTemplateSMS(templateCode, to, variables, options?)
sendBulkSMS(recipients, category, options?)
sendOTP(phone, userId?)
```

#### SMS Templates (pre-defined):
- `LOAN_SUBMITTED`, `LOAN_APPROVED`, `LOAN_REJECTED`, `LOAN_DISBURSED`
- `PAYMENT_REMINDER_7_DAYS`, `PAYMENT_REMINDER_3_DAYS`, `PAYMENT_REMINDER_1_DAY`
- `PAYMENT_OVERDUE`, `PAYMENT_RECEIVED`, `LOAN_COMPLETED`
- `OTP_VERIFICATION`, `PTP_REMINDER`

#### Wiring Status: ⚠️ NOT WIRED
- **Missing**: Africa's Talking API credentials
- **Missing**: Edge Function for sending
- **Working**: Template system, phone validation, logging

---

### 7.3 WhatsApp Notifications
**Service**: `src/services/whatsappGateway.ts`

#### Provider: Meta WhatsApp Business API

#### Tables Affected:
| Table | Operation | Fields |
|-------|-----------|--------|
| `communication_logs` | INSERT | channel='whatsapp', recipient, content, status, provider='meta_whatsapp' |

#### Wiring Status: ⚠️ NOT WIRED
- **Missing**: Meta API credentials
- **Missing**: Edge Function for sending

---

## 8. Audit & Compliance

### 8.1 Audit Logging
**Service**: `src/services/auditService.ts`

#### Tables Affected:
| Table | Operation | Fields |
|-------|-----------|--------|
| `audit_logs` | INSERT/READ | timestamp, user_id, user_role, action, entity_type, entity_id, old_state, new_state, ip_address |
| `view_logs` | INSERT/READ | timestamp, user_id, entity_type, entity_id, view_duration_ms, fields_viewed |
| `state_transitions` | INSERT/READ | timestamp, entity_type, entity_id, from_state, to_state, transition_reason, triggered_by |
| `compliance_reports` | INSERT/READ | report_type, period_start, period_end, report_data, status |

#### Service Functions:
```typescript
AuditService.logViewAccess(entityType, entityId, fieldsViewed?, viewDurationMs?)
AuditService.logStateTransition(entityType, entityId, fromState, toState, reason?, workflowInstanceId?)
AuditService.getAuditLogs(filters?)
AuditService.getViewLogs(filters?)
AuditService.getStateTransitions(filters?)
AuditService.generateComplianceReport(reportType, periodStart, periodEnd)
AuditService.getComplianceReports(filters?)
AuditService.getAuditStats(startDate?, endDate?)
```

#### RPC Functions:
- `log_view_access(...)`
- `log_state_transition(...)`
- `generate_compliance_report(...)`

#### Wiring Status: ✅ WORKING (with triggers on main tables)

---

## 9. KYC & Document Management

### 9.1 Document Upload
**UI Component**: `src/pages/KYC.tsx`

#### Tables Affected:
| Table | Operation | Fields |
|-------|-----------|--------|
| `kyc_documents` | INSERT | user_id, document_type, file_path, status='pending' |
| `approval_requests` | INSERT | user_id, request_type='kyc_document', reference_id, reference_table='kyc_documents' |

#### Document Types:
- `id_card` - National ID
- `proof_income` - Pay slip, bank statement
- `proof_residence` - Utility bill, lease agreement

#### Storage:
- Supabase Storage bucket: `kyc-documents`

#### Wiring Status: ✅ WORKING

---

### 9.2 KYC Approval
**Service**: `src/services/approvalWorkflow.ts`

#### Flow:
```
Document uploaded → approval_requests → Admin reviews → processApprovedKYCDocument() → Update profile verified status
```

#### Service Function:
```typescript
processApprovedKYCDocument(approvalRequestId)
```

#### Tables Affected:
| Table | Operation | Fields |
|-------|-----------|--------|
| `kyc_documents` | UPDATE | status='approved', approved_at, approved_by |
| `profiles` | UPDATE | verified=true (when all required docs approved) |

#### Wiring Status: ✅ WORKING

---

## 10. Client Dashboard

### 10.1 Overview Tab
**UI Component**: `src/pages/Dashboard.tsx`

#### Data Fetched:
| Table | Query | Purpose |
|-------|-------|---------|
| `profiles` | `select(*).eq('user_id', userId)` | User profile info |
| `loans` | `select(*).eq('user_id', userId)` | User's loans |
| `payments` | `select(*).in('loan_id', loanIds)` | Payment history |
| `notifications` | via notificationService | Unread notifications |

#### Wiring Status: ✅ WORKING

---

### 10.2 Self-Service Portal
**UI Component**: `src/pages/Dashboard.tsx` (Self-Service tab)

#### Features:
- Request payment reschedule
- View payment schedule
- Download statements
- Update contact info

#### Services Used:
- `collectionsService.requestReschedule()`
- `paymentService.getPaymentSchedule()`
- `clientService.updateProfile()`

#### Wiring Status: ⚠️ PARTIAL

---

## 11. Admin Dashboard

### 11.1 Tabs Overview
**UI Component**: `src/pages/AdminDashboard.tsx`

| Tab | Component | Data Source |
|-----|-----------|-------------|
| Financial | `FinancialSummaryCards` | `financial_summary` view, direct queries |
| Loans | `LoanManagementDashboard` | `loans` table |
| Clients | `ClientManagementDashboard` | `profiles`, `client_portfolio` view |
| Payments | `PaymentManagementDashboard` | `payments`, `disbursements` |
| Approvals | `ApprovalManagementDashboard` | `approval_requests_expanded` view |
| Collections | `CollectionsDashboard` | `collections_queue` view |
| Batch Ops | `BatchOperations` | Multiple tables |
| Users | User management | `profiles`, `user_roles` |
| Analytics | `AnalyticsDashboard` | Aggregated queries |
| Settings | System settings | Config tables |

#### Wiring Status: ✅ MOSTLY WORKING

---

## 12. Database Views & Functions Summary

### Views:
| View Name | Purpose | Status |
|-----------|---------|--------|
| `financial_summary` | Dashboard metrics | ✅ |
| `client_portfolio` | Client overview with loan stats | ✅ |
| `approval_requests_expanded` | Approval queue with user names | ✅ |
| `collections_queue` | Collections work queue | ⚠️ Verify |

### Key RPC Functions:
| Function | Purpose | Status |
|----------|---------|--------|
| `process_approval_transaction` | Atomic loan approval | ✅ |
| `create_disbursement_on_approval` | Create disbursement | ✅ |
| `complete_disbursement` | Complete with payment ref | ✅ |
| `generate_payment_schedule` | Amortization schedule | ⚠️ Verify |
| `apply_payment_to_schedule` | Apply payment | ⚠️ Verify |
| `mark_overdue_payments` | Scheduled job | ⚠️ Verify |
| `calculate_credit_score` | Credit scoring | ⚠️ Verify |
| `queue_notification` | Send notification | ⚠️ Verify |

---

## 13. Wiring Checklist for Next Session

### Priority 1: Verify Core Functions
- [ ] Test `generate_payment_schedule` RPC
- [ ] Test `apply_payment_to_schedule` RPC
- [ ] Test `mark_overdue_payments` RPC
- [ ] Verify `collections_queue` view exists
- [ ] Test `calculate_credit_score` RPC
- [ ] Test `queue_notification` RPC

### Priority 2: Complete Partial Features
- [ ] Wire payment schedule to client dashboard
- [ ] Wire collections queue to admin dashboard
- [ ] Wire credit score display to loan application
- [ ] Complete notification queue processing

### Priority 3: External Integrations
- [ ] Configure Africa's Talking API keys
- [ ] Create SMS sending Edge Function
- [ ] Configure Meta WhatsApp API
- [ ] Create WhatsApp sending Edge Function
- [ ] Set up payment webhook handlers

### Priority 4: Testing
- [ ] E2E test loan application flow
- [ ] E2E test disbursement flow
- [ ] E2E test payment recording
- [ ] E2E test collections workflow

---

## 14. Environment Variables Required

```env
# Supabase (Already configured)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# SMS - Africa's Talking
VITE_AFRICASTALKING_API_KEY=
VITE_AFRICASTALKING_USERNAME=
VITE_SMS_SENDER_ID=NAMLEND

# WhatsApp - Meta
VITE_WHATSAPP_ACCESS_TOKEN=
VITE_WHATSAPP_PHONE_NUMBER_ID=
VITE_WHATSAPP_BUSINESS_ID=

# Payment - PayToday
VITE_PAYTODAY_API_URL=
VITE_PAYTODAY_MERCHANT_ID=
VITE_PAYTODAY_API_KEY=

# Mobile Money
VITE_MTC_MOMO_API_URL=
VITE_MTC_MOMO_MERCHANT=
VITE_TN_MOBILE_API_URL=
VITE_TN_MOBILE_MERCHANT=
```

---

*Document Version: 1.0.0*  
*Created: December 7, 2025*  
*For: NamLend Trust Wiring Verification*
