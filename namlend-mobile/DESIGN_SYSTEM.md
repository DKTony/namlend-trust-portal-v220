# NamLend Mobile Design System v2.7.0

## Overview

Perpetio-inspired design system with dark-first aesthetic, high contrast, and minimal elevation.

## Phase 1 Complete ✅

- ✅ Design tokens: `src/theme/tokens.ts`
- ✅ Theme provider: `src/theme/ThemeProvider.tsx`  
- ✅ UI components (8/8): `src/components/ui/`
  - PrimaryButton, BalanceCard, TransactionItem
  - BottomSheet, NumericKeypad, Avatar
  - CurrencyCard, MenuItem

## Usage

### Theme Hook

```tsx
import { useTheme } from '@/theme';

function MyComponent() {
  const { colors, tokens, mode, toggleTheme } = useTheme();
  
  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.textPrimary }}>Hello</Text>
    </View>
  );
}
```

### Components

```tsx
import { PrimaryButton, BalanceCard, TransactionItem } from '@/components/ui';

// Button
<PrimaryButton
  title="Apply for Loan"
  onPress={handlePress}
  variant="primary"
  size="large"
/>

// Balance Card
<BalanceCard
  amount={1570}
  label="Available Credit"
  currency="N$"
  subtitle="Your balance"
/>

// Transaction Item
<TransactionItem
  title="Transfer"
  subtitle="From the card *6578"
  amount={1400}
  type="income"
  onPress={handlePress}
/>
```

## Design Tokens

### Colors (Dark Mode)
- Background: `#1C1C1E`
- Surface: `#2C2C2E`
- Text Primary: `#FFFFFF`
- Success: `#34C759`
- Error: `#FF3B30`
- Primary: `#007AFF`

### Typography
- Display: 36px, Bold
- H1: 24px, SemiBold
- Body: 16px, Regular
- Caption: 13px, Regular

### Spacing
- xs: 4px
- sm: 8px
- md: 12px
- base: 16px
- lg: 20px
- xl: 24px

### Border Radius
- sm: 8px
- md: 12px
- lg: 16px
- pill: 28px

## Components

### PrimaryButton
Pill-shaped CTA with haptic feedback.

**Props:**
- `title`: string
- `onPress`: () => void
- `disabled?`: boolean
- `loading?`: boolean
- `variant?`: 'primary' | 'secondary' | 'danger'
- `size?`: 'small' | 'medium' | 'large'

### BalanceCard
Elevated card for balance display.

**Props:**
- `amount`: number
- `label`: string
- `currency?`: string (default: 'N$')
- `subtitle?`: string

### TransactionItem
List item with icon, text, and amount.

**Props:**
- `title`: string
- `subtitle?`: string
- `amount`: number
- `type`: 'income' | 'expense'
- `icon?`: Feather icon name
- `currency?`: string
- `onPress?`: () => void

## Compliance

- **Currency**: NAD (Namibian Dollar)
- **APR Cap**: 32% maximum
- **Accessibility**: WCAG 2.1 AA compliant
- **Performance**: 60fps animations

## Phase 2: Screen Redesigns (Next)

Ready to redesign screens using the new design system:
- Dashboard (greeting, balance cards, transactions)
- Loan Application (amount sheet + keypad)
- Payment (transfer-money style)
- Profile (menu with icons)

## Resources

- Design tokens: `namlend-mobile/design-tokens.json`
- Plan: `docs/mobile-ui-enhancement-plan-v2.7.md`
