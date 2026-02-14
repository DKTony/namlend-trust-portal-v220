# NamLend Trust Documentation Index

**Doc Revision**: 2026-01-19
**Project Version**: 2.8.4
**Status**: Production-Ready Digital Lending Platform

---

## Quick Start

| Goal | Document |
|------|----------|
| Get set up locally | [QUICK_START.md](./QUICK_START.md) |
| Understand the system | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| AI/LLM agent context | [AGENTS.md](./AGENTS.md) |
| Database schema | [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) |
| Service layer | [SERVICES.md](./SERVICES.md) |
| Run E2E tests | [TESTING.md](./TESTING.md) |
| Terminology | [GLOSSARY.md](./GLOSSARY.md) |

---

## Core Documentation

### Architecture & Design

| Document | Description | Status |
|----------|-------------|--------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture overview | Active |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | PostgreSQL tables, RLS policies, RPCs | Active |
| [SERVICES.md](./SERVICES.md) | Service layer implementation details | Active |
| [FLOWS.md](./FLOWS.md) | User flows and state machines | Active |
| [FUNCTIONALITY_MAP.md](./FUNCTIONALITY_MAP.md) | Feature implementation status | Active |
| [API_REFERENCE.md](./API_REFERENCE.md) | RPC functions and API endpoints | Active |

### UI/UX & Design

| Document | Description | Status |
|----------|-------------|--------|
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | Neo-Fintech design system guidelines | Active |
| [UI_DESIGN.md](./UI_DESIGN.md) | UI component specifications | Reference |
| [UI_UX_AUDIT_REPORT.md](./UI_UX_AUDIT_REPORT.md) | UX audit findings | Reference |

### Security & Operations

| Document | Description | Status |
|----------|-------------|--------|
| [SECURITY.md](./SECURITY.md) | Security implementation (RLS, auth, audit) | Active |
| [TESTING.md](./TESTING.md) | E2E testing guide with Playwright | Active |
| [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md) | Outstanding technical debt items | Active |
| [TYPE_SAFETY_REMEDIATION.md](./TYPE_SAFETY_REMEDIATION.md) | TypeScript type safety fixes | Active |

---

## Integration Guides

### IPP/IPS (Instant Payment Platform)

> **Note**: IPP/IPS documentation is split across root-level guides and the `/IPP/` subdirectory containing Bank of Namibia specifications.

| Document | Description | Status |
|----------|-------------|--------|
| [IPP_INTEGRATION.md](./IPP_INTEGRATION.md) | Main IPP integration guide | Active |
| [IPS_IMPLEMENTATION.md](./IPS_IMPLEMENTATION.md) | IPS implementation summary | Active |
| [IPS_PRODUCTION_CHECKLIST.md](./IPS_PRODUCTION_CHECKLIST.md) | Production readiness checklist | Active |
| [IPS_TESTING.md](./IPS_TESTING.md) | IPS-specific test guide | Active |
| [IPP_ONBOARDING_NAMLEND_COMPLETE_HANDOVER.md](./IPP_ONBOARDING_NAMLEND_COMPLETE_HANDOVER.md) | IPP onboarding documentation | Reference |

#### IPP Reference Documents (`/IPP/` subdirectory)

| Document | Description |
|----------|-------------|
| [IPP_FUNCTIONAL_OVERVIEW.md](./IPP/IPP_FUNCTIONAL_OVERVIEW.md) | Functional overview |
| [IPP_GOVERNANCE.md](./IPP/IPP_GOVERNANCE.md) | Governance and compliance |
| [IPP_IMPLEMENTATION_PLAN.md](./IPP/IPP_IMPLEMENTATION_PLAN.md) | Implementation roadmap |
| [IPP_TECHNICAL_REFERENCE.md](./IPP/IPP_TECHNICAL_REFERENCE.md) | Technical specifications |
| Bank of Namibia PDFs | Official IPS/IPP specifications |

### TigerBeetle (Financial Ledger)

| Document | Description | Status |
|----------|-------------|--------|
| [TIGERBEETLE_IMPLEMENTATION.md](./TIGERBEETLE_IMPLEMENTATION.md) | TigerBeetle integration overview | Active |
| [TIGERBEETLE_MCP_SETUP.md](./TIGERBEETLE_MCP_SETUP.md) | MCP server setup guide | Active |
| [TIGERBEETLE_PRODUCTION.md](./TIGERBEETLE_PRODUCTION.md) | Production deployment guide | Active |

---

## Technical Context

| Document | Description | Status |
|----------|-------------|--------|
| [context.md](./context.md) | Complete technical handover document | Active |
| [settlement.md](./settlement.md) | Settlement processing deep dive | Active |

---

## Changelog & Releases

| Document | Description | Status |
|----------|-------------|--------|
| [CHANGELOG.md](./CHANGELOG.md) | Version history and release notes | Active |
| [RELEASE_v2.8.4.md](./RELEASE_v2.8.4.md) | v2.8.4 release notes | Historical |
| [DEPLOYMENT_2026_01_06.md](./DEPLOYMENT_2026_01_06.md) | Jan 6 deployment notes | Historical |

---

## Historical & Reference Documents

> **Note**: These documents are historical snapshots preserved for reference. Verify information against current codebase before acting on them.

| Document | Description | Status |
|----------|-------------|--------|
| [RESOLUTION_FRAMEWORK_LOAN_FLOW.md](./RESOLUTION_FRAMEWORK_LOAN_FLOW.md) | Loan flow debugging (Jan 2026) | Historical - Resolved |
| [SETTLEMENT_INTEGRITY_REPORT.md](./SETTLEMENT_INTEGRITY_REPORT.md) | Settlement audit (Dec 2025) | Historical Snapshot |
| [REVIEW_REMAINING_DISCREPANCIES_2026-01-06.md](./REVIEW_REMAINING_DISCREPANCIES_2026-01-06.md) | Post-deployment review | Historical |
| [E2E_AUTH_PERSISTENCE_FIX.md](./E2E_AUTH_PERSISTENCE_FIX.md) | Auth persistence fix details | Historical - Resolved |
| [HANDOVER_API_MIGRATION.md](./HANDOVER_API_MIGRATION.md) | API migration handover notes | Reference |
| [PRODUCT_IMPROVEMENT_PLAN.md](./PRODUCT_IMPROVEMENT_PLAN.md) | Feature roadmap snapshot | Historical Roadmap |
| [NamLend Trust – Market Research...](./NamLend%20Trust%20–%20Market%20Research%20Gaps%20in%20Functional.md) | Market research analysis | Historical Research |

---

## Document Categories

### By Audience

| Audience | Key Documents |
|----------|---------------|
| **New Developers** | INDEX.md → ARCHITECTURE.md → SERVICES.md → TESTING.md |
| **AI/LLM Agents** | CLAUDE.md (root) → AGENTS.md → GLOSSARY.md |
| **Backend Engineers** | DATABASE_SCHEMA.md → SERVICES.md → context.md |
| **Frontend Engineers** | DESIGN_SYSTEM.md → FLOWS.md → FUNCTIONALITY_MAP.md |
| **DevOps/SRE** | SECURITY.md → TESTING.md → DEPLOYMENT docs |
| **Integration Work** | IPP_INTEGRATION.md → TIGERBEETLE_*.md |

### By Status

| Status | Meaning |
|--------|---------|
| **Active** | Current, authoritative documentation |
| **Reference** | Useful context, may need verification |
| **Historical** | Preserved for context, not current |
| **Historical - Resolved** | Issue documented and fixed |

---

## Terminology

See [GLOSSARY.md](./GLOSSARY.md) for standardized definitions of:
- IPP/IPS (Instant Payment Platform/System)
- VPA (Virtual Payment Address)
- pacs.009, pacs.002 (ISO 20022 messages)
- Settlement, reconciliation, disbursement terms

---

## Related Files (Outside `/docs/`)

| Location | Purpose |
|----------|---------|
| `/CLAUDE.md` | AI agent context (root-level) |
| `/README.md` | Project setup and overview |
| `/e2e/` | Playwright E2E test files |
| `/supabase/migrations/` | Database migration files |
| `/supabase/functions/` | Edge Function source code |

---

## Maintenance

- **Last audited**: 2026-01-19
- **Maintainer**: Development team
- **Update frequency**: With major releases

When adding new documentation:
1. Add entry to appropriate section in this INDEX
2. Include standard header: `Doc Revision`, `Status`
3. Cross-reference related documents
4. Mark historical docs with clear status notes
