# Stack: React + Vite

Used in: React + Spring Boot, React + Supabase combos.

---

## Core Rules
- React is a pure client-side SPA — no server components
- All data fetching goes through feature hooks — never directly from components
- Pages are thin composers — no business logic, no direct API calls
- Business logic lives in feature hooks and API files only
- Axios calls never appear in components — always in features/[name]/api/

---

## Folder Structure
```
src/
├── app/
│   ├── App.tsx               → root component, providers
│   ├── router.tsx            → all route definitions
│   └── providers.tsx         → QueryClientProvider, theme, etc.
│
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   └── RegisterPage.tsx
│   └── dashboard/
│       └── DashboardPage.tsx
│
├── components/
│   ├── ui/                   → dumb primitives, zero business logic
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   └── Button.module.css (if CSS Modules)
│   │   ├── Input/
│   │   ├── Modal/
│   │   ├── Badge/
│   │   └── Spinner/
│   ├── shared/               → app-aware, reusable across features
│   │   ├── PageHeader/
│   │   ├── DataTable/
│   │   ├── EmptyState/
│   │   └── ConfirmDialog/
│   ├── layout/               → structural chrome
│   │   ├── Navbar/
│   │   ├── Sidebar/
│   │   └── Footer/
│   └── forms/                → reusable form compositions
│       └── SearchForm/
│
├── features/
│   └── [name]/
│       ├── api/              → Axios functions ONLY
│       │   └── userApi.ts
│       ├── hooks/            → TanStack Query hooks
│       │   ├── useUsers.ts
│       │   └── useCreateUser.ts
│       ├── components/       → UI used ONLY inside this feature
│       │   ├── UserCard/
│       │   └── UserForm/
│       ├── schemas/          → Zod schemas + inferred types
│       │   └── user.schema.ts
│       └── types/            → feature-specific TypeScript types
│           └── index.ts
│
├── stores/                   → Zustand stores (one per domain)
│   ├── authStore.ts
│   └── uiStore.ts
│
├── lib/
│   ├── axios.ts              → Axios instance + interceptors
│   ├── queryClient.ts        → TanStack Query client config
│   ├── errors.ts             → AppError class
│   └── logger.ts             → logger utility
│
├── hooks/                    → hooks shared across 2+ features
│   ├── useDebounce.ts
│   └── useMediaQuery.ts
│
├── types/                    → global TypeScript types
│   ├── api.ts                → ApiResponse, ApiError, PaginatedResponse
│   └── index.ts
│
└── constants/
    └── index.ts              → ROUTES, API_ENDPOINTS, ROLES
```

---

## Data Flow
```
Page (thin — layout + imports only)
  ↓
Feature Component (e.g. UserList)
  ↓
Feature Hook (e.g. useUsers)        ← TanStack Query
  ↓
Feature API (e.g. userApi.ts)       ← Axios function
  ↓
lib/axios.ts                        ← instance + interceptors
  ↓
Backend REST API
```

---

## lib/axios.ts Pattern
```typescript
import axios from 'axios'
import { AppError } from '@/lib/errors'
import { useAuthStore } from '@/stores/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// Request interceptor — attach access token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor — handle errors + 401 refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const { accessToken } = await refreshToken()
        useAuthStore.getState().setAccessToken(accessToken)
        original.headers.Authorization = `Bearer ${accessToken}`
        return api(original)
      } catch {
        useAuthStore.getState().clearAuth()
        window.location.href = '/login'
      }
    }

    const { code, message } = error.response?.data ?? {}
    throw new AppError(code ?? 'UNKNOWN_ERROR', message ?? 'Something went wrong', error.response?.status ?? 500)
  }
)

export default api
```

---

## lib/queryClient.ts Pattern

Use TanStack Query **when** this project has cached server state on the client. If the project has no such need, this section does not apply — the rules are optional.

```typescript
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,    // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})
```

---

## lib/errors.ts Pattern
```typescript
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 500,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
```

---

## lib/logger.ts Pattern
```typescript
const isDev = import.meta.env.DEV

export const logger = {
  info: (...args: unknown[]) => { if (isDev) console.log('[INFO]', ...args) },
  warn: (...args: unknown[]) => { if (isDev) console.warn('[WARN]', ...args) },
  error: (...args: unknown[]) => { console.error('[ERROR]', ...args) },
}
```

---

## Feature API Pattern
```typescript
// features/users/api/userApi.ts
import api from '@/lib/axios'
import type { User, CreateUserInput } from '@/features/users/types'

export const userApi = {
  getAll: () =>
    api.get<ApiResponse<User[]>>('/users').then(r => r.data.data),

  getById: (id: string) =>
    api.get<ApiResponse<User>>(`/users/${id}`).then(r => r.data.data),

  create: (input: CreateUserInput) =>
    api.post<ApiResponse<User>>('/users', input).then(r => r.data.data),

  update: (id: string, input: Partial<CreateUserInput>) =>
    api.patch<ApiResponse<User>>(`/users/${id}`, input).then(r => r.data.data),

  delete: (id: string) =>
    api.delete(`/users/${id}`),
}
```

---

## Feature Hook Pattern
```typescript
// features/users/hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userApi } from '@/features/users/api/userApi'
import { logger } from '@/lib/logger'

const QUERY_KEY = ['users'] as const

export function useUsers() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: userApi.getAll,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: userApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
    onError: (error) => {
      logger.error('createUser failed:', error)
    },
  })
}
```

---

## Zustand Store Pattern

Use Zustand **when** this project has shared UI state that persists across components but is not server data. If the project has no such need, this section does not apply — the rules are optional.

```typescript
// stores/authStore.ts
import { create } from 'zustand'

type AuthState = {
  accessToken: string | null
  user: User | null
  setAccessToken: (token: string) => void
  setUser: (user: User) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setAccessToken: (token) => set({ accessToken: token }),
  setUser: (user) => set({ user }),
  clearAuth: () => set({ accessToken: null, user: null }),
}))
```

---

## Route Protection Pattern
```typescript
// components/shared/PrivateRoute.tsx
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user)
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

// app/router.tsx
<Route path="/dashboard" element={
  <PrivateRoute>
    <DashboardPage />
  </PrivateRoute>
} />
```

---

## constants/index.ts Pattern
```typescript
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  USERS: '/users',
} as const

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
  },
  USERS: {
    BASE: '/users',
    ME: '/users/me',
    BY_ID: (id: string) => `/users/${id}`,
  },
} as const

export const ROLES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const

export type UserRole = typeof ROLES[keyof typeof ROLES]
```

---

## Component Rules

### ui/ components — dumb primitives
```typescript
// ✅ no business logic, no API calls, no routing knowledge
export function Button({ children, variant = 'primary', ...props }: ButtonProps) {
  return <button className={cn(styles.button, styles[variant])} {...props}>{children}</button>
}

// ❌ ui/ component with API call or app knowledge
export function UserButton() {
  const { data: user } = useUser()   // ← wrong layer
  return <button>{user.name}</button>
}
```

### pages/ — thin composers
```typescript
// ✅ page imports and composes, no logic
export default function UsersPage() {
  return (
    <PageLayout>
      <PageHeader title="Users" />
      <UserList />
    </PageLayout>
  )
}

// ❌ page with logic
export default function UsersPage() {
  const [users, setUsers] = useState([])
  useEffect(() => { fetchUsers().then(setUsers) }, [])  // ← belongs in hook
  return <div>{users.map(...)}</div>
}
```

---

## Vite Config
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

---

## Agent Quick Reference
```
New feature?
  → Create src/features/[name]/api/ hooks/ components/ schemas/ types/

New API call?
  → features/[name]/api/[name]Api.ts
  → Use api from lib/axios.ts
  → Never call axios directly from component

New hook?
  → features/[name]/hooks/use[Name].ts
  → Use TanStack Query useQuery or useMutation

New page?
  → src/pages/[name]/[Name]Page.tsx
  → Register in app/router.tsx
  → Page is thin — no logic inside

New shared hook (2+ features)?
  → src/hooks/use[Name].ts

New global state?
  → src/stores/[name]Store.ts (Zustand)

New global type?
  → src/types/

New constant?
  → src/constants/index.ts

Protected route?
  → Wrap in <PrivateRoute /> in router.tsx

Error in component?
  → Catch in hook, not component
  → Route on error.code, not error.message
```
