@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Restoring app/(staff)/issues/page.tsx from commit 5f84dbf...
git checkout 5f84dbf -- "app/(staff)/issues/page.tsx"
if %errorlevel% equ 0 (
    echo.
    echo Successfully restored file from commit 5f84dbf!
) else (
    echo.
    echo Error: Could not restore file. Please check if the commit exists.
)
echo.
pause














