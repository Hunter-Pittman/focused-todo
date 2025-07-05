#!/bin/bash

# Comprehensive Test Runner for Focused To-Do
# Runs all tests: backend, frontend, integration tests

set -e

# Default values
COVERAGE=false
VERBOSE=false
WATCH=false
INTEGRATION=false
FILTER=""
PARALLEL=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --coverage)
            COVERAGE=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --watch)
            WATCH=true
            shift
            ;;
        --integration)
            INTEGRATION=true
            shift
            ;;
        --filter)
            FILTER="$2"
            shift 2
            ;;
        --parallel)
            PARALLEL=true
            shift
            ;;
        --help)
            echo "Usage: $0 [--coverage] [--verbose] [--watch] [--integration] [--filter PATTERN] [--parallel]"
            echo "  --coverage     Generate coverage reports"
            echo "  --verbose      Verbose output"
            echo "  --watch        Watch mode for development"
            echo "  --integration  Run integration tests"
            echo "  --filter       Filter specific tests"
            echo "  --parallel     Run tests in parallel where possible"
            exit 0
            ;;
        *)
            echo "Unknown option $1"
            exit 1
            ;;
    esac
done

ROOT_DIR="$(pwd)"
ERROR_COUNT=0
TEST_RESULTS=()

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

echo -e "${CYAN}🧪 FOCUSED TO-DO COMPREHENSIVE TEST SUITE${NC}"
echo -e "${CYAN}=============================================${NC}"
echo ""

# Function to log test results
log_test_result() {
    local component="$1"
    local status="$2"
    local details="$3"
    local duration="$4"
    
    if [[ "$status" == "PASS" ]]; then
        echo -e "✅ ${GREEN}$component: $status${NC}"
    elif [[ "$status" == "FAIL" ]]; then
        echo -e "❌ ${RED}$component: $status${NC}"
        ((ERROR_COUNT++))
    else
        echo -e "⚠️ ${YELLOW}$component: $status${NC}"
    fi
    
    if [[ -n "$details" ]]; then
        echo -e "   ${GRAY}$details${NC}"
    fi
    if [[ -n "$duration" ]]; then
        echo -e "   ${GRAY}Duration: ${duration}ms${NC}"
    fi
}

# Function to run backend tests
test_backend() {
    echo -e "\n${YELLOW}🔧 BACKEND TESTS (Go)${NC}"
    echo -e "${YELLOW}--------------------${NC}"
    
    cd "$ROOT_DIR/backend"
    
    # Enable CGO for SQLite
    export CGO_ENABLED=1
    
    local start_time=$(date +%s%3N)
    local output
    local exit_code
    
    if [[ "$COVERAGE" == "true" ]]; then
        echo -e "${GRAY}Running with coverage...${NC}"
        if output=$(go test -v -race -coverprofile=coverage.out ./... 2>&1); then
            exit_code=0
            # Generate HTML coverage report
            go tool cover -html=coverage.out -o coverage.html
        else
            exit_code=1
        fi
    else
        if output=$(go test -v -race ./... 2>&1); then
            exit_code=0
        else
            exit_code=1
        fi
    fi
    
    local duration=$(($(date +%s%3N) - start_time))
    
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${GRAY}$output${NC}"
    fi
    
    if [[ $exit_code -eq 0 ]]; then
        local test_count=$(echo "$output" | grep -c "PASS:" || true)
        if [[ "$COVERAGE" == "true" ]]; then
            log_test_result "Backend Tests" "PASS" "Coverage report: backend/coverage.html" "$duration"
        else
            log_test_result "Backend Tests" "PASS" "$test_count tests passed" "$duration"
        fi
    else
        log_test_result "Backend Tests" "FAIL" "Exit code: $exit_code"
        if [[ "$VERBOSE" != "true" ]]; then
            echo -e "${RED}$output${NC}"
        fi
    fi
    
    cd "$ROOT_DIR"
}

# Function to run frontend tests
test_frontend() {
    echo -e "\n${YELLOW}⚛️ FRONTEND TESTS (React/Jest)${NC}"
    echo -e "${YELLOW}------------------------------${NC}"
    
    cd "$ROOT_DIR/frontend"
    
    local start_time=$(date +%s%3N)
    local test_args=("test")
    
    if [[ "$WATCH" != "true" ]]; then
        test_args+=("--watchAll=false")
    fi
    if [[ "$COVERAGE" == "true" ]]; then
        test_args+=("--coverage")
    fi
    if [[ "$VERBOSE" == "true" ]]; then
        test_args+=("--verbose")
    fi
    if [[ -n "$FILTER" ]]; then
        test_args+=("--testNamePattern=$FILTER")
    fi
    
    echo -e "${GRAY}Running: npm ${test_args[*]}${NC}"
    
    local output
    local exit_code
    if output=$(npm "${test_args[@]}" 2>&1); then
        exit_code=0
    else
        exit_code=1
    fi
    
    local duration=$(($(date +%s%3N) - start_time))
    
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${GRAY}$output${NC}"
    fi
    
    if [[ $exit_code -eq 0 ]]; then
        local passed_tests=$(echo "$output" | grep -c "✓" || true)
        log_test_result "Frontend Tests" "PASS" "$passed_tests tests passed" "$duration"
        
        if [[ "$COVERAGE" == "true" ]]; then
            log_test_result "Frontend Coverage" "INFO" "Report: frontend/coverage/lcov-report/index.html"
        fi
    else
        log_test_result "Frontend Tests" "FAIL" "Exit code: $exit_code"
        if [[ "$VERBOSE" != "true" ]]; then
            echo -e "${RED}$output${NC}"
        fi
    fi
    
    cd "$ROOT_DIR"
}

# Function to run shared types tests
test_shared_types() {
    echo -e "\n${YELLOW}📦 SHARED TYPES TESTS${NC}"
    echo -e "${YELLOW}--------------------${NC}"
    
    cd "$ROOT_DIR/shared"
    
    local start_time=$(date +%s%3N)
    local output
    local exit_code
    
    if output=$(npm run build 2>&1); then
        exit_code=0
    else
        exit_code=1
    fi
    
    local duration=$(($(date +%s%3N) - start_time))
    
    if [[ $exit_code -eq 0 ]]; then
        log_test_result "Shared Types" "PASS" "TypeScript compilation successful" "$duration"
    else
        log_test_result "Shared Types" "FAIL" "TypeScript compilation failed"
        echo -e "${RED}$output${NC}"
    fi
    
    cd "$ROOT_DIR"
}

# Function to run integration tests
test_integration() {
    if [[ "$INTEGRATION" != "true" ]]; then
        return 0
    fi
    
    echo -e "\n${YELLOW}🔗 INTEGRATION TESTS${NC}"
    echo -e "${YELLOW}-------------------${NC}"
    
    local start_time=$(date +%s%3N)
    local backend_running=false
    local backend_process_pid=""
    
    # Check if backend is running
    echo -e "${GRAY}Checking backend availability...${NC}"
    if curl -s http://localhost:8080/api/health > /dev/null 2>&1; then
        backend_running=true
    else
        echo -e "${YELLOW}Backend not running, starting test instance...${NC}"
        
        # Start backend for testing
        cd "$ROOT_DIR/backend"
        export CGO_ENABLED=1
        go build -o bin/focused-todo-test ./cmd/focused-todo
        ./bin/focused-todo-test &
        backend_process_pid=$!
        sleep 3
        cd "$ROOT_DIR"
        
        if curl -s http://localhost:8080/api/health > /dev/null 2>&1; then
            backend_running=true
        else
            if [[ -n "$backend_process_pid" ]]; then
                kill "$backend_process_pid" 2>/dev/null || true
            fi
            log_test_result "Integration Tests" "FAIL" "Could not start backend for integration tests"
            return 1
        fi
    fi
    
    if [[ "$backend_running" == "true" ]]; then
        # Run API endpoint tests
        local api_tests=(
            "GET /api/health 200"
            "GET /api/projects 200"
        )
        
        local passed_api_tests=0
        local total_api_tests=${#api_tests[@]}
        
        for test in "${api_tests[@]}"; do
            read -r method endpoint expected_status <<< "$test"
            
            local response_code
            response_code=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "http://localhost:8080$endpoint" 2>/dev/null || echo "000")
            
            if [[ "$response_code" == "$expected_status" ]]; then
                ((passed_api_tests++))
                if [[ "$VERBOSE" == "true" ]]; then
                    echo -e "✅ ${GREEN}$method $endpoint - $response_code${NC}"
                fi
            else
                if [[ "$VERBOSE" == "true" ]]; then
                    echo -e "❌ ${RED}$method $endpoint - Expected $expected_status, got $response_code${NC}"
                fi
            fi
        done
        
        local duration=$(($(date +%s%3N) - start_time))
        
        if [[ $passed_api_tests -eq $total_api_tests ]]; then
            log_test_result "Integration Tests" "PASS" "$passed_api_tests/$total_api_tests API tests passed" "$duration"
        else
            log_test_result "Integration Tests" "FAIL" "Only $passed_api_tests/$total_api_tests API tests passed"
        fi
    fi
    
    # Clean up test backend if we started it
    if [[ -n "$backend_process_pid" ]]; then
        kill "$backend_process_pid" 2>/dev/null || true
    fi
}

# Function to run linting
test_linting() {
    echo -e "\n${YELLOW}🔍 LINTING & CODE QUALITY${NC}"
    echo -e "${YELLOW}-------------------------${NC}"
    
    # Frontend linting
    cd "$ROOT_DIR/frontend"
    
    local start_time=$(date +%s%3N)
    local output
    local exit_code
    
    if output=$(npm run lint 2>&1); then
        exit_code=0
    else
        exit_code=1
    fi
    
    local duration=$(($(date +%s%3N) - start_time))
    
    if [[ $exit_code -eq 0 ]]; then
        log_test_result "Frontend Lint" "PASS" "No linting errors" "$duration"
    else
        log_test_result "Frontend Lint" "WARN" "Linting issues found"
        if [[ "$VERBOSE" == "true" ]]; then
            echo -e "${YELLOW}$output${NC}"
        fi
    fi
    
    # TypeScript type checking
    start_time=$(date +%s%3N)
    if output=$(npm run type-check 2>&1); then
        exit_code=0
    else
        exit_code=1
    fi
    
    duration=$(($(date +%s%3N) - start_time))
    
    if [[ $exit_code -eq 0 ]]; then
        log_test_result "TypeScript Check" "PASS" "No type errors" "$duration"
    else
        log_test_result "TypeScript Check" "FAIL" "Type errors found"
        if [[ "$VERBOSE" != "true" ]]; then
            echo -e "${RED}$output${NC}"
        fi
    fi
    
    cd "$ROOT_DIR"
}

# Main execution
overall_start_time=$(date +%s)

# Run test suites sequentially (parallel execution would be more complex in bash)
test_shared_types
test_backend
test_frontend
test_linting
test_integration

# Generate summary report
echo -e "\n${CYAN}📊 TEST SUMMARY${NC}"
echo -e "${CYAN}===============${NC}"

overall_duration=$(($(date +%s) - overall_start_time))

if [[ $ERROR_COUNT -eq 0 ]]; then
    echo -e "${GREEN}Results: All tests passed${NC}"
else
    echo -e "${RED}Results: $ERROR_COUNT test suite(s) failed${NC}"
fi
echo -e "${GRAY}Total Duration: ${overall_duration} seconds${NC}"

if [[ "$COVERAGE" == "true" ]]; then
    echo -e "\n${CYAN}📈 COVERAGE REPORTS:${NC}"
    echo -e "${GRAY}Backend: backend/coverage.html${NC}"
    echo -e "${GRAY}Frontend: frontend/coverage/lcov-report/index.html${NC}"
fi

# Exit with error code if any tests failed
if [[ $ERROR_COUNT -gt 0 ]]; then
    echo -e "\n❌ ${RED}$ERROR_COUNT test suite(s) failed${NC}"
    exit 1
else
    echo -e "\n✅ ${GREEN}All tests passed!${NC}"
    exit 0
fi