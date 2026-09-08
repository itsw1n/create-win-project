# Understanding a generated project

Every project contains runnable source, tests, stack-specific CI and security workflows, environment examples, setup and operations guides, plus production Docker or EAS files where applicable.

`create-win-project.profile.json` records schema version 2, stack, dated profile, architecture, styling mode, authentication, production guarantees, capabilities, and runtimes. It enables read-only comparisons without controlling future project changes.

- `AGENTS.md` is the small always-on operating and authority contract. It contains only the trigger
  for product onboarding; detailed workflow guidance remains lazily routed.
- `RULES.md` maps always-on, conditional, and optional concerns to exact selected playbook sections.
- `playbooks/` contains only knowledge applicable to the stack.
- `CONTEXT.md` records product status, confirmed goals, the generated baseline, product decisions,
  and approved deviations.
- `PROGRESS.md` records current phases, work, and blockers; generated projects do not add a second
  planning document.

Application behavior, tests, and framework configuration remain the source of truth when prose drifts.

## Product onboarding

A new project begins with `Product status: incomplete` in `CONTEXT.md`. Before product feature work,
an agent uses the conditional entry in `RULES.md` to load only the product-onboarding playbook
sections, gathers missing requirements, and asks the user to confirm the product direction. It then
records confirmed product truth in `CONTEXT.md`, changes the status to `active`, and records current
execution work in `PROGRESS.md`.

An active project does not repeat onboarding for an ordinary task. If the user supplies or
substantially changes a specification, the agent uses the separately routed plan-reconciliation
section to compare the proposal with the profile, context, implementation, tests, capabilities, and
approved deviations.

The generator does not infer special product types such as portfolio, blog, or dashboard. Agents
may recommend simplifying the starter based on confirmed requirements, but changing the selected
architecture or another generated baseline decision requires explanation and approval.

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

The structure examples in the stack playbooks are reference maps, not instructions to create
every listed directory. Start with the smallest valid feature and add a layer only when its
responsibility exists. An agent may recommend removing an empty or obsolete architecture folder,
but must first explain what changes, why the folder is unnecessary, where future code belongs,
and how the documented folder can be restored. Removing or reorganizing user-created structure
requires the user's approval.

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

Shared UI does not replace feature ownership. These locations are created when the first real
shared component needs them rather than as empty starter directories:

```text
src/                                  frontend/src/ for React + Vite
├── app/globals.css                  Next.js global styles
├── styles.css                       React + Vite global styles
├── components/
│   ├── layout/                       structural composition and page landmarks
│   └── common/                       reusable domain-free controls
└── features/<feature>/components/   feature-owned UI
```

Component-specific CSS Modules stay beside their component. Tailwind utilities stay at their use
site, with only global imports and tokens in the framework's global stylesheet.

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

Expo keeps `StyleSheet` definitions beside the route or component by default. Structural native
UI belongs in `components/layout/`; reusable domain-free controls belong in
`components/common/`.

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
