# Next.js Structure

## Feature Ownership

`src/app` is the routing shell. Business/application code belongs to its feature.

```text
src/
├── app/                    routes and route-level composition
├── components/ui/          domain-free primitives
├── components/shared/      UI reused by multiple features
├── features/
│   └── users/
│       ├── components/
│       ├── queries/
│       ├── actions/
│       ├── services/
│       ├── repositories/   only for Next-owned persistence
│       ├── api/            only for remote HTTP boundaries
│       ├── schemas/
│       └── types.ts
├── lib/                    shared infrastructure: auth, db, logging, cache
└── config/                 validated application configuration
```

Create only folders containing real files. A feature may start with one component and
one query. Medium defines dependency direction; it does not demand seven directories.

Large features may add `index.ts`, `domain/`, `jobs/`, and colocated tests. `index.ts`
is the only supported cross-feature import surface in Large projects.

## Backend-Specific Boundaries

| Data owner | Feature boundary | Example |
|---|---|---|
| Next.js + Prisma | `repositories/` | `userRepository.ts` |
| Next.js + Supabase | `repositories/` using the server client | `userRepository.ts` |
| Spring/external API | `api/` | `usersApi.ts` |
| Browser-only SDK | feature `api/` or `data/` | never server secrets |

Do not put feature code in `lib/users.ts`, and do not call a Next Route Handler from a
Server Component merely to reach code in the same process.

## Naming

- Use operation names: `createUser`, `listOrders`, `cancelInvoice`.
- Name entry points by transport only when helpful: `createUserAction`, `POST`.
- Keep runtime schemas beside the input or external-response boundary.
- Mark server-only modules with `import 'server-only'` when accidental client import
  would expose secrets or privileged access.
