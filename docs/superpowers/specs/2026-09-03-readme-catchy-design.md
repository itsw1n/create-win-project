# Spec: Catchy README — Runnable Scaffold + Hybrid Prerequisites

- **Date:** 2026-09-03
- **Branch:** `feat/runnable-scaffold-lean-docs`
- **Approach:** A — Catchy Confusion Hook + Hybrid Prerequisites (keep badges)
- **Status:** Approved by user (both audiences, hybrid prerequisites, keep badges)

## Problem

Current README is accurate (manifest-driven, lean docs, Docker-first quick start) but not catchy. The hook is generic and prerequisites are ambiguous:
- Unclear what is needed to *run the generator* vs *run the generated app*.
- Users wonder if they must install Prettier/ESLint globally, or if generated project brings them.
- Docker appears required but is actually interview-toggled and stack-dependent (Spring Boot / Postgres needs DB, Expo needs Expo Go).

Need a hook like "Are you confused creating architecture rules...?" and a fix "just answer what tech stack you want" while keeping badges for visual trust.

## Audience

- **Both** solo devs confused by architecture/folders/playbooks *and* AI-assisted teams tired of giant AGENTS.md burning tokens.
- Hook must empathize with solo pain, then bridge to team/agent payoff.

## Design

### 1. Hero + Badges (keep all)
- Title, tagline, badges: CI, Node 20+, manifest-driven, lean docs, interactive — remain for visual polish.
- Sub-hook: "Are you confused creating architecture rules, folder structures, and AGENTS.md from scratch every time you pick a new stack?"
- One-line stack picker: Next.js · React + Vite · Expo · Spring Boot · Supabase · PostgreSQL

### 2. The Fix in 15 Seconds
Section: two columns or two bullets:
- Solo dev: 4 questions → runnable foundation (real page/screen, TypeScript, ESLint, health endpoint).
- AI team: AGENTS.md small always-on, RULES.md lazy concern → playbook §, manifest-driven single source of truth.

### 3. Prerequisites — Hybrid Two-Lane (core fix)
Split into two lanes to remove confusion:

**Lane 1 — To run this generator:**
- `Node 20+ OR Docker` — nothing else. No global Prettier/ESLint/TypeScript.
- Generated project includes `.prettierrc`, `.editorconfig`, `eslint.config`, `tsconfig`, and `prettier`/`eslint` in devDeps.

**Lane 2 — To run what it generates (depends on answers):**
- Next.js / React+Vite: Node 20+ → `npm install` → `npm run dev`
- Expo: Node 20+ → `npm install` → `npx expo start` (+ Expo Go app)
- Spring Boot / Postgres: JDK 21 + Docker for DB only if selected; `docker compose up -d db` generated only if Docker/Make enabled.
- Optional extras (Makefile, docker-compose.yml, GitHub Actions) appear only if toggled.

Hybrid: short top table + note "For exact commands for your stack, open the README inside your generated project" linking to `docs/guides/setup.md` pattern. Prevents duplication.

### 4. Quick Start — Docker-first, host collapsed
- Primary: `git clone && cd && make build && make run && make test` with note `make help` groups.
- `<details><summary>Prefer host Node?</summary>` → `npx create-win-project` / `node index.js` alternative.
- Generated-project run snippet: `cd your-project && npm install && npm run dev` vs `cd your-project/frontend && npm install && npm run dev` for react+vitetransparency.

### 5. What You Get + How It Works (trimmed)
Keep | File | Purpose | table and manifest JSON excerpt collapsed under "How composition works". Avoid competing with hook.

### 6. Features, Topics, Contributing, License
Retain existing sections; no change to Contributing steps (fork, npm install/test green, manifest for new stacks, PR).

## Non-goals
- No new runtime code; readme-only change.
- No removal of badges.
- No per-stack matrix duplicated in generator README; lean hybrid instead.

## Validation
- Badges remain and render.
- Prerequisites section clearly states Prettier is included, not prerequisite.
- `npx create-win-project` alternative still documented.
- Tests remain green (readme change does not affect vitest).

## Implementation Notes
- Edit `README.md` only; keep file size ~130-150 lines (catchy but not verbose).
- Use markdown hooks, blockquote for tagline, table for What You Get.
- Ensure Docker prerequisite is marked optional unless stack requires DB.
