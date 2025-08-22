.PHONY: all init format_backend format lint build run_backend dev help tests coverage clean_python_cache clean_npm_cache clean_all

# Configurations
VERSION=$(shell grep "^version" pyproject.toml | sed 's/.*\"\(.*\)\"$$/\1/')
DOCKERFILE=docker/build_and_push.Dockerfile
DOCKERFILE_BACKEND=docker/build_and_push_backend.Dockerfile
DOCKERFILE_FRONTEND=docker/frontend/build_and_push_frontend.Dockerfile
DOCKER_COMPOSE=docker_example/docker-compose.yml
PYTHON_REQUIRED=$(shell grep '^requires-python[[:space:]]*=' pyproject.toml | sed -n 's/.*"\([^"]*\)".*/\1/p')
RED=\033[0;31m
NC=\033[0m # No Color
GREEN=\033[0;32m

log_level ?= debug
host ?= 0.0.0.0
port ?= 7860
env ?= .env
open_browser ?= true
path = src/backend/base/axiestudio/frontend
workers ?= 1
async ?= true
lf ?= false
ff ?= true
all: help

######################
# UTILITIES
######################

# Some directories may be mount points as in devcontainer, so we need to clear their
# contents rather than remove the entire directory. But we must also be mindful that
# we are not running in a devcontainer, so need to ensure the directories exist.
# See https://code.visualstudio.com/remote/advancedcontainers/improve-performance
CLEAR_DIRS = $(foreach dir,$1,$(shell mkdir -p $(dir) && find $(dir) -mindepth 1 -delete))

# check for required tools
check_tools:
	@command -v uv >/dev/null 2>&1 || { echo >&2 "$(RED)uv is not installed. Aborting.$(NC)"; exit 1; }
	@command -v npm >/dev/null 2>&1 || { echo >&2 "$(RED)NPM is not installed. Aborting.$(NC)"; exit 1; }
	@echo "$(GREEN)All required tools are installed.$(NC)"

help: ## show this help message
	@echo '----'
	@grep -hE '^\S+:.*##' $(MAKEFILE_LIST) | \
	awk -F ':.*##' '{printf "\033[36mmake %s\033[0m: %s\n", $$1, $$2}' | \
	column -c2 -t -s :
	@echo '----'
	@echo 'For frontend commands, run: make help_frontend'

######################
# DEPENDENCIES
######################

init: check_tools ## install dependencies
	uv sync --dev --all-extras
	cd src/frontend && npm install
	make install_frontend

install_frontend: ## install frontend dependencies
	cd src/frontend && npm install

install_backend: ## install backend dependencies
	uv sync --dev --all-extras

######################
# FORMATTING & LINTING
######################

format: format_backend format_frontend ## run all formatters

format_backend: ## format backend code
	uv run ruff format .
	uv run ruff check . --fix

format_frontend: ## format frontend code
	cd src/frontend && npm run format

lint: lint_backend lint_frontend ## run all linters

lint_backend: ## lint backend code
	uv run ruff check .
	uv run mypy --namespace-packages --explicit-package-bases src/backend/base/

lint_frontend: ## lint frontend code
	cd src/frontend && npm run lint

######################
# BUILDING
######################

build: build_frontend build_backend ## build frontend and backend

build_frontend: ## build frontend
	cd src/frontend && npm run build
	cp -r src/frontend/build/* $(path)

build_backend: ## build backend
	uv build

######################
# RUNNING
######################

run: ## run Axie Studio
	@echo "$(GREEN)Running Axie Studio...$(NC)"
	uv run axiestudio run \
		--host $(host) \
		--port $(port) \
		--log-level $(log_level) \
		--env-file $(env) \
		$(if $(filter true,$(open_browser)),--open-browser,--no-open-browser)

run_backend: ## run backend only
	@echo "$(GREEN)Running Axie Studio backend...$(NC)"
	uv run axiestudio run \
		--host $(host) \
		--port $(port) \
		--log-level $(log_level) \
		--env-file $(env) \
		--backend-only \
		--no-open-browser

run_frontend: ## run frontend only
	cd src/frontend && npm run dev

dev: ## run in development mode
	@echo "$(GREEN)Running Axie Studio in development mode...$(NC)"
	uv run axiestudio run \
		--host $(host) \
		--port $(port) \
		--log-level $(log_level) \
		--env-file $(env) \
		--dev \
		$(if $(filter true,$(open_browser)),--open-browser,--no-open-browser)

######################
# TESTING
######################

tests: ## run tests
	uv run pytest tests/ -x

tests_backend: ## run backend tests
	uv run pytest src/backend/tests/ -x

tests_frontend: ## run frontend tests
	cd src/frontend && npm run test

coverage: ## run tests with coverage
	uv run pytest --cov=src/backend/base/axiestudio --cov-report=html --cov-report=xml

######################
# DOCKER
######################

docker_build: ## build docker image
	docker build -f $(DOCKERFILE) -t axiestudio/axiestudiov1:$(VERSION) -t axiestudio/axiestudiov1:latest .

docker_build_backend: ## build backend docker image
	docker build -f $(DOCKERFILE_BACKEND) -t axiestudio/axiestudiov1-backend:$(VERSION) -t axiestudio/axiestudiov1-backend:latest .

docker_build_frontend: ## build frontend docker image
	docker build -f $(DOCKERFILE_FRONTEND) -t axiestudio/axiestudiov1-frontend:$(VERSION) -t axiestudio/axiestudiov1-frontend:latest .

docker_run: ## run docker container
	docker run -it --rm -p $(port):7860 axiestudio/axiestudiov1:latest

docker_compose_up: ## run docker compose
	docker-compose -f $(DOCKER_COMPOSE) up

docker_compose_down: ## stop docker compose
	docker-compose -f $(DOCKER_COMPOSE) down

docker_test: ## test docker build
	powershell -ExecutionPolicy Bypass -File scripts/test-docker-build.ps1

docker_deploy: ## deploy to docker hub
	powershell -ExecutionPolicy Bypass -File scripts/docker-hub-deploy.ps1 -AccessToken $$env:DOCKER_HUB_TOKEN

docker_production: ## run production docker compose
	docker-compose -f docker-compose.production.yml up

######################
# CLEANING
######################

clean_python_cache: ## clean python cache
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".mypy_cache" -exec rm -rf {} +

clean_npm_cache: ## clean npm cache
	cd src/frontend && npm run clean
	cd src/frontend && rm -rf node_modules

clean_all: clean_python_cache clean_npm_cache ## clean all caches

######################
# HELP
######################

help_frontend: ## show frontend help
	@echo 'Frontend commands:'
	@echo '  make install_frontend  - install frontend dependencies'
	@echo '  make build_frontend    - build frontend'
	@echo '  make run_frontend      - run frontend in development mode'
	@echo '  make format_frontend   - format frontend code'
	@echo '  make lint_frontend     - lint frontend code'
	@echo '  make tests_frontend    - run frontend tests'

######################
# ADVANCED COMMANDS
######################

setup_devcontainer: ## set up the development container
	make install_backend
	make install_frontend
	make build_frontend
	uv run axiestudio --frontend-path src/frontend/build

setup_env: ## set up the environment
	@sh ./scripts/setup/setup_env.sh

backend: setup_env install_backend ## run the backend in development mode
	@-kill -9 $$(lsof -t -i:7860) || true
ifdef login
	@echo "Running backend autologin is $(login)";
	AXIESTUDIO_AUTO_LOGIN=$(login) uv run uvicorn \
		--factory axiestudio.main:create_app \
		--host 0.0.0.0 \
		--port $(port) \
		$(if $(filter-out 1,$(workers)),, --reload) \
		--env-file $(env) \
		--loop asyncio \
		$(if $(workers),--workers $(workers),)
else
	@echo "Running backend respecting the $(env) file";
	uv run uvicorn \
		--factory axiestudio.main:create_app \
		--host 0.0.0.0 \
		--port $(port) \
		$(if $(filter-out 1,$(workers)),, --reload) \
		--env-file $(env) \
		--loop asyncio \
		$(if $(workers),--workers $(workers),)
endif

build_and_run: setup_env ## build the project and run it
	$(call CLEAR_DIRS,dist src/backend/base/dist)
	make build
	uv run pip install dist/*.tar.gz
	uv run axiestudio run

build_and_install: ## build the project and install it
	@echo 'Removing dist folder'
	$(call CLEAR_DIRS,dist src/backend/base/dist)
	make build && uv run pip install dist/*.whl && pip install src/backend/base/dist/*.whl --force-reinstall

build_axiestudio_base:
	cd src/backend/base && uv build $(args)

build_axiestudio:
	uv lock --no-upgrade
	uv build $(args)
ifdef restore
	mv pyproject.toml.bak pyproject.toml
	mv uv.lock.bak uv.lock
endif
