# Version 2 production contract

Full projects generate a stack-appropriate production starting point. The recorded schema-v2 profile and exact tested direct dependency requests are deterministic. Tests, CI, browser tests, and Docker artifacts follow the user's choices; production builds, security rules, and operations guidance remain part of Full output. Architecture scaffolds contain planning folders and guidance only. Expo Full projects receive an EAS-ready baseline, not automatic store submission.

The guarantee is a starting contract, not a claim that an unfinished product is safe to launch. Teams still own domain authorization, infrastructure sizing, secrets, observability targets, data classification, compliance, external-provider configuration, device verification, deployment, backups, and restore drills.

## Dependency ownership

`library/tested-versions.json` owns exact direct npm and Composer versions for current and retained profiles. npm and Composer validate peer ranges, resolve transitive packages, and create lockfiles during installation. Generated projects own and commit those lockfiles; the generator does not freeze or silently upgrade their transitive graph.

## Standard baseline

- Lint/type checks, production builds, security rules, environment validation, and operations documentation are standard in Full projects. Tests and CI are selected during the interview.
- Vite production uses non-root nginx with SPA fallback, security headers, safe cache policy, and API `no-store`; Next.js retains framework-native caching.
- Server/database stacks document readiness, graceful shutdown, pooling, migration preflight, encrypted backups, restore verification, retention, deployment, and rollback.
- Docker files are generated only when Docker is selected. Shared Redis caching, queues, object storage, offline synchronization, and malware scanning appear only for a supported explicit requirement.

## Conditional capabilities

Private uploads define authorization, size/signature checks, generated names, quarantine/scanning, cleanup, and rejection tests. Queues define bounded retry, idempotency, timeouts, failed-job handling, correlation, and replay. Mobile cache/sync defines ownership, key namespaces, TTL, invalidation, privacy, reconnect states, and conflict handling. Unsupported combinations fail before any destination is written.

## Support and recovery

The current and previous dated profiles are supported through their catalog dates. Run `create-win-project upgrade-report [path]` for a read-only comparison; it never modifies an existing project. Major deviations require approval and a decision record in generated `CONTEXT.md`.
