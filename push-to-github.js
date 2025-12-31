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
  const commitMessage = `feat: 미관리 매장 확인 기능 개선 및 모바일 최적화

- 네비게이션 라벨을 '미관리 매장 확인'으로 변경 및 대시보드 옆으로 이동
- 페이지 제목 및 설명 문구 개선
- 야간 매장 집계 완료 시 '야간 매장 집계 완료' 텍스트 표시
- API에 total_night_stores 필드 추가
- 대시보드 섹션 텍스트 변경
- 모바일/태블릿 반응형 UI 최적화
- 모바일 햄버거 메뉴 구현 (왼쪽 슬라이드)
- 2025년 최신 UI 트렌드 적용 (그라데이션, Glassmorphism, 부드러운 애니메이션)
- product-search 페이지 타입 에러 수정
- financial-summary API 타입 에러 수정 (todaySalaryUsersWithStatus 사용)
- stores/status API 타입 에러 수정 (problemReportsError 제거)
- TodayTasksWrapperClient 타입 에러 수정 (loadFinancialData 함수 추가)`;
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



