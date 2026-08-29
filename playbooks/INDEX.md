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

---

## How the Stack Is Composed

The CLI asks **which frontend** (Next.js / React + Vite) then **which backend/database**
(Supabase / Spring Boot / PostgreSQL). The generator composes the playbook list from
`lib/constants.js` — no per-combo docs are maintained. Combo-specific integration
knowledge lives as data in the `CONSTRAINTS` table.

```
universal/ (all 6)          → always
stack/[frontend].md         → from the chosen frontend
stack/[backend].md          → Spring Boot only
database/[db].md            → Supabase / PostgreSQL
migration/[tool].md         → supabase-cli / prisma / flyway
styling/[choice].md         → tailwind / css-modules
devops/…                    → docker, makefile, github-actions, pr-template (conditional)
```

Per the CLI answers, real project files are also generated (not just docs):
`Makefile`, `docker-compose.yml` (+ `docker-compose.prod.yml` for Spring Boot),
backend/frontend Dockerfiles, nginx.conf (React), `.env.example`, `.editorconfig`.

### Allowed frontend × backend pairs
| Frontend     | Allowed backends                    |
|--------------|-------------------------------------|
| Next.js      | Supabase, Spring Boot, PostgreSQL   |
| React + Vite | Supabase, Spring Boot               |

### Generated RULES.md
A short **index** (concern → playbook section), built automatically from the selected
playbooks' headings. Full detail always lives in the copied `/playbooks/`.

### Shipped stack playbooks are the lean copies
The stack playbooks in `playbooks/stack/` (`nextjs.md`, `springboot.md`) **are** the
lean, token-friendly copies that get shipped into generated projects — there is no
separate compact directory. They keep every rule section heading **1:1** (so every
RULES.md `§ N` reference resolves) and the same rules + code examples; only prose/ASCII
diagrams are condensed. `nextjs.md` drops from ~3.3k to ~1.5k lines to avoid agent
context/token burn.

The verbose full versions are preserved as reference at `~/Documents/nextjs.full.md`
and `~/Documents/springboot.full.md` if you ever need the untrimmed diagrams/examples.

`lib/playbooks.js#resolvePlaybook` joins `playbooks/<file>` directly — the shipped file
is the lean one.

---

## CLI Interview → Decisions

```
Q1: Project name?
    → Sets {{PROJECT_NAME}}, {{PACKAGE_NAME}}

Q2: Frontend?
    → nextjs (Next.js)
    → react  (React + Vite)

Q2a: Architecture depth? — **Next.js only**
    → medium (default) → Service layer, no Repository —
                        `features/[name]/{components, actions, services, schemas}` + types.ts
    → large            → Service + Repository —
                        `features/[name]/{components, actions, services, queries, repositories, schemas}` + types.ts
    (Rule set only — directory scaffolding is identical; the choice shapes AGENTS.md + playbook rules)

Q3: Backend/database?
    → supabase   → database/supabase.md + migration/supabase-cli.md
    → springboot → stack/springboot.md + database/postgresql.md + migration/flyway.md
    → postgres   → database/postgresql.md + migration/prisma.md
    (choices filtered by the frontend — see Allowed Pairs above)

Q4: Styling?
    → tailwind    → tailwind-extensions.md
    → css-modules → css-modules-extensions.md
    (Next.js projects default to Tailwind)

Q5: Testing setup?
    → full    → Vitest + RTL + Playwright
    → basic   → Vitest + RTL only
    → none    → skip

Q6: Docker?
    → yes → devops/docker.md
    → no  → skip (auto-yes when the backend needs Docker)

Q7: Makefile?
    → yes → devops/makefile.md
    → no  → skip

Q8: CI/CD?
    → yes → devops/github-actions.md + devops/pr-template.md
    → no  → skip
```

---

## Generated Files Per Project

```
Every project gets:
  CONTEXT.md            → project name, stack, decisions
  RULES.md              → index-style map of every selected playbook section
  AGENTS.md             → combo constraints + folder map + agent instructions
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
  playbooks/            → ONLY the selected playbooks (no irrelevant ones)

When Makefile is selected:
  Makefile              → full 3-service (Spring Boot),
                          Supabase CLI (Supabase),
                          Prisma (PostgreSQL) variants

When Docker is selected:
  docker-compose.yml    → 3-service dev (Spring Boot),
                          PostgreSQL-only dev (Prisma)
  docker-compose.prod.yml → production (Spring Boot only)
  backend/Dockerfile + Dockerfile.dev   → Spring Boot only
  frontend/Dockerfile + Dockerfile.dev + nginx.conf → React + Vite only

Spring Boot backend projects also get:
  backend/              → Java package folders via {{PACKAGE_PATH}}
```

---

## Template Variables
```
{{PROJECT_NAME}}         → my-project
{{PROJECT_DESCRIPTION}}  → one-line description
{{PACKAGE_NAME}}         → com/username (Spring Boot only)
{{PACKAGE_PATH}}         → com/username as folder path
{{STYLE_MODE}}           → TAILWIND or CSS_MODULES
{{ARCHITECTURE}}         → MEDIUM or LARGE (Next.js only)
{{STACK}}                → nextjs-supabase etc.
{{YEAR}}                 → current year
```

---

## RULES.md Generation Order
```
1. universal/coding-rules.md
2. universal/git-conventions.md
3. universal/typescript.md
4. universal/error-handling.md
5. universal/testing.md
6. universal/folder-structure.md
7. stack/[frontend].md
8. stack/[backend].md (if applicable)
9. database/[db].md
10. migration/[tool].md
11. styling/[choice].md
12. devops/docker.md (if applicable)
13. devops/makefile.md (if applicable)
14. devops/github-actions.md
15. devops/pr-template.md

---

## Manifest Model (how generation is driven)

Each playbook has a co-located `<name>.manifest.json` describing it to the CLI:

- `id`, `kind` (frontend/backend/database/migration/styling/devops/universal), `label`
- `appliesTo` — which frontend/backend pairs it belongs to (drives interview + pairing)
- `required` — always included for matching stacks
- `folders`, `deps`, `devDeps`, `env` — scaffold inputs (Phase 2)
- `constraints` — combo rules (replaces the old `CONSTRAINTS` table)
- `concerns` — `[{ id, required, when, sections, playbook? }]`; `required:false` concerns are optional and appear only in RULES.md's optional group
- `snippets` — `{ targetPath: "snippet:<tag>" }` (Phase 2 extraction)

`lib/catalog.js#resolveStack` reads these (never hardcoded tables) to build the stack descriptor. `RULES.md` is generated from `concerns`; `AGENTS.md` stays lean and always-loaded.
```