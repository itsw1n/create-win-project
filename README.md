```
 ██╗    ██╗  ██╗ ███╗  ██╗
 ██║    ██║ ███║ ████╗ ██║
 ██║ █╗ ██║ ╚██║ ██╔██╗██║
 ██║███╗██║  ██║ ██║╚████║
 ╚███╔███╔╝  ██║ ██║ ╚███║
  ╚══╝╚══╝   ╚═╝ ╚═╝  ╚══╝

 █▀█ █▀█ █▀█   █ █▀▀ █▀▀ ▀█▀
 █▀▀ █▀█ █ █   █ █▀  █    █
 █   █ █ █▄█ █▄█ █▄▄ █▄▄  █
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

**The fix:** answer a short, plain-language interview and get **two coordinated outputs**:

1. **A small runnable app** — real page/screen, strict TypeScript, ESLint, health endpoint, tests, and the exact config for your stack.
2. **A task-routed docs layer** — a tiny always-on `AGENTS.md` + a lazy `RULES.md` (`concern → playbook §`). The agent reads only what it touches, when it touches it.

Manifests declare capabilities and package names. A tested compatibility profile owns every exact version, so generated stacks are declarative without letting version strings drift.

## Prerequisites — what you actually need to install

### Lane 1 — To run *this generator*
**Node 24 LTS *OR* Docker — that's it.**

- No global `prettier`, `eslint`, or `typescript` — they are generated inside your project (`package.json` devDeps + `.prettierrc` + `.editorconfig` + `eslint.config` via `lib/scaffold.js`).
- Prefer zero host setup? Use Docker directly. Make is an optional convenience, never a prerequisite.

### Lane 2 — To run *what it generates* (depends on your answers)
| You picked | You need | What the generator includes |
|---|---|---|
| **Next.js** or **React + Vite** | Node 24 LTS → `npm install` → `npm run dev` | Page/entry, Vite/Next config, strict TS, ESLint, tests, `frontend/.env.example` |
| **Expo** | Node 24 LTS + Expo Go app → `npm install` → `npx expo start` | Expo Router layout/screen, `app.json`, Jest, TS |
| **Supabase** | Docker for the generated local Supabase stack | Pinned local CLI, migrations/RLS tests, platform-native clients; login/callback/secure lifecycle only when login is selected |
| **Spring Boot / PostgreSQL** | JDK 21 + Docker for DB **only if you selected them** | Maven app, public health + fail-closed security, Flyway/PostgreSQL; server session or OIDC Resource Server when login is selected |

**Hybrid:** the exact commands for *your* stack live in the README inside `./your-project` and `docs/guides/setup.md` — no duplication here. If you didn't enable Docker/Make, no compose file is generated.

## Quick start

**Fastest (no clone required):**

```bash
npx create-win-project@latest
```

**From a clone with Node:**

```bash
npm ci
npm run doctor
npm start
```

**Docker-first (no host Node or Make needed):**

```bash
git clone https://github.com/itsw1n/create-win-project && cd create-win-project
docker compose build
docker compose run --rm app
```

`docker compose run` creates a disposable CLI container and reuses the existing image. It does not rebuild an existing image unless you explicitly build again. On systems with Make, `make build` and `make generate` are shortcuts; `make run` remains an alias for `make generate`.

<details>
<summary>Prefer host Node?</summary>

```bash
npx create-win-project --install      # install generated dependencies now
npx create-win-project --no-install   # generate files only
npx create-win-project doctor         # diagnose available tools
# then follow the same interview
```

Requires Node 24 LTS. Still dockerizes the *generated* app only if you enabled it.

</details>

**Then run what you generated:**

```bash
# Next.js or Expo
cd your-project
npm install
npm run dev

# React + Vite (frontend workspace)
cd your-project/frontend
npm install
npm run dev
```

The generator asks whether to install dependencies. One local `npm install` provides Prettier, ESLint, TypeScript, and the selected test tools; global installs are neither required nor silently performed.

> The generator **never overwrites a non-empty folder** — it stages to a temp dir and moves into place only on success.

## Features

- **Three frontend families** — Next.js App Router, React + Vite, and Expo Router.
- **Optional backends** — every frontend can choose no backend, Supabase, PostgreSQL where supported, or Spring Boot.
- **Styling** — Tailwind CSS or CSS Modules (native-styles for Expo).
- **Lean agent docs** — `AGENTS.md` (tiny, always on) + `RULES.md` (lazy index) generated per project.
- **Stack-native profiles** — Small, Medium (recommended/default), and Large map to familiar architecture for each selected stack; Large defaults to a modular monolith, not microservices.
- **Intent-based authentication** — choose Yes, Not yet, or No; the generator maps that intent to Supabase Auth, Spring server sessions, or external-provider OIDC validation as appropriate.
- **Manifest-driven** — `*.manifest.json` drives compatibility, exact dependency requests, env prefixes (`NEXT_PUBLIC_`/`VITE_`/`EXPO_PUBLIC_`), conditional playbooks, and concern wiring.
- **Tested compatibility profiles** — exact direct dependencies and runtime/container versions are resolved from one catalog; current and previous profiles are verified in CI.
- **Optional concerns, never mandated** — validation/Zod, data-fetching, state, t3-env, URL state are advisory (`CONTEXT.md` only) not forced.
- **Runnable foundations** — profile-specific feature slices, health endpoints, security headers, selected auth plumbing, Spring `ProblemDetail`, PostgreSQL Testcontainers, and risk-based tests.
- **Safety + contracts** — destination-exists guard, manifest ↔ heading checks, and a generated-output matrix covering every pairing, architecture profile, and applicable auth model.

## What you get

| File | Purpose |
|------|---------|
| `AGENTS.md` | Lean, always-loaded guidance for your coding agent. |
| `RULES.md` | Lazy index — `concern → playbook §`. Read only what you touch. |
| `CONTEXT.md` | Project context + any advisory "expected concerns". |
| `playbooks/` | Curated rule playbooks (shipped lean). |
| `package.json` | Generated from the selected stack's manifest. |
| `create-win-project.profile.json` | Separately records compatibility, architecture, and authentication selections. |
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
  "appliesTo": { "backend": ["none", "supabase", "springboot", "postgres"] },
  "architectureProfiles": ["small", "medium", "large"],
  "playbooks": [
    "stack/nextjs/architecture.md",
    "stack/nextjs/structure.md",
    "stack/nextjs/runtime.md",
    "stack/nextjs/security.md",
    "stack/nextjs/testing.md"
  ],
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
4. Run `npm run verify:generated -- --profile=2026.09 --case=nextjs-supabase --architecture=medium --authentication=yes` for a focused executable check. CI runs every supported combination, architecture/auth model, and retained profile.
5. Document migration work for major upgrades, then open a pull request.

## License

MIT — see [LICENSE](./LICENSE) if added, otherwise free to use and adapt.
