## Server Utilities
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



## React Frontend
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
