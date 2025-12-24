@echo off
chcp 65001 > nul
cd /d "c:\Users\한\Desktop\테스트\청소 관리앱"
git add .
git commit -m "빌드 에러 수정: SupplyList에서 'rejected' 상태 제거

- components/SupplyList.tsx
- SupplyRequestStatus 타입에 없는 'rejected' 상태 제거
- actions 배열에서 거부 버튼 제거"
git push
pause

