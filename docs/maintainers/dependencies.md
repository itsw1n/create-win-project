# Dependency maintenance

`library/tested-versions.json` is the only owner of versions emitted into generated applications. Stack and concern definitions declare package names and capabilities, never ranges or versions. Direct npm dependencies are generated as exact versions, and consumers commit the lockfile created by their first install.

## Profile policy

- Keep exactly one `current` and one `previous` profile.
- Use a dated, immutable profile ID (`YYYY.MM`). Do not silently rewrite a released profile used by generated projects.
- Build a new candidate from the current profile. Promote it only when the complete generated-project workflow passes.
- Keep a support date and successor link on the previous profile.
- Require explicit review and migration notes for every major runtime, framework, or package upgrade.
- Treat Expo, React Native, its React override, and related Expo packages as one atomic set. `CI=1 npx expo install --check` is a release gate.

The two initial profiles intentionally bootstrap from the same known-good set. Future promotions preserve the old current profile unchanged as the meaningful previous fallback.

## Automated proposals

Renovate scans only the current profile and opens weekly grouped proposals for web frameworks, Expo, Prisma, testing, TypeScript/lint, Spring Boot, and runtime/container versions. Security alerts are allowed immediately. A Renovate PR is a proposal, not proof of compatibility: CI must pass before merge.

When a runtime and its container image must move together, update both in the same PR. Catalog validation rejects mismatched Node, Java, Maven, or PostgreSQL ownership and rejects ranges, missing versions, duplicate dependency ownership, and unknown package requests.

## Promotion checklist

1. Create the new dated candidate profile; leave the retained previous profile unchanged.
2. Review upstream release and migration notes, especially for majors.
3. Run `npm test` and the compatibility workflow for every stack, architecture profile, and applicable authentication model.
4. Confirm Expo install and auth-lifecycle checks, browser production builds and Playwright, Spring MVC/security/Modulith tests and Maven packages, Supabase RLS tests, Compose parsing, npm package contents, and container builds.
5. Mark the candidate `current`, the former current `previous`, and remove profiles older than the supported previous profile.
6. Summarize breaking changes and required migrations in the PR.

Generated projects do not automatically follow catalog updates. Their profile record explains their starting point; they manage later dependency upgrades independently.
