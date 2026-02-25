# CLAUDE.md

## Project Overview

**Tiny Steps — ADHD Decomposer** is a full-stack web app that helps people with ADHD break down overwhelming tasks into small, actionable micro-steps using Claude AI. Users input a task, the app calls the Claude API to decompose it into 5–15 concrete steps, and provides a step-by-step UI with progress tracking and celebration animations on completion.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Server Components)
- **Language**: TypeScript 5 (strict mode)
- **UI**: React 19, Tailwind CSS 4
- **Database**: Prisma 7 with SQLite (better-sqlite3)
- **Auth**: NextAuth.js v5 (Credentials provider, JWT sessions)
- **AI**: Anthropic SDK (@anthropic-ai/sdk) using claude-sonnet-4-5-20250929
- **Animations**: canvas-confetti

## Commands

```bash
npm run dev        # Start development server (http://localhost:3000)
npm run build      # Production build
npm run start      # Run production build
npm run lint       # ESLint
npm run postinstall # prisma generate && prisma db push (runs automatically on install)
```

## Project Structure

```
src/
├── app/              # Next.js App Router — pages and API routes
│   ├── api/          # REST endpoints: auth, tasks, steps
│   ├── login/        # Login page
│   ├── register/     # Registration page
│   ├── history/      # Task history view
│   └── task/[id]/    # Task detail with step controller
├── components/       # React components (TaskInput, StepCard, NavBar, etc.)
├── lib/              # Utilities: auth.ts, claude.ts, prisma.ts
└── middleware.ts      # Route protection
prisma/
├── schema.prisma     # DB schema (User, Task, Step, auth models)
└── migrations/       # Migration history
```

## Architecture & Patterns

- **Server Components by default** — pages use SSR for data fetching; `"use client"` only for interactive components
- **API routes** verify session via `auth()`, check resource ownership, return `NextResponse.json()`
- **Prisma singleton** in `src/lib/prisma.ts` avoids duplicate client instances
- **Optimistic UI** in TaskStepController — updates client state before server confirmation, reverts on error
- **Dynamic imports** for non-critical components (e.g., Celebration) to avoid SSR issues
- **Middleware-based auth** redirects unauthenticated users to `/login`
- **Path alias**: `@/*` maps to `./src/*`

## Code Conventions

- Functional components with hooks; props interfaces typed explicitly
- Event handlers prefixed with `handle` (handleSubmit, handleComplete)
- Tailwind-only styling — no CSS modules. Color palette: stone (grays), amber (primary), emerald (success), red (errors)
- API routes: always check session first, verify ownership, use `Promise.all()` for parallel operations
- Error boundaries at page level (`error.tsx` files) with `role="alert"` for accessibility
- Passwords hashed with bcryptjs (12 salt rounds)

## Environment Variables

- `DATABASE_URL` — SQLite path (default: `file:./dev.db`)
- `AUTH_SECRET` — Required for NextAuth JWT signing
- `AUTH_TRUST_HOST` — Set to `true` for local development
- `ANTHROPIC_API_KEY` — Claude API key for task decomposition

## No Test Framework

There is currently no test suite configured. Rely on `npm run lint` and `npm run build` to verify changes.
