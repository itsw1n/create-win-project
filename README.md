# create-win-project

> Runnable project scaffolding for AI-assisted teams. Generate a tested Next.js, React/Vite, Expo, or Spring Boot foundation with a small `AGENTS.md`, task-routed `RULES.md`, and curated engineering playbooks.

[![CI](https://github.com/itsw1n/create-win-project/actions/workflows/ci.yml/badge.svg)](https://github.com/itsw1n/create-win-project/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-20%2B-green)](https://nodejs.org)
[![Manifest-driven](https://img.shields.io/badge/architecture-manifest--driven-blue)](./playbooks)
[![Lean docs](https://img.shields.io/badge/AGENTS.md-lean%20%26%20lazy-9cf)](./playbooks)
[![Interactive](https://img.shields.io/badge/cli-interactive-ff69b4)](./index.js)

---

## About

`create-win-project` turns a short interview into a small working application—not merely an empty folder tree. Generated stacks include framework source, configuration, environment examples, tests, CI, optional Docker support, and guidance an agent can route by task.

Most scaffolds dump a giant `CLAUDE.md`/`AGENTS.md` that eats tokens on every prompt. This tool does the opposite:

- **`AGENTS.md` is small and always loaded** — it tells the agent *where the rules live*, not the rules themselves.
- **`RULES.md` is a lazy index** — `concern → playbook §`. The agent reads only the section it needs, when it needs it.
- **Playbooks are the single source of truth.** Every stack, backend, styling, and concern is described by a `*.manifest.json`, so what gets generated is declarative and easy to extend.

The result: new contributors (human *and* agent) get guardrails from minute one, and your context window stays free for the work that matters.

## Features

- **Three frontend families** — Next.js App Router, React + Vite, and React Native with Expo Router.
- **Backends** — Supabase, PostgreSQL, Spring Boot, or none.
- **Styling** — Tailwind CSS or CSS Modules.
- **Lean agent docs** — `AGENTS.md` (always on) + `RULES.md` (lazy index) generated for every project.
- **Manifest-driven composition** — co-located `*.manifest.json` files drive compatibility, dependencies, environment variables, and concern wiring; focused scaffold code owns executable framework files.
- **Optional concerns, never mandated** — validation/Zod, data fetching, state, env validation, URL state, and forms are listed but never forced; an advisory prompt only annotates `CONTEXT.md`.
- **Runnable foundations** — real entry points, TypeScript/lint/test/build configuration, health endpoints, and Spring Boot packaging.
- **Authentication baseline** — Supabase SSR projects generate browser/server clients, Proxy session refresh, and the PKCE callback route.
- **Safety checks** — non-empty destinations are never silently overwritten; manifest and generated-output contracts are tested.
- **Optional extras** — Makefile, Docker Compose, and GitHub Actions CI, toggled by the interview.

## Quick start

Clone and run — no host Node needed (everything is dockerized):

```bash
git clone https://github.com/itsw1n/create-win-project && cd create-win-project
make build   # builds node:20-alpine image (CI-aligned)
make run     # interactive CLI
make test    # run tests
```

All `make` commands run inside Docker — see `make help` for grouped list (`Core`, `Checks`).

If you already have Node 20+, you can still use `npx create-win-project` directly, but `make` always uses Docker for zero conflict.

Answer a few questions and a ready-to-install project appears in `./<your-project>`.

```bash
# Next.js or Expo
cd your-project
npm install
npm run dev

# React + Vite uses its frontend workspace
cd your-project/frontend
npm install
npm run dev
```

The generated `README.md` and `docs/guides/setup.md` contain the exact commands for the selected backend, environment file, and optional Docker services.

## What you get

| File | Purpose |
|------|---------|
| `AGENTS.md` | Lean, always-loaded guidance for your coding agent. |
| `RULES.md` | Lazy index — `concern → playbook §`. Read only what you touch. |
| `CONTEXT.md` | Project context + any advisory "expected concerns". |
| `playbooks/` | The curated rule playbooks (shipped lean). |
| `package.json` | Generated from the selected stack's manifest. |
| `.env.example` | Generated from the stack's declared env vars. |
| Framework source/config | A working page or screen, health endpoint where applicable, strict TypeScript, lint, tests, and build scripts. |
| `Makefile` / `docker-compose.yml` / `.github/workflows` | Optional, interview-toggled. |

## How it works

The generator never hardcodes the folder or playbook list. It loads `playbooks/**/*.manifest.json` and resolves a *stack* from your answers:

```jsonc
// playbooks/stack/nextjs.manifest.json (excerpt)
{
  "id": "nextjs",
  "kind": "frontend",
  "label": "Next.js",
  "appliesTo": { "backend": ["supabase", "springboot", "postgres"] },
  "folders": ["src/app", "src/components/ui", "src/features"],
  "deps": { "next": "^16.3.4", "react": "^19.2.8", "react-dom": "^19.2.8" },
  "env": [],
  "clientEnv": [],
  "concerns": [
    { "id": "validation", "required": false, "when": "runtime validation needed", "sections": ["Zod for Runtime Validation"] }
  ]
}
```

Add a policy-only concern with a manifest and playbook. A new executable stack also needs a focused scaffold implementation and a generated-project contract test; this prevents documentation from advertising code that does not exist.

## Topics

Next.js · React · Spring Boot · Supabase · PostgreSQL · TypeScript · Tailwind CSS · CSS Modules · project scaffolding · project template · `AGENTS.md` · coding agents · manifest-driven · lean documentation · lazy rules index

## Contributing

1. Fork and create a feature branch.
2. `npm install` and `npm test` must stay green.
3. Add or update a `*.manifest.json` for new stacks/concerns.
4. Open a pull request.

## License

MIT — see [LICENSE](./LICENSE) if added, otherwise free to use and adapt.
