## Internationalization (i18n)
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



## Quick Start
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
