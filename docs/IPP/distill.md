Below are first-draft .md files matching the filenames in your screenshot. They are structured for handover/readability and grounded in the IPS Product Rules, IPS FSD, IPS Scheme Rules, IPS TSD and the UPI Error & Response Codes documents you shared.

You can copy each block into its own file.

<!-- context.md -->

# Project Context

## 1. Overview

This repository documents the design and implementation approach for integrating our systems with the national **Instant Payment Solution (IPS)** operated under the Instant Payment Programme (IPP) in Namibia.

The integration:

- Connects our customer channels (mobile app, USSD, back-office tools) to the IPS switch.
- Implements IPS use-cases (P2P, P2M, G2P/B2P, merchant cash-in/out, ATM cash-out) according to the FSD and Product Rules.
- Ensures compliance with Scheme Rules, regulatory requirements and technical specifications.
- Provides a foundation for NamLend-style/retail financial products to use IPS as a primary rail.

## 2. Business Objectives

- Provide **real-time, 24/7/365 low-value payments** between bank accounts and e-money wallets.
- Support **inclusive financial services** across rural and informal sectors by leveraging mobile channels and USSD.
- Offer a **single integration layer** to the IPS for internal products (lending, savings, disbursements, collections).
- Ensure **regulatory and scheme compliance** and reduce onboarding effort for new services.
- Facilitate **future extensibility** (new use-cases, new participants, new MNOs, new FRM rules).

## 3. External References

Authoritative external specs:

- **IPS Product Rules** – user journeys, transaction/merchant rules, limits and frequency, handle/mobile number rules.:contentReference[oaicite:1]{index=1}
- **IPS Functional Specification Document (FSD)** – functional flows, registration, alias directory, dispute management, settlement, pricing and business rules.:contentReference[oaicite:2]{index=2}
- **IPS Scheme Rules** – governance, compliance, fees, participant obligations, operational rules.:contentReference[oaicite:3]{index=3}
- **IPS Technical Specification Document (TSD)** – API definitions, message formats, security, alias model, registration and payment flows, negative scenarios.:contentReference[oaicite:4]{index=4}
- **UPI Error & Response Codes** – base error catalogue adapted for IPS error handling.:contentReference[oaicite:5]{index=5}

These documents are the **source of truth** for behaviour. This repository documents how our implementation conforms to them.

## 4. Scope

### In scope

- IPS participant integration for:
  - P2P send money (mobile & USSD).
  - P2M merchant payments (mobile & USSD).
  - Merchant cash-in / cash-out and ATM cash-out.
  - G2P/B2P bulk payment receiving support (downstream processing only).
- Registration and alias/handle management (mobile & USSD).
- Error handling and reconciliation aligned to IPS specs.
- Logging, monitoring, and basic fraud-rule integration (using IPS FRM outputs).

### Out of scope (for now)

- Building or operating IPS core switch (handled by IPN).
- Internal credit-decision engines and scoring.
- Non-IPS rails (card schemes, EFT, ENCR/EEFT).
- Non-Namibian IPS variants.

## 5. Stakeholders

- **Instant Payments Namibia (IPN)** – scheme operator and IPS platform.
- **Bank of Namibia (BoN)** – regulator and owner of IPS rules and oversight.
- **Our Institution** – IPS participant (issuer/acquirer) integrating to IPS.
- **Merchants & Agents** – Category A/B merchants, cash-in/out agents.
- **End-users** – customers using mobile app, USSD, ATM channels.

## 6. System Summary

At a high level:

- Customer channels call an internal **Payment Orchestrator**.
- The orchestrator uses an **IPS Adapter** to call IPS APIs (ReqRegMob, ReqValAdd, ReqPay, ReqAuthDetails, ReqChkTxn, etc.).
- Alias Directory and handle management follow IPS centralised/decentralised models (mobile-number short alias + long-form full aliases).:contentReference[oaicite:6]{index=6}
- Transactions are logged in a local **Transaction Store** and reconciled with IPS settlement reports (pacs.009 based).

## 7. Handover Expectations

This documentation is written so that a new technical team can:

- Understand the external IPS scheme context.
- Maintain and extend the integration without re-reading the full specs immediately.
- Map IPS flows and codes to our internal services, data model and monitoring.
- Safely onboard new use-cases while remaining scheme-compliant.

Refer to the other `.md` files in this folder for deep dives into architecture, APIs, security, testing and technical debt.

<!-- ARCHITECTURE.md -->

# System Architecture

## 1. High-Level View

Logical layers:

1. **Channel Layer**
   - Mobile banking app (iOS/Android).
   - Central USSD menus.
   - Back-office tools (operations, reconciliation, disputes).

2. **Integration Layer**
   - API Gateway (exposes our REST APIs to channels).
   - Authentication/Identity Provider (IdP).
   - IPS Integration Service (Payment Orchestrator + IPS Adapter).

3. **Core Systems**
   - Core Banking System / Wallet platform (Store of Value).
   - Customer & KYC systems.
   - Risk/Fraud engine (internal + IPS FRM feed).

4. **External IPS Layer**
   - IPS Platform (switch, directory, FRM, settlement).
   - Alias Directory maintained by IPN.
   - IPN back-office & settlement services.

FSD and TSD describe IPS as an **API-based switch** providing financial and non-financial APIs for payments, registration, alias management and back-office flows.

## 2. Core Components

### 2.1 IPS Integration Service

Responsibilities:

- Implements IPS API clients (REST over HTTPS).
- Maps internal DTOs to IPS XML/JSON payloads.
- Handles digital signatures, certificates and message security.
- Performs synchronous orchestration of:
  - ReqAuthDetails / RespAuthDetails
  - ReqPay / RespPay
  - ReqChkTxn / RespChkTxn
- Normalises IPS error codes into an internal error model.

### 2.2 Alias & Registration Service

Responsibilities:

- Interface with IPS Alias Directory and Registration APIs:
  - ReqRegMob / RespRegMob.
  - ReqValAdd / RespValAdd.
  - ReqGetAdd / RespGetAdd.
  - ReqManageVae / RespManageVae.:contentReference[oaicite:9]{index=9}
- Maintain local cache of:
  - Device bindings.
  - IPS handles, mobile-number mappings.
  - Merchant handles and unique codes.
- Provide a single abstraction to channels: "resolve mobile / handle / merchant code".

### 2.3 Transaction Service

Responsibilities:

- Persist payment intents and final statuses.
- Generate transaction references (RRN/TxnId) consistent with TSD requirements.
- Support idempotency & duplicate detection.
- Provide query/search APIs for back-office and customer history.

### 2.4 Reconciliation & Settlement Module

Responsibilities:

- Ingest IPS net settlement reports and pacs.009 settlement messages.
- Reconcile:
  - IPS transaction logs vs internal ledger vs settlement amounts.
- Produce exception reports and re-processing queues.

### 2.5 Monitoring & Logging

- Structured logging around IPS flows (request-id, TxnId, alias, purpose code, amount).
- Dashboards:
  - TPS, latency (P95/P99).
  - Failure rates by error code, API, channel.
- Alerts on:
  - Connectivity failures.
  - IPS heartbeat failures (ReqHbt/RespHbt).:contentReference[oaicite:11]{index=11}

## 3. Deployment Topology

- All IPS-facing services run in a **restricted network segment** with outbound connectivity to IPS endpoints only.
- Certificates and signing keys are stored in an HSM / secure vault.
- Distinct environments:
  - **DEV** – IPS mock / stubs.
  - **SIT/UAT** – IPS certification environment.
  - **PROD** – live IPS.

## 4. Sequence Overviews

### 4.1 P2P Payment (Mobile)

1. Mobile App → API Gateway: `POST /payments`
2. Gateway → IdP: validate access token.
3. Gateway → IPS Integration Service: create IPS payment.
4. IPS Integration:
   - Resolve payee alias/mobile via ReqValAdd.
   - Call ReqAuthDetails if required.
   - Call ReqPay (debit + credit).
5. IPS → Integration: RespPay, RespAuthDetails.
6. Integration → Core Banking: apply ledger entries if model is “off-us first”.
7. Integration → App: final status + reference.
8. Transaction persisted and available for reconciliation.

Flows align with FSD payment & alias diagrams and TSD payment/validation APIs.

### 4.2 Registration (Mobile)

1. App collects device footprint, mobile number and SoV selection.
2. IPS Registration flow via ReqRegMob (card, wallet PIN or national ID).
3. IPS confirmation plus alias directory registration (ReqValAdd/ReqGetAdd).
4. Local device binding & alias cache updated.

## 5. Architectural Principles

- **Spec-first**: IPS specs drive integration contracts; internal models adapt.
- **Loose coupling**: IPS APIs wrapped behind internal interfaces to minimise future changes.
- **Idempotency**: all payment operations safe under retries.
- **Security-first**: least-privilege, encrypted storage, minimal PII exposure.
- **Observability**: every IPS call traceable end-to-end.

<!-- SERVICES.md -->

# Services

This document maps logical services/modules and their responsibilities.

## 1. Channel Services

### 1.1 Mobile Banking App

- Registration & device binding UI.
- P2P send money (mobile number, handle, QR).
- P2M merchant payments (handle, merchant code, QR).
- Merchant cash-in/out and ATM cash-out flows.
- Profile management (PIN set/reset, preferred SoV).

User journeys are aligned to IPS Product Rules for P2P and P2M flows.:contentReference[oaicite:13]{index=13}

### 1.2 USSD Channel

- First-time registration and PIN setup for feature phones.
- P2P & P2M flows via USSD menus.
- Balance enquiry.

## 2. Integration & Domain Services

### 2.1 IPS Integration Service

- Encapsulates IPS APIs & error model.
- Handles certificates, digital signatures, message formats.
- Provides synchronisation with IPS Alias Directory and registration state.

### 2.2 Alias & Registration Service

- Abstraction over IPS alias/handle and mobile-number rules.
- Local persistence of:
  - `AliasRegistration`
  - `DeviceBinding`
  - `MerchantHandle`.

### 2.3 Payment Orchestrator

- Cross-channel payment orchestration:
  - Validation & limits enforcement.
  - Fraud pre-screening and FRM integration.
  - Idempotency and duplicate detection.
- Supports:
  - P2P, P2M, Merchant Cash-In/Out, ATM Cash-Out.
  - Bulk disbursement receiving (G2P/B2P).

### 2.4 Ledger Integration

- Handles debits/credits in core banking / wallet.
- Maintains mapping between IPS TxnId and internal ledger references.

### 2.5 Reconciliation & Reporting Service

- Processes IPS settlement files and reports.
- Generates:
  - Daily settlement reports.
  - Break sheets and exception queues.

## 3. Support Services

### 3.1 Configuration Service

- Centralised configuration for:
  - Transaction limits & thresholds.
  - Purpose codes and initiation modes.
  - Channel-specific parameters (time-outs, retries).

### 3.2 Notification Service

- Sends SMS / push notifications for:
  - Successful or failed transactions.
  - Registration and PIN changes.

### 3.3 Fraud & Risk Service

- Integrates with IPS FRM outputs and internal rules engine.
- Maintains customer, device and alias-level risk scores.

## 4. External Dependencies

- IPS endpoints (non-financial & financial APIs).
- IdP / IAM.
- SMS gateway, push notification provider.
- Core Banking & wallet APIs.

<!-- API_REFERENCE.md -->

# API Reference

> NOTE: This file documents **our** REST APIs and how they map to IPS APIs. IPS API wire-level details remain governed by the TSD.:contentReference[oaicite:17]{index=17}

## 1. Authentication

All APIs are protected with OAuth2 access tokens (JWT).

Header:

- `Authorization: Bearer <token>`
- `X-Correlation-Id: <uuid>` – end-to-end tracing.

---

## 2. Public Channel APIs

### 2.1 `POST /v1/registration`

Initiates user registration and IPS onboarding for the selected SoV.

**Request**

````json
{
  "customerId": "string",
  "mobileNumber": "26481XXXXXXX",
  "storeOfValueId": "ACCOUNT|WALLET",
  "onboardingMethod": "CARD|NATIONAL_ID|WALLET_PIN",
  "channel": "MOBILE_APP|USSD",
  "deviceFingerprint": "string"
}


Processing

Calls IPS ReqRegMob and RespRegMob.

20251117_BON_Instant Payment So…

On success, registers alias in the IPS Alias Directory (ReqValAdd / ReqGetAdd).

Response

{
  "status": "PENDING|SUCCESS|FAILED",
  "registrationId": "uuid",
  "message": "string"
}

2.2 POST /v1/payments

Creates a new IPS payment (P2P/P2M/merchant cash-in/out).

Request

{
  "payerCustomerId": "string",
  "sourceSoVId": "uuid",
  "amount": 150.00,
  "currency": "NAD",
  "initiatorChannel": "MOBILE_APP|USSD|BACKOFFICE",
  "paymentType": "P2P|P2M|CASH_IN|CASH_OUT|ATM_CASH_OUT",
  "payeeIdentifierType": "MOBILE|HANDLE|MERCHANT_CODE|QR",
  "payeeIdentifier": "string",
  "purposeCode": "PERS|BUSN|G2P|B2P",
  "clientReference": "string"
}


Processing

Validates transaction against IPS product limits and local config.

Resolves payee using IPS alias directory if applicable.

Calls IPS ReqAuthDetails where required.

Executes IPS ReqPay and awaits RespPay.

20251117_BON_Instant Payment So…

Response

{
  "paymentId": "uuid",
  "ipsTxnId": "string",
  "status": "SUCCESS|FAILED|PENDING|TIMEOUT",
  "error": {
    "code": "string",
    "source": "IPS|INTERNAL",
    "message": "human friendly message"
  }
}

2.3 GET /v1/payments/{paymentId}

Fetches the latest status for a payment.

If local status is PENDING, triggers IPS ReqChkTxn / RespChkTxn.

20251117_BON_Instant Payment So…

2.4 GET /v1/balances/{storeOfValueId}

Returns the balance from the linked SoV (via core banking / wallet) after calling IPS ReqBalEnq if required by channel rules.

3. Error Handling

IPS error and response codes are mapped to internal error codes using the adapted UPI error catalogue.

20240913_IPP Error and Response…

3.1 Structure
{
  "code": "INSUFFICIENT_FUNDS",
  "ipsCode": "IE",
  "httpStatus": 400,
  "message": "Insufficient funds – funds blocked for a mandate",
  "retryable": false
}


Where:

ipsCode is an IPS/UPI response code (e.g. 00, 59, IE, XF).

20240913_IPP Error and Response…

retryable indicates whether the client should attempt again (e.g. timeouts).

3.2 Common Mappings (examples)
IPS Code Description (UPI/IPS) Internal Code
00 Approved / completed successfully SUCCESS
59 Suspected fraud / declined on risk score RISK_DECLINED
IE Adequate funds not available due to blocked mandate funds INSUFFICIENT_FUNDS
UP PSP timeout IPS_TIMEOUT
UB Internal exception at beneficiary side IPS_REMOTE_FAILURE
XB/XC Invalid transaction / no suitable response code IPS_GENERIC_FAILURE

Clients must not surface raw IPS codes to end-users; use mapped, localised messages instead.

4. Internal APIs

Document internal service-to-service APIs (gRPC/REST) here as the implementation stabilises:

payment-orchestrator ↔ ips-adapter

payment-orchestrator ↔ ledger-integration

alias-service ↔ ips-adapter


---

```markdown
<!-- DATABASE_SCHEMA.md -->

# Database Schema

This schema is logical; adapt to the actual RDBMS / ORM.

## 1. Core Tables

### 1.1 `customers`

- `id` (PK)
- `external_ref` (unique reference from CBS/CRM)
- `mobile_number`
- `kyc_level`
- `status`

### 1.2 `store_of_value_accounts`

- `id` (PK)
- `customer_id` (FK → customers.id)
- `provider` (`CORE_BANK|WALLET`)
- `account_number_or_id`
- `currency`
- `status`
- `created_at`, `updated_at`

### 1.3 `device_bindings`

- `id` (PK)
- `customer_id` (FK)
- `device_fingerprint`
- `channel` (`MOBILE_APP|USSD`)
- `status` (`ACTIVE|BLOCKED|REVOKED`)
- `created_at`, `updated_at`

### 1.4 `aliases`

Represents full-form handles & aliases.

- `id` (PK)
- `customer_id` (FK, nullable for merchant aliases)
- `alias_value` (e.g. `john123@bankA`)
- `alias_type` (`LONG_HANDLE|MOBILE_NUMBER|MERCHANT_CODE`)
- `default_for_sov_id` (FK → store_of_value_accounts.id, nullable)
- `registered_with_ips` (bool)
- `ips_reference` (e.g. IPS alias ID)
- `status`
- `created_at`, `updated_at`

Alias rules (allowed characters, centralised vs decentralised model) follow TSD alias definition and FSD alias directory rules.

### 1.5 `payments`

- `id` (PK, UUID)
- `ips_txn_id`
- `client_reference`
- `payer_sov_id` (FK)
- `payee_alias_id` (FK → aliases.id, nullable)
- `payee_identifier_type`
- `payee_identifier_value`
- `amount`, `currency`
- `payment_type` (`P2P|P2M|CASH_IN|CASH_OUT|ATM_CASH_OUT|BULK`)
- `purpose_code`
- `channel`
- `status` (`INITIATED|PENDING|SUCCESS|FAILED|REVERSED`)
- `ips_error_code`
- `internal_error_code`
- `requested_at`
- `completed_at`

Indexes:

- `(ips_txn_id)`
- `(client_reference)`
- `(status, requested_at)`

### 1.6 `reconciliation_items`

- `id` (PK)
- `payment_id` (FK)
- `settlement_date`
- `settlement_cycle`
- `gross_amount`
- `net_amount`
- `fees`
- `direction` (`PAYIN|PAYOUT`)
- `status` (`UNMATCHED|MATCHED|DISPUTED`)

### 1.7 `error_codes`

- `code` (PK) – internal code.
- `ips_code` – IPS/UPI code.:contentReference[oaicite:26]{index=26}
- `description`
- `http_status`
- `retryable` (bool)

## 2. Audit & Logging

### 2.1 `ips_api_logs`

- `id` (PK)
- `correlation_id`
- `api_name` (`ReqPay`, `RespPay`, `ReqAuthDetails`, etc.)
- `direction` (`OUTBOUND|INBOUND`)
- `request_payload` (encrypted or truncated)
- `response_payload`
- `status_code`
- `created_at`

## 3. Future Extensions

- **`mandates`** for recurring/standing instructions.
- **`disputes`** for chargebacks, pre-arbitration and arbitration aligned to FSD dispute management flows.:contentReference[oaicite:27]{index=27}

<!-- FUNCTIONALITY_MAP.md -->

# Functionality Map

This file links business use-cases to channels, IPS flows and internal services.

## 1. Use-Case Overview

| Use-Case             | Channel(s)         | IPS Flow(s)                                | Internal Services                          |
|----------------------|-------------------|--------------------------------------------|--------------------------------------------|
| P2P Send Money       | Mobile, USSD      | Alias resolve + ReqAuthDetails + ReqPay    | Payment Orchestrator, IPS Integration      |
| P2M Merchant Pay     | Mobile, USSD      | Merchant alias/code + ReqPay               | Payment Orchestrator, IPS Integration      |
| Merchant Cash-In     | Mobile, USSD      | Merchant cash-in flow (FSD §12.8/12.9)     | Payment Orchestrator, IPS Integration      |
| Merchant Cash-Out    | Mobile, USSD, ATM | Merchant cash-out + ReqPay                 | Payment Orchestrator, IPS Integration      |
| ATM Cash-Out         | ATM               | ATM cash-out flow                          | ATM Switch Adapter, IPS Integration        |
| Registration         | Mobile, USSD      | ReqRegMob + Alias Directory ops            | Alias Service, IPS Integration             |
| Balance Enquiry      | Mobile, USSD      | ReqBalEnq                                  | IPS Integration, Ledger Integration        |
| Bulk Payments (G2P)  | Back-office       | Bulk payment flow                          | File Ingestion, Payment Orchestrator       |
| Disputes             | Back-office       | Dispute/chargeback flows                   | Dispute Service, Reconciliation            |

Flows and behaviour are derived from IPS FSD sections on functional flows and user journeys.

## 2. Registration & Alias

- **First-time Mobile Registration**
  - Channel: Mobile app.
  - IPS: Device binding, registration via card/ID/wallet PIN, alias creation.
  - Services: Alias Service, IPS Integration, Device Binding.

- **USSD Registration**
  - Channel: Central USSD.
  - IPS: USSD registration flows, mobile number rules.
  - Services: USSD Gateway, IPS Integration.

## 3. Payment Scenarios

### 3.1 P2P using Mobile Number

- Use alias directory short alias (mobile number) linked to one or more long handles.:contentReference[oaicite:29]{index=29}
- Our system:
  - Resolves payee mobile number to IPS handle.
  - Executes P2P ReqPay.
  - Handles negative scenarios as per FSD (e.g. unavailable participant, duplicate RRN).

### 3.2 P2M using Merchant Unique Code / QR

- Merchant registration assigns:
  - IPS handle.
  - Merchant unique numeric code & QR payload.
- Customer can pay via:
  - Entering merchant code.
  - Scanning QR → merchant handle/code.

## 4. Operational Functions

- **Reconciliation**
  - Inputs: IPS net settlement reports, pacs.009 settlement messages.
  - Outputs: internal settlement postings, exception lists.

- **Disputes**
  - Stages: Dispute → Chargeback → Pre-arbitration → Arbitration (FSD §15).:contentReference[oaicite:33]{index=33}

## 5. Future Functionality

Potential extensions:

- Request-to-Pay flows (payer-authorised pull).
- Standing mandates.
- Additional purpose codes & initiation modes when introduced by IPS.:contentReference[oaicite:34]{index=34}

<!-- IPP_INTEGRATION.md -->

# IPP / IPS Integration

## 1. Participant Role

We integrate as an **IPS Participant (PSP / SOV provider)** as defined in FSD and Scheme Rules.

Responsibilities:

- Implement all required IPS APIs.
- Enforce product, scheme and business rules for our customers.
- Support reconciliation & settlement obligations.
- Participate in fraud-risk management and compliance reporting.

## 2. Connectivity & Security

- Protocol: REST/HTTPS with mutual TLS.
- Digital signatures:
  - Requests signed using X.509 certificates.
  - Signature verification per TSD *Message Security, Trust and Authenticity* section.:contentReference[oaicite:36]{index=36}
- Keys & certificates:
  - Stored in HSM / secure vault.
  - Separate certs per environment.

## 3. Mandatory APIs

### 3.1 Non-financial

- `ReqHbt/RespHbt` – heartbeat monitoring.
- `ReqListPsp` / `ReqListAccPvd` – discovery of participants and account providers.
- `ReqListVae` / `ReqManageVae` – alias entries.
- `ReqValAdd` / `ReqGetAdd` – address validation and lookups.
- `ReqRegMob` / `ReqOtp` / `ReqSetCre` – registration, OTP, credential management.:contentReference[oaicite:37]{index=37}

### 3.2 Financial

- `ReqPay/RespPay` – all payment types (P2P, P2M, cash-in/out, ATM, bulk).
- `ReqAuthDetails/RespAuthDetails` – pre-debit authorisation and account validation.
- `ReqChkTxn/RespChkTxn` – transaction status queries.
- `ReqBalEnq/RespBalEnq` – balance enquiry.

## 4. Product Rules Alignment

Our flows must comply with:

- **Transaction limits & frequency** per channel and use-case.
- **Handle & mobile number rules**, including blacklisting and transfer between participants.
- **Merchant categories & acquisition standards** (Category A/B, MCCs).:contentReference[oaicite:40]{index=40}

Configuration of limits, purpose codes and initiation modes must match the latest FSD and Product Rules.

## 5. Scheme & Compliance Alignment

According to Scheme Rules:​:contentReference[oaicite:41]{index=41}

- We must:
  - Maintain operational SLAs & uptime.
  - Implement reconciliation and settlement correctly.
  - Support dispute management timelines and evidentiary requirements.
  - Comply with PSM Act, PSD-3, PSD-6, PSD-11 and other relevant regulations.

## 6. Onboarding & Certification

Per FSD Participant Onboarding section:​:contentReference[oaicite:42]{index=42}

- **Onboarding steps**
  - Technical connectivity setup.
  - API certification (positive & negative scenarios).
  - Volume & performance testing.
  - Security & penetration testing.
- **Go-live**
  - Controlled ramp-up.
  - Monitoring & reporting to IPN/BoN.

## 7. Error Handling & Resilience

- Implement full error mapping from UPI/IPS codes to internal codes (see `API_REFERENCE.md`).
- Timeouts:
  - Follow IPS recommendations for retry vs query.
  - Use ReqChkTxn for uncertain states.
- Ensure idempotent handling of duplicate RRN/TxnId cases.

<!-- SECURITY.md -->

# Security

This document summarises security posture and IPS-specific requirements.

## 1. Core Principles

- **Least privilege** for services and operators.
- **End-to-end encryption** of data in transit.
- **Minimal PII** stored and exposed.
- **Strong customer authentication** aligned to IPS 1-click 2FA model.

## 2. IPS-Specific Security

### 2.1 Message Security

Per TSD:​:contentReference[oaicite:45]{index=45}

- All IPS requests/responses use:
  - HTTPS/TLS with mutual authentication.
  - Digital signatures over payload & headers.
- Each API call includes:
  - Signed headers (timestamp, nonce, participant ID).
  - Payload signatures verified by the IPS platform.

### 2.2 Authentication & Authorisation

- **Device binding** + **IPS PIN** constitute 1-click 2-factor authentication.
- IPS PIN:
  - Never stored in plaintext.
  - Captured only in secure controls on trusted devices.
  - Verified via IPS / SoV provider as per registration flows.
- Channel access controlled by OAuth2, with short-lived tokens and refresh tokens stored securely.

### 2.3 Data Protection

- Sensitive fields:
  - PAN/account numbers, national IDs, contact details.
- Protection:
  - At-rest encryption (DB and backups).
  - Field-level tokenisation or encryption where feasible.
- Log redaction:
  - Mask PAN/account details and PII in logs.
  - Store full IPS payloads only in encrypted archives with strict access control.

## 3. Fraud & Risk Management

IPS provides a network-level FRM/eFRM capability.

- Our integration:
  - Consumes FRM responses and risk scores.
  - Applies local rules (velocity, unusual devices, high-risk counterparts).
- Supports:
  - Transaction-level risk scores.
  - Blacklist/hotlist of aliases/handles as per Scheme Rules.:contentReference[oaicite:47]{index=47}

## 4. Key & Certificate Management

- Key storage in HSM / secrets manager.
- Periodic rotation and certificate renewal aligned with IPS key schedules.
- Separate keys per environment and per role (signing vs TLS).

## 5. Compliance

- Alignment with:
  - PSM Act 14 of 2023 and BoN directives.
  - Scheme Rules compliance framework, including audits and self-assessment.:contentReference[oaicite:48]{index=48}
- Maintain evidence:
  - Implementation docs.
  - Test reports.
  - Incident and breach logs.

## 6. Security Testing

- Static and dynamic application security tests.
- Penetration testing before go-live and periodically thereafter.
- Negative scenario testing against IPS (invalid signatures, replay attempts, etc.) as defined in TSD and FSD negative scenarios.

<!-- TESTING.md -->

# Testing Strategy

## 1. Test Levels

1. **Unit Tests**
   - For all services (payment orchestration, alias service, IPS adapter).
   - Focus on business rules (limits, purpose codes, channel behaviour).

2. **Contract / API Tests**
   - Ensure our IPS adapter adheres to TSD field definitions and constraints.:contentReference[oaicite:50]{index=50}
   - Validate serialisation/deserialisation of all IPS APIs (ReqPay, RespPay, ReqRegMob, etc.).

3. **Integration Tests**
   - Against IPS certification environment:
     - Happy-path flows for each use-case.
     - Negative scenarios (down participants, duplicate TxnId, insufficient funds, FRM declines).

4. **End-to-End (E2E) Tests**
   - Full flows from channel → IPS → core banking/wallet → reconciliation.

5. **Non-functional Tests**
   - Performance & load (TPS, response times).
   - Resilience (network failures, IPS downtime).
   - Security (auth, authorisation, role-based access).

## 2. Test Scenarios

### 2.1 Registration

- Successful registration via:
  - Card.
  - National ID.
  - Wallet PIN.
- Failure cases:
  - Invalid KYC or blocked account.
  - Device mismatch.
  - Duplicate alias.

### 2.2 P2P / P2M Payments

- P2P via:
  - Mobile number.
  - IPS handle.
  - QR scan.
- P2M via:
  - Merchant handle.
  - Merchant code.
  - Merchant QR.
- Edge cases:
  - IPS/AP participant not available.
  - FRM decline.
  - Transaction exceeds limit or frequency rules.

### 2.3 Cash-In/Out & ATM

- Merchant cash-in / cash-out scenarios.
- ATM cash-out flows, including OTP and limits.

### 2.4 Disputes & Reversals

- Chargeback lifecycle: Dispute → Chargeback → Pre-Arbitration → Arbitration.
- Reversal flows when beneficiary unavailable or declines, as per IPS rules.

## 3. Test Data Management

- Use anonymised or synthetic data.
- Ensure:
  - Coverage of all error codes used in our mapping.
  - Variety of purpose codes and initiation modes.

## 4. Automation & Tooling

- CI pipeline:
  - Run unit + API tests on every commit.
  - Nightly integration tests against IPS certification, with reports.
- Test reporting:
  - Code coverage.
  - Regression status by use-case.

## 5. Acceptance Criteria

- All mandatory flows certified by IPS/IPN.
- Error-code mapping verified for all codes used in production.
- No P1 security or functional defects open at go-live.

<!-- TECHNICAL_DEBT.md -->

# Technical Debt Register

This file tracks known technical debt and design compromises related to IPS integration.

## 1. Integration Layer

- **Hard-coded configuration for some IPS endpoints**
  - Risk: Environment changes require code deployments.
  - Plan: Externalise into config service / feature flags.

- **Limited retry/back-off strategies**
  - Current implementation may not fully reflect best practices for `UP` (timeout) and similar error codes.
  - Plan: Introduce centralised retry policy with circuit-breaking.

## 2. Alias & Registration

- **Partial support for new MNO logic**
  - FSD v10 and later introduce flexible MNO rules and SPV alias allocation.:contentReference[oaicite:56]{index=56}
  - Risk: New MNOs may not work without code changes.
  - Plan: Move MNO logic to configuration/lookup tables.

- **No self-service alias management UI**
  - Users cannot manage multiple aliases/handles easily.
  - Plan: Add profile screens for alias list, default alias changes and alias deletions.

## 3. Payment Flows

- **Limited coverage of all initiation modes and purpose codes**
  - FSD defines detailed matrix of purpose codes and initiation modes.:contentReference[oaicite:57]{index=57}
  - Plan: Model purpose/initiator as configurable dimensions and expose via admin tooling.

- **Simplified FRM integration**
  - Currently consumes only basic FRM results.
  - Plan: Support richer rule configuration and case management.

## 4. Reconciliation & Settlement

- **Manual exception resolution**
  - Breaks between IPS and internal ledger resolved outside the system.
  - Plan: Implement exception workflows and dashboards.

## 5. Documentation & Tooling

- **Generated API docs lag behind implementation**
  - Plan: Introduce OpenAPI-first development with CI documentation build.

Each item should be linked to a tracking ID (Jira/issue) and prioritised by business impact vs effort.

<!-- DESIGN_SYSTEM.md -->

# Design System

This file standardises UX/UI patterns for IPS use-cases across channels.

## 1. Design Principles

- **Consistency** across flows and channels.
- **Clarity** in fees, limits, and failure reasons.
- **Safety** – strong emphasis on confirming critical actions.
- **Inclusivity** – support low-literacy and feature-phone users.

## 2. Core Patterns

### 2.1 Registration

- Step-by-step wizard:
  1. Mobile number confirmation.
  2. SoV selection (account/wallet).
  3. Verification (card/ID/wallet PIN).
  4. IPS PIN setup.
- Clear explanations of:
  - IPS PIN vs channel login PIN.
  - Data privacy and consent.

Flows should mirror registration journeys in Product Rules & FSD.

### 2.2 P2P Payment

Screens:

1. **Select Recipient**
   - Tabs: Contacts, Recent, Mobile Number, IPS Handle, QR Scan.
2. **Enter Amount & Purpose**
   - Show limits and fees.
3. **Confirm**
   - Summary with masked identifiers and charges.
4. **Result**
   - Success/failure screen, reference number, “Share receipt”.

### 2.3 P2M & Merchant Cash-In/Out

- Merchant identifier input with:
  - Real-time merchant name lookup.
  - Category display and MCC (where relevant).:contentReference[oaicite:59]{index=59}
- Strong visual distinction between:
  - Paying a merchant.
  - Cashing out at an agent.
  - Cashing in to a wallet.

### 2.4 Error Messaging

- Map internal error codes to **friendly messages**.
- Include:
  - Short title (“Insufficient funds”).
  - Helpful hint (“Try a smaller amount or another account”).
- Do **not** show raw IPS error codes to users (only log them).

### 2.5 Accessibility

- Minimum font sizes and contrast ratios.
- Support for dark/light mode where applicable.
- Clear focus indicators and large tap targets.

## 3. Components

- **Buttons**: primary, secondary, destructive.
- **Form fields**: with validation and inline error messages.
- **Status badges**: `PENDING`, `SUCCESS`, `FAILED`, `REVERSED`.
- **Timeline/History component** for transaction details.

## 4. USSD Menus

Design USSD menu flows that:

- Reflect IPS USSD rules and constraints.
- Use short, clear text.
- Avoid deep nesting (ideally ≤ 4 levels).

<!-- CHANGELOG.md -->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.1.0] – 2025-12-10

### Added

- Initial documentation set:
  - `context.md`
  - `ARCHITECTURE.md`
  - `SERVICES.md`
  - `API_REFERENCE.md`
  - `DATABASE_SCHEMA.md`
  - `FUNCTIONALITY_MAP.md`
  - `IPP_INTEGRATION.md`
  - `SECURITY.md`
  - `TESTING.md`
  - `TECHNICAL_DEBT.md`
  - `DESIGN_SYSTEM.md`
  - `PRODUCT_IMPROVEMENT_PLAN.md`
  - `NamLend Trust – Market Research Gaps.md`
- Baseline IPS integration design aligned with IPS Product Rules, FSD, Scheme Rules and TSD.

Future releases should be appended below with date, version and summary.

<!-- PRODUCT_IMPROVEMENT_PLAN.md -->

# Product Improvement Plan

This document outlines medium-term improvements for our IPS-enabled products.

## 1. Objectives

- Increase **active usage** of IPS rails.
- Improve **payment success rates** and user satisfaction.
- Reduce **operational overhead** in reconciliation and disputes.
- Ensure ongoing **compliance** with evolving IPS rules and BoN directives.

## 2. Short-Term (0–3 months)

- Finalise IPS certification for all mandatory use-cases.
- Improve error-handling coverage for all IPS response codes we encounter.
- Add monitoring dashboards:
  - Per-channel failure rate.
  - Top error codes and participants.

## 3. Medium-Term (3–9 months)

- Roll out **Merchant Cash-In** and optimise flows based on product rules additions.
- Introduce:
  - Alias management in user profile (multiple handles).
  - Self-service device binding management.

- Enhance FRM integration:
  - Use IPS FRM attributes and risk scores.
  - Establish automated case creation for high-risk events.

## 4. Long-Term (>9 months)

- Support new IPS use-cases when introduced:
  - Additional bulk payment types.
  - Request-to-Pay / mandate-based flows.
- Explore **value-added services**:
  - Analytics-based credit offers using IPS transaction history (subject to regulation).
  - Merchant tools for reconciliation and insights.

## 5. KPIs

- Transaction success rate (target ≥ 98% excluding customer errors).
- Average registration completion time.
- Dispute resolution time vs Scheme Rules SLAs.:contentReference[oaicite:65]{index=65}
- Operational cost per 1,000 transactions.

## 6. Governance

- Maintain a product backlog with:
  - Priority (High/Med/Low).
  - Business owner.
  - Technical owner.
- Review quarterly against updated IPS FSD/Product/ Scheme Rule versions.

<!-- NamLend Trust – Market Research Gaps.md -->

# NamLend Trust – Market Research Gaps

> Working note to inform NamLend-style products that may use IPS as the primary payment rail.

## 1. Context

IPS aims to support financial inclusion, particularly for underserved communities using low-value, real-time payments across bank accounts and e-money wallets.

NamLend-type products (micro-lending, salary advances, SME credit) can leverage:

- Instant disbursement (B2P/G2P flows).
- Instant collections (P2B repayments, merchant/agent cash-in).
- Broad reach via mobile and USSD.

## 2. Identified Gaps

### 2.1 Customer Insights

- Limited data on:
  - Awareness of IPS among target segments.
  - Willingness to repay via IPS instead of cash.
  - Trust in mobile/USSD-based lending.

**Action:** Commission surveys / focus groups in key regions to quantify awareness, trust and preferred channels.

### 2.2 Competitive Landscape

- Need a structured overview of:
  - Existing micro-lenders using IPS or other rails.
  - Banks and MNO wallets offering instant loans or overdrafts.
- Understand fee structures vs IPS switching & interchange fees.

**Action:** Compile competitor matrix (product types, limits, pricing, channels).

### 2.3 Regulatory Constraints

- Clarify:
  - Use of IPS transaction data for credit scoring (data protection & consent).
  - Any limits on loan disbursement/repayment via IPS purpose codes.

**Action:** Engage with BoN/NAMFISA guidelines and IPS Scheme Rules on data usage and purpose codes.

### 2.4 Operational Model

Open questions:

- Should NamLend-type products use:
  - Direct IPS participation, or
  - Indirect participation through a partner bank?
- Agent/merchant network:
  - What density is required for effective cash-in/out coverage?
  - How to incentivise Category B small merchants to act as agents?:contentReference[oaicite:69]{index=69}

## 3. Next Steps

- Prioritise the gaps that block MVP definition.
- Assign research owners and timelines.
- Feed results back into:
  - Product requirements.
  - Risk models.
  - IPS transaction limit/purpose-code configuration.
````
