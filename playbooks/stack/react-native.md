# React Native (Expo) — Production Architecture & Agent Rules

> **Purpose:** Architectural rulebook for AI/agentic coding in a production React Native application using Expo managed workflow.
> **Core philosophy:** Everything runs on the client — there is no server boundary in the app. Be explicit about where data lives, where side effects happen, and how the UI reacts to state. Complexity should earn abstraction.

---

# 1. The One-Sentence Mental Model

```text
SCREEN (Expo Router route entry point)
  → FEATURE COMPONENTS (UI composition)
    → HOOKS (data + business logic)
      → SERVICES (API / business operations)
        → API CLIENT (infrastructure)
```

Responsibility map. Not a rule that every feature must contain every layer.

---

# 2. Stack

| Concern | Tool | Notes |
|---|---|---|
| Runtime | Expo managed workflow | No native build config required |
| Navigation | Expo Router (file-based) | Same mental model as Next.js App Router |
| Styling | NativeWind v4 | Tailwind classes on RN components |
| Server state | TanStack Query | Fetch, cache, loading, error |
| Client state | Zustand | Shared app state only |
| Forms | React Hook Form + Zod | Same pattern as the Next.js playbook |
| Secure storage | expo-secure-store | Auth tokens, sensitive data |
| Backend | Agnostic | Spring Boot or Supabase — swaps at API client layer |

---

# 3. Golden Rules

1. **Screens are entry points, not business logic containers.**
2. Keep components focused on rendering. Move logic into hooks.
3. Never fetch data directly inside a component body — use a hook.
4. There is no server. Every network call is a side effect.
5. Use a single typed API client. Do not scatter `fetch` calls across files.
6. Validate untrusted data at the API boundary before trusting it in the app.
7. Keep navigation concerns out of feature components.
8. Local state first. Global store only when state must cross multiple screens.
9. Use TanStack Query for server data. Do not put fetched data in Zustand.
10. Never store tokens or sensitive data in plain `AsyncStorage` — use `expo-secure-store`.
11. Authorization on real data is enforced server-side. The app enforces UX only.
12. Do not duplicate business logic across screens. Extract into a shared service or hook.
13. Every screen that fetches data must handle the loading and error states visually.
14. Separate platform-specific code cleanly. Use `.ios.ts` / `.android.ts` only when unavoidable.
15. Medium is the default — every feature gets a hook layer. Escalate to a service layer when business rules grow.
16. Complexity should earn abstraction.
17. Follow existing project conventions before introducing a new pattern.
18. Do not create architectural layers merely for ceremony.

---

# 4. The Most Important Distinction: Entry Point vs Business Operation

```text
SCREEN      = how a user reaches a feature              (navigation entry point)
COMPONENT   = what the user sees and interacts with     (UI)
HOOK        = what data and logic the feature needs     (business operation)
SERVICE     = what the application actually does        (API / domain operation)
API CLIENT  = how the app communicates externally       (infrastructure)
```

Example: `ProductsScreen → ProductList → useProducts() → productService.getAll() → apiClient.get('/products')`.

The screen is the entry point. The hook owns the operation.

---

# 5. Navigation — Expo Router

Expo Router uses a file-based routing system identical in concept to Next.js App Router. Routes live in `app/`. Layouts use `_layout.tsx`.

```text
app/
├── _layout.tsx              Root layout (providers, auth gate)
├── (tabs)/
│   ├── _layout.tsx          Tab bar layout
│   ├── index.tsx            Home tab
│   └── profile.tsx          Profile tab
├── products/
│   ├── index.tsx            Products list screen
│   └── [id].tsx             Product detail screen (dynamic route)
└── auth/
    ├── login.tsx
    └── register.tsx
```

### Navigating between screens

```tsx
// Push to a screen
import { router } from 'expo-router';

router.push('/products/123');
router.replace('/auth/login');
router.back();
```

### Typed links (preferred)

```tsx
import { Link } from 'expo-router';

<Link href="/products/123">View Product</Link>
<Link href={{ pathname: '/products/[id]', params: { id: product.id } }}>
  View Product
</Link>
```

### Reading route params

```tsx
// app/products/[id].tsx
import { useLocalSearchParams } from 'expo-router';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: product, isLoading, error } = useProduct(id);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error.message} />;

  return <ProductDetail product={product} />;
}
```

### Auth gate in root layout

```tsx
// app/_layout.tsx
import { Slot, Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function RootLayout() {
  const user = useAuthStore((s) => s.user);

  return (
    <QueryClientProvider client={queryClient}>
      <NativeWindProvider>
        {user ? <Slot /> : <Redirect href="/auth/login" />}
      </NativeWindProvider>
    </QueryClientProvider>
  );
}
```

### Rules

- Navigation structure is defined by the file system. Do not duplicate it in a manual navigator.
- Feature components must NOT call `router.push()` deep in the component tree — pass a callback prop from the screen instead.
- Keep route files thin: they compose feature components, they do not own business logic.
- Auth redirects belong in `_layout.tsx`, not scattered across screens.

---

# 6. Screens

Screens are the top-level components at each route. They are entry points — they compose, they do not process.

```tsx
// app/products/index.tsx
import { useProducts } from '@/features/products/hooks/useProducts';
import { ProductList } from '@/features/products/components/ProductList';

export default function ProductsScreen() {
  const { data: products, isLoading, error } = useProducts();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error.message} />;

  return (
    <ProductList
      products={products ?? []}
      onPress={(id) => router.push(`/products/${id}`)}
    />
  );
}
```

### Rules

- Screens compose feature components — they must NOT contain large JSX trees themselves.
- Screens must NOT call `fetch`, `axios`, or `apiClient` directly.
- Screens own navigation callbacks and pass them as props to feature components.
- Loading and error states are handled at the screen level.

---

# 7. Feature Components

Feature components render UI for a specific feature. They receive data and callbacks as props.

```tsx
// features/products/components/ProductList.tsx
import { FlatList } from 'react-native';
import { ProductCard } from './ProductCard';

type Props = {
  products: Product[];
  onPress: (id: string) => void;
};

export function ProductList({ products, onPress }: Props) {
  return (
    <FlatList
      data={products}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ProductCard product={item} onPress={() => onPress(item.id)} />
      )}
      contentContainerClassName="px-4 py-2 gap-3"
    />
  );
}
```

### Rules

- Feature components own UI behavior: layout, conditional rendering, list rendering.
- Feature components must NOT call `fetch` or `apiClient` directly.
- Feature components must NOT call `router.push()` — receive a callback instead.
- Feature components are navigation-agnostic and independently testable.

---

# 8. Hooks — The Business Operation Layer

Hooks are where data fetching, mutations, and feature logic live.

### Read hook (TanStack Query)

```ts
// features/products/hooks/useProducts.ts
import { useQuery } from '@tanstack/react-query';
import { productService } from '../services/productService';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => productService.getAll(),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => productService.getById(id),
    enabled: !!id,
  });
}
```

### Mutation hook (TanStack Query)

```ts
// features/products/hooks/useCreateProduct.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProductInput) => productService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
```

### Query key convention

```text
Resource list:         ['products']
Resource by ID:        ['products', id]
Resource with filter:  ['products', { category, page }]
Nested resource:       ['products', productId, 'reviews']
```

### Rules

- One hook per cohesive concern: `useProducts`, `useProduct`, `useCreateProduct` — not one giant `useProductFeature`.
- Hooks must NOT render JSX.
- Hooks must NOT call `apiClient` directly — call a service.
- Hooks handle loading, error, and success states for the calling component.

---

# 9. Services — Application Operations

A service is a plain object that performs a meaningful application operation against the API.

```ts
// features/products/services/productService.ts
import { apiClient } from '@/lib/apiClient';
import type { Product, CreateProductInput } from '../types';

export const productService = {
  getAll(): Promise<Product[]> {
    return apiClient.get('/products');
  },

  getById(id: string): Promise<Product> {
    return apiClient.get(`/products/${id}`);
  },

  create(input: CreateProductInput): Promise<Product> {
    return apiClient.post('/products', input);
  },

  update(id: string, input: Partial<CreateProductInput>): Promise<Product> {
    return apiClient.patch(`/products/${id}`, input);
  },

  delete(id: string): Promise<void> {
    return apiClient.delete(`/products/${id}`),
  },
};
```

### Rules

- Services must NOT import React or call hooks.
- Services must NOT contain navigation calls.
- Multiple hooks can use the same service — this is the point.
- Services are the single entry point for feature-specific API calls. Hooks must NOT call `apiClient` directly.

---

# 10. API Client — Infrastructure

One shared typed API client for all HTTP communication.

### Spring Boot backend

```ts
// lib/apiClient.ts
import axios from 'axios';
import { tokenStorage } from './tokenStorage';
import { ENV } from '@/config/env';

const http = axios.create({
  baseURL: ENV.API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
});

http.interceptors.request.use(async (config) => {
  const token = await tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const appError: AppError = {
      status: error.response?.status ?? 0,
      code: error.response?.data?.code ?? 'NETWORK_ERROR',
      message: error.response?.data?.message ?? error.message,
    };
    return Promise.reject(appError);
  }
);

export const apiClient = {
  get:    <T>(path: string)                    => http.get<T, T>(path),
  post:   <T>(path: string, body?: unknown)    => http.post<T, T>(path, body),
  put:    <T>(path: string, body?: unknown)    => http.put<T, T>(path, body),
  patch:  <T>(path: string, body?: unknown)    => http.patch<T, T>(path, body),
  delete: <T>(path: string)                    => http.delete<T, T>(path),
};
```

### Supabase backend

When using Supabase, the API client is the Supabase JS client — not axios. Services call Supabase directly; the pattern above stays the same at the hook level.

```ts
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { ENV } from '@/config/env';

export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY);
```

```ts
// features/products/services/productService.ts (Supabase variant)
import { supabase } from '@/lib/supabase';

export const productService = {
  async getAll(): Promise<Product[]> {
    const { data, error } = await supabase.from('products').select('*');
    if (error) throw { status: 500, code: error.code, message: error.message };
    return data;
  },
};
```

### Rules

- One `apiClient` instance. Do not create ad-hoc axios instances per feature.
- Auth token injection belongs in the request interceptor, not in every service.
- Error normalization belongs in the response interceptor. Services receive `AppError`, not raw errors.
- Retry logic, timeouts, and base URL are configured here. Features do not configure transport.

---

# 11. State — Local vs Shared vs Server

```text
Local UI state (modal open, tab, form input)    → useState / useReducer
Complex local multi-step state                  → useReducer
Server / remote data                            → TanStack Query
Shared app state (auth user, cart, settings)   → Zustand store
Navigation state                                → Expo Router
```

Ask: **who needs this state?**

```text
One component               → useState
One screen                  → useState / useReducer
Multiple screens/features   → Zustand
Fetched from server         → TanStack Query (never Zustand)
```

---

# 12. Zustand for Shared Client State

```ts
// stores/authStore.ts
import { create } from 'zustand';

type AuthState = {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}));
```

### Rules

- Do not put server data in Zustand — TanStack Query handles that.
- Do not put UI-local state in Zustand — `useState` handles that.
- Keep stores narrow: one store per domain concern (`authStore`, `cartStore`, `settingsStore`).
- Avoid a single giant global store.

---

# 13. Styling — NativeWind v4

NativeWind brings Tailwind CSS utility classes to React Native. If you know Tailwind for web, you already know this.

### Key differences from web Tailwind

| Web | React Native / NativeWind |
|---|---|
| Cascade inheritance | No cascade — every component is isolated |
| `rem` units | No `rem` — use numeric Tailwind scale (`text-base`, `p-4`) |
| `vh` / `vw` | Use `flex-1`, `w-screen`, or `Dimensions` |
| Media queries | Use `Platform.OS` checks or Tailwind `ios:` / `android:` variants |
| CSS `shadow` | `shadow-md` (iOS) + `elevation-*` (Android) — NativeWind handles both |
| `hover:` | `active:` for press states on mobile |
| `<div>` | `<View>` |
| `<p>`, `<span>` | `<Text>` — all visible text must be in `<Text>` |

### Basic component example

```tsx
import { View, Text, TouchableOpacity } from 'react-native';

export function PrimaryButton({ title, onPress, disabled }: Props) {
  return (
    <TouchableOpacity
      className="bg-blue-600 px-4 py-3 rounded-xl active:opacity-75 disabled:opacity-50"
      onPress={onPress}
      disabled={disabled}
    >
      <Text className="text-white font-semibold text-base text-center">
        {title}
      </Text>
    </TouchableOpacity>
  );
}
```

### Layout

```tsx
// Column layout (default — flexDirection is 'column' in RN, not 'row')
<View className="flex-1 px-4 py-6 gap-4">
  <Text className="text-2xl font-bold text-gray-900">Title</Text>
  <Text className="text-base text-gray-500">Subtitle</Text>
</View>

// Row layout
<View className="flex-row items-center justify-between px-4 py-3">
  <Text className="text-base font-medium text-gray-900">{label}</Text>
  <ChevronRight size={16} className="text-gray-400" />
</View>
```

### Card

```tsx
<View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
  {children}
</View>
```

### Safe area

Always wrap screen content in `SafeAreaView` or use the `safe-area` inset classes:

```tsx
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* content */}
    </SafeAreaView>
  );
}
```

### Platform variants

```tsx
<View className="p-4 ios:pt-6 android:pt-4">
  {/* iOS gets extra top padding */}
</View>
```

### Dark mode

```tsx
<View className="bg-white dark:bg-gray-900">
  <Text className="text-gray-900 dark:text-white">Hello</Text>
</View>
```

NativeWind reads the system color scheme automatically.

### Design tokens — `tailwind.config.ts`

Extend the Tailwind config for project-specific tokens. Never use magic colors or spacing values in className strings.

```ts
// tailwind.config.ts
export default {
  content: ['./app/**/*.tsx', './features/**/*.tsx', './components/**/*.tsx'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#3B82F6',
          dark: '#1D4ED8',
        },
        surface: '#F9FAFB',
      },
      borderRadius: {
        card: '16px',
      },
    },
  },
};
```

```tsx
// Use token, not magic value
<View className="bg-brand rounded-card">
```

### StyleSheet — when to use it

Use `StyleSheet` only for styles that NativeWind cannot express: animated values, dynamic styles computed from JS, complex transforms.

```tsx
import { StyleSheet, Animated } from 'react-native';

// NativeWind for static layout, StyleSheet for animated transform
<Animated.View
  className="bg-white rounded-2xl"
  style={[styles.card, { transform: [{ scale: animatedScale }] }]}
/>

const styles = StyleSheet.create({
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
});
```

### Rules

- Use NativeWind by default. Fall back to `StyleSheet` only when NativeWind cannot express it.
- Do NOT mix inline `style={{}}` objects, `StyleSheet`, and `className` for the same concern in the same component.
- All visible text must live inside a `<Text>` component — no bare strings.
- `flexDirection` defaults to `column` in React Native — the opposite of web CSS.
- Use `active:` not `hover:` for press states.
- Wrap screen root in `SafeAreaView` always.
- Design tokens go in `tailwind.config.ts`. No magic colors or spacing numbers in JSX.

---

# 14. Forms

```tsx
// features/auth/components/LoginForm.tsx
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '../schemas/auth.schema';

export function LoginForm({ onSubmit }: { onSubmit: (data: LoginInput) => void }) {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  return (
    <View className="gap-4">
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <View className="gap-1">
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && (
              <Text className="text-sm text-red-500">{errors.email.message}</Text>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <View className="gap-1">
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Password"
              secureTextEntry
            />
            {errors.password && (
              <Text className="text-sm text-red-500">{errors.password.message}</Text>
            )}
          </View>
        )}
      />

      <PrimaryButton
        title={isSubmitting ? 'Logging in...' : 'Log in'}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
      />
    </View>
  );
}
```

---

# 15. Validation and Schemas

```ts
// features/auth/schemas/auth.schema.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

### Schema placement

```text
Feature form or mutation?     → features/[name]/schemas/[name].schema.ts
Shared across features?       → src/schemas/[name].schema.ts
API response shape?           → features/[name]/types.ts (type) or schema if parsed at boundary
```

---

# 16. Error Handling

Normalize all errors to `AppError` at the API client layer. Everything above it works with `AppError` only.

```ts
// lib/errors.ts
export type AppError = {
  status: number;
  code: string;
  message: string;
};

export function toAppError(err: unknown): AppError {
  if (isAppError(err)) return err;
  if (err instanceof Error) return { status: 0, code: 'UNKNOWN', message: err.message };
  return { status: 0, code: 'UNKNOWN', message: 'Something went wrong' };
}

export function isAppError(err: unknown): err is AppError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'status' in err
  );
}
```

### In screens

```tsx
const { data, isLoading, error } = useProducts();

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorState code={error.code} message={error.message} />;
```

### Rules

- Route on `error.code`, never on `error.message` — messages change; codes are stable.
- Every screen that fetches must handle the error state visually. Never silently swallow errors.
- Use a global error boundary (`ErrorBoundary`) for unexpected React render errors.

---

# 17. Secure Storage

```ts
// lib/tokenStorage.ts
import * as SecureStore from 'expo-secure-store';

export const tokenStorage = {
  get: ()                => SecureStore.getItemAsync('auth_token'),
  set: (token: string)   => SecureStore.setItemAsync('auth_token', token),
  clear: ()              => SecureStore.deleteItemAsync('auth_token'),
};
```

### Rules

| Data type | Storage |
|---|---|
| Auth tokens | `expo-secure-store` |
| PII, payment data | Never stored locally — fetch from server |
| User preferences (theme, language) | `AsyncStorage` |
| App state | Zustand (in-memory) |

---

# 18. Environment Variables

```ts
// config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_API_BASE_URL: z.string().url(),
  EXPO_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  EXPO_PUBLIC_APP_ENV: z
    .enum(['development', 'staging', 'production'])
    .default('development'),
});

export const ENV = envSchema.parse({
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
});
```

### Rules

- All Expo client-side env vars must be prefixed `EXPO_PUBLIC_` — otherwise they are stripped at build time.
- Validate at startup with Zod — fail loudly if required vars are missing.
- Never hardcode URLs or keys in source files.
- Keep `.env.example` current whenever a new variable is added.

---

# 19. Folder Structure

```text
src/
├── app/                     Expo Router routes (file = route)
│   ├── _layout.tsx          Root layout — providers, auth gate
│   ├── (tabs)/
│   │   ├── _layout.tsx      Tab bar
│   │   ├── index.tsx        Home tab
│   │   └── profile.tsx
│   ├── products/
│   │   ├── index.tsx        Product list screen
│   │   └── [id].tsx         Product detail screen
│   └── auth/
│       ├── login.tsx
│       └── register.tsx
├── features/                Feature-specific code
│   └── products/
│       ├── components/      ProductList.tsx  ProductCard.tsx  ProductForm.tsx
│       ├── hooks/           useProducts.ts   useProduct.ts   useCreateProduct.ts
│       ├── services/        productService.ts
│       ├── schemas/         product.schema.ts
│       └── types.ts
├── components/
│   ├── ui/                  Button  Input  Card  Modal  Badge  LoadingSpinner  ErrorState
│   └── shared/              Header  EmptyState  PageHeader  UserAvatar
├── stores/                  authStore.ts  cartStore.ts  settingsStore.ts
├── lib/                     apiClient.ts  supabase.ts  tokenStorage.ts  errors.ts  logger.ts
├── config/                  env.ts  theme.ts (tailwind token extensions)  constants.ts
└── types/                   Global TypeScript types — User  Product  AppError
```

---

# 20. Folder Responsibility Matrix

| Folder | Put here | Do not put here |
|---|---|---|
| `app/` | Route files, layouts, auth gate | Business logic, direct API calls |
| `features/*/components` | Feature UI, receives props | API calls, navigation logic |
| `features/*/hooks` | Data fetching, mutations, local logic | JSX, navigation, apiClient calls |
| `features/*/services` | API operations, business rules | React hooks, navigation |
| `features/*/schemas` | Zod schemas | DB queries, UI logic |
| `features/*/types.ts` | Feature TypeScript types | Runtime logic |
| `components/ui` | Generic reusable primitives | Feature-specific logic |
| `components/shared` | Cross-feature UI | Business logic |
| `stores/` | Shared client state | Server data (use TanStack Query) |
| `lib/` | Shared infrastructure | Feature business logic |
| `config/` | Env, theme tokens, constants | Business rules |

---

# 21. A Realistic Products Feature

```text
features/products/
├── components/   ProductList.tsx  ProductCard.tsx  ProductForm.tsx
├── hooks/        useProducts.ts   useProduct.ts    useCreateProduct.ts
├── services/     productService.ts
├── schemas/      product.schema.ts
└── types.ts
```

**Read:** `app/products/index.tsx → useProducts() → productService.getAll() → apiClient.get('/products')`
**Mutation:** `ProductForm → useCreateProduct() → productService.create(input) → apiClient.post('/products') → invalidate ['products']`

---

# 22. Default Architecture: Medium

Medium is the floor. Every feature with data:

```text
features/[name]/
├── components/
├── hooks/
├── services/
├── schemas/
└── types.ts
```

Flow: `Screen → Component → Hook → Service → API Client`

Escalate to a richer service layer (multiple services, more granular hooks) when business rules grow. Never go below Medium.

---

# 23. Anti-Pattern: Business Logic in Screens

```tsx
// BAD — screen owns fetching and filtering
export default function ProductsScreen() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch(`${ENV.EXPO_PUBLIC_API_BASE_URL}/products`)
      .then(r => r.json())
      .then(data => setProducts(data.filter(p => p.active)));
  }, []);

  return <ProductList products={products} />;
}
```

```tsx
// GOOD — screen composes, hook handles data
export default function ProductsScreen() {
  const { data: products, isLoading, error } = useActiveProducts();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error.message} />;

  return <ProductList products={products ?? []} onPress={(id) => router.push(`/products/${id}`)} />;
}
```

---

# 24. Anti-Pattern: Raw fetch in a Hook

```ts
// BAD — raw fetch, no auth, no error normalization
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('https://api.example.com/products');
      return res.json();
    },
  });
}
```

```ts
// GOOD — service handles transport
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => productService.getAll(),
  });
}
```

---

# 25. Anti-Pattern: Server Data in Zustand

```ts
// BAD — duplicates TanStack Query's job
const useProductStore = create((set) => ({
  products: [],
  fetchProducts: async () => {
    const data = await productService.getAll();
    set({ products: data });
  },
}));
```

Use `useQuery` instead. Zustand is for client state that is NOT fetched from a server.

---

# 26. Anti-Pattern: Navigation in Feature Components

```tsx
// BAD — component is coupled to navigation
export function ProductCard({ product }: Props) {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.push(`/products/${product.id}`)}>
      ...
    </TouchableOpacity>
  );
}
```

```tsx
// GOOD — navigation-agnostic, receives callback
export function ProductCard({ product, onPress }: Props) {
  return (
    <TouchableOpacity onPress={onPress}>
      ...
    </TouchableOpacity>
  );
}

// In screen:
<ProductCard product={item} onPress={() => router.push(`/products/${item.id}`)} />
```

---

# 27. Anti-Pattern: Tokens in AsyncStorage

```ts
// BAD
await AsyncStorage.setItem('token', accessToken);
```

```ts
// GOOD
await tokenStorage.set(accessToken); // expo-secure-store under the hood
```

---

# 28. Agentic Coding Rules

## Rule A — Inspect before changing
Inspect the route file, feature folder, existing hooks, services, schemas, and types before implementing. Follow existing conventions. Never invent a parallel architecture if one exists.

## Rule B — Reuse before creating
Before creating `productService.getAll()` or `useProducts()`, search for existing equivalents. Never duplicate.

## Rule C — Preserve feature ownership
Change to Products → `features/products/`. Auth → `features/auth/`. Never put feature logic in `lib/` for convenience.

## Rule D — Hook first, store second
State: `useState` → `useReducer` → Zustand. Only escalate when state genuinely needs to cross multiple screens.

## Rule E — TanStack Query for server data, Zustand for client state
Never put fetched data in Zustand. Never re-implement caching TanStack Query already provides.

## Rule F — Service before apiClient
Hooks call services. Services call `apiClient`. Hooks must NOT call `apiClient` directly.

## Rule G — Keep screens thin
Screens render and compose. Business logic and data fetching belong in hooks and services.

## Rule H — Error state is not optional
Every screen that fetches must handle the error case visually. Never assume a query always succeeds.

## Rule I — Don't over-engineer
Before adding a service, store, or abstraction, ask: "What complexity does this solve?" If none — keep it simpler.

## Rule J — NativeWind for styling
Use `className` with Tailwind classes. Fall back to `StyleSheet` only for animated values or dynamic JS-computed styles. No magic numbers — extend `tailwind.config.ts` for tokens.

## Rule K — Secure storage for sensitive data
Auth tokens → `expo-secure-store` via `tokenStorage`. Never `AsyncStorage`.

## Rule L — Authorization is server-side
Hiding a button based on a role is UX. The server enforces authorization.

## Rule M — Validate at boundaries
Validate API responses and user input with Zod before they reach hooks or components.

## Rule N — All env vars must be EXPO_PUBLIC_ prefixed
Client-side env vars without the `EXPO_PUBLIC_` prefix are stripped at build time and will be `undefined` at runtime.

## Rule O — Wrap screen root in SafeAreaView
Every screen must handle safe area insets. Wrap the root `View` with `SafeAreaView` from `react-native-safe-area-context`.

---

# 29. Agent Decision Tree

```text
NEW FEATURE?
  → UI only (no data)?
      YES → Component in features/[name]/components/
  → Needs data from API?
      → Read?
          → Hook: useQuery + service.getAll() / getById()
          → queryKey: ['resource'] or ['resource', id]
      → Write / mutation?
          → Hook: useMutation + service.create() / update() / delete()
          → invalidateQueries({ queryKey: ['resource'] }) on success
  → Needs shared state across screens?
      → Zustand store in stores/[name]Store.ts
      → Is it server data? → TanStack Query instead
  → Complex form?
      → Zod schema in features/[name]/schemas/
      → React Hook Form + zodResolver in component
  → New API endpoint?
      → New method in features/[name]/services/[name]Service.ts
      → Calls apiClient — never raw fetch
  → New env variable?
      → Add to config/env.ts Zod schema
      → Add to .env.example with a comment
      → Must be prefixed EXPO_PUBLIC_ to be available at runtime
```

---

# 30. Agent Quick Reference

```text
New route / screen?              → app/[path].tsx (Expo Router)
                                 → Thin: compose feature components
New feature component?           → features/[name]/components/
New data fetch (read)?           → useQuery hook → features/[name]/hooks/
                                 → queryKey: ['resource'] or ['resource', id]
New mutation?                    → useMutation hook → features/[name]/hooks/
                                 → invalidateQueries on success
New API operation?               → features/[name]/services/[name]Service.ts
                                 → calls apiClient, never fetch directly
New form?                        → Zod schema in features/[name]/schemas/
                                 → React Hook Form + zodResolver
New shared state?                → Zustand store in stores/[name]Store.ts
                                 → server data → TanStack Query instead
New env variable?                → config/env.ts (Zod schema + EXPO_PUBLIC_ prefix)
                                 → .env.example with comment
Secure token storage?            → lib/tokenStorage.ts (expo-secure-store)
New UI primitive?                → components/ui/
New cross-feature UI?            → components/shared/
New design token?                → tailwind.config.ts (colors, spacing, radius)
Navigate between screens?        → router.push() in screen, pass callback prop to components
Screen needs safe area?          → SafeAreaView from react-native-safe-area-context
Platform-specific style?         → ios: / android: NativeWind variants
Animated / dynamic style?        → StyleSheet (alongside NativeWind className)
Error in screen?                 → if (error) return <ErrorState ... /> (never skip this)
Loading in screen?               → if (isLoading) return <LoadingSpinner /> (never skip this)
```
