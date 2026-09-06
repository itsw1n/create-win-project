# create-win-project Agent Guide

## Project purpose

This repository is a Node.js CLI that generates tested web, mobile, and backend projects.
Generated output is the product: changes are incomplete when only the generator's own tests
pass but a generated project cannot install, lint, test, build, or start.

## Source map

- `src/engine/` owns catalog loading, compatibility resolution, and the generation pipeline.
- `src/stacks/` owns stack adapters and stack-specific generated files.
- `templates/` contains rendered CI, Docker, Makefile, and configuration templates.
- `library/` contains manifests and compact playbooks copied into generated projects.
- `checks/` contains package, content, and generated-project verification commands.
- `tests/` contains unit, integration, architecture, and committed golden-output tests.
- `docs/` is user and maintainer documentation; `docs/maintainers/` explains internals.

Keep stack-specific behavior in its adapter. Shared generation code may compose adapters but
must not accumulate new stack-specific file bodies when the adapter can own them.

## Working rules

- Read the relevant adapter, templates, compatibility profile, tests, and maintainer docs
  before changing generated behavior. Load only the documents relevant to the affected stack;
  do not preload the entire repository documentation set.
- Preserve unrelated user changes and do not rewrite history or use destructive Git commands.
- Keep commits logical; a branch or PR may contain multiple focused commits.
- Target feature PRs at `dev`. Promotion from `dev` to `main` is the release boundary.
- Do not push, create a PR, merge, publish, or release unless the user authorizes it.
- Store private implementation notes under a gitignored local notes directory, not tracked docs.
- Prefer exact tested versions from `library/tested-versions.json`; do not invent versions in
  generators or templates.

## Generated-output contract

When adding or changing a stack:

- Support every declared frontend, architecture, authentication, and application-shape pairing.
- Generate honest behavior for `public`, `undecided`, and configured authentication choices;
  undecided security must fail closed.
- Keep backend-only projects at repository root and paired backends in `backend/`.
- Keep React paired frontends in `frontend/`; Next.js remains at repository root.
- Make host installation optional and preserve generated files when installation fails.
- Ensure generated lockfiles, CI paths, Docker contexts, environment variables, and docs agree.
- Never make application startup apply production database migrations automatically.
- Update generated-output fixtures with `node tests/architecture/update-golden-output.mjs`;
  review the resulting diff instead of editing fixture hashes by hand.

## Validation

Run the smallest relevant test while iterating, then before handoff run:

```bash
npm test
npm run validate:content
npm run package:check
git diff --check
```

For changes affecting generated runtime behavior, also run the applicable generated-project
check from `checks/check-generated-project.js`. The four compatibility shards divide the full
matrix for parallel execution; the compatibility gate passes only when every shard passes.

Do not dismiss warnings that precede a later failure. A generated project must pass its own
formatter, linter, type checker, tests, production build, migration check, and Compose validation
where those capabilities apply.

## General dependency security

Treat all third-party dependencies as untrusted code.

When installing dependencies:

- Do not assume a package is safe because it is popular or commonly used.
- Be aware that dependencies may execute lifecycle or install scripts.
- Do not automatically approve blocked scripts or weaken package-manager security controls.
- Prefer known, reviewed dependencies and compatibility profiles.
- Avoid unnecessary dependencies.
- Never execute arbitrary commands derived from package metadata or user input.
- Report security warnings clearly instead of silently bypassing them.
- Keep dependency installation optional when possible.
- Preserve the generated project if installation fails.

## Documentation boundaries

- `README.md` is the short product landing page.
- `docs/` serves CLI users; `docs/maintainers/` serves contributors.
- `library/` and generated `playbooks/` serve agents working inside generated projects.
- Keep playbooks normative and compact. Put lengthy explanation in docs and executable examples
  in tests or fixtures.
- When behavior changes, update code, tests, generated guidance, and user-facing docs together.
