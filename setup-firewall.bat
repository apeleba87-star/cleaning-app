@echo off
echo ================================================================================
echo Windows 방화벽 규칙 추가 (포트 3000 허용)
echo ================================================================================

netsh advfirewall firewall add rule name="Next.js Dev Server (Port 3000)" dir=in action=allow protocol=TCP localport=3000 enable=yes

if %errorlevel% equ 0 (
    echo [정보] 포트 3000에 대한 인바운드 규칙이 성공적으로 추가되었습니다.
) else (
    echo [오류] 방화벽 규칙 추가에 실패했습니다. 관리자 권한으로 실행했는지 확인하세요.
)

echo.
echo 계속하려면 아무 키나 누르십시오.
pause > nul
