# NamLend Trust - Design System Specification

**Doc Revision**: 2026-04-28  
**Status**: Implemented with Tailwind + CSS variables. Google Fonts are loaded in `index.html` (Inter, Playfair Display, Space Grotesk).

**Version**: 2.3.0  
**Last Updated**: 2026-04-28  
**Theme**: Neo-Fintech / "The Black Card Aesthetic"  
**Status**: ✅ Implemented with Full Dark Mode Support

---

## 1. Design Philosophy

The new NamLend Trust interface adopts a **"Neo-Fintech"** aesthetic, drawing inspiration from modern digital banking leaders like Revolut, Monzo, and Mercury. The design language communicates:

- **Sophistication**: High-contrast monochrome base for a premium feel.
- **Trust**: Clean typography and precise alignment.
- **Modernity**: Subtle glassmorphism, fluid gradients, and soft shadows.
- **Focus**: Content-first layouts with minimized chrome.

---

## 2. Color Palette

The palette shifts from traditional corporate blues to a sophisticated **Zinc & Black** theme with **Electric Blue** accents.

### Primary Base (Zinc/Black)

Used for backgrounds, text, and structural elements.

| Name         | Tailwind Class | Hex Code  | Usage                          |
| ------------ | -------------- | --------- | ------------------------------ |
| **Obsidian** | `bg-zinc-950`  | `#09090b` | Main background, Sidebar       |
| **Charcoal** | `bg-zinc-900`  | `#18181b` | Card backgrounds (Dark mode)   |
| **Graphite** | `bg-zinc-800`  | `#27272a` | Secondary backgrounds, Borders |
| **Smoke**    | `bg-zinc-100`  | `#f4f4f5` | Light mode background          |
| **White**    | `bg-white`     | `#ffffff` | Card backgrounds (Light mode)  |

### Accent (Electric Blue)

Used sparingly for primary actions, active states, and data visualization.

| Name              | Tailwind Class   | Hex Code               | Usage                           |
| ----------------- | ---------------- | ---------------------- | ------------------------------- |
| **Electric Blue** | `bg-blue-600`    | `#2563eb`              | Primary buttons, active states  |
| **Vivid Blue**    | `bg-blue-500`    | `#3b82f6`              | Hovers, gradients               |
| **Soft Blue**     | `bg-blue-500/10` | `rgba(59,130,246,0.1)` | Active list items, ghost hovers |

### Functional Colors

| Role        | Class              | Usage                              |
| ----------- | ------------------ | ---------------------------------- |
| **Success** | `text-emerald-500` | Positive trends, completed items   |
| **Warning** | `text-amber-500`   | Pending actions, alerts            |
| **Error**   | `text-rose-500`    | Validation errors, negative trends |
| **Muted**   | `text-zinc-400`    | Secondary text, labels             |

---

## 3. Typography

**Font Family**: `Inter` (loaded via Google Fonts) - optimized for UI readability.

### Scales & Weights

Heavier weights and tighter tracking create a bold, confident look.

| Role        | Size | Weight         | Tracking        | Class                                   |
| ----------- | ---- | -------------- | --------------- | --------------------------------------- |
| **Display** | 32px | Bold (700)     | Tight (-0.02em) | `text-3xl font-bold tracking-tight`     |
| **H1**      | 24px | SemiBold (600) | Tight (-0.01em) | `text-2xl font-semibold tracking-tight` |
| **H2**      | 18px | SemiBold (600) | Normal          | `text-lg font-semibold`                 |
| **Body**    | 14px | Regular (400)  | Normal          | `text-sm`                               |
| **Label**   | 12px | Medium (500)   | Wide (0.02em)   | `text-xs font-medium tracking-wide`     |

---

## 4. Core Components

### Sidebar Navigation

Expanded width for better hierarchy and touch targets.

- **Width**: `w-72` (288px)
- **Background**: `bg-zinc-950` (Dark theme default)
- **Item State (Idle)**: `text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100`
- **Item State (Active)**: `bg-blue-600/10 text-blue-500 border-r-2 border-blue-500`
- **Styling**: Clean ghost buttons, rounded-lg, distinct section headers.

### Cards & Containers

Moving away from sharp edges to organic, friendly shapes.

- **Border Radius**: `rounded-3xl` (24px) for main containers, `rounded-2xl` for inner cards.
- **Shadow**: `shadow-soft` (custom diffuse shadow).
- **Interaction**: Hover lift effect (`hover:-translate-y-1 hover:shadow-lg transition-all`).
- **Dark Mode**: `bg-zinc-900 border border-zinc-800`.

### Buttons

- **Primary**: `bg-blue-600 text-white rounded-xl font-medium shadow-lg shadow-blue-600/20 hover:bg-blue-500 active:scale-95 transition-all`.
- **Secondary**: `bg-zinc-100 text-zinc-900 rounded-xl hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100`.
- **Ghost**: `text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/50 rounded-lg`.

### Input Fields

Simplified visuals with focus on content.

- **Style**: `bg-zinc-50/50 border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`.
- **Range Inputs**: Custom styled track with gradient fill.
- **Labels**: Floating or subtle top-aligned labels in `text-xs font-medium text-zinc-500`.

---

## 5. Feature-Specific Designs

### Authentication (Split Screen) ✅ Implemented

- **Layout**: 50/50 Split on desktop, full-width form on mobile.
- **Left Side (Brand Panel)**:
  - Deep black background (`bg-black`)
  - Abstract glowing orbs using `blur-[120px]` with Electric Blue and Indigo gradients
  - Shield icon with "Financial freedom starts here" typography
  - Hidden on mobile (`hidden md:flex`)
- **Right Side (Form Panel)**:
  - Clean white background with centered form container
  - Rounded inputs with icons (`Mail`, `Lock`, `User`, `Phone`, `FileText`)
  - Solid black primary buttons (`bg-black rounded-xl`)
  - Seamless state-based switching between Login, Signup, and Forgot Password views
- **Effects**: Subtle background blurs (`blur-[120px]`) creating ambient glow effect.
- **File**: `src/pages/Auth.tsx`

### Loan Application Form ("The Receipt")

- **Concept**: As users fill the form, a "live receipt" updates on the side.
- **Preview Card**:
  - "Glossy" dark appearance (`bg-zinc-900` with subtle gradient).
  - Monospaced font for numbers.
  - Dotted line dividers.
  - Real-time calculation updates.

### Charts & Analytics

- **Library**: CSS-only bar charts (Recharts optional).
- **Style**: Minimalist with hover interactions.
- **Bars**: Gradient fills (`bg-gradient-to-t from-blue-500/20`) with hover state (`group-hover:bg-blue-200`).
- **Tooltips**: Dark, rounded custom tooltips (`bg-zinc-900 text-xs text-white rounded-lg`) appearing on hover.
- **Axes**: Month labels in `text-xs text-zinc-400`.

---

## 6. Tailwind Configuration Updates

Required updates to `tailwind.config.js` to support this system:

```javascript
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        '3xl': '1.5rem', // 24px
        '4xl': '2rem',   // 32px
      },
      colors: {
        zinc: { ... }, // Ensure full zinc palette
      },
      boxShadow: {
        'soft': '0 8px 30px rgba(0,0,0,0.04)',
        'glow': '0 0 20px rgba(37, 99, 235, 0.15)',
      }
    }
  }
}
```

---

## 7. Adaptive Layout System ✅ Implemented

### Mobile-First Architecture

The application uses shared viewport size classes from `useAdaptiveLayout()` instead of device detection:

| Class      | Width Range | Shell Behavior                                      |
| ---------- | ----------- | --------------------------------------------------- |
| `compact`  | `< 640px`   | Drawer navigation, client bottom nav, stacked cards |
| `medium`   | `640-1023`  | Icon rail plus content                              |
| `expanded` | `1024-1439` | Permanent sidebar and dense grids                   |
| `wide`     | `>= 1440`   | Permanent sidebar with constrained content width    |

The hook also exposes `isCompactHeight`, `isTouch`, and `canHover` so touch-first screens never depend on hover-only affordances.

### Dashboard Layout

- **Phone**: Compact header, drawer navigation, safe-area padding, and bottom navigation for core client flows.
- **Tablet**: Icon rail plus scrollable content.
- **Desktop**: Permanent grouped sidebar plus dense content, grids, and inline action bars.
- **Shell sizing**: Uses `dvh`-safe helpers instead of fixed `h-screen` assumptions.

### Key Components

#### ThemedSidebar (`src/components/Layout/ThemedSidebar.tsx`)

- **Drawer Width**: `w-[min(20rem,calc(100vw-0.75rem))]` to prevent phone overflow
- **Z-index**: `z-[70]` — above all page content
- **Background**: Theme-aware (glass: `bg-white/10 backdrop-blur-xl`, lux: `bg-[#080808]`, neo: `bg-zinc-900`/`bg-white`)
- **Compact Behavior**: Slide-in drawer with backdrop blur overlay and hamburger toggle
- **Medium Behavior**: Icon rail
- **Desktop Behavior**: Permanent sidebar
- **Navigation Items**: Icon + label with active state indicator and 3D tilt effect on hover
- **User Profile Section**: Bottom-aligned with name, email, role badge, and sign-out button
- **Variants**: `client` (dashboard tabs) | `admin` (direct route links)

See [ARCHITECTURE.md](./ARCHITECTURE.md#layouts) for routing integration. See [UI_DESIGN.md](./UI_DESIGN.md#sidebar-navigation) for theme-specific styling details.

#### StatCard (`src/components/StatCard.tsx`)

- **Purpose**: Display key metrics (Balance, Credit Score, Next Payment)
- **Variants**: `black`, `green`, `blue`, `amber`, `red`
- **Structure**: Label, value, optional subValue, icon with colored background

#### Adaptive Primitives

| Component             | File                                              | Purpose                                                          |
| --------------------- | ------------------------------------------------- | ---------------------------------------------------------------- |
| `AdaptiveShell`       | `src/components/adaptive/AdaptiveShell.tsx`       | Switches drawer, rail, sidebar, and bottom nav                   |
| `AdaptiveTabs`        | `src/components/adaptive/AdaptiveTabs.tsx`        | Scrollable compact tabs, grid desktop tabs                       |
| `ResponsiveActionBar` | `src/components/adaptive/ResponsiveActionBar.tsx` | Stacked compact headers/actions, inline desktop actions          |
| `AdaptiveDialog`      | `src/components/adaptive/AdaptiveDialog.tsx`      | Drawer on compact screens, dialog on wider screens               |
| `AdaptiveCollection`  | `src/components/adaptive/AdaptiveCollection.tsx`  | Card collections on compact screens with optional wide rendering |

### Responsive Patterns Used

```css
/* Grid stacking */
grid-cols-1 md:grid-cols-2 lg:grid-cols-3

/* Shell sizing */
min-h-dvh h-dvh             /* Mobile browser chrome safe */

/* Safe area padding */
pb-safe pt-safe             /* Notch/home-indicator safe */

/* Dense tabs */
overflow-x-auto md:grid     /* Scroll on phone, grid on desktop */
```

See [ADAPTIVE_UI.md](./ADAPTIVE_UI.md) for the full viewport contract, affected screens, and Playwright matrix.

---

## 8. Component Files Reference

| Component         | File                                        | Purpose                        |
| ----------------- | ------------------------------------------- | ------------------------------ |
| **Auth Page**     | `src/pages/Auth.tsx`                        | Split-screen authentication    |
| **Dashboard**     | `src/pages/Dashboard.tsx`                   | Client dashboard with sidebar  |
| **AdaptiveShell** | `src/components/adaptive/AdaptiveShell.tsx` | Adaptive app shell             |
| **AdaptiveTabs**  | `src/components/adaptive/AdaptiveTabs.tsx`  | Responsive tab lists           |
| **ThemedSidebar** | `src/components/Layout/ThemedSidebar.tsx`   | Drawer/rail/sidebar navigation |
| **StatCard**      | `src/components/StatCard.tsx`               | Metric display cards           |
| **Card**          | `src/components/ui/card.tsx`                | Base card with rounded-3xl     |
| **Button**        | `src/components/ui/button.tsx`              | Styled buttons                 |
| **Input**         | `src/components/ui/input.tsx`               | Form inputs                    |

---

## 9. Dark Mode Implementation ✅ Implemented

### Theme Provider Architecture

The application uses a robust theme system with automatic system preference detection:

- **ThemeProvider** (`src/components/ThemeProvider.tsx`) - Context-based theme management
- **ModeToggle** (`src/components/ModeToggle.tsx`) - User-facing theme switcher
- **Storage**: Theme preference persisted in localStorage

### Semantic Color Tokens

All components use semantic color tokens that automatically adapt to the current theme:

| Token                   | Light Mode | Dark Mode            | Usage              |
| ----------------------- | ---------- | -------------------- | ------------------ |
| `bg-background`         | `#ffffff`  | `#09090b` (zinc-950) | Page backgrounds   |
| `bg-card`               | `#ffffff`  | `#18181b` (zinc-900) | Card backgrounds   |
| `bg-muted`              | `#f4f4f5`  | `#27272a` (zinc-800) | Subtle backgrounds |
| `text-foreground`       | `#09090b`  | `#fafafa`            | Primary text       |
| `text-muted-foreground` | `#71717a`  | `#a1a1aa`            | Secondary text     |
| `border-border`         | `#e4e4e7`  | `#27272a`            | Borders            |

### Status Badge Patterns

Colored badges use explicit dark mode variants for proper contrast:

```tsx
// Success badge
'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';

// Warning badge
'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';

// Error badge
'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400';

// Info badge
'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400';
```

### Components Refactored for Dark Mode

| Category   | Components                                                                    |
| ---------- | ----------------------------------------------------------------------------- |
| **Core**   | Dashboard, Auth, NotFound, ErrorBoundary                                      |
| **Client** | SelfServicePortal, ClientProfileDashboard, LoanStatusTimeline                 |
| **Admin**  | All Payment Management, User Management, Analytics, Reconciliation components |
| **Modals** | All dialog components use `bg-background` and `border-border`                 |

### Best Practices

1. **Never use hardcoded grays** - Use `text-muted-foreground`, `bg-muted`, `bg-muted/50`
2. **Colored elements need dark variants** - Always pair `bg-red-100` with `dark:bg-red-900/30`
3. **Use semantic tokens** - `bg-background`, `bg-card`, `text-foreground` adapt automatically
4. **Test both modes** - Use the ModeToggle in the header to verify contrast

---

_Design System Version: 2.3.0_
