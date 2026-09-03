# Content Model

The project separates always-loaded instructions, task-routed standards, generated product documentation, and executable examples. Each fact should have one owner.

| Content | Owner | Include when |
|---|---|---|
| Agent commands, workflow, authority limits, definition of done | `templates/agents/*.md` → generated `AGENTS.md` | Every project; keep short |
| Product goal, scope, decisions, unknowns | generated `CONTEXT.md` | Every project; project-specific |
| Concern routing | manifests → generated `RULES.md` | Selected stack/capability only |
| Reusable engineering policy and rationale | `playbooks/**/*.md` | A task touches that concern |
| Setup, API, architecture, deployment for this product | generated `docs/` | Every project, then maintained with code |
| Framework configuration and canonical patterns | `lib/scaffold.js` output plus tests | The capability is selected |

## Authoring rules

1. Put a rule in the narrowest applicable playbook. Do not repeat it in `AGENTS.md`, `README.md`, and stack guides.
2. Write normative language only for behavior the generator configures or tests. Label uninstalled libraries and alternative architectures as optional.
3. Route concerns to exact Markdown headings from their manifest. Heading changes and manifest changes belong in the same commit.
4. Prefer a compact rule, a reason, and one canonical example. Remove tutorial-length alternatives that compete with the default.
5. Keep secrets, authentication, authorization, validation, accessibility, and failure behavior at explicit trust boundaries.
6. Product docs describe the generated application. Playbooks teach reusable practices; they must not invent product endpoints or entities.
7. Code and executable tests win when prose conflicts. Fix the prose in the same change.

## Review checklist

- Does this content have exactly one authoritative home?
- Is it selected only for stacks where it applies?
- Does every `RULES.md` section resolve?
- Are packages/configuration used by examples actually generated, or clearly marked optional?
- Can a new developer run the documented commands from the stated directory?
- Do auth examples cover storage, refresh/expiry, CSRF/CORS, authorization, revocation, and failure paths appropriate to that session model?
- Would moving a long example into a compile-tested fixture reduce drift?

Legacy stack playbooks can be migrated incrementally: first remove duplicated universal rules, then distinguish defaults from optional recipes, and finally extract important examples into buildable fixtures.
