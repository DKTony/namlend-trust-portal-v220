# IPS Integration Testing Guide

**Doc Revision**: 2026-01-19  \
**Status**: IPS adapter runs in mock mode for tests.

---

## Overview

IPS tests are implemented in Playwright and SQL fixtures. The adapter is mocked and uses special VPA patterns to simulate outcomes.

---

## Test Files

- `e2e/api/ips-rpc.e2e.ts` (RPC coverage)
- `e2e/api/ips-adapter.e2e.ts` (Edge Function adapter)
- `e2e/ips-payment-flow.e2e.ts` (UI flow)
- `e2e/unit/ips-utils.e2e.ts` (utility helpers)
- `e2e/ips-rpc-tests.sql` (SQL assertions)

---

## Running IPS Tests

```bash
npx playwright test e2e/api/ips-rpc.e2e.ts
npx playwright test e2e/api/ips-adapter.e2e.ts
npx playwright test e2e/ips-payment-flow.e2e.ts
npx playwright test e2e/unit/ips-utils.e2e.ts
```

---

## Mock Scenarios (Adapter)

| VPA Pattern | Behavior |
| --- | --- |
| `*@fnb`, `*@bank` | Success |
| `*fail*@*` | Payment failure |
| `*timeout*@*` | Pending/timeout |
| `*@invalid*` | VPA not registered |
| Amount > 50,000 | Exceeds limit |

---

## Cleanup (Manual)

```sql
DELETE FROM ips_transactions WHERE msg_id LIKE 'IPS-%';
DELETE FROM ips_vpa_registry WHERE vpa_address LIKE 'ips-%';
```

