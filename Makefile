# Slack Agent Makefile
BINARY_NAME=slack-agent
GO=go
GOFLAGS=-v
BUILD_DIR=./build
SRC_DIR=./cmd/slack-agent
VERSION=$(shell git describe --tags --always --dirty)
LDFLAGS=-ldflags "-X main.Version=$(VERSION)"
DOCKER_IMAGE=ghcr.io/takutakahashi/slack-agent

# Go module management
.PHONY: mod
mod:
	$(GO) mod download
	$(GO) mod tidy

# Build binary
.PHONY: build
build: mod
	mkdir -p $(BUILD_DIR)
	$(GO) build $(GOFLAGS) $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME) $(SRC_DIR)

# Run the application
.PHONY: run
run: build
	$(BUILD_DIR)/$(BINARY_NAME) start

# Run tests
.PHONY: test
test:
	$(GO) test -v -race -coverprofile=coverage.out ./...

# Run tests with coverage report
.PHONY: coverage
coverage: test
	$(GO) tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated at coverage.html"

# Run linter
.PHONY: lint
lint:
	@which golangci-lint > /dev/null || (echo "Installing golangci-lint..." && go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest)
	golangci-lint run ./...

# Format code
.PHONY: fmt
fmt:
	$(GO) fmt ./...

# Vet code
.PHONY: vet
vet:
	$(GO) vet ./...

# Install dependencies
.PHONY: deps
deps:
	$(GO) get -v ./...

# Clean build artifacts
.PHONY: clean
clean:
	rm -rf $(BUILD_DIR)
	rm -f coverage.out coverage.html

# Docker build
.PHONY: docker-build
docker-build:
	docker build -t $(DOCKER_IMAGE):$(VERSION) -t $(DOCKER_IMAGE):latest .

# Docker push
.PHONY: docker-push
docker-push: docker-build
	docker push $(DOCKER_IMAGE):$(VERSION)
	docker push $(DOCKER_IMAGE):latest

# Install binary to system
.PHONY: install
install: build
	cp $(BUILD_DIR)/$(BINARY_NAME) /usr/local/bin/

# Uninstall binary from system
.PHONY: uninstall
uninstall:
	rm -f /usr/local/bin/$(BINARY_NAME)

# Generate code (if needed)
.PHONY: generate
generate:
	$(GO) generate ./...

# Check if code is properly formatted
.PHONY: check-fmt
check-fmt:
	@if [ -n "$$(gofmt -l .)" ]; then \
		echo "The following files are not formatted:"; \
		gofmt -l .; \
		exit 1; \
	fi

# Run all checks (format, vet, lint, test)
.PHONY: check
check: check-fmt vet lint test

# Help command
.PHONY: help
help:
	@echo "Available targets:"
	@echo "  mod         - Download and tidy Go modules"
	@echo "  build       - Build the binary"
	@echo "  run         - Build and run the application"
	@echo "  test        - Run tests"
	@echo "  coverage    - Run tests with coverage report"
	@echo "  lint        - Run golangci-lint"
	@echo "  fmt         - Format code"
	@echo "  vet         - Run go vet"
	@echo "  deps        - Install dependencies"
	@echo "  clean       - Clean build artifacts"
	@echo "  docker-build- Build Docker image"
	@echo "  docker-push - Build and push Docker image"
	@echo "  install     - Install binary to /usr/local/bin"
	@echo "  uninstall   - Remove binary from /usr/local/bin"
	@echo "  generate    - Run code generation"
	@echo "  check-fmt   - Check if code is formatted"
	@echo "  check       - Run all checks (format, vet, lint, test)"
	@echo "  help        - Show this help message"

# Default target
.DEFAULT_GOAL := help