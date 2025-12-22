@echo off
title Next.js Development Server (Mobile Access)
echo ========================================
echo Starting Next.js Development Server
echo for Mobile Device Access
echo ========================================
echo.
echo Server will run on 0.0.0.0:3000
echo This allows access from mobile devices on the same network.
echo.
echo IMPORTANT: Make sure your PC and mobile device are on the same WiFi network!
echo.
echo To find your PC's IP address, run: ipconfig
echo Then access from mobile: http://[YOUR_IP]:3000
echo.
echo To stop the server, press Ctrl+C
echo.
echo ========================================
echo.

cd /d "%~dp0"
npm run dev:mobile

pause










