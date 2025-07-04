#!/bin/bash
# Build script for focused-todo backend

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
BUILD_TYPE="dev"
PLATFORM="current"
VERBOSE=false

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Build the focused-todo backend application.

OPTIONS:
    -t, --type TYPE      Build type: dev, prod, or all (default: dev)
    -p, --platform PLAT  Platform: current, linux, darwin, windows, or all (default: current)
    -v, --verbose        Enable verbose output
    -h, --help          Show this help message

EXAMPLES:
    $0                          # Development build for current platform
    $0 -t prod                  # Production build for current platform
    $0 -t prod -p all           # Production build for all platforms
    $0 --type dev --verbose     # Development build with verbose output

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--type)
            BUILD_TYPE="$2"
            shift 2
            ;;
        -p|--platform)
            PLATFORM="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate build type
case $BUILD_TYPE in
    dev|prod|all)
        ;;
    *)
        print_error "Invalid build type: $BUILD_TYPE"
        print_error "Valid types: dev, prod, all"
        exit 1
        ;;
esac

# Validate platform
case $PLATFORM in
    current|linux|darwin|windows|all)
        ;;
    *)
        print_error "Invalid platform: $PLATFORM"
        print_error "Valid platforms: current, linux, darwin, windows, all"
        exit 1
        ;;
esac

# Set verbose output
if [[ $VERBOSE == true ]]; then
    set -x
fi

# Change to backend directory
cd "$(dirname "$0")/.."

print_info "Starting build process..."
print_info "Build type: $BUILD_TYPE"
print_info "Platform: $PLATFORM"

# Execute build based on parameters
if [[ $BUILD_TYPE == "all" ]]; then
    make build-all
elif [[ $PLATFORM == "all" ]]; then
    make build-all
else
    # Build for specific type and platform
    if [[ $PLATFORM == "current" ]]; then
        make $BUILD_TYPE
    else
        case $BUILD_TYPE in
            dev|prod)
                make "build-${PLATFORM}-amd64"
                ;;
        esac
    fi
fi

print_info "Build completed successfully!"

# Show build artifacts
if [[ -d "./bin" ]]; then
    print_info "Build artifacts in ./bin:"
    ls -la ./bin/
fi

if [[ -d "./dist" ]]; then
    print_info "Distribution artifacts in ./dist:"
    find ./dist -type f -name "focused-todo*" | head -10
fi