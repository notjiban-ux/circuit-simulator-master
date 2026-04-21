@echo off
SETLOCAL EnableDelayedExpansion

title Circuit Simulator Launcher

echo ==========================================
echo   Circuit Simulator - One Click Launcher
echo ==========================================

REM Check if Node.js is installed
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install it from https://nodejs.org/
    pause
    exit /b 1
)

REM Check root node_modules
if not exist "node_modules\" (
    echo [INFO] Installing root dependencies...
    call npm install --legacy-peer-deps
)

REM Check pcb-simulator node_modules
if not exist "pcb-simulator\node_modules\" (
    echo [INFO] Installing pcb-simulator dependencies...
    pushd pcb-simulator
    call npm install --legacy-peer-deps
    popd
)

echo.
echo [SUCCESS] Everything is ready! Starting the application...
echo.
echo ==========================================
echo   The backend will start on port 5000
echo   The frontend will start on port 3000
echo   Opening browser...
echo ==========================================
echo.

start http://localhost:3000

call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Application failed to start.
    pause
)
