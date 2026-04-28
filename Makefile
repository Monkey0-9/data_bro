.PHONY: help install test test-all lint lint-all format build up down clean ci

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install all dependencies
	cd auth && pip install -r requirements.txt
	cd signal && pip install -r requirements.txt
	cd ui && npm install

test: ## Run all tests
	cd auth && pytest -v --tb=short
	cd signal && pytest -v --tb=short
	cd ingest && cargo test
	cd ui && npm run build

test-all: ## Run all tests including e2e
	cd auth && pytest -v --tb=short
	cd signal && pytest -v --tb=short
	cd ingest && cargo test
	cd ui && npm run build
	cd ui && npx cypress run

lint: ## Run all linters
	cd auth && ruff check . && ruff format --check .
	cd signal && ruff check . && ruff format --check .
	cd ingest && cargo clippy -- -D warnings && cargo fmt -- --check
	cd ui && npm run lint

lint-all: ## Run all linters with strict checks
	cd auth && ruff check . && ruff format --check .
	cd signal && ruff check . && ruff format --check .
	cd ingest && cargo clippy -- -D warnings && cargo fmt -- --check
	cd ui && npm run lint
	cd ui && npx cypress verify

format: ## Format all code
	cd auth && ruff format .
	cd signal && ruff format .
	cd ingest && cargo fmt
	cd ui && npm run format

build: ## Build Docker images
	docker compose build

up: ## Start all services
	docker compose up -d

down: ## Stop all services
	docker compose down -v

clean: ## Clean build artifacts
	find . -type d -name node_modules -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name target -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name dist -exec rm -rf {} + 2>/dev/null || true

ci: lint test ## Run CI pipeline (lint + test)
