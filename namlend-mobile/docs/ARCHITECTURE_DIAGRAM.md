# NamLend Mobile - Architecture Diagrams

**Version:** v2.7.1  
**Last Updated:** December 24, 2025

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     NamLend Mobile App                          │
│                   (React Native + Expo 54)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/WSS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Backend (BaaS)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  PostgreSQL  │  │   GoTrue     │  │   Realtime   │         │
│  │   Database   │  │     Auth     │  │  WebSockets  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Storage    │  │     RPC      │  │ Edge Funcs   │         │
│  │  (Documents) │  │  Functions   │  │   (Deno)     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ External APIs
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │     IPS      │  │  Africa's    │  │   WhatsApp   │         │
│  │   Payment    │  │   Talking    │  │   Business   │         │
│  │   Gateway    │  │     SMS      │  │     API      │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Mobile App Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        App.tsx (Entry)                          │
│                    ├─ Global CSS Import                         │
│                    └─ Theme Provider                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AppNavigator (Root)                          │
│                    ├─ Auth Check                                │
│                    ├─ Role-based Routing                        │
│                    └─ Deep Linking                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
        ┌───────────────────┐   ┌───────────────────┐
        │   AuthStack       │   │   MainStack       │
        │   ├─ Login        │   │   ├─ ClientStack  │
        │   └─ Biometric    │   │   └─ ApproverStack│
        └───────────────────┘   └───────────────────┘
```

---

## Client Stack Navigation

```
┌─────────────────────────────────────────────────────────────────┐
│                  ClientStack (Bottom Tabs)                      │
├─────────────────────────────────────────────────────────────────┤
│  DashboardTab  │  LoansTab  │  DocumentsTab  │  ProfileTab     │
└─────────────────────────────────────────────────────────────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
   Dashboard      LoansStack    DocumentUpload  ProfileStack
                      │                              │
                      ├─ LoansList                   ├─ Profile
                      ├─ LoanDetails                 ├─ ProfileEdit
                      ├─ LoanAppStart                └─ LoanCalculator
                      ├─ LoanAppForm
                      └─ Payment
```

---

## Approver Stack Navigation

```
┌─────────────────────────────────────────────────────────────────┐
│                ApproverStack (Bottom Tabs)                      │
├─────────────────────────────────────────────────────────────────┤
│    DashboardTab    │   ApprovalsTab   │    ProfileTab          │
└─────────────────────────────────────────────────────────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
   ApproverDashboard   ApprovalsStack     ApproverProfile
                            │
                            ├─ ApprovalQueue
                            └─ ReviewApplication
```

---

## Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                      Screen Component                           │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                  Neo Components                           │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │ │
│  │  │  NeoButton   │  │   NeoCard    │  │  NeoInput    │   │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │ │
│  │  │NeoCurrency   │  │ NeoBalance   │  │NeoTransaction│   │ │
│  │  │    Card      │  │    Card      │  │     Item     │   │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │ │
│  └───────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                  Legacy UI Components                     │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │ │
│  │  │NumericKeypad │  │   Avatar     │  │  MenuItem    │   │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI Layer                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Screen Components (React Native)                        │  │
│  │  ├─ Neo Components (NativeWind styled)                   │  │
│  │  └─ Event Handlers                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Hooks Layer                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Custom Hooks (React Query + Zustand)                    │  │
│  │  ├─ useAuth, useLoans, usePayments                       │  │
│  │  ├─ useApprovals, useIPS                                 │  │
│  │  └─ useBackendNotifications                              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Services Layer                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Service Modules (Business Logic)                        │  │
│  │  ├─ authService, loanService                             │  │
│  │  ├─ paymentService (RPC-based)                           │  │
│  │  ├─ ipsService, approvalService                          │  │
│  │  └─ backendNotificationService                           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Supabase Client                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  @supabase/supabase-js                                    │  │
│  │  ├─ Auth (JWT tokens)                                     │  │
│  │  ├─ Database (PostgREST)                                  │  │
│  │  ├─ Realtime (WebSockets)                                 │  │
│  │  ├─ Storage (File uploads)                                │  │
│  │  └─ RPC (Server functions)                                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Backend (Supabase)                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL + RLS + Edge Functions                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Authentication Flow

```
┌─────────────┐
│  LoginScreen│
└──────┬──────┘
       │ Email/Password
       ▼
┌─────────────────────┐
│  authService.signIn │
└──────┬──────────────┘
       │ Supabase Auth
       ▼
┌─────────────────────┐
│  JWT Token Received │
└──────┬──────────────┘
       │ Store in AsyncStorage
       ▼
┌─────────────────────┐
│  authStore.setUser  │
└──────┬──────────────┘
       │ Update Zustand
       ▼
┌─────────────────────┐
│  AppNavigator       │
│  ├─ Check Role      │
│  ├─ ClientStack     │
│  └─ ApproverStack   │
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│ BiometricSetupScreen│ (Optional)
│  ├─ Face ID         │
│  ├─ Touch ID        │
│  └─ Fingerprint     │
└─────────────────────┘
```

---

## Payment Processing Flow

```
┌─────────────────┐
│ PaymentScreen   │
│ ├─ Amount Input │
│ ├─ Method Select│
│ └─ Confirm      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ useProcessLoanPayment   │
│ (React Query Hook)      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ paymentService          │
│ .processLoanPayment()   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Supabase RPC            │
│ process_loan_payment    │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Backend Processing      │
│ ├─ Create payment       │
│ ├─ Update schedule      │
│ ├─ Check settlement     │
│ └─ Trigger notification │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Response                │
│ ├─ payment_id           │
│ ├─ amount_applied       │
│ ├─ loan_settled         │
│ └─ settlement_details   │
└─────────────────────────┘
```

---

## Offline Queue Architecture

```
┌─────────────────────┐
│  User Action        │
│  (Loan App, Payment)│
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Network Check      │
└──────┬──────────────┘
       │
   ┌───┴───┐
   │       │
Online  Offline
   │       │
   ▼       ▼
┌──────┐ ┌──────────────┐
│Direct│ │ offlineQueue │
│ API  │ │  .enqueue()  │
│ Call │ └──────┬───────┘
└──────┘        │
                │ Store in AsyncStorage
                ▼
         ┌──────────────┐
         │ Queue Storage│
         └──────┬───────┘
                │
                │ Network Online
                ▼
         ┌──────────────┐
         │offlineProcessor│
         │ .process()   │
         └──────┬───────┘
                │
                ▼
         ┌──────────────┐
         │  Sync to API │
         │  ├─ Success  │
         │  └─ Remove   │
         └──────────────┘
```

---

## State Management Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     State Management                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Server State (React Query)                   │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │  │
│  │  │   Loans    │  │  Payments  │  │ Approvals  │         │  │
│  │  │   Cache    │  │   Cache    │  │   Cache    │         │  │
│  │  └────────────┘  └────────────┘  └────────────┘         │  │
│  │  Features:                                                │  │
│  │  ├─ Automatic caching                                     │  │
│  │  ├─ Background refetching                                 │  │
│  │  ├─ Optimistic updates                                    │  │
│  │  └─ Stale-while-revalidate                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Client State (Zustand)                       │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │  │
│  │  │    Auth    │  │   Theme    │  │    UI      │         │  │
│  │  │   Store    │  │   Store    │  │   Store    │         │  │
│  │  └────────────┘  └────────────┘  └────────────┘         │  │
│  │  Features:                                                │  │
│  │  ├─ Lightweight                                           │  │
│  │  ├─ No boilerplate                                        │  │
│  │  └─ React hooks integration                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Persistent State (AsyncStorage)                 │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │  │
│  │  │    Auth    │  │  Offline   │  │  Settings  │         │  │
│  │  │   Token    │  │   Queue    │  │   Cache    │         │  │
│  │  └────────────┘  └────────────┘  └────────────┘         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Design System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  Neo-Fintech Design System                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Theme Layer                              │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │  │
│  │  │   Tokens   │  │  Provider  │  │    Hook    │         │  │
│  │  │  (tokens.ts)│  │(ThemeProvider)│ (useTheme) │         │  │
│  │  └────────────┘  └────────────┘  └────────────┘         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                      │
│                          ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              NativeWind (TailwindCSS)                     │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │  │
│  │  │   Config   │  │   Babel    │  │   Metro    │         │  │
│  │  │(tailwind.config)│(babel.config)│(metro.config)│       │  │
│  │  └────────────┘  └────────────┘  └────────────┘         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                      │
│                          ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                Neo Components                             │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │  │
│  │  │NeoButton │ │ NeoCard  │ │NeoInput  │ │NeoCurrency│  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                │  │
│  │  │NeoBalance│ │NeoTrans  │ │Numeric   │                │  │
│  │  │   Card   │ │  action  │ │ Keypad   │                │  │
│  │  └──────────┘ └──────────┘ └──────────┘                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                      │
│                          ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Screens                                │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │  │
│  │  │   Client   │  │  Approver  │  │    Auth    │         │  │
│  │  │  Screens   │  │  Screens   │  │  Screens   │         │  │
│  │  │  (10)      │  │   (4)      │  │   (2)      │         │  │
│  │  └────────────┘  └────────────┘  └────────────┘         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Testing Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Testing Infrastructure                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Unit Tests (Jest)                            │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │  │
│  │  │  Utilities │  │  Services  │  │ Components │         │  │
│  │  │   Tests    │  │   Tests    │  │   Tests    │         │  │
│  │  └────────────┘  └────────────┘  └────────────┘         │  │
│  │  Configuration:                                           │  │
│  │  ├─ jest.config.js                                        │  │
│  │  ├─ jest.setup.js                                         │  │
│  │  └─ jest-expo preset                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              E2E Tests (Detox)                            │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │  │
│  │  │Loan App    │  │  Payment   │  │  Document  │         │  │
│  │  │   Flow     │  │   Flow     │  │   Upload   │         │  │
│  │  └────────────┘  └────────────┘  └────────────┘         │  │
│  │  Configuration:                                           │  │
│  │  ├─ @types/detox                                          │  │
│  │  ├─ testID props on components                            │  │
│  │  └─ iOS/Android simulators                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            Coverage Reporting                             │  │
│  │  ├─ Source files: src/**/*.{ts,tsx}                       │  │
│  │  ├─ Exclude: types, tests, node_modules                   │  │
│  │  └─ Report formats: text, lcov, html                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Build & Deployment Pipeline

```
┌─────────────────┐
│  Source Code    │
│  (TypeScript)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  TypeScript     │
│  Compilation    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Babel          │
│  Transform      │
│  + NativeWind   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Metro Bundler  │
│  (JavaScript)   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│  iOS  │ │Android│
│ Build │ │ Build │
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│ .ipa  │ │ .apk  │
│ .app  │ │ .aab  │
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌───────────────┐
│  EAS Build    │
│  (Expo Cloud) │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  App Stores   │
│  ├─ Apple     │
│  └─ Google    │
└───────────────┘
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Security Layers                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Layer 1: Network Security                                      │
│  ├─ HTTPS for all API calls                                     │
│  ├─ WSS for realtime connections                                │
│  └─ Certificate pinning (production)                            │
│                                                                 │
│  Layer 2: Authentication                                        │
│  ├─ Supabase GoTrue (JWT tokens)                                │
│  ├─ Auto-refresh tokens                                         │
│  ├─ Biometric authentication (optional)                         │
│  └─ Session timeout (15 minutes)                                │
│                                                                 │
│  Layer 3: Authorization                                         │
│  ├─ Role-based access control (RBAC)                            │
│  ├─ Row-Level Security (RLS) policies                           │
│  └─ Client/Approver role separation                             │
│                                                                 │
│  Layer 4: Data Security                                         │
│  ├─ Encrypted AsyncStorage (iOS Keychain, Android Keystore)    │
│  ├─ No sensitive data in logs                                   │
│  ├─ No service role keys in mobile app                          │
│  └─ Secure document upload (Supabase Storage)                   │
│                                                                 │
│  Layer 5: Code Security                                         │
│  ├─ TypeScript strict mode                                      │
│  ├─ No hardcoded credentials                                    │
│  ├─ Environment variables for config                            │
│  └─ Dev tools gated in production                               │
│                                                                 │
│  Layer 6: API Security                                          │
│  ├─ RPC functions for atomic operations                         │
│  ├─ Input validation on backend                                 │
│  ├─ Rate limiting (Supabase)                                    │
│  └─ Audit logging for financial operations                      │
│                                                                 │
│  Layer 7: Device Security                                       │
│  ├─ Biometric hardware integration                              │
│  ├─ Secure enclave (iOS) / Keystore (Android)                   │
│  ├─ App sandboxing                                              │
│  └─ Jailbreak/Root detection (optional)                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Performance Optimization Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                Performance Optimizations                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  React Query Caching                                            │
│  ├─ Automatic background refetching                             │
│  ├─ Stale-while-revalidate strategy                             │
│  ├─ Optimistic updates                                          │
│  └─ Query invalidation on mutations                             │
│                                                                 │
│  List Virtualization                                            │
│  ├─ FlatList with windowSize optimization                       │
│  ├─ OptimizedList component                                     │
│  ├─ Item memoization                                            │
│  └─ Lazy rendering                                              │
│                                                                 │
│  Image Optimization                                             │
│  ├─ OptimizedImage component                                    │
│  ├─ Lazy loading                                                │
│  ├─ Compression (max 2MB for documents)                         │
│  └─ Caching with expo-image-picker                              │
│                                                                 │
│  Component Optimization                                         │
│  ├─ React.memo for expensive components                         │
│  ├─ useMemo for expensive calculations                          │
│  ├─ useCallback for event handlers                              │
│  └─ Code splitting with dynamic imports                         │
│                                                                 │
│  Bundle Optimization                                            │
│  ├─ Tree shaking (Metro bundler)                                │
│  ├─ Minification in production                                  │
│  ├─ Asset optimization                                          │
│  └─ Hermes JavaScript engine                                    │
│                                                                 │
│  Animation Performance                                          │
│  ├─ react-native-reanimated (60fps)                             │
│  ├─ Native driver for animations                                │
│  ├─ Haptic feedback (expo-haptics)                              │
│  └─ Gesture handler optimization                                │
│                                                                 │
│  Network Optimization                                           │
│  ├─ Offline queue for failed requests                           │
│  ├─ Request deduplication                                       │
│  ├─ Compression (gzip)                                          │
│  └─ Connection pooling                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

**Document Version:** 1.0.0  
**Last Updated:** December 24, 2025  
**Maintained By:** NamLend Development Team
