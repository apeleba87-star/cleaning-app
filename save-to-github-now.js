const { execSync } = require('child_process');
const path = require('path');

try {
  const projectPath = __dirname;
  
  console.log('Adding all changes...');
  execSync('git add -A', { cwd: projectPath, stdio: 'inherit', encoding: 'utf8' });
  
  console.log('Committing changes...');
  const commitMessage = `제품 위치 업로드 기능 구현 및 TypeScript 빌드 에러 수정

- CSV 파일 업로드로 제품 마스터 자동 등록 기능 추가
- 매장명 매핑 기능 구현 (store_name_mappings 테이블)
- 제품 위치 정보 업로드 및 업데이트 기능
- 업로드 완료 후 자동 새로고침 기능 추가
- RLS 정책 추가 (store_name_mappings 테이블)
- 에러 처리 및 로깅 개선
- TypeScript 빌드 에러 수정 (Set/Map 순회 시 Array.from 사용)`;
  
  execSync(`git commit -m "${commitMessage}"`, { cwd: projectPath, stdio: 'inherit', encoding: 'utf8' });
  
  console.log('Pushing to GitHub...');
  execSync('git push', { cwd: projectPath, stdio: 'inherit', encoding: 'utf8' });
  
  console.log('✅ Successfully saved to GitHub!');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

