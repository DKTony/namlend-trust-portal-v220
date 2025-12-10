# NamLend System Evaluation Prompt for AI Agent

## System Overview

You are tasked with comprehensively evaluating the **NamLend Trust** loan management platform - a production-ready financial services application built for the Namibian market. This system serves both front-office (client-facing) and back-office (administrative) operations with strict regulatory compliance requirements.

## Technology Stack & Architecture

- **Frontend**: React 18.3.1 + TypeScript + Tailwind CSS + Vite
- **Backend**: Supabase (PostgreSQL + Auth + RLS + Edge Functions)
- **State Management**: TanStack React Query + Custom hooks
- **UI Framework**: Radix UI + shadcn/ui components
- **Routing**: React Router DOM v6
- **Currency**: NAD (Namibian Dollar)
- **Regulatory**: NAMFISA licensed, 32% APR limit compliance

## Core System Features to Evaluate

### Front-Office (Client-Facing) Features

#### 1. Authentication & User Management

**Location**: `/src/pages/Auth.tsx`, `/src/hooks/useAuth.tsx`

- **Sign-up flow**: Email validation, profile creation, automatic 'client' role assignment
- **Sign-in flow**: Email normalization, role-based routing, session management
- **Role-based access**: Client vs Admin routing (`/dashboard` vs `/admin`)
- **Security**: Email validation with Zod, password confirmation, auto-lowercase emails

**Validation Points**:

- Test email validation edge cases (spaces, case sensitivity, invalid formats)
- Verify role assignment on signup (should default to 'client')
- Check session persistence and automatic redirects
- Validate password requirements and confirmation matching

#### 2. Client Dashboard

**Location**: `/src/pages/Dashboard.tsx`

- **Overview tab**: Financial summary cards, loan progress tracking, quick actions
- **Loans tab**: Loan history, application status, loan details display
- **Payments tab**: Payment history, transaction records, status tracking  
- **Profile tab**: Personal information, verification status, KYC compliance

**Validation Points**:

- Verify data fetching from correct Supabase tables (`profiles`, `loans`, `payments`)
- Test currency formatting (NAD) across all financial displays
- Check loan status badges and progress calculations
- Validate navigation between tabs and quick actions

#### 3. Loan Application System

**Location**: `/src/pages/LoanApplication.tsx`

- **Multi-step form**: Personal info, financial details, loan parameters
- **Real-time calculations**: Interest rates, monthly payments, total repayment
- **APR compliance**: Maximum 32% APR enforcement
- **Form validation**: Required fields, numeric validation, business rules

**Validation Points**:

- Test APR limit enforcement (reject applications > 32%)
- Verify loan calculation accuracy (principal + interest + fees)
- Check form validation on each step
- Test data persistence between form steps

#### 4. Payment Processing

**Location**: `/src/pages/Payment.tsx`, `/src/components/PaymentModal.tsx`

- **Payment methods**: Multiple payment options
- **Transaction tracking**: Reference numbers, status updates
- **Payment history**: Historical transaction records
- **Integration**: Real-time payment status updates

**Validation Points**:

- Test payment method selection and processing
- Verify transaction reference number generation
- Check payment status updates in real-time
- Validate payment history accuracy

#### 5. KYC & Document Management

**Location**: `/src/pages/KYC.tsx`

- **Document upload**: Identity verification, income proof
- **Verification workflow**: Document processing, approval status
- **Compliance tracking**: Regulatory requirement fulfillment

**Validation Points**:

- Test document upload functionality and file validation
- Verify verification status updates
- Check compliance requirement tracking

### Back-Office (Administrative) Features

#### 1. Admin Dashboard Overview

**Location**: `/src/pages/AdminDashboard.tsx`

- **Financial metrics**: Revenue tracking, portfolio performance
- **KPI monitoring**: Loan approval rates, default rates, growth metrics
- **Quick actions**: Bulk operations, system management
- **Real-time data**: Live updates from database

**Validation Points**:

- Verify admin role access control (only admin/loan_officer roles)
- Test financial metric calculations and accuracy
- Check real-time data updates and refresh functionality
- Validate KPI calculations against business rules

#### 2. Loan Management System

**Location**: `/src/pages/AdminDashboard/hooks/useLoanActions.ts`

- **Approval workflow**: Single and bulk loan approvals
- **Rejection handling**: Loan rejections with reason tracking
- **Disbursement process**: Loan fund release management
- **Status tracking**: Real-time loan status updates

**Validation Points**:

- Test single loan approval/rejection workflows
- Verify bulk operations (approve/reject multiple loans)
- Check disbursement process and status updates
- Validate loan status transitions and audit trails

#### 3. Client Management

**Location**: `/src/pages/AdminDashboard/components/ClientManagement/`

- **Client profiles**: Comprehensive client information management
- **Portfolio tracking**: Individual client loan portfolios
- **Risk assessment**: Client creditworthiness evaluation
- **Communication**: Client interaction history

**Validation Points**:

- Test client profile data accuracy and updates
- Verify portfolio calculations per client
- Check risk assessment algorithms
- Validate communication tracking

#### 4. Payment Management

**Location**: `/src/pages/AdminDashboard/components/PaymentManagement/`

- **Payment tracking**: All system payments monitoring
- **Reconciliation**: Payment matching and verification
- **Reporting**: Payment analytics and insights
- **Dispute handling**: Payment issue resolution

**Validation Points**:

- Test payment tracking accuracy across all clients
- Verify reconciliation processes
- Check payment analytics calculations
- Validate dispute handling workflows

#### 5. Analytics & Reporting

**Location**: `/src/pages/AdminDashboard/components/Analytics/`

- **Performance metrics**: Business KPIs and trends
- **Financial reporting**: Revenue, profit, loss analysis
- **Risk analytics**: Portfolio risk assessment
- **Regulatory reporting**: Compliance report generation

**Validation Points**:

- Test metric calculations for accuracy
- Verify report generation functionality
- Check data visualization accuracy
- Validate regulatory compliance reporting

## Critical Integration Points

### 1. Role Assignment System

**Location**: `/src/utils/serviceRoleAssignment.ts`

- **Service role operations**: Privileged database operations
- **Multi-role support**: Users can have multiple roles simultaneously
- **Delete-then-insert pattern**: Avoids RLS conflicts and update triggers
- **Security**: Bypasses RLS using service role key for administrative operations

**Validation Points**:

- Test role assignment for new users (should default to 'client')
- Verify multi-role assignment capability (client + admin)
- Check service role key security and access control
- Validate RLS policy enforcement

### 2. Database Schema & RLS

**Location**: `/supabase/migrations/`

- **Core tables**: `profiles`, `loans`, `payments`, `user_roles`, `approval_requests`
- **RLS policies**: Row-level security for data isolation
- **Relationships**: Foreign key constraints and data integrity
- **Audit trails**: Created/updated timestamp tracking

**Validation Points**:

- Test RLS policy enforcement for different user roles
- Verify data isolation between clients
- Check foreign key constraints and referential integrity
- Validate audit trail accuracy

### 3. Authentication Flow

**Location**: `/src/hooks/useAuth.tsx`

- **Supabase Auth**: Email/password authentication
- **Session management**: Token refresh and persistence
- **Role resolution**: Database role lookup and caching
- **Navigation**: Role-based routing after authentication

**Validation Points**:

- Test authentication with various email formats
- Verify session persistence across browser refreshes
- Check role resolution accuracy from database
- Validate automatic navigation based on user roles

## Validation Framework

### Phase 1: Feature Functionality Testing

#### Authentication & Authorization

1. **Sign-up Process**:
   - Test with valid/invalid email formats
   - Verify password confirmation matching
   - Check automatic 'client' role assignment
   - Validate profile creation in database

2. **Sign-in Process**:
   - Test email normalization (case, spaces)
   - Verify role-based routing
   - Check session establishment
   - Validate error handling for invalid credentials

3. **Role Management**:
   - Test role assignment via service role client
   - Verify multi-role support
   - Check role-based access control
   - Validate RLS policy enforcement

#### Front-Office Operations

1. **Dashboard Functionality**:
   - Verify data loading from correct tables
   - Test currency formatting (NAD)
   - Check loan status calculations
   - Validate payment history accuracy

2. **Loan Application**:
   - Test APR limit enforcement (32% maximum)
   - Verify calculation accuracy
   - Check form validation rules
   - Test multi-step form persistence

3. **Payment Processing**:
   - Test payment method selection
   - Verify transaction processing
   - Check status updates
   - Validate payment history

#### Back-Office Operations

1. **Admin Dashboard**:
   - Verify admin access control
   - Test financial metric calculations
   - Check real-time data updates
   - Validate KPI accuracy

2. **Loan Management**:
   - Test approval/rejection workflows
   - Verify bulk operations
   - Check status transitions
   - Validate audit trails

3. **Analytics & Reporting**:
   - Test metric calculations
   - Verify report accuracy
   - Check data visualization
   - Validate export functionality

### Phase 2: Integration Testing

#### Database Integration

1. **Data Consistency**:
   - Verify foreign key relationships
   - Check data synchronization
   - Test transaction integrity
   - Validate audit trails

2. **Performance**:
   - Test query performance under load
   - Verify caching mechanisms
   - Check real-time updates
   - Validate connection pooling

#### Security Testing

1. **Authentication Security**:
   - Test session security
   - Verify token handling
   - Check password security
   - Validate logout functionality

2. **Authorization Security**:
   - Test RLS policy enforcement
   - Verify role-based access
   - Check data isolation
   - Validate privilege escalation prevention

### Phase 3: Edge Case Testing

#### Data Validation

1. **Input Validation**:
   - Test boundary values
   - Verify data type enforcement
   - Check required field validation
   - Test special character handling

2. **Business Rule Validation**:
   - Test APR limit enforcement
   - Verify loan amount limits
   - Check payment amount validation
   - Test date range validation

#### Error Handling

1. **Network Errors**:
   - Test offline scenarios
   - Verify connection timeout handling
   - Check retry mechanisms
   - Validate error messaging

2. **Database Errors**:
   - Test constraint violations
   - Verify transaction rollbacks
   - Check error recovery
   - Validate data consistency

### Phase 4: Performance Testing

#### Load Testing

1. **Concurrent Users**:
   - Test multiple simultaneous logins
   - Verify dashboard performance under load
   - Check database connection limits
   - Validate response times

2. **Data Volume**:
   - Test with large loan portfolios
   - Verify payment history performance
   - Check analytics calculation speed
   - Validate pagination efficiency

## Reporting Framework

### Issue Classification

- **Critical**: Security vulnerabilities, data corruption, system crashes
- **High**: Feature failures, incorrect calculations, broken workflows
- **Medium**: UI/UX issues, performance problems, minor bugs
- **Low**: Cosmetic issues, enhancement opportunities

### Issue Report Template

```markdown
## Issue Report

**Issue ID**: [Unique identifier]
**Severity**: [Critical/High/Medium/Low]
**Component**: [Affected system component]
**Feature**: [Specific feature affected]

### Description
[Detailed description of the issue]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Impact Assessment
- **Users Affected**: [Client/Admin/Both]
- **Business Impact**: [Revenue/Compliance/Operations]
- **Technical Impact**: [Performance/Security/Data]

### Recommended Resolution
1. **Immediate Actions**: [Quick fixes/workarounds]
2. **Long-term Solutions**: [Permanent fixes]
3. **Prevention Measures**: [Avoid recurrence]

### Test Cases
- [ ] Unit tests needed
- [ ] Integration tests needed
- [ ] E2E tests needed
- [ ] Performance tests needed
```

### Success Metrics

- **Functionality**: All features work as specified
- **Performance**: Response times < 2 seconds for standard operations
- **Security**: No vulnerabilities found, RLS properly enforced
- **Compliance**: 32% APR limit enforced, regulatory requirements met
- **User Experience**: Intuitive navigation, clear error messages
- **Data Integrity**: No data corruption, accurate calculations

## Evaluation Instructions

### Pre-Evaluation Setup

1. **Environment Verification**:
   - Confirm Supabase connection and credentials
   - Verify environment variables are properly set
   - Check database schema is up to date
   - Validate RLS policies are active

2. **Test Data Preparation**:
   - Create test users with different roles
   - Generate sample loan applications
   - Set up test payment records
   - Prepare edge case scenarios

### Systematic Evaluation Process

1. **Start with Authentication**: Verify the foundation works correctly
2. **Test Front-Office Features**: Ensure client experience is smooth
3. **Validate Back-Office Operations**: Confirm administrative functions
4. **Check Integration Points**: Verify system cohesion
5. **Perform Edge Case Testing**: Find potential breaking points
6. **Conduct Performance Testing**: Ensure system scalability

### Documentation Requirements

- Document all test cases executed
- Record all issues found with detailed reproduction steps
- Provide actionable recommendations for each issue
- Include performance metrics and benchmarks
- Create summary report with overall system assessment

### Success Criteria

The system evaluation is successful when:

- All critical and high-severity issues are identified and documented
- Performance benchmarks meet specified requirements
- Security vulnerabilities are identified and reported
- Compliance requirements are verified
- User experience issues are documented with improvement recommendations
- Integration points are validated for reliability and performance

This comprehensive evaluation framework ensures thorough testing of all system components, proper documentation of findings, and actionable recommendations for system improvement and maintenance.
