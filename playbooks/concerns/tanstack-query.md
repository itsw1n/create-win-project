# TanStack Query — Server State

> **When to use:** Any data fetched from a server or API that needs caching, background refetch,
> loading/error states, or invalidation after mutations.
> Required for React Native. Optional for web stacks.

---

# 1. The Mental Model

```text
TanStack Query owns:  fetch, cache, loading, error, background refetch, invalidation
Your code owns:       queryFn (calls a service), queryKey (cache identity)
```

Never manage loading/error state manually when TanStack Query can do it.

---

# 2. Query Key Convention

```text
Resource list:              ['products']
Resource by ID:             ['products', id]
Resource with filters:      ['products', { category, page }]
Nested resource:            ['products', productId, 'reviews']
Non-resource (dashboard):   ['dashboard', 'stats']
Auth session:               ['auth', 'session']
```

Keys are the cache identity. Same key = same cache entry. Be consistent.

---

# 3. Read Hook

```ts
// features/products/hooks/useProducts.ts
import { useQuery } from '@tanstack/react-query'
import { productService } from '../services/productService'

export const productKeys = {
  all: ['products'] as const,
  byId: (id: string) => ['products', id] as const,
  filtered: (filters: ProductFilters) => ['products', 'filtered', filters] as const,
}

export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: filters ? productKeys.filtered(filters) : productKeys.all,
    queryFn: () => productService.getAll(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.byId(id),
    queryFn: () => productService.getById(id),
    enabled: !!id,
  })
}
```

---

# 4. Mutation Hook

```ts
// features/products/hooks/useCreateProduct.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateProductInput) => productService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all })
    },
  })
}
```

---

# 5. QueryClient Setup

```ts
// lib/queryClient.ts  (web: src/lib/queryClient.ts)
// lib/queryClient.ts  (RN: lib/queryClient.ts)
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5min — most data
      retry: 1,
      refetchOnWindowFocus: false, // web only; ignored on RN
    },
  },
})
```

Stale time guide:
```text
Real-time (notifications, live status)  → staleTime: 0
Normal data (products, users, orders)   → staleTime: 1000 * 60 * 5  (5min)
Slow-changing (profile, settings)       → staleTime: 1000 * 60 * 30 (30min)
Static (categories, countries)          → staleTime: Infinity
```

---

# 6. Rules

- Hooks call services. Services call the API client. Never call `fetch` or `axios` directly in `queryFn`.
- Always define query keys in a `[resource]Keys` object — never inline magic strings.
- Always invalidate related query keys after a mutation succeeds.
- `enabled: !!id` — guard queries that depend on a param that may not exist yet.
- Never put query results in Zustand — TanStack Query IS your cache.

---

# 7. Platform Notes

> **React Native** — works identically. `refetchOnWindowFocus` is ignored (no window).
> Wrap the root component in `<QueryClientProvider client={queryClient}>` in your root layout.

> **Next.js** — Server Components do NOT use TanStack Query.
> TanStack Query is for Client Components that need cached/refetched server data.

---

# 8. Agent Quick Reference

```text
New data fetch?              → useQuery hook → features/[name]/hooks/
New mutation?                → useMutation hook → features/[name]/hooks/
                             → invalidateQueries on success
QueryKey for a list?         → ['resource']
QueryKey for a single item?  → ['resource', id]
Query depends on a param?    → enabled: !!param
Server data in Zustand?      → move to useQuery instead
```
