# AGENTS.md

> Small operating contract for agents. Project intent lives in `CONTEXT.md`; task guidance is routed through `RULES.md`.

## Project

{{PROJECT_NAME}} — {{PROJECT_DESCRIPTION}}

- Stack: `{{STACK}}`
- Platform: `{{PLATFORM}}`

## Commands

Run frontend commands from `frontend/`.

- Install: `npm install` initially; use `npm ci` after committing the lockfile.
- Develop: `npm run dev`
- Validate: `npm run lint && npm run typecheck && npm run test --if-present && npm run build`
- End-to-end: `npm run test:e2e --if-present`
- Spring backend, when present: `cd backend && ./mvnw --batch-mode test` (`mvnw.cmd` on Windows)

## Required workflow

1. Read `CONTEXT.md` and inspect neighboring implementation and tests.
2. Find the concern in `RULES.md`; open only its linked playbook section.
3. State assumptions when behavior is ambiguous.
4. Make the smallest coherent change and add risk-appropriate tests.
5. Run lint, typecheck, relevant tests, and a production build.

## Always-on constraints

{{CONSTRAINTS}}

- Treat all SPA code and public-prefixed environment values as user-visible.
- Validate input and authorize on the server; route guards are only user experience.
- Never put session IDs or access/refresh tokens in browser web storage.

## Authority boundaries

- Do not deploy, publish, merge, push, or modify production data unless explicitly asked.
- Do not delete user work or weaken checks to make a task pass.

## Definition of done

- Acceptance behavior and risk-appropriate tests are present.
- Validation commands pass, or the exact blocker is reported.
- Loading, empty, error, keyboard, and narrow-screen behavior are considered.
- Relevant docs are updated.
