# Stacks and capabilities

Frontends include Next.js, React with Vite, Expo/React Native, and Laravel Blade, Livewire, or Inertia React. Server/data boundaries include none, Supabase, PostgreSQL through Prisma, Spring Boot, and Laravel. Unsupported pairings fail before files are written.

Authentication is intent-based. The generator selects Supabase Auth, a server-managed browser session, Sanctum SPA, or OIDC validation according to stack and audience.

## Conditional capabilities

- `--uploads=object-storage` adds private-upload authorization, limits, signature verification, generated names, quarantine/scanning, cleanup, and test expectations.
- `--background-jobs=queue` adds bounded retry, timeouts, idempotency, failed jobs, observability, and replay rules.
- `--offline=cache|sync` is mobile-only and defines ownership, keys, TTL, invalidation, privacy, reconnect states, and conflicts.

Shared server caching is not automatic. Add it only for a measured use case with recorded ownership, keys, TTL, invalidation, privacy, and multi-instance behavior.
