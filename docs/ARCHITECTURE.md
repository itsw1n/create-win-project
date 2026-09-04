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

### Source ownership

The migration target has three explicit source boundaries:

- `src/cli` owns terminal arguments, questions and navigation, display, warnings, summaries, and system checks. It may call the engine and read stack descriptions.
- `src/engine` owns validated project orchestration, tested-version and library loading, safe writes, dependency installation, and template rendering. It must not import terminal code or concrete stack folders.
- `src/stacks` owns stack rules, the explicit available-stack list, and stack-specific generated behavior. Stack modules must not import CLI or engine implementation modules.

During the architecture migration, these paths provide compatibility exports backed by the existing `lib` modules. Each later phase moves one responsibility behind the new path, updates callers, and removes its wrapper only after old and new imports are proven equivalent. `tests/architecture-boundaries.test.js` enforces dependency direction, while `tests/architecture-compatibility.test.js` protects public imports, representative paths, and byte-identical generated output.

Root `index.js` remains the stable executable entry point. Generated-project paths such as `playbooks/`, `RULES.md`, and application folders are user-facing and do not change merely because generator source files move.

### CLI boundary

Root `index.js` is only the stable executable shim. `src/cli/main.js` coordinates the command, `arguments.js` parses and validates flags, `questions.js` defines the interview, `navigation.js` owns Back behavior, `display.js` owns terminal presentation, and `system-check.js` detects runtime support. The CLI gathers project identity, frontend, optional backend, styling, one Small/Medium/Large architecture profile, login intent, client audience when relevant, testing depth, and optional operational tooling. Medium is shown first and is the default. CLI modules do not contain stack dependency tables.

`generateProject()` validates the same answers again because it is also an exported programmatic API. A caller cannot bypass destination-name, Java-package, or testing-profile validation by skipping the CLI.

### Catalog and resolution

`lib/catalog.js` loads co-located `*.manifest.json` files and merges selected capabilities into one stack descriptor. `lib/compatibility.js` validates `compatibility/profiles.json` and resolves every package name to an exact version for the selected profile.

Stack-specific behavior crosses into core orchestration through the contract in `lib/stacks/contract.js`. Every frontend, backend, or data adapter has a stable identity, declares compatible adapters and supported application/authentication/architecture models, and is added to the explicit registry. Registration is deliberate; adapters are never discovered by scanning directories.

Adapters may contribute data in these areas:

- questions in a core-defined prompt slot;
- authentication models;
- generated file descriptions;
- environment declarations;
- install steps;
- Docker and CI fragments;
- verification cases.

Core code owns prompt order, compatibility-profile resolution, atomic writes, process execution, and final composition. An adapter receives a read-only stack context and returns contributions; it cannot write arbitrary paths or install global tools. Adapter definitions do not accept dependency tables or version fields. Exact versions remain exclusively owned by `compatibility/profiles.json`.

Manifests declare:

- identity and compatibility (`id`, `kind`, `appliesTo`);
- dependency names and scripts (never dependency versions);
- semantic environment names and which ones are client-visible;
- supported architecture profiles, conditional playbooks, and optional templates;
- constraints shown to the agent;
- concerns and their playbook sections.

Client environment variables are semantic in manifests (`API_URL`) and receive exactly one framework prefix during resolution (`NEXT_PUBLIC_API_URL`, `VITE_API_URL`, or `EXPO_PUBLIC_API_URL`). Public prefixes always mean the value is shipped to the client.

### Runnable scaffold

`lib/scaffold.js` owns the minimum executable vertical slice:

- Next.js: route-oriented Small; familiar feature services/actions/queries and owned repositories or remote API clients in Medium; public feature APIs and enforced boundaries in Large.
- React + Vite: thin browser features in Small, feature modules in Medium, and public feature APIs plus boundary checks in Large.
- Expo: screens/data in Small, feature modules in Medium, and boundaries ready for offline sync, background work, and platform adapters in Large.
- Spring Boot: conventional package-by-feature in Small, explicit API/service/repository ownership in Medium, and a verified Spring Modulith modular monolith in Large.

Authentication is selected during generation. Supabase emits Supabase Auth clients and login examples; website-only Spring uses a secure server-managed session; multi-client Spring emits an OIDC Resource Server and delegates issuance, refresh, and revocation to the identity provider. `Not yet` is fail-closed for Spring and never emits pretend authentication. Existing projects are never told to rerun the generator to add auth.

This module intentionally generates a small working example. Domain-specific features are added after product context is known; the generator does not invent business entities.

### Repository and operational files

`lib/generator.js` coordinates writes and refuses to merge into a non-empty destination. It adds documentation, selected playbooks, CI, Docker, Makefile, environment examples, and repository conventions around the runnable foundation.

Engine infrastructure is separated from those generated-file decisions. `src/engine/write-files.js` validates destinations, stages writes, removes failed staging trees, and publishes completed trees atomically. `render-templates.js` combines rendering with that safe write boundary. `install-dependencies.js` is the only engine process runner and stops at the first failed package-manager step. `tested-versions.js` and `load-library.js` expose version resolution and library loading separately. Compatibility exports remain until all stack migrations have moved their callers.

The first `npm install` creates the lockfile. Generated CI uses `npm ci`, so the lockfile must be committed before CI is enabled. `create-win-project.profile.json` separately records the compatibility profile, architecture profile, and authentication intent/model/audience; after generation, that project owns its own upgrade lifecycle.

### Compatibility profile lifecycle

Exactly one profile is `current` and one is `previous`. The current profile is the default. A profile owns exact npm, Spring Boot, runtime, and container versions; manifests and scaffold code may only request names or capabilities. Promotion copies the candidate into a new dated profile, marks the former current profile previous, and happens only after the generated-project matrix passes. Major changes also require migration notes. See `DEPENDENCY_MAINTENANCE.md`.

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
2. generated-output contract tests for required files, environment naming, playbook routing, profile-specific boundaries, auth metadata/code, testing profiles, and overwrite safety;
3. a current-and-previous matrix across every supported stack combination, all three architecture profiles, and every applicable authentication model. It installs and runs lint, typecheck, tests, builds, Expo compatibility checks/web export, Spring MVC/security/Modulith tests and Maven packaging, Compose validation, and current-profile container builds.

Canonical Markdown code examples should progressively move into extracted fixtures so examples compile against the versions they teach.

## Extension workflow

When adding a stack or capability:

1. Add its manifest, all five stack facets, and any platform/capability routes.
2. Add the smallest runnable files needed in `lib/scaffold.js` or a focused scaffold module.
3. Add every supported architecture/authentication combination to the generated-output matrix.
4. Run install, lint/typecheck, tests, and production build for the new fixture.
5. Update this architecture document if ownership or the generation pipeline changed.

Do not advertise a capability solely because a playbook mentions it. A generated capability must have executable configuration and contract coverage.
