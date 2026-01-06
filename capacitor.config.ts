import { CapacitorConfig } from '@capacitor/cli';

// 환경 변수에서 서버 URL 가져오기
// 프로덕션 배포 후 .env.production에 CAPACITOR_SERVER_URL 설정
const serverUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'com.mupl.cleaningapp',
  appName: '무플(MUPL)',
  webDir: 'public',
  server: serverUrl
    ? {
        // 환경 변수로 서버 URL이 지정된 경우 (프로덕션 권장)
        url: serverUrl,
        cleartext: serverUrl.startsWith('http://'),
      }
    : {
        // 개발 환경: 로컬 서버 사용
        // 에뮬레이터: 10.0.2.2 사용
        // 실제 기기: PC의 실제 IP 주소 사용 (터미널에서 확인 가능)
        // url: 'http://10.0.2.2:3000', // Android 에뮬레이터용 (방화벽 문제 시 주석 처리)
        url: 'http://192.168.219.41:3000', // 실제 기기 IP (방화벽 우회)
        cleartext: true,
      },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#2563eb',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
