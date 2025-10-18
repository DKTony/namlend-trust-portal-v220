# NamLend Mobile App Feature Parity & Enhancement Plan
**Version:** v2.6.0  
**Date:** October 14, 2025  
**Status:** 🔄 IN PROGRESS  
**Session Objective:** Port web client front end to mobile with modern UX enhancements

---

## Executive Summary

### Objective
Port the web client front end (`src/pages/`) to the mobile app (`namlend-mobile/`) and enhance UX for a modern, intuitive experience while preserving:
- **Security**: RLS policies, no service role keys shipped
- **Compliance**: NAD currency formatting, 32% APR cap
- **Architecture**: React 18 + TypeScript, Supabase integration
- **Quality**: Enterprise-grade error handling and offline resilience

### Current State
The mobile stack (Expo 54 + React Native 0.81.4) already provides:
- ✅ Supabase client with AsyncStorage session persistence
- ✅ React Navigation 7 with role-based routing
- ✅ React Query v5 for data fetching and caching
- ✅ Offline queue scaffolding
- ✅ Expo notifications, file system, image picker, local authentication
- ✅ Client/Approver screens and services
- ✅ NAD currency formatting utility

### Gaps Identified
- ❌ New Loan Application flow (missing screens)
- ❌ KYC completeness (field alignment, document capture)
- ❌ Payment enhancements (schedule, receipts, make-payment)
- ⚠️ Offline hardening, push notifications, biometrics, performance, security, QA, store readiness

### Output
A phased, low-risk migration/enhancement plan with feature parity matrix, implementation phases, risk assessment, success metrics, and documentation updates.

---

## Feature Parity Matrix

| Web Page | Mobile Screen(s) | Status | Priority |
|----------|------------------|--------|----------|
| `Auth.tsx` | `LoginScreen.tsx`, `BiometricSetupScreen.tsx` | ✅ Complete | - |
| `Dashboard.tsx` | `DashboardScreen.tsx` | ✅ Complete | - |
| `LoanApplication.tsx` | **[NEW]** Screens needed | ❌ Missing | HIGH |
| `KYC.tsx` | `ProfileScreen.tsx`, `DocumentUploadScreen.tsx` | ⚠️ Partial | HIGH |
| `Payment.tsx` | `PaymentScreen.tsx` | ⚠️ Partial | MEDIUM |
| `AdminDashboard.tsx` | Approver screens | ✅ Complete | - |

---

## Implementation Phases

### Phase 1: Feature Parity Matrix ✅ COMPLETE
**Duration:** 1 day | **Status:** ✅ Complete (Oct 14, 2025)

### Phase 2: Auth & Roles Alignment
**Duration:** 1-2 days | **Priority:** HIGH | **Status:** 📋 Pending
- Verify role resolution from `user_roles` without `.single()`
- Validate routing logic prevents loops
- Test session persistence and token refresh

### Phase 3: New Loan Application Flow
**Duration:** 3-5 days | **Priority:** HIGH | **Status:** 📋 Pending
- Create `LoanApplicationStartScreen.tsx` and `LoanApplicationFormScreen.tsx`
- Implement validation, APR messaging (≤32%), NAD formatting
- Add offline queue support

### Phase 4: KYC & Document Capture
**Duration:** 3-4 days | **Priority:** HIGH | **Status:** 📋 Pending
- Align profile fields with live schema
- Enhance document capture with compression
- Implement resumable uploads

### Phase 5: Payment Enhancements
**Duration:** 2-3 days | **Priority:** MEDIUM | **Status:** 📋 Pending
- Add payment schedule view
- Implement make-payment flow
- Add receipt view/download

### Phase 6: Approver UX
**Duration:** 2 days | **Priority:** MEDIUM | **Status:** 📋 Pending
- Add notification badges
- Implement queue filters
- Add pull-to-refresh

### Phase 7: Offline-First Hardening
**Duration:** 3-4 days | **Priority:** HIGH | **Status:** 📋 Pending
- Extend queue for submissions and uploads
- Implement conflict resolution
- Add network status banner

### Phase 8: Push Notifications & Deep Links
**Duration:** 2-3 days | **Priority:** HIGH | **Status:** 📋 Pending
- Configure `expo-notifications`
- Implement deep link routing
- Test notification scenarios

### Phase 9: Biometric Login & Session Lock
**Duration:** 2 days | **Priority:** MEDIUM | **Status:** 📋 Pending
- Implement idle session lock
- Add biometric re-authentication
- Handle token refresh gracefully

### Phase 10: Performance Optimizations
**Duration:** 2-3 days | **Priority:** MEDIUM | **Status:** 📋 Pending
- Implement list virtualization
- Add component memoization
- Optimize image loading

### Phase 11: Security Hardening
**Duration:** 2 days | **Priority:** HIGH | **Status:** 📋 Pending
- Gate dev tools with environment flags
- Verify no service role keys shipped
- Review token and document storage

### Phase 12: QA & Testing
**Duration:** 3-5 days | **Priority:** MEDIUM | **Status:** 📋 Pending
- Implement E2E smoke tests (Detox/Maestro)
- Add unit tests for services
- Conduct manual QA

### Phase 13: Documentation & Store Readiness
**Duration:** 2-3 days | **Priority:** LOW | **Status:** 📋 Pending
- Update documentation
- Prepare store assets
- Create privacy policy and checklists

---

## Risk Assessment

### High-Priority Risks
1. **Schema Drift (PGRST204)**: Audit live schema before KYC implementation
2. **Auth Loops**: Centralize role resolution, add loading states
3. **Offline Conflicts**: Implement idempotency keys, de-duplication
4. **Upload Failures**: Chunked uploads, retry with backoff, compression
5. **Push Notifications**: Test both platforms, graceful permission flow

### Mitigation Strategies
- Use TypeScript interfaces matching exact schema
- Test multi-role scenarios thoroughly
- Implement optimistic updates with rollback
- Show clear progress indicators
- Monitor notification delivery rates

---

## Success Metrics

- **Feature Parity**: 100% coverage of client flows
- **Reliability**: >99.5% crash-free sessions
- **Offline Queue**: >98% successful sync within 24 hours
- **Performance**: TTI < 2.5s, 60 FPS lists, < 150MB memory
- **Compliance**: 100% APR messaging (≤32%), NAD formatting
- **Test Coverage**: ≥12 E2E scenarios, ≥80% unit test coverage
- **Notifications**: ≥95% delivery and successful deep-link navigation

---

## Documentation Updates Required

- `docs/mobile-app-deployment-summary.md` - Feature parity status, performance metrics
- `docs/CHANGELOG.md` - v2.6.0 entry
- `docs/Executive Summary.md` - Mobile enhancement progress
- `docs/context.md` - Current system state
- `docs/privacy-policy.md` (new)
- `docs/beta-testing-checklist.md` (new)
- `docs/app-store-submission-checklist.md` (new)

---

## Next Actions

1. **[confirm-scope]** Client-only parity now, or include approver polish?
2. **[go/no-go]** Approve creation of `LoanApplication*` screens
3. **[env-check]** Confirm `namlend-mobile/.env` has required `EXPO_PUBLIC_*` vars
4. **[phase-2-start]** Begin Auth & Roles Alignment verification

---

**Document Owner:** Technical Lead  
**Last Updated:** October 14, 2025  
**Next Review:** After Phase 2 completion
