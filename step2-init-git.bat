@echo off
chcp 65001 >nul
echo ========================================
echo [단계 2/5] 새 Git 저장소 초기화
echo ========================================
echo.

git init
if %errorlevel% neq 0 (
    echo [오류] Git 초기화 실패
    pause
    exit /b 1
)

git branch -M main
if %errorlevel% neq 0 (
    echo [오류] 브랜치 이름 변경 실패
    pause
    exit /b 1
)

echo [성공] Git 저장소가 초기화되었습니다.
echo.

echo [단계 2 완료] 다음 단계로 진행하세요.
pause

