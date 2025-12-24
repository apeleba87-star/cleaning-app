@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo 현재 변경사항 확인 중...
git status

echo.
echo 변경사항 추가 중...
git add .

echo.
echo 커밋 메시지:
echo "프렌차이즈 관리자 앱 간소화 및 점주용 앱 상세 페이지 복구"
echo.
git commit -m "프렌차이즈 관리자 앱 간소화 및 점주용 앱 상세 페이지 복구

- 프렌차이즈 관리자 네비게이션을 매장 관리 현황만 남김
- 다른 페이지들을 매장 상태로 리다이렉트
- 매장 상태 페이지의 상세 보기 링크 복구
- 프렌차이즈 관리자용 상세 페이지 및 MonthlyReport 컴포넌트 생성
- 프렌차이즈 관리자 앱에서 월간 리포트 탭 제거
- 직원 앱 출퇴근 및 사진 업로드 로딩 인디케이터 추가"

echo.
echo GitHub에 푸시 중...
git push

echo.
echo 완료!
pause
