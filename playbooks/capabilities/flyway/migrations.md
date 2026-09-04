# Flyway Migrations

## Naming and Ownership

Use immutable ordered versioned migrations with descriptive names and repeatables only for truly
replaceable objects. Keep schema change and consuming code review together. Prefer explicit SQL,
expand/contract rollouts, bounded backfills, and forward fixes after deployment.
