# Theme System - NamLend Mobile v2.7.1

## Overview

The NamLend mobile app now supports **Light Mode** (default) and **Dark Mode** with a user-controlled toggle.

---

## Quick Start

### Using Theme in Components

```typescript
import { useTheme } from '../../theme';

const MyComponent = () => {
  const { colors, tokens, mode, toggleTheme } = useTheme();
  
  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.textPrimary }}>
        Current mode: {mode}
      </Text>
    </View>
  );
};
```

### Theme Toggle Component

```typescript
import { ThemeToggle } from '../../components/ui';

// In your screen
<ThemeToggle />
```

---

## Color Palettes

### Light Mode (Default)

```typescript
{
  // Backgrounds
  background: '#FFFFFF',      // Pure white
  surface: '#F8F9FA',         // Light gray cards
  surfaceAlt: '#F1F3F5',      // Elevated surfaces
  
  // Text
  textPrimary: '#1F2937',     // Dark gray (main text)
  textSecondary: '#6B7280',   // Medium gray (labels)
  textTertiary: '#9CA3AF',    // Light gray (hints)
  
  // Semantic Colors
  primary: '#2563EB',         // Blue (actions)
  success: '#10B981',         // Green (success states)
  warning: '#F59E0B',         // Amber (warnings)
  error: '#EF4444',           // Red (errors)
  
  // UI Elements
  divider: '#E5E7EB',         // Light borders
  overlay: 'rgba(0, 0, 0, 0.5)', // Modal overlays
}
```

### Dark Mode

```typescript
{
  // Backgrounds
  background: '#1C1C1E',      // Near black
  surface: '#2C2C2E',         // Dark gray cards
  surfaceAlt: '#3A3A3C',      // Elevated surfaces
  
  // Text
  textPrimary: '#FFFFFF',     // White (main text)
  textSecondary: '#AEAEB2',   // Light gray (labels)
  textTertiary: '#8E8E93',    // Medium gray (hints)
  
  // Semantic Colors
  primary: '#007AFF',         // iOS blue
  success: '#34C759',         // iOS green
  warning: '#FF9500',         // iOS orange
  error: '#FF3B30',           // iOS red
  
  // UI Elements
  divider: '#38383A',         // Dark borders
  overlay: 'rgba(0, 0, 0, 0.4)', // Modal overlays
}
```

---

## Theme Context API

### Available Properties

```typescript
interface ThemeContextValue {
  mode: 'light' | 'dark';           // Current theme mode
  colors: ThemeColors;              // Current color palette
  toggleTheme: () => void;          // Toggle between modes
  setTheme: (mode: ThemeMode) => void; // Set specific mode
  tokens: typeof tokens;            // All design tokens
}
```

### Usage Examples

#### Get Current Mode
```typescript
const { mode } = useTheme();
console.log(mode); // 'light' or 'dark'
```

#### Toggle Theme
```typescript
const { toggleTheme } = useTheme();

<TouchableOpacity onPress={toggleTheme}>
  <Text>Switch Theme</Text>
</TouchableOpacity>
```

#### Set Specific Mode
```typescript
const { setTheme } = useTheme();

<TouchableOpacity onPress={() => setTheme('dark')}>
  <Text>Use Dark Mode</Text>
</TouchableOpacity>
```

---

## Component Styling Patterns

### Basic Component
```typescript
const MyComponent = () => {
  const { colors, tokens } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, {
        color: colors.textPrimary,
        fontSize: tokens.typography.h1.fontSize,
      }]}>
        Title
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontWeight: '600',
  },
});
```

### Card Component
```typescript
<View style={[{
  backgroundColor: colors.surface,
  borderRadius: tokens.radius.md,
  padding: tokens.spacing.base,
  ...tokens.shadows.card,
}]}>
  <Text style={{ color: colors.textPrimary }}>
    Card Content
  </Text>
</View>
```

### Button Component
```typescript
<TouchableOpacity
  style={[{
    backgroundColor: colors.primary,
    borderRadius: tokens.radius.sm,
    padding: tokens.spacing.md,
  }]}
  onPress={handlePress}
>
  <Text style={{ color: '#FFFFFF' }}>
    Button Text
  </Text>
</TouchableOpacity>
```

---

## Theme Persistence

The theme preference is automatically saved to AsyncStorage and persists across app restarts.

**Storage Key**: `@namlend_theme_mode`

### How It Works

1. User selects theme (light/dark)
2. Theme is saved to AsyncStorage
3. On app restart, saved preference is loaded
4. If no preference exists, defaults to light mode

---

## ThemeToggle Component

### Props
```typescript
interface ThemeToggleProps {
  style?: object;  // Optional custom styles
}
```

### Usage
```typescript
import { ThemeToggle } from '../../components/ui';

// Basic usage
<ThemeToggle />

// With custom styles
<ThemeToggle style={{ marginTop: 20 }} />
```

### Features
- Shows current mode (Light/Dark)
- Sun icon for light mode (amber color)
- Moon icon for dark mode (blue color)
- Smooth toggle animation
- Rounded pill shape
- Adapts to current theme colors

---

## Migration Guide

### Updating Existing Components

**Before:**
```typescript
<View style={{ backgroundColor: '#FFFFFF' }}>
  <Text style={{ color: '#000000' }}>Text</Text>
</View>
```

**After:**
```typescript
const { colors } = useTheme();

<View style={{ backgroundColor: colors.background }}>
  <Text style={{ color: colors.textPrimary }}>Text</Text>
</View>
```

### Common Replacements

| Old (Hardcoded) | New (Theme-aware) |
|----------------|-------------------|
| `#FFFFFF` | `colors.background` |
| `#F9FAFB` | `colors.surface` |
| `#000000` | `colors.textPrimary` |
| `#6B7280` | `colors.textSecondary` |
| `#2563EB` | `colors.primary` |
| `#10B981` | `colors.success` |
| `#EF4444` | `colors.error` |

---

## Best Practices

### ✅ Do

- Use `colors` from `useTheme()` for all color values
- Use `tokens` for spacing, typography, shadows
- Test components in both light and dark modes
- Use semantic color names (primary, success, error)
- Provide sufficient contrast for text

### ❌ Don't

- Hardcode color values
- Use `#000000` or `#FFFFFF` directly
- Assume a specific theme mode
- Use colors that don't adapt to theme
- Forget to test in both modes

---

## Testing Checklist

When implementing theme support:

- [ ] Component renders in light mode
- [ ] Component renders in dark mode
- [ ] Text is readable in both modes
- [ ] Colors adapt correctly when toggling
- [ ] No hardcoded colors remain
- [ ] Proper contrast ratios maintained
- [ ] Icons/images visible in both modes
- [ ] Borders/dividers visible in both modes

---

## Current Implementation Status

### ✅ Fully Themed Screens
1. **Dashboard Screen** - Light/Dark support
2. **Profile Screen** - Light/Dark support + ThemeToggle
3. **Loan Calculator Screen** - Light/Dark support

### 🚧 Needs Theme Support
1. LoanApplicationFormScreen
2. PaymentScreenEnhanced
3. DocumentUploadScreenEnhanced
4. LoansListScreen
5. LoanDetailsScreen
6. ProfileEditScreen

---

## Design Tokens Reference

### Typography
```typescript
tokens.typography.display    // 36px, bold
tokens.typography.h1         // 24px, semibold
tokens.typography.h2         // 20px, semibold
tokens.typography.body       // 16px, regular
tokens.typography.caption    // 13px, regular
```

### Spacing
```typescript
tokens.spacing.xs    // 4px
tokens.spacing.sm    // 8px
tokens.spacing.md    // 12px
tokens.spacing.base  // 16px
tokens.spacing.lg    // 20px
tokens.spacing.xl    // 32px
```

### Border Radius
```typescript
tokens.radius.sm     // 8px
tokens.radius.md     // 12px
tokens.radius.lg     // 16px
tokens.radius.round  // 9999px (fully rounded)
```

### Shadows
```typescript
tokens.shadows.card      // Subtle card shadow
tokens.shadows.elevated  // Elevated element shadow
```

---

## Examples from Codebase

### Dashboard Screen
```typescript
// Uses theme for background, text, and cards
const { colors, tokens } = useTheme();

<ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
  <Text style={[styles.greeting, { 
    color: colors.textPrimary,
    fontSize: tokens.typography.h1.fontSize,
  }]}>
    Hi, let's work together!
  </Text>
</ScrollView>
```

### Profile Screen
```typescript
// Includes ThemeToggle component
<ThemeToggle />

<MenuItem
  icon={FileText}
  label="My Documents"
  subtitle="Upload and manage KYC documents"
  onPress={() => navigation.navigate('DocumentsTab')}
/>
```

---

## Troubleshooting

### Theme not persisting
- Check AsyncStorage permissions
- Verify `THEME_STORAGE_KEY` is correct
- Check for errors in console

### Colors not updating
- Ensure using `colors` from `useTheme()`
- Check if component is wrapped in `ThemeProvider`
- Verify no hardcoded colors

### Toggle not working
- Check `ThemeProvider` is at app root
- Verify `toggleTheme` is called correctly
- Check for JavaScript errors

---

## Future Enhancements

### Planned Features
- [ ] System theme detection (auto light/dark based on device)
- [ ] Custom theme colors
- [ ] High contrast mode
- [ ] Theme preview before applying
- [ ] Scheduled theme switching (day/night)

### Accessibility
- [ ] Ensure WCAG AA contrast ratios
- [ ] Support for reduced motion
- [ ] Screen reader announcements for theme changes
- [ ] Larger text support

---

Last Updated: October 15, 2025 - v2.7.1
