# IPP Settlement (IRCS Back Office) — Developer Implementation Guide

> **Purpose**: This document describes, end-to-end, how to implement the IPP settlement process as executed by the **IRCS Back Office (offline environment)**, including **netting**, **pacs.009 (MNSB) generation**, the **NISS/SWIFT/AXWAY file flow**, **acknowledgements**, **reporting**, **exception handling**, and **operational controls**.
>
> **Primary sources**: IPP Functional Specification Document (FSD) v10.0 (Back Office & Settlement Services, Section 20) and IPN Scheme Rules v0.3.

---

## 1) Settlement model in one page

### 1.1 DNS upstream, RTGS downstream
IPP/IPS settlement follows a **Deferred Net Settlement (DNS)** model: transactions are aggregated over a settlement window, **netted**, and submitted to **NISS** in batches as an **ISO 20022 MNSB file (pacs.009)**. The NISS then posts the resulting net obligations using RTGS infrastructure (i.e., net values are posted in real time once accepted).  

### 1.2 What gets settled
Within each settlement window, IRCS Back Office:
- Includes **successful transactions** in settlement preparation.
- **Excludes disputed transactions** from the current settlement run; they are handled via adjustment/dispute mechanisms and may affect future cycles.
- Nets **participant obligations** and also nets/settles **interchange** similarly to transaction amounts.
- Settles **switching fees** separately: debited from each participant and credited to the IPS Operator nominated NISS settlement account.

### 1.3 Key outputs
Per settlement run/window, IRCS produces:
- **pacs.009 settlement batch file** (net obligations between participants)
- **pacs.009 switching-fee batch file** (participant → IPS Operator)
- Participant reporting files: **Raw Data**, **NTSL (Net Settlement Report)**, **Adjustment files**, **Pending reports**, **Timeout reports**.

---

## 2) End-to-end components and responsibilities

### 2.1 Logical components
**Online**
- **IPS Switch / Transaction Engine**: processes instant payment transactions online.

**Offline / Back Office**
- **IRCS Back Office (offline environment)**:
  - Attaches fees/charges
  - Reconciliation + settlement calculations
  - Dispute, chargeback, adjustment processes
  - Scheduling and master configuration
  - Batch/file generation (File Process Generator / Batch Processor)
  - Audit trail + monitoring

**File transport and settlement rails**
- **SFTP folder** (outbound/inbound)
- **Trustlink AXWAY** (file retrieval + routing)
- **SWIFT** (validation and routing)
- **NISS** (validation and settlement posting)

### 2.2 Settlement agency / finality
- Bank of Namibia (BoN) is the settlement agency operating NISS; settlement entries posted to NISS are **final and irrevocable** and are submitted via a secure channel.

---

## 3) Identifiers and participant mapping (critical for settlement)

### 3.1 Routing vs settlement identifiers
- **IFSC-like participant code** (issued by IPS Operator): used for *online routing* on the switch.
- **SWIFT code (BIC)**: used for *settlement* purposes in the back office.

IRCS must maintain a **mapping** between participant routing identifiers (IFSC-like) and settlement identifiers (SWIFT/BIC).

### 3.2 Tiered participation (direct vs sponsored)
All participants must be settled through NISS:
- **Direct participant**: has its own NISS settlement account.
- **Sponsored (indirect) participant**: does *not* have a NISS settlement account; it participates via a sponsor (direct participant). In settlement, the indirect participant’s obligations are posted against the **sponsor’s NISS account**.

**Implementation requirement**: IRCS must resolve every transaction’s settlement leg(s) to the **effective settlement participant** (direct participant / sponsor) before netting.

---

## 4) Settlement cycles (windows) and scheduling

### 4.1 Settlement windows are configuration, not code
Although the documentation provides example windows, implementations must treat windows as **configuration** because:
- windows can change post go-live,
- additional windows may be enabled later,
- public holiday calendars vary.

### 4.2 Documented go-live windows (examples)
Scheme Rules indicate:
- Weekdays: SW1 08:00, SW2 12:00, SW3 15:00
- Saturdays: SW1 11:00
- (Future) additional windows may be enabled.

FSD states:
- three weekday cut-off times (8:00, “11:00pm”, 15:00) and Saturday settlements at 9:00 and 12:00,
- no settlement on Sundays/public holidays,
- batches created between Saturday 15:00 and Sunday 15:00 settle with the Monday morning batch.

**Action**: Implement a configurable schedule with:
- a per-day calendar (weekday vs Saturday),
- public holiday suppression,
- an “overflow carry” policy for weekend batches (if applicable).

---

## 5) Settlement run: lifecycle states and invariants

### 5.1 Settlement run invariants
A settlement run is uniquely identified by:
- `settlement_date`
- `window_id` (SW1/SW2/SW3…)
- `run_seq` (if retried)
- `currency` (NAD)
- `scheme_version` (for audit)

Invariants:
- Settlement is executed in the IRCS Back Office offline environment.
- The settlement file submitted to NISS contains:
  - net positions among participants that have mutual obligations (netted),
  - single instructions where no mutual obligation exists,
  - separate switching-fee instructions to the IPS Operator account.
- Once accepted by NISS, settlement is final; discrepancies are handled *after* settlement via adjustments.

### 5.2 Recommended run state machine
Use a state machine so ops + engineering can reason about “where the run is”:

1. **COLLECTING**: accepting transactions for the window
2. **CUTOFF_REACHED**: window closed (no more tx)
3. **PREPARE_INPUTS**: pull eligible tx + fee schedules + sponsorship map
4. **NETTING**: compute obligations and fees
5. **GENERATED**: pacs.009 files + reports generated and versioned
6. **DISPATCHED**: files placed on SFTP outbound, awaiting pickup
7. **SENT_TO_SWIFT**: AXWAY picked up and transmitted
8. **SWIFT_VALIDATED**: SWIFT validation passed
9. **SENT_TO_NISS**: delivered to NISS
10. **NISS_ACCEPTED**: xsys.002 received (success)
11. **FAILED_VALIDATION**: xsys.001 / xsys.003 received (error path)
12. **SETTLED**: settlement confirmed + reports distributed
13. **CLOSED**: run locked (immutable)
14. **ADJUSTMENT_PENDING**: if disputes require later adjustment runs

---

## 6) Data inputs to netting

### 6.1 Transaction eligibility
For each settlement window, input transactions must be filtered:
- `status == SUCCESS` (or equivalent final-success)
- `dispute_flag == false` (disputed excluded from settlement run)

### 6.2 Minimum per-transaction attributes required for netting
For each eligible transaction:
- `tx_id` (globally unique)
- `tx_datetime` (for window assignment)
- `remitter_participant_id` (routing code)
- `beneficiary_participant_id` (routing code)
- `amount` (NAD)
- `product_type / channel` (if fees depend on product)
- `fee_context` (e.g., who pays interchange / switching)
- `reversal/chargeback markers` (if included as adjustments later, not in run)

### 6.3 Configuration required
- Participant master:
  - routing code, SWIFT/BIC, NISS account details (if direct), sponsor mapping (if indirect), operator flags.
- Fee schedules:
  - interchange rules (direction + rate)
  - switching fee rules (rate; always participant→operator)
- Holiday calendar and window schedule.

---

## 7) Netting and settlement calculation

### 7.1 Netting model in the FSD
FSD describes “bilateral gross settlement with netting between participants”:
- multiple transactions between two participants are netted into a single net entry
- if there is no mutual obligation, it remains a single instruction
- interchange is treated similarly to transaction settlement amounts
- switching fee is settled separately to IPS Operator.

### 7.2 Canonical obligation ledger (recommended approach)
To make the implementation robust, first build an **obligation ledger**, then net it.

Represent obligations as immutable entries:

```text
ObligationEntry {
  run_id
  source_participant_settlement_id   // who pays (debited)
  target_participant_settlement_id   // who receives (credited)
  category: PRINCIPAL | INTERCHANGE | SWITCHING_FEE | PENALTY | ADJUSTMENT
  amount (positive NAD)
  source_tx_id (optional)
  metadata (fee rule id, product, etc.)
}
```

Then net obligations **per (source, target, category group)** or as required by scheme.

### 7.3 Bilateral netting algorithm (pairwise)
For each unordered pair (A,B):

- Let `A_to_B = sum(amount where source=A, target=B, category in {PRINCIPAL, INTERCHANGE})`
- Let `B_to_A = sum(amount where source=B, target=A, category in {PRINCIPAL, INTERCHANGE})`

If both exist:
- If `A_to_B > B_to_A` => create net instruction `A pays B (A_to_B - B_to_A)`
- If `B_to_A > A_to_B` => create net instruction `B pays A (B_to_A - A_to_B)`
- If equal => no instruction for this pair (zero net)

If only one direction exists:
- create a single instruction for that direction.

**Switching fee**:
- for each participant P, compute `switching_fee(P)` and create instruction `P pays OPERATOR switching_fee(P)`.

### 7.4 Sponsored participants resolution
Perform resolution *before* netting:
- Map (routing participant) → (effective settlement participant)
- If participant is indirect, map to sponsor SWIFT settlement id.
- Keep the original participant id in metadata for reporting and audit.

---

## 8) pacs.009 (MNSB) generation

### 8.1 What pacs.009 is used for here
The MNSB file submitted to NISS is an ISO 20022 **pacs.009** file (Financial Institution Credit Transfer), used as the settlement instruction batch.

### 8.2 FSD guidelines for pacs.009 file creation
From the FSD “Pacs.009 File Specifications”:
1. A batch file is created containing all pacs.009 messages.
2. One batch file is created for each settlement window.
3. Multiple settlement cycles occur per day; multiple batch files must be created.
4. A separate batch file is created for **switching fee** collection/settlement.
5. A pacs.009 message must be created for each bilateral participant combination with a **non-zero** net settlement amount. (No messages for zero net.)

### 8.3 Batch structure (recommended)
Most implementations use:
- **One XML Document per batch**, with:
  - One Group Header (GrpHdr)
  - One Transaction Info block per net instruction (CdtTrfTxInf or equivalent)

You must align to the **NISS RTGS pacs.009 implementation guide** (if provided separately by BoN/NISS), especially for:
- namespace and schema version (`pacs.009.001.xx`)
- mandatory elements
- allowable character sets / field lengths
- settlement method / system codes
- BIC format and participant mapping rules

### 8.4 Field mapping (implementation pattern)
Below is a pragmatic mapping that works in most RTGS settlement contexts. Adjust to NISS-specific rules.

#### Group header (GrpHdr)
- `MsgId`: `RUNID-WINDOWID-BATCHSEQ` (unique; stable across retries or versioned)
- `CreDtTm`: generation timestamp (UTC or configured TZ)
- `NbOfTxs`: number of settlement transactions in the batch
- `CtrlSum`: sum of all `IntrBkSttlmAmt` (recommended)
- `SttlmInf`: settlement information required by RTGS (method, settlement date)

#### Each settlement instruction (CdtTrfTxInf)
- `PmtId/InstrId`: unique instruction id
- `PmtId/EndToEndId`: stable reference (`NET-{A}-{B}-{RUNID}`) or per NISS rules
- `IntrBkSttlmAmt`: settlement amount (NAD)
- `IntrBkSttlmDt`: settlement date
- `DbtrAgt/FinInstnId/BICFI`: debtor agent BIC (payer bank)
- `CdtrAgt/FinInstnId/BICFI`: creditor agent BIC (receiver bank)
- Optional remittance / additional info: encode `window_id`, `category`, `report_ref`

### 8.5 Two-batch pattern
Per window you typically generate:
- `BATCH_MAIN` (PRINCIPAL + INTERCHANGE net positions between participants)
- `BATCH_SWITCHING_FEE` (participant → IPS Operator)

This matches the “separate batch for switching fee” requirement.

---

## 9) File transport and settlement flow (SWIFT/AXWAY/NISS)

### 9.1 Normal flow (happy path)
1. IRCS Back Office batches transactions and completes net settlement calculation.
2. IRCS generates batches of pacs.009 messages and places them into the **SFTP outbound folder**.
3. Trustlink AXWAY retrieves the outbound batches and transmits to **SWIFT**.
4. SWIFT validates and routes to Trustlink AXWAY.
5. Trustlink AXWAY routes to **NISS** for settlement.
6. NISS validates the batch and processes settlement.
7. After successful settlement, NISS responds with **positive acknowledgement (xsys.002)** via AXWAY, and sends a copy of the batch to IRCS and relevant participants.
8. The xsys.002 flows back to IRCS via SFTP inbound, and IRCS generates/distributes transaction and reconciliation reports to participants via SFTP/FTP distribution.

### 9.2 Validation failure and acknowledgements
Acknowledgement patterns mentioned in the FSD flow:
- **xsys.001**: negative acknowledgement on failed validation.
- **xsys.003**: abort notification (SWIFT to AXWAY in failure flow).
- **xsys.002**: positive acknowledgement after successful settlement.

You must implement an inbound listener/parser for these acknowledgements and correlate them to:
- settlement run id
- batch id
- instruction ids (if available)

---

## 10) Exception handling flows (must be implemented)

### 10.1 Failed NISS validation (FSD 20.6.3)
If NISS fails validation:
- NISS issues **xsys.001** negative acknowledgement and transmits the failed batch to AXWAY.
- AXWAY routes the failed batch to SWIFT.
- SWIFT sends **xsys.003 abort notification** to AXWAY.
- AXWAY routes the failed batch to SFTP inbound and notifies IRCS.
- IRCS Back Office **manually amends** the failed batch and re-uploads it to SFTP outbound.
- The amended batch re-enters AXWAY → SWIFT → AXWAY → NISS.
- On success, NISS returns **xsys.002** and IRCS distributes reports.

### 10.2 Failed SWIFT validation (FSD 20.6.2)
The FSD also defines an exception handling flow for SWIFT validation failures. Implement it as a sibling state machine path, with:
- capture of SWIFT-side validation errors (if provided),
- batch quarantine,
- controlled manual amendment/reissue,
- audit logging of who changed what and why.

### 10.3 Operational controls for exception handling (recommended)
- **Quarantine store**: store the exact failed batch file bytes + checksum.
- **Amendment workflow**:
  - role-based access (operator-only)
  - diff view (original vs amended)
  - mandatory reason code
- **Reissue sequencing**:
  - same `run_id` but increment `run_seq` or `amendment_seq`
  - ensure NISS accepts uniqueness constraints (do not reuse `MsgId` if prohibited)

---

## 11) Reporting & reconciliation deliverables

### 11.1 Files produced by IRCS Back Office
IRCS produces (daily and/or per window):
- Raw data
- NTSL (Net Settlement Report)
- Adjustment file
- Pending for response to adjustment
- Pending for status report
- Timeout report

Distribution:
- reports are uploaded to a Clearing House Gateway by FTP and then sent to participants; produced multiple times daily.

### 11.2 NTSL content (minimum)
Each participant receives an NTSL containing:
- settlement obligations (credits + debits)
- interchange to be paid and owed
- switching fee owed to IPS Operator
Raw data file accompanies NTSL and contains transaction-level breakdown; participants only see transactions where they are remitter or beneficiary.

**Important**: settlement info is shared at the same time the settlement file is submitted to RTGS; participant verification does not block settlement; discrepancies are handled after settlement.

### 11.3 Adjustments, disputes, and deemed handling (scheme rules)
Scheme rules highlight:
- reconciliation involves comparison of raw data/CBS/switch files and discrepancy resolution via operations portal.
- deemed transaction handling uses TCC/RET/DRC processes.
- settlement batch includes “penalties or adjustments” where applicable.

**Implementation**:
- Ensure disputed transactions do not enter the current settlement batch.
- Ensure adjustment runs produce obligations that flow into future MNSB/pacs.009 files.

---

## 12) Liquidity management and exposure monitoring

### 12.1 Exposure values per settlement window
IRCS provides exposure values per settlement window:
- participants can view only their own exposures
- operator and BoN can view total/system-wide exposures

**Implementation**:
- compute exposures during NETTING:
  - `gross_payables`, `gross_receivables`
  - `net_payable_or_receivable`
  - `switching_fee_payable`
  - `interchange_net`
- expose via an authenticated portal/API with role-based access.

---

## 13) Reference implementation blueprint (what to build)

### 13.1 Services/modules (recommended)
1. **Window Scheduler**
   - determines cutoff times
   - suppresses runs on public holidays / Sundays
   - triggers settlement run pipeline

2. **Settlement Input Collector**
   - queries eligible transactions for window
   - resolves participant mapping (IFSC→SWIFT, indirect→sponsor)
   - pulls fee schedules

3. **Netting Engine**
   - produces obligation ledger entries
   - produces net instructions (participant↔participant; participant→operator)

4. **pacs.009 Generator**
   - builds ISO 20022 XML per NISS RTGS requirements
   - creates two batch files per window (main + switching fee)
   - validates schema locally before dispatch

5. **File Dispatcher**
   - writes to SFTP outbound
   - records checksum, size, timestamps
   - supports replay with versioned ids

6. **Acknowledgement Ingestor**
   - ingests inbound xsys.* acks from SFTP inbound
   - correlates to batch/run
   - advances run state machine

7. **Report Generator**
   - produces raw, NTSL, adjustment, pending, timeout
   - delivers via FTP/SFTP to clearing house gateway + participants

8. **Ops Console**
   - run overview, drilldowns, audit
   - quarantine + amendment workflow
   - reissue controls

### 13.2 Database schema (minimal)
- `participants` (routing_code, swift_bic, direct_flag, sponsor_id, niss_account_ref, status)
- `settlement_windows` (window_id, days_of_week, cutoff_time, enabled)
- `holiday_calendar` (date, description)
- `transactions` (tx_id, timestamp, remitter_id, beneficiary_id, amount, status, dispute_flag, …)
- `fees` (fee_rule_id, type, parameters, effective_from, effective_to)
- `settlement_runs` (run_id, window_id, date, state, amendment_seq, created_at, …)
- `obligations` (run_id, src_settlement_id, dst_settlement_id, category, amount, tx_id, …)
- `net_instructions` (run_id, src, dst, amount, category_group, instruction_id)
- `pacs009_batches` (run_id, batch_type, msg_id, file_path, checksum, status)
- `acks` (msg_id, ack_type, received_at, raw_payload, correlation_keys)
- `reports` (run_id, participant_id, report_type, file_path, checksum)

---

## 14) Pseudocode (battle-tested patterns)

### 14.1 Window run driver
```pseudo
on_cutoff(window):
  run = create_run(window, date, state=CUTOFF_REACHED)
  tx = collect_transactions(window, date)
  tx = filter_success_and_not_disputed(tx)
  tx = resolve_settlement_participants(tx)  // indirect -> sponsor, IFSC -> SWIFT
  obligations = build_obligations(tx, fee_rules)
  net = net_obligations(obligations)        // bilateral netting
  batches = build_pacs009_batches(net)      // main + switching_fee
  validate_xml_schema(batches)
  write_sftp_outbound(batches)
  update_run_state(DISPATCHED)
```

### 14.2 Bilateral netting
```pseudo
net_map = map[(src,dst)] += amount for categories in PRINCIPAL+INTERCHANGE
for each unordered pair (A,B):
  x = net_map[A,B]
  y = net_map[B,A]
  if x > y: emit_instruction(A->B, x-y)
  if y > x: emit_instruction(B->A, y-x)
  if x == y: none

for each participant P:
  fee = switching_fee(P)
  if fee > 0: emit_instruction(P->OPERATOR, fee, batch_type=SWITCHING_FEE)
```

### 14.3 Ack ingestion
```pseudo
on_inbound_file(file):
  ack = parse_xsys(file)
  msg_id = ack.correlates_to_msg_id
  run = find_run_by_msg_id(msg_id)
  if ack.type == xsys.002:
     mark_batch_success(msg_id)
     if all_batches_success(run): run.state = NISS_ACCEPTED; generate_reports(run); run.state = CLOSED
  if ack.type in {xsys.001, xsys.003}:
     run.state = FAILED_VALIDATION
     quarantine(file, related_batch)
     notify_ops(run, ack)
```

---

## 15) Known gaps / items to confirm (implementation blockers)

To fully implement a production-grade solution, obtain or confirm:
1. **NISS pacs.009 implementation guide** (exact schema version, mandatory tags, code lists, MsgId uniqueness rules).
2. **File naming conventions** for outbound/inbound folders (if mandated).
3. **Settlement calendar** rules (especially the Saturday/Sunday carryover) to resolve discrepancies between documents.
4. **Fee computation rules** (interchange direction/ratios; switching fee formula, rounding, VAT if applicable).
5. **Participant master data**: SWIFT/BICs, sponsored participant mappings, operator nominated settlement account.
6. **Acknowledgement payload formats** for xsys.* messages (fields available for correlation).

---

## 16) References (internal)
- IPP Functional Specification Document (FSD) v10.0 — Section 20 (Back Office & Settlement Services), including:
  - Table 44 (Back-office process flow)
  - 20.4 Settlement Process
  - 20.5 Pacs.009 File Specifications
  - 20.6 Settlement flow + exception handling (xsys.001/xsys.002/xsys.003)
  - 20.7 Settlement times
  - 20.8–20.10 Reporting, NTSL, liquidity/exposure
- IPN Scheme Rules v0.3 — Settlement Framework, cycles, reporting, disputes and adjustments.
