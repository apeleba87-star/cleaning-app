@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo 오늘 날짜의 커밋 목록
echo ========================================
echo.
git log --since="today" --pretty=format:"%h | %ad | %an | %s" --date=format:"%Y-%m-%d %H:%M:%S" --all
echo.
echo ========================================
echo 최근 10개 커밋 (상세)
echo ========================================
echo.
git log -10 --pretty=format:"%h | %ad | %an | %s" --date=format:"%Y-%m-%d %H:%M:%S" --all
echo.
pause


