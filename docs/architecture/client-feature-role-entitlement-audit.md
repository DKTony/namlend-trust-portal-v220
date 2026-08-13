# Client Feature, Role, and Entitlement Audit

The canonical authority is `convex/lib/features.ts`. Client keys are deliberately separate from
similarly named backoffice keys, so disabling a client menu never disables staff servicing.

The presentation system remains single-light. OG Financial Services v2 assets are the trusted
fallback for public, loading, unentitled, and broken-custom-asset states. The existing
`whiteLabelBranding` backoffice entitlement permits a tenant admin to manage only that tenant's
approved identity fields, raster logo/favicon assets, and brand colors; it does not restore theme
variants or cross-tenant/global branding writes.

| Key                  | Client surface   | Direct route or tab                   | Client write enforcement                        | Dependencies      |
| -------------------- | ---------------- | ------------------------------------- | ----------------------------------------------- | ----------------- |
| `clientOverview`     | Overview         | `/dashboard` → overview               | none; quick actions use their own keys          | none              |
| `clientLoans`        | My Loans         | loans tab, `/loans/:id`               | none; retained own-loan reads                   | none              |
| `clientApplications` | Applications     | applications tab, `/loan-application` | draft creation and submission                   | `clientDocuments` |
| `clientPayments`     | Payments         | payments tab, `/payment`              | UI only; repayment processing remains available | none              |
| `clientBanking`      | Banking          | banking tab, IPP payment method       | onboarding, aliases, client IPP transactions    | `ippOnboarding`   |
| `clientBudget`       | Budget & Finance | `/budget`                             | UI only                                         | none              |
| `clientDocuments`    | Documents        | `/kyc`                                | upload, record, submit, preview/download grant  | none              |
| `clientSelfService`  | Self Service     | self-service tab                      | reschedule requests                             | none              |
| `clientProfile`      | Profile          | profile tab                           | optional dashboard only                         | none              |

## Enforcement invariants

- Navigation, dashboard state, direct routes, quick actions, payment methods, and server writes all
  consult the same canonical keys.
- If Overview is disabled, `/dashboard` chooses the first enabled entry in catalogue order. If no
  client features are enabled, the signed-in shell shows support guidance and sign-out.
- Tenant staff bypass Client Portal write keys only when their existing role/object checks permit
  the staff workflow. They remain subject to backoffice entitlements.
- `clientPayments` never gates the repayment mutation. `clientBanking` gates only the IPP rail.
- KYC submission still requires verified/complete KYC rules; disabling Documents never deletes a
  document. Mandatory profile completion is independent of `clientProfile`.
- `popiaConsent` gates consent-management UI and staff queries, not grant/withdraw/check primitives.
- `advancedAnalytics` gates advanced risk, revenue, trend, IPS analytics, reports, and exports. Core
  portfolio/client/payment aggregates used by always-on screens remain available.
- Unentitled authenticated tenants receive platform-default branding and cannot open or write the
  branding editor.

## Dependency and authority audit

- Plans and tenant overrides accept only `console !== "platform"` keys.
- Always-on backoffice capabilities cannot be revoked.
- Enabling a dependent without its prerequisite, or removing a prerequisite while a dependent is
  active, fails server-side with `FEATURE_DEPENDENCY_MISSING`; the owner UI blocks the same action.
- Plan changes, entitlement changes, applied backfills, protected-rule changes, and activation are
  formally audited while preserving `changedBy` metadata.
- Only `platform_owner` may mutate plans, entitlements, migrations, or protected activation rules.
  `platform_support` is audited read-only. Tenant roles have no control-plane mutation authority.
