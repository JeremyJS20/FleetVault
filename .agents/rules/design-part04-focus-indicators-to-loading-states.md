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
