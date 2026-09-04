# =============================================================================
# Makefile — {{PROJECT_NAME}} ({{STACK}} + Supabase)
# =============================================================================

.DEFAULT_GOAL := help
NPM_DIR := {{FRONTEND_DIR}}

.PHONY: help dev build lint test test-e2e db-start db-stop db-reset db-test db-types

help: ## Show all commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev: ## Start dev server + Supabase local
	npm --prefix $(NPM_DIR) run supabase:start && npm --prefix $(NPM_DIR) run dev

build: ## Build frontend for production
	npm --prefix $(NPM_DIR) run build

lint: ## Run ESLint
	npm --prefix $(NPM_DIR) run lint

test: ## Run Vitest
	npm --prefix $(NPM_DIR) run test --if-present

test-e2e: ## Run Playwright E2E tests
	npm --prefix $(NPM_DIR) run test:e2e --if-present

db-start: ## Start local Supabase stack
	npm --prefix $(NPM_DIR) run supabase:start

db-stop: ## Stop local Supabase stack
	npm --prefix $(NPM_DIR) run supabase:stop

db-reset: ## Reset local DB (apply migrations + seed)
	npm --prefix $(NPM_DIR) run supabase:reset

db-test: ## Run local database and RLS tests
	npm --prefix $(NPM_DIR) run supabase:test

db-types: ## Regenerate TypeScript types from Supabase schema
	npm --prefix $(NPM_DIR) run supabase:types
