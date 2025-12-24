@echo off
chcp 65001 > nul
cd /d "c:\Users\한\Desktop\테스트\청소 관리앱"
git add .
git commit -m "TypeScript 컴파일 에러 수정: Set을 배열로 변환하는 방식 변경

- app/api/store-manager/supply-requests/route.ts
- [...new Set(...)] 대신 Array.from(new Set(...)) 사용
- downlevelIteration 플래그 없이도 동작하도록 수정"
git push
pause

