---
name: Enterprise Approval System
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#5f3f3b'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#946e69'
  outline-variant: '#e9bcb6'
  surface-tint: '#c0000d'
  primary: '#b7000c'
  on-primary: '#ffffff'
  primary-container: '#e60012'
  on-primary-container: '#fff7f6'
  inverse-primary: '#ffb4aa'
  secondary: '#5c5e65'
  on-secondary: '#ffffff'
  secondary-container: '#dedfe7'
  on-secondary-container: '#606369'
  tertiary: '#006370'
  on-tertiary: '#ffffff'
  tertiary-container: '#007e8e'
  on-tertiary-container: '#ecfcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad5'
  primary-fixed-dim: '#ffb4aa'
  on-primary-fixed: '#410001'
  on-primary-fixed-variant: '#930007'
  secondary-fixed: '#e1e2ea'
  secondary-fixed-dim: '#c4c6ce'
  on-secondary-fixed: '#191c21'
  on-secondary-fixed-variant: '#44474d'
  tertiary-fixed: '#9eefff'
  tertiary-fixed-dim: '#77d4e5'
  on-tertiary-fixed: '#001f24'
  on-tertiary-fixed-variant: '#004e59'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  headline-lg:
    fontFamily: IBM Plex Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: IBM Plex Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: IBM Plex Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: IBM Plex Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  title-md:
    fontFamily: IBM Plex Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: IBM Plex Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: IBM Plex Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.06em
  code-num:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system delivers an executive-grade, high-integrity governance and corporate approval interface inspired by heavy industrial precision and structured corporate hierarchies. Built to serve plant directors, procurement managers, technical leads, and C-level signatories, the interface projects unquestionable institutional trust, technical rigor, and zero-ambiguity workflow clarity.

The visual style blends **Corporate / Modern** precision with **High-Contrast Industrial Geometry**. Drawing direct heritage from heavy manufacturing presentation documents, it balances clean administrative air with deliberate structural weight: solid dark slate grounding bars, precise hairline separators, purposeful geometric accents, and authoritative signal points. Visual density is compact, prioritizing scanability across nested tabular ledgers, verification histories, multitenant status gates, and auditable signing flows.

## Colors

The color system establishes clear hierarchy between structural layout, transactional workflows, and executive action points:

- **Primary Brand Red (`#E60012`)**: Reserved for decisive interaction points: primary submission triggers, irreversible sign-off decisions, urgent priority tags, and brand anchor badges. It is deliberately rationed to maintain visual urgency and punch.
- **Secondary Slate Gray (`#2B2E34`) & Industrial Charcoal (`#3E444D`)**: Forms the corporate spine. Used for executive mastheads, primary table headers, sidebars, and structural chrome.
- **Tertiary Industrial Teal (`#208B9B`) & Deep Steel Blue (`#3F5268`)**: Serves as technical metadata anchors, secondary interaction points, batch operation tabs, and department routing chips.
- **Warm Amber Accent (`#E88D14` / `#F5A623`)**: Strictly deployed for pending items, review bottlenecks, and pre-sign verification alerts.
- **Approval Green (`#16A34A`)**: Used exclusively for verified status checkpoints, formal approvals, and successful ledger seals.
- **Neutral Canvas (`#F8FAFC` background, `#FFFFFF` surfaces, `#E2E8F0` borders)**: Crisp, low-fatigue backdrop designed for prolonged operational use and dense data scanning.

## Typography

Typography centers on **IBM Plex Sans**, an industrial-grade grotesque engineered for enterprise systems, mechanical documentation, and high-density screens. Its upright geometry, open counters, and unmistakable distinction between `0`, `O`, `1`, `l`, and `I` prevent catastrophic misreadings in financial quantities and engineering part numbers.

Monospaced numbers and approval codes utilize **JetBrains Mono** within table columns, audit hashes, date stamps, and document tracking IDs to preserve columnar alignment across large tabular records.

All uppercase labels maintain subtle positive tracking (`+0.04em` to `+0.06em`) for rapid visual tagging in approval queues.

## Layout & Spacing

The layout is built upon an enterprise **Fluid 12-Column Grid** with high structural density. Screen utility maximizes real estate without visual noise:

- **Desktop (>= 1280px)**: 12 columns, 24px gutters, 32px outer canvas margins. Features an asymmetrical executive layout: a persistent left vertical command rail (64px collapsed, 240px expanded), an 8-column primary review and workflow canvas, and a 4-column audit/signature rail.
- **Tablet (768px - 1279px)**: 8 columns, 16px gutters, 20px outer margin. Sidebars collapse into docked horizontal toolbars; approval side-drawers transition to slide-over panels.
- **Mobile (< 768px)**: 4 columns, 12px gutters, 16px outer margin. Tables transform into structured stacked cards; primary approval actions dock persistently along the viewport footer.

Rhythm is compact (`0.25rem` to `1.25rem` intervals) to allow enterprise operators to compare line items, ledger totals, and historical sign-offs in one glance without scrolling.

## Elevation & Depth

Visual depth avoids decorative or floaty effects, relying on **Tonal Surface Layering** and **Low-Contrast Structural Hairlines**:

- **Ground (Base Surface)**: `#F8FAFC`, presenting zero elevation for outer application scaffolding.
- **Level 1 (Panels & Tables)**: `#FFFFFF` framed with a crisp `1px solid #E2E8F0` border. No drop shadow; spatial division is purely tonal and structural.
- **Level 2 (Active Cards & Dropdowns)**: Elevated by `0 1px 3px 0 rgba(43, 46, 52, 0.08), 0 1px 2px -1px rgba(43, 46, 52, 0.04)` with a `1px solid #CBD5E1` boundary.
- **Level 3 (Modals & Sticky Action Strips)**: Anchored by `0 8px 24px -4px rgba(43, 46, 52, 0.16)` with a 3px corporate accent band along the top edge (Primary Red `#E60012` or Slate `#2B2E34`).

## Shapes

Shapes reflect precision engineering and manufacturing rigor through a **Soft (Level 1)** geometric standard:

- Base controls, text inputs, table row highlights, and standard buttons utilize a compact `0.25rem` (4px) corner radius.
- Cards, ledger containers, and modal dialogs use `0.375rem` (6px) corners.
- Micro-elements such as approval state tags and numeric badges use `0.125rem` (2px) to preserve crisp rectangular containment.
- Strictly avoid high-radius pill buttons or circular bubbles; all components must retain an architectural, deliberate structural silhouette.

## Components

### Buttons
- **Primary Approval**: Solid Kawasaki Red `#E60012`, high-contrast white text, 4px radius, medium weight. Subtle active state `#C4000F`.
- **Secondary Action (Sign / Review)**: Dark Slate `#2B2E34`, white text, 1px border.
- **Tertiary / Neutral**: White background `#FFFFFF`, 1px solid border `#CBD5E1`, text `#3E444D`.
- **Destructive / Reject**: Outlined or solid muted crimson `#DC2626` with red border `#F87171`.

### Status Badges & Approval States
Constructed with 2px corner radius, uppercase `label-sm` font, with a solid 3px left-accent border:
- **Draft**: Background `#F1F5F9`, border `#94A3B8`, text `#475569`.
- **Pending Review**: Background `#FEF3C7`, border `#E88D14`, text `#92400E`.
- **Approved**: Background `#DCFCE7`, border `#16A34A`, text `#14532D`.
- **Rejected**: Background `#FEE2E2`, border `#E60012`, text `#991B1B`.
- **Revision Required**: Background `#E0F2FE`, border `#208B9B`, text `#075985`.

### Input Fields & Selects
- Height: 36px compact enterprise standard.
- Surface: `#FFFFFF` with `1px solid #CBD5E1`.
- Focus state: `1px solid #2B2E34` paired with an offset halo ring `0 0 0 2px rgba(230, 0, 18, 0.20)`.

### Tables & Data Grids
- Header row: `#2B2E34` slate background with `#FFFFFF` or `#F1F5F9` text in `label-sm` uppercase.
- Alternating stripes: Subtle `#F8FAFC` zebra row fills with `1px solid #E2E8F0` cell borders.
- Monospaced digits (`code-num`) for quantities, currency, dates, and ID codes.

### Approval Step Progress Bar
Horizontal pipeline featuring chevron step indicators. Active stage highlighted in Deep Steel Blue `#3F5268` or Teal `#208B9B`, completed steps in Approved Green `#16A34A` with check indicators, and pending blocks in `#E2E8F0`.

### Cards
- Clean white tile with `1px solid #E2E8F0`.
- Includes an optional 3px top edge border in Primary Red or Teal to distinguish executive priority cards.