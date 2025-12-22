@echo off
chcp 65001 >nul
echo ========================================
echo   ngrok 모바일 테스트 시작
echo ========================================
echo.

REM ngrok 설치 확인
where ngrok >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [오류] ngrok이 설치되어 있지 않습니다.
    echo.
    echo 설치 방법:
    echo 1. https://ngrok.com/download 에서 다운로드
    echo 2. 또는: choco install ngrok
    echo.
    pause
    exit /b 1
)

echo [1/3] Next.js 서버 시작 중...
echo 주의: 포트 3000이 사용 중이면 자동으로 3001로 변경됩니다.
start "Next.js Server" cmd /k "npm run dev"
timeout /t 5 /nobreak >nul

echo [2/3] ngrok 터널 생성 중...
echo.
echo ========================================
echo   ngrok 터널 정보
echo ========================================
echo.
echo 다음 HTTPS URL을 모바일에서 사용하세요:
echo (아래 ngrok 출력에서 "Forwarding" URL 확인)
echo.
echo ========================================
echo.

echo [2/3] ngrok 터널 생성 중...
echo.
echo ⚠️  중요: Next.js 서버가 실행된 포트를 확인하세요!
echo    (포트 3000이 사용 중이면 3001로 변경됨)
echo.
timeout /t 2 /nobreak >nul

REM ngrok 실행 (새 창에서)
REM host-header 옵션으로 경고 페이지 문제 해결
REM 포트는 사용자가 확인 후 수동으로 변경 가능
start "ngrok Tunnel" cmd /k "ngrok http 3001 --host-header=rewrite"

echo [3/3] 완료!
echo.
echo ========================================
echo   사용 방법
echo ========================================
echo.
echo 1. 위에 열린 ngrok 창에서 HTTPS URL 확인
echo 2. 모바일 브라우저에서 해당 URL 접속
echo 3. 카메라 권한 허용
echo.
echo ========================================
echo.
echo 서버를 중지하려면 각 창을 닫으세요.
echo.
pause










