# nuqs — URL State Management (Next.js)

> **When to use:** Filters, search, pagination, tabs — any state that belongs in the URL
> so it survives refresh and is shareable via link.

---

# 1. Basic Usage

```tsx
'use client'
import { useQueryState, parseAsInteger, parseAsString } from 'nuqs'

export function UserFilters() {
  const [search, setSearch] = useQueryState('search', parseAsString.withDefault(''))
  const [page, setPage]     = useQueryState('page', parseAsInteger.withDefault(1))
  const [role, setRole]     = useQueryState('role', parseAsString)

  return (
    <div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} />
      {/* URL auto-updates: /users?search=john&page=2&role=ADMIN */}
    </div>
  )
}
```

---

# 2. nuqs vs Zustand Decision

```text
nuqs (URL state):
  → search queries, pagination (page/limit), active filters,
     selected tab that should survive refresh, anything shareable via URL

Zustand (memory state):
  → modal open/close, sidebar state, wizard steps,
     anything that should reset on page refresh or navigation
```

---

# 3. Rules

- Use nuqs for anything the user might want to bookmark, share, or return to via back button.
- Use Zustand for ephemeral UI state that should reset when the user navigates away.
- Never duplicate URL state in component `useState` — read from `useQueryState` directly.

---

# 4. Agent Quick Reference

```text
Filter / search / pagination?    → nuqs useQueryState
Tab that survives refresh?       → nuqs useQueryState
Modal open state?                → useState (or Zustand if shared)
State that resets on nav?        → useState or Zustand
```
