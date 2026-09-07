# Next.js Structure

## Canonical Reference Tree

`src/app` is the App Router shell. Product behavior belongs to its feature. This complete tree
shows available destinations; create only directories containing real files.

```text
src/
├── app/
│   ├── (dashboard)/users/page.tsx       route and page composition
│   └── api/users/route.ts               incoming HTTP adapter
├── components/
│   ├── layout/                          Header, Footer, Container, Section
│   └── common/                          Button, Input, Modal
├── features/users/
│   ├── components/                      feature-owned UI
│   ├── queries/                         server-side reads
│   ├── actions/                         UI-triggered server entry points
│   ├── services/                        application operations and policy
│   ├── repositories/                    Next-owned persistence only
│   ├── api/                             outgoing HTTP clients only
│   ├── schemas/                         runtime boundary validation
│   ├── types.ts
│   └── index.ts                         Large public feature API
├── lib/                                 auth, database, logging, cache
└── config/                              validated application configuration
```

## Profile Differences

| Profile | Start with | Add when earned |
|---|---|---|
| Small | Route composition and a simple feature read or mutation | Query/Action when it names useful behavior |
| Medium | Feature-owned UI, Queries, Actions, schemas, and Services where policy exists | Repository for owned persistence; `api` for a remote service |
| Large | Medium vocabulary plus an explicit `index.ts` boundary | Domain policies, jobs/events, contract tests, and enforced imports |

Large is the complete reference, not permission to create placeholders. Medium defines ownership
and dependency direction; it does not demand every directory.

## File Placement

| Responsibility | Location |
|---|---|
| URL, layout, metadata, loading/error UI | `app/` |
| Incoming HTTP endpoint | `app/api/**/route.ts` |
| Structural or page-wide UI | `components/layout/` |
| Reusable domain-free control | `components/common/` |
| Feature-specific UI | `features/<feature>/components/` |
| Server read shaped for application UI | `features/<feature>/queries/` |
| UI-triggered server write | `features/<feature>/actions/` |
| Meaningful business/application operation | `features/<feature>/services/` |
| Next-owned database access | `features/<feature>/repositories/` |
| Outgoing remote HTTP client | `features/<feature>/api/` |
| Runtime input or response validation | `features/<feature>/schemas/` |

Route-only UI may remain beside its route in `_components/`. `layout` may import `common`; neither
directory owns feature rules. Do not put feature code in `lib/users.ts`.

## API and Data Ownership

Incoming HTTP routes live in `app/api` because the App Router owns URL discovery. Keep each route
thin: authenticate, authorize, validate, call a feature operation, and translate the result.
Outgoing HTTP clients live inside the owning feature's `api` directory.

| Data owner | Feature boundary | Example |
|---|---|---|
| Next.js + Prisma | `repositories/` | `userRepository.ts` |
| Next.js + Supabase | `repositories/` using the server client | `userRepository.ts` |
| Spring/external API | `api/` | `usersApi.ts` |
| Browser-only SDK | feature `api/` or `data/` | never server secrets |

Do not call a Next Route Handler from a Server Component merely to reach code in the same process.

## Naming

- Use operation names: `createUser`, `listOrders`, `cancelInvoice`.
- Name entry points by transport only when helpful: `createUserAction`, `POST`.
- Keep runtime schemas beside the input or external-response boundary.
- Mark privileged modules with `import 'server-only'` when accidental client import would expose
  secrets or privileged access.

## Architecture Cleanup

Do not retain an empty folder just because it appears in the canonical tree. Before removing or
reorganizing a user-created architecture folder, explain what changes, why it is unnecessary now,
where future code belongs, and how the playbook restores the pattern; then ask for approval.
