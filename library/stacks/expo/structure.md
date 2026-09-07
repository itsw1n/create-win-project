# Expo Structure

## Canonical Reference Tree

Keep the generator's established root convention. This complete tree is a placement reference;
create only directories containing real files.

```text
app/                              Expo Router routes and navigation layouts
components/
├── layout/                       Screen, Content, and structural composition
└── common/                       Button and reusable domain-free controls
features/tasks/
├── components/                   feature-owned native UI
├── hooks/                        interaction and lifecycle adapters
├── api/                          outgoing backend HTTP calls
├── data/                         direct SDK access such as Supabase
├── services/                     device or UI workflow coordination
├── schemas/                      runtime boundary validation
├── types.ts
└── index.ts                      Large public feature API
lib/                              transport, secure storage, platform adapters
config/                           validated public runtime configuration
theme/                            shared native design tokens
```

## Profile Differences

| Profile | Shape |
|---|---|
| Small | Expo Router Screen → feature Component or API/data function |
| Medium | Feature UI, hooks, protocol functions, schemas, and types; Service only for a real workflow |
| Large | Medium plus public `index.ts`, sync/offline policy, background tasks, platform adapters, and stronger tests |

Do not move the project into `src/` merely to imitate a web structure. A root migration requires a
separate demonstrated need and explicit approval.

## File Placement

| Responsibility | Location |
|---|---|
| Route, deep link, and navigation layout | `app/` |
| Screen/Content composition | `components/layout/` |
| Reusable domain-free native control | `components/common/` |
| Feature UI and lifecycle integration | `features/<feature>/components` and `hooks` |
| Remote HTTP protocol | `features/<feature>/api/` |
| Direct backend SDK query | `features/<feature>/data/` |
| Device or multi-step UI workflow | `features/<feature>/services/` |
| Secure storage or platform adapter | `lib/` |

Validate route and deep-link parameters before use. Navigation belongs in routes, screens, or
explicit user-action handlers, never deep inside data utilities. Client code does not replace
backend authorization or Supabase RLS.

## Architecture Cleanup

Do not retain an empty folder merely because it appears above. Before removing or reorganizing a
user-created architecture folder, explain the change, current and future ownership, and how to
restore the documented pattern; then ask for approval.
