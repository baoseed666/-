@echo off
chcp 65001 >nul
set ROOT=%~dp0

echo [1/4] 检查并安装依赖...
if not exist "%ROOT%backend\node_modules" (
  echo   安装后端依赖...
  pushd "%ROOT%backend"
  call npm install
  popd
)
if not exist "%ROOT%frontend\node_modules" (
  echo   安装前端依赖...
  pushd "%ROOT%frontend"
  call npm install
  popd
)

echo [2/4] 启动 Docker 数据库...
docker compose -f "%ROOT%docker-compose.yml" up -d postgres redis
if %errorlevel% neq 0 (
  echo 错误: Docker 启动失败，请确认 Docker Desktop 已运行并重试
  pause
  exit /b 1
)
timeout /t 3 /nobreak >nul

echo [3/4] 启动后端...
start "抠门大王-后端" /d "%ROOT%backend" cmd /k "npm run start:dev"
timeout /t 5 /nobreak >nul

echo [4/4] 启动前端...
start "抠门大王-前端" /d "%ROOT%frontend" cmd /k "npm run dev"

echo.
echo ✅ 启动完成
echo    后端: http://localhost:3000
echo    前端: http://localhost:5173
echo    登录验证码: 123456
echo.
pause
