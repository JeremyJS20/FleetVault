# FleetVault — Enterprise Car Rental & Logistics System

FleetVault is a premium, modern monorepo car rental management system built with a responsive Liquid Glass (glassmorphism) UI, Node.js REST APIs, Stripe payment integrations, offline inspections checklists, and real-time simulated telemetry.

---

## Key Features

- **Double-Booking Prevention:** Serializable transaction isolation levels on database leases to ensure zero race conditions on rentals.
- **Dynamic Pricing:** Real-time rental rate calculation applying seasonal rate multipliers and holiday tiers.
- **Stripe Wallet & Holds:** Pre-authorization elements, Stripe customer saved cards vault, capture settlements, and active card deletion blocks.
- **Corporate B2B Billing:** Bypasses Stripe element gates, verifying credit line limits and charging against Purchase Orders and PO invoices.
- **Upfront Cash Billing:** Upfront cash collection (rent + security deposit) with cash reconciliation differences computed on check-in.
- **Mobile Inspections Checklist:** Interactive visual SVG car damage map overlays and IndexedDB offline sync queues for remote dead zones.
- **Telemetry & GPS Tracking (Phase 3):** Active vehicle GPS tracking, Leaflet live map visualizers, geofence polygon creation, point-in-polygon exit alerts, and historical coordinates speed graphs.
- **Automated Operations (Phase 3):** Cron jobs for no-show auto-releases and odometer maintenance limits, and server-side PDF contract generation.

---

## Project Structure

```
rent-car/
├── apps/
│   ├── backend/      # Express API server, Prisma ORM (SQLite database), Stripe & email services
│   └── frontend/     # React / Vite SPA layout, custom components, i18n localizations (EN/ES)
├── packages/
│   └── common/       # Shared TypeScript types, enums, and Zod validation contracts
├── docs/             # Requirements analysis & master implementation plan
└── package.json      # Monorepo workspaces & dev scripts config
```

---

## Getting Started

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **NPM** (v9 or higher)

### Setup Instructions

1. **Install Dependencies:**
   Run the following command at the root of the workspace:
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Create a `.env` file in the root directory (based on `.env.example`):
   ```ini
   PORT=5000
   JWT_SECRET=your_jwt_secret_here
   JWT_REFRESH_SECRET=your_refresh_secret_here
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   BLOB_READ_WRITE_TOKEN=vercel_blob_token_here
   RESEND_API_KEY=re_...
   MAIL_FROM=onboarding@resend.dev
   ```

3. **Initialize Database Schema:**
   Generate the Prisma Client and sync models with the local SQLite database:
   ```bash
   npm run postinstall
   ```

4. **Seed Database:**
   Populate the database with sample vehicle types, brands, models, customers, and active users:
   ```bash
   npm run db:seed --workspace=apps/backend
   ```

5. **Start Development Servers:**
   Launch both backend and frontend applications concurrently:
   ```bash
   npm run dev
   ```
   - **Frontend:** http://localhost:5173
   - **Backend:** http://localhost:5000

---

## Build and Compilation

Compile and package all monorepo modules for production deployment:
```bash
npm run build
```
This builds packages in the correct order:
1. `@rent-car/common` via `tsc`
2. `@rent-car/backend` via `tsc`
3. `@rent-car/frontend` via `vite build`
