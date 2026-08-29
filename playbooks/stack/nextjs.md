# Next.js — Production Architecture & Agent Rules

> **Purpose:** This document is both a personal reference/learning note and an architectural rulebook for AI/agentic coding in a production Next.js application.
>
> **Core philosophy:** Medium is the floor. Keep boundaries clear. Add architectural layers only when complexity justifies them.

---

# 1. The One-Sentence Mental Model

A useful default mental model is:

```text
                    NEXT.JS APPLICATION
                           │
             ┌─────────────┴─────────────┐
             │                           │
          SERVER                       CLIENT
             │                           │
    Server Components             Client Components
             │                           │
        Reads / UI                 Interaction
             │                           │
          Queries               Actions / API
             │                           │
             └─────────────┬─────────────┘
                           ▼
                    APPLICATION LAYER
                           │
                           ▼
                     SERVICES
                           │
                           ▼
                    REPOSITORIES
                           │
                           ▼
                     DATABASE
```

This is a **responsibility map**, not a rule that every feature must contain every layer.

---

# 2. Golden Rules

These are the rules an AI coding agent should follow unless the project explicitly says otherwise.

1. **Server Components are the default.**
2. Use `"use client"` only when browser/client behavior is actually required.
3. Keep Client Components as small as practical.
4. Do not access the database directly from Client Components.
5. Use Server Components for initial/server-rendered data when appropriate.
6. Use Server Actions for mutations initiated by your own UI when appropriate.
7. Use API routes when an actual HTTP interface is required.
8. Keep Server Actions and API handlers thin.
9. Put meaningful business/application logic in Services/Use Cases.
10. Put database-specific access in Repositories when repository abstraction is justified.
11. Queries represent read requirements.
12. Mutations represent data-changing operations.
13. Validate untrusted input at system boundaries.
14. Authorization must be enforced on the server.
15. Do not duplicate business logic between Actions, APIs, jobs, and other entry points.
16. Prefer feature-based organization as the application grows.
17. Do not create architectural layers merely for ceremony.
18. Follow existing project conventions before introducing a new pattern.
19. Medium is the default — every feature gets a Service layer, large features escalate to Repositories.
20. Complexity should earn abstraction.

---

# 3. The Most Important Distinction: Entry Point vs Business Operation

A major source of confusion is mixing these concepts.

```text
ACTION
=
How a request from your Next.js UI enters server-side application code.

API
=
How an HTTP request enters server-side application code.

SERVICE / USE CASE
=
What the application actually does.

REPOSITORY
=
How persistent data is accessed.

DATABASE
=
Where persistent data lives.
```

For example:

```text
Web Form
   │
   ▼
Server Action
   │
   ▼
createUser()
   │
   ▼
User Repository
   │
   ▼
Database
```

The Action is not the business operation.

The Action is the **entry point**.

---

# 4. Server Components

## What they are

Server Components are React components that execute on the server.

They are the default in the Next.js App Router.

They are particularly useful for:

- Initial page data
- Server-side rendering
- Reading server-side data
- Keeping secrets and server-only resources away from the browser
- Composing pages from server and client UI

Example:

```tsx
import { getUsers } from "@/features/users/queries/getUsers";

export default async function UsersPage() {
  const users = await getUsers();

  return <UserList users={users} />;
}
```

The page does not need to call its own API just to get the initial users.

Preferred:

```text
Server Component
      │
      ▼
Query
      │
      ▼
Repository
      │
      ▼
Database
```

when those layers are justified.

---

# 5. Client Components

A Client Component is used when browser-side behavior is required.

Typical reasons:

- `useState`
- `useEffect`
- event handlers
- browser APIs
- interactive forms
- drag and drop
- client-side state
- client-side subscriptions
- browser-only libraries

Example:

```tsx
"use client";

import { useState } from "react";

export function UserSearch() {
  const [query, setQuery] = useState("");

  return (
    <input
      value={query}
      onChange={(event) => setQuery(event.target.value)}
    />
  );
}
```

## Rule

Do not add `"use client"` because:

> "This component is part of a page."

Add it because:

> "This component actually needs to execute client-side."

---

# 6. Do Not Make Everything Client-Side

Avoid:

```tsx
"use client";

export default function HugePage() {
  // everything is client-side
}
```

when only one small part needs interaction.

Prefer:

```text
UsersPage                         SERVER
│
├── UserList                      SERVER
├── UserCard                      SERVER
├── UserStats                     SERVER
└── UserSearch                    CLIENT
```

This keeps the Client Component boundary small.

---

# 7. Client Components Can Still Cause Server Operations

A Client Component executing in the browser does not mean the entire operation must happen in the browser.

For example:

```text
CLIENT
UserForm
   │
   │ submit
   ▼
SERVER
Server Action
   │
   ▼
Service
   │
   ▼
Repository
   │
   ▼
Database
```

The browser is only initiating the operation.

The database remains server-side.

---

# 8. Data Reading: The First Decision

When you need data, ask:

> **Who needs the data and when?**

Use this decision tree:

```text
                NEED DATA?
                    │
          ┌─────────┴─────────┐
          │                   │
    Initial/page         Browser-driven
       data                 fetch?
          │                   │
          ▼                   ▼
   Server Component        API/query
          │                   │
          ▼                   ▼
        Query               Query
          │                   │
          ▼                   ▼
      Repository          Repository
          │                   │
          └─────────┬─────────┘
                    ▼
                 Database
```

Again, not every box requires a separate file.

---

# 9. Data Approach A: Server Component → Query

Use this when the page needs data for its initial/server-rendered UI.

Example:

```text
/users
```

Page:

```tsx
export default async function UsersPage() {
  const users = await getUsers();

  return <UserList users={users} />;
}
```

Flow:

```text
Browser
   │
   ▼
Next.js Server Component
   │
   ▼
getUsers()
   │
   ▼
Repository
   │
   ▼
Database
```

The browser does not need to call:

```text
/api/users
```

just to render the initial page.

---

# 10. Data Approach B: Client → API → Query

Use this when the browser needs to independently request data.

Examples:

- Search
- Autocomplete
- Infinite scrolling
- Client-controlled pagination
- Polling
- Data that refreshes independently
- Consumers that require HTTP

Flow:

```text
Client Component
      │
      │ fetch()
      ▼
API Route
      │
      ▼
Query
      │
      ▼
Repository
      │
      ▼
Database
```

Example:

```tsx
"use client";

async function searchUsers(query: string) {
  const response = await fetch(
    `/api/users?search=${encodeURIComponent(query)}`
  );

  return response.json();
}
```

Do not automatically use an API just because the component is a Client Component.

Ask whether the browser actually needs an HTTP endpoint.

---

# 11. Data Approach C: Server Component → Data Function

For a simple read that needs only one table lookup, a separate Query layer may be unnecessary.

Example:

```tsx
export default async function SettingsPage() {
  const user = await db.user.findUnique({
    where: { id: "current-user-id" }
  });

  return <Settings user={user} />;
}
```

This can be acceptable for a genuinely simple data access if the project's conventions allow it.

As complexity grows, extract:

```text
getCurrentUser()
```

or:

```text
getSettings()
```

into a Query.

---

# 12. What Is a Query?

A Query is a read operation.

Examples:

```text
getUser()
getUsers()
getCurrentUser()
getOrder()
getOrders()
searchUsers()
getDashboardData()
```

A Query answers:

> **What data does the application need?**

Example:

```ts
// features/users/queries/getUsers.ts

export async function getUsers() {
  return userRepository.findMany();
}
```

Queries should normally be read-oriented.

Do not hide major writes inside functions that are supposed to be queries.

---

# 13. What Is a Mutation?

A Mutation changes data.

Examples:

```text
createUser()
updateUser()
deleteUser()

createOrder()
cancelOrder()
refundOrder()

addItemToCart()
removeItemFromCart()
```

A mutation describes:

> **What changes in the system?**

It is different from the question:

> **How did the request enter the system?**

A mutation can be triggered by:

```text
Server Action
API
Background Job
CLI
Webhook
```

---

# 14. What Is a Server Action?

A Server Action is a server-side entry point commonly used by your own Next.js UI.

Typical responsibilities:

1. Receive input
2. Authenticate
3. Authorize
4. Validate
5. Call the application/service operation
6. Revalidate or redirect when appropriate

Example:

```ts
"use server";

export async function createUserAction(formData: FormData) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  if (!currentUser.isAdmin) {
    throw new Error("Forbidden");
  }

  const input = CreateUserSchema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
  });

  const user = await userService.createUser(input);

  revalidatePath("/users");

  return user;
}
```

---

# 15. What Should NOT Be in a Server Action?

Avoid this:

```ts
"use server";

export async function createUserAction(formData: FormData) {
  // 500 lines of:
  // business rules
  // pricing
  // subscription checks
  // database operations
  // email logic
  // audit logic
  // organization logic
  // etc.
}
```

Instead:

```text
Action
  ↓
Service
  ↓
Repository
```

The Action coordinates.

The Service performs the application operation.

---

# 16. What Is a Service?

A Service/Use Case represents a meaningful application operation.

Example:

```ts
export async function createUser(input: CreateUserInput) {
  const existing =
    await userRepository.findByEmail(input.email);

  if (existing) {
    throw new Error("User already exists");
  }

  // subscription checks
  // organization rules
  // invitation logic
  // audit logic
  // other business rules

  return userRepository.create(input);
}
```

The Service answers:

> **What should the system do?**

It should not be tightly coupled to a particular UI.

---

# 17. What Is a Repository?

A Repository handles data access.

Example:

```ts
export const userRepository = {
  findMany() {
    return db.user.findMany();
  },

  findByEmail(email: string) {
    return db.user.findUnique({
      where: { email }
    });
  },

  create(input: CreateUserInput) {
    return db.user.create({
      data: input
    });
  }
};
```

The Repository answers:

> **How does the application access persistent data?**

---

# 18. Query vs Repository

These are not the same thing.

Repository:

```text
How do I access the database?
```

Query:

```text
What data does the application need?
```

Example:

```ts
// Repository
userRepository.findActiveByOrganization(id);
```

versus:

```ts
// Query
getActiveUsersForOrganization(id);
```

A Query can compose multiple repository operations.

```ts
export async function getDashboardData(organizationId: string) {
  const users = await userRepository.findActiveByOrganization(
    organizationId
  );

  const orders =
    await orderRepository.findRecent(organizationId);

  const revenue =
    await orderRepository.getRevenue(organizationId);

  return {
    users,
    orders,
    revenue,
  };
}
```

---

# 19. Mutation Decision Tree

When changing data:

```text
                NEED TO MUTATE?
                     │
                     ▼
             Is it your own UI?
                │       │
               YES      NO
                │        │
                ▼        ▼
          Server Action  API
                │        │
                └───┬────┘
                    ▼
                 Service
                    │
                    ▼
               Repository
                    │
                    ▼
                 Database
```

Interpretation:

### Your own Next.js UI

Prefer a Server Action when it fits the operation.

```text
Form
 ↓
Server Action
 ↓
Service
 ↓
Repository
 ↓
Database
```

### External consumer

Use an API/HTTP entry point.

```text
Mobile App
 ↓
API
 ↓
Service
 ↓
Repository
 ↓
Database
```

---

# 20. Why Actions and APIs Should Share Services

Suppose both a web application and mobile application can create users.

Bad:

```text
Web Action
   ↓
Business Logic A

Mobile API
   ↓
Business Logic B
```

This can drift.

Better:

```text
Web UI ──────────┐
                 │
Mobile API ──────┼──→ createUser()
                 │         │
Background Job ──┘         ▼
                       Repository
                           │
                           ▼
                        Database
```

Different entry points can reuse the same application operation.

---

# 21. When Should You Add a Service?

Medium is the default:

```text
Action → Service → Database
```

Add or keep a Service when:

- business rules become non-trivial
- the operation is reused
- multiple entry points need the same operation
- the operation requires multiple coordinated steps
- the operation needs independent testing
- the operation involves multiple repositories/external systems

A feature should not go below the Service layer.

---

# 22. When Should You Add a Repository?

In Medium architecture the Service handles DB access directly.

```ts
// service
await db.user.findMany();
```

Escalate to Large (add a Repository) when database access becomes: complex, repeated, shared, transaction-heavy, database-specific, difficult to isolate, or useful to hide behind a stable interface.

Do not create a repository merely because:

> "Repositories are part of clean architecture."

Ask:

> **Is this abstraction hiding complexity, or only adding indirection?**

---

# 23. Progressive Architecture

Architecture should grow with complexity. Medium is the floor — every feature gets a Service layer.

## Medium

```text
Action → Service → Database
```

or:

```text
Server Component → Query → Database
```

## Large

```text
Action/API
    ↓
Service
    ↓
Repository
    ↓
Database
```

For reads:

```text
Server Component
    ↓
Query
    ↓
Repository
    ↓
Database
```

The diagram is a **preferred responsibility flow**, not a mandatory number of files.

---

# 24. The "Do I Need Another Layer?" Test

Before creating a layer, ask:

> **What problem does this layer solve?**

Good answer:

> "This Service contains business rules used by three entry points."

Good answer:

> "This Repository hides complex database transactions."

Good answer:

> "This Query combines five data sources into one dashboard read."

Bad answer:

> "Because enterprise architecture says I need one."

Bad answer:

> "Because every function needs a Service."

---

# 25. Folder Structure: Large Production System

A practical feature-oriented structure:

```text
src/
│
├── app/
│   ├── (dashboard)/
│   │   ├── users/
│   │   │   └── page.tsx
│   │   ├── orders/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   │
│   ├── api/
│   │   ├── users/
│   │   │   └── route.ts
│   │   └── webhooks/
│   │       └── route.ts
│   │
│   ├── layout.tsx
│   ├── loading.tsx
│   ├── error.tsx
│   └── not-found.tsx
│
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── Table.tsx
│   │
│   └── shared/
│       ├── Header.tsx
│       └── EmptyState.tsx
│
├── features/
│   ├── users/
│   ├── orders/
│   ├── billing/
│   ├── notifications/
│   └── authentication/
│
├── lib/
│   ├── db/
│   │   └── client.ts
│   ├── auth/
│   ├── logger/
│   └── cache/
│
├── config/
│
└── types/
```

This is a starting point. Do not blindly copy every folder into every project.

---

# 26. `app/` Folder

## Purpose

`app/` owns Next.js routing and route-level composition.

Put here:

```text
page.tsx
layout.tsx
loading.tsx
error.tsx
not-found.tsx
route.ts
route-level metadata
route-level composition
```

Example:

```text
app/users/page.tsx
```

The page should primarily answer:

> **What UI belongs at this route?**

It should not become the home of all business logic.

---

## Do NOT use `app/` as a dumping ground

Avoid:

```text
app/
├── businessLogic.ts
├── userService.ts
├── randomHelpers.ts
├── databaseStuff.ts
└── giantUtils.ts
```

Move feature/application logic to the appropriate feature or infrastructure layer.

---

# 27. `features/` Folder

This is where feature-specific application code lives.

Example:

```text
features/users/
```

Owns the user feature.

Possible structure:

```text
features/users/
├── components/
├── queries/
├── actions/
├── services/
├── repositories/
├── schemas/
└── types.ts
```

Not every feature needs every folder.

---

# 28. `features/*/components/`

## PUT HERE

Feature-specific UI:

```text
UserList
UserCard
UserForm
UserSearch
UserTable
```

## DO NOT PUT HERE

Avoid:

- database access
- complex business rules
- direct secret/server infrastructure
- unrelated features

Example:

```text
features/users/components/UserForm.tsx
```

can manage UI state and submit an Action.

It should not contain:

```ts
db.user.create(...)
```

---

# 29. `features/*/queries/`

## PUT HERE

Feature-specific read operations:

```text
getUser
getUsers
searchUsers
getUserStats
getDashboardData
```

## DO NOT PUT HERE

Avoid:

- mutations
- deleting records
- updating records
- UI components
- HTTP handlers

Example:

```ts
export async function getUsers() {
  return userRepository.findMany();
}
```

---

# 30. `features/*/actions/`

## PUT HERE

Server Actions that are entry points for your UI.

Examples:

```text
createUser.ts
updateUser.ts
deleteUser.ts
inviteUser.ts
```

Typical responsibilities:

```text
receive input
    ↓
authenticate
    ↓
authorize
    ↓
validate
    ↓
call service
    ↓
revalidate / redirect
```

## DO NOT PUT HERE

Avoid:

- huge business logic
- reusable domain operations
- database implementation details when a repository exists
- duplicate logic that another entry point needs

Bad:

```text
Action
└── 400 lines of business rules
```

Good:

```text
Action
└── 20-50 lines coordinating the operation
```

There is no magical line-count limit; responsibility matters more than line count.

---

# 31. `features/*/services/`

## PUT HERE

Business/application operations:

```text
createUser
cancelOrder
approveInvoice
processPayment
inviteMember
```

## DO NOT PUT HERE

Avoid:

- React components
- browser event handlers
- route definitions
- UI-specific rendering logic
- HTTP-specific details unless the service is explicitly an integration service

Services should be reusable from multiple entry points when appropriate.

---

# 32. `features/*/repositories/`

## PUT HERE

Database/data-access operations:

```text
findUser
findByEmail
createUser
updateUser
deleteUser
findOrders
```

## DO NOT PUT HERE

Avoid:

- UI decisions
- authorization decisions that belong at the application boundary
- rendering
- HTTP request/response handling
- business workflows

The repository should answer:

> How do we persist/retrieve this data?

Not:

> Is the user allowed to do this?

---

# 33. `features/*/schemas/`

## PUT HERE

Validation schemas:

```text
CreateUserSchema
UpdateUserSchema
SearchUsersSchema
CreateOrderSchema
```

Example:

```ts
export const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});
```

## DO NOT PUT HERE

Avoid:

- database queries
- business workflows
- UI rendering

---

# 34. `features/*/types.ts`

Use for feature-specific TypeScript types.

Example:

```ts
export type UserSummary = {
  id: string;
  name: string;
  email: string;
};
```

Do not put unrelated application logic in type files.

---

# 35. `components/ui/`

This is for generic reusable UI primitives.

Examples:

```text
Button
Input
Modal
Dialog
Table
Dropdown
Tabs
Card
```

These should not know about:

```text
User
Order
Billing
Database
```

Prefer:

```tsx
<Button>Save</Button>
```

rather than:

```tsx
<UserDatabaseSaveButton />
```

The latter is feature-specific and belongs closer to the feature.

---

# 36. `components/shared/`

Use for UI shared across multiple features but not generic enough to be a pure UI primitive.

Examples:

```text
Header
Sidebar
EmptyState
Pagination
PageHeader
UserAvatar
```

Be careful: if something is only used by one feature, keep it inside that feature.

---

# 37. `lib/`

Use `lib/` for truly shared infrastructure/utilities.

Good examples:

```text
db client
authentication infrastructure
logger
cache infrastructure
shared infrastructure helpers
```

Example:

```text
lib/db/client.ts
lib/auth/
lib/logger/
```

## Do NOT turn `lib/` into a dumping ground

Avoid:

```text
lib/
├── users.ts
├── orders.ts
├── billing.ts
├── random.ts
├── helper.ts
├── stuff.ts
└── businessLogic.ts
```

If code belongs to a feature, prefer the feature.

---

# 38. `app/api/`

Use for actual HTTP endpoints.

Good examples:

```text
app/api/users/route.ts
app/api/webhooks/stripe/route.ts
```

The route handler should be an entry point.

Typical flow:

```text
HTTP Request
    ↓
API Route
    ↓
Authentication
    ↓
Validation
    ↓
Service
    ↓
Repository
    ↓
Database
```

Do not put the entire business workflow inside `route.ts`.

---

# 39. Folder Responsibility Matrix

| Folder | Put here | Do not put here |
|---|---|---|
| `app/` | Routing, pages, layouts, route handlers | Large business logic |
| `features/` | Feature-specific application code | Unrelated global utilities |
| `features/*/components` | Feature UI | DB/business workflows |
| `features/*/queries` | Read operations | Writes |
| `features/*/actions` | Server Actions | Large business logic |
| `features/*/services` | Business/application operations | React UI |
| `features/*/repositories` | Data/database access | UI/business workflows |
| `features/*/schemas` | Validation schemas | DB access |
| `features/*/types.ts` | Feature types | Runtime logic |
| `components/ui` | Generic UI primitives | Feature logic |
| `components/shared` | Cross-feature UI | Database/business logic |
| `lib/` | Shared infrastructure | Feature dumping ground |
| `app/api` | HTTP entry points | Entire business system |

---

# 40. A Realistic Users Feature

```text
features/users/
│
├── components/
│   ├── UserList.tsx
│   ├── UserCard.tsx
│   ├── UserForm.tsx
│   └── UserSearch.tsx
│
├── queries/
│   ├── getUser.ts
│   ├── getUsers.ts
│   └── searchUsers.ts
│
├── actions/
│   ├── createUser.ts
│   ├── updateUser.ts
│   └── deleteUser.ts
│
├── services/
│   └── userService.ts
│
├── repositories/
│   └── userRepository.ts
│
├── schemas/
│   └── userSchema.ts
│
└── types.ts
```

Page:

```text
app/users/page.tsx
        │
        ▼
getUsers()
        │
        ▼
User Repository
        │
        ▼
Database
```

Mutation:

```text
UserForm
        │
        ▼
createUser Action
        │
        ▼
userService.createUser()
        │
        ▼
userRepository.create()
        │
        ▼
Database
```

---

# 41. Default Architecture: Medium

Medium is the floor. Every feature uses `features/[name]/` with `{components, actions, services, schemas}` + `types.ts`:

```text
features/[name]/
├── components/
├── actions/
├── services/
├── schemas/
└── types.ts
```

Flow:

```text
ProfileForm
    ↓
Action
    ↓
Service
    ↓
Database
```

That is the consistent shape for every feature. It is not "bad architecture" — it is the architecture. Add a Repository only in Large architecture when the feature escalates.

---

# 42. Medium Feature

Suppose creating an order requires business rules.

```text
features/orders/
├── components/
├── actions/
├── services/
├── schemas/
└── types.ts
```

Flow:

```text
OrderForm
    ↓
createOrder Action
    ↓
orderService.createOrder()
    ↓
Database
```

Add a Repository later if database access becomes complex/shared.

---

# 43. Large Feature

For complex billing:

```text
features/billing/
├── components/
├── queries/
├── actions/
├── services/
├── repositories/
├── schemas/
└── types.ts
```

Flow:

```text
Web UI ──────────┐
Mobile API ──────┼──→ Billing Service
Background Job ──┘           │
                             ▼
                        Repository
                             │
                             ▼
                         Database
```

This is justified because the feature is actually complex.

---

# 44. Architecture Anti-Pattern: Layer Explosion

Do NOT automatically create:

```text
controller/
service/
use-case/
domain-service/
repository/
dao/
gateway/
adapter/
manager/
handler/
```

for a simple CRUD operation.

If you need six files to change one database field, the architecture may be too complicated for that feature.

---

# 45. Architecture Anti-Pattern: Everything in `lib/`

Bad:

```text
lib/
├── createUser.ts
├── updateUser.ts
├── getOrders.ts
├── billing.ts
├── notifications.ts
└── randomHelpers.ts
```

Prefer:

```text
features/
├── users/
├── orders/
├── billing/
└── notifications/
```

Feature ownership should be clear.

---

# 46. Architecture Anti-Pattern: API for Everything

Avoid:

```text
Server Component
    ↓
fetch("/api/users")
    ↓
API
    ↓
Service
    ↓
Repository
    ↓
Database
```

if the Server Component could simply use:

```text
Server Component
    ↓
Query
    ↓
Repository
    ↓
Database
```

Do not introduce HTTP when you don't need HTTP.

---

# 47. Architecture Anti-Pattern: Everything Is `"use client"`

Avoid:

```text
"use client"
```

at the top of large component trees unless the entire tree truly requires client execution.

Prefer:

```text
Server Page
│
├── Server Header
├── Server Data Display
├── Server Table
└── Client Interactive Control
```

---

# 48. Architecture Anti-Pattern: Business Logic in Components

Avoid:

```tsx
"use client";

export function Checkout() {

  // pricing calculation
  // subscription rules
  // authorization
  // inventory rules
  // database logic
  // payment logic

  return ...;
}
```

Prefer:

```text
Checkout UI
    ↓
Action
    ↓
Checkout Service
    ↓
Repositories / external services
```

The UI should coordinate UI behavior, not become the business system.

---

# 49. Architecture Anti-Pattern: Business Logic in API Routes

Avoid:

```ts
export async function POST(request: Request) {

  // 300 lines of business logic
}
```

Prefer:

```ts
export async function POST(request: Request) {
  const input = await request.json();

  const validated = Schema.parse(input);

  const result = await orderService.createOrder(validated);

  return Response.json(result);
}
```

The API route is an entry point.

---

# 50. Authorization

Never rely only on the UI.

This is not security:

```tsx
{user.isAdmin && <DeleteButton />}
```

The UI check improves UX.

The server must enforce authorization:

```ts
if (!currentUser.isAdmin) {
  throw new Error("Forbidden");
}
```

Think:

```text
UI permission
     +
Server authorization
```

The server is the security boundary.

---

# 51. Validation

Validate untrusted input at boundaries.

Examples:

```text
FormData
API body
URL parameters
Search parameters
Cookies
Webhook payloads
External API responses
```

Pattern:

```text
Untrusted Input
      ↓
Validation
      ↓
Trusted Application Input
      ↓
Service
```

Example:

```ts
const input = CreateUserSchema.parse({
  name: formData.get("name"),
  email: formData.get("email"),
});
```

---

# 52. Do Not Confuse Authentication and Authorization

Authentication:

> Who are you?

Authorization:

> Are you allowed to do this?

Typical Action flow:

```text
Request
  ↓
Authentication
  ↓
Authorization
  ↓
Validation
  ↓
Service
```

Do not assume that knowing the user's identity means they are allowed to perform the operation.

---

# 53. Multiple Entry Points

A mature system may have:

```text
Web UI
Mobile App
Admin UI
Background Jobs
Webhooks
CLI
```

These are entry points.

The application operation should ideally be reusable.

```text
Web UI ────────────┐
Mobile API ────────┤
Admin UI ──────────┼──→ Service / Use Case
Background Job ────┤           │
Webhook ───────────┘           ▼
                           Repository
                                │
                                ▼
                             Database
```

Do not copy business rules into every entry point.

---

# 54. Dependency Direction

Prefer this direction:

```text
UI
 │
 ▼
Entry Point
 │
 ▼
Application / Service
 │
 ▼
Repository
 │
 ▼
Infrastructure
```

Avoid lower-level infrastructure deciding how the UI should behave.

For example, a Repository should not say:

```text
"Show this modal."
```

A Service should not render React.

A Component should not contain database persistence rules.

---

# 55. Keep Boundaries Explicit

Good:

```text
UserForm
   ↓
createUserAction()
   ↓
userService.createUser()
   ↓
userRepository.create()
```

Harder to maintain:

```text
UserForm
   ↓
random helper
   ↓
random db call
   ↓
another helper
   ↓
API
   ↓
different business logic
```

Naming and boundaries should make the flow obvious.

---

# 56. Agentic Coding Rules

The following section is specifically intended to be followed by an AI coding agent.

## Rule A — Inspect before changing

Before implementing a feature:

1. Inspect the relevant route.
2. Inspect the feature folder.
3. Inspect existing Actions.
4. Inspect existing Queries.
5. Inspect existing Services.
6. Inspect existing Repositories.
7. Inspect existing schemas/types.
8. Follow the project's existing conventions.

Do not invent a parallel architecture if an existing one already solves the problem.

---

## Rule B — Reuse before creating

Before creating:

```text
createUser()
getUser()
updateUser()
```

search for existing equivalents.

Do not create duplicate operations.

---

## Rule C — Preserve feature ownership

If the change belongs to Users:

```text
features/users/
```

If it belongs to Billing:

```text
features/billing/
```

Do not put feature-specific logic into global folders merely for convenience.

---

## Rule D — Server by default

When generating a component:

```text
START AS SERVER COMPONENT
```

Only add:

```tsx
"use client";
```

if client behavior is required.

---

## Rule E — Keep client boundaries narrow

If only a button needs interactivity:

```text
Page                 SERVER
└── InteractiveButton CLIENT
```

Do not automatically convert the entire page to Client Components.

---

## Rule F — Choose reads correctly

For initial page/server data:

```text
Server Component
    ↓
Query
```

For browser-driven independent fetching:

```text
Client
    ↓
API
    ↓
Query
```

Do not create an API merely to allow a Server Component to access its own database.

---

## Rule G — Choose mutations correctly

For your own Next.js UI:

```text
UI
 ↓
Server Action
```

For external HTTP consumers:

```text
Client
 ↓
API
```

Then:

```text
Action/API
    ↓
Service
    ↓
Repository
```

when those layers are justified.

---

## Rule H — Keep entry points thin

Actions and API routes should coordinate.

Move substantial business logic into Services/Use Cases.

---

## Rule I — Don't over-engineer

Before creating:

```text
service
repository
query
adapter
use-case
```

ask:

> What complexity does this abstraction solve?

If there is no meaningful answer, keep the feature simpler.

---

## Rule J — Follow progressive architecture

Start every feature at Medium:

```text
Action → Service → Database
```

If database complexity/reuse appears, escalate to Large:

```text
Action → Service → Repository → Database
```

Do not start at the maximum level by default, but never go below Medium.

---

## Rule K — Never put secrets in client code

Never expose:

```text
database credentials
private API keys
service-role credentials
server secrets
```

to Client Components.

---

## Rule L — Authorization is server-side

Never rely on:

```text
disabled button
hidden button
client-side role check
```

as the security boundary.

Enforce authorization in server-side code.

---

## Rule M — Validate external input

Do not pass unvalidated user/API input into business operations.

Use the project's validation mechanism.

---

## Rule N — Do not duplicate business operations

If both an Action and API need:

```text
createOrder()
```

reuse the same Service/Use Case when appropriate.

---

## Rule O — Do not bypass architecture without reason

If the feature already uses:

```text
userService.createUser()
```

do not add:

```text
db.user.create()
```

directly from another unrelated entry point unless there is a documented reason.

---

# 57. Agent Decision Tree

When an AI agent receives a request, use this sequence.

```text
NEW FEATURE → UI only? YES → Component
NO → Need data? → Read? → Initial page? YES → Server Component → Query → DB
                                        NO → API → Query → DB
                        Write? → Own UI? YES → Action → Service → DB (Medium, default)
                                 NO → API → Service → DB
                        Data access complex/shared? → escalate to Repository (Large)
```

Medium (Service) is the default for every feature with logic. Escalate to Large (Repository) only when DB access complexity justifies it. A decision aid, not a mandatory code-generation template.

---

# 58. Before Adding a File

The agent should ask internally:

```text
1. What responsibility does this file have?
2. Which layer owns that responsibility?
3. Does an existing file already do this?
4. Is this abstraction actually needed?
5. Am I duplicating business logic?
6. Am I making a Client Component unnecessarily?
7. Am I creating an API unnecessarily?
8. Am I bypassing an existing Service/Repository?
9. Does this belong to a feature?
10. Is this escalation justified (does the logic warrant a Repository/Query)?
```

---

# 59. Before Adding `"use client"`

Ask:

```text
Does this component use:
- useState?
- useEffect?
- browser APIs?
- event handlers?
- client-side state?
- client-only libraries?
- interactive behavior?
```

If no:

> Keep it a Server Component.

---

# 60. Before Creating an API Route

Ask:

```text
Who consumes this endpoint?
```

Good answers:

```text
Mobile app
External service
Third-party client
Webhook
Browser needs independent HTTP fetching
```

Weak answer:

> "Because all backend calls should use APIs."

For a Server Component reading its own database, an API may be unnecessary.

---

# 61. Before Creating a Service

Ask:

```text
Is there meaningful business/application logic?

Is the operation reused?

Are multiple entry points calling it?

Does the operation coordinate multiple steps?

Does separating it improve testing/maintainability?
```

If no:

> Keep it simpler.

---

# 62. Before Creating a Repository

Ask:

```text
Is database access complex?

Is it reused?

Does it hide meaningful persistence details?

Are there transactions or multiple database operations?

Would the abstraction improve maintainability?
```

If no:

> In Medium architecture the Service handles DB access directly. Add a Repository only when the feature escalates to Large and these factors apply.

---

# 63. Recommended Code Flow

For a mature feature:

## Read

```text
Page / Server Component
        │
        ▼
      Query
        │
        ▼
   Repository
        │
        ▼
    Database
```

## Write from your UI — Medium (default)

```text
Client/Form
        │
        ▼
  Server Action
        │
        ▼
     Service
        │
        ▼
    Database
```

## Write from your UI — Large (escalated)

```text
Client/Form
        │
        ▼
  Server Action
        │
        ▼
     Service
        │
        ▼
   Repository
        │
        ▼
    Database
```

## External API — Medium

```text
External Client
        │
        ▼
     API Route
        │
        ▼
     Service
        │
        ▼
    Database
```

## External API — Large (escalated)

```text
External Client
        │
        ▼
     API Route
        │
        ▼
     Service
        │
        ▼
   Repository
        │
        ▼
    Database
```

---

# 64. Complete Visual Map

```text
                         BROWSER
                            │
              ┌─────────────┴─────────────┐
              │                           │
         SERVER UI                   CLIENT UI
              │                           │
      Server Components            Client Components
              │                           │
         Initial data                 Interaction
              │                           │
              ▼                           ▼
           Queries                  Actions / API
              │                           │
              └─────────────┬─────────────┘
                            ▼
                    APPLICATION LAYER
                            │
                            ▼
                       SERVICES
                            │
                            ▼
                      REPOSITORIES
                            │
                            ▼
                       INFRASTRUCTURE
                            │
                            ▼
                         DATABASE
```

---

# 65. Full Architecture Diagram

```text
┌────────────────────────────────────────────────────────────┐
│                         UI LAYER                           │
│                                                            │
│  Next.js Pages / Layouts                                   │
│  Server Components                                         │
│  Client Components                                         │
│  Feature Components                                        │
└────────────────────────────┬───────────────────────────────┘
                             │
                  ┌──────────┴──────────┐
                  │                     │
                READ                  WRITE
                  │                     │
                  ▼                     ▼
               Queries          Server Actions / API
                  │                     │
                  └──────────┬──────────┘
                             ▼
┌────────────────────────────────────────────────────────────┐
│                  APPLICATION LAYER                          │
│                                                            │
│  Services / Use Cases                                      │
│                                                            │
│  createUser()                                              │
│  updateUser()                                              │
│  createOrder()                                              │
│  cancelOrder()                                              │
└────────────────────────────┬───────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────┐
│                    DATA ACCESS                             │
│                                                            │
│  Repositories                                               │
│                                                            │
│  userRepository                                             │
│  orderRepository                                            │
│  billingRepository                                          │
└────────────────────────────┬───────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE                           │
│                                                            │
│ PostgreSQL / MySQL / Redis / External APIs / Queues        │
└────────────────────────────────────────────────────────────┘
```

---

# 66. Medium vs Large: The Critical Rule

Do not interpret the previous diagram as:

> Every feature must have every layer.

Instead:

```text
MEDIUM
────────────────────

Action → Service → Database


LARGE
────────────────────

Action/API → Service → Repository → Database


READ
────────────────────

Server Component → Query → Repository → Database
```

Medium is the floor. The architecture is **progressive**: start every feature at Medium, escalate to Large when the feature's logic justifies it.

---

# 67. Example: Simple Profile Update

Still Medium, not thinner:

```text
features/profile/
├── components/
│   └── ProfileForm.tsx
├── actions/
│   └── updateProfile.ts
└── services/
    └── profileService.ts
```

Flow:

```text
ProfileForm
    ↓
updateProfile Action
    ↓
profileService.updateProfile()
    ↓
Database
```

No Repository needed for a simple operation — keep the Service/DTO shape consistent.

---

# 68. Example: Complex Order Creation

Suppose creating an order requires:

```text
authentication
authorization
inventory validation
pricing rules
discounts
tax calculation
payment
order creation
audit log
notifications
```

Now:

```text
OrderForm
    ↓
createOrder Action
    ↓
Order Service
    ├── Inventory
    ├── Pricing
    ├── Payment
    ├── Orders Repository
    ├── Audit Repository
    └── Notification Service
             │
             ▼
          Database / External APIs
```

This is where layered architecture pays off.

---

# 69. Production Architecture Is About Boundaries

The purpose of the architecture is not to create many folders.

The purpose is to create predictable boundaries.

A developer should be able to answer:

```text
Where is the UI?
Where is the read operation?
Where is the mutation entry point?
Where is the business logic?
Where is the database access?
Where is the validation?
Where is authorization enforced?
```

If the answer is obvious, the architecture is doing its job.

---

# 70. Final Principles

## Principle 1

> **Server by default.**

## Principle 2

> **Client only where client behavior is needed.**

## Principle 3

> **Queries read.**

## Principle 4

> **Actions/API routes are entry points.**

## Principle 5

> **Services perform application/business operations.**

## Principle 6

> **Repositories handle persistence when abstraction is justified.**

## Principle 7

> **Validate and authorize at server boundaries.**

## Principle 8

> **Keep business logic out of UI components and entry points.**

## Principle 9

> **Keep features self-contained.**

## Principle 10

> **Do not create abstractions without a reason.**

## Principle 11

> **Start at Medium and let complexity earn additional layers.**

## Principle 12

> **Consistency is more valuable than cleverness in a large team.**

---

# 71. Agent Quick Reference

When modifying the project:

```text
UI?
  → components

Initial/server read?
  → Server Component + Query

Browser-independent read?
  → API + Query

Own UI mutation?
  → Server Action

External mutation?
  → API

Business logic?
  → Service / Use Case

Database access?
  → Repository when justified

Validation?
  → Schema / boundary validation

Authentication?
  → Server

Authorization?
  → Server

Feature-specific?
  → features/<feature>/

Generic UI?
  → components/ui/

Cross-feature UI?
  → components/shared/

Shared infrastructure?
  → lib/

Routing?
  → app/
```

---

# 72. Final Agent Rule

Before writing code, determine:

```text
WHAT IS THE RESPONSIBILITY?
        ↓
WHICH LAYER OWNS IT?
        ↓
DOES THAT LAYER ALREADY EXIST?
        ↓
CAN EXISTING CODE BE REUSED?
        ↓
DOES THIS FEATURE ACTUALLY NEED ANOTHER ABSTRACTION?
        ↓
IMPLEMENT THE SIMPLEST CORRECT DESIGN
```

The agent should prefer:

```text
simple + explicit + consistent
```

over:

```text
complex + abstract + theoretically pure
```

And prefer:

```text
clear responsibility boundaries
```

over:

```text
maximum number of layers
```

**The goal is not to build the most architecturally elaborate system.**

**The goal is to build a system that remains understandable when it becomes large.**

---

# 73. State Management

## Zustand — Client UI State
Use for state that must persist across components but is not server data.

```typescript
// src/stores/uiStore.ts
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

### When to use Zustand vs TanStack Query
```
Zustand:
  → Sidebar open/close
  → Active tab, selected item
  → User preferences (theme, locale)
  → Auth state (current user, access token)
  → Wizard step state
  → Any UI state that multiple components share

TanStack Query:
  → Data from the server (users, posts, orders)
  → Anything that can go stale
  → Anything that needs caching or refetching
  → Anything fetched from an API or DB
```

Never put server data in Zustand. Never put UI state in TanStack Query.

---

## TanStack Query — Server State (Client-Side)
Use when client components need to fetch and cache server data.

```typescript
// features/users/hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Cache key convention: ['resource', id?, filters?]
export const userKeys = {
  all: ['users'] as const,
  byId: (id: string) => ['users', id] as const,
  filtered: (filters: UserFilters) => ['users', 'filtered', filters] as const,
}

export function useUsers(filters?: UserFilters) {
  return useQuery({
    queryKey: filters ? userKeys.filtered(filters) : userKeys.all,
    queryFn: () => userApi.getAll(filters),
    staleTime: 1000 * 60 * 5,   // 5 minutes
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: userApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}
```

### Query Key Convention
```typescript
// [resource] — list of all
['users']

// [resource, id] — single item
['users', 'abc123']

// [resource, 'filtered', filters] — filtered list
['users', 'filtered', { role: 'ADMIN' }]

// [feature, action] — non-resource queries
['auth', 'session']
['dashboard', 'stats']
```

### Stale Time Defaults
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5min — most data
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Override per query:
// Real-time data (notifications, live status)
staleTime: 0

// Slow-changing data (user profile, settings)
staleTime: 1000 * 60 * 30    // 30 minutes

// Static data (categories, countries)
staleTime: Infinity
```

---

# 74. Forms

## React Hook Form + Zod

### Schema First
```typescript
// features/auth/schemas/login.schema.ts
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type LoginInput = z.infer<typeof loginSchema>
```

### Form Component
```typescript
// features/auth/components/LoginForm/LoginForm.tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@/features/auth/schemas/login.schema'

export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginInput) => {
    try {
      await loginAction(data)
    } catch (error) {
      if (isAppError(error) && error.code === 'INVALID_CREDENTIALS') {
        setError('email', { message: 'Invalid email or password' })
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}

      <input type="password" {...register('password')} />
      {errors.password && <span>{errors.password.message}</span>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Logging in...' : 'Login'}
      </button>
    </form>
  )
}
```

### Zod Schema Placement
```
Feature-specific form?
  → features/[name]/schemas/[name].schema.ts

Shared across multiple features?
  → src/schemas/[name].schema.ts

Server action validation?
  → Same schema file, import on both client and server
```

---

# 75. Environment Variables

## t3-env Setup
<!-- snippet:nextjs-env -->
```typescript
// src/env.ts
import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
    NEXT_PUBLIC_API_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
})
```

Import everywhere:
```typescript
import { env } from '@/env'
// Build fails if required variable is missing
const secret = env.JWT_SECRET
```

---

# 76. URL State Management (nuqs)

Use for state that belongs in the URL: filters, search, pagination, tabs.

```typescript
'use client'
import { useQueryState, parseAsInteger, parseAsString } from 'nuqs'

export function UserFilters() {
  const [search, setSearch] = useQueryState('search', parseAsString.withDefault(''))
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1))
  const [role, setRole] = useQueryState('role', parseAsString)

  return (
    <div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} />
      {/* URL updates automatically: /users?search=john&page=2&role=ADMIN */}
    </div>
  )
}
```

### Zustand vs nuqs Decision
```
nuqs (URL state):
  → Search query
  → Pagination (page, limit)
  → Active filters (role, status, date range)
  → Selected tab that should survive refresh
  → Anything shareable via URL

Zustand (in-memory state):
  → Modal open/close
  → Sidebar state
  → Wizard steps
  → Anything that should reset on page refresh
```

---

# 77. Server Actions (next-safe-action)

```typescript
// features/users/actions/createUser.action.ts
'use server'
import { action } from '@/lib/safe-action'
import { createUserSchema } from '@/features/users/schemas/user.schema'

export const createUserAction = action
  .schema(createUserSchema)
  .action(async ({ parsedInput: { name, email, password } }) => {
    // Input is already validated by Zod
    const user = await userService.create({ name, email, password })
    revalidatePath('/users')
    return { user }
  })
```

```typescript
// lib/safe-action.ts
import { createSafeActionClient } from 'next-safe-action'

export const action = createSafeActionClient()

// With auth:
export const authAction = createSafeActionClient({
  async middleware() {
    const user = await getCurrentUser()
    if (!user) throw new Error('UNAUTHORIZED')
    return { user }
  },
})
```

---

# 78. Dark Mode (next-themes)

```typescript
// app/providers.tsx
'use client'
import { ThemeProvider } from 'next-themes'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  )
}
```

```typescript
// components/ui/ThemeToggle.tsx
'use client'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle theme
    </button>
  )
}
```

Tailwind dark mode config:
```typescript
// tailwind.config.ts
export default {
  darkMode: 'class',   // 'class' strategy — controlled by next-themes
}
```

---

# 79. Agent Quick Reference (Extended)

```
New client state (UI)?
  → Zustand store in src/stores/[name]Store.ts

New server data fetch (client component)?
  → TanStack Query hook in features/[name]/hooks/
  → Cache key: [resource] or [resource, id]

New server data fetch (server component)?
  → Direct query in async server component
  → No TanStack Query needed

New form?
  → Zod schema first in features/[name]/schemas/
  → React Hook Form + zodResolver
  → Validate on server too (server action re-validates)

New server action?
  → next-safe-action with schema
  → features/[name]/actions/[name].action.ts
  → Call revalidatePath after mutation

New env variable?
  → Add to src/env.ts (t3-env)
  → Add to .env.example with comment
  → Server-only → server: {}
  → Client-safe → client: {} with NEXT_PUBLIC_ prefix

URL-based filter/search/pagination?
  → nuqs useQueryState

Dark mode?
  → next-themes ThemeProvider in app/providers.tsx
  → Tailwind darkMode: 'class'
  → Toggle via useTheme()
```

---

# 80. Server-side Fetch Helper

Use a shared `fetch` helper for Server Components that read data from an external HTTP API (e.g. Spring Boot).

```typescript
// lib/fetch.ts
import 'server-only'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

export type FetchError = {
  status: number
  code: string
  message: string
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      next: { revalidate: 0 },
      ...init,
    })
  } catch {
    throw new Error('NETWORK_ERROR')
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as Partial<FetchError> | null
    const error: FetchError = {
      status: response.status,
      code: body?.code ?? 'UNKNOWN_ERROR',
      message: body?.message ?? `Request failed with status ${response.status}`,
    }
    throw error
  }

  return response.json() as Promise<T>
}
```

### Rules
- **Server Components only.** Never import `lib/fetch.ts` from a Client Component — secrets and cookies belong on the server.
- **Redirect on 401** in the caller, never in the helper — the helper only throws structured errors.
- **Map status → error.code** so callers can route on `error.code`, not `error.message`.
- **No caching by default** (`revalidate: 0`) unless the endpoint is static — override per call when safe.
- **Fall back to a host override** so local dev (`localhost:8080`) and Docker (`http://backend:8080`) both work.

### Agent Quick Reference
```
Server Component needs data from Spring Boot?
  → await apiFetch<T>('/api/v1/users')
  → See stack/nextjs.md § 80 Server-side Fetch Helper

Spring Boot returns an error?
  → apiFetch throws { status, code, message }
  → Route on error.code — see universal/error-handling.md
