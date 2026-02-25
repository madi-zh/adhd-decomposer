# Plan: Add Forgot Password & Google SSO

## Summary

Add two auth features to the existing NextAuth.js v5 setup:
1. **Forgot password flow** — user requests a reset link via email, clicks it to set a new password
2. **Google OAuth sign-in** — sign in / register with a Google account alongside existing credentials

---

## Feature 1: Forgot Password Flow

### Design Decisions

| Decision | Choice |
|----------|--------|
| Token storage | Use existing `VerificationToken` model (already in schema) |
| Token format | Cryptographically random 64-char hex string via `crypto.randomBytes` |
| Token expiry | 1 hour |
| Email delivery | Resend (`resend.com`) via `resend` SDK |
| Password validation | Same rules as registration (8+ characters) |

### Steps

#### 1.1 Install `resend`

```bash
npm install resend
```

#### 1.2 Create email utility — `src/lib/email.ts`

A helper to send emails via the Resend API. Reads config from env vars:
- `RESEND_API_KEY` — API key from resend.com dashboard
- `EMAIL_FROM` — verified sender address (e.g. `noreply@yourdomain.com`)

Exports a `sendPasswordResetEmail(email, token)` function that sends a link to `/reset-password?token=<token>&email=<email>`.

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: "Reset your password",
    html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`,
  });
}
```

#### 1.3 Create forgot password API — `src/app/api/auth/forgot-password/route.ts`

POST handler:
1. Accept `{ email }` in request body
2. Look up user by email — if not found, still return 200 (prevent enumeration)
3. Delete any existing tokens for this email in `VerificationToken`
4. Generate a random token, hash it, store in `VerificationToken` with 1-hour expiry
5. Send reset email with the unhashed token
6. Return `{ success: true }`

#### 1.4 Create reset password API — `src/app/api/auth/reset-password/route.ts`

POST handler:
1. Accept `{ email, token, password }` in request body
2. Look up token in `VerificationToken` by identifier (email) — compare hashed values
3. Check expiry — reject if expired
4. Validate new password (8+ chars)
5. Hash new password with bcrypt, update user's `hashedPassword`
6. Delete the used token
7. Return `{ success: true }`

#### 1.5 Create forgot password page — `src/app/forgot-password/page.tsx`

Client component with:
- Email input field
- "Send reset link" button
- Success message: "If an account exists with that email, we've sent a reset link."
- Link back to login

#### 1.6 Create reset password page — `src/app/reset-password/page.tsx`

Client component with:
- Reads `token` and `email` from URL search params
- New password + confirm password fields
- "Reset password" button → POSTs to `/api/auth/reset-password`
- On success: redirect to `/login` with a success message
- Error display for expired/invalid tokens

#### 1.7 Update login page — `src/components/LoginForm.tsx`

- Add "Forgot password?" link below the password field, pointing to `/forgot-password`

#### 1.8 Update middleware — `src/middleware.ts`

- Add `forgot-password` and `reset-password` to the matcher exclusion list so unauthenticated users can access them

---

## Feature 2: Google OAuth

### Design Decisions

| Decision | Choice |
|----------|--------|
| Provider | Google via `next-auth/providers/google` |
| Account linking | Automatic — if a Google account's email matches an existing credentials user, link them via the `Account` table |
| Schema changes | None — `Account` model already supports OAuth fields |
| Session strategy | JWT (unchanged — works with both Credentials and OAuth) |

### Steps

#### 2.1 Add Google provider to auth config — `src/lib/auth.ts`

```typescript
import Google from "next-auth/providers/google"

providers: [
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  }),
  Credentials({ ... }),  // existing
]
```

#### 2.2 Add Google provider stub to `src/lib/auth.config.ts`

The middleware config needs the provider list to match. Add a Google provider stub (like the existing Credentials stub):

```typescript
import Google from "next-auth/providers/google"

providers: [
  Google,  // stub for middleware
  Credentials({ ... }),  // existing stub
]
```

#### 2.3 Handle account linking — `src/lib/auth.ts`

Add a `signIn` callback to auto-link Google accounts when the email already exists as a credentials user:

```typescript
callbacks: {
  async signIn({ user, account }) {
    if (account?.provider === "google") {
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email! },
      })
      if (existingUser) {
        // Link the Google account to the existing user
        await prisma.account.upsert({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          create: { ...account, userId: existingUser.id },
          update: {},
        })
        // Update token to use existing user's ID
        user.id = existingUser.id
      }
    }
    return true
  },
  // ... existing callbacks
}
```

#### 2.4 Update login page — `src/components/LoginForm.tsx`

- Add a "Sign in with Google" button that calls `signIn("google")`
- Add a visual divider ("or") between OAuth and credentials form

#### 2.5 Update register page — `src/components/RegisterForm.tsx`

- Add a "Sign up with Google" button that calls `signIn("google")`
- Add a visual divider ("or") between OAuth and credentials form

#### 2.6 Environment variables

New env vars required:
```
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
RESEND_API_KEY=<from resend.com dashboard>
EMAIL_FROM=noreply@yourdomain.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Files Changed/Created Summary

| Action | File | Purpose |
|--------|------|---------|
| **Install** | `package.json` | Add `resend` |
| **Create** | `src/lib/email.ts` | Email sending utility |
| **Create** | `src/app/api/auth/forgot-password/route.ts` | Forgot password endpoint |
| **Create** | `src/app/api/auth/reset-password/route.ts` | Reset password endpoint |
| **Create** | `src/app/forgot-password/page.tsx` | Forgot password page |
| **Create** | `src/app/reset-password/page.tsx` | Reset password page |
| **Modify** | `src/lib/auth.ts` | Add Google provider + account linking callback |
| **Modify** | `src/lib/auth.config.ts` | Add Google provider stub for middleware |
| **Modify** | `src/components/LoginForm.tsx` | Add "Forgot password?" link + Google button |
| **Modify** | `src/components/RegisterForm.tsx` | Add Google sign-up button |
| **Modify** | `src/middleware.ts` | Allow unauthenticated access to forgot/reset pages |

---

## Security Considerations

1. **Token hashing** — reset tokens are hashed before storage; only the hash is in the DB
2. **Timing-safe responses** — forgot password always returns success (prevents email enumeration)
3. **Token expiry** — 1-hour TTL on reset tokens
4. **Single-use tokens** — deleted after successful reset
5. **Account linking** — only links when Google email matches an existing user's email exactly
6. **CSRF** — protected by NextAuth.js built-in CSRF for OAuth flows
