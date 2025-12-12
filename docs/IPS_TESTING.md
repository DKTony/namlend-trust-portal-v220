# IPS Integration Testing Guide

## Overview

This document describes the testing strategy and test files for the IPS (Instant Payment Solution) integration in NamLend Trust.

## Test Files

### 1. RPC Function Tests (`e2e/api/ips-rpc.e2e.ts`)

Tests for all IPS-related database RPC functions:

- **VPA Management**
  - `upsert_user_vpa` - Create/update VPA
  - `get_user_vpas` - Retrieve user's VPAs
  - VPA format validation
  - Authorization checks

- **Transaction Operations**
  - `initiate_ips_disbursement` - Admin disbursement initiation
  - `initiate_ips_repayment` - Customer repayment initiation
  - `complete_ips_transaction` - Transaction completion
  - `get_ips_transaction_status` - Status retrieval
  - `get_loan_ips_transactions` - Loan transaction history

- **Helper Functions**
  - `generate_ips_msg_id` - Message ID generation
  - `generate_ips_txn_id` - Transaction ID generation
  - `get_ips_error_message` - Error message lookup
  - `is_ips_error_retryable` - Retry logic

- **RLS Policies**
  - User can only see own VPAs
  - Admin can see all transactions
  - Error codes readable by all

### 2. Edge Function Tests (`e2e/api/ips-adapter.e2e.ts`)

Integration tests for the IPS adapter edge function:

- **VPA Validation (`/validate-vpa`)**
  - Valid VPA format acceptance
  - Invalid format rejection
  - Unknown provider handling

- **Payment Processing (`/pay`)**
  - Successful payment flow
  - Failure scenarios (simulated)
  - Timeout handling
  - Amount limit enforcement

- **Status Check (`/check-status`)**
  - Transaction status retrieval
  - Pending transaction resolution

- **Error Handling**
  - Unknown endpoint (404)
  - Invalid method (405)
  - Malformed JSON (500)

- **API Logging**
  - Verify logs are created in `ips_api_logs`

### 3. E2E Payment Flow Tests (`e2e/ips-payment-flow.e2e.ts`)

Full end-to-end tests with UI interactions:

- **Customer Payment Flow**
  - View IPS payment option
  - Open payment modal
  - Enter and validate VPA
  - Complete payment journey

- **Admin Disbursement Flow**
  - View disbursement options
  - Initiate IPS disbursement
  - Track disbursement status

- **Transaction History**
  - Customer views own transactions
  - Admin views all transactions

- **VPA Management**
  - Add new VPA
  - Set default VPA

- **Error Handling**
  - Failed payment display
  - Retry options for retryable errors

### 4. SQL Tests (`e2e/ips-rpc-tests.sql`)

Direct database tests for RPC functions:

- ID generation functions
- Error code lookups
- Table structure validation
- RLS policy verification
- Index existence checks

### 5. Unit Tests (`e2e/unit/ips-utils.e2e.ts`)

Unit tests for utility functions:

- `formatVPAForDisplay` - VPA masking
- `isValidVPAFormat` - Format validation
- `getVPAProvider` - Provider extraction
- Status constants and helpers

## Running Tests

### Run All IPS Tests

```bash
# Run RPC tests
npx playwright test e2e/api/ips-rpc.e2e.ts

# Run adapter tests
npx playwright test e2e/api/ips-adapter.e2e.ts

# Run E2E flow tests
npx playwright test e2e/ips-payment-flow.e2e.ts

# Run unit tests
npx playwright test e2e/unit/ips-utils.e2e.ts

# Run all IPS tests
npx playwright test --grep "IPS"
```

### Run SQL Tests

```bash
# Connect to database and run SQL tests
psql $DATABASE_URL -f e2e/ips-rpc-tests.sql
```

### Run with Specific Configuration

```bash
# Run in headed mode (see browser)
npx playwright test e2e/ips-payment-flow.e2e.ts --headed

# Run with debug
npx playwright test e2e/ips-payment-flow.e2e.ts --debug

# Run specific test
npx playwright test -g "Customer can view IPS payment option"
```

## Test Data

### Test Prefixes

All test data uses prefixes for easy identification and cleanup:

- `IPS-TEST-` - RPC function tests
- `IPS-ADAPTER-TEST-` - Adapter tests
- `IPS-E2E-` - E2E flow tests

### Mock Scenarios

The IPS adapter runs in mock mode during development. Special VPA patterns trigger different scenarios:

| VPA Pattern | Behavior |
|-------------|----------|
| `*@fnb`, `*@bank` | Success |
| `*fail*@*` | Payment failure (code 51) |
| `*timeout*@*` | Pending/timeout (code XP) |
| `*@invalid*` | VPA not registered (code XK) |
| Amount > 50,000 | Exceeds limit (code 61) |

### Cleanup

Tests automatically clean up test data in `afterAll` hooks. Manual cleanup:

```sql
-- Clean up test transactions
DELETE FROM ips_transactions WHERE msg_id LIKE 'IPS-TEST-%';
DELETE FROM ips_transactions WHERE msg_id LIKE 'IPS-ADAPTER-TEST-%';
DELETE FROM ips_transactions WHERE note LIKE 'IPS-E2E-%';

-- Clean up test VPAs
DELETE FROM ips_vpa_registry WHERE vpa_address LIKE 'ips-test-%';
DELETE FROM ips_vpa_registry WHERE vpa_address LIKE 'ips-adapter-test-%';
DELETE FROM ips_vpa_registry WHERE vpa_address LIKE 'ips-e2e-%';
```

## Test Coverage

### RPC Functions

| Function | Covered | Notes |
|----------|---------|-------|
| `initiate_ips_disbursement` | ✅ | Admin auth, validation |
| `initiate_ips_repayment` | ✅ | User auth, amount validation |
| `complete_ips_transaction` | ✅ | State transitions |
| `get_ips_transaction_status` | ✅ | Status retrieval |
| `get_user_vpas` | ✅ | User isolation |
| `upsert_user_vpa` | ✅ | Create/update, default |
| `get_loan_ips_transactions` | ✅ | Loan history |
| `generate_ips_msg_id` | ✅ | Uniqueness |
| `generate_ips_txn_id` | ✅ | Uniqueness |
| `get_ips_error_message` | ✅ | Known/unknown codes |
| `is_ips_error_retryable` | ✅ | Retry logic |

### Edge Function Endpoints

| Endpoint | Covered | Notes |
|----------|---------|-------|
| `POST /pay` | ✅ | Success, failure, timeout |
| `POST /validate-vpa` | ✅ | Valid, invalid, unknown |
| `POST /check-status` | ✅ | Status retrieval |
| Error handling | ✅ | 404, 405, 500 |

### UI Components

| Component | Covered | Notes |
|-----------|---------|-------|
| `VPAInput` | ✅ | Validation, format |
| `IPSPaymentModal` | ✅ | Full flow |
| `IPSTransactionStatus` | ✅ | Status display |
| `IPSHistoryList` | ✅ | Transaction list |
| `IPSDisbursementForm` | ✅ | Admin form |

## CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/e2e.yml
- name: Run IPS Tests
  run: |
    npx playwright test e2e/api/ips-rpc.e2e.ts
    npx playwright test e2e/api/ips-adapter.e2e.ts
    npx playwright test e2e/ips-payment-flow.e2e.ts
```

## Troubleshooting

### Common Issues

1. **Auth token expired**
   - Tests use fixtures that handle auth automatically
   - Ensure test users exist in database

2. **Edge function not deployed**
   - Run `supabase functions deploy ips-adapter`
   - Check function logs: `supabase functions logs ips-adapter`

3. **Database migration not applied**
   - Run `supabase db push`
   - Verify tables exist: `\dt ips_*`

4. **Test data conflicts**
   - Run cleanup SQL before tests
   - Use unique prefixes per test run

### Debug Mode

```bash
# Enable verbose logging
DEBUG=pw:api npx playwright test e2e/api/ips-adapter.e2e.ts

# Save traces for failed tests
npx playwright test --trace on
```

## Future Enhancements

- [ ] Load testing with k6
- [ ] Contract testing for IPS API
- [ ] Visual regression tests for UI components
- [ ] Performance benchmarks for RPC functions
