# ADR 0002: Risk-tiered agent authority

- Status: accepted
- Date: 2026-08-12
- Owner: NamLend Engineering

## Decision

Unattended work is limited to policy-validated R0/R1 tasks. R2 is human-led and R3
is protected. Humans alone may merge, deploy, seed, migrate, backfill, access
production or change protected lending, identity, data, integration and policy
boundaries.

## Consequences

One human approval is required generally and two distinct human approvals are
required for protected changes. A severe violation disables dispatch and requires
incident review plus reevaluation.
