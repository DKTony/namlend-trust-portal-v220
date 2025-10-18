# NamLend Mobile App

**Version:** v2.6.0  
**Platform:** React Native + Expo  
**Target:** iOS & Android  
**Status:** 🚀 Production Ready

## Overview

NamLend Mobile is a native mobile application for the NamLend Trust lending platform, providing clients and loan officers with secure, on-the-go access to loan management features.

## Features

### Client Features
- **Dashboard**: View loan statistics, active loans, and pending applications
- **Loan Application**: Complete 3-step loan application with real-time APR calculations (≤32%)
- **Loan Management**: Browse loans, view details, repayment schedules
- **Payment Processing**: Make payments via mobile money, bank transfer, or debit order
- **Payment History**: View payment schedule, history, and download receipts
- **Document Upload**: Capture and upload KYC documents with camera integration (max 2MB, compressed)
- **Profile Management**: View and update personal information with validation
- **Offline Mode**: Queue operations when offline, auto-sync when connected

### Approver Features (Loan Officers/Admins)
- **Approval Dashboard**: View pending applications and workflow stages
- **Approval Queue**: Filter and review loan applications by status and priority
- **Real-time Badges**: Live notification count with Supabase subscriptions
- **Application Review**: Detailed review with approve/reject actions
- **Workflow Management**: Process multi-stage approval workflows
- **Pull-to-Refresh**: Instant queue updates

### Shared Features
- **Biometric Authentication**: Face ID, Touch ID, Fingerprint support
- **Session Lock**: Auto-lock after 15 minutes of inactivity with biometric unlock
- **Push Notifications**: Real-time updates for application status changes
- **Deep Linking**: Navigate directly to screens via `namlend://` URLs
- **Offline Support**: Queue for loan applications, payments, and document uploads
- **Network Banner**: Visual indicator when offline with sync status
- **Secure Authentication**: Supabase Auth with auto-refresh tokens
- **Performance Optimized**: List virtualization, image lazy loading, component memoization

## Technology Stack

- **Framework**: React Native 0.72+ with Expo SDK 49+
- **Language**: TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **State Management**: 
  - Zustand (auth state)
  - React Query (server state)
- **Navigation**: React Navigation (Native Stack + Bottom Tabs)
- **UI Library**: React Native Paper
- **Icons**: Lucide React Native
- **Biometrics**: Expo Local Authentication
- **Notifications**: Expo Notifications
- **Storage**: AsyncStorage

## Project Structure

```
namlend-mobile/
├── src/
│   ├── screens/
│   │   ├── auth/           # Login, Biometric Setup
│   │   ├── client/         # Client-facing screens
│   │   └── approver/       # Approver-facing screens
│   ├── components/
│   │   ├── common/         # Shared components
│   │   ├── client/         # Client-specific components
│   │   └── approver/       # Approver-specific components
│   ├── navigation/         # Navigation configuration
│   │   ├── AppNavigator.tsx
│   │   ├── AuthStack.tsx
│   │   ├── ClientStack.tsx
│   │   └── ApproverStack.tsx
│   ├── services/           # API services
│   │   ├── supabaseClient.ts
│   │   ├── authService.ts
│   │   ├── loanService.ts
│   │   ├── approvalService.ts
│   │   ├── paymentService.ts
│   │   └── notificationService.ts
│   ├── hooks/              # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useLoans.ts
│   │   ├── useApprovals.ts
│   │   └── usePayments.ts
│   ├── store/              # Zustand stores
│   │   └── authStore.ts
│   ├── types/              # TypeScript types
│   │   └── index.ts
│   └── utils/              # Utility functions
│       └── currency.ts
├── App.tsx                 # App entry point
├── package.json
└── .env.example
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator
- Supabase project with credentials

### Installation

1. **Install dependencies:**
   ```bash
   cd namlend-mobile
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your Supabase credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **Start development server:**
   ```bash
   npm start
   ```

4. **Run on device/simulator:**
   - iOS: Press `i` or scan QR code with Expo Go
   - Android: Press `a` or scan QR code with Expo Go

## Development

### Running the App

```bash
# Start Expo development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web (for testing)
npm run web
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `EXPO_PUBLIC_ENV` | Environment (development/production) | No |
| `EXPO_PUBLIC_ENABLE_BIOMETRIC` | Enable biometric auth | No |
| `EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS` | Enable push notifications | No |
| `EXPO_PUBLIC_MAX_APR` | Maximum APR (32% for Namibia) | No |

### Code Style

- TypeScript strict mode enabled
- ESLint + Prettier for code formatting
- Follow React Native best practices
- Use functional components with hooks

## Building for Production

### EAS Build Setup

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Configure EAS:**
   ```bash
   eas build:configure
   ```

3. **Build for iOS:**
   ```bash
   eas build --platform ios
   ```

4. **Build for Android:**
   ```bash
   eas build --platform android
   ```

### App Store Submission

- Follow Apple App Store guidelines
- Follow Google Play Store guidelines
- Ensure all required permissions are documented
- Test on real devices before submission

## Testing

### Manual Testing

1. **Authentication Flow:**
   - Sign in with email/password
   - Test biometric authentication
   - Verify session persistence

2. **Client Features:**
   - View dashboard statistics
   - Browse and filter loans
   - Make test payment
   - Upload document

3. **Approver Features:**
   - Review approval queue
   - Approve/reject application
   - Verify workflow progression

### Automated Testing

```bash
# Run unit tests
npm test

# Run E2E tests (when configured)
npm run test:e2e
```

## Security Considerations

- **Authentication**: Supabase Auth with JWT tokens
- **Session Management**: Auto-refresh tokens, 15-minute timeout
- **Biometric Storage**: Secure keychain/keystore
- **API Security**: Row-Level Security (RLS) policies
- **Data Encryption**: HTTPS for all API calls
- **Sensitive Data**: Never log credentials or tokens

## Performance Optimization

- **React Query**: Automatic caching and background refetching
- **Image Optimization**: Use optimized image formats
- **Lazy Loading**: Load screens on demand
- **Offline Support**: Cache critical data locally
- **Bundle Size**: Monitor and optimize bundle size

## Troubleshooting

### Common Issues

**Issue: "Cannot connect to Supabase"**
- Verify `.env` configuration
- Check network connectivity
- Ensure Supabase project is active

**Issue: "Biometric authentication not working"**
- Verify device has biometric hardware
- Check app permissions
- Ensure biometric is enrolled on device

**Issue: "Push notifications not received"**
- Check notification permissions
- Verify Expo push token registration
- Test on physical device (not simulator)

## Deployment Checklist

- [ ] Update version numbers in `package.json` and `app.json`
- [ ] Test on iOS and Android devices
- [ ] Verify all environment variables
- [ ] Test biometric authentication
- [ ] Test push notifications
- [ ] Verify offline functionality
- [ ] Run security audit
- [ ] Update CHANGELOG.md
- [ ] Create release notes
- [ ] Build production bundles
- [ ] Submit to app stores

## Support

For issues or questions:
- Technical Documentation: `/docs`
- Backend API: Supabase Dashboard
- Mobile Issues: GitHub Issues

## License

Proprietary - NamLend Trust Platform

## Version History

- **v2.6.0** (Oct 14, 2025) - Production Ready Release
  - ✅ Complete loan application flow (3-step form)
  - ✅ Enhanced payment management (schedule, history, receipts)
  - ✅ KYC document upload with compression (max 2MB)
  - ✅ Profile editing with validation
  - ✅ Offline-first architecture with auto-sync
  - ✅ Session lock with biometric unlock
  - ✅ Approver notification badges (real-time)
  - ✅ Performance optimizations (virtualization, lazy loading)
  - ✅ Security hardening (dev tools gated, RLS verified)
  - ✅ Comprehensive testing (unit + E2E)
  - ✅ Store submission ready (iOS + Android)

- **v2.4.2** (Oct 9, 2025) - Initial mobile app release
  - Client and approver features
  - Biometric authentication
  - Push notifications
  - Offline support
