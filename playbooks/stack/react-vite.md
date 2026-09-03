# Stack: React + Vite

The generated Vite application is a browser-only SPA. Everything bundled from `frontend/src/` and every `VITE_` environment value is public to the browser.

## Core Rules

- Keep pages and route components thin; put domain behavior in feature modules.
- Validate external data at the boundary. TypeScript types do not validate runtime responses.
- Prefer the native `fetch` API until the application has a concrete reason to adopt another HTTP client.
- Never place database credentials, service-role keys, session IDs, or refresh tokens in the frontend.
- Enforce authentication and authorization in the backend or Supabase RLS, not with hidden UI or client-side route guards.

## Folder Structure

```text
frontend/
├── src/
│   ├── app/          application providers and router composition
│   ├── pages/        route-level composition
│   ├── features/     domain UI, API functions, schemas, and hooks
│   ├── components/   reusable presentational components
│   ├── lib/          shared infrastructure such as the HTTP client
│   └── types/        genuinely cross-feature types
├── e2e/              Playwright tests when full testing is selected
└── public/            static assets
```

Create directories when their first real file is needed. Do not add one abstraction layer per directory merely to match the tree.

## Data Flow

For a REST-backed feature:

```text
Page → Feature component/hook → Feature API function → shared HTTP helper → backend
```

For Supabase:

```text
Page → Feature component/hook → feature data function → generated Supabase client → RLS
```

Components own rendering and user interaction. Feature API/data functions own protocol details and runtime normalization. The backend or RLS owns authorization.

## Shared HTTP Helper

Use a small native helper before introducing Axios. It gives the application one place for the base URL, JSON parsing, request IDs, and safe error normalization.

```ts
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new HttpError(response.status, body?.code ?? 'REQUEST_FAILED', body?.message ?? 'Request failed')
  }

  return response.json() as Promise<T>
}
```

If the backend uses secure same-origin cookies, add `credentials: 'include'` and configure exact-origin CORS plus CSRF protection at the server. Do not put bearer or refresh tokens in `localStorage`.

## Feature API Pattern

```ts
// src/features/tasks/api.ts
import { request } from '@/lib/http'

export interface Task {
  id: string
  title: string
}

export function listTasks(signal?: AbortSignal) {
  return request<Task[]>('/api/tasks', { signal })
}
```

- Use `AbortSignal` for work tied to a screen/component lifetime.
- Keep URLs and wire formats out of UI components.
- Add Zod or another runtime schema when consuming data outside your control.
- Map transport DTOs into domain/UI shapes when their meanings differ.

## State Ownership

Use the smallest owner:

1. component state for local interaction;
2. URL state for shareable filters, search, sorting, and pagination;
3. a server-state library only when caching, invalidation, polling, or optimistic updates justify it;
4. a client store only for cross-page client state that is neither URL state nor server state.

Do not duplicate remote records into a general-purpose client store.

## Route Protection

Client route guards improve navigation but are not authorization. A direct API or Supabase request must still be rejected unless the authenticated principal can perform the operation on that resource.

Avoid flashing protected content while authentication is unresolved. Preserve a validated relative return path; never redirect to an arbitrary user-provided absolute URL.

## Vite Configuration

- Only variables prefixed with `VITE_` are readable through `import.meta.env`; all are public.
- Keep `strict` TypeScript and the generated lint/typecheck/test/build commands green.
- Use an SPA fallback at the production web server so client routes load directly.
- Configure development proxies only for local ergonomics; production origins and CORS remain explicit deployment decisions.

## Agent Quick Reference

| Task | Default location |
|---|---|
| New route/page | `src/pages/` and router composition in `src/app/` |
| Domain behavior | `src/features/<feature>/` |
| Shared presentational primitive | `src/components/ui/` |
| REST request | feature API function calling `src/lib/http.ts` |
| Supabase access | feature data function calling `src/lib/supabase.ts` |
| Runtime validation | feature schema beside the boundary |

## Optional Concerns

Axios, TanStack Query, Zustand, Zod, and form libraries are opt-in. When one is adopted, install and configure it in the same change, route its relevant sections through `RULES.md`, and add a test demonstrating why it exists.
