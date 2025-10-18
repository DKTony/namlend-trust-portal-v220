# Design System Migration Guide

## How to Apply v2.7.0 Design System to Existing Screens

### Quick Start

1. **Import theme hook**
```typescript
import { useTheme } from '../../theme';
```

2. **Use in component**
```typescript
const { colors, tokens } = useTheme();
```

3. **Apply to styles**
```typescript
<View style={[styles.container, { backgroundColor: colors.background }]}>
  <Text style={[styles.title, {
    color: colors.textPrimary,
    fontSize: tokens.typography.h1.fontSize,
    fontWeight: tokens.typography.h1.fontWeight,
  }]}>
    Title
  </Text>
</View>
```

---

## Component Replacements

### Old → New Component Mappings

#### Replace Custom Cards with CurrencyCard
**Before:**
```typescript
<View style={styles.infoCard}>
  <Text style={styles.label}>Monthly Payment</Text>
  <Text style={styles.value}>{formatNAD(amount)}</Text>
</View>
```

**After:**
```typescript
<CurrencyCard
  label="Monthly Payment"
  primaryValue={formatNAD(amount)}
  secondaryValue="Per month"
  icon={DollarSign}
/>
```

#### Replace List Items with TransactionItem
**Before:**
```typescript
<TouchableOpacity style={styles.loanItem}>
  <Text style={styles.loanAmount}>{formatNAD(loan.amount)}</Text>
  <Text style={styles.loanDate}>{loan.date}</Text>
</TouchableOpacity>
```

**After:**
```typescript
<TransactionItem
  title={`Loan - ${loan.term_months} months`}
  subtitle={`Due: ${loan.date}`}
  amount={loan.amount}
  type="expense"
  icon={FileText}
  onPress={() => navigateToLoan(loan.id)}
/>
```

#### Replace Custom Buttons with PrimaryButton
**Before:**
```typescript
<TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
  <Text style={styles.buttonText}>Submit</Text>
</TouchableOpacity>
```

**After:**
```typescript
<PrimaryButton
  title="Submit"
  onPress={handleSubmit}
  variant="primary"
  loading={isLoading}
/>
```

---

## Screen-by-Screen Migration Templates

### 1. LoansListScreen Migration

**Components to use:**
- `TransactionItem` for each loan
- `BalanceCard` for total outstanding
- `PrimaryButton` for "Apply for New Loan"

**Code snippet:**
```typescript
import { TransactionItem, BalanceCard, PrimaryButton } from '../../components/ui';
import { useTheme } from '../../theme';

const LoansListScreen = () => {
  const { colors, tokens } = useTheme();
  
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Total Outstanding Balance */}
      <BalanceCard
        amount={totalOutstanding}
        label="Total Outstanding"
        subtitle="Across all loans"
      />
      
      {/* Loan List */}
      <View style={{ paddingHorizontal: tokens.spacing.base }}>
        <Text style={[styles.sectionTitle, {
          color: colors.textPrimary,
          fontSize: tokens.typography.h2.fontSize,
        }]}>
          Your Loans
        </Text>
        
        {loans.map(loan => (
          <TransactionItem
            key={loan.id}
            title={`N$${loan.amount} Loan`}
            subtitle={`${loan.term_months} months • ${loan.monthly_payment}/mo`}
            amount={loan.outstanding_balance}
            type="expense"
            icon={FileText}
            onPress={() => navigation.navigate('LoanDetails', { loanId: loan.id })}
          />
        ))}
      </View>
      
      {/* Apply Button */}
      <PrimaryButton
        title="Apply for New Loan"
        onPress={() => navigation.navigate('LoanApplicationStart')}
        variant="primary"
        style={{ marginHorizontal: tokens.spacing.base }}
      />
    </ScrollView>
  );
};
```

---

### 2. LoanDetailsScreen Migration

**Components to use:**
- `BalanceCard` for loan amount
- `CurrencyCard` for loan metrics
- `PrimaryButton` for "Make Payment"

**Code snippet:**
```typescript
<ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
  {/* Loan Amount */}
  <BalanceCard
    amount={loan.amount}
    label="Loan Amount"
    subtitle={`${loan.term_months} months at ${loan.apr}% APR`}
  />
  
  {/* Loan Metrics */}
  <ScrollView horizontal showsHorizontalScrollIndicator={false}
    style={{ paddingLeft: tokens.spacing.base }}>
    <CurrencyCard
      label="Monthly Payment"
      primaryValue={formatNAD(loan.monthly_payment)}
      icon={Calendar}
      style={{ marginRight: tokens.spacing.base, width: 160 }}
    />
    <CurrencyCard
      label="Outstanding"
      primaryValue={formatNAD(loan.outstanding_balance)}
      icon={TrendingUp}
      style={{ marginRight: tokens.spacing.base, width: 160 }}
    />
    <CurrencyCard
      label="Next Payment"
      primaryValue={loan.next_payment_date}
      secondaryValue={formatNAD(loan.monthly_payment)}
      icon={Calendar}
      style={{ marginRight: tokens.spacing.base, width: 160 }}
    />
  </ScrollView>
  
  {/* Action Button */}
  <PrimaryButton
    title="Make Payment"
    onPress={() => navigation.navigate('Payment', { loanId: loan.id })}
    variant="primary"
  />
</ScrollView>
```

---

### 3. LoanApplicationFormScreen Migration

**Components to use:**
- `CurrencyCard` for loan calculation results
- `PrimaryButton` for navigation
- Theme colors for inputs

**Focus areas:**
1. Replace result cards with `CurrencyCard`
2. Style inputs with theme colors
3. Use `PrimaryButton` for submit/next

**Input styling:**
```typescript
<TextInput
  style={[styles.input, {
    backgroundColor: colors.surface,
    borderColor: colors.divider,
    color: colors.textPrimary,
    borderRadius: tokens.radius.sm,
    padding: tokens.spacing.md,
  }]}
  value={formData.amount}
  onChangeText={(value) => setFormData({ ...formData, amount: value })}
  placeholderTextColor={colors.textTertiary}
/>
```

---

### 4. PaymentScreenEnhanced Migration

**Components to use:**
- `CurrencyCard` for payment amounts
- `PrimaryButton` for submit
- Theme colors for payment method selection

**Payment method buttons:**
```typescript
<TouchableOpacity
  style={[styles.methodButton, {
    backgroundColor: selectedMethod === 'mobile_money' ? colors.primary : colors.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
  }]}
  onPress={() => setSelectedMethod('mobile_money')}
>
  <Smartphone size={24} color={selectedMethod === 'mobile_money' ? '#FFFFFF' : colors.textSecondary} />
  <Text style={{
    color: selectedMethod === 'mobile_money' ? '#FFFFFF' : colors.textPrimary,
  }}>
    Mobile Money
  </Text>
</TouchableOpacity>
```

---

## Color Usage Guidelines

### Background Hierarchy
```typescript
// Screen background
backgroundColor: colors.background  // #0A0A0A

// Cards/surfaces
backgroundColor: colors.surface     // #1A1A1A

// Elevated surfaces
backgroundColor: colors.surfaceAlt  // #2A2A2A
```

### Text Hierarchy
```typescript
// Primary text (titles, main content)
color: colors.textPrimary  // #FFFFFF

// Secondary text (descriptions, labels)
color: colors.textSecondary  // #9CA3AF

// Tertiary text (hints, placeholders)
color: colors.textTertiary  // #6B7280
```

### Interactive Elements
```typescript
// Primary actions
backgroundColor: colors.primary  // #2563EB

// Success states
backgroundColor: colors.success  // #10B981

// Warning/alerts
backgroundColor: colors.warning  // #F59E0B

// Errors/destructive
backgroundColor: colors.error    // #EF4444
```

---

## Typography Patterns

### Headings
```typescript
// H1 - Screen titles
fontSize: tokens.typography.h1.fontSize      // 28
fontWeight: tokens.typography.h1.fontWeight  // 'bold'

// H2 - Section titles
fontSize: tokens.typography.h2.fontSize      // 24
fontWeight: tokens.typography.h2.fontWeight  // '600'

// H3 - Subsection titles
fontSize: tokens.typography.h3.fontSize      // 20
fontWeight: tokens.typography.h3.fontWeight  // '600'
```

### Body Text
```typescript
// Large body
fontSize: tokens.typography.bodyLarge.fontSize  // 18

// Regular body
fontSize: tokens.typography.body.fontSize       // 16

// Small body
fontSize: tokens.typography.bodySmall.fontSize  // 14

// Caption
fontSize: tokens.typography.caption.fontSize    // 12
```

---

## Spacing Patterns

### Container Padding
```typescript
// Screen padding
paddingHorizontal: tokens.spacing.base  // 16

// Section spacing
marginBottom: tokens.spacing.xl         // 32

// Item spacing
marginBottom: tokens.spacing.base       // 16
```

### Element Spacing
```typescript
// Extra small
tokens.spacing.xs   // 4

// Small
tokens.spacing.sm   // 8

// Medium
tokens.spacing.md   // 12

// Large
tokens.spacing.lg   // 20
```

---

## Shadow Patterns

```typescript
// Cards
...tokens.shadows.card
// {
//   shadowColor: '#000',
//   shadowOffset: { width: 0, height: 2 },
//   shadowOpacity: 0.1,
//   shadowRadius: 4,
//   elevation: 3,
// }

// Elevated elements
...tokens.shadows.elevated
// {
//   shadowColor: '#000',
//   shadowOffset: { width: 0, height: 4 },
//   shadowOpacity: 0.15,
//   shadowRadius: 8,
//   elevation: 5,
// }
```

---

## Border Radius Patterns

```typescript
// Small (buttons, inputs)
borderRadius: tokens.radius.sm   // 8

// Medium (cards)
borderRadius: tokens.radius.md   // 12

// Large (modals, sheets)
borderRadius: tokens.radius.lg   // 16

// Round (avatars, badges)
borderRadius: tokens.radius.round  // 9999
```

---

## Common Patterns

### Card Container
```typescript
<View style={[{
  backgroundColor: colors.surface,
  borderRadius: tokens.radius.md,
  padding: tokens.spacing.base,
  ...tokens.shadows.card,
  marginBottom: tokens.spacing.base,
}]}>
  {/* Card content */}
</View>
```

### Section Header
```typescript
<Text style={[{
  color: colors.textPrimary,
  fontSize: tokens.typography.h2.fontSize,
  fontWeight: tokens.typography.h2.fontWeight,
  marginBottom: tokens.spacing.base,
}]}>
  Section Title
</Text>
```

### Input Field
```typescript
<TextInput
  style={[{
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    color: colors.textPrimary,
    borderRadius: tokens.radius.sm,
    padding: tokens.spacing.md,
    fontSize: tokens.typography.body.fontSize,
  }]}
  placeholderTextColor={colors.textTertiary}
/>
```

---

## Testing Checklist

After migrating a screen, verify:

- [ ] Screen has dark background (`colors.background`)
- [ ] All text is visible (correct color hierarchy)
- [ ] Cards use `colors.surface` or components
- [ ] Buttons use `PrimaryButton` component
- [ ] Spacing is consistent (tokens)
- [ ] Shadows applied to elevated elements
- [ ] Border radius consistent
- [ ] Touch targets are 44x44 minimum
- [ ] Navigation works
- [ ] Theme switches properly (if supporting light mode)

---

## Quick Migration Steps

1. Add theme hook to component
2. Replace hardcoded colors with theme colors
3. Replace hardcoded fonts with typography tokens
4. Replace hardcoded spacing with spacing tokens
5. Identify custom cards → replace with `CurrencyCard`
6. Identify list items → replace with `TransactionItem`
7. Identify buttons → replace with `PrimaryButton`
8. Apply shadows using `tokens.shadows`
9. Test thoroughly
10. Update version comment to v2.7.0

---

## Support

For questions or issues:
- Check `DESIGN_SYSTEM.md` for token reference
- Review `Dashboard` or `Profile` screens for examples
- Check component files in `src/components/ui/`

---

Last Updated: October 15, 2025 - v2.7.0
