#!/bin/bash

echo "🐺 WOLVERINE | CLEAN IGNITION SEQUENCE"
echo "------------------------------------"

# 1. Surgical Cleanup
echo "[1/4] Freeing ports (18789, 1987, 8001)..."
lsof -ti:18789,1987,8001 | xargs kill -9 2>/dev/null || true
ps aux | grep -E "bun run|target/release/chetna|python3 src/mind|uvicorn src/orchestration" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null || true

# 2. Start Chetna (Soul)
echo "[2/4] Igniting Rust Memory Soul (Chetna)..."
cd chetna
if [ -f "./target/release/chetna" ]; then
    ./target/release/chetna > ../chetna.log 2>&1 &
else
    cargo run --release > ../chetna.log 2>&1 &
fi
cd ..

# 3. Wait for port binding
echo "[3/4] Wiring connections (waiting 8s)..."
sleep 8

# 4. Start Gateway & Mind
echo "[4/4] Activating Nervous System & Mind..."
~/.bun/bin/bun run src/index.ts
