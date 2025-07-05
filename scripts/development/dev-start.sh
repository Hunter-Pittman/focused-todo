#!/bin/bash

# Focused To-Do Development Startup Script
echo "🚀 Starting Focused To-Do Development Environment"

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

# Build the shared types first
echo "🔧 Building shared types..."
cd shared
npm install
npm run build
cd ..

# Build and start the backend
echo "🔧 Building and starting backend..."
cd backend
make dev
echo "🔴 Starting backend server..."
./bin/focused-todo &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Build and start the frontend
echo "🔧 Building and starting frontend..."
cd frontend
npm install
npm run build:electron

echo "🟢 Starting Electron application..."
npm run dev &
FRONTEND_PID=$!

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    if [ ! -z "$BACKEND_PID" ]; then
        echo "Stopping backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        echo "Stopping frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null
    fi
    echo "✅ Cleanup complete"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo ""
echo "🎉 Focused To-Do is starting up!"
echo "📝 Backend API: http://localhost:8080"
echo "💻 Frontend: Starting Electron app..."
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for processes
wait $FRONTEND_PID
cleanup