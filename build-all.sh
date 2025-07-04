#!/bin/bash

# Focused To-Do Production Build Script
echo "🏗️ Building Focused To-Do for Production"

# Check if we're in the right directory
if [ ! -f "CLAUDE.md" ]; then
    echo "❌ Please run this script from the focused-todo root directory"
    exit 1
fi

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