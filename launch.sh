#!/bin/bash

# ============================================================
# 🐺 Wolverine Universal Launcher (macOS / Linux)
# ============================================================

set -e

echo "🐺 Starting Wolverine..."

# 1. Port Cleanup
echo "🧹 Cleaning up previous instances on port 18789..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    lsof -ti:18789 | xargs kill -9 2>/dev/null || true
else
    # Linux
    fuser -k 18789/tcp 2>/dev/null || true
fi

# 2. Dependency Check
if [ ! -d "node_modules" ]; then
    echo "📦 node_modules not found. Installing dependencies..."
    npm install
fi

# 2. Build Check
if [ ! -d "dist" ]; then
    echo "🏗️ Build artifacts not found. Building Neural Engine..."
    npm run build
fi

# 3. Environment Check
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "📝 .env not found. Creating from example..."
        cp .env.example .env
    fi
fi

# 4. Starting Gateway
echo "📡 Launching Gateway..."
npm run gateway
