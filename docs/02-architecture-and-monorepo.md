# System Architecture and Monorepo Structure

The **FleetVault Enterprise** project is designed under a monorepo architecture using **NPM Workspaces**. This allows clean separation of backend, frontend, and shared contract logic in a single repository, facilitating integrated deployment and data type consistency.

---

## 1. Monorepo Structure

The monorepo is organized in the root directory as follows:

```
rent-car/
├── package.json             # Defines NPM workspace (workspaces: ["apps/*", "packages/*"])
├── tsconfig.json            # Base TypeScript configuration (ESNext, NodeNext, Strict Mode)
├── vercel.json              # Routing and rewrite rules for Vercel deployment
├── README.md                # Quick start guide and project introduction
├── api/                     # Serverless entry points for Vercel (e.g., api/health.ts)
├── packages/
│   └── common/              # Zod schemas, TypeScript types, and shared enums (@rent-car/common)
└── apps/
    ├── backend/             # Express and Prisma-based REST API server (@rent-car/backend)
    └── frontend/            # React, Vite, and Tailwind-based SPA client (@rent-car/frontend)
```

---

## 2. Shared Contracts: `@rent-car/common`

This package acts as the single source of truth for data validation and TypeScript type definitions. Both the frontend and backend import this package directly.

### Package Contents:
* **`enums.ts`**: Contains all enums represented as TypeScript immutable arrays (`as const`) for system state control:
  * `VehicleStatus` (`AVAILABLE`, `RENTED`, `UNDER_INSPECTION`, `MAINTENANCE`, `RETIRED`)
  * `CleaningStatus` (`CLEAN`, `DIRTY`)
  * `CustomerStatus` (`ACTIVE`, `SUSPENDED`, `BLACKLISTED`)
  * `RentalStatus` (`PENDING`, `ACTIVE`, `COMPLETED`, `CANCELLED`, `NO_SHOW`)
  * `InspectionStatus` (`PASSED`, `FLAGGED`)
  * `FuelLevel` (`EMPTY`, `QUARTER`, `HALF`, `THREE_QUARTERS`, `FULL`)
  * `WorkingShift` (`MORNING`, `AFTERNOON`, `NIGHT`)
  * `CustomerType` (`INDIVIDUAL`, `CORPORATE`)
  * `TransactionType` (`PRE_AUTH_HOLD`, `CHARGE`, `REFUND`, `PO_INVOICE`, `CASH`)
  * `UserRole` (`CUSTOMER`, `INSPECTOR`, `AGENT`, `ADMINISTRATOR`)
  * `EmployeeRole` (`INSPECTOR`, `AGENT`, `ADMINISTRATOR`)
  * `EntityStatus` (`ACTIVE`, `INACTIVE`)
  * `TireCondition` (`GOOD`, `WORN`, `DAMAGED`, `MISSING`)
  * `TirePosition` (`FRONT_LEFT`, `FRONT_RIGHT`, `REAR_LEFT`, `REAR_RIGHT`)
* **`schemas/`**: Zod-based validation schemas. Each entity has two main schemas:
  * Creation schema (e.g., `CreateVehicleSchema` for input payload validation).
  * Entity schema (e.g., `VehicleSchema` which includes the unique ID and timestamp history).

> [!TIP]
> By sharing Zod schemas, any change in a frontend form structure is automatically validated on the backend under the same physical rules, reducing format discrepancy errors in HTTP requests to zero.

---

## 3. Backend: Clean Architecture

The `@rent-car/backend` is structured under **Clean Architecture** principles, decoupling business logic from databases or external payment gateways.

```
apps/backend/src/
├── Domain/                  # Domain rules and logical contracts (no external dependencies)
│   ├── entities/            # Native data models and interfaces
│   ├── repositories/        # Abstract repository interfaces (e.g., IVehicleRepository)
│   └── errors/              # Custom exceptions (NotFoundError, ValidationError, etc.)
│
├── Application/             # Use cases and service orchestration
│   ├── services/            # Business services (AuthService, BillingService, StripeService)
│   └── middleware/          # Express filters (JWT authentication, role verification, Zod validators)
│
├── Infrastructure/          # Technical details and external service adapters
│   ├── repositories/        # Repository implementations connected to Prisma ORM
│   └── external/            # Controllers for Stripe API, Vercel Blob, and PDFKit
│
└── Presentation/            # Entry point and HTTP interfaces
    ├── Controllers/         # Express controllers (convert requests to service calls)
    ├── routes/              # API route definitions grouped by module
    └── server.ts            # Express server entrypoint and global middleware configuration
```

### Dependency Flow
Dependencies flow strictly from the outer layer inward. The **Domain** layer knows nothing about Express, Prisma, or Stripe, making rental business rules portable and independent.

---

## 4. Frontend: SPA Presentation Layer

The `@rent-car/frontend` client is designed to be highly interactive, responsive (adaptable to yard tablets), and tolerant of temporary network failures:

```
apps/frontend/src/
├── main.tsx                 # Entrypoint that initializes React and mounts global providers
├── index.css                # Tailwind CSS v4 configuration and visual theme variables
├── Infrastructure/          # Client-side adapters and integrations
│   ├── api-client.ts        # Axios client with JWT interceptors for automatic session refresh
│   ├── auth.context.tsx     # Authentication and user role provider across the app
│   ├── offline-queue.ts     # IndexedDB controller for storing offline inspections
│   └── hooks/               # TanStack React Query hooks for server data persistence
│
└── Presentation/            # Visual components and views
    ├── components/          # Shared elements (SignaturePad, DataTable, FormModal)
    ├── layouts/             # Routing templates (AdminLayout, CustomerLayout, AuthLayout)
    └── pages/               # Application views (CatalogPage, ReservationsPage, InspectionsPage)
```

---

## 5. Serverless Integration and Deployment

### Vercel Routing (`vercel.json`)
For the application to work in Vercel serverless environments as a unified project, the following configuration is applied:

* Requests directed to `/api/*` are rewritten to point to the serverless functions defined in the root `api/` directory (which import backend controllers).
* All other requests are redirected to the main frontend index file (`/index.html`) to allow **React Router** to handle client-side routing.

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Development Proxy Configuration (`vite.config.ts`)
During local development, Vite starts the frontend server on port `3000` (or `5173`) and Express runs on port `3001`. To avoid CORS (Cross-Origin Resource Sharing) issues, the Vite configuration file defines a reverse proxy:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true
    }
  }
}
```
This allows the client to make HTTP calls to relative paths `/api/vehicles` without exposing secrets or requiring complex CORS headers locally.
