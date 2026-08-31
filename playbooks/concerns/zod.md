# Zod + React Hook Form — Validation

> **When to use:** Any project with forms or untrusted input (API responses, URL params, env vars).

---

# 1. Schema First, Always

Write the Zod schema before writing the form component or service. The schema is the source of truth.

```ts
// features/auth/schemas/login.schema.ts
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type LoginInput = z.infer<typeof loginSchema>
```

Never write a separate TypeScript type for form data — infer it from the schema.

---

# 2. Schema Placement

```text
Feature-specific form?           → features/[name]/schemas/[name].schema.ts
Shared across multiple features? → src/schemas/[name].schema.ts  (web)
                                   schemas/[name].schema.ts       (RN)
API response shape?              → features/[name]/types.ts (type only, no runtime parse needed)
                                   OR parse with z.safeParse() at the API boundary if strict
```

---

# 3. Web Form (React Hook Form)

```tsx
// features/auth/components/LoginForm.tsx
'use client' // Next.js only — omit for React Vite
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '../schemas/login.schema'

export function LoginForm({ onSubmit }: { onSubmit: (data: LoginInput) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} placeholder="Email" />
      {errors.email && <span>{errors.email.message}</span>}

      <input type="password" {...register('password')} placeholder="Password" />
      {errors.password && <span>{errors.password.message}</span>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Login'}
      </button>
    </form>
  )
}
```

---

# 4. React Native Form (React Hook Form + Controller)

React Native has no native `<input>` — use `Controller` to bridge RHF with RN's `TextInput`.

```tsx
// features/auth/components/LoginForm.tsx  (React Native)
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '../schemas/login.schema'

export function LoginForm({ onSubmit }: { onSubmit: (data: LoginInput) => void }) {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  return (
    <View className="gap-4">
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextInput
            value={field.value}
            onChangeText={field.onChange}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        )}
      />
      {errors.email && <Text>{errors.email.message}</Text>}

      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextInput
            value={field.value}
            onChangeText={field.onChange}
            placeholder="Password"
            secureTextEntry
          />
        )}
      />
      {errors.password && <Text>{errors.password.message}</Text>}

      <PrimaryButton
        title={isSubmitting ? 'Submitting...' : 'Login'}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
      />
    </View>
  )
}
```

---

# 5. Validating API Responses

Parse untrusted data at the boundary, not deep in hooks or components.

```ts
// features/products/services/productService.ts
import { z } from 'zod'

const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
})

export async function getProduct(id: string) {
  const raw = await apiClient.get(`/products/${id}`)
  return productSchema.parse(raw) // throws if shape is wrong
}
```

---

# 6. Rules

- Schema first — always write the schema before the form.
- Never write a separate TypeScript type for form input — use `z.infer<typeof schema>`.
- Validate on the server too (or in the service) — never trust client-only validation.
- Use `z.string().min(1)` not `z.string().nonempty()` — better cross-platform compatibility.
- Route on `error.code` after submission, never on `error.message`.

---

# 7. Agent Quick Reference

```text
New form?                    → schema first in features/[name]/schemas/
                             → useForm + zodResolver
                             → web: register(); RN: Controller + TextInput
New type for form data?      → z.infer<typeof schema> instead
Validate API response?       → z.safeParse() or schema.parse() in service
Shared schema?               → src/schemas/ or schemas/ (not in features/)
```
