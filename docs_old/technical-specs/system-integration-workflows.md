# NamLend Trust Platform - System Integration Workflows

**Version:** 2.2.0 | **Date:** September 21, 2025 | **Status:** ✅ OPERATIONAL

## Loan Application Processing Workflow

```mermaid
flowchart TD
    START([Client Initiates Loan Application]) --> FORM[Loan Application Form<br/>Amount, Term, Purpose]
    FORM --> VALIDATE{Form Validation}
    
    VALIDATE -->|Invalid| ERROR_FORM[Display Validation Errors<br/>Return to Form]
    VALIDATE -->|Valid| CALCULATE[Calculate Loan Terms<br/>Interest Rate, Monthly Payment]
    
    CALCULATE --> APR_CHECK{APR ≤ 32%?}
    APR_CHECK -->|No| APR_ERROR[Regulatory Compliance Error<br/>Adjust Terms]
    APR_CHECK -->|Yes| SUBMIT[Submit to Approval Workflow]
    
    SUBMIT --> CREATE_REQUEST[Create approval_requests Record<br/>Status: 'pending']
    CREATE_REQUEST --> NOTIFY_ADMIN[Real-time Admin Notification<br/>New Application Alert]
    
    NOTIFY_ADMIN --> ADMIN_REVIEW[Admin Reviews Application<br/>Credit Check, Documentation]
    ADMIN_REVIEW --> DECISION{Approval Decision}
    
    DECISION -->|Reject| REJECT_FLOW[Update Status: 'rejected'<br/>Notify Client]
    DECISION -->|Approve| APPROVE_FLOW[Update Status: 'approved'<br/>Create Loan Record]
    
    APPROVE_FLOW --> CREATE_LOAN[Insert into loans Table<br/>Status: 'approved']
    CREATE_LOAN --> NOTIFY_CLIENT[Client Notification<br/>Loan Approved]
    
    NOTIFY_CLIENT --> DISBURSE[Loan Disbursement Process<br/>Status: 'disbursed']
    DISBURSE --> ACTIVE_LOAN[Active Loan Management<br/>Payment Tracking]
    
    ERROR_FORM --> FORM
    APR_ERROR --> FORM
    REJECT_FLOW --> END([Process Complete])
    ACTIVE_LOAN --> END

    classDef client fill:#e3f2fd
    classDef system fill:#e8f5e8
    classDef admin fill:#fff3e0
    classDef decision fill:#f3e5f5
    classDef error fill:#ffebee

    class START,FORM,NOTIFY_CLIENT client
    class VALIDATE,CALCULATE,APR_CHECK,SUBMIT,CREATE_REQUEST,CREATE_LOAN,DISBURSE,ACTIVE_LOAN system
    class NOTIFY_ADMIN,ADMIN_REVIEW,APPROVE_FLOW admin
    class DECISION decision
    class ERROR_FORM,APR_ERROR,REJECT_FLOW error
```

## Client Portal & Document Verification Workflow (v2.2.0)

```mermaid
flowchart TD
    START([Client Accesses Portal]) --> PROFILE_CHECK{Profile Complete?}
    
    PROFILE_CHECK -->|No| PROFILE_FORM[Complete Profile Information<br/>Personal, Employment, Banking]
    PROFILE_FORM --> CALC_COMPLETION[Calculate Profile Completion<br/>RPC: calculate_profile_completion()]
    CALC_COMPLETION --> PROFILE_UPDATE[Update Profile Status<br/>Trigger: update_profile_status()]
    
    PROFILE_CHECK -->|Yes| DOC_CHECK{Required Documents<br/>Verified?}
    PROFILE_UPDATE --> DOC_CHECK
    
    DOC_CHECK -->|No| DOC_REQUIREMENTS[Display Document Requirements<br/>ID, Bank Statements, Payslip]
    DOC_REQUIREMENTS --> DOC_UPLOAD[Upload Documents<br/>Private kyc-documents Bucket]
    DOC_UPLOAD --> DOC_STORE[Store Document Metadata<br/>document_verification_requirements]
    DOC_STORE --> ADMIN_NOTIFY[Notify Admin<br/>Document Review Required]
    
    ADMIN_NOTIFY --> ADMIN_REVIEW[Admin Reviews Documents<br/>Verify Authenticity]
    ADMIN_REVIEW --> ADMIN_DECISION{Verification Decision}
    
    ADMIN_DECISION -->|Reject| DOC_REJECT[Update Status: 'rejected'<br/>Provide Rejection Reason]
    ADMIN_DECISION -->|Approve| DOC_APPROVE[Update Status: 'verified'<br/>Set verification_date]
    
    DOC_REJECT --> DOC_REQUIREMENTS
    DOC_APPROVE --> ELIGIBILITY_CHECK[Check Loan Eligibility<br/>RPC: check_loan_eligibility()]
    
    DOC_CHECK -->|Yes| ELIGIBILITY_CHECK
    
    ELIGIBILITY_CHECK --> ELIGIBLE{Eligible for Loan?}
    ELIGIBLE -->|No| REQUIREMENTS_DISPLAY[Show Missing Requirements<br/>Profile/Document Status]
    ELIGIBLE -->|Yes| LOAN_ACCESS[Enable Loan Application<br/>Access Granted]
    
    REQUIREMENTS_DISPLAY --> PROFILE_CHECK
    LOAN_ACCESS --> LOAN_APPLICATION[Proceed to Loan Application<br/>Standard Workflow]
    
    classDef client fill:#e3f2fd
    classDef system fill:#e8f5e8
    classDef admin fill:#fff3e0
    classDef decision fill:#f3e5f5
    classDef success fill:#e8f5e8
    classDef blocked fill:#ffebee

    class START,PROFILE_FORM,DOC_REQUIREMENTS,DOC_UPLOAD,REQUIREMENTS_DISPLAY client
    class CALC_COMPLETION,PROFILE_UPDATE,DOC_STORE,ELIGIBILITY_CHECK,LOAN_ACCESS system
    class ADMIN_NOTIFY,ADMIN_REVIEW,DOC_APPROVE,DOC_REJECT admin
    class PROFILE_CHECK,DOC_CHECK,ADMIN_DECISION,ELIGIBLE decision
    class LOAN_APPLICATION success
```

## User Management Integration Flow

```mermaid
sequenceDiagram
    participant Admin as Admin User
    participant UI as Admin Dashboard
    participant Hook as useUsersList Hook
    participant Service as User Service
    participant DB as Supabase Database
    participant RLS as Row Level Security
    participant ErrorHandler as Error Handler

    Admin->>UI: Access User Management
    UI->>Hook: Initialize useUsersList()
    Hook->>Service: fetchUsers()
    
    Service->>DB: SELECT profiles JOIN user_roles
    DB->>RLS: Apply Security Policies
    RLS->>DB: Filter Authorized Data
    
    alt Successful Query
        DB-->>Service: Return User Data
        Service->>Hook: Transform to UI Format
        Hook->>UI: Update User List State
        UI-->>Admin: Display User Management Interface
    else Database Error
        DB-->>Service: Error Response
        Service->>ErrorHandler: Log Database Error
        ErrorHandler->>DB: INSERT error_logs
        Service->>Hook: Return Mock Data Fallback
        Hook->>UI: Display Users with Warning
        UI-->>Admin: Show Users + Error Toast
    end

    Admin->>UI: Perform User Action (Delete/Update)
    UI->>Hook: Call Action Method
    Hook->>Service: Execute Database Operation
    
    Service->>DB: UPDATE/DELETE Query
    DB->>RLS: Verify Admin Permissions
    
    alt Operation Successful
        RLS-->>DB: Permission Granted
        DB-->>Service: Operation Complete
        Service->>Hook: Update Local State
        Hook->>UI: Refresh User List
        UI-->>Admin: Show Success Notification
    else Permission Denied
        RLS-->>DB: Access Denied
        DB-->>Service: Permission Error
        Service->>ErrorHandler: Log Authorization Error
        ErrorHandler->>DB: INSERT error_logs
        Service-->>Hook: Operation Failed
        Hook-->>UI: Show Error Message
        UI-->>Admin: Display Access Denied
    end
```

## Error Handling Integration Workflow

```mermaid
graph TB
    subgraph "Error Sources"
        COMP_ERROR[Component Errors<br/>React Boundaries]
        API_ERROR[API Errors<br/>Network/Database]
        AUTH_ERROR[Authentication<br/>Session Issues]
        VALIDATION_ERROR[Validation Errors<br/>Form/Input]
        BUSINESS_ERROR[Business Logic<br/>Rule Violations]
    end

    subgraph "Error Processing Pipeline"
        ERROR_LOGGER[Error Logger<br/>Centralized Collection]
        CATEGORIZER[Error Categorizer<br/>Type Classification]
        SEVERITY_ANALYZER[Severity Analyzer<br/>Impact Assessment]
        CONTEXT_COLLECTOR[Context Collector<br/>User Actions & State]
    end

    subgraph "Storage & Queuing"
        ERROR_QUEUE[Local Error Queue<br/>Offline Support]
        ERROR_DB[(error_logs Table<br/>Persistent Storage)]
        PERFORMANCE_TRACKER[Performance Tracker<br/>Slow Operations]
    end

    subgraph "User Experience"
        ERROR_BOUNDARY[Error Boundary<br/>UI Fallback]
        TOAST_SYSTEM[Toast Notifications<br/>User Feedback]
        RETRY_MECHANISM[Retry Logic<br/>Exponential Backoff]
        FALLBACK_DATA[Fallback Data<br/>Mock/Cached Content]
    end

    subgraph "Monitoring & Analytics"
        REAL_TIME_ALERTS[Real-time Alerts<br/>Critical Issues]
        ERROR_ANALYTICS[Error Analytics<br/>Pattern Detection]
        HEALTH_DASHBOARD[System Health<br/>Metrics Dashboard]
    end

    COMP_ERROR --> ERROR_LOGGER
    API_ERROR --> ERROR_LOGGER
    AUTH_ERROR --> ERROR_LOGGER
    VALIDATION_ERROR --> ERROR_LOGGER
    BUSINESS_ERROR --> ERROR_LOGGER

    ERROR_LOGGER --> CATEGORIZER
    CATEGORIZER --> SEVERITY_ANALYZER
    SEVERITY_ANALYZER --> CONTEXT_COLLECTOR

    CONTEXT_COLLECTOR --> ERROR_QUEUE
    ERROR_QUEUE --> ERROR_DB
    ERROR_LOGGER --> PERFORMANCE_TRACKER

    ERROR_LOGGER --> ERROR_BOUNDARY
    ERROR_BOUNDARY --> TOAST_SYSTEM
    ERROR_LOGGER --> RETRY_MECHANISM
    RETRY_MECHANISM --> FALLBACK_DATA

    ERROR_DB --> REAL_TIME_ALERTS
    ERROR_DB --> ERROR_ANALYTICS
    PERFORMANCE_TRACKER --> HEALTH_DASHBOARD

    classDef source fill:#ffebee
    classDef processing fill:#e8f5e8
    classDef storage fill:#e3f2fd
    classDef ux fill:#fff3e0
    classDef monitoring fill:#f3e5f5

    class COMP_ERROR,API_ERROR,AUTH_ERROR,VALIDATION_ERROR,BUSINESS_ERROR source
    class ERROR_LOGGER,CATEGORIZER,SEVERITY_ANALYZER,CONTEXT_COLLECTOR processing
    class ERROR_QUEUE,ERROR_DB,PERFORMANCE_TRACKER storage
    class ERROR_BOUNDARY,TOAST_SYSTEM,RETRY_MECHANISM,FALLBACK_DATA ux
    class REAL_TIME_ALERTS,ERROR_ANALYTICS,HEALTH_DASHBOARD monitoring
```

## Authentication & Authorization Integration

```mermaid
stateDiagram-v2
    [*] --> Unauthenticated
    
    Unauthenticated --> Authenticating : Login Request
    Authenticating --> Authenticated : Valid Credentials
    Authenticating --> AuthError : Invalid Credentials
    AuthError --> Unauthenticated : Retry
    
    Authenticated --> RoleVerification : Check User Roles
    RoleVerification --> ClientRole : Role: 'client'
    RoleVerification --> AdminRole : Role: 'admin'
    RoleVerification --> OfficerRole : Role: 'loan_officer'
    RoleVerification --> SupportRole : Role: 'support'
    RoleVerification --> RoleError : No Valid Role
    
    ClientRole --> ClientDashboard : Access Granted
    AdminRole --> AdminDashboard : Access Granted
    OfficerRole --> OfficerDashboard : Access Granted
    SupportRole --> SupportDashboard : Access Granted
    
    RoleError --> AccessDenied : Insufficient Privileges
    AccessDenied --> Unauthenticated : Sign Out
    
    ClientDashboard --> SessionExpired : Token Expired
    AdminDashboard --> SessionExpired : Token Expired
    OfficerDashboard --> SessionExpired : Token Expired
    SupportDashboard --> SessionExpired : Token Expired
    
    SessionExpired --> Unauthenticated : Auto Logout
    
    ClientDashboard --> SigningOut : User Sign Out
    AdminDashboard --> SigningOut : User Sign Out
    OfficerDashboard --> SigningOut : User Sign Out
    SupportDashboard --> SigningOut : User Sign Out
    
    SigningOut --> Unauthenticated : Session Cleared
```

## Database Integration Patterns

```mermaid
graph LR
    subgraph "Frontend Layer"
        REACT[React Components]
        HOOKS[Custom Hooks]
        SERVICES[Service Layer]
    end

    subgraph "Supabase Integration"
        CLIENT[Supabase Client]
        AUTH[Auth Module]
        REALTIME[Realtime Module]
        STORAGE[Storage Module]
    end

    subgraph "Database Layer"
        POSTGRES[(PostgreSQL)]
        RLS_POLICIES[RLS Policies]
        TRIGGERS[Database Triggers]
        FUNCTIONS[Stored Functions]
    end

    subgraph "Security Layer"
        JWT[JWT Tokens]
        RBAC[Role-Based Access]
        AUDIT[Audit Logging]
    end

    REACT --> HOOKS
    HOOKS --> SERVICES
    SERVICES --> CLIENT

    CLIENT --> AUTH
    CLIENT --> REALTIME
    CLIENT --> STORAGE

    AUTH --> JWT
    JWT --> RBAC
    RBAC --> RLS_POLICIES

    CLIENT --> POSTGRES
    RLS_POLICIES --> POSTGRES
    TRIGGERS --> POSTGRES
    FUNCTIONS --> POSTGRES

    POSTGRES --> AUDIT
    TRIGGERS --> AUDIT

    classDef frontend fill:#e3f2fd
    classDef integration fill:#e8f5e8
    classDef database fill:#fff3e0
    classDef security fill:#f3e5f5

    class REACT,HOOKS,SERVICES frontend
    class CLIENT,AUTH,REALTIME,STORAGE integration
    class POSTGRES,RLS_POLICIES,TRIGGERS,FUNCTIONS database
    class JWT,RBAC,AUDIT security
```

## Performance Monitoring Integration

```mermaid
flowchart TD
    START([Application Operation]) --> MEASURE[Performance Measurement<br/>measurePerformance()]
    
    MEASURE --> OPERATION[Execute Operation<br/>Database Query/API Call]
    OPERATION --> TIMING[Record Execution Time]
    
    TIMING --> THRESHOLD{Duration > Threshold?}
    THRESHOLD -->|No| SUCCESS[Operation Complete<br/>Normal Performance]
    THRESHOLD -->|Yes| SLOW_OP[Log Slow Operation<br/>Performance Warning]
    
    SLOW_OP --> ERROR_LOG[Insert error_logs<br/>Category: 'system']
    ERROR_LOG --> METRICS[Update Performance Metrics]
    
    SUCCESS --> METRICS
    METRICS --> ANALYTICS[Performance Analytics<br/>Trend Analysis]
    
    ANALYTICS --> DASHBOARD[Health Dashboard<br/>Real-time Monitoring]
    DASHBOARD --> ALERTS{Critical Threshold?}
    
    ALERTS -->|No| CONTINUE[Continue Monitoring]
    ALERTS -->|Yes| NOTIFICATION[Send Alert<br/>Admin Notification]
    
    NOTIFICATION --> INVESTIGATION[Performance Investigation<br/>Root Cause Analysis]
    INVESTIGATION --> OPTIMIZATION[System Optimization<br/>Query/Code Improvements]
    
    OPTIMIZATION --> CONTINUE
    CONTINUE --> START

    classDef operation fill:#e3f2fd
    classDef monitoring fill:#e8f5e8
    classDef analysis fill:#fff3e0
    classDef alert fill:#ffebee
    classDef action fill:#f3e5f5

    class START,MEASURE,OPERATION,TIMING,SUCCESS operation
    class THRESHOLD,SLOW_OP,ERROR_LOG,METRICS monitoring
    class ANALYTICS,DASHBOARD,CONTINUE analysis
    class ALERTS,NOTIFICATION alert
    class INVESTIGATION,OPTIMIZATION action
```

## Testing Integration Workflow

```mermaid
graph TB
    subgraph "Test Categories"
        AUTH_TESTS[Authentication Tests<br/>Login/Logout/Roles]
        WORKFLOW_TESTS[Workflow Tests<br/>Loan Application Process]
        DB_TESTS[Database Tests<br/>CRUD Operations/RLS]
        PERF_TESTS[Performance Tests<br/>Query Speed/Load]
        SECURITY_TESTS[Security Tests<br/>Input Validation/XSS]
    end

    subgraph "Test Execution"
        TEST_ENV[Test Environment<br/>Isolated Database]
        TEST_RUNNER[Test Runner<br/>Jest/React Testing Library]
        MOCK_DATA[Mock Data<br/>Controlled Test Scenarios]
    end

    subgraph "Test Results"
        PASS_RESULTS[Passed Tests<br/>Success Metrics]
        FAIL_RESULTS[Failed Tests<br/>Error Analysis]
        COVERAGE[Code Coverage<br/>Test Completeness]
    end

    subgraph "Continuous Integration"
        CI_PIPELINE[CI Pipeline<br/>Automated Testing]
        DEPLOYMENT[Deployment Gate<br/>Test Requirements]
        MONITORING[Production Monitoring<br/>Real-world Validation]
    end

    AUTH_TESTS --> TEST_ENV
    WORKFLOW_TESTS --> TEST_ENV
    DB_TESTS --> TEST_ENV
    PERF_TESTS --> TEST_ENV
    SECURITY_TESTS --> TEST_ENV

    TEST_ENV --> TEST_RUNNER
    TEST_RUNNER --> MOCK_DATA

    MOCK_DATA --> PASS_RESULTS
    MOCK_DATA --> FAIL_RESULTS
    PASS_RESULTS --> COVERAGE
    FAIL_RESULTS --> COVERAGE

    COVERAGE --> CI_PIPELINE
    CI_PIPELINE --> DEPLOYMENT
    DEPLOYMENT --> MONITORING

    classDef tests fill:#e3f2fd
    classDef execution fill:#e8f5e8
    classDef results fill:#fff3e0
    classDef ci fill:#f3e5f5

    class AUTH_TESTS,WORKFLOW_TESTS,DB_TESTS,PERF_TESTS,SECURITY_TESTS tests
    class TEST_ENV,TEST_RUNNER,MOCK_DATA execution
    class PASS_RESULTS,FAIL_RESULTS,COVERAGE results
    class CI_PIPELINE,DEPLOYMENT,MONITORING ci
```

## System Health Monitoring

```mermaid
graph TB
    subgraph "Health Metrics Collection"
        DB_HEALTH[Database Health<br/>Connection Pool/Query Performance]
        APP_HEALTH[Application Health<br/>Response Times/Error Rates]
        AUTH_HEALTH[Authentication Health<br/>Login Success/Token Refresh]
        WORKFLOW_HEALTH[Workflow Health<br/>Approval Processing/Completion Rates]
    end

    subgraph "Metric Aggregation"
        COLLECTOR[Metrics Collector<br/>Real-time Data Gathering]
        PROCESSOR[Data Processor<br/>Statistical Analysis]
        STORAGE_METRICS[(Metrics Storage<br/>Time-series Data)]
    end

    subgraph "Health Assessment"
        THRESHOLD_CHECK[Threshold Checker<br/>SLA Compliance]
        TREND_ANALYSIS[Trend Analysis<br/>Pattern Detection]
        ANOMALY_DETECTION[Anomaly Detection<br/>Unusual Behavior]
    end

    subgraph "Alerting & Response"
        ALERT_ENGINE[Alert Engine<br/>Notification Rules]
        ESCALATION[Escalation Logic<br/>Severity-based Routing]
        DASHBOARD_HEALTH[Health Dashboard<br/>Visual Monitoring]
    end

    DB_HEALTH --> COLLECTOR
    APP_HEALTH --> COLLECTOR
    AUTH_HEALTH --> COLLECTOR
    WORKFLOW_HEALTH --> COLLECTOR

    COLLECTOR --> PROCESSOR
    PROCESSOR --> STORAGE_METRICS

    STORAGE_METRICS --> THRESHOLD_CHECK
    STORAGE_METRICS --> TREND_ANALYSIS
    STORAGE_METRICS --> ANOMALY_DETECTION

    THRESHOLD_CHECK --> ALERT_ENGINE
    TREND_ANALYSIS --> ALERT_ENGINE
    ANOMALY_DETECTION --> ALERT_ENGINE

    ALERT_ENGINE --> ESCALATION
    ESCALATION --> DASHBOARD_HEALTH

    classDef collection fill:#e3f2fd
    classDef aggregation fill:#e8f5e8
    classDef assessment fill:#fff3e0
    classDef response fill:#f3e5f5

    class DB_HEALTH,APP_HEALTH,AUTH_HEALTH,WORKFLOW_HEALTH collection
    class COLLECTOR,PROCESSOR,STORAGE_METRICS aggregation
    class THRESHOLD_CHECK,TREND_ANALYSIS,ANOMALY_DETECTION assessment
    class ALERT_ENGINE,ESCALATION,DASHBOARD_HEALTH response
```
