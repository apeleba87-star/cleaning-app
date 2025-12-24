@echo off
chcp 65001 >nul
git add .
git commit -m "체크리스트 진행률 계산 로직 수정 및 완료된 체크리스트 표시 개선"
git push
pause

