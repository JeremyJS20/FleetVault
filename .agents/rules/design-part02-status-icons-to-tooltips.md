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
