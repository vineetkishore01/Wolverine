@echo off
:: ============================================================
:: 🐺 Wolverine Universal Launcher (Windows)
:: ============================================================

echo 🐺 Starting Wolverine...

:: 1. Port Cleanup
echo 🧹 Cleaning up previous instances on port 18789...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :18789') do taskkill /f /pid %%a 2>nul

:: 2. Dependency Check
if not exist "node_modules" (
    echo 📦 node_modules not found. Installing dependencies...
    call npm install
)

:: 2. Build Check
if not exist "dist" (
    echo 🏗️ Build artifacts not found. Building Neural Engine...
    call npm run build
)

:: 3. Environment Check
if not exist ".env" (
    if exist ".env.example" (
        echo 📝 .env not found. Creating from example...
        copy .env.example .env
    )
)

:: 4. Starting Gateway
echo 📡 Launching Gateway...
call npm run gateway
