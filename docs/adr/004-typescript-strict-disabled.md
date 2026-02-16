# ADR 004: TypeScript Strict Mode is Disabled

## Status

Accepted (November 2025), with incremental remediation plan

## Context

NamLend Trust's `tsconfig.app.json` has `strict: false` and `noImplicitAny: false`. This was an intentional decision made early in development (v1.0) for the following reasons:

1. **Supabase generated types**: The `src/integrations/supabase/types.ts` file uses permissive `any` types for the `Database` interface. Generating strict types requires a running Supabase instance (`npx supabase gen types typescript --local`), which is not always available in all development environments.

2. **Rapid prototyping phase**: The initial 4 development phases (v1.0-v2.3) prioritized feature completeness over type safety. With 150+ components and 25 services, retrofitting strict types would have significantly slowed delivery.

3. **Third-party integration complexity**: TigerBeetle, Africa's Talking SMS, and Meta WhatsApp APIs have varying type quality. Strict mode would require extensive type narrowing for external data.

## Decision

TypeScript strict mode remains disabled globally. Type safety is improved incrementally through:

1. **Type remediation sprints** (v2.8.0): 40 files fixed, 54 interfaces added to `src/types/`
2. **New code standards**: All new files should use explicit types (enforced by code review, not compiler)
3. **Per-file strict comments**: Critical financial files use `// @ts-check` or manual type narrowing
4. **Zod runtime validation**: All user input and external API responses are validated with Zod schemas at runtime boundaries

The incremental plan:

- Phase A (done): Add interfaces for all domain types in `src/types/`
- Phase B (in progress): Generate Supabase types from running instance
- Phase C (planned): Enable `noImplicitAny` first (least disruptive strict flag)
- Phase D (planned): Enable full `strict` mode once Phase B/C are stable

## Consequences

**Positive:**

- Faster development velocity during the rapid build phase
- No build failures from third-party library type mismatches
- Zod provides runtime safety at system boundaries regardless of compile-time types
- Incremental approach avoids a massive "big bang" migration

**Negative:**

- `any` types can hide bugs that would be caught by the compiler
- IDE autocompletion is less helpful without strict types
- Refactoring is riskier (e.g., renaming a field might not surface all usages)
- New developers may accidentally introduce untyped code

**Mitigations:**

- E2E tests (45+ files) catch runtime errors that type checking would prevent
- Service layer files have manually added type annotations for critical interfaces
- `TYPE_SAFETY_REMEDIATION.md` tracks progress and provides guidance for contributors
- Code review process explicitly checks for proper typing in financial operation code
