@echo off
chcp 65001 >nul
echo ========================================
echo GitHub에 푸시하여 Vercel 자동 배포 트리거
echo ========================================
echo.

echo [1/4] Git 상태 확인...
git status --short
echo.

echo [2/4] 모든 변경사항 추가...
git add .
echo.

echo [3/4] 커밋 생성...
git commit -m "Fix: 체크리스트 날짜 검증 KST 적용 및 점주 앱 이미지 확대 기능 추가"
echo.

echo [4/4] GitHub에 푸시...
git push
echo.

echo ========================================
echo 완료! Vercel이 자동으로 배포를 시작합니다.
echo ========================================
pause



