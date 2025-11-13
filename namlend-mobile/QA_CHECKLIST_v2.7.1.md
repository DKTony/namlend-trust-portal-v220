# NamLend Mobile v2.7.1 - QA Checklist

**Version**: v2.7.1  
**Date**: October 31, 2025  
**Status**: Ready for QA

---

## 🎯 QA Objectives

- Verify all 10 screens are fully themed and functional
- Test light/dark mode switching across all screens
- Validate loan term restrictions (1, 3, 5 months)
- Test payment submission flow end-to-end
- Verify schema alignment (paid_at, total_repayment, etc.)
- Test offline queue functionality
- Validate navigation and UX improvements

---

## 📱 Screen-by-Screen QA

### 1. Dashboard Screen ✅

**Light Mode:**
- [ ] BalanceCard displays correctly with theme colors
- [ ] CurrencyCards show loan summary data
- [ ] TransactionItem list renders with proper spacing
- [ ] Pull-to-refresh works
- [ ] Empty states display correctly

**Dark Mode:**
- [ ] All text readable (white on dark background)
- [ ] Cards use dark surface colors
- [ ] Icons and badges visible
- [ ] No color contrast issues

**Functionality:**
- [ ] Navigate to loan details from transaction items
- [ ] Quick actions work (Apply, Calculator, Profile)
- [ ] Data loads from Supabase correctly

---

### 2. Profile Screen ✅

**Light Mode:**
- [ ] Menu items display with proper icons
- [ ] ThemeToggle component visible
- [ ] Avatar shows user initials
- [ ] All navigation links work

**Dark Mode:**
- [ ] Menu items readable
- [ ] ThemeToggle switches correctly
- [ ] Avatar contrasts properly
- [ ] Dividers visible

**Functionality:**
- [ ] Theme toggle switches between light/dark
- [ ] Theme preference persists after app restart
- [ ] Navigate to Profile Edit
- [ ] Navigate to Settings/About screens
- [ ] Sign out works correctly

---

### 3. Loan Calculator Screen ✅

**Light Mode:**
- [ ] Input fields themed correctly
- [ ] Term chips (1, 3, 5) display properly
- [ ] CurrencyCard results visible
- [ ] APR notice displays with warning color

**Dark Mode:**
- [ ] Input fields use dark surface
- [ ] Active term chip highlighted correctly
- [ ] Results cards readable
- [ ] Warning notice visible

**Functionality:**
- [ ] Only 1, 3, 5 month terms available
- [ ] Real-time calculation updates
- [ ] 32% APR applied correctly
- [ ] Monthly payment calculation accurate
- [ ] Total repayment calculation accurate
- [ ] Navigate to loan application with prefilled amount

---

### 4. Loans List Screen ✅

**Light Mode:**
- [ ] BalanceCard summary displays
- [ ] TransactionItem for loans renders
- [ ] Filter tabs (All/Active/Approved/Completed) visible
- [ ] Empty states show correctly

**Dark Mode:**
- [ ] All cards use dark surface
- [ ] Tab indicators visible
- [ ] Loan status badges readable
- [ ] Empty state icons visible

**Functionality:**
- [ ] "All" shows all loans
- [ ] "Active" shows active + disbursed loans
- [ ] "Approved" shows approved loans
- [ ] "Completed" shows completed loans
- [ ] Navigate to loan details
- [ ] Pull-to-refresh works
- [ ] Loan amounts formatted as NAD

---

### 5. Loan Details Screen ✅

**Light Mode:**
- [ ] BalanceCard shows loan amount
- [ ] Horizontal CurrencyCards display
- [ ] Repayment schedule visible
- [ ] PrimaryButton for payments shows

**Dark Mode:**
- [ ] All cards themed correctly
- [ ] Schedule table readable
- [ ] Button contrasts properly
- [ ] Status badges visible

**Functionality:**
- [ ] "Make Payment" button visible for active/disbursed loans
- [ ] "Make Payment" hidden for pending/completed loans
- [ ] Navigate to payment screen
- [ ] Repayment schedule accurate
- [ ] Loan status displayed correctly
- [ ] Back navigation works

---

### 6. Profile Edit Screen ✅

**Light Mode:**
- [ ] Form inputs themed
- [ ] PrimaryButton for save visible
- [ ] Validation errors show in error color
- [ ] Employment status picker works

**Dark Mode:**
- [ ] Input fields use dark surface
- [ ] Error messages readable
- [ ] Save button contrasts
- [ ] Picker modal themed

**Functionality:**
- [ ] All fields editable
- [ ] Validation works (required fields, formats)
- [ ] Save updates profile in Supabase
- [ ] Success/error alerts display
- [ ] Back navigation works
- [ ] Changes persist after save

---

### 7. Theme System ✅

**Functionality:**
- [ ] Toggle switches between light/dark instantly
- [ ] Preference persists across app restarts
- [ ] All screens respect theme choice
- [ ] No flashing/flickering during switch
- [ ] System theme detection (if implemented)

---

### 8. Payment Screen ✅

**Light Mode:**
- [ ] Loan summary displays
- [ ] Tabs (Make Payment/Schedule/History) visible
- [ ] Amount selector themed
- [ ] Payment method cards display
- [ ] NumericKeypad modal works

**Dark Mode:**
- [ ] All tabs readable
- [ ] Amount selector contrasts
- [ ] Method cards themed
- [ ] Keypad modal uses dark surface
- [ ] History cards readable

**Functionality:**
- [ ] Amount selector opens keypad modal
- [ ] Quick amount chips work
- [ ] Payment method selection works
- [ ] Bank transfer requires reference number
- [ ] Submit button disabled when invalid
- [ ] Submit button shows loading state
- [ ] Payment submission creates record
- [ ] History tab loads payments ordered by `paid_at` (newest first)
- [ ] Payment status badges correct (completed/pending)
- [ ] View receipt works
- [ ] Navigate back after submission

**Schema Validation:**
- [ ] Payments ordered by `paid_at` (not `payment_date`)
- [ ] No `payments.user_id` in insert payload
- [ ] History filtered via `loans!inner(user_id)`

---

### 9. Loan Application Form ✅

**Light Mode:**
- [ ] Multi-step form displays
- [ ] Progress bar visible
- [ ] Themed form inputs
- [ ] Term picker shows 1, 3, 5 only
- [ ] Calculation preview displays

**Dark Mode:**
- [ ] All steps themed correctly
- [ ] Progress bar visible
- [ ] Input fields use dark surface
- [ ] Picker modals themed
- [ ] Review cards readable

**Functionality:**
- [ ] Step 1: Amount, term (1/3/5), purpose validation
- [ ] Term picker only allows 1, 3, or 5 months
- [ ] Helper text shows "Allowed: 1, 3, or 5 months"
- [ ] Validation errors display correctly
- [ ] Calculation preview updates in real-time
- [ ] 32% APR applied
- [ ] Step 2: Employment, income, expenses validation
- [ ] Step 3: Review shows all details
- [ ] Submit button shows loading state
- [ ] Submission creates approval_request
- [ ] Offline queue works if submission fails
- [ ] Navigate to dashboard after submission
- [ ] Prefilled amount from calculator works

**Schema Validation:**
- [ ] Uses `total_repayment` (not `outstanding_balance`)
- [ ] Uses `disbursed_at` (not `next_payment_date`)
- [ ] APR capped at 32%

---

### 10. Document Upload Screen ✅

**Light Mode:**
- [ ] Document cards themed
- [ ] PrimaryButton for uploads visible
- [ ] Status chips (uploaded/verified) display
- [ ] Error container themed
- [ ] Progress bar visible during upload

**Dark Mode:**
- [ ] All cards use dark surface
- [ ] Upload button contrasts
- [ ] Status badges readable
- [ ] Error messages visible
- [ ] Progress indicators themed

**Functionality:**
- [ ] Upload button opens picker (camera/gallery)
- [ ] PrimaryButton shows loading during upload
- [ ] PrimaryButton disabled during upload
- [ ] Upload progress displays (0-100%)
- [ ] Success state shows uploaded document
- [ ] Error state shows retry button
- [ ] Retry button works
- [ ] Replace button works for existing docs
- [ ] Delete button works
- [ ] Offline queue works if upload fails
- [ ] Verified/Pending badges display correctly
- [ ] Help card displays upload tips

**Schema Validation:**
- [ ] No hardcoded hex colors in StyleSheet
- [ ] Error container uses `${colors.error}1A`
- [ ] Status chips use `colors.success`/`colors.warning`/`colors.error`

---

## 🔄 Cross-Screen Testing

### Navigation Flow
- [ ] Dashboard → Loan Details → Payment → History
- [ ] Dashboard → Apply → Calculator → Application Form
- [ ] Profile → Edit → Save → Back
- [ ] Loans List → Loan Details → Make Payment
- [ ] All back buttons work correctly
- [ ] Tab navigation works (Dashboard/Loans/Profile)

### Theme Consistency
- [ ] All screens switch theme instantly
- [ ] No screens with mixed light/dark elements
- [ ] All text readable in both modes
- [ ] All icons visible in both modes
- [ ] All buttons contrast properly in both modes

### Data Flow
- [ ] Loan application → Approval request created
- [ ] Payment submission → Payment record created
- [ ] Document upload → Document record created
- [ ] Profile edit → Profile updated
- [ ] All data persists after app restart

---

## 🌐 Offline Mode Testing

### Offline Queue
- [ ] Loan application queued when offline
- [ ] Payment queued when offline
- [ ] Document upload queued when offline
- [ ] Queue processes when back online
- [ ] User notified of queued items
- [ ] No data loss during offline operations

---

## 🐛 Known Issues / Edge Cases

### To Test
- [ ] Very long loan purpose text (500 chars)
- [ ] Very large loan amounts (edge of MAX_AMOUNT)
- [ ] Very small loan amounts (edge of MIN_AMOUNT)
- [ ] Rapid theme switching
- [ ] Multiple payment submissions
- [ ] Upload very large files (>2MB)
- [ ] Poor network conditions
- [ ] App backgrounding during operations

---

## ✅ Sign-Off

### QA Tester
- [ ] All critical paths tested
- [ ] All screens verified in light mode
- [ ] All screens verified in dark mode
- [ ] No blocking issues found
- [ ] Ready for release

**Tester Name**: _________________  
**Date**: _________________  
**Signature**: _________________

---

## 📝 Release Notes Draft

### NamLend Mobile v2.7.1 - Release Notes

**Release Date**: October 31, 2025

#### 🎨 Design System Complete (100%)
- ✅ All 10 screens fully themed with light/dark mode support
- ✅ 8 reusable UI components (PrimaryButton, BalanceCard, CurrencyCard, etc.)
- ✅ Complete token system for colors, spacing, typography
- ✅ Theme persistence across app restarts

#### 🔧 Schema Alignment
- ✅ Payments ordered by `paid_at` (replaced legacy `payment_date`)
- ✅ Loans use `total_repayment` and `disbursed_at`
- ✅ Removed `payments.user_id` from inserts
- ✅ Payment history filtered via `loans!inner(user_id)` join

#### 🧭 Navigation & UX Improvements
- ✅ Typed navigation for ClientStack and tabs
- ✅ "Active" filter includes `active` + `disbursed` loans
- ✅ Added "Approved" tab to loans list
- ✅ "Make Payment" button visible for active/disbursed loans
- ✅ Payment submit flow with bank transfer reference capture

#### 💰 Loan Term Restrictions
- ✅ Restricted to 1, 3, or 5 months across all screens
- ✅ Loan calculator chip selection
- ✅ Application form picker validation
- ✅ Helper text and error messages updated

#### 📱 Screen Updates
1. **Dashboard**: Perpetio-inspired with BalanceCard + CurrencyCards
2. **Profile**: Menu-driven with ThemeToggle
3. **Loan Calculator**: Real-time with term chips (1/3/5)
4. **Loans List**: Filters (All/Active/Approved/Completed)
5. **Loan Details**: Make Payment for active/disbursed
6. **Profile Edit**: Themed forms with validation
7. **Theme System**: Instant switching with persistence
8. **Payment**: Submit flow with history ordered by `paid_at`
9. **Loan Application**: Term restricted to 1/3/5 months
10. **Document Upload**: PrimaryButton with loading states

#### 🔧 Technical Improvements
- ✅ Resolved Worklets JS/native version mismatch
- ✅ Aligned packages for Expo SDK 54
- ✅ Removed hardcoded hex colors (100% theme-driven)
- ✅ 400+ lines of code reduced through component reuse
- ✅ 100% TypeScript type safety

#### 🐛 Bug Fixes
- Fixed auth initialization stuck loading state
- Fixed payment history ordering
- Fixed loan filters to include correct statuses
- Fixed document upload button states

#### 📚 Documentation
- Complete design system documentation
- Schema alignment guide
- Navigation & UX specifications
- Environment setup notes

---

**Breaking Changes**: None

**Migration Guide**: No migration required

**Known Issues**: None

---

## 🚀 Deployment Checklist

- [ ] All QA tests passed
- [ ] Release notes finalized
- [ ] Version bumped to v2.7.1 in package.json
- [ ] Git tag created: `v2.7.1`
- [ ] CHANGELOG.md updated
- [ ] Build for iOS (Expo Go / EAS)
- [ ] Build for Android (Expo Go / EAS)
- [ ] Submit to App Store (if applicable)
- [ ] Submit to Play Store (if applicable)
- [ ] Notify stakeholders
- [ ] Update documentation site

---

**Status**: 🟡 Ready for QA  
**Next Step**: Execute QA checklist, then deploy
