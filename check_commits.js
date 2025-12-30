const { execSync } = require('child_process');
const fs = require('fs');

function runGitCommand(cmd) {
  try {
    const output = execSync(cmd, { 
      encoding: 'utf8',
      cwd: process.cwd()
    });
    return output.trim();
  } catch (error) {
    return '';
  }
}

console.log('='.repeat(60));
console.log('오늘 날짜의 커밋 목록');
console.log('='.repeat(60));
console.log();

const todayCommits = runGitCommand('git log --since="today" --pretty=format:"%h|%ad|%an|%s" --date=format:"%Y-%m-%d %H:%M:%S" --all');

if (todayCommits) {
  const commits = todayCommits.split('\n').filter(c => c);
  commits.forEach((commit, i) => {
    const parts = commit.split('|');
    if (parts.length >= 4) {
      const [hash, date, author, ...messageParts] = parts;
      const message = messageParts.join('|');
      console.log(`${i + 1}. 커밋 해시: ${hash}`);
      console.log(`   시간: ${date}`);
      console.log(`   작성자: ${author}`);
      console.log(`   메시지: ${message}`);
      console.log();
    }
  });
} else {
  console.log('오늘 날짜의 커밋이 없습니다.');
  console.log();
}

console.log('='.repeat(60));
console.log('최근 10개 커밋 (롤백 가능)');
console.log('='.repeat(60));
console.log();

const recentCommits = runGitCommand('git log -10 --pretty=format:"%h|%ad|%an|%s" --date=format:"%Y-%m-%d %H:%M:%S" --all');

if (recentCommits) {
  const commits = recentCommits.split('\n').filter(c => c);
  commits.forEach((commit, i) => {
    const parts = commit.split('|');
    if (parts.length >= 4) {
      const [hash, date, author, ...messageParts] = parts;
      const message = messageParts.join('|');
      console.log(`${i + 1}. 커밋 해시: ${hash}`);
      console.log(`   시간: ${date}`);
      console.log(`   작성자: ${author}`);
      console.log(`   메시지: ${message}`);
      console.log();
    }
  });
} else {
  console.log('커밋을 찾을 수 없습니다.');
}

console.log('='.repeat(60));
console.log('특정 파일의 변경 이력 (app/(staff)/issues/page.tsx)');
console.log('='.repeat(60));
console.log();

const fileCommits = runGitCommand('git log --pretty=format:"%h|%ad|%an|%s" --date=format:"%Y-%m-%d %H:%M:%S" -- "app/(staff)/issues/page.tsx"');

if (fileCommits) {
  const commits = fileCommits.split('\n').filter(c => c).slice(0, 10);
  commits.forEach((commit, i) => {
    const parts = commit.split('|');
    if (parts.length >= 4) {
      const [hash, date, author, ...messageParts] = parts;
      const message = messageParts.join('|');
      console.log(`${i + 1}. 커밋 해시: ${hash}`);
      console.log(`   시간: ${date}`);
      console.log(`   작성자: ${author}`);
      console.log(`   메시지: ${message}`);
      console.log();
    }
  });
} else {
  console.log('해당 파일의 변경 이력이 없습니다.');
}




















