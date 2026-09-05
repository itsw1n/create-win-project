# How It Works — Mental Model

One page to hold the whole generator in your head: what runs when, what file owns it, and where to look when something breaks. This is pure logic — how a project gets built. For *how to add a stack*, see `docs/CONTRIBUTING.md` (plan -> declare -> build).

## What it does in one paragraph

`npx create-win-project` turns your answers (`frontend, backend, architecture, authentication, testing, docker`) into two coordinated outputs: **1)** a small runnable app that establishes the stack's real conventions, **2)** a task-routed docs layer (`AGENTS.md` tiny always-on + `RULES.md` router + `playbooks/`). Executable behavior and tests are the source of truth — playbooks explain, not contradict.

## The 7-step flow (file to open when it breaks)

```
1. CLI asks  →  2. Validate  →  3. Catalog  →  4. Resolve  →  5. Render+Write  →  6. Compose  →  7. Verify
```

| Step | What happens | Owner | File to open |
|------|--------------|-------|--------------|
| **1. CLI asks** | Parses ` --frontend=nextjs --backend=supabase --architecture=medium` or runs interactive interview with Back | `src/cli` | `src/cli/main.js` orchestrates; `src/cli/arguments.js` flags; `src/cli/questions.js` interview; `src/cli/navigation.js` Back; `src/cli/display.js` banner/summary; `src/cli/system-check.js` Node/PHP check |
| **2. Validate** | Same answers validated twice — CLI and engine's `generateProject()` so you can't bypass `projectName`/`packageName` by skipping CLI | `src/engine` | `src/engine/create-project.js:90` `validateAnswers()` |
| **3. Catalog** | Walk `library/**/definition.json` (28 manifests) + load `library/tested-versions.json` current/previous | `src/engine` | `src/engine/load-library.js:loadCatalog()` + `src/engine/tested-versions.js:loadCompatibility()` |
| **4. Resolve** | Merge `universal+platform+frontend+backend+database+styling+devops` manifests into one resolved `stack` descriptor (`stack.deps` exact versions, `stack.env` with `NEXT_PUBLIC_` prefix) | `src/engine` | `src/engine/load-library.js:145` `resolveStack()` |
| **5. Render+Write** | Stage to `.my-app.tmp-xxx/`, render `{{PROJECT_NAME}}`, write atomically, install deps | `src/engine` | `src/engine/create-project.js:57` `generateProject()` steps 1-8; `src/engine/write-files.js`; `src/engine/render-templates.js:buildVars()` |
| **6. Compose** | Runnable app files from `src/stacks/*/create-files.js` via `src/stacks/shared/scaffold.js`; docs `playbooks/`+`RULES.md` via `src/engine/project-guidance.js` | `src/stacks` + `src/engine` | `src/stacks/shared/scaffold.js:238` dispatcher; `src/engine/project-guidance.js` |
| **7. Verify** | Unit + contract + matrix (every stack x arch x auth x profile) | `tests/`+`checks/` | `tests/engine/generator.test.js`; `checks/check-compatibility.js:9` `cases[]` |

## Where things live

- `library/**/definition.json` — declares *what* a stack supports: `id,kind,label,appliesTo,architectureProfiles,playbooks,deps,env,clientEnv,concerns` — names only, never versions.
- `library/tested-versions.json` — *only* version source: exact `packages` + `runtimes` for `current`/`previous`. `src/engine/tested-versions.js:packageVersion()` injects exact.
- `src/stacks/<frontends|backends>/<id>/create-files.js` — owns *how* files are generated (pure `FileMap`). `auth/`+`ui/` for Laravel.
- `templates/` — static Mustache (`Dockerfile`, `ci/*.yml`, `gitignore`, `makefile`, `compose`).
- `checks/` — gate: `check-library.js` (definition headings), `check-compatibility.js` (matrix).

See `docs/CONTENT_MODEL.md` for doc ownership, `docs/DEPENDENCY_MAINTENANCE.md` for profile promotion, `docs/CI_STRATEGY.md` for branch gates.

## Real example — `nextjs + supabase` `medium` `supabase` auth (verbatim from repo)

**Answers JSON** (validated at `src/engine/create-project.js:90`):
```json
{ "projectName": "my-app", "projectDescription": "A new application", "frontend": "nextjs", "backend": "supabase", "architecture": "medium", "authentication": "yes", "authAudience": "website", "testing": "basic", "styling": "tailwind", "docker": false }
```

**Catalog excerpt `library/stacks/nextjs/definition.json:1-12`:**
```json
{ "id": "nextjs", "kind": "frontend", "label": "Next.js", "appliesTo": { "backend": ["none","supabase","springboot","postgres","laravel"] }, "architectureProfiles": ["small","medium","large"] }
```
`library/stacks/supabase/definition.json` declares `deps: ["@supabase/supabase-js","@supabase/ssr"]`, `env: ["SUPABASE_URL","SUPABASE_PUBLISHABLE_KEY"]`, `clientEnv: ["SUPABASE_URL","SUPABASE_PUBLISHABLE_KEY"]` — names only.

**Resolve excerpt `src/stacks/frontends/nextjs/index.js:11-30` (real adapter):**
```js
import { defineStackAdapter } from '../../rules.js'
export const nextjsAdapter = defineStackAdapter({
  id:'nextjs', kind:'frontend', label:'Next.js',
  compatibleWith:{backend:['none','postgres','supabase','springboot','laravel']},
  capabilities:{applicationShapes:['fullstack','separate'], architectureProfiles:['small','medium','large'], authenticationModels:['public','undecided','supabase','session','oidc','sanctum-spa','laravel-oidc']},
  contributes:{ environment:({backend})=>backend.id==='none'?[]:['API_URL'], install:()=>[ {cwd:'.',command:'npm',args:['install']}], docker:()=>[ {template:'nextjs'}], ci:()=>[ {template:'nextjs'}] }
})
```
`src/engine/load-library.js:185` auth mapping:
```js
if (authenticationIntent==='yes' && be.id==='supabase') authentication='supabase'
```
Env prefix applied once:
```js
const envPrefix = fe.envPrefix // 'NEXT_PUBLIC_'
const env = [...new Set(rawEnv)].map(v=> clientEnv.has(v) ? `${envPrefix}${v}` : v) // `SUPABASE_URL` -> `NEXT_PUBLIC_SUPABASE_URL`
```
Resolved `stack` excerpt:
```js
{ key:'nextjs-supabase', frontendLabel:'Next.js', backendLabel:'Supabase', architecture:'medium', authentication:'supabase', deps:{next:'14.2.x', ...exact}, env:['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] }
```

**Render+Write `src/engine/create-project.js:57` (real 8 steps):**
```js
await writeProjectAtomically({ finalDestination, stagingDestination, generate: async (dest)=>{
  await generateRootFiles(dest, answers, vars, stack, templatesDir) // CONTEXT.md, AGENTS.md, .gitignore, .prettierrc
  await generateRunnableFiles(dest, answers, stack, vars) // see below
  await generateDocs(dest, answers, stack)
  if (githubActions) await generateCI(dest, stack, ciDir, answers, vars)
  await copySelectedPlaybooks(playbooksDir, dest, stack)
  await write(dest,'RULES.md', await buildRulesIndex(stack, catalog, playbooksDir))
}})
```

**Compose `src/stacks/shared/scaffold.js:240` dispatcher (real) + per-stack files:**
```js
// src/stacks/frontends/nextjs/generate.js: real buildNextjsFiles
export function buildNextjsFiles(answers, stack, shared){ return { 'package.json': shared.packageFile(stack), 'src/app/page.tsx': '...', ... } }
// src/stacks/backends/supabase/generate.js: real buildSupabaseProjectFiles excerpt
// files merged: { ...buildNextjsFiles(...), ...buildSupabaseProjectFiles(stack), ...envFiles(answers,stack) }
```
Real generated file sample for this case (from `tests/engine/generator.test.js` contract): `src/app/page.tsx`, `src/lib/supabase/client.ts` (publishable key), `src/lib/supabase/server.ts` (cookie-aware), `src/proxy.ts` (`getClaims()` + cookie sync), `src/app/auth/callback/route.ts` (PKCE), `.env.example` (`NEXT_PUBLIC_SUPABASE_URL=`), `.github/workflows/ci-frontend.yml` (`nextjs.yml` with supabase env).

**Second short trace — `laravel + inertia-react` `large` `sanctum-spa`:** `src/stacks/backends/laravel/index.js:3` `laravelAdapter` + `src/stacks/backends/laravel/generate.js:363L` + `ui/inertia-react.js` `inertiaReactUi.files()` — shows `auth/`+`ui/` vertical.

**Verify:** `checks/check-compatibility.js:9` `cases[]` includes `nextjs-supabase`, `smokeSelections[]` includes `['nextjs-supabase','medium','yes','website']`; `tests/engine/generator.test.js:35` contract checks files/env/RULES/auth.

## Debugging map

- Wrong questions? `src/cli/questions.js:44` `buildQuestions()`
- Wrong version? `src/engine/tested-versions.js:104` `packageVersion()` — check `library/tested-versions.json` current profile
- Env missing prefix? `src/engine/load-library.js:284` `envPrefix` logic
- Wrong files? `src/stacks/*/create-files.js` + `src/stacks/shared/scaffold.js:238`
- Docker/CI wrong? `templates/docker/*` + `src/engine/create-project.js:342` `generateCI()`
- Matrix not covering case? `checks/check-compatibility.js:9` `cases[]`

## One sentence to remember

**CLI asks -> engine validates+composes -> stacks own files -> templates render -> checks verify -> generated project owns its upgrade.** Every fact has one owner; `src/` is canonical, `library/` is declarative, `templates/` is static, `checks/` is the gate. For adding a stack, see `docs/CONTRIBUTING.md` Steps 0-2.
