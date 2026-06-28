@echo off
title Labak - Starting...

cd /d "%~dp0"

echo [1/3] Starting Backend (port 8000)...
if not exist "backend\venv\Scripts\activate.bat" (
    echo Setting up virtual environment...
    cd backend
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
    cd ..
)
start "Labak Backend" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate.bat && python run.py"

echo [2/3] Waiting for backend...
timeout /t 3 /nobreak > nul

echo [3/3] Starting Frontend (port 5500)...
start "Labak Frontend" cmd /k "cd /d %~dp0frontend && python -m http.server 5500"

timeout /t 2 /nobreak > nul

echo Opening browser...
start "" "http://localhost:5500"

echo.
echo ================================
echo  Labak is running!
echo  Store:  http://localhost:5500
echo  Admin:  http://localhost:5500/admin/index.html
echo  API:    http://localhost:8000/api/docs
echo ================================
echo.
pause
