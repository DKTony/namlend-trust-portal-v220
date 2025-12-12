# Instant Payment Namibia (IPN) / IPP – Governance Overview

**Version**: 0.1.0  
**Last Updated**: December 10, 2025  
**Status**: 🔶 Draft – Engineering interpretation, validate against official PDFs

**Source References (external, not embedded here)**  
- `20251022_IPN Scheme Rules v 0.3_vShared.pdf`  
- `20251022_IPP Functional Specification Document (FSD)_v10.0.pdf`  
- `20251117_BON_Instant Payment Solution (IPS) TSD_v0.7_unlocked.pdf`

> This document distills **principle-level governance concepts** for IPN/IPP to support architecture, design, and integration decisions.  
> Exact legal wording, numeric limits, and contractual clauses must always be taken from the official scheme rules and agreements.

---

## 1. Purpose and Scope

- **IPN (Instant Payment Namibia)** is Namibia’s real-time retail payment scheme.  
- **IPP (Instant Payment Platform)** is the underlying technical platform and message framework (based on UPI-style XML schemas already present in `docs/IPP/XSD's`).

This governance overview focuses on:

- **Scheme-level rules** that affect how NamLend may integrate and operate.  
- **Roles and responsibilities** of each class of participant.  
- **Risk, liability, and dispute principles** relevant for loan disbursement and repayment.  
- **Operational expectations**: SLAs, availability, and compliance alignment.

---

## 2. Scheme Governance Model

### 2.1 Key Roles

| Role | Description | Examples / Notes |
|------|-------------|-------------------|
| **Scheme Owner / Regulator** | Owns the IPN scheme, sets rules, ensures systemic stability and consumer protection. | Bank of Namibia (BON). |
| **Scheme Operator / Switch** | Operates the central IPS/IPP infrastructure, routing messages and enforcing technical rules. | BON or a designated operator. |
| **Participant Bank (Issuer / Acquirer)** | Holds customer accounts, debits/credits accounts as instructed via IPP messages, performs KYC/AML. | Commercial banks in Namibia. |
| **Payment Service Provider (PSP)** | Provides customer-facing apps that initiate IPP transactions and act on responses. | NamLend app, other fintech PSPs. |
| **Merchant / Biller** | Receives or initiates payments (P2M, collect, mandates) through PSPs and banks. | NamLend as loan originator/collector. |
| **Technical Service Provider (TSP)** | Provides connectivity, security, and integration services to PSPs/banks. | Hosted gateway providers, HSM vendors. |

> For exact definitions and responsibilities, see the IPN Scheme Rules v0.3 participant classification section.

### 2.2 Governance Principles

- **Regulatory Oversight** – IPN operates under BON oversight; participants must adhere to BON’s prudential, conduct, and AML/CFT regulations.  
- **Scheme Compliance** – Participation is conditional on strict adherence to the Scheme Rules (legal agreement) and technical standards (TSD/FSD).  
- **Interoperability** – All PSPs and banks must interoperate via the standard IPP message set and XSDs.  
- **Consumer Protection** – Rules emphasise transparency, clear error messaging, and time-bound dispute resolution.  
- **Risk-Based Supervision** – Stronger controls for high-risk participants, channels, or use-cases.

---

## 3. Participation and Onboarding

> Exact eligibility criteria, capital requirements, and legal documentation must be read from IPN Scheme Rules v0.3. Below is a technical-team facing summary.

### 3.1 Eligibility (High-Level)

- **Banks** – Licensed Namibian banks meeting BON capital and risk requirements.  
- **PSPs / Fintechs** – Entities authorised by BON to provide payment services, usually in partnership with one or more banks.  
- **Merchants / Billers** – Must contract with acquiring banks/PSPs and comply with KYC and AML requirements for their own customer base.

### 3.2 Onboarding Phases (Engineering View)

1. **Legal & Compliance Sign-off**  
   - Scheme participation agreement executed.  
   - AML/CFT, KYC, data protection and outsourcing arrangements approved.

2. **Technical Certification**  
   - IPP connectivity established (VPN / leased line / secure internet with mutual TLS).  
   - Message formats validated against XSDs (request/response, error flows, edge cases).  
   - Security protocols (keys, certificates, HSM integration) validated.

3. **Operational Readiness**  
   - 24×7 support contacts shared (NOC, incident bridges).  
   - Monitoring and alerting hooks tested (latency, availability, error-rate thresholds).  
   - Runbooks and escalation paths exchanged.

4. **Go-Live Approval**  
   - Production cutover plan reviewed by scheme operator.  
   - Final go/no-go sign-off.

For NamLend, this typically means partnering with one or more banks as acquiring/issuing partners and integrating through a certified PSP/TSP stack.

---

## 4. Transaction Governance Principles

### 4.1 Allowed Use Cases (Conceptual)

> Exact permitted use cases and any prohibited merchant categories must be checked against the Scheme Rules.

Common IPN use cases relevant to NamLend include:

- **P2M – Credit Push to Customer**  
  - Loan disbursement from NamLend (via partner bank) to a client’s bank account or VPA.  
- **P2M – Credit Push to NamLend**  
  - Loan repayment from client to NamLend’s VPA or settlement account.  
- **P2M – Refunds**  
  - Reversal of excess/duplicate repayments or failed disbursements.  
- **Mandates / Standing Instructions**  
  - Recurring debit instructions for scheduled loan repayments (subject to explicit customer consent).  

### 4.2 Currency and Geography

- **Currency** – All IPN transactions relevant for NamLend are in **NAD (Namibian Dollar)**.  
- **Jurisdiction** – Primary focus is **domestic transactions** where both payer and payee are within Namibia and are subject to BON regulation.

### 4.3 Real-Time Nature and Timeouts

- IPN is intended as a **near real-time** payment system (seconds, not minutes).  
- The scheme defines strict **maximum time limits** for:  
  - Responding to `ReqPay` and similar requests.  
  - Triggering **auto-reversals** when final status cannot be obtained.  
- For engineering, treat these as **hard SLAs** on your IPP connectors and internal workflows; exact values must be taken from the TSD/Scheme Rules.

### 4.4 Limits and Controls (To Be Verified)

> Do **not** hardcode numeric values below without confirming against the official PDFs.

Likely dimensions governed by Scheme Rules:

- **Per-transaction limits** (max amount per payment).  
- **Per-day and per-month aggregate limits** per customer / per VPA.  
- **Channel-specific limits** (e.g. mobile app vs. other channels).  
- **High-risk merchant rules** (e.g. categories excluded or capped).

For NamLend, this impacts:

- Maximum loan disbursement that can be sent in a *single IPN transaction*.  
- Maximum repayment or settlement amount that can be collected in a single transaction.  
- Whether **bulk disbursement** must be split into multiple IPN payments.

---

## 5. Risk Management and AML / CFT

IPN and IPP impose scheme-level requirements that overlay the standard BON risk and AML frameworks.

### 5.1 Participant Obligations (High-Level)

- Perform **KYC** on customers and merchants according to BON standards.  
- Implement **transaction monitoring** and screening (sanctions, PEPs, fraud patterns).  
- Maintain **risk-scoring** for transactions, channels, devices, and counterparties.  
- Enforce **velocity controls and limits** consistent with IPN rules.  
- Provide **audit trails and logs** sufficient for forensic analysis.

### 5.2 Fraud and Abuse Controls

From an engineering perspective, integrate IPP signalling with internal risk controls:

- Use device fingerprints and IPP **Device/Tag** attributes (from XSDs) to enhance risk scoring.  
- Correlate multiple failed authentications or unusual patterns with higher risk states in NamLend’s risk engine.  
- Store and correlate IPP error codes and result statuses with internal fraud models.

---

## 6. Dispute Resolution and Chargebacks (Conceptual)

> The precise dispute categories, timelines, and forms are governed by the Scheme Rules and TSD. Below is a functional framing for system design.

### 6.1 Typical Dispute Categories

- **Technical failures** – Payment debited but not credited, timeouts, duplication.  
- **Authorised but mistaken** – Customer entered wrong VPA/account or amount.  
- **Unauthorised / Fraudulent** – Payment initiated without customer consent or via compromised credentials.  
- **Merchant disputes** – Non-delivery of goods/services, overcharging, or refunds.

### 6.2 Time Windows and Responsibilities

- Scheme rules typically define **strict time windows** for raising disputes, providing evidence, and issuing resolutions.  
- Responsibility allocation across **payer bank**, **payee bank**, **PSPs**, and **scheme operator** is specified in the Scheme Rules.  
- Engineering impact:  
  - Store all correlation identifiers (IPP `msgId`, `txnId`, RRN equivalents).  
  - Retain logs and payload summaries for at least the dispute window plus regulatory retention.

### 6.3 Hooks for NamLend

NamLend should ensure:

- Every payment or disbursement record is mapped to an IPP transaction identifier set.  
- Internal **collections and customer support tools** expose IPN/IPP identifiers and statuses.  
- Workflows exist for **initiating refunds/reversals** via IPP where scheme rules permit.

---

## 7. Data Governance, Privacy, and Audit

### 7.1 Data Minimisation and Protection

- Only data **required for routing, risk, and compliance** should be sent via IPP messages.  
- Sensitive data (e.g. credentials, PAN-equivalents) must be **tokenised or encrypted**, not stored in raw form in NamLend systems.  
- Adoption of **role-based access control** and detailed **audit logs** for any staff access to IPP transaction data.

### 7.2 Logging and Audit Trails

- Maintain **immutable audit logs** for IPP interactions (request, response, webhook callbacks, and internal state transitions).  
- Align audit retention with:  
  - BON requirements.  
  - Scheme Rules retention periods.  
  - Internal NamLend governance (e.g. existing `audit_logs` and `state_transitions` tables).

---

## 8. Alignment with NamLend Architecture

### 8.1 Relevant Internal Components

- **Loan Management** – `loans`, `disbursements`, `payment_schedules`, `payments`.  
- **Risk and Compliance** – `credit_scores`, `state_transitions`, `audit_logs`.  
- **Notification Infrastructure** – SMS, email, in-app notifications for payment status changes.

### 8.2 Governance-Critical Design Decisions

- Every IPP transaction must be **traceable** end-to-end: customer → NamLend → bank → IPP → counterparty.  
- Internal workflows (e.g. marking loans as *settled*) must respect **finality semantics** of IPN – only treat a payment as final when IPP indicates **SUCCESS** (and any scheme-specific reconciliation conditions are met).  
- For **reversals and disputes**, state transitions in NamLend must preserve historical states rather than overwrite them, ensuring a full audit trail.

---

## 9. Validation Checklist Against Official PDFs

Use this checklist when reviewing this document against the three IPN/IPP PDFs:

- [ ] Participant roles and definitions match the Scheme Rules v0.3.  
- [ ] All **limits and thresholds** are documented elsewhere with exact values from the official rules.  
- [ ] Dispute categories and timelines align with scheme-specified flows.  
- [ ] Risk and AML obligations are consistent with both BON regulations and Scheme Rules.  
- [ ] References to IPP messages and flows are consistent with FSD v10.0 and TSD v0.7.  
- [ ] Any placeholders or assumptions are replaced with confirmed values or explicit “not defined” notes.
