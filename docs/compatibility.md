# Compatibility profiles and upgrades

Dated current and previous profiles own exact direct npm and Composer versions plus tested runtime and container versions. Definitions request package names only. Package managers validate peers, resolve transitive dependencies, and generate project-owned lockfiles.

Profiles are tested starting points, not permanent locks. Support and successor dates are recorded in `library/tested-versions.json`; promotion requires generated-project coverage and migration review.

Existing projects are never modified automatically:

```bash
create-win-project upgrade-report .
```

The report describes profile, runtime, security-contract, and migration differences without writing files. Review dependency release notes and resolved lockfile changes before upgrading.
