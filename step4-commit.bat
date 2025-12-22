@echo off
chcp 65001 >nul
echo ========================================
echo [단계 4/5] 첫 커밋 생성
echo ========================================
echo.

git commit -m "Initial commit - 전체 프로젝트"
if %errorlevel% neq 0 (
    echo [오류] 커밋 실패
    pause
    exit /b 1
)

echo [성공] 커밋이 생성되었습니다.
echo.

echo 커밋 정보 확인:
git log --oneline -1
echo.

echo [단계 4 완료] 다음 단계로 진행하세요.
pause

