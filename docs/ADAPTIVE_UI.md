# Adaptive UI System

**Doc Revision**: 2026-04-28  
**Status**: Active  
**Scope**: React web app layout, navigation, responsive primitives, and adaptive E2E coverage.

---

## Purpose

NamLend Trust now uses an app-wide adaptive interface system. Phone-sized screens behave like a compact mobile app, tablet-sized screens use a rail-first layout, and laptop/desktop screens expand into dense operational layouts.

This system is UI-only. It does not change Convex APIs, Supabase legacy references, APR rules, NAD currency formatting, audit behavior, role guards, or financial workflows.

---

## Design Principles

1. **Use window size classes, not device detection**  
   Layout decisions come from viewport width, height, hover capability, and pointer type.

2. **Mobile first, not mobile reduced**  
   Compact screens may change presentation, but features and primary actions remain visible or reachable.

3. **Dense on desktop, ergonomic on phone**  
   Desktop admin surfaces favor permanent navigation, wider grids, and inline action bars. Compact screens favor cards, stacked controls, drawers, and bottom navigation.

4. **Touch-safe controls**  
   Primary interactive elements target at least `44px` where practical. Hover-only affordances should not be required on touch-first screens.

5. **No horizontal overflow**  
   Screens should reflow at `360x740`, `390x844`, tablet, and desktop sizes without page-level horizontal scrolling.

6. **Viewport-safe shell sizing**  
   The app shell uses dynamic viewport sizing (`dvh`) and safe-area padding helpers so mobile browser chrome and notches do not hide content or controls.

---

## Size Classes

Implemented in `src/hooks/useAdaptiveLayout.ts`.

| Class      | Width Range | Primary Layout Behavior                                             |
| ---------- | ----------- | ------------------------------------------------------------------- |
| `compact`  | `< 640px`   | Drawer navigation, client bottom nav, stacked cards, drawer dialogs |
| `medium`   | `640-1023`  | Icon rail plus content, tablet grids, no permanent full sidebar     |
| `expanded` | `1024-1439` | Permanent sidebar, dense grids, inline action bars                  |
| `wide`     | `>= 1440`   | Permanent sidebar with constrained content width                    |

Additional flags:

| Flag              | Meaning                                                 |
| ----------------- | ------------------------------------------------------- |
| `isCompactHeight` | Viewport height `< 700px`; reduce vertical assumptions  |
| `isTouch`         | Coarse pointer or no-hover environment                  |
| `canHover`        | Hover-capable pointer; safe for hover-only enhancements |

---

## Public UI Interfaces

| Interface             | File                                              | Purpose                                                              |
| --------------------- | ------------------------------------------------- | -------------------------------------------------------------------- |
| `useAdaptiveLayout()` | `src/hooks/useAdaptiveLayout.ts`                  | Shared viewport, height, touch, and hover state                      |
| `AdaptiveShell`       | `src/components/adaptive/AdaptiveShell.tsx`       | App shell that switches drawer, rail, sidebar, and bottom navigation |
| `AdaptiveTabs`        | `src/components/adaptive/AdaptiveTabs.tsx`        | Scrollable compact tabs and grid desktop tabs                        |
| `ResponsiveActionBar` | `src/components/adaptive/ResponsiveActionBar.tsx` | Header/action rows that stack on compact screens                     |
| `AdaptiveDialog`      | `src/components/adaptive/AdaptiveDialog.tsx`      | Drawer on compact screens, dialog on wider screens                   |
| `AdaptiveCollection`  | `src/components/adaptive/AdaptiveCollection.tsx`  | Card-first compact collections with optional wide/table rendering    |
| Adaptive exports      | `src/components/adaptive/index.ts`                | Central import surface for adaptive primitives                       |

Use these primitives before adding route-specific responsive logic.

---

## Shell Behavior

### Client Shell

Implemented in `src/components/Layout/DashboardLayout.tsx`.

| Viewport      | Behavior                                                          |
| ------------- | ----------------------------------------------------------------- |
| Compact phone | Drawer trigger in header, bottom navigation for core client flows |
| Medium tablet | Icon rail plus content                                            |
| Desktop/wide  | Permanent themed sidebar plus dense main content                  |

Compact client bottom navigation includes the core routes/tabs: overview, loans, applications, payments, and profile where available. Secondary functions remain available through the drawer.

### Admin Shell

Implemented in `src/pages/AdminDashboard/AdminLayout.tsx` and `src/components/Layout/GroupedSidebar.tsx`.

| Viewport      | Behavior                                              |
| ------------- | ----------------------------------------------------- |
| Compact phone | Grouped drawer navigation with compact header actions |
| Medium tablet | Grouped icon rail                                     |
| Desktop/wide  | Permanent grouped sidebar with operational density    |

Admin navigation remains route-based under `/admin/*`. Role gates remain unchanged: `loan_officer` and `admin` can enter `/admin/*`; admin-only routes still require admin checks.

---

## Data Screen Patterns

Dense admin data screens now use compact-friendly card and action layouts while preserving all functionality.

Migrated surfaces:

- Loan management: `LoanManagementDashboard`, `LoanApplicationsList`
- Client management: `ClientManagementDashboard`, `ClientsList`
- Payments: `PaymentManagementDashboard`, `PaymentsList`, `DisbursementManager`
- Users: `UserManagementDashboard`, `UsersList`
- Approvals: `ApprovalManagementDashboard`
- Reconciliation: `ReconciliationDashboard`
- Client dashboard summary cards: `src/pages/Dashboard.tsx`

Compact rules:

- Prefer vertical cards over cramped tables.
- Stack search, filters, and action buttons.
- Use horizontal scrolling for large tab sets instead of forcing many columns.
- Keep primary actions visible; move secondary actions only when they remain reachable.
- Keep dialogs and drawers scrollable with a maximum height under the viewport.

---

## Global Responsive Guards

Implemented in `src/index.css` and shared UI primitives.

- `body`/root minimum width is guarded at `320px`.
- Page-level horizontal overflow is hidden.
- `.min-h-dvh` and `.h-dvh` support mobile browser chrome.
- `.pb-safe` and `.pt-safe` support safe-area insets.
- `.adaptive-container` provides a reusable constrained content width.
- `.touch-no-hover` disables hover transforms on coarse/no-hover devices.

Mobile-safe updates also apply to:

- `dialog.tsx`
- `alert-dialog.tsx`
- `drawer.tsx`
- `sheet.tsx`
- `PageHeader.tsx`
- `button.tsx`
- `ThemedButton.tsx`
- `ThemedCard.tsx`
- `ApprovalNotifications.tsx`

---

## Landing Page Mobile Navigation

The landing hamburger menu is explicitly accessible and testable:

- `data-testid="landing-mobile-menu-trigger"`
- `aria-label` switches between open and close states
- `aria-expanded`
- `aria-controls="landing-mobile-navigation"`
- mobile nav landmark: `role="navigation" aria-label="Mobile navigation"`

This prevents a visual-only hamburger from becoming unreachable in automation or assistive technology.

---

## Testing

Adaptive regression coverage lives in `e2e/adaptive-layout.e2e.ts`.

Viewport matrix:

- `360x740`
- `390x844`
- `768x1024`
- `1024x768`
- `1366x900`
- `1536x864`

Route coverage:

- Public: `/`, `/auth`
- Client: `/dashboard`, `/loan-application`, `/kyc`, `/budget`
- Admin: `/admin/overview`, `/admin/loans`, `/admin/clients`, `/admin/payments`, `/admin/users`, `/admin/reconciliation`

Assertions:

- No page-level horizontal overflow.
- Public mobile hamburger opens and exposes a navigation landmark.
- Authenticated shell navigation is reachable across compact, medium, expanded, and wide sizes.
- Admin dense screens remain renderable across the matrix.

Run:

```bash
BASE_URL=http://127.0.0.1:8080 npx playwright test e2e/adaptive-layout.e2e.ts
```

Also run:

```bash
npm run build
npm run lint
```

---

## Implementation Checklist

When adding or changing UI:

1. Start with the compact layout.
2. Use `useAdaptiveLayout()` or existing adaptive primitives for viewport decisions.
3. Test at `360x740` before testing desktop.
4. Ensure controls are reachable without hover.
5. Avoid fixed widths that can exceed `100vw`.
6. Use scrollable tabs for 5+ tab sets on compact screens.
7. Use adaptive dialogs/drawers for forms and detail views.
8. Add or update Playwright coverage when changing shell navigation, route layout, or dense admin collections.

---

## References

- Android adaptive layout and window size classes: <https://developer.android.com/develop/ui/views/layout/use-window-size-classes>
- Android list/detail adaptive codelab: <https://developer.android.com/codelabs/add-adaptive-layouts>
- Container queries: <https://web.dev/learn/css/container-queries/>
- MDN container queries: <https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries>
- WCAG 2.2 target size and reflow guidance: <https://www.w3.org/TR/WCAG22/>
