# Plan: Add Login/Register Functionality

## Summary

Add NextAuth.js (Auth.js v5) authentication with email/password credentials to the ADHD Decomposer app. All routes will require login. Tasks will be private and scoped to the authenticated user. Existing tasks will be deleted (clean migration).

## Decisions

| Decision | Choice |
|----------|--------|
| Auth library | NextAuth.js v5 (Auth.js) |
| Auth method | Email/password (Credentials provider) |
| Task privacy | Private only — tasks belong to the logged-in user |
| Guest access | None — login required for all features |
| Existing data | Delete all existing tasks (clean slate) |

---

## Step-by-Step Implementation

### Step 1: Install Dependencies

```bash
npm install next-auth@beta @auth/prisma-adapter bcryptjs
npm install -D @types/bcryptjs
```

- `next-auth@beta` — Auth.js v5 for Next.js 16
- `@auth/prisma-adapter` — Prisma adapter for Auth.js (manages User, Account, Session tables)
- `bcryptjs` — Password hashing (pure JS, no native deps)
- `@types/bcryptjs` — TypeScript types

### Step 2: Update Prisma Schema

**File: `prisma/schema.prisma`**

Add Auth.js-required models and link tasks to users:

```prisma
model User {
  id             String    @id @default(cuid())
  name           String?
  email          String    @unique
  emailVerified  DateTime?
  hashedPassword String?
  image          String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  accounts       Account[]
  sessions       Session[]
  tasks          Task[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

Update `Task` model to add user association:

```prisma
model Task {
  id          String    @id @default(cuid())
  title       String
  rawInput    String
  status      String    @default("active")
  createdAt   DateTime  @default(now())
  completedAt DateTime?
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  steps       Step[]
}
```

Run migration:
```bash
npx prisma db push --force-reset
```

This will reset the database (deleting all existing data) and apply the new schema.

### Step 3: Add Auth.js Configuration

**New file: `src/lib/auth.ts`**

Central Auth.js configuration:

```typescript
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials.email as string
        const password = credentials.password as string
        if (!email || !password) return null

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !user.hashedPassword) return null

        const isValid = await bcrypt.compare(password, user.hashedPassword)
        if (!isValid) return null

        return { id: user.id, name: user.name, email: user.email }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string
      return session
    },
  },
})
```

Key design decisions:
- **JWT session strategy** — required when using Credentials provider (database sessions don't work with Credentials)
- **Custom sign-in page** at `/login`
- **Callbacks** to include `user.id` in the session (not included by default)

### Step 4: Create Auth API Route

**New file: `src/app/api/auth/[...nextauth]/route.ts`**

```typescript
import { handlers } from "@/lib/auth"
export const { GET, POST } = handlers
```

This sets up the NextAuth.js API endpoints at `/api/auth/*` (sign-in, sign-out, session, CSRF, etc.).

### Step 5: Create Registration API Route

**New file: `src/app/api/auth/register/route.ts`**

```typescript
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { name, email, password } = await request.json()

  // Validate input
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
  }

  // Check for existing user
  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 })
  }

  // Hash password and create user
  const hashedPassword = await bcrypt.hash(password, 12)
  await prisma.user.create({
    data: { name, email, hashedPassword },
  })

  return NextResponse.json({ success: true }, { status: 201 })
}
```

### Step 6: Add Next.js Middleware for Route Protection

**New file: `src/middleware.ts`**

```typescript
export { auth as middleware } from "@/lib/auth"

export const config = {
  matcher: [
    // Protect all routes except auth pages, API auth routes, and static files
    "/((?!login|register|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
}
```

Also update Auth.js config to add an `authorized` callback that redirects unauthenticated users:

```typescript
callbacks: {
  authorized({ auth, request }) {
    const isLoggedIn = !!auth?.user
    const isAuthPage = request.nextUrl.pathname.startsWith("/login") ||
                       request.nextUrl.pathname.startsWith("/register")
    if (isAuthPage) return true  // Always allow auth pages
    return isLoggedIn            // Require login for everything else
  },
  // ... existing jwt and session callbacks
}
```

> **Note:** Next.js 16 renamed `middleware.ts` to `proxy.ts`. If the app uses Next.js 16's new proxy feature, the file may need to be `src/proxy.ts` instead. We'll verify during implementation.

### Step 7: Create Login Page

**New file: `src/app/login/page.tsx`**

A client component with:
- Email and password input fields
- "Sign in" button that calls `signIn("credentials", { email, password })`
- Link to `/register` for new users
- Error display for invalid credentials
- Styling consistent with existing Tailwind design (centered card, max-w-md)

### Step 8: Create Register Page

**New file: `src/app/register/page.tsx`**

A client component with:
- Name (optional), email, and password input fields
- Password confirmation field
- "Create account" button that POSTs to `/api/auth/register`, then auto-signs in
- Link to `/login` for existing users
- Client-side validation (password length, matching confirmation)
- Error display for duplicate emails, validation errors

### Step 9: Update Root Layout

**File: `src/app/layout.tsx`**

Changes:
- Wrap the app with `SessionProvider` from `next-auth/react`
- Replace the static nav with an auth-aware nav that shows:
  - When logged in: "History" link + user name/email + "Sign out" button
  - When not logged in: "Sign in" / "Register" links (only visible on auth pages since middleware redirects)

### Step 10: Update API Routes — Add Auth Guards

**File: `src/app/api/tasks/route.ts`**

- Import `auth` from `@/lib/auth`
- In `POST`: get session, reject if unauthenticated, include `userId` when creating task
- In `GET`: get session, reject if unauthenticated, filter tasks by `userId`

**File: `src/app/api/tasks/[id]/route.ts`**

- In `GET`: get session, verify the task belongs to the authenticated user

**File: `src/app/api/steps/[id]/route.ts`**

- In `PATCH`: get session, verify the step's parent task belongs to the authenticated user

### Step 11: Update Pages — Auth-Aware Data Fetching

**File: `src/app/history/page.tsx`**

- Get session server-side and pass userId to the query (already filtered at API level, but for direct DB queries in server components, add userId filter)

**File: `src/app/task/[id]/page.tsx`**

- Verify task ownership before rendering

### Step 12: Add AUTH_SECRET Environment Variable

**File: `.env` (local, gitignored)**

```
AUTH_SECRET=<generated-secret>
AUTH_TRUST_HOST=true
```

Generate with: `npx auth secret`

---

## Files Changed/Created Summary

| Action | File | Purpose |
|--------|------|---------|
| **Modify** | `package.json` | Add auth dependencies |
| **Modify** | `prisma/schema.prisma` | Add User, Account, Session, VerificationToken models; add userId to Task |
| **Create** | `src/lib/auth.ts` | Auth.js configuration (providers, callbacks, adapter) |
| **Create** | `src/app/api/auth/[...nextauth]/route.ts` | NextAuth API route handler |
| **Create** | `src/app/api/auth/register/route.ts` | User registration endpoint |
| **Create** | `src/middleware.ts` | Route protection middleware |
| **Create** | `src/app/login/page.tsx` | Login page UI |
| **Create** | `src/app/register/page.tsx` | Registration page UI |
| **Modify** | `src/app/layout.tsx` | Add SessionProvider, auth-aware nav |
| **Modify** | `src/app/api/tasks/route.ts` | Add auth guards, userId scoping |
| **Modify** | `src/app/api/tasks/[id]/route.ts` | Add auth guard, ownership check |
| **Modify** | `src/app/api/steps/[id]/route.ts` | Add auth guard, ownership check |
| **Modify** | `src/app/history/page.tsx` | Auth-aware data fetching |
| **Modify** | `src/app/task/[id]/page.tsx` | Ownership verification |

---

## Security Considerations

1. **Password hashing**: bcryptjs with 12 salt rounds
2. **JWT sessions**: Signed with AUTH_SECRET, no sensitive data in token
3. **CSRF protection**: Built into NextAuth.js
4. **Input validation**: Email format, password minimum length (8 chars)
5. **Authorization**: Every API route and page verifies ownership before serving data
6. **SQL injection**: Prevented by Prisma's parameterized queries
7. **Rate limiting**: Not included in initial implementation (can be added later)

## Out of Scope (Future Enhancements)

- Password reset / forgot password flow
- Email verification
- OAuth providers (Google, GitHub)
- Rate limiting on login/register
- Account settings page
- Profile management
