@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo ========================================
echo GitHub 저장 시작
echo ========================================
echo.

echo [1/3] 변경된 파일 추가 중...
git add .
if %errorlevel% neq 0 (
    echo 오류: 파일 추가 실패
    pause
    exit /b 1
)
echo 파일 추가 완료
echo.

echo [2/3] 커밋 중...
git commit -m "사용자 역할 수정 기능 추가: 도급(개인), 도급(업체) 역할 지원 및 사용자 목록 표시 수정"
if %errorlevel% neq 0 (
    echo 경고: 커밋 실패 (변경사항이 없거나 이미 커밋된 파일일 수 있음)
    echo.
)
echo 커밋 완료
echo.

echo [3/3] GitHub에 푸시 중...
git push origin main
if %errorlevel% neq 0 (
    echo 오류: 푸시 실패
    pause
    exit /b 1
)
echo.
echo ========================================
echo GitHub 저장 완료!
echo ========================================
pause

