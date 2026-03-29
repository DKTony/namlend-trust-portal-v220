# NamLend Trust Documentation Index

**Doc Revision**: 2026-03-29
**Project Version**: 5.2.1 (Execution Hardening)
**Status**: Production-Ready Digital Lending Platform — Backend on Convex + Financial Ontology Engine

---

## Quick Start

| Goal                  | Document                                   |
| --------------------- | ------------------------------------------ |
| Get set up locally    | [QUICK_START.md](./QUICK_START.md)         |
| Understand the system | [ARCHITECTURE.md](./ARCHITECTURE.md)       |
| AI/LLM agent context  | [AGENTS.md](./AGENTS.md)                   |
| Database schema       | [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) |
| Service layer         | [SERVICES.md](./SERVICES.md)               |
| Run E2E tests         | [TESTING.md](./TESTING.md)                 |
| Terminology           | [GLOSSARY.md](./GLOSSARY.md)               |

---

## Core Documentation

### Architecture & Design

| Document                                                                 | Description                                                   | Status |
| ------------------------------------------------------------------------ | ------------------------------------------------------------- | ------ |
| [ARCHITECTURE.md](./ARCHITECTURE.md)                                     | System architecture overview                                  | Active |
| [ONTOLOGY_ENGINE.md](./ONTOLOGY_ENGINE.md)                               | Financial Ontology Engine implementation report (v5.2.1)      | Active |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)                               | Convex schema reference (67+ tables incl. 12 ontology)        | Active |
| [SERVICES.md](./SERVICES.md)                                             | Service layer + migration status table                        | Active |
| [convexmigratehandover.md](./convexmigratehandover.md)                   | Convex migration handover — batch status, field maps, gotchas | Active |
| [FLOWS.md](./FLOWS.md)                                                   | User flows and state machines                                 | Active |
| [FLOW_VALIDATION_PLAN.md](./FLOW_VALIDATION_PLAN.md)                     | End-to-end flow validation approach                           | Active |
| [FLOW_VALIDATION_MATRIX.md](./FLOW_VALIDATION_MATRIX.md)                 | Action-level flow conformance tracker                         | Active |
| [FLOW_FIX_PR_TASKS_2026-02-15.md](./FLOW_FIX_PR_TASKS_2026-02-15.md)     | Owner/severity backlog for static flow gaps                   | Active |
| [FUNCTIONALITY_MAP.md](./FUNCTIONALITY_MAP.md)                           | Feature implementation status                                 | Active |
| [ARCHITECTURAL_REVIEW.md](./ARCHITECTURAL_REVIEW.md)                     | Modularization plan & domain event bus roadmap                | Active |
| [FOLLOWUP_ASSESSMENT_2026-03-19.md](./FOLLOWUP_ASSESSMENT_2026-03-19.md) | Remaining work quantification (ground-truth audit)            | Active |
| [API_REFERENCE.md](./API_REFERENCE.md)                                   | RPC functions and API endpoints                               | Active |

### UI/UX & Design

| Document                                         | Description                          | Status    |
| ------------------------------------------------ | ------------------------------------ | --------- |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)           | Neo-Fintech design system guidelines | Active    |
| [UI_DESIGN.md](./UI_DESIGN.md)                   | UI component specifications          | Reference |
| [UI_UX_AUDIT_REPORT.md](./UI_UX_AUDIT_REPORT.md) | UX audit findings                    | Reference |

### Security & Operations

| Document                                                   | Description                                 | Status |
| ---------------------------------------------------------- | ------------------------------------------- | ------ |
| [SECURITY.md](./SECURITY.md)                               | Security implementation (RLS, auth, audit)  | Active |
| [TESTING.md](./TESTING.md)                                 | E2E testing guide with Playwright           | Active |
| [E2E_TEST_FIX_2026_03_22.md](./E2E_TEST_FIX_2026_03_22.md) | Loan application E2E test fix & KYC seeding | Active |
| [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md)                   | Outstanding technical debt items            | Active |
| [TYPE_SAFETY_REMEDIATION.md](./TYPE_SAFETY_REMEDIATION.md) | TypeScript type safety fixes                | Active |

---

## Integration Guides

### IPP/IPS (Instant Payment Platform)

> **Note**: IPP/IPS documentation is split across root-level guides and the `/IPP/` subdirectory containing Bank of Namibia specifications.

| Document                                                                                     | Description                    | Status    |
| -------------------------------------------------------------------------------------------- | ------------------------------ | --------- |
| [IPP_INTEGRATION.md](./IPP_INTEGRATION.md)                                                   | Main IPP integration guide     | Active    |
| [IPS_IMPLEMENTATION.md](./IPS_IMPLEMENTATION.md)                                             | IPS implementation summary     | Active    |
| [IPS_PRODUCTION_CHECKLIST.md](./IPS_PRODUCTION_CHECKLIST.md)                                 | Production readiness checklist | Active    |
| [IPS_TESTING.md](./IPS_TESTING.md)                                                           | IPS-specific test guide        | Active    |
| [IPP_ONBOARDING_NAMLEND_COMPLETE_HANDOVER.md](./IPP_ONBOARDING_NAMLEND_COMPLETE_HANDOVER.md) | IPP onboarding documentation   | Reference |

#### IPP Reference Documents (`/IPP/` subdirectory)

| Document                                                       | Description                     |
| -------------------------------------------------------------- | ------------------------------- |
| [IPP_FUNCTIONAL_OVERVIEW.md](./IPP/IPP_FUNCTIONAL_OVERVIEW.md) | Functional overview             |
| [IPP_GOVERNANCE.md](./IPP/IPP_GOVERNANCE.md)                   | Governance and compliance       |
| [IPP_IMPLEMENTATION_PLAN.md](./IPP/IPP_IMPLEMENTATION_PLAN.md) | Implementation roadmap          |
| [IPP_TECHNICAL_REFERENCE.md](./IPP/IPP_TECHNICAL_REFERENCE.md) | Technical specifications        |
| Bank of Namibia PDFs                                           | Official IPS/IPP specifications |

### TigerBeetle (Financial Ledger)

| Document                                                         | Description                      | Status |
| ---------------------------------------------------------------- | -------------------------------- | ------ |
| [TIGERBEETLE_IMPLEMENTATION.md](./TIGERBEETLE_IMPLEMENTATION.md) | TigerBeetle integration overview | Active |
| [TIGERBEETLE_MCP_SETUP.md](./TIGERBEETLE_MCP_SETUP.md)           | MCP server setup guide           | Active |
| [TIGERBEETLE_PRODUCTION.md](./TIGERBEETLE_PRODUCTION.md)         | Production deployment guide      | Active |

---

## Technical Context

| Document                                               | Description                                | Status |
| ------------------------------------------------------ | ------------------------------------------ | ------ |
| [context.md](./context.md)                             | Complete technical handover document       | Active |
| [settlement.md](./settlement.md)                       | Settlement processing deep dive            | Active |
| [convexmigratehandover.md](./convexmigratehandover.md) | Convex migration batch status + next steps | Active |

---

## Changelog & Releases

| Document                                               | Description                       | Status     |
| ------------------------------------------------------ | --------------------------------- | ---------- |
| [CHANGELOG.md](./CHANGELOG.md)                         | Version history and release notes | Active     |
| [RELEASE_v2.8.4.md](./RELEASE_v2.8.4.md)               | v2.8.4 release notes              | Historical |
| [DEPLOYMENT_2026_01_06.md](./DEPLOYMENT_2026_01_06.md) | Jan 6 deployment notes            | Historical |

---

## Historical & Reference Documents

> **Note**: These documents are historical snapshots preserved for reference. Verify information against current codebase before acting on them.

| Document                                                                                                    | Description                         | Status                |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------------- | --------------------- |
| [RESOLUTION_FRAMEWORK_LOAN_FLOW.md](./RESOLUTION_FRAMEWORK_LOAN_FLOW.md)                                    | Loan flow debugging (Jan 2026)      | Historical - Resolved |
| [SETTLEMENT_INTEGRITY_REPORT.md](./SETTLEMENT_INTEGRITY_REPORT.md)                                          | Settlement audit (Dec 2025)         | Historical Snapshot   |
| [REVIEW_REMAINING_DISCREPANCIES_2026-01-06.md](./REVIEW_REMAINING_DISCREPANCIES_2026-01-06.md)              | Post-deployment review              | Historical            |
| [FLOW_VALIDATION_REPORT_2026-02-14.md](./FLOW_VALIDATION_REPORT_2026-02-14.md)                              | Flow conformance execution snapshot | Validation Snapshot   |
| [E2E_AUTH_PERSISTENCE_FIX.md](./E2E_AUTH_PERSISTENCE_FIX.md)                                                | Auth persistence fix details        | Historical - Resolved |
| [HANDOVER_API_MIGRATION.md](./HANDOVER_API_MIGRATION.md)                                                    | API migration handover notes        | Reference             |
| [PRODUCT_IMPROVEMENT_PLAN.md](./PRODUCT_IMPROVEMENT_PLAN.md)                                                | Feature roadmap snapshot            | Historical Roadmap    |
| [NamLend Trust – Market Research...](./NamLend%20Trust%20–%20Market%20Research%20Gaps%20in%20Functional.md) | Market research analysis            | Historical Research   |

---

## Document Categories

### By Audience

| Audience               | Key Documents                                                         |
| ---------------------- | --------------------------------------------------------------------- |
| **New Developers**     | INDEX.md → ARCHITECTURE.md → SERVICES.md → TESTING.md                 |
| **Architects/Leads**   | ARCHITECTURAL_REVIEW.md → ARCHITECTURE.md → TECHNICAL_DEBT.md         |
| **AI/LLM Agents**      | CLAUDE.MD (root) → AGENTS.md → convexmigratehandover.md → GLOSSARY.md |
| **Backend Engineers**  | DATABASE_SCHEMA.md → SERVICES.md → context.md                         |
| **Frontend Engineers** | DESIGN_SYSTEM.md → FLOWS.md → FUNCTIONALITY_MAP.md                    |
| **DevOps/SRE**         | SECURITY.md → TESTING.md → DEPLOYMENT docs                            |
| **Integration Work**   | IPP*INTEGRATION.md → TIGERBEETLE*\*.md                                |

### By Status

| Status                    | Meaning                               |
| ------------------------- | ------------------------------------- |
| **Active**                | Current, authoritative documentation  |
| **Reference**             | Useful context, may need verification |
| **Historical**            | Preserved for context, not current    |
| **Historical - Resolved** | Issue documented and fixed            |

---

## Terminology

See [GLOSSARY.md](./GLOSSARY.md) for standardized definitions of:

- IPP/IPS (Instant Payment Platform/System)
- VPA (Virtual Payment Address)
- pacs.009, pacs.002 (ISO 20022 messages)
- Settlement, reconciliation, disbursement terms

---

## Related Files (Outside `/docs/`)

| Location                | Purpose                                         |
| ----------------------- | ----------------------------------------------- |
| `/CLAUDE.MD`            | AI agent context (root-level, start here)       |
| `/README.md`            | Project setup and overview                      |
| `/convex/`              | **Active backend** (schema, queries, mutations) |
| `/e2e/`                 | Playwright E2E test files                       |
| `/supabase/migrations/` | INACTIVE — legacy SQL migrations (reference)    |
| `/supabase/functions/`  | INACTIVE — legacy Edge Functions (reference)    |

---

## Maintenance

- **Last audited**: 2026-03-19
- **Maintainer**: Development team
- **Update frequency**: With major releases

When adding new documentation:

1. Add entry to appropriate section in this INDEX
2. Include standard header: `Doc Revision`, `Status`
3. Cross-reference related documents
4. Mark historical docs with clear status notes
