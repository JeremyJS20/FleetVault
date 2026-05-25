# Full-Stack Architecture Reference Guide (General DB)

> Stack: TypeScript · React · Vite · Express · PostgreSQL · Prisma ORM · Vercel  
> Monorepo structure (NPM Workspaces). Uses Prisma ORM for database access and data integrity.

---

## 1. Philosophy

| Principle | What it means |
|---|---|
| **Clean Architecture** | Strict separation into Domain → Application/Services → Infrastructure → Presentation. Inner layers never depend on outer layers. |
| **Monorepo Workspaces** | Strict separation via `apps/frontend`, `apps/backend`, and `packages/common` for shared schemas to guarantee payload synchronization. |
| **Zero Trust / Immutability** | Strict input validation at the edge (two-pass Zod validation). Append-only logic for critical ledgers. |
| **Serverless-First** | Production runs as Vercel Serverless Functions. Local dev emulates with Express using the same handler code. |
| **Convention over Configuration** | File placement determines behavior (Vercel routing, layer boundaries, migration order). |

---

## 2. Technology Stack

### Core

| Role | Technology | Why |
|---|---|---|
| Language | **TypeScript** | Type safety across frontend + backend |
| Frontend | **React 19** | Component model, concurrent features, ecosystem |
| Bundler | **Vite** | Fast HMR, native ESM, simple config |
| UI Components | **HeroUI** | Highly customizable, accessible React component architecture |
| Styling | **TailwindCSS 4** (Vite plugin) | Utility-first, no CSS context switching |
| Routing | **React Router DOM 7** | Declarative, nested routes, data loading |
| Icons | **Lucide React** | Consistent, tree-shakeable icon set |

### Backend

| Role | Technology | Why |
|---|---|---|
| API Framework | **Express 4** | Mature, Vercel-compatible handler signatures |
| Database | **PostgreSQL** via **Prisma ORM** | Schema-driven migrations, type-safe queries, implicit repository pattern |
| Auth | **jsonwebtoken** + **express-jwt** | Stateless JWT auth, middleware-based |
| Password Hashing | **bcryptjs** | Proven, pure-JS (no native deps) |
| File Storage | **Vercel Blob** | Managed object storage, private/public access |
| Validation | **Zod** | Runtime type validation, TypeScript inference |

### DevOps

| Role | Technology | Why |
|---|---|---|
| TS Execution | **tsx** | Run TS directly without compilation step |
| Parallel Dev | **concurrently** | Start frontend + backend simultaneously |
| Deployment | **Vercel** | Zero-config serverless + CDN + blob storage |

---

## 3. Project Structure

```text
monorepo-root/
│
├── api/                              # ⚡ Serverless Functions (auto-deployed by Vercel)
│   └── index.ts                      # Routes to apps/backend server
│
├── apps/
│   ├── backend/                      # 🖥️ Express backend API
│   │   ├── prisma/                   #   Database schema & migrations (Prisma ORM)
│   │   ├── src/
│   │   │   ├── Application/          #   Core use-case logic (Services)
│   │   │   ├── Domain/               #   Pure business rules and entities
│   │   │   ├── Infrastructure/       #   Database connections, external APIs, Middlewares
│   │   │   └── Presentation/         #   Express routers and controllers
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── frontend/                     # 🎨 React/Vite frontend app
│       ├── public/                   #   Static assets and locales
│       ├── src/
│       │   ├── Domain/               #   Frontend representations of business entities
│       │   ├── Infrastructure/       #   HTTP Clients, integrations
│       │   ├── Presentation/         #   React views (Pages, Components, Context, Hooks)
│       │   ├── Validation/           #   Client-side validation
│       │   └── main.tsx              #   React DOM entry point
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
│
├── packages/
│   └── common/                       # 🧠 Shared Zod schemas & TypeScript definitions
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── .env                              # Local environment (gitignored)
├── .env.example                      # Documented env template
├── package.json                      # Monorepo root (Workspaces config)
└── vercel.json                       # Deployment config
```

---

## 4. Layer Architecture

```
┌──────────────────────────────────────┐
│         PRESENTATION (React)         │  Calls /api/* via fetch()
│    pages · components · context      │  Imports domain types only
├──────────────────────────────────────┤
│           API HANDLERS (api/)        │  Vercel Serverless Functions
│      One file = one endpoint         │  Instantiates services/repos
├──────────────────────────────────────┤
│          SERVICES (src/services/)    │  Business logic, external APIs
│     Orchestrates repositories        │  Auth tokens, email, SMS
├──────────────────────────────────────┤
│            DATA (src/data/)          │  Repository classes + DB pool
│      SQL queries, transactions       │  Schema-prefixed queries
├──────────────────────────────────────┤
│          DOMAIN (src/domain/)        │  Pure TypeScript types + Zod schemas
│             No imports               │  Shared by all layers
├──────────────────────────────────────┤
│         INFRASTRUCTURE               │  PostgreSQL, Vercel Blob,
│     (external, never imported)       │  third-party APIs
└──────────────────────────────────────┘
```

### Dependency Rules

| Layer | Can Import From | Cannot Import From |
|---|---|---|
| Domain | Nothing | Everything else |
| Data | Domain | Services, API, Presentation |
| Services | Domain, Data | API, Presentation |
| API Handlers | Domain, Data, Services | Presentation |
| Presentation | Domain (types only) | Data, Services, API (use HTTP) |

---

## 5. Configuration Files

### 5.1 `package.json` (scripts)

```json
{
  "name": "my-app",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
    "dev:frontend": "vite",
    "dev:backend": "tsx src/server/index.ts",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src/ api/",
    "lint:fix": "eslint src/ api/ --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx}\" \"api/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx}\" \"api/**/*.ts\""
  }
}
```

### 5.2 `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => ({
    plugins: [react(), tailwindcss()],

    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },

    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
        },
    },

    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom'],
                    'router': ['react-router-dom'],
                },
            },
        },
        target: 'esnext',
        minify: 'esbuild',
        cssMinify: true,
        sourcemap: mode === 'development',
        chunkSizeWarningLimit: 500,
    },

    optimizeDeps: {
        include: ['react', 'react-dom', 'react-router-dom'],
    },
}));
```

### 5.3 `vercel.json`

```json
{
  "version": 2,
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api/:path*" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

### 5.4 `tsconfig.app.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "noUncheckedIndexedAccess": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"]
}
```

### 5.5 `.env.example`

```bash
# ── Server ──
PORT=3001
NODE_ENV=development

# ── Frontend ──
VITE_APP_URL=http://localhost:5173

# ── Auth ──
JWT_SECRET=change_me_in_production_min_32_chars

# ── Database (PostgreSQL) ──
DATABASE_URL=postgres://user:password@localhost:5432/my_app_db

# ── File Storage ──
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_token

# ── External Services (add as needed) ──
# MAIL_AUTH_URL=
# MAIL_SEND_URL=
# MAIL_USER=
# MAIL_PASS=
```

---

## 6. Database Layer (Prisma ORM)

### 6.1 Database Client (`apps/backend/src/Infrastructure/db.ts`)

Instead of managing raw PostgreSQL connection pools, the architecture utilizes **Prisma ORM** for type-safe queries, schema-driven migrations, and connection management.

```typescript
// apps/backend/src/Infrastructure/db.ts
import { PrismaClient } from '@prisma/client';

// Prevent multiple instances of Prisma Client in development
declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;
```

### 6.2 Schema as the Source of Truth (`schema.prisma`)

Prisma shifts the repository pattern responsibility to the schema itself. Business rules are enforced at the database level using compound unique constraints, ensuring data integrity even if the application layer fails.

```prisma
// apps/backend/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  role      String   @default("USER")
  createdAt DateTime @default(now())
  records   Record[]
}

model Record {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  type      String
  periodId  String
  
  // Enforces complex business rules: One record per user per type per period
  @@unique([userId, type, periodId])
}
```

### 6.3 Service Abstraction (The New Repository)

Because Prisma implicitly provides typed repositories via `prisma.user`, `prisma.record`, explicit repository classes are often unnecessary. Instead, data access is orchestrated within the Application Service layer.

```typescript
// apps/backend/src/Application/Services/recordService.ts
import { prisma } from '../../Infrastructure/db.js';

export class RecordService {
    async createUniqueRecord(userId: string, type: string, periodId: string) {
        // Validation check against active state
        const existing = await prisma.record.findUnique({
            where: {
                userId_type_periodId: { userId, type, periodId }
            }
        });
        
        if (existing) {
            throw Object.assign(new Error('errors.record.already_exists'), { code: 403 });
        }

        // Create transactionally
        return await prisma.record.create({
            data: { userId, type, periodId }
        });
    }
}
```

### 6.4 Database Connection for Vercel Serverless

Vercel Serverless functions execute ephemerally, meaning standard database pooling can quickly exhaust connections. Prisma natively handles this when using connection poolers.

**Recommended Cloud PostgreSQL Providers for Serverless:**
- **Neon** — Serverless Postgres, auto-scaling, natively supports branching.
- **Supabase** — Postgres + auth, built-in PgBouncer connection pooler.

*Configure the connection string to use pooling (e.g., PgBouncer):*
`DATABASE_URL=postgres://user:pass@your-pooler.host:6543/db?pgbouncer=true`

---

## 7. API Handler Pattern (Controller to Service Handoff)

The `Presentation` layer (Controllers) strictly handles HTTP context (req/res) and immediate schema validation using the shared `packages/common` Zod schemas. It immediately passes structured payloads to the `Application` layer (Services), keeping business logic decoupled from Express.

### 7.1 Controller Example

```typescript
// apps/backend/src/Presentation/Controllers/recordController.ts
import type { Request, Response } from 'express';
import { CreateRecordSchema } from '@my-app/common';
import { RecordService } from '../../Application/Services/recordService.js';

const recordService = new RecordService();

export const createRecordHandler = async (req: Request, res: Response) => {
    // 1. Validate Input using Shared Workspace Schema (Zero Trust)
    const parsed = CreateRecordSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: parsed.error.flatten().fieldErrors,
        });
    }

    // 2. Pure Handoff to Application Layer
    try {
        const record = await recordService.createUniqueRecord(
            parsed.data.userId, 
            parsed.data.type, 
            parsed.data.periodId
        );
        return res.status(201).json({ success: true, data: record });
    } catch (error: any) {
        // Business logic errors return a code (e.g. 403, 404)
        return res.status(error.code || 500).json({ 
            success: false, 
            error: error.message || 'Internal Server Error' 
        });
    }
};
```

### 7.2 Vercel Serverless Entry Point

Vercel maps `/api/*` endpoints to individual serverless functions. We route these to our controllers.

```typescript
// api/records/index.ts
import type { Request, Response } from 'express';
import { createRecordHandler } from '../../apps/backend/src/Presentation/Controllers/recordController.js';

export default async function handler(req: Request, res: Response) {
    if (req.method === 'POST') return createRecordHandler(req, res);
    // ...handle GET
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
}
```

---

## 8. Express Dev Server

```typescript
// src/server/index.ts
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { validateEnv } from './env.js';
import { errorHandler } from './errorHandler.js';
import { closePool } from '@/data/db.js';

// Handlers
import entityHandler from '../../api/entities/index.js';
import entityDetailHandler from '../../api/entities/[id].js';
import healthHandler from '../../api/health.js';
import loginHandler from '../../api/auth/login.js';

const env = validateEnv();
const app = express();
const jsonParser = express.json({ limit: '10mb' });

// Security
app.use(helmet());
app.use(cors({
    origin: env.NODE_ENV === 'production'
        ? ['https://your-domain.com']
        : ['http://localhost:5173'],
    credentials: true,
}));
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Routes
app.get('/api/health', (req, res) => healthHandler(req as any, res as any));
app.post('/api/auth/login', jsonParser, (req, res) => loginHandler(req as any, res as any));
app.get('/api/entities', (req, res) => entityHandler(req as any, res as any));
app.post('/api/entities', jsonParser, (req, res) => entityHandler(req as any, res as any));
app.get('/api/entities/:id', (req, res) => {
    req.query.id = req.params.id;
    entityDetailHandler(req as any, res as any);
});
app.put('/api/entities/:id', jsonParser, (req, res) => {
    req.query.id = req.params.id;
    entityDetailHandler(req as any, res as any);
});
app.delete('/api/entities/:id', (req, res) => {
    req.query.id = req.params.id;
    entityDetailHandler(req as any, res as any);
});

// Error handler (MUST be last)
app.use(errorHandler);

const server = app.listen(env.PORT, () => {
    console.log(`[Backend] Running on port ${env.PORT} (${env.NODE_ENV})`);
});

// Graceful shutdown
function shutdown(signal: string) {
    console.log(`\n[Backend] ${signal} received. Shutting down...`);
    server.close(async () => {
        await closePool();
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

---

## 9. Environment Validation

```typescript
// src/server/env.ts
import { z } from 'zod';

const ServerEnvSchema = z.object({
    PORT: z.string().default('3001'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    DATABASE_URL: z.string().url('DATABASE_URL must be a valid postgres:// URL'),
    BLOB_READ_WRITE_TOKEN: z.string().optional(),
    VITE_APP_URL: z.string().default('http://localhost:5173'),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

export function validateEnv(): ServerEnv {
    const result = ServerEnvSchema.safeParse(process.env);
    if (!result.success) {
        console.error('❌ Invalid environment variables:');
        console.error(result.error.flatten().fieldErrors);
        process.exit(1);
    }
    return result.data;
}
```

---

## 10. Domain Layer (Shared Workspace)

To ensure **Zero-Trust Validation**, the frontend and backend must strictly agree on the shape of data. This is achieved by extracting the domain layer into a shared npm workspace (e.g., `packages/common`).

### 10.1 Shared Zod Schemas

```typescript
// packages/common/src/index.ts
import { z } from 'zod';

// ── Identity / Core Entities ──
export const UserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email('errors.auth.invalid_email'),
    role: z.enum(['ADMIN', 'USER']).default('USER'),
});
export type User = z.infer<typeof UserSchema>;

export const CreateUserSchema = UserSchema.omit({ id: true });
export type CreateUserPayload = z.infer<typeof CreateUserSchema>;

// ── Strict API Payloads ──
export const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});

export const PaginationSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Complex Discriminated Unions ──
// Useful for ensuring that the backend receives EXACTLY what it expects for specific transaction types.
export const ActionPayloadSchema = z.object({
    actionId: z.string().min(1),
    metadata: z.record(z.unknown()), // Backend will validate further internally
});
```

### 10.2 Symmetrical Validation Usage

Both the frontend and backend import from this shared package. 

**Frontend (Client-Side Check before Network Request):**
```typescript
import { CreateUserSchema } from '@my-app/common';
// Use with react-hook-form + zodResolver to catch errors before hitting the network.
```

**Backend (Zero-Trust Enforcement):**
```typescript
import { CreateUserSchema } from '@my-app/common';

export const createHandler = async (req: Request, res: Response) => {
    // 1. Zod parses and strips unneeded fields. The backend NEVER trusts the frontend.
    const result = CreateUserSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error });
    
    // 2. Pass strictly-typed, clean data to Application Service
    await userService.create(result.data);
}
```

---

## 11. Server Utilities

### Response Envelope

```typescript
// src/server/response.ts
export function ok<T>(res: any, data: T, meta?: Record<string, any>) {
    return res.status(200).json({ success: true, data, meta });
}
export function created<T>(res: any, data: T) {
    return res.status(201).json({ success: true, data });
}
export function badRequest(res: any, error: string, details?: Record<string, string[]>) {
    return res.status(400).json({ success: false, error, details });
}
export function unauthorized(res: any, error = 'Unauthorized') {
    return res.status(401).json({ success: false, error });
}
export function forbidden(res: any, error = 'Forbidden') {
    return res.status(403).json({ success: false, error });
}
export function notFound(res: any, error = 'Not found') {
    return res.status(404).json({ success: false, error });
}
export function conflict(res: any, error: string) {
    return res.status(409).json({ success: false, error });
}
export function serverError(res: any, error = 'Internal Server Error') {
    return res.status(500).json({ success: false, error });
}
```

### AppError + Error Handler

```typescript
// src/server/AppError.ts
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, AppError.prototype);
    }

    static badRequest(msg: string) { return new AppError(msg, 400); }
    static unauthorized(msg = 'Unauthorized') { return new AppError(msg, 401); }
    static forbidden(msg = 'Forbidden') { return new AppError(msg, 403); }
    static notFound(msg = 'Not found') { return new AppError(msg, 404); }
    static conflict(msg: string) { return new AppError(msg, 409); }
}
```

```typescript
// src/server/errorHandler.ts
import type { Request, Response, NextFunction } from 'express';
import { AppError } from './AppError.js';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ success: false, error: err.message });
    }
    console.error('[ErrorHandler]', err.message, err.stack);
    return res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
    });
}
```

### Async Handler + Auth Middleware

```typescript
// src/server/asyncHandler.ts
import type { Request, Response, NextFunction, RequestHandler } from 'express';

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler {
    return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
```

```typescript
// src/server/middleware.ts
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'Token required' });

    try {
        (req as any).user = jwt.verify(token, process.env.JWT_SECRET!);
        next();
    } catch {
        return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    }
}

export function requireRole(...roles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;
        if (!user || !roles.includes(user.role)) {
            return res.status(403).json({ success: false, error: 'Insufficient permissions' });
        }
        next();
    };
}
```

### Logger

```typescript
// src/server/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function log(level: LogLevel, ctx: string, msg: string, data?: Record<string, any>) {
    const entry = JSON.stringify({ level, context: ctx, message: msg, timestamp: new Date().toISOString(), data });
    level === 'error' ? console.error(entry) : level === 'warn' ? console.warn(entry) : console.log(entry);
}

export const logger = {
    debug: (ctx: string, msg: string, data?: Record<string, any>) => log('debug', ctx, msg, data),
    info:  (ctx: string, msg: string, data?: Record<string, any>) => log('info',  ctx, msg, data),
    warn:  (ctx: string, msg: string, data?: Record<string, any>) => log('warn',  ctx, msg, data),
    error: (ctx: string, msg: string, data?: Record<string, any>) => log('error', ctx, msg, data),
};
```

---

## 12. React Frontend

### 12.1 State Delegation
Global state is managed via specialized React Contexts (e.g., `AuthContext`, `TransactionContext`) that wrap the application. This prevents prop-drilling while keeping state strongly typed, avoiding bloated Redux stores for simple global flags.

### 12.2 Structural UI Layering (HeroUI + Tailwind)
Components should utilize `HeroUI` wrapped in generic, unopinionated project-specific wrappers. The visual aesthetic strictly enforces **"Tonal Architecture"**—meaning components achieve depth and hierarchy through background color opacity (e.g., `bg-surface-container-highest`) and structural shadows, actively avoiding explicit borders or harsh lines. 

**Example of Tonal Layering:**
```tsx
<div className="w-32 h-32 rounded-full bg-surface-container-low relative shadow-sm">
  {/* Layered Circular Depth - Institutional Aesthetic without lines */}
  <div className="absolute inset-2 rounded-full bg-surface-container-high opacity-40"></div>
  <div className="absolute inset-4 rounded-full bg-primary-fixed opacity-50"></div>
</div>
```

### 12.3 Entry Point

```tsx
// src/main.tsx
import './i18n.js';
import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from '@/presentation/components/ErrorBoundary.js';
import { AuthProvider } from '@/presentation/context/AuthContext.js';
import App from '@/presentation/App.js';
import './index.css';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ErrorBoundary>
            <Suspense fallback={<div>Loading...</div>}>
                <BrowserRouter>
                    <AuthProvider>
                        <App />
                    </AuthProvider>
                </BrowserRouter>
            </Suspense>
        </ErrorBoundary>
    </StrictMode>
);
```

### App with Lazy Routes

```tsx
// src/presentation/App.tsx
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/presentation/hooks/useAuth.js';

const HomePage = lazy(() => import('./pages/HomePage.js'));
const LoginPage = lazy(() => import('./pages/LoginPage.js'));
const Dashboard = lazy(() => import('./pages/Dashboard.js'));
const Settings = lazy(() => import('./pages/Settings.js'));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated } = useAuth();
    const location = useLocation();
    if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
    return children;
};

export default function App() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-[50vh]">Loading...</div>}>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
    );
}
```

### Data Fetching Hooks

```typescript
// src/presentation/hooks/useFetch.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth.js';

export function useFetch<T>(url: string, options: { authenticated?: boolean } = {}) {
    const { token } = useAuth();
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (signal?: AbortSignal) => {
        setLoading(true); setError(null);
        try {
            const headers: Record<string, string> = {};
            if (options.authenticated && token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(url, { signal, headers });
            if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || `HTTP ${res.status}`); }
            const json = await res.json();
            if (!signal?.aborted) setData(json.data ?? json);
        } catch (err: any) {
            if (err.name !== 'AbortError') setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [url, token, options.authenticated]);

    useEffect(() => {
        const controller = new AbortController();
        fetchData(controller.signal);
        return () => controller.abort();
    }, [fetchData]);

    return { data, loading, error, refetch: () => fetchData() };
}
```

```typescript
// src/presentation/hooks/useMutation.ts
import { useState } from 'react';
import { useAuth } from './useAuth.js';

export function useMutation<TIn, TOut>(url: string, method: 'POST' | 'PUT' | 'DELETE' = 'POST') {
    const { token } = useAuth();
    const [data, setData] = useState<TOut | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = async (body?: TIn): Promise<TOut | null> => {
        setLoading(true); setError(null);
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                ...(body ? { body: JSON.stringify(body) } : {}),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
            const result = json.data ?? json;
            setData(result);
            return result;
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    return { data, loading, error, mutate, reset: () => { setData(null); setError(null); } };
}
```

---

## 13. Database Conventions (Prisma)

```prisma
// apps/backend/prisma/schema.prisma

// 1. Always use UUIDs/CUIDs for IDs
model Entity {
    id          String   @id @default(cuid())
    name        String
    email       String   @unique
    status      String   @default("ACTIVE")
    
    // 2. Use JSON for unstructured data
    metadata    Json     @default("{}")
    
    // 3. Automatic Timestamps
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt
    
    // 4. Heavy use of compound unique constraints to enforce data integrity
    @@unique([name, status])
}
```

| Decision | When to Use |
|---|---|
| **CUIDs/UUIDs** as PKs | Always — safe for distributed/serverless. (`@default(cuid())`) |
| **Json** | Variable-length nested data, flexible metadata. |
| **Relational Fields** | Fixed catalogs, reference data. Define explicitly in Prisma. |
| **Unique Constraints** | Natural keys (slug, code, email) AND complex business rules (e.g. `@@unique([userId, periodId])`). |
| **Enums vs Strings** | Use native Prisma Enums if supported by the DB, otherwise use strings with Zod validation at the edge. |

---

## 14. Checklists

### New Feature (Monorepo Flow)

```
[ ] 1. Domain types & Zod schema in packages/common/src/index.ts
[ ] 2. Prisma model in apps/backend/prisma/schema.prisma
[ ] 3. Run `npx prisma db push` or `npx prisma migrate dev`
[ ] 4. Application Service in apps/backend/src/Application/Services/
[ ] 5. Express Controller in apps/backend/src/Presentation/Controllers/
[ ] 6. Route in apps/backend/src/Presentation/routes.ts
[ ] 7. Vercel Serverless Route in api/
[ ] 8. React hook/client in apps/frontend/src/Infrastructure/
[ ] 9. React page in apps/frontend/src/Presentation/Pages/
[ ] 10. Route in apps/frontend/src/Presentation/App.tsx
```

### Deployment

```
[ ] All env vars set in Vercel
[ ] DATABASE_URL points to cloud Postgres (Neon/Supabase/Railway)
[ ] Connection pooler configured in DATABASE_URL (pgbouncer=true)
[ ] Prisma generate added to build step (`prisma generate && vite build`)
[ ] vercel.json rewrites point to api/ folder
[ ] JWT_SECRET is strong and unique
```

---

## 15. Common Pitfalls

| Problem | Fix |
|---|---|
| Route works on Vercel but not locally | Register in `src/server/index.ts` |
| Handler can't read `:id` param | Bridge: `req.query.id = req.params.id` |
| Too many DB connections on Vercel | Reduce `max` pool size to 3-5, or use a connection pooler |
| Request body is `undefined` | Add `jsonParser` middleware to route |
| Large upload times out | `express.json({ limit: '10mb' })` |
| New env var not available | Add to `.env` AND Vercel dashboard |
| Frontend can't reach `/api` in dev | Check Vite proxy targets port 3001 |
| Import path breaks after refactor | Use `@/` aliases instead of relative paths |

---

## 16. Input Validation (Zod)

### Schema Definition

```typescript
// src/domain/schemas.ts
import { z } from 'zod';

export const CreateEntitySchema = z.object({
    name: z.string().min(1, 'Name is required').max(200),
    email: z.string().email('Invalid email'),
    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
    metadata: z.record(z.unknown()).optional().default({}),
    tags: z.array(z.string()).optional().default([]),
});

export type CreateEntityPayload = z.infer<typeof CreateEntitySchema>;
```

### Usage in API Handlers

```typescript
import { CreateEntitySchema } from '../../src/domain/schemas.js';

export default async function handler(req: Request, res: Response) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    // Validate input — returns typed data or formatted errors
    const parsed = CreateEntitySchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            error: 'Validation failed',
            details: parsed.error.flatten().fieldErrors,
        });
    }

    // parsed.data is now fully typed and sanitized
    const { name, email, status } = parsed.data;
    // ... proceed with clean data
}
```

**Conventions:**
- Define schemas in `src/domain/schemas.ts` (next to `types.ts`)
- Use `z.infer<typeof Schema>` to derive TypeScript types from schemas
- Always use `safeParse()` (never `parse()`) to avoid thrown exceptions
- Return `error.flatten().fieldErrors` for structured error response
- Reuse schemas across handlers — compose with `.extend()`, `.pick()`, `.omit()`

---

## 17. API Response Envelope

Standardize all API responses with a consistent shape:

```typescript
// src/server/response.ts

interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    details?: Record<string, string[]>;  // Validation field errors
    meta?: {
        page?: number;
        pageSize?: number;
        total?: number;
    };
}
```

### Usage in Handlers

```typescript
import { ok, created, badRequest, serverError } from '../../src/server/response.js';

export default async function handler(req: Request, res: Response) {
    if (req.method === 'GET') {
        try {
            const items = await repo.listAll();
            return ok(res, items, { total: items.length });
        } catch (e: any) {
            console.error('[entities] GET error:', e);
            return serverError(res);
        }
    }

    if (req.method === 'POST') {
        const parsed = CreateEntitySchema.safeParse(req.body);
        if (!parsed.success) {
            return badRequest(res, 'Validation failed', parsed.error.flatten().fieldErrors);
        }

        try {
            const id = await repo.create(parsed.data);
            return created(res, { id });
        } catch (e: any) {
            return serverError(res, e.message);
        }
    }

    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
}
```

### Frontend Consumption

```typescript
const res = await fetch('/api/entities');
const json = await res.json();

if (json.success) {
    setItems(json.data);
} else {
    setError(json.error);
    if (json.details) setFieldErrors(json.details);  // Per-field validation errors
}
```

---

## 18. Protected API Middleware (Backend JWT)

### Express Middleware

```typescript
// src/server/middleware.ts
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_dev_key';

export interface AuthenticatedRequest extends Request {
    user: { id: string; email: string; role: string };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'Token required' });

    try {
        const payload = jwt.verify(token, JWT_SECRET) as AuthenticatedRequest['user'];
        (req as any).user = payload;
        next();
    } catch (err) {
        return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    }
}

export function requireRole(...roles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;
        if (!user || !roles.includes(user.role)) {
            return res.status(403).json({ success: false, error: 'Insufficient permissions' });
        }
        next();
    };
}
```

### Usage in Dev Server

```typescript
import { requireAuth, requireRole } from './middleware.js';

// Any authenticated user
app.get('/api/profile', requireAuth, (req, res) => profileHandler(req, res));

// Admin only
app.get('/api/admin/users', requireAuth, requireRole('ADMIN'), (req, res) => ...);

// In the handler, access the typed user:
export default async function handler(req: AuthenticatedRequest, res: Response) {
    const userEmail = req.user.email;
}
```

### For Vercel Serverless (No Express Middleware)

```typescript
// Inline token extraction in the handler:
import jwt from 'jsonwebtoken';

export default async function handler(req: any, res: any) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });

    let user;
    try {
        user = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; email: string; role: string };
    } catch {
        return res.status(403).json({ success: false, error: 'Invalid token' });
    }

    // Now use user.email, user.role, etc.
}
```

---

## 19. Structured Logging

```typescript
// src/server/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: string;         // e.g., '[EnrollmentHandler]'
    requestId?: string;       // Correlation ID
    data?: Record<string, any>;
}

function log(level: LogLevel, context: string, message: string, data?: Record<string, any>) {
    const entry: LogEntry = { level, message, timestamp: new Date().toISOString(), context, data };
    const output = JSON.stringify(entry);
    switch (level) {
        case 'error': console.error(output); break;
        case 'warn':  console.warn(output);  break;
        default:      console.log(output);
    }
}

export const logger = {
    debug: (ctx: string, msg: string, data?: Record<string, any>) => log('debug', ctx, msg, data),
    info:  (ctx: string, msg: string, data?: Record<string, any>) => log('info',  ctx, msg, data),
    warn:  (ctx: string, msg: string, data?: Record<string, any>) => log('warn',  ctx, msg, data),
    error: (ctx: string, msg: string, data?: Record<string, any>) => log('error', ctx, msg, data),
};
```

### Usage in Handlers

```typescript
import { logger } from '../../src/server/logger.js';

export default async function handler(req: Request, res: Response) {
    logger.info('[entities]', 'Creating entity', { name: req.body.name });

    try {
        const id = await repo.create(req.body);
        logger.info('[entities]', 'Entity created', { id });
        return res.status(201).json({ success: true, data: { id } });
    } catch (error: any) {
        logger.error('[entities]', 'Creation failed', { error: error.message });
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
}
```

**Benefits:**
- JSON output — parseable by Vercel Logs, Datadog, etc.
- Structured context and data fields for filtering
- Consistent format across all handlers and services
- Easy to extend with request ID correlation

---

## 20. Express Security Hardening

### Secure Express Configuration

```typescript
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from './rateLimit.js';

// ── Security Headers ──
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],     // TailwindCSS needs inline styles
            imgSrc: ["'self'", 'data:', 'blob:', '*.vercel-storage.com'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", 'fonts.gstatic.com'],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    strictTransportSecurity: {
        maxAge: 31536000,            // 1 year
        includeSubDomains: true,
        preload: true,
    },
}));

// ── CORS ──
app.use(cors({
    origin: env.NODE_ENV === 'production'
        ? ['https://your-domain.com']   // Explicit whitelist in production
        : ['http://localhost:5173'],     // Vite dev server
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    optionsSuccessStatus: 200,
}));

// ── Rate Limiting ──
app.use('/api', rateLimit(60000, 100));            // Global: 100/min
app.use('/api/auth', rateLimit(60000, 10));         // Auth: 10/min

// ── Trust Proxy (behind Vercel/Nginx/ALB) ──
app.set('trust proxy', 1);
app.disable('x-powered-by');
```

### AsyncHandler + AppError Together

```typescript
import { asyncHandler } from './asyncHandler.js';
import { AppError } from './AppError.js';

// In dev server route registration:
app.get('/api/entities/:id', asyncHandler(async (req, res) => {
    req.query.id = req.params.id;

    const entity = await repo.findById(req.query.id as string);
    if (!entity) {
        throw AppError.notFound('Entity not found');  // Automatically caught and formatted
    }

    return res.status(200).json({ success: true, data: entity });
}));

// No try/catch needed — errors flow to errorHandler middleware
```

---

## 21. Vite Build Optimization

### Bundle Analysis

```bash
# Visualize bundle composition
npm i -D vite-bundle-analyzer

# Add to vite.config.ts plugins (dev only):
# import { analyzer } from 'vite-bundle-analyzer';
# plugins: [react(), tailwindcss(), analyzer()],

# Or analyze after build:
npx vite-bundle-analyzer
```

### Environment Variable Rules

| Prefix | Exposed To | Example |
|---|---|---|
| `VITE_` | Client bundle (visible in browser) | `VITE_APP_URL`, `VITE_FEATURE_FLAG` |
| No prefix | Server only (never in bundle) | `JWT_SECRET`, `DATABASE_URL` |

```
⚠️ NEVER put secrets in VITE_ variables — they are embedded in the JS bundle
   and visible in browser dev tools.
```

### Image & Asset Optimization

```bash
npm i -D vite-plugin-imagemin
```

```typescript
// vite.config.ts
import imagemin from 'vite-plugin-imagemin';

plugins: [
    react(),
    tailwindcss(),
    imagemin({
        gifsicle: { optimizationLevel: 3 },
        mozjpeg: { quality: 80 },
        pngquant: { quality: [0.65, 0.9] },
        svgo: { plugins: [{ removeViewBox: false }] },
    }),
],
```

---

## 22. Graceful Shutdown

```typescript
// Add to src/server/index.ts

import { closePool } from '@/data/db.js';

const server = app.listen(PORT, () => {
    console.log(`[Backend] Running on port ${PORT}`);
});

function shutdown(signal: string) {
    console.log(`\n[Backend] ${signal} received. Shutting down...`);

    // 1. Stop accepting new connections
    server.close(async () => {
        console.log('[Backend] HTTP server closed');

        try {
            // 2. Close database connections
            await closePool();
            console.log('[Backend] Database connections closed');
        } catch (err) {
            console.error('[Backend] Error during cleanup:', err);
        }

        // 3. Exit
        process.exit(0);
    });

    // Force exit after 10s if graceful shutdown stalls
    setTimeout(() => {
        console.error('[Backend] Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Catch unhandled errors globally
process.on('unhandledRejection', (reason: any) => {
    console.error('[Backend] Unhandled Rejection:', reason);
    // Don't exit — log and continue (unless critical)
});

process.on('uncaughtException', (error: Error) => {
    console.error('[Backend] Uncaught Exception:', error);
    shutdown('uncaughtException');  // Exit — state may be corrupted
});
```

---

## 23. Auth Context

```tsx
// src/presentation/context/AuthContext.tsx
import { createContext, useState, useEffect, ReactNode } from 'react';

interface User {
    id: string;
    email: string;
    role: string;
    name: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType>({
    user: null, token: null,
    login: () => {}, logout: () => {},
    isAuthenticated: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);

    // Restore from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('token');
        if (stored) {
            try {
                const payload = JSON.parse(atob(stored.split('.')[1]));
                if (payload.exp * 1000 >= Date.now()) {
                    setToken(stored);
                    setUser(JSON.parse(localStorage.getItem('user')!));
                } else {
                    logout();
                }
            } catch { logout(); }
        }
    }, []);

    // Periodic expiry check
    useEffect(() => {
        const interval = setInterval(() => {
            const t = localStorage.getItem('token');
            if (t) {
                try {
                    const payload = JSON.parse(atob(t.split('.')[1]));
                    if (payload.exp * 1000 < Date.now()) logout();
                } catch { logout(); }
            }
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    const login = (newToken: string, newUser: User) => {
        setToken(newToken); setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
    };

    const logout = () => {
        setToken(null); setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
};
```

```typescript
// src/presentation/hooks/useAuth.ts
import { useContext } from 'react';
import { AuthContext } from '@/presentation/context/AuthContext.js';

export function useAuth() {
    return useContext(AuthContext);
}
```

---

## 24. External Service Integration

```typescript
// src/services/ExternalApiService.ts
export class ExternalApiService {
    private cachedToken: string | null = null;
    private tokenExpiresAt: number = 0;

    /**
     * OAuth2 client-credentials flow with caching.
     */
    private async getToken(): Promise<string> {
        if (this.cachedToken && Date.now() < this.tokenExpiresAt - 60000) {
            return this.cachedToken;
        }

        const { AUTH_URL, CLIENT_ID, CLIENT_SECRET } = process.env;
        if (!AUTH_URL || !CLIENT_ID || !CLIENT_SECRET) {
            throw new Error('Service config missing in .env');
        }

        const res = await fetch(AUTH_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });

        if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
        const data = await res.json() as { access_token: string; expires_in: number };

        this.cachedToken = data.access_token;
        this.tokenExpiresAt = Date.now() + data.expires_in * 1000;
        return this.cachedToken;
    }

    async callApi<T>(path: string, method = 'GET', body?: any): Promise<T> {
        const token = await this.getToken();
        const res = await fetch(`${process.env.SERVICE_BASE_URL}${path}`, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            ...(body ? { body: JSON.stringify(body) } : {})
        });

        if (!res.ok) {
            const err = await res.text();
            console.error(`[ExternalApi] ${method} ${path} failed:`, res.status, err);
            throw new Error(`External API error: ${res.status}`);
        }

        return res.json() as T;
    }
}
```

---

## 25. Email / Notification Service

```typescript
// src/services/EmailService.ts
export class EmailService {
    private async getToken(): Promise<string> {
        const { MAIL_AUTH_URL, MAIL_USER, MAIL_PASS } = process.env;
        const hash = Buffer.from(`${MAIL_USER}:${MAIL_PASS}`).toString('base64');

        const res = await fetch(MAIL_AUTH_URL!, {
            method: 'POST',
            headers: { 'Authorization': `Basic ${hash}` }
        });

        const data = await res.json() as { access_token: string };
        return data.access_token;
    }

    async sendEmail(to: string, subject: string, htmlBody: string): Promise<boolean> {
        try {
            const token = await this.getToken();
            const res = await fetch(process.env.MAIL_SEND_URL!, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ subject, body: htmlBody, addresses: [to] })
            });
            return res.ok;
        } catch (error) {
            console.error('[EmailService] Failed:', error);
            return false;  // Non-blocking — never crash the caller
        }
    }
}
```

---

## 26. React Error Boundary

```tsx
// src/presentation/components/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', minHeight: '50vh', padding: '2rem',
                    textAlign: 'center'
                }}>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
                        Something went wrong
                    </h2>
                    <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                        An unexpected error occurred. Please reload the page.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '0.75rem 1.5rem', borderRadius: '0.5rem',
                            backgroundColor: '#6D28D9', color: 'white',
                            border: 'none', cursor: 'pointer', fontWeight: 600
                        }}
                    >
                        Reload Page
                    </button>
                    {import.meta.env.DEV && this.state.error && (
                        <pre style={{
                            marginTop: '2rem', padding: '1rem', background: '#fee2e2',
                            borderRadius: '0.5rem', fontSize: '0.75rem', textAlign: 'left',
                            maxWidth: '100%', overflow: 'auto'
                        }}>
                            {this.state.error.message}{'\n'}{this.state.error.stack}
                        </pre>
                    )}
                </div>
            );
        }
        return this.props.children;
    }
}
```

---

## 27. File Uploads (Vercel Blob)

```typescript
import { put, del } from '@vercel/blob';

async function uploadFile(base64Data: string, path: string, contentType = 'image/jpeg'): Promise<string> {
    const clean = base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(clean, 'base64');
    const blob = await put(path, buffer, {
        access: 'private',
        contentType,
        token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
}

async function deleteFile(url: string): Promise<void> {
    await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN });
}
```

**Conventions:**
- Organize blob paths: `{entity_type}/{entity_id}/{filename}`
- Insert DB record **before** uploading (so you have the ID for the path)
- Update the record with the blob URL **after** successful upload
- Use `access: 'private'` for sensitive files, `'public'` for assets

---

## 28. Health Check Endpoint

```typescript
// api/health.ts
import { query } from '../src/data/db.js';

export default async function handler(req: any, res: any) {
    const checks: Record<string, 'ok' | 'error'> = {};

    try {
        await query('SELECT 1');
        checks.database = 'ok';
    } catch {
        checks.database = 'error';
    }

    const allOk = Object.values(checks).every(v => v === 'ok');

    return res.status(allOk ? 200 : 503).json({
        status: allOk ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        checks,
        version: process.env.npm_package_version || '0.0.0',
    });
}
```

---

## 29. Rate Limiting

```typescript
// src/server/rateLimit.ts
import type { Request, Response, NextFunction } from 'express';

const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(windowMs = 60000, maxHits = 60) {
    return (req: Request, res: Response, next: NextFunction) => {
        const key = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
        const now = Date.now();
        const record = hits.get(key);

        if (!record || now > record.resetAt) {
            hits.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }

        if (record.count >= maxHits) {
            res.setHeader('Retry-After', Math.ceil((record.resetAt - now) / 1000));
            return res.status(429).json({ success: false, error: 'Too many requests.' });
        }

        record.count++;
        next();
    };
}
```

**Recommended limits:**

| Route | Window | Max |
|---|---|---|
| General API | 1 min | 100 |
| Auth endpoints | 1 min | 10 |
| File uploads | 1 min | 5 |
| Health check | 1 min | 30 |

For production (Vercel serverless resets in-memory on cold starts):
- Use **Vercel KV** (`@vercel/kv`) for persistent rate limiting
- Or use **Vercel WAF / Firewall Rules** (no code needed)

---

## 30. TypeScript Patterns

### Path Aliases (`@/` Imports)

```typescript
// ❌ BAD
import { User } from '../../../domain/types';

// ✅ GOOD
import { User } from '@/domain/types';
```

Setup: `tsconfig.app.json` → `"paths": { "@/*": ["src/*"] }` + `vite.config.ts` → `alias: { '@': resolve(__dirname, 'src') }`

### Discriminated Unions

```typescript
type RequestState<T> =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; data: T }
    | { status: 'error'; error: string };

function renderState<T>(state: RequestState<T>) {
    switch (state.status) {
        case 'idle': return null;
        case 'loading': return <Spinner />;
        case 'success': return <DataView data={state.data} />;
        case 'error': return <ErrorMessage message={state.error} />;
    }
}
```

### Branded Types

```typescript
type Brand<T, B> = T & { __brand: B };
type UserId = Brand<string, 'UserId'>;
type ProductId = Brand<string, 'ProductId'>;

function getUser(id: UserId) { /* ... */ }
const userId = 'abc' as UserId;
const productId = 'xyz' as ProductId;
getUser(userId);      // ✅
getUser(productId);   // ❌ Type error
```

### Utility Types

```typescript
interface User {
    id: string; email: string; name: string;
    role: 'ADMIN' | 'USER'; createdAt: Date;
}

type CreateUserPayload = Omit<User, 'id' | 'createdAt'>;
type UpdateUserPayload = Partial<Pick<User, 'name' | 'role'>>;
type UserSummary = Pick<User, 'id' | 'name' | 'email'>;
type ReadonlyUser = Readonly<User>;

const DEFAULT_USER = {
    role: 'USER' as const, name: '', email: '',
} satisfies Partial<User>;
```

### Env Type Safety

```typescript
// src/env.d.ts
/// <reference types="vite/client" />
interface ImportMetaEnv {
    readonly VITE_APP_URL: string;
    readonly VITE_API_BASE_URL?: string;
}
interface ImportMeta {
    readonly env: ImportMetaEnv;
}
```

---

## 31. React Performance

### Preloading Critical Routes

```typescript
const DashboardPage = lazy(() => import('./pages/Dashboard.js'));

function NavLink() {
    const preload = () => import('./pages/Dashboard.js');
    return <Link to="/dashboard" onMouseEnter={preload} onFocus={preload}>Dashboard</Link>;
}
```

### Memoization Guidelines (React 19+)

```tsx
// React 19 Compiler handles most memoization automatically.
// Manual memo still useful for:

// 1. Expensive computations
const sortedItems = useMemo(() => items.sort((a, b) => a.name.localeCompare(b.name)), [items]);

// 2. Stable callbacks for heavy child components
const handleSubmit = useCallback((data: FormData) => submitForm(data), [submitForm]);

// 3. Preventing re-renders of heavy trees
const MemoizedChart = React.memo(({ data }: { data: DataPoint[] }) => <HeavyChartLibrary data={data} />);

// ❌ DON'T memo trivial operations
```

### Avoid Barrel Files

```
// ❌ BAD — src/components/index.ts re-exports force Vite to process everything
export { Button } from './Button';
export { DataTable } from './DataTable';  // Heavy, loaded even if unused

// ✅ GOOD — direct imports
import { Button } from '@/presentation/components/Button';
```

### List Virtualization

```tsx
// For lists > 100 items — npm i @tanstack/react-virtual
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }: { items: Item[] }) {
    const parentRef = useRef<HTMLDivElement>(null);
    const virtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 60,
    });

    return (
        <div ref={parentRef} style={{ height: '500px', overflow: 'auto' }}>
            <div style={{ height: virtualizer.getTotalSize() }}>
                {virtualizer.getVirtualItems().map(row => (
                    <div key={row.key} style={{
                        position: 'absolute', top: row.start,
                        height: row.size, width: '100%'
                    }}>
                        <ItemRow item={items[row.index]} />
                    </div>
                ))}
            </div>
        </div>
    );
}
```

---

## 32. Accessibility (a11y)

### Semantic HTML First

```tsx
// ❌ BAD
<div onClick={handleClick} className="button-style">Submit</div>

// ✅ GOOD
<button onClick={handleClick} type="submit">Submit</button>
<nav aria-label="Main navigation"><a href="/">Home</a></nav>
```

### Interactive Elements

```tsx
// Icon-only button — needs aria-label
<button onClick={onClose} aria-label="Close dialog"><X size={20} /></button>

// Toggle — sync aria-expanded with state
<button onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="menu">Menu</button>
<div id="menu" role="menu" hidden={!open}>{/* items */}</div>
```

### Focus Management (Modals)

```tsx
function Modal({ isOpen, onClose, children }: ModalProps) {
    const closeRef = useRef<HTMLButtonElement>(null);
    const triggerRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (isOpen) {
            triggerRef.current = document.activeElement as HTMLElement;
            closeRef.current?.focus();
        } else {
            triggerRef.current?.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;
    return (
        <div role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <h2 id="modal-title">Dialog Title</h2>
            {children}
            <button ref={closeRef} onClick={onClose}>Close</button>
        </div>
    );
}
```

### Skip Navigation + Live Regions

```tsx
// Skip nav — first element in body
<a href="#main-content" className="sr-only focus:not-sr-only">Skip to main content</a>

<main id="main-content" tabIndex={-1}>{/* content */}</main>

// Live region — screen readers announce dynamically
<div aria-live="polite" role="status">{notification?.message}</div>
<div aria-live="assertive" role="alert">{error && <p>{error}</p>}</div>
```

### Focus Indicators

```css
*:focus-visible {
    outline: 2px solid #6D28D9;
    outline-offset: 2px;
    border-radius: 4px;
}
*:focus:not(:focus-visible) {
    outline: none;
}
```

### a11y Checklist (Per Component)

```
[ ] Uses semantic HTML elements
[ ] All images have alt text (decorative: alt="")
[ ] All form inputs have associated <label>
[ ] Icon-only buttons have aria-label
[ ] Color is not the only state indicator
[ ] Contrast ratio ≥ 4.5:1 (normal text), ≥ 3:1 (large text)
[ ] Fully keyboard-operable
[ ] Visible focus indicator
[ ] Dynamic content uses aria-live regions
[ ] Modals trap focus and restore on close
```

---

## 33. Testing Strategy

### Setup

```bash
npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom supertest @types/supertest
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test/setup.ts'],
        include: ['src/**/*.test.{ts,tsx}', 'api/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
        },
    },
});
```

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
```

### Unit Test — Repository

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EntityRepository } from '../EntityRepository.js';

// Mock db module
vi.mock('@/data/db.js', () => ({
    query: vi.fn(),
    transaction: vi.fn(),
}));

import { query } from '@/data/db.js';

describe('EntityRepository', () => {
    const repo = new EntityRepository();
    beforeEach(() => vi.clearAllMocks());

    it('findById returns entity when found', async () => {
        (query as any).mockResolvedValueOnce({ rows: [{ id: '123', name: 'Test' }] });
        const result = await repo.findById('123');
        expect(result).toEqual({ id: '123', name: 'Test' });
        expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1'), ['123']);
    });

    it('findById returns null when not found', async () => {
        (query as any).mockResolvedValueOnce({ rows: [] });
        expect(await repo.findById('nope')).toBeNull();
    });
});
```

### Unit Test — React Component

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary.js';

const ThrowError = () => { throw new Error('boom'); };

describe('ErrorBoundary', () => {
    it('renders children when no error', () => {
        render(<ErrorBoundary><div>Content</div></ErrorBoundary>);
        expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('renders fallback on error', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        render(<ErrorBoundary><ThrowError /></ErrorBoundary>);
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
});
```

### Integration Test — API Handler

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import handler from '../entities/index.js';

const app = express();
app.use(express.json());
app.all('/api/entities', (req, res) => handler(req as any, res as any));

describe('POST /api/entities', () => {
    it('returns 400 for missing fields', async () => {
        const res = await request(app).post('/api/entities').send({});
        expect(res.status).toBe(400);
    });
});
```

### Test File Convention

```
src/data/repositories/__tests__/EntityRepository.test.ts
src/services/__tests__/EmailService.test.ts
src/presentation/components/__tests__/ErrorBoundary.test.tsx
api/__tests__/entities.test.ts
```

### Testing Priority

| Priority | Target | Type |
|---|---|---|
| 🔴 Critical | Auth middleware + JWT | Unit |
| 🔴 Critical | API handlers (create, update) | Integration |
| 🟡 High | Repositories | Unit |
| 🟡 High | Zod schemas | Unit |
| 🟢 Medium | React data hooks | Unit |
| 🟢 Medium | Error boundaries | Unit |
| 🔵 Low | UI components | Unit |
| 🔵 Low | Full user flows | E2E |

---

## 34. Git Workflow & Conventions

### Branch Strategy

```
main                    # Production — always deployable
├── feature/xxx         # feature/add-payment-plans
├── fix/xxx             # fix/login-token-expiry
├── chore/xxx           # chore/update-dependencies
└── release/x.y.z       # Release prep (optional)
```

### Commit Messages (Conventional Commits)

```
feat: add payment gateway integration
fix: prevent duplicate enrollment submissions
chore: update express to 4.21.x
docs: add architecture reference guide
refactor: extract email templates to separate module
test: add unit tests for EntityRepository
```

### .gitignore

```gitignore
node_modules/
dist/
.env
.env.local
.vscode/
.idea/
.DS_Store
Thumbs.db
*.log
.vercel/
coverage/
```

### Pre-Commit Hooks

```bash
npm i -D husky lint-staged
npx husky init
```

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

---

## 35. Linting & Formatting

### ESLint (Flat Config — v9+)

```bash
npm i -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks
```

```typescript
// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        plugins: { 'react-hooks': reactHooks },
        rules: {
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'prefer-const': 'error',
        },
    },
    { ignores: ['dist/', 'node_modules/', '*.config.*'] }
);
```

### Prettier

```json
// .prettierrc
{
    "semi": true,
    "singleQuote": true,
    "trailingComma": "es5",
    "tabWidth": 4,
    "printWidth": 100,
    "bracketSpacing": true,
    "arrowParens": "always"
}
```

---

## 36. Dependency Audit & Maintenance

```bash
npm audit                # Check vulnerabilities
npm audit fix            # Auto-fix
npm outdated             # Check for updates
npm update               # Update compatible versions
npm ci                   # CI/CD — exact versions from lockfile
```

### Dependency Categories

| Category | `dependencies` | `devDependencies` |
|---|---|---|
| Runtime (React, Express, pg) | ✅ | ❌ |
| Types (@types/*) | ❌ | ✅ |
| Build tools (Vite, TSC) | ❌ | ✅ |
| Test frameworks | ❌ | ✅ |
| Linters & formatters | ❌ | ✅ |

### Quarterly Security Checklist

```
[ ] npm audit — fix all high/critical
[ ] npm outdated — update patch/minor
[ ] Review CHANGELOG for major updates
[ ] Verify no secrets in VITE_ env vars
[ ] Rotate JWT_SECRET and API credentials
[ ] Review CORS origins match production domains
[ ] Confirm all endpoints have auth + rate limiting
```

---

## 37. Internationalization (i18n)

### Setup

```bash
npm i i18next react-i18next i18next-http-backend i18next-browser-languagedetector
```

### File Structure

```
public/locales/
├── en/
│   ├── common.json       # Shared (nav, buttons, errors)
│   ├── auth.json
│   └── dashboard.json
└── es/
    ├── common.json
    ├── auth.json
    └── dashboard.json
```

### Configuration

```typescript
// src/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n.use(HttpBackend).use(LanguageDetector).use(initReactI18next).init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'es'],
    ns: ['common'],
    defaultNS: 'common',
    backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
    interpolation: { escapeValue: false },
    react: { useSuspense: true },
});

export default i18n;
```

### TypeScript Key Safety

```typescript
// src/i18next.d.ts
import 'i18next';
import common from '../public/locales/en/common.json';

declare module 'i18next' {
    interface CustomTypeOptions {
        defaultNS: 'common';
        resources: { common: typeof common };
    }
}
// t('nav.typo') → TypeScript error
```

### Usage

```tsx
import { useTranslation } from 'react-i18next';

function Navbar() {
    const { t } = useTranslation();
    return <nav><a href="/">{t('nav.home')}</a></nav>;
}

// Feature namespace (lazy loaded)
function Dashboard() {
    const { t } = useTranslation(['dashboard', 'common']);
    return <h1>{t('dashboard:title')}</h1>;
}
```

### Language Switcher

```tsx
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇩🇴' },
] as const;

export function LanguageSwitcher() {
    const { i18n } = useTranslation();
    return (
        <div role="radiogroup" aria-label="Language">
            {LANGUAGES.map(l => (
                <button key={l.code} onClick={() => i18n.changeLanguage(l.code)}
                    aria-pressed={i18n.language === l.code}>
                    {l.flag} {l.label}
                </button>
            ))}
        </div>
    );
}
```

### Locale-Aware Formatters

```typescript
// src/presentation/hooks/useFormatters.ts
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';

export function useFormatters() {
    const { i18n } = useTranslation();
    const locale = i18n.language;

    return useMemo(() => ({
        date: (d: Date | string, opts?: Intl.DateTimeFormatOptions) =>
            new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric', ...opts }).format(new Date(d)),
        dateShort: (d: Date | string) =>
            new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d)),
        number: (n: number, opts?: Intl.NumberFormatOptions) =>
            new Intl.NumberFormat(locale, opts).format(n),
        currency: (amount: number, currency = 'USD') =>
            new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount),
        percent: (n: number) =>
            new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(n),
    }), [locale]);
}
```

### i18n Conventions

| Rule | Details |
|---|---|
| Key naming | Dot-notation: `section.subsection.key` |
| Namespaces | One per feature (`common`, `auth`, `dashboard`) |
| Fallback | Always `fallbackLng: 'en'` |
| Source of truth | English (`en/`) — all locales mirror its structure |
| Interpolation | `{{variable}}` — never concatenate |
| Plurals | `_one`, `_other` suffixes |
| Dates/Numbers | Always `Intl` formatters |
| No hardcoded text | Every user-facing string through `t()` |

---

## 38. Quick Start

```bash
# 1. Create project
npm create vite@latest my-app -- --template react-ts
cd my-app

# 2. Install runtime deps
npm i react-router-dom express cors helmet jsonwebtoken bcryptjs zod lucide-react \
      pg @vercel/blob dotenv \
      i18next react-i18next i18next-http-backend i18next-browser-languagedetector

# 3. Install dev deps
npm i -D @tailwindcss/vite tailwindcss \
         @types/express @types/cors @types/jsonwebtoken @types/bcryptjs @types/pg @types/node \
         concurrently tsx \
         vitest @testing-library/react @testing-library/jest-dom jsdom supertest @types/supertest \
         eslint @eslint/js typescript-eslint eslint-plugin-react-hooks \
         prettier husky lint-staged

# 4. Create structure
mkdir -p api/auth api/entities database/migrations
mkdir -p src/domain src/data/repositories src/services
mkdir -p src/server
mkdir -p src/presentation/{pages,components,context,hooks,layouts}
mkdir -p src/test
mkdir -p public/locales/{en,es}

# 5. Foundation files:
#    - src/data/db.ts                         (§6)
#    - src/domain/types.ts                    (§10)
#    - src/domain/schemas.ts                  (§10)
#    - src/server/index.ts                    (§8)
#    - src/server/env.ts                      (§9)
#    - src/server/response.ts                 (§11)
#    - src/server/AppError.ts                 (§11)
#    - src/server/errorHandler.ts             (§11)
#    - src/server/asyncHandler.ts             (§11)
#    - src/server/middleware.ts               (§11)
#    - src/server/logger.ts                   (§11)
#    - src/server/rateLimit.ts                (§22)
#    - src/presentation/context/AuthContext.tsx  (§16)
#    - src/presentation/hooks/useAuth.ts         (§16)
#    - src/presentation/hooks/useFetch.ts        (§12)
#    - src/presentation/hooks/useMutation.ts     (§12)
#    - src/presentation/components/ErrorBoundary.tsx  (§19)
#    - src/i18n.ts                            (§30)
#    - src/i18next.d.ts                       (§30)
#    - src/env.d.ts                           (§23)
#    - src/test/setup.ts                      (§26)
#    - api/health.ts                          (§21)
#    - vite.config.ts                         (§5)
#    - vercel.json                            (§5)
#    - tsconfig.app.json                      (§5)
#    - vitest.config.ts                       (§26)
#    - eslint.config.js                       (§28)
#    - .prettierrc                            (§28)
#    - .env.example                           (§5)

# 6. Initialize git + husky
git init
npx husky init

# 7. Build features (§14 checklist)
# 8. Run
npm run dev
```
