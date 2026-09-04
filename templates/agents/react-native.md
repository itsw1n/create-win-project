# AGENTS.md

> Small operating contract for agents. Project intent lives in `CONTEXT.md`; task guidance is routed through `RULES.md`.

## Project

{{PROJECT_NAME}} — {{PROJECT_DESCRIPTION}}

- Stack: `{{STACK}}`
- Platform: `{{PLATFORM}}`

## Commands

- Install: `npm install` initially; use `npm ci` after committing the lockfile.
- Develop: `npm run dev`
- Typecheck: `npm run typecheck`
- Tests: `npm test -- --runInBand` when configured.
- Export check: `npm run build -- --platform web`
- Spring backend, when present: `cd backend && ./mvnw --batch-mode test` (`mvnw.cmd` on Windows)

## Required workflow

1. Read `CONTEXT.md` and inspect neighboring screens, hooks, services, and tests.
2. Find the concern in `RULES.md`; open only its linked playbook section.
3. State assumptions when behavior is ambiguous.
4. Make the smallest coherent change and test it on the affected platform.
5. Run typecheck, relevant tests, and an export/build check.

## Always-on constraints

{{CONSTRAINTS}}

- Keep screens thin; side effects belong in hooks and services.
- Store sensitive credentials with platform secure storage, never AsyncStorage.
- Public-prefixed Expo values are bundled into the application and are never secrets.
- Client navigation guards are user experience, not server authorization.

## Authority boundaries

- Do not publish builds, deploy, merge, push, or modify production data unless explicitly asked.
- Do not add native modules or eject without explaining the impact.

## Definition of done

- Acceptance behavior works on the affected platform with appropriate tests.
- Typecheck, tests, and export/build pass, or the exact blocker is reported.
- Loading, offline, error, safe-area, keyboard, and accessibility behavior are considered.
- Relevant docs are updated.
