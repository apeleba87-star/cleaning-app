const { execSync } = require('child_process');
const fs = require('fs');

const commitHash = '5f84dbf';
const filePath = 'app/(staff)/issues/page.tsx';

try {
  console.log(`Restoring ${filePath} from commit ${commitHash}...`);
  
  // 먼저 파일 내용 확인
  try {
    const content = execSync(`git show ${commitHash}:${filePath}`, { 
      encoding: 'utf8',
      cwd: process.cwd()
    });
    
    // 파일 복원
    execSync(`git checkout ${commitHash} -- "${filePath}"`, { 
      encoding: 'utf8',
      cwd: process.cwd()
    });
    
    console.log(`\n✓ Successfully restored ${filePath} from commit ${commitHash}!`);
  } catch (error) {
    console.error(`\n✗ Error: ${error.message}`);
    console.log('\nTrying alternative method...');
    
    // 대안: git show로 내용 가져와서 파일에 쓰기
    try {
      const content = execSync(`git show ${commitHash}:${filePath}`, { 
        encoding: 'utf8',
        cwd: process.cwd()
      });
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`\n✓ Successfully restored ${filePath} from commit ${commitHash} using alternative method!`);
    } catch (error2) {
      console.error(`\n✗ Error: Could not restore file. ${error2.message}`);
      process.exit(1);
    }
  }
} catch (error) {
  console.error(`\n✗ Fatal error: ${error.message}`);
  process.exit(1);
}














