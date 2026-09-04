# React + Vite Runtime

## Remote State

Use local component state for interaction, URL state for shareable navigation, and a
query library only when caching/invalidation/polling/optimistic updates justify it. Do not
copy remote records into a general client store.

- Native `fetch` is the default; centralize base URL and safe error parsing once shared.
- Cancel work tied to component lifetime and never blindly retry writes.
- Every `VITE_` environment variable is public.
- Production hosting needs an SPA fallback for client routes.
- Loading, empty, error, retry, and stale states are product behavior, not polish.
