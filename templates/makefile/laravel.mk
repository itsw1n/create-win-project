COMPOSE := docker compose
LARAVEL := $(COMPOSE) exec backend

.DEFAULT_GOAL := help

.PHONY: help setup build run dev stop logs test format analyse migrate shell clean
help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-16s\033[0m %s\n", $$1, $$2}'

setup: ## First run: build, start, create key, and migrate
	$(COMPOSE) build
	$(COMPOSE) up -d
	$(LARAVEL) php artisan key:generate
	$(LARAVEL) php artisan migrate

build: ## Build development container images
	$(COMPOSE) build

run: ## Start existing images without rebuilding
	$(COMPOSE) up -d

dev: ## Start existing images and follow logs
	$(COMPOSE) up

stop: ## Stop containers without deleting data
	$(COMPOSE) down

logs: ## Follow application logs
	$(COMPOSE) logs -f

test: ## Run Laravel tests in the container
	$(LARAVEL) php artisan test

format: ## Format PHP source
	$(LARAVEL) ./vendor/bin/pint

analyse: ## Run Larastan
	$(LARAVEL) ./vendor/bin/phpstan analyse --memory-limit=1G

migrate: ## Apply pending Laravel migrations
	$(LARAVEL) php artisan migrate

shell: ## Open a shell in the Laravel container
	$(LARAVEL) sh

clean: ## Remove containers and project volumes (destructive)
	$(COMPOSE) down -v --remove-orphans
