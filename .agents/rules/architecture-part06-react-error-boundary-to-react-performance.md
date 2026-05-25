## React Error Boundary
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



## File Uploads (Vercel Blob)
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



## Health Check Endpoint
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



## Rate Limiting
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



## TypeScript Patterns
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



## React Performance
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
