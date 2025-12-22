@echo off
chcp 65001 >nul
echo ========================================
echo 개발 서버 재시작
echo ========================================
echo.

echo [1/3] 실행 중인 Node.js 프로세스 종료...
taskkill /F /IM node.exe 2>nul
if %errorlevel% neq 0 (
    echo 실행 중인 Node.js 프로세스가 없습니다.
)
echo.

echo [2/3] .next 폴더 삭제 (빌드 캐시 정리)...
if exist .next (
    rmdir /s /q .next
    echo .next 폴더 삭제 완료
) else (
    echo .next 폴더가 없습니다.
)
echo.

echo [3/3] 개발 서버 시작...
echo.
echo 개발 서버가 시작됩니다. 브라우저에서 http://localhost:3000 을 열어주세요.
echo 서버를 종료하려면 Ctrl+C를 누르세요.
echo.
npm run dev

