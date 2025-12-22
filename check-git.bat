@echo off
chcp 65001 >nul
echo === Git 상태 확인 ===
echo.
echo 1. 변경된 파일:
git diff --name-only
echo.
echo 2. 스테이징된 파일:
git diff --cached --name-only
echo.
echo 3. 최근 커밋 (5개):
git log --oneline -5
echo.
echo 4. 원격 저장소:
git remote -v
echo.
echo 5. 현재 브랜치:
git branch --show-current
echo.
pause



