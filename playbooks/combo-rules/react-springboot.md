# Combo: React (Vite) + Spring Boot + PostgreSQL

## What This Combo Is
React SPA frontend + Spring Boot REST API backend + PostgreSQL database.
All three run as separate Docker services.
Frontend communicates with backend only through REST API.

## System Architecture (External View)
```
Browser
  │ HTTP (Axios)
  ▼
React / Vite (port 5173)
  │ REST API
  ▼
Spring Boot (port 8080)
  │ JPA / Flyway
  ▼
PostgreSQL (port 5432)
```

## What Makes This Combo Different
- React is pure client-side SPA — no server rendering
- All data access goes through Spring Boot REST API
- Auth is custom JWT via Spring Boot — not Supabase Auth
- Spring Boot owns the database completely
- Flyway manages all migrations
- Full Docker setup: all 3 services containerized

## What To Skip
- stack/nextjs.md
- migration/prisma.md
- migration/supabase-cli.md
- database/supabase.md

---

## Playbook Reference Table

| Task                          | Read                              | Section                         |
|-------------------------------|-----------------------------------|---------------------------------|
| Any React architecture        | stack/react-vite.md               | Full file                       |
| Axios setup / interceptors    | stack/react-vite.md               | § lib/axios.ts Pattern          |
| TanStack Query hooks          | stack/react-vite.md               | § Feature Hook Pattern          |
| Zustand stores                | stack/react-vite.md               | § Zustand Store Pattern         |
| Route protection              | stack/react-vite.md               | § Route Protection Pattern      |
| Any Spring Boot layer         | stack/springboot.md               | Full file                       |
| Controller pattern            | stack/springboot.md               | § Layer Patterns → Controller   |
| Service pattern               | stack/springboot.md               | § Layer Patterns → Service      |
| Repository pattern            | stack/springboot.md               | § Layer Patterns → Repository   |
| Pagination                    | stack/springboot.md               | § Pagination Pattern            |
| Role-based auth               | stack/springboot.md               | § Role-Based Authorization      |
| AppException / errors         | stack/springboot.md               | § AppException + GlobalHandler  |
| JWT                           | stack/springboot.md               | § JWT Pattern                   |
| DB schema / columns           | database/postgresql.md            | § Column Conventions            |
| New migration                 | migration/flyway.md               | Full file                       |
| Styling anything              | styling/tailwind-extensions.md    | Full file                       |
| Writing tests                 | universal/testing.md              | Full file                       |
| Error handling                | universal/error-handling.md       | Full file                       |
| TypeScript question           | universal/typescript.md           | Full file                       |
| Git / commits                 | universal/git-conventions.md      | Full file                       |
| Naming / code rules           | universal/coding-rules.md         | Full file                       |
| Folder question               | universal/folder-structure.md     | § React Vite + Spring Boot      |
| Docker setup                  | devops/docker.md                  | Full file                       |
| Make commands                 | devops/makefile.md                | § Full Makefile Template        |
| CI/CD                         | devops/github-actions.md          | § Frontend CI + Backend CI      |
| PR checklist                  | devops/pr-template.md             | Full file                       |

---

## Agent Quick Reference

```
New frontend feature?
  → src/features/[name]/ with api/ hooks/ components/ schemas/ types/
  → See stack/react-vite.md § Agent Quick Reference

New API call (frontend)?
  → features/[name]/api/[name]Api.ts using lib/axios.ts
  → See stack/react-vite.md § Feature API Pattern

New hook (frontend)?
  → features/[name]/hooks/use[Name].ts using TanStack Query
  → See stack/react-vite.md § Feature Hook Pattern

New backend feature?
  → com/app/[name]/ + Controller + Service + Repository + dto/ + entity/
  → See stack/springboot.md § Package Structure

New endpoint (backend)?
  → Controller → Service → Repository
  → See stack/springboot.md § Agent Decision Tree

New DB table?
  → New Flyway migration V{n}__create_[name]_table.sql
  → See migration/flyway.md § Standard Migration Template

Error on frontend?
  → Route on error.code, never error.message
  → See universal/error-handling.md § Frontend

Error on backend?
  → throw new AppException("CODE", HttpStatus.XXX)
  → See stack/springboot.md § When Should You Throw AppException

Pagination?
  → Backend: Pageable + Page<T> — See stack/springboot.md § Pagination
  → Frontend: page/size params in TanStack Query — See stack/react-vite.md

Authorization?
  → Backend: @PreAuthorize — See stack/springboot.md § Role-Based Authorization
  → Frontend: PrivateRoute — See stack/react-vite.md § Route Protection
```
