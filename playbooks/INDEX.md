# Playbook Index

Playbooks are task-routed standards used by generated projects. Their co-located manifests decide when a playbook applies and which headings appear in generated `RULES.md`.

## Content groups

| Directory | Responsibility |
|---|---|
| `universal/` | Security, accessibility, observability, testing, errors, TypeScript, repository conventions |
| `stack/` | Framework boundaries and framework-specific patterns |
| `database/` | Database clients, data authorization, schema practices |
| `migration/` | Migration and ORM workflows |
| `styling/` | Styling-system rules selected by the frontend |
| `concerns/` | Optional/shared libraries such as query, state, validation, and HTTP clients |
| `devops/` | Optional CI, Docker, Makefile, and pull-request guidance |

## Composition

```text
required universal manifests
  + selected frontend
  + selected backend/database/migration
  + selected styling
  + enabled operational tooling
  = resolved stack + generated RULES.md
```

Supported pairs:

| Frontend | Backend/data choices |
|---|---|
| Next.js | Supabase, Spring Boot, PostgreSQL + Prisma |
| React + Vite | Supabase, Spring Boot |
| Expo | Supabase, Spring Boot, bring-your-own API |

Expo uses React Native `StyleSheet` by default. Web projects can select Tailwind CSS or CSS Modules.

## Manifest contract

A manifest may declare:

- `id`, `kind`, `label`, and compatibility;
- folders, dependencies, scripts, and templates;
- semantic environment names and client-visible names;
- stack constraints;
- required and optional concerns, target playbook, headings, and applicability.

Manifests compose capabilities; `lib/scaffold.js` owns their executable minimum. Adding a runnable capability requires both parts plus a generated-output test.

## Generated documentation

- `AGENTS.md`: small always-on operating contract.
- `CONTEXT.md`: product-specific goals, scope, and decisions.
- `RULES.md`: concern-to-heading router, not a second policy document.
- `playbooks/`: only selected reusable guidance.
- `docs/`: setup, API, architecture, auth, and deployment for the generated product.

See `docs/CONTENT_MODEL.md` for authoring and deduplication rules and `docs/ARCHITECTURE.md` for the generation pipeline.
