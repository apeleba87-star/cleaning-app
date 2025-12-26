@echo off
chcp 65001 >nul
cd /d "%~dp0"
git add -A
git commit -m "바코드 스캔 기능 구현 및 제품 위치 업로드 기능 개선

- html5-qrcode 라이브러리를 사용한 실제 바코드 스캔 기능 구현
- 바코드 인식 시 자동 검색 기능 추가
- 제품 위치 업로드 기능 구현 및 TypeScript 빌드 에러 수정
- CSV 파일 업로드로 제품 마스터 자동 등록 기능 추가
- 매장명 매핑 기능 구현 (store_name_mappings 테이블)
- 업로드 완료 후 자동 새로고침 기능 추가
- RLS 정책 추가 (store_name_mappings 테이블)
- 에러 처리 및 로깅 개선"
git push

