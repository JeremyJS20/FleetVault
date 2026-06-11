# Deployment, Migration, and Environment Configuration Guide

This section details the technical steps required to configure the environment and deploy the application on **Vercel**.

---

## 1. Environment Variable Configuration (`.env`)

The application loads environment variables on the backend server via `dotenv` and on the frontend client through the Vite compiler. You must create a `.env` file in the monorepo root directory (`/rent-car/.env`) with the following content:

```bash
# Execution Environment
PORT=3001
NODE_ENV=development

# Base de Datos (Supabase PostgreSQL - Session Pooler on port 5432)
DATABASE_URL="postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# Session Security Secrets
JWT_SECRET="change_me_locally_development_only_min_32_chars"
JWT_REFRESH_SECRET="change_me_refresh_secret_dev_only"
MAGIC_LINK_SECRET="change_me_magic_link_secret_dev_only"

# Frontend URLs
VITE_APP_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173

# Stripe Integration (Test Mode in Development)
STRIPE_SECRET_KEY="sk_test_51..."
STRIPE_PUBLISHABLE_KEY="pk_test_51..."

# Private File Storage (Vercel Blob)
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."

# Email (Resend)
RESEND_API_KEY="re_..."
MAIL_FROM="onboarding@resend.dev"
```

---

## 2. Local Development Setup

To set up the local environment for the first time with functional test data:

1. **Install Dependencies:**
   Run from the monorepo root folder (`/rent-car`):
   ```bash
   npm install
   ```

2. **Run Database Migrations:**
   Navigate to the backend directory (`/rent-car/apps/backend`) and apply all migrations (creates tables in your Supabase PostgreSQL database):
   ```bash
   npx prisma migrate dev --name init
   ```

3. **Seed Data Loading:**
   Load the default catalog of vehicles, brands, models, policies, seasonal rates, damage types, fee configs, and test user profiles:
   ```bash
   npx prisma db seed
   ```

### Default Access Accounts Created by the Seeder

| Role | Email | Password |
|---|---|---|
| ADMINISTRATOR | `admin@fleetvault.com` | `password123` |
| AGENT | `agent@fleetvault.com` | `password123` |
| INSPECTOR | `inspector@fleetvault.com` | `password123` |
| CUSTOMER (Individual) | `juan@fleetvault.com` | `password123` |
| CUSTOMER (Corporate) | `empresa@fleetvault.com` | `password123` |

---

## 3. Database: Supabase PostgreSQL

The project uses **PostgreSQL** via **Supabase** in all environments (development and production).

### Connection Strings

Supabase provides two pooler modes:

* **Session Pooler** (port `5432`): Recommended for local development, migrations, and Prisma Studio. Use this in your `.env` file.
* **Transaction Pooler** (port `6543?pgbouncer=true`): Recommended for production serverless functions on Vercel. This provides connection pooling suitable for short-lived Lambda invocations.

### Running Migrations

```bash
# Local dev (creates/evolves schema)
npx prisma migrate dev

# Production (apply pending migrations)
npx prisma migrate deploy
```

---

## 4. Application Deployment on Vercel

FleetVault runs as a unified project on Vercel. The backend Express app is exported from `apps/backend/src/Presentation/app.ts` and imported by the serverless entrypoint at `api/index.ts`.

### Architecture

```
api/index.ts              # Vercel serverless entrypoint (imports app from backend)
apps/backend/src/
  Presentation/
    app.ts                # Express app setup (middleware, routes, error handler)
    server.ts             # Local dev entrypoint (calls app.listen())
```

- In production: Vercel invokes `api/index.ts` as a serverless function.
- In development: `server.ts` starts Express on port `3001`.

### `vercel.json` Configuration

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "apps/frontend/dist",
  "installCommand": "npm install",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ],
  "functions": {
    "api/index.ts": {
      "memory": 512,
      "maxDuration": 30
    }
  }
}
```

- `/api/*` requests → serverless function (`api/index.ts`)
- All other requests → `index.html` (React Router handles client-side routing)
- Serverless function allocated 512 MB memory and 30s max duration

### Steps in the Vercel Console:
1. **Import the Project:** Connect your Git repository to Vercel and import the project folder.
2. **Root Directory:** Set `/rent-car` as the root directory for the Vercel deployment.
3. **Framework Preset:** Vercel auto-detects Vite from `vercel.json`.
4. **Environment Variables:** Configure all variables from section 1 in *Settings -> Environment Variables*. For production, use the **Transaction Pooler** connection string for `DATABASE_URL`:
   ```bash
   DATABASE_URL="postgres://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   ```
5. **Deploy:** Click "Deploy". After deployment, run pending migrations via `npx prisma migrate deploy`.
