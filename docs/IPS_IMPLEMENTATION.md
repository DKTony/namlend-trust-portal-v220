# IPS (Instant Payment System) Implementation Guide

**Version**: 1.0.0  
**Created**: December 12, 2025  
**Status**: Mock API Mode (Ready for Production Integration)

---

## Overview

This document describes the IPS integration implementation in NamLend Trust. The system currently operates in **Mock Mode** for development and testing, with a clear path to production integration with the Bank of Namibia's Instant Payment Platform (IPP).

---

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
├─────────────────────────────────────────────────────────────────┤
│  IPSPaymentModal  │  VPAInput  │  IPSHistoryList  │  LoanDetails │
└────────┬──────────┴─────┬──────┴────────┬─────────┴──────┬──────┘
         │                │               │                │
         ▼                ▼               ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      React Query Hooks                           │
├─────────────────────────────────────────────────────────────────┤
│  useIPSPayment  │  useUserVPAs  │  useIPSTransactionStatus      │
└────────┬────────┴───────┬───────┴────────────┬──────────────────┘
         │                │                    │
         ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                               │
├─────────────────────────────────────────────────────────────────┤
│                     ipsService.ts                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Supabase Edge Function                         │
├─────────────────────────────────────────────────────────────────┤
│                     ips-adapter                                  │
│  • /pay - Process payments                                       │
│  • /validate-vpa - Validate VPA addresses                        │
│  • /check-status - Check transaction status                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼ (Production)
┌─────────────────────────────────────────────────────────────────┐
│                   Bank of Namibia IPS                            │
│                   (IPP/IPN Switch)                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Tables

#### `ips_transactions`
Stores all IPS payment transactions.

```sql
CREATE TABLE ips_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES loans(id),
  user_id UUID REFERENCES auth.users(id),
  transaction_type TEXT NOT NULL, -- 'REPAYMENT' | 'DISBURSEMENT'
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'NAD',
  payer_vpa TEXT,
  payee_vpa TEXT,
  status TEXT DEFAULT 'pending', -- pending, sent, completed, failed, timeout, reversed
  ips_rrn TEXT, -- IPS Reference Number
  ips_txn_id TEXT, -- IPS Transaction ID
  error_code TEXT,
  error_message TEXT,
  is_retryable BOOLEAN DEFAULT false,
  initiated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  note TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `ips_vpa_registry`
Stores user VPA (Virtual Payment Address) records.

```sql
CREATE TABLE ips_vpa_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  vpa_address TEXT NOT NULL,
  vpa_type TEXT DEFAULT 'MOBILE', -- MOBILE, ACCOUNT, AADHAAR
  provider_code TEXT,
  account_holder_name TEXT,
  is_validated BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, vpa_address)
);
```

#### `ips_api_logs`
Logs all IPS API calls for debugging and audit.

```sql
CREATE TABLE ips_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  request_body JSONB,
  response_body JSONB,
  status_code INTEGER,
  duration_ms INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### RPC Functions

#### `initiate_ips_repayment`
Initiates an IPS payment for loan repayment.

```sql
CREATE FUNCTION initiate_ips_repayment(
  p_loan_id UUID,
  p_amount DECIMAL,
  p_payer_vpa TEXT
) RETURNS JSON
```

#### `initiate_ips_disbursement`
Initiates an IPS disbursement for loan payout.

```sql
CREATE FUNCTION initiate_ips_disbursement(
  p_loan_id UUID,
  p_payee_vpa TEXT
) RETURNS JSON
```

#### `get_ips_transaction_status`
Gets the current status of an IPS transaction.

```sql
CREATE FUNCTION get_ips_transaction_status(
  p_transaction_id UUID
) RETURNS JSON
```

---

## Frontend Components

### IPSPaymentModal
Multi-step modal for initiating IPS loan repayments.

**Location**: `src/components/ips/IPSPaymentModal.tsx`

**Props**:
```typescript
interface IPSPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanId: string;
  outstandingBalance: number;
  monthlyPayment?: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}
```

**Steps**:
1. **Amount** - Select payment amount (monthly or full balance)
2. **VPA** - Select or enter VPA address
3. **Confirm** - Review payment details
4. **Processing** - Payment in progress
5. **Result** - Success or failure

**Test IDs**:
- `ips-payment-modal` - Modal container
- `ips-amount-input` - Amount input field
- `ips-monthly-amount-btn` - Monthly amount button
- `ips-full-balance-btn` - Full balance button
- `ips-continue-btn` - Continue button
- `ips-back-btn` - Back button
- `ips-pay-now-btn` - Pay Now button
- `ips-done-btn` - Done/Close button

### VPAInput
Input component for VPA with validation.

**Location**: `src/components/ips/VPAInput.tsx`

**Props**:
```typescript
interface VPAInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidationResult?: (result: IPSAdapterValidateVPAResponse | null) => void;
  showValidateButton?: boolean;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}
```

**Test IDs**:
- `vpa-input` - Input field
- `vpa-verify-button` - Verify button

### LoanDetails
Loan details page with IPS payment option.

**Location**: `src/pages/LoanDetails.tsx`

**Route**: `/loans/:id`

**Test IDs**:
- `ips-payment-button` - Pay with IPS button
- `ips-history-tab` - IPS transactions tab
- `loan-amount` - Loan amount display
- `loan-status` - Loan status badge
- `outstanding-balance` - Outstanding balance
- `monthly-payment` - Monthly payment amount

---

## React Query Hooks

### useIPSPayment
Hook for initiating IPS payments.

**Location**: `src/hooks/useIPSPayment.ts`

```typescript
const { mutate: initiateRepayment, isLoading } = useIPSRepayment();

initiateRepayment({
  loanId: 'uuid',
  amount: 1000,
  payerVpa: 'user@bank'
});
```

### useUserVPAs
Hook for managing user VPAs.

**Location**: `src/hooks/useUserVPAs.ts`

```typescript
const { data: vpas, isLoading } = useUserVPAs();
const { mutate: upsertVpa } = useUpsertVPA();
const { mutate: validateVpa } = useValidateVPA();
const { mutate: setDefault } = useSetDefaultVPA();
```

### useIPSTransactionStatus
Hook for polling transaction status.

**Location**: `src/hooks/useIPSTransactionStatus.ts`

```typescript
const { data, isPolling, checkStatus } = useIPSTransactionStatus(
  transactionId,
  { enablePolling: true, onComplete: handleComplete }
);
```

---

## Edge Function: ips-adapter

**Location**: `supabase/functions/ips-adapter/index.ts`

### Endpoints

#### POST /pay
Process an IPS payment.

**Request**:
```json
{
  "transactionId": "uuid",
  "amount": 1000.00,
  "currency": "NAD",
  "payerVpa": "user@bank",
  "payeeVpa": "namlend@ips",
  "note": "Loan repayment"
}
```

**Response**:
```json
{
  "success": true,
  "rrn": "IPS-RRN-123456",
  "txnId": "IPS-TXN-789",
  "status": "completed",
  "timestamp": "2025-12-12T07:00:00Z"
}
```

#### POST /validate-vpa
Validate a VPA address.

**Request**:
```json
{
  "vpa": "user@bank"
}
```

**Response**:
```json
{
  "valid": true,
  "vpa": "user@bank",
  "accountHolderName": "John Doe",
  "providerCode": "FNB",
  "providerName": "First National Bank Namibia"
}
```

#### POST /check-status
Check transaction status.

**Request**:
```json
{
  "transactionId": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "status": "completed",
  "rrn": "IPS-RRN-123456",
  "completedAt": "2025-12-12T07:00:00Z"
}
```

### Mock Mode

The adapter operates in **Mock Mode** by default, simulating IPS responses:

- VPA validation always succeeds for valid format (`user@provider`)
- Payments complete after a simulated delay
- Random transaction IDs and RRNs are generated

To enable production mode, set `MOCK_MODE=false` and configure:
- `IPS_API_URL` - IPS Switch endpoint
- `IPS_API_KEY` - API authentication key
- `IPS_CERT_PATH` - mTLS certificate path

---

## Testing

### E2E Tests

**Location**: `e2e/ips-payment-flow.e2e.ts`

Tests cover:
- Customer payment flow (view, open modal, enter VPA, confirm, complete)
- Admin disbursement flow
- Transaction history viewing
- VPA management
- Error handling (failed payments, retryable errors)

### Running Tests

```bash
# Run IPS E2E tests
npx playwright test e2e/ips-payment-flow.e2e.ts

# Run with UI
npx playwright test e2e/ips-payment-flow.e2e.ts --ui
```

### Test Data

Test data uses the prefix `IPS-E2E-` for easy cleanup:
- VPAs: `ips-e2e-*@test`
- Notes: `IPS-E2E-*`

---

## Integration Checklist

### Current Status (Mock Mode) ✅

- [x] Database schema (tables, RLS, indexes)
- [x] RPC functions for IPS operations
- [x] Edge Function with mock responses
- [x] Frontend components (modal, VPA input, history)
- [x] React Query hooks
- [x] Service layer
- [x] E2E test coverage
- [x] data-testid attributes for UI testing

### Production Integration (Pending)

- [ ] Register as PSP with Bank of Namibia
- [ ] Obtain IPS credentials and certificates
- [ ] Configure mTLS authentication
- [ ] Implement real IPS API calls
- [ ] Set up webhook endpoint for callbacks
- [ ] Complete UAT with BON
- [ ] Security audit
- [ ] Go-live certification

---

## Environment Variables

### Development (Mock Mode)
```bash
# No additional variables needed - mock mode is default
```

### Production
```bash
# IPS Configuration
IPS_API_URL=https://ips.bon.na/api/v2
IPS_API_KEY=<your-api-key>
IPS_CERT_PATH=/certs/namlend.p12
IPS_CERT_PASSWORD=<secret>
IPS_ORG_ID=NAMLEND
IPS_MERCHANT_VPA=collections@namlend
MOCK_MODE=false
```

---

## Troubleshooting

### Common Issues

1. **VPA validation fails**
   - Check VPA format: `username@provider`
   - Verify provider code is valid

2. **Payment timeout**
   - Use `check-status` endpoint to verify
   - Implement retry with same transaction ID

3. **Transaction stuck in pending**
   - Poll status endpoint
   - Check IPS API logs table

### Logging

All IPS API calls are logged to `ips_api_logs` table:
```sql
SELECT * FROM ips_api_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## Related Documentation

- [IPP Integration Guide](./IPP_INTEGRATION.md) - Full IPP/IPN technical specification
- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Architecture](./ARCHITECTURE.md) - System architecture overview
- [Functionality Map](./FUNCTIONALITY_MAP.md) - Feature-to-service mapping
