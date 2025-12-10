# NamLend Mobile UI/UX Enhancement Plan (v2.7.0)

**Version:** Draft 0.1  
**Date:** 2025-10-14  
**Owner:** Frontend Team  
**Status:** 📋 Planning  

---

## 1) Executive Summary

- **Goal:** Elevate the NamLend mobile app UI/UX using a Perpetio-inspired design system while preserving security, RLS, and 32% APR compliance.
- **Baseline:** v2.6.0 is production-ready with feature parity, offline-first queues, biometric lock, deep links, and notifications.
- **Outcome (v2.7.0):** New design tokens, reusable UI library, redesigned core screens (Dashboard, Loan Application, Payment, Profile), dark mode, a11y polish, and QA sign-off.

---

## 2) Scope & Non-Goals

### In Scope
- **Design tokens** and theme provider (dark + light)
- **UI component library (8 core components)** with TypeScript props and haptics
- **Screen redesigns**: Dashboard, Loan Application (amount sheet + keypad), Payment, Profile/Menu
- **Micro-interactions** (animations, haptics), **a11y** (WCAG), **QA** (E2E, visual regression)
- **Figma-style tokens** export for design/dev parity

### Out of Scope
- New business features, data model changes, or API contracts
- Payment provider changes or store submission work (handled by release ops)

---

## 3) Architecture & Conventions

- **Tech stack:** React Native (Expo), React Navigation 7, React Query v5, Reanimated, Gesture Handler
- **Security:** No service-role keys in mobile; RLS remains enforced
- **Compliance:** NAD currency formatting; APR messaging ≤ 32%
- **Brand:** Dark-first aesthetic with high contrast and minimal elevation

---

## 4) Design Tokens & Theme

### Files
- `namlend-mobile/src/theme/tokens.ts` (authoritative tokens)
- `namlend-mobile/src/theme/ThemeProvider.tsx` (provider + context)
- `namlend-mobile/src/theme/useTheme.ts` (hook)
- `namlend-mobile/design-tokens.json` (Figma export)

### Token Model (excerpt)
```ts
export const tokens = {
  colors: {
    dark: {
      background: '#1C1C1E',
      surface: '#2C2C2E',
      surfaceAlt: '#3A3A3C',
      textPrimary: '#FFFFFF',
      textSecondary: '#AEAEB2',
      success: '#34C759',
      error: '#FF3B30',
      primary: '#007AFF',
      divider: '#38383A',
    },
    light: {
      background: '#FFFFFF',
      surface: '#F2F2F7',
      textPrimary: '#000000',
      textSecondary: '#3A3A3C',
      divider: '#E5E5EA',
    }
  },
  typography: {
    display: { family: 'Inter-Bold', size: 36, lineHeight: 44 },
    h1: { family: 'Inter-SemiBold', size: 24, lineHeight: 32 },
    body: { family: 'Inter-Regular', size: 16, lineHeight: 24 },
    caption: { family: 'Inter-Regular', size: 13, lineHeight: 18 },
  },
  radius: { sm: 8, md: 12, lg: 16, xl: 24, pill: 28 },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
};
```

### Figma-style Export (excerpt)
```json
{
  "color": {
    "dark": {
      "background": { "value": "#1C1C1E" },
      "surface": { "value": "#2C2C2E" },
      "text-primary": { "value": "#FFFFFF" }
    }
  },
  "typography": {
    "display": { "fontFamily": { "value": "Inter" }, "fontWeight": { "value": "700" }, "fontSize": { "value": "36px" } }
  }
}
```

---

## 5) Component Library (8 Core Components)

Location: `namlend-mobile/src/components/ui/`

- **BalanceCard.tsx**  
  - 16px padding, 16px radius, shadow, large number, subtitle
- **TransactionItem.tsx**  
  - 64px row, left icon (40px), title/subtitle, right-aligned amount (green/red)
- **PrimaryButton.tsx**  
  - 56px height, pill radius, bold text, disabled/pressed states
- **BottomSheet.tsx**  
  - Rounded top (24px), dim background, pull-down to dismiss (Gorhom)
- **NumericKeypad.tsx**  
  - 3×4 grid, 24px font, haptics on press, delete/confirm actions
- **Avatar.tsx**  
  - 64px circle, optional border, fallback initials
- **CurrencyCard.tsx**  
  - 2-up grid, 80px height, label + two-line value
- **MenuItem.tsx**  
  - 56px row, icon + label + chevron, light sheet style

Notes: All components receive `style` overrides, accept `testID`s, and expose minimal, well-typed props.

---

## 6) Screen Redesigns

### 6.1 Dashboard (`src/screens/DashboardScreen.tsx`)
- Greeting header
- Swipeable balance cards with dots
- Horizontal currency/information cards
- Transaction list with positive/negative indicators

### 6.2 Loan Application (`src/screens/LoanApplicationScreen.tsx`)
- CTA opens **LoanAmountSheet** (bottom sheet)
- **NumericKeypad** for amount input with NAD formatting
- APR badge (≤ 32%); continue to details

### 6.3 Payment (`src/screens/PaymentScreen.tsx`)
- Recipient/loan info card
- Amount keypad sheet
- Payment method selector (mobile money, bank, debit order)
- Receipt view after success

### 6.4 Profile/Menu (`src/screens/ProfileScreen.tsx`)
- Avatar + name, currency info cards
- Menu: Documents, Payments, Calculator, Notifications, Help

---

## 7) Interaction, Accessibility, and Performance

- **Animations:** 300ms ease; sheet spring; button press scale(0.95)
- **Haptics:** Light on press; success medium; error heavy (Expo Haptics)
- **Accessibility:** Labels, roles, 44px tap targets, dynamic text sizing
- **Performance:** 60fps target; avoid overdraw; memoize heavy lists; virtualized lists

---

## 8) QA & Testing

- **E2E:** Happy paths for apply loan, make payment, upload documents
- **Visual Regression:** Key screens at common DPIs
- **Unit Tests:** Component behavior (button states, keypad input)
- **Manual:** iOS/Android device matrix

---

## 9) Timeline & Milestones

- **Week 1-2 (Foundation):** Tokens, ThemeProvider, 8 UI components  
- **Week 3-4 (Screens):** Dashboard, Loan Application, Payment, Profile  
- **Week 5-6 (Polish & QA):** Animations, a11y, tests, visual regression, docs

---

## 10) Deliverables

- `src/theme/tokens.ts`, `ThemeProvider.tsx`, `useTheme.ts`  
- `src/components/ui/*` (8 components)  
- Redesigned `Dashboard`, `LoanApplication`, `Payment`, `Profile`  
- `design-tokens.json` (Figma export)  
- `DESIGN_SYSTEM.md` usage guide and component props  

---

## 11) Success Metrics

- Loan application time < 2 minutes  
- Payment success rate > 98%  
- Crash-free > 99.5%  
- Accessibility score > 90  

---

## 12) Risks & Mitigations

- **Regression risk:** Keep changes additive; feature-flag new UI if needed  
- **Performance:** Profile animations early; prefer native driver where possible  
- **Fonts:** Use Inter (OSS) instead of SF Pro to avoid licensing friction  

---

## 13) References

- `docs/Executive Summary.md` (v2.6.0 release summary)  
- `docs/architecture/README.md` (Current State – Supabase-first)  
- `docs/architecture/system-architecture-diagrams.md` (Mobile App Architecture)  
- `docs/functional-specs/README.md` (APR 32% cap, NAD)  

---

## 14) Change Log

- 2025-10-14: Draft 0.1 created (planning)  
