# Coding Rules (Universal)

Applies to every project regardless of stack.

---

## Core Principle
```
simple + explicit + consistent
over
complex + abstract + theoretically pure
```

Complexity must earn abstraction. Start simple. Add layers only when justified.

---

## Naming

### Files
```
React components:   PascalCase    UserCard.tsx
Hooks:              camelCase     useUserData.ts
Utilities:          camelCase     formatDate.ts
Constants:          camelCase     apiEndpoints.ts
Types:              camelCase     userTypes.ts
CSS Modules:        PascalCase    UserCard.module.css
Java classes:       PascalCase    UserService.java
SQL migrations:     snake_case    V1__create_users_table.sql
```

### Variables and Functions
```
Variables:          camelCase     userName, isLoading, hasError
Functions:          camelCase     getUser(), createOrder(), formatDate()
Constants:          SCREAMING     MAX_RETRIES, API_BASE_URL
React components:   PascalCase    UserCard, LoginForm
Types/Interfaces:   PascalCase    UserResponse, ApiError
Enums:              PascalCase    UserRole, OrderStatus
```

### Name for what it does, not what it is
```
❌ getData(), handleThing(), doStuff(), temp, x
✅ getUserById(), handleLoginSubmit(), formatCurrency()
```

### Boolean naming
```
❌ user, loading, error
✅ isLoading, hasError, isAuthenticated, canEdit
```

---

## Functions
- One responsibility per function
- Max 3 parameters — if more, use an options object
- Return early to avoid deep nesting

```typescript
// ❌
function processUser(user, role, permissions, sendEmail, notify) { ... }

// ✅
function processUser(user: User, options: ProcessUserOptions) { ... }

// ❌ deep nesting
function getUser(id) {
  if (id) {
    if (isValid(id)) {
      // logic
    }
  }
}

// ✅ early return
function getUser(id) {
  if (!id) return null
  if (!isValid(id)) return null
  // logic
}
```

---

## Imports

### Frontend
- Always use absolute imports with `@/` prefix
- Never use relative `../../` imports
- Barrel exports (`index.ts`) for public API of a feature only

```typescript
// ❌
import { UserCard } from '../../../components/ui/UserCard'

// ✅
import { UserCard } from '@/components/ui/UserCard'
```

### Import Order (enforced by ESLint)
```
1. External libraries
2. Internal absolute (@/)
3. Types
4. Styles / assets
```

---

## Constants
- No magic numbers or strings in logic
- All constants in `src/constants/index.ts` or feature-level constants file

```typescript
// ❌
if (role === 'ADMIN') { ... }
setTimeout(fn, 900000)

// ✅
import { ROLES, TOKEN_EXPIRY } from '@/constants'
if (role === ROLES.ADMIN) { ... }
setTimeout(fn, TOKEN_EXPIRY.ACCESS)
```

---

## Async / Error Handling

### Frontend
- Always async/await — never `.then()` chains
- Always handle errors at the hook level, not component level
- Never swallow errors silently

```typescript
// ❌
fetchUser().then(data => setUser(data)).catch(e => console.log(e))

// ✅
try {
  const user = await fetchUser()
  setUser(user)
} catch (error) {
  logger.error('fetchUser failed:', error)
  throw error
}
```

### Backend
- Always throw `AppException` — never raw `RuntimeException`
- Never expose stack traces in API responses
- Always catch at the `GlobalExceptionHandler` level

```java
// ❌
throw new RuntimeException("User not found");

// ✅
throw new AppException("USER_NOT_FOUND", HttpStatus.NOT_FOUND);
```

---

## Logging
- NEVER use `console.log` directly
- Always use `lib/logger.ts` on frontend
- Always use SLF4J logger on backend

```typescript
// ❌
console.log('user:', user)
console.error('error:', error)

// ✅
import { logger } from '@/lib/logger'
logger.info('user fetched:', user)
logger.error('fetch failed:', error)
```

```java
// ❌
System.out.println("user: " + user);

// ✅
private static final Logger log = LoggerFactory.getLogger(UserService.class);
log.info("user fetched: {}", userId);
log.error("fetch failed for userId: {}", userId, e);
```

---

## Comments
- Comment WHY, not WHAT
- Code should be readable enough to not need WHAT comments
- Remove all debug/TODO comments before committing

```typescript
// ❌ explains what (obvious from code)
// increment counter
count++

// ✅ explains why (not obvious from code)
// Retry once — server returns 503 on cold start for ~200ms
await retry(fetchUser, { times: 1, delay: 300 })
```

---

## No Debug Code in Commits
```
❌ console.log
❌ debugger
❌ TODO comments
❌ hardcoded test values
❌ commented-out code blocks
```

ESLint and Husky enforce this — build fails if present.

---

## One Thing Per File
```
❌ UserCardAndForm.tsx — two components in one file
❌ userUtils.ts — 30 unrelated utility functions

✅ UserCard.tsx
✅ UserForm.tsx
✅ formatDate.ts
✅ formatCurrency.ts
```

Exception: small helper types or constants directly related to the file.

---

## Exports

### Frontend
- Named exports everywhere except page/route components
- Page components use default export (Next.js / React Router requirement)

```typescript
// ❌ default export for reusable components
export default function UserCard() { ... }

// ✅ named export
export function UserCard() { ... }

// ✅ default export for pages only
export default function UserPage() { ... }
```

### Backend
- Spring-managed beans: `@Service`, `@Repository`, `@RestController` — Spring handles export
- Utility classes: `public static` methods

---

## Agent Rules
```
Before writing any code:
  1. Check if the functionality already exists
  2. Check which layer owns this responsibility
  3. Choose the simplest correct implementation
  4. Follow existing patterns in the codebase — don't introduce new ones

Before creating a new file:
  1. Check if an existing file should be extended instead
  2. Confirm the correct folder per folder-structure.md

Before adding a dependency:
  1. Check if existing tools already solve it
  2. Prefer what the playbook recommends over personal preference

Naming:
  1. Name things for what they do
  2. Booleans start with is/has/can
  3. No abbreviations unless universally understood (id, url, dto)
```
