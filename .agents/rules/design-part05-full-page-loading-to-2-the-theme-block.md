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
