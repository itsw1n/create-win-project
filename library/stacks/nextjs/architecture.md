# Next.js Architecture

## Profiles

The selected profile is a baseline for the project, not permission to create empty layers.

### Small

Keep routing and route composition in `src/app`. A route may call a feature query or
server-only data function directly. A Server Function may perform a simple validated
mutation directly through the secure data-access boundary. Do not create a Service for
trivial mapping or a Repository without persistence.

```text
Server Component → Query/DAL → owned data
Form → Server Function → DAL → owned data
```

### Medium (default)

Group application code by feature. Entry points call a reusable Service when an
operation contains policy, coordination, or is shared. Reads use feature Queries.

```text
Web Action ──────┐
Route Handler ───┼──→ Service → Repository → Next-owned database
Job ─────────────┘

Page → Query → Repository → Next-owned database
Page/Action → Service when useful → API client → Spring or external API
```

A Repository means owned persistence. A remote HTTP client belongs in `api/`; do not
rename transport code to make every diagram look identical.

### Large

Keep the Medium vocabulary. Add an explicit feature public API, domain policies where
real domain behavior exists, jobs/events, contract tests, observability, and automated
cross-feature import checks. Large means enforced boundaries, not extra synonyms for
Service and Repository.

## Dependency Direction

```text
app routing → feature entry points/UI → application operations → data/API boundary
shared UI   → no feature imports
feature A   → feature B public API only (Large)
```

- `app/` owns URLs, layouts, metadata, loading, errors, and composition.
- Actions and Route Handlers are untrusted entry points, not business operations.
- Services do not import React components or route modules.
- Repositories and API clients do not import UI.
- Do not duplicate the same operation across Actions, handlers, and jobs.

## Server and Client Boundaries

Use Server Components by default for initial reads and server-owned composition. Add `'use client'`
at the smallest interactive leaf that needs browser state, effects, event handlers, or browser
APIs. Client Components never import database clients, secrets, privileged SDKs, or server-only
feature modules.

```text
Server Component → Query → Repository or remote API client
Client Component → Server Action for an owned UI mutation
External client  → app/api Route Handler → Service
```

An Action or Route Handler is an untrusted entry point. It authenticates, authorizes, validates,
calls one application operation, and translates its result. Meaningful or reused business policy
belongs in a Service, not React, an Action, or a Route Handler.

## Read and Write Decisions

| Need | Preferred boundary |
|---|---|
| Initial data for a Server Component | Direct feature Query; do not call the project's own HTTP route |
| Interaction owned by this Next.js UI | Server Action or Server Function |
| Incoming request from an external consumer | `app/api/**/route.ts` |
| Outgoing request to a remote backend | Feature `api/` client |
| Complex or reused read | Query, optionally backed by a Repository |
| Meaningful or shared mutation policy | Service, called by the entry point |

Validate forms, route parameters, query parameters, cookies, webhooks, and external responses at
their trust boundaries. Hiding a control in the browser is useful UX but is never authorization;
the server operation checks permission beside protected data or side effects.

## Escalation Rules

Add a Service for meaningful rules, multi-step coordination, reuse, transactions, or
independent testing. Add a Repository when Next owns persistence. Add a domain policy
when behavior has a stable business name and invariants. Never add a folder only because
the selected profile lists it.

Before adding or removing a layer, inspect the existing feature vocabulary and reuse it. Do not
introduce `useCases`, `businessLogic`, or `mutations` as synonyms for an established Service or
Action boundary. Before removing or reorganizing user-created folders, explain the reason, future
placement, and recovery path, then ask for approval.
