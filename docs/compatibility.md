# Compatibility profiles and upgrades

Dated profiles define tested starting points for generated projects. Each profile records exact direct npm, Composer, and Python versions plus tested runtime and container versions. Definitions request package names only. Package managers resolve transitive dependencies and create project-owned lockfiles (`package-lock.json`, `composer.lock`, `uv.lock`).

Profiles are tested starting points, not permanent locks. The current profile is the default and the previous profile remains supported for the documented support period. Profile history is stored in `library/tested-versions.json`.

## Review an existing generated project

Existing projects are never modified automatically. If the project contains `create-win-project.profile.json`, run the read-only report from its project directory:

```bash
create-win-project upgrade-report .
```

The report compares the project's profile, runtimes, and production contract with the current supported profile. It does not update dependencies, rewrite files, or apply migrations.

## Upgrade workflow

1. Commit or back up the existing project and lockfiles.
2. Read the dependency release notes for every changed runtime or major framework.
3. Review the generated project's `CONTEXT.md`, architecture, authentication, deployment, and database migration policy.
4. Update direct dependencies and lockfiles deliberately in the project repository.
5. Run the project's formatter, linter, type checker, tests, build, migration checks, and deployment validation.
6. Record approved architecture or provider changes in `CONTEXT.md`.

A new generated project can be useful as a reference for a new profile, but application behavior and data migrations must be merged deliberately. The generator never upgrades an existing project by regenerating into its directory.
