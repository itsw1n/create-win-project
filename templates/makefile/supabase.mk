# =============================================================================
# Makefile — {{PROJECT_NAME}} ({{STACK}} + Supabase)
# =============================================================================

.DEFAULT_GOAL := help

.PHONY: help dev build lint test test-e2e db-start db-stop db-reset db-types init

help: ## Show all commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev: ## Start dev server + Supabase local
	npx supabase start && npm run dev

build: ## Build frontend for production
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
	npx supabase gen types typescript --local > {{SRC_DIR}}/types/database.types.ts

init: ## Scaffold project folder structure
	@mkdir -p {{SRC_DIR}}/{app,features,components/{ui,shared,layout},lib,stores,types,schemas,constants}
	@mkdir -p supabase/migrations
	@mkdir -p docs/{api,architecture,guides,decisions}
	@find . -type d -empty -not -path "./.git/*" -exec touch {}/.gitkeep \;
	@echo "✅ Done. Run: make dev"
