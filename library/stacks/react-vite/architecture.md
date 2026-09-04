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
