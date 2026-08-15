# Combo: Next.js + PostgreSQL (Prisma)

## What This Combo Is
Next.js as fullstack — handles both frontend and backend via API routes and server actions.
Prisma as ORM talking to PostgreSQL.
No separate backend service.

## System Architecture (External View)
```
Browser
  │
  ▼
Next.js (App Router)
  ├── Server Components ──→ Prisma ──→ PostgreSQL
  ├── Server Actions    ──→ Prisma ──→ PostgreSQL
  ├── API Routes        ──→ Prisma ──→ PostgreSQL
  └── Client Components ──→ TanStack Query ──→ API Routes ──→ Prisma ──→ PostgreSQL
```

## What Makes This Combo Different
- Next.js handles API routes — no Spring Boot
- Prisma is the ORM — not JPA, not Supabase client
- Auth is custom JWT via API routes OR NextAuth.js
- Docker runs PostgreSQL only — Next.js runs locally
- Prisma Migrate manages schema — not Flyway, not Supabase CLI

## What To Skip
- stack/springboot.md
- migration/flyway.md
- migration/supabase-cli.md
- database/supabase.md

---

## Playbook Reference Table

| Task                          | Read                              | Section                       |
|-------------------------------|-----------------------------------|-------------------------------|
| Any architecture decision     | stack/nextjs.md                   | § Agent Decision Tree         |
| Server vs client component    | stack/nextjs.md                   | § 4-6 (Server/Client)         |
| API routes                    | stack/nextjs.md                   | § API Routes section          |
| Server actions                | stack/nextjs.md                   | § 14 Server Actions           |
| State / forms / env / URL     | stack/nextjs.md                   | § 73-79 (State/Forms/env/URL) |
| Prisma schema                 | migration/prisma.md               | § Schema                      |
| Prisma client singleton       | migration/prisma.md               | § Singleton Prisma Client     |
| Query patterns                | migration/prisma.md               | § Query Patterns              |
| Migration commands            | migration/prisma.md               | § Migration Commands          |
| Seeding                       | migration/prisma.md               | § Seeding                     |
| Error handling (Prisma)       | migration/prisma.md               | § Error Handling              |
| DB schema conventions         | database/postgresql.md            | § Column Conventions          |
| Styling                       | styling/tailwind-extensions.md    | Full file                     |
| Writing tests                 | universal/testing.md              | Full file                     |
| Error handling                | universal/error-handling.md       | Full file                     |
| TypeScript question           | universal/typescript.md           | Full file                     |
| Git / commits                 | universal/git-conventions.md      | Full file                     |
| Naming / code rules           | universal/coding-rules.md         | Full file                     |
| Folder question               | universal/folder-structure.md     | § Next.js section             |
| Docker (PostgreSQL only)      | devops/docker.md                  | § docker-compose.yml (DB only)|
| Make commands                 | devops/makefile.md                | § Prisma Makefile             |
| CI/CD                         | devops/github-actions.md          | § Next.js CI                  |
| PR checklist                  | devops/pr-template.md             | Full file                     |

---

## Agent Quick Reference

```
New feature?
  → src/features/[name]/ with actions/ queries/ components/ hooks/ schemas/ types/
  → See universal/folder-structure.md § Next.js section

Initial page data?
  → Async Server Component + import { prisma } from '@/lib/prisma'
  → See migration/prisma.md § Query Patterns

Mutation from form?
  → Server Action + prisma in the action + revalidatePath
  → See stack/nextjs.md § 14 Server Actions

Client-side fetch?
  → TanStack Query hook → API route → Prisma
  → See stack/nextjs.md § 73 State Management (TanStack Query)

Schema change?
  → Edit prisma/schema.prisma
  → npx prisma migrate dev --name [description]
  → npx prisma generate
  → See migration/prisma.md § Migration Commands

New model?
  → Always id, createdAt, updatedAt
  → Always @@map("snake_case_table_name")
  → Always onDelete on relations
  → See migration/prisma.md § Schema

Password field in query?
  → NEVER include — always explicit select
  → See migration/prisma.md § Select — Never Return Sensitive Fields

Prisma error?
  → Catch PrismaClientKnownRequestError
  → See migration/prisma.md § Error Handling

New env variable?
  → Add to src/env.ts (t3-env)
  → See stack/nextjs.md § 75 Environment Variables
```
