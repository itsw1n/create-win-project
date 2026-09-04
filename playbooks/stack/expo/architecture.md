# Expo Architecture

## Profiles

### Small

```text
Expo Router screen → feature component → api/data function → trusted backend
```

### Medium (default)

Features own their components, hooks, API/data functions, runtime schemas, and types.
Platform session storage and lifecycle adapters remain shared infrastructure. Client
Services may coordinate device/UI workflows but never replace server authorization.

### Large

Keep the Medium tree and add explicit feature public APIs, sync/offline policy, background
tasks, platform adapters, contract tests, and native-device E2E. Add these only when the
product needs them.

## Dependency Direction

Routes compose screens. Screens call features. Features call shared platform/transport
adapters. Transport code never imports navigation or visual components. The backend or
Supabase RLS remains the trusted policy boundary.
