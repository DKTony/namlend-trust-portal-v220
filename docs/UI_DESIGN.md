# UI Design System Documentation

**Doc Revision**: 2026-01-19  
**Status**: Active - Theme variants implemented via `src/context/ThemeContext.tsx` (default: `neo`).

> **Purpose**: This document provides a comprehensive, reproducible guide to the NamLend Trust UI design system. Use this to instruct AI assistants or developers to replicate this methodology in other applications.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Theme Architecture](#theme-architecture)
3. [Theme Context Management](#theme-context-management)
4. [Component Library](#component-library)
5. [Sidebar Navigation](#sidebar-navigation)
6. [Background & Visual Layers](#background--visual-layers)
7. [Responsive Design Strategy](#responsive-design-strategy)
8. [Animation System](#animation-system)
9. [Interactivity Patterns](#interactivity-patterns)
10. [Typography System](#typography-system)
11. [Color Palette](#color-palette)
12. [Implementation Guide](#implementation-guide)

---

## Design Philosophy

The NamLend Trust UI is built on three core principles:

1. **Theme-First Architecture**: Every component derives its styling from a centralized theme context, ensuring visual consistency and instant theme switching.

2. **Composable Components**: UI primitives (Card, Button) are minimal yet flexible, accepting theme styles dynamically while allowing override via className props.

3. **Progressive Enhancement**: The interface gracefully degrades across themes—from glassmorphism effects on modern browsers to solid fallbacks on simpler themes.

---

## Theme Architecture

### Theme Variants

The system supports **3 distinct theme variants**, each with light/dark modes.  
**Default**: `neo` (stored in `localStorage` under `namlend-theme-variant`).

| Variant | Name         | Aesthetic                              | Primary Use Case             |
| ------- | ------------ | -------------------------------------- | ---------------------------- |
| `glass` | Deep Glass   | Glassmorphism, blur, translucency      | Modern fintech, premium feel |
| `lux`   | Midnight Lux | Matte black, gold accents, serif fonts | Luxury, high-end financial   |
| `neo`   | Neo Pop      | Hard shadows, brutalist, bold borders  | Bold, playful, crypto-style  |

### ThemeConfig Interface

```typescript
interface ThemeConfig {
  name: string; // Human-readable theme name
  variant: ThemeVariant; // 'glass' | 'lux' | 'neo'
  background: string; // Page background class
  cardClass: string; // Card component styling
  textClass: string; // Typography styling
  accentClass: string; // Primary action/accent styling
  borderClass: string; // Border styling
  buttonClass: string; // Secondary button styling
  inputClass: string; // Input styling
  badgeClass: string; // Badge styling
  radius: string; // Default border radius
}
```

---

## Theme Context Management

### Core Implementation

The theme system uses React Context API with the following structure:

```typescript
// context/ThemeContext.tsx
interface ThemeContextType {
  theme: ThemeVariant; // Current theme variant
  setTheme: (theme: ThemeVariant) => void;
  isDark: boolean; // Dark mode toggle state
  toggleDarkMode: () => void;
  styles: ThemeConfig; // Computed styles object
}
```

### How Theme Selection Works

1. **State Management**: Two pieces of state control the theme:
   - `theme`: The variant (`'glass'` | `'lux'` | `'neo'`)
   - `isDark`: Boolean for light/dark mode

2. **Style Computation**: A `getThemeStyles()` function computes the full `ThemeConfig` based on both states:

   ```typescript
   const styles = getThemeStyles(theme, isDark);
   ```

3. **DOM Synchronization**: Dark mode applies a `dark` class to `<html>`:

   ```typescript
   useEffect(() => {
     if (isDark) {
       document.documentElement.classList.add('dark');
     } else {
       document.documentElement.classList.remove('dark');
     }
   }, [isDark]);
   ```

4. **Consumer Access**: Components access theme via the `useTheme()` hook:

   ```typescript
   const { styles, theme, isDark } = useTheme();
   ```

### Theme Style Definitions

#### Glass Theme

```typescript
{
  name: 'Deep Glass',
  variant: 'glass',
  background: dark ? 'bg-[#0f172a]' : 'bg-slate-100',
  cardClass: dark
    ? 'bg-slate-900/40 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] rounded-3xl'
    : 'bg-white/60 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.1)] rounded-3xl',
  textClass: dark ? 'text-slate-100 font-sans' : 'text-slate-800 font-sans',
  accentClass: 'bg-blue-600/80 backdrop-blur-md text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]',
  borderClass: dark ? 'border-white/10' : 'border-white/20',
  buttonClass: dark
    ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-white backdrop-blur-md rounded-2xl'
    : 'bg-white/40 hover:bg-white/60 border border-white/20 text-slate-900 backdrop-blur-md rounded-2xl'
}
```

#### Lux Theme

```typescript
{
  name: 'Midnight Lux',
  variant: 'lux',
  background: dark ? 'bg-[#050505]' : 'bg-[#f4f4f4]',
  cardClass: dark
    ? 'bg-[#0a0a0a] border border-amber-500/20 shadow-2xl shadow-black rounded-xl'
    : 'bg-white border border-amber-900/10 shadow-xl shadow-amber-900/5 rounded-xl',
  textClass: dark ? 'text-amber-50/90 font-serif tracking-wide' : 'text-slate-900 font-serif tracking-wide',
  accentClass: 'bg-gradient-to-r from-amber-700 to-amber-500 text-white shadow-lg shadow-amber-500/20',
  borderClass: dark ? 'border-amber-500/20' : 'border-amber-900/10',
  buttonClass: dark
    ? 'bg-[#151515] border border-amber-500/30 text-amber-50 hover:border-amber-400 transition-colors rounded-lg uppercase tracking-widest text-xs'
    : 'bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 rounded-lg uppercase tracking-widest text-xs'
}
```

#### Neo Theme

```typescript
{
  name: 'Neo Pop',
  variant: 'neo',
  background: dark ? 'bg-zinc-900' : 'bg-[#f0f0f0]',
  cardClass: dark
    ? 'bg-zinc-800 border-2 border-white shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] rounded-md'
    : 'bg-white border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-md',
  textClass: dark ? 'text-white font-mono' : 'text-black font-mono',
  accentClass: dark
    ? 'bg-[#8b5cf6] border-2 border-white text-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-all'
    : 'bg-[#8b5cf6] border-2 border-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all',
  borderClass: dark ? 'border-zinc-700' : 'border-black',
  buttonClass: dark
    ? 'bg-zinc-700 border-2 border-white text-white hover:bg-zinc-600 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-all rounded-md'
    : 'bg-[#bef264] border-2 border-black text-black hover:bg-[#a3e635] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all rounded-md'
}
```

---

## Component Library

### Card Component

The `Card` is the foundational container component. It automatically adapts to the current theme.

**Key Features:**

- Receives `cardClass` and `textClass` from theme
- Adds theme-specific visual enhancements (shine, noise, glow)
- Supports hover effects that respect theme physics

```typescript
interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean; // Enable/disable hover animations
  style?: React.CSSProperties;
}
```

**Theme-Specific Enhancements:**

```tsx
// Glass Theme: Reflection & Noise
{
  styles.variant === 'glass' && (
    <>
      {/* Top edge highlight */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-70" />

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{ backgroundImage: `url("data:image/svg+xml,...")` }}
      />

      {/* Hover shine effect */}
      <div className="absolute -inset-full h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-0 group-hover:animate-shine" />
    </>
  );
}

// Lux Theme: Gold glow on hover
{
  styles.variant === 'lux' && (
    <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-amber-500/0 via-amber-500/40 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
  );
}
```

**Hover Behavior by Theme:**

- **Glass**: Subtle lift (`-translate-y-1`) + shadow expansion
- **Lux**: Gold border glow
- **Neo**: Press-down effect (`translate-x-[2px] translate-y-[2px]`) + shadow shrink

### Button Component

The `Button` supports three variants with theme-aware styling:

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: React.ReactNode;
}
```

**Variant Mapping:**

```typescript
if (variant === 'primary') {
  variantClass = styles.accentClass; // Bold, high-contrast
} else if (variant === 'secondary') {
  variantClass = styles.buttonClass; // Subdued, bordered
} else {
  variantClass = `bg-transparent hover:bg-white/5 ${styles.textClass}`; // Ghost
}
```

**Interactive Physics:**

```typescript
// Neo theme: Physics handled in theme classes (translate on hover/active)
// Other themes: Scale + brightness change
const interactiveClass =
  theme === 'neo' ? '' : 'active:scale-95 shadow-lg hover:shadow-xl hover:brightness-110';
```

**Border Radius by Theme:**

```typescript
${theme === 'glass' ? 'rounded-2xl' : theme === 'lux' ? 'rounded-lg' : 'rounded-md'}
```

### HeroCard Component

A decorative credit card visualization that adapts to themes:

```typescript
const cardGradient =
  theme === 'lux'
    ? 'bg-gradient-to-br from-[#1a1a1a] via-[#2a2a2a] to-black border-amber-500/30'
    : theme === 'neo'
      ? 'bg-gradient-to-br from-zinc-800 to-zinc-900 border-zinc-700'
      : 'bg-gradient-to-br from-white/20 via-white/10 to-transparent border-white/20';
```

**Features:**

- Fixed dimensions (340×220px)
- Rotated positioning (`rotate-[-15deg]`)
- Hover rotation adjustment
- Decorative blur circles
- Shine overlay effect

### CreditScoreGauge Component

An SVG-based circular progress indicator:

**Score-to-Color Mapping:**

```typescript
const getScoreColor = () => {
  if (score >= 750) return '#10b981'; // Emerald - Excellent
  if (score >= 670) return '#3b82f6'; // Blue - Good
  if (score >= 580) return '#f59e0b'; // Amber - Fair
  return '#ef4444'; // Red - Poor
};
```

**Theme-Aware Background Circle:**

```typescript
stroke={
  theme === 'glass' ? 'rgba(255,255,255,0.1)' :
  theme === 'neo' ? 'rgba(0,0,0,0.1)' :
  'rgba(212, 175, 55, 0.1)'  // Lux gold
}
```

### NotificationCenter Component

A slide-out panel with backdrop blur:

**Panel Animation:**

```typescript
className={`
  fixed top-0 right-0 h-full w-[350px] z-[90]
  transform transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1)
  ${isOpen ? 'translate-x-0' : 'translate-x-full'}
`}
```

**Notification State Styling:**

```typescript
// Unread vs Read styling
className={`
  ${notif.read
    ? 'border-transparent bg-transparent opacity-60'
    : `${styles.variant === 'glass' ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/5'}`
  }
`}
```

---

## Sidebar Navigation

Component: `src/components/Layout/ThemedSidebar.tsx`. Route integration: [ARCHITECTURE.md](./ARCHITECTURE.md#layouts).

The sidebar is a drawer-style slide-out panel (not a hover-expand dock). It overlays page content when open.

### Desktop & Mobile: Drawer Panel

**Panel Dimensions:**

- **Width**: `w-80` (320px), fixed position, full height
- **Z-index**: `z-[70]` — above all page content including sticky headers
- **Animation**: `transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]`
- **Backdrop**: Click-to-close overlay behind the panel

**Theme-Specific Container Styling:**

```typescript
// Glass theme
'rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20';
// Lux theme
'bg-[#080808] border-r border-amber-500/20';
// Neo theme (dark/light)
isDark ? 'bg-zinc-900 border-r-2 border-white' : 'bg-white border-r-2 border-black';
```

**Menu Item Interaction:**

- 3D tilt effect on hover via `onMouseMove` transform calculations
- Active state: accent-colored left border + background highlight
- Each item has `data-testid="sidebar-nav-{id}"` for E2E testing

### Mobile Toggle

- Hamburger menu button in the sticky header triggers `onOpen`
- Panel slides in from left; backdrop click or X button triggers `onClose`

### Role-Based Navigation

```typescript
// Client variant — tabs routed via handleTabChange in each page
const clientMenuItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'budget', label: 'Budget & Finance', icon: PieChart },
  { id: 'loans', label: 'My Loans', icon: CreditCard },
  { id: 'applications', label: 'Applications', icon: ClipboardList },
  // ...
];

// Admin variant — direct route links (/admin/*)
const adminMenuItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'approvals', label: 'Approvals', icon: ShieldCheck },
  // ...
];
```

See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md#themedsidebar-srccomponentslayoutthemedsidebartsx) for component specifications.

---

## Background & Visual Layers

### Layer Architecture

The app uses a **fixed, pointer-events-none** container for background effects:

```tsx
<div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
  {/* Theme-specific backgrounds */}
</div>
```

### Glass Theme Background

**Aurora Effect:**

```tsx
{
  theme === 'glass' && (
    <div className="absolute inset-0 opacity-40 dark:opacity-20">
      <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-blue-500 rounded-full blur-[120px] animate-aurora mix-blend-screen" />
      <div
        className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-purple-500 rounded-full blur-[120px] animate-aurora mix-blend-screen"
        style={{ animationDelay: '-10s' }}
      />
      <div className="absolute top-[40%] left-[40%] w-[50%] h-[50%] bg-emerald-400 rounded-full blur-[120px] animate-pulse" />
    </div>
  );
}
```

**Noise Overlay (Global):**

```html
<!-- SVG filter definition in index.html -->
<svg style="display: none;">
  <filter id="noiseFilter">
    <feTurbulence type="fractalNoise" baseFrequency="0.6" stitchTiles="stitch" />
  </filter>
</svg>

<!-- Applied via CSS -->
<div className="glass-noise" />
<!-- 5% opacity, fixed, full-screen -->
```

### Lux Theme Background

**Gold Grid Pattern + Gradient:**

```tsx
{
  theme === 'lux' && (
    <>
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: isDark
            ? 'linear-gradient(#D4AF37 1px, transparent 1px), linear-gradient(90deg, #D4AF37 1px, transparent 1px)'
            : 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* Top gradient wash */}
      <div className="absolute top-0 right-0 w-full h-[800px] bg-gradient-to-b from-amber-500/10 to-transparent" />
    </>
  );
}
```

### Neo Theme Background

**Dot Matrix Pattern:**

```tsx
{
  theme === 'neo' && (
    <div
      className="absolute inset-0 opacity-[0.1]"
      style={{
        backgroundImage: isDark
          ? 'radial-gradient(#fff 2px, transparent 2px)'
          : 'radial-gradient(#000 2px, transparent 2px)',
        backgroundSize: '24px 24px',
      }}
    />
  );
}
```

---

## Responsive Design Strategy

### Breakpoint System

Uses Tailwind's default breakpoints:

- `sm`: 640px
- `md`: 768px (primary mobile/desktop breakpoint)
- `lg`: 1024px
- `xl`: 1280px

### Layout Patterns

**Main Content Area:**

```tsx
<main className="min-h-screen relative z-10 w-full md:pl-20 transition-all duration-300">
  <div className="max-w-7xl mx-auto">{/* Page content */}</div>
</main>
```

- Mobile: Full width, bottom nav accounts for padding
- Desktop: Left padding for sidebar (20 = 80px)

**Grid Responsiveness:**

```tsx
{/* Stats Grid */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

{/* Main Content Split */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
```

**Conditional Visibility:**

```tsx
{/* Desktop only */}
<div className="hidden md:flex ...">

{/* Mobile only */}
<div className="md:hidden ...">

{/* Large screens only */}
<div className="hidden lg:block ...">
```

### Spacing Adjustments

```tsx
{/* Padding varies by breakpoint */}
<div className="p-6 lg:p-10 flex flex-col gap-8 pb-24 pt-16 lg:pt-10">
```

---

## Animation System

### Tailwind Configuration

```javascript
// In index.html <script> block
tailwind.config = {
  theme: {
    extend: {
      animation: {
        float: 'float 6s ease-in-out infinite',
        aurora: 'aurora 20s linear infinite',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(-2deg)' },
          '50%': { transform: 'translateY(-15px) rotate(2deg)' },
        },
        aurora: {
          '0%': { transform: 'rotate(0deg) scale(1)' },
          '50%': { transform: 'rotate(180deg) scale(1.1)' },
          '100%': { transform: 'rotate(360deg) scale(1)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
};
```

### Usage Patterns

**Staggered Entry Animations:**

```tsx
{stats.map((stat, idx) => (
  <Card
    className="animate-fade-in-up"
    style={{ animationDelay: `${idx * 100}ms` }}
  >
```

**Floating Elements:**

```tsx
<div className="animate-float">
  <HeroCard />
</div>
```

**Interactive Transitions:**

```tsx
// Hover scale
className = 'transition-all hover:scale-105 active:scale-95';

// Smooth color transitions
className = 'transition-colors duration-300';

// Transform + opacity
className = 'transition-all duration-300 opacity-0 group-hover:opacity-100';
```

---

## Interactivity Patterns

### Hover States

**Card Hover (Theme-Aware):**

```tsx
// Glass/Lux: Lift effect
${hoverEffect && theme !== 'neo' ? 'hover:-translate-y-1 hover:shadow-2xl cursor-pointer group' : ''}

// Neo: Press effect
${hoverEffect && theme === 'neo' ? 'cursor-pointer group active:translate-x-[2px] active:translate-y-[2px] active:shadow-none' : ''}
```

**Button Hover:**

- Glass/Lux: Brightness increase + shadow expansion
- Neo: Translate + shadow shrink (simulating physical button press)

### Focus States

Form inputs have theme-aware focus:

```tsx
className={`
  outline-none transition-all
  ${styles.variant === 'glass'
    ? 'bg-white/5 border border-white/10 focus:bg-white/10'
    : 'bg-transparent border border-zinc-700 focus:border-zinc-500'}
`}
```

### Active States

```tsx
// Neo buttons have "pressed" physics
hover:translate-x-[2px] hover:translate-y-[2px]
hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]

// Standard buttons scale down
active:scale-95
```

### Group Hover Patterns

Using Tailwind's `group` class for child element reactions:

```tsx
<div className="group cursor-pointer">
  <div className="group-hover:scale-110 transition-all">{/* Icon */}</div>
  <p className="group-hover:text-blue-500 transition-colors">{/* Label */}</p>
</div>
```

---

## Typography System

### Font Families

```javascript
fontFamily: {
  sans: ['Inter', 'sans-serif'],       // Default, Glass theme
  serif: ['Playfair Display', 'serif'], // Lux theme
  mono: ['Space Grotesk', 'sans-serif'], // Neo theme
}
```

### Theme-Font Mapping

```typescript
// Glass
textClass: 'text-slate-100 font-sans';

// Lux
textClass: 'text-amber-50/90 font-serif tracking-wide';

// Neo
textClass: 'text-white font-mono';
```

### Heading Hierarchy

```tsx
// Page Title
<h2 className="text-3xl md:text-4xl font-bold tracking-tight">

// Card Title
<h3 className="text-lg font-semibold">

// Section Label
<h4 className="font-semibold">

// Metric Label
<p className="text-sm opacity-60 font-medium">
```

---

## Color Palette

### Glass Theme Colors

| Purpose    | Light             | Dark              |
| ---------- | ----------------- | ----------------- |
| Background | `bg-slate-100`    | `bg-[#0f172a]`    |
| Card       | `bg-white/60`     | `bg-slate-900/40` |
| Text       | `text-slate-800`  | `text-slate-100`  |
| Accent     | `bg-blue-600/80`  | `bg-blue-600/80`  |
| Border     | `border-white/20` | `border-white/10` |

### Lux Theme Colors

| Purpose    | Light                         | Dark                          |
| ---------- | ----------------------------- | ----------------------------- |
| Background | `bg-[#f4f4f4]`                | `bg-[#050505]`                |
| Card       | `bg-white`                    | `bg-[#0a0a0a]`                |
| Text       | `text-slate-900`              | `text-amber-50/90`            |
| Accent     | `from-amber-700 to-amber-500` | `from-amber-700 to-amber-500` |
| Border     | `border-amber-900/10`         | `border-amber-500/20`         |

### Neo Theme Colors

| Purpose    | Light          | Dark           |
| ---------- | -------------- | -------------- |
| Background | `bg-[#f0f0f0]` | `bg-zinc-900`  |
| Card       | `bg-white`     | `bg-zinc-800`  |
| Text       | `text-black`   | `text-white`   |
| Accent     | `bg-[#8b5cf6]` | `bg-[#8b5cf6]` |
| Secondary  | `bg-[#bef264]` | `bg-zinc-700`  |
| Border     | `border-black` | `border-white` |

### Semantic Colors (All Themes)

| Purpose | Color               |
| ------- | ------------------- |
| Success | `#10b981` (Emerald) |
| Warning | `#f59e0b` (Amber)   |
| Error   | `#ef4444` (Rose)    |
| Info    | `#3b82f6` (Blue)    |

---

## Implementation Guide

### Step 1: Set Up Theme Context

1. Create `context/ThemeContext.tsx`
2. Define `ThemeConfig` interface
3. Implement `getThemeStyles()` function with all variant definitions
4. Export `ThemeProvider` and `useTheme` hook

### Step 2: Wrap Application

```tsx
// App.tsx
const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};
```

### Step 3: Create Base Components

1. **Card**: Theme-aware container with hover effects
2. **Button**: Three variants (primary/secondary/ghost)
3. **Sidebar**: Responsive navigation with expand/collapse

### Step 4: Configure Tailwind

Add custom animations and font families to your Tailwind config.

### Step 5: Add Visual Layers

Create fixed background containers with theme-conditional effects.

### Step 6: Build Pages

Use the `useTheme()` hook in every component to access `styles`:

```tsx
const MyComponent = () => {
  const { styles, theme, isDark } = useTheme();

  return (
    <div className={styles.cardClass}>
      <h2 className={styles.textClass}>Hello</h2>
      <button className={styles.accentClass}>Action</button>
    </div>
  );
};
```

---

## Why This System Works

1. **Single Source of Truth**: All styling decisions flow from `ThemeContext`, eliminating style conflicts.

2. **Composition Over Inheritance**: Components accept theme styles but allow overrides via `className` prop.

3. **Semantic Class Names**: Using `accentClass`, `cardClass`, etc. makes intent clear regardless of actual CSS.

4. **Graceful Degradation**: Each theme has complete fallbacks—no broken states.

5. **Performance**: Theme switching is instant (no CSS recompilation), just class swaps.

6. **Maintainability**: Adding a new theme = adding one object to `getThemeStyles()`.

---

## Adapting This System to Other Apps

1. **Copy the ThemeContext** as-is or modify theme variants for your brand.

2. **Reuse Card/Button** components—they're framework-agnostic patterns.

3. **Customize color palette** in theme definitions while keeping the structure.

4. **Add new variants** by following the existing pattern (define all 6 style properties).

5. **Extend with new properties** (e.g., `inputClass`, `badgeClass`) as needed.

---

## See Also

- [INDEX.md](./INDEX.md) - Documentation index
- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) - Additional design system details
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture with layout info
- [QUICK_START.md](./QUICK_START.md) - Quick reference for UI patterns

---

_Generated for NamLend Trust NextGen UI. Last updated: January 2026._
