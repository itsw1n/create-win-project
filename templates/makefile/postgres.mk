# =============================================================================
# Makefile — {{PROJECT_NAME}} ({{STACK}} + Prisma)
# =============================================================================

COMPOSE := docker compose

.DEFAULT_GOAL := help

.PHONY: help dev build lint test db-start db-stop db-migrate db-reset db-studio

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
	npm run db:migrate

db-reset: ## Reset DB + migrate + seed
	npm run db:reset

db-studio: ## Open Prisma Studio
	npm run db:studio
