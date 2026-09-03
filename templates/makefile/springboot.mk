# =============================================================================
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
	$(BACKEND) mvn flyway:migrate

seed: ## Seed the database with dev data
	$(DB) psql -U $${POSTGRES_USER} -d $${POSTGRES_DB} -f /docker-entrypoint-initdb.d/seed.sql

db-reset: ## Drop + migrate + seed (full fresh slate)
	$(BACKEND) mvn flyway:clean flyway:migrate
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
	$(BACKEND) mvn test

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
	@mkdir -p {{FRONTEND_DIR}}
	@mkdir -p backend/src/main/resources/db/{migration,dev}
	@mkdir -p docs/{api,architecture,guides,decisions}
	@find . -type d -empty -not -path "./.git/*" -exec touch {}/.gitkeep \;
	@echo "✅ Done. Run: make dev"
