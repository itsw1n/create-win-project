# =============================================================================
# Makefile — create-win-project CLI (fully dockerized, no host Node needed)
# Image is CI-aligned: node:20-alpine
# All commands run inside Docker via `docker compose run`
# =============================================================================

IMAGE   := create-win-project:dev
COMPOSE := docker compose

.DEFAULT_GOAL := help

# ─── Help — grouped by ##@ category ──────────────────────────────────────────
.PHONY: help
help: ## Show all available commands (grouped)
	@awk 'BEGIN {FS=":.*##"} /^##@/ {printf "\n\033[1m%s\033[0m\n", substr($$0,5); next} /^[a-zA-Z0-9_.-]+:.*##/ {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

##@ Core (Docker - no host Node needed)

.PHONY: build
build: ## Build Docker image
	@docker build -t $(IMAGE) .

.PHONY: run
run: ## Run the CLI (interactive)
	@$(COMPOSE) run --rm app

.PHONY: demo
demo: ## Run the CLI to .demo/ for testing
	@mkdir -p .demo
	@$(COMPOSE) run --rm app

.PHONY: test
test: ## Run all tests
	@$(COMPOSE) run --rm --entrypoint npm app test

.PHONY: shell
shell: ## Open shell inside container
	@$(COMPOSE) run --rm --entrypoint sh app

.PHONY: clean
clean: ## Remove .demo/ and Docker image
	@docker rmi $(IMAGE) 2>/dev/null || true
	@rm -rf .demo

##@ Checks (all inside Docker)

.PHONY: audit
audit: ## Audit lib/ for identity checks and hardcoded env prefixes
	@$(COMPOSE) run --rm --entrypoint sh app -c 'echo "=== Identity checks in lib/ ==="; grep -rn "isNextjs\|isReact\|isSpringBoot\|isSupabase\|isPrisma" lib/ || echo "  None found ✓"; echo ""; echo "=== Hardcoded env prefixes in lib/ ==="; grep -rn "NEXT_PUBLIC_\|VITE_\|EXPO_PUBLIC_" lib/ || echo "  None found ✓"'

.PHONY: fix-templates
fix-templates: ## Check lib/files.js for leftover identity checks
	@$(COMPOSE) run --rm --entrypoint sh app -c 'echo "Remaining identity checks in lib/files.js:"; grep -n "isNextjs\|isReact\|isSpringBoot\|isSupabase\|isPrisma" lib/files.js || echo "  None found ✓"'

.PHONY: templates
templates: ## List all template files
	@$(COMPOSE) run --rm --entrypoint sh app -c 'find templates/ -type f | sort 2>/dev/null || echo "  No templates/ folder found"'
