# Deployment, Migration, and Environment Configuration Guide

This section details the technical steps required to configure, migrate the database from development to production, and deploy the application on **Vercel**.

---

## 1. Environment Variable Configuration (`.env`)

The application loads environment variables on the backend server via `dotenv` and on the frontend client through the Vite compiler. You must create a `.env` file in the monorepo root directory (`/rent-car/.env`) with the following content:

```bash
# Execution Environment
NODE_ENV="development"
PORT=3001

# Local Database (SQLite by default for development)
DATABASE_URL="file:../prisma/dev.db"

# Session Security Secrets
JWT_SECRET="SuperSecureSecretKeyForSigningJWTTokens2026*"
JWT_REFRESH_SECRET="SecureKeyForTokenRefreshCookie2026*"

# Stripe Integration (Test Mode in Development)
STRIPE_SECRET_KEY="sk_test_51..."
STRIPE_PUBLISHABLE_KEY="pk_test_51..."

# Private File Storage (Vercel Blob)
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
```

---

## 2. Local Database Initialization

To set up the local environment for the first time with functional test data:

1. **Install Dependencies:**
   Run from the monorepo root folder (`/rent-car`):
   ```bash
   npm install
   ```

2. **Generate Prisma Schema and Create SQLite Tables:**
   Navigate to the backend directory (`/rent-car/apps/backend`) and run the migration to create the `dev.db` file:
   ```bash
   npx prisma migrate dev --name init_rentcar_schema
   ```

3. **Seed Data Loading:**
   Load the default catalog of vehicles, brands, models, policies, seasonal rates, and test profiles with administration role:
   ```bash
   npx prisma db seed
   ```

### Default Access Accounts Created by the Seeder
* **System Administrator:**
  * Email: `admin@fleetvault.com`
  * Password: `password123`
  * Role: `ADMINISTRATOR`

---

## 3. Production Transition: Migrating from SQLite to Supabase (PostgreSQL)

To deploy FleetVault to production, it is recommended to switch the local SQLite database to a cloud **PostgreSQL** instance via **Supabase**.

### Configuration Steps:
1. **Create the Project:** Create a new project in the Supabase console.
2. **Obtain Connection URL:** Go to *Project Settings -> Database* and copy the Transaction Connection String.
3. **Modify Prisma Schema (`schema.prisma`):**
   Edit the file `/rent-car/apps/backend/prisma/schema.prisma` to change the database provider from `sqlite` to `postgresql`:
   ```prisma
   // From:
   datasource db {
     provider = "sqlite"
     url      = env("DATABASE_URL")
   }

   // To:
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
4. **Update Environment Variable:**
   Modify the `DATABASE_URL` variable in the Vercel dashboard (or in your production `.env` file) to point to the Supabase connection string:
   ```bash
   DATABASE_URL="postgres://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   ```
5. **Run Migrations in Production:**
   Apply the table structures in the cloud database by running:
   ```bash
   npx prisma migrate deploy
   ```

---

## 4. Application Deployment on Vercel

FleetVault is designed to run as a unified project on Vercel (frontend monorepo with serverless API endpoints).

### Steps in the Vercel Console:
1. **Import the Project:** Connect your Git repository to Vercel and import the project folder.
2. **Root Directory:** Set `/rent-car` as the root directory for the Vercel deployment.
3. **Project Configuration:**
   * **Framework Preset:** Select `Vite` (Vercel will configure dependencies automatically).
   * **Build Command:**
     ```bash
     npm run build
     ```
     *(This command compiles the static frontend and generates Prisma client types in the root).*
   * **Output Directory:** `apps/frontend/dist`
4. **Project Environment Variables:**
   Configure all variables declared in section 1 directly in the Vercel console (under *Settings -> Environment Variables*).
5. **Deploy:** Click "Deploy". Vercel will compile the React SPA, generate the logical routes from the `vercel.json` file, and spin up the serverless API.
