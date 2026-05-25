## Database Layer (Prisma ORM)
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



## API Handler Pattern (Controller to Service Handoff)
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



## Express Dev Server
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



## Environment Validation
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



## Domain Layer (Shared Workspace)
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
