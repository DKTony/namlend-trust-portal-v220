# IPP/IPS Implementation Plan for NamLend Trust

**Version**: 1.0.0  
**Created**: December 12, 2025  
**Status**: 📋 Planning

---

## 1. Executive Summary

This document outlines the complete implementation plan for integrating the **Instant Payment Solution (IPS)** / **Instant Payment Platform (IPP)** into NamLend Trust. The implementation covers:

- **Backend/Administration**: IPP as a disbursement method, IPS adapter service, webhook handling, reconciliation
- **Frontend/Client**: IPP payment option for loan repayments, real-time status tracking, VPA management

### Success Criteria

- Loan disbursements can be processed via IPP (credit push to customer)
- Loan repayments can be initiated via IPP (credit push to NamLend)
- All IPP transactions are auditable and reconcilable
- Fallback to existing payment methods when IPP unavailable

---

## 2. Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              NamLend Trust                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │  React App   │───▶│  Supabase    │───▶│ Edge Functions│                   │
│  │  (Frontend)  │    │  (Database)  │    │ (IPS Adapter) │                   │
│  └──────────────┘    └──────────────┘    └───────┬───────┘                   │
│         │                   │                     │                          │
│         │                   │                     ▼                          │
│         │                   │            ┌──────────────┐                    │
│         │                   │            │  IPS Switch  │                    │
│         │                   │            │   (BON/IPN)  │                    │
│         │                   │            └───────┬───────┘                   │
│         │                   │                     │                          │
│         │                   │            ┌────────┴────────┐                 │
│         │                   │            ▼                 ▼                 │
│         │                   │     ┌──────────┐      ┌──────────┐            │
│         │                   │     │ Customer │      │ NamLend  │            │
│         │                   │     │   Bank   │      │   Bank   │            │
│         │                   │     └──────────┘      └──────────┘            │
│         │                   │                                                │
│         ▼                   ▼                                                │
│  ┌──────────────────────────────────────┐                                   │
│  │         Webhook Endpoint             │◀─────── IPS Callbacks             │
│  │    (payment-webhook function)        │                                   │
│  └──────────────────────────────────────┘                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **React Frontend** | User-facing IPP payment flows, VPA input, status display |
| **Supabase Database** | IPP transaction records, VPA storage, audit logs |
| **IPS Adapter (Edge Function)** | Construct/send IPP messages, handle responses |
| **Payment Webhook** | Receive IPS callbacks, update transaction states |
| **Reconciliation Service** | Match IPS settlements with internal records |

---

## 3. Database Schema Additions

### 3.1 New Tables

#### `ips_transactions`

Stores all IPS/IPP transaction records.

```sql
CREATE TABLE ips_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to NamLend entities
  loan_id UUID REFERENCES loans(id),
  disbursement_id UUID REFERENCES disbursements(id),
  payment_id UUID REFERENCES payments(id),
  
  -- IPS identifiers
  msg_id VARCHAR(50) NOT NULL UNIQUE,        -- Our message ID
  txn_id VARCHAR(50) NOT NULL,               -- Our transaction ID
  ips_txn_id VARCHAR(50),                    -- IPS-assigned transaction ID
  ips_rrn VARCHAR(20),                       -- IPS retrieval reference number
  org_txn_id VARCHAR(50),                    -- Original txn for reversals/queries
  
  -- Transaction details
  transaction_type VARCHAR(20) NOT NULL,      -- DISBURSEMENT | REPAYMENT | REFUND | REVERSAL
  ips_txn_type VARCHAR(20) NOT NULL,         -- PAY | COLLECT | REVERSAL | AUTOREVERSAL
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NAD',
  
  -- Parties
  payer_vpa VARCHAR(100) NOT NULL,
  payer_name VARCHAR(255),
  payer_account_masked VARCHAR(50),
  payee_vpa VARCHAR(100) NOT NULL,
  payee_name VARCHAR(255),
  payee_account_masked VARCHAR(50),
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'initiated',
  -- initiated | pending | success | failed | timeout | reversed | deemed
  ips_result VARCHAR(20),                    -- SUCCESS | FAILURE | PARTIAL | DEEMED | PENDING
  ips_error_code VARCHAR(10),
  ips_error_message TEXT,
  internal_error_code VARCHAR(50),
  
  -- Metadata
  purpose_code VARCHAR(10),                  -- PERS | BUSN | G2P | B2P
  initiation_mode VARCHAR(20),               -- MOBILE_APP | USSD | BACKOFFICE
  channel VARCHAR(20),
  device_fingerprint JSONB,
  
  -- Timing
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  response_received_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('initiated', 'pending', 'success', 'failed', 'timeout', 'reversed', 'deemed'))
);

-- Indexes
CREATE INDEX idx_ips_transactions_loan ON ips_transactions(loan_id);
CREATE INDEX idx_ips_transactions_disbursement ON ips_transactions(disbursement_id);
CREATE INDEX idx_ips_transactions_payment ON ips_transactions(payment_id);
CREATE INDEX idx_ips_transactions_msg_id ON ips_transactions(msg_id);
CREATE INDEX idx_ips_transactions_status ON ips_transactions(status);
CREATE INDEX idx_ips_transactions_created ON ips_transactions(created_at);
```

#### `ips_vpa_registry`

Stores customer VPA (Virtual Payment Address) registrations.

```sql
CREATE TABLE ips_vpa_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- VPA details
  vpa_address VARCHAR(100) NOT NULL,         -- e.g., john.doe@fnb
  vpa_type VARCHAR(20) NOT NULL,             -- MOBILE_NUMBER | HANDLE | ACCOUNT
  provider_code VARCHAR(20),                 -- Bank/PSP identifier
  
  -- Linked account (optional, for display)
  account_masked VARCHAR(50),
  account_holder_name VARCHAR(255),
  
  -- Validation
  is_validated BOOLEAN DEFAULT FALSE,
  validated_at TIMESTAMPTZ,
  validation_reference VARCHAR(50),
  
  -- Status
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, vpa_address)
);

CREATE INDEX idx_ips_vpa_user ON ips_vpa_registry(user_id);
CREATE INDEX idx_ips_vpa_address ON ips_vpa_registry(vpa_address);
```

#### `ips_api_logs`

Detailed API call logs for debugging and audit.

```sql
CREATE TABLE ips_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Correlation
  correlation_id UUID NOT NULL,
  ips_transaction_id UUID REFERENCES ips_transactions(id),
  
  -- API details
  api_name VARCHAR(50) NOT NULL,             -- ReqPay, RespPay, ReqChkTxn, etc.
  direction VARCHAR(10) NOT NULL,            -- OUTBOUND | INBOUND
  
  -- Payload (encrypted/redacted for PII)
  request_summary JSONB,                     -- Key fields only, no PII
  response_summary JSONB,
  
  -- Status
  http_status INTEGER,
  ips_result VARCHAR(20),
  error_code VARCHAR(20),
  
  -- Timing
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ips_api_logs_correlation ON ips_api_logs(correlation_id);
CREATE INDEX idx_ips_api_logs_transaction ON ips_api_logs(ips_transaction_id);
CREATE INDEX idx_ips_api_logs_created ON ips_api_logs(created_at);
```

#### `ips_error_codes`

Lookup table for IPS/UPI error code mappings.

```sql
CREATE TABLE ips_error_codes (
  code VARCHAR(10) PRIMARY KEY,              -- IPS/UPI code (e.g., 00, 59, IE, UP)
  internal_code VARCHAR(50) NOT NULL,        -- Our internal code
  description TEXT NOT NULL,
  http_status INTEGER DEFAULT 400,
  is_retryable BOOLEAN DEFAULT FALSE,
  user_message TEXT,                         -- Safe message for end users
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with common codes
INSERT INTO ips_error_codes (code, internal_code, description, http_status, is_retryable, user_message) VALUES
('00', 'SUCCESS', 'Approved / completed successfully', 200, FALSE, 'Payment successful'),
('59', 'RISK_DECLINED', 'Suspected fraud / declined on risk score', 400, FALSE, 'Payment declined for security reasons'),
('IE', 'INSUFFICIENT_FUNDS', 'Insufficient funds or funds blocked', 400, FALSE, 'Insufficient funds in your account'),
('UP', 'IPS_TIMEOUT', 'PSP timeout', 504, TRUE, 'Payment timed out. Please try again.'),
('UB', 'IPS_REMOTE_FAILURE', 'Internal exception at beneficiary side', 502, TRUE, 'Bank system temporarily unavailable'),
('XB', 'IPS_GENERIC_FAILURE', 'Invalid transaction', 400, FALSE, 'Payment could not be processed'),
('XC', 'IPS_INVALID_RESPONSE', 'No suitable response code', 500, TRUE, 'An error occurred. Please try again.'),
('U01', 'INVALID_VPA', 'Invalid VPA address', 400, FALSE, 'Invalid payment address'),
('U02', 'INVALID_AMOUNT', 'Invalid amount', 400, FALSE, 'Invalid payment amount'),
('U03', 'TXN_DECLINED', 'Transaction declined', 400, FALSE, 'Payment was declined'),
('U04', 'AUTH_FAILED', 'Authentication failed', 401, FALSE, 'Authentication failed. Please check your PIN.'),
('U08', 'DUPLICATE_TXN', 'Duplicate transaction', 409, FALSE, 'This payment has already been processed'),
('U10', 'LIMIT_EXCEEDED', 'Daily limit exceeded', 400, FALSE, 'Daily payment limit exceeded');
```

### 3.2 Schema Changes to Existing Tables

#### `disbursements` - Add IPP fields

```sql
ALTER TABLE disbursements ADD COLUMN IF NOT EXISTS 
  ips_transaction_id UUID REFERENCES ips_transactions(id);

ALTER TABLE disbursements ADD COLUMN IF NOT EXISTS
  payee_vpa VARCHAR(100);

-- Update method enum to include IPS
-- (Assumes method is stored as text, not enum)
```

#### `payments` - Add IPP fields

```sql
ALTER TABLE payments ADD COLUMN IF NOT EXISTS
  ips_transaction_id UUID REFERENCES ips_transactions(id);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS
  payer_vpa VARCHAR(100);
```

#### `profiles` - Add default VPA

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  default_vpa VARCHAR(100);
```

---

## 4. Backend Implementation

### 4.1 Edge Functions

#### 4.1.1 `ips-adapter` (New)

Main IPS integration service.

**File**: `supabase/functions/ips-adapter/index.ts`

**Endpoints**:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/pay` | Initiate payment (disbursement or repayment) |
| POST | `/validate-vpa` | Validate a VPA address |
| POST | `/check-status` | Check transaction status |
| POST | `/balance` | Check account balance |

**Key Functions**:

```typescript
// Core IPS operations
async function initiatePayment(params: IPSPaymentParams): Promise<IPSPaymentResult>
async function validateVPA(vpa: string): Promise<VPAValidationResult>
async function checkTransactionStatus(txnId: string): Promise<TransactionStatusResult>
async function checkBalance(vpa: string, credentials: EncryptedCredentials): Promise<BalanceResult>

// Message building
function buildReqPay(params: PaymentParams): XMLDocument
function buildReqValAdd(vpa: string): XMLDocument
function buildReqChkTxn(orgTxnId: string): XMLDocument

// Response parsing
function parseRespPay(xml: string): PaymentResponse
function parseRespValAdd(xml: string): VPAValidationResponse
function parseRespChkTxn(xml: string): TransactionStatusResponse

// Security
function signMessage(xml: string): string
function verifySignature(xml: string, signature: string): boolean
function encryptCredentials(pin: string, keyIndex: string): string
```

#### 4.1.2 `payment-webhook` (Update)

Update existing webhook to handle IPS callbacks.

**File**: `supabase/functions/payment-webhook/index.ts`

**New Handler**:

```typescript
// Add IPS callback handling
async function handleIPSCallback(payload: IPSCallbackPayload): Promise<void> {
  // 1. Verify signature
  // 2. Find matching ips_transaction
  // 3. Update status
  // 4. Update linked disbursement/payment
  // 5. Trigger notifications
  // 6. Log to ips_api_logs
}
```

### 4.2 RPC Functions

#### `initiate_ips_disbursement`

```sql
CREATE OR REPLACE FUNCTION initiate_ips_disbursement(
  p_disbursement_id UUID,
  p_payee_vpa VARCHAR(100)
) RETURNS JSONB AS $$
DECLARE
  v_disbursement RECORD;
  v_ips_txn_id UUID;
  v_msg_id VARCHAR(50);
  v_txn_id VARCHAR(50);
BEGIN
  -- 1. Validate disbursement exists and is approved
  SELECT * INTO v_disbursement 
  FROM disbursements 
  WHERE id = p_disbursement_id AND status = 'approved';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Disbursement not found or not approved');
  END IF;
  
  -- 2. Generate IPS identifiers
  v_msg_id := 'NL' || to_char(NOW(), 'YYYYMMDDHH24MISS') || substr(gen_random_uuid()::text, 1, 8);
  v_txn_id := 'TXN' || to_char(NOW(), 'YYYYMMDDHH24MISS') || substr(gen_random_uuid()::text, 1, 6);
  
  -- 3. Create IPS transaction record
  INSERT INTO ips_transactions (
    loan_id, disbursement_id, msg_id, txn_id,
    transaction_type, ips_txn_type, amount, currency,
    payer_vpa, payee_vpa, status, purpose_code,
    initiation_mode, created_by
  ) VALUES (
    v_disbursement.loan_id, p_disbursement_id, v_msg_id, v_txn_id,
    'DISBURSEMENT', 'PAY', v_disbursement.amount, 'NAD',
    'collections@namlend', p_payee_vpa, 'initiated', 'BUSN',
    'BACKOFFICE', auth.uid()
  ) RETURNING id INTO v_ips_txn_id;
  
  -- 4. Update disbursement with VPA
  UPDATE disbursements 
  SET payee_vpa = p_payee_vpa, 
      ips_transaction_id = v_ips_txn_id,
      method = 'ips'
  WHERE id = p_disbursement_id;
  
  -- 5. Return data for edge function to process
  RETURN jsonb_build_object(
    'success', true,
    'ips_transaction_id', v_ips_txn_id,
    'msg_id', v_msg_id,
    'txn_id', v_txn_id,
    'amount', v_disbursement.amount,
    'payee_vpa', p_payee_vpa
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `initiate_ips_repayment`

```sql
CREATE OR REPLACE FUNCTION initiate_ips_repayment(
  p_loan_id UUID,
  p_amount DECIMAL(15,2),
  p_payer_vpa VARCHAR(100)
) RETURNS JSONB AS $$
DECLARE
  v_loan RECORD;
  v_ips_txn_id UUID;
  v_payment_id UUID;
  v_msg_id VARCHAR(50);
  v_txn_id VARCHAR(50);
BEGIN
  -- 1. Validate loan exists and has outstanding balance
  SELECT * INTO v_loan 
  FROM loans 
  WHERE id = p_loan_id AND status IN ('disbursed', 'active');
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Loan not found or not active');
  END IF;
  
  -- 2. Validate amount
  IF p_amount <= 0 OR p_amount > v_loan.outstanding_balance THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid payment amount');
  END IF;
  
  -- 3. Generate IPS identifiers
  v_msg_id := 'NL' || to_char(NOW(), 'YYYYMMDDHH24MISS') || substr(gen_random_uuid()::text, 1, 8);
  v_txn_id := 'TXN' || to_char(NOW(), 'YYYYMMDDHH24MISS') || substr(gen_random_uuid()::text, 1, 6);
  
  -- 4. Create payment record (pending)
  INSERT INTO payments (
    loan_id, amount, payment_method, status, reference_number
  ) VALUES (
    p_loan_id, p_amount, 'ips', 'pending', v_txn_id
  ) RETURNING id INTO v_payment_id;
  
  -- 5. Create IPS transaction record
  INSERT INTO ips_transactions (
    loan_id, payment_id, msg_id, txn_id,
    transaction_type, ips_txn_type, amount, currency,
    payer_vpa, payee_vpa, status, purpose_code,
    initiation_mode, created_by
  ) VALUES (
    p_loan_id, v_payment_id, v_msg_id, v_txn_id,
    'REPAYMENT', 'PAY', p_amount, 'NAD',
    p_payer_vpa, 'collections@namlend', 'initiated', 'PERS',
    'MOBILE_APP', auth.uid()
  ) RETURNING id INTO v_ips_txn_id;
  
  -- 6. Link payment to IPS transaction
  UPDATE payments SET ips_transaction_id = v_ips_txn_id WHERE id = v_payment_id;
  
  -- 7. Return data for edge function
  RETURN jsonb_build_object(
    'success', true,
    'ips_transaction_id', v_ips_txn_id,
    'payment_id', v_payment_id,
    'msg_id', v_msg_id,
    'txn_id', v_txn_id,
    'amount', p_amount,
    'payer_vpa', p_payer_vpa
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `complete_ips_transaction`

```sql
CREATE OR REPLACE FUNCTION complete_ips_transaction(
  p_ips_txn_id UUID,
  p_ips_result VARCHAR(20),
  p_ips_error_code VARCHAR(10),
  p_ips_txn_id_response VARCHAR(50),
  p_ips_rrn VARCHAR(20)
) RETURNS JSONB AS $$
DECLARE
  v_txn RECORD;
  v_new_status VARCHAR(20);
  v_internal_error VARCHAR(50);
BEGIN
  -- 1. Get transaction
  SELECT * INTO v_txn FROM ips_transactions WHERE id = p_ips_txn_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;
  
  -- 2. Map IPS result to internal status
  v_new_status := CASE p_ips_result
    WHEN 'SUCCESS' THEN 'success'
    WHEN 'FAILURE' THEN 'failed'
    WHEN 'DEEMED' THEN 'deemed'
    WHEN 'PENDING' THEN 'pending'
    ELSE 'failed'
  END;
  
  -- 3. Get internal error code
  SELECT internal_code INTO v_internal_error 
  FROM ips_error_codes WHERE code = p_ips_error_code;
  
  -- 4. Update IPS transaction
  UPDATE ips_transactions SET
    status = v_new_status,
    ips_result = p_ips_result,
    ips_error_code = p_ips_error_code,
    ips_txn_id = p_ips_txn_id_response,
    ips_rrn = p_ips_rrn,
    internal_error_code = v_internal_error,
    response_received_at = NOW(),
    completed_at = CASE WHEN v_new_status IN ('success', 'failed') THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_ips_txn_id;
  
  -- 5. Update linked entity based on transaction type
  IF v_txn.transaction_type = 'DISBURSEMENT' AND v_txn.disbursement_id IS NOT NULL THEN
    IF v_new_status = 'success' THEN
      -- Mark disbursement completed
      UPDATE disbursements SET 
        status = 'completed',
        processed_at = NOW(),
        payment_reference = p_ips_rrn
      WHERE id = v_txn.disbursement_id;
      
      -- Update loan status
      UPDATE loans SET 
        status = 'disbursed',
        disbursed_at = NOW()
      WHERE id = v_txn.loan_id AND status = 'approved';
    ELSIF v_new_status = 'failed' THEN
      UPDATE disbursements SET status = 'failed' WHERE id = v_txn.disbursement_id;
    END IF;
    
  ELSIF v_txn.transaction_type = 'REPAYMENT' AND v_txn.payment_id IS NOT NULL THEN
    IF v_new_status = 'success' THEN
      -- Complete payment and apply to schedule
      UPDATE payments SET 
        status = 'completed',
        paid_at = NOW(),
        reference_number = p_ips_rrn
      WHERE id = v_txn.payment_id;
      
      -- Apply payment to loan (trigger existing logic)
      PERFORM apply_payment_to_schedule(v_txn.payment_id);
    ELSIF v_new_status = 'failed' THEN
      UPDATE payments SET status = 'failed' WHERE id = v_txn.payment_id;
    END IF;
  END IF;
  
  -- 6. Log state transition
  INSERT INTO state_transitions (
    entity_type, entity_id, from_state, to_state,
    transition_reason, triggered_by
  ) VALUES (
    'ips_transaction', p_ips_txn_id, v_txn.status, v_new_status,
    'IPS response: ' || COALESCE(p_ips_result, 'unknown'),
    'system'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'status', v_new_status,
    'transaction_type', v_txn.transaction_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4.3 Services Layer

#### `src/services/ipsService.ts`

```typescript
// Service interface for IPS operations
export interface IPSService {
  // Disbursement
  initiateDisbursement(disbursementId: string, payeeVpa: string): Promise<IPSTransactionResult>;
  
  // Repayment
  initiateRepayment(loanId: string, amount: number, payerVpa: string): Promise<IPSTransactionResult>;
  
  // VPA
  validateVPA(vpa: string): Promise<VPAValidationResult>;
  getUserVPAs(userId: string): Promise<VPARecord[]>;
  addUserVPA(userId: string, vpa: string): Promise<VPARecord>;
  
  // Status
  checkTransactionStatus(ipsTransactionId: string): Promise<TransactionStatus>;
  
  // Balance (optional, for risk checks)
  checkBalance(vpa: string): Promise<BalanceResult>;
}
```

---

## 5. Frontend Implementation

### 5.1 New Components

#### 5.1.1 VPA Input Component

**File**: `src/components/ips/VPAInput.tsx`

```typescript
// Features:
// - VPA format validation (xxx@provider)
// - Real-time VPA validation via IPS
// - Provider icon display
// - Save to user's VPA registry
```

#### 5.1.2 IPS Payment Modal

**File**: `src/components/ips/IPSPaymentModal.tsx`

```typescript
// Features:
// - Select from saved VPAs or enter new
// - Display amount and fees
// - Show payment summary
// - Handle loading/success/error states
// - Poll for status updates
```

#### 5.1.3 IPS Transaction Status

**File**: `src/components/ips/IPSTransactionStatus.tsx`

```typescript
// Features:
// - Real-time status display
// - Polling for pending transactions
// - Success celebration
// - Error handling with retry option
```

#### 5.1.4 IPS History List

**File**: `src/components/ips/IPSHistoryList.tsx`

```typescript
// Features:
// - List of IPS transactions
// - Filter by type (disbursement/repayment)
// - Status badges
// - Click to view details
```

### 5.2 Page Updates

#### 5.2.1 Loan Repayment Page

**File**: `src/pages/LoanDetails.tsx` (or similar)

- Add "Pay with IPS" button alongside existing payment methods
- Open `IPSPaymentModal` when clicked
- Show IPS transaction history for the loan

#### 5.2.2 Admin Disbursement Page

**File**: `src/pages/AdminDashboard/components/PaymentManagement/DisbursementProcessing.tsx`

- Add "Disburse via IPS" option
- VPA input for customer's bank/wallet
- IPS transaction status tracking

### 5.3 Hooks

#### `useIPSPayment`

```typescript
// src/hooks/useIPSPayment.ts
export function useIPSPayment() {
  return useMutation({
    mutationFn: async ({ loanId, amount, payerVpa }) => {
      // 1. Call RPC to initiate
      // 2. Call edge function to send to IPS
      // 3. Return transaction ID for status polling
    }
  });
}
```

#### `useIPSTransactionStatus`

```typescript
// src/hooks/useIPSTransactionStatus.ts
export function useIPSTransactionStatus(txnId: string) {
  return useQuery({
    queryKey: ['ips-status', txnId],
    queryFn: () => fetchTransactionStatus(txnId),
    refetchInterval: (data) => data?.status === 'pending' ? 3000 : false
  });
}
```

#### `useUserVPAs`

```typescript
// src/hooks/useUserVPAs.ts
export function useUserVPAs() {
  // Fetch user's saved VPAs
  // Add/remove VPAs
  // Set default VPA
}
```

---

## 6. Implementation Phases

### Phase 1: Foundation (Week 1)

**Database & Backend Setup**

- [ ] Create migration for new tables (`ips_transactions`, `ips_vpa_registry`, `ips_api_logs`, `ips_error_codes`)
- [ ] Add columns to existing tables (`disbursements`, `payments`, `profiles`)
- [ ] Seed error codes table
- [ ] Create RPC functions
- [ ] Set up RLS policies for new tables

**Deliverables**: Database schema ready, RPCs callable

### Phase 2: IPS Adapter (Week 2)

**Edge Function Development**

- [ ] Create `ips-adapter` edge function structure
- [ ] Implement message builders (ReqPay, ReqValAdd, ReqChkTxn)
- [ ] Implement response parsers
- [ ] Add signature generation/verification (mock for now)
- [ ] Implement `/pay` endpoint
- [ ] Implement `/validate-vpa` endpoint
- [ ] Implement `/check-status` endpoint
- [ ] Update `payment-webhook` for IPS callbacks

**Deliverables**: Working IPS adapter (mock mode), webhook handler

### Phase 3: Admin/Backoffice (Week 3)

**Disbursement via IPS**

- [ ] Add IPS option to disbursement workflow UI
- [ ] VPA input and validation in admin
- [ ] Disbursement status tracking
- [ ] IPS transaction history view in admin
- [ ] Error handling and retry UI

**Deliverables**: Admins can disburse loans via IPS

### Phase 4: Customer Frontend (Week 4)

**Repayment via IPS**

- [ ] Create VPA management components
- [ ] Create IPS payment modal
- [ ] Integrate into loan details/repayment flow
- [ ] Status polling and display
- [ ] Transaction history for customers
- [ ] Success/error notifications

**Deliverables**: Customers can repay via IPS

### Phase 5: Testing & Polish (Week 5)

**Quality Assurance**

- [ ] Unit tests for RPC functions
- [ ] Integration tests for edge functions
- [ ] E2E tests for full flows
- [ ] Error scenario testing
- [ ] Performance testing
- [ ] Security review

**Deliverables**: Tested, production-ready system

### Phase 6: Production Prep (Week 6)

**Go-Live Preparation**

- [ ] Environment configuration (certs, keys, endpoints)
- [ ] Monitoring and alerting setup
- [ ] Documentation finalization
- [ ] UAT with IPS certification environment
- [ ] Runbook creation
- [ ] Go-live checklist

**Deliverables**: Ready for IPS certification and production

---

## 7. Configuration Requirements

### 7.1 Environment Variables

```bash
# IPS/IPP Configuration
IPS_ENABLED=true
IPS_ENVIRONMENT=development  # development | uat | production
IPS_ORG_ID=NAMLEND
IPS_BASE_URL=https://ips-uat.bon.na/api/v2
IPS_CALLBACK_URL=https://your-project.supabase.co/functions/v1/payment-webhook

# Security
IPS_CERT_PATH=/certs/namlend-ips.p12
IPS_CERT_PASSWORD=<secret>
IPS_SIGNING_KEY_ID=<key-id>

# NamLend VPAs
IPS_COLLECTIONS_VPA=collections@namlend
IPS_DISBURSEMENT_VPA=disbursements@namlend

# Timeouts
IPS_REQUEST_TIMEOUT_MS=30000
IPS_STATUS_CHECK_INTERVAL_MS=5000
IPS_MAX_STATUS_CHECKS=20
```

### 7.2 Feature Flags

```typescript
// Feature flags for gradual rollout
export const IPS_FEATURE_FLAGS = {
  enableDisbursements: true,
  enableRepayments: true,
  enableBalanceEnquiry: false,
  enableVPAValidation: true,
  maxTransactionAmount: 50000,  // NAD
  allowedPurposeCodes: ['PERS', 'BUSN'],
};
```

---

## 8. Testing Strategy

### 8.1 Mock IPS Service

For development and testing without real IPS connectivity:

```typescript
// Mock responses for different scenarios
const MOCK_SCENARIOS = {
  success: { result: 'SUCCESS', errCode: '00' },
  insufficientFunds: { result: 'FAILURE', errCode: 'IE' },
  timeout: { result: 'PENDING', errCode: 'UP' },
  invalidVPA: { result: 'FAILURE', errCode: 'U01' },
};
```

### 8.2 Test Cases

**Disbursement Flow**:
1. ✅ Successful disbursement via IPS
2. ✅ Failed disbursement (insufficient funds at NamLend)
3. ✅ Failed disbursement (invalid customer VPA)
4. ✅ Timeout → status check → success
5. ✅ Timeout → status check → failure

**Repayment Flow**:
1. ✅ Successful repayment via IPS
2. ✅ Failed repayment (insufficient funds)
3. ✅ Partial repayment
4. ✅ Full loan settlement via IPS
5. ✅ Duplicate payment detection

---

## 9. Security Considerations

### 9.1 Data Protection

- VPA addresses stored but **not** linked account numbers (except masked)
- PIN/credentials **never** stored, only encrypted and forwarded
- API logs redact PII fields
- All IPS communication over mTLS

### 9.2 Authentication

- Admin IPS operations require `admin` or `loan_officer` role
- Customer repayments authenticated via Supabase Auth
- IPS webhook validates signature before processing

### 9.3 Audit Trail

- All IPS transactions logged in `ips_transactions`
- API calls logged in `ips_api_logs`
- State changes logged in `state_transitions`
- Linked to existing `audit_logs` for user actions

---

## 10. Rollback Plan

If issues arise post-deployment:

1. **Disable IPS via feature flag** (`IPS_ENABLED=false`)
2. **Fallback to existing payment methods** (bank transfer, mobile money, cash)
3. **Reconcile in-flight transactions** manually or via status check
4. **Investigate and fix** before re-enabling

---

## 11. Success Metrics

| Metric | Target |
|--------|--------|
| Disbursement success rate | ≥ 98% |
| Repayment success rate | ≥ 98% |
| Average disbursement time | < 30 seconds |
| Average repayment time | < 15 seconds |
| IPS-related support tickets | < 5% of total |

---

## 12. Dependencies & Blockers

### External Dependencies

- [ ] IPS/IPN certification credentials from BON
- [ ] Test environment access
- [ ] X.509 certificates for signing
- [ ] NamLend VPA registration with IPN

### Internal Dependencies

- [ ] Existing payment flow refactoring (if needed)
- [ ] Supabase plan supports required edge function invocations

---

## 13. Next Steps

1. **Review this plan** with stakeholders
2. **Confirm external dependencies** (BON credentials timeline)
3. **Start Phase 1** upon approval
4. **Weekly progress reviews** against this plan

---

## Appendix A: File Structure

```
namlend-trust/
├── supabase/
│   ├── functions/
│   │   ├── ips-adapter/
│   │   │   ├── index.ts           # Main handler
│   │   │   ├── message-builder.ts # XML message construction
│   │   │   ├── response-parser.ts # XML response parsing
│   │   │   ├── security.ts        # Signing, encryption
│   │   │   └── types.ts           # TypeScript interfaces
│   │   └── payment-webhook/
│   │       └── index.ts           # Updated with IPS handling
│   └── migrations/
│       └── YYYYMMDD_ips_integration.sql
├── src/
│   ├── components/
│   │   └── ips/
│   │       ├── VPAInput.tsx
│   │       ├── IPSPaymentModal.tsx
│   │       ├── IPSTransactionStatus.tsx
│   │       └── IPSHistoryList.tsx
│   ├── hooks/
│   │   ├── useIPSPayment.ts
│   │   ├── useIPSTransactionStatus.ts
│   │   └── useUserVPAs.ts
│   ├── services/
│   │   └── ipsService.ts
│   └── types/
│       └── ips.ts
└── docs/
    └── IPP/
        └── IPP_IMPLEMENTATION_PLAN.md  # This document
```

---

**Document Status**: Ready for review and approval before implementation begins.
