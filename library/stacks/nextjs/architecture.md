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

## Escalation Rules

Add a Service for meaningful rules, multi-step coordination, reuse, transactions, or
independent testing. Add a Repository when Next owns persistence. Add a domain policy
when behavior has a stable business name and invariants. Never add a folder only because
the selected profile lists it.
