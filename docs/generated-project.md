# Understanding a generated project

Every project contains runnable source, tests, stack-specific CI and security workflows, environment examples, setup and operations guides, plus production Docker or EAS files where applicable.

`create-win-project.profile.json` records schema version 2, stack, dated profile, architecture, authentication, production guarantees, capabilities, and runtimes. It enables read-only comparisons without controlling future project changes.

- `AGENTS.md` is the small always-on operating and authority contract.
- `RULES.md` maps tasks to exact selected playbook sections.
- `playbooks/` contains only knowledge applicable to the stack.
- `CONTEXT.md` records product goals, decisions, capabilities, and approved deviations.

Application behavior, tests, and framework configuration remain the source of truth when prose drifts.
