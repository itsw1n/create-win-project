# Next.js — Production Architecture & Agent Rules

> **Purpose:** Architectural rulebook for AI/agentic coding in a production Next.js application.
> **Core philosophy:** Medium is the floor. Keep boundaries clear. Add architectural layers only when complexity justifies them.

---

# 1. The One-Sentence Mental Model

```text
SERVER UI (Server Components: initial data + reads)  ─┐
CLIENT UI (Client Components: interaction) ──────────┤→ SERVICES → REPOSITORIES → DATABASE
CLIENT mutations (Server Actions / API routes) ──────┘
```

Responsibility map, NOT a rule that every feature must contain every layer.

---

# 2. Golden Rules

1. **Server Components are the default.**
2. Use `"use client"` only when browser/client behavior is actually required.
3. Keep Client Components as small as practical.
4. Never access the database directly from Client Components.
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

```text
ACTION / API = how a request enters server-side application code  (entry point)
SERVICE / USE CASE = what the application actually does           (business operation)
REPOSITORY = how persistent data is accessed
DATABASE = where persistent data lives
```

Example: `Form → Server Action → createUser() Service → User Repository → Database`. The Action is the entry point, not the business operation.

---

# 4. Server Components

## What they are

React components that execute on the server. Default in the Next.js App Router. Use for:

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

The page must NOT call its own API just to get initial users. Preferred read path: `Server Component → Query → Repository → Database`.

---

# 5. Client Components

Use when browser-side behavior is required: `useState`, `useEffect`, event handlers, browser APIs, interactive forms, drag and drop, client-side state, client-side subscriptions, browser-only libraries.

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

Do NOT add `"use client"` because "this component is part of a page." Add it only because this component actually needs to execute client-side.

---

# 6. Do Not Make Everything Client-Side

Do not mark a whole page `"use client"` when only one small part needs interaction. Prefer keeping the client boundary small:

```text
UsersPage (SERVER) → UserList (SERVER) / UserCard (SERVER) / UserStats (SERVER) / UserSearch (CLIENT only)
```

---

# 7. Client Components Can Still Cause Server Operations

A Client Component executing in the browser does not mean the entire operation happens in the browser. The browser initiates only; the DB stays server-side:

```text
CLIENT UserForm → SERVER Server Action → Service → Repository → Database
```

---

# 8. Data Reading: The First Decision

Ask: **Who needs the data and when?**

```text
Initial/page data   → Server Component → Query → Repository → Database
Browser-driven         fetch → API/query → Repository → Database
```

Not every box requires a separate file.

---

# 9. Data Approach A: Server Component → Query

Use when the page needs data for its initial/server-rendered UI (e.g. `/users`).

```tsx
export default async function UsersPage() {
  const users = await getUsers();

  return <UserList users={users} />;
}
```

Flow: `Browser → Next.js Server Component → getUsers() → Repository → Database`. No `/api/users` call needed to render the initial page.

---

# 10. Data Approach B: Client → API → Query

Use when the browser independently requests data: search, autocomplete, infinite scroll, client-controlled pagination, polling, independently refreshing data, HTTP-only consumers.

```tsx
"use client";

async function searchUsers(query: string) {
  const response = await fetch(
    `/api/users?search=${encodeURIComponent(query)}`
  );

  return response.json();
}
```

Do NOT automatically use an API just because the component is a Client Component. Ask whether the browser actually needs an HTTP endpoint.

---

# 11. Data Approach C: Server Component → Data Function

A separate Query layer is unnecessary for a simple read regardless of project size — call the repository/data function directly from the server component.

```tsx
export default async function SettingsPage() {
  const user = await db.user.findUnique({
    where: { id: "current-user-id" }
  });

  return <Settings user={user} />;
}
```

This is acceptable for simple reads if project conventions allow. As complexity grows, extract `getCurrentUser()` / `getSettings()` into a Query.

---

# 12. What Is a Query?

A Query is a **read operation**. Examples: `getUser()`, `getUsers()`, `getCurrentUser()`, `getOrder()`, `searchUsers()`, `getDashboardData()`.

A Query answers: **What data does the application need?**

```ts
// features/users/queries/getUsers.ts

export async function getUsers() {
  return userRepository.findMany();
}
```

Queries are read-oriented. Do NOT hide major writes inside query-named functions.

---

# 13. What Is a Mutation?

A Mutation **changes data**. Examples: `createUser()`, `updateUser()`, `deleteUser()`, `createOrder()`, `cancelOrder()`, `addItemToCart()`.

A mutation answers: **What changes in the system?** (not "How did the request enter?"). A mutation can be triggered by Server Action, API, Background Job, CLI, or Webhook.

---

# 14. What Is a Server Action?

A server-side entry point used by your own Next.js UI. Responsibilities: receive input → authenticate → authorize → validate → call the application/service operation → revalidate or redirect.

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

NOT an Action: 500 lines of business rules, pricing, subscription checks, DB operations, email/audit/organization logic.

```text
Action → Service → Repository
```

The Action coordinates. The Service performs the application operation.

---

# 16. What Is a Service?

A Service/Use Case represents a meaningful application operation.

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

The Service answers: **What should the system do?** It must not be tightly coupled to a particular UI.

---

# 17. What Is a Repository?

A Repository handles data access.

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

The Repository answers: **How does the application access persistent data?**

---

# 18. Query vs Repository

Not the same thing.

```text
Repository: How do I access the database?   → userRepository.findActiveByOrganization(id)
Query:      What data does the application need? → getActiveUsersForOrganization(id)
```

A Query can compose multiple repository operations:

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

Mutating data:

```text
Own Next.js UI? → Server Action → Service → Repository → Database
External consumer (mobile, webhook, third party)? → API → Service → Repository → Database
```

---

# 20. Why Actions and APIs Should Share Services

Web Action and Mobile API must NOT each own separate business logic — they drift. Share the same application operation:

```text
Web UI ──────────┐
Mobile API ──────┼──→ createUser() Service → Repository → Database
Background Job ──┘
```

---

# 21. When Should You Add a Service?

Medium is the default: `Action → Service → Database`. Add a Service when: business rules become non-trivial; the operation is reused; multiple entry points need it; it requires multiple coordinated steps; it needs independent testing; it involves multiple repositories/external systems.

---

# 22. When Should You Add a Repository?

In Large architecture, every feature uses a Repository. In Medium architecture, DB access goes through the Service directly: `await db.user.findMany();`. Introduce a Repository when DB access becomes complex, repeated, shared, transaction-heavy, database-specific, difficult to isolate, or useful behind a stable interface. Do NOT create one merely because "repositories are part of clean architecture." Ask: **Is this abstraction hiding complexity, or only adding indirection?**

---

# 23. Progressive Architecture

Medium is the floor — every feature gets a Service layer. Escalate to Large when the feature's complexity justifies it.

## Medium

```text
Action → Service → Database        or        Server Component → Query → Database
```

## Large

```text
Action/API → Service → Repository → Database

Server Component → Query → Repository → Database  (reads)
```

The diagram is a preferred responsibility flow, not a mandatory number of files.

---

# 24. The "Do I Need Another Layer?" Test

Ask: **What problem does this layer solve?**

Good: "This Service contains business rules used by three entry points." / "This Repository hides complex DB transactions." / "This Query combines five data sources into one dashboard read."

Bad: "Because enterprise architecture says I need one." / "Because every function needs a Service."

---

# 25. Folder Structure: Large Production System

Feature-oriented structure:

```text
src/
├── app/            routing + route-level composition (page/layout/loading/error/not-found, route.ts)
│   ├── (dashboard)/users|orders|settings/page.tsx
│   ├── api/        users/route.ts, webhooks/route.ts
│   ├── layout.tsx  loading.tsx  error.tsx  not-found.tsx
├── components/ui/          Button, Input, Modal, Table
├── components/shared/      Header, EmptyState
├── features/               users/ orders/ billing/ notifications/ authentication/
├── lib/                    db/, auth/, logger/, cache/
├── config/
└── types/
```

Starting point. Do not blindly copy every folder into every project.

---

# 26. `app/` Folder

## Purpose

`app/` owns Next.js routing and route-level composition. Put here: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `route.ts`, route-level metadata and composition. Example: `app/users/page.tsx`.

The page answers: **What UI belongs at this route?** It must NOT become the home of all business logic.

## Do NOT use `app/` as a dumping ground

Avoid `app/businessLogic.ts`, `app/userService.ts`, `app/randomHelpers.ts`, `app/databaseStuff.ts`, `app/giantUtils.ts`. Move feature/application logic to the appropriate feature or infrastructure layer.

---

# 27. `features/` Folder

Feature-specific application code. Example: `features/users/`.

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

Feature-specific UI: `UserList`, `UserCard`, `UserForm`, `UserSearch`, `UserTable`.

## DO NOT PUT HERE

Database access, complex business rules, direct secret/server infrastructure, unrelated features. `features/users/components/UserForm.tsx` manages UI state and submits an Action — it must not contain `db.user.create(...)`.

---

# 29. `features/*/queries/`

## PUT HERE

Feature-specific read operations: `getUser`, `getUsers`, `searchUsers`, `getUserStats`, `getDashboardData`.

## DO NOT PUT HERE

Mutations, deleting records, updating records, UI components, HTTP handlers.

```ts
export async function getUsers() {
  return userRepository.findMany();
}
```

---

# 30. `features/*/actions/`

## PUT HERE

Server Actions that are entry points for your UI: `createUser.ts`, `updateUser.ts`, `deleteUser.ts`, `inviteUser.ts`. Responsibilities:

```text
receive input → authenticate → authorize → validate → call service → revalidate / redirect
```

## DO NOT PUT HERE

Huge business logic, reusable domain operations, DB implementation details when a repository exists, duplicate logic another entry point needs. Bad: Action = 400 lines of business rules. Good: Action = 20-50 lines coordinating the operation. There is no magical line-count limit; responsibility matters more than line count.

---

# 31. `features/*/services/`

## PUT HERE

Business/application operations: `createUser`, `cancelOrder`, `approveInvoice`, `processPayment`, `inviteMember`.

## DO NOT PUT HERE

React components, browser event handlers, route definitions, UI-specific rendering logic, HTTP-specific details (unless it is explicitly an integration service). Services should be reusable from multiple entry points when appropriate.

---

# 32. `features/*/repositories/`

## PUT HERE

Database/data-access operations: `findUser`, `findByEmail`, `createUser`, `updateUser`, `deleteUser`, `findOrders`.

## DO NOT PUT HERE

UI decisions, authorization decisions that belong at the application boundary, rendering, HTTP request/response handling, business workflows. Answer "how do we persist/retrieve this data?", never "is the user allowed to do this?".

---

# 33. `features/*/schemas/`

## PUT HERE

Validation schemas: `CreateUserSchema`, `UpdateUserSchema`, `SearchUsersSchema`, `CreateOrderSchema`.

```ts
export const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});
```

## DO NOT PUT HERE

Database queries, business workflows, UI rendering.

---

# 34. `features/*/types.ts`

Feature-specific TypeScript types.

```ts
export type UserSummary = {
  id: string;
  name: string;
  email: string;
};
```

No unrelated application logic in type files.

---

# 35. `components/ui/`

Generic reusable UI primitives: `Button`, `Input`, `Modal`, `Dialog`, `Table`, `Dropdown`, `Tabs`, `Card`. They must not know about `User`, `Order`, `Billing`, `Database`. Prefer `<Button>Save</Button>` over `<UserDatabaseSaveButton />` (feature-specific → closer to the feature).

---

# 36. `components/shared/`

UI shared across multiple features but not generic enough for pure primitives: `Header`, `Sidebar`, `EmptyState`, `Pagination`, `PageHeader`, `UserAvatar`. If only used by one feature, keep it inside that feature.

---

# 37. `lib/`

Truly shared infrastructure/utilities: db client, authentication infrastructure, logger, cache infrastructure (`lib/db/client.ts`, `lib/auth/`, `lib/logger/`).

## Do NOT turn `lib/` into a dumping ground

Avoid `lib/users.ts`, `lib/orders.ts`, `lib/billing.ts`, `lib/random.ts`, `lib/helper.ts`, `lib/stuff.ts`, `lib/businessLogic.ts`. If code belongs to a feature, prefer the feature.

---

# 38. `app/api/`

Actual HTTP endpoints: `app/api/users/route.ts`, `app/api/webhooks/stripe/route.ts`. The route handler is an entry point:

```text
HTTP Request → API Route → Authentication → Validation → Service → Repository → Database
```

Do NOT put the entire business workflow inside `route.ts`.

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
├── components/   UserList.tsx UserCard.tsx UserForm.tsx UserSearch.tsx
├── queries/      getUser.ts getUsers.ts searchUsers.ts
├── actions/      createUser.ts updateUser.ts deleteUser.ts
├── services/     userService.ts
├── repositories/ userRepository.ts
├── schemas/      userSchema.ts
└── types.ts
```

Read: `app/users/page.tsx → getUsers() → User Repository → Database`.
Mutation: `UserForm → createUser Action → userService.createUser() → userRepository.create() → Database`.

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

Flow: `Form → Action → Service → Database`. Uses a Repository only in Large architecture. Every feature — however simple — uses this shape. Consistency beats skipping layers.

---

# 42. Medium Feature

Creating an order requires business rules:

```text
features/orders/
├── components/
├── actions/
├── services/
├── schemas/
└── types.ts
```

Flow: `OrderForm → createOrder Action → orderService.createOrder() → Database`. Add a Repository later if DB access becomes complex/shared.

---

# 43. Large Feature

Complex billing:

```text
features/billing/
├── components/ queries/ actions/ services/ repositories/ schemas/ types.ts
```

```text
Web UI / Mobile API / Background Job → Billing Service → Repository → Database
```

Justified because the feature is actually complex.

---

# 44. Architecture Anti-Pattern: Layer Explosion

Do NOT automatically create controller/, service/, use-case/, domain-service/, repository/, dao/, gateway/, adapter/, manager/, handler/ for a simple CRUD operation. If you need six files to change one DB field, the architecture is too complicated for that feature.

---

# 45. Architecture Anti-Pattern: Everything in `lib/`

Bad: `lib/{createUser,updateUser,getOrders,billing,notifications,randomHelpers}.ts`. Prefer `features/{users,orders,billing,notifications}/`. Feature ownership should be clear.

---

# 46. Architecture Anti-Pattern: API for Everything

Do NOT use `Server Component → fetch("/api/users") → API → Service → Repository → Database` when the server component could simply use `Server Component → Query → Repository → Database`. Do not introduce HTTP when you don't need HTTP.

---

# 47. Architecture Anti-Pattern: Everything Is `"use client"`

Do not put `"use client"` at the top of large component trees unless the entire tree truly requires client execution. Prefer a Server Page composed of server sections with a small client interactive control.

---

# 48. Architecture Anti-Pattern: Business Logic in Components

Do NOT put pricing, subscription rules, authorization, inventory, DB, and payment logic inside a client `Checkout()` component. Prefer `Checkout UI → Action → Checkout Service → Repositories / external services`. The UI coordinates UI behavior, not the business system.

---

# 49. Architecture Anti-Pattern: Business Logic in API Routes

Bad: 300 lines of business logic in `POST`. Good:

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

Never rely only on the UI. `{user.isAdmin && <DeleteButton />}` improves UX but is NOT security. The server must enforce: `if (!currentUser.isAdmin) { throw new Error("Forbidden"); }`. Think UI permission + server authorization. The server is the security boundary.

---

# 51. Validation

Validate untrusted input at boundaries: FormData, API body, URL params, search params, cookies, webhook payloads, external API responses.

```text
Untrusted Input → Validation → Trusted Application Input → Service
```

```ts
const input = CreateUserSchema.parse({
  name: formData.get("name"),
  email: formData.get("email"),
});
```

---

# 52. Do Not Confuse Authentication and Authorization

Authentication = who are you? Authorization = are you allowed to do this?

```text
Request → Authentication → Authorization → Validation → Service
```

Knowing the user's identity does not mean they are allowed to perform the operation.

---

# 53. Multiple Entry Points

A mature system may have Web UI, Mobile App, Admin UI, Background Jobs, Webhooks, CLI. These are entry points. The application operation should be reusable — do not copy business rules into every entry point.

```text
Web UI / Mobile API / Admin UI / Background Job / Webhook → Service → Repository → Database
```

---

# 54. Dependency Direction

Prefer: `UI → Entry Point → Service → Repository → Infrastructure`. Nothing lower decides how the UI behaves. A Repository must not say "show this modal"; a Service must not render React; a Component must not contain DB persistence rules.

---

# 55. Keep Boundaries Explicit

Good: `UserForm → createUserAction() → userService.createUser() → userRepository.create()`. Hard to maintain: `UserForm → random helper → random db call → another helper → API → different business logic`. Naming and boundaries should make the flow obvious.

---

# 56. Agentic Coding Rules

Rules specifically for an AI coding agent.

## Rule A — Inspect before changing

Before implementing: inspect the route, feature folder, existing Actions, Queries, Services, Repositories, schemas/types. Follow existing conventions. Never invent a parallel architecture if one exists.

## Rule B — Reuse before creating

Before creating `createUser()` / `getUser()` / `updateUser()`, search for existing equivalents. Never create duplicate operations.

## Rule C — Preserve feature ownership

If the change belongs to Users put it in `features/users/`; Billing → `features/billing/`. Never put feature logic in global folders merely for convenience.

## Rule D — Server by default

When generating a component: start as a Server Component. Only add `"use client"` if client behavior is required.

## Rule E — Keep client boundaries narrow

If only a button needs interactivity, keep it as `Page (SERVER) + InteractiveButton (CLIENT)`. Do not convert the whole page.

## Rule F — Choose reads correctly

Initial page/server data → `Server Component → Query`. Browser-driven independent fetching → `Client → API → Query`. Never create an API merely so a Server Component can reach its own DB.

## Rule G — Choose mutations correctly

Own Next.js UI → `UI → Server Action`. External HTTP consumers → `Client → API`. Then `Action/API → Service → Repository` when those layers are justified.

## Rule H — Keep entry points thin

Actions and API routes coordinate. Move substantial business logic into Services/Use Cases.

## Rule I — Don't over-engineer

Before creating service/repository/query/adapter/use-case, ask "what complexity does this abstraction solve?" If no meaningful answer, keep the feature simpler.

## Rule J — Follow progressive architecture

Start every feature at Medium: `Action → Service → Database`. Escalate to Large when DB complexity/reuse appears: `Action → Service → Repository → Database`. Do not start at the maximum level by default, but never go below Medium.

## Rule K — Never put secrets in client code

Never expose database credentials, private API keys, service-role credentials, or server secrets to Client Components.

## Rule L — Authorization is server-side

Never rely on a disabled button, hidden button, or client-side role check as the security boundary. Enforce authorization in server-side code.

## Rule M — Validate external input

Never pass unvalidated user/API input into business operations. Use the project's validation mechanism.

## Rule N — Do not duplicate business operations

If both an Action and API need `createOrder()`, reuse the same Service/Use Case when appropriate.

## Rule O — Do not bypass architecture without reason

If the feature uses `userService.createUser()`, do not call `db.user.create()` directly from another entry point without a documented reason.

---

# 57. Agent Decision Tree

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

Ask: what responsibility does this file have? Which layer owns it? Does an existing file already do this? Is this abstraction needed? Am I duplicating business logic? Am I making a Client Component unnecessarily? Am I creating an API unnecessarily? Am I bypassing an existing Service/Repository? Does this belong to a feature? Is this escalation justified (does the logic warrant a Repository/Query)?

---

# 59. Before Adding `"use client"`

Does this component use: `useState`? `useEffect`? browser APIs? event handlers? client-side state? client-only libraries? interactive behavior? If no → keep it a Server Component.

---

# 60. Before Creating an API Route

Ask: **Who consumes this endpoint?** Good answers: mobile app, external service, third-party client, webhook, browser needing independent HTTP fetching. Weak answer: "because all backend calls should use APIs." For a Server Component reading its own database, an API may be unnecessary.

---

# 61. Before Creating a Service

Is there meaningful business/application logic? Is the operation reused? Are multiple entry points calling it? Does it coordinate multiple steps? Does separating it improve testing/maintainability? If no → keep it simpler.

---

# 62. Before Creating a Repository

Is DB access complex? Reused? Does it hide meaningful persistence details? Are there transactions or multiple DB operations? Would the abstraction improve maintainability? In Medium architecture the Service handles DB access directly; add a Repository when the feature escalates to Large and these factors apply.

---

# 63. Recommended Code Flow

## Read

```text
Server Component → Query → Repository → Database
```

## Write from your UI — Medium (default)

```text
Form → Server Action → Service → Database
```

## Write from your UI — Large (escalated)

```text
Form → Server Action → Service → Repository → Database
```

## External API — Medium

```text
External Client → API Route → Service → Database
```

## External API — Large (escalated)

```text
External Client → API Route → Service → Repository → Database
```

---

# 64. Complete Visual Map

```text
BROWSER
  ├─ SERVER UI (Server Components: initial data) ──────┐
  └─ CLIENT UI (Client Components: interaction) ───────┤
     CLIENT mutations (Actions / API) ─────────────────┤→ Queries/Services
                                                       ▼
                                  REPOSITORIES → INFRASTRUCTURE → DATABASE
```

---

# 65. Full Architecture Diagram

```text
UI LAYER:        Pages/Layouts, Server Components, Client Components, Feature Components
                    ├─ READ → Queries
                    └─ WRITE → Server Actions / API
APPLICATION:     Services / Use Cases (createUser, updateUser, createOrder, cancelOrder)
DATA ACCESS:     Repositories (userRepository, orderRepository, billingRepository)
INFRASTRUCTURE:  PostgreSQL / MySQL / Redis / External APIs / Queues
```

---

# 66. Medium vs Large: The Critical Rule

The diagram is NOT "every feature must have every layer." Medium is the floor; escalate to Large when justified.

```text
MEDIUM             →  Action → Service → Database
LARGE              →  Action/API → Service → Repository → Database
READ (both)        →  Server Component → Query → Repository → Database
```

The architecture is progressive: start every feature at Medium, escalate to Large when the feature's logic justifies it.

---

# 67. Example: Simple Profile Update

Still Medium, not thinner: `features/profile/` with `components/ProfileForm.tsx` + `actions/updateProfile.ts` + `services/profileService.ts`, flowing `ProfileForm → updateProfile Action → profileService.updateProfile() → Database`. No Repository needed for a simple operation — keep the Service/DTO shape consistent.

---

# 68. Example: Complex Order Creation

Creating an order requires authentication, authorization, inventory validation, pricing, discounts, tax, payment, order creation, audit log, notifications.

```text
OrderForm → createOrder Action → Order Service
   ├── Inventory / Pricing / Payment
   ├── Orders Repository / Audit Repository
   └── Notification Service → Database / External APIs
```

This is where layered architecture pays off.

---

# 69. Production Architecture Is About Boundaries

The purpose is not to create many folders; it is to create predictable boundaries. A developer should be able to answer: where is the UI? the read operation? the mutation entry point? the business logic? the DB access? the validation? where is authorization enforced? If obvious — the architecture is doing its job.

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

```text
UI?                    → components
Initial/server read?   → Server Component + Query
Browser-independent read? → API + Query
Own UI mutation?       → Server Action
External mutation?     → API
Business logic?        → Service / Use Case
Database access?       → Repository when justified
Validation?            → Schema / boundary validation
Authentication?        → Server
Authorization?         → Server
Feature-specific?      → features/<feature>/
Generic UI?            → components/ui/
Cross-feature UI?      → components/shared/
Shared infrastructure? → lib/
Routing?               → app/
```

---

# 72. Final Agent Rule

```text
WHAT IS THE RESPONSIBILITY? → WHICH LAYER OWNS IT? → DOES THAT LAYER ALREADY EXIST?
→ CAN EXISTING CODE BE REUSED? → DOES THIS FEATURE ACTUALLY NEED ANOTHER ABSTRACTION?
→ IMPLEMENT THE SIMPLEST CORRECT DESIGN
```

Prefer `simple + explicit + consistent` over `complex + abstract + theoretically pure`, and `clear responsibility boundaries` over `maximum number of layers`. The goal is not the most architecturally elaborate system — it is a system that remains understandable when it becomes large.

---


---

# 73. Optional Concerns

The following concerns are indexed in `RULES.md`. Read only the one relevant to your task.

| Concern | Playbook |
|---|---|
| Zustand (client state) | `concerns/zustand.md` |
| TanStack Query (server state, client-side) | `concerns/tanstack-query.md` |
| React Hook Form + Zod (forms + validation) | `concerns/zod.md` |
| t3-env (env validation) | `concerns/t3-env.md` |
| nuqs (URL state) | `concerns/nuqs.md` |
| next-safe-action (typed server actions) | `concerns/next-safe-action.md` |
| next-themes (dark mode) | `concerns/next-themes.md` |
| Server-side fetch helper | See § 74 below |

---

# 74. Server-side Fetch Helper

Shared `fetch` helper for Server Components reading from an external HTTP API (e.g. Spring Boot).

```typescript
// src/lib/fetch.ts
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
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
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

- **Server Components only.** Never import `lib/fetch.ts` from a Client Component.
- **Redirect on 401** in the caller — the helper only throws structured errors.
- **Route on `error.code`**, never `error.message` — codes are stable.
- **No caching by default** (`revalidate: 0`) — override per call when safe.
