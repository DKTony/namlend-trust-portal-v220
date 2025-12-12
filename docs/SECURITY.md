# NamLend Trust - Security Documentation

**Version**: 2.7.0  
**Last Updated**: December 12, 2025  
**Security Audit Status**: Passed (Critical Issues Resolved, IPS Mock Mode Active)

---

## Security Architecture Overview

NamLend Trust implements a **defense-in-depth** security strategy with multiple layers of protection for financial data.

```
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 1: Network Security (HTTPS/TLS)                           │
├─────────────────────────────────────────────────────────────────┤
│ LAYER 2: Authentication (Supabase Auth/JWT)                      │
├─────────────────────────────────────────────────────────────────┤
│ LAYER 3: Frontend Route Guards (ProtectedRoute)                  │
├─────────────────────────────────────────────────────────────────┤
│ LAYER 4: API Validation (Service Layer)                          │
├─────────────────────────────────────────────────────────────────┤
│ LAYER 5: Row Level Security (PostgreSQL RLS)                     │
├─────────────────────────────────────────────────────────────────┤
│ LAYER 6: Database Constraints (Check, FK, Triggers)              │
├─────────────────────────────────────────────────────────────────┤
│ LAYER 7: Audit Logging (Immutable Trail)                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Authentication

### Supabase Auth Integration

- **Provider**: Supabase GoTrue (enterprise-grade auth)
- **Method**: Email/password authentication
- **Token**: JWT with configurable expiry
- **Session**: Automatic refresh, secure storage

### Authentication Flow

```typescript
// Sign-in flow in useAuth.tsx
const signIn = async (email: string, password: string) => {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { error };
};

// Session management
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  async (event, session) => {
    setSession(session);
    setUser(session?.user ?? null);
    if (session?.user) {
      await fetchUserRole(session.user.id);
    }
  }
);
```

### Secure Sign-Out

```typescript
const signOut = async () => {
  // Global sign-out (invalidates all sessions)
  await supabase.auth.signOut({ scope: 'global' });
  
  // Clear local state
  setUser(null);
  setSession(null);
  setUserRole(null);
  
  // Clear storage
  localStorage.removeItem('namlend-auth');
  sessionStorage.removeItem('namlend-auth');
};
```

---

## Authorization

### Role-Based Access Control (RBAC)

```
┌─────────────┬─────────────────────────────────────────────────┐
│    Role     │                  Permissions                     │
├─────────────┼─────────────────────────────────────────────────┤
│   admin     │ Full access to all features and data            │
│             │ - Manage users and roles                         │
│             │ - Approve/reject applications                    │
│             │ - Process disbursements                          │
│             │ - View audit logs                                 │
│             │ - Generate compliance reports                    │
├─────────────┼─────────────────────────────────────────────────┤
│ loan_officer│ Limited back-office access                       │
│             │ - View client applications                       │
│             │ - Process assigned applications                  │
│             │ - View assigned client data                      │
├─────────────┼─────────────────────────────────────────────────┤
│   client    │ Self-service access only                         │
│             │ - View own loans and payments                    │
│             │ - Submit applications                            │
│             │ - Make payments                                   │
│             │ - Upload KYC documents                           │
└─────────────┴─────────────────────────────────────────────────┘
```

### Role Precedence

```typescript
// useAuth.tsx - Role hierarchy handling
if (roles.includes('admin')) {
  role = 'admin';
} else if (roles.includes('loan_officer')) {
  role = 'loan_officer';
} else if (roles.includes('client')) {
  role = 'client';
}
```

### Frontend Route Protection

```typescript
// ProtectedRoute.tsx
export const ProtectedRoute = ({ 
  children, 
  requireAdmin = false 
}: ProtectedRouteProps) => {
  const { user, loading, isAdmin } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};
```

---

## Row Level Security (RLS)

All tables have RLS enabled with carefully designed policies.

### Pattern 1: User Owns Data

```sql
-- Users can only view their own loans
CREATE POLICY "Users can view own loans"
  ON loans FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);
```

### Pattern 2: Admin Access

```sql
-- Admins can view all loans
CREATE POLICY "Admins can view all loans"
  ON loans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Admins can update any loan
CREATE POLICY "Admins can update loans"
  ON loans FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );
```

### Pattern 3: Insert with Ownership

```sql
-- Users can create approval requests for themselves
CREATE POLICY "Users can create own approval requests"
  ON approval_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Pattern 4: System Operations

```sql
-- System can insert audit logs (via triggers)
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);
```

---

## Hardened Role Assignment

The `assign_user_role` RPC has been hardened against privilege escalation:

```sql
CREATE OR REPLACE FUNCTION assign_user_role(
  p_user_id UUID,
  p_role app_role
) RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role app_role;
BEGIN
  -- Get caller's role
  SELECT role INTO v_caller_role
  FROM user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  -- Only admins can assign roles
  IF v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can assign roles';
  END IF;
  
  -- Prevent self-demotion (admin cannot remove own admin role)
  IF p_user_id = auth.uid() AND p_role != 'admin' THEN
    RAISE EXCEPTION 'Cannot demote yourself';
  END IF;
  
  -- Insert or update role
  INSERT INTO user_roles (user_id, role)
  VALUES (p_user_id, p_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
```

---

## Audit Trail

### Automatic Audit Logging

Triggers automatically capture all changes to sensitive tables:

```sql
-- Trigger on loans table
CREATE TRIGGER audit_loans
  AFTER INSERT OR UPDATE OR DELETE ON loans
  FOR EACH ROW EXECUTE FUNCTION audit_loans_changes();

-- Trigger function
CREATE OR REPLACE FUNCTION audit_loans_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_entry('create', 'loan', NEW.id, NULL, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_audit_entry('update', 'loan', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      PERFORM log_state_transition('loan', NEW.id, OLD.status, NEW.status);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit_entry('delete', 'loan', OLD.id, to_jsonb(OLD), NULL);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Audit Log Structure

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID,           -- Who performed the action
  user_role TEXT,         -- Role at time of action
  action TEXT NOT NULL,   -- view, create, update, delete, approve, reject
  entity_type TEXT,       -- Table/entity name
  entity_id UUID,         -- Record ID
  old_state JSONB,        -- State before change
  new_state JSONB,        -- State after change
  ip_address INET,        -- Client IP
  user_agent TEXT,        -- Browser/client info
  session_id TEXT         -- Session identifier
);
```

### Immutability

Audit logs are append-only - no updates or deletes allowed:

```sql
-- RLS prevents updates
-- No UPDATE or DELETE policies exist
-- Only INSERT allowed (via trigger)
```

---

## Data Protection

### Sensitive Data Handling

| Data Type | Protection Method |
|-----------|-------------------|
| Passwords | Hashed by Supabase Auth (bcrypt) |
| Session tokens | JWT with short expiry |
| PII (names, ID numbers) | RLS restricts access |
| Financial data | RLS + audit logging |
| Documents | Storage bucket policies |

### Environment Variables

```env
# ⚠️ NEVER expose in frontend
VITE_SUPABASE_SERVICE_ROLE_KEY=...  # Server-only operations

# Safe for frontend
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

# Production settings
VITE_DEBUG_TOOLS=false
VITE_RUN_DEV_SCRIPTS=false
```

### Debug Tools Protection

```typescript
// Triple-gated protection
const isDebugEnabled = 
  import.meta.env.VITE_DEBUG_TOOLS === 'true' &&
  import.meta.env.DEV &&
  !import.meta.env.PROD;
```

---

## API Security

### Input Validation

```typescript
// Service layer validation
export async function completeDisbursement(
  disbursementId: string,
  paymentMethod: 'bank_transfer' | 'mobile_money' | 'cash' | 'debit_order',
  paymentReference: string,
  notes?: string
): Promise<DisbursementResult> {
  // Input validation
  if (!paymentReference || paymentReference.trim() === '') {
    return { 
      success: false, 
      error: 'Payment reference is required' 
    };
  }
  // ... proceed with RPC
}
```

### Database Constraints

```sql
-- Status transition validation
CHECK (status IN ('pending', 'approved', 'rejected', 'completed'))

-- Amount validation
CHECK (amount > 0)

-- Risk score bounds
CHECK (risk_score >= 0 AND risk_score <= 100)
```

---

## Session Management

### JWT Configuration

- **Expiry**: Configurable (default: 1 hour)
- **Refresh**: Automatic before expiry
- **Storage**: localStorage with prefix

### Session Cleanup

```typescript
// On sign-out
localStorage.removeItem('namlend-auth');
sessionStorage.removeItem('namlend-auth');

// Supabase handles server-side invalidation
await supabase.auth.signOut({ scope: 'global' });
```

---

## Security Checklist

### Authentication

- [x] Email/password authentication implemented
- [x] JWT tokens with proper expiry
- [x] Automatic session refresh
- [x] Global sign-out functionality
- [x] Password reset flow

### Authorization

- [x] Role-based access control (RBAC)
- [x] Frontend route guards
- [x] RLS policies on all tables
- [x] Hardened role assignment RPC
- [x] Admin privilege protection

### Data Protection

- [x] RLS restricts data access
- [x] Audit logging for all changes
- [x] Sensitive data handling
- [x] Environment variable security
- [x] Debug tool protection

### Compliance

- [x] Complete audit trail
- [x] 7-year retention policy
- [x] Compliance report generation
- [x] View access logging
- [x] State transition tracking

---

## Security Incident Response

### Detection

- Audit logs for unusual activity
- Failed authentication monitoring
- Role escalation attempts logged

### Response Procedures

1. **Identify** - Review audit logs for scope
2. **Contain** - Revoke affected sessions
3. **Eradicate** - Fix vulnerability
4. **Recover** - Restore if needed
5. **Document** - Create incident report

### Contact

For security concerns, refer to project documentation and team leads.

---

## Known Security Considerations

### Resolved Issues

1. ✅ Role escalation vulnerability - Hardened `assign_user_role` RPC
2. ✅ Debug tools exposure - Triple-gated protection
3. ✅ Session persistence - Global sign-out implemented
4. ✅ RLS gaps - Comprehensive policies added

### Ongoing Monitoring

- Regular security audits recommended
- Dependency vulnerability scanning (Dependabot)
- Access pattern monitoring

---

*Document Version: 2.0.0*  
*Last Updated: December 2025*  
*Security Audit: Passed*
