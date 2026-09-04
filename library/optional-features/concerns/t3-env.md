# t3-env for Next.js

> Optional: adopt this when a Next.js project needs one typed, startup/build-time environment boundary. Install `@t3-oss/env-nextjs` and `zod` in the same change.

## Setup

Declare only values the selected stack actually consumes:

```ts
import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_API_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
})
```

Make a value required only for a stack that cannot run without it. Client-prefixed values are bundled and are never secrets.

## Rules

- Server-only values belong in `server`; client-visible values require `NEXT_PUBLIC_` and belong in `client`.
- Add each new value to the schema, runtime mapping, `.env.example`, deployment configuration, and generated environment documentation.
- Keep secrets out of logs, client schemas, public prefixes, and committed environment files.
- Do not copy speculative JWT, administrator, or provider secrets into every project.

## Agent Quick Reference

```text
New value?        → identify its runtime owner and whether the browser needs it
Server secret?    → server schema, no public prefix
Browser value?    → client schema with NEXT_PUBLIC_; treat as public
Required value?   → fail validation before serving traffic
Unused value?     → remove it from schema, examples, CI, and deployment config
```
