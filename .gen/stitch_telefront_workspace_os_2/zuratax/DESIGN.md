---
name: Zuratax
colors:
  surface: '#fcf8fa'
  surface-dim: '#dcd9db'
  surface-bright: '#fcf8fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f5'
  surface-container: '#f0edef'
  surface-container-high: '#eae7e9'
  surface-container-highest: '#e4e2e4'
  on-surface: '#1b1b1d'
  on-surface-variant: '#45464d'
  inverse-surface: '#303032'
  inverse-on-surface: '#f3f0f2'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#005cbb'
  on-secondary: '#ffffff'
  secondary-container: '#5d9aff'
  on-secondary-container: '#00326b'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#271901'
  on-tertiary-container: '#98805d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#d7e2ff'
  secondary-fixed-dim: '#abc7ff'
  on-secondary-fixed: '#001b3f'
  on-secondary-fixed-variant: '#00458f'
  tertiary-fixed: '#fcdeb5'
  tertiary-fixed-dim: '#dec29a'
  on-tertiary-fixed: '#271901'
  on-tertiary-fixed-variant: '#574425'
  background: '#fcf8fa'
  on-background: '#1b1b1d'
  surface-variant: '#e4e2e4'
  module-tasker: '#0f62c3'
  module-ledger: '#10b981'
  module-eventor: '#f59e0b'
  module-factor: '#8b5cf6'
  module-contactor: '#14b8a6'
  module-booker: '#6366f1'
  module-stuffer: '#f43f5e'
  module-exploiter: '#b91c1c'
  module-tracker: '#06b6d4'
  module-reporter: '#7c3aed'
  scope-work: '#3b82f6'
  scope-personal: '#ec4899'
  scope-sideproject: '#8b5cf6'
  scope-home: '#10b981'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
  body-base:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.08em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-page: 24px
  sidebar-width: 220px
  header-height: 48px
  row-height-dense: 32px
---

## Brand & Style
The design system for **Zuratax** is a high-performance **Corporate Modern** framework with a hidden "Clever Mischievous" streak. It is engineered for professionals who navigate complex operational data but appreciate an interface that feels alive and responsive. The aesthetic is defined by a disciplined neutral foundation that allows vibrant, domain-specific module accents to command attention.

### Visual Signature
- **Atmosphere:** Efficient, precise, and sophisticated, yet punctuated by playful 3D mascot interventions that provide levity during high-stakes tasks.
- **Mascot Guidelines:** 3D characters should feature matte, clay-like textures with soft studio lighting. They appear in empty states (peeking from the bottom), release banners (holding new features), and tooltips (offering "expert" shortcuts). They should never obstruct functional data.
- **Density:** High-density by default. The system favors clarity through alignment and typography over excessive padding or heavy borders.

## Colors
The palette shifts from pale blue tones to a **Neutral Slate/Gray** foundation to maximize focus and minimize visual fatigue.

### Surface Strategy
- **Light Mode:** Canvas uses a neutral off-white/slate (`#f8fafc`). Cards are pure white with a 1px hairline border (`#e2e8f0`).
- **Dark Mode:** Canvas uses a deep slate (`#0f172a`). Cards use a slightly elevated slate (`#1e293b`) with high-contrast text and vibrant module accents.

### Module & Scope Accents
Color is used as a primary navigational anchor. Each module (Ledger, Tasker, etc.) owns a specific hue used for its primary action buttons, active states, and header accents. **Scopes** (Work, Personal, etc.) are represented via subtle contextual cues: thin 2px left-hand borders on cards or small, low-saturation pills.

## Typography
Built on **Inter**, the hierarchy is optimized for operational density and rapid scanning.

### Technical Data
**JetBrains Mono** is reserved for all non-prose data: timestamps, financial figures, IDs, and PIN entry cells. This ensures perfect vertical alignment in multi-row ledgers.

### Localization
Layouts are built with flexible expansion logic to accommodate **RU** (longer character counts) and **ZH** (vertical density requirements). Labels should avoid fixed widths, favoring intrinsic content sizing with sensible `max-width` constraints.

## Layout & Spacing
The system utilizes a **4px baseline grid** to maintain strict alignment in data-heavy views.

### Grid Model
- **Operational Workspace:** Features a fixed sidebar (220px) and a main content area that can toggle a right-side inspector (320px).
- **Responsive Reflow:** On mobile, the sidebar becomes a drawer and the inspector moves to a bottom-sheet.
- **Density:** Elements are packed tightly to reduce scrolling. Task rows use a 32px height in "Compact View" and 44px in "Standard View."

## Elevation & Depth
Zuratax uses **Tonal Layering** and **Subtle Shadows** to define hierarchy without cluttering the UI with heavy borders.

- **Surface Tiers:** Background (Level 0), Content Cards (Level 1), and Overlays/Modals (Level 2).
- **Shadows:** Level 1 uses a subtle 1px border only. Level 2 (Popovers) uses a highly diffused, low-opacity shadow (8% opacity) tinted with the base slate color to create a "floating" effect.
- **Contrast:** In dark mode, depth is primarily conveyed through slight shifts in slate lightness rather than shadow, ensuring high-contrast readability.

## Shapes
The shape language is **Soft and Disciplined**. A 4px (`sm`) radius is standard for functional components like buttons and input fields to maintain a professional, tool-like feel. Larger containers like cards use an 8px (`md`) radius. 

**PIN entry cells** used in the scope switcher are perfectly square or slightly rounded (4px) to emphasize their individual character slots.

## Components

### Cards & Task Rows
Cards are refined with minimal padding (12px-16px) and thin borders. **High-density task rows** are the core of the system, featuring:
- **Status Alignment:** Fixed-width left-hand status icons/checkboxes.
- **Hover Actions:** Utility buttons (Edit, Delete, Pin) appear only on row hover to reduce visual noise.

### Scope Switcher & PIN Entry
The scope switcher uses a grid of distinct PIN entry cells. These cells should have a high-contrast focus state using the `secondary` color. Each scope is identified by a subtle 2px border or a small color-coded pill.

### Input Fields
Inputs are 32px in height for operational views. Focus states use a 2px outer ring in the current module's accent color.

### Buttons
- **Primary:** Filled with the module-specific accent color.
- **Secondary/Ghost:** Slate-colored text with no background, used for secondary actions within rows or cards.