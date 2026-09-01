# create-win-project

> Production-ready project scaffolding for AI-assisted teams. Generate a Next.js / React / Spring Boot app that ships with a **lean, manifest-driven `AGENTS.md`**, a **lazy `RULES.md`**, and a curated set of engineering playbooks — so your coding agent knows the rules without burning context on a 3,000-line doc.

[![CI](https://github.com/itsw1n/create-win-project/actions/workflows/ci.yml/badge.svg)](https://github.com/itsw1n/create-win-project/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-20%2B-green)](https://nodejs.org)
[![Manifest-driven](https://img.shields.io/badge/architecture-manifest--driven-blue)](./playbooks)
[![Lean docs](https://img.shields.io/badge/AGENTS.md-lean%20%26%20lazy-9cf)](./playbooks)
[![Interactive](https://img.shields.io/badge/cli-interactive-ff69b4)](./index.js)

---

## About

`create-win-project` is a scaffolding CLI that turns a short interview into a complete, opinionated project — folders, `package.json`, env template, CI, Docker, and a documentation layer your AI coding agent can actually use.

Most scaffolds dump a giant `CLAUDE.md`/`AGENTS.md` that eats tokens on every prompt. This tool does the opposite:

- **`AGENTS.md` is small and always loaded** — it tells the agent *where the rules live*, not the rules themselves.
- **`RULES.md` is a lazy index** — `concern → playbook §`. The agent reads only the section it needs, when it needs it.
- **Playbooks are the single source of truth.** Every stack, backend, styling, and concern is described by a `*.manifest.json`, so what gets generated is declarative and easy to extend.

The result: new contributors (human *and* agent) get guardrails from minute one, and your context window stays free for the work that matters.

## Features

- **Three stacks** — Next.js (App Router), React + Vite, Spring Boot.
- **Backends** — Supabase, PostgreSQL, Spring Boot, or none.
- **Styling** — Tailwind CSS or CSS Modules.
- **Lean agent docs** — `AGENTS.md` (always on) + `RULES.md` (lazy index) generated for every project.
- **Manifest-driven** — 20 `*.manifest.json` files drive folders, dependencies, env vars, snippets, and concern wiring. No hardcoded tables.
- **Optional concerns, never mandated** — validation/Zod, data fetching, state, env validation, URL state, and forms are listed but never forced; an advisory prompt only annotates `CONTEXT.md`.
- **Real plumbing** — `package.json`, `.env.example`, and `src/lib/env.ts` are generated from manifest fields.
- **Optional extras** — Makefile, Docker Compose, and GitHub Actions CI, toggled by the interview.

## Quick start

### Option A — No host Node (Docker, zero conflict)

```bash
git clone https://github.com/itsw1n/create-win-project && cd create-win-project
make docker-build   # or: docker compose build
make docker-run     # or: docker compose run --rm app
# tests without host Node
make docker-test    # or: docker compose run --rm --entrypoint npm app test
```

Requires only Docker + Compose (no `node`/`npm` on host). Image is CI-aligned `node:20-alpine`.
See `make help` for all Docker targets (`docker-demo`, `docker-shell`, `docker-clean`).

### Option B — Host Node

```bash
npx create-win-project
# or from source
npm install && npm test
node index.js
```

Answer a few questions (project name, frontend, backend, styling, extras) and a ready-to-run project appears in `./<your-project>`.

```bash
# then, inside the new project
cd your-project
npm install
npm run dev
```

## What you get

| File | Purpose |
|------|---------|
| `AGENTS.md` | Lean, always-loaded guidance for your coding agent. |
| `RULES.md` | Lazy index — `concern → playbook §`. Read only what you touch. |
| `CONTEXT.md` | Project context + any advisory "expected concerns". |
| `playbooks/` | The curated rule playbooks (shipped lean). |
| `package.json` | Generated from the selected stack's manifest. |
| `.env.example` | Generated from the stack's declared env vars. |
| `src/lib/env.ts` | Typed env access, extracted from the env playbook snippet. |
| `Makefile` / `docker-compose.yml` / `.github/workflows` | Optional, interview-toggled. |

## How it works

The generator never hardcodes the folder or playbook list. It loads `playbooks/**/*.manifest.json` and resolves a *stack* from your answers:

```jsonc
// playbooks/stack/nextjs.manifest.json (excerpt)
{
  "id": "nextjs",
  "kind": "frontend",
  "label": "Next.js",
  "appliesTo": { "backend": ["supabase", "springboot", "postgresql"] },
  "folders": ["src/app", "src/components/ui", "src/features"],
  "deps": { "next": "^15", "react": "^19", "react-dom": "^19" },
  "env": ["NEXT_PUBLIC_API_URL"],
  "concerns": [
    { "id": "validation", "required": false, "when": "runtime validation needed", "sections": ["Zod for Runtime Validation"] }
  ]
}
```

Add a new stack or concern by dropping a manifest — no code changes required.

## Topics

Next.js · React · Spring Boot · Supabase · PostgreSQL · TypeScript · Tailwind CSS · CSS Modules · project scaffolding · project template · `AGENTS.md` · coding agents · manifest-driven · lean documentation · lazy rules index

## Contributing

1. Fork and create a feature branch.
2. `npm install` and `npm test` must stay green.
3. Add or update a `*.manifest.json` for new stacks/concerns.
4. Open a pull request.

## License

MIT — see [LICENSE](./LICENSE) if added, otherwise free to use and adapt.
