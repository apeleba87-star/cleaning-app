@echo off
echo ========================================
echo Next.js Development Server
echo Firewall Setup Script
echo ========================================
echo.
echo This script will add a firewall rule to allow
echo incoming connections on port 3000 for mobile access.
echo.
echo NOTE: This requires Administrator privileges.
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause >nul
echo.

echo Checking for existing firewall rule...
netsh advfirewall firewall show rule name="Next.js Dev Server" >nul 2>&1
if %errorlevel% == 0 (
    echo Existing rule found. Removing it...
    netsh advfirewall firewall delete rule name="Next.js Dev Server"
    echo.
)

echo Adding firewall rule for port 3000...
netsh advfirewall firewall add rule name="Next.js Dev Server" dir=in action=allow protocol=TCP localport=3000

if %errorlevel% == 0 (
    echo.
    echo ========================================
    echo SUCCESS! Firewall rule added.
    echo ========================================
    echo.
    echo You can now access the server from mobile devices.
    echo.
    echo To find your PC's IP address, run:
    echo   ipconfig
    echo.
    echo Then access from mobile:
    echo   http://[YOUR_IP]:3000
    echo.
) else (
    echo.
    echo ========================================
    echo ERROR: Failed to add firewall rule.
    echo ========================================
    echo.
    echo Please run this script as Administrator:
    echo 1. Right-click this file
    echo 2. Select "Run as administrator"
    echo.
)

echo.
pause










