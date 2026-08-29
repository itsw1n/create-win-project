# Manifest-Driven, Playbook-Indexed Generator

**Date:** 2026-08-29
**Status:** Design (approved in principle, pending spec review)
**Project:** `create-win-project` (CLI scaffolder)

---

## 1. Problem

Today the CLI works as **"copy-assets + hardcoded logic"**:

- `index.js` collects answers → `lib/constants.js` (hardcoded tables) decides **which playbook files to copy** and **what folders/constraints to generate** → `lib/files.js` (hardcoded string templates) emits AGENTS.md/RULES.md/Makefile → `lib/playbooks.js` reads only playbook **headings** (post-hoc) to build RULES.md, then `fs.copy`s the files verbatim.

Consequences:

1. **Two divergent sources of truth.** The same rule ("use Zod", "TanStack Query", the folder tree) exists once as JS data (drives generation) and again as markdown prose (the playbook). They drift; changing a rule means editing both.
2. **Playbooks are non-executable.** They hold canonical knowledge but the generator can only *copy* them, never *use* them. `files.js`'s AGENTS.md folder map is a hand-maintained duplicate of `folder-structure.md`.
3. **File-level, not concern-level, selection.** `composeStack` picks whole files (`stack/nextjs.md` = Zod + RHF + TanStack + Zustand + t3-env + nuqs bundled). You cannot include "just the server/client rules" without also shipping the Zod mandate — the structural root of "not all projects need Zod" being over-prescribed.
4. **Adding a playbook = editing JS.** New stack/concern requires touching `constants.js`/`files.js`.

### Goals
- Playbooks become the **single source of truth** that *drives* generation.
- Optional concerns (validation/Zod, query lib, state mgmt, env, URL-state, forms) are **never mandated**; they ship lazily and are read on demand.
- Adopt the `carwebsite` pattern: a lean, always-loaded `AGENTS.md` + a `RULES.md` **lazy index** (`concern → playbook § + when-to-read`).

---

## 2. Target Architecture (B + per-playbook manifests)

Each playbook gets a co-located `*.manifest.json`. The CLI **reads manifests** to decide what to ship **and** to drive scaffolding.

```
playbooks/
  stack/nextjs.md                 ← prose rules (human + agent readable, lazy-indexed)
  stack/nextjs.manifest.json      ← machine-readable: appliesTo, concerns, folders, deps, env, snippets
  stack/nextjs.compact.md         ← (optional) token-trimmed copy; resolvePlaybook still prefers it
```

`lib/catalog.js` loads all `*.manifest.json` once → `resolveStack(answers, catalog)` picks manifests by `kind` + `appliesTo`, replacing `composeStack`'s hardcoded tables. `generator.js` scaffolds **from the manifests** and copies the `.md` as lazy-indexed guidance.

### Your example, concretely
"Choose Next.js → read its playbook → create folders from its structure" becomes: `nextjs.manifest.json` declares `"folders": ["src/app","src/features",…]`; the CLI reads that — not the hardcoded `FRONTENDS.nextjs.folders`. One source, no drift.

---

## 3. Manifest Schema

```json
{
  "id": "nextjs",
  "kind": "frontend",            // frontend | backend | database | migration | styling | devops | universal
  "label": "Next.js",
  "appliesTo": { "backend": ["supabase", "springboot", "postgres"] },
  "port": 3000,
  "needsDocker": false,
  "required": true,              // included for every matching stack
  "concerns": [                  // optional vs required fixes over-prescription
    { "id": "server-client", "required": true },
    { "id": "validation",  "required": false, "when": "Project has forms / runtime input" },
    { "id": "query",       "required": false, "when": "Client needs cached server state" },
    { "id": "state",       "required": false, "when": "Shared non-server UI state" },
    { "id": "env",         "required": false, "when": "Validating env vars" },
    { "id": "url-state",   "required": false, "when": "Filter/search state belongs in URL" }
  ],
  "folders": ["src/app", "src/features", "src/components/ui", "src/lib", "src/types", "src/schemas", "src/constants", "e2e", "public"],
  "deps":     { "next": "^15", "react": "^18", "react-dom": "^18" },
  "devDeps":  { "typescript": "^5", "@types/react": "^18" },
  "env":      ["NEXT_PUBLIC_API_URL"],
  "snippets": { "src/lib/env.ts": "snippet:nextjs-env" }   // tagged block inside nextjs.md
}
```

Notes:
- `sections` for the RULES index are **auto-extracted** from the `.md` headings (reuse `extractSections`), so they never duplicate.
- `appliesTo` may be omitted for `universal` (applies to all). Frontends declare which backends they `allow` via `appliesTo.backend`; backends may declare `appliesTo.frontend`.
- `required: true` means the playbook is always selected for matching stacks (e.g. `universal/*`, the chosen `stack/*`). Per-concern `required:false` means the *concern* is optional even when the playbook ships.
- `snippets` maps a target project path → a unique `snippet:<name>` tag placed on a fenced code block in the `.md`.

---

## 4. New Generation Flow

1. `catalog.js` loads all `*.manifest.json` into a `CATALOG`.
2. `index.js` keeps current prompts; calls `resolveStack(answers, catalog)` instead of `composeStack`.
3. For each selected playbook manifest:
   - create `folders` (preserving `{{PACKAGE_PATH}}` substitution for Spring Boot),
   - merge `deps`/`devDeps` into a generated `package.json`,
   - merge `env` into `.env.example`,
   - extract `snippets` into their target files (only when the concern is selected/active).
4. Copy the `.md` playbooks into the project `/playbooks/` (keep `resolvePlaybook` compact preference).
5. Build **RULES.md** (lazy index from selected manifests' concerns + auto headings).
6. Build **AGENTS.md** (lean, always-loaded — see §6).
7. Makefile / CI generated from manifest fields (port / needsDocker / kind) via existing templates, parameterized.
8. `README.md`, `.editorconfig`, `.prettierrc`, docs placeholders, PR template — unchanged in spirit, parameterized where needed.

### `resolveStack(answers, catalog)` contract
Returns the same shape `generator.js` consumes today (`label`, `folders`, `constraints`, `isNextjs`, `needsDocker`, `playbooks`, etc.) but derived from manifests:
- start from `universal` manifests (`required: true`),
- add the chosen `frontend` + `backend` manifests,
- add `database`/`migration` manifests implied by the backend,
- add `styling`/`devops` manifests per answers,
- fold each manifest's `folders`/`deps`/`env`/`snippets`/`concerns` into the stack descriptor,
- derive `constraints` from a `constraints` array on relevant manifests (replacing the `CONSTRAINTS` table in `constants.js`).

---

## 5. Concern / Optional Model (fixes over-prescription)

- Zod / forms / query / state / env / url-state are **optional concerns** in the relevant manifests — never mandated.
- They ship as lazy playbook sections and appear in RULES.md's **optional** group; an agent (or the user, later) reads that § only when the feature needs it.
- Because needs **evolve** after creation, there is **no hard upfront toggle that excludes** a concern. Instead, an optional, **non-binding** "expected concerns?" multi-select only *annotates* CONTEXT.md / RULES.md ordering — it never removes a concern from the shipped playbooks. This honors the "I don't know upfront if I'll need Zod" reality.

---

## 6. Lazy Index (carwebsite pattern)

**AGENTS.md** (always loaded, lean):
- Stack snapshot.
- **Required** invariants only (core naming, folder structure, server/client boundary, RLS, error handling).
- Explicit instruction: *"AGENTS.md is always loaded. Read only the one `playbooks/` § you need — never read all playbooks eagerly."*
- Pointers to RULES.md + `/playbooks/` for detail.

**RULES.md** (lazy index):
- Two tables:
  - **Always-on invariants** → `playbook file + § range`.
  - **Optional concerns (read when relevant)** → `playbook file + § range + when-to-read`.
- Footer: *"Task touches X? → `Read playbooks/<file>.md` at the listed § only. Never read all playbooks eagerly."*

§ ranges are computed by grouping consecutive sections per concern (extend `extractSections` to carry line numbers / ranges).

---

## 7. Migration of Existing Playbooks

20 playbooks today: `universal`×6, `stack`×3, `database`×2, `migration`×3, `styling`×2, `devops`×4.

For each, author a co-located `.manifest.json`:
- Derive `folders` from current `constants.js` (`FRONTENDS`/`BACKENDS` folder arrays).
- Derive `appliesTo`/`port`/`needsDocker`/`allows` from `constants.js`.
- Author `deps`/`devDeps`/`env` (new, sensible defaults per stack).
- Define `concerns` (server-client/architecture required; validation/query/state/env/url-state optional where applicable).
- Add `<!-- snippet:… -->` tags to a few high-value code blocks (start with `env.ts`).
- Soften optional-concern prose in the `.md` from "you MUST use X" → "use X when…; if the project has no forms/runtime boundaries, this section does not apply."
- Keep `playbooks-compact/` mechanism: the manifest's `file` reference still resolves via `resolvePlaybook` (prefer compact when present).

Update `playbooks/INDEX.md` to document the manifest model and the lazy-load contract.

---

## 8. Files to Change

| File | Change |
|------|--------|
| `lib/catalog.js` | **NEW** — load all `*.manifest.json`, expose `loadCatalog()`, `resolveStack()` |
| `playbooks/**/*.manifest.json` | **NEW** — one per playbook (20 files) |
| `lib/constants.js` | **REWRITE/SLIM** — remove hardcoded folder/playbook/`CONSTRAINTS` tables; keep only minimal stack-pairing metadata if not fully moved into manifests |
| `lib/generator.js` | **REWRITE** — manifest-driven scaffold (folders/deps/env/snippets) + lazy index build |
| `lib/playbooks.js` | **REWRITE** — `buildRulesIndex` produces two-group lazy index from concerns + headings; `extractSections` returns ranges |
| `lib/files.js` | **REWRITE** — lean `agentsMd`; Makefile/CI/README parameterized by manifest fields; drop duplicated folder map |
| `index.js` | **EDIT** — use `resolveStack`; add optional non-binding concern prompt |
| `playbooks/*.md` | **EDIT** — add snippet tags; soften optional-concern prose |
| `playbooks/INDEX.md` | **EDIT** — document manifest model + lazy contract |

---

## 9. Phasing (risk-reduced)

- **Phase 1 — Parity + lazy index.** `catalog.js` + all manifests + `resolveStack` + lazy AGENTS.md/RULES.md. Generated projects scaffold the **same** folders/files as today, plus the new index. No behavior regression. (Validates the catalog/read path before changing scaffold sources.)
- **Phase 2 — Manifest-driven scaffold.** folders/deps/env/snippets actually come from manifests; delete hardcoded `folders`/`deps` from `constants.js`/`files.js`. Kills the last duplication. Makefile/CI stay as **parameterized templates** (decision: templates, not manifests).
- **Phase 3 — Optional concerns + polish.** Non-binding concern prompt; soften prose in `.md`; reconcile `playbooks-compact`.

Decisions locked: Phase 2 moves **folders + deps + env + snippets** all into manifests at once; Makefile/CI remain **parameterized templates**.

---

## 10. Verification

- Run the CLI for all 6 stack combos (Next.js/React × Supabase/Spring Boot/PostgreSQL); diff generated output vs current `main` baseline for **Phase 1 parity** (same folders/files; new lean AGENTS.md + two-group RULES.md).
- Assert: RULES.md has both groups; AGENTS.md lean + lazy instruction; Zod/forms listed **optional**, not mandated.
- Unit-test `resolveStack`: an optional concern excluded does **not** alter the required scaffold; `appliesTo` filtering rejects invalid pairs; `constraints` derived from manifests.
- Snippet extraction test: a tagged block in `nextjs.md` produces the correct file at the target path when its concern is active, and is skipped when inactive.
- Manual: open a generated project, follow AGENTS.md's "read only the § you need" and confirm an agent can locate the relevant playbook §.

---

## 11. Risks / Notes

- **Snippet extraction is the only fragile part** → explicit `snippet:<name>` tags + manifest map; start with 1–2 snippets (`env.ts`) and grow later. Never parse prose.
- **Manifest / `.md` drift** → `INDEX.md` documents the contract; optional future CI check that concern ids appear as headings.
- **Keep `resolvePlaybook` compact preference** so token-trimmed playbooks still ship.
- **Backward compat** → Phase 1 must not change generated project shape except the intended AGENTS.md/RULES.md improvement, so existing projects' expectations hold.
