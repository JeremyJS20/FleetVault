## Database Conventions (Prisma)
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



## Checklists
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



## Common Pitfalls
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



## Input Validation (Zod)
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



## API Response Envelope
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



## Protected API Middleware (Backend JWT)
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



## Structured Logging
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
