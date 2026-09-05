# =============================================================================
# Makefile — create-win-project CLI (fully dockerized, no host Node needed)
# Image is CI-aligned with the current tested compatibility profile
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

.PHONY: generate
generate: ## Run the generator in a disposable container (reuses the image)
	@$(COMPOSE) run --rm app

.PHONY: run
run: generate ## Alias for generate (does not rebuild an existing image)

.PHONY: rebuild
rebuild: ## Rebuild the generator image without Docker layer cache
	@$(COMPOSE) build --no-cache app

.PHONY: doctor
doctor: ## Show available host/container development tools
	@$(COMPOSE) run --rm app doctor

.PHONY: demo
demo: ## Run the CLI to .demo/ for testing
	@mkdir -p .demo
	@$(COMPOSE) run --rm -w /app/.demo app

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
audit: ## Audit engine boundaries and stack-owned environment prefixes
	@$(COMPOSE) run --rm --entrypoint sh app -c 'echo "=== Engine stack branching ==="; grep -rn "stack\.frontendKey\|stack\.backendKey" src/engine/ || echo "  None found ✓"; echo ""; echo "=== Stack environment prefixes ==="; grep -rn "NEXT_PUBLIC_\|VITE_\|EXPO_PUBLIC_" src/stacks/ || echo "  None found ✓"'

.PHONY: fix-templates
fix-templates: ## Check engine files for leftover stack identity checks
	@$(COMPOSE) run --rm --entrypoint sh app -c 'echo "Remaining identity checks in src/engine/:"; grep -rn "isNextjs\|isReact\|isSpringBoot\|isSupabase\|isPrisma" src/engine/ || echo "  None found ✓"'

.PHONY: templates
templates: ## List all template files
	@$(COMPOSE) run --rm --entrypoint sh app -c 'find templates/ -type f | sort 2>/dev/null || echo "  No templates/ folder found"'
