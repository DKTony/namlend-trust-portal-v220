# NamLend Trust Terminology Glossary

**Last Updated**: 2026-03-29
**Aligned With**: Financial Ontology Engine (v5.2.1)
**Status**: Current ✅
**Purpose**: Standardize terminology across documentation and codebase

---

## Payment & Banking Terms

### IPP (Instant Payment Platform)

The Namibian real-time payment infrastructure operated by the Bank of Namibia. Also referred to as:

- **IPS** (Instant Payment System) - Used interchangeably with IPP
- **IPN** (Instant Payment Namibia) - The national scheme name

**Usage**: Prefer "IPP" in technical documentation, "IPS" when referring to the system generically.

### VPA (Virtual Payment Address)

A user-friendly identifier for receiving payments, similar to UPI in India.

**Format**: `username@provider` (e.g., `john.doe@namlend`, `business@banknam`)

**Components**:

- **Username**: User-chosen identifier (alphanumeric)
- **Provider**: Participant identifier (e.g., `namlend`, `fnb`, `bankwindhoek`)

### Central Mapper / VPA Registry

The central database that maps VPAs to underlying bank accounts. Also called:

- **Central Registry** - Same concept
- **Mapper Service** - The API that performs lookups

### Settlement

The final transfer of funds between participating banks after transactions are cleared.

**Related terms**:

- **Clearing**: Validation and netting of transactions before settlement
- **Reconciliation**: Matching internal records with settlement reports
- **Netting**: Calculating net positions between participants

### Disbursement

Transfer of loan funds from NamLend to the borrower's account.

**Status values** (`txStatus` in schema):
| Status | Meaning |
|--------|--------|
| `pending` | Awaiting processing |
| `processing` | Transfer initiated |
| `completed` | Funds transferred successfully |
| `failed` | Transfer failed |
| `reversed` | Transaction reversed |
| `cancelled` | Cancelled before processing |

**Methods**: `bank_transfer`, `ips`, `mobile_money`, `cash`, `cheque`

---

## ISO 20022 Message Types

### pacs.008 (Customer Credit Transfer)

Instruction to transfer funds from debtor to creditor. Used for:

- Loan disbursements
- Customer-initiated payments

### pacs.002 (Payment Status Report)

Confirmation message indicating the status of a payment instruction.

**Key statuses**:

- `ACCP` - Accepted
- `RJCT` - Rejected
- `ACSC` - Accepted Settlement Completed
- `PDNG` - Pending

### pacs.009 (Financial Institution Credit Transfer)

Settlement instruction between financial institutions. Used for:

- Batch settlements
- Inter-bank transfers

### pain.001 (Customer Credit Transfer Initiation)

Customer request to initiate a credit transfer. Used by:

- Client applications
- Batch payment files

---

## Loan Lifecycle Terms

### Loan Status

Valid values in `convex/schema.ts` `loanStatus` validator:

| Status         | Description                                |
| -------------- | ------------------------------------------ |
| `draft`        | Client created, not yet submitted          |
| `submitted`    | Submitted for review, credit score running |
| `under_review` | Being evaluated by loan officer            |
| `approved`     | Approved, awaiting disbursement            |
| `rejected`     | Application denied (terminal)              |
| `funded`       | Disbursement completed, loan active        |
| `active`       | Loan is being repaid                       |
| `paid_off`     | All payments made, loan closed (terminal)  |
| `defaulted`    | Borrower failed to repay                   |
| `written_off`  | Bad debt written off (terminal)            |

### APR (Annual Percentage Rate)

The annualized interest rate including fees. **Maximum: 32%** (Namibian regulatory limit).

**Related**:

- **Nominal Rate**: Base interest rate before fees
- **Effective Rate**: Actual rate accounting for compounding

### LTV (Loan-to-Value)

Ratio of loan amount to collateral value. Not currently used in NamLend (unsecured loans).

### Credit Score

NamLend uses a **300-850 scale** (similar to FICO):

- 300-579: Poor
- 580-669: Fair
- 670-739: Good
- 740-799: Very Good
- 800-850: Excellent

---

## Technical Terms

### RLS (Row-Level Security)

**Legacy (Supabase era only).** PostgreSQL feature that restricted which rows users could access based on policies.

RLS has been **replaced by Convex auth guard functions** (`assertAuthenticated`, `assertOwner`, `assertOwnerOrStaff`, `assertStaff`, `assertAdmin`) in `convex/lib/auth.ts`. Every Convex query and mutation calls the appropriate guard explicitly at the top of its handler.

**Example**: `assertOwnerOrStaff(ctx, loan.userId)` replaces `WHERE user_id = auth.uid() OR is_staff(auth.uid())`.

### RPC (Remote Procedure Call)

**Legacy (Supabase era only).** Database functions called from the frontend via `supabase.rpc('function_name', args)`. Used for complex transactions requiring elevated privileges.

RPCs have been **replaced by Convex mutations and actions**. The equivalent of `supabase.rpc('process_approval_transaction', { ... })` is now `useMutation(api.approvalWorkflow.processApprovalRequest)`. See [API_REFERENCE.md](./API_REFERENCE.md) for current function signatures.

### Edge Function

**Legacy (Supabase era only).** Server-side Deno functions hosted on Supabase. Used for webhook handlers, external API integrations, and operations requiring secrets.

Edge Functions have been **replaced by Convex Actions** in `convex/actions/`. Secrets are set via `npx convex env set KEY value` (not in `.env` files).

**Location (legacy, INACTIVE)**: `/supabase/functions/`

### Convex

The current backend platform for NamLend Trust (migrated from Supabase, February 2026). Provides:

- **Queries**: Reactive reads — automatically re-run when data changes
- **Mutations**: Atomic, serializable writes
- **Actions**: External HTTP calls (IPS, SMS, WhatsApp, TigerBeetle)
- **HTTP Router**: Webhook handlers (`/webhook/ips`, `/webhook/payment`)
- **Cron Jobs**: Scheduled tasks (outbox worker, daily maintenance)

All backend functions live in `convex/`. Schema is defined in `convex/schema.ts`.

### Reconciliation Run

A batch session that groups imported bank transactions for matching and variance analysis (`reconciliation_runs` table).

### TigerBeetle

High-performance financial ledger for double-entry bookkeeping.

**Current status**: Shadow mode (records transactions but doesn't control flow)

**Related terms**:

- **Outbox pattern**: Queue events for TigerBeetle processing
- **Shadow mode**: Record alongside primary system, don't block on failures

### Outbox Pattern

Design pattern where events are written to a local table first, then processed asynchronously by a worker.

**Benefits**:

- Guaranteed delivery
- Decoupled from external system availability
- Audit trail of all events

---

## Financial Ontology Engine Terms

### Event Journal

Append-only stream of every state-changing event in the system (`eventJournal` table). Populated automatically via the **audit bridge** in `convex/lib/audit.ts` — every call to `scheduleAuditLog()` or `scheduleAuditEntry()` emits both a traditional audit log entry and an event journal entry.

**Key fields**:

- **correlationId**: Groups related events (e.g., all events in one loan lifecycle)
- **causationId**: The event that caused this event (enables "what triggered this?" queries)
- **domainSource**: Category (`lending`, `payments`, `settlement`, `mandates`, `collections`, etc.)

### Entity Relationship Graph (Knowledge Graph)

A typed, directed graph of relationships between entities (`relationships` table). Populated via `emitRelationship()` helper (fire-and-forget via scheduler). Supports BFS traversal up to N degrees of separation.

**Example relationships**: `user -> borrowed -> loan`, `loan -> repaid_via -> payment`, `mandate -> executed_via -> mandateExecution`

### Mandate

A debit order authorization allowing NamLend to automatically collect payments from a borrower's bank account (`mandates` table).

**Lifecycle**: `draft` → `pending_authorization` → `active` → `suspended` / `revoked` / `expired`

### Payment Rail

A first-class entity representing a payment channel (`paymentRails` table). The `selectOptimalRail()` function in `convex/lib/railSelector.ts` scores rails by cost, speed, availability, and reliability.

**Namibian rails**: EFT, IPS/IPP, mobile_money, cash, cheque

### Product Version

An immutable configuration snapshot for a financial product (`productVersions` table). Products evolve via new versions — old versions are never modified. The eligibility engine checks applicant criteria against product rules.

### Institution

A financial institution operating on the platform (`institutions` table). Supports multi-tenancy via `institutionId` fields on core tables and the `withInstitution()` filter helper.

### Audit Bridge

The pattern in `convex/lib/audit.ts` where `scheduleAuditLog()` automatically emits event journal entries alongside traditional audit log writes. This means adding ontology coverage to a mutation is as simple as adding a `scheduleAuditLog()` call — no separate `emitEvent()` needed.

---

## User Roles

### Client

End user who applies for and repays loans. Access:

- Dashboard
- Loan application
- Payment history
- KYC submission

### Loan Officer

Staff member who reviews and approves loans. Access:

- All client features
- Approval queue
- Loan review panel
- Collections management

### Admin

Full system access including configuration. Access:

- All loan officer features
- User management
- System settings
- Audit logs
- Settlement management

---

## Currency

### NAD (Namibian Dollar)

The official currency of Namibia.

**Formatting**:

- Symbol: `N$`
- Format: `N$ 1,234.56`
- Decimal places: 2

**Code usage**:

```typescript
import { formatNAD } from '@/utils/currency';
formatNAD(1234.56); // "N$ 1,234.56"
```

---

## Notification Channels

### SMS

Text messages via Africa's Talking gateway.

### WhatsApp

Messages via Meta Cloud API. Requires:

- Template approval from Meta
- Business verification

### Email

Transactional email (not currently implemented).

### Push

Mobile app notifications (React Native app only).

---

## Abbreviations Quick Reference

| Abbreviation | Full Term                           |
| ------------ | ----------------------------------- |
| APR          | Annual Percentage Rate              |
| E2E          | End-to-End (testing)                |
| FSD          | Functional Specification Document   |
| IPP          | Instant Payment Platform            |
| IPS          | Instant Payment System              |
| IPN          | Instant Payment Namibia             |
| JWT          | JSON Web Token                      |
| KYC          | Know Your Customer                  |
| LTV          | Loan-to-Value                       |
| NAD          | Namibian Dollar                     |
| PII          | Personally Identifiable Information |
| RLS          | Row-Level Security                  |
| RPC          | Remote Procedure Call               |
| SLA          | Service Level Agreement             |
| TSD          | Technical Specification Document    |
| VPA          | Virtual Payment Address             |

| BFS | Breadth-First Search (graph traversal) |
| DTI | Debt-to-Income (ratio) |
| EOD | End of Day |
| POPIA | Protection of Personal Information Act |

---

## Ontology Engine Terms

### Ontology (Financial)

A structured model where every entity, relationship, and event forms a knowledge graph of financial reality. In NamLend, the ontology is implemented across 6 layers: event journal, mandates/consent, knowledge graph, multi-institution, payment rails, and product engine.

### Event Journal

A unified, append-only event stream (`eventJournal` table) capturing every significant state change across all domains. Events carry `correlationId` and `causationId` for tracing cross-domain event chains.

### Knowledge Graph / Relationships

Typed, temporal, directional edges between any two entities in the system (`relationships` table). Examples: `user -[borrowed]-> loan`, `loan -[disbursed_via]-> disbursement`, `institution -[licensed_by]-> regulator`. Supports BFS traversal with configurable depth.

### Mandate

A debtor authorization for recurring collections. Types: `debit_order`, `once_off_debit`, `recurring_collection`, `ipp_mandate`. Lifecycle: draft -> pending_authorization -> active -> [suspended <-> active] -> revoked | expired.

### Payment Rail

A first-class entity representing a payment channel (IPS, bank transfer, mobile money, cash, cheque) with cost model, settlement latency, availability windows, and health status. The `selectOptimalRail()` function scores rails by cost (40%), speed (30%), availability (20%), and reliability (10%).

### Product Version

An immutable configuration record for a financial product. Once created, product versions are never updated — new versions supersede old ones. Loans can optionally reference a `productVersionId` for validation against configurable criteria (amount range, term limits, interest rate cap, eligibility rules).

### Temporal Versioning

A pattern where records are never overwritten. Instead, the old record's `effectiveTo` is set, and a new record is inserted with `effectiveFrom`. Used for `systemConfiguration`, `institutionConfig`, and `productVersions`.

### Institution Scoping

Multi-tenant isolation by optional `institutionId` field on core tables. The `withInstitution()` helper filters query results by tenant while preserving backward compatibility for unscoped records.

### POPIA Consent

Consent records required by the Protection of Personal Information Act (South Africa, adopted by Namibia). Types tracked: `data_processing`, `debit_mandate`, `credit_check`, `communication`, `data_sharing`.

---

## See Also

- [INDEX.md](./INDEX.md) - Documentation index
- [ONTOLOGY_ENGINE.md](./ONTOLOGY_ENGINE.md) - Financial Ontology Engine implementation report
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [IPP_INTEGRATION.md](./IPP_INTEGRATION.md) - IPP/IPS details
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Database tables
