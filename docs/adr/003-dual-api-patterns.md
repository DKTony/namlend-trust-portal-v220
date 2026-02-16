# ADR 003: Direct Supabase Queries Coexist with API Client

## Status

Accepted (December 2025)

## Context

NamLend Trust has two patterns for backend communication:

1. **Direct Supabase client** (`supabase.from('table').select(...)`) — used by 25 service files and most components
2. **API client** (`src/services/api-client.ts`) — an HTTP abstraction layer with typed methods like `adminAPI.getMetrics()`

The direct Supabase pattern was established in the initial development phase (v1.0-v2.0). The API client was introduced later to provide a cleaner abstraction for admin-specific operations that call Supabase edge functions.

Both patterns coexist because:

- The direct client is protected by Row-Level Security (RLS), making it safe for client-side use
- Migrating all 25 services to the API client would require creating REST wrappers for every database operation
- Some operations (real-time subscriptions, file uploads) are inherently Supabase-specific

## Decision

Both patterns are valid and serve different purposes:

- **Direct Supabase client**: Use for standard CRUD operations, real-time subscriptions, and file storage. RLS policies enforce authorization at the database level.
- **API client**: Use for complex operations that require server-side logic, multi-step transactions, or cross-service coordination via edge functions.

New code should prefer the direct Supabase client for simple operations and the API client for operations that benefit from server-side orchestration.

## Consequences

**Positive:**

- Direct client leverages PostgreSQL RLS for zero-trust security without custom middleware
- No need to build REST endpoints for every table operation
- Real-time features work natively with the Supabase client
- API client provides a clean boundary for server-side business logic

**Negative:**

- Two patterns increase cognitive load for new developers
- No single interception point for all API calls (logging, error handling must be duplicated)
- Direct client calls are harder to mock in unit tests vs. a centralized API client
- Business logic may leak into components when using the direct client

**Mitigations:**

- Service files (`src/services/`) encapsulate business logic regardless of the underlying pattern
- `monitorDatabaseError()` provides centralized error tracking for direct client calls
- `callRpc()` utility provides circuit breaker behavior for RPC-style calls
- Future ADR may revisit if/when a full API gateway is needed
