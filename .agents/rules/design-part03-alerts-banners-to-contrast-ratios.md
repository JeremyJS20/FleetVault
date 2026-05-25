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
