@echo off
chcp 65001 >nul
echo Git 상태 확인 중...
echo.

echo [1] FinancialSummarySection.tsx 파일 상태:
git status app/business/dashboard/FinancialSummarySection.tsx
echo.

echo [2] financial-summary API 파일 상태:
git status app/api/business/financial-summary/route.ts
echo.

echo [3] 전체 Git 상태:
git status --short | findstr /i "Financial financial-summary dashboard"
echo.

pause

