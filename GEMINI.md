# FleetVault — Google AI Agent Instructions

## Mandatory Rule
Before proposing or implementing ANY change, you MUST read the relevant
architecture and/or design rules in `.agents/rules/`. Changes that violate
these rules must be flagged and discussed with the user.

## Stack
- **Frontend:** React 19, Vite, HeroUI, TailwindCSS 4, React Router DOM 7, Lucide React
- **Backend:** Express 4, Prisma ORM, PostgreSQL, JWT auth, Stripe, Vercel Blob
- **Shared:** `packages/common` — Zod schemas, TypeScript types, enums
- **Design:** Neo-Minimalist Liquid Glass (dark/light themes, glassmorphism)

## Conventions
- TypeScript strict mode everywhere
- Zod runtime validation (two-pass: edge + service)
- Clean Architecture: Domain → Application → Infrastructure → Presentation
- Monorepo workspaces: `apps/frontend`, `apps/backend`, `packages/common`
- Serverless-first: Vercel Functions (prod), Express emulation (dev)
- TailwindCSS utility classes, HeroUI customized via Liquid Glass tokens

## Rules Reference
For detailed architecture and design rules, see `.agents/rules/`.
For a quick index of all rule files, see `.gemini/rules/README.md`.
