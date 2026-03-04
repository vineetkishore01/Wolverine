@echo off
:: Wolverine Auto-Start Script
:: This script is registered with Windows Task Scheduler to run at login.
:: It starts the Wolverine gateway in a new terminal window.

title Wolverine Gateway

:: Change to Wolverine directory
cd /d "D:\Wolverine"

:: Start the gateway
node dist/cli/index.js gateway start
