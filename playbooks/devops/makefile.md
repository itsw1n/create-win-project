# DevOps: Makefile

---

## Core Rules
- All targets declared in `.PHONY` — no exceptions
- Always include a `help` target as default
- Variables declared at top of file
- One logical action per target
- Targets that chain: call other make targets, not duplicated raw commands
- Use variables for repeated tools/commands (`$(COMPOSE)`, `$(SUPABASE)`, `$(NPM)`, etc.)
- Local development commands must stay local regardless of Git branch
- Never infer production behavior from `git branch --show-current`
- Destructive database commands must explicitly target the intended environment
- `db-reset` means local development reset unless a project manifest explicitly defines otherwise
- Never create a normal Make target that resets the production database
- Production deployment/database mutation should be handled by explicit release/CI workflows where possible
- Help text must clearly label destructive commands and environment scope

---

## Environment Rule

Git workflow and runtime environment are separate concerns.

```text
Git flow:
feature/* / fix/*
        ↓
       dev
        ↓
      main
        ↓
   release tag
```

Local commands must behave the same on every branch:

```text
feature/* + make dev → LOCAL environment
dev       + make dev → LOCAL environment
main      + make dev → LOCAL environment
```

Do NOT implement logic like:

```makefile
# BAD — branch silently changes environment
ifeq ($(shell git branch --show-current),main)
  ENV := production
endif
```

Production credentials and production deployment belong to the deployment/release environment, not to branch-sensitive local Make commands.

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
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-24s\033[0m %s\n", $$1, $$2}'

# =============================================================================
# Project Lifecycle — LOCAL
# =============================================================================

.PHONY: dev up down restart logs logs-front logs-back clean

dev: ## LOCAL: Start all containers and follow logs
	$(COMPOSE) up --build

up: ## LOCAL: Start all containers in background
	$(COMPOSE) up -d --build

down: ## LOCAL: Stop and remove local containers
	$(COMPOSE) down

restart: down up ## LOCAL: Stop then start all containers

logs: ## LOCAL: Follow logs from all containers
	$(COMPOSE) logs -f

logs-front: ## LOCAL: Follow frontend logs only
	$(COMPOSE) logs -f frontend

logs-back: ## LOCAL: Follow backend logs only
	$(COMPOSE) logs -f backend

clean: ## LOCAL DESTRUCTIVE: Remove containers, volumes, and orphans
	$(COMPOSE) down -v --remove-orphans

# =============================================================================
# Individual Services — LOCAL
# =============================================================================

.PHONY: dev-front dev-back

dev-front: ## LOCAL: Start frontend container only
	$(COMPOSE) up frontend --build

dev-back: ## LOCAL: Start backend + DB containers only
	$(COMPOSE) up backend db --build

# =============================================================================
# Database — LOCAL
# =============================================================================

.PHONY: migrate seed db-reset db-shell

migrate: ## LOCAL: Run pending Flyway migrations
	$(BACKEND) ./mvnw flyway:migrate

seed: ## LOCAL: Seed database with development data
	$(DB) psql -U $${POSTGRES_USER} -d $${POSTGRES_DB} -f /docker-entrypoint-initdb.d/seed.sql

db-reset: ## LOCAL DESTRUCTIVE: Drop + migrate + seed local DB
	$(BACKEND) ./mvnw flyway:clean flyway:migrate
	$(MAKE) seed

db-shell: ## LOCAL: Open psql shell inside local DB container
	$(DB) psql -U $${POSTGRES_USER} -d $${POSTGRES_DB}

# =============================================================================
# Shells — LOCAL
# =============================================================================

.PHONY: shell-front shell-back

shell-front: ## LOCAL: Open shell inside frontend container
	$(FRONTEND) sh

shell-back: ## LOCAL: Open shell inside backend container
	$(BACKEND) sh

# =============================================================================
# Quality
# =============================================================================

.PHONY: lint test test-front test-back

lint: ## Run ESLint on frontend
	$(FRONTEND) npm run lint

test: test-front test-back ## Run all tests

test-front: ## Run Vitest frontend tests
	$(FRONTEND) npm run test

test-back: ## Run JUnit backend tests
	$(BACKEND) ./mvnw test

# =============================================================================
# Production Runtime
# =============================================================================

.PHONY: build prod-up prod-down

build: ## Build production Docker images
	$(COMPOSE_PROD) build

prod-up: ## PRODUCTION: Start production containers
	$(COMPOSE_PROD) up -d

prod-down: ## PRODUCTION: Stop production containers
	$(COMPOSE_PROD) down

# NOTE:
# Do not add prod-db-reset / db-reset-prod targets.
# Production database schema changes should use the project's migration/release flow.

# =============================================================================
# Scaffolding
# =============================================================================

.PHONY: init

init: ## Scaffold project folder structure (run once after cloning)
	@echo "Scaffolding project structure..."
	@mkdir -p frontend/src/{app,pages,components/{ui,shared,layout,forms},features,stores,lib,hooks,types,constants}
	@mkdir -p frontend/e2e
	@mkdir -p frontend/public
	@mkdir -p backend/src/main/java/com/app/{auth/{dto,entity},config,common/{exception,response,jwt,audit}}
	@mkdir -p backend/src/main/resources/db/{migration,dev}
	@mkdir -p backend/src/test/java/com/app
	@mkdir -p docs/{api,architecture,guides}
	@find . -type d -empty -not -path "./.git/*" -exec touch {}/.gitkeep \;
	@echo "Done. Run: make dev"
```

---

## Simplified Makefile (Next.js + Supabase — Local + Production, No Staging)

This template intentionally keeps normal Makefile database operations local.

Production credentials and production migration execution belong to the deployment/release workflow.

```makefile
# =============================================================================
# Makefile — {{PROJECT_NAME}} (Next.js + Supabase)
# =============================================================================

SHELL := /bin/bash

# Variables
SUPABASE := npx supabase
NPM      := npm

# =============================================================================
# Default
# =============================================================================

.DEFAULT_GOAL := help

.PHONY: help
help: ## Show all available commands
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-24s\033[0m %s\n", $$1, $$2}'

# =============================================================================
# Development — ALWAYS LOCAL
# =============================================================================

.PHONY: dev build lint test test-e2e

dev: supabase-start ## LOCAL: Start Supabase + Next.js dev server
	$(NPM) run dev

build: ## Build Next.js application
	$(NPM) run build

lint: ## Run ESLint
	$(NPM) run lint

test: ## Run unit/integration tests
	$(NPM) run test

test-e2e: ## Run Playwright E2E tests
	$(NPM) run test:e2e

# =============================================================================
# Supabase Local Stack — ALWAYS LOCAL
# =============================================================================

.PHONY: supabase-start supabase-stop supabase-status

supabase-start: ## LOCAL: Start Supabase stack
	$(SUPABASE) start

supabase-stop: ## LOCAL: Stop Supabase stack
	$(SUPABASE) stop

supabase-status: ## LOCAL: Show local Supabase URLs and keys
	$(SUPABASE) status

# =============================================================================
# Database — ALWAYS LOCAL
# =============================================================================

.PHONY: db-reset db-reset-clean db-types db-diff

db-reset: ## LOCAL DESTRUCTIVE: Reset DB, apply migrations, run seed
	$(SUPABASE) db reset --local

db-reset-clean: ## LOCAL DESTRUCTIVE: Reset DB without seed data
	$(SUPABASE) db reset --local --no-seed

db-types: ## LOCAL: Generate TypeScript types from local schema
	$(SUPABASE) gen types --lang typescript --local > src/types/database.types.ts

db-diff: ## LOCAL: Generate migration from local diff: make db-diff name=add_vehicle_status
	@if [ -z "$(name)" ]; then \
		echo "Usage: make db-diff name=add_vehicle_status"; \
		exit 1; \
	fi
	$(SUPABASE) db diff --local -f $(name)

# =============================================================================
# Migrations — FILE CREATION ONLY
# =============================================================================

.PHONY: migration

migration: ## Create migration file: make migration name=add_vehicle_status
	@if [ -z "$(name)" ]; then \
		echo "Usage: make migration name=add_vehicle_status"; \
		exit 1; \
	fi
	$(SUPABASE) migration new $(name)

# =============================================================================
# Scaffolding
# =============================================================================

.PHONY: init

init: ## Scaffold project folder structure
	@mkdir -p src/{app,features,components/{ui,shared,layout},lib/supabase,stores,types,schemas,constants}
	@mkdir -p docs/{api,architecture,guides}
	@mkdir -p supabase/migrations
	@find . -type d -empty -not -path "./.git/*" -exec touch {}/.gitkeep \;
	@echo "Done. Configure local env, then run: make dev"

# =============================================================================
# Production Safety
# =============================================================================

# Intentionally NO targets for:
#   db-reset-prod
#   prod-db-reset
#   production-reset
#
# Do not make `dev` or `db-reset` branch-dependent.
# `make dev` is LOCAL even when current Git branch is main.
# Production database migrations should run through an explicit release/CI flow.
```

### Supabase Command Contract

```text
make dev               → LOCAL Supabase + local Next.js
make supabase-start    → LOCAL only
make supabase-stop     → LOCAL only
make supabase-status   → LOCAL only
make db-reset          → LOCAL only, destructive
make db-reset-clean    → LOCAL only, destructive
make db-types          → LOCAL schema
make db-diff name=...  → LOCAL schema diff
make migration name=.. → creates migration file only
```

No Make target should silently switch these operations to the hosted production project.

### Production Migration Flow

Production schema deployment is intentionally not a normal local Make target.

Preferred release/CI flow:

```bash
# Preview pending migrations against the linked production project
npx supabase db push --linked --dry-run

# Apply only after review / release approval
npx supabase db push --linked
```

Forbidden against production:

```bash
npx supabase db reset --linked
```

Do not add a Make target that wraps the forbidden reset command.

---

## Simplified Makefile (Next.js + PostgreSQL/Prisma)

```makefile
# =============================================================================
# Makefile — {{PROJECT_NAME}} (Next.js + Prisma)
# =============================================================================

COMPOSE := docker compose
NPM     := npm
PRISMA  := npx prisma

.DEFAULT_GOAL := help

.PHONY: help dev build lint test db-start db-stop db-migrate db-seed db-reset db-studio init

help: ## Show all available commands
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-24s\033[0m %s\n", $$1, $$2}'

dev: db-start ## LOCAL: Start PostgreSQL + Next.js dev server
	$(NPM) run dev

build: ## Build for production
	$(NPM) run build

lint: ## Run ESLint
	$(NPM) run lint

test: ## Run tests
	$(NPM) run test

db-start: ## LOCAL: Start PostgreSQL container
	$(COMPOSE) up -d db

db-stop: ## LOCAL: Stop local PostgreSQL container
	$(COMPOSE) down

db-migrate: ## LOCAL: Run Prisma development migrations
	$(PRISMA) migrate dev

db-seed: ## LOCAL: Seed database
	$(PRISMA) db seed

db-reset: ## LOCAL DESTRUCTIVE: Reset + migrate + seed
	$(PRISMA) migrate reset --force

db-studio: ## LOCAL: Open Prisma Studio
	$(PRISMA) studio

init: ## Scaffold project folder structure
	@mkdir -p src/{app,features,components/{ui,shared,layout},lib,stores,types,schemas,constants}
	@mkdir -p prisma/migrations
	@mkdir -p docs/{api,architecture,guides}
	@find . -type d -empty -not -path "./.git/*" -exec touch {}/.gitkeep \;
	@echo "Done. Run: make dev"
```

Production Prisma migrations should use the deployment/release workflow (for example, `prisma migrate deploy`) rather than a destructive local reset target.

---

## Help Target Convention

Every user-facing target must include a `##` description so `make help` remains useful.

```makefile
.PHONY: example
example: ## LOCAL: Explain exactly what the command does
	@echo "example"
```

Recommended prefixes in descriptions:

```text
LOCAL:             non-destructive local command
LOCAL DESTRUCTIVE: destructive local command
PRODUCTION:        explicit production runtime/release command
```

Never label a command as generic if it mutates an environment-specific database.

---

## Database Safety Rules

```text
Local database reset?
  → Allowed
  → Target must explicitly use local environment where CLI supports it

Production database reset?
  → Forbidden
  → Do not create the target

Production migration?
  → Use reviewed migration files
  → Preview first when tooling supports dry-run
  → Prefer release/CI execution

Seed development data?
  → Local only
  → Never automatically include development seed in production
```

For Supabase specifically:

```makefile
db-reset:
	$(SUPABASE) db reset --local
```

Do not rely only on the CLI default when the command is intentionally safety-critical.

---

## Git Branch Rules

Make targets must not use branch name as an automatic environment selector.

Bad:

```text
main branch → production DB
dev branch  → local DB
```

Good:

```text
any branch + local command → local environment
release/deployment config  → production environment
```

A branch check may be used as an additional safety gate for an already-explicit release target, but branch detection must never silently convert a development command into a production command.

---

## Agent Rules

```text
New make target?
  → Add to .PHONY
  → Add ## help description
  → Declare environment scope in help text when relevant
  → Use tool variables instead of repeated hardcoded commands
  → Keep one logical action per target

Target chains another target?
  → Use $(MAKE) target-name or a prerequisite
  → Do not duplicate the chained target's raw commands

New Docker command?
  → Use $(COMPOSE) / configured compose variable
  → Do not hardcode docker compose repeatedly

Supabase local lifecycle?
  → supabase-start / supabase-stop / supabase-status
  → Always local

Supabase db reset?
  → Must explicitly use `db reset --local`
  → Help text must say LOCAL DESTRUCTIVE
  → Never use `--linked`

Supabase migration creation?
  → `make migration name=...`
  → Validate name is present
  → Creates migration file only

Supabase schema diff?
  → Explicitly use local schema
  → `make db-diff name=...`

Supabase type generation?
  → Generate from `--local` during normal development

Production Supabase migration?
  → Do not hide it behind normal local commands
  → Prefer release/CI workflow
  → Preview with dry-run before applying
  → Never reset production

Current Git branch is main?
  → `make dev` is still LOCAL
  → `make db-reset` is still LOCAL
  → Do not switch credentials based on branch

New service in compose?
  → Add logs-[service] if useful
  → Add shell-[service] if useful

Default goal?
  → Always `.DEFAULT_GOAL := help`

Init target?
  → Scaffold only deterministic project structure
  → Do not overwrite existing files
  → Do not create production secrets
```
