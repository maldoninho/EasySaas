@echo off
setlocal
cd /d "%~dp0"
node scripts\bootstrap.mjs --production
exit /b %ERRORLEVEL%
