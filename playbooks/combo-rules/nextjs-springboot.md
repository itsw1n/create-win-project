# Combo: Next.js + Spring Boot + PostgreSQL

## What This Combo Is
Next.js as pure frontend + Spring Boot as dedicated REST API backend + PostgreSQL.
Next.js never touches the database — Spring Boot owns all data access.
Two separate services running side by side.

## System Architecture (External View)
```
Browser
  │
  ▼
Next.js (App Router) — pure frontend
  ├── Server Components ──→ fetch() ──→ Spring Boot REST API
  └── Client Components ──→ Axios  ──→ Spring Boot REST API
                                              │ JPA / Flyway
                                              ▼
                                        PostgreSQL (port 5432)
```

## What Makes This Combo Different
- Next.js is PURE FRONTEND — no server actions hitting DB
- Spring Boot owns ALL business logic and data access
- Server Components fetch from Spring Boot via fetch() — not Prisma, not Supabase
- Client Components use TanStack Query + Axios → Spring Boot
- Full Docker: Next.js + Spring Boot + PostgreSQL (3 services)
- Auth tokens from Spring Boot — attached to every request

## Critical Rule
```
❌ Server Action → Prisma → DB        (Next.js should not touch DB)
❌ Server Component → Supabase → DB   (wrong client for this combo)
✅ Server Component → fetch() → Spring Boot → DB
✅ Client Component → Axios → Spring Boot → DB
```

## What To Skip
- migration/prisma.md
- migration/supabase-cli.md
- database/supabase.md
- No Prisma anywhere in Next.js
- No Supabase anywhere
- No Server Actions for data mutations (use Axios → Spring Boot instead)

---

## Playbook Reference Table

| Task                              | Read                              | Section                         |
|-----------------------------------|-----------------------------------|---------------------------------|
| Next.js architecture              | stack/nextjs.md                   | § Agent Decision Tree           |
| Server vs client component        | stack/nextjs.md                   | § 4-6 (Server/Client)           |
| State / forms / env            | stack/nextjs.md                   | § 73-79 (State/Forms/env)    |
| Server-side fetch to Spring Boot | stack/nextjs.md                 | § 80 Server-side Fetch Helper |
| Client-side Axios setup        | stack/react-vite.md               | § lib/axios.ts Pattern          |
| TanStack Query hooks (client)  | stack/nextjs.md                   | § 73 State Management           |
| Any Spring Boot layer             | stack/springboot.md               | Full file                       |
| Controller / Service / Repository | stack/springboot.md               | § Layer Patterns                |
| Pagination                        | stack/springboot.md               | § Pagination Pattern            |
| Role-based auth                   | stack/springboot.md               | § Role-Based Authorization      |
| AppException / errors             | stack/springboot.md               | § AppException + GlobalHandler  |
| JWT                               | stack/springboot.md               | § JWT Pattern                   |
| DB schema / columns               | database/postgresql.md            | § Column Conventions            |
| New migration                     | migration/flyway.md               | Full file                       |
| Styling                           | styling/tailwind-extensions.md    | Full file                       |
| Writing tests                     | universal/testing.md              | Full file                       |
| Error handling                    | universal/error-handling.md       | Full file                       |
| TypeScript question               | universal/typescript.md           | Full file                       |
| Git / commits                     | universal/git-conventions.md      | Full file                       |
| Naming / code rules               | universal/coding-rules.md         | Full file                       |
| Folder question                   | universal/folder-structure.md     | § Next.js + § Spring Boot       |
| Docker (3 services)               | devops/docker.md                  | Full file                       |
| Make commands                     | devops/makefile.md                | § Full Makefile Template        |
| CI/CD                             | devops/github-actions.md          | § Frontend CI + § Backend CI    |
| PR checklist                      | devops/pr-template.md             | Full file                       |

---

## Agent Quick Reference

```
New Next.js feature?
  → src/features/[name]/ with components/ hooks/ schemas/ types/
  → See universal/folder-structure.md § Next.js section

Page needs initial data?
  → Async Server Component + lib/fetch.ts (fetches from Spring Boot)
  → NOT Prisma, NOT Supabase, NOT direct DB
  → See stack/nextjs.md § 80 Server-side Fetch Helper

Client component needs data?
  → TanStack Query hook + Axios → Spring Boot endpoint
  → See stack/nextjs.md § 73 State Management (TanStack Query)

Mutation from form?
  → Client form → Axios POST → Spring Boot endpoint
  → NOT a Server Action hitting DB directly
  → See stack/react-vite.md § Feature Hook Pattern (useMutation)

New Spring Boot feature?
  → com/app/[name]/ + Controller + Service + Repository + dto/ + entity/
  → See stack/springboot.md § Agent Decision Tree

New DB table?
  → New Flyway migration in backend
  → See migration/flyway.md § Standard Migration Template

Business logic?
  → Spring Boot Service layer ONLY
  → NEVER in Next.js server components or actions

Authorization?
  → Backend: @PreAuthorize — See stack/springboot.md § Role-Based Auth
  → Frontend: redirect if no user in server component

Error?
  → Frontend: route on error.code — See universal/error-handling.md
  → Backend: throw AppException — See stack/springboot.md § AppException
```
