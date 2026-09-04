# Prisma Capability

Used by the Next.js + PostgreSQL stack. The compatibility profile pins Prisma Client, CLI, PostgreSQL adapter, and driver as one tested set.

## Core Rules

- `prisma/schema.prisma` owns the data model; `prisma.config.ts` owns the CLI datasource URL and migration path.
- Never edit an applied migration. Add a new migration and review its SQL before applying it.
- Instantiate one Prisma Client per process and reuse it during development reloads.
- Repositories own Prisma queries. Pages, route handlers, and Server Functions call services instead of querying Prisma directly.
- Select only required fields. Never return credential or internal fields by accident.

## Setup

The generator creates the required Prisma 7 files and exact dependencies. Use package scripts so commands resolve the pinned local CLI:

```bash
npm run prisma:generate
npm run db:migrate       # local development; creates and applies a migration
npm run db:deploy        # CI/production; applies committed migrations only
npm run db:studio
```

`npm run dev` and `npm run build` generate the client first. `DATABASE_URL` must be present; it is a server secret and never receives a `NEXT_PUBLIC_` prefix.

## prisma/schema.prisma

Prisma 7 requires the `prisma-client` generator and an explicit output path. The datasource URL no longer belongs in this file.

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

model Example {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("examples")
}
```

`prisma.config.ts` loads the datasource for CLI operations:

```typescript
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: env('DATABASE_URL') },
})
```

## Runtime Client

Prisma 7 relational clients require a driver adapter. PostgreSQL uses `@prisma/adapter-pg`; configure finite connection/acquisition timeouts appropriate to the deployment and size the pool across all application instances.

Import `PrismaClient` from the generated output, never from a guessed legacy location. Keep the adapter and singleton in `src/lib/prisma.ts`, which is server-only by ownership.

## Schema and Query Safety

- Use database constraints for uniqueness, foreign keys, nullability, and checks; application validation cannot prevent races.
- Catch known constraint conflicts and map them to stable application errors without exposing raw database messages.
- Allowlist user-controlled sort fields and directions; cap page sizes.
- Use a transaction when multiple writes must commit atomically. Keep interactive transactions short and free of network calls.
- Avoid unbounded `findMany`, N+1 queries, and broad relation includes. Verify important query plans and indexes with PostgreSQL.

## Migration Verification

CI generates the client, validates migrations against PostgreSQL, and runs the production build. Production deploys committed migrations with `db:deploy`; it never runs reset, schema push, or interactive development migration commands.

Treat destructive or locking changes as staged releases: add compatible shape, backfill, switch reads/writes, then remove obsolete shape later.
