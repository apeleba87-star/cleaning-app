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
  const commitMessage = 'Fix: 체크리스트 날짜 검증 KST 적용 및 점주 앱 이미지 확대 기능 추가';
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



