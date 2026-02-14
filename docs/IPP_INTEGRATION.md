# Instant Payment Platform (IPP) Integration Guide

**Doc Revision**: 2026-01-19  
**Status**: Reference specification. Current code uses the `ips-adapter` Edge Function in mock mode. Production IPS API integration is pending.

## Implementation Notes (Current Code)

- Adapter: `supabase/functions/ips-adapter` (mock responses by default).
- Services: `src/services/ipsService.ts`, `src/services/ipsOnboardingService.ts`.
- Data: `ips_transactions`, `ips_vpa_registry`, onboarding tables in `supabase/migrations/`.

## Overview

The **Instant Payment Platform (IPP)** is Namibia's national real-time payment infrastructure, also known as **Instant Payment Namibia (IPN)**. It is based on India's Unified Payments Interface (UPI) architecture and is governed by the Bank of Namibia (BON).

### Key Documents (in `/docs/IPP/`)

| Document | Description |
|----------|-------------|
| `IPN Scheme Rules v0.3` | Governance rules for the Instant Payment Namibia scheme |
| `IPP Functional Specification Document (FSD) v10.0` | Functional requirements and use cases |
| `BON IPS TSD v0.7` | Technical Specification Document from Bank of Namibia |
| `XSD's/` | XML Schema Definitions for all API messages |

---

## Architecture

### System Participants

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   PSP Apps      │────▶│   IPS Switch    │◀────│  Bank Systems   │
│ (NamLend, etc)  │     │ (Central Hub)   │     │ (FNB, Nedbank)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                       │
         │              ┌────────┴────────┐              │
         │              │ Central Mapper  │              │
         │              │  (VPA Registry) │              │
         │              └─────────────────┘              │
         │                                               │
         └───────────────────────────────────────────────┘
                        Real-time Settlement
```

### Key Components

1. **PSP (Payment Service Provider)** - Third-party apps like NamLend that initiate payments
2. **IPS Switch** - Central routing hub managed by BON
3. **Central Mapper** - VPA (Virtual Payment Address) registry
4. **Account Providers** - Banks holding customer accounts
5. **NPCI Adapter** - Protocol translation layer (UPI-based)

---

## Core Concepts

### Virtual Payment Address (VPA)

A VPA is a unique identifier for payment addressing, similar to UPI IDs in India:

```
format: username@provider
example: john.doe@namlend
example: 0812345678@fnb
```

### Transaction Types

| Type | Description | Use Case |
|------|-------------|----------|
| `PAY` | Push payment | Send money to VPA |
| `COLLECT` | Pull payment | Request money from VPA |
| `REVERSAL` | Undo transaction | Refund/cancel payment |
| `AUTOREVERSAL` | System-initiated reversal | Timeout handling |
| `REFUND` | Merchant refund | Return payment |
| `BAL` | Balance enquiry | Check account balance |

### Transaction Sub-Types

| SubType | Description |
|---------|-------------|
| `PAY` | Standard payment |
| `COLLECT` | Collection request |
| `MANDATE` | Standing instruction |
| `REVERSAL` | Transaction reversal |
| `AUTOREVERSAL` | Automatic reversal |

---

## API Reference

### Message Structure

All IPP messages follow this XML structure:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ReqPay xmlns="http://npci.org/upi/schema/">
  <Head ver="2.0" ts="2025-12-10T10:00:00+02:00" 
        orgId="NAMLEND" msgId="MSG123" prodType="IPS"/>
  <Meta>
    <Tag name="PAYREQSTART" value="2025-12-10T10:00:00"/>
  </Meta>
  <Txn id="TXN123" type="PAY" ts="2025-12-10T10:00:00+02:00"/>
  <Payer addr="payer@namlend" type="PERSON">
    <Ac addrType="ACCOUNT">
      <Detail name="IFSC" value="FNBN0001234"/>
      <Detail name="ACNUM" value="62123456789"/>
    </Ac>
    <Creds>
      <Cred type="PIN" subType="MPIN">
        <Data>encrypted_pin_data</Data>
      </Cred>
    </Creds>
  </Payer>
  <Payees>
    <Payee addr="payee@fnb" type="PERSON">
      <Amount value="100.00" curr="NAD"/>
    </Payee>
  </Payees>
</ReqPay>
```

### Core APIs

#### 1. Payment Request (ReqPay / RespPay)

**Purpose**: Initiate a payment from payer to payee

```typescript
interface PaymentRequest {
  head: HeadType;
  meta?: MetaType;
  txn: TransactionType;
  payer: PayerType;
  payees: PayeeType[];
}

interface PaymentResponse {
  head: HeadType;
  txn: TransactionType;
  resp: {
    result: 'SUCCESS' | 'FAILURE' | 'PARTIAL' | 'DEEMED';
    errCode?: string;
    approvalNum?: string;
    reqMsgId: string;
  };
}
```

#### 2. Balance Enquiry (ReqBalEnq / RespBalEnq)

**Purpose**: Check account balance

```typescript
interface BalanceEnquiryRequest {
  head: HeadType;
  txn: TransactionType;
  payer: PayerType;
}

interface BalanceEnquiryResponse {
  head: HeadType;
  resp: ResponseType;
  txn: TransactionType;
  payer: {
    bal: {
      data: string; // Encrypted balance
      code: string;
    };
    ac: AccountType;
  };
}
```

#### 3. Transaction Status (ReqChkTxn / RespChkTxn)

**Purpose**: Check status of a previous transaction

```typescript
interface TransactionStatusRequest {
  head: HeadType;
  txn: TransactionType; // Contains orgTxnId
}

interface TransactionStatusResponse {
  head: HeadType;
  txn: TransactionType;
  resp: {
    result: 'SUCCESS' | 'FAILURE' | 'PENDING';
    errCode?: string;
    opType: string;
  };
}
```

#### 4. Validate Address (ReqValAdd / RespValAdd)

**Purpose**: Validate a VPA before payment

```typescript
interface ValidateAddressRequest {
  head: HeadType;
  txn: TransactionType;
  payer: PayerType;
  payee: PayeeType;
}
```

#### 5. List Accounts (ReqListAccount / RespListAccount)

**Purpose**: Get accounts linked to a mobile number

```typescript
interface ListAccountResponse {
  head: HeadType;
  resp: ResponseType;
  txn: TransactionType;
  accountList: {
    account: {
      accType: 'SAVINGS' | 'CURRENT' | 'DEFAULT';
      accRefNumber: string;
      maskedAccnumber: string;
      ifsc: string;
      name: string;
    }[];
  };
}
```

#### 6. OTP Request (ReqOtp / RespOtp)

**Purpose**: Request OTP for authentication

---

## Authentication & Security

### Credential Types

| Type | SubType | Description |
|------|---------|-------------|
| `PIN` | `MPIN` | Mobile PIN (4-6 digits) |
| `OTP` | `SMS` | SMS-based OTP |
| `OTP` | `EMAIL` | Email-based OTP |
| `AADHAAR` | `AADHAAR-BIO-FP` | Fingerprint biometric |
| `CARD` | `CVV2` | Card CVV verification |

### Encryption

- All sensitive data (PIN, OTP) is encrypted using device-specific keys
- Key Index (`ki`) identifies the encryption key used
- Data is base64 encoded after encryption

```xml
<Cred type="PIN" subType="MPIN">
  <Data code="NPCI" ki="20251210">base64_encrypted_data</Data>
</Cred>
```

### Device Fingerprinting

Device information is captured for fraud prevention:

```xml
<Device>
  <Tag name="MOBILE" value="264812345678"/>
  <Tag name="GEOCODE" value="-22.5609,17.0658"/>
  <Tag name="LOCATION" value="Windhoek"/>
  <Tag name="IP" value="192.168.1.1"/>
  <Tag name="TYPE" value="MOB"/>
  <Tag name="OS" value="Android 14"/>
  <Tag name="APP" value="NamLend 2.6.0"/>
</Device>
```

---

## Integration with NamLend

### Payment Flow for Loan Disbursement

```
1. Client applies for loan → NamLend
2. Loan approved → NamLend creates disbursement
3. Disbursement initiated → IPP ReqPay (NAD amount to client VPA)
4. IPP processes → Routes to client's bank
5. Bank confirms → IPP RespPay (SUCCESS)
6. NamLend updates → Disbursement status = COMPLETED
7. Payment schedule generated → Monthly installments
```

### Payment Flow for Loan Repayment

```
1. Client initiates payment → NamLend app
2. NamLend sends → IPP ReqPay (NAD amount to NamLend VPA)
3. Client authenticates → MPIN via bank app
4. Bank debits client → Credits NamLend
5. IPP responds → RespPay (SUCCESS)
6. NamLend updates → Payment recorded, schedule updated
7. If fully paid → Loan status = SETTLED
```

### Webhook Integration

NamLend receives payment callbacks via webhooks:

```typescript
// supabase/functions/payment-webhook/index.ts
interface IPPWebhookPayload {
  type: 'PAYMENT_COMPLETE' | 'PAYMENT_FAILED' | 'REVERSAL';
  txnId: string;
  orgTxnId?: string;
  amount: number;
  currency: 'NAD';
  payer: string;
  payee: string;
  timestamp: string;
  result: 'SUCCESS' | 'FAILURE';
  errCode?: string;
}
```

---

## Error Codes

### Common Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `U00` | Success | - |
| `U01` | Invalid VPA | Validate address first |
| `U02` | Invalid amount | Check amount format |
| `U03` | Transaction declined | Insufficient funds |
| `U04` | Authentication failed | Retry with correct PIN |
| `U05` | Transaction timeout | Check status, retry if needed |
| `U06` | System error | Retry later |
| `U07` | Invalid transaction | Check transaction ID |
| `U08` | Duplicate transaction | Check if already processed |
| `U09` | Account blocked | Contact bank |
| `U10` | Daily limit exceeded | Wait or use different account |

### Adjustment Flags (Dispute Resolution)

| Flag | Description |
|------|-------------|
| `RRC` | Reversal Request for Collect |
| `RET` | Return/Refund |
| `PBRB` | Pay By RBI |
| `TCC` | Transaction Cannot be Completed |
| `DRC` | Debit Reversal Confirmation |

---

## Implementation Checklist

### Phase 1: Basic Integration

- [ ] Register as PSP with Bank of Namibia
- [ ] Obtain IPP credentials (orgId, certificates)
- [ ] Implement VPA validation (ReqValAdd)
- [ ] Implement payment initiation (ReqPay)
- [ ] Implement status check (ReqChkTxn)
- [ ] Set up webhook endpoint

### Phase 2: Enhanced Features

- [ ] Implement balance enquiry (ReqBalEnq)
- [ ] Add mandate support for recurring payments
- [ ] Implement dispute resolution APIs
- [ ] Add multi-account support

### Phase 3: Production Readiness

- [ ] Complete UAT with BON
- [ ] Security audit and penetration testing
- [ ] Implement monitoring and alerting
- [ ] Go-live certification

---

## Configuration

### Environment Variables

```bash
# IPP Configuration
IPP_ORG_ID=NAMLEND
IPP_ENDPOINT_URL=https://ips.bon.na/api/v2
IPP_CALLBACK_URL=https://namlend.na/webhooks/ipp
IPP_CERT_PATH=/certs/namlend.p12
IPP_CERT_PASSWORD=<secret>

# VPA Configuration
IPP_VPA_HANDLE=@namlend
IPP_MERCHANT_VPA=collections@namlend
```

### TypeScript Types

Types are auto-generated from XSD schemas in `/docs/IPP/XSD's/`:

```typescript
// Generated from UPI-Common.xsd
type PayConstant = 
  | 'PAY' | 'COLLECT' | 'REVERSAL' | 'AUTOREVERSAL' 
  | 'REFUND' | 'CREDIT' | 'DEBIT' | 'BAL';

type ResultType = 'SUCCESS' | 'FAILURE' | 'PARTIAL' | 'DEEMED';

type CredType = 'AADHAAR' | 'OTP' | 'PIN' | 'CARD' | 'PreApproved';

type AccountType = 'SAVINGS' | 'CURRENT' | 'DEFAULT' | 'NRE' | 'NRO';
```

---

## References

- **IPN Scheme Rules**: `/docs/IPP/20251022_IPN Scheme Rules v 0.3_vShared.pdf`
- **Functional Specification**: `/docs/IPP/20251022_IPP Functional Specification Document (FSD)_v10.0.pdf`
- **Technical Specification**: `/docs/IPP/20251117_BON_Instant Payment Solution (IPS) TSD_v0.7_unlocked.pdf`
- **XSD Schemas**: `/docs/IPP/XSD's/`

---

## Support

For IPP integration support:
- **Bank of Namibia**: ips-support@bon.na
- **NamLend Technical**: tech@namlend.na

---

## Participant Role and Responsibilities

We integrate as an **IPS Participant (PSP / SOV provider)** as defined in the IPS FSD and Scheme Rules.

**Key responsibilities:**

- Implement all required IPS/IPP APIs for our selected use-cases.
- Enforce product, scheme, and business rules for our customers (limits, purpose codes, channels).
- Support reconciliation and settlement obligations, including pacs.009-based settlement reports.
- Participate in fraud- and risk-management processes, including consumption of IPS FRM outputs.

These responsibilities must be interpreted together with `IPP_GOVERNANCE.md`, which captures scheme-level obligations and regulatory context.

---

## Connectivity & Security (IPS/IPP)

- **Protocol**: REST/HTTPS with mutual TLS, as per IPS TSD.
- **Digital signatures**:
  - Requests are signed using X.509 certificates issued for IPS participation.
  - IPS verifies payload and header signatures for authenticity and integrity.
- **Keys & certificates**:
  - Stored in HSM or secure vault.
  - Rotated according to IPS key-schedule requirements.
  - Separate keys/certs per environment (DEV, SIT/UAT, PROD).

See also `IPP_TECHNICAL_REFERENCE.md` for message-level details and `SECURITY.md` for broader platform security posture.

---

## Mandatory IPS APIs (Conceptual Coverage)

### Non-financial APIs

- `ReqHbt/RespHbt` – Heartbeat monitoring and liveness.
- `ReqListPsp` / `ReqListAccPvd` – Discovery of participants and account providers.
- `ReqListVae` / `ReqManageVae` – Alias/handle entries.
- `ReqValAdd` / `ReqGetAdd` – Address (VPA/handle) validation and lookups.
- `ReqRegMob` / `ReqOtp` / `ReqSetCre` – Registration, OTP, and credential lifecycle.

### Financial APIs

- `ReqPay/RespPay` – Payment initiation and response for P2P, P2M, cash-in/out, ATM, and bulk flows.
- `ReqAuthDetails/RespAuthDetails` – Pre-debit authorisation and account validation.
- `ReqChkTxn/RespChkTxn` – Transaction status queries for uncertain or timed-out transactions.
- `ReqBalEnq/RespBalEnq` – Balance enquiry.

Our **initial focus for NamLend** is loan disbursement and repayment, built on `ReqPay/RespPay`, `ReqChkTxn/RespChkTxn`, and optionally `ReqBalEnq/RespBalEnq`. Additional flows (P2P, P2M, merchant cash-in/out, ATM cash-out) can be layered on top of the same primitives as our product roadmap evolves.

---

## Error Handling & Resilience (IPS-Aligned)

- Implement full error mapping from IPS/UPI codes to internal error codes (see `API_REFERENCE.md` and `IPP_TECHNICAL_REFERENCE.md`).
- Follow IPS recommendations for **retry vs. status query**:
  - Use idempotent retries for clearly transient failures.
  - Use `ReqChkTxn` to resolve ambiguous or timed-out transactions.
- Ensure idempotent handling of duplicate TxnId/RRN cases so that repeated callbacks or replays do not double-post payments.

These patterns must be reflected in both the edge functions (e.g. `payment-webhook`) and any future dedicated IPS adapter service.
