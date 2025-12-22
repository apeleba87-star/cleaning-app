@echo off
chcp 65001 >nul
echo ========================================
echo   ngrok 모바일 테스트 (포트 자동 확인)
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

echo [1/4] 기존 프로세스 확인 중...
REM 포트 3000, 3001 사용 중인 프로세스 확인
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo 포트 3000 사용 중: PID %%a
    set PORT3000_IN_USE=1
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do (
    echo 포트 3001 사용 중: PID %%a
    set PORT3001_IN_USE=1
)

echo.
echo [2/4] Next.js 서버 시작 중...
start "Next.js Server" cmd /k "npm run dev"
timeout /t 5 /nobreak >nul

echo.
echo [3/4] 서버 포트 확인 중...
echo 잠시만 기다려주세요...
timeout /t 3 /nobreak >nul

REM 포트 확인
set SERVER_PORT=3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do (
    set SERVER_PORT=3001
    echo ✅ Next.js 서버가 포트 3001에서 실행 중입니다.
    goto :port_found
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    set SERVER_PORT=3000
    echo ✅ Next.js 서버가 포트 3000에서 실행 중입니다.
    goto :port_found
)

echo ⚠️  서버 포트를 자동으로 확인할 수 없습니다.
echo 수동으로 확인 후 ngrok을 실행하세요.
set /p SERVER_PORT="서버 포트를 입력하세요 (3000 또는 3001): "

:port_found
echo.
echo [4/4] ngrok 터널 생성 중...
echo.
echo ========================================
echo   ngrok 터널 정보
echo ========================================
echo.
echo Next.js 서버 포트: %SERVER_PORT%
echo ngrok 포워딩: https://xxx.ngrok-free.app -> http://localhost:%SERVER_PORT%
echo.
echo 다음 HTTPS URL을 모바일에서 사용하세요:
echo (아래 ngrok 출력에서 "Forwarding" URL 확인)
echo.
echo ========================================
echo.

REM ngrok 실행 (새 창에서)
start "ngrok Tunnel" cmd /k "ngrok http %SERVER_PORT% --host-header=rewrite"

echo 완료!
echo.
echo ========================================
echo   사용 방법
echo ========================================
echo.
echo 1. 위에 열린 ngrok 창에서 HTTPS URL 확인
echo 2. 모바일 브라우저에서 해당 URL 접속
echo 3. 경고 페이지에서 "Visit Site" 클릭
echo 4. 카메라 권한 허용
echo.
echo ========================================
echo.
echo 서버를 중지하려면 각 창을 닫으세요.
echo.
pause










