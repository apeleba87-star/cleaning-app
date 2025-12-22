@echo off
chcp 65001 >nul
echo ========================================
echo [단계 1/5] 기존 Git 초기화 파일 제거
echo ========================================
echo.

if exist .git (
    echo .git 폴더를 발견했습니다. 삭제하시겠습니까?
    echo 이 작업은 되돌릴 수 없습니다. 알집 백업이 있는지 확인하세요.
    echo.
    pause
    rmdir /s /q .git
    if %errorlevel% equ 0 (
        echo [성공] .git 폴더가 삭제되었습니다.
    ) else (
        echo [오류] .git 폴더 삭제 실패
        pause
        exit /b 1
    )
) else (
    echo .git 폴더가 없습니다. 새로 시작할 준비가 되었습니다.
)

echo.
echo [단계 1 완료] 다음 단계로 진행하세요.
pause

