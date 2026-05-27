# FleetVault — AI Agent Instructions

## Overview
FleetVault is a premium car rental management monorepo (NPM Workspaces) with:
- **Frontend:** React 19, Vite, HeroUI, TailwindCSS 4, React Router DOM 7, Lucide React
- **Backend:** Express 4, Prisma ORM, PostgreSQL, JWT auth, Stripe, Vercel Blob
- **Shared:** `packages/common` — Zod schemas, TypeScript types, enums
- **Design:** Neo-Minimalist Liquid Glass (dark/light themes, glassmorphism)

## Mandatory Rule
Before proposing or implementing ANY change, you MUST read the relevant
architecture and/or design rules in `.agents/rules/`. Changes that violate
these rules must be flagged and discussed with the user.

## Architecture Rules (`.agents/rules/`)
| File | Covers |
|---|---|
| `architecture-part01-*.md` | Philosophy, tech stack, configuration files |
| `architecture-part02-*.md` | Database layer, Prisma ORM, shared domain |
| `architecture-part03-*.md` | Server utilities → React frontend |
| `architecture-part04-*.md` | DB conventions (Prisma), structured logging |
| `architecture-part05-*.md` | Express security hardening, email notifications |
| `architecture-part06-*.md` | React error boundaries, React performance |
| `architecture-part07-*.md` | Accessibility a11y, dependency audit |
| `architecture-part08-*.md` | Internationalization i18n, quick start |
| `REACT_VITE_NODE_EXPRESS_VERCEL_GENERAL_ARCHITECTURE.md` | Complete stack reference (~2500 lines) |

## Design Rules (`.agents/rules/`)
| File | Covers |
|---|---|
| `CONSUMER_GENERAL_DESIGN.md` | Neo-Minimalist Liquid Glass design system |
| `design-part01-*.md` | Visual theme, atmosphere, inputs & forms |
| `design-part02-*.md` | Status icons, tooltips |
| `design-part03-*.md` | Alerts, banners, contrast ratios |
| `design-part04-*.md` | Focus indicators, loading states |
| `design-part05-*.md` | Full-page loading, theme block |
| `design-part06-*.md` | Utility classes, file organization |

## Workflow
1. **Identify** what kind of change you're making (architecture / design / both)
2. **Read** the relevant rule files from `.agents/rules/`
3. **Align** your implementation with those rules
4. **Verify** — run linters, type checks, and tests after making changes
5. **Ask** the user if something is unclear or not covered by the rules

## Code Conventions
- TypeScript everywhere (strict mode)
- Zod for runtime validation (two-pass: edge + service)
- Clean Architecture layers: Domain → Application → Infrastructure → Presentation
- Monorepo workspaces: `apps/frontend`, `apps/backend`, `packages/common`
- Serverless-first: Vercel Functions in prod, Express emulation in dev
- Prisma ORM with append-only ledgers where applicable
- TailwindCSS utility classes (no CSS context switching)
- HeroUI components customized via the Liquid Glass theme tokens
