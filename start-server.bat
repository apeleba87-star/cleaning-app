@echo off
title Next.js Development Server
echo ========================================
echo Starting Next.js Development Server
echo ========================================
echo.
echo Server will run in this window.
echo Keep this window open while developing.
echo.
echo To stop the server, press Ctrl+C
echo.
echo ========================================
echo.

cd /d "%~dp0"
npm run dev

pause

