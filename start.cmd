@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo [ERRO] Node.js nao foi encontrado.
  echo Instale o Node.js 24 LTS pelo site oficial:
  echo https://nodejs.org/en/download
  echo.
  pause
  exit /b 1
)

for /f "tokens=1,2 delims=." %%V in ('node -p "process.versions.node"') do (
  set NODE_MAJOR=%%V
  set NODE_MINOR=%%W
)
if not "%NODE_MAJOR%"=="24" (
  echo.
  echo [ERRO] Esta versao requer Node.js 24 LTS.
  echo Versao encontrada:
  node -v
  echo Use nvm install 24.18.0 e nvm use 24.18.0, ou instale em https://nodejs.org/en/download
  echo.
  pause
  exit /b 1
)

if %NODE_MINOR% LSS 12 (
  echo.
  echo [ERRO] Esta versao requer Node.js 24.12 ou superior.
  node -v
  pause
  exit /b 1
)

node scripts\bootstrap.mjs
set EXIT_CODE=%ERRORLEVEL%
if not "%EXIT_CODE%"=="0" pause
exit /b %EXIT_CODE%
