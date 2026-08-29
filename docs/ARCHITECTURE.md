# Architecture

`create-win-project` is an interactive CLI that scaffolds a production-ready web
app. Its defining property is a **manifest-driven, lean documentation layer** for
AI coding agents: the generated project ships a small always-on `AGENTS.md` and a
lazy `RULES.md` index instead of one giant rule file that burns context on every
prompt.

## Generation flow

1. `index.js` runs an `inquirer` interview (project name, description, frontend,
   backend, styling, optional extras).
2. `lib/catalog.js` → `loadCatalog` reads every `playbooks/**/*.manifest.json`;
   `resolveStack` merges the chosen frontend + backend + styling into a single
   **stack descriptor** (folders, `deps`, `devDeps`, `env`, `snippets`, `concerns`).
3. `lib/generator.js` → `generateProject`:
   - scaffolds the folder tree,
   - writes root files (`CONTEXT.md`, `AGENTS.md`, `README.md`, `.gitignore`,
     `.editorconfig`, `.prettierrc`, `package.json`, `.env.example`),
   - optionally writes `Makefile`, `docker-compose.yml`, and GitHub Actions CI,
   - copies the selected playbooks (lean) into `playbooks/`,
   - extracts snippet files (e.g. `src/lib/env.ts`) from playbook markers,
   - builds `RULES.md` as a lazy index.
4. `lib/playbooks.js` → `buildRulesIndex` produces a two-group `RULES.md`
   (**Always-on Invariants** + **Optional Concerns**), each row linking to a
   `playbooks/<file>#§ N` section.

## Documentation model

| File | Role |
|------|------|
| `AGENTS.md` | Small, always loaded. Tells the agent *where the rules live*. |
| `RULES.md` | Lazy index — `concern → playbook §`. Read only the section you touch. |
| `playbooks/` | The rule content (lean copies shipped into the project). |
| `CONTEXT.md` | Project context + any advisory "expected concerns". |

Verbose full playbooks are kept outside the repo (e.g. `~/Documents/*.full.md`)
so the shipped copies stay token-friendly.

## Stacks, backends, styling

- **Frontends:** Next.js (App Router), React + Vite, Spring Boot
- **Backends:** Supabase, PostgreSQL, Spring Boot, or none
- **Styling:** Tailwind CSS, CSS Modules

Optional concerns (validation/Zod, data fetching, state, env validation, URL
state, forms) are listed in `RULES.md` but **never mandated** — an advisory
interview prompt only annotates `CONTEXT.md`.

## Extending

Add a stack, backend, or concern by dropping a `*.manifest.json` describing:

```jsonc
{
  "id": "nextjs",
  "kind": "frontend",
  "label": "Next.js",
  "appliesTo": { "backend": ["supabase", "springboot", "postgresql"] },
  "folders": ["src/app", "src/features"],
  "deps": { "next": "^15", "react": "^19" },
  "env": ["NEXT_PUBLIC_API_URL"],
  "concerns": [
    { "id": "validation", "required": false, "when": "runtime validation needed",
      "sections": ["Zod for Runtime Validation"] }
  ]
}
```

No code changes are required — the catalog drives everything.
