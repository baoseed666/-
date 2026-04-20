@echo off
if exist "%~dp0backend\dist" rmdir /s /q "%~dp0backend\dist"
start "" /d "%~dp0backend" cmd /k "npm run start:dev"
timeout /t 3 /nobreak >nul
start "" /d "%~dp0frontend" cmd /k "npm run dev"
