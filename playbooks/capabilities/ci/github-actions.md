# GitHub Actions CI Capability

Generated workflows run the same validation commands documented for local development. Keep CI a reproducible quality boundary, not a second build system.

## Core Rules

- Pin actions to maintained major versions or immutable commits according to the repository's supply-chain policy.
- Use the lockfile command (`npm ci`) and Maven's batch mode.
- Grant the workflow and each job the minimum `permissions` required; read-only is the default for validation jobs.
- Do not expose secrets to pull requests from forks or print environment values during debugging.
- Cache package downloads, not generated application output that can become stale.
- Cancel superseded runs on the same pull request when build time becomes significant.
- Protect the release branch with required checks and review rather than relying on branch names in prose.

## Frontend CI

The generated frontend job performs, in order:

1. checkout;
2. runtime setup with lockfile-aware npm caching;
3. `npm ci`;
4. lint where configured;
5. strict typecheck;
6. selected test level;
7. production build;
8. Playwright browser install and end-to-end tests when full testing is selected.

React + Vite commands run from `frontend/`. Next.js and Expo commands run from the repository root. Build-time public values may use CI variables/secrets for convenience, but `NEXT_PUBLIC_`, `VITE_`, and `EXPO_PUBLIC_` values are still publicly bundled and must never be credentials.

## Backend CI (Spring Boot)

The generated Spring job runs:

```bash
cd backend
mvn --batch-mode test
mvn --batch-mode package -DskipTests
```

Unit/MVC tests use the generated H2 test configuration and do not need invented JWT credentials or a PostgreSQL service. Add a PostgreSQL service only when a real integration-test profile exercises PostgreSQL-specific behavior; use the same `DATABASE_URL`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` contract as application configuration.

## Next.js CI

Next.js validates lint, types, selected tests, and `next build`. Supabase SSR builds receive only the public project URL and publishable key. Other Next.js backends do not receive placeholder Supabase values.

When full testing is selected, Playwright starts the generated development server. Give that step the same required public build/runtime values as the application build and keep test accounts/data isolated from production.

## Security and Releases

- Validation workflows should normally declare `permissions: contents: read`.
- Release/publish jobs require explicit additional permissions and should be separate from untrusted pull-request validation.
- Use protected environments for production deployment approval and environment-scoped secrets.
- Generate provenance/SBOM artifacts when the deployment risk warrants them.
- Keep deployment rollback documented and test it before an incident.

## Agent Rules

- Change local scripts and CI together so command behavior does not drift.
- Do not weaken a failing check to make a pull request green; fix the defect or document an approved policy change.
- If a job needs a secret, name its owner, rotation process, environments, and why an identity federation mechanism cannot replace it.
- Add path filters only after confirming changes to shared root configuration still trigger every affected job.
