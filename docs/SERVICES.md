# NamLend Trust - Services Documentation

**Version**: 2.6.0  
**Last Updated**: December 10, 2025  
**Status**: ✅ All Services Implemented & Database Deployed (IPP Ready)

---

## Overview

NamLend Trust includes a comprehensive suite of backend services for payment processing, communications, and intelligent credit decisions. The system is designed to integrate with Namibia's **Instant Payment Platform (IPP/IPN)** for real-time payment settlement.

---

## Payment Gateway Service

**File**: `src/services/paymentGateway.ts`

### Supported Providers

| Provider | Type | Processing Time | Integration Status |
|----------|------|-----------------|-------------------|
| **IPP/IPN** | Real-time | Instant (<5 sec) | 🔶 Ready for Integration |
| Bank Transfer (EFT) | Manual | 1-2 business days | ✅ Implemented |
| MTC MoMo | Mobile Money | Instant | ✅ Implemented |
| TN Mobile Money | Mobile Money | Instant | ✅ Implemented |
| PayToday | Online Gateway | Instant | ✅ Implemented |
| Cash | In-person | Same day | ✅ Implemented |

> **IPP Integration**: See [IPP_INTEGRATION.md](./IPP_INTEGRATION.md) for detailed integration guide.

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

## Database Tables (Phase 4)

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

---

*Document Version: 2.0.0*  
*Last Updated: December 6, 2025*
