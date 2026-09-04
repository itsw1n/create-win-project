# Next.js Runtime

## Server and Client

Server Components are the default. Add `'use client'` only for state, effects, event
handlers, browser APIs, or client-only libraries, and keep that boundary narrow.

- Read initial data directly on the server; do not fetch the app's own HTTP route.
- Keep database clients, secret environment variables, and privileged SDKs server-only.
- Treat every `NEXT_PUBLIC_` value as public.
- Route Handlers exist for real HTTP consumers such as mobile apps, webhooks, and third
  parties—not as mandatory internal indirection.

## Caching and Mutations

Caching is an explicit data decision. Document whether a read is request memoized,
cross-request cached, revalidated, or dynamic. After a mutation, invalidate the narrowest
tag or path that represents the changed data. Never cache permission checks or mutable
user-specific results without a reviewed key and lifetime.

Server Functions are public server entry points even when their call sites are internal.
They validate input, authenticate and authorize, call an operation, invalidate affected
data, and return a small serializable result.

## Configuration and Failures

- Validate required environment variables at startup/build boundaries.
- Use `loading.tsx`, Suspense, and error boundaries where their scope is meaningful.
- Log structured server events with request/trace identifiers; never log credentials,
  cookies, authorization headers, reset links, or full personal objects.
- Production builds, lint, typecheck, and tests are part of the runtime contract.
