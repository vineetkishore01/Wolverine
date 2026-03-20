#!/bin/bash

echo "🐺 WOLVERINE | CLEAN BODY IGNITION"
echo "------------------------------------"

# 1. Surgical Cleanup with error reporting
echo "[1/3] Freeing ports (18789, 8001)..."

PORT1_PIDS=$(lsof -ti:18789 2>/dev/null || echo "")
PORT2_PIDS=$(lsof -ti:8001 2>/dev/null || echo "")

if [ -n "$PORT1_PIDS" ]; then
  echo "  Killing processes on port 18789: $PORT1_PIDS"
  echo "$PORT1_PIDS" | xargs kill -9 2>&1 || echo "  Note: Process may have already exited"
fi

if [ -n "$PORT2_PIDS" ]; then
  echo "  Killing processes on port 8001: $PORT2_PIDS"
  echo "$PORT2_PIDS" | xargs kill -9 2>&1 || echo "  Note: Process may have already exited"
fi

if [ -z "$PORT1_PIDS" ] && [ -z "$PORT2_PIDS" ]; then
  echo "  Ports already free."
fi

# 2. Start Gateway & Mind
echo "[2/3] Activating Nervous System & Mind..."
echo "Note: Ensure Chetna (The Memory Layer) is running separately on the URL in settings.json"

~/.bun/bin/bun run src/index.ts
