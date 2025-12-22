const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, 'app', 'business', 'stores', 'status', 'page.tsx');
const destFile = path.join(__dirname, 'app', 'franchise', 'stores', 'status', 'page.tsx');

// 디렉토리 생성
const destDir = path.dirname(destFile);
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// 파일 읽기
let content = fs.readFileSync(sourceFile, 'utf8');

// API 경로 변경
content = content.replace(/\/api\/business/g, '/api/franchise');
content = content.replace(/BusinessStoresStatusPage/g, 'FranchiseStoresStatusPage');
content = content.replace(/\/business\/dashboard/g, '/franchise/dashboard');
content = content.replace(/\/business\/stores\//g, '/franchise/stores/');

// 파일 쓰기
fs.writeFileSync(destFile, content, 'utf8');

console.log('File copied and modified successfully!');

