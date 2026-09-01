# =============================================================================
# Makefile — create-win-project CLI
# =============================================================================

# Variables
NODE := node

.DEFAULT_GOAL := help

.PHONY: help
help: ## Show all available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

.PHONY: run
run: ## Run the CLI
	@$(NODE) index.js

.PHONY: demo
demo: ## Run the CLI in .demo/ for testing (project lands in .demo/<project name>)
	@mkdir -p .demo
	@cd .demo && $(NODE) ../index.js

.PHONY: clean
clean: ## Delete all generated demo projects (.demo/)
	@rm -rf .demo
.PHONY: test
test: ## Run all tests
	@npx vitest run

.PHONY: fix-templates
fix-templates: ## Audit files.js for remaining isXxx identity checks
	@echo "Remaining identity checks in lib/files.js:"
	@grep -n "isNextjs\|isReact\|isSpringBoot\|isSupabase\|isPrisma" lib/files.js \
		|| echo "  None found ✓"

.PHONY: audit
audit: ## Full audit — identity checks and hardcoded prefixes across all lib/ files
	@echo "=== Identity checks in lib/ ==="
	@grep -rn "isNextjs\|isReact\|isSpringBoot\|isSupabase\|isPrisma" lib/ \
		|| echo "  None found ✓"
	@echo ""
	@echo "=== Hardcoded env prefixes in lib/ ==="
	@grep -rn "NEXT_PUBLIC_\|VITE_\|EXPO_PUBLIC_" lib/ \
		|| echo "  None found ✓"

.PHONY: templates
templates: ## List all template files
	@find templates/ -type f | sort 2>/dev/null || echo "  No templates/ folder found"

# =============================================================================
# Docker — clone & run without host Node (CI-aligned: node:20-alpine)
# =============================================================================

.PHONY: docker-build
docker-build: ## Build Docker image (no host Node needed)
	@docker build -t create-win-project:dev .

.PHONY: docker-run
docker-run: ## Run CLI in Docker (interactive)
	@docker compose run --rm app

.PHONY: docker-demo
docker-demo: ## Run CLI in Docker, output to .demo/
	@mkdir -p .demo
	@docker compose run --rm app

.PHONY: docker-test
docker-test: ## Run tests in Docker (no host Node needed)
	@docker compose run --rm --entrypoint npm app test

.PHONY: docker-shell
docker-shell: ## Shell into Docker container
	@docker compose run --rm --entrypoint sh app

.PHONY: docker-clean
docker-clean: ## Remove Docker image and .demo/
	@docker rmi create-win-project:dev 2>/dev/null || true
	@rm -rf .demo
