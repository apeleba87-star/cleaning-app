@echo off
chcp 65001 > nul
cd /d "c:\Users\한\Desktop\테스트\청소 관리앱"
git add .
git commit -m "빌드 에러 수정: handleConfirm, handleForward 함수 추가

- app/business/supply-requests/SupplyRequestList.tsx
- 누락된 handleConfirm, handleForward 함수 구현
- API 엔드포인트 호출 로직 추가"
git push
pause

