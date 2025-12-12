@echo off
chcp 65001 >nul
cd /d "%~dp0"
git status
echo.
echo ===== Remote Repository =====
git remote -v
echo.
echo ===== Recent Commits =====
git log --oneline -5
echo.
echo ===== Branch Information =====
git branch -a
pause

