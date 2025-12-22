@echo off
chcp 65001 >nul
echo ========================================
echo [단계 3/5] 모든 파일 추가
echo ========================================
echo.

git add .
if %errorlevel% neq 0 (
    echo [오류] 파일 추가 실패
    pause
    exit /b 1
)

echo [성공] 모든 파일이 추가되었습니다.
echo.

echo 추가된 파일 확인:
git status --short | head -20
echo.

echo [단계 3 완료] 다음 단계로 진행하세요.
pause

