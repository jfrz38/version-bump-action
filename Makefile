.DEFAULT_GOAL := help

NPM ?= npm

.PHONY: help
help: ## show make targets
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {sub("\\n",sprintf("\n%22c"," "), $$2);printf " \033[36m%-20s\033[0m  %s\n", $$1, $$2}' $(MAKEFILE_LIST)

.PHONY: install
install: ## install dependencies from package-lock.json
	$(NPM) ci

.PHONY: build
build: ## build the bundled GitHub Action into dist/index.js
	$(NPM) run build

.PHONY: lint
lint: ## run ESLint
	$(NPM) run lint

.PHONY: test
test: ## run unit tests
	$(NPM) test

.PHONY: typecheck
typecheck: ## run TypeScript type checks
	$(NPM) run typecheck

.PHONY: package
package: ## build the distributable action package
	$(NPM) run package

.PHONY: validate
validate: ## run typecheck, tests, and build
	$(NPM) run validate

.PHONY: check
check: lint validate ## run all local checks used before release

.PHONY: dist-check
dist-check: build ## verify dist/index.js is up to date after build
	@if ! git diff --exit-code -- dist/index.js; then \
		echo "::error::dist/index.js is out of date. Run 'make build' and commit the updated bundle."; \
		exit 1; \
	fi

.PHONY: ci
ci: install check dist-check ## run the release workflow checks locally
