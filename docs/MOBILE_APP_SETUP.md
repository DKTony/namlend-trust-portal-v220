# NamLend Mobile App Setup Guide

Version: v2.4.2 • Date: 2025-10-09 • Platform: React Native + Expo

## Overview

The NamLend mobile app provides native iOS and Android interfaces for:
- **Clients:** View loans, make payments, upload documents
- **Approvers:** Review applications, approve/reject on mobile
- **Push Notifications:** Real-time alerts for status changes
- **Biometric Auth:** Face ID, Touch ID, Fingerprint support
- **Offline Mode:** View cached loan data

---

## Technology Stack

- **Framework:** React Native 0.72+ with Expo SDK 49+
- **Language:** TypeScript
- **Navigation:** React Navigation v6
- **State Management:** React Query + Zustand
- **UI Components:** React Native Paper
- **Authentication:** Supabase Auth with biometric support
- **Push Notifications:** Expo Push Notifications
- **Offline Storage:** React Query persistence + AsyncStorage
- **Camera:** Expo Camera for document uploads
- **Biometrics:** Expo Local Authentication

---

## Project Structure

```
namlend-mobile/
├── app.json                 # Expo configuration
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── App.tsx                 # Root component
├── src/
│   ├── screens/            # Screen components
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── BiometricSetupScreen.tsx
│   │   │   └── RegisterScreen.tsx
│   │   ├── client/
│   │   │   ├── DashboardScreen.tsx
│   │   │   ├── LoansListScreen.tsx
│   │   │   ├── LoanDetailsScreen.tsx
│   │   │   ├── PaymentScreen.tsx
│   │   │   └── DocumentUploadScreen.tsx
│   │   └── approver/
│   │       ├── ApprovalQueueScreen.tsx
│   │       ├── ReviewApplicationScreen.tsx
│   │       └── SignatureScreen.tsx
│   ├── components/         # Reusable components
│   │   ├── LoanCard.tsx
│   │   ├── PaymentCard.tsx
│   │   ├── DocumentViewer.tsx
│   │   └── BiometricPrompt.tsx
│   ├── navigation/         # Navigation setup
│   │   ├── RootNavigator.tsx
│   │   ├── ClientNavigator.tsx
│   │   └── ApproverNavigator.tsx
│   ├── services/           # API services
│   │   ├── supabaseClient.ts
│   │   ├── notificationService.ts
│   │   ├── biometricService.ts
│   │   └── offlineService.ts
│   ├── hooks/              # Custom hooks
│   │   ├── useLoans.ts
│   │   ├── usePayments.ts
│   │   ├── useApprovals.ts
│   │   └── useBiometric.ts
│   ├── store/              # Zustand stores
│   │   ├── authStore.ts
│   │   └── offlineStore.ts
│   ├── utils/              # Utilities
│   │   ├── currency.ts
│   │   ├── dateFormat.ts
│   │   └── validation.ts
│   └── types/              # TypeScript types
│       └── index.ts
└── assets/                 # Images, fonts, etc.
```

---

## Installation Steps

### 1. Prerequisites

```bash
# Install Node.js 18+ and npm
node --version  # Should be 18+
npm --version

# Install Expo CLI globally
npm install -g expo-cli

# Install EAS CLI for builds
npm install -g eas-cli
```

### 2. Create Project

```bash
# Navigate to project root
cd /Users/anthony/Documents/DevWork/namlend-trust-main-3

# Create mobile app directory
mkdir namlend-mobile
cd namlend-mobile

# Initialize Expo project with TypeScript
npx create-expo-app@latest . --template expo-template-blank-typescript

# Install dependencies
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
npm install @supabase/supabase-js @react-native-async-storage/async-storage
npm install @tanstack/react-query zustand
npm install react-native-paper react-native-vector-icons
npm install expo-local-authentication expo-camera expo-image-picker
npm install expo-notifications expo-device
npm install react-native-reanimated react-native-gesture-handler
```

### 3. Configure Supabase

Create `src/services/supabaseClient.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://puahejtaskncpazjyxqp.supabase.co';
const supabaseAnonKey = 'YOUR_ANON_KEY'; // Get from Supabase dashboard

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### 4. Configure Push Notifications

Update `app.json`:

```json
{
  "expo": {
    "name": "NamLend",
    "slug": "namlend",
    "version": "2.4.2",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.namlend.app",
      "infoPlist": {
        "NSFaceIDUsageDescription": "We use Face ID to securely authenticate you.",
        "NSCameraUsageDescription": "We need camera access to upload documents."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.namlend.app",
      "permissions": [
        "USE_BIOMETRIC",
        "USE_FINGERPRINT",
        "CAMERA"
      ]
    },
    "plugins": [
      "expo-local-authentication",
      "expo-camera",
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff"
        }
      ]
    ]
  }
}
```

---

## Development Workflow

### Run Development Server

```bash
# Start Expo development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on physical device (scan QR code with Expo Go app)
```

### Build for Production

```bash
# Configure EAS
eas login
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to app stores
eas submit --platform ios
eas submit --platform android
```

---

## Key Features Implementation

### 1. Biometric Authentication

```typescript
import * as LocalAuthentication from 'expo-local-authentication';

const authenticateWithBiometric = async () => {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  
  if (hasHardware && isEnrolled) {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access NamLend',
      fallbackLabel: 'Use passcode',
    });
    return result.success;
  }
  return false;
};
```

### 2. Push Notifications

```typescript
import * as Notifications from 'expo-notifications';

// Request permissions
const { status } = await Notifications.requestPermissionsAsync();

// Get push token
const token = (await Notifications.getExpoPushTokenAsync()).data;

// Save token to Supabase
await supabase.from('user_push_tokens').insert({ user_id, token });

// Listen for notifications
Notifications.addNotificationReceivedListener(notification => {
  console.log('Notification received:', notification);
});
```

### 3. Offline Support

```typescript
import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      cacheTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
});
```

### 4. Document Upload

```typescript
import * as ImagePicker from 'expo-image-picker';

const uploadDocument = async () => {
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });
  
  if (!result.canceled) {
    const file = result.assets[0];
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(`${userId}/${Date.now()}.jpg`, file);
  }
};
```

---

## Security Considerations

1. **API Keys:** Store in environment variables, never commit
2. **Biometric Auth:** Required for sensitive operations (approvals, payments)
3. **Certificate Pinning:** Implement for production
4. **Secure Storage:** Use Expo SecureStore for sensitive data
5. **Session Management:** Auto-logout after 15 minutes of inactivity
6. **Data Encryption:** Encrypt cached data with AsyncStorage encryption

---

## Testing

### Unit Tests
```bash
npm install --save-dev jest @testing-library/react-native
npm test
```

### E2E Tests
```bash
npm install --save-dev detox
detox test
```

---

## Deployment Checklist

- [ ] Configure app.json with correct bundle identifiers
- [ ] Set up Supabase environment variables
- [ ] Configure push notification credentials
- [ ] Test biometric authentication on physical devices
- [ ] Test offline mode functionality
- [ ] Optimize bundle size (< 50MB)
- [ ] Test on iOS 14+ and Android 10+
- [ ] Submit to Apple App Store
- [ ] Submit to Google Play Store
- [ ] Set up crash reporting (Sentry)
- [ ] Configure analytics (Firebase/Amplitude)

---

## Troubleshooting

### Common Issues

**Issue:** Biometric auth not working
**Solution:** Ensure device has biometric hardware enrolled

**Issue:** Push notifications not received
**Solution:** Check notification permissions and Expo push token

**Issue:** Offline mode not persisting
**Solution:** Verify AsyncStorage permissions

**Issue:** Camera not working
**Solution:** Check camera permissions in app.json

---

## Support

- **Documentation:** `/docs/MOBILE_APP_SETUP.md`
- **API Docs:** Supabase dashboard
- **Expo Docs:** https://docs.expo.dev
- **React Native Docs:** https://reactnative.dev

---

## Next Steps

1. Complete client features (loans, payments, documents)
2. Build approver features (review queue, approve/reject)
3. Implement push notifications
4. Add biometric authentication
5. Test offline mode
6. Submit to app stores
