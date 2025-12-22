@echo off
chcp 65001 >nul
echo ========================================
echo [단계 5/5] GitHub에 강제 푸시
echo ========================================
echo.

echo 원격 저장소 확인 및 설정...
git remote -v
echo.

git remote add origin https://github.com/apeleba87-star/cleaning-app.git 2>nul
git remote set-url origin https://github.com/apeleba87-star/cleaning-app.git
echo.

echo GitHub에 강제 푸시 중...
git push -u --force origin main
if %errorlevel% neq 0 (
    echo.
    echo [오류] 푸시 실패
    pause
    exit /b 1
)

echo.
echo [성공] GitHub에 푸시되었습니다!
echo.

echo [단계 5 완료] 모든 작업이 완료되었습니다!
echo GitHub에서 확인해주세요: https://github.com/apeleba87-star/cleaning-app
pause

