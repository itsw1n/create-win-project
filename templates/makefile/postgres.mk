# =============================================================================
# Makefile — {{PROJECT_NAME}} ({{STACK}} + Prisma)
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
	@mkdir -p docs/{api,architecture,guides,decisions}
	@find . -type d -empty -not -path "./.git/*" -exec touch {}/.gitkeep \;
	@echo "✅ Done. Run: make dev"
