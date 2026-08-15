# DevOps: Makefile

---

## Core Rules
- All targets declared in .PHONY — no exceptions
- All docker commands go through $(COMPOSE) variable — never hardcode
- Always include a `help` target as default
- Variables declared at top of file
- One logical action per target
- Targets that chain: call other make targets, not raw commands

---

## Full Makefile Template (React + Spring Boot)
```makefile
# =============================================================================
# Makefile — {{PROJECT_NAME}}
# =============================================================================

# Variables
COMPOSE        := docker compose
COMPOSE_PROD   := docker compose -f docker-compose.prod.yml
FRONTEND       := $(COMPOSE) exec frontend
BACKEND        := $(COMPOSE) exec backend
DB             := $(COMPOSE) exec db

# =============================================================================
# Default
# =============================================================================

.DEFAULT_GOAL := help

.PHONY: help
help: ## Show all available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

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
	$(DB) psql -U $${POSTGRES_USER} -d $${POSTGRES_DB} -f /docker-entrypoint-initdb.d/seed.sql

db-reset: ## Drop + migrate + seed (full fresh slate)
	$(BACKEND) ./mvnw flyway:clean flyway:migrate
	$(MAKE) seed

db-shell: ## Open psql shell inside DB container
	$(DB) psql -U $${POSTGRES_USER} -d $${POSTGRES_DB}

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
	$(COMPOSE_PROD) build

prod-up: ## Start production containers
	$(COMPOSE_PROD) up -d

prod-down: ## Stop production containers
	$(COMPOSE_PROD) down

# =============================================================================
# Scaffolding
# =============================================================================

.PHONY: init

init: ## Scaffold full folder structure (run once after cloning)
	@echo "Scaffolding project structure..."
	@mkdir -p frontend/src/{app,pages,components/{ui,shared,layout,forms},features,stores,lib,hooks,types,constants}
	@mkdir -p frontend/e2e
	@mkdir -p frontend/public
	@mkdir -p backend/src/main/java/com/app/{auth/{dto,entity},config,common/{exception,response,jwt,audit}}
	@mkdir -p backend/src/main/resources/db/{migration,dev}
	@mkdir -p backend/src/test/java/com/app
	@mkdir -p docs/{api,architecture,guides}
	@find . -type d -empty -not -path "./.git/*" -exec touch {}/.gitkeep \;
	@echo "✅ Done. Run: make dev"
```

---

## Simplified Makefile (Next.js + Supabase — no Docker backend)
```makefile
# =============================================================================
# Makefile — {{PROJECT_NAME}} (Next.js + Supabase)
# =============================================================================

.DEFAULT_GOAL := help

.PHONY: help dev build lint test test-e2e db-start db-stop db-reset db-types init

help: ## Show all commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev: ## Start Next.js dev server + Supabase local
	npx supabase start && npm run dev

build: ## Build Next.js for production
	npm run build

lint: ## Run ESLint
	npm run lint

test: ## Run Vitest
	npm run test

test-e2e: ## Run Playwright E2E tests
	npm run test:e2e

db-start: ## Start local Supabase stack
	npx supabase start

db-stop: ## Stop local Supabase stack
	npx supabase stop

db-reset: ## Reset local DB (apply migrations + seed)
	npx supabase db reset

db-types: ## Regenerate TypeScript types from Supabase schema
	npx supabase gen types typescript --local > src/types/database.types.ts

init: ## Scaffold project folder structure
	@mkdir -p src/{app,features,components/{ui,shared,layout},lib/supabase,stores,types,schemas,constants}
	@mkdir -p docs/{api,architecture,guides}
	@find . -type d -empty -not -path "./.git/*" -exec touch {}/.gitkeep \;
	@echo "✅ Done. Run: make dev"
```

---

## Simplified Makefile (Next.js + PostgreSQL/Prisma)
```makefile
# =============================================================================
# Makefile — {{PROJECT_NAME}} (Next.js + Prisma)
# =============================================================================

COMPOSE := docker compose

.DEFAULT_GOAL := help

.PHONY: help dev build lint test db-start db-stop db-migrate db-seed db-reset db-studio init

help: ## Show all commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

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
	@mkdir -p docs/{api,architecture,guides}
	@find . -type d -empty -not -path "./.git/*" -exec touch {}/.gitkeep \;
	@echo "✅ Done. Run: make dev"
```

---

## Agent Rules
```
New make target?
  → Add to .PHONY list
  → Add ## comment for help output
  → Use $(COMPOSE) not hardcoded docker compose
  → Keep it one logical action

New service in compose?
  → Add logs-[service] target
  → Add shell-[service] target

Default goal?
  → Always .DEFAULT_GOAL := help
  → help target always shows available commands

init target?
  → Always creates full folder structure
  → Always adds .gitkeep to empty folders
  → Always present — run once after clone
```
