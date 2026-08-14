# ADR 0002: Risk-tiered agent authority

- Status: accepted
- Date: 2026-08-12
- Updated: 2026-08-14
- Owner: NamLend Engineering

## Decision

Unattended work is limited to policy-validated R0/R1 tasks. R2 is human-led and R3
is protected. Humans alone may merge, deploy, seed, migrate, backfill, access
production or change protected lending, identity, data, integration and policy
boundaries.

The repository currently has a single qualified human collaborator. Merge gates
are therefore solo-operator: `minimumHumanApprovals` and
`protectedMinimumHumanApprovals` are `0`. Risk-tiered Human Review remains a
required check and reports pass when the configured minimum is met. Agents still
cannot merge, deploy, seed, or perform other `alwaysForbiddenOperations`.

Two distinct human approvals for protected changes are a future hiring gate, to
be restored when a second qualified collaborator exists. They are not the current
merge gate.

## Consequences

CI, linear history, and agent forbidden operations remain the merge controls.
A severe violation disables dispatch and requires incident review plus
reevaluation.
