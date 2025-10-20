# Enhancement Plan — v2.4.x

Version: Draft v1 • Date: 2025-10-09 • Owner: Engineering • Status: 🎯 Planning

## Executive Summary

The v2.4.x enhancement plan focuses on three strategic pillars:
1. **Workflow Engine** - Configurable multi-level approval chains
2. **Audit Trail Enhancement** - Comprehensive compliance and view tracking
3. **Mobile Native App** - React Native interface for clients and approvers

This represents a significant architectural evolution from static approval logic to dynamic, configurable workflows with enterprise-grade auditing and mobile-first client experience.

---

## Objectives

### Business Objectives
- **Flexibility**: Configure approval workflows without code changes
- **Compliance**: Meet Namibian regulatory audit requirements
- **Accessibility**: Enable clients to manage loans from mobile devices
- **Transparency**: Track every action and view for accountability

### Technical Objectives
- Decouple approval logic from application code
- Build reusable workflow engine for future use cases
- Implement comprehensive audit logging
- Create performant mobile-first React Native app
- Maintain RLS security and 32% APR compliance

---

## Phase 1 (v2.4.0) — Workflow Engine Foundation

### Scope

Build the foundational workflow engine infrastructure:
- Database schema for workflow definitions
- State machine implementation
- Multi-level approval chain execution
- Configurable approval stages

### Database Schema

**New Tables:**

```sql
-- Workflow definitions (configurable approval chains)
CREATE TABLE workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  entity_type TEXT NOT NULL, -- 'loan_application', 'disbursement', etc.
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  stages JSONB NOT NULL, -- Array of stage definitions
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Workflow instances (active approval processes)
CREATE TABLE workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_definition_id UUID REFERENCES workflow_definitions(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL, -- approval_request.id or disbursement.id
  current_stage INTEGER DEFAULT 1,
  status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'rejected', 'cancelled'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Workflow stage executions (approval history per stage)
CREATE TABLE workflow_stage_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id UUID REFERENCES workflow_instances(id),
  stage_number INTEGER NOT NULL,
  stage_name TEXT NOT NULL,
  assigned_role TEXT, -- 'loan_officer', 'senior_officer', 'manager'
  assigned_to UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'skipped'
  decision TEXT,
  decision_notes TEXT,
  decided_by UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow configuration history (audit trail)
CREATE TABLE workflow_definition_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_definition_id UUID REFERENCES workflow_definitions(id),
  version INTEGER NOT NULL,
  stages JSONB NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  change_reason TEXT
);
```

### Workflow Definition Example

```json
{
  "name": "Standard Loan Approval",
  "entity_type": "loan_application",
  "stages": [
    {
      "stage": 1,
      "name": "Initial Review",
      "required_role": "loan_officer",
      "required_approvals": 1,
      "auto_assign": true,
      "timeout_hours": 24,
      "conditions": {
        "amount_max": 50000
      }
    },
    {
      "stage": 2,
      "name": "Senior Review",
      "required_role": "senior_officer",
      "required_approvals": 1,
      "auto_assign": false,
      "timeout_hours": 48,
      "conditions": {
        "amount_min": 20000,
        "amount_max": 100000
      }
    },
    {
      "stage": 3,
      "name": "Manager Approval",
      "required_role": "manager",
      "required_approvals": 1,
      "auto_assign": false,
      "timeout_hours": 72,
      "conditions": {
        "amount_min": 50000
      }
    }
  ]
}
```

### Implementation Tasks

**Backend:**
- [ ] Create workflow tables with RLS policies
- [ ] Build workflow engine service (`src/services/workflowEngine.ts`)
- [ ] Implement state machine logic
- [ ] Create RPC functions for workflow operations
- [ ] Add workflow stage notifications

**Frontend:**
- [ ] Workflow configuration UI (admin-only)
- [ ] Visual workflow designer
- [ ] Multi-stage approval interface
- [ ] Stage assignment dashboard

**Testing:**
- [ ] Unit tests for workflow engine
- [ ] E2E tests for multi-stage approvals
- [ ] Load tests for concurrent workflows

### Acceptance Criteria

- [ ] Admin can create/edit workflow definitions
- [ ] Loan applications flow through multi-stage approval
- [ ] Each stage can require specific roles
- [ ] Workflow progresses automatically on approval
- [ ] Rejected applications exit workflow immediately
- [ ] All workflow actions are audited
- [ ] Performance: <200ms for stage transitions

---

## Phase 2 (v2.4.1) — Audit Trail Enhancement

### Scope

Comprehensive audit logging for compliance and security:
- Track all state transitions
- Record who viewed what when
- Generate compliance reports
- Audit log retention and archival

### Database Schema

**New Tables:**

```sql
-- Comprehensive audit log
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  user_role TEXT,
  action TEXT NOT NULL, -- 'view', 'create', 'update', 'delete', 'approve', 'reject'
  entity_type TEXT NOT NULL, -- 'loan', 'approval_request', 'payment', 'user'
  entity_id UUID NOT NULL,
  old_state JSONB,
  new_state JSONB,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- View tracking (who viewed sensitive data)
CREATE TABLE view_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  view_duration_ms INTEGER,
  fields_viewed TEXT[], -- Array of field names
  ip_address INET,
  session_id TEXT
);

-- State transition log (detailed status changes)
CREATE TABLE state_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  transition_reason TEXT,
  triggered_by UUID REFERENCES auth.users(id),
  workflow_instance_id UUID REFERENCES workflow_instances(id),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Compliance reports (pre-generated for auditors)
CREATE TABLE compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL, -- 'monthly_approvals', 'user_activity', 'state_changes'
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES auth.users(id),
  report_data JSONB NOT NULL,
  file_url TEXT -- Link to PDF/CSV export
);
```

### Audit Logging Strategy

**What to Log:**
1. All CREATE, UPDATE, DELETE operations
2. All approval/rejection decisions
3. All sensitive data views (PII, financial data)
4. All role assignments and permission changes
5. All workflow state transitions
6. Failed authentication attempts
7. Export/download operations

**What NOT to Log:**
- Routine reads of non-sensitive data
- System health checks
- Background jobs (unless they modify data)

### Implementation Tasks

**Backend:**
- [ ] Create audit tables with partitioning by month
- [ ] Build audit middleware for automatic logging
- [ ] Implement view tracking hooks
- [ ] Create compliance report generators
- [ ] Add audit log API endpoints (admin-only)

**Frontend:**
- [ ] Audit log viewer dashboard
- [ ] View tracking indicator (show who viewed)
- [ ] Compliance report builder
- [ ] Export audit logs to CSV/PDF

**Infrastructure:**
- [ ] Set up audit log retention policy (7 years)
- [ ] Implement log archival to cold storage
- [ ] Create backup strategy for audit data

### Acceptance Criteria

- [ ] All state changes are logged with before/after snapshots
- [ ] View logs capture who accessed sensitive data
- [ ] Compliance reports generate within 60 seconds
- [ ] Audit logs are immutable (append-only)
- [ ] Admin can query logs by user, entity, action, date range
- [ ] Audit log retention meets regulatory requirements (7 years)
- [ ] Performance: <50ms overhead per logged operation

---

## Phase 3 (v2.4.2) — Mobile Native Client App

### Scope

React Native mobile application for iOS and Android:
- Client portal (view loans, make payments, upload documents)
- Approver interface (review and approve on mobile)
- Push notifications
- Offline capability for viewing

### Technology Stack

**Framework:** React Native with Expo
**Navigation:** React Navigation v6
**State Management:** React Query + Zustand
**UI Components:** React Native Paper
**Authentication:** Supabase Auth with biometric support
**Push Notifications:** Expo Push Notifications
**Offline:** React Query with persistence

### Mobile App Architecture

```
namlend-mobile/
├── src/
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── BiometricSetupScreen.tsx
│   │   ├── client/
│   │   │   ├── DashboardScreen.tsx
│   │   │   ├── LoansListScreen.tsx
│   │   │   ├── LoanDetailsScreen.tsx
│   │   │   ├── PaymentScreen.tsx
│   │   │   └── DocumentUploadScreen.tsx
│   │   └── approver/
│   │       ├── ApprovalQueueScreen.tsx
│   │       ├── ReviewApplicationScreen.tsx
│   │       └── SignatureScreen.tsx
│   ├── components/
│   ├── navigation/
│   ├── services/
│   │   ├── supabaseClient.ts
│   │   ├── notificationService.ts
│   │   └── biometricService.ts
│   ├── hooks/
│   │   ├── useLoans.ts
│   │   ├── usePayments.ts
│   │   └── useApprovals.ts
│   └── utils/
├── app.json
├── package.json
└── tsconfig.json
```

### Features by User Role

**Client Features:**
- ✅ View all loans (active, pending, completed)
- ✅ View loan details and repayment schedule
- ✅ Make payments via mobile money integration
- ✅ Upload documents (ID, proof of income, etc.)
- ✅ Track application status in real-time
- ✅ Receive push notifications for approvals/rejections
- ✅ Biometric login (Face ID / Touch ID / Fingerprint)
- ✅ Offline viewing of loan data

**Approver Features:**
- ✅ View approval queue with priority sorting
- ✅ Review loan applications on mobile
- ✅ View applicant details and documents
- ✅ Approve/reject with digital signature
- ✅ Add review notes
- ✅ Receive push notifications for new applications
- ✅ Biometric approval authorization

### Implementation Tasks

**Mobile App Setup:**
- [ ] Initialize React Native project with Expo
- [ ] Configure Supabase client for mobile
- [ ] Set up navigation structure
- [ ] Implement authentication flow with biometrics

**Client Features:**
- [ ] Build client dashboard
- [ ] Implement loans list and detail views
- [ ] Create payment interface
- [ ] Add document upload with camera integration
- [ ] Implement push notifications

**Approver Features:**
- [ ] Build approval queue interface
- [ ] Create review screen with document viewer
- [ ] Implement approval/rejection flow
- [ ] Add digital signature capture
- [ ] Integrate with workflow engine

**Infrastructure:**
- [ ] Set up push notification service
- [ ] Configure app stores (Apple App Store, Google Play)
- [ ] Implement analytics and crash reporting
- [ ] Create CI/CD pipeline for mobile releases

### Acceptance Criteria

- [ ] App runs on iOS 14+ and Android 10+
- [ ] Biometric authentication works reliably
- [ ] Push notifications delivered within 5 seconds
- [ ] Offline mode allows viewing cached data
- [ ] App size < 50MB
- [ ] App launches in < 2 seconds
- [ ] All API calls authenticated with Supabase JWT
- [ ] Meets app store guidelines for both platforms

---

## Phase 4 (v2.4.3) — Integration & Optimization

### Scope

Final integration, performance optimization, and production hardening:
- Connect workflow engine to audit trail
- Mobile app production release
- Performance tuning
- Load testing
- Documentation and training

### Implementation Tasks

**Integration:**
- [ ] Connect workflow engine to audit logs
- [ ] Integrate mobile app with workflow engine
- [ ] Add workflow notifications to mobile app
- [ ] Sync mobile offline data with server

**Performance:**
- [ ] Optimize database queries with explain analyze
- [ ] Add caching layer for frequently accessed data
- [ ] Implement pagination for large result sets
- [ ] Optimize mobile app bundle size

**Security:**
- [ ] Security audit of workflow engine
- [ ] Penetration testing of mobile app
- [ ] Review RLS policies for new tables
- [ ] Implement rate limiting for mobile API

**Production:**
- [ ] Deploy workflow engine to production
- [ ] Release mobile app to app stores
- [ ] Set up monitoring and alerting
- [ ] Create rollback procedures

**Documentation:**
- [ ] Workflow configuration guide
- [ ] Audit trail reporting guide
- [ ] Mobile app user guide
- [ ] API documentation updates

### Acceptance Criteria

- [ ] All systems integrated and tested end-to-end
- [ ] Performance meets SLAs (see below)
- [ ] Security audit passes with no critical issues
- [ ] Mobile app approved by both app stores
- [ ] Documentation complete and reviewed
- [ ] Training sessions delivered to admins

---

## Technical Specifications

### Performance SLAs

| Operation | Target | Acceptable | Critical |
|-----------|--------|------------|----------|
| Workflow stage transition | <200ms | <500ms | <1s |
| Audit log write | <50ms | <100ms | <200ms |
| Compliance report generation | <60s | <120s | <300s |
| Mobile API response | <300ms | <500ms | <1s |
| Mobile app launch | <2s | <3s | <5s |

### Security Requirements

**Workflow Engine:**
- RLS policies on all workflow tables
- Only admins can create/edit workflow definitions
- Users can only view their assigned tasks
- All workflow actions logged to audit trail

**Audit Trail:**
- Append-only logs (no updates or deletes)
- Immutable after creation
- Encrypted at rest
- Admin-only access with MFA required

**Mobile App:**
- JWT authentication with refresh tokens
- Biometric auth for sensitive operations
- Certificate pinning to prevent MITM
- No sensitive data stored in plain text
- Automatic logout after 15 minutes of inactivity

### Compliance Requirements

**Namibian Regulations:**
- 7-year audit log retention
- Comprehensive loan approval audit trail
- Client consent for data collection
- Secure document storage
- 32% APR limit enforcement (existing)

**Data Protection:**
- GDPR-style data access controls
- Right to data export
- Secure data deletion procedures
- Encryption in transit and at rest

---

## Risks & Mitigations

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| Workflow engine complexity | High | Medium | Incremental development, thorough testing |
| Audit log performance overhead | Medium | High | Async logging, database partitioning |
| Mobile app platform differences | Medium | Medium | Use Expo for cross-platform consistency |
| Offline data sync conflicts | High | Low | Last-write-wins with conflict resolution UI |
| App store approval delays | Medium | Medium | Follow guidelines strictly, plan buffer time |

### Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| User adoption of mobile app | High | Medium | Comprehensive training, intuitive UI |
| Workflow configuration errors | High | Low | Validation rules, preview mode, versioning |
| Audit trail storage costs | Medium | High | Implement archival to cold storage |
| Regulatory compliance gaps | High | Low | Legal review before launch |

---

## Dependencies

### External Dependencies
- Supabase Realtime for mobile sync
- Expo Push Notification service
- Mobile app store approvals (2-4 weeks)
- Biometric API availability on devices

### Internal Dependencies
- v2.3.x completion (existing)
- Admin dashboard enhancements
- Document storage system (if not exists)
- Payment gateway integration (for mobile payments)

---

## Rollout Strategy

### Phase 1: Workflow Engine (4-6 weeks)
1. **Week 1-2:** Database schema, RLS policies, basic engine
2. **Week 3-4:** Admin configuration UI, visual designer
3. **Week 5-6:** Testing, production deployment, migration

### Phase 2: Audit Trail (3-4 weeks)
1. **Week 1-2:** Database schema, logging middleware
2. **Week 3:** Compliance reports, admin UI
3. **Week 4:** Testing, performance optimization, deployment

### Phase 3: Mobile App (8-10 weeks)
1. **Week 1-2:** Setup, authentication, navigation
2. **Week 3-5:** Client features development
3. **Week 6-7:** Approver features development
4. **Week 8-9:** Testing, bug fixes, optimization
5. **Week 10:** App store submission, soft launch

### Phase 4: Integration (2-3 weeks)
1. **Week 1:** Integration testing, performance tuning
2. **Week 2:** Security audit, documentation
3. **Week 3:** Production deployment, training

**Total Timeline: 17-23 weeks (~4-5 months)**

---

## Success Metrics

### Workflow Engine
- 90% of loan applications processed through workflows
- <5% workflow configuration errors
- 100% workflow action audit coverage

### Audit Trail
- 100% of state transitions logged
- <60 seconds for compliance report generation
- Zero audit log data loss

### Mobile App
- 60% client adoption within 3 months
- 4.5+ star rating on app stores
- <2% crash rate
- 80% of approvals done via mobile within 6 months

---

## Budget Estimate

### Development Costs
- **Engineering Time:** 17-23 weeks × 2 developers = 34-46 developer-weeks
- **Design & UX:** 2-3 weeks for mobile app design
- **QA & Testing:** 4-6 weeks
- **DevOps & Infrastructure:** 2-3 weeks

### Infrastructure Costs (Annual)
- **Supabase Storage:** ~$50-100/month (audit logs)
- **Push Notifications:** ~$20-50/month (Expo)
- **App Store Fees:** $99/year (Apple) + $25 (Google Play)
- **Monitoring & Analytics:** ~$30-60/month

**Total Estimated Infrastructure: ~$1,000-1,500/year**

---

## Next Steps

1. **Review & Approval** (Week of Oct 14, 2025)
   - Present plan to stakeholders
   - Gather feedback and adjust scope
   - Get budget approval

2. **Technical Design** (Week of Oct 21, 2025)
   - Detailed database schema design
   - API endpoint specifications
   - Mobile app wireframes and mockups

3. **Phase 1 Kickoff** (Week of Oct 28, 2025)
   - Sprint planning
   - Development environment setup
   - Begin workflow engine implementation

---

## Tracking

- Update TODOs as phases progress
- Document all milestones in CHANGELOG
- Weekly status updates in project meetings
- Monthly demo to stakeholders

---

## Appendix A — v2.7.1 Hardening & Backoffice Disbursement Plan

### Executive Summary

- Strengthen schema alignment, RLS guarantees, and CI across web/mobile.
- Implement backoffice Disbursement/Make Payment capability for approved loans.
- Unify Supabase types and improve observability and documentation (ADRs).

### Milestones (Order of Execution)

1. Schema Alignment Verification (paid_at, total_repayment, disbursed_at)
2. RLS & Storage Tests for documents and disbursements
3. Unified Supabase Types generation (web + mobile)
4. CI Expansion (lint, typecheck, unit, Playwright API smoke, mobile checks)
5. Observability Standardization (error context, correlation IDs)
6. Documentation Enhancements (ADRs, ownership cadence)
7. Backoffice Disbursement/Make Payment UI & RPCs

### Detailed Plan

#### 1) Schema Alignment Verification
- Sweep code to remove legacy fields: `payment_date`, `outstanding_balance`, `next_payment_date`.
- Enforce usage of `paid_at`, `total_repayment`, `disbursed_at`.
- Update any admin-only legacy pages in `src/pages/AdminDashboard_*.tsx`.

Acceptance Criteria
- [ ] No references to legacy fields in main branch.
- [ ] All queries compile and pass unit/API smoke tests.

#### 2) RLS & Storage Tests (Documents + Disbursements)
- Add integration tests verifying role-based access to documents and disbursements.
- Ensure storage policies prevent cross-tenant access.

Acceptance Criteria
- [ ] Clients cannot read others’ documents or disbursements.
- [ ] Admin and loan_officer have only necessary access.
- [ ] Tests fail if policies regress.

#### 3) Unified Supabase Types
- Generate types from live schema and adopt in both apps.
- Replace ad-hoc types in services with generated types.

Acceptance Criteria
- [ ] Types regenerated on schema change.
- [ ] Services compile without any `any` around DB payloads.

#### 4) CI Expansion
- Add workflows to gate PRs on lint, typecheck, unit tests, and Playwright API smoke.
- Add mobile lint/typecheck; optional EAS build on tags.

Acceptance Criteria
- [ ] All PRs run green checks < 8 minutes.
- [ ] Schema/type generation check prevents drift.

#### 5) Observability Standardization
- Introduce shared error/log utilities with serialized error details and correlation IDs.
- Document logging levels and categories.

Acceptance Criteria
- [ ] Consistent error context across web/mobile.
- [ ] Runbook updated with triage steps.

#### 6) Documentation Enhancements
- Create `docs/ADRs/` index and add decisions for payments schema, documents module, and navigation typing.
- Add ownership table and quarterly review cadence in `docs/README.md`.

Acceptance Criteria
- [ ] ADR index present and referenced from `docs/INDEX.md`.
- [ ] Owners and review cycles documented.

#### 7) Backoffice Disbursement / Make Payment (Loan Funding)

Objective
- Enable backoffice (admin/loan_officer) to disburse approved loans so funds are transferred to clients and loan moves to `disbursed` state.

Scope
- UI: Add "Disburse Loan" action for approved loans without `disbursed_at`.
- Modal: Reuse/wire `PaymentManagement/CompleteDisbursementModal.tsx` and/or `DisbursementManager.tsx` for confirmation and metadata (method, reference, bank/mobile money).
- Server: Create/confirm RPC to record disbursement in disbursements ledger, update `loans.disbursed_at`, and audit the action.
- RLS: Ensure only authorized roles can create disbursements; client cannot.

Implementation Notes (Code Pointers)
- Web Admin UI
  - `src/pages/AdminDashboard/components/LoanManagement/LoanManagementDashboard.tsx` → add row action "Disburse" when `loan.status === 'approved' && !loan.disbursed_at`.
  - Integrate `PaymentManagement/CompleteDisbursementModal.tsx` for confirmation and capture of disbursement metadata.
  - Alternatively centralize under `PaymentManagement/DisbursementManager.tsx` and deep-link from loans list.
- API / DB
  - Confirm disbursements ledger exists (see migrations around disbursements).
  - If needed, add RPC: `perform_disbursement(loan_id uuid, amount numeric, method text, reference text)` with role checks.
  - On success: set `loans.disbursed_at = now()`, status → `disbursed`; write audit trail.
- Tests
  - Add Playwright API tests: admin can disburse; client cannot; duplicate prevention.
  - Add UI tests for the modal flow and final state (loan shows disbursed).

Acceptance Criteria
- [ ] Approved loans display a "Disburse" action in backoffice.
- [ ] Disbursement records are created with method, reference, processed_by, and timestamp.
- [ ] `loans.disbursed_at` set and status transitioned to `disbursed`.
- [ ] Audit event recorded (who, when, amount, reference).
- [ ] Clients cannot trigger disbursement; RLS enforced.
- [ ] E2E passes for approve → disburse → repayments visible in schedule.

Timeline & Ownership
- Week 1: Schema sweep + CI expansion.
- Week 2: RLS tests + Unified types.
- Week 3: Backoffice Disbursement UI/RPC + E2E.
- Owners: Engineering (Admin UI: Web FE), Platform (DB/RPC/RLS), QA (E2E).

