@echo off
chcp 65001 > nul
cd /d "%~dp0"
git add .
git commit -m "사용자 역할 수정 기능 추가: 도급(개인), 도급(업체) 역할 지원 및 사용자 목록 표시 수정"
git push origin main

