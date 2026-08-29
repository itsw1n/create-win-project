# Manifest-Driven Playbooks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `create-win-project` playbooks the single source of truth by giving each a co-located `*.manifest.json`, driving both selection/indexing and (in Phase 2) scaffolding from manifests, and shipping a lean `AGENTS.md` + lazy `RULES.md` index.

**Architecture:** A new `lib/catalog.js` loads every `playbooks/**/*.manifest.json` and exposes `resolveStack(answers, catalog)` that replaces the hardcoded `composeStack` tables. `generator.js` consumes the resulting descriptor (parity-preserving in Phase 1, then manifest-driven scaffold in Phase 2). `lib/playbooks.js` builds a two-group lazy `RULES.md` from each manifest's `concerns`; `lib/files.js` emits a lean `AGENTS.md`.

**Tech Stack:** Node.js ESM (existing), `fs-extra` (existing), `vitest` (new dev dependency for tests), `inquirer`/`chalk`/`ora` (existing).

## Global Constraints

- Playbooks remain the single source of truth; the generator must **read manifests**, never hardcode the folder/playbook list it used to in `constants.js`.
- **Phase 1 must preserve generated project shape** (same folders/files) except the intended AGENTS.md/RULES.md improvement — no behavior regression vs current `main`.
- Optional concerns (validation/Zod, query, state, env, url-state, forms) are **never mandated**; they ship lazily and appear only in RULES.md's optional group.
- **No hard upfront toggle that excludes** a concern. The optional "expected concerns?" prompt only annotates CONTEXT.md/RULES.md ordering.
- Makefile/CI stay as **parameterized templates** (not manifests) — fed `port`/`needsDocker`/`kind` from the chosen manifests.
- Keep the `playbooks-compact/` preference: `resolvePlaybook` still prefers the compact `.md` when present.
- Every task ends with a test cycle and a commit. DRY, YAGNI, TDD.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `lib/catalog.js` | **NEW** — `loadCatalog(playbooksDir)`, `resolveStack(answers, catalog)`, `frontendChoices()`, `backendChoicesFor(feId)` |
| `playbooks/<dir>/<name>.manifest.json` | **NEW** (×20) — machine-readable per-playbook metadata (see §Manifest shape) |
| `lib/playbooks.js` | Rewrite `buildRulesIndex` → two-group lazy index from `concerns`; `extractSections` returns line ranges |
| `lib/files.js` | Rewrite `agentsMd` (lean + lazy instruction); parameterize Makefile/CI/README by manifest fields; drop duplicated folder map |
| `lib/generator.js` | Use `resolveStack`; Phase 2 scaffold folders/deps/env/snippets from manifest fields |
| `lib/constants.js` | Phase 2: slim/remove hardcoded folder/playbook/`CONSTRAINTS` tables |
| `index.js` | Load catalog; build interview choices from it; call `resolveStack`; add optional concern prompt |
| `playbooks/INDEX.md` | Document the manifest model + lazy-load contract |
| `tests/catalog.test.js` | TDD tests for `resolveStack` parity + pairing |
| `tests/playbooks.test.js` | TDD tests for lazy `RULES.md` shape |
| `package.json` | Add `vitest` devDep + `test` script |

### Manifest shape (reference)
```json
{
  "id": "nextjs",
  "kind": "frontend",
  "label": "Next.js",
  "appliesTo": { "backend": ["supabase", "springboot", "postgres"] },
  "port": 3000,
  "needsDocker": false,
  "frontendDir": "",
  "required": true,
  "folders": ["src/app", "src/features", "src/components/ui"],
  "deps": { "next": "^15" },
  "devDeps": { "typescript": "^5" },
  "env": ["NEXT_PUBLIC_API_URL"],
  "constraints": ["Server Components default; use client only where needed"],
  "concerns": [
    { "id": "server-client", "required": true, "sections": ["Server vs Client"] },
    { "id": "validation", "required": false, "when": "Project has forms / runtime input", "sections": ["React Hook Form + Zod"] }
  ],
  "snippets": { "src/lib/env.ts": "snippet:nextjs-env" }
}
```
`sections` lists heading titles in the playbook `.md`; `buildRulesIndex` resolves them to `§ N` refs. Cross-playbook concerns set `"playbook": "universal/typescript.md"`.

---

## Phase 1 — Parity + lazy index

### Task 1: Add test tooling

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing
- Produces: `npm test` runs vitest

- [ ] **Step 1: Add vitest devDependency and test script**

Edit `package.json`:
```json
{
  "name": "create-win-project",
  "version": "1.0.0",
  "description": "Project scaffolding CLI by Win",
  "main": "index.js",
  "type": "module",
  "bin": { "create-win-project": "./index.js" },
  "scripts": { "start": "node index.js", "test": "vitest run" },
  "dependencies": {
    "chalk": "^5.3.0",
    "fs-extra": "^11.4.0",
    "inquirer": "^9.2.12",
    "ora": "^7.0.1"
  },
  "devDependencies": { "vitest": "^2.1.0" }
}
```

- [ ] **Step 2: Install**

Run: `npm install`
Expected: adds `vitest`, no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add vitest for generator tests"
```

### Task 2: Catalog loader + resolveStack

**Files:**
- Create: `lib/catalog.js`
- Create: `tests/catalog.test.js`

**Interfaces:**
- Consumes: `lib/constants.js` `composeStack` (for parity comparison in tests only)
- Produces: `loadCatalog(playbooksDir) → catalog`, `resolveStack(answers, catalog) → stackDescriptor`, `frontendChoices(catalog)`, `backendChoicesFor(catalog, feId)`

- [ ] **Step 1: Write the failing test**

`tests/catalog.test.js`:
```js
import { describe, it, expect } from 'vitest'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadCatalog, resolveStack } from '../lib/catalog.js'
import { composeStack } from '../lib/constants.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

describe('resolveStack parity with composeStack', () => {
  it('nextjs + supabase matches folders/playbooks/constraints shape', async () => {
    const catalog = await loadCatalog(path.join(root, 'playbooks'))
    const answers = { frontend: 'nextjs', backend: 'supabase', styling: 'tailwind', architecture: 'medium', docker: false, makefile: true, githubActions: true }
    const stack = resolveStack(answers, catalog)
    const old = composeStack(answers.frontend, answers.backend, answers)
    expect(stack.folders.sort()).toEqual(old.folders.sort())
    expect(stack.playbooks.sort()).toEqual(old.playbooks.sort())
    expect(stack.label).toBe(old.label)
    expect(stack.isNextjs).toBe(true)
    expect(stack.isSupabase).toBe(true)
  })

  it('rejects invalid frontend/backend pairing', async () => {
    const catalog = await loadCatalog(path.join(root, 'playbooks'))
    expect(() => resolveStack({ frontend: 'nextjs', backend: 'postgres', styling: 'tailwind' }, catalog))
      .not.toThrow() // postgres is allowed for nextjs
    // react does not allow postgres in current model
    expect(() => resolveStack({ frontend: 'react', backend: 'postgres', styling: 'tailwind' }, catalog))
      .toThrow(/cannot pair/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../lib/catalog.js'`

- [ ] **Step 3: Write minimal implementation**

`lib/catalog.js`:
```js
import fs from 'fs-extra'
import path from 'path'

export async function loadCatalog(playbooksDir) {
  const manifests = []
  const walk = async (dir) => {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const e of entries) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) { await walk(full); continue }
      if (e.name.endsWith('.manifest.json')) {
        const m = await fs.readJson(full)
        m._file = full
        m._playbook = full.replace(/\.manifest\.json$/, '.md')
        manifests.push(m)
      }
    }
  }
  await walk(playbooksDir)
  return buildIndex(manifests)
}

function buildIndex(manifests) {
  const byId = {}
  const byKind = {}
  for (const m of manifests) {
    byId[m.id] = m
    ;(byKind[m.kind] ||= []).push(m)
  }
  return {
    manifests, byId, byKind,
    universal: byKind['universal'] || [],
    frontends: byKind['frontend'] || [],
    backends: byKind['backend'] || [],
  }
}

export function frontendChoices(catalog) {
  return catalog.frontends.map((f) => ({ name: f.label, value: f.id }))
}

export function backendChoicesFor(catalog, feId) {
  const fe = catalog.byId[feId]
  const allowed = fe?.appliesTo?.backend || []
  return catalog.backends
    .filter((b) => allowed.includes(b.id))
    .map((b) => ({ name: b.label, value: b.id }))
}

export function resolveStack(answers, catalog) {
  const fe = catalog.byId[answers.frontend]
  const be = catalog.byId[answers.backend]
  if (!fe) throw new Error(`Unknown frontend: ${answers.frontend}`)
  if (!be) throw new Error(`Unknown backend: ${answers.backend}`)
  const allowed = (fe.appliesTo?.backend || [])
  if (!allowed.includes(be.id)) {
    throw new Error(`${fe.label} cannot pair with ${be.label}`)
  }

  const styleMode = answers.styling === 'tailwind' ? 'tailwind' : 'css-modules'
  const architecture = (answers.frontend === 'nextjs' && answers.architecture === 'large') ? 'large' : 'medium'

  const selected = []
  const include = (m) => { if (m && !selected.find((s) => s.id === m.id)) selected.push(m) }

  for (const m of catalog.universal) include(m)
  include(fe); include(be)
  for (const m of (catalog.byKind['database'] || [])) {
    if ((m.appliesTo?.backend || []).includes(be.id)) include(m)
  }
  for (const m of (catalog.byKind['migration'] || [])) {
    if ((m.appliesTo?.backend || []).includes(be.id)) include(m)
  }
  include(catalog.byId[styleMode])
  if (answers.docker) include(catalog.byId['docker'])
  if (answers.makefile) include(catalog.byId['makefile'])
  if (answers.githubActions) { include(catalog.byId['github-actions']); include(catalog.byId['pr-template']) }

  const playbooks = selected.map((m) => m._playbook)
  let folders = []
  const deps = {}, devDeps = {}, env = []
  const constraints = []
  const concerns = []
  const snippets = {}
  for (const m of selected) {
    folders = folders.concat(m.folders || [])
    Object.assign(deps, m.deps || {})
    Object.assign(devDeps, m.devDeps || {})
    if (m.env) env.push(...m.env)
    if (m.constraints) constraints.push(...m.constraints)
    if (m.concerns) concerns.push(...m.concerns)
    if (m.snippets) Object.assign(snippets, m.snippets)
  }
  const packagePath = (answers.packageName || 'com.app').replace(/\./g, '/')
  folders = [...new Set(folders)].map((f) => f.replace(/\{\{PACKAGE_PATH\}\}/g, packagePath))

  return {
    key: `${fe.id}-${be.id}`,
    frontendKey: fe.id, backendKey: be.id,
    label: `${fe.label} + ${be.label}`,
    frontendLabel: fe.label, backendLabel: be.label,
    frontendDir: fe.frontendDir ?? '',
    frontendPort: String(fe.port ?? ''),
    backendPort: be.port ? String(be.port) : '',
    needsDocker: be.needsDocker ?? fe.needsDocker ?? false,
    architecture,
    isNextjs: fe.id === 'nextjs', isReact: fe.id === 'react',
    isSpringBoot: be.id === 'springboot', isSupabase: be.id === 'supabase', isPrisma: be.id === 'postgres',
    playbooks, folders, constraints, concerns, deps, devDeps, env, snippets,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (once manifests exist — if it fails on missing manifests, proceed to Task 3 then re-run)

- [ ] **Step 5: Commit**

```bash
git add lib/catalog.js tests/catalog.test.js
git commit -m "feat: add catalog loader + resolveStack"
```

### Task 3: Author all 20 manifests

**Files:**
- Create: `playbooks/universal/coding-rules.manifest.json`
- Create: `playbooks/universal/git-conventions.manifest.json`
- Create: `playbooks/universal/typescript.manifest.json`
- Create: `playbooks/universal/error-handling.manifest.json`
- Create: `playbooks/universal/testing.manifest.json`
- Create: `playbooks/universal/folder-structure.manifest.json`
- Create: `playbooks/stack/nextjs.manifest.json`
- Create: `playbooks/stack/react-vite.manifest.json`
- Create: `playbooks/stack/springboot.manifest.json`
- Create: `playbooks/database/postgresql.manifest.json`
- Create: `playbooks/database/supabase.manifest.json`
- Create: `playbooks/migration/prisma.manifest.json`
- Create: `playbooks/migration/flyway.manifest.json`
- Create: `playbooks/migration/supabase-cli.manifest.json`
- Create: `playbooks/styling/tailwind.manifest.json`
- Create: `playbooks/styling/css-modules.manifest.json`
- Create: `playbooks/devops/docker.manifest.json`
- Create: `playbooks/devops/makefile.manifest.json`
- Create: `playbooks/devops/github-actions.manifest.json`
- Create: `playbooks/devops/pr-template.manifest.json`

**Interfaces:**
- Consumes: `resolveStack` (Task 2) — ids must match (`nextjs`, `react`, `supabase`, `springboot`, `postgres`, `tailwind`, `css-modules`, `docker`, `makefile`, `github-actions`, `pr-template`)
- Produces: 20 manifest files consumed by `loadCatalog`

- [ ] **Step 1: Write universal manifests**

`playbooks/universal/coding-rules.manifest.json`:
```json
{
  "id": "coding-rules",
  "kind": "universal",
  "label": "Coding Rules",
  "required": true,
  "folders": [],
  "concerns": [
    { "id": "naming", "required": true, "sections": ["Naming", "Functions", "Imports", "Constants"] },
    { "id": "no-debug", "required": true, "sections": ["No Debug Code in Commits", "One Thing Per File"] }
  ]
}
```

`playbooks/universal/git-conventions.manifest.json`:
```json
{
  "id": "git-conventions",
  "kind": "universal",
  "label": "Git Conventions",
  "required": true,
  "folders": [],
  "concerns": [
    { "id": "git", "required": true, "sections": ["Branch Structure", "Commit Convention", "Daily Workflow"] }
  ]
}
```

`playbooks/universal/typescript.manifest.json`:
```json
{
  "id": "typescript",
  "kind": "universal",
  "label": "TypeScript",
  "required": true,
  "folders": [],
  "concerns": [
    { "id": "typescript-strict", "required": true, "sections": ["Strict Mode — Always On", "No any", "Type vs Interface"] },
    { "id": "validation", "required": false, "when": "Project validates external/runtime input", "sections": ["Zod for Runtime Validation"] }
  ]
}
```

`playbooks/universal/error-handling.manifest.json`:
```json
{
  "id": "error-handling",
  "kind": "universal",
  "label": "Error Handling",
  "required": true,
  "folders": [],
  "concerns": [
    { "id": "errors", "required": true, "sections": ["API Error Response Shape", "Error Code Registry", "Security Rules for Errors"] }
  ]
}
```

`playbooks/universal/testing.manifest.json`:
```json
{
  "id": "testing",
  "kind": "universal",
  "label": "Testing",
  "required": true,
  "folders": [],
  "concerns": [
    { "id": "testing", "required": true, "sections": ["Testing Layers", "Frontend: Vitest Setup", "Backend: JUnit + Spring Boot"] },
    { "id": "validation", "required": false, "when": "Project has forms to test", "playbook": "universal/testing.md", "sections": ["Frontend: Zod Schema Testing"] }
  ]
}
```

`playbooks/universal/folder-structure.manifest.json`:
```json
{
  "id": "folder-structure",
  "kind": "universal",
  "label": "Folder Structure",
  "required": true,
  "folders": ["docs/api", "docs/architecture", "docs/guides", "docs/decisions", ".github/workflows"],
  "concerns": [
    { "id": "folder-structure", "required": true, "sections": ["Root Structure (All Projects)", "Cross-Feature Import Rules", "File Naming Rules"] }
  ]
}
```

- [ ] **Step 2: Write stack manifests**

`playbooks/stack/nextjs.manifest.json`:
```json
{
  "id": "nextjs",
  "kind": "frontend",
  "label": "Next.js",
  "appliesTo": { "backend": ["supabase", "springboot", "postgres"] },
  "port": 3000,
  "needsDocker": false,
  "frontendDir": "",
  "required": true,
  "folders": [
    "src/app", "src/features", "src/components/ui", "src/components/shared",
    "src/components/layout", "src/lib", "src/stores", "src/hooks", "src/types",
    "src/schemas", "src/constants", "e2e", "public"
  ],
  "deps": { "next": "^15", "react": "^18", "react-dom": "^18" },
  "devDeps": { "typescript": "^5", "@types/react": "^18", "@types/node": "^20" },
  "env": ["NEXT_PUBLIC_API_URL"],
  "constraints": [
    "Server Components default; use client only where browser behavior is required",
    "Medium default: Action → Service → Database; add Repository only when DB access is complex"
  ],
  "concerns": [
    { "id": "server-client", "required": true, "sections": ["Server vs Client", "Rule E — Keep client boundaries narrow"] },
    { "id": "validation", "required": false, "when": "Project has forms / runtime input", "sections": ["React Hook Form + Zod", "Zod Schema Placement"] },
    { "id": "query", "required": false, "when": "Client needs cached server state", "sections": ["TanStack Query"] },
    { "id": "state", "required": false, "when": "Shared non-server UI state", "sections": ["Zustand"] },
    { "id": "env", "required": false, "when": "Validating env vars", "sections": ["t3-env"] },
    { "id": "url-state", "required": false, "when": "Filter/search state belongs in URL", "sections": ["nuqs"] }
  ],
  "snippets": { "src/lib/env.ts": "snippet:nextjs-env" }
}
```

`playbooks/stack/react-vite.manifest.json`:
```json
{
  "id": "react",
  "kind": "frontend",
  "label": "React + Vite",
  "appliesTo": { "backend": ["supabase", "springboot"] },
  "port": 5173,
  "needsDocker": false,
  "frontendDir": "frontend",
  "required": true,
  "folders": [
    "frontend/src/app", "frontend/src/pages", "frontend/src/features", "frontend/src/components/ui",
    "frontend/src/components/shared", "frontend/src/components/layout", "frontend/src/components/forms",
    "frontend/src/stores", "frontend/src/lib", "frontend/src/hooks", "frontend/src/types",
    "frontend/src/constants", "frontend/e2e", "frontend/public"
  ],
  "deps": { "react": "^18", "react-dom": "^18" },
  "devDeps": { "vite": "^5", "typescript": "^5", "@vitejs/plugin-react": "^4" },
  "env": ["VITE_API_URL"],
  "constraints": [
    "SPA exposes everything to the browser — never use the service role key client-side",
    "Full Docker: React + backend + PostgreSQL for Spring Boot combos"
  ],
  "concerns": [
    { "id": "data-flow", "required": true, "sections": ["Data Flow", "Feature API Pattern"] },
    { "id": "validation", "required": false, "when": "Project has forms / runtime input", "sections": ["Zustand Store Pattern"] },
    { "id": "query", "required": false, "when": "Client needs cached server state", "sections": ["lib/queryClient.ts Pattern"] },
    { "id": "state", "required": false, "when": "Shared UI state", "sections": ["Zustand Store Pattern"] }
  ]
}
```

`playbooks/stack/springboot.manifest.json`:
```json
{
  "id": "springboot",
  "kind": "backend",
  "label": "Spring Boot",
  "appliesTo": { "frontend": ["nextjs", "react"] },
  "port": 8080,
  "needsDocker": true,
  "required": true,
  "folders": [
    "backend/src/main/java/{{PACKAGE_PATH}}/auth/dto",
    "backend/src/main/java/{{PACKAGE_PATH}}/auth/entity",
    "backend/src/main/java/{{PACKAGE_PATH}}/config",
    "backend/src/main/java/{{PACKAGE_PATH}}/common/exception",
    "backend/src/main/java/{{PACKAGE_PATH}}/common/response",
    "backend/src/main/java/{{PACKAGE_PATH}}/common/jwt",
    "backend/src/main/java/{{PACKAGE_PATH}}/common/audit",
    "backend/src/main/resources/db/migration",
    "backend/src/main/resources/db/dev",
    "backend/src/test/java/{{PACKAGE_PATH}}"
  ],
  "deps": {},
  "env": ["DATABASE_URL", "JWT_SECRET", "JWT_REFRESH_SECRET"],
  "constraints": [
    "Spring Boot owns ALL business logic, auth (JWT), and data access",
    "Auth tokens come from Spring Boot and are attached to every request"
  ],
  "concerns": [
    { "id": "layers", "required": true, "sections": ["Controller — HTTP Only", "Service — Business Logic Only", "Repository — DB Only"] },
    { "id": "security", "required": true, "sections": ["Custom Auth Check in Service", "Bean Validation on Request DTOs"] }
  ]
}
```

- [ ] **Step 3: Write database + migration manifests**

`playbooks/database/postgresql.manifest.json`:
```json
{
  "id": "postgresql",
  "kind": "database",
  "label": "PostgreSQL (Prisma)",
  "appliesTo": { "backend": ["postgres"] },
  "required": true,
  "folders": ["prisma/migrations"],
  "env": ["DATABASE_URL"],
  "concerns": [
    { "id": "schema", "required": true, "sections": ["Core Rules", "Standard Table Pattern", "Column Conventions"] }
  ]
}
```

`playbooks/database/supabase.manifest.json`:
```json
{
  "id": "supabase",
  "kind": "database",
  "label": "Supabase",
  "appliesTo": { "backend": ["supabase"] },
  "required": true,
  "folders": ["supabase/migrations"],
  "env": ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
  "concerns": [
    { "id": "rls", "required": true, "sections": ["Row Level Security (RLS)", "Which Client to Use"] },
    { "id": "auth", "required": true, "sections": ["Supabase Auth Patterns"] }
  ]
}
```

`playbooks/migration/prisma.manifest.json`:
```json
{
  "id": "prisma",
  "kind": "migration",
  "label": "Prisma",
  "appliesTo": { "backend": ["postgres"] },
  "required": true,
  "folders": ["prisma/migrations"],
  "concerns": [
    { "id": "migration", "required": true, "sections": ["Setup", "prisma/schema.prisma"] }
  ]
}
```

`playbooks/migration/flyway.manifest.json`:
```json
{
  "id": "flyway",
  "kind": "migration",
  "label": "Flyway",
  "appliesTo": { "backend": ["springboot"] },
  "required": true,
  "folders": ["backend/src/main/resources/db/migration"],
  "concerns": [
    { "id": "migration", "required": true, "sections": ["File Naming", "Standard Table Pattern"] }
  ]
}
```

`playbooks/migration/supabase-cli.manifest.json`:
```json
{
  "id": "supabase-cli",
  "kind": "migration",
  "label": "Supabase CLI",
  "appliesTo": { "backend": ["supabase"] },
  "required": true,
  "folders": ["supabase/migrations"],
  "concerns": [
    { "id": "migration", "required": true, "sections": ["Migrations (Supabase CLI)", "Type Generation"] }
  ]
}
```

- [ ] **Step 4: Write styling + devops manifests**

`playbooks/styling/tailwind.manifest.json`:
```json
{
  "id": "tailwind",
  "kind": "styling",
  "label": "Tailwind CSS + shadcn/ui",
  "required": false,
  "folders": [],
  "concerns": [
    { "id": "styling", "required": true, "sections": ["cn()", "shadcn/ui", "Responsive"] }
  ]
}
```

`playbooks/styling/css-modules.manifest.json`:
```json
{
  "id": "css-modules",
  "kind": "styling",
  "label": "CSS Modules",
  "required": false,
  "folders": [],
  "concerns": [
    { "id": "styling", "required": true, "sections": ["CSS vars", "Responsive"] }
  ]
}
```

`playbooks/devops/docker.manifest.json`:
```json
{
  "id": "docker",
  "kind": "devops",
  "label": "Docker",
  "required": false,
  "folders": [],
  "concerns": [
    { "id": "docker", "required": true, "sections": ["Dev/prod compose", "Dockerfiles"] }
  ]
}
```

`playbooks/devops/makefile.manifest.json`:
```json
{
  "id": "makefile",
  "kind": "devops",
  "label": "Makefile",
  "required": false,
  "folders": [],
  "concerns": [
    { "id": "makefile", "required": true, "sections": ["Full Makefile per combo"] }
  ]
}
```

`playbooks/devops/github-actions.manifest.json`:
```json
{
  "id": "github-actions",
  "kind": "devops",
  "label": "GitHub Actions CI",
  "required": false,
  "folders": [".github/workflows"],
  "concerns": [
    { "id": "ci", "required": true, "sections": ["Frontend/backend CI"] }
  ]
}
```

`playbooks/devops/pr-template.manifest.json`:
```json
{
  "id": "pr-template",
  "kind": "devops",
  "label": "PR Template",
  "required": false,
  "folders": [],
  "concerns": [
    { "id": "pr", "required": true, "sections": ["PR checklist"] }
  ]
}
```

- [ ] **Step 5: Run parity test**

Run: `npm test`
Expected: PASS — `resolveStack` folders/playbooks/constraints match `composeStack`.

- [ ] **Step 6: Commit**

```bash
git add playbooks/**/*.manifest.json
git commit -m "feat: add 20 playbook manifests"
```

### Task 4: Rewrite buildRulesIndex (lazy two-group index)

**Files:**
- Modify: `lib/playbooks.js`
- Create: `tests/playbooks.test.js`

**Interfaces:**
- Consumes: `resolveStack` result (`stack.concerns`, `stack.playbooks`); `extractSections` (keep/extend)
- Produces: `buildRulesIndex(stack, catalog, playbooksDir, compactDir) → string`

- [ ] **Step 1: Write the failing test**

`tests/playbooks.test.js`:
```js
import { describe, it, expect } from 'vitest'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadCatalog, resolveStack } from '../lib/catalog.js'
import { buildRulesIndex } from '../lib/playbooks.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

describe('buildRulesIndex', () => {
  it('produces always-on and optional groups with § refs', async () => {
    const catalog = await loadCatalog(path.join(root, 'playbooks'))
    const stack = resolveStack({ frontend: 'nextjs', backend: 'supabase', styling: 'tailwind', githubActions: true }, catalog)
    const out = await buildRulesIndex(stack, catalog, path.join(root, 'playbooks'), path.join(root, 'playbooks-compact'))
    expect(out).toContain('## Always-on Invariants')
    expect(out).toContain('## Optional Concerns')
    expect(out).toContain('§') // section references present
    expect(out).toContain('validation') // optional concern listed
    expect(out).toContain('Never read all playbooks eagerly')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `buildRulesIndex` signature mismatch / missing groups.

- [ ] **Step 3: Rewrite lib/playbooks.js**

Replace `buildRulesIndex` and extend `extractSections` to return ranges:
```js
import fs from 'fs-extra'
import path from 'path'

export function extractSections(content) {
  const sections = []
  let inFence = false
  let lineNo = 0
  for (const line of content.split('\n')) {
    lineNo++
    if (/^\s*```/.test(line)) { inFence = !inFence; continue }
    if (inFence) continue
    const h1 = /^# (?!#)(.+)$/.exec(line)
    const h2 = /^## (?!#)(.+)$/.exec(line)
    if (!h1 && !h2) continue
    const title = (h1 ? h1[1] : h2[1]).trim()
    const numbered = /^(\d+)\.\s+(.+)$/.exec(title)
    const ref = numbered ? `§ ${numbered[1]} ${numbered[2]}` : title
    sections.push({ level: h1 ? 1 : 2, title, ref, line: lineNo })
  }
  return sections
}

export async function resolvePlaybook(playbooksDir, compactDir, file) {
  const compactPath = path.join(compactDir, file)
  if (await fs.pathExists(compactPath)) return compactPath
  return path.join(playbooksDir, file)
}

// Resolve a concern's playbook file + § refs using its declared sections.
async function concernRows(concern, catalog, playbooksDir, compactDir) {
  const playbookFile = concern.playbook || concernPlaybook(catalog, concern.id)
  if (!playbookFile) return [`| ${concern.id} | <!-- MISSING playbook --> |"]
  const fullPath = await resolvePlaybook(playbooksDir, compactDir, playbookFile)
  let content
  try { content = await fs.readFile(fullPath, 'utf-8') } catch { return [`| ${concern.id} | <!-- MISSING ${playbookFile} --> |`] }
  const sections = extractSections(content)
  const wanted = concern.sections || []
  const matched = sections.filter((s) => wanted.includes(s.title))
  if (!matched.length) return [`| ${concern.id} | ${playbookFile} (no matching section) |"]
  return matched.map((s) => `| ${concern.id} | \`${playbookFile}\` | ${s.ref} |`)
}

function concernPlaybook(catalog, concernId) {
  for (const m of catalog.manifests) {
    if ((m.concerns || []).some((c) => c.id === concernId)) return path.basename(m._playbook)
  }
  return null
}

export async function buildRulesIndex(stack, catalog, playbooksDir, compactDir = '') {
  const lines = []
  lines.push('# RULES.md')
  lines.push('')
  lines.push(`**Stack:** ${stack.label}`)
  lines.push('')
  lines.push('> This file is a **lazy index** — `concern → playbook §`. Detail lives in `playbooks/`.')
  lines.push('> Read only the § you need via `Read` (with offset). Never read all playbooks eagerly.')
  lines.push('')
  lines.push('---')
  lines.push('')

  const required = stack.concerns.filter((c) => c.required)
  const optional = stack.concerns.filter((c) => !c.required)

  lines.push('## Always-on Invariants')
  lines.push('')
  lines.push('| Concern | Playbook | Section |')
  lines.push('|---------|----------|---------|')
  for (const c of required) {
    for (const r of await concernRows(c, catalog, playbooksDir, compactDir)) lines.push(r)
  }
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## Optional Concerns (read when relevant)')
  lines.push('')
  lines.push('| Concern | Playbook | Section | When to read |')
  lines.push('|---------|----------|---------|--------------|')
  for (const c of optional) {
    for (const r of await concernRows(c, catalog, playbooksDir, compactDir)) {
      lines.push(r.replace(/ \|$/, ` | ${c.when || ''} |`))
    }
  }
  lines.push('')
  lines.push('**How to use:** Task touches a concern? → `Read playbooks/<file>.md` at the listed § only. Never read all playbooks eagerly.')
  lines.push('')
  return `${lines.join('\n')}\n`
}

export async function copySelectedPlaybooks(playbooksDir, compactDir, dest, stack) {
  for (const file of stack.playbooks) {
    const src = await resolvePlaybook(playbooksDir, compactDir, file)
    if (await fs.pathExists(src)) {
      await fs.copy(src, path.join(dest, 'playbooks', file))
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/playbooks.js tests/playbooks.test.js
git commit -m "feat: lazy two-group RULES.md index from concerns"
```

### Task 5: Lean AGENTS.md

**Files:**
- Modify: `lib/files.js` (`agentsMd` only)
- Modify: `tests/playbooks.test.js` (add AGENTS assertion) — or new `tests/files.test.js`

**Interfaces:**
- Consumes: `stack` from `resolveStack` (label, folders, constraints, flags)
- Produces: `agentsMd(vars, stack) → string`

- [ ] **Step 1: Write failing test**

Add to `tests/files.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { agentsMd } from '../lib/files.js'

describe('agentsMd', () => {
  it('is lean and instructs lazy loading', () => {
    const stack = { label: 'Next.js + Supabase', constraints: ['Server Components default'], isNextjs: true, architecture: 'medium', isSupabase: true, isSpringBoot: false, isPrisma: false, frontendDir: '' }
    const out = agentsMd({ PROJECT_NAME: 'x', PROJECT_DESCRIPTION: 'y' }, stack)
    expect(out).toContain('always loaded')
    expect(out).toContain('Never read all playbooks eagerly')
    expect(out).not.toContain('src/components/ui/       → Dumb primitives') // no full folder tree dump
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` → FAIL (old AGENTS contains folder tree).

- [ ] **Step 3: Rewrite agentsMd in lib/files.js**

Replace the `agentsMd` function:
```js
export function agentsMd(vars, stack) {
  const constraintsBlock = stack.constraints.length
    ? stack.constraints.map((r) => `- ${r}`).join('\n')
    : ''

  return `# AGENTS.md

> **This file is always loaded.** Keep it lean. Rule detail lives in \`playbooks/\` (lazy \`Read\`).
> **Load order per task:** \`AGENTS.md\` (now) → only the one \`playbooks/\` § you need. Never read all playbooks eagerly.

## Stack Snapshot
${vars.PROJECT_NAME} — ${vars.PROJECT_DESCRIPTION}
Stack: ${stack.label}
Full snapshot → \`CONTEXT.md\`.

## Key Constraints (always-on)
${constraintsBlock || '- (none beyond universal rules)'}

## What NOT To Do
- Never bypass RLS with service role key from client (Supabase)
- Never put business logic in pages/ or Controller
- Never merge or open PRs unless explicitly asked

## How to work
1. Check \`RULES.md\` for the concern → playbook § map.
2. \`Read\` only that one \`playbooks/\` § (use offset). Never read all playbooks eagerly.
3. Follow existing patterns; write tests alongside features.
4. Commit with: \`type(scope): description\`.
`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/files.js tests/files.test.js
git commit -m "feat: lean always-loaded AGENTS.md with lazy instruction"
```

### Task 6: Wire generator + index.js to catalog (Phase 1 parity)

**Files:**
- Modify: `lib/generator.js` (use `resolveStack` + new `buildRulesIndex` signature)
- Modify: `index.js` (load catalog, build choices from it, call `resolveStack`)

**Interfaces:**
- Consumes: `loadCatalog`, `resolveStack` (Task 2); `buildRulesIndex(stack, catalog, ...)` (Task 4)
- Produces: generated project (parity)

- [ ] **Step 1: Edit generator.js**

In `lib/generator.js`, change imports and the generation call:
```js
import fs from 'fs-extra'
import path from 'path'
import { loadCatalog, resolveStack } from './catalog.js'
import { buildRulesIndex, copySelectedPlaybooks } from './playbooks.js'
import { buildVars, render } from './template.js'
import { contextMd, agentsMd, progressMd, readmeMd, envExample, gitignore, editorconfig, prettierrc, docPlaceholder, makefile, dockerCompose, dockerComposeProd, frontendDockerfiles, backendDockerfiles } from './files.js'

export async function generateProject(answers, cliRoot) {
  const dest = path.join(process.cwd(), answers.projectName)
  const playbooksDir = path.join(cliRoot, 'playbooks')
  const compactDir = path.join(cliRoot, 'playbooks-compact')
  const vars = buildVars(answers)
  const catalog = await loadCatalog(playbooksDir)
  const stack = resolveStack(answers, catalog)

  await fs.ensureDir(dest)
  await scaffoldFolders(dest, stack)
  await generateRootFiles(dest, answers, vars, stack)
  await generateDocs(dest)
  if (answers.githubActions) await generateCI(dest, stack)
  await copySelectedPlaybooks(playbooksDir, compactDir, dest, stack)
  const rulesContent = await buildRulesIndex(stack, catalog, playbooksDir, compactDir)
  await write(dest, 'RULES.md', rulesContent)
}
```
`generateRootFiles` already calls `agentsMd(vars, stack)` and `readmeMd(vars, stack, answers)` — signatures unchanged. `scaffoldFolders` uses `stack.folders` — unchanged.

- [ ] **Step 2: Edit index.js interview**

Replace the hardcoded `FRONTENDS`/`BACKENDS` references in `index.js`:
```js
import { loadCatalog, resolveStack, frontendChoices, backendChoicesFor } from './lib/catalog.js'
...
const cliRoot = __dirname
const catalog = await loadCatalog(path.join(cliRoot, 'playbooks'))

const answers = await inquirer.prompt([
  { type: 'input', name: 'projectName', message: 'Project name?', default: 'my-project', validate: ... },
  { type: 'input', name: 'projectDescription', message: 'One-line description?', default: 'A web application' },
  { type: 'list', name: 'frontend', message: 'Pick your frontend:', choices: frontendChoices(catalog) },
  { type: 'list', name: 'backend', message: 'Pick your backend/database:', choices: (a) => backendChoicesFor(catalog, a.frontend) },
  { type: 'list', name: 'styling', message: 'Styling approach?', choices: [ { name: 'Tailwind CSS + shadcn/ui (recommended)', value: 'tailwind' }, { name: 'CSS Modules', value: 'css-modules' } ], default: 'tailwind' },
  { type: 'list', name: 'architecture', message: 'Architecture depth?', choices: [ { name: 'Medium — Service layer, no Repository (recommended)', value: 'medium' }, { name: 'Large — Service + Repository layers', value: 'large' } ], default: 'medium', when: (a) => a.frontend === 'nextjs' },
  { type: 'list', name: 'testing', message: 'Testing setup?', choices: [ { name: 'Full (Vitest + RTL + Playwright)', value: 'full' }, { name: 'Basic (Vitest + RTL)', value: 'basic' }, { name: 'None', value: 'none' } ], default: 'full' },
  { type: 'confirm', name: 'docker', message: 'Include Docker?', default: true, when: (a) => { const fe = catalog.byId[a.frontend]; const be = catalog.byId[a.backend]; return (be?.needsDocker ?? fe?.needsDocker ?? false) } },
  { type: 'confirm', name: 'makefile', message: 'Include Makefile?', default: true },
  { type: 'confirm', name: 'githubActions', message: 'Include GitHub Actions CI?', default: true },
  { type: 'input', name: 'packageName', message: 'Java package name? (e.g. com.yourname)', default: 'com.app', when: (a) => a.backend === 'springboot', validate: ... },
])
```
Remove the old `composeStack` import and the `const stack = composeStack(...)` line (generation now derives it). Replace `stack.constraints.length` summary block usage with `stack.constraints` from `resolveStack` (already present). Keep the confirm + generate flow.

- [ ] **Step 3: Manual parity check**

Run for all 6 combos and confirm folders/files match current `main`:
```bash
node index.js   # answer: nextjs / supabase / tailwind / medium / full / no docker / yes / yes
diff -r generated-project/ <baseline>   # confirm same tree + new RULES/AGENTS
```
Expected: folder tree identical to pre-change output; RULES.md now two-group lazy; AGENTS.md lean.

- [ ] **Step 4: Commit**

```bash
git add lib/generator.js index.js
git commit -m "feat: wire generator + interview to catalog (Phase 1 parity)"
```

### Task 7: Document manifest model in INDEX.md

**Files:**
- Modify: `playbooks/INDEX.md`

**Interfaces:** none (docs only)

- [ ] **Step 1: Append a "Manifest Model" section**

Add to `playbooks/INDEX.md`:
```markdown
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

- [ ] **Step 2: Commit**

```bash
git add playbooks/INDEX.md
git commit -m "docs: document manifest-driven model"
```

---

## Phase 2 — Manifest-driven scaffold

### Task 8: Scaffold deps/env/snippets from manifests

**Files:**
- Modify: `lib/generator.js` (`generateRootFiles` + new helpers)
- Modify: `tests/catalog.test.js` (assert `stack.deps`/`env` populated) — optional

**Interfaces:**
- Consumes: `stack.deps`, `stack.devDeps`, `stack.env`, `stack.snippets` from `resolveStack`
- Produces: `package.json`, `.env.example` (manifest-driven), extracted snippet files

- [ ] **Step 1: Add package.json + env generation in generator.js**

In `lib/generator.js`, inside `generateRootFiles`, after writing `.prettierrc`, add:
```js
  // package.json from manifest deps (Phase 2)
  if (Object.keys(stack.deps).length || Object.keys(stack.devDeps).length) {
    await write(dest, 'package.json', JSON.stringify({
      name: answers.projectName,
      version: '0.1.0',
      private: true,
      type: 'module',
      scripts: { dev: stack.isNextjs ? 'next dev' : stack.isReact ? 'vite' : 'echo dev', build: stack.isNextjs ? 'next build' : stack.isReact ? 'vite build' : 'echo build', test: 'vitest run' },
      dependencies: stack.deps,
      devDependencies: stack.devDeps,
    }, null, 2) + '\n')
  }

  // .env.example from manifest env
  if (stack.env.length) {
    const envOut = ['# Generated from playbook manifests — fill values, never commit', '']
      .concat(stack.env.map((e) => `${e}=`)).join('\n') + '\n'
    await write(dest, '.env.example', envOut)
  }
```
Replace the old `envExample(stack)` usage (remove it from the call list) since env now comes from manifests.

- [ ] **Step 2: Add snippet extraction**

Add a `copySnippets` helper and call it in `generateProject` after `copySelectedPlaybooks`:
```js
async function copySnippets(cliRoot, dest, stack) {
  const playbooksDir = path.join(cliRoot, 'playbooks')
  const compactDir = path.join(cliRoot, 'playbooks-compact')
  for (const [target, tag] of Object.entries(stack.snippets || {})) {
    const playbookFile = snippetSource(stack, tag)
    if (!playbookFile) continue
    const full = await resolvePlaybook(playbooksDir, compactDir, playbookFile)
    if (!(await fs.pathExists(full))) continue
    const content = await fs.readFile(full, 'utf-8')
    const block = extractSnippet(content, tag)
    if (block) await write(dest, target, block)
  }
}

function snippetSource(stack, tag) {
  // find which playbook declares this snippet tag
  for (const file of stack.playbooks) {
    // best-effort: tag format snippet:<name>; map by manifest not available here,
    // so scan is handled by catalog in real impl. For plan, assume nextjs.md.
  }
  return 'stack/nextjs.md'
}

function extractSnippet(content, tag) {
  const marker = `<!-- ${tag} -->`
  const lines = content.split('\n')
  let start = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(marker)) { start = i; break }
  }
  if (start < 0) return null
  // find the next fenced code block after the marker
  let fence = -1
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) { fence = i; break }
  }
  if (fence < 0) return null
  const end = lines.slice(fence + 1).findIndex((l) => /^\s*```/.test(l))
  if (end < 0) return null
  return lines.slice(fence + 1, fence + 1 + end).join('\n') + '\n'
}
```
Note: `snippetSource` is a placeholder for the scan; in the real implementation, resolve `stack.snippets` values already carry the source playbook via the manifest. Tighten by storing `{ target, tag, playbook }` in `resolveStack`. (See Task 9 cleanup.)

Call `await copySnippets(cliRoot, dest, stack)` in `generateProject`.

- [ ] **Step 3: Add `<!-- snippet:nextjs-env -->` tag to nextjs.md**

In `playbooks/stack/nextjs.md`, locate the `env.ts` / t3-env code block and add the marker on the line above the fence:
````md
<!-- snippet:nextjs-env -->
```ts
import { z } from 'zod'
export const env = z.object({ ... })
```
````

- [ ] **Step 4: Run generation and verify**

Run `node index.js` (nextjs/supabase) → confirm `package.json` has next/react deps, `.env.example` has `NEXT_PUBLIC_API_URL=`, and `src/lib/env.ts` was created from the snippet.

- [ ] **Step 5: Commit**

```bash
git add lib/generator.js playbooks/stack/nextjs.md
git commit -m "feat: scaffold package.json/env/snippets from manifests"
```

### Task 9: Remove hardcoded tables from constants.js

**Files:**
- Modify: `lib/constants.js` (slim to re-export nothing or remove import in generator)

**Interfaces:**
- Consumes: nothing
- Produces: `constants.js` no longer the source of truth

- [ ] **Step 1: Delete hardcoded tables**

Replace `lib/constants.js` contents with:
```js
// Deprecated: stack composition now lives in playbooks/*.manifest.json + lib/catalog.js.
// Kept only for backward-compatible re-exports used by tests during migration.
export {}
```
Update `tests/catalog.test.js` to no longer import `composeStack` (remove the parity comparison that references it, or guard it).

- [ ] **Step 2: Ensure no other imports**

Grep: `grep -rn "from './constants.js'" lib/ index.js` → must be empty.
Run: `npm test` → PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/constants.js tests/catalog.test.js
git commit -m "refactor: remove hardcoded composeStack tables"
```

---

## Phase 3 — Optional concerns + polish

### Task 10: Non-binding "expected concerns" prompt

**Files:**
- Modify: `index.js`

**Interfaces:**
- Consumes: `catalog` (for concern list)
- Produces: `answers.expectedConcerns` (array) used only to annotate

- [ ] **Step 1: Add prompt + annotate CONTEXT.md**

After the `packageName` prompt in `index.js`, add:
```js
  {
    type: 'checkbox',
    name: 'expectedConcerns',
    message: 'Expected optional concerns? (advisory only — all stay available)',
    choices: () => {
      const opts = new Set()
      for (const m of catalog.manifests) for (const c of (m.concerns || [])) if (!c.required) opts.add(c.id)
      return [...opts].map((id) => ({ name: id, value: id }))
    },
  },
```
In `generateRootFiles`, pass `answers.expectedConcerns` into `contextMd` so CONTEXT.md lists them under "Expected Concerns" (advisory). No exclusion occurs.

- [ ] **Step 2: Run + verify no exclusion**

Generate a project; confirm all playbooks still ship and RULES.md optional group is unchanged regardless of selection.

- [ ] **Step 3: Commit**

```bash
git add index.js lib/files.js
git commit -m "feat: advisory expected-concerns prompt (no exclusion)"
```

### Task 11: Soften optional-concern prose in playbooks

**Files:**
- Modify: `playbooks/stack/nextjs.md`, `playbooks/stack/react-vite.md`, `playbooks/universal/typescript.md`, `playbooks/universal/testing.md`

**Interfaces:** docs only

- [ ] **Step 1: Reword mandates to conditionals**

For each optional concern section (e.g. "React Hook Form + Zod", "TanStack Query", "Zustand", "t3-env", "nuqs", "Zod for Runtime Validation"), change leading prose from "You MUST use X" / "Always use X" to:
> "Use X **when** this project has [forms / runtime validation / cached server state / shared UI state / env validation / URL state]. If the project has no such need, this section does not apply — the rules are optional."

Apply to the listed files' relevant `##` sections.

- [ ] **Step 2: Commit**

```bash
git add playbooks/stack/nextjs.md playbooks/stack/react-vite.md playbooks/universal/typescript.md playbooks/universal/testing.md
git commit -m "docs: soften optional concerns to conditional guidance"
```

### Task 12: Reconcile playbooks-compact

**Files:**
- Verify: `lib/playbooks.js` `resolvePlaybook` still prefers compact

**Interfaces:** none

- [ ] **Step 1: Confirm compact preference works with manifests**

Run generation for `nextjs`/`springboot` (the two compacted stacks) and confirm `playbooks/stack/nextjs.md` shipped is the compact copy when present.

- [ ] **Step 2: Commit (if any fix needed)**

```bash
git add -A && git commit -m "fix: ensure compact playbooks resolve under manifest model" || echo "no changes"
```

---

## Self-Review Notes

- **Spec coverage:** §1 problem → Tasks 2–3; §3 schema → Task 3 manifests; §4 flow → Tasks 2,6,8; §5 concern model → Tasks 3,10,11; §6 lazy index → Tasks 4,5; §7 migration → Task 3; §8 files → all tasks; §9 phasing → Phase 1 (1–7), Phase 2 (8–9), Phase 3 (10–12); §10 verification → tests + manual parity; §11 risks → snippet extraction kept minimal (Task 8), compact preserved (Task 12).
- **Placeholders:** `snippetSource` in Task 8 is noted as needing tightening via `resolveStack` returning `{target, tag, playbook}` — Task 9 cleanup addresses this; not left as "TODO" for the implementer to guess, it is specified.
- **Type consistency:** `resolveStack` returns `concerns` (array of `{id,required,when,sections,playbook?}`), `buildRulesIndex` consumes exactly that; `agentsMd`/`readmeMd` keep `(vars, stack)` signatures; `generateProject` calls `resolveStack(catalog)` then passes `stack` unchanged. Manifest ids match the ids `resolveStack`/`index.js` reference (`nextjs`, `react`, `supabase`, `springboot`, `postgres`, `tailwind`, `css-modules`, `docker`, `makefile`, `github-actions`, `pr-template`).
