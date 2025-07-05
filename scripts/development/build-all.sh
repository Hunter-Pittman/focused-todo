#!/bin/bash

# Focused To-Do Production Build Script
echo "🏗️ Building Focused To-Do for Production"

# Find the project root directory (where CLAUDE.md is located)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT=""

# Search upward from script directory to find project root
current_dir="$SCRIPT_DIR"
while [ "$current_dir" != "/" ]; do
    if [ -f "$current_dir/CLAUDE.md" ]; then
        PROJECT_ROOT="$current_dir"
        break
    fi
    current_dir="$(dirname "$current_dir")"
done

if [ -z "$PROJECT_ROOT" ]; then
    echo "❌ Could not find project root (CLAUDE.md not found)"
    exit 1
fi

echo "📁 Project root: $PROJECT_ROOT"
cd "$PROJECT_ROOT"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check dependencies
echo "📋 Checking dependencies..."

if ! command_exists go; then
    echo "❌ Go is not installed. Please install Go 1.21 or later."
    exit 1
fi

if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or later."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

echo "✅ All dependencies found"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
mkdir -p dist/

# Build the shared types first
echo "🔧 Building shared types..."
cd shared
npm install
npm run build
cd ..

# Build the backend
echo "🔧 Building backend..."
cd backend
make prod
cp bin/focused-todo ../dist/
cd ..

# Build the frontend
echo "🔧 Building frontend..."
cd frontend
npm install
npm run build

# Package the Electron app
echo "📦 Packaging Electron application..."
npm run package:dir
cd ..

echo ""
echo "🎉 Build complete!"
echo "📁 Backend binary: dist/focused-todo"
echo "📁 Frontend: frontend/dist/"
echo "📁 Electron app: frontend/dist/"
echo ""
echo "To run the production build:"
echo "1. Start the backend: ./dist/focused-todo"
echo "2. The Electron app will be in frontend/dist/"