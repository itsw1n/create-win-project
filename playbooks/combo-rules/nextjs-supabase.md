# Combo: Next.js + Supabase

## What This Combo Is
Next.js as fullstack — no separate backend service.
Supabase handles database, auth, storage, and realtime.
Next.js Server Components and Server Actions talk directly to Supabase.

## System Architecture (External View)
```
Browser
  │
  ▼
Next.js (App Router)
  ├── Server Components ──→ Supabase (server client) ──→ PostgreSQL
  ├── Server Actions    ──→ Supabase (server client) ──→ PostgreSQL
  └── Client Components ──→ Supabase (browser client) ──→ PostgreSQL
                                    (RLS enforced at DB level)
```

## What Makes This Combo Different
- No separate backend — Next.js IS the fullstack app
- No Axios — Supabase client replaces all HTTP calls
- No custom JWT — Supabase Auth handles tokens automatically
- RLS policies replace server-side authorization logic
- Server Components read data directly — no API route needed
- Docker not required locally — use Supabase CLI

## What To Skip
- stack/springboot.md
- migration/flyway.md
- migration/prisma.md
- database/postgresql.md
- devops/docker.md (optional)

---

## Playbook Reference Table

| Task                          | Read                              | Section                    |
|-------------------------------|-----------------------------------|----------------------------|
| Any architecture decision     | stack/nextjs.md                   | § Agent Decision Tree      |
| Server vs client component    | stack/nextjs.md                   | § 4-6 (Server/Client)      |
| Server actions                | stack/nextjs.md                   | § 14 Server Actions        |
| State / forms / env / URL     | stack/nextjs.md                   | § 73-79 (State/Forms/env/URL) |
| Which Supabase client to use  | database/supabase.md              | § Which Client to Use      |
| RLS policies                  | database/supabase.md              | § Row Level Security       |
| Auth patterns                 | database/supabase.md              | § Supabase Auth Patterns   |
| Client setup code             | database/supabase.md              | § Client Setup             |
| New DB table                  | migration/supabase-cli.md         | § Standard Migration       |
| Migration commands            | migration/supabase-cli.md         | § Migration Commands       |
| Type generation               | migration/supabase-cli.md         | § Type Generation          |
| Styling anything              | styling/tailwind-extensions.md    | Full file                  |
| Writing tests                 | universal/testing.md              | Full file                  |
| Error handling                | universal/error-handling.md       | Full file                  |
| TypeScript question           | universal/typescript.md           | Full file                  |
| Git / commits                 | universal/git-conventions.md      | Full file                  |
| Naming / code rules           | universal/coding-rules.md         | Full file                  |
| Folder question               | universal/folder-structure.md     | § Next.js section          |
| CI/CD                         | devops/github-actions.md          | § Next.js CI               |
| PR checklist                  | devops/pr-template.md             | Full file                  |

---

## Agent Quick Reference

```
New feature?
  → src/features/[name]/ with actions/ queries/ components/ hooks/ schemas/ types/
  → See universal/folder-structure.md § Next.js section

Initial page data?
  → Async Server Component + lib/supabase/server.ts
  → See database/supabase.md § Which Client to Use

Mutation from form?
  → Server Action ('use server') + lib/supabase/server.ts + revalidatePath
  → See stack/nextjs.md § 14 Server Actions

Client-side fetch?
  → TanStack Query hook + lib/supabase/client.ts
  → See stack/nextjs.md § 73 State Management (TanStack Query)

Admin operation?
  → lib/supabase/admin.ts — server only, never client
  → See database/supabase.md § Which Client to Use

New DB table?
  → npx supabase migration new create_[name]_table
  → Enable RLS + add policies in same migration
  → See migration/supabase-cli.md § Standard Migration

RLS policy?
  → See database/supabase.md § Row Level Security

Auth check (server)?
  → const { data: { user } } = await supabase.auth.getUser()
  → See database/supabase.md § Auth Patterns

New env variable?
  → Add to src/env.ts (t3-env)
  → Public: NEXT_PUBLIC_ prefix | Private: no prefix, server only
  → See stack/nextjs.md § 75 Environment Variables

Error?
  → Route on error.code never error.message
  → See universal/error-handling.md
```
