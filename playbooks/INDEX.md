# Playbook Index

Master reference for `create-win-project` CLI.
Maps stack choices to playbooks, templates, and generated files.

---

## Playbook Library

### /universal — applies to every project
| File                  | What it covers                                      |
|-----------------------|-----------------------------------------------------|
| coding-rules.md       | Naming, functions, imports, constants, no-debug     |
| git-conventions.md    | Branches, commits, workflow, .gitignore             |
| typescript.md         | Strict mode, no-any, types, Zod, generics           |
| error-handling.md     | AppError, interceptors, AppException, error codes   |
| testing.md            | Vitest, RTL, Playwright, JUnit, patterns            |
| folder-structure.md   | Where every file goes, naming rules, cross-imports  |

### /stack — per framework
| File                    | What it covers                                    |
|-------------------------|---------------------------------------------------|
| nextjs.md               | Architecture + agent rules, server/client, Zustand, |
|                         | TanStack Query, RHF+Zod, t3-env, nuqs, fetch helper |
| react-vite.md           | SPA patterns, Axios, Zustand, hooks, router       |
| springboot.md           | Controller/Service/Repository, JWT, security      |

### /database — per DB choice
| File           | What it covers                                        |
|----------------|-------------------------------------------------------|
| postgresql.md  | Schema conventions, columns, indexes, raw SQL rules   |
| supabase.md    | RLS, client setup, auth, storage, realtime            |

### /migration — per ORM/migration tool
| File               | What it covers                                    |
|--------------------|---------------------------------------------------|
| flyway.md          | File naming, schema patterns, Spring Boot config  |
| prisma.md          | Schema, singleton client, queries, seeding        |
| supabase-cli.md    | Migration files, RLS in migrations, type gen      |

### /styling — per styling choice
| File                      | What it covers                                |
|---------------------------|-----------------------------------------------|
| tailwind-extensions.md    | cn(), shadcn/ui, dark mode, responsive, anim  |
| css-modules-extensions.md | CSS vars, dark mode, clsx, responsive, anim   |

### /devops — per tooling
| File                | What it covers                                    |
|---------------------|---------------------------------------------------|
| docker.md           | Dev/prod compose, Dockerfiles, nginx, ports       |
| makefile.md         | Full Makefile per combo, .PHONY, variables        |
| github-actions.md   | Frontend/backend CI, path filters, caching        |
| pr-template.md      | PR checklist template                             |

### /combo-rules — per stack combination
| File                  | What it covers                                    |
|-----------------------|---------------------------------------------------|
| react-springboot.md   | Full monorepo: React + Spring Boot + PostgreSQL   |
| react-supabase.md     | SPA: React + Supabase (no backend service)        |
| nextjs-supabase.md    | Next.js as full-stack with Supabase               |
| nextjs-postgresql.md  | Next.js + Prisma + PostgreSQL                     |
| nextjs-springboot.md  | Next.js frontend + Spring Boot backend            |

---

## CLI Stack → Playbook Mapping

### Combo 1: React + Spring Boot
```
combo-rules/react-springboot.md
universal/ (all 6)
stack/react-vite.md
stack/springboot.md
database/postgresql.md
migration/flyway.md
styling/[choice]
devops/docker.md
devops/makefile.md       → Full 3-service Makefile
devops/github-actions.md → ci-frontend.yml + ci-backend.yml
devops/pr-template.md
```

### Combo 2: React + Supabase
```
combo-rules/react-supabase.md
universal/ (all 6)
stack/react-vite.md
database/supabase.md
migration/supabase-cli.md
styling/[choice]
devops/github-actions.md → ci-frontend.yml only
devops/pr-template.md
```

### Combo 3: Next.js + Supabase
```
combo-rules/nextjs-supabase.md
universal/ (all 6)
stack/nextjs.md
database/supabase.md
migration/supabase-cli.md
styling/tailwind-extensions.md   → always Tailwind for Next.js
devops/github-actions.md → ci-nextjs.yml
devops/pr-template.md
```

### Combo 4: Next.js + PostgreSQL
```
combo-rules/nextjs-postgresql.md
universal/ (all 6)
stack/nextjs.md
database/postgresql.md
migration/prisma.md
styling/tailwind-extensions.md
devops/docker.md         → PostgreSQL only
devops/makefile.md       → Prisma Makefile
devops/github-actions.md → ci-nextjs.yml
devops/pr-template.md
```

### Combo 5: Next.js + Spring Boot
```
combo-rules/nextjs-springboot.md
universal/ (all 6)
stack/nextjs.md
stack/springboot.md
database/postgresql.md
migration/flyway.md
styling/tailwind-extensions.md
devops/docker.md         → 3 services (Next.js + Spring Boot + PostgreSQL)
devops/makefile.md       → Full 3-service Makefile
devops/github-actions.md → ci-frontend.yml + ci-backend.yml
devops/pr-template.md
```

---

## CLI Interview → Decisions

```
Q1: Project name?
    → Sets {{PROJECT_NAME}}, {{PACKAGE_NAME}}

Q2: Stack?
    → react-springboot
    → react-supabase
    → nextjs-supabase
    → nextjs-postgresql
    → nextjs-springboot
    → Resolves: combo-rules file + playbook list

Q3: Styling?
    → tailwind    → tailwind-extensions.md
    → css-modules → css-modules-extensions.md
    (Next.js projects default to Tailwind)

Q4: Testing setup?
    → full    → Vitest + RTL + Playwright
    → basic   → Vitest + RTL only
    → none    → skip

Q5: Docker?
    → yes → devops/docker.md
    → no  → skip (auto-yes for Spring Boot combos)

Q6: Makefile?
    → yes → devops/makefile.md (correct variant)
    → no  → skip (auto-yes for Spring Boot combos)

Q7: CI/CD?
    → yes → devops/github-actions.md (correct variant)
    → no  → skip
```

---

## Generated Files Per Project

```
Every project gets:
  CONTEXT.md            → project name, stack, decisions
  RULES.md              → merged relevant playbooks
  AGENTS.md             → folder map + agent instructions
  PROGRESS.md           → empty, ready to fill
  .env.example          → stack-appropriate variables
  .editorconfig         → 2sp JS/TS, 4sp Java, tabs Makefile
  .prettierrc           → your standard config
  .gitignore            → stack-appropriate ignores
  docs/                 → full skeleton (api/, architecture/, guides/)
  .github/
    PULL_REQUEST_TEMPLATE.md
    workflows/           → CI per selected services
  README.md             → stack-appropriate template

React + Spring Boot also gets:
  Makefile              → full 3-service
  docker-compose.yml    → dev
  docker-compose.prod.yml → prod
  frontend/Dockerfile.dev
  frontend/Dockerfile
  frontend/nginx.conf
  backend/Dockerfile.dev
  backend/Dockerfile

Next.js + Supabase also gets:
  Makefile              → simplified (Supabase CLI)

Next.js + PostgreSQL also gets:
  Makefile              → Prisma variant
  docker-compose.yml    → PostgreSQL only
```

---

## Template Variables
```
{{PROJECT_NAME}}         → my-project
{{PROJECT_DESCRIPTION}}  → one-line description
{{PACKAGE_NAME}}         → com/username (Spring Boot only)
{{STYLE_MODE}}           → TAILWIND or CSS_MODULES
{{YEAR}}                 → current year
{{AUTHOR}}               → git config user.name
```

---

## Playbook Merge Order (for RULES.md)
```
1. combo-rules/[combo].md         → combo overview + what to skip
2. universal/coding-rules.md
3. universal/git-conventions.md
4. universal/typescript.md
5. universal/error-handling.md
6. universal/testing.md
7. universal/folder-structure.md
8. stack/[frontend].md
9. stack/[backend].md (if applicable)
10. database/[db].md
11. migration/[tool].md
12. styling/[choice].md
13. devops/docker.md (if applicable)
14. devops/makefile.md (if applicable)
15. devops/github-actions.md
16. devops/pr-template.md
```
