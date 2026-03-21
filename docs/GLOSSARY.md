# NamLend Trust Terminology Glossary

**Last Updated**: 2026-03-04
**Aligned With**: Post-quality-sweep codebase
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

---

## See Also

- [INDEX.md](./INDEX.md) - Documentation index
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [IPP_INTEGRATION.md](./IPP_INTEGRATION.md) - IPP/IPS details
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Database tables
