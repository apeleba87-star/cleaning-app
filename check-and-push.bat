@echo off
chcp 65001 >nul
echo ========================================
echo 현재 상태 확인 및 푸시
echo ========================================
echo.

echo [1/4] 현재 Git 상태 확인...
git status
echo.

echo [2/4] 최근 커밋 확인...
git log --oneline -3
echo.

echo [3/4] 수정된 파일 확인...
git status --short
echo.

echo [4/4] 변경사항이 있다면 추가 및 푸시...
git add types/db.ts app/api/business/payrolls/[id]/route.ts 2>nul
git status --short
echo.

set /p answer="변경사항을 커밋하고 푸시하시겠습니까? (Y/N): "
if /i "%answer%"=="Y" (
    git commit -m "Fix: 타입 에러 수정 - payrolls daily_wage/work_days, StoreFile business_registration 추가"
    git push
    echo.
    echo 푸시 완료!
) else (
    echo 취소되었습니다.
)

echo.
pause


