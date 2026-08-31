# Zustand — Client State Management

> **When to use:** Shared UI state that persists across components or screens but is NOT server data.
> If the project has no such need, this concern does not apply.

---

# 1. The One Rule

```text
Zustand  → sidebar, active tab, auth user, wizard steps, user preferences, modal state
TanStack Query → anything fetched from a server or API (users, posts, orders, products)
```

Never put server data in Zustand. Never put UI state in TanStack Query.

---

# 2. Store Setup

```ts
// src/stores/uiStore.ts  (web)
// stores/uiStore.ts      (React Native)
import { create } from 'zustand'

type UIState = {
  sidebarOpen: boolean
  toggleSidebar: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}))
```

---

# 3. Auth Store Pattern

```ts
// stores/authStore.ts
import { create } from 'zustand'

type AuthState = {
  user: User | null
  setUser: (user: User | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}))
```

---

# 4. Rules

- One store per domain concern: `authStore`, `cartStore`, `settingsStore` — not one giant global store.
- Do NOT store server data (fetched from API) in Zustand — use TanStack Query.
- Do NOT store local component-only state in Zustand — use `useState`.
- Keep stores narrow. If a store grows beyond 5–6 fields, split it.

---

# 5. What Belongs Where

```text
useState / useReducer   → one component, resets on unmount
Zustand                 → multiple components/screens, survives navigation
TanStack Query          → anything from a server, needs caching or refetch
```

---

# 6. Platform Notes

> **React Native** — works identically. Import from `zustand` the same way.
> Zustand has no dependency on the DOM or browser APIs.

---

# 7. Agent Quick Reference

```text
New shared UI state?           → stores/[name]Store.ts
State only one component needs → useState instead
State fetched from server?     → TanStack Query instead
Store getting large?           → split into focused stores
```
