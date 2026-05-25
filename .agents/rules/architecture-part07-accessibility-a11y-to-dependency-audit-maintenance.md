## Accessibility (a11y)
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



## Testing Strategy
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



## Git Workflow & Conventions
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



## Linting & Formatting
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



## Dependency Audit & Maintenance
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
