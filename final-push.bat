@echo off
chcp 65001 >nul
echo ========================================
echo 최종 수정사항 GitHub에 푸시
echo ========================================
echo.

echo [1/4] 현재 상태 확인...
git status --short
echo.

echo [2/4] 수정된 파일 추가...
git add app/business/users/CreateUserForm.tsx
echo.

echo [3/4] 커밋 생성...
git commit -m "Fix: handleEmailChange 함수 추가"
if %errorlevel% neq 0 (
    echo 커밋할 변경사항이 없거나 이미 커밋되었습니다.
    git status --short
)
echo.

echo [4/4] GitHub에 푸시...
git push
if %errorlevel% neq 0 (
    echo 푸시 실패
    pause
    exit /b 1
)
echo.

echo ========================================
echo 완료! GitHub에 저장되었습니다.
echo Vercel이 자동으로 재배포를 시작합니다.
echo ========================================
pause


