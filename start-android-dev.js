#!/usr/bin/env node

/**
 * Android 전용 개발 서버 시작 스크립트
 * 
 * 사용법:
 *   node start-android-dev.js
 *   또는
 *   npm run android:dev
 * 
 * 이 스크립트는:
 * 1. 모든 네트워크 인터페이스(0.0.0.0)에서 서버를 시작합니다
 * 2. 에뮬레이터(10.0.2.2)와 실제 기기에서 접근 가능합니다
 * 3. Android 개발에 최적화된 설정을 사용합니다
 */

const { spawn } = require('child_process');
const os = require('os');

console.log('🚀 Android 전용 개발 서버 시작 중...\n');

// 네트워크 인터페이스 정보 출력
const interfaces = os.networkInterfaces();
let localIP = 'localhost';

Object.keys(interfaces).forEach((name) => {
  interfaces[name].forEach((iface) => {
    if (iface.family === 'IPv4' && !iface.internal) {
      console.log(`   - ${name}: ${iface.address}`);
      if (name.includes('Wi-Fi') || name.includes('Ethernet') || name.includes('이더넷')) {
        localIP = iface.address;
      }
    }
  });
});

console.log(`\n💡 에뮬레이터 접속 주소: http://10.0.2.2:3000`);
console.log(`💡 실제 기기 접속 주소: http://${localIP}:3000`);
console.log(`💡 로컬 접속 주소: http://localhost:3000\n`);

// Next.js 개발 서버 시작
const nextDev = spawn('npx', ['next', 'dev', '-H', '0.0.0.0', '-p', '3000'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd(),
});

// 프로세스 종료 처리
process.on('SIGINT', () => {
  console.log('\n\n🛑 서버 종료 중...');
  nextDev.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 서버 종료 중...');
  nextDev.kill('SIGTERM');
  process.exit(0);
});

// 에러 처리
nextDev.on('error', (error) => {
  console.error('❌ 서버 시작 실패:', error);
  process.exit(1);
});

nextDev.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`❌ 서버가 종료되었습니다 (코드: ${code})`);
    process.exit(code);
  }
});
