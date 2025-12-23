@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo 깃허브 저장 시작
echo ========================================
echo.

echo [1/4] Git 상태 확인...
git status
echo.

echo [2/4] 모든 변경사항 추가...
git add .
echo.

echo [3/4] 커밋 생성...
git commit -m "야간 매장 기능 추가, 회사 관리 비밀번호 변경 기능 추가, 매장 목록 UI 개선

- 야간 매장 기능 구현 (is_night_shift, work_start_hour, work_end_hour 필드 추가)
- StoreForm에 야간 매장 설정 UI 추가 (체크박스, 근무 시간 선택)
- StoreList에 야간 매장 배지 표시 추가
- 매장 목록에서 상세보기 링크 제거, 인원을 인원배정으로 변경
- 회사 관리 페이지에 비밀번호 변경 기능 추가
- 비밀번호 변경 시 실시간 유효성 검사 (현재 비밀번호, 새 비밀번호 확인)
- form 중첩 문제 해결 (비밀번호 변경 폼을 별도 폼으로 분리)
- 현재 비밀번호 오류 표시 기능 추가 (빨간색 필드, 에러 메시지)
- 새 비밀번호 확인 실시간 검증 추가"
echo.

if %ERRORLEVEL% NEQ 0 (
    echo 커밋 실패!
    pause
    exit /b 1
)

echo [4/4] 깃허브에 푸시...
git push
echo.

if %ERRORLEVEL% NEQ 0 (
    echo 푸시 실패!
    pause
    exit /b 1
)

echo ========================================
echo 깃허브 저장 완료!
echo ========================================
pause
