@echo off
chcp 65001 >nul
echo ========================================
echo 모든 문제 해결 및 GitHub에 저장
echo ========================================
echo.

echo [1/7] Merge 취소 (충돌 상태 해제)...
git merge --abort 2>nul
echo 완료
echo.

echo [2/7] .gitignore 충돌 마커 정리 완료
echo (이미 수정됨)
echo.

echo [3/7] .next 폴더를 Git 추적에서 제거...
git rm -r --cached .next 2>nul
echo 완료
echo.

echo [4/7] 모든 변경사항 스테이징...
git add .
echo.

echo [5/7] 현재 상태 커밋...
git commit -m "Fix merge conflicts and remove .next folder from git"
echo.

echo [6/7] 원격 변경사항 가져오기...
git pull --no-rebase
if %errorlevel% neq 0 (
    echo.
    echo 충돌이 다시 발생했습니다. 수동 해결이 필요합니다.
    echo 'git status'로 확인하세요.
    pause
    exit /b 1
)
echo.

echo [7/7] GitHub에 푸시...
git push
if %errorlevel% neq 0 (
    echo.
    echo 푸시 실패. 다시 시도하세요.
    pause
    exit /b 1
)
echo.

echo ========================================
echo 완료! 모든 파일이 GitHub에 저장되었습니다.
echo ========================================
pause


