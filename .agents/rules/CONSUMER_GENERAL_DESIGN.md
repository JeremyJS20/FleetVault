# Design System: Neo-Minimalist Liquid Glass

## 1. Visual Theme & Atmosphere

The design language is **immersive, consumer-grade, and dual-themed** — establishing an authoritative "Modern Consumer Space" presence — supporting both a deep-navy dark mode and a clean, clinical light mode. The brand identity draws from THE APP's signature palette: deep navy anchors authority, while cyan-to-teal gradients evoke digital trust and technological precision.

**Dark Mode:** A deep-space navy void punctuated by glassmorphic surfaces and cyan-tinted luminescence. Subtle radial gradients bleed from the canvas edges — a faint cyan aurora at the top and a whisper of teal at the bottom — preventing the dark background from feeling lifeless while keeping focus on content.

**Light Mode:** A bright, airy canvas with soft grey undertones, where glass surfaces become frosted white panels with subtle shadows instead of glows. The cyan/teal accents remain vibrant against the light backdrop, and navy text grounds the hierarchy with authority.

Every surface floats with frosted-glass translucency (dark) or soft elevation shadows (light), reinforced by precise borders. The density is **focused and minimal** — generous whitespace, consistent spacing, and a clear visual hierarchy that channels attention.

The aesthetic philosophy: **"The Modern Consumer Space — sleek, architectural, universal consumer neo-minimalism."**

The UI embraces neo-minimalist liquid glass, using massive squircle border-radii, sleek transitions, and heavy drop shadows to create a elegant, premium feel.

## 2. Theme Architecture

Themes are implemented via CSS custom properties on the `:root` selector, toggled by a `data-theme` attribute on `<html>`:

```html
<html data-theme="light">  <!-- or "dark" -->
```

**Default:** Light mode. Dark mode activates via `[data-theme="dark"]` override block.

**System preference detection:** On first load, respect `prefers-color-scheme: dark` media query. Persist user's manual choice in `localStorage`.

```css
:root { /* light theme tokens */ }

[data-theme="dark"] { /* dark theme overrides */ }

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* dark theme overrides */ }
}
```

**Theme Toggle:** A minimal icon button (sun/moon) positioned in the top-right corner of the glass card header, using Ghost button styling.

> **Optional — Tailwind CSS Integration:** If your project architecture supports Tailwind CSS 4, the design tokens defined in this document can be bridged into Tailwind's utility system via `@theme`. See **Section 13: Tailwind CSS 4 Integration** for the full mapping strategy, critical gotchas, and component class conventions. All Tailwind-specific guidance in this document is **optional** and does not alter the core design system — projects using vanilla CSS custom properties remain fully compliant.

## 3. Color Palette & Roles

### Brand Colors (Theme-Invariant)

These core THE APP brand colors remain constant across both themes:

| Descriptive Name | Hex | Functional Role |
|---|---|---|
| The Consumer App Navy | `#1B2A4A` | Brand anchor — logo, key headings in light mode |
| Deep Teal | `#0D6B7A` | Upper gradient terminus, deep accent |
| Medium Teal | `#0E8E9A` | Primary CTA gradient end, success glow source |
| Bright Cyan | `#00B4D8` | Primary accent — CTAs, success states, active indicators |
| Light Cyan | `#48CAE4` | Highlight accents, informational states, secondary glow |

### Surfaces — Dark Theme

| Token | Value | Functional Role |
|---|---|---|
| `--surface-base` | `#0B0F19` | Base canvas — Matte Slate |
| `--surface-card` | `rgba(255, 255, 255, 0.05)` | Primary card background with 5% opacity for liquid glass effect |
| `--surface-elevated` | `rgba(27, 42, 74, 0.50)` | Elevated interactive surfaces (focused inputs, hovered ghosts) |
| `--surface-inset` | `rgba(255, 255, 255, 0.04)` | Subtle glass tint for inset containers, inputs, ghost buttons |
| `--surface-border` | `rgba(255, 255, 255, 0.10)` | Razor-thin 0.5px border with a subtle white-translucent tone |
| `--surface-overlay` | `rgba(5, 10, 25, 0.85)` | Modal overlay |

### Surfaces — Light Theme

| Token | Value | Functional Role |
|---|---|---|
| `--surface-base` | `#F0F4F8` | Base canvas — Soft Cool Grey |
| `--surface-card` | `rgba(255, 255, 255, 0.82)` | Primary card background with 82% opacity for legible frosted-glass panels in light mode |
| `--surface-elevated` | `rgba(255, 255, 255, 0.92)` | Elevated interactive surfaces |
| `--surface-inset` | `rgba(27, 42, 74, 0.06)` | Subtle navy tint for inset containers |
| `--surface-border` | `rgba(27, 42, 74, 0.12)` | Razor-thin border with a subtle transparent navy tone for clean outlines |
| `--surface-overlay` | `rgba(27, 42, 74, 0.60)` | Modal overlay — navy wash |

### Accent Colors (Semantic — Both Themes)

| Token | Dark Value | Light Value | Functional Role |
|---|---|---|---|
| `--accent-primary` | `#00B4D8` | `#0E8E9A` | Primary CTA, success, active states |
| `--accent-primary-end` | `#0E8E9A` | `#0D6B7A` | Gradient terminus for primary buttons |
| `--accent-primary-dim` | `rgba(0, 180, 216, 0.12)` | `rgba(14, 142, 154, 0.10)` | Tinted backgrounds |
| `--accent-primary-glow` | `rgba(0, 180, 216, 0.25)` | `rgba(14, 142, 154, 0.15)` | Faint translucent drop shadow color |
| `--accent-warning` | `#FBBF24` | `#F59E0B` | Warning states, manual review needed |
| `--accent-warning-end` | `#F59E0B` | `#D97706` | Warning gradient end |
| `--accent-warning-dim` | `rgba(251, 191, 36, 0.12)` | `rgba(245, 158, 11, 0.10)` | Warning tinted backgrounds |
| `--accent-warning-glow` | `rgba(251, 191, 36, 0.25)` | `rgba(245, 158, 11, 0.15)` | Warning faint shadow |
| `--accent-error` | `#F87171` | `#EF4444` | Error states, rejection, failed verification |
| `--accent-error-end` | `#EF4444` | `#DC2626` | Error gradient end |
| `--accent-error-dim` | `rgba(248, 113, 113, 0.12)` | `rgba(239, 68, 68, 0.10)` | Error tinted backgrounds |
| `--accent-error-glow` | `rgba(248, 113, 113, 0.25)` | `rgba(239, 68, 68, 0.15)` | Error faint shadow |
| `--accent-info` | `#48CAE4` | `#0D6B7A` | Informational states, loading spinners |
| `--accent-muted` | `#9CA3AF` | `#6B7280` | Muted/expired states, deactivated elements |

### Text Colors

| Token | Dark Value | Light Value | Functional Role |
|---|---|---|---|
| `--text-primary` | `#F9FAFB` | `#1B2A4A` | Headlines, values, body copy |
| `--text-secondary` | `#9CA3AF` | `#4B5563` | Subheadlines, labels, descriptions |
| `--text-tertiary` | `#6B7280` | `#9CA3AF` | Fine print, metadata labels, timestamps |
| `--text-inverse` | `#0B0F19` | `#FFFFFF` | Text on bright CTA buttons |
| `--text-on-accent` | `#0B0F19` | `#FFFFFF` | Text on accent-colored elements |

## 4. Typography Rules

**Display/Header Font:** Satoshi — a premium geometric/neo-grotesque sans-serif. Used for displays, headers, headlines and key display elements. Falls back to `system-ui → -apple-system → sans-serif`.

**Body/Paragraph/Inputs Font:** Satoshi — a premium geometric/neo-grotesque sans-serif. Used for body, paragraphs, labels, and inputs. Falls back to `system-ui → -apple-system → sans-serif`.

**Technical/Metadata/Instrument-Cluster Font:** JetBrains Mono (fallback: Fira Code → ui-monospace) — reserved exclusively for metrics, numbers, technical data values (session IDs, scores, raw JSON, metadata, and instrument-cluster indicators).

| Role | Font Family | Size | Weight | Letter Spacing | Line Height |
|---|---|---|---|---|---|
| Headline (h1) | Satoshi | 1.625rem (26px) | 700 (Bold) | -0.02em (tight) | 1.25 |
| Subheadline | Satoshi | 0.9375rem (15px) | 400 (Regular) | Normal | 1.6 |
| Section Headers | Satoshi | 0.8125rem (13px) | 500-700 | 0.06-0.08em (wide) | Normal |
| Body / Labels | Satoshi | 0.8125rem (13px) | 500 | 0.02em | Normal |
| Data Values (mono) | JetBrains Mono | 0.75rem (12px) | 400 | Normal | Normal |
| Micro Labels | Satoshi | 0.6875rem (11px) | 700 | 0.08em (very wide) | Normal |

Section headers and micro labels use `text-transform: uppercase` with generous letter-spacing, creating a "military briefing" quality that reinforces the security / verification theme.

**Responsive scaling:** Headlines shrink to 1.375rem (22px) below 480px viewport width.

## 5. Component Stylings

### Theme Toggle

* **Placement:** Top-right of the glass card, or in a fixed utility bar.
* **Style:** Ghost button, 36px square, centered sun (☀️) or moon (🌙) icon. In light mode shows moon icon (switch to dark); in dark mode shows sun icon (switch to light).
* **Transition:** `background-color 200ms ease, color 200ms ease`.
* **Behavior:** Toggles `data-theme` on `<html>`, persists to `localStorage`.

### Buttons

* **Primary (`.btn-primary`):** Oversized, tactile dimensions (minimum 64px height) with massive squircle corners (16px radius). Background is a 135° diagonal gradient from `--accent-primary` to `--accent-primary-end`. Text uses `--text-on-accent`. Surrounded by a faint translucent drop shadow. On hover, shadow deepens slightly and button lifts 1px. On press, it exhibits a smooth, subtle response, scaling down slightly (0.99x) with linear-decelerating easing. In **light mode**, glow is subtler and replaced with a soft drop shadow for natural elevation.
* **Primary Variants:** `.warning` swaps to warning gradient, `.error` to error gradient — each with matching faint drop shadow colors. Error and warning variants in light mode use `--text-on-accent`.
* **Secondary (`.btn-secondary`):** Fully transparent background. `--text-secondary` that brightens to `--text-primary` on hover. Smaller padding (10px 20px), medium weight (500). No glow, no border.
* **Ghost (`.btn-ghost`):** `--surface-inset` background with `--surface-border` border. `--text-secondary` text, small size (13px). On hover, elevates to `--surface-elevated` with brightened text.
* **Full Width:** `.full-width` modifier stretches any button to 100% container width.

### Cards / Containers

* **Security Badges:** Exceptionally soft, sleek corners (16px radius) utilizing rich Glassmorphism (4-6% backdrop fill with a heavy 24px blur). Inner icons sit in contrasting pristine white containers.
* **Glass Card (`.glass-card`):** `--surface-card` background with backdrop blur. In **dark mode**: 24px backdrop blur, `--surface-border` border, and a `::before` pseudo-element drawing a luminous gradient across the top edge (transparent → white 8% → transparent). In **light mode**: 24px backdrop blur, `--surface-border` border, plus an elevated dual-layer `box-shadow: 0 20px 48px -12px rgba(27, 42, 74, 0.16), 0 8px 16px -8px rgba(27, 42, 74, 0.08)` for natural elevation and clear contrast. No luminous top edge in light mode. Generously rounded corners (16px radius). 32px internal padding.
* **Inset Panels:** `--surface-inset` background with `--surface-border` border. 12-16px radius.
* **Reason Banner (`.reason-banner`):** Uses `--accent-error-dim` background with `--accent-error` at 20% opacity border.

### Inputs / Forms

* **Text Input:** `--surface-inset` background, `--surface-border` border, 12px radius. On focus: border transitions to `--accent-primary` at 40% opacity, gains a 3px ring using `--accent-primary-glow`, and background deepens to `--surface-elevated`. Placeholder text in `--text-tertiary`. Smooth transition (350ms, custom ease-out).

### Status Icons

* **Icon Wrapper (`.status-icon-wrapper`):** 80px circular container (68px on mobile). Background uses `--accent-*-dim`. In **dark mode**, surrounded by a faint translucent drop shadow. In **light mode**, faint translucent drop shadows are used matching the accent. Enters with linear-decelerating animation (`scaleIn`, 0.5s). The success variant adds an animated pulse ring — a 2px cyan border circle that expands to 140% and fades out every 2 seconds.

### Trust Meter

* **Track:** 6px tall rounded bar, `--surface-inset` background.
* **Fill:** Gradient-filled bar (`--accent-primary` → `--accent-primary-end`) with matching faint drop shadow. Animates width from 0 to target over 1.2s.
* **Label:** Inline-flex badge with `--accent-primary-dim` background and `--accent-primary` text.

### Modals

* **Overlay:** `--surface-overlay` with 8px backdrop blur.
* **Content:** Max 480px, linear-decelerating entry animation. `--surface-card` background.
* **Close Button:** 40px circular, `--surface-inset` background with `--surface-border` border.

### Toast

* Fixed to bottom center. `--surface-elevated` background, `--surface-border` border. Linear-decelerating slide-up entry. 2.2s auto-dismiss.

### Spinner

* **Double-ring design:** Outer ring 64px, 3px border — mostly transparent with solid `--accent-info` top segment. Rotates clockwise 1s/rev. Inner ring counter-clockwise 1.5s/rev.
* **Shimmer Bar:** 240px × 4px with `--accent-info` gradient sweep, 1.5s infinite.

### Navbar / Top Bar

* **Container (`.navbar`):** Fixed to top, full width, 56px height. `--surface-card` background with backdrop blur matching the card glass effect. Bottom border using `--surface-border`. `z-index: 1000`.
* **Inner layout:** Flexbox row, `justify-content: space-between`, `align-items: center`. Horizontal padding `--space-lg`.
* **Logo area (`.navbar-brand`):** Left-aligned. Logo image max-height 32px. Brand text in `--text-primary`, weight 700, size 1.125rem.
* **Nav links (`.navbar-nav`):** Centered or right-aligned group. Each `.nav-link` uses `--text-secondary`, weight 500, size 0.8125rem. On hover: `--text-primary`. Active state (`.nav-link.active`): `--accent-primary` text with a 2px bottom border in `--accent-primary`. Transition 200ms.
* **Actions area (`.navbar-actions`):** Right-aligned group for theme toggle, notifications, and user avatar. Gap `--space-sm`.
* **Mobile:** Below 768px, nav links collapse into a hamburger menu (`.navbar-toggler`). Ghost button style, 40px square. Expanded menu slides down with `fadeSlideUp` animation over `--surface-card` background.
* **Dark mode:** Top-edge `::before` luminous gradient (same as glass card). **Light mode:** Soft bottom shadow `box-shadow: 0 1px 8px rgba(27, 42, 74, 0.06)`.

### Side Navigation

* **Container (`.sidenav`):** Fixed left, full height minus navbar (top: 56px). Width 240px (collapsed: 64px). `--surface-card` background with backdrop blur. Right border using `--surface-border`. Transition width 300ms with custom ease-out.
* **Nav items (`.sidenav-item`):** Flexbox row, `align-items: center`. Padding `12px --space-md`. Gap `--space-sm`. Border-radius 8px. Margin `2px --space-xs`.
* **Icon:** 20px, `--text-tertiary`. **Label:** 0.8125rem, weight 500, `--text-secondary`.
* **Hover:** Background `--surface-inset`, icon and label brighten to `--text-primary`.
* **Active (`.sidenav-item.active`):** Background `--accent-primary-dim`, icon and label use `--accent-primary`. Left edge 3px solid `--accent-primary` bar (border-radius 0 4px 4px 0).
* **Section divider (`.sidenav-section`):** Uppercase micro label (`--text-tertiary`, 0.6875rem, weight 700, letter-spacing 0.08em) with `--space-md` top margin. Hidden when collapsed.
* **Collapse toggle (`.sidenav-toggle`):** Bottom-positioned ghost button. Chevron icon rotates 180° on collapse. Tooltip shows label on hover when collapsed.
* **Collapsed state:** Icons only, centered. Tooltips appear on hover showing label text. Active indicator becomes a 3px left bar only.
* **Mobile:** Overlay mode — slides in from left over `--surface-overlay` backdrop. Close button top-right.

### Tables / Data Tables

* **Container (`.table-container`):** `--surface-card` background, `--surface-border` border, 16px radius. Overflow hidden. In **light mode**: soft box-shadow. In **dark mode**: glass blur.
* **Header row (`.table thead`):** `--surface-inset` background. Uppercase micro labels for column headers (`--text-tertiary`, 0.6875rem, weight 700, letter-spacing 0.08em). Padding `12px --space-md`. Bottom border `--surface-border`.
* **Body rows (`.table tbody tr`):** Padding `14px --space-md`. Bottom border `--surface-border` (last row: none). Transition background 150ms.
* **Hover:** Background `--surface-inset`.
* **Selected (`.table-row-selected`):** Background `--accent-primary-dim`, left 3px solid `--accent-primary` border.
* **Striped variant (`.table-striped`):** Even rows get `--surface-inset` at 50% intensity.
* **Cell text:** Body size (0.8125rem, weight 500). Numeric/ID columns use monospace font.
* **Sortable headers:** Clickable, `cursor: pointer`. Sort arrow icon (`--text-tertiary`) appears on hover. Active sort: icon uses `--accent-primary`.
* **Empty state:** Centered in table body, uses Empty State component (see below).
* **Responsive:** Below 768px, horizontal scroll with fade gradient on overflow edges.

### Tabs

* **Tab bar (`.tab-bar`):** Flexbox row, `--surface-inset` background, `--surface-border` border, 12px radius, padding 4px. Gap 2px.
* **Tab item (`.tab-item`):** Padding `8px --space-md`. Border-radius 8px. `--text-secondary`, weight 500, size 0.8125rem. Transition 200ms.
* **Hover:** `--text-primary`, background `--surface-elevated` at 50%.
* **Active (`.tab-item.active`):** `--surface-card` background, `--text-primary` text. In **dark mode**: subtle faint drop shadow. In **light mode**: soft drop shadow. Weight 600.
* **Tab indicator variant (`.tab-bar-underline`):** No background container. Items separated by gap. Active state: no background fill, instead a 2px bottom border in `--accent-primary` with `fadeSlideUp` micro-animation on indicator.
* **Badge on tab:** Small badge (see Badges) positioned top-right of tab label for notification counts.

### Badges / Tags

* **Base (`.badge`):** Inline-flex, centered. Padding `4px 10px`. Border-radius 20px (pill). Size 0.6875rem, weight 600. Letter-spacing 0.02em.
* **Variants:**
  * `.badge-primary`: `--accent-primary-dim` background, `--accent-primary` text.
  * `.badge-warning`: `--accent-warning-dim` background, `--accent-warning` text (dark) / darker warning text (light).
  * `.badge-error`: `--accent-error-dim` background, `--accent-error` text.
  * `.badge-info`: Uses `--accent-info` equivalents.
  * `.badge-muted`: `--surface-inset` background, `--text-tertiary` text.
* **Dot indicator (`.badge-dot`):** 8px circle, no text. Positioned absolute top-right of parent. Solid `--accent-primary` fill. Optional pulse animation.
* **Count badge (`.badge-count`):** Minimum width 20px, centered text. Used on navbar icons and tab labels.

### Breadcrumbs

* **Container (`.breadcrumbs`):** Flexbox row, `align-items: center`, gap `--space-xs`. Padding `--space-sm 0`.
* **Item (`.breadcrumb-item`):** `--text-tertiary`, size 0.75rem, weight 500. On hover: `--text-secondary`.
* **Separator:** Chevron-right icon or `/` character, `--text-tertiary` at 50% opacity, size 0.625rem.
* **Current (`.breadcrumb-item.active`):** `--text-primary`, weight 600. No hover effect, `cursor: default`.

### Avatar & User Menu

* **Avatar (`.avatar`):** Circular image container. Sizes: `sm` 28px, `md` 36px, `lg` 48px. `--surface-border` 2px ring. Object-fit cover.
* **Initials fallback:** `--accent-primary-dim` background, `--accent-primary` text, weight 700. Font size proportional to container.
* **Status dot:** 10px circle, absolute bottom-right. Online: `--accent-primary`. Away: `--accent-warning`. Offline: `--accent-muted`. 2px `--surface-card` ring.
* **User menu (`.user-menu`):** Triggered by avatar click. Dropdown panel (see Dropdowns) with 200px min-width. Header shows avatar `lg` + name (`--text-primary`, weight 600) + email/role (`--text-tertiary`, 0.75rem). Divider. Menu items follow sidenav item style.

### Dropdowns / Select Menus

* **Trigger:** Ghost button or input-style element with chevron-down icon. Chevron rotates 180° when open.
* **Panel (`.dropdown-panel`):** `--surface-card` background with backdrop blur. `--surface-border` border. 12px radius. Box-shadow: faint translucent drop shadows in both modes. `z-index: 1001`. Max-height 280px, overflow-y auto. Enters with `scaleIn` from top (transform-origin: top center), 150ms.
* **Items (`.dropdown-item`):** Padding `10px --space-md`. `--text-secondary`, weight 500, size 0.8125rem. Transition 150ms.
* **Hover:** Background `--surface-inset`, text `--text-primary`.
* **Active/Selected (`.dropdown-item.active`):** `--accent-primary-dim` background, `--accent-primary` text. Checkmark icon right-aligned.
* **Divider (`.dropdown-divider`):** 1px `--surface-border`, margin `4px 0`.
* **Grouped:** Section headers as uppercase micro labels (`--text-tertiary`) within the panel.

### Pagination

* **Container (`.pagination`):** Flexbox row, `align-items: center`, gap `--space-xs`.
* **Page button (`.page-btn`):** 36px square, 8px radius. `--text-secondary`, weight 500, size 0.8125rem. Background transparent. Transition 150ms.
* **Hover:** Background `--surface-inset`.
* **Active (`.page-btn.active`):** `--accent-primary` background, `--text-on-accent` text. In **dark mode**: subtle glow. In **light mode**: soft shadow.
* **Prev/Next arrows:** Ghost button style with chevron icons. Disabled state: `--text-tertiary` at 40% opacity, `cursor: not-allowed`.
* **Ellipsis:** `--text-tertiary`, no hover effect.
* **Info text:** "Page X of Y" right-aligned, `--text-tertiary`, size 0.75rem.

### Tooltips

* **Container (`.tooltip`):** `--surface-elevated` background (dark) / `--text-primary` background with `--text-inverse` text (light). `--surface-border` border (dark only). 8px radius. Padding `6px 12px`. Size 0.75rem, weight 500. Max-width 240px. Box-shadow matches dropdown panel. `z-index: 1002`.
* **Arrow:** 6px CSS triangle matching background color, centered on the triggering edge.
* **Entry:** `fadeSlideUp` micro-animation (100ms, 4px translate). 200ms delay before appearing.
* **Placement:** Top (default), bottom, left, right. Auto-repositions on viewport collision.

### Alerts / Banners

* **Container (`.alert`):** Full-width within parent. Padding `--space-md`. Border-radius 12px. Border-left 4px solid accent color. Flexbox row, gap `--space-sm`.
* **Variants:**
  * `.alert-info`: `--accent-info` dim background, info accent left border. Info icon.
  * `.alert-warning`: `--accent-warning-dim` background, warning accent left border. Warning icon.
  * `.alert-error`: `--accent-error-dim` background, error accent left border. Error icon.
  * `.alert-success`: `--accent-primary-dim` background, primary accent left border. Checkmark icon.
* **Icon:** 20px, matching accent color. Flex-shrink 0.
* **Content:** Title in `--text-primary` (weight 600, size 0.8125rem). Description in `--text-secondary` (weight 400). Optional action link in `--accent-primary`.
* **Dismissible:** Close button (×) top-right, ghost button style. `fadeSlideUp` reverse on dismiss.

### Dividers

* **Horizontal (`.divider`):** 1px `--surface-border`. Margin `--space-md 0`.
* **With label (`.divider-label`):** `--surface-border` lines on both sides of centered text. Label: `--text-tertiary`, size 0.6875rem, weight 600, uppercase, letter-spacing 0.06em. `--surface-base` background padding `0 --space-sm` to break the line.
* **Vertical (`.divider-vertical`):** 1px width, `--surface-border`. Self-stretch in flexbox contexts.
* **Dashed variant (`.divider-dashed`):** `border-style: dashed` instead of solid.

### Search Bar

* **Container (`.search-bar`):** Flexbox row, `align-items: center`. `--surface-inset` background, `--surface-border` border, 12px radius. Padding `8px --space-md`. Gap `--space-xs`. Transition 250ms.
* **Search icon:** 18px, `--text-tertiary`. Flex-shrink 0.
* **Input:** No border, no background, flex-grow 1. `--text-primary` text. Placeholder in `--text-tertiary`. Size 0.8125rem.
* **Focus state:** Container border transitions to `--accent-primary` at 40% opacity, gains `--accent-primary-glow` ring. Search icon brightens to `--text-secondary`.
* **Clear button:** Appears when input has value. 18px × icon, ghost button style. Fade-in 150ms.
* **Search suggestions:** Dropdown panel directly below, matching dropdown panel styling. Highlights matching characters in `--accent-primary`.

### Empty State

* **Container (`.empty-state`):** Centered layout, padding `--space-2xl`. Max-width 320px margin auto.
* **Illustration:** 120px × 120px area. Uses a subtle line illustration or icon in `--text-tertiary` at 30% opacity. 
* **Title:** `--text-secondary`, weight 600, size 0.9375rem. Margin-top `--space-md`.
* **Description:** `--text-tertiary`, weight 400, size 0.8125rem, line-height 1.6. Margin-top `--space-xs`.
* **Action:** Optional primary or ghost button centered below description. Margin-top `--space-md`.

### Skeleton Loader

* **Base (`.skeleton`):** `--surface-inset` background, border-radius 8px. Overflow hidden. Position relative.
* **Shimmer:** `::after` pseudo-element, absolute fill. Background: linear gradient 90° — transparent, `--surface-elevated` at 40%, transparent. Width 200%. Animates `translateX(-100% → 100%)` over 1.5s infinite.
* **Variants:** `.skeleton-text` (16px height, full width, 4px radius), `.skeleton-avatar` (40px circle), `.skeleton-button` (36px height, 120px width, 12px radius), `.skeleton-card` (full width, 200px height, 16px radius).
* **Stagger:** Multiple skeletons within a group use `.stagger-1` through `.stagger-4` for sequential shimmer effect.

## 6. Layout Principles

**The "Physical Object" Rule:** Elements should look like physical plastic or silicone. Use wide, soft drop shadows instead of harsh borders to delineate depth. When a border is legally/accessibly required, use a "Ghost Border" (10% opacity).

**Architectural Asymmetry:** Use asymmetrical margins and vast whitespace gaps (8px to 16px between elements) to create an uncluttered, editorial feel.

**Centering Strategy:** Flexbox centering on `body` and root container. Content flows within a constrained max-width container centered horizontally.

**Max Width:** Varies by context — `480px` for focused flows (forms, onboarding), `768px` for content pages, `1200px` for dashboards with sidenav. Always centered with auto margins.

**Spacing Scale (8px base):**

| Token | Value | Usage |
|---|---|---|
| `--space-xs` | 4px | Micro gaps, inner label margins |
| `--space-sm` | 8px | Button gaps, row padding, tight spacing |
| `--space-md` | 16px | Section margins, inset panel padding, standard gaps |
| `--space-lg` | 24px | Card padding, major section separations |
| `--space-xl` | 32px | Container padding, CTA group margins |
| `--space-2xl` | 48px | Large layout gaps (header to content) |

**Animation Philosophy:** Orchestrated stagger delays (0.1s increments via `.stagger-1` through `.stagger-4`). Two primary entrance animations:
- `fadeSlideUp` — fade in + translate 16px upward (0.5s, ease-out)
- `scaleIn` — fade in + scale from 70% (0.5s, linear-decelerating ease-out curve)

Custom easing: `cubic-bezier(0.16, 1, 0.3, 1)` for smooth deceleration, `cubic-bezier(0.16, 1, 0.3, 1)` for spring overshoot.

**Responsive Breakpoints:**

| Breakpoint | Width | Behavior |
|---|---|---|
| Mobile | ≤ 480px | Single column, reduced padding, collapsed sidenav, hamburger nav |
| Tablet | 481–768px | Condensed sidenav (64px), adjusted card padding |
| Desktop | 769–1200px | Full sidenav (240px), standard layout |
| Wide | > 1200px | Centered max-width container, generous margins |

**Whitespace Strategy:** Generous and deliberate. Spacer utility classes (`.spacer-sm` through `.spacer-xl`) create explicit vertical rhythm.

## 7. Theme-Specific Behavioral Differences

| Aspect | Dark Mode | Light Mode |
|---|---|---|
| Glass blur | 24px `backdrop-filter` | 24px `backdrop-filter` |
| Elevation | Faint translucent drop shadow | Soft `box-shadow` drop shadows |
| Card top highlight | `::before` gradient shine | None (shadows provide depth) |
| Accent glow intensity | None (no faint translucent drop shadows) | None (no faint translucent drop shadows) |
| CTA button text | Dark navy (`--text-on-accent`) | White (`--text-on-accent`) |
| Background gradient | Radial cyan aurora top, teal bottom over Matte Slate (#0B0F19) | Subtle radial `#E0F2FE` top over Soft Cool Grey (#F0F4F8) base |
| Status icon halo | Faint drop shadow | Drop shadow |
| Scrollbar | Thin, `--surface-elevated` thumb | Thin, `rgba(27,42,74,0.15)` thumb |

## 8. Iconography

**Icon Library:** Lucide Icons (or Heroicons) — consistent 24px grid, 1.5px stroke weight. Clean, geometric line style that pairs with the fintech aesthetic.

**Size Scale:**

| Token | Size | Usage |
|---|---|---|
| `--icon-xs` | 14px | Inline with micro labels, badge indicators |
| `--icon-sm` | 16px | Inside buttons, input adornments, breadcrumb separators |
| `--icon-md` | 20px | Sidenav items, table actions, alert icons |
| `--icon-lg` | 24px | Standalone actions, navbar icons, empty state |
| `--icon-xl` | 32px | Feature highlights, onboarding illustrations |
| `--icon-2xl` | 48px | Status icons, hero sections |

**Color:** Icons inherit text color from their parent by default (`currentColor`). Never use raw hex on icons — always a text or accent token.

**Interactive icons:** On hover, transition `color` and optional `transform: scale(1.05)` over 150ms. Active/pressed: `scale(0.95)`.

**Stroke consistency:** Always `stroke-width: 1.5` at 24px base. At `--icon-xs` and `--icon-sm`, use `stroke-width: 2` for legibility. Never use filled icons alongside outlined icons in the same context.

## 9. Border Radius Scale

| Token | Value | Usage |
|---|---|---|
| `--radius-xs` | 4px | Badges, small tags, inline code |
| `--radius-sm` | 8px | Buttons (ghost/secondary), table cells, nav items, dropdowns |
| `--radius-md` | 12px | Primary buttons, inputs, search bars, tabs, alerts |
| `--radius-lg` | 16px | Inset panels, table containers, modals |
| `--radius-xl` | 20px | Glass cards, main containers |
| `--radius-2xl` | 24px | Hero cards, feature sections |
| `--radius-full` | 9999px | Avatars, pill badges, dot indicators, circular buttons |

**Rule:** Never mix radius values within the same component. Nested elements should use equal or smaller radius than their parent.

## 10. Elevation & Shadow Scale

**Tonal Layering Depth:** Physical layers of fine paper instead of harsh shadows. Stack progressively lighter layers (Base -> Surface Low -> Surface Lowest) to simulate physical elevation and "soft lift" without visual noise.

### Light Mode Shadows

| Token | Value | Usage |
|---|---|---|
| `--shadow-xs` | `0 1px 2px rgba(27, 42, 74, 0.04)` | Subtle lift — badges, chips |
| `--shadow-sm` | `0 2px 8px rgba(27, 42, 74, 0.06)` | Slight elevation — nav items on hover, inputs |
| `--shadow-md` | `0 4px 16px rgba(27, 42, 74, 0.08)` | Standard cards, dropdown panels |
| `--shadow-lg` | `0 8px 32px rgba(255, 255, 255, 0.10)` | Modals, elevated cards, popovers |
| `--shadow-xl` | `0 16px 48px rgba(27, 42, 74, 0.12)` | Hero sections, overlay panels |

### Dark Mode Shadows (Glows)

| Token | Value | Usage |
|---|---|---|
| `--shadow-xs` | `0 1px 2px rgba(0, 0, 0, 0.15)` | Minimal glow — active indicators |
| `--shadow-sm` | `0 2px 8px rgba(0, 0, 0, 0.20)` | Slight halo — hovered elements |
| `--shadow-md` | `0 4px 16px rgba(0, 0, 0, 0.25)` | Standard card glow |
| `--shadow-lg` | `0 8px 32px rgba(0, 0, 0, 0.30)` | Modal glow, elevated surfaces |
| `--shadow-xl` | `0 16px 48px rgba(0, 0, 0, 0.35)` | Hero glow, focus state halos |

**Rule:** Use faint translucent drop shadows in both light and dark modes. Heavy colored faint translucent drop shadows are avoided. Transitioning between elevation levels should animate `box-shadow` over 200ms.

## 11. Z-Index Scale

| Token | Value | Usage |
|---|---|---|
| `--z-base` | 0 | Default document flow |
| `--z-dropdown` | 100 | Dropdowns, select menus, autocomplete |
| `--z-sticky` | 200 | Sticky table headers, pinned elements |
| `--z-sidenav` | 300 | Side navigation panel |
| `--z-navbar` | 1000 | Top navigation bar |
| `--z-modal-backdrop` | 1100 | Modal/dialog backdrop overlay |
| `--z-modal` | 1200 | Modal/dialog content |
| `--z-popover` | 1300 | Popovers, tooltips |
| `--z-toast` | 1400 | Toast notifications |
| `--z-max` | 9999 | Emergency overrides only |

**Rule:** Never use arbitrary z-index values. Always reference a token. If a new layer is needed, add it to the scale.

## 12. Accessibility

### Contrast Ratios

* All body text (`--text-primary`, `--text-secondary`) against surfaces must meet **WCAG AA** (4.5:1 minimum).
* Large text (≥ 18px bold or ≥ 24px regular) must meet 3:1 minimum.
* Interactive elements (`--accent-primary` on surfaces) must meet 3:1 minimum.
* `--text-tertiary` is exempt from AA for decorative/supplementary content only — never for actionable or essential text.

### Focus Indicators

* **Default focus ring:** `outline: 2px solid var(--accent-primary); outline-offset: 2px`. Visible on all interactive elements when navigated via keyboard.
* **Focus-visible only:** Use `:focus-visible` to show focus ring only on keyboard navigation, not mouse clicks. Fallback to `:focus` for browsers without support.
* **High contrast variant:** On dark surfaces, focus ring uses `--accent-primary` at full opacity. On light surfaces, uses `--accent-primary` with a 2px white outline-offset gap for visibility.
* **Never remove focus outlines.** Override `outline: none` only when providing a custom visible focus indicator.

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

* All decorative animations (shimmer, pulse, stagger) are suppressed.
* Functional transitions (dropdown open/close, theme toggle) remain but execute instantly.
* Spinner rotation is preserved (essential feedback).

### Touch Targets

* Minimum interactive area: **44px × 44px** (WCAG 2.5.5). Smaller visual elements (e.g., 36px ghost buttons) must have padding or `::after` pseudo-element expanding the tap area.
* Adjacent interactive elements must have ≥ 8px gap.

### Screen Reader Support

* All icons must have `aria-hidden="true"` when decorative, or an `aria-label` when actionable.
* Form inputs require visible `<label>` elements or `aria-label`.
* Dynamic content updates (toast, alerts, loading states) use `aria-live="polite"` or `role="status"`.
* Modals trap focus and return focus to trigger element on close.

## 13. Form States

### Input States

| State | Border | Background | Text | Additional |
|---|---|---|---|---|
| Default | `--surface-border` | `--surface-inset` | `--text-primary` | — |
| Hover | `--surface-border` at 150% | `--surface-inset` | `--text-primary` | Subtle brightness increase |
| Focus | `--accent-primary` 40% | `--surface-elevated` | `--text-primary` | 3px `--accent-primary-glow` ring |
| Filled | `--surface-border` | `--surface-inset` | `--text-primary` | Weight 500 |
| Disabled | `--surface-border` 50% | `--surface-inset` 50% | `--text-tertiary` | `cursor: not-allowed`, `opacity: 0.5` |
| Error | `--accent-error` 60% | `--accent-error-dim` | `--text-primary` | 3px `--accent-error-glow` ring |
| Success | `--accent-primary` 40% | `--accent-primary-dim` | `--text-primary` | Checkmark icon right-aligned |

### Validation Messages

* **Error message:** Below input, `--accent-error` text, size 0.75rem, weight 500. Appears with `fadeSlideUp` micro-animation (100ms, 4px). Prefixed with ⚠ icon.
* **Helper text:** Below input, `--text-tertiary`, size 0.75rem, weight 400. Always visible, does not animate.
* **Character count:** Right-aligned below textarea, `--text-tertiary`. Turns `--accent-warning` at 80% limit, `--accent-error` at 100%.

### Required Indicator

* Asterisk (*) after label text, `--accent-error` color, weight 400. Screen reader: `aria-required="true"` on input.

### Select / Dropdown States

* Follow input states above. Chevron icon rotates 180° on open. Selected option shows checkmark. Multi-select shows pills (badge style) inside input area.

### Checkbox & Radio

* **Box/Circle:** 18px, `--surface-inset` background, `--surface-border` 2px border. Border-radius: 4px (checkbox), 50% (radio).
* **Checked:** `--accent-primary` fill, white checkmark/dot. Transition 150ms with `scaleIn` micro-animation.
* **Indeterminate (checkbox):** Horizontal dash instead of checkmark, `--accent-primary` fill.
* **Focus:** Standard focus ring on the indicator, not the label.
* **Label:** `--text-primary`, size 0.8125rem, weight 500. Clickable via associated `<label>`.

### Toggle / Switch

* **Track:** 40px × 22px, `--surface-border` background (off) / `--accent-primary` (on). Border-radius `--radius-full`. Transition 200ms.
* **Thumb:** 18px circle, white, `--shadow-sm`. Translates 18px on toggle. `scaleIn` micro-bounce (1.1x) on state change.
* **Disabled:** `opacity: 0.4`, `cursor: not-allowed`.

## 14. Scrollbar & Selection

### Scrollbar

```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: var(--radius-full);
}
::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover); }
```

| Token | Dark Value | Light Value |
|---|---|---|
| `--scrollbar-thumb` | `--surface-elevated` | `rgba(27, 42, 74, 0.15)` |
| `--scrollbar-thumb-hover` | `--accent-primary` at 30% | `rgba(27, 42, 74, 0.25)` |

**Firefox:** Use `scrollbar-width: thin; scrollbar-color: var(--scrollbar-thumb) transparent;`.

### Text Selection

| Token | Dark Value | Light Value |
|---|---|---|
| `::selection background` | `--accent-primary` at 30% | `--accent-primary` at 20% |
| `::selection color` | `--text-primary` | `--text-primary` |

## 15. Imagery & Media

### Aspect Ratios

| Context | Ratio | Usage |
|---|---|---|
| Thumbnail | 1:1 (square) | Avatars, grid items, icons |
| Card image | 16:9 | Blog cards, feature previews |
| Document scan | 3:4 (portrait) | ID documents, receipts |
| Banner / Hero | 21:9 | Page headers, promotional banners |

### Loading Behavior

* **Progressive loading:** Images use `skeleton-card` placeholder while loading. Fade-in on load with `opacity 0→1` over 300ms.
* **Error fallback:** Broken image replaced with `--surface-inset` background + centered broken-image icon in `--text-tertiary`. Never show browser's default broken image.
* **Lazy loading:** All images below the fold use `loading="lazy"`. Critical above-fold images use `loading="eager"` + `fetchpriority="high"`.

### Image Treatment

* **Rounded corners:** Images within cards inherit parent's `border-radius` minus padding. Use `overflow: hidden` on container.
* **Object fit:** `object-fit: cover` for all non-document images. `object-fit: contain` for documents and diagrams.
* **Dark mode consideration:** Decorative images may receive `filter: brightness(0.85)` in dark mode to reduce glare. Functional images (documents, screenshots) are never filtered.

## 16. Grid System

**Column grid:** 12-column fluid grid with CSS Grid or Flexbox.

| Token | Value | Usage |
|---|---|---|
| `--grid-columns` | 12 | Standard column count |
| `--grid-gutter` | 24px | Gap between columns |
| `--grid-gutter-sm` | 16px | Tight gutter for compact layouts |
| `--grid-margin` | 24px | Outer page margins on mobile |
| `--grid-margin-lg` | 48px | Outer page margins on desktop |

**Container widths:**

| Context | Max Width | Usage |
|---|---|---|
| Narrow | 480px | Focused flows — login, onboarding, single forms |
| Medium | 768px | Content pages — articles, detail views |
| Standard | 1024px | Multi-column layouts — settings, profiles |
| Wide | 1200px | Dashboards, data-heavy views with sidenav |
| Full | 100% | Edge-to-edge layouts — maps, media galleries |

**Column spans:** `.col-1` through `.col-12`. Responsive modifiers: `.col-sm-*`, `.col-md-*`, `.col-lg-*`.

**Rule:** Gutters are always `--grid-gutter`. Never add extra padding between grid items. Nested grids inherit the parent gutter.

## 17. Transition & Motion Tokens

### Duration Scale

| Token | Value | Usage |
|---|---|---|
| `--duration-instant` | 0ms | Disabled animations, reduced motion |
| `--duration-fast` | 100ms | Micro-interactions — hover color, opacity |
| `--duration-normal` | 200ms | Standard transitions — buttons, inputs, nav links |
| `--duration-moderate` | 300ms | Panel shows, dropdowns, theme toggle |
| `--duration-slow` | 500ms | Entrance animations — cards, modals, page transitions |
| `--duration-dramatic` | 800ms | Hero animations, trust meter fill, skeleton shimmer |

### Easing Curves

| Token | Value | Usage |
|---|---|---|
| `--ease-default` | `cubic-bezier(0.16, 1, 0.3, 1)` | Standard deceleration — most transitions |
| `--ease-spring` | `cubic-bezier(0.16, 1, 0.3, 1)` | Linear-decelerating custom easing (avoiding spring bounce) |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Accelerating — elements exiting the viewport |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Decelerating — elements entering the viewport |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Symmetric — looping animations, spinners |
| `--ease-linear` | `linear` | Continuous — progress bars, shimmer |

### Stagger Pattern

```css
.stagger-1 { animation-delay: 0.0s; }
.stagger-2 { animation-delay: 0.1s; }
.stagger-3 { animation-delay: 0.2s; }
.stagger-4 { animation-delay: 0.3s; }
.stagger-5 { animation-delay: 0.4s; }
```

**Rule:** Maximum 5 stagger levels. Beyond that, group elements. Enter animations always use `--ease-default`; exit animations use `--ease-in` with shorter duration.

## 18. Opacity Scale

| Token | Value | Usage |
|---|---|---|
| `--opacity-0` | 0 | Fully transparent — hidden elements pre-animation |
| `--opacity-5` | 0.05 | Barely visible — surface insets, ghost backgrounds |
| `--opacity-10` | 0.10 | Subtle — border tints, inactive overlays |
| `--opacity-15` | 0.15 | Light — glow halos (light mode), hover backgrounds |
| `--opacity-25` | 0.25 | Moderate — glow halos (dark mode), active backgrounds |
| `--opacity-40` | 0.40 | Medium — disabled states, focus ring backgrounds |
| `--opacity-50` | 0.50 | Half — elevated surfaces, overlay backgrounds |
| `--opacity-65` | 0.65 | Strong — card glass backgrounds |
| `--opacity-80` | 0.80 | Heavy — modal overlays, dark backdrops |
| `--opacity-100` | 1.0 | Fully opaque — solid fills, text |

**Rule:** Always use a token. Never use arbitrary decimal opacity values inline.

## 19. Data Visualization

### Chart Color Palette

Sequential order for multi-series charts. Each color has a dim (12%) and full variant.

| Order | Dark Mode | Light Mode | Label |
|---|---|---|---|
| 1 | `#00B4D8` | `#0E8E9A` | Primary (brand cyan/teal) |
| 2 | `#48CAE4` | `#0D6B7A` | Secondary (lighter/deeper) |
| 3 | `#FBBF24` | `#F59E0B` | Tertiary (amber) |
| 4 | `#34D399` | `#059669` | Quaternary (green) |
| 5 | `#A78BFA` | `#7C3AED` | Quinary (violet) |
| 6 | `#F87171` | `#DC2626` | Senary (coral) |

### Chart Styling

* **Axes:** `--text-tertiary` color, 0.6875rem labels. Grid lines: `--surface-border` at 50% opacity.
* **Tooltips:** Follow tooltip component spec. Show data point value, label, and series color swatch.
* **Legends:** Inline or bottom-positioned. Color swatch 10px circles. Label in `--text-secondary`.
* **Bar charts:** `--radius-xs` top corners. Hover: `opacity: 0.8` with tooltip.
* **Line charts:** 2px stroke, 4px dot markers on hover. Area fill at `--opacity-5`.
* **Pie/Donut:** 2px gap between segments. Center label for donut: `--text-primary`, weight 700.

## 20. Loading States

### Full Page Loading

* Centered spinner (see Spinner component) at viewport center. `--surface-base` background. Optional brand logo fades in above spinner with `--opacity-40` then pulses to `--opacity-100`.

### Inline Loading

* Small spinner (24px) replaces content or appears alongside text. `--accent-info` color. Text reads "Loading..." in `--text-tertiary`, 0.8125rem.

### Button Loading

* Spinner replaces button label. Button width freezes (`min-width` locked to pre-loading width). Disabled state applied. Spinner inherits button text color.
* Variant: Label shifts left, 16px spinner appears right of label text.

### Content Placeholder

* Full skeleton layout matching expected content structure (see Skeleton Loader). Shimmer animates left-to-right. Minimum display time 300ms to prevent flash.

### Progress Bar

* **Track:** Full width within parent, 4px height, `--surface-inset` background, `--radius-full`.
* **Fill:** `--accent-primary` gradient, `--radius-full`. Animates width. At 100%: brief pulse glow then fills `--accent-primary` solid.
* **Indeterminate:** Fill bar is 30% width, slides left-to-right infinitely with `--ease-in-out`, 1.5s.
* **With percentage:** Label right-aligned above track, `--text-secondary`, 0.75rem.

## 21. Error & Status Pages

### Layout

* Centered vertically and horizontally. Max-width 480px. Uses Empty State pattern.

### 404 — Not Found

* **Icon:** `--icon-2xl`, search or compass icon, `--text-tertiary` at 30%.
* **Title:** "Page Not Found" — `--text-primary`, weight 700, headline size.
* **Description:** "The page you're looking for doesn't exist or has been moved." — `--text-secondary`.
* **Action:** Primary button "Go Home" + Secondary button "Go Back".

### 500 — Server Error

* **Icon:** `--icon-2xl`, alert-triangle icon, `--accent-error`.
* **Title:** "Something Went Wrong" — `--text-primary`.
* **Description:** "We're working on fixing this. Please try again." — `--text-secondary`.
* **Action:** Primary button "Try Again" + Secondary "Contact Support".

### Maintenance

* **Icon:** `--icon-2xl`, wrench icon, `--accent-warning`.
* **Title:** "Under Maintenance" — `--text-primary`.
* **Description:** "We'll be back shortly. Thank you for your patience." — `--text-secondary`.
* **Action:** Ghost button "Check Status".

### Session Expired

* **Icon:** `--icon-2xl`, clock icon, `--accent-muted`.
* **Title:** "Session Expired" — `--text-primary`.
* **Action:** Primary button "Sign In Again".

## 22. Stepper / Wizard

* **Container (`.stepper`):** Flexbox row, `align-items: center`. Full width. Padding `--space-md 0`.

### Step Indicator

* **Circle:** 32px, `--surface-border` border 2px. Step number centered, `--text-tertiary`, weight 600.
* **Completed:** `--accent-primary` fill, white checkmark icon. Border matches fill.
* **Active:** `--accent-primary` border (no fill), `--accent-primary` number text. Subtle pulse glow animation.
* **Upcoming:** `--surface-border` border, `--text-tertiary` number.

### Connector Line

* Between circles: 2px height flex-grow line. Completed: `--accent-primary`. Upcoming: `--surface-border`. Animated fill from left-to-right on completion (300ms, `--ease-default`).

### Step Labels

* Below circles. `--text-secondary` (active/completed) or `--text-tertiary` (upcoming). Size 0.75rem, weight 500. Active: weight 600.

### Vertical Variant

* Flex column. Connector line is vertical, 2px width, min-height 40px. Content area to the right of indicator.

### Mobile

* Below 480px: show only active step with "Step X of Y" label. Previous/next as ghost buttons.

## 23. File Upload

### Drop Zone

* **Container (`.upload-zone`):** `--surface-inset` background, dashed `--surface-border` 2px border, `--radius-lg`. Padding `--space-2xl`. Centered content. `cursor: pointer`.
* **Idle state:** Upload-cloud icon (`--icon-xl`, `--text-tertiary`). Title: "Drop files here or click to upload" — `--text-secondary`. Subtitle: "PNG, JPG up to 10MB" — `--text-tertiary`, 0.75rem.
* **Drag hover (`.upload-zone--active`):** Border transitions to `--accent-primary` solid. Background to `--accent-primary-dim`. Icon brightens to `--accent-primary`. Subtle scale 1.01.
* **Error (`.upload-zone--error`):** Border `--accent-error`, background `--accent-error-dim`. Error message below.

### File Preview

* **Item (`.upload-item`):** Flexbox row. `--surface-inset` background, `--surface-border` border, `--radius-md`. Padding `--space-sm --space-md`.
* **Thumbnail:** 40px square, `--radius-sm`, `object-fit: cover`. For non-image files: file-type icon.
* **Info:** Filename (`--text-primary`, weight 500, truncated with ellipsis), file size (`--text-tertiary`, 0.75rem).
* **Progress:** 2px progress bar below filename during upload. `--accent-primary` fill.
* **Actions:** Delete icon button (ghost, `--accent-error` on hover). Status: checkmark (success), spinner (uploading), alert (error).

## 24. Micro-interactions & Cursors

### Hover Effects

| Element | Hover Behavior |
|---|---|
| Buttons (primary) | Glow intensifies, `translateY(-1px)`, brightness overlay |
| Buttons (ghost) | Background to `--surface-inset`, text brightens |
| Links | `--accent-primary` color, optional underline |
| Cards | `--shadow-md` (light) / shadow deepens (dark), `translateY(-2px)` |
| Table rows | Background `--surface-inset` |
| Icons (interactive) | `scale(1.05)`, color brightens |
| Avatar | Ring brightens to `--accent-primary` |

### Click/Press Feedback

| Element | Press Behavior |
|---|---|
| Buttons | `scale(0.97)`, shadow reduces slightly, 100ms |
| Cards (clickable) | `scale(0.99)`, shadow reduces, 100ms |
| Checkbox/Radio | `scale(0.9)` then `scaleIn` bounce to 1.0 |
| Toggle | Thumb `scale(1.1)` mid-transition |

### Cursor Map

| Context | Cursor |
|---|---|
| Default | `default` |
| Interactive (buttons, links) | `pointer` |
| Text input | `text` |
| Disabled element | `not-allowed` |
| Draggable | `grab` / `grabbing` |
| Resize handle | `col-resize` / `row-resize` |
| Loading (full page) | `wait` |
| Loading (element) | `progress` |

### Copy-to-Clipboard

* Click triggers: text briefly changes to "Copied!" (200ms fade), checkmark icon replaces copy icon, `--accent-primary` color flash. Reverts after 2s.
* Toast notification variant for longer confirmation.

## 25. Print Styles

```css
@media print {
  /* Hide non-essential UI */
  .navbar, .sidenav, .toast, .modal-backdrop,
  .theme-toggle, .btn-ghost, .pagination,
  .search-bar, .stepper { display: none !important; }

  /* Remove decorative effects */
  * {
    box-shadow: none !important;
    text-shadow: none !important;
    backdrop-filter: none !important;
  }

  /* Force light mode colors */
  body {
    background: white !important;
    color: #1a1a1a !important;
  }

  /* Ensure content fits page */
  .glass-card {
    background: white !important;
    border: 1px solid #ddd !important;
    break-inside: avoid;
  }

  /* Show URLs for links */
  a[href]::after { content: " (" attr(href) ")"; font-size: 0.75em; }
}
```

**Rules:**
* All backgrounds force white. All text forces near-black.
* Glass effects, blurs, and glows are stripped.
* Navigation, modals, toasts, and interactive-only elements are hidden.
* Cards use `break-inside: avoid` to prevent page-break mid-card.
* Links append their URL in parentheses for reference.
* Tables maintain their structure with thin solid borders.


## 13. Tailwind CSS 4 Integration (Optional)

> **Applicability:** This section is **optional**. It applies only when the project architecture includes Tailwind CSS 4 (`@import "tailwindcss"`). Projects using vanilla CSS custom properties from Sections 2–12 remain fully valid without any Tailwind dependency.

### 13.1 Why Bridge Tokens into Tailwind?

The design tokens defined in Section 3 (colors, surfaces, text) use CSS custom properties (`--surface-card`, `--accent-primary`, etc.) that change values at runtime via `[data-theme]` selectors. Tailwind's utility system (`bg-*`, `text-*`, `border-*`) resolves colors **at build time** from its theme configuration.

Without bridging, developers must choose between:
- **Inline styles:** `style={{ background: 'var(--surface-card)' }}` — loses Tailwind's responsive/state modifiers.
- **Custom utilities:** Manual `.bg-surface-card { background: var(--surface-card) }` — duplicates what Tailwind can generate.

The `@theme` bridge solves this: it registers design tokens as Tailwind theme values that resolve to CSS variables at runtime, enabling `bg-surface-card`, `text-accent`, `border-error` as first-class utilities with full modifier support (`hover:bg-surface-card`, `dark:text-accent`, `md:p-8`).

### 13.2 The `@theme` Block

In your main CSS file (after `@import "tailwindcss"`), declare a `@theme` block that maps design tokens to Tailwind namespaces:

```css
@import "tailwindcss";

@theme {
  /* ── Fonts ── */
  --font-display: 'Satoshi', system-ui, -apple-system, sans-serif;
  --font-sans: 'Satoshi', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;

  /* ── Surface Colors ── */
  --color-surface-base: var(--surface-base);
  --color-surface-card: var(--surface-card);
  --color-surface-elevated: var(--surface-elevated);
  --color-surface-inset: var(--surface-inset);
  --color-surface-border: var(--surface-border);
  --color-surface-overlay: var(--surface-overlay);

  /* ── Foreground (Text) Colors ── */
  --color-fg: var(--text-primary);
  --color-fg-secondary: var(--text-secondary);
  --color-fg-tertiary: var(--text-tertiary);
  --color-fg-inverse: var(--text-inverse);

  /* ── Accent Colors ── */
  --color-accent: var(--accent-primary);
  --color-accent-end: var(--accent-primary-end);
  --color-accent-dim: var(--accent-primary-dim);
  --color-accent-glow: var(--accent-primary-glow);

  /* ── Semantic Colors ── */
  --color-warning: var(--accent-warning);
  --color-warning-dim: var(--accent-warning-dim);
  --color-error: var(--accent-error);
  --color-error-dim: var(--accent-error-dim);
  --color-info: var(--accent-info);
  --color-muted: var(--accent-muted);
}
```

**Naming convention:** `--color-{namespace}-{variant}` maps to `bg-{namespace}-{variant}`, `text-{namespace}-{variant}`, `border-{namespace}-{variant}`. The `fg` prefix is used for text colors to avoid collision with Tailwind's default `text-*` size utilities.

### 13.3 Resulting Utility Classes

Once registered, these utilities become available:

| Utility Class | CSS Output | Design Token |
|---|---|---|
| `bg-surface-card` | `background: var(--surface-card)` | Section 3 Surfaces |
| `bg-surface-inset` | `background: var(--surface-inset)` | Section 3 Surfaces |
| `text-fg` | `color: var(--text-primary)` | Section 3 Text |
| `text-fg-secondary` | `color: var(--text-secondary)` | Section 3 Text |
| `text-fg-tertiary` | `color: var(--text-tertiary)` | Section 3 Text |
| `text-accent` | `color: var(--accent-primary)` | Section 3 Accents |
| `text-error` | `color: var(--accent-error)` | Section 3 Accents |
| `border-surface-border` | `border-color: var(--surface-border)` | Section 3 Surfaces |
| `border-accent` | `border-color: var(--accent-primary)` | Section 3 Accents |
| `bg-accent-dim` | `background: var(--accent-primary-dim)` | Section 3 Accents |
| `bg-error-dim` | `background: var(--accent-error-dim)` | Section 3 Accents |

**Theme-reactive:** Because these resolve to CSS variables (not static hex values), they automatically adapt when `[data-theme]` changes — no Tailwind `dark:` prefix needed for theme-aware colors.

### 13.4 Component Class Strategy

The design system uses a **hybrid approach**: Tailwind utilities for layout/spacing/typography, and BEM-ish component classes for complex visual patterns.

**Use Tailwind utilities for:**
- Layout: `flex`, `grid`, `gap-4`, `items-center`, `justify-between`
- Spacing: `p-5`, `m-4`, `mb-6`, `px-8`
- Typography: `font-bold`, `font-mono`, `text-sm`, `uppercase`, `tracking-wide`
- Positioning: `relative`, `absolute`, `top-1/2`, `-translate-y-1/2`
- Sizing: `w-full`, `min-w-[200px]`, `max-w-[360px]`, `h-8`
- Overflow: `overflow-hidden`, `overflow-x-auto`, `truncate`

**Use component CSS classes (with `@apply`) for:**
- Glass surfaces: `.glass-card` (backdrop blur + border + shadow + hover transitions)
- Data tables: `.data-table` (striped rows, sortable headers, clickable rows)
- Status badges: `.status-badge` (pill shape + semantic color mapping)
- Sidebar nav: `.sidebar-link` (active state + icon alignment + hover effects)
- Buttons: `.btn`, `.btn-primary`, `.btn-ghost` (gradient fills, glow shadows, scale transforms)

Example component class using `@apply` with theme tokens:

```css
.glass-card {
  @apply bg-surface-card border border-surface-border rounded-lg;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  box-shadow: var(--shadow-md);
  transition: box-shadow var(--transition-base), border-color var(--transition-base);
}
```

**Rule:** Component classes own visual complexity (blur, gradients, multi-property transitions). Tailwind utilities own structural simplicity (padding, flex, gap).

### 13.5 Critical Gotchas

#### 13.5.1 CSS Layer Ordering

Tailwind 4 uses `@layer` for cascade control. The layer order is: `base` < `components` < `utilities`.

**Problem:** CSS rules written **outside** any `@layer` have higher priority than all layered rules — including utilities. This means:

```css
/* ❌ BREAKS utilities — unlayered * selector overrides p-5, m-4, gap-3 */
*, *::before, *::after {
  padding: 0;
  margin: 0;
}
```

**Solution:** Do **not** add manual resets when using Tailwind 4. The `@import "tailwindcss"` directive includes a comprehensive preflight that handles `box-sizing`, margins, and padding resets within `@layer base` — which utilities can correctly override.

#### 13.5.2 Namespace Replacement

When you define custom values in `@theme` for a given namespace prefix (e.g., `--text-*`), Tailwind 4 **replaces the entire default set** for that namespace. If you define `--text-2xs`, `--text-xs`, `--text-sm`, `--text-base` — then `text-lg`, `text-xl`, `text-2xl` etc. **stop working** because they were not defined.

**Mitigation:** Only register namespaces that don't collide with Tailwind defaults. Use `--color-fg-*` instead of `--text-*` for text colors. For font sizes, either define the full scale or avoid the `--text-*` namespace entirely and use the runtime variables directly.

#### 13.5.3 `@apply` Specificity

Component classes using `@apply` are generated in `@layer components`. Utility classes from HTML are in `@layer utilities`. This means **utilities always beat `@apply`** when specificity is equal — which is the correct behavior. You can safely use `className="glass-card p-5"` and `p-5` will add padding on top of `.glass-card`'s styles.

However, if you need a component class to **always** enforce a value (e.g., a button's minimum height), use a direct CSS property instead of `@apply`:

```css
/* ✅ Direct property — can't be overridden by utilities */
.btn { min-height: 38px; }

/* ⚠️ @apply — CAN be overridden by min-h-0 or min-h-* utilities */
.btn { @apply min-h-[38px]; }
```

#### 13.5.4 Date Input Theming

Native `<input type="date">` elements use the browser's built-in date picker, which follows the `color-scheme` CSS property. Set it per theme:

```css
.input[type="date"] { color-scheme: light; }
[data-theme="dark"] .input[type="date"] { color-scheme: dark; }
```

### 13.6 File Organization

The recommended structure for the main CSS file:

```css
/* 1. Tailwind import (includes preflight + utilities) */
@import "tailwindcss";

/* 2. @theme bridge — registers design tokens for TW utilities */
@theme {
  --font-sans: ...;
  --color-surface-*: ...;
  --color-fg-*: ...;
  --color-accent-*: ...;
}

/* 3. Runtime theme variables (CSS custom properties) */
:root { /* light theme tokens from Section 3 */ }
[data-theme="dark"] { /* dark overrides from Section 3 */ }

/* 4. Base styles (typography, links, focus rings) */
html { font-family: var(--font-sans); color: var(--text-primary); ... }
h1, h2, h3, h4, h5, h6 { font-family: var(--font-display); }

/* 5. Component classes (glass-card, data-table, sidebar, etc.) */
.glass-card { @apply bg-surface-card border border-surface-border rounded-lg; ... }
.data-table { ... }
.btn { ... }

/* 6. Page layout (sidebar, page-header, page-body) */
/* 7. Animations (@keyframes) */
/* 8. Print styles (@media print) */
```

**Key principle:** Sections 1–2 are Tailwind-specific. Sections 3–8 are the same CSS you'd write without Tailwind — the only difference is that component classes can use `@apply` with the registered theme utilities instead of repeating `background: var(--surface-card)` manually.
