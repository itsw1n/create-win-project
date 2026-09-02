# AGENTS.md

> Small operating contract for agents. Project intent lives in `CONTEXT.md`; task guidance is routed through `RULES.md`.

## Project

{{PROJECT_NAME}} — {{PROJECT_DESCRIPTION}}

- Stack: `{{STACK}}`
- Platform: `{{PLATFORM}}`
- Architecture profile: `{{ARCHITECTURE}}`

## Commands

- Install: `npm install` initially; use `npm ci` after committing the lockfile.
- Develop: `npm run dev`
- Validate: `npm run lint && npm run typecheck && npm run test --if-present && npm run build`
- End-to-end: `npm run test:e2e --if-present`
- Spring backend, when present: `cd backend && mvn --batch-mode test`

## Required workflow

1. Read `CONTEXT.md` and inspect neighboring implementation and tests.
2. Find the concern in `RULES.md`; open only its linked playbook section.
3. State assumptions when product behavior is ambiguous.
4. Make the smallest coherent change and add risk-appropriate tests.
5. Run lint, typecheck, relevant tests, and a production build before completion.

## Always-on constraints

{{CONSTRAINTS}}

- Validate untrusted input at the server boundary.
- Authenticate and authorize separately; enforce authorization near data and side effects.
- Never expose server secrets through public environment prefixes or client modules.

## Authority boundaries

- Do not deploy, publish, merge, push, send messages, or modify production data unless explicitly asked.
- Do not delete user work or weaken tests/security controls to make a check pass.

## Definition of done

- Acceptance behavior works and has appropriate coverage.
- Validation commands pass, or the exact blocker is reported.
- Errors do not leak secrets, personal data, or internal details.
- Relevant architecture, API, and environment documentation is updated.
