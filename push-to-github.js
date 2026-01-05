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
  const commitMessage = `feat: 재무 관리 페이지 모바일 최적화 및 UI 개선

- 수금/미수금 관리 페이지 모바일 UI 최적화 (테이블 → 카드 뷰)
- 재무현황 페이지 모바일 UI 최적화 및 2025년 디자인 적용
- 재무현황 상세 섹션 제목 가로 표시 수정 (세로 텍스트 문제 해결)
- 수금/미수금 관리 버튼 설명 텍스트 추가 (모바일/데스크톱 반응형)
- Glassmorphism 및 그라데이션 효과 적용
- 야간매장 관리일 로직 개선 및 UI 개선
- 직원앱 야간매장 배지 및 관리 시작 시간 표시 추가`;
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



