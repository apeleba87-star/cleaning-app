@echo off
chcp 65001 >nul
git add .
git commit -m "체크리스트 진행률 계산 로직 수정 및 항목 타입 수정 SQL 스크립트 추가"
git push
pause

