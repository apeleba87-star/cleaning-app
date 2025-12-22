@echo off
chcp 65001 >nul
echo ========================================
echo 파일 확인 및 강제 푸시
echo ========================================
echo.

echo [1/5] 로컬 파일에서 handleEmailChange 함수 확인...
findstr /n "handleEmailChange" app\business\users\CreateUserForm.tsx
echo.

echo [2/5] Git 상태 확인...
git status app/business/users/CreateUserForm.tsx
echo.

echo [3/5] 파일 강제 추가...
git add -f app/business/users/CreateUserForm.tsx
echo.

echo [4/5] 커밋 생성...
git commit -m "Fix: handleEmailChange 함수 추가"
if %errorlevel% neq 0 (
    echo 이미 커밋되었거나 변경사항이 없습니다.
    git status app/business/users/CreateUserForm.tsx
)
echo.

echo [5/5] GitHub에 푸시...
git push
echo.

echo ========================================
echo 완료!
echo ========================================
pause

