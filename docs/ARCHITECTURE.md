# Architecture

`create-win-project` composes a validated project specification into two coordinated outputs:

1. a small executable application that establishes the stack's real conventions;
2. a task-routed documentation layer for humans and coding agents.

Executable behavior, tests, and framework configuration are the source of truth. Playbooks explain and extend that behavior; they must not contradict it.

## Generation pipeline

```text
CLI interview
    ↓
validated answers
    ↓
manifest catalog + compatibility resolver
    ↓
resolved stack descriptor
    ├── runnable framework files
    ├── optional CI / Docker / Makefile files
    ├── project context and documentation
    └── selected playbooks + RULES.md router
    ↓
generated-project contract tests
```

### CLI boundary

`index.js` owns interaction and presentation. It gathers project identity, frontend, backend, styling, architecture depth, testing depth, and optional operational tooling. It does not contain stack dependency tables.

`generateProject()` validates the same answers again because it is also an exported programmatic API. A caller cannot bypass destination-name, Java-package, or testing-profile validation by skipping the CLI.

### Catalog and resolution

`lib/catalog.js` loads co-located `*.manifest.json` files, validates their basic schema, checks compatibility, and merges selected capabilities into one stack descriptor.

Manifests declare:

- identity and compatibility (`id`, `kind`, `appliesTo`);
- dependencies and scripts;
- semantic environment names and which ones are client-visible;
- folders and optional templates;
- constraints shown to the agent;
- concerns and their playbook sections.

Client environment variables are semantic in manifests (`API_URL`) and receive exactly one framework prefix during resolution (`NEXT_PUBLIC_API_URL`, `VITE_API_URL`, or `EXPO_PUBLIC_API_URL`). Public prefixes always mean the value is shipped to the client.

### Runnable scaffold

`lib/scaffold.js` owns the minimum executable vertical slice:

- Next.js: App Router page/layout, health route, strict TypeScript, flat ESLint config, tests, optional Playwright, security headers, and Supabase SSR plumbing when selected.
- React + Vite: real `frontend/` workspace, entry point, Vite/TypeScript/ESLint/test configuration, and optional Supabase client.
- Expo: Expo Router entry/layout/screen, secure Supabase storage adapter when selected, TypeScript, Jest, and export configuration.
- Spring Boot: Maven application, deny-by-default Spring Security configuration, public health endpoint, PostgreSQL/Flyway configuration, MVC test, and executable JAR packaging.

This module intentionally generates a small working example. Domain-specific features are added after product context is known; the generator does not invent business entities.

### Repository and operational files

`lib/generator.js` coordinates writes and refuses to merge into a non-empty destination. It adds documentation, selected playbooks, CI, Docker, Makefile, environment examples, and repository conventions around the runnable foundation.

The first `npm install` creates the lockfile. Generated CI uses `npm ci`, so the lockfile must be committed before CI is enabled.

## Documentation model

| File | Responsibility |
|------|----------------|
| `AGENTS.md` | Small always-on command, workflow, safety, and definition-of-done contract. |
| `CONTEXT.md` | Product goals, boundaries, decisions, and project-specific facts. |
| `RULES.md` | Generated concern-to-playbook section router. |
| `playbooks/` | Reusable standards, recipes, rationale, and stack guidance. |
| `docs/` | Documentation for the generated product, not generic framework teaching. |

Manifest section names are checked against Markdown headings. Numbered headings are normalized for matching, and generated contract tests reject unresolved `RULES.md` entries.

## Testing strategy

The generator itself has three verification levels:

1. unit tests for catalog composition and template rendering;
2. an eight-combination generated-output matrix that checks required files, environment naming, playbook routing, testing profiles, and overwrite safety;
3. periodic install/build smoke checks that execute each generated stack's own validation commands.

Canonical Markdown code examples should progressively move into extracted fixtures so examples compile against the versions they teach.

## Extension workflow

When adding a stack or capability:

1. Add or update its manifest and playbook.
2. Add the smallest runnable files needed in `lib/scaffold.js` or a focused scaffold module.
3. Add the combination to the generated-output matrix.
4. Run install, lint/typecheck, tests, and production build for the new fixture.
5. Update this architecture document if ownership or the generation pipeline changed.

Do not advertise a capability solely because a playbook mentions it. A generated capability must have executable configuration and contract coverage.
