@echo off
chcp 65001 > nul
cd /d "c:\Users\한\Desktop\테스트\청소 관리앱"
git add .
git commit -m "빌드 에러 수정: BottomNavigation의 calculateChecklistProgress 호출 수정

- components/staff/BottomNavigation.tsx
- 'all' 파라미터 제거 (stage 파라미터는 optional이므로 생략)
- progress.total/completed -> progress.totalItems/completedItems로 수정"
git push
pause

