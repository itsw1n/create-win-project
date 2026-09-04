# Supabase Capability

## Environment and Migrations

Local development always uses the local Supabase stack, regardless of Git branch.
Production uses deployment-managed hosted credentials. Git branches never select a
database implicitly.

The pinned project CLI is invoked through package scripts or `npm exec supabase --`.
Commit `supabase/config.toml`, migrations, optional development seed data, database tests,
and generated types when the project chooses to track them. Ignore `.temp` and `.branches`.

```text
schema change → migration → local reset → RLS tests → generated types → review → deploy
```

Never reset a linked production project. Preview remote migration application before an
explicit reviewed deployment. Development seed data and copied production customer data
must not enter production or source control.

The local stack requires a Docker-compatible runtime and is not hardened for public use.
Keep it bound to the development environment.

## Client Ownership

- Next.js uses separate browser and cookie-aware server clients.
- Vite uses the browser client and relies on RLS as the trusted boundary.
- Expo uses the client with a SecureStore adapter and application lifecycle handling.
- Secret/admin clients exist only for narrow trusted system operations and are never the
  implementation of an ordinary admin UI.

Publishable keys may be public only because grants and RLS constrain them. Secret/service
role credentials bypass RLS and are server-only.
