---
name: NamLend Trust — Neo-Fintech "Black Card"
description: >-
  A premium, content-first design system for a Namibian micro-lending portal.
  High-contrast Zinc & Black foundation with Electric Blue accents, soft
  shadows, generous radii, and three swappable presentation skins (Deep Glass,
  Midnight Lux, Neo Pop).
mode:
  default: dark
  supports: [light, dark]

# ───────────────────────────────────────────────────────────────────
# Color tokens (canonical Neo-Fintech base layer)
# All values are sRGB hex unless otherwise noted.
# ───────────────────────────────────────────────────────────────────
colors:
  # Brand neutrals — the "Black Card" spine
  obsidian: "#09090b"   # zinc-950 — page background (dark), sidebar
  charcoal: "#18181b"   # zinc-900 — card surface (dark)
  graphite: "#27272a"   # zinc-800 — secondary surfaces, borders (dark)
  iron:     "#3f3f46"   # zinc-700 — disabled, low-emphasis dividers
  steel:    "#52525b"   # zinc-600 — subdued strokes
  slate:    "#71717a"   # zinc-500 — muted foreground (light)
  ash:      "#a1a1aa"   # zinc-400 — secondary text, icon idle
  pearl:    "#d4d4d8"   # zinc-300 — soft strokes
  mist:     "#e4e4e7"   # zinc-200 — borders (light)
  smoke:    "#f4f4f5"   # zinc-100 — light-mode subtle surface
  porcelain:"#fafafa"   # zinc-50  — light-mode background
  white:    "#ffffff"   # card surface (light)

  # Accent — Electric Blue
  primary:        "#2563eb"  # blue-600 — primary action, brand mark
  primary-hover:  "#1d4ed8"  # blue-700 — pressed / hover deepening
  primary-soft:   "#3b82f6"  # blue-500 — gradients, ramps
  primary-tint:   "rgba(59,130,246,0.10)"  # ghost hover, active list row
  primary-glow:   "rgba(37,99,235,0.20)"   # glow shadow under buttons

  # Heritage / legacy financial accents (used in marketing surfaces)
  trust-blue:     "#2563eb"
  warm-orange:    "#e08827"
  success-green:  "#27a060"
  neutral-gray:   "#71717a"

  # Functional / status
  success:   "#10b981"   # emerald-500 — settled, paid, completed
  warning:   "#f59e0b"   # amber-500   — pending, attention
  error:     "#f43f5e"   # rose-500    — validation, declined
  info:      "#3b82f6"   # blue-500    — info badges
  destructive:"#ef4444"  # red-500     — destructive actions

  # Loan-status palette (paired fg / bg)
  status-pending:        "#eab308"
  status-pending-bg:     "#fefce8"
  status-approved:       "#16a34a"
  status-approved-bg:    "#f0fdf4"
  status-rejected:       "#ef4444"
  status-rejected-bg:    "#fef2f2"
  status-disbursed:      "#2563eb"
  status-disbursed-bg:   "#eff6ff"
  status-active:         "#a855f7"
  status-active-bg:      "#faf5ff"
  status-completed:      "#15803d"
  status-completed-bg:   "#dcfce7"
  status-overdue:        "#dc2626"
  status-overdue-bg:     "#fef2f2"

  # Risk buckets
  risk-low:       "#10b981"
  risk-medium:    "#eab308"
  risk-high:      "#e08827"
  risk-critical:  "#ef4444"

  # Semantic surface aliases (resolve per mode)
  surface:                 "{colors.porcelain}"   # light: page background
  surface-container:       "{colors.white}"       # light: card
  surface-container-low:   "{colors.smoke}"       # light: subtle fill, input
  surface-container-high:  "{colors.mist}"        # light: hairline borders
  surface-inverse:         "{colors.obsidian}"    # dark counterpart for dual-tone hero
  on-surface:              "{colors.obsidian}"
  on-surface-muted:        "{colors.slate}"
  on-primary:              "{colors.white}"

  # Dark-mode surface mapping (overrides when mode = dark)
  dark-surface:                 "{colors.obsidian}"
  dark-surface-container:       "{colors.charcoal}"
  dark-surface-container-low:   "{colors.graphite}"
  dark-surface-container-high:  "{colors.iron}"
  dark-on-surface:              "#fafafa"
  dark-on-surface-muted:        "{colors.ash}"

# ───────────────────────────────────────────────────────────────────
# Typography
# ───────────────────────────────────────────────────────────────────
typography:
  fontFamilies:
    sans:  "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    serif: "Playfair Display, ui-serif, Georgia, serif"
    mono:  "Space Grotesk, ui-monospace, SFMono-Regular, Menlo, monospace"
  defaultFamily: sans

  display:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: "700"
    lineHeight: "1.15"
    letterSpacing: "-0.02em"
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: "600"
    lineHeight: "1.2"
    letterSpacing: "-0.01em"
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: "600"
    lineHeight: "1.3"
    letterSpacing: "0"
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: "600"
    lineHeight: "1.4"
    letterSpacing: "0"
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: "400"
    lineHeight: "1.5"
    letterSpacing: "0"
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: "400"
    lineHeight: "1.5"
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: "500"
    lineHeight: "1.4"
    letterSpacing: "0.02em"
  caption:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: "500"
    lineHeight: "1.3"
    letterSpacing: "0.04em"
    textTransform: uppercase
  numeric-mono:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: "500"
    fontFeatureSettings: "'tnum' on, 'lnum' on"
  editorial:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: "600"
    lineHeight: "1.2"

# ───────────────────────────────────────────────────────────────────
# Spacing — 4px base, 8px primary cadence
# ───────────────────────────────────────────────────────────────────
spacing:
  base:  4px
  xxs:   2px
  xs:    4px
  sm:    8px
  md:    16px
  lg:    24px
  xl:    32px
  "2xl": 48px
  "3xl": 64px
  "4xl": 96px
  gutter-mobile:  16px
  gutter-tablet:  24px
  gutter-desktop: 32px

# ───────────────────────────────────────────────────────────────────
# Border radii
# ───────────────────────────────────────────────────────────────────
rounded:
  none:    "0"
  sm:      0.5rem      # 8px  — chips, micro controls
  DEFAULT: 0.75rem     # 12px — inputs, small buttons (--radius)
  md:      0.875rem    # 14px
  lg:      1rem        # 16px — buttons (rounded-xl)
  xl:      1.25rem     # 20px — inner cards (rounded-2xl)
  "2xl":   1.5rem      # 24px — main cards (rounded-3xl)
  "3xl":   2rem        # 32px — hero containers (rounded-4xl)
  pill:    9999px      # avatar, status pill

# ───────────────────────────────────────────────────────────────────
# Borders / strokes
# ───────────────────────────────────────────────────────────────────
borders:
  hairline: "1px solid #e4e4e7"      # light mode
  hairline-dark: "1px solid #27272a" # dark mode
  emphasis: "1px solid #d4d4d8"
  brutalist: "2px solid #000000"     # Neo Pop variant
  glow-ring: "1px solid rgba(37,99,235,0.50)"

# ───────────────────────────────────────────────────────────────────
# Elevation & shadow
# ───────────────────────────────────────────────────────────────────
elevation:
  level-0: none
  level-1: "{shadows.soft}"
  level-2: "{shadows.medium}"
  level-3: "{shadows.strong}"
  level-overlay: "{shadows.overlay}"

shadows:
  soft:    "0 8px 30px rgba(0,0,0,0.04)"
  medium:  "0 4px 16px -4px rgba(0,0,0,0.10)"
  strong:  "0 8px 32px -8px rgba(0,0,0,0.20)"
  overlay: "0 24px 48px -12px rgba(0,0,0,0.35)"
  glow-primary: "0 0 20px rgba(37,99,235,0.15)"
  glow-amber:   "0 0 20px rgba(245,158,11,0.20)"
  glow-emerald: "0 0 20px rgba(16,185,129,0.20)"
  inset-card-light: "inset 0 1px 0 rgba(255,255,255,0.60)"
  inset-card-dark:  "inset 0 1px 0 rgba(255,255,255,0.04)"
  # Neo Pop "brutalist" hard-offset shadows
  brutal-light: "6px 6px 0 0 rgba(0,0,0,1)"
  brutal-dark:  "6px 6px 0 0 rgba(255,255,255,1)"
  brutal-press-light: "2px 2px 0 0 rgba(0,0,0,1)"
  brutal-press-dark:  "2px 2px 0 0 rgba(255,255,255,1)"
  # Glass theme
  glass-card-dark:  "0 8px 32px 0 rgba(0,0,0,0.36)"
  glass-card-light: "0 8px 32px 0 rgba(31,38,135,0.10)"

# ───────────────────────────────────────────────────────────────────
# Blur / backdrop
# ───────────────────────────────────────────────────────────────────
blur:
  none: "0"
  sm:   "8px"
  md:   "16px"
  lg:   "24px"
  xl:   "40px"
  "2xl":"64px"
  aurora: "120px"   # blob gradient halo
backdrop:
  glass-light: "blur(24px) saturate(140%)"
  glass-dark:  "blur(24px) saturate(120%)"
  drawer:      "blur(20px)"

# ───────────────────────────────────────────────────────────────────
# Gradients
# ───────────────────────────────────────────────────────────────────
gradients:
  primary: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)"
  accent:  "linear-gradient(135deg, #e08827 0%, #f59e0b 100%)"
  hero:    "linear-gradient(135deg, #09090b 0%, #18181b 50%, #2563eb 100%)"
  card-glossy-dark: "linear-gradient(160deg, #18181b 0%, #09090b 100%)"
  amber-lux:        "linear-gradient(90deg, #b45309 0%, #f59e0b 100%)"
  bar-chart-fill:   "linear-gradient(180deg, rgba(59,130,246,0.20) 0%, rgba(59,130,246,0.00) 100%)"
  text-gold:        "linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #b45309 100%)"
  text-blue:        "linear-gradient(90deg, #60a5fa 0%, #6366f1 50%, #a855f7 100%)"

# ───────────────────────────────────────────────────────────────────
# Motion / animation
# ───────────────────────────────────────────────────────────────────
motion:
  durations:
    instant:  "0ms"
    micro:    "120ms"
    short:    "200ms"
    medium:   "300ms"
    long:     "500ms"
    ambient:  "6000ms"
    aurora:   "20000ms"
  easings:
    smooth:   "cubic-bezier(0.4, 0, 0.2, 1)"
    bounce:   "cubic-bezier(0.68, -0.55, 0.265, 1.55)"
    decelerate:"cubic-bezier(0.16, 1, 0.3, 1)"
    drawer:   "cubic-bezier(0.25, 0.46, 0.45, 0.94)"
  presets:
    hover-lift:    "transform 300ms cubic-bezier(0.4,0,0.2,1)"
    color-fade:    "color 200ms cubic-bezier(0.4,0,0.2,1)"
    press:         "transform 120ms cubic-bezier(0.4,0,0.2,1)"
  keyframes:
    float:       "translateY(0)→translateY(-15px) rotate(-2deg→2deg) over 6s ease-in-out infinite"
    aurora:      "rotate(0deg) scale(1)→rotate(360deg) scale(1.1) over 20s linear infinite"
    fade-in-up:  "opacity 0→1 + translateY(20px→0) over 500ms ease-out"
    pulse-glow:  "opacity 0.5→0.8 + scale(1→1.05) over 4s ease-in-out infinite"
    shimmer:     "background-position -200% 0 → 200% 0 over 2s linear infinite"
    shine:       "skewed highlight sweeps across surface over 2s"

# ───────────────────────────────────────────────────────────────────
# Breakpoints & viewport classes
# ───────────────────────────────────────────────────────────────────
breakpoints:
  sm:   "640px"
  md:   "768px"
  lg:   "1024px"
  xl:   "1280px"
  "2xl":"1400px"
viewport-classes:
  compact:  "<640px — drawer nav, bottom tab bar, single-column"
  medium:   "640–1023px — icon rail, two-column"
  expanded: "1024–1439px — permanent 288px sidebar, dense grid"
  wide:     ">=1440px — sidebar + max-w-7xl content rail"

# ───────────────────────────────────────────────────────────────────
# Z-index scale
# ───────────────────────────────────────────────────────────────────
z-index:
  base: 0
  raised: 10
  sticky-header: 40
  sidebar-permanent: 50
  drawer-overlay: 60
  drawer-panel: 70
  notification-panel: 90
  modal: 100
  toast: 110

# ───────────────────────────────────────────────────────────────────
# Iconography
# ───────────────────────────────────────────────────────────────────
icons:
  library: "lucide"
  stroke-width: 1.75
  default-size: 16px
  sizes:
    sm: 14px
    md: 16px
    lg: 20px
    xl: 24px
  treatment: "monoline, square endpoints, inherit currentColor"

# ───────────────────────────────────────────────────────────────────
# Theme variants — runtime skins layered over the canonical base
# ───────────────────────────────────────────────────────────────────
themes:
  black-card:
    name: "Neo-Fintech Black Card"
    role: "canonical / default"
    typeface: "{typography.fontFamilies.sans}"
    surface-light: "{colors.porcelain}"
    surface-dark:  "{colors.obsidian}"
    card-light:    "{colors.white}"
    card-dark:     "{colors.charcoal}"
    accent:        "{colors.primary}"
    border-light:  "{colors.mist}"
    border-dark:   "{colors.graphite}"
    radius:        "{rounded.2xl}"
    shadow:        "{shadows.soft}"
    hover:         "translateY(-4px) + {shadows.medium}"
  glass:
    name: "Deep Glass"
    role: "premium / marketing"
    typeface: "{typography.fontFamilies.sans}"
    surface-light: "#f1f5f9"
    surface-dark:  "#0f172a"
    card-light: "rgba(255,255,255,0.60)"
    card-dark:  "rgba(15,23,42,0.40)"
    backdrop: "{backdrop.glass-light}"
    accent: "rgba(37,99,235,0.80)"
    border-light: "rgba(255,255,255,0.20)"
    border-dark:  "rgba(255,255,255,0.10)"
    radius: "{rounded.2xl}"
    shadow-light: "{shadows.glass-card-light}"
    shadow-dark:  "{shadows.glass-card-dark}"
    glow: "rgba(99,102,241,0.30)"
    background-effect: "aurora gradient orbs (blue/purple/emerald) blurred 120px + 3% noise overlay"
  lux:
    name: "Midnight Lux"
    role: "luxury / private banking"
    typeface: "{typography.fontFamilies.serif}"
    surface-light: "#f4f4f4"
    surface-dark:  "#050505"
    card-light: "#ffffff"
    card-dark:  "#0a0a0a"
    accent: "{gradients.amber-lux}"
    border-light: "rgba(120,53,15,0.10)"
    border-dark:  "rgba(245,158,11,0.20)"
    radius: "{rounded.lg}"
    shadow: "{shadows.glow-amber}"
    glow: "rgba(245,158,11,0.20)"
    secondary-typeface: "Playfair Display, italic display"
    background-effect: "1px gold grid (40px) at 3% opacity + amber wash from top"
  neo-pop:
    name: "Neo Pop"
    role: "playful / crypto"
    typeface: "{typography.fontFamilies.mono}"
    surface-light: "#f0f0f0"
    surface-dark:  "{colors.charcoal}"
    card-light: "#ffffff"
    card-dark:  "{colors.graphite}"
    accent: "#8b5cf6"      # violet-500 primary
    secondary-fill: "#bef264"  # lime-300 secondary
    border-light: "#000000"
    border-dark:  "#ffffff"
    border-width: 2px
    radius: "{rounded.sm}"
    shadow-light: "{shadows.brutal-light}"
    shadow-dark:  "{shadows.brutal-dark}"
    press-shadow-light: "{shadows.brutal-press-light}"
    press-shadow-dark:  "{shadows.brutal-press-dark}"
    glow: "rgba(16,185,129,0.20)"
    background-effect: "2px dot matrix grid (24px) at 10% opacity"

# ───────────────────────────────────────────────────────────────────
# Components — semantic recipes that resolve against tokens
# ───────────────────────────────────────────────────────────────────
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.lg}"
    paddingX: "{spacing.md}"
    paddingY: "{spacing.sm}"
    minHeight: 40px
    fontWeight: "500"
    fontSize: 14px
    shadow: "0 8px 16px -8px {colors.primary-glow}"
    hover: "{colors.primary-hover} + brightness(1.05)"
    active: "scale(0.95)"
    transition: "{motion.presets.hover-lift}"
  button-secondary:
    backgroundColor: "{colors.smoke}"
    textColor: "{colors.obsidian}"
    rounded: "{rounded.lg}"
    border: "{borders.hairline}"
    hover: "{colors.mist}"
    dark:
      backgroundColor: "{colors.graphite}"
      textColor: "{colors.smoke}"
      hover: "{colors.iron}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.slate}"
    rounded: "{rounded.DEFAULT}"
    hover: "rgba(244,244,245,0.50)"
    dark:
      hover: "rgba(255,255,255,0.05)"
  button-neo-pop:
    backgroundColor: "#8b5cf6"
    textColor: "#ffffff"
    border: "2px solid #000000"
    rounded: "{rounded.sm}"
    shadow: "{shadows.brutal-light}"
    hover: "translate(2px, 2px) + {shadows.brutal-press-light}"
  card:
    backgroundColor: "{colors.surface-container}"
    rounded: "{rounded.2xl}"
    border: "{borders.hairline}"
    shadow: "{shadows.soft}"
    padding: "{spacing.lg}"
    hover: "translateY(-4px) + {shadows.medium}"
    transition: "all 300ms {motion.easings.smooth}"
    dark:
      backgroundColor: "{colors.charcoal}"
      border: "{borders.hairline-dark}"
  card-glass:
    backgroundColor: "rgba(255,255,255,0.10)"
    backdropFilter: "{backdrop.glass-light}"
    border: "1px solid rgba(255,255,255,0.20)"
    rounded: "{rounded.2xl}"
    shadow: "{shadows.glass-card-light}"
    decoration: "1px top-edge highlight gradient + 3% SVG fractal-noise overlay"
  card-receipt:
    backgroundColor: "{colors.charcoal}"
    backgroundImage: "{gradients.card-glossy-dark}"
    textColor: "{colors.smoke}"
    fontFamily: "{typography.fontFamilies.mono}"
    rounded: "{rounded.xl}"
    border: "1px dashed {colors.iron}"
    padding: "{spacing.lg}"
    note: "Used by the loan-application 'live receipt' panel"
  stat-card:
    rounded: "{rounded.2xl}"
    padding: "{spacing.lg}"
    iconChip:
      size: 40px
      rounded: "{rounded.lg}"
      backgroundOpacity: 0.10
    variants:
      black:  { background: "{colors.obsidian}", text: "{colors.smoke}" }
      blue:   { background: "{colors.primary}",  text: "{colors.on-primary}" }
      green:  { background: "{colors.success}",  text: "{colors.on-primary}" }
      amber:  { background: "{colors.warning}",  text: "{colors.obsidian}" }
      red:    { background: "{colors.error}",    text: "{colors.on-primary}" }
  input:
    backgroundColor: "rgba(250,250,250,0.50)"
    border: "{borders.hairline}"
    rounded: "{rounded.lg}"
    paddingX: "{spacing.md}"
    paddingY: "{spacing.sm}"
    fontSize: 14px
    placeholderColor: "{colors.ash}"
    focusBorder: "{colors.primary}"
    focusRing: "0 0 0 4px rgba(59,130,246,0.20)"
  badge-status:
    rounded: "{rounded.pill}"
    fontSize: 11px
    fontWeight: "500"
    paddingX: 8px
    paddingY: 2px
    textTransform: uppercase
    letterSpacing: "0.04em"
    variants:
      pending:   { background: "{colors.status-pending-bg}",   text: "{colors.status-pending}" }
      approved:  { background: "{colors.status-approved-bg}",  text: "{colors.status-approved}" }
      rejected:  { background: "{colors.status-rejected-bg}",  text: "{colors.status-rejected}" }
      disbursed: { background: "{colors.status-disbursed-bg}", text: "{colors.status-disbursed}" }
      active:    { background: "{colors.status-active-bg}",    text: "{colors.status-active}" }
      completed: { background: "{colors.status-completed-bg}", text: "{colors.status-completed}" }
      overdue:   { background: "{colors.status-overdue-bg}",   text: "{colors.status-overdue}" }
  sidebar:
    width-permanent: 288px
    width-rail: 80px
    width-drawer: "min(20rem, calc(100vw - 0.75rem))"
    backgroundColor: "{colors.obsidian}"
    textColor: "{colors.ash}"
    rounded: "{rounded.lg}"
    item-idle: "{colors.ash}"
    item-hover-bg: "{colors.charcoal}"
    item-hover-text: "{colors.smoke}"
    item-active-bg: "{colors.primary-tint}"
    item-active-text: "{colors.primary}"
    item-active-indicator: "2px right border in {colors.primary}"
    interaction: "3D tilt on hover via per-item transform"
  bottom-nav:
    height: 64px
    safe-area: "env(safe-area-inset-bottom)"
    backgroundColor: "{colors.charcoal}"
    border-top: "{borders.hairline-dark}"
    item-active: "{colors.primary}"
  modal:
    backgroundColor: "{colors.surface-container}"
    rounded: "{rounded.2xl}"
    shadow: "{shadows.overlay}"
    backdrop: "rgba(0,0,0,0.60) blur(4px)"
  credit-score-gauge:
    type: "circular SVG progress arc"
    track-light: "rgba(0,0,0,0.10)"
    track-dark:  "rgba(255,255,255,0.10)"
    color-mapping:
      750+: "{colors.success}"
      670-749: "{colors.primary-soft}"
      580-669: "{colors.warning}"
      "<580": "{colors.error}"
  hero-card:
    width: 340px
    height: 220px
    rounded: "{rounded.xl}"
    rotation: "-15deg at rest, -8deg on hover"
    backgroundImage: "{gradients.card-glossy-dark}"
    decoration: "two blurred radial circles + diagonal shine sweep"

# ───────────────────────────────────────────────────────────────────
# Layout & containers
# ───────────────────────────────────────────────────────────────────
layout:
  container-max: 1400px
  content-max:   1280px
  card-grid-gap: 24px
  section-gap:   32px
  page-padding-mobile:  16px
  page-padding-desktop: 32px
  shell-height: "min-h-dvh / h-dvh (mobile-chrome safe)"

# ───────────────────────────────────────────────────────────────────
# Currency / numeric formatting (regulatory-bound)
# ───────────────────────────────────────────────────────────────────
formatting:
  currency:
    code: NAD
    symbol: "N$"
    pattern: "N$ #,##0.00"
    thousand-separator: ","
    decimal-separator:  "."
    placement: prefix
  numerals:
    typeface: "{typography.fontFamilies.mono}"
    feature: "tabular, lining figures (tnum + lnum)"
  apr:
    suffix: "% APR"
    max-allowed: 32

# ───────────────────────────────────────────────────────────────────
# Accessibility
# ───────────────────────────────────────────────────────────────────
accessibility:
  min-touch-target: 40px
  body-text-contrast: "WCAG AA on all themes"
  large-text-contrast: "WCAG AA"
  focus-ring: "2px solid {colors.primary} with 2px offset"
  reduced-motion: "respect prefers-reduced-motion — disable float, aurora, shimmer, shine"
  hover-fallback: "@media (hover:none) — disable lift transforms, keep color cues"
---

# NamLend Trust — Visual Identity

## Brand & Style

NamLend Trust is a Namibian micro-lending portal regulated under NAMFISA. Its
visual language is **Neo-Fintech / "Black Card"** — drawing on the premium,
content-first feel of modern challenger banks (Revolut, Monzo, Mercury) and
translating it for a market that needs to feel both _trustworthy_ and _modern_
on a sub-N$1,000 phone.

The product wears black like a tailored suit. Typography is precise. Color is
held back. Motion is restrained but expressive when it shows up. Money — APR,
balances, instalments — is rendered in tabular monospace so a customer can scan
a receipt without parsing it. Everything visible to a borrower is built to feel
_calm at the moment of debt_: high contrast, generous radii, no chrome, no
clutter.

The system is dual-toned by design: a **dark-first** brand spine (obsidian
zinc-950 with electric-blue accents) sits over an equally complete light theme
that flips automatically with system preference. A small `ModeToggle` lives in
the header for explicit override, and the choice persists locally.

## Look & Feel

- **Sophisticated, not corporate.** No stock blue gradients, no rounded clip-art
  iconography. Stroke-based Lucide icons at 1.75 stroke-width, mono-line.
- **Content-first.** Cards sit on the page like cards on a table. Elevation is
  used sparingly — most cards rest on `shadow-soft` (a 30px diffuse drop) and
  rise 4px on hover with `shadow-medium`. There are no inner-glow flourishes.
- **Confident type.** Inter at heavier weights with negative letter-spacing on
  display sizes. Numbers — APR, balances, monthly instalments — render in Space
  Grotesk with tabular figures, so columns of money line up to the digit.
- **Electric-blue restraint.** The accent (`#2563eb`) appears almost
  exclusively on primary actions, the active row in the sidebar, focus rings,
  and the credit-score gauge in the "Good" band. A 10% blue tint
  (`rgba(59,130,246,0.10)`) marks the active state without shouting.
- **Rounded, not soft.** Main containers use a 24px radius (`rounded-3xl`),
  buttons and inputs 16px (`rounded-xl`), and small chips 8px. The system
  intentionally avoids both razor-sharp 0px corners (feels brittle for finance)
  and full-pill cards (feels juvenile). Pills are reserved for status badges.

## Three Presentation Skins

Beyond the canonical Black Card identity, the system supports three runtime
_skins_ that swap card, button, text, and background treatments without
touching the underlying token grid. The default is **Neo Pop**; the other two
are available to clients who want a different brand temperature. Skins must
not change information density, hierarchy, or spacing — only surface, stroke,
and motion physics.

1. **Deep Glass** — frosted slate panes (`backdrop-blur-2xl`) over a slow
   aurora of blue → purple → emerald gradient orbs. A 3% SVG fractal-noise
   overlay keeps the glass from looking plastic. Hover lifts the card and
   sweeps a diagonal shine across it. Use for premium / marketing surfaces.

2. **Midnight Lux** — matte near-black (`#050505`) backgrounds with hairline
   amber strokes (`amber-500/20`) and a Playfair Display serif for headings.
   A 40px gold grid sits at 3% opacity, and a soft amber wash radiates from
   the top of the page. Hover blooms a 1px gold halo around the card. Use
   when the brand needs to read as private-banking, not fintech.

3. **Neo Pop** — bright surfaces, **2px solid black borders**, and hard
   `6px 6px 0 0` offset shadows. Buttons use a violet-500 fill with a
   lime-300 secondary. Hover physically presses the element down by 2px and
   shrinks the shadow to `2px 2px 0 0`, producing a satisfying "click."
   Typography flips to Space Grotesk monospace. Background carries a 24px
   dot-matrix grid at 10% opacity. Reserved for playful / crypto-adjacent
   product surfaces.

Each skin defines its own `card`, `button`, `text`, `border`, `radius`,
`background`, and `glow` recipe; the canonical Black Card tokens above are
the layer the skins resolve against.

## Color Use

The neutral spine is a strict zinc ramp from `#fafafa` to `#09090b`. Avoid
ad-hoc grays — every gray on screen should resolve to one of `porcelain /
smoke / mist / pearl / ash / slate / iron / graphite / charcoal / obsidian`.

Electric blue is **the only accent for primary action**. Status colors
(emerald, amber, rose) are reserved for state — a payment that _is_ late uses
rose; a payment that _might_ be late does not. Loan status badges always pair
a 100-shade background with an 800-shade foreground in light mode and a
900/30-alpha background with a 400-shade foreground in dark mode, ensuring
contrast on both surfaces.

Heritage marketing surfaces (the public landing page) may additionally use
`warm-orange` (`#e08827`) and `success-green` (`#27a060`); product surfaces
should not.

## Typography Hierarchy

- **Display** (32px / 700 / -0.02em) — page-level hero only.
- **Headline LG** (24px / 600 / -0.01em) — page titles.
- **Headline MD** (18px / 600) — card titles and section heads.
- **Body MD** (14px / 400) — default body, all dashboards.
- **Label MD** (12px / 500 / 0.02em) — form labels, badges, metric captions.
- **Caption** (11px / 500 / 0.04em / uppercase) — micro-copy and overlines.
- **Numeric Mono** (Space Grotesk / tnum + lnum) — every monetary value,
  every APR, every loan ID, every account number.
- **Editorial** (Playfair Display / 600) — Lux skin only; not used in product.

Body line-height is generous (1.5×). Display and headline sizes ride at 1.15–1.3
to feel sculpted. Letter-spacing tightens as size grows and widens as size
shrinks (a small letter-spacing positive on labels helps them read as labels).

## Spacing, Density, and Layout

The grid is **4px base** with 8px as the working cadence. Cards pad to 24px
(`spacing.lg`) on desktop and 16px on phone. The page itself uses an adaptive
shell:

- **<640px (compact)** — single column, drawer navigation, bottom tab bar
  for core flows, safe-area padding bottom and top.
- **640–1023px (medium)** — two-column grids, an 80px icon rail replaces
  the drawer.
- **1024–1439px (expanded)** — permanent 288px sidebar, dense three- or
  four-column stat grids, inline action bars.
- **≥1440px (wide)** — same sidebar; content rail constrained to 1280px so
  text never goes panoramic.

Shells use `min-h-dvh` and `h-dvh` rather than `100vh` so iOS/Android browser
chrome doesn't crop the bottom nav.

## Elevation, Shadows, and Glass

Elevation is communicated through soft, blurry, low-opacity shadows — never
through borders changing color, never through brightness alone. The four
levels are:

- **Level 1 (`shadow-soft`)** — resting card.
- **Level 2 (`shadow-medium`)** — card on hover, sticky surfaces.
- **Level 3 (`shadow-strong`)** — popovers, hovered hero card.
- **Overlay** — modals, command palette.

A **glow shadow** (`0 0 20px rgba(37,99,235,0.15)`) lights up beneath the
primary CTA, hinting that _this_ is the action that moves money. Glow is
otherwise reserved.

Glassmorphism, where used, follows a strict recipe: `backdrop-filter: blur(24px)
saturate(140%)`, a `rgba(255,255,255,0.10)` fill, and a 1px top-edge highlight
gradient to fake a refractive lens. Glass surfaces always sit over an animated
or gradient backdrop — they should never be glass over flat color.

## Motion

Default duration is **200–300ms** with `cubic-bezier(0.4, 0, 0.2, 1)`. The
catalog of motion is small on purpose:

- **Hover lift** — cards translate up 4px and gain shadow over 300ms.
- **Press** — buttons scale to 0.95 (or, in Neo Pop, translate +2px).
- **Fade-in-up** — page entries stagger by 100ms across stat cards.
- **Aurora** — a 20s rotation + slight scale on glass-theme blob orbs.
- **Float** — 6s vertical drift + small rotation on the hero credit card.
- **Shimmer** — used on skeleton loaders only.
- **Shine** — diagonal highlight sweeps glass cards on hover.
- **Pulse-glow** — slow 4s breathing on live indicators (e.g. "settlement
  active"); never used decoratively.

All ambient motion (`float`, `aurora`, `pulse-glow`, `shimmer`, `shine`) must
honor `prefers-reduced-motion: reduce` and stop. Functional motion (press,
hover lift, fade-in-up) shortens to ≤100ms instead of stopping, so the
interface still confirms input.

Touch devices (`@media (hover: none) and (pointer: coarse)`) drop transform
hovers entirely — touch users get state through color and shadow, not lift.

## Iconography & Illustration

Icons are **monoline Lucide** at 1.75 stroke-width, default 16px, rendering
`currentColor`. They never carry color of their own — the surface decides.
Illustration is sparse: a single decorative HeroCard (a tilted credit-card
artwork) on the dashboard hero, a CreditScoreGauge SVG, and the auth page's
ambient blue/indigo blur orbs. There is no mascot, no stock photography, and
no flat-design illustration.

## Forms, Inputs, and the "Live Receipt"

Inputs sit on a 50%-opacity `porcelain` fill in light mode and on `graphite`
in dark mode, bordered by a hairline that thickens to `primary` on focus and
gains a 4px `rgba(59,130,246,0.20)` ring. Labels are 12px medium, in `slate`,
floated above the input.

The loan application form uses a signature pattern: a **live receipt panel**
beside the inputs that updates in real time. The receipt is rendered in
glossy `charcoal` with a dashed `iron` divider and Space Grotesk monospace —
visually echoing the printed-thermal-receipt language that Namibian customers
recognize from till slips and bank statements.

## Data Display

Tables are quiet. Header rows are 11px uppercase caption in `slate`. Body
rows are 14px in body color. Money columns are right-aligned and rendered in
numeric-mono. Status uses badge-status pills (never colored row backgrounds,
which destroy scanability).

Charts are minimalist. Bars use a vertical gradient from
`rgba(59,130,246,0.20)` → transparent. Tooltips are dark `charcoal` cards
with white 11px text. Axes are 11px `ash`. There are no gridlines beyond a
single 1px hairline along the x-axis.

## Currency, Numbers, APR

NAD currency renders as `N$ 12,450.00` (with the non-breaking space and
narrow `$` sign), never as the Rand symbol. APR renders as `28.5% APR` with
the suffix bound to the value. The product hard-caps APR at 32% — values
beyond that are shown as an `error`-colored validation badge, not silently
clamped. Use tabular monospace numerals for every monetary value so columns
line up on the digit.

## Accessibility

- Body and small text meet WCAG AA against every surface in both modes.
- Focus rings are always visible, always 2px solid `primary` with a 2px offset.
- Touch targets are ≥40px, including secondary actions inside cards.
- Color is never the _only_ signal — every status carries an icon, a label,
  or a glyph (✓, !, ×) in addition to its hue.
- Reduced-motion preference disables ambient and decorative motion.

## Identity in One Line

> **A black card with electric-blue piping, soft shadows, generous radii, and
> tabular numbers — designed to feel calm at the moment of debt and confident
> at the moment of approval.**
