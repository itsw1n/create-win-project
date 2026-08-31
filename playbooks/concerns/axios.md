# Axios — HTTP Client

> **When to use:** Any stack that communicates with a REST API via a typed axios client.
> Next.js uses `apiFetch` (server-only). React Vite and React Native use this pattern.

---

# 1. One Shared Client

Never create ad-hoc axios instances per feature. One shared `apiClient` for all HTTP calls.

```ts
// lib/apiClient.ts
import axios from 'axios'
import { ENV } from '@/config/env'  // RN
// import { env } from '@/lib/env'  // React Vite — adjust import to your env helper

const http = axios.create({
  baseURL: ENV.API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
})

http.interceptors.request.use(async (config) => {
  const token = await tokenStorage.get() // RN: expo-secure-store
  // const token = localStorage.getItem('token') // React Vite (or cookie-based)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const appError: AppError = {
      status: error.response?.status ?? 0,
      code: error.response?.data?.code ?? 'NETWORK_ERROR',
      message: error.response?.data?.message ?? error.message,
    }
    return Promise.reject(appError)
  }
)

export const apiClient = {
  get:    <T>(path: string)                 => http.get<T, T>(path),
  post:   <T>(path: string, body?: unknown) => http.post<T, T>(path, body),
  put:    <T>(path: string, body?: unknown) => http.put<T, T>(path, body),
  patch:  <T>(path: string, body?: unknown) => http.patch<T, T>(path, body),
  delete: <T>(path: string)                 => http.delete<T, T>(path),
}
```

---

# 2. AppError Type

Errors are normalized in the response interceptor. Everything above sees `AppError` only.

```ts
// types/errors.ts  (web: src/types/errors.ts | RN: types/errors.ts)
export type AppError = {
  status: number
  code: string
  message: string
}

export function isAppError(err: unknown): err is AppError {
  return typeof err === 'object' && err !== null && 'code' in err && 'status' in err
}
```

---

# 3. Service Calls apiClient, Hook Calls Service

```ts
// features/products/services/productService.ts
import { apiClient } from '@/lib/apiClient'

export const productService = {
  getAll: (): Promise<Product[]>              => apiClient.get('/products'),
  getById: (id: string): Promise<Product>    => apiClient.get(`/products/${id}`),
  create: (input: CreateProductInput)         => apiClient.post<Product>('/products', input),
  delete: (id: string): Promise<void>         => apiClient.delete(`/products/${id}`),
}
```

Hooks call `productService`. Never call `apiClient` directly from a hook.

---

# 4. Rules

- One `apiClient` instance. Never create new axios instances per feature.
- Auth token injection → request interceptor only. Not in every service call.
- Error normalization → response interceptor only. Services receive `AppError`.
- Route on `error.code`, never `error.message` — codes are stable, messages change.
- Services are the only callers of `apiClient`. Hooks call services.

---

# 5. Platform Notes

> **React Native** — token storage uses `expo-secure-store` via a `tokenStorage` helper.
> Never use `localStorage` in React Native — it does not exist.

> **React Vite** — token storage typically uses `localStorage` or an httpOnly cookie.
> Adjust the request interceptor accordingly.

---

# 6. Agent Quick Reference

```text
New API endpoint?         → new method in features/[name]/services/[name]Service.ts
                          → calls apiClient, never raw fetch/axios
Hook needs data?          → call service from hook, not apiClient directly
Auth not attaching?       → check request interceptor in lib/apiClient.ts
Error not normalized?     → check response interceptor in lib/apiClient.ts
New error code to handle? → route on error.code in the hook or component
```
