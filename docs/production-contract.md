# Version 2 production contract

Version 2 generates a tested, stack-appropriate production baseline. It guarantees deterministic files for the recorded schema-v2 profile, exact tested direct dependency requests, standard tests and CI, production builds, security rules, operations guidance, and cloud-neutral Docker artifacts for deployable web stacks. Expo projects receive an EAS-ready baseline, not automatic store submission.

The guarantee is a starting contract, not a claim that an unfinished product is safe to launch. Teams still own domain authorization, infrastructure sizing, secrets, observability targets, data classification, compliance, external-provider configuration, device verification, deployment, backups, and restore drills.

## Dependency ownership

`library/tested-versions.json` owns exact direct npm and Composer versions for current and retained profiles. npm and Composer validate peer ranges, resolve transitive packages, and create lockfiles during installation. Generated projects own and commit those lockfiles; the generator does not freeze or silently upgrade their transitive graph.

## Standard baseline

- Tests, lint/type checks, production builds, CI, security rules, environment validation, and operations documentation are standard.
- Vite production uses non-root nginx with SPA fallback, security headers, safe cache policy, and API `no-store`; Next.js retains framework-native caching.
- Server/database stacks document readiness, graceful shutdown, pooling, migration preflight, encrypted backups, restore verification, retention, deployment, and rollback.
- Development Docker remains optional. Shared Redis caching, queues, object storage, offline synchronization, and malware scanning appear only for a supported explicit requirement.

## Conditional capabilities

Private uploads define authorization, size/signature checks, generated names, quarantine/scanning, cleanup, and rejection tests. Queues define bounded retry, idempotency, timeouts, failed-job handling, correlation, and replay. Mobile cache/sync defines ownership, key namespaces, TTL, invalidation, privacy, reconnect states, and conflict handling. Unsupported combinations fail before any destination is written.

## Support and recovery

The current and previous dated profiles are supported through their catalog dates. Run `create-win-project upgrade-report [path]` for a read-only comparison; it never modifies an existing project. Major deviations require approval and a decision record in generated `CONTEXT.md`.
