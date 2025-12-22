// 암호화 키 생성 스크립트
const crypto = require('crypto');

const key = crypto.randomBytes(32).toString('hex');
console.log('\n=== 주민등록번호 암호화 키 ===');
console.log(key);
console.log('\n이 키를 .env.local 파일의 ENCRYPTION_KEY에 추가하세요.');
console.log('예: ENCRYPTION_KEY=' + key);
console.log('\n⚠️ 이 키를 안전하게 보관하세요. 분실하면 복호화가 불가능합니다!\n');

