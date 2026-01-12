# Android 빌드 에러 해결 가이드

## 문제
- `android` 폴더에 Gradle 빌드 파일(`settings.gradle`, `build.gradle`)이 없음
- Android Studio가 프로젝트를 인식하지 못함

## 해결 방법

### 1단계: Capacitor 동기화
```bash
cd C:\Projects\cleaning-management-app

# Next.js 빌드
npm run build

# Capacitor 동기화 (Android 프로젝트 재생성)
npx cap sync
```

### 2단계: Android Studio에서 프로젝트 다시 열기
1. Android Studio에서 현재 프로젝트 닫기
2. `File > Open` 선택
3. `C:\Projects\cleaning-management-app\android` 폴더 선택
4. `Trust Project` 클릭

### 3단계: Gradle 동기화
1. `File > Sync Project with Gradle Files` 실행
2. 빌드 완료 대기
