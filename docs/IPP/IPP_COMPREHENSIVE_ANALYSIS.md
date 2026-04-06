# Instant Payment Solution (IPS) / Instant Payment Programme (IPP) — Comprehensive Analysis

**Date**: 29 March 2026
**Sources**: IPS TSD v0.7, IPP FSD v10.0, IPP Error & Response Codes, IPN Scheme Rules v0.3, IPP Product Rules v0.5
**Purpose**: Complete technical and business understanding of Namibia's Instant Payment Solution for NamLend Trust PSP integration

---

## 1. Executive Summary

The Instant Payment Solution (IPS) is Namibia's national real-time payment infrastructure, established by the **Bank of Namibia (BoN)** and operated by **Instant Payments Namibia (IPN)**, a BoN subsidiary. The technology partner is **NPCI International Payments Limited (NIPL)** — the same organization behind India's UPI system.

The IPS enables **24/7/365 instant payments** between bank accounts and e-money wallets across all participating institutions. It is based on India's **Unified Payments Interface (UPI)** architecture, adapted for the Namibian market.

### Key Facts

| Attribute              | Value                                               |
| ---------------------- | --------------------------------------------------- |
| **Operator**           | Instant Payments Namibia (IPN) — BoN subsidiary     |
| **Technology Partner** | NPCI International Payments Limited (NIPL)          |
| **Architecture Base**  | India's UPI (Unified Payments Interface)            |
| **Currency**           | NAD (Namibian Dollar)                               |
| **Availability**       | 24/7/365 real-time                                  |
| **Settlement System**  | NISS (Namibia Interbank Settlement System / RTGS)   |
| **API Protocol**       | RESTful, Asynchronous, XML over HTTPS               |
| **Authentication**     | 1-click 2-Factor (device binding + 6-digit IPS PIN) |
| **Governing Law**      | Payment System Management Act 14 of 2023            |
| **Target Go-Live**     | September 2025 (Phase 1)                            |

---

## 2. Architecture Overview

### 2.1 System Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                    IPS CENTRAL SWITCH (IPN)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ Resolver  │  │ Debtor   │  │ Creditor │  │ Alias Directory  │ │
│  │ (alias   │  │ (debit   │  │ (credit  │  │ (centralized     │ │
│  │  lookup) │  │  flow)   │  │  flow)   │  │  ID registry)    │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                       │
│  │   FRM    │  │  Queue   │  │ Settle-  │                       │
│  │ (fraud   │  │ Process  │  │  ment    │                       │
│  │  risk)   │  │  Engine  │  │  Engine  │                       │
│  └──────────┘  └──────────┘  └──────────┘                       │
└───────┬───────────────┬───────────────┬─────────────────────────┘
        │               │               │
   ┌────▼────┐    ┌─────▼─────┐   ┌─────▼─────┐
   │  IPSP A │    │  IPSP B   │   │  IPSP C   │
   │ (Bank)  │    │ (E-money) │   │ (Enabler) │
   │         │    │           │   │ via IPSP  │
   │ SoV + App│   │ SoV + App │   │  App only │
   └─────────┘    └───────────┘   └───────────┘
        │               │               │
   ┌────▼────┐    ┌─────▼─────┐   ┌─────▼─────┐
   │  Users  │    │   Users   │   │   Users   │
   │ (Mobile │    │ (Mobile   │   │ (Mobile   │
   │  App /  │    │  App /    │   │  App)     │
   │  USSD)  │    │  USSD)    │   │           │
   └─────────┘    └───────────┘   └───────────┘
```

### 2.2 Core Components

- **IPS Switch**: Central routing, processing, and clearing hub
- **Alias Directory**: Centralized registry mapping short-form aliases (mobile numbers, merchant IDs) to full-form aliases (user@provider)
- **Resolver**: Resolves aliases to actual account details for payment routing
- **Debtor/Creditor**: Handles debit and credit legs of transactions
- **FRM (Fraud Risk Management)**: Real-time fraud detection and prevention at network level
- **Common Library (CL)**: SDK/library integrated into IPSP mobile apps for secure PIN entry and encryption
- **HSM (Hardware Security Module)**: Physical device for cryptographic key management and PIN encryption/decryption

### 2.3 Communication Protocol

| Aspect                  | Specification                                    |
| ----------------------- | ------------------------------------------------ |
| **Transport**           | HTTPS (TLS/SSL)                                  |
| **Payload Format**      | XML                                              |
| **Communication Style** | Asynchronous (Request → ACK → separate Response) |
| **Digital Signature**   | RSA-SHA256                                       |
| **PIN Encryption**      | IPS HSM Public Key → Base64 encoding             |
| **API Style**           | RESTful endpoints                                |
| **Certificate**         | PKI-based, issued per participant                |

**Key Principle**: All APIs are asynchronous. When a request is sent:

1. Server immediately returns an **ACK** (acknowledgement)
2. Processing happens asynchronously
3. Actual result returned via a **separate Response API** using the same transaction ID

---

## 3. Participant Model

### 3.1 Participant Types

| Type                                            | Role                                                                                                       | Examples                                                               |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Store of Value (SoV) Provider**               | Holds customer funds (bank accounts / e-wallets). Debits/credits accounts on instruction.                  | FNB, Bank Windhoek, Standard Bank, Nedbank, Letshego, Nam-mic, Nampost |
| **IPSP (Instant Payment Solution Participant)** | Directly connected to IPS switch. Onboards customers, creates aliases, initiates/receives payments.        | Banks (FNB, BW, SBN, Nedbank), PIIs (Nam-mic, VTS)                     |
| **Enabler**                                     | Third-party providing mobile apps or integration services. NOT directly connected — works through an IPSP. | Adumo, ATM Solutions, PayMate, Selcom, DPO                             |

**A single entity can be both SoV Provider AND IPSP** (e.g., FNB is both).

### 3.2 Settlement Participation

- Transactions settle in **NISS (Namibia Interbank Settlement System)** — Namibia's RTGS
- **Direct participants**: Have their own NISS settlement account
- **Indirect/Sponsored participants**: Nominate a direct participant to settle on their behalf
- Settlement accounts are **dedicated** for IPS obligations

### 3.3 NamLend's Position

As a potential IPSP, NamLend Trust would need to:

1. Obtain a **Payment Instrument Issuer (PII)** license under PSD-1 (if not already a bank)
2. Submit a **letter of intent** to Bank of Namibia
3. Receive a **letter of no objection** from BoN
4. Complete technical **integration and certification** with IPN
5. Sign **participant agreement** and pay joining fees
6. Go-live after successful certification testing

---

## 4. Alias / Handle System

### 4.1 Hybrid Alias Model

The IPS uses a **hybrid centralized + decentralized** alias model:

**Centralized (Alias Directory)**:

- **Mobile numbers** (9-digit, stripped of leading 0 or +264) → mapped to full-form alias
- **Merchant IDs** (8-digit unique code) → mapped to full-form alias

**Decentralized (Per-IPSP)**:

- **Full-form aliases**: `username@IPSP` format (e.g., `john123@bankwindhoek`)
- Managed by individual IPSPs
- A user can have multiple full-form aliases across different IPSPs

### 4.2 Alias Properties

| Property           | Individual Handle                      | Merchant Handle         |
| ------------------ | -------------------------------------- | ----------------------- |
| **Format**         | `name@IPSP`                            | `tradingname@IPSP`      |
| **Max Length**     | 20 characters                          | 20 characters           |
| **Case**           | Lowercase only                         | Lowercase only          |
| **Characters**     | Alphanumeric + `.` `-`                 | Alphanumeric + `.` `-`  |
| **Short Form**     | 9-digit mobile number                  | 8-digit unique code     |
| **Uniqueness**     | Must be unique globally                | Must be unique globally |
| **Reuse Cooldown** | 6 months (mobile) / 24 months (handle) | 24 months               |

### 4.3 Mobile Number Rules

- Mobile number is **auto-detected** (not manually entered)
- Leading `0` or `+264` stripped → stored as 9-digit number (e.g., `812345679`)
- Only numbers linked to an active SoV can be used
- One mobile number can be bound to one device at a time
- Device binding = SIM + device fingerprint

### 4.4 Merchant Unique Codes

- 8-digit code, where first 2 digits identify the IPSP (e.g., IPSP1 = `30XXXXXX`)
- Same merchant across multiple IPSPs keeps the last 6 digits constant
- Only SMEs/MSMEs/large merchants qualify; sole traders use individual aliases

### 4.5 Alias Directory Operations

| Operation  | API          | Description                               |
| ---------- | ------------ | ----------------------------------------- |
| **CHECK**  | ReqGetAdd    | Check if a short-form alias is available  |
| **FETCH**  | ReqGetAdd    | Retrieve linkage details of an alias      |
| **PORT**   | ReqGetAdd    | Check if mobile can be ported to new IPSP |
| **CREATE** | ReqRegMapper | Register new alias in directory           |
| **MODIFY** | ReqRegMapper | Update/activate/deactivate alias          |
| **DELETE** | ReqRegMapper | Deregister alias                          |

### 4.6 Alias Status Values

| Status         | Meaning                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------- |
| `NEW`          | Does not exist — available for registration                                                  |
| `ACTIVE`       | Registered and linked — in use                                                               |
| `INACTIVE`     | Exists but not currently active                                                              |
| `DEREGISTERED` | Previously registered, deleted — reclaimable within 6 months (merchant) / 24 months (handle) |
| `BLOCKED`      | Blacklisted due to compliance/fraud — cannot be used                                         |

---

## 5. Use Cases (Phase 1 — Go-Live)

### 5.1 Seven Go-Live Use Cases

| #   | Use Case                       | Direction        | Channels                                    | Key Details                                                 |
| --- | ------------------------------ | ---------------- | ------------------------------------------- | ----------------------------------------------------------- |
| 1   | **P2P** (Person-to-Person)     | Push             | Mobile App, USSD, Internet Banking          | Send money using alias, mobile number, or QR code           |
| 2   | **P2B/M** (Person-to-Merchant) | Push             | Mobile App, USSD, QR Code, Internet Banking | Pay merchants using handle, unique code, or QR              |
| 3   | **G2P** (Government-to-Person) | Bulk Push        | Bank of Namibia (CMBO)                      | Pensions, grants — preauthorised bulk payments              |
| 4   | **B2P** (Business-to-Person)   | Bulk Push        | Business systems                            | Payroll, disbursements — preauthorised                      |
| 5   | **Cash-In at Merchant**        | Push (to self)   | Mobile App, USSD, QR                        | Fund own SoV at a merchant                                  |
| 6   | **Cash-Out at Merchant**       | Push (from self) | Mobile App, USSD, QR                        | Withdraw from SoV at a merchant                             |
| 7   | **ATM Withdrawal**             | Push             | ATM, USSD                                   | Withdraw cash at IPS-enabled ATMs using mobile number + OTP |

### 5.2 Transaction Limits (Go-Live)

| Use Case                | Channel       | Daily Max | Daily Frequency |
| ----------------------- | ------------- | --------- | --------------- |
| **P2P**                 | Bank Account  | N$ 10,000 | 10              |
| **P2P**                 | Wallet        | N$ 10,000 | 10              |
| **P2P**                 | USSD          | N$ 5,000  | 10              |
| **P2M**                 | Bank Account  | N$ 10,000 | 100             |
| **P2M**                 | Wallet        | N$ 10,000 | 100             |
| **P2M**                 | USSD          | N$ 5,000  | 100             |
| **B2P**                 | Per recipient | N$ 10,000 | Unlimited       |
| **G2P**                 | Per recipient | N$ 10,000 | Unlimited       |
| **Cash-Out (Merchant)** | Any           | N$ 2,000  | -               |
| **Cash-Out (ATM)**      | Any           | N$ 2,000  | -               |

### 5.3 On-Us Transactions

When both payer and payee are customers of the same IPSP, the transaction is processed internally BUT must still be logged at the IPS switch for settlement, reconciliation, and reporting.

---

## 6. API Specification

### 6.1 API Categories

#### Financial APIs

| API                       | Request        | Response        | Purpose                                            |
| ------------------------- | -------------- | --------------- | -------------------------------------------------- |
| **Pay**                   | ReqPay         | RespPay         | Execute payment (debit + credit)                   |
| **Authorization Details** | ReqAuthDetails | RespAuthDetails | Resolve alias, get payee details for authorization |

#### Non-Financial APIs

| API                              | Request               | Response               | Purpose                               |
| -------------------------------- | --------------------- | ---------------------- | ------------------------------------- |
| **Heartbeat**                    | ReqHbt                | RespHbt                | System health check                   |
| **List PSP**                     | ReqListPsp            | RespListPsp            | List available IPSPs                  |
| **List Account Providers**       | ReqListAccPvd         | RespListAccPvd         | List SoV providers                    |
| **List Keys**                    | ReqListKeys           | RespListKeys           | Retrieve encryption keys              |
| **List Verified Addresses**      | ReqListVae            | RespListVae            | List user's verified aliases          |
| **List Account**                 | ReqListAccount        | RespListAccount        | List user's accounts at SoV           |
| **Manage Verified Addresses**    | ReqManageVae          | RespManageVae          | Add/modify/delete aliases             |
| **Validate Address**             | ReqValAdd             | RespValAdd             | Validate a payee alias before payment |
| **Set Credentials**              | ReqSetCre             | RespSetCre             | Set/change IPS PIN                    |
| **Mobile Banking Registration**  | ReqRegMob             | RespRegMob             | Device binding and registration       |
| **Check Transaction**            | ReqChkTxn             | RespChkTxn             | Query transaction status              |
| **OTP**                          | ReqOtp                | RespOtp                | Generate/validate OTP                 |
| **Balance Enquiry**              | ReqBalEnq             | RespBalEnq             | Check account balance                 |
| **Transaction Confirmation**     | ReqTxnConfirmation    | RespTxnConfirmation    | Confirm transaction completion        |
| **Alias Directory Registration** | ReqRegMapper          | RespRegMapper          | Register alias in directory           |
| **Get Address**                  | ReqGetAdd             | RespGetAdd             | Check/fetch/port alias in directory   |
| **Mapper Confirmation**          | ReqMapperConfirmation | RespMapperConfirmation | Confirm alias porting to old IPSP     |

### 6.2 Payment Flow (P2P Send Money — Mobile App)

```
User A (Payer)          Payer IPSP         IPS Switch         Payee IPSP         SoV (Remitter)    SoV (Beneficiary)
    │                       │                   │                   │                   │                   │
    │  1. Enter payee alias │                   │                   │                   │                   │
    │  + amount + IPS PIN   │                   │                   │                   │                   │
    ├──────────────────────►│                   │                   │                   │                   │
    │                       │  2. ReqPay        │                   │                   │                   │
    │                       │  (encrypted PIN)  │                   │                   │                   │
    │                       ├──────────────────►│                   │                   │                   │
    │                       │  3. ACK           │                   │                   │                   │
    │                       │◄──────────────────┤                   │                   │                   │
    │                       │                   │  4. FRM Check     │                   │                   │
    │                       │                   │  (fraud scoring)  │                   │                   │
    │                       │                   │                   │                   │                   │
    │                       │                   │  5. Resolve alias │                   │                   │
    │                       │                   │  (Alias Directory │                   │                   │
    │                       │                   │   or direct route)│                   │                   │
    │                       │                   │                   │                   │                   │
    │                       │                   │  6. ReqPay(Debit) │                   │                   │
    │                       │                   ├───────────────────┼──────────────────►│                   │
    │                       │                   │  7. Debit Account │                   │                   │
    │                       │                   │                   │                   │──(debit)──►       │
    │                       │                   │  8. RespPay(Debit)│                   │                   │
    │                       │                   │◄──────────────────┼───────────────────┤                   │
    │                       │                   │                   │                   │                   │
    │                       │                   │  9. ReqPay(Credit)│                   │                   │
    │                       │                   ├──────────────────►│                   │                   │
    │                       │                   │ 10. Credit Account│                   │                   │
    │                       │                   │                   │──────────────────►│──(credit)──►      │
    │                       │                   │ 11. RespPay(Credit)                   │                   │
    │                       │                   │◄──────────────────┤                   │                   │
    │                       │ 12. RespPay       │                   │                   │                   │
    │                       │◄──────────────────┤                   │                   │                   │
    │  13. Notification     │                   │                   │                   │                   │
    │◄──────────────────────┤                   │                   │                   │                   │
    │                       │                   │  14. Notify Payee │                   │                   │
    │                       │                   ├──────────────────►│                   │                   │
    │                       │                   │                   │──notify──►User B  │                   │
```

### 6.3 Core Payment Elements (ReqPay)

Every payment request contains:

1. **Payer SoV** and **Payee SoV** — account/institution details for routing
2. **Authentication credentials** — IPS PIN (encrypted via CL with IPS HSM public key)
3. **Transaction amount** — in NAD
4. **Transaction reference** — unique ID for correlation
5. **Timestamp** — ISO format
6. **Metadata** — location, product code, mobile number, device details

### 6.4 Key Transaction Types

| Type       | SubType  | Description              |
| ---------- | -------- | ------------------------ |
| `PAY`      | `DEBIT`  | Debit payer's account    |
| `PAY`      | `CREDIT` | Credit payee's account   |
| `REVERSAL` | `DEBIT`  | Reverse a debit          |
| `REVERSAL` | `CREDIT` | Reverse a credit         |
| `ChkTxn`   | —        | Check transaction status |

### 6.5 Initiation Modes

| Mode | Description                          |
| ---- | ------------------------------------ |
| `00` | Default                              |
| `01` | QR Code                              |
| `04` | Intent (App-to-App)                  |
| `06` | NFC                                  |
| `10` | Pre-approved                         |
| `11` | Pre-authorized (Mandates)            |
| `12` | FIR (Financial Information Registry) |

---

## 7. Registration & Onboarding

### 7.1 User Registration Flow (Mobile App)

| Step   | Action                  | Details                                                                      |
| ------ | ----------------------- | ---------------------------------------------------------------------------- |
| **0**  | Open Channel            | User sees IPS registration option in IPSP app                                |
| **1A** | Onboarding Process      | User views registration journey, can confirm/cancel                          |
| **1B** | App Permissions         | Request SMS send/view permissions for device binding                         |
| **2**  | Device Binding          | Auto-detect mobile number (NOT manual entry). One SIM = one device = one app |
| **3**  | Create Handle           | User enters or selects handle (e.g., `john123@bankwindhoek`)                 |
| **4**  | Link SoV                | Select bank account or e-wallet to link to handle                            |
| **5A** | Set IPS PIN             | 6-digit PIN set via IPS Common Library page                                  |
| **5B** | Debit Card Verification | Last 6 digits + expiry date (optional CVV)                                   |
| **5C** | MNO Verification        | Last 6 digits of ID number (for wallets / no debit card)                     |
| **5D** | Enter OTP               | 6-digit OTP from SoV provider or MNO                                         |
| **5E** | Confirm IPS PIN         | Re-enter 6-digit PIN to confirm                                              |
| **6**  | Confirmation            | Success screen showing handle + linked SoV                                   |

### 7.2 USSD Registration

- Central USSD short code (e.g., `*140*140#`)
- Operated by IPS Operator (IPN) for go-live
- Individual IPSP USSD channels NOT permitted at go-live
- Limited functionality — no OTP verification, uses full name + mobile + ID number
- 6-digit IPS PIN set after verification

### 7.3 Device Binding Rules

- One mobile number → one device → one app at a time
- SIM must be present and active in the device
- If SIM removed and reinserted, device binding must be repeated
- IPSP must integrate with SMS Gateway for VMN (Virtual Mobile Number)
- Maximum 3 registration attempts; 4th attempt blocked for 24 hours

---

## 8. Security Framework

### 8.1 Authentication: 1-Click 2-Factor

| Factor       | Mechanism                                                                           |
| ------------ | ----------------------------------------------------------------------------------- |
| **Factor 1** | Device fingerprint (IMEI / device-unique identifier) — automatic via device binding |
| **Factor 2** | 6-digit IPS PIN — entered by user via IPS Common Library (CL)                       |

### 8.2 PIN Security Flow

1. User enters PIN on **IPS CL page** within IPSP app
2. CL **encrypts** PIN using **IPS HSM Public Key**
3. Encrypted PIN **Base64 encoded** and included in `<Cred>` block of ReqPay
4. IPSP sends to IPS Switch
5. IPS Switch **decodes + decrypts** with IPS HSM Private Key
6. IPS Switch **re-encrypts** with **Issuer Bank HSM Public Key** and sends to remitter bank
7. Issuer bank **decodes + decrypts** with their HSM Private Key
8. Issuer bank validates PIN and authorizes transaction

### 8.3 Certificate Requirements

- **PKI-based** digital certificates for all participants
- **RSA-SHA256** algorithm for digital signatures
- All messages signed before transmission
- Signature verified on receipt for **integrity + non-repudiation**
- HSM required for all cryptographic operations

### 8.4 Fraud Risk Management (FRM)

- **eFRM** system operates at the network level
- Real-time risk scoring on every transaction
- Rule-based engine with configurable rules
- Transactions can be: Approved, Declined, or Flagged for review
- Risk scores shared in the payment message

---

## 9. Settlement & Reconciliation

### 9.1 Settlement Architecture

- Transactions clear through the **IPS Switch**
- Settlement occurs in **NISS (RTGS)** — Namibia's Real-Time Gross Settlement System
- Settlement is **net** (multilateral netting of obligations between participants)
- Settlement files generated in **pacs.009** format (ISO 20022)

### 9.2 Settlement Windows

Multiple settlement windows per day (exact times defined by IPN):

- **SW1, SW2, SW3** throughout the business day
- Holiday calendar maintained for public holidays
- Settlement suppressed on holidays

### 9.3 Settlement Process

1. IPS Switch accumulates transactions during clearing cycle
2. At settlement window cutoff, **net positions** calculated
3. **pacs.009** file generated with net settlement instructions
4. File submitted to **NISS** for settlement
5. NISS processes debit/credit to participant settlement accounts
6. Settlement confirmation returned to IPS

### 9.4 Reconciliation

- Participants must submit **daily reconciliation data**
- IPS Operator provides **Net Settlement Reports (NTSL)** and **Raw Data Reports**
- **Deemed transactions** (status unknown) reconciled manually during settlement
- 99.9% system availability SLA required

### 9.5 Back Office Services

| Service                    | Description                                                         |
| -------------------------- | ------------------------------------------------------------------- |
| **QDMS**                   | Query and Dispute Management System — for raising/tracking disputes |
| **Reconciliation Reports** | Daily transaction and settlement reports                            |
| **Net Settlement Reports** | Participant-level net positions                                     |
| **Liquidity Management**   | Monitoring settlement account balances                              |

---

## 10. Error & Response Codes

### 10.1 Response Code Categories

| Prefix | Context                  |
| ------ | ------------------------ |
| `H`    | Head validation          |
| `T`    | Transaction validation   |
| `R`    | Payer validation         |
| `B`    | Payee validation         |
| `S`    | Risk scores validation   |
| `L`    | Rules validation         |
| `I`    | Info validation          |
| `D`    | Device validation        |
| `A`    | Account validation       |
| `C`    | Credentials validation   |
| `V`    | Amount validation        |
| `E`    | Response validation      |
| `U`    | UPI service layer errors |

### 10.2 Key Response Codes

| Code  | Description                           | Type    |
| ----- | ------------------------------------- | ------- |
| `00`  | Approved / Completed Successfully     | Success |
| `Z9`  | Insufficient funds                    | BD      |
| `ZM`  | Invalid MPIN / IPS PIN                | BD      |
| `AM`  | MPIN not set by customer              | BD      |
| `UP`  | PSP timeout                           | TD      |
| `UT`  | Remitter/Issuer unavailable (timeout) | TD      |
| `BT`  | Beneficiary unavailable (timeout)     | TD      |
| `U17` | PSP is not registered                 | BD      |
| `XB`  | Invalid transaction (remitter)        | BD      |
| `XH`  | Account does not exist (remitter)     | BD      |
| `YE`  | Remitting account blocked/frozen      | BD      |
| `YF`  | Beneficiary account blocked/frozen    | BD      |

**TD** = Technical Decline (temporary — retry may succeed)
**BD** = Business Decline (permanent — requires user action)

### 10.3 Reversal Codes

| Code | Description      | Transaction Status               |
| ---- | ---------------- | -------------------------------- |
| `00` | Reversal success | FAILURE (original transaction)   |
| `96` | Reversal failure | DEEMED SUCCESS (original stands) |
| `CS` | Credit success   | SUCCESS                          |
| `NC` | Credit not done  | FAILURE                          |
| `ND` | Debit not done   | FAILURE                          |

### 10.4 Timeout Codes (Populated by IPS)

| Code | Description                     |
| ---- | ------------------------------- |
| `21` | No action taken (full reversal) |
| `32` | Partial reversal                |
| `RB` | Credit reversal timeout         |
| `RR` | Debit reversal timeout          |

---

## 11. Compliance & Governance

### 11.1 Legal Framework

| Instrument                            | Scope                                                      |
| ------------------------------------- | ---------------------------------------------------------- |
| **PSM Act 14 of 2023**                | Primary governing law for payment systems                  |
| **PSD-6**                             | Authorization of payment system operators and participants |
| **PSD-1**                             | Licensing requirements for payment service providers       |
| **PSD-3**                             | Issuance of electronic money                               |
| **PSD-11**                            | Card interchange and ATM surcharging                       |
| **Financial Intelligence Act (2012)** | AML/CFT compliance                                         |
| **Competition Act (2003)**            | Anti-competitive behavior                                  |
| **Data Protection Guidelines**        | Customer data protection                                   |

### 11.2 Participant Obligations

- **99.9% system availability** SLA
- **Real-time processing** capability
- **Daily reconciliation** data submission
- **48-hour incident reporting** for material events
- **Annual penetration testing**
- **AML/CFT compliance** at all times
- **Data retention**: 5 years post-termination (per Scheme Rules; NamLend internal policy: 7 years)

### 11.3 Blacklisting & Hot-Listing

- **Blacklisting**: Long-term exclusion for confirmed fraud/malicious activity
- **Hot-listing**: Temporary suspension for suspected activity pending investigation
- Both applied to Users, Handles, and Devices
- Operator maintains consolidated database of blacklisted entities

### 11.4 Dispute Management

| Stage               | TAT             | Process                                            |
| ------------------- | --------------- | -------------------------------------------------- |
| **Dispute**         | Raised via QDMS | Customer disputes through their IPSP               |
| **Chargeback**      | Per rules       | Funds returned to customer upon successful dispute |
| **Pre-Arbitration** | Before formal   | Parties attempt resolution                         |
| **Arbitration**     | Final           | Binding decision by IPN                            |

---

## 12. Pricing Model

### 12.1 Fee Structure

| Fee Type              | Description                                 |
| --------------------- | ------------------------------------------- |
| **Onboarding Fee**    | One-time joining fee                        |
| **Participation Fee** | Recurring membership                        |
| **Switching Fee**     | Per-transaction fee to IPN                  |
| **Interchange**       | Fee between IPSPs (payer IPSP → payee IPSP) |
| **Exiting Fee**       | Fee for leaving the scheme                  |
| **Additional Fees**   | Dispute fees, additional services           |

### 12.2 Purpose Codes

Purpose codes classify transaction types and affect interchange rates. They are included in the ReqPay message and determine applicable fee rules.

---

## 13. NamLend Trust Integration Implications

### 13.1 What NamLend Needs to Implement

| Component                     | Description                                            | Priority |
| ----------------------------- | ------------------------------------------------------ | -------- |
| **IPS Common Library (CL)**   | Integrate NIPL-provided SDK for PIN entry              | Critical |
| **XML API Layer**             | Build XML request/response handlers for all IPS APIs   | Critical |
| **Alias Management**          | Create/manage customer handles (`user@namlend`)        | Critical |
| **Device Binding**            | SMS Gateway integration for SIM verification           | Critical |
| **HSM Integration**           | Digital signature signing/verification                 | Critical |
| **Asynchronous Processing**   | Handle ACK → Response flow with correlation IDs        | Critical |
| **Settlement Reconciliation** | Parse settlement files, reconcile with internal ledger | High     |
| **FRM Integration**           | Process risk scores, implement local fraud rules       | High     |
| **USSD Gateway**              | Convert USSD messages to IPS XML format                | Medium   |
| **QR Code Generation**        | IPS-proprietary QR specs for P2M                       | Medium   |
| **QDMS Integration**          | Dispute management system connectivity                 | Medium   |
| **Back Office Reports**       | Consume net settlement and raw data reports            | Medium   |

### 13.2 Data Model Impact

New entities needed for IPS integration:

```
ips_aliases          - User/merchant alias records (handle, mobile, status)
ips_transactions     - IPS transaction log (txn_id, type, status, amount, timestamps)
ips_devices          - Device binding records (user, device_fingerprint, mobile, status)
ips_settlements      - Settlement window records and net positions
ips_disputes         - Dispute lifecycle tracking
ips_certificates     - PKI certificate management
ips_frm_scores       - Fraud risk scores per transaction
```

### 13.3 Key Technical Decisions

1. **Handle Format**: `username@namlend` — NamLend needs its own IPSP routing identifier
2. **Merchant Prefix**: IPN will assign NamLend a 2-digit prefix for merchant unique codes
3. **Settlement Account**: Must maintain dedicated NISS settlement account (direct) or nominate a sponsoring bank (indirect)
4. **TigerBeetle Sync**: All IPS transactions must flow through the TigerBeetle outbox for shadow ledger consistency
5. **Common Library Integration**: The NIPL-provided CL must be integrated into NamLend's mobile app for secure PIN entry

### 13.4 Existing NamLend Infrastructure Alignment

| NamLend Component               | IPS Integration Point                                           |
| ------------------------------- | --------------------------------------------------------------- |
| `paymentService.ts`             | Route IPS payments through existing payment pipeline            |
| `disbursementService.ts`        | B2P bulk disbursements via IPS                                  |
| `settlementService.ts`          | Consume IPS settlement files alongside existing pacs.009        |
| TigerBeetle Ledger              | Double-entry bookkeeping for all IPS transactions               |
| `payment-webhook` Edge Function | Receive IPS callbacks and async responses                       |
| Payment Gateway                 | Add IPS as a new payment provider alongside MTC MoMo, TN Mobile |

---

## 14. Phase 2 Features (Post Go-Live)

These use cases are planned for Phase 2:

- **Request-to-Pay** (Collect — payee-initiated)
- **Person-to-Government (P2G)** (Tax payments, fees)
- **Cross-Border Payments**
- **Mandate/Recurring Payments** (Standing orders, subscriptions)
- **Open Banking** integration

---

## 15. Document Cross-Reference

| Document                   | Key Content                                                                                                   | Status                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| **IPS TSD v0.7**           | Full API specifications, XML schemas, sequence diagrams, certificate requirements, registration/payment flows | Primary technical reference  |
| **IPP FSD v10.0**          | Functional flows, use cases, settlement process, pricing, business rules, participant onboarding              | Primary functional reference |
| **IPP Error Codes**        | Complete error/response code tables for all APIs                                                              | Reference                    |
| **IPN Scheme Rules v0.3**  | Legal framework, participant rights/duties, compliance, suspension/termination                                | Governance reference         |
| **IPP Product Rules v0.5** | Handle rules, registration journeys, transaction limits, merchant rules                                       | Product/UX reference         |

### Converted Markdown Files (via markitdown)

| Source PDF                                                          | Converted MD                  | Lines  |
| ------------------------------------------------------------------- | ----------------------------- | ------ |
| `20251117_BON_Instant Payment Solution (IPS) TSD_v0.7_unlocked.pdf` | `IPS_TSD_v0.7.md`             | 35,017 |
| `20251022_IPP Functional Specification Document (FSD)_v10.0.pdf`    | `IPP_FSD_v10.0.md`            | 11,937 |
| `20240913_IPP Error and Response Codes_vShared.pdf`                 | `IPP_Error_Response_Codes.md` | 1,587  |
| `20251022_IPN Scheme Rules v 0.3_vShared.pdf`                       | `IPN_Scheme_Rules_v0.3.md`    | 3,159  |
| `20250313_IPP Product Rules v.0.5.pdf`                              | `IPP_Product_Rules_v0.5.md`   | 2,942  |

---

_This analysis was produced by converting IPP documentation to Markdown using Microsoft's [markitdown](https://github.com/microsoft/markitdown) tool, then synthesizing across all 5 source documents._
