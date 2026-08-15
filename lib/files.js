// ─── Generated File Contents ──────────────────────────────────────────────────
// Each function returns the content for a specific generated file.
// All use {{VARIABLE}} tokens replaced by the template engine.

export function contextMd(vars) {
  return `# CONTEXT.md

## Project
**Name:** {{PROJECT_NAME}}
**Description:** {{PROJECT_DESCRIPTION}}
**Stack:** {{STACK}}
**Styling:** {{STYLE_MODE}}
**Year:** {{YEAR}}

## Goals
<!-- What this project does and who it's for -->

## Key Decisions
<!-- Architecture and tech decisions made during the project -->

## Out of Scope
<!-- What this project explicitly does NOT do -->

## Notes
<!-- Anything else agents or contributors should know -->
`
}

export function agentsMd(vars, stack) {
  const isNextjs = stack.startsWith('nextjs')
  const hasSpringBoot = stack.includes('springboot')
  const isSupabase = stack.includes('supabase')
  const isPrisma = stack.includes('postgresql')

  const frontendRoot = isNextjs ? 'src/' : 'frontend/src/'

  return `# AGENTS.md

This file is the source of truth for AI coding assistants and human contributors.
Read this before making any changes to the codebase.

---

## Project
{{PROJECT_NAME}} — {{PROJECT_DESCRIPTION}}
Stack: {{STACK}}

---

## Rules
All rules live in **RULES.md** and **/playbooks/**.
Load RULES.md at the start of every session.
Load the relevant playbook from /playbooks/ when working on a specific concern.

---

## Folder Map

### Frontend (${frontendRoot})
\`\`\`
${isNextjs ? `src/
├── app/              → Router, layouts, providers
├── features/         → ALL business logic by domain
│   └── [name]/
│       ├── actions/  → Server Actions ('use server')
│       ├── queries/  → Server-side data fetching
│       ├── hooks/    → TanStack Query hooks (client)
│       ├── components/ → Feature-local UI
│       ├── schemas/  → Zod schemas
│       └── types/
├── components/
│   ├── ui/           → Dumb primitives (zero business logic)
│   ├── shared/       → App-aware reusables
│   └── layout/       → Navbar, Sidebar, Footer
├── lib/              → Infrastructure: clients, errors, logger
├── stores/           → Zustand stores (UI state only)
├── hooks/            → Shared hooks (2+ features)
├── types/            → Global TypeScript types
├── schemas/          → Shared Zod schemas
├── env.ts            → t3-env environment validation
└── constants/        → ROUTES, API_ENDPOINTS, ROLES` : `frontend/src/
├── app/              → Router, providers, App.tsx
├── pages/            → Route-level components (thin, no logic)
├── features/         → ALL business logic by domain
│   └── [name]/
│       ├── api/      → Axios functions (or Supabase calls)
│       ├── hooks/    → TanStack Query hooks
│       ├── components/ → Feature-local UI
│       ├── schemas/  → Zod schemas
│       └── types/
├── components/
│   ├── ui/           → Dumb primitives
│   ├── shared/       → App-aware reusables
│   ├── layout/       → Navbar, Sidebar, Footer
│   └── forms/        → Reusable form compositions
├── stores/           → Zustand stores (UI state only)
├── lib/              → axios.ts, queryClient.ts, errors.ts, logger.ts
├── hooks/            → Shared hooks
├── types/            → Global TypeScript types
└── constants/        → ROUTES, API_ENDPOINTS, ROLES`}
\`\`\`

${hasSpringBoot ? `### Backend (backend/src/main/java/{{PACKAGE_PATH}}/)
\`\`\`
{{PACKAGE_PATH}}/
├── [feature]/
│   ├── [Feature]Controller.java  → HTTP only
│   ├── [Feature]Service.java     → Business logic only
│   ├── [Feature]Repository.java  → DB only
│   ├── dto/                      → Request + Response records
│   └── entity/                   → JPA entity, extends BaseEntity
├── auth/                         → Always present
├── config/                       → SecurityConfig, CorsConfig
└── common/
    ├── exception/                → AppException, GlobalExceptionHandler
    ├── response/                 → ApiResponse<T>
    ├── jwt/                      → JwtService, JwtFilter
    └── audit/                    → BaseEntity
\`\`\`` : ''}

${isSupabase ? `### Database (Supabase)
\`\`\`
supabase/
├── migrations/    → SQL migration files (timestamp_description.sql)
└── seed.sql       → Dev seed data
\`\`\`` : ''}

${isPrisma ? `### Database (Prisma)
\`\`\`
prisma/
├── schema.prisma  → Single source of truth
├── seed.ts        → Dev seed data
└── migrations/    → Generated migration files
\`\`\`` : ''}

### Docs
\`\`\`
docs/
├── api/
│   ├── overview.md        → base URL, auth, response format
│   ├── endpoints.md       → all endpoints documented
│   └── errors.md          → error code registry
├── architecture/
│   ├── overview.md        → system design
│   ├── database-schema.md → tables and relationships
│   └── auth-flow.md       → authentication flow
└── guides/
    ├── setup.md           → local setup
    ├── deployment.md      → how to deploy
    └── env-variables.md   → every env var documented
\`\`\`

---

## What NOT To Do
- Never commit directly to \`main\` or \`dev\`
- Never push unless explicitly asked
- Never expose Entity in API responses (Spring Boot)
- Never bypass RLS with service role key from client (Supabase)
- Never put business logic in pages/ or Controller
- Never use console.log — use logger utility
- Never use \`any\` in TypeScript without // reason: comment
- Never merge or open PRs unless explicitly asked

---

## When Adding a New Feature
1. Check RULES.md for the rules governing this concern
2. Load the relevant playbook from /playbooks/
3. Follow existing patterns in the codebase
4. Write tests alongside the feature
5. Update docs/api/ if adding endpoints
6. Commit with: type(scope): description
`
}

export function progressMd() {
  return `# PROGRESS.md

## Status
🟡 In Progress

---

## Completed
<!-- Move items here when done -->

## In Progress
<!-- Current work -->

## Up Next
<!-- Planned work -->

## Blocked
<!-- Anything blocking progress -->

## Decisions Made
<!-- Key decisions logged here -->
`
}

export function readmeMd(vars, stack) {
  const isNextjs = stack.startsWith('nextjs')
  const hasSpringBoot = stack.includes('springboot')
  const isSupabase = stack.includes('supabase')
  const isPrisma = stack.includes('postgresql') && !hasSpringBoot

  const quickStart = isSupabase
    ? `\`\`\`bash
git clone <repo>
cd {{PROJECT_NAME}}
cp .env.example .env
# Fill in .env values
npx supabase start
npx supabase db reset
npm run dev
\`\`\``
    : hasSpringBoot
    ? `\`\`\`bash
git clone <repo>
cd {{PROJECT_NAME}}
cp .env.example .env
# Fill in .env values
make dev
# In a new terminal:
make migrate
make seed
\`\`\``
    : `\`\`\`bash
git clone <repo>
cd {{PROJECT_NAME}}
cp .env.example .env
# Fill in .env values
docker compose up -d db
npx prisma migrate dev
npm run dev
\`\`\``

  return `# {{PROJECT_NAME}}

> {{PROJECT_DESCRIPTION}}

---

## Stack

| Layer       | Technology                |
|-------------|---------------------------|
| Frontend    | ${isNextjs ? 'Next.js 14+ (App Router) + TypeScript' : 'React 18 + Vite + TypeScript'} |
| Styling     | {{STYLE_MODE}} |
${hasSpringBoot ? `| Backend     | Spring Boot 3 (Java 21)   |
| ORM         | Spring Data JPA + Flyway  |` : ''}
${isSupabase ? `| Database    | Supabase (PostgreSQL)     |
| Auth        | Supabase Auth             |` : ''}
${isPrisma ? `| ORM         | Prisma                    |
| Database    | PostgreSQL 16             |` : ''}
${hasSpringBoot ? `| Database    | PostgreSQL 16             |
| Auth        | JWT (access + refresh)    |
| Container   | Docker + Docker Compose   |` : ''}

---

## Quick Start

${quickStart}

---

## Documentation

| File                      | What it covers               |
|---------------------------|------------------------------|
| \`RULES.md\`              | All coding rules for this stack |
| \`AGENTS.md\`             | Folder map + agent instructions |
| \`CONTEXT.md\`            | Project goals and decisions  |
| \`docs/guides/setup.md\`  | Detailed setup guide         |
| \`docs/api/endpoints.md\` | API endpoint reference       |
| \`docs/api/errors.md\`    | Error code registry          |

---

## Project Structure

See \`AGENTS.md\` for the full folder map.
`
}

export function envExample(stack) {
  if (stack.includes('supabase')) {
    const isReact = stack.startsWith('react')
    const prefix = isReact ? 'VITE_' : 'NEXT_PUBLIC_'
    return `# =============================================================================
# .env.example — {{PROJECT_NAME}}
# =============================================================================
# Copy to .env and fill in your values. Never commit .env.

# Supabase
${prefix}SUPABASE_URL=https://[project].supabase.co
${prefix}SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # server/admin only — never expose to browser
`
  }

  if (stack === 'nextjs-postgresql') {
    return `# =============================================================================
# .env.example — {{PROJECT_NAME}}
# =============================================================================
# Copy to .env and fill in your values. Never commit .env.

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/{{PROJECT_NAME}}db

# Auth (if using custom JWT)
JWT_SECRET=
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# NextAuth (if using NextAuth.js)
# NEXTAUTH_SECRET=
# NEXTAUTH_URL=http://localhost:3000
`
  }

  // Spring Boot combos
  return `# =============================================================================
# .env.example — {{PROJECT_NAME}}
# =============================================================================
# Copy to .env and fill in your values. Never commit .env.

# Database (PostgreSQL)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB={{PROJECT_NAME}}db
DATABASE_URL=jdbc:postgresql://db:5432/{{PROJECT_NAME}}db

# Auth (JWT)
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=
JWT_REFRESH_SECRET=

# Token expiry in milliseconds
JWT_EXPIRES_IN=900000       # 15 minutes
JWT_REFRESH_EXPIRES=604800000  # 7 days

# Frontend
${stack === 'react-springboot' ? 'VITE_API_URL=http://localhost:8080' : 'NEXT_PUBLIC_API_URL=http://localhost:8080'}

# Spring Boot
SPRING_PROFILES_ACTIVE=dev
`
}

export function gitignore(stack) {
  const isNextjs = stack.startsWith('nextjs')
  const hasSpringBoot = stack.includes('springboot')

  return `# Environment
.env
.env.local
.env.production
.env.*.local

# Dependencies
node_modules/
${hasSpringBoot ? '.mvn/' : ''}

# Build outputs
${isNextjs ? '.next/\nout/' : 'dist/\nbuild/'}
${hasSpringBoot ? 'target/' : ''}

# IDE
.idea/
.vscode/
*.iml
*.suo
*.user

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/
npm-debug.log*

# Testing
coverage/
playwright-report/
test-results/

# Docker volumes
postgres-data/

# Supabase
${stack.includes('supabase') ? '.supabase/' : '# (no supabase)'}
`
}

export function editorconfig() {
  return `root = true

[*]
end_of_line = lf
insert_final_newline = true
charset = utf-8
trim_trailing_whitespace = true

[*.{js,ts,jsx,tsx,json,css,md,yml,yaml}]
indent_style = space
indent_size = 2

[*.java]
indent_style = space
indent_size = 4

[Makefile]
indent_style = tab
`
}

export function prettierrc() {
  return `{
  "$schema": "https://json.schemastore.org/prettierrc",
  "semi": false,
  "singleQuote": true,
  "jsxSingleQuote": false,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
`
}

// Placeholder doc files
export function docPlaceholder(title, description) {
  return `# ${title}

> ${description}

<!-- Add content here -->
`
}
