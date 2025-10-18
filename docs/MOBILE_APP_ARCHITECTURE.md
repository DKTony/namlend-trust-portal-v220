# NamLend Mobile App Architecture

Version: v2.4.2 • Date: 2025-10-09 • Status: Implementation Phase

## Executive Summary

The NamLend mobile application provides native iOS and Android interfaces for loan management, enabling clients to manage their loans and approvers to process applications on-the-go. Built with React Native and Expo, the app features biometric authentication, push notifications, and offline capabilities.

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Mobile App Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Client     │  │   Approver   │  │    Auth      │ │
│  │   Features   │  │   Features   │  │   Features   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  Services Layer                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ Supabase │  │  Notif.  │  │Biometric │  │Offline │ │
│  │  Client  │  │ Service  │  │ Service  │  │Service │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  Backend Services                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Supabase   │  │   Workflow   │  │    Audit     │ │
│  │   Database   │  │    Engine    │  │    Trail     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Feature Breakdown

### Client Features

#### 1. Dashboard
- **Purpose:** Overview of active loans and payment status
- **Components:**
  - Active loans summary card
  - Next payment due widget
  - Quick actions (make payment, upload document)
  - Recent transactions list
- **Data Sources:**
  - `loans` table (user's active loans)
  - `payments` table (payment history)
  - `approval_requests` table (pending applications)

#### 2. Loans List
- **Purpose:** View all loans (active, pending, completed)
- **Features:**
  - Filter by status (active, pending, completed)
  - Sort by date, amount, status
  - Search by loan ID
  - Pull-to-refresh
- **Offline:** Cached for 24 hours

#### 3. Loan Details
- **Purpose:** Detailed view of specific loan
- **Information:**
  - Loan amount, interest rate, term
  - Repayment schedule
  - Payment history
  - Outstanding balance
  - Documents attached
- **Actions:**
  - Make payment
  - View repayment schedule
  - Download loan agreement
  - Contact support

#### 4. Make Payment
- **Purpose:** Process loan payments
- **Features:**
  - Enter payment amount
  - Select payment method (mobile money integration)
  - View payment confirmation
  - Receive push notification on success
- **Security:** Biometric auth required

#### 5. Document Upload
- **Purpose:** Upload required documents
- **Features:**
  - Camera integration
  - Photo library access
  - Document type selection (ID, proof of income, etc.)
  - Preview before upload
  - Upload progress indicator
- **Storage:** Supabase Storage

### Approver Features

#### 1. Approval Queue
- **Purpose:** View pending loan applications
- **Features:**
  - Priority sorting (amount, date, urgency)
  - Filter by amount range, date
  - Search by applicant name
  - Badge count for pending items
  - Pull-to-refresh
- **Real-time:** Push notifications for new applications

#### 2. Review Application
- **Purpose:** Detailed review of loan application
- **Information:**
  - Applicant details (name, employment, income)
  - Loan details (amount, term, purpose)
  - Credit history
  - Uploaded documents
  - Workflow stage information
- **Actions:**
  - Approve with notes
  - Reject with reason
  - Request additional documents
  - Assign to another approver

#### 3. Approve/Reject
- **Purpose:** Make approval decision
- **Features:**
  - Digital signature capture
  - Decision notes (required for rejection)
  - Biometric authentication required
  - Workflow progression indicator
- **Security:** Biometric auth + digital signature

---

## Technical Implementation

### Navigation Structure

```typescript
RootNavigator
├── AuthStack (not authenticated)
│   ├── LoginScreen
│   ├── RegisterScreen
│   └── BiometricSetupScreen
├── ClientStack (role: client)
│   ├── DashboardScreen
│   ├── LoansListScreen
│   ├── LoanDetailsScreen
│   ├── PaymentScreen
│   └── DocumentUploadScreen
└── ApproverStack (role: loan_officer, senior_officer, admin)
    ├── ApprovalQueueScreen
    ├── ReviewApplicationScreen
    └── SignatureScreen
```

### State Management

**React Query:** Server state (API data)
```typescript
// Example: Fetch loans
const { data: loans, isLoading } = useQuery({
  queryKey: ['loans', userId],
  queryFn: () => supabase.from('loans').select('*').eq('user_id', userId),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

**Zustand:** Client state (auth, offline mode)
```typescript
// Auth store
interface AuthStore {
  user: User | null;
  session: Session | null;
  setUser: (user: User) => void;
  logout: () => void;
}

const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null, session: null }),
}));
```

### API Integration

**Supabase Client:**
```typescript
// src/services/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
    },
  }
);
```

**Custom Hooks:**
```typescript
// src/hooks/useLoans.ts
export const useLoans = (userId: string) => {
  return useQuery({
    queryKey: ['loans', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
};
```

### Push Notifications

**Registration:**
```typescript
// src/services/notificationService.ts
import * as Notifications from 'expo-notifications';

export const registerForPushNotifications = async (userId: string) => {
  const { status } = await Notifications.requestPermissionsAsync();
  
  if (status === 'granted') {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    
    // Save token to database
    await supabase
      .from('user_push_tokens')
      .upsert({ user_id: userId, token, platform: Platform.OS });
    
    return token;
  }
};
```

**Handling:**
```typescript
// Listen for notifications
Notifications.addNotificationReceivedListener((notification) => {
  const { type, entityId } = notification.request.content.data;
  
  if (type === 'loan_approved') {
    // Navigate to loan details
    navigation.navigate('LoanDetails', { loanId: entityId });
  }
});
```

### Biometric Authentication

**Service:**
```typescript
// src/services/biometricService.ts
import * as LocalAuthentication from 'expo-local-authentication';

export const authenticateWithBiometric = async (): Promise<boolean> => {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  
  if (!hasHardware || !isEnrolled) {
    return false;
  }
  
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Authenticate to continue',
    fallbackLabel: 'Use passcode',
    disableDeviceFallback: false,
  });
  
  return result.success;
};
```

**Usage:**
```typescript
// Before sensitive operations
const handleApprove = async () => {
  const authenticated = await authenticateWithBiometric();
  
  if (authenticated) {
    await approveLoan(loanId);
  } else {
    Alert.alert('Authentication Failed', 'Please try again');
  }
};
```

### Offline Support

**Configuration:**
```typescript
// src/config/queryClient.ts
import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      cacheTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  throttleTime: 1000,
});
```

**Network Detection:**
```typescript
import NetInfo from '@react-native-community/netinfo';

const [isOnline, setIsOnline] = useState(true);

useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(state => {
    setIsOnline(state.isConnected ?? false);
  });
  
  return () => unsubscribe();
}, []);
```

---

## Security Architecture

### Authentication Flow

```
1. User enters credentials
2. Supabase Auth validates
3. JWT token stored in AsyncStorage
4. Biometric setup prompt (first login)
5. Biometric auth for subsequent logins
6. Auto-refresh token before expiry
7. Auto-logout after 15 minutes inactivity
```

### Data Security

1. **Encryption at Rest:**
   - AsyncStorage encryption for cached data
   - Expo SecureStore for sensitive data (tokens, keys)

2. **Encryption in Transit:**
   - HTTPS for all API calls
   - Certificate pinning in production

3. **Biometric Requirements:**
   - Loan approvals
   - Payment processing
   - Document uploads
   - Settings changes

4. **Session Management:**
   - JWT tokens with 1-hour expiry
   - Refresh tokens with 7-day expiry
   - Auto-logout on inactivity
   - Device-specific sessions

---

## Performance Optimization

### Bundle Size
- **Target:** < 50MB
- **Strategies:**
  - Code splitting by route
  - Lazy loading for heavy components
  - Image optimization (WebP format)
  - Remove unused dependencies

### Launch Time
- **Target:** < 2 seconds
- **Strategies:**
  - Splash screen while loading
  - Preload critical data
  - Defer non-critical initialization

### Data Fetching
- **Strategies:**
  - Pagination (20 items per page)
  - Infinite scroll for lists
  - Optimistic updates
  - Background refresh

### Caching
- **React Query cache:** 24 hours
- **Image cache:** 7 days
- **Document cache:** Until manual clear

---

## Testing Strategy

### Unit Tests
- Services (Supabase client, notification service)
- Utilities (currency formatting, date formatting)
- Custom hooks (useLoans, usePayments)

### Integration Tests
- Authentication flow
- Loan application submission
- Payment processing
- Document upload

### E2E Tests (Detox)
- Complete user journeys
- Client: View loans → Make payment
- Approver: Review application → Approve

### Device Testing
- iOS: iPhone 12+, iPad
- Android: Samsung Galaxy S21+, Pixel 6+
- Screen sizes: 4.7" to 6.7"

---

## Deployment Pipeline

### Development
```bash
expo start
# Test on simulators/emulators
```

### Staging
```bash
eas build --profile preview --platform all
# Internal testing with TestFlight/Internal Testing
```

### Production
```bash
eas build --profile production --platform all
eas submit --platform ios
eas submit --platform android
```

---

## Monitoring & Analytics

### Crash Reporting
- **Tool:** Sentry
- **Events:** Crashes, errors, ANRs

### Analytics
- **Tool:** Firebase Analytics / Amplitude
- **Events:**
  - Screen views
  - Button clicks
  - Loan applications
  - Payments processed
  - Approvals made

### Performance Monitoring
- **Metrics:**
  - App launch time
  - Screen load time
  - API response time
  - Offline mode usage

---

## Future Enhancements

### Phase 4 (Post-Launch)
- [ ] In-app chat support
- [ ] Loan calculator
- [ ] Payment reminders
- [ ] Dark mode
- [ ] Multi-language support (English, Afrikaans)
- [ ] Accessibility improvements (VoiceOver, TalkBack)
- [ ] Apple Watch / Wear OS companion app
- [ ] Widget for home screen (next payment due)

---

## Appendix

### Dependencies

```json
{
  "dependencies": {
    "expo": "~49.0.0",
    "react": "18.2.0",
    "react-native": "0.72.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/stack": "^6.3.0",
    "@react-navigation/bottom-tabs": "^6.5.0",
    "@supabase/supabase-js": "^2.38.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.4.0",
    "react-native-paper": "^5.11.0",
    "expo-local-authentication": "~13.4.0",
    "expo-camera": "~13.4.0",
    "expo-notifications": "~0.20.0",
    "expo-image-picker": "~14.3.0",
    "@react-native-async-storage/async-storage": "^1.19.0"
  }
}
```

### Environment Variables

```env
SUPABASE_URL=https://puahejtaskncpazjyxqp.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
EXPO_PROJECT_ID=your_expo_project_id
```

### Build Configuration

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "ios": {
        "bundleIdentifier": "com.namlend.app"
      },
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```
