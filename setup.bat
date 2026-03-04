@echo off
:: Wolverine Setup Script
:: Run this once to:
::   1. Build Wolverine with the new self-update tool
::   2. Register Wolverine to auto-start on Windows login

title Wolverine Setup
cd /d "D:\Wolverine"

echo.
echo ========================================
echo   Wolverine Setup
echo ========================================
echo.

echo [1/3] Building Wolverine...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed! Check the errors above.
    pause
    exit /b 1
)
echo [OK] Build complete.
echo.

echo [2/3] Refreshing global link...
call npm link
if %ERRORLEVEL% NEQ 0 (
    echo [WARN] npm link failed - smallclaw command may not be globally available
    echo        You can still run it via: node dist\cli\index.js
)
echo.

echo [3/3] Registering Windows startup task...
powershell -ExecutionPolicy Bypass -File "D:\Wolverine\install-startup.ps1"
echo.

echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo  Auto-start: Wolverine will now open when you log in
echo  Self-update: Tell the AI "update yourself" via Telegram
echo.
echo  To test right now: smallclaw gateway start
echo.
pause
