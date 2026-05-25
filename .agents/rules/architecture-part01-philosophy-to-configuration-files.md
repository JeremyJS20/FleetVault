# Full-Stack Architecture Reference Guide (General DB)

> Stack: TypeScript · React · Vite · Express · PostgreSQL · Prisma ORM · Vercel  
> Monorepo structure (NPM Workspaces). Uses Prisma ORM for database access and data integrity.

---

## Philosophy
| Principle | What it means |
|---|---|
| **Clean Architecture** | Strict separation into Domain → Application/Services → Infrastructure → Presentation. Inner layers never depend on outer layers. |
| **Monorepo Workspaces** | Strict separation via `apps/frontend`, `apps/backend`, and `packages/common` for shared schemas to guarantee payload synchronization. |
| **Zero Trust / Immutability** | Strict input validation at the edge (two-pass Zod validation). Append-only logic for critical ledgers. |
| **Serverless-First** | Production runs as Vercel Serverless Functions. Local dev emulates with Express using the same handler code. |
| **Convention over Configuration** | File placement determines behavior (Vercel routing, layer boundaries, migration order). |

---



## Technology Stack
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



## Project Structure
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



## Layer Architecture
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



## Configuration Files
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
