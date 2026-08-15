# Combo: React (Vite) + Supabase

## What This Combo Is
React SPA frontend + Supabase as the backend.
No separate backend service — Supabase handles DB, auth, storage, realtime.
React talks directly to Supabase via the browser client.

## System Architecture (External View)
```
Browser
  │
  ▼
React / Vite (port 5173)
  │ Supabase client
  ▼
Supabase API
  │ RLS enforced
  ▼
PostgreSQL
```

## What Makes This Combo Different
- No backend service — Supabase IS the backend
- No Axios — Supabase client replaces it entirely
- No custom JWT — Supabase Auth manages tokens
- RLS policies enforce authorization at DB level
- No Docker needed — Supabase CLI for local dev
- Service role key NEVER usable — SPA exposes everything to browser

## What To Skip
- stack/springboot.md
- stack/nextjs.md
- migration/flyway.md
- migration/prisma.md
- database/postgresql.md
- devops/docker.md

---

## Playbook Reference Table

| Task                          | Read                              | Section                       |
|-------------------------------|-----------------------------------|-------------------------------|
| Any React architecture        | stack/react-vite.md               | Full file                     |
| Zustand stores                | stack/react-vite.md               | § Zustand Store Pattern       |
| TanStack Query hooks          | stack/react-vite.md               | § Feature Hook Pattern        |
| Route protection              | stack/react-vite.md               | § Route Protection Pattern    |
| Supabase client setup         | database/supabase.md              | § Client Setup (Vite section) |
| RLS policies                  | database/supabase.md              | § Row Level Security          |
| Auth patterns                 | database/supabase.md              | § Supabase Auth Patterns      |
| Storage rules                 | database/supabase.md              | § Storage Rules               |
| Realtime                      | database/supabase.md              | § Realtime                    |
| New DB table                  | migration/supabase-cli.md         | § Standard Migration          |
| Migration commands            | migration/supabase-cli.md         | § Migration Commands          |
| Type generation               | migration/supabase-cli.md         | § Type Generation             |
| Styling                       | styling/tailwind-extensions.md    | Full file                     |
| Writing tests                 | universal/testing.md              | Full file                     |
| Error handling                | universal/error-handling.md       | Full file                     |
| TypeScript question           | universal/typescript.md           | Full file                     |
| Git / commits                 | universal/git-conventions.md      | Full file                     |
| Naming / code rules           | universal/coding-rules.md         | Full file                     |
| Folder question               | universal/folder-structure.md     | § React Vite section          |
| CI/CD                         | devops/github-actions.md          | § Frontend CI                 |
| PR checklist                  | devops/pr-template.md             | Full file                     |

---

## Agent Quick Reference

```
New feature?
  → src/features/[name]/ with api/ hooks/ components/ schemas/ types/
  → See stack/react-vite.md § Agent Quick Reference

New data fetch?
  → TanStack Query hook wrapping Supabase client call
  → features/[name]/api/[name]Api.ts using lib/supabase.ts
  → See database/supabase.md § Data Fetching Patterns

New mutation?
  → useMutation wrapping Supabase .insert()/.update()/.delete()
  → invalidateQueries after success
  → See stack/react-vite.md § Feature Hook Pattern

New DB table?
  → npx supabase migration new create_[name]_table
  → Enable RLS + add all 4 policies in same migration
  → See migration/supabase-cli.md § Standard Migration

RLS policy?
  → See database/supabase.md § Row Level Security

Auth (sign in / sign up / sign out)?
  → See database/supabase.md § Supabase Auth Patterns

Auth state in components?
  → useAuthStore() from stores/authStore.ts
  → Populated from supabase.auth.onAuthStateChange
  → See stack/react-vite.md § Zustand Store Pattern

Service role key?
  → NEVER in a Vite/React SPA — exposed to browser
  → If admin operations needed → use Next.js + Supabase instead

Error?
  → Route on error.code never error.message
  → See universal/error-handling.md

Type safety?
  → Regenerate after every schema change
  → npx supabase gen types typescript --local > src/types/database.types.ts
  → See migration/supabase-cli.md § Type Generation
```
