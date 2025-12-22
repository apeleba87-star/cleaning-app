@echo off
chcp 65001 >nul
echo ========================================
echo 충돌 해결 및 정리
echo ========================================
echo.

echo [1/6] Merge 취소...
git merge --abort
if %errorlevel% neq 0 (
    echo 경고: merge가 없거나 이미 해결되었을 수 있습니다.
)
echo.

echo [2/6] .next 폴더를 Git에서 제거 (빌드 파일이므로)...
git rm -r --cached .next 2>nul
echo.

echo [3/6] .gitignore 확인 및 수정...
echo node_modules > .gitignore
echo .next >> .gitignore
echo .env*.local >> .gitignore
git add .gitignore
echo.

echo [4/6] 변경사항 커밋...
git commit -m "Remove .next folder from git tracking"
echo.

echo [5/6] 원격 변경사항 가져오기...
git pull --no-rebase
if %errorlevel% neq 0 (
    echo.
    echo 오류: pull 실패. 충돌이 계속 발생할 수 있습니다.
    echo 'git status'로 상태를 확인해주세요.
    pause
    exit /b 1
)
echo.

echo [6/6] 푸시...
git push
if %errorlevel% neq 0 (
    echo.
    echo 오류: 푸시 실패
    pause
    exit /b 1
)
echo.

echo ========================================
echo 완료!
echo ========================================
pause

