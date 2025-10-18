# Loan Application Visibility Issue - Problem Analysis

**Status:** CRITICAL - Active Investigation  
**Date:** 2025-09-16  
**Severity:** High - Blocking client user functionality  

## Problem Summary

Client users cannot see their submitted loan applications in either:

1. Client dashboard (personal loan history)
2. Admin backoffice (approval management system)

This breaks the core loan application workflow and prevents proper loan processing.

## Technical Investigation

### Current System Architecture

The loan application system uses a two-stage approval workflow:

```
Client Submits Loan → approval_requests table → Admin Approval → loans table → Client Dashboard
```

### Issue Analysis

#### 1. Loan Application Submission Flow

- **File:** `src/pages/LoanApplication.tsx` (lines 77-135)
- **Function:** `handleSubmit()` calls `submitApprovalRequest('loan_application', loanApplicationData)`
- **Expected:** Data should be inserted into `approval_requests` table
- **Service:** `src/services/approvalWorkflow.ts` (lines 52-79)

#### 2. Approval Workflow Service

- **RPC Function:** `submit_approval_request` (called via supabase.rpc())
- **Parameters:** `p_request_type`, `p_request_data`, `p_reference_id`, `p_reference_table`
- **Expected:** Creates record in `approval_requests` table with user_id from authenticated session

#### 3. Database Investigation Results

- **approval_requests table:** May not exist or RPC function not deployed
- **loans table:** Contains 5 existing loans for user ID `98812e7a-784d-4379-b3aa-e8327d214095`
- **Client user ID:** `d109c025-d6fe-455d-96ee-d3cc08578a83` (different from existing loans)
- **loan_applications table:** Does not exist (confirmed via error message)

### Root Cause Analysis

#### Primary Suspects

1. **Missing RPC Function:** `submit_approval_request` may not be deployed to Supabase
2. **Table Missing:** `approval_requests` table may not exist in production database
3. **Migration Issue:** Approval workflow migrations may not have been applied
4. **Authentication Context:** User ID not being passed correctly to RPC function

#### Evidence

- Terminal investigation showed "Could not find the table 'public.loan_applications'" error
- Existing loans belong to different user ID than current client user
- No approval requests found for client user in database queries

## User Credentials for Testing

### Admin User

- **Email:** <anthnydklrk@gmail.com>
- **Password:** 123abc
- **Role:** admin

### Client User  

- **Email:** <client@namlend.com>
- **Password:** client123
- **User ID:** d109c025-d6fe-455d-96ee-d3cc08578a83
- **Role:** client

## Files Modified During Investigation

### 1. UserManagementDashboard.tsx

- **Issue:** Import errors, missing components, TypeScript errors
- **Fix:** Added UserAnalytics, UserActivityMonitor, UserImportWizard imports and tabs
- **Status:** ✅ Resolved

### 2. useUsersList.ts Hook

- **Issue:** User interface missing permissions, isVerified, loginCount fields
- **Fix:** Updated interface and mock data to include all required properties
- **Status:** ✅ Resolved

### 3. Environment Configuration

- **Issue:** Development scripts running in production
- **Fix:** Set VITE_RUN_DEV_SCRIPTS=false, VITE_DEBUG_TOOLS=false
- **Status:** ✅ Resolved

## Next Steps - Priority Order

### 1. Database Schema Verification (CRITICAL)

```bash
# Check if approval_requests table exists
# Check if submit_approval_request RPC function exists
# Verify approval workflow migrations were applied
```

### 2. RPC Function Deployment

- Verify `supabase/functions/` contains approval workflow functions
- Check migration files for RPC function definitions
- Deploy missing functions if needed

### 3. Test Loan Application Flow

- Submit test loan application as client user
- Verify data appears in approval_requests table
- Test admin approval workflow
- Confirm approved loans appear in client dashboard

### 4. User Management Integration

- Replace mock data with real Supabase queries
- Implement real-time user management functionality
- Test admin user management features

## Database Schema Requirements

### approval_requests Table

```sql
- id (uuid, primary key)
- user_id (uuid, foreign key to auth.users)
- request_type (text: 'loan_application', 'kyc_document', etc.)
- request_data (jsonb)
- status (text: 'pending', 'approved', 'rejected', etc.)
- priority (text: 'low', 'normal', 'high', 'urgent')
- created_at (timestamp)
- updated_at (timestamp)
- reviewed_at (timestamp, nullable)
- reviewer_id (uuid, nullable)
- review_notes (text, nullable)
```

### Required RPC Functions

```sql
- submit_approval_request(p_request_type, p_request_data, p_reference_id, p_reference_table)
- process_approved_loan_application(approval_request_id)
```

## Impact Assessment

### Business Impact

- **High:** Client users cannot apply for loans
- **High:** Admin users cannot process loan applications
- **Medium:** User management dashboard partially functional

### Technical Impact

- **Critical:** Core approval workflow broken
- **Medium:** Frontend components working but disconnected from backend
- **Low:** Development environment properly configured

## Resolution Timeline

- **Immediate (Today):** Database schema verification and RPC function deployment
- **Short-term (1-2 days):** Complete loan application flow testing and fixes
- **Medium-term (3-5 days):** User management real data integration
- **Long-term (1 week):** Full system testing and production validation

## Testing Checklist

- [ ] Verify approval_requests table exists
- [ ] Test submit_approval_request RPC function
- [ ] Submit loan application as client user
- [ ] Verify application appears in admin dashboard
- [ ] Test approval workflow (approve/reject)
- [ ] Confirm approved loans appear in client dashboard
- [ ] Test user management with real data
- [ ] Verify all authentication flows work correctly

---

**Last Updated:** 2025-09-16T19:17:00Z  
**Next Review:** 2025-09-17T09:00:00Z
