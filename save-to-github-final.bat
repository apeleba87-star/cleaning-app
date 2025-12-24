@echo off
chcp 65001 > nul
cd /d "c:\Users\한\Desktop\테스트\청소 관리앱"
git add .
git commit -m "타입 에러 수정: store_owner의 store_id 조회 방식 변경

- app/api/store-manager/supply-requests/[id]/complete/route.ts
- app/api/store-manager/supply-requests/route.ts
- user.store_id 직접 접근 대신 users 테이블에서 조회하도록 변경
- TypeScript 타입 에러 해결"
git push
pause

