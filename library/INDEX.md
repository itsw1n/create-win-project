# Playbook Index

Guidance files are task-routed standards used by generated projects. Their co-located definitions decide when guidance applies and which headings appear in generated `RULES.md`.

## Content groups

| Directory | Responsibility |
|---|---|
| `universal/` | Only principles that remain true across every stack |
| `platform/` | Browser/web and installed-mobile behavior |
| `stack/` | Five stack-owned facets: architecture, structure, runtime, security, testing |
| `capabilities/` | Supabase, PostgreSQL, Prisma, Flyway, Docker, CI, and authentication-provider behavior |
| `styling/` | Styling-system rules selected by the frontend |
| `concerns/` | Optional/shared libraries such as query, state, validation, and HTTP clients |
| `devops/` | Optional CI, Docker, Makefile, and pull-request guidance |

## Composition

```text
required universal + selected platform definitions
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

A stack definition must declare all three architecture profiles. Any definition may declare:

- `id`, `kind`, `label`, and compatibility;
- dependency names, scripts, templates, and conditional playbooks (versions live only in `library/tested-versions.json`);
- semantic environment names and client-visible names;
- stack constraints;
- required and optional concerns, target playbook, headings, and applicability.

Manifests compose capabilities; `lib/scaffold.js` owns their executable minimum. Generated directories exist only when they contain a selected profile's real files. Adding a runnable capability requires both parts plus generated-output and compatibility-matrix coverage.

## Generated documentation

- `AGENTS.md`: small always-on operating contract.
- `CONTEXT.md`: product-specific goals, scope, and decisions.
- `RULES.md`: concern-to-heading router, not a second policy document.
- `playbooks/`: only selected reusable guidance.
- `docs/`: setup, API, architecture, auth, and deployment for the generated product.

See `docs/CONTENT_MODEL.md` for authoring and deduplication rules and `docs/ARCHITECTURE.md` for the generation pipeline.
