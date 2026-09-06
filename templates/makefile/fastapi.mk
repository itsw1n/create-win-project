# =============================================================================
# Makefile — {{PROJECT_NAME}}
# =============================================================================

# Variables
COMPOSE      := docker compose
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

.PHONY: dev up down restart logs logs-back clean

dev: ## Start all containers and follow logs
	$(COMPOSE) up --build

up: ## Start all containers in background
	$(COMPOSE) up -d --build

down: ## Stop and remove all containers
	$(COMPOSE) down

restart: down up ## Stop then start all containers

logs: ## Follow logs from all containers
	$(COMPOSE) logs -f

logs-back: ## Follow backend logs only
	$(COMPOSE) logs -f backend

clean: ## Remove containers, volumes, orphans (full reset)
	$(COMPOSE) down -v --remove-orphans

# =============================================================================
# Database
# =============================================================================

.PHONY: migrate db-shell

migrate: ## Run pending Alembic migrations
	$(BACKEND) uv run alembic upgrade head

db-shell: ## Open psql shell inside DB container
	$(DB) psql -U $${POSTGRES_USER} -d $${POSTGRES_DB}

# =============================================================================
# Shells
# =============================================================================

.PHONY: shell-back

shell-back: ## Open shell inside backend container
	$(BACKEND) sh

# =============================================================================
# Quality
# =============================================================================

.PHONY: lint test test-back

lint: ## Run Ruff check and format check (backend)
	$(BACKEND) uv run ruff check .
	$(BACKEND) uv run ruff format --check .

test: test-back ## Run all tests

test-back: ## Run pytest (backend)
	$(BACKEND) uv run pytest

# =============================================================================
# Production
# =============================================================================

.PHONY: build prod-up prod-down

build: ## Build production Docker images
	$(COMPOSE) -f docker-compose.prod.yml build

prod-up: ## Start production stack
	$(COMPOSE) -f docker-compose.prod.yml up -d --build

prod-down: ## Stop production stack
	$(COMPOSE) -f docker-compose.prod.yml down
