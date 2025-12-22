const { execSync } = require('child_process');
const fs = require('fs');

console.log('=== Git 상태 확인 ===\n');

try {
  // .git 디렉토리 확인
  if (!fs.existsSync('.git')) {
    console.log('❌ .git 디렉토리가 없습니다. Git 저장소가 초기화되지 않았습니다.');
    process.exit(1);
  }

  // 변경된 파일 확인
  console.log('1. 변경된 파일:');
  try {
    const diffFiles = execSync('git diff --name-only', { encoding: 'utf8' });
    if (diffFiles.trim()) {
      console.log(diffFiles);
    } else {
      console.log('   변경된 파일 없음');
    }
  } catch (e) {
    console.log('   확인 실패:', e.message);
  }

  // 스테이징된 파일 확인
  console.log('\n2. 스테이징된 파일:');
  try {
    const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    if (stagedFiles.trim()) {
      console.log(stagedFiles);
    } else {
      console.log('   스테이징된 파일 없음');
    }
  } catch (e) {
    console.log('   확인 실패:', e.message);
  }

  // 최근 커밋 확인
  console.log('\n3. 최근 커밋 (5개):');
  try {
    const commits = execSync('git log --oneline -5', { encoding: 'utf8' });
    console.log(commits);
  } catch (e) {
    console.log('   확인 실패:', e.message);
  }

  // 원격 저장소 확인
  console.log('\n4. 원격 저장소:');
  try {
    const remotes = execSync('git remote -v', { encoding: 'utf8' });
    console.log(remotes);
  } catch (e) {
    console.log('   확인 실패:', e.message);
  }

  // 브랜치 확인
  console.log('\n5. 현재 브랜치:');
  try {
    const branch = execSync('git branch --show-current', { encoding: 'utf8' });
    console.log('   ' + branch.trim());
  } catch (e) {
    console.log('   확인 실패:', e.message);
  }

} catch (error) {
  console.error('오류 발생:', error.message);
}



