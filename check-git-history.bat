@echo off
chcp 65001 >nul
echo ========================================
echo Git 히스토리 확인
echo ========================================
echo.

echo [1] app/business/users/CreateUserForm.tsx 파일의 최근 커밋:
git log --oneline -5 -- app/business/users/CreateUserForm.tsx
echo.

echo [2] 최근 커밋에서 handleEmailChange 확인:
git log -1 --format="%H" -- app/business/users/CreateUserForm.tsx | xargs git show | findstr /n "handleEmailChange"
echo.

echo [3] 로컬 파일의 handleEmailChange 확인:
findstr /n "handleEmailChange" app\business\users\CreateUserForm.tsx
echo.

pause

