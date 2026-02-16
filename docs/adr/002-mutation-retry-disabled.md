# ADR 002: TanStack Query Mutation Retry is Disabled

## Status

Accepted (November 2025)

## Context

TanStack Query (React Query) v5 provides automatic retry logic for both queries and mutations. By default, failed mutations can be retried up to 3 times with exponential backoff.

NamLend Trust processes financial operations including:

- Loan disbursements
- Payment submissions
- Status transitions (approval workflow)
- Ledger postings to TigerBeetle

These operations are **non-idempotent** in many cases: retrying a disbursement could send funds twice, retrying a payment submission could double-charge a client, and retrying a status transition could skip workflow steps.

## Decision

Mutation retry is globally disabled in the TanStack Query client configuration (`App.tsx`):

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      retry: false,
    },
  },
});
```

Individual queries retain their default retry behavior (3 retries) since read operations are inherently safe to repeat.

## Consequences

**Positive:**

- Eliminates the risk of duplicate financial operations caused by automatic retries
- Failed mutations surface immediately to the user, allowing informed re-submission
- Aligns with financial services best practices (explicit retry over implicit)
- Simpler debugging: each mutation executes exactly once

**Negative:**

- Transient network errors require the user to manually retry operations
- Slightly worse UX for non-financial mutations (e.g., profile updates) that could safely retry
- Developers must implement their own retry logic if a specific mutation is idempotent

**Mitigations:**

- `callRpc()` in `src/utils/rpc.ts` provides opt-in retry with circuit breaker for RPC calls
- Toast notifications inform users when operations fail and suggest retrying
- The outbox pattern for TigerBeetle provides its own retry mechanism for ledger sync
