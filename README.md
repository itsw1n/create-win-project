```
 ██╗    ██╗ ██╗ ███╗  ██╗
 ██║    ██║ ██║ ████╗ ██║
 ██║ █╗ ██║ ██║ ██╔██╗██║
 ██║███╗██║ ██║ ██║╚████║
 ╚███╔███╔╝ ██║ ██║ ╚███║
  ╚══╝╚══╝  ╚═╝ ╚═╝  ╚══╝

 ██████╗ ██████╗  ██████╗      ██╗███████╗ ██████╗████████╗
 ██╔══██╗██╔══██╗██╔═══██╗     ██║██╔════╝██╔════╝╚══██╔══╝
 ██████╔╝██████╔╝██║   ██║     ██║█████╗  ██║        ██║
 ██╔═══╝ ██╔══██╗██║   ██║     ██║██╔══╝  ██║        ██║
 ██║     ██║  ██║╚██████╔╝     ██║███████╗╚██████╗   ██║
 ╚═╝     ╚═╝  ╚═╝ ╚═════╝      ╚═╝╚══════╝ ╚═════╝   ╚═╝
```

# Are you confused creating architecture rules, AGENTS.md, and folder structures from scratch every time you pick a new stack?

> **Just answer what tech stack you want.** `create-win-project` turns your answers into a runnable, tested, agent-ready foundation — not an empty folder with a giant doc dump.

Stop bikeshedding folders for 3 days. Stop pasting a 500-line `AGENTS.md` that burns tokens and still lets the agent hallucinate your stack. Your stack, your rules, already wired.

[![CI](https://github.com/itsw1n/create-win-project/actions/workflows/ci.yml/badge.svg)](https://github.com/itsw1n/create-win-project/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-24_LTS-green)](https://nodejs.org)
[![Manifest-driven](https://img.shields.io/badge/architecture-manifest--driven-blue)](./playbooks)
[![Lean docs](https://img.shields.io/badge/AGENTS.md-lean%20%26%20lazy-9cf)](./playbooks)
[![Interactive](https://img.shields.io/badge/cli-interactive-ff69b4)](./index.js)

Next.js · React + Vite · Expo (React Native) · Spring Boot · Supabase · PostgreSQL · Tailwind · CSS Modules

---

## Why this exists

You were that dev who rebuilt the same foundation twice — Next.js App Router one week, Expo the next, Spring Boot after that. Same questions: where do components live? How does auth refresh? What goes in `AGENTS.md` without drowning the context window?

**The fix:** answer 4 questions and get **two coordinated outputs**:

1. **A small runnable app** — real page/screen, strict TypeScript, ESLint, health endpoint, tests, and the exact config for your stack.
2. **A task-routed docs layer** — a tiny always-on `AGENTS.md` + a lazy `RULES.md` (`concern → playbook §`). The agent reads only what it touches, when it touches it.

Manifests declare capabilities and package names. A tested compatibility profile owns every exact version, so generated stacks are declarative without letting version strings drift.

## Prerequisites — what you actually need to install

### Lane 1 — To run *this generator*
**Node 24 LTS *OR* Docker — that's it.**

- No global `prettier`, `eslint`, or `typescript` — they are generated inside your project (`package.json` devDeps + `.prettierrc` + `.editorconfig` + `eslint.config` via `lib/scaffold.js`).
- Prefer zero host setup? Use Docker (all `make` commands use the catalog's tested Node image, CI-aligned).

### Lane 2 — To run *what it generates* (depends on your answers)
| You picked | You need | What the generator includes |
|---|---|---|
| **Next.js** or **React + Vite** | Node 24 LTS → `npm install` → `npm run dev` | Page/entry, Vite/Next config, strict TS, ESLint, tests, `frontend/.env.example` |
| **Expo** | Node 24 LTS + Expo Go app → `npm install` → `npx expo start` | Expo Router layout/screen, `app.json`, Jest, TS |
| **Supabase** | No extra install (uses your Supabase project) | Browser/server clients, Proxy session refresh, PKCE `callback` route, typed client |
| **Spring Boot / PostgreSQL** | JDK 21 + Docker for DB **only if you selected them** | Maven app, Security deny-by-default, health endpoint, Flyway, `backend/.env.example`; `docker-compose.yml` only if you toggled Docker/Make in the interview |

**Hybrid:** the exact commands for *your* stack live in the README inside `./your-project` and `docs/guides/setup.md` — no duplication here. If you didn't enable Docker/Make, no compose file is generated.

## Quick start

**Docker-first (no host Node needed):**

```bash
git clone https://github.com/itsw1n/create-win-project && cd create-win-project
make build   # builds the tested Node image (CI-aligned)
make run     # interactive interview — answer stack, styling, extras
make test    # run vitest (also dockerized)
# make help → grouped list (Core, Checks)
```

<details>
<summary>Prefer host Node?</summary>

```bash
npx create-win-project   # or: npm install && node index.js
# then follow the same interview
```

Requires Node 24 LTS. Still dockerizes the *generated* app only if you enabled it.

</details>

**Then run what you generated:**

```bash
# Next.js or Expo
cd your-project
npm install
npm run dev        # or: npx expo start for Expo

# React + Vite (frontend workspace)
cd your-project/frontend
npm install
npm run dev
```

> The generator **never overwrites a non-empty folder** — it stages to a temp dir and moves into place only on success.

## Features

- **Three frontend families** — Next.js App Router, React + Vite, and Expo Router.
- **Backends** — Supabase, PostgreSQL, Spring Boot, or none.
- **Styling** — Tailwind CSS or CSS Modules (native-styles for Expo).
- **Lean agent docs** — `AGENTS.md` (tiny, always on) + `RULES.md` (lazy index) generated per project.
- **Manifest-driven** — `*.manifest.json` drives compatibility, deps, env prefixes (`NEXT_PUBLIC_`/`VITE_`/`EXPO_PUBLIC_`), folders, and concern wiring.
- **Tested compatibility profiles** — exact direct dependencies and runtime/container versions are resolved from one catalog; current and previous profiles are verified in CI.
- **Optional concerns, never mandated** — validation/Zod, data-fetching, state, t3-env, URL state are advisory (`CONTEXT.md` only) not forced.
- **Runnable foundations** — health endpoints, security headers, Supabase SSR plumbing, Spring Security deny-by-default, Playwright/JUnit opt-in.
- **Safety + contracts** — destination-exists guard, manifest ↔ heading checks, and an 8-combo generated-output matrix (files, env naming, playbook routing).

## What you get

| File | Purpose |
|------|---------|
| `AGENTS.md` | Lean, always-loaded guidance for your coding agent. |
| `RULES.md` | Lazy index — `concern → playbook §`. Read only what you touch. |
| `CONTEXT.md` | Project context + any advisory "expected concerns". |
| `playbooks/` | Curated rule playbooks (shipped lean). |
| `package.json` | Generated from the selected stack's manifest. |
| `create-win-project.profile.json` | Records the compatibility profile and runtimes used to create the project. |
| `.env.example` | Generated from the stack's declared env vars (prefixes already applied). |
| Framework source/config | A working page or screen, health endpoint where applicable, strict TypeScript, lint, tests, and build scripts. |
| `Makefile` / `docker-compose.yml` / `.github/workflows` | Optional, interview-toggled. |

## How it works

The generator never hardcodes the folder or playbook list. It loads `playbooks/**/*.manifest.json` and resolves a *stack*:

```jsonc
// playbooks/stack/nextjs.manifest.json (excerpt)
{
  "id": "nextjs",
  "kind": "frontend",
  "label": "Next.js",
  "appliesTo": { "backend": ["supabase", "springboot", "postgres"] },
  "folders": ["src/app", "src/components/ui", "src/features"],
  "deps": ["next", "react", "react-dom"],
  "concerns": [
    { "id": "validation", "required": false, "when": "runtime validation needed", "sections": ["Zod for Runtime Validation"] }
  ]
}
```

Versions are resolved from `compatibility/profiles.json`; manifests never own them. The current tested profile is the default, while `--profile=YYYY.MM` selects a retained profile explicitly. Add a policy-only concern with a manifest + playbook. A new executable stack also needs a focused `lib/scaffold.js` implementation and a contract test — this prevents docs from advertising code that doesn't exist.

## Topics

Next.js · React · Spring Boot · Supabase · PostgreSQL · TypeScript · Tailwind CSS · CSS Modules · project scaffolding · project template · `AGENTS.md` · coding agents · manifest-driven · lean documentation · lazy rules index

## Contributing

1. Fork and create a feature branch.
2. `npm install` and `npm test` must stay green.
3. Add or update a `*.manifest.json` for new stacks/concerns; put package versions only in `compatibility/profiles.json`.
4. Run `npm run verify:generated -- --profile=2026.09 --case=nextjs-supabase` for a focused executable check. CI runs every supported combination and retained profile.
5. Document migration work for major upgrades, then open a pull request.

## License

MIT — see [LICENSE](./LICENSE) if added, otherwise free to use and adapt.
