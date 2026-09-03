# Stack: React Native with Expo

An Expo application has no trusted server boundary. Source code, public environment values, and client-side checks are observable or bypassable. The backend or Supabase RLS must authenticate and authorize protected operations.

## Core Rules

- Screens are navigation entry points. Keep domain and protocol details in feature modules.
- Use React Native components and accessibility properties; web elements and CSS assumptions do not automatically transfer.
- Start with `useState`, native `fetch`, and `StyleSheet`. Add a state/query/form/styling library only for a demonstrated need.
- Validate external data at the boundary before using it as trusted application state.
- Store sensitive session material in platform-secure storage, never AsyncStorage. The generated Supabase client uses Expo SecureStore.
- Handle offline, loading, empty, error, retry, and resumed-app states for networked screens.
- Test behavior on Android and iOS; a successful web export is a useful build check, not complete mobile verification.

## Navigation — Expo Router

Routes live in `app/`; `_layout.tsx` composes navigation and providers.

```text
app/
├── _layout.tsx
├── index.tsx
├── (tabs)/
│   ├── _layout.tsx
│   └── profile.tsx
└── tasks/
    └── [id].tsx
```

Prefer typed links and validated route parameters:

```tsx
import { Link, useLocalSearchParams } from 'expo-router'

export function TaskLink({ id }: { id: string }) {
  return <Link href={{ pathname: '/tasks/[id]', params: { id } }}>Open task</Link>
}

export default function TaskScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  if (!id) return null // render a real invalid-route state in product code
  return null
}
```

- Navigate from screens or explicit user-action handlers, not deep data utilities.
- Preserve a validated in-app return path after sign-in; do not accept arbitrary redirect URLs.
- Client auth gates prevent confusing navigation but do not authorize data access.
- Keep route layouts small. Add providers only when the corresponding package/capability is installed.

## Feature Boundaries

```text
Screen → feature component/hook → feature data function → fetch/Supabase client → trusted backend boundary
```

A feature may contain `components/`, `hooks/`, `api.ts` or `data.ts`, `schema.ts`, and `types.ts`. Create only the pieces it needs. Keep transport URLs and Supabase queries out of visual components.

## Network Requests

Use native `fetch` for a small REST client. Centralize the base URL and error normalization once requests become shared.

```ts
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}${path}`, init)
  if (!response.ok) throw new Error(`Request failed (${response.status})`)
  return response.json() as Promise<T>
}
```

Add timeouts/cancellation where an operation can outlive its screen. Do not blindly retry writes. When adopting Axios, use the routed Axios playbook and install it in the same change.

## State Ownership

1. Local UI state: `useState` or `useReducer`.
2. Navigation/shareable state: route parameters.
3. Remote cached state: opt into a query library when caching and invalidation justify it.
4. Cross-screen client-only state: opt into a store when lifting state is no longer clear.

Never duplicate fetched server records in a general store. Persist only the minimum state that must survive process termination.

## Authentication and App Lifecycle

- Let the selected identity provider own refresh-token protocol details.
- Store provider sessions in SecureStore when persistent native credentials are required.
- Re-evaluate authentication when the app returns to the foreground and handle expired/revoked sessions without refresh loops.
- Never treat a decoded token or client role flag as authorization.
- Register and validate deep-link callback URLs for sign-in, verification, and recovery.
- Redact tokens, authorization headers, recovery links, and personal data from logs and crash reports.

## Environment Variables

`EXPO_PUBLIC_` values are compiled into the application and are never secrets. Validate required values during startup and document development, preview, and production values separately.

Native application binaries cannot safely contain a database password, Supabase secret/service-role key, OAuth client secret, or signing key.

## Accessibility and Platform Behavior

- Give interactive elements accessible names and appropriate roles.
- Use safe-area primitives for screen roots and support text scaling.
- Do not communicate state by color alone; preserve sufficient contrast.
- Respect reduced motion and platform input conventions.
- Use `.ios.tsx`/`.android.tsx` only when behavior genuinely differs.

## Agent Quick Reference

| Task | Default location |
|---|---|
| New route | `app/` |
| Domain behavior | `features/<feature>/` |
| Shared visual primitive | `components/ui/` |
| REST protocol details | feature `api.ts`, optionally shared `lib/http.ts` |
| Supabase access | feature data function using `lib/supabase.ts` |
| Sensitive native persistence | SecureStore-backed adapter |
| Repeated design values | theme tokens plus `StyleSheet` |

## Optional Concerns

TanStack Query, Axios, Zustand, Zod, and form libraries are optional. Adopt one only when its problem exists, install/configure it in the same change, and add a test covering the behavior that justified it.
