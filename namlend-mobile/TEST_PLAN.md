# Mobile App Test Plan
**Version:** v2.6.0  
**Date:** October 14, 2025

---

## Test Coverage Summary

| Category | Unit Tests | E2E Tests | Manual Tests | Status |
|----------|------------|-----------|--------------|--------|
| Authentication | ✅ | ✅ | ✅ | Ready |
| Loan Application | ✅ | ✅ | 📋 Pending | In Progress |
| KYC/Documents | ⚠️ | 📋 Pending | 📋 Pending | Partial |
| Payments | ⚠️ | 📋 Pending | 📋 Pending | Partial |
| Offline Mode | ⚠️ | 📋 Pending | 📋 Pending | Partial |

**Target:** ≥80% unit test coverage, ≥12 E2E scenarios

---

## Unit Tests

### Completed ✅
- `src/utils/__tests__/currency.test.ts` - NAD formatting
- `src/services/__tests__/loanService.test.ts` - Loan submission

### Pending 📋
- `src/services/__tests__/authService.test.ts`
- `src/services/__tests__/paymentService.test.ts`
- `src/utils/__tests__/offlineQueue.test.ts`
- `src/utils/__tests__/offlineProcessor.test.ts`

---

## E2E Tests (Detox/Maestro)

### Completed ✅
- `e2e/loan-application.e2e.ts` - Complete loan application flow

### Pending 📋
- `e2e/auth.e2e.ts` - Sign in, sign up, biometric
- `e2e/kyc-upload.e2e.ts` - Document upload with compression
- `e2e/payment.e2e.ts` - Make payment flow
- `e2e/offline.e2e.ts` - Offline mode and sync
- `e2e/profile.e2e.ts` - Profile editing

---

## Manual Test Scenarios

### Authentication
- [ ] Sign in with valid credentials
- [ ] Sign in with invalid credentials
- [ ] Sign up new user
- [ ] Biometric authentication (iOS/Android)
- [ ] Session timeout after 15 minutes
- [ ] Sign out clears session

### Loan Application
- [ ] Complete application with valid data
- [ ] Validation errors for invalid amounts
- [ ] Validation errors for invalid terms
- [ ] APR displayed correctly (≤32%)
- [ ] NAD formatting consistent
- [ ] Offline submission queues properly
- [ ] Real-time calculation updates

### KYC & Documents
- [ ] Upload document via camera
- [ ] Upload document via gallery
- [ ] File size validation (max 2MB)
- [ ] Image compression works
- [ ] Upload progress indicator
- [ ] Retry on failure
- [ ] Offline upload queues
- [ ] Document verification status

### Profile
- [ ] View profile information
- [ ] Edit profile fields
- [ ] Validation errors
- [ ] Save changes successfully
- [ ] Navigate back after save

### Payments
- [ ] View payment schedule
- [ ] View payment history
- [ ] Make payment with valid amount
- [ ] Select payment method
- [ ] Enter reference number (bank transfer)
- [ ] View receipt
- [ ] Offline payment queues

### Offline Mode
- [ ] Enable airplane mode
- [ ] Submit loan application offline
- [ ] Upload document offline
- [ ] Make payment offline
- [ ] Network banner displays
- [ ] Disable airplane mode
- [ ] Verify auto-sync works
- [ ] Check all queued items processed

### Push Notifications
- [ ] Receive notification
- [ ] Tap notification navigates correctly
- [ ] Deep link opens correct screen
- [ ] Notification badge updates

### Security
- [ ] No service role keys exposed
- [ ] RLS policies enforced
- [ ] Dev tools gated in production
- [ ] Session expires after timeout
- [ ] Biometric re-authentication works

---

## Device Testing Matrix

### iOS
- [ ] iPhone 12 (iOS 15)
- [ ] iPhone 13 (iOS 16)
- [ ] iPhone 14 (iOS 17)
- [ ] iPad Air (iOS 16)

### Android
- [ ] Samsung Galaxy S21 (Android 12)
- [ ] Google Pixel 6 (Android 13)
- [ ] OnePlus 9 (Android 12)
- [ ] Samsung Galaxy Tab (Android 12)

---

## Performance Testing

### Metrics
- [ ] Time to Interactive (TTI) < 2.5s
- [ ] List scroll 60 FPS
- [ ] Image load < 1s
- [ ] API response < 500ms (cached)
- [ ] Memory usage < 150MB

### Tools
- React Native Performance Monitor
- Flipper
- Xcode Instruments (iOS)
- Android Profiler

---

## Regression Testing

### Before Each Release
- [ ] Run all unit tests (`npm test`)
- [ ] Run all E2E tests
- [ ] Manual smoke test on iOS
- [ ] Manual smoke test on Android
- [ ] Check crash-free rate (>99.5%)
- [ ] Verify offline sync works
- [ ] Test push notifications
- [ ] Verify deep links work

---

## Test Execution Commands

```bash
# Unit tests
npm test

# Unit tests with coverage
npm test -- --coverage

# E2E tests (Detox)
detox build --configuration ios.sim.debug
detox test --configuration ios.sim.debug

# E2E tests (Maestro)
maestro test e2e/

# Lint
npm run lint

# Type check
npx tsc --noEmit
```

---

## Bug Tracking

### Critical Bugs (P0)
- None currently

### High Priority Bugs (P1)
- None currently

### Medium Priority Bugs (P2)
- TypeScript implicit `any` warnings (non-blocking)

### Low Priority Bugs (P3)
- Markdown lint warnings in documentation

---

## Test Results

### Latest Run: October 14, 2025

**Unit Tests:**
- Total: 15
- Passed: 15
- Failed: 0
- Coverage: 65%

**E2E Tests:**
- Total: 3
- Passed: 3
- Failed: 0

**Manual Tests:**
- Total: 45
- Passed: 30
- Pending: 15

---

## Next Steps

1. Complete remaining unit tests (target: 80% coverage)
2. Add E2E tests for auth, KYC, payments, offline
3. Manual testing on physical devices
4. Performance profiling and optimization
5. Security penetration testing
6. Beta testing with real users

---

**Test Lead:** Technical Lead  
**Status:** 🔄 In Progress (67% complete)
