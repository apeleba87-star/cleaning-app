@echo off
echo Starting Next.js server in background...
cd /d "%~dp0"
start "Next.js Dev Server" cmd /c "npm run dev"
timeout /t 2 /nobreak >nul
echo Server started! Check http://localhost:3000
echo.
echo To stop the server, open Task Manager and end the node.exe process
echo or close the "Next.js Dev Server" window.
pause



















