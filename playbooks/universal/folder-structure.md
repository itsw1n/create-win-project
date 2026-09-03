# Folder Structure (Universal)

---

## Root Structure (All Projects)
```
project-root/
├── docs/
│   ├── api/
│   │   ├── overview.md         → what the API does, base URL, auth
│   │   ├── endpoints.md        → all routes documented
│   │   └── errors.md           → error code registry
│   ├── architecture/
│   │   ├── overview.md         → system design, how pieces connect
│   │   ├── database-schema.md  → tables, relationships
│   │   └── auth-flow.md        → authentication flow
│   └── guides/
│       ├── setup.md            → local setup instructions
│       ├── deployment.md       → how to deploy
│       └── env-variables.md    → every env var documented
│
├── .github/
│   ├── workflows/
│   │   ├── ci-frontend.yml
│   │   └── ci-backend.yml      → only if separate backend exists
│   └── PULL_REQUEST_TEMPLATE.md
│
├── .env.example                → all vars with comments, no real values
├── .editorconfig
├── .prettierrc
├── .gitignore
├── Makefile
├── README.md
└── AGENTS.md                   → rules for AI agents + contributors
```

---

## React + Vite (SPA) Frontend
```
frontend/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   └── providers.tsx
│   │
│   ├── pages/
│   │   └── [feature]/
│   │       └── [Feature]Page.tsx     → thin composers only
│   │
│   ├── components/
│   │   ├── ui/                       → dumb, zero business logic
│   │   │   └── [Component]/
│   │   │       ├── [Component].tsx
│   │   │       └── [Component].module.css
│   │   ├── shared/                   → app-aware, reusable
│   │   ├── layout/                   → structural chrome
│   │   └── forms/                    → reusable form compositions
│   │
│   ├── features/
│   │   └── [name]/
│   │       ├── api/                  → Axios functions
│   │       ├── hooks/                → TanStack Query hooks
│   │       ├── components/           → feature-local only
│   │       ├── schemas/              → Zod schemas
│   │       └── types/
│   │
│   ├── stores/                       → Zustand stores
│   ├── lib/                          → axios, queryClient, errors, logger
│   ├── hooks/                        → shared hooks (2+ features)
│   ├── types/                        → global types
│   └── constants/                    → ROUTES, API_ENDPOINTS, ROLES
│
├── e2e/                              → Playwright tests
├── public/
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Next.js (App Router) Frontend
```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── error.tsx
│   ├── not-found.tsx
│   ├── providers.tsx
│   └── (routes)/
│       └── [feature]/
│           ├── page.tsx
│           ├── layout.tsx
│           ├── loading.tsx
│           └── error.tsx
│
├── features/
│   └── [name]/
│       ├── actions/              → Server Actions
│       ├── components/           → feature-local components
│       ├── hooks/                → TanStack Query hooks (client)
│       ├── queries/              → server-side data fetching
│       ├── schemas/              → Zod schemas
│       └── types/
│
├── components/
│   ├── ui/                       → framework-appropriate UI primitives
│   ├── shared/                   → app-aware reusables
│   └── layout/                   → Navbar, Sidebar, Footer
│
├── lib/
│   ├── prisma.ts                 → Prisma client singleton (if PostgreSQL)
│   ├── supabase/                 → Supabase clients (if Supabase)
│   │   ├── client.ts
│   │   ├── server.ts
│   ├── safe-action.ts            → next-safe-action client
│   ├── errors.ts                 → AppError class
│   └── logger.ts
│
├── stores/                       → Zustand stores
├── hooks/                        → shared client hooks
├── types/                        → global types + db types
├── schemas/                      → shared Zod schemas
├── env.ts                        → t3-env validation
└── constants/
    └── index.ts
```

---

## Spring Boot Backend
```
backend/
└── src/
    ├── main/
    │   ├── java/com/app/
    │   │   ├── [feature]/
    │   │   │   ├── [Feature]Controller.java
    │   │   │   ├── [Feature]Service.java
    │   │   │   ├── [Feature]Repository.java
    │   │   │   ├── dto/
    │   │   │   │   ├── [Feature]Request.java
    │   │   │   │   └── [Feature]Response.java
    │   │   │   └── entity/
    │   │   │       └── [Feature].java
    │   │   │
    │   │   ├── auth/                   → always present
    │   │   │
    │   │   ├── config/
    │   │   │   ├── SecurityConfig.java
    │   │   │   ├── CorsConfig.java
    │   │   │   └── AppConfig.java
    │   │   │
    │   │   └── common/
    │   │       ├── exception/
    │   │       │   ├── AppException.java
    │   │       │   └── GlobalExceptionHandler.java
    │   │       ├── response/
    │   │       │   └── ApiResponse.java
    │   │       ├── jwt/
    │   │       │   ├── JwtService.java
    │   │       │   └── JwtFilter.java
    │   │       └── audit/
    │   │           └── BaseEntity.java
    │   │
    │   └── resources/
    │       ├── application.yml
    │       ├── application-dev.yml
    │       ├── application-test.yml
    │       ├── application-prod.yml
    │       └── db/
    │           ├── migration/          → Flyway migrations
    │           │   ├── V1__create_users_table.sql
    │           │   └── V2__create_refresh_tokens_table.sql
    │           └── dev/                → seed data (dev only)
    │               └── seed.sql
    │
    └── test/
        └── java/com/app/
            └── [feature]/
                ├── [Feature]ServiceTest.java
                └── [Feature]ControllerIntegrationTest.java
```

---

## Docs Folder (All Projects)
```
docs/
├── api/
│   ├── overview.md
│   │   # Base URL, auth method, response format
│   ├── endpoints.md
│   │   # Every endpoint: method, path, request, response, errors
│   └── errors.md
│       # Error code registry: code, status, meaning
│
├── architecture/
│   ├── overview.md
│   │   # System diagram, how services connect
│   ├── database-schema.md
│   │   # Tables, columns, relationships, ERD
│   └── auth-flow.md
│       # Step-by-step auth flow with diagrams
│
└── guides/
    ├── setup.md
    │   # Prerequisites, step-by-step local setup, common issues
    ├── deployment.md
    │   # How to deploy to production
    └── env-variables.md
        # Every variable: name, required, description, example
```

---

## Empty Folder Convention
```
Empty folders that must exist: use .gitkeep

frontend/public/.gitkeep
docs/decisions/.gitkeep
backend/src/main/resources/db/dev/.gitkeep
e2e/.gitkeep
```

---

## Cross-Feature Import Rules
```
✅ Allowed:
  ui/ → imported anywhere
  shared/ → imported anywhere
  layout/ → imported anywhere
  lib/ → imported anywhere
  hooks/ → imported anywhere
  types/ → imported anywhere
  constants/ → imported anywhere

❌ Never:
  features/auth/ → importing from features/users/
  features/users/ → importing from features/orders/
  Feature A importing Feature B's components, hooks, or API

If two features need shared code:
  → move it to components/shared/, hooks/, or types/
```

---

## File Naming Rules
```
React components:     PascalCase    UserCard.tsx
Hooks:                camelCase     useUserData.ts
API files:            camelCase     userApi.ts
Schema files:         camelCase     user.schema.ts
Store files:          camelCase     authStore.ts
Type files:           camelCase     userTypes.ts or index.ts
Constant files:       camelCase     index.ts
Java classes:         PascalCase    UserService.java
SQL migrations:       snake_case    V1__create_users_table.sql
CSS Modules:          PascalCase    UserCard.module.css
Config files:         camelCase     vite.config.ts, tailwind.config.ts
```

---

## Agent Rules
```
Before creating a new file:
  1. Check this map — which folder owns this?
  2. Check if an existing file should be extended instead
  3. Place it in the correct folder, not the convenient one

New feature (React/Next.js)?
  → features/[name]/ with all subfolders

New shared component (used 2+ features)?
  → components/shared/

New UI primitive (no business logic)?
  → components/ui/

New backend feature (Spring Boot)?
  → com/app/[feature]/ with Controller + Service + Repository + dto/ + entity/

New infrastructure concern (Prisma, Supabase client, Axios)?
  → lib/

Empty folder must exist?
  → Add .gitkeep

Cross-feature import needed?
  → Move shared code to shared location instead
```
