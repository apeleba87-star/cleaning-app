@echo off
chcp 65001
echo ========================================
echo Step 2 실행 결과 확인
echo ========================================
echo.

if exist .git (
    echo [확인] .git 폴더가 존재합니다.
    echo.
    echo Git 상태 확인:
    git status
) else (
    echo [오류] .git 폴더가 없습니다.
    echo step2-init-git.bat를 먼저 실행해야 합니다.
)

echo.
pause

