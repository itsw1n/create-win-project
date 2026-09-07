# React + Vite Architecture

## Profiles

### Small

Keep route pages thin and place protocol details in a feature data function.

```text
Page → feature component → feature api/data function → trusted backend
```

### Medium (default)

Use feature modules containing only the needed components, hooks, API/data functions,
schemas, and types. A client Service may coordinate UI workflows, but it is never a
trusted business or authorization boundary.

### Large

Keep the Medium vocabulary and add explicit feature `index.ts` public APIs, automated
cross-feature import checks, API contract tests, and documented remote/client/URL state
ownership. Do not reproduce server Repository layers in a browser bundle.

## Dependency Direction

```text
router/page → feature UI/hook → feature API/data function → shared transport → backend
```

The backend or Supabase RLS authenticates and authorizes. Browser code renders decisions
but cannot enforce them. Features may consume another feature only through its public API
in Large projects.

## Browser Boundary Decisions

| Need | Preferred boundary |
|---|---|
| Route composition | Page |
| Reusable feature interaction | Feature Component or hook |
| Remote HTTP call | Feature `api/` module through shared transport |
| Direct Supabase access | Feature `data/` module with server-enforced RLS |
| Multi-step browser workflow | Client Service when reuse or coordination justifies it |

Client Services coordinate browser workflows; they are not trusted business or authorization
boundaries. Validate external responses and user-controlled URL or storage data before use. Before
removing or reorganizing user-created folders, explain the reason and recovery path and ask for
approval.
