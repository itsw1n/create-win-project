# TypeScript Rules (Universal)

Applies to every TypeScript project.

---

## Strict Mode — Always On
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true
  }
}
```

These flags catch real bugs. Never disable them.

---

## No `any`
- Never use `any` unless absolutely unavoidable
- When unavoidable: add `// reason:` comment explaining why

```typescript
// ❌
const data: any = fetchUser()
function process(input: any) { ... }

// ✅
const data: unknown = fetchUser()
function process(input: UserInput) { ... }

// ✅ justified any with comment
// reason: third-party library has no types and @types package doesn't exist
const chart = new (window as any).ChartLib()
```

### Alternatives to `any`
| Instead of `any` | Use                     |
|------------------|-------------------------|
| Unknown data     | `unknown`               |
| Flexible object  | `Record<string, unknown>` |
| Multiple types   | Union `string \| number` |
| Optional         | `T \| undefined`        |
| Nullable         | `T \| null`             |

---

## Type vs Interface
```typescript
// Interface — for objects that may be extended or implemented
interface User {
  id: string
  name: string
  email: string
}

// Type — for unions, intersections, primitives, tuples
type UserId = string
type UserRole = 'ADMIN' | 'USER' | 'MODERATOR'
type ApiResponse<T> = { success: true; data: T } | { success: false; error: ApiError }
type UserWithRole = User & { role: UserRole }
```

### Rule
- Objects → `interface` (extends naturally, better error messages)
- Everything else → `type`
- Never use `I` prefix for interfaces (`IUser` → `User`)

---

## Discriminated Unions for State
```typescript
// ❌ scattered boolean flags
type State = {
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  data?: User
  error?: Error
}

// ✅ discriminated union — mutually exclusive states
type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: User }
  | { status: 'error'; error: Error }
```

---

## Unknown Over Any for Errors
```typescript
// ❌
} catch (error: any) {
  console.log(error.message)
}

// ✅
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error'
  logger.error(message)
}
```

---

## Generics
Use when genuinely reusable — not for ceremony.

```typescript
// ✅ genuinely reusable
function first<T>(array: T[]): T | undefined {
  return array[0]
}

// ✅ API response wrapper
type ApiResponse<T> = {
  success: true
  data: T
}

// ❌ unnecessary generic
function getUserName<T extends User>(user: T): string {
  return user.name
  // just use: function getUserName(user: User): string
}
```

---

## Zod for Runtime Validation
TypeScript types are compile-time only. Use Zod at runtime boundaries.

```typescript
// Define schema
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'USER']),
})

// Infer type from schema — single source of truth
type User = z.infer<typeof UserSchema>

// Validate at runtime
const user = UserSchema.parse(apiResponse.data)
```

### When to use Zod
- Form validation (via React Hook Form resolver)
- API response parsing
- Environment variable validation (t3-env)
- Any external data entering the system

---

## Where Types Live

### Decision tree
```
Is this type used across multiple features?
  → src/types/[name].ts

Is this type specific to one feature?
  → src/features/[name]/types/index.ts

Is this type a Zod schema + inferred type?
  → src/features/[name]/schemas/[name].schema.ts

Is this type for an API response shape?
  → src/types/api.ts
```

### Global types (src/types/)
```typescript
// src/types/api.ts
export type ApiSuccess<T> = { success: true; data: T }
export type ApiError = { code: string; message: string; details?: FieldError[]; traceId: string }
export type ApiResponse<T> = ApiSuccess<T> | ApiError

// src/types/pagination.ts
export type PaginatedResponse<T> = {
  data: T[]
  total: number
  page: number
  limit: number
}
```

---

## Type Assertions
Avoid `as` unless justified.

```typescript
// ❌ lying to TypeScript
const user = data as User

// ✅ validate first, then trust
const user = UserSchema.parse(data)

// ✅ justified assertion with comment
// reason: DOM ref is always set before this handler fires
const input = inputRef.current as HTMLInputElement
```

---

## Enums vs Union Types
Prefer union types over enums for most cases.

```typescript
// ❌ enum (compiles to weird JS, harder to iterate)
enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

// ✅ const object + union type (tree-shakeable, readable compiled output)
export const ROLES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const

export type UserRole = typeof ROLES[keyof typeof ROLES]
// → 'ADMIN' | 'USER'
```

---

## Null vs Undefined
```typescript
// Use null: explicitly absent (API returns null, user cleared a field)
type User = { avatar: string | null }

// Use undefined: optionally present (optional function param, optional object key)
type Options = { timeout?: number }

// Never mix without reason — pick one for each case and be consistent
```

---

## Agent Rules
```
strict: true — never disable, never add ts-ignore without // reason:

Type a new variable?
  → Use the most specific type possible
  → Infer from Zod schema if validating external data
  → Use unknown for error catch blocks

New shared type?
  → If used in 2+ features → src/types/
  → If feature-specific → features/[name]/types/

New form?
  → Zod schema first → infer type → pass to React Hook Form

Avoid:
  → any (use unknown)
  → type assertions without reason comment
  → enums (use const object + union type)
  → I prefix on interfaces
```
