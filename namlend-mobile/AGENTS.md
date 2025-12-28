# Mobile App Agent Instructions

## Project Context
- **Platform**: NamLend Trust Mobile - React Native Loan Management App
- **Stack**: React Native + Expo SDK + TypeScript
- **Styling**: NativeWind v4 (TailwindCSS for React Native)
- **Navigation**: React Navigation v6
- **Backend**: Supabase (same as web platform)
- **Design**: Stealth Cobalt Neo-Fintech theme

## Design System

### Theme & Aesthetics
- **Core Palette**: Zinc Scale (950/900/800) + Electric Cobalt (#2563eb)
- **Background**: `bg-zinc-950` (primary dark background)
- **Accent**: `bg-blue-600` / `bg-blue-500` (Electric Cobalt)
- **Design Language**: "Black Card" aesthetic with glassmorphism
- **Typography**: Inter font family

### Component Library (Neo Components)
**ALWAYS use these custom components** instead of React Native primitives:
- `NeoButton` - Pill-shaped buttons with ambient glows
- `NeoCard` - Cards with precision borders and optional glass variant
- `NeoInput` - Themed input fields
- `NeoBalanceCard` - Display balance information
- `NeoCurrencyCard` - Currency display with formatting
- `NeoTransactionItem` - Transaction list items
- `AmbientGlow` - Decorative glow effects

### Styling Patterns
```typescript
// ✅ CORRECT - Use NativeWind classes
<View className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">

// ❌ WRONG - Don't use inline styles
<View style={{ backgroundColor: '#000', padding: 16 }}>

// ✅ CORRECT - Use Neo components
<NeoButton variant="primary" onPress={handlePress}>Submit</NeoButton>

// ❌ WRONG - Don't use basic TouchableOpacity
<TouchableOpacity style={styles.button}>
```

## Architecture Principles

### Offline-First Design
- All critical operations must work offline
- Use `offlineProcessor.ts` for queued operations
- Sync when connection restored
- Show clear offline indicators to users

### Navigation Structure
- **AuthStack**: Login, BiometricSetup
- **ClientStack**: Dashboard, LoansList, LoanDetails, Payment, Documents, Profile
- **ApproverStack**: Dashboard, Queue, Review, Profile
- **AppNavigator**: Root navigator with auth state management

### State Management
- **Auth**: React Context (`AuthContext`)
- **Server State**: TanStack Query (same patterns as web)
- **Local State**: React hooks
- **Offline Queue**: Custom offline processor

### Security
- Biometric authentication (Face ID / Touch ID)
- Secure token storage
- Same RLS policies as web platform
- Never store sensitive data unencrypted

## Common Tasks

### Creating a New Screen
1. Create screen component in appropriate stack folder
2. Use Neo components for UI
3. Add to navigation stack
4. Implement loading/error/empty states
5. Test on both iOS and Android
6. Handle offline scenarios
7. Add `testID` props for E2E tests (Detox)

### Adding a Form
1. Use `NeoInput` components
2. Implement validation with Zod
3. Handle keyboard dismissal
4. Add loading states during submission
5. Queue operation if offline
6. Show success/error feedback

### Styling a Component
1. Use NativeWind v4 classes
2. Follow Zinc/Cobalt color scheme
3. Test in both light and dark (if applicable)
4. Ensure touch targets are 44x44 minimum
5. Use Neo components where possible
6. Add ambient glows for premium feel

## File Organization
- `/src/screens/` - Screen components organized by stack
  - `/client/` - Client-facing screens
  - `/approver/` - Loan approver screens
  - `/auth/` - Authentication screens
- `/src/components/` - Reusable components (Neo components)
- `/src/navigation/` - Navigation configuration
- `/src/services/` - API services (shared with web)
- `/src/utils/` - Utilities (currency, offline processor, etc.)
- `/src/contexts/` - React contexts (Auth, Theme)
- `/src/types/` - TypeScript types

## Platform-Specific Considerations

### iOS
- Use SafeAreaView for notch/island handling
- Test Face ID authentication flow
- Verify haptic feedback works
- Check keyboard behavior

### Android
- Test back button behavior
- Verify biometric (fingerprint) flow
- Check status bar styling
- Test on different screen sizes

## Testing

### Unit Tests (Jest)
- Test utilities and services
- Mock React Native modules
- Use `jest-expo` preset

### E2E Tests (Detox)
- Add `testID` props to interactive elements
- Test critical user flows
- Test offline scenarios
- Test on both platforms

## Critical Warnings

⚠️ **NEVER**:
- Use inline styles (use NativeWind classes)
- Mix React Native primitives with Neo components
- Store sensitive data in AsyncStorage unencrypted
- Bypass offline queue for financial operations
- Use basic components when Neo alternatives exist
- Hardcode colors (use theme classes)

✅ **ALWAYS**:
- Use Neo components for consistency
- Handle offline scenarios
- Test on both iOS and Android
- Use NativeWind v4 classes
- Implement proper error handling
- Add loading states
- Use biometric auth where appropriate
- Follow "Black Card" aesthetic

## NativeWind v4 Configuration
```typescript
// babel.config.js
module.exports = {
  presets: [
    ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    'nativewind/babel',
  ],
};

// Import global.css in App.tsx
import './global.css';
```

## Questions to Ask Before Proceeding
1. Does this work offline? → Implement offline queue
2. Is this using Neo components? → Replace primitives
3. Does this follow the design system? → Check Zinc/Cobalt palette
4. Is this tested on both platforms? → Test iOS and Android
5. Are touch targets large enough? → Minimum 44x44
6. Does this handle errors gracefully? → Add error states
