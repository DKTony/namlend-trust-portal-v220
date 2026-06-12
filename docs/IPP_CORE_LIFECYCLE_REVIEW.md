# IPP Core Lending Lifecycle Review

Date: 2026-05-14

## Scope

This review covers the revenue-critical NamLend lending path:

1. Client submits a loan application for N$1,350.
2. Admin or loan officer approves the application.
3. Admin disburses the loan through IPP/IPS.
4. Client repays the loan through IPP/IPS.
5. Admin verifies the loan reaches `paid_off`.
6. Settlement/reconciliation generates IPP raw-data evidence containing the transaction.

## Defects Found And Fixed

- The IPP lifecycle E2E previously passed even when disbursement only reached "initiated"; repayment was skipped when the loan never became payable.
- `json_mock` IPP mode attempted external HTTP calls and only moved transactions to `processing`. It now deterministically records mock API evidence and completes normal disbursement and collection transactions.
- The client payment page excluded `funded` loans, even though the Convex repayment mutation accepts `active` and `funded` loans.
- The payment E2E clicked a broad `/Pay/` selector that could hit navigation instead of the submit control. The page now exposes `data-testid="payment-submit-button"`.
- Settlement report hooks returned Convex camelCase records to UI components expecting snake_case report data. Raw Data and NTSL viewers now display generated Convex settlement reports.
- E2E seed data now includes `client1@fnb` plus NamLend and FNB settlement participants so inter-participant settlement obligations can be produced.
- TigerBeetle outbox processing now checks HTTP failures, records correct IPP transfer codes, includes IPP direction in ledger payloads, and supports deterministic shadow mode when no `TIGERBEETLE_HTTP_URL` is configured.

## Verified Evidence

Command:

```bash
DOTENV_CONFIG_PATH=.env.local npx playwright test e2e/ipp-lifecycle.e2e.ts
```

Result:

```text
6 passed
```

The serial test now verifies:

- N$1,350 client application is submitted.
- Admin approval produces a disbursable loan.
- IPP disbursement completes and the loan becomes `funded`.
- Client IPP repayment completes.
- Admin loan card shows `paid_off` and no longer shows disbursement actions.
- Settlement run is created, processed, and settled.
- Raw Data report contains `client1@fnb` and `N$1,350.00`.

Supporting checks:

```bash
npx tsc --noEmit
npm run test:unit -- src/tests/ipsTransactionLimits.test.ts src/tests/ipsXmlBuilder.test.ts src/tests/ippOperationsRules.test.ts src/tests/ipsErrorCodes.test.ts src/tests/loanCalculations.test.ts
```

Result: TypeScript passed; 61 unit tests passed.

## Operational Notes

- Local and CI E2E use `IPS_PROTOCOL_MODE=json_mock`; this is a deterministic simulator for business-flow testing, not a Bank of Namibia production rail.
- Convex remains authoritative for loan, disbursement, payment, IPP transaction, and settlement state.
- TigerBeetle is a shadow ledger path. If `TIGERBEETLE_HTTP_URL` is unset, the outbox worker records deterministic shadow transfer evidence without a live TigerBeetle HTTP service. Set `TIGERBEETLE_HTTP_URL` to validate live TigerBeetle posting.
- Supabase seeding may still log invalid legacy admin credentials during E2E setup. This does not affect the Convex-backed UI lifecycle test.
