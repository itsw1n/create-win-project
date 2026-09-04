# next-safe-action — Type-Safe Server Actions (Next.js)

> **When to use:** Next.js projects using Server Actions that want typed, validated,
> and composable action middleware (auth guards, error handling).

---

# 1. Setup

```ts
// src/lib/safe-action.ts
import { createSafeActionClient } from 'next-safe-action'

// Unauthenticated actions
export const action = createSafeActionClient()

// Authenticated actions — throws if no session
export const authAction = createSafeActionClient({
  async middleware() {
    const user = await getCurrentUser()
    if (!user) throw new Error('UNAUTHORIZED')
    return { user }
  },
})
```

---

# 2. Defining an Action

```ts
// features/users/actions/createUser.action.ts
'use server'
import { authAction } from '@/lib/safe-action'
import { createUserSchema } from '@/features/users/schemas/user.schema'

export const createUserAction = authAction
  .schema(createUserSchema)
  .action(async ({ parsedInput: { name, email }, ctx: { user } }) => {
    // Input already validated by Zod, user already confirmed by middleware
    const created = await userService.create({ name, email, createdBy: user.id })
    revalidatePath('/users')
    return { user: created }
  })
```

---

# 3. Rules

- Every server action that touches protected data uses `authAction`, not `action`.
- Always call `revalidatePath` or `revalidateTag` after mutations that affect cached pages.
- Actions are entry points — business logic lives in services, not inside `.action()`.
- Schema validation is automatic — never manually parse `parsedInput`.

---

# 4. Agent Quick Reference

```text
New server action?           → features/[name]/actions/[name].action.ts
Public action (no auth)?     → action.schema(schema).action(...)
Protected action?            → authAction.schema(schema).action(...)
After mutation?              → revalidatePath('/affected-path')
Business logic in action?    → move to a service, call from action
```
