# 히어로 이미지 업로드 가이드

이 폴더에 히어로 섹션에서 사용할 이미지를 업로드하세요.

## 이미지 요구사항

- **권장 해상도**: 1920x1080px 이상 (Full HD)
- **파일 형식**: JPG, PNG, WebP
- **파일 크기**: 각 이미지당 500KB 이하 권장
- **비율**: 16:9 또는 21:9 (와이드 스크린)

## 이미지 업로드 방법

1. 이 폴더(`public/hero-images/`)에 이미지 파일을 복사합니다.
2. 파일명 규칙: `hero-1.jpg`, `hero-2.jpg`, `hero-3.jpg` 등
3. `components/LandingPage.tsx` 파일에서 `heroImages` 배열에 경로를 추가합니다:

```typescript
const heroImages = [
  '/hero-images/hero-1.jpg',
  '/hero-images/hero-2.jpg',
  '/hero-images/hero-3.jpg',
]
```

## 이미지 추천

- 무인 매장/자판기 현장 사진
- 청소 작업 중인 모습
- 깔끔하게 정리된 현장
- 현장 운영 관련 이미지

## 참고사항

- 이미지가 없으면 기본 그라데이션 배경이 표시됩니다.
- 여러 이미지를 업로드하면 자동으로 슬라이드됩니다 (5초 간격).
- 이미지는 자동으로 최적화되어 로드됩니다.
