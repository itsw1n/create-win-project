# t3-env — Environment Variable Validation (Next.js)

> **When to use:** Next.js projects that need typed, validated env vars with build-time failure
> if required vars are missing.

---

# 1. Setup

<!-- snippet:nextjs-env -->
```typescript
// src/lib/env.ts
import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
    NEXT_PUBLIC_API_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
})
```

Import everywhere: `import { env } from '@/lib/env'`. Build fails if a required variable is missing.

---

# 2. Rules

- Server-only vars → `server: {}`. Client-safe vars → `client: {}` with `NEXT_PUBLIC_` prefix.
- Never access `process.env` directly — always use `env.VAR_NAME`.
- Add every new env var to `src/lib/env.ts` AND `.env.example`.
- Build will fail loudly if a required var is missing — this is intentional.

---

# 3. Agent Quick Reference

```text
New env variable?          → add to server: {} or client: {} in src/lib/env.ts
                           → add to runtimeEnv: {}
                           → add to .env.example with a comment
Client-safe variable?      → must be prefixed NEXT_PUBLIC_  → goes in client: {}
Server-only variable?      → no prefix → goes in server: {}
Accessing env in code?     → import { env } from '@/lib/env' — never process.env directly
```
