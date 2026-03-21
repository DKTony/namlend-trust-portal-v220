# Instant Payment Namibia (IPN) / IPP – Technical Reference

**Version**: 0.1.0  
**Last Updated**: December 10, 2025  
**Status**: 🔶 Draft – Engineering interpretation, validate against official TSD/XSD

**Primary Technical Sources (not embedded here)**

- `20251117_BON_Instant Payment Solution (IPS) TSD_v0.7_unlocked.pdf`
- IPP XSDs in `docs/IPP/XSD's/` (e.g. `UPI-Common.xsd`, `UPI-Payment.xsd`, `UPI-AuthDetails.xsd`, `UPI-Meta-BalEnq.xsd`, `UPI-Meta-ChkTxn.xsd`, etc.)

> This document focuses on the **message structure, key fields, and technical constraints** for IPN/IPP, from NamLend’s integration perspective. Exact field definitions and enumerations must always be confirmed against the official XSDs and TSD.

---

## 1. Message Framework

### 1.1 Namespaces and Schema

- Root namespace (from XSDs): `xmlns:upi="http://npci.org/upi/schema/"`.
- Messages are XML documents whose root elements are defined per operation, e.g.:
  - `ReqPay` / `RespPay` (see `UPI-Payment.xsd`).
  - `ReqAuthDetails` / `RespAuthDetails` (see `UPI-AuthDetails.xsd`).
  - `ReqBalEnq` / `RespBalEnq` (see `UPI-Meta-BalEnq.xsd`).
  - `ReqChkTxn` / `RespChkTxn` (see `UPI-Meta-ChkTxn.xsd`).

The XSDs import `UPI-Common.xsd`, which defines common simple and complex types used across all messages.

### 1.2 High-Level Structure

Most request/response pairs share a common shape:

- `Head` – Envelope metadata (version, timestamp, organisation IDs).
- `Txn` – Transaction metadata (IDs, timestamps, category, references).
- `Payer` / `Payee(s)` – Party details including address (VPA/account), name, and account info.
- `Amount` – Amount and currency, often with optional splits.
- `Resp` – Result status, error codes, and optional references.
- Optional **Meta** sections – device info, risk scores, custom tags.

---

## 2. Key Common Types (from UPI-Common.xsd)

> The details below are derived from broad patterns in the XSDs and must be cross-checked against the actual schema.

### 2.1 `headType`

Attributes (examples from XSD):

- `ver` – Protocol version (e.g. `2.0`).
- `ts` – Message timestamp.
- `orgId` – Originating organisation (NamLend/PSP/bank identifier).
- `msgId` – Unique message identifier for idempotency and tracking.
- `prodType` – Product type (e.g. `UPI`/`IPS`).
- Optional pagination fields for list-style responses.

### 2.2 `payTrans`

Complex type carrying transaction-level attributes. Typical attributes include:

- `id` – Internal transaction ID.
- `note` – Free-text description.
- `refId` / `custRef` – Customer- or merchant-facing reference.
- `ts` – Transaction timestamp.
- `type` – Operation type (`payConstant` enumeration).
- `subType` – Transaction sub-type (`txnSubType` enumeration, e.g. `PAY`, `COLLECT`, `MANDATE`, `REFUND`).
- `orgMsgId`, `orgTxnId`, `orgRrn` – Original identifiers for linked/related transactions.
- `initiationMode` – Channel or initiation method code.

The `payTrans` complex type can also embed:

- `RiskScores` – `riskScoresType`: provider, type, value, etc.
- `Rules` – `rulesType`: additional behavioural rules like expiry or SCA requirements.
- `QR` – QR payload data where relevant.

### 2.3 `amountType`

Attributes:

- `value` – Monetary amount as string.
- `curr` – Currency code (for NamLend, `NAD`).

Child elements:

- Optional `Split` entries with attributes like `name` (from `amountSplitConstant`) and `value` to encode fee/service disaggregation.

### 2.4 Party and Account Types

- `payerType` / `payeeType` – Complex types containing:
  - Attributes: `addr` (VPA or proxy address), `name`, `type`, etc.
  - Child `Ac` element with `accountType`.
  - Optional `Creds` (credentials), `Device`, `Info` blocks.

- `accountType` – List of `Detail` elements with `name` from `accountDetailType` (e.g. `IFSC`, `ACNUM`, `MMID`) and `value` strings, plus an `addrType` attribute to classify address type (`AADHAAR`, `ACCOUNT`, `MOBILE`, `CARD`).

### 2.5 Credentials and Security Types

- `credType` – e.g. `OTP`, `PIN`, `CARD`, `AADHAAR`.
- `credSubType` – e.g. `MPIN`, `ATMPIN`, `SMS`, `EMAIL`, `HOTP`, `TOTP`.
- `credsType` – Contains one or more `Cred` children, each with:
  - `Data` element: encrypted credential payload with `code` and `ki` (key index).
  - Optional `Auth`, `Otp`, `KycReqInfo`, `Meta` elements.

NamLend usually does **not** handle raw credential data; this is managed by banks/PSPs. However, it must be aware of credential types for risk and UX purposes.

### 2.6 Result and Error Types

From `resultType`, `txnCnfrmOrgStatus`, and `respType`-like structures:

- `result` – Final or interim result (`SUCCESS`, `FAILURE`, `PENDING`, `PARTIAL`, `DEEMED`, etc.).
- `errCode` – Scheme-specific error/response code.
- `opType` / `type` – Operation type (e.g. from `payConstant` or adjustment enums).
- Optional `Ref` lists and `Consent` blocks.

NamLend should treat `result` and `errCode` as **canonical signals** for updating internal payment states.

---

## 3. Message Patterns by API

### 3.1 Payment (ReqPay / RespPay)

- **Root elements**: `ReqPay`, `RespPay`.
- **Request** typically includes:
  - `Head` (`headType`).
  - `Meta` (optional tags).
  - `Txn` (`payTrans`).
  - `Payer` and `Payees` (one or multiple).
- **Response** includes:
  - `Head`.
  - `Txn` (possibly enriched with scheme IDs).
  - `Resp` with `result`, `errCode`, and references.

### 3.2 Balance Enquiry (ReqBalEnq / RespBalEnq)

- Defined in `UPI-Meta-BalEnq.xsd`.
- **Request**: `Head`, `Txn`, `Payer` (with `Ac` account details).
- **Response**:
  - `Head`, `Resp`, `Txn`.
  - `Payer` containing:
    - `Bal` element with encrypted `Data` (attributes `code`, `ki`).
    - `Ac` with `accountType` details.

### 3.3 Transaction Status Check (ReqChkTxn / RespChkTxn)

- Defined in `UPI-Meta-ChkTxn.xsd`.
- **Request**: `Head`, `Txn` with references to the original transaction.
- **Response**:
  - `Head`, `Txn`.
  - `Resp` containing:
    - `Ref` list.
    - Optional `Consent`.
    - Attributes `reqMsgId`, `result`, `errCode`, `opType` (from `payConstant`).

### 3.4 Address Validation, Account Listing, OTP

- `ReqValAdd` / `RespValAdd` – Validate a beneficiary address/VPA.
- `ReqListAccount` / `RespListAccount` – List accounts linked to a mobile/identifier.
- `ReqOtp` / `RespOtp` – Request and receive OTP-related data for authentication.

These are primarily used to **improve UX and reduce failed payments** (invalid addresses) and to satisfy SCA/KYC requirements.

---

## 4. Correlation, Idempotency, and Mapping to NamLend

### 4.1 Key Identifiers

Important identifiers in the IPP messages typically include:

- `Head.msgId` – Unique per message; used for idempotency and logging.
- `Txn.id` – Transaction identifier within the IPP system.
- `Txn.orgTxnId` / `orgMsgId` – Original identifiers when referencing prior transactions.
- Scheme-specific **RRN** or equivalent reference numbers (not named explicitly in the XSD excerpt but standard in such systems).
- `custRef` – Customer-facing reference string.

Mapping to NamLend:

- Store a **composite key** in your ledgers linking:
  - Internal IDs: loan ID, disbursement ID, payment ID.
  - IPN identifiers: `msgId`, `txn.id`, `orgTxnId`, scheme reference.
- Ensure all reconciliation, dispute handling, and status checks use this key set.

### 4.2 Idempotency Strategy (Integration Level)

- NamLend must treat repeated `RespPay` or delayed responses as **idempotent** operations for the same `msgId`/`txn.id`.
- Connector layer should maintain an idempotency store keyed by `msgId` to avoid double-crediting or double-debiting.
- When retrying `ReqPay` due to network issues, either:
  - Reuse the same `msgId` and track at connector level, or
  - Use a new `msgId` but attach a stable **business reference** (e.g. `custRef` = loan-payment-ID) so downstream logic can deduplicate.

---

## 5. Security and Cryptography Hooks

### 5.1 Credential Transport

From the XSDs:

- Credentials are carried in `credsType` and nested `Cred` elements.
- Sensitive data is inside `Data` child elements with:
  - Text = encrypted credential bytes (often base64).
  - Attributes:
    - `code` – Algorithm or scheme identifier.
    - `ki` – Key index pointing to a key in an HSM/secure store.

NamLend design principles:

- **Never** store raw credential payloads beyond what is strictly required for troubleshooting (and then only in encrypted form if permitted).
- Prefer **opaque handling** via bank or PSP SDKs/connectors.
- Use **versioned keys** and rotate according to scheme and BON requirements.

### 5.2 Device and Risk Signals

`deviceType`, `riskScoresType`, and related structures can carry:

- Device identifiers (e.g. mobile number, device ID, OS, app version).
- Geo-location or IP-based tags.
- Risk scores from banks or third-party risk providers.

NamLend should:

- Ingest non-PII signals into its **risk engine**.
- Avoid storing unnecessary PII, following data minimisation principles in `IPP_GOVERNANCE.md`.

---

## 6. Operational Constraints (Conceptual)

### 6.1 Timeouts and Retries

- The TSD defines **maximum response times** and rules for auto-reversals.
- Integration must:
  - Set connector-level timeouts compatible with IPN limits.
  - Trigger `ReqChkTxn` for any ambiguous or timed-out transaction.
  - Avoid blind retries that might violate scheme or bank policies.

### 6.2 Versioning and Compatibility

- `pspVersionNo`, `pspVersionDesc`, and similar fields indicate version alignment.
- Integration should:
  - Track which version of the IPP spec it targets.
  - Expose version metadata in monitoring dashboards and logs.
  - Ensure backward-compatible changes are safe before rollout.

### 6.3 Environments

- Expect at least:
  - **Certification/UAT** environment.
  - **Production** environment.

NamLend must:

- Keep **endpoint URLs, certificates, and keys** separate per environment.
- Prevent any accidental cross-environment leakage of real customer data.

---

## 7. Alignment with NamLend Codebase

### 7.1 Where IPP Integration Fits

- `paymentGateway` service – High-level provider abstraction including IPN as a provider.
- Potential `ippService` – Dedicated module for IPP-specific message building/parsing (planned).
- Supabase Edge Functions – Webhook handlers for asynchronous IPN callbacks.

### 7.2 Data Model Considerations

- Ensure the following tables can store IPN identifiers and statuses without schema changes later:
  - `payments` – IPN references, error codes, result.
  - `disbursements` – IPN references for outbound credit pushes.
  - `payment_transactions` or equivalent – one row per IPN message/transaction.
  - `audit_logs` / `state_transitions` – changes to IPN-related state.

---

## 8. Validation Checklist Against TSD/XSD

Before declaring IPP integration technically compliant:

- [ ] Validate all messages against the official XSDs (schema validation in CI).
- [ ] Confirm enumeration values (`payConstant`, `txnSubType`, `credType`, etc.) with the TSD.
- [ ] Verify that all mandatory fields per operation are populated.
- [ ] Confirm mapping of error codes to internal error taxonomy.
- [ ] Test idempotency behaviour and duplicate handling under network failure scenarios.
- [ ] Verify encryption and key management practices with PSP/bank and scheme security guidelines.
