@echo off
chcp 65001 >nul
git add .
git commit -m "매출 등록 시 이미 등록된 매장 드롭다운에서 제외 기능 추가"
git push
