# NamLend Trust - Services Documentation

**Version**: 3.0.0  
**Last Updated**: December 22, 2025  
**Status**: ✅ All Services Implemented (IPS Active in Mock Mode; Admin Config Complete)

---

## Overview

NamLend Trust includes a comprehensive suite of backend services for payment processing, communications, and intelligent credit decisions. The system is designed to integrate with Namibia's **Instant Payment Platform (IPP/IPN)** for real-time payment settlement.

---

## Payment Gateway Service

**File**: `src/services/paymentGateway.ts`

### Supported Providers

| Provider | Type | Processing Time | Integration Status |
|----------|------|-----------------|-------------------|
| **IPS/IPP** | Real-time | Instant (<5 sec) | ✅ **Active (Mock Mode)** |
| Bank Transfer (EFT) | Manual | 1-2 business days | ✅ Implemented |
| MTC MoMo | Mobile Money | Instant | ✅ Implemented |
| TN Mobile Money | Mobile Money | Instant | ✅ Implemented |
| PayToday | Online Gateway | Instant | ✅ Implemented |
| Cash | In-person | Same day | ✅ Implemented |

> **IPS Integration**: See [IPS_IMPLEMENTATION.md](./IPS_IMPLEMENTATION.md) for implementation details.
> **IPP Technical Specs**: See [IPP_INTEGRATION.md](./IPP_INTEGRATION.md) for BON technical specifications.

### Key Functions

```typescript
// Initiate a payment
initiatePayment(request: PaymentRequest): Promise<PaymentResponse>

// Verify payment status
verifyPayment(transactionId: string, provider: PaymentProvider): Promise<PaymentVerification>

// Get payment instructions
getPaymentInstructions(provider: PaymentProvider, reference: string): string

// Handle incoming webhook
handlePaymentWebhook(provider, reference, status, providerData): Promise<boolean>

// Get payment history for a loan
getPaymentHistory(loanId: string): Promise<PaymentVerification[]>
```

### Environment Variables

```env
VITE_PAYTODAY_API_URL=
VITE_PAYTODAY_MERCHANT_ID=
VITE_PAYTODAY_API_KEY=
VITE_MTC_MOMO_API_URL=
VITE_MTC_MOMO_MERCHANT=
VITE_TN_MOBILE_API_URL=
VITE_TN_MOBILE_MERCHANT=
```

---

## SMS Gateway Service

**File**: `src/services/smsGateway.ts`

### Provider: Africa's Talking

### Key Functions

```typescript
// Send SMS
sendSMS(request: SMSRequest): Promise<SMSResponse>

// Send SMS using template
sendTemplateSMS(templateCode, to, variables, options): Promise<SMSResponse>

// Send bulk SMS
sendBulkSMS(recipients, category, options): Promise<BulkSMSResult>

// Send OTP
sendOTP(phone, userId?): Promise<{ success: boolean; otp?: string }>
```

### Pre-defined Templates

| Template Code | Category | Description |
|--------------|----------|-------------|
| `LOAN_SUBMITTED` | loan_notification | Application submitted |
| `LOAN_APPROVED` | loan_notification | Loan approved |
| `LOAN_REJECTED` | loan_notification | Application rejected |
| `LOAN_DISBURSED` | loan_notification | Funds disbursed |
| `PAYMENT_REMINDER_7_DAYS` | payment_reminder | 7 days before due |
| `PAYMENT_REMINDER_3_DAYS` | payment_reminder | 3 days before due |
| `PAYMENT_REMINDER_1_DAY` | payment_reminder | 1 day before due |
| `PAYMENT_OVERDUE` | collections | Overdue notice |
| `PAYMENT_RECEIVED` | payment_confirmation | Payment received |
| `LOAN_COMPLETED` | loan_notification | Loan paid off |
| `OTP_VERIFICATION` | otp | Verification code |
| `PTP_REMINDER` | collections | Promise-to-pay reminder |

### Environment Variables

```env
VITE_AFRICASTALKING_API_KEY=
VITE_AFRICASTALKING_USERNAME=
VITE_SMS_SENDER_ID=NAMLEND
```

---

## WhatsApp Gateway Service

**File**: `src/services/whatsappGateway.ts`

### Provider: Meta Cloud API (WhatsApp Business)

### Key Functions

```typescript
// Send text message
sendTextMessage(to, text, options?): Promise<WhatsAppResponse>

// Send template message
sendTemplateMessage(to, templateName, parameters, options?): Promise<WhatsAppResponse>

// Send interactive buttons
sendButtonMessage(to, body, buttons, options?): Promise<WhatsAppResponse>

// Send list message
sendListMessage(to, body, sections, options?): Promise<WhatsAppResponse>

// Handle webhook
handleWebhook(payload): Promise<{ type, data }>
```

### Quick Send Helpers

```typescript
// Loan approval notification
quickSend.loanApproved(to, loanDetails, userId?)

// Payment reminder
quickSend.paymentReminder(to, paymentDetails, userId?)

// Payment confirmation
quickSend.paymentConfirmation(to, paymentDetails, userId?)

// Payment options with buttons
quickSend.paymentOptions(to, amount, userId?)
```

### Environment Variables

```env
VITE_WHATSAPP_PHONE_NUMBER_ID=
VITE_WHATSAPP_ACCESS_TOKEN=
VITE_WHATSAPP_BUSINESS_ACCOUNT_ID=
VITE_WHATSAPP_WEBHOOK_VERIFY_TOKEN=
```

---

## Credit Scoring Service

**File**: `src/services/creditScoring.ts`

### AI-Powered Credit Assessment

The credit scoring service calculates risk scores based on multiple factors:

### Scoring Weights

| Factor | Weight | Description |
|--------|--------|-------------|
| Income | 25% | Monthly income level |
| Debt-to-Income | 20% | Current debt burden |
| Employment | 15% | Job stability |
| Payment History | 20% | Past payment behavior |
| Verification | 10% | ID/address/employment verified |
| Loan History | 10% | Previous loans completed |

### Score Ranges

| Range | Score | Risk Level |
|-------|-------|------------|
| Excellent | 750-850 | Low |
| Good | 670-749 | Medium |
| Fair | 580-669 | High |
| Poor | 300-579 | Very High |

### Key Functions

```typescript
// Calculate credit score from factors
calculateCreditScore(factors: CreditFactors): CreditScore

// Get loan recommendation
getLoanRecommendation(factors, creditScore): LoanRecommendation

// Fetch factors from user profile
getCreditFactorsForUser(userId: string): Promise<CreditFactors>

// Save score to database
saveCreditScore(userId, score, loanId?): Promise<string>

// Calculate using database function
calculateCreditScoreDB(userId, loanId?): Promise<string>

// Get current score from database
getCurrentCreditScore(userId?): Promise<CreditScore>
```

### Output

```typescript
interface CreditScore {
  score: number;                    // 300-850
  scoreRange: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  riskLevel: 'low' | 'medium' | 'high' | 'very_high';
  maxApprovedAmount: number;        // Calculated max loan
  suggestedInterestRate: number;    // Risk-based rate (max 32%)
  debtToIncomeRatio: number;        // DTI percentage
  factors: CreditScoreFactor[];     // Breakdown
  recommendations: string[];        // Improvement tips
}
```

---

## Notification Service

**File**: `src/services/notificationService.ts`

### Multi-Channel Notification System

### Key Functions

```typescript
// Get user's notifications
getNotifications(filters?): Promise<{ notifications, total, unreadCount }>

// Get unread count
getUnreadCount(): Promise<number>

// Mark as read
markAsRead(notificationId: string): Promise<boolean>

// Mark all as read
markAllAsRead(): Promise<number>

// Get preferences
getPreferences(): Promise<NotificationPreference[]>

// Update preference
updatePreference(channel, category, enabled): Promise<boolean>

// Queue notification
queueNotification(userId, templateCode, data, scheduledAt?): Promise<string[]>

// Subscribe to real-time updates
subscribeToNotifications(userId, onNotification): () => void
```

### Notification Categories

- `loan` - Loan lifecycle events
- `payment` - Payment related
- `kyc` - Verification status
- `account` - Account updates
- `general` - General info
- `marketing` - Promotions
- `collections` - Overdue notices

---

## Collections Service

**File**: `src/services/collectionsService.ts`

### Collections Management

### Key Functions

```typescript
// Get collections queue
getCollectionsQueue(filters?): Promise<CollectionsLoan[]>

// Add collection interaction
addInteraction(loanId, type, notes, outcome): Promise<string>

// Record promise-to-pay
recordPromiseToPay(loanId, promiseDate, promisedAmount, notes?): Promise<string>

// Get promise-to-pay records
getPromiseToPay(loanId): Promise<PromiseToPay[]>

// Update PTP status
updatePromiseToPayStatus(ptpId, status): Promise<void>

// Get overdue loans
getOverdueLoans(): Promise<Loan[]>

// Get collections statistics
getCollectionsStats(): Promise<CollectionsStats>
```

---

## Component Reference

### UI Components

| Component | File | Purpose |
|-----------|------|---------|
| `NotificationCenter` | `src/components/NotificationCenter.tsx` | In-app notification popover |
| `LoanStatusTimeline` | `src/components/LoanStatusTimeline.tsx` | Application status tracker |
| `LoanCalculator` | `src/components/LoanCalculator.tsx` | Interactive loan calculator |
| `CreditScoreDisplay` | `src/components/CreditScoreDisplay.tsx` | Visual credit score card |
| `SelfServicePortal` | `src/components/SelfServicePortal.tsx` | Client self-service |
| `CollectionsDashboard` | `src/pages/AdminDashboard/components/CollectionsManagement/CollectionsDashboard.tsx` | Collections queue |
| `PromiseToPayDialog` | `src/pages/AdminDashboard/components/CollectionsManagement/PromiseToPayDialog.tsx` | PTP recording |
| `Loan360View` | `src/pages/AdminDashboard/components/Loan360/Loan360View.tsx` | Unified loan view |
| `PortfolioAnalytics` | `src/pages/AdminDashboard/components/Analytics/PortfolioAnalytics.tsx` | Portfolio metrics |
| `CreditPolicyConfig` | `src/pages/AdminDashboard/components/Settings/CreditPolicyConfig.tsx` | Policy configuration |
| `BatchOperations` | `src/pages/AdminDashboard/components/BatchOperations/BatchOperations.tsx` | Bulk actions |

---

## Environment Variables Summary

```env
# Payment Gateway
VITE_PAYTODAY_API_URL=
VITE_PAYTODAY_MERCHANT_ID=
VITE_PAYTODAY_API_KEY=
VITE_MTC_MOMO_API_URL=
VITE_MTC_MOMO_MERCHANT=
VITE_TN_MOBILE_API_URL=
VITE_TN_MOBILE_MERCHANT=

# SMS Gateway (Africa's Talking)
VITE_AFRICASTALKING_API_KEY=
VITE_AFRICASTALKING_USERNAME=
VITE_SMS_SENDER_ID=NAMLEND

# WhatsApp Business API
VITE_WHATSAPP_PHONE_NUMBER_ID=
VITE_WHATSAPP_ACCESS_TOKEN=
VITE_WHATSAPP_BUSINESS_ACCOUNT_ID=
VITE_WHATSAPP_WEBHOOK_VERIFY_TOKEN=

# Supabase
VITE_SUPABASE_URL=https://puahejtaskncpazjyxqp.supabase.co
VITE_SUPABASE_ANON_KEY=
VITE_SUPABASE_SERVICE_ROLE_KEY=
```

---

## IPS (Instant Payment System) Service

**File**: `src/services/ipsService.ts`

### Overview

The IPS service handles real-time payments via Namibia's Instant Payment Platform (IPP/IPN).

### Key Functions

```typescript
// Initiate loan repayment via IPS
initiateIPSRepayment(params: {
  loanId: string;
  amount: number;
  payerVpa: string;
}): Promise<InitiateIPSRepaymentResult>

// Initiate loan disbursement via IPS
initiateIPSDisbursement(params: {
  loanId: string;
  payeeVpa: string;
}): Promise<InitiateIPSDisbursementResult>

// Validate a VPA address
validateVPA(vpa: string): Promise<ValidateVPAResult>

// Get transaction status
getTransactionStatus(transactionId: string): Promise<TransactionStatusResult>

// Fetch user's saved VPAs
getUserVPAs(userId: string): Promise<VPA[]>

// Save/update a VPA
upsertVPA(params: UpsertVPAParams): Promise<VPA>
```

### Edge Function: ips-adapter

**Location**: `supabase/functions/ips-adapter/index.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/pay` | POST | Process IPS payment |
| `/validate-vpa` | POST | Validate VPA address |
| `/check-status` | POST | Check transaction status |
| `/list-acc-pvd` | POST | List SoV providers |
| `/list-account` | POST | List user accounts |
| `/register-mobile` | POST | Register mobile device |
| `/get-alias` | POST | Get alias directory |
| `/reg-mapper` | POST | Register VPA alias |
| `/set-cred` | POST | Set IPS PIN |
| `/list-keys` | POST | List encryption keys |

### Mock Mode

The service operates in **Mock Mode** by default for development:
- VPA validation always succeeds for valid format
- Payments complete after simulated delay
- Random transaction IDs generated

Set `MOCK_MODE=false` for production IPS integration.

### Environment Variables (Production)

```env
IPS_API_URL=https://ips.bon.na/api/v2
IPS_API_KEY=<your-api-key>
IPS_ORG_ID=NAMLEND
IPS_MERCHANT_VPA=collections@namlend
MOCK_MODE=false
```

---

## Database Tables (Phase 4 & IPS)

The following tables support these services:

| Table | Service | Purpose |
|-------|---------|--------|
| `notification_templates` | Notification | Reusable message templates |
| `notification_preferences` | Notification | User channel preferences |
| `notification_queue` | Notification | Async delivery queue |
| `credit_scores` | Credit Scoring | Historical score records |
| `credit_score_factors` | Credit Scoring | Score breakdown |
| `payment_transactions` | Payment Gateway | Transaction logs |
| `payment_webhooks` | Payment Gateway | Webhook logs |
| `communication_logs` | SMS/WhatsApp | Message delivery logs |
| `whatsapp_conversations` | WhatsApp | Conversation state |
| `ips_transactions` | **IPS** | IPS payment transactions |
| `ips_vpa_registry` | **IPS** | User VPA records |
| `ips_api_logs` | **IPS** | API call logging |
| `ips_onboarding` | **IPP Onboarding** | Customer onboarding state machine |
| `ips_device_bindings` | **IPP Onboarding** | Device binding records |
| `ips_alias_directory` | **IPP Onboarding** | VPA alias cache |
| `ips_sov_providers` | **IPP Onboarding** | SoV providers (banks, mobile money) |
| `ips_onboarding_history` | **IPP Onboarding** | Onboarding audit trail |

---

## IPP Onboarding Service

**File**: `src/services/ipsOnboardingService.ts`

### Purpose

Manages customer enrollment into IPP (Instant Payment Platform) for real-time payments.

### Onboarding States

| State | Description |
|-------|-------------|
| `NOT_STARTED` | User has not begun enrollment |
| `DEVICE_BINDING_REQUIRED` | Device binding needed |
| `DEVICE_BOUND` | Device successfully bound |
| `SOV_SELECTED` | Bank/provider selected |
| `ACCOUNTS_LISTED` | Accounts fetched from bank |
| `VERIFIED` | Account verified via OTP |
| `IPS_PIN_SET` | 6-digit IPS PIN created |
| `ALIAS_REGISTERED` | VPA created and active |
| `READY_FOR_IPP_PAYMENTS` | Fully enrolled, can transact |

### Key Functions

```typescript
// Get onboarding status
getOnboardingStatus(userId?: string): Promise<OnboardingStatusResponse>

// Advance onboarding step
advanceOnboardingStep(stepName, stepData): Promise<StepResult>

// Customer flow functions
startDeviceBinding(mobileNumber): Promise<DeviceBindingResult>
selectSovProvider(providerCode): Promise<SovSelectionResult>
verifyWithOTP(otpCode): Promise<VerificationResult>
setIPSPin(pin): Promise<PinSetResult>
registerAlias(vpaUsername): Promise<AliasResult>
```

### Client-Side UI

**Component**: `src/components/BankingSection.tsx`

Provides self-service IPP enrollment in the client dashboard under the **Banking** tab.

### Admin Dashboard UI

**Component**: `src/pages/AdminDashboard/components/IPPOnboarding/IPPOnboardingDashboard.tsx`

Allows admins to:
- View enrollment statistics
- Initiate onboarding for customers
- Monitor onboarding progress
- View detailed user status

---

*Document Version: 3.1.0*  
*Last Updated: December 27, 2025*
