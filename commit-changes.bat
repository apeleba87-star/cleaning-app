@echo off
chcp 65001 >nul
git add .
git commit -m "매장 상태 대시보드 기능 추가

- 자동 새로고침 기능 (30분마다, 8시~23시)
- 수동 새로고침 버튼 추가
- 매장별 즉시 새로고침 기능 (문제보고가 있는 경우)
- 매장 정렬 로직 구현 (작업일 > 문제 상태 > 알파벳순)
- 모달 구현 (제품 입고 사진, 매장 상황 상세, 요청란 상황 상세)
- 문제보고 확인/완료 기능
- 상태별 건수 표시 (미처리/처리완료, 미확인/확인)
- 데이터 집계 기간 변경 (30일 기준)
- API 엔드포인트 추가 (inventory-photos, problem-reports, lost-items, requests)
- CSS 파일 수정 (globals.css에 Tailwind 디렉티브 추가)"
git push


