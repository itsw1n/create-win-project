# Product Planning

## Product Onboarding

Use this workflow only when `CONTEXT.md` reports `Product status: incomplete`.

Inspect the generated profile, current context, runnable starter, and its tests. Ask only for
missing information that materially affects implementation: product purpose, intended users,
primary workflows, required interfaces, stored data, roles and authorization, external services,
acceptance criteria, and initial out-of-scope boundaries. Do not repeat answers already recorded by
the generator or supplied by the user.

Summarize the proposed product direction and obtain confirmation before implementation. Record the
confirmed product truth and decisions in `CONTEXT.md`, then change its product status to `active`.
Record current phases, tasks, and blockers in `PROGRESS.md`; do not create another planning file.
Use `RULES.md` to locate the engineering guidance relevant to each implementation task.

Recommend simplification when the generated architecture contains responsibilities the confirmed
product does not have. Do not silently change the architecture profile or generated baseline.
Explain the tradeoff and obtain approval first.

## Plan Reconciliation

Use this workflow when the user supplies or substantially changes a specification or plan. An
ordinary feature request in an active project does not trigger product onboarding.

Treat the supplied plan as proposed input. Compare it with `CONTEXT.md`,
`create-win-project.profile.json`, existing source and tests, selected capabilities, and approved
deviations. Identify material contradictions, unsupported assumptions, missing acceptance criteria,
and decisions that would change the generated baseline. Ask only questions whose answers would
change implementation.

Summarize the reconciled direction and obtain confirmation for material baseline or scope changes.
Record confirmed product truth and durable decisions in `CONTEXT.md`; record actionable phases and
current work in `PROGRESS.md`. Route implementation concerns through `RULES.md`.

## Starter Transition

The starter is a verified runnable baseline, not the intended product. After the product direction
is confirmed, preserve reusable infrastructure that fits the product and replace starter behavior
incrementally. Replace obsolete starter features only when their real product replacement exists.

Replace starter unit and end-to-end assertions with tests of confirmed product behavior. Do not
delete tests, weaken checks, or reorganize generated architecture merely to make validation pass.
Run the starter's relevant validation before and after the transition, and report exact blockers.
