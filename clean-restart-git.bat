@echo off
chcp 65001 >nul
echo ========================================
echo Git 저장소 깔끔하게 새로 시작
echo ========================================
echo.
echo 경고: 이 스크립트는 기존 Git 히스토리를 삭제합니다!
echo 알집 백업이 있는지 확인하세요.
echo.
pause
echo.

echo [1/5] 기존 Git 초기화 파일 제거...
if exist .git (
    echo .git 폴더를 삭제합니다...
    rmdir /s /q .git
    echo 완료
) else (
    echo .git 폴더가 없습니다. 새로 시작합니다.
)
echo.

echo [2/5] 새 Git 저장소 초기화...
git init
git branch -M main
echo 완료
echo.

echo [3/5] 모든 파일 추가...
git add .
echo 완료
echo.

echo [4/5] 첫 커밋 생성...
git commit -m "Initial commit - 전체 프로젝트"
echo 완료
echo.

echo [5/5] GitHub에 강제 푸시...
git remote add origin https://github.com/apeleba87-star/cleaning-app.git 2>nul
git remote set-url origin https://github.com/apeleba87-star/cleaning-app.git
git push -u --force origin main
if %errorlevel% neq 0 (
    echo.
    echo 오류: 푸시 실패
    pause
    exit /b 1
)
echo.

echo ========================================
echo 완료! 깔끔하게 새로 시작되었습니다.
echo ========================================
pause


