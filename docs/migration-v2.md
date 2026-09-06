# Migrating from 1.x to 2.0

Version 2 never overwrites or automatically upgrades an existing project. Commit or back up the project first, generate a new version-2 project with equivalent stack choices, and compare it with the existing application.

1. Run `create-win-project upgrade-report .` when a profile exists; otherwise inventory runtimes, direct dependencies, authentication, CI, deployment, and operations manually.
2. Adopt `create-win-project.profile.json` schema 2 and record the stack, dated compatibility profile, production baseline, and capabilities.
3. Replace optional/no-test paths with the stack default: full web coverage (including Playwright) or Jest plus React Native Testing Library for Expo.
4. Install exact direct versions in a clean working tree and commit the package-manager lockfile. Review resolved transitive and peer changes.
5. Port hardened production artifacts and operations guidance. Keep development Docker optional.
6. Select uploads, queues, or mobile offline behavior only when required; do not infer them from 1.x advisory concerns.
7. Run lint, typecheck, tests, production builds/exports, Compose parsing, and relevant container/database/capability checks before replacing the old baseline.

Treat generated files as reference implementations during migration. Merge application-specific behavior deliberately and record approved architecture, provider, authentication, data, or major dependency deviations in `CONTEXT.md`.
