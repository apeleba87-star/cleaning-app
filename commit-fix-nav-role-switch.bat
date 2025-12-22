@echo off
chcp 65001 >nul
cd /d "%~dp0"
git add components/NavRoleSwitch.tsx
git commit -m "Fix type error: Remove staff check after early return in NavRoleSwitch"
git push
pause




