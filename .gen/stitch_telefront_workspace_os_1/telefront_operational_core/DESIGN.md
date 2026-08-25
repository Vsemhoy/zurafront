---
name: Telefront Operational Core
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#424752'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#727784'
  outline-variant: '#c2c6d4'
  surface-tint: '#005cbb'
  primary: '#004a9a'
  on-primary: '#ffffff'
  primary-container: '#0f62c3'
  on-primary-container: '#d6e2ff'
  inverse-primary: '#abc7ff'
  secondary: '#1d4ed8'
  on-secondary: '#ffffff'
  secondary-container: '#4069f2'
  on-secondary-container: '#fffbff'
  tertiary: '#634800'
  on-tertiary: '#ffffff'
  tertiary-container: '#805f00'
  on-tertiary-container: '#ffde9d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d7e2ff'
  primary-fixed-dim: '#abc7ff'
  on-primary-fixed: '#001b3f'
  on-primary-fixed-variant: '#00458f'
  secondary-fixed: '#dce1ff'
  secondary-fixed-dim: '#b7c4ff'
  on-secondary-fixed: '#001551'
  on-secondary-fixed-variant: '#0039b5'
  tertiary-fixed: '#ffdf9f'
  tertiary-fixed-dim: '#f9bd22'
  on-tertiary-fixed: '#261a00'
  on-tertiary-fixed-variant: '#5c4300'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: '0'
  body-base:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.005em
  caption-xs:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
  badge-caps:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.08em
  code-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: '0'
  metric-display:
    fontFamily: Inter
    fontSize: 64px
    fontWeight: '800'
    lineHeight: 68px
    letterSpacing: -0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  header-height: 46px
  sidebar-width: 220px
  inspector-width: 320px
---

## Brand & Style

The design system follows a **Modern Corporate** aesthetic infused with a **"Clever Mischievous"** personality. It balances the high-stakes discipline of an enterprise operational workspace with the tactile warmth of a creative tool. The interface is optimized for high-intensity daily use, utilizing crisp surfaces and precision geometry while avoiding the coldness of traditional "gray-box" enterprise software.

The "mischievous" element is expressed through subtle micro-interactions: reactive hover physics, playful 3D mascots with matte textures, and unexpected "Easter eggs" like the Expert Mode toggle. The visual language uses a calm, slate-based foundation to ensure focus, allowing vibrant module-specific accents to act as functional landmarks.

- **Information Density:** High density for internal workflows; spacious and welcoming for public-facing views.
- **Visual Metaphor:** An "intelligent workbench" that feels both industrial and approachable.
- **Personality Traits:** Observant, swift, resourceful, and witty.

## Colors

The palette is anchored by a **Slate/Gray functional base** that provides a stable environment for long-form operational work. Color is used strategically to differentiate modules and indicate system status.

- **Foundational Neutrals:** Use `#f8fafc` (Light) or `#0f172a` (Dark) for the canvas. Surfaces (cards/panels) should use a pure white or deep slate (`#1e293b`) to create clear elevation.
- **Module Identity:** Each domain (Tasker, Ledger, etc.) is assigned a unique accent color and a corresponding 90-degree pastel gradient for headers. These gradients serve as peripheral cues to help users orient themselves instantly.
- **Functional Accents:** 
    - **Success:** Emerald green for completed states.
    - **Warning:** Amber for due dates and offline alerts.
    - **Expert Mode:** Indigo (`#6366f1`) for advanced developer-level fields.
- **Interaction States:** Hover states for primary actions should shift brightness by 10% rather than introducing new hues, maintaining a "snappy" desktop feel.

## Typography

This design system uses a strict hierarchy built on **Inter** for its systematic clarity and **JetBrains Mono** for technical data.

- **Operational Density:** Most workspace content defaults to `body-base` (14px) or `body-sm` (13px) to maximize information per screen.
- **Data Clarity:** Monospaced fonts are mandatory for timestamps, financial figures, VINs, and IDs to ensure vertical alignment in tables and ledgers.
- **Letter Spacing:** Headlines use negative tracking to feel more "custom" and compact, while micro-labels (`badge-caps`) use wide tracking to remain legible at small scales.
- **Hierarchy:** Maintain tight vertical margins between headings and their related content to create "spatial coupling," making it clear which labels belong to which data points.

## Layout & Spacing

The layout is built on a **4px baseline rhythm**. It uses a flexible, modular structure that adapts from a high-density 3-column workspace to a focused, single-column reading view.

- **Standard Grid:** 12-column system for public pages.
- **Operational Workspace:** A specialized layout featuring a fixed **46px header**, a **220px collapsible sidebar**, and a **320px right-hand inspector panel** for editing details without losing context of the main list.
- **Margins & Gutters:** 16px is the standard container margin. Internal component padding (e.g., inside cards) is typically 12px to maintain density.
- **Mobile Adaptations:** At widths below 768px, the sidebar transitions to a hidden drawer, and modals convert to bottom-sheets with a 12px top radius to optimize for thumb-reach.

## Elevation & Depth

Visual hierarchy is established through **Tonal Layering** and **Ambient Shadows**, avoiding heavy skeuomorphism in favor of a "stacked paper" look.

- **Base Layer:** Canvas background (`#f8fafc`).
- **Surface Layer:** Cards and secondary containers sit on the base. They use a 1px hairline border (`#e2e8f0`) to define edges.
- **Elevated Layer:** Popovers, tooltips, and active modals. These use soft, extra-diffused shadows with a slight slate tint (e.g., `0 8px 18px rgba(15, 23, 42, 0.08)`) to appear as if floating just above the workspace.
- **Depth Interactions:** Hovering over an operational card should trigger a 1px upward translation and a subtle border-color shift to the module's accent color, providing clear interactive feedback.

## Shapes

The shape language is characterized by **Soft, Geometric precision**. 

- **Standard Radius:** 8px (`md`) for cards and primary containers.
- **Component Radius:** 4px (`sm`) for buttons, inputs, and small UI elements to maintain a disciplined, "desktop-software" feel.
- **Pill Shapes:** Reserved for "Status Pills," search bars, and the floating timer dock to make them stand out as interactive, tactile objects.
- **Playful Edge:** Use a 34px "pinboard corner fold" trigger in the bottom-right of certain cards to add the "mischievous" brand touch.

## Components

### Buttons
- **Primary:** Solid fill using the active module's accent; 4px radius; font-weight 500.
- **Ghost:** No border or fill; only appears on hover. Used for inline utilities like "Add Row" or "Clear Search."
- **Floating Timer:** A prominent pill-shaped button at the bottom-right, using a vibrant royal blue and a monospace timer font.

### Inputs & Fields
- **Operational Inputs:** 32px height; 1px border; white background. On focus, use a 2px blue ring with 0 offset.
- **Embedded Editor:** Title fields in modals should be borderless with an increased font size (15px) to allow for "in-place" editing that feels like a document.

### Badges & Scope Pills
- **Status Badges:** Small 2px radius; light-tinted backgrounds; uppercase `badge-caps` typography.
- **Interactive Badges:** When clicked, these should trigger a small dropdown to change status (e.g., "Open" to "Done") without navigating away.

### Task Rows
- **Layout:** Use a flex container with a fixed left margin for checkboxes or status icons. 
- **Time Spans:** In timeline views, "Planned" tasks use dashed outlines, while "Fact/Actual" tasks use solid module-colored fills.

### Navigation Components
- **Module Rail:** A fixed 18px strip on the far edge that reveals a capsule-shaped "thumb" on hover for quick module switching.
- **App Header:** A 3-column layout featuring a capsule search bar in the center with a 50% transparent white background.