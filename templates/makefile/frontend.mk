# Makefile — {{PROJECT_NAME}} frontend-only convenience aliases
# Make is optional; every target delegates to cross-platform npm scripts.

NPM_DIR := {{FRONTEND_DIR}}

.DEFAULT_GOAL := help
.PHONY: help install dev build lint format check test

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-16s\033[0m %s\n", $$1, $$2}'

install: ## Install exact dependencies from the lockfile
	npm --prefix $(NPM_DIR) ci

dev: ## Start the frontend development server
	npm --prefix $(NPM_DIR) run dev

build: ## Build for production
	npm --prefix $(NPM_DIR) run build

lint: ## Run ESLint when supported
	npm --prefix $(NPM_DIR) run lint --if-present

format: ## Format files with the project-local Prettier
	npm --prefix $(NPM_DIR) run format

check: ## Run the generated quality checks
	npm --prefix $(NPM_DIR) run check

test: ## Run tests when configured
	npm --prefix $(NPM_DIR) run test --if-present
