# Architecture (completed — v1.4.0 target)

`create-win-project` composes a validated project specification into two coordinated outputs:

1. a small executable application that establishes the stack's real conventions;
2. a task-routed documentation layer for humans and coding agents.

Executable behavior, tests, and framework configuration are the source of truth. Playbooks explain and extend that behavior; they must not contradict it.

## Generation pipeline

```text
CLI interview
    ↓
validated answers
    ↓
available-stacks + resolve-project + load-library + tested-versions
    ↓
resolved stack descriptor
    ├── runnable framework files (from src/stacks/*/create-files.js)
    ├── optional CI / Docker / Makefile files (from templates/)
    ├── project context and documentation
    └── selected playbooks + RULES.md router
    ↓
generated-project contract tests
```

### Source ownership (completed)

Three explicit source boundaries. No `lib/` directory exists — `src/` is canonical.

- `src/cli` owns terminal arguments, questions and navigation, display, warnings, summaries, and system checks. It may call the engine and read stack descriptions. It must not contain stack dependency tables or `if (stack === "nextjs")` branches.
- `src/engine` owns validated project orchestration, tested-version and library loading, safe writes, dependency installation, and template rendering. It must not import terminal code or concrete stack folders. It contains zero `stack.frontendKey` branches — it is stack-agnostic.
- `src/stacks` owns stack rules, the explicit available-stack list, and stack-specific generated behavior. Stack modules must not import CLI or engine implementation modules. Each `src/stacks/<frontends|backends>/<id>/` owns its files, dependencies (names only), environment names, Docker and CI contributions.

During the migration `lib/` provided compatibility shims (`export * from '../src/...'`). After v1.4.0 those shims are deleted. `tests/architecture-boundaries.test.js` enforces dependency direction, and `tests/architecture/no-lib-legacy.test.js` bans `src -> lib` imports and one-line wrapper regressions.

Root `index.js` remains the stable executable entry point. Generated-project paths such as `playbooks/`, `RULES.md`, and application folders are user-facing and do not change merely because generator source files move.

### CLI boundary

Root `index.js` is only the stable executable shim. `src/cli/main.js` coordinates the command, `arguments.js` parses and validates flags, `questions.js` defines the interview, `navigation.js` owns Back behavior, `display.js` owns terminal presentation (`w1nBanner` + `projectLocationNotice`), and `system-check.js` detects runtime support and `collectDiagnostics/printDoctor`. The CLI gathers project identity, frontend, optional backend, styling, one Small/Medium/Large architecture profile, login intent, client audience when relevant, testing depth, and optional operational tooling. Medium is shown first and is the default. CLI modules do not contain stack dependency tables.

`generateProject()` in `src/engine/create-project.js` validates the same answers again because it is also an exported programmatic API. A caller cannot bypass destination-name, Java-package, or testing-profile validation by skipping the CLI.

### Catalog and resolution

`src/engine/load-library.js` walks `library/**/definition.json` and merges manifests into a catalog index. `src/engine/tested-versions.js` validates `library/tested-versions.json` and resolves every package name to an exact version for the selected profile. `src/engine/resolve-project.js` merges selected capabilities into one resolved stack descriptor. No versions live in definitions or scaffold code.

Stack-specific behavior crosses into core orchestration through the contract in `src/stacks/rules.js` (`defineStackAdapter`). Every frontend, backend, or data adapter has a stable identity, declares compatible adapters and supported application/authentication/architecture models, and is added to the explicit registry in `src/stacks/available-stacks.js`. Registration is deliberate and explicit — adapters are never discovered by scanning directories; adding a file does not silently activate a stack.

Adapters may contribute via `CONTRIBUTION_HOOKS`:

- `prompts` in a core-defined prompt slot;
- `authentication` models;
- `files` via `create-files.js` (`(answers, context) -> FileMap`);
- `environment` declarations (semantic names like `API_URL`);
- `install` steps;
- `docker` and `ci` fragments;
- `verification` cases.

Example:

```js
// src/stacks/frontends/nextjs/index.js
import { defineStackAdapter } from '../../rules.js'
export const nextjsAdapter = defineStackAdapter({
  id: 'nextjs', kind: 'frontend', label: 'Next.js',
  compatibleWith: { backend: ['none','postgres','supabase','springboot','laravel'] },
  capabilities: { applicationShapes: ['fullstack','separate'], architectureProfiles: ['small','medium','large'], authenticationModels: ['public','undecided','supabase','session','oidc','sanctum-spa','laravel-oidc'] },
  contributes: {
    environment: ({ backend }) => backend.id === 'none' ? [] : ['API_URL'],
    install: () => [{ cwd: '.', command: 'npm', args: ['install'] }],
    docker: () => [{ template: 'nextjs', developmentPath: 'Dockerfile.dev', productionPath: 'Dockerfile' }],
    ci: () => [{ template: 'nextjs', path: '.github/workflows/ci-frontend.yml' }],
  }
})
```

- **Next.js** owns route-oriented Small; feature services/actions/queries and owned repositories or remote API clients in Medium; public feature APIs and enforced boundaries in Large — all in `src/stacks/frontends/nextjs/create-files.js`.
- **React + Vite** owns thin browser features in Small, feature modules in Medium, and public feature APIs plus boundary checks in Large — in `src/stacks/frontends/react-vite/create-files.js`.
- **React Native** owns Expo shell, mobile architecture profiles, local install and CI contributions in `src/stacks/frontends/react-native/create-files.js`. It deliberately contributes no frontend Docker workflow.
- **Spring Boot** owns Maven launcher, application and security configuration, package-by-feature variants, migrations, tests, and runtime Docker/CI in `src/stacks/backends/springboot/create-files.js`.
- **Laravel** owns composer definition, application files, authentication models, and Blade/Livewire/Inertia React UI variants in `src/stacks/backends/laravel/` — `create-files.js` + `composer.js` + `architecture.js` + `auth/{session,sanctum,oidc,public}.js` + `ui/{blade,livewire,inertia-react,shared}.js`. Names `auth/` and `ui/` are kept (not `login/`/`user-interface`) for conciseness; `create-files.js` is used everywhere for consistency with `create-project.js`.
- **Supabase** owns framework-specific clients, native token lifecycle, local project config, migrations, RLS policies, and verification in `src/stacks/backends/supabase/` (`create-files.js` + `native.js`).
- **PostgreSQL + Prisma** owns schema, client initialization, migration commands, database environment, Docker contribution in `src/stacks/backends/postgres/create-files.js`.
- **no-backend** explicitly owns frontend-only compatibility and confirms no server files, install steps, Docker services, credentials, or pretend authentication are contributed.

Core code owns prompt order, compatibility-profile resolution, atomic writes, process execution, and final composition. An adapter receives a read-only stack context (`createStackContext`) and returns contributions; it cannot write arbitrary paths or install global tools. Adapter definitions do not accept dependency tables or version fields. Exact versions remain exclusively owned by `library/tested-versions.json`.

Manifests declare:

- identity and compatibility (`id`, `kind`, `appliesTo`);
- dependency names and scripts (never dependency versions);
- semantic environment names and which ones are client-visible;
- supported architecture profiles, conditional playbooks, and optional templates;
- constraints shown to the agent;
- concerns and their playbook sections.

Client environment variables are semantic in definitions (`API_URL`) and receive exactly one framework prefix during resolution (`NEXT_PUBLIC_API_URL`, `VITE_API_URL`, or `EXPO_PUBLIC_API_URL`). Public prefixes always mean the value is shipped to the client.

### Runnable scaffold (stack-owned vertical)

Each `src/stacks/{frontends,backends}/<id>/create-files.js` is a pure function `(answers, stack, shared) -> FileMap` that owns its minimum executable vertical slice. `shared/` contains helpers only when at least two stacks genuinely share behavior—not forced sharing. Core composes stack adapters through their contribution hooks. This intentionally generates a small working example. Domain-specific features are added after product context is known; the generator does not invent business entities.

### Repository and operational files

`src/engine/create-project.js` coordinates writes and refuses to merge into a non-empty destination. It adds documentation, selected playbooks, CI, Docker, Makefile, environment examples, and repository conventions around the runnable foundation.

Engine infrastructure is separated from generated-file decisions. `src/engine/write-files.js` validates destinations, stages writes, removes failed staging trees, and publishes completed trees atomically. `src/engine/render-templates.js` combines rendering with that safe write boundary (`writeRenderedFile` + `render`/`readTemplate`/`buildVars`). `src/engine/install-dependencies.js` is the only engine process runner and stops at the first failed package-manager step. `src/engine/tested-versions.js` and `src/engine/load-library.js` expose version resolution and library loading separately. After the migration `lib/` shims are deleted; `src/` is the sole implementation.

The first `npm install` creates the lockfile. Generated CI uses `npm ci`, so the lockfile must be committed before CI is enabled. `create-win-project.profile.json` separately records the compatibility profile, architecture profile, and authentication intent/model/audience; after generation, that project owns its own upgrade lifecycle.

### Compatibility profile lifecycle

Exactly one profile is `current` and one is `previous`. The current profile is the default. A profile owns exact npm, Spring Boot, runtime, and container versions; definitions and scaffold code may only request names or capabilities. Promotion copies the candidate into a new dated profile, marks the former current profile previous, and happens only after the generated-project matrix passes. Major changes also require migration notes. See `DEPENDENCY_MAINTENANCE.md`.

## Documentation model

| File | Responsibility |
|------|----------------|
| `AGENTS.md` | Small always-on command, workflow, safety, and definition-of-done contract. |
| `CONTEXT.md` | Product goals, boundaries, decisions, and project-specific facts. |
| `RULES.md` | Generated concern-to-playbook section router. |
| `playbooks/` | Reusable standards, recipes, rationale, and stack guidance. |
| `docs/` | Documentation for the generator (ARCHITECTURE, CONTRIBUTING, etc.), not generic framework teaching. |
| `docs/CONTRIBUTING.md` | How to add a stack and run checks — the workflow, not the design. |

Manifest section names are checked against Markdown headings. Numbered headings are normalized for matching, and generated contract tests reject unresolved `RULES.md` entries.

## Testing strategy

The generator itself has three verification levels:

1. unit tests for catalog composition and template rendering;
2. generated-output contract tests for required files, environment naming, playbook routing, profile-specific boundaries, auth metadata/code, testing profiles, and overwrite safety;
3. a current-and-previous matrix across every supported stack combination, all three architecture profiles, and every applicable authentication model. It installs and runs lint, typecheck, tests, builds, Expo compatibility checks/web export, Spring MVC/security/Modulith tests and Maven packaging, Compose validation, and current-profile container builds.

Additional architecture guards:

- `tests/architecture-boundaries.test.js` enforces `src/engine` not importing `cli`/`stacks/frontends|backends` and `src/stacks` not importing `cli`/`engine`.
- `tests/architecture/no-lib-legacy.test.js` bans `src/**` importing `lib/` and one-line wrapper regressions (`export * from '../../lib/...'`) and bans `lib/` existence after the migration.

Tests mirror the production folders: `tests/cli`, `tests/engine`, `tests/stacks/frontends`, `tests/stacks/backends`.

Canonical Markdown code examples should progressively move into extracted fixtures so examples compile against the versions they teach.

## Extension workflow

When adding a stack or capability (see `docs/CONTRIBUTING.md` for the full checklist):

1. Add its `library/**/definition.json` (names only, no versions), playbooks, and `library/tested-versions.json` entry remains version-free.
2. Create one new `src/stacks/<frontends|backends>/<id>/` directory with `index.js` (`defineStackAdapter`), `create-files.js`, `dependencies.js`/`environment.js` where needed, and `auth/`+`ui/` subfolders for Laravel-style stacks.
3. Register it once in `src/stacks/available-stacks.js` (explicit array — no scanning).
4. Add focused contract tests in `tests/stacks/<id>/` and add the stack's cases to `checks/check-compatibility.js`.
5. Run `npm test`, `node checks/check-library.js`, and `npm run verify:generated -- --profile=<id> --case=<id>-<backend> --architecture=medium` for every supported arch/auth combo; run `npm run matrix:smoke` before `dev` and `matrix:full` before `main`.
6. Update this architecture document only if ownership or the generation pipeline changed.

Do not advertise a capability solely because a playbook mentions it. A generated capability must have executable configuration and contract coverage.

Adding a stack must not require editing the engine or unrelated stacks.
