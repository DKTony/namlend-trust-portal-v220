# NamLend Trust - Design System Specification

**Version**: 2.1.0  
**Last Updated**: December 6, 2025  
**Theme**: Neo-Fintech / "The Black Card Aesthetic"  
**Status**: ✅ Implemented

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

| Name | Tailwind Class | Hex Code | Usage |
|------|----------------|----------|-------|
| **Obsidian** | `bg-zinc-950` | `#09090b` | Main background, Sidebar |
| **Charcoal** | `bg-zinc-900` | `#18181b` | Card backgrounds (Dark mode) |
| **Graphite** | `bg-zinc-800` | `#27272a` | Secondary backgrounds, Borders |
| **Smoke** | `bg-zinc-100` | `#f4f4f5` | Light mode background |
| **White** | `bg-white` | `#ffffff` | Card backgrounds (Light mode) |

### Accent (Electric Blue)
Used sparingly for primary actions, active states, and data visualization.

| Name | Tailwind Class | Hex Code | Usage |
|------|----------------|----------|-------|
| **Electric Blue** | `bg-blue-600` | `#2563eb` | Primary buttons, active states |
| **Vivid Blue** | `bg-blue-500` | `#3b82f6` | Hovers, gradients |
| **Soft Blue** | `bg-blue-500/10` | `rgba(59,130,246,0.1)` | Active list items, ghost hovers |

### Functional Colors

| Role | Class | Usage |
|------|-------|-------|
| **Success** | `text-emerald-500` | Positive trends, completed items |
| **Warning** | `text-amber-500` | Pending actions, alerts |
| **Error** | `text-rose-500` | Validation errors, negative trends |
| **Muted** | `text-zinc-400` | Secondary text, labels |

---

## 3. Typography

**Font Family**: `Inter` (Variable) - optimized for UI readability.

### Scales & Weights
Heavier weights and tighter tracking create a bold, confident look.

| Role | Size | Weight | Tracking | Class |
|------|------|--------|----------|-------|
| **Display** | 32px | Bold (700) | Tight (-0.02em) | `text-3xl font-bold tracking-tight` |
| **H1** | 24px | SemiBold (600) | Tight (-0.01em) | `text-2xl font-semibold tracking-tight` |
| **H2** | 18px | SemiBold (600) | Normal | `text-lg font-semibold` |
| **Body** | 14px | Regular (400) | Normal | `text-sm` |
| **Label** | 12px | Medium (500) | Wide (0.02em) | `text-xs font-medium tracking-wide` |

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
        sans: ['Inter var', 'sans-serif'],
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

## 7. Responsive Layout System ✅ Implemented

### Mobile-First Architecture
The application uses a mobile-first responsive approach with breakpoints:
- **Mobile**: `< 768px` - Single column, stacked layouts
- **Tablet**: `md:` (768px+) - Two column grids
- **Desktop**: `lg:` (1024px+) - Full sidebar + content layout

### Dashboard Layout
- **Desktop**: Fixed sidebar (`w-72`) + scrollable main content
- **Mobile**: Collapsible slide-out sidebar with overlay backdrop
- **Mobile Header**: Compact header with hamburger menu toggle

### Key Components

#### DashboardSidebar (`src/components/DashboardSidebar.tsx`)
- **Width**: `w-72` (288px)
- **Background**: `bg-zinc-950` (Obsidian)
- **Mobile Behavior**: Slide-in from left with backdrop blur overlay
- **Navigation Items**: Icon + label with active state indicator (left border)
- **User Profile Section**: Bottom-aligned with email and role display

#### StatCard (`src/components/StatCard.tsx`)
- **Purpose**: Display key metrics (Balance, Credit Score, Next Payment)
- **Variants**: `black`, `green`, `blue`, `amber`, `red`
- **Structure**: Label, value, optional subValue, icon with colored background

#### Mobile Header
- **Height**: Standard mobile header height
- **Content**: Logo + hamburger menu button
- **Visibility**: `lg:hidden` (only on mobile/tablet)

### Responsive Patterns Used

```css
/* Grid stacking */
grid-cols-1 md:grid-cols-2 lg:grid-cols-3

/* Sidebar visibility */
lg:static lg:translate-x-0  /* Desktop: always visible */
fixed -translate-x-full     /* Mobile: hidden by default */

/* Content padding */
p-4 md:p-8                  /* Tighter on mobile */

/* Typography scaling */
text-3xl md:text-4xl        /* Larger on desktop */
```

---

## 8. Component Files Reference

| Component | File | Purpose |
|-----------|------|--------|
| **Auth Page** | `src/pages/Auth.tsx` | Split-screen authentication |
| **Dashboard** | `src/pages/Dashboard.tsx` | Client dashboard with sidebar |
| **DashboardSidebar** | `src/components/DashboardSidebar.tsx` | Collapsible navigation |
| **StatCard** | `src/components/StatCard.tsx` | Metric display cards |
| **Card** | `src/components/ui/card.tsx` | Base card with rounded-3xl |
| **Button** | `src/components/ui/button.tsx` | Styled buttons |
| **Input** | `src/components/ui/input.tsx` | Form inputs |

---

*Design System Version: 2.1.0*
