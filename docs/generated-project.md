# Understanding a generated project

Every project contains runnable source, tests, stack-specific CI and security workflows, environment examples, setup and operations guides, plus production Docker or EAS files where applicable.

`create-win-project.profile.json` records schema version 2, stack, dated profile, architecture, authentication, production guarantees, capabilities, and runtimes. It enables read-only comparisons without controlling future project changes.

- `AGENTS.md` is the small always-on operating and authority contract.
- `RULES.md` maps tasks to exact selected playbook sections.
- `playbooks/` contains only knowledge applicable to the stack.
- `CONTEXT.md` records product goals, decisions, capabilities, and approved deviations.

Application behavior, tests, and framework configuration remain the source of truth when prose drifts.

## Architecture profiles

All supported application stacks offer the same three sizing choices without forcing empty
layers or placeholder directories.

| Profile | Generated shape |
|---|---|
| Small | Framework entry points and the fewest useful files for a focused application. |
| Medium | Feature-owned components, services, schemas, and persistence boundaries when applicable. |
| Large | Explicit feature or module interfaces plus automated dependency-boundary checks. |

Folders are created only when they contain working code. A Medium project therefore shows the
intended dependency direction without generating every folder that a future feature might need.

## Representative source layouts

### Web application with a separate API

A Next.js + FastAPI project using the Medium profile separates the deployable applications while
organizing their code by feature:

```text
my-project/
├── src/
│   ├── app/                         Next.js routes and composition
│   └── features/status/
│       ├── components/
│       ├── services/
│       └── types.ts
└── backend/
    ├── app/
    │   ├── core/
    │   └── features/status/
    │       ├── router.py
    │       ├── service.py
    │       ├── repository.py
    │       └── schemas.py
    └── tests/
```

React + Vite uses the same separation with its client under `frontend/`. A Next.js application
stays at the repository root because it can own server-side behavior as well as browser UI.

### Mobile application

Expo Router owns navigation while product code remains feature-oriented:

```text
my-project/
├── app/                              routes and navigation layouts
├── features/status/
│   ├── components/
│   ├── services/
│   └── types.ts
├── lib/                              platform and service adapters
└── backend/                          present for a paired API
```

### API-only application

Backend-only projects use the repository root. For example, Medium FastAPI output is shaped as:

```text
my-api/
├── app/
│   ├── main.py
│   ├── core/
│   └── features/status/
│       ├── router.py
│       ├── service.py
│       ├── repository.py
│       └── schemas.py
├── alembic/                          database migrations
└── tests/
```

Spring Boot preserves its conventional `src/main/java/<package>/` root, and Laravel preserves
its `app/`, `routes/`, `database/`, and `tests/` roots. Every generated project includes the exact
selected stack rules under `playbooks/stack/<stack>/structure.md`.
