// ─── Generated File Contents ──────────────────────────────────────────────────
// Each function returns the content for a specific generated file.
// All use {{VARIABLE}} tokens replaced by the template engine.

export function contextMd(vars, expectedConcerns) {
  const concernsBlock = (expectedConcerns && expectedConcerns.length)
    ? expectedConcerns.map((c) => `- ${c}`).join('\n')
    : '- (none selected — all optional concerns remain available)'
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

## Expected Concerns (advisory)
${concernsBlock}
`
}

export function agentsMd(vars, stack) {
  const constraintsBlock = stack.constraints.length
    ? stack.constraints.map((r) => `- ${r}`).join('\n')
    : ''

  return `# AGENTS.md

> **This file is always loaded.** Keep it lean. Rule detail lives in \`playbooks/\` (lazy \`Read\`).
> **Load order per task:** \`AGENTS.md\` (now) → only the one \`playbooks/\` § you need. Never read all playbooks eagerly.

## Stack Snapshot
${vars.PROJECT_NAME} — ${vars.PROJECT_DESCRIPTION}
Stack: ${stack.label}
Full snapshot → \`CONTEXT.md\`.

## Key Constraints (always-on)
${constraintsBlock || '- (none beyond universal rules)'}

## What NOT To Do
- Never bypass RLS with service role key from client (Supabase)
- Never put business logic in pages/ or Controller
- Never merge or open PRs unless explicitly asked

## How to work
1. Check \`RULES.md\` for the concern → playbook § map.
2. \`Read\` only that one \`playbooks/\` § (use offset). Never read all playbooks eagerly.
3. Follow existing patterns; write tests alongside features.
4. Commit with: \`type(scope): description\`.
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

export function readmeMd(vars, stack, answers = {}) {
  const isNextjs = stack.isNextjs
  const hasSpringBoot = stack.isSpringBoot
  const isSupabase = stack.isSupabase
  const isPrisma = stack.isPrisma
  const hasMakefile = answers.makefile

  const quickStart = isSupabase
    ? hasMakefile
      ? `\`\`\`bash
git clone <repo>
cd {{PROJECT_NAME}}
cp .env.example .env
# Fill in .env values
make dev       # starts Supabase + dev server (runs inside frontend/ for React)
\`\`\``
      : `\`\`\`bash
git clone <repo>
cd {{PROJECT_NAME}}
cp .env.example .env
# Fill in .env values
npx supabase start
npx supabase db reset
${stack.isReact ? 'cd frontend && ' : ''}npm run dev
\`\`\``
    : hasSpringBoot
    ? hasMakefile
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
docker compose up --build
# In a new terminal:
docker compose exec backend ./mvnw flyway:migrate
\`\`\``
    : hasMakefile
    ? `\`\`\`bash
git clone <repo>
cd {{PROJECT_NAME}}
cp .env.example .env
# Fill in .env values
make dev       # starts PostgreSQL + Next.js dev server
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
  if (stack.isSupabase) {
    const prefix = stack.isReact ? 'VITE_' : 'NEXT_PUBLIC_'
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

  if (stack.isPrisma) {
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
${stack.isReact ? 'VITE_API_URL=http://localhost:8080' : 'NEXT_PUBLIC_API_URL=http://localhost:8080'}

# Spring Boot
SPRING_PROFILES_ACTIVE=dev
`
}

export function gitignore(stack) {
  const isNextjs = stack.isNextjs
  const hasSpringBoot = stack.isSpringBoot

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
${stack.isSupabase ? '.supabase/' : '# (no supabase)'}
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

// ─── Makefile ─────────────────────────────────────────────────────────────────

export function makefile(stack) {
  if (stack.isSpringBoot) return makefileFull(stack)
  if (stack.isSupabase) return makefileSupabase(stack)
  return makefilePrisma(stack)
}

// Full 3-service Makefile: frontend + Spring Boot backend + PostgreSQL
function makefileFull(stack) {
  const feDir = stack.isReact ? 'frontend' : '.'
  const feCmd = stack.isReact ? 'cd frontend && ' : ''

  return `# =============================================================================
# Makefile — {{PROJECT_NAME}}
# =============================================================================

# Variables
COMPOSE      := docker compose
FRONTEND     := $(COMPOSE) exec frontend
BACKEND      := $(COMPOSE) exec backend
DB           := $(COMPOSE) exec db
WORKDIR      := $(PWD)

# =============================================================================
# Default
# =============================================================================

.DEFAULT_GOAL := help

.PHONY: help
help: ## Show all available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \\
		| awk 'BEGIN {FS = ":.*?## "}; {printf "\\033[36m%-20s\\033[0m %s\\n", $$1, $$2}'

# =============================================================================
# Project Lifecycle
# =============================================================================

.PHONY: dev up down restart logs logs-front logs-back clean

dev: ## Start all containers and follow logs
	$(COMPOSE) up --build

up: ## Start all containers in background
	$(COMPOSE) up -d --build

down: ## Stop and remove all containers
	$(COMPOSE) down

restart: down up ## Stop then start all containers

logs: ## Follow logs from all containers
	$(COMPOSE) logs -f

logs-front: ## Follow frontend logs only
	$(COMPOSE) logs -f frontend

logs-back: ## Follow backend logs only
	$(COMPOSE) logs -f backend

clean: ## Remove containers, volumes, orphans (full reset)
	$(COMPOSE) down -v --remove-orphans

# =============================================================================
# Individual Services
# =============================================================================

.PHONY: dev-front dev-back

dev-front: ## Start frontend container only
	$(COMPOSE) up frontend --build

dev-back: ## Start backend + DB containers only
	$(COMPOSE) up backend db --build

# =============================================================================
# Database
# =============================================================================

.PHONY: migrate seed db-reset db-shell

migrate: ## Run pending Flyway migrations
	$(BACKEND) ./mvnw flyway:migrate

seed: ## Seed the database with dev data
	$(DB) psql -U \$\${POSTGRES_USER} -d \$\${POSTGRES_DB} -f /docker-entrypoint-initdb.d/seed.sql

db-reset: ## Drop + migrate + seed (full fresh slate)
	$(BACKEND) ./mvnw flyway:clean flyway:migrate
	$(MAKE) seed

db-shell: ## Open psql shell inside DB container
	$(DB) psql -U \$\${POSTGRES_USER} -d \$\${POSTGRES_DB}

# =============================================================================
# Shells
# =============================================================================

.PHONY: shell-front shell-back

shell-front: ## Open shell inside frontend container
	$(FRONTEND) sh

shell-back: ## Open shell inside backend container
	$(BACKEND) sh

# =============================================================================
# Quality
# =============================================================================

.PHONY: lint test test-front test-back

lint: ## Run ESLint on frontend
	$(FRONTEND) npm run lint

test: test-front test-back ## Run all tests

test-front: ## Run Vitest (frontend)
	$(FRONTEND) npm run test

test-back: ## Run JUnit (backend)
	$(BACKEND) ./mvnw test

# =============================================================================
# Production
# =============================================================================

.PHONY: build prod-up prod-down

build: ## Build production Docker images
	$(COMPOSE) -f docker-compose.prod.yml build

prod-up: ## Start production containers
	$(COMPOSE) -f docker-compose.prod.yml up -d

prod-down: ## Stop production containers
	$(COMPOSE) -f docker-compose.prod.yml down

# =============================================================================
# Scaffolding
# =============================================================================

.PHONY: init

init: ## Scaffold full folder structure (run once after cloning)
	@mkdir -p ${feDir}
	@mkdir -p backend/src/main/resources/db/{migration,dev}
	@mkdir -p docs/{api,architecture,guides,decisions}
	@find . -type d -empty -not -path "./.git/*" -exec touch {}/.gitkeep \\;
	@echo "✅ Done. Run: make dev"
`
}

// Simplified Makefile for Supabase combos (no Docker backend)
function makefileSupabase(stack) {
  const prefix = stack.isReact ? 'cd frontend && ' : ''
  const src = stack.isReact ? 'frontend/src' : 'src'

  return `# =============================================================================
# Makefile — {{PROJECT_NAME}} (${stack.frontendLabel} + Supabase)
# =============================================================================

.DEFAULT_GOAL := help

.PHONY: help dev build lint test test-e2e db-start db-stop db-reset db-types init

help: ## Show all commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \\
		| awk 'BEGIN {FS = ":.*?## "}; {printf "\\033[36m%-20s\\033[0m %s\\n", $$1, $$2}'

dev: ## Start dev server + Supabase local
	${prefix}npx supabase start && ${prefix}npm run dev

build: ## Build frontend for production
	${prefix}npm run build

lint: ## Run ESLint
	${prefix}npm run lint

test: ## Run Vitest
	${prefix}npm run test

test-e2e: ## Run Playwright E2E tests
	${prefix}npm run test:e2e

db-start: ## Start local Supabase stack
	${prefix}npx supabase start

db-stop: ## Stop local Supabase stack
	${prefix}npx supabase stop

db-reset: ## Reset local DB (apply migrations + seed)
	${prefix}npx supabase db reset

db-types: ## Regenerate TypeScript types from Supabase schema
	${prefix}npx supabase gen types typescript --local > ${src}/types/database.types.ts

init: ## Scaffold project folder structure
	@mkdir -p ${src}/{app,features,components/{ui,shared,layout},lib,stores,types,schemas,constants}
	@mkdir -p supabase/migrations
	@mkdir -p docs/{api,architecture,guides,decisions}
	@find . -type d -empty -not -path "./.git/*" -exec touch {}/.gitkeep \\;
	@echo "✅ Done. Run: make dev"
`
}

// Simplified Makefile for Prisma combos (Docker only for the DB)
function makefilePrisma(stack) {
  return `# =============================================================================
# Makefile — {{PROJECT_NAME}} (${stack.frontendLabel} + Prisma)
# =============================================================================

COMPOSE := docker compose

.DEFAULT_GOAL := help

.PHONY: help dev build lint test db-start db-stop db-migrate db-seed db-reset db-studio init

help: ## Show all commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \\
		| awk 'BEGIN {FS = ":.*?## "}; {printf "\\033[36m%-20s\\033[0m %s\\n", $$1, $$2}'

dev: db-start ## Start PostgreSQL + Next.js dev server
	npm run dev

build: ## Build for production
	npm run build

lint: ## Run ESLint
	npm run lint

test: ## Run Vitest
	npm run test

db-start: ## Start PostgreSQL container
	$(COMPOSE) up -d db

db-stop: ## Stop PostgreSQL container
	$(COMPOSE) down

db-migrate: ## Run Prisma migrations
	npx prisma migrate dev

db-seed: ## Seed the database
	npx prisma db seed

db-reset: ## Reset DB + migrate + seed
	npx prisma migrate reset --force

db-studio: ## Open Prisma Studio
	npx prisma studio

init: ## Scaffold project folder structure
	@mkdir -p src/{app,features,components/{ui,shared,layout},lib,stores,types,schemas,constants}
	@mkdir -p prisma/migrations
	@mkdir -p docs/{api,architecture,guides,decisions}
	@find . -type d -empty -not -path "./.git/*" -exec touch {}/.gitkeep \\;
	@echo "✅ Done. Run: make dev"
`
}

// Placeholder doc files
export function docPlaceholder(title, description) {
  return `# ${title}

> ${description}

<!-- Add content here -->
`
}

// ─── Docker Compose ───────────────────────────────────────────────────────────

// Dev compose — Spring Boot combos get 3 services; Prisma combos get only the DB
export function dockerCompose(stack) {
  const name = '{{PROJECT_NAME}}'
  const fePort = stack.frontendPort

  if (stack.isSpringBoot) {
    const feContext = stack.isReact ? './frontend' : '.'
    const feDockerfileDir = stack.isReact ? 'frontend/Dockerfile.dev' : 'Dockerfile.dev'
    const apiUrlVar = stack.isReact ? 'VITE_API_URL' : 'NEXT_PUBLIC_API_URL'

    return `# docker-compose.yml — ${name} (${stack.frontendLabel} + Spring Boot) — Dev
services:

  frontend:
    container_name: ${name}-frontend
    build:
      context: ${feContext}
      dockerfile: ${feDockerfileDir}
    ports:
      - "${fePort}:${fePort}"
    volumes:
      - ${feContext}:/app
      - /app/node_modules
    environment:
      - ${apiUrlVar}=\${${apiUrlVar}}
    depends_on:
      - backend
    networks:
      - app-network

  backend:
    container_name: ${name}-backend
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "8080:8080"
    volumes:
      - ./backend:/app
      - maven-cache:/root/.m2
    environment:
      - SPRING_PROFILES_ACTIVE=dev
      - DATABASE_URL=jdbc:postgresql://db:5432/\${POSTGRES_DB}
      - POSTGRES_USER=\${POSTGRES_USER}
      - POSTGRES_PASSWORD=\${POSTGRES_PASSWORD}
      - JWT_SECRET=\${JWT_SECRET}
      - JWT_REFRESH_SECRET=\${JWT_REFRESH_SECRET}
    depends_on:
      db:
        condition: service_healthy
    networks:
      - app-network

  db:
    container_name: ${name}-db
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=\${POSTGRES_USER}
      - POSTGRES_PASSWORD=\${POSTGRES_PASSWORD}
      - POSTGRES_DB=\${POSTGRES_DB}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${POSTGRES_USER} -d \${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres-data:
    name: ${name}-postgres-data
  maven-cache:
    name: ${name}-maven-cache

networks:
  app-network:
    name: ${name}-network
`
  }

  // Prisma combo — PostgreSQL only, Next.js runs locally
  return `# docker-compose.yml — ${name} (${stack.frontendLabel} + Prisma) — Dev
services:

  db:
    container_name: ${name}-db
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=\${POSTGRES_USER}
      - POSTGRES_PASSWORD=\${POSTGRES_PASSWORD}
      - POSTGRES_DB=\${POSTGRES_DB}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${POSTGRES_USER} -d \${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres-data:
    name: ${name}-postgres-data

networks:
  app-network:
    name: ${name}-network
`
}

// Prod compose — Spring Boot combos only
export function dockerComposeProd(stack) {
  if (!stack.isSpringBoot) return ''
  const name = '{{PROJECT_NAME}}'
  const fePort = stack.frontendPort
  const feContext = stack.isReact ? './frontend' : '.'
  const feDockerfileDir = stack.isReact ? 'frontend/Dockerfile' : 'Dockerfile'
  const feProdPort = stack.isReact ? '80:80' : `${fePort}:${fePort}`
  const apiUrlVar = stack.isReact ? 'VITE_API_URL' : 'NEXT_PUBLIC_API_URL'

  return `# docker-compose.prod.yml — ${name} (${stack.frontendLabel} + Spring Boot) — Prod
services:

  frontend:
    container_name: ${name}-frontend-prod
    build:
      context: ${feContext}
      dockerfile: ${feDockerfileDir}
      target: production
    ports:
      - "${feProdPort}"
    environment:
      - ${apiUrlVar}=\${${apiUrlVar}}
    depends_on:
      - backend
    networks:
      - app-network
    restart: always

  backend:
    container_name: ${name}-backend-prod
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: production
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=prod
      - DATABASE_URL=jdbc:postgresql://db:5432/\${POSTGRES_DB}
      - POSTGRES_USER=\${POSTGRES_USER}
      - POSTGRES_PASSWORD=\${POSTGRES_PASSWORD}
      - JWT_SECRET=\${JWT_SECRET}
      - JWT_REFRESH_SECRET=\${JWT_REFRESH_SECRET}
    depends_on:
      db:
        condition: service_healthy
    networks:
      - app-network
    restart: always

  db:
    container_name: ${name}-db-prod
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=\${POSTGRES_USER}
      - POSTGRES_PASSWORD=\${POSTGRES_PASSWORD}
      - POSTGRES_DB=\${POSTGRES_DB}
    volumes:
      - postgres-data-prod:/var/lib/postgresql/data
    networks:
      - app-network
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${POSTGRES_USER} -d \${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres-data-prod:
    name: ${name}-postgres-data-prod

networks:
  app-network:
    name: ${name}-network-prod
`
}

// ─── Dockerfiles ──────────────────────────────────────────────────────────────

// React + Vite frontend
export function frontendDockerfiles(stack) {
  if (!stack.isReact) return []
  return [
    ['frontend/Dockerfile.dev', `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
`],
    ['frontend/Dockerfile', `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`],
    ['frontend/nginx.conf', `server {
  listen 80;

  location / {
    root /usr/share/nginx/html;
    index index.html;
    try_files $uri $uri/ /index.html;   # SPA routing
  }
}
`],
  ]
}

// Spring Boot backend
export function backendDockerfiles(stack) {
  if (!stack.isSpringBoot) return []
  return [
    ['backend/Dockerfile.dev', `FROM eclipse-temurin:21-jdk-alpine
WORKDIR /app
COPY . .
EXPOSE 8080
CMD ["./mvnw", "spring-boot:run"]
`],
    ['backend/Dockerfile', `FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app
COPY . .
RUN ./mvnw package -DskipTests

FROM eclipse-temurin:21-jre-alpine AS production
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
`],
  ]
}
