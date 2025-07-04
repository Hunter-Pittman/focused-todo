# Focused To-Do Backend Makefile

# Build variables
BINARY_NAME=focused-todo
MAIN_PATH=./cmd/focused-todo
BUILD_DIR=./bin
DIST_DIR=./dist

# Version and build info
VERSION?=$(shell git describe --tags --always --dirty)
BUILD_TIME=$(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
COMMIT=$(shell git rev-parse --short HEAD)

# Go build flags
LDFLAGS=-ldflags "-X main.version=$(VERSION) -X main.buildTime=$(BUILD_TIME) -X main.commit=$(COMMIT)"
CGO_ENABLED=1

# Default target
.PHONY: all
all: clean test build

# Build for current platform
.PHONY: build
build:
	@echo "Building $(BINARY_NAME) for current platform..."
	@mkdir -p $(BUILD_DIR)
	CGO_ENABLED=$(CGO_ENABLED) go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME) $(MAIN_PATH)
	@echo "Build complete: $(BUILD_DIR)/$(BINARY_NAME)"

# Development build (faster, no optimizations)
.PHONY: dev
dev:
	@echo "Building $(BINARY_NAME) for development..."
	@mkdir -p $(BUILD_DIR)
	CGO_ENABLED=$(CGO_ENABLED) go build -o $(BUILD_DIR)/$(BINARY_NAME) $(MAIN_PATH)
	@echo "Development build complete: $(BUILD_DIR)/$(BINARY_NAME)"

# Production build (optimized)
.PHONY: prod
prod:
	@echo "Building $(BINARY_NAME) for production..."
	@mkdir -p $(BUILD_DIR)
	CGO_ENABLED=$(CGO_ENABLED) go build $(LDFLAGS) -trimpath -o $(BUILD_DIR)/$(BINARY_NAME) $(MAIN_PATH)
	@echo "Production build complete: $(BUILD_DIR)/$(BINARY_NAME)"

# Cross-platform builds
.PHONY: build-all
build-all: clean
	@echo "Building for all platforms..."
	@mkdir -p $(DIST_DIR)
	@$(MAKE) build-linux-amd64
	@$(MAKE) build-linux-arm64
	@$(MAKE) build-darwin-amd64
	@$(MAKE) build-darwin-arm64
	@$(MAKE) build-windows-amd64
	@echo "All platform builds complete"

.PHONY: build-linux-amd64
build-linux-amd64:
	@echo "Building for Linux AMD64..."
	@mkdir -p $(DIST_DIR)/linux-amd64
	GOOS=linux GOARCH=amd64 CGO_ENABLED=$(CGO_ENABLED) go build $(LDFLAGS) -trimpath -o $(DIST_DIR)/linux-amd64/$(BINARY_NAME) $(MAIN_PATH)

.PHONY: build-linux-arm64
build-linux-arm64:
	@echo "Building for Linux ARM64..."
	@mkdir -p $(DIST_DIR)/linux-arm64
	GOOS=linux GOARCH=arm64 CGO_ENABLED=$(CGO_ENABLED) go build $(LDFLAGS) -trimpath -o $(DIST_DIR)/linux-arm64/$(BINARY_NAME) $(MAIN_PATH)

.PHONY: build-darwin-amd64
build-darwin-amd64:
	@echo "Building for macOS AMD64..."
	@mkdir -p $(DIST_DIR)/darwin-amd64
	GOOS=darwin GOARCH=amd64 CGO_ENABLED=$(CGO_ENABLED) go build $(LDFLAGS) -trimpath -o $(DIST_DIR)/darwin-amd64/$(BINARY_NAME) $(MAIN_PATH)

.PHONY: build-darwin-arm64
build-darwin-arm64:
	@echo "Building for macOS ARM64..."
	@mkdir -p $(DIST_DIR)/darwin-arm64
	GOOS=darwin GOARCH=arm64 CGO_ENABLED=$(CGO_ENABLED) go build $(LDFLAGS) -trimpath -o $(DIST_DIR)/darwin-arm64/$(BINARY_NAME) $(MAIN_PATH)

.PHONY: build-windows-amd64
build-windows-amd64:
	@echo "Building for Windows AMD64..."
	@mkdir -p $(DIST_DIR)/windows-amd64
	GOOS=windows GOARCH=amd64 CGO_ENABLED=$(CGO_ENABLED) go build $(LDFLAGS) -trimpath -o $(DIST_DIR)/windows-amd64/$(BINARY_NAME).exe $(MAIN_PATH)

# Run the application
.PHONY: run
run: dev
	@echo "Running $(BINARY_NAME)..."
	./$(BUILD_DIR)/$(BINARY_NAME)

# Run in development mode with hot reload (requires air)
.PHONY: dev-server
dev-server:
	@which air > /dev/null || (echo "Installing air for hot reload..." && go install github.com/cosmtrek/air@latest)
	@echo "Starting development server with hot reload..."
	air

# Testing
.PHONY: test
test:
	@echo "Running tests..."
	go test -v ./...

.PHONY: test-coverage
test-coverage:
	@echo "Running tests with coverage..."
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

.PHONY: test-race
test-race:
	@echo "Running tests with race detection..."
	go test -v -race ./...

.PHONY: benchmark
benchmark:
	@echo "Running benchmarks..."
	go test -v -bench=. -benchmem ./...

# Code quality
.PHONY: lint
lint:
	@which golangci-lint > /dev/null || (echo "Installing golangci-lint..." && curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(shell go env GOPATH)/bin v1.54.2)
	@echo "Running linters..."
	golangci-lint run

.PHONY: fmt
fmt:
	@echo "Formatting code..."
	go fmt ./...

.PHONY: vet
vet:
	@echo "Running go vet..."
	go vet ./...

.PHONY: check
check: fmt vet lint test-race

# Dependencies
.PHONY: deps
deps:
	@echo "Downloading dependencies..."
	go mod download

.PHONY: deps-update
deps-update:
	@echo "Updating dependencies..."
	go get -u ./...
	go mod tidy

.PHONY: deps-verify
deps-verify:
	@echo "Verifying dependencies..."
	go mod verify

# Database operations
.PHONY: db-migrate
db-migrate: dev
	@echo "Running database migrations..."
	./$(BUILD_DIR)/$(BINARY_NAME) --migrate

# Cleanup
.PHONY: clean
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf $(BUILD_DIR)
	@rm -rf $(DIST_DIR)
	@rm -f coverage.out coverage.html

# Install locally
.PHONY: install
install: prod
	@echo "Installing $(BINARY_NAME) to /usr/local/bin..."
	sudo cp $(BUILD_DIR)/$(BINARY_NAME) /usr/local/bin/
	@echo "Installation complete"

# Uninstall
.PHONY: uninstall
uninstall:
	@echo "Removing $(BINARY_NAME) from /usr/local/bin..."
	sudo rm -f /usr/local/bin/$(BINARY_NAME)
	@echo "Uninstallation complete"

# Help
.PHONY: help
help:
	@echo "Available targets:"
	@echo "  build       - Build for current platform"
	@echo "  dev         - Development build (faster)"
	@echo "  prod        - Production build (optimized)"
	@echo "  build-all   - Build for all platforms"
	@echo "  run         - Build and run the application"
	@echo "  dev-server  - Run with hot reload (requires air)"
	@echo "  test        - Run tests"
	@echo "  test-coverage - Run tests with coverage report"
	@echo "  test-race   - Run tests with race detection"
	@echo "  benchmark   - Run benchmarks"
	@echo "  lint        - Run linters"
	@echo "  fmt         - Format code"
	@echo "  vet         - Run go vet"
	@echo "  check       - Run all code quality checks"
	@echo "  deps        - Download dependencies"
	@echo "  deps-update - Update dependencies"
	@echo "  clean       - Clean build artifacts"
	@echo "  install     - Install binary to /usr/local/bin"
	@echo "  help        - Show this help message"