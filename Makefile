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