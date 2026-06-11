# Frontend Developer Guide and Design System

The **FleetVault Enterprise** frontend is a high-performance single-page application (SPA) built on **React 19**, **TypeScript**, **Vite**, and **Tailwind CSS v4**. It is designed with a premium, modern aesthetic optimized for mobile devices and tablets used in the yard.

---

## 1. Design System: "Liquid Glass" Visual Theme

The user interface implements a sophisticated visual style based on matte glassmorphism and clean contrasts. All styles are centralized in `src/index.css`.

### Base Design Tokens
* **System Backdrop:** Dark slate (`#0f172a` and `#1e293b`).
* **Panels and Cards (Glass Panels):** Translucent backgrounds with thin, low-contrast borders to simulate glass:
  * Background color: `rgba(30, 41, 59, 0.7)` (slate with opacity).
  * Border color: `rgba(255, 255, 255, 0.05)`.
  * Backdrop blur filter: `backdrop-filter: blur(24px)`.
* **Primary Typography:** **Satoshi** font (or Outfit as a Google Fonts alternative) for a modern, technical look.
* **Transitions and Micro-Animations:** Smooth transitions with natural acceleration curves:
  * Default curve: `transition: all 400ms cubic-bezier(0.16, 1, 0.3, 1)`.
* **Accessibility (AA Contrast):** All interactive text complies with W3C contrast readability, using pure whites (`#ffffff`) for headings and high-luminance grays (`#94a3b8`) for secondary descriptions.

---

## 2. State Management

The frontend divides state management into two distinct categories to avoid unnecessary re-renders and optimize performance:

### A. Server State with TanStack React Query v5
All database queries (catalogs, rental listings, reservations) are handled by React Query. This enables:
* In-memory caching and automatic background updates.
* Explicit control over loading (`isLoading`), success, and failure states.
* Cache invalidation after mutations (e.g., after creating a rental, the available vehicle list is invalidated to force immediate screen updates).

### B. Local Authentication State (AuthContext)
Maintains the logged-in user session. Uses a JWT token stored in secure memory and a refresh token stored in secure cookies. Controls the current user's role and triggers automatic redirects if the session expires.

---

## 3. Routing and Route Protection

Routing is handled by **React Router v7** (`BrowserRouter`), structured through layout templates and role-based route guards:

* **Public Routes (`/` and `/auth/*`):** Landing page, public vehicle catalog, and customer login/registration screens.
* **Customer Routes (`/profile`, `/my-rentals`):** Exclusive views for authenticated customers.
* **Operations Portal (`/admin/*`):** Persistent sidebar and advanced modules accessible based on employee role:
  * `ADMINISTRATOR`: Full access to catalogs, rate configurations, employees, and profitability reports.
  * `AGENT`: Access to reservations, customers, and billing module (rental creation and returns).
  * `INSPECTOR`: Restricted access to vehicle listings and physical inspection checklists.

> [!CAUTION]
> If an employee with `INSPECTOR` role tries to directly access `/admin/employees` via URL, the `ProtectedRoute` component intercepts the request, denies access, and automatically redirects them to the base dashboard page `/admin`.

---

## 4. Offline Support in Inspections

Because the vehicle yard may have Wi-Fi or mobile data signal issues (dead zones), the physical inspection module includes an offline persistence engine:

### Offline Synchronization Flow
1. **Network Detection:** The `NetworkStatusProvider` component monitors the browser state (`navigator.onLine`).
2. **IndexedDB Queue:** If the network goes down, the yard inspection form is validated locally and stored in the browser's local database `fleetvault-offline-db` within the `inspections-queue` collection.
3. **Informational Banner:** A floating bar appears at the bottom of the screen warning that the device is working in offline mode and showing the count of pending inspections to upload.
4. **Automatic Synchronization:** As soon as the device regains network signal, the system starts a background process that reads the IndexedDB queue and uploads the inspections one by one via the `/api/inspections` API, removing them from local storage after successful confirmation.

---

## 5. Driver License Capture with Camera (Camera Snapshot)

The customer creation form and counter dispatch integrate the `<LicensePhotoCapture />` component for instant document digitization:

* **Media Access:** Uses the native JavaScript API `navigator.mediaDevices.getUserMedia`.
* **Camera Preference:** To optimize usage from mobile phones, the component has a preference for the rear camera:
  ```typescript
  const constraints = { video: { facingMode: { ideal: 'environment' } } };
  ```
  This prioritizes the main phone lens, but if running from a desktop laptop without a rear camera, it falls back automatically and smoothly to the front camera without throwing hardware constraint errors (*OverconstrainedError*).
* **JPEG Capture:** The video frame is drawn to a hidden canvas, exported as a JPEG blob, and sent to the `/api/uploads` server endpoint for private storage.

---

## 6. Image Upload and Security Proxy

The system stores damage photographs and customer documents in private **Vercel Blob** containers to prevent information leaks.

* **Proxy Rendering:** Instead of rendering images using the direct storage bucket URL, all frontend components wrap the URL in the `getImageProxyUrl` helper function:
  ```typescript
  const proxyUrl = getImageProxyUrl(vehicle.imageUrl);
  // Returns: /api/uploads/proxy?url=https://blob.vercel.com/image.jpg
  ```
* **Link Protection:** This ensures the client browser makes the request through the backend API, which validates that the user session is active and has the corresponding role permissions before streaming the media content.
