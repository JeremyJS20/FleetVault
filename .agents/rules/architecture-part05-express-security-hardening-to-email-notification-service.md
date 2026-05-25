## Express Security Hardening
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



## Vite Build Optimization
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



## Graceful Shutdown
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



## Auth Context
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



## External Service Integration
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



## Email / Notification Service
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
