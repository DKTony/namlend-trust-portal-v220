# NamLend Trust - System Architecture

**Version**: 2.6.0  
**Last Updated**: December 10, 2025  
**Status**: ✅ Production Architecture Complete (IPP Integration Ready)

---

## System Overview

NamLend Trust follows a modern **client-server architecture** with a React SPA frontend and Supabase as the backend-as-a-service (BaaS) platform. The system integrates with Namibia's **Instant Payment Platform (IPP/IPN)** for real-time payment processing.

### External Integrations

```
┌─────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL PAYMENT SYSTEMS                          │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │  IPP/IPN    │  │  MTC MoMo   │  │  TN Mobile  │  │  PayToday │  │
│  │  (BON)      │  │  Money      │  │  Money      │  │  Gateway  │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬─────┘  │
│         └────────────────┼────────────────┼───────────────┘        │
│                          ▼                                          │
│              ┌─────────────────────┐                                │
│              │   Payment Webhooks  │                                │
│              │  (Edge Functions)   │                                │
│              └──────────┬──────────┘                                │
└─────────────────────────┼───────────────────────────────────────────┘
                          ▼
                    NamLend Backend
```

> **Note**: For detailed IPP integration, see [IPP_INTEGRATION.md](./IPP_INTEGRATION.md)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
├─────────────────────────────────────────────────────────────────────┤
│  React 18 SPA (TypeScript)                                          │
│  ├── TanStack Query (Server State)                                  │
│  ├── React Context (Auth State)                                     │
│  ├── React Router (Navigation)                                      │
│  └── shadcn/ui + TailwindCSS (UI)                                   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS / WSS
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       SUPABASE PLATFORM                              │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │  Auth API   │  │  REST API   │  │  Realtime   │                  │
│  │  (GoTrue)   │  │  (PostgREST)│  │  (Phoenix)  │                  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                  │
│         │                │                │                          │
│         └────────────────┼────────────────┘                          │
│                          ▼                                           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    PostgreSQL 15+                            │    │
│  │  ├── Tables with RLS Policies                               │    │
│  │  ├── Database Functions (RPCs)                              │    │
│  │  ├── Triggers (Audit, Workflow)                             │    │
│  │  └── Views (Materialized for Performance)                   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                          │                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │  Storage    │  │  Edge Funcs │  │  Cron Jobs  │                  │
│  │  (S3-like)  │  │  (Deno)     │  │  (pg_cron)  │                  │
│  └─────────────┘  └─────────────┘  └─────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Component Hierarchy

```
App.tsx
├── ErrorBoundary
├── QueryClientProvider (TanStack Query)
├── AuthProvider (useAuth context)
├── TooltipProvider (shadcn/ui)
├── Router
│   ├── / (Index - Landing Page)
│   ├── /auth (Authentication - Split Screen Layout)
│   ├── /dashboard (Client Dashboard - Sidebar Layout)
│   │   ├── DashboardSidebar (Collapsible Navigation)
│   │   ├── Mobile Header (Hamburger Menu)
│   │   └── ProtectedRoute (requires auth)
│   ├── /admin/* (Admin Dashboard - Sidebar Layout)
│   │   └── ProtectedRoute (requires admin role)
│   ├── /loan-application
│   ├── /payment
│   └── /kyc
└── Toasters (Notifications)
```

### Layout Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DESKTOP LAYOUT (lg: 1024px+)                      │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌─────────────────────────────────────────────┐  │
│  │   Sidebar    │  │              Main Content                    │  │
│  │   (w-72)     │  │                                              │  │
│  │              │  │  ┌─────────────────────────────────────────┐ │  │
│  │  - Logo      │  │  │  Page Header (Title + Actions)          │ │  │
│  │  - Nav Items │  │  └─────────────────────────────────────────┘ │  │
│  │  - User Info │  │  ┌─────────────────────────────────────────┐ │  │
│  │              │  │  │  Content Area (Scrollable)              │ │  │
│  └──────────────┘  │  └─────────────────────────────────────────┘ │  │
│                    └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    MOBILE LAYOUT (< 1024px)                          │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  Mobile Header  [Logo]                    [☰ Menu]              ││
│  └─────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                                                                  ││
│  │              Main Content (Full Width)                          ││
│  │                                                                  ││
│  │  - Stacked cards (grid-cols-1)                                  ││
│  │  - Reduced padding (p-4)                                        ││
│  │                                                                  ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌────────────────┐  (Slide-out overlay when menu open)             │
│  │   Sidebar      │                                                  │
│  │   (Overlay)    │                                                  │
│  └────────────────┘                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### State Management

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Server State** | TanStack Query | API data, caching, refetching |
| **Auth State** | React Context | User session, role, loading |
| **Form State** | React Hook Form | Form values, validation |
| **UI State** | Local State | Modals, tabs, toggles |

### Service Layer Pattern

```typescript
// services/disbursementService.ts
export async function completeDisbursement(
  disbursementId: string,
  paymentMethod: 'bank_transfer' | 'mobile_money' | 'cash' | 'debit_order',
  paymentReference: string,
  notes?: string
): Promise<DisbursementResult> {
  return measurePerformance('complete_disbursement', async () => {
    // Validation
    if (!paymentReference?.trim()) {
      return { success: false, error: 'Payment reference is required' };
    }
    
    // RPC call
    const { data, error } = await supabase.rpc('complete_disbursement', {
      p_disbursement_id: disbursementId,
      p_payment_method: paymentMethod,
      p_payment_reference: paymentReference.trim(),
      p_notes: notes || null
    });
    
    // Error handling
    if (error) {
      handleDatabaseError(error, 'completeDisbursement', { disbursementId });
      return { success: false, error: error.message };
    }
    
    return data as DisbursementResult;
  });
}
```

---

## Backend Architecture (Supabase)

### Database Schema Design

The schema follows the **LEDGER** framework for financial systems:

- **L**edger Integrity: Immutable transaction records
- **E**ntity Design: Soft deletes, temporal modeling
- **D**ata Integrity: Check constraints, foreign keys
- **G**overnance: Audit columns on all tables
- **E**fficiency: Strategic indexing
- **R**econciliation: Balance verification support

### Key Schema Patterns

#### Audit Columns (All Tables)

```sql
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
created_by UUID REFERENCES auth.users(id),
```

#### Status Transitions (Check Constraints)

```sql
status VARCHAR(20) CHECK (status IN (
  'pending', 'under_review', 'approved', 'rejected', 'completed'
))
```

#### Soft Deletes

```sql
deleted_at TIMESTAMP WITH TIME ZONE,
is_deleted BOOLEAN DEFAULT FALSE,
```

### Row Level Security (RLS) Strategy

```sql
-- Pattern 1: User owns record
CREATE POLICY "Users can view own loans"
  ON loans FOR SELECT
  USING (auth.uid() = user_id);

-- Pattern 2: Admin access
CREATE POLICY "Admins can view all loans"
  ON loans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Pattern 3: System insert (triggers, functions)
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);
```

---

## Data Flow Diagrams

### Loan Application Flow

```
┌──────────┐    ┌──────────────────┐    ┌───────────────┐
│  Client  │───►│ LoanApplication  │───►│ approval_     │
│          │    │ Form Submission  │    │ requests      │
└──────────┘    └──────────────────┘    └───────┬───────┘
                                                │
                         ┌──────────────────────┘
                         ▼
              ┌──────────────────┐
              │  Admin Reviews   │
              │  (Back Office)   │
              └────────┬─────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │ APPROVED │ │ REJECTED │ │ REQUIRES │
    │          │ │          │ │   INFO   │
    └────┬─────┘ └──────────┘ └──────────┘
         │
         ▼
┌────────────────────┐    ┌────────────────┐
│ Create Loan Record │───►│ Create         │
│ (loans table)      │    │ Disbursement   │
└────────────────────┘    └────────┬───────┘
                                   │
                                   ▼
                          ┌────────────────┐
                          │ Generate       │
                          │ Payment        │
                          │ Schedule       │
                          └────────────────┘
```

### Disbursement Flow

```
┌─────────────────┐
│ Pending         │  Status: 'pending'
│ Disbursement    │
└────────┬────────┘
         │ approveDisbursement()
         ▼
┌─────────────────┐
│ Approved        │  Status: 'approved'
│ (Ready to       │
│  Process)       │
└────────┬────────┘
         │ markDisbursementProcessing()
         ▼
┌─────────────────┐
│ Processing      │  Status: 'processing'
│ (Payment in     │
│  Progress)      │
└────────┬────────┘
         │ completeDisbursement(method, reference)
         ▼
┌─────────────────┐
│ Completed       │  Status: 'completed'
│ (Funds          │  + payment_reference
│  Transferred)   │  + processed_at
└─────────────────┘
```

### Payment Reconciliation Flow

```
┌──────────────────┐    ┌──────────────────┐
│ Bank Statement   │    │ System Payments  │
│ (CSV/API Import) │    │ (payments table) │
└────────┬─────────┘    └────────┬─────────┘
         │                       │
         ▼                       ▼
┌────────────────────────────────────────┐
│        Auto-Matching Engine            │
│  (Match by amount + date ± 1 cent)     │
└────────────────┬───────────────────────┘
                 │
    ┌────────────┼────────────┐
    ▼            ▼            ▼
┌────────┐  ┌────────┐  ┌────────────┐
│ MATCHED│  │ PARTIAL│  │ UNMATCHED  │
│ (auto) │  │ MATCH  │  │ (manual    │
│        │  │        │  │  review)   │
└────────┘  └────────┘  └─────┬──────┘
                              │
                              ▼
                    ┌────────────────┐
                    │ Admin Manual   │
                    │ Reconciliation │
                    └────────────────┘
```

---

## Security Architecture

### Authentication Flow

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐
│  User    │───►│  Supabase    │───►│  auth.users  │
│  Login   │    │  Auth API    │    │  (verified)  │
└──────────┘    └──────────────┘    └──────┬───────┘
                                           │
                                           ▼
┌──────────────────────────────────────────────────┐
│                 JWT Token                         │
│  ┌─────────────────────────────────────────┐     │
│  │ {                                        │     │
│  │   "sub": "user-uuid",                   │     │
│  │   "email": "user@example.com",          │     │
│  │   "role": "authenticated",              │     │
│  │   "exp": 1234567890                     │     │
│  │ }                                        │     │
│  └─────────────────────────────────────────┘     │
└──────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│  Frontend: useAuth() context                      │
│  ├── Stores user, session, userRole              │
│  ├── Fetches role from user_roles table          │
│  └── Provides isAdmin, isLoanOfficer flags       │
└──────────────────────────────────────────────────┘
```

### Authorization Layers

```
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 1: Frontend Route Guards (ProtectedRoute)                 │
│   - Redirects unauthenticated users                             │
│   - Checks role for admin routes                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 2: API Validation (Service Layer)                         │
│   - Validates inputs before database calls                      │
│   - Business logic checks                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 3: Row Level Security (PostgreSQL)                        │
│   - Enforced at database level                                  │
│   - Cannot be bypassed by client                                │
│   - Based on auth.uid() and user_roles                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 4: Database Constraints                                    │
│   - Check constraints for valid values                          │
│   - Foreign key constraints for referential integrity           │
│   - Triggers for audit logging                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Audit Trail Architecture

### Audit Logging Strategy

```sql
-- Automatic triggers on key tables
CREATE TRIGGER audit_loans
  AFTER INSERT OR UPDATE OR DELETE ON loans
  FOR EACH ROW EXECUTE FUNCTION audit_loans_changes();

-- Captures:
-- - user_id (who)
-- - timestamp (when)
-- - action (what: create/update/delete)
-- - old_state (before)
-- - new_state (after)
-- - ip_address, user_agent (context)
```

### Compliance Reporting

```
┌────────────────────────────────────────────────────────────────┐
│                    AUDIT DATA SOURCES                           │
├────────────────────────────────────────────────────────────────┤
│  audit_logs          State changes for all entities            │
│  view_logs           Who viewed sensitive data                 │
│  state_transitions   Status change history                     │
│  approval_history    Workflow decision trail                   │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│               COMPLIANCE REPORTS                                │
│  ├── monthly_approvals     Approval/rejection stats           │
│  ├── user_activity         User action summary                │
│  ├── state_changes         Entity status changes              │
│  ├── view_access           Sensitive data access log          │
│  └── security_audit        Security event analysis            │
└────────────────────────────────────────────────────────────────┘
```

---

## Performance Considerations

### Database Indexes

```sql
-- Key performance indexes
CREATE INDEX idx_loans_user_id ON loans(user_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_payments_loan_id ON payments(loan_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_approval_requests_status ON approval_requests(status);
```

### Query Optimization Views

```sql
-- Pre-computed views for dashboard metrics
CREATE VIEW financial_summary AS
SELECT
  COUNT(DISTINCT user_id) as total_clients,
  COUNT(*) as total_loans,
  SUM(amount) FILTER (WHERE status = 'funded') as total_disbursed,
  ...
```

### Caching Strategy

- **TanStack Query**: Client-side caching with configurable stale time
- **Database Views**: Materialized views for expensive aggregations
- **CDN**: Static assets served via Netlify edge network

---

## Scalability Considerations

### Current Architecture Limits

| Component | Current Capacity | Scaling Path |
|-----------|------------------|--------------|
| Database | Supabase Pro tier | Read replicas, connection pooling |
| API | PostgREST | Horizontal scaling via Supabase |
| Storage | S3-compatible | Virtually unlimited |
| Auth | GoTrue | Handles millions of users |

### Future Scaling Options

1. **Read Replicas**: For reporting and analytics queries
2. **Table Partitioning**: For audit_logs by month
3. **Edge Caching**: For frequently accessed data
4. **Background Jobs**: Move heavy processing to edge functions

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        NETLIFY                                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  CDN Edge    │  │  Build       │  │  Functions   │          │
│  │  Network     │  │  Pipeline    │  │  (SSR/API)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE CLOUD                              │
├─────────────────────────────────────────────────────────────────┤
│  Region: (configured per project)                               │
│  Tier: Pro (recommended for production)                         │
│  Backups: Point-in-time recovery enabled                        │
│  Monitoring: Built-in metrics and logging                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Decisions (ADRs)

### ADR-001: Payment Method Normalization

**Decision**: Store payment methods as lowercase canonical values  
**Rationale**: Consistent querying and display formatting  
**Status**: Implemented

### ADR-002: Disbursement RPC Audit Trail

**Decision**: Use database RPCs for disbursement operations  
**Rationale**: Atomic operations with built-in audit logging  
**Status**: Implemented

### ADR-003: E2E Test Coverage Strategy

**Decision**: Use Playwright fixtures with testInfo.testId isolation  
**Rationale**: Parallel execution without session conflicts  
**Status**: Implemented (67% coverage achieved)

---

### ADR-004: Phase 4 Database Migration Strategy

**Decision**: Apply migrations via Supabase MCP server  
**Rationale**: Bypass CLI migration history conflicts, direct SQL execution  
**Status**: Implemented (December 2025)

### ADR-005: Multi-Channel Notification Architecture

**Decision**: Queue-based notification system with template support  
**Rationale**: Decouple notification delivery from business logic, support multiple channels  
**Status**: Implemented

### ADR-006: Mobile-First Responsive Layout

**Decision**: Implement mobile-first responsive design with collapsible sidebar navigation  
**Rationale**: Majority of users in Namibian market access via mobile devices; improves UX across all screen sizes  
**Implementation**:
- Sidebar hidden by default on mobile, slide-out with backdrop overlay
- Mobile header with hamburger menu toggle
- Grid layouts stack to single column on mobile
- Touch-friendly tap targets (min 44px)
**Status**: Implemented (December 2025)

### ADR-007: Neo-Fintech Design System

**Decision**: Adopt "Black Card" aesthetic with Zinc/Black palette and Electric Blue accents  
**Rationale**: Modern, premium feel aligned with digital banking leaders (Revolut, Monzo, Mercury)  
**Implementation**:
- Split-screen authentication layout
- Rounded-3xl cards with soft shadows
- Dark sidebar navigation
- CSS-only charts (no external charting library dependency)
**Status**: Implemented (December 2025)

---

*Document Version: 2.4.0*  
*Last Updated: December 6, 2025*
