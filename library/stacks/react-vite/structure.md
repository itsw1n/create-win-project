# React + Vite Structure

## Canonical Reference Tree

This complete tree is a placement reference. Create only directories containing real files.

```text
frontend/src/
├── app/                         providers and router setup
├── pages/                       route-level composition
├── components/
│   ├── layout/                  Header, Footer, Container, Section
│   └── common/                  Button, Input, Modal
├── features/tasks/
│   ├── components/              feature-owned UI
│   ├── hooks/                   browser interaction and state adapters
│   ├── api/                     outgoing backend HTTP calls
│   ├── data/                    direct SDK access such as Supabase
│   ├── services/                client workflow coordination
│   ├── schemas/                 runtime boundary validation
│   ├── types.ts
│   └── index.ts                 Large public feature API
├── lib/                         shared transport and SDK construction
└── config/                      validated public runtime configuration
```

## Profile Differences

| Profile | Shape |
|---|---|
| Small | Thin Page → feature Component → API/data function |
| Medium | Feature-owned UI, hooks, protocol functions, schemas, and types; Service only for a real client workflow |
| Large | Medium plus public `index.ts`, enforced imports, contract tests, and explicit state ownership |

Do not reproduce server Repository or trusted domain layers in a browser bundle.

## File Placement

| Responsibility | Location |
|---|---|
| Providers and router construction | `app/` |
| Route composition | `pages/` |
| Structural UI | `components/layout/` |
| Reusable domain-free control | `components/common/` |
| Feature UI and state integration | `features/<feature>/components` and `hooks` |
| REST or remote protocol | `features/<feature>/api/` |
| Direct backend SDK queries | `features/<feature>/data/` |
| Reusable client workflow | `features/<feature>/services/` |
| Shared HTTP or SDK construction | `lib/` |

## Layout Composition

Pages compose `main → Section → Container → feature content`. Section owns the semantic region,
vertical spacing, and optional tone. Container owns centered maximum width and horizontal gutters.
A page may use several Sections; nested components do not add these wrappers automatically.

Header, Footer, Sidebar, and Topbar belong in `components/layout` only when the selected product
shape requires that application chrome. Input and Modal belong in `components/common` only when a
real interaction uses them.

URLs, wire DTOs, SDK queries, validation, and error normalization stay outside visual components.
Cross-feature types become shared only after genuine reuse. Large consumers import through the
feature `index.ts` rather than deep-importing internals.

## Architecture Cleanup

Do not retain an empty folder merely because it appears above. Before removing or reorganizing a
user-created architecture folder, explain the change, current and future ownership, and how to
restore the documented pattern; then ask for approval.
