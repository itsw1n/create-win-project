# Contributing

See `docs/ARCHITECTURE.md` for the completed source ownership and `docs/DEPENDENCY_MAINTENANCE.md` for profile promotion. This file is the workflow, not the design.

## Quick start

1. Fork and create a feature branch from `dev`.
2. `npm ci` — Node 22.14+ with npm 11.19+ required (tested on Node 24).
3. `npm test` must stay green. No global `prettier`/`eslint`/`typescript` needed — they are generated inside your project.

## Adding a stack

Each stack is a self-contained vertical. Adding `django`, `nuxt`, `svelte`, etc. requires only one new directory and one registry line — no engine or unrelated stack edits.

### 1. Declare capability (no executable logic yet)

- Add `library/stacks/<id>/definition.json`:
  ```json
  { "id": "django", "kind": "backend", "label": "Django (Python)", "appliesTo": { "frontend": ["nextjs","react"] }, "architectureProfiles": ["small","medium","large"], "playbooks": ["stack/django/architecture.md"], "deps": ["django"], "env": ["DATABASE_URL"], "clientEnv": ["API_URL"] }
  ```
  - `deps`/`devDeps` are **names only** — never versions or ranges. Exact versions live only in `library/tested-versions.json`.
  - `env` are semantic names (`API_URL`); the engine prefixes them once (`NEXT_PUBLIC_API_URL`).

- Add `playbooks/stack/<id>/{architecture,structure,runtime,security,testing}.md` — the five facets. Keep each file focused; route concerns via definition `concerns[]`, not duplication.

- Run: `node checks/check-library.js` — catches duplicate ids, unknown dep names, `clientEnv` not in `env`, missing labels.

### 2. Create stack directory (one place, owns everything specific to that stack)

```
src/stacks/<frontends|backends>/<id>/
  index.js            # defineStackAdapter({ id, kind, label, compatibleWith, capabilities, contributes })
  create-files.js     # (answers, context) -> FileMap — ALL files this stack generates (pure function)
  dependencies.js     # optional: { deps: [], devDeps: [], scripts: {} } — names/scripts only
  environment.js      # optional: ["API_URL","DATABASE_URL"] — semantic env names
  auth/               # for Laravel-style stacks: session.js, sanctum.js, oidc.js, public.js
  ui/                 # for Laravel-style stacks: blade.js, livewire.js, inertia-react.js, shared.js
```

Use `src/stacks/backends/laravel/` as the reference (13 files, 363-line `create-files.js` + `auth/` + `ui/` + `composer.js` + `architecture.js`). `src/stacks/frontends/nextjs/` is the minimal vertical.

`create-files.js` receives a read-only context from `src/stacks/available-stacks.js` + `src/engine/load-library.js` — it returns contributions, it never writes files or installs tools directly.

```js
// src/stacks/backends/django/index.js
import { defineStackAdapter } from '../../rules.js'
export const djangoAdapter = defineStackAdapter({
  id: 'django', kind: 'backend', label: 'Django (Python)',
  compatibleWith: { frontend: ['nextjs','react','no-frontend'] },
  capabilities: { applicationShapes: ['fullstack','api'], architectureProfiles: ['small','medium','large'], authenticationModels: ['public','undecided','session'] },
  contributes: {
    environment: () => ['DATABASE_URL'],
    install: () => [{ cwd: 'backend', command: 'pip', args: ['install','-r','requirements.txt'] }],
    docker: () => [{ template: 'django', developmentPath: 'Dockerfile.dev' }],
    ci: () => [{ template: 'django', path: '.github/workflows/ci-backend.yml' }],
  }
})
```

### 3. Register once (explicit, no scanning)

`src/stacks/available-stacks.js` — add one import and one array entry:

```js
import { djangoAdapter } from './backends/django/index.js'
export const stackRegistry = createStackRegistry([..., djangoAdapter])
```

This is the **only** list of available adapters. Adding a file never silently activates a stack. `lib/stacks/index.js` is now a shim to this file until `lib/` is deleted.

### 4. Add tests and matrix entries

- `tests/stacks/<id>/` — at least: files exist, env prefix, large-arch boundary, auth metadata.
- `checks/check-compatibility.js` — add `'<frontend>-<backend>'` to `cases[]` and to `smokeSelections[]`.
- `templates/` — add `docker/dockerfile/django.dev.dockerfile`, `templates/ci/django.yml` etc. as static templates.

### 5. Verify (focused, not full matrix every time)

```bash
npm test
node checks/check-library.js
node checks/check-compatibility.js --scope=stack --stack=<id> | head
npm run verify:generated -- --profile=$(jq -r .defaultProfile library/tested-versions.json) --case=<frontend>-<backend> --architecture=medium --authentication=yes
```

- `verify:generated` compares byte-identical output via `generateProject` vs legacy shim for your new stack.
- Run `npm run matrix:smoke` (10 smoke projects) before any `feature -> dev` PR.
- Full matrix `npm run matrix:full` (every profile x stack x arch x auth, with install/build/Maven/Expo/Compose checks) is only required on `dev -> main` promotion per `docs/CI_STRATEGY.md`.

### 6. Docs (only if ownership changed)

Update `docs/ARCHITECTURE.md` only if source ownership or the generation pipeline changed — not for every stack. If you added concerns/playbooks, verify `docs/CONTENT_MODEL.md` checklist (concern has one home, `RULES.md` sections resolve).

## Testing and PRs

- Required checks per `docs/CI_STRATEGY.md`:
  - `feature -> dev`: `quality` + `compatibility-gate` (repository tests + 10 smoke projects)
  - `dev -> main`: `quality` + `compatibility-gate` (every profile x stack x arch x applicable auth)

- Contribution history: use merge commits for feature branches so history remains visible. Do not require individual matrix job names; require the stable `compatibility-gate` aggregator.

- `tests/architecture-boundaries.test.js` enforces `src/engine` not importing `cli`/`stacks/frontends|backends` and `src/stacks` not importing `cli`/`engine`. `tests/architecture/no-lib-legacy.test.js` bans `src/** -> lib/**` imports and one-line wrapper regressions.

## Version ownership

Exact versions belong only to `library/tested-versions.json`. Never add a version to a `definition.json` or a `create-files.js`. `packageVersion(profile, name, capability)` and `composerPackageVersion(profile, name)` are the only version sources; they reject ranges and unknown package requests. See `docs/DEPENDENCY_MAINTENANCE.md` for current/previous profile promotion and Renovate flow.

## Docs workflow

- `AGENTS.md` — tiny always-on contract; keep short.
- `RULES.md` — lazy index `concern -> playbook §`; generated per project, read only what you touch.
- `playbooks/` — reusable standards; add the five facets per stack (`architecture.md`, `structure.md`, `runtime.md`, `security.md`, `testing.md`).
- `docs/guides/` inside generated projects — architecture, API, setup, deployment for *this* product.

Do not advertise a capability solely because a playbook mentions it. A generated capability must have executable configuration and contract coverage. For questions, read `docs/ARCHITECTURE.md` first, then this file.
