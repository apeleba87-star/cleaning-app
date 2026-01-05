const { execSync } = require('child_process');

console.log('=== GitHub에 푸시 시작 ===\n');

try {
  console.log('[1/4] Git 상태 확인...');
  const status = execSync('git status --short', { encoding: 'utf8' });
  console.log(status || '변경사항 없음');
  console.log();

  console.log('[2/4] 모든 변경사항 추가...');
  execSync('git add .', { stdio: 'inherit' });
  console.log('✅ 완료\n');

  console.log('[3/4] 커밋 생성...');
  const commitMessage = `feat: 야간매장 관리일 로직 개선 및 UI 개선

- 야간매장 관리일 범위 판단 함수 추가 (isWithinManagementPeriod, calculateWorkDateForNightShift, isManagementDay)
- calculateWorkDate 함수에 workEndHour 파라미터 추가
- 직원앱에서 야간매장 관리일 표시 개선 (관리일 범위 밖이어도 오늘이 관리일이면 표시)
- 야간매장 관리시작 시간 이전 클릭 시 확인 모달 추가
- 요일 표시를 월요일 기준으로 정렬
- 빠른 지출 등록 시 금액 저장 오류 수정 (천 단위 구분 쉼표 처리)
- 업체관리자 대시보드 야간매장 상태 표시 로직 추가
- 직원앱에 야간매장 배지 및 관리 시작 시간 표시 추가`;
  execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
  console.log('✅ 완료\n');

  console.log('[4/4] GitHub에 푸시...');
  execSync('git push', { stdio: 'inherit' });
  console.log('\n✅ 푸시 완료!');
  console.log('Vercel이 자동으로 배포를 시작합니다.');

} catch (error) {
  console.error('\n❌ 오류 발생:', error.message);
  if (error.stdout) console.log('출력:', error.stdout);
  if (error.stderr) console.error('에러:', error.stderr);
  process.exit(1);
}



