# FleetVault — Enterprise Car Rental & Logistics System

FleetVault is a premium, modern monorepo car rental management system with a Liquid Glass (glassmorphism) UI, Express REST APIs, PostgreSQL via Prisma ORM, Stripe payment integrations, offline inspection checklists, and real-time GPS telemetry.

---

## Key Features

- **Double-Booking Prevention:** Serializable transaction isolation on database leases to ensure zero race conditions on rentals.
- **Dynamic Pricing:** Real-time rental rate calculation applying seasonal rate multipliers and holiday tiers.
- **Stripe Wallet & Holds:** Pre-authorization elements, Stripe customer saved cards vault, capture settlements, and active card deletion blocks.
- **Corporate B2B Billing:** Bypasses Stripe element gates, verifying credit line limits and charging against Purchase Orders and PO invoices.
- **Upfront Cash Billing:** Upfront cash collection (rent + security deposit) with cash reconciliation differences computed on check-in.
- **Mobile Inspections Checklist:** Interactive visual SVG car damage map overlays and IndexedDB offline sync queues for remote dead zones.
- **Telemetry & GPS Tracking:** Active vehicle GPS tracking, Leaflet live map visualizers, geofence polygon creation, point-in-polygon exit alerts, and historical coordinates speed graphs.
- **Automated Operations:** Cron jobs for no-show auto-releases and odometer maintenance limits, and server-side PDF contract generation.
- **Dominican ID Validation:** Real-time cédula/RNC validation with modulo-10/modulo-11 algorithms.
- **i18n:** Full English/Spanish localization with `react-i18next`.

---

## Project Structure

```
rent-car/
├── api/                # Vercel serverless entrypoint (Export Express app)
├── apps/
│   ├── backend/        # Express API server, Prisma ORM (PostgreSQL), Stripe & email services
│   └── frontend/       # React / Vite SPA, TailwindCSS 4, i18n (EN/ES)
├── packages/
│   └── common/         # Shared TypeScript types, enums, Zod validation contracts
├── docs/               # Requirements analysis & implementation plan (English)
├── .env.example        # Environment variable template
├── vercel.json         # Vercel deployment configuration
└── package.json        # Monorepo workspaces & scripts
```

---

## Technology Stack

| Layer | Stack |
|---|---|
| **Frontend** | React 19, Vite, HeroUI, TailwindCSS 4, React Router 7, TanStack Query, react-i18next, Stripe Elements |
| **Backend** | Express 4, Prisma ORM, JWT auth, Stripe SDK, Resend (email) |
| **Database** | PostgreSQL 15+ (via Supabase or local) |
| **Shared** | Zod (validation), TypeScript enums & types |
| **Deployment** | Vercel (serverless functions), GitHub Actions |
| **Design** | Neo-Minimalist Liquid Glass (dark/light themes, glassmorphism) |

---

## Getting Started

### Prerequisites
- **Node.js** v18+
- **NPM** v9+
- **PostgreSQL** 15+ (or a Supabase project)

### Setup Instructions

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Copy `.env.example` to `.env` and fill in:
   ```env
   PORT=3001
   FRONTEND_URL=http://localhost:5173
   DATABASE_URL=postgresql://user:password@host:5432/fleetvault
   JWT_SECRET=your_jwt_secret_here
   JWT_REFRESH_SECRET=your_refresh_secret_here
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   BLOB_READ_WRITE_TOKEN=vercel_blob_token_here
   RESEND_API_KEY=re_...
   MAIL_FROM=onboarding@resend.dev
   ```

3. **Initialize Database Schema:**
   ```bash
   npm run postinstall
   npx prisma migrate dev --name init --schema=apps/backend/prisma/schema.prisma
   ```

4. **Seed Database:**
   Populates vehicle types, brands, models, **5 default accounts**, fees, and policies:
   ```bash
   npm run db:seed --workspace=apps/backend
   ```

5. **Start Development Servers:**
   ```bash
   npm run dev
   ```
   - **Frontend:** http://localhost:5173
   - **Backend:** http://localhost:3001

### Default Accounts (password: `password123` for all)

| Email | Role | Label |
|---|---|---|
| admin@fleetvault.com | Administrator | Admin |
| agent@fleetvault.com | Agent | Agent |
| inspector@fleetvault.com | Inspector | Inspector |
| juan@fleetvault.com | Customer (Individual) | Individual Customer |
| empresa@fleetvault.com | Customer (Corporate) | Corporate Customer |

---

## Build and Compilation

```bash
npm run build
```

Build order (orchestrated via Vercel build command):
1. `@rent-car/common` — TypeScript compilation
2. `@rent-car/backend` — TypeScript compilation
3. `@rent-car/frontend` — Vite production build

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start backend + frontend concurrently |
| `npm run build` | Build all workspaces |
| `npm run db:seed --workspace=apps/backend` | Seed database with sample data |
| `npm run lint` | Run ESLint across workspaces |

---

## Deployment (Vercel)

The project is configured for Vercel serverless deployment via `vercel.json`:

- **API:** The Express app is exported via `api/index.ts` as a serverless function (512 MB, 30s).
- **Frontend:** Vite SPA with SPA rewrites for client-side routing.
- **Database:** Use Supabase transaction pooler (`?pgbrowser=true`) for production.

---

## Documentation

Detailed documentation (in English) lives in `docs/`:
- Introduction and application flows
- System architecture
- Database design (PostgreSQL)
- API specifications
- Component architecture
- Deployment and configuration
