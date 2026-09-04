# Expo Structure

## Expo Router

Routes live in `app/`; `_layout.tsx` composes navigation and installed providers. Validate
route and deep-link parameters before use. Navigation belongs in screens or explicit user
action handlers, never deep inside data utilities.

## Feature Ownership

```text
app/                       route files
features/tasks/
├── components/
├── hooks/
├── api.ts                 REST protocol, when used
├── data.ts                Supabase access, when used
├── schema.ts
└── types.ts
components/ui/             reusable native primitives
lib/                       transport, secure storage, platform adapters
config/                    validated public runtime configuration
```

Create only needed folders. Large features expose an `index.ts` public API and may add
`sync/`, `background/`, or `platform/` after the corresponding runtime behavior exists.
