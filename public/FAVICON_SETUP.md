# 파비콘 설정 가이드

## 파비콘 파일 업로드 방법

제공하신 무플 아이콘 이미지를 다음 파일로 저장해주세요:

### 1. 기본 파비콘
- **파일명**: `favicon.ico`
- **위치**: `public/favicon.ico`
- **크기**: 16x16, 32x32, 48x48 (멀티 사이즈 ICO 파일 권장)
- **변환 도구**: https://www.favicon-generator.org/ 또는 https://realfavicongenerator.net/

### 2. PNG 파비콘 (다양한 크기)
- **파일명**: `icon-192x192.png` (기존 파일 교체)
- **위치**: `public/icon-192x192.png`
- **크기**: 192x192 픽셀

- **파일명**: `icon-512x512.png` (기존 파일 교체)
- **위치**: `public/icon-512x512.png`
- **크기**: 512x512 픽셀

### 3. Apple Touch Icon
- **파일명**: `apple-touch-icon.png`
- **위치**: `public/apple-touch-icon.png`
- **크기**: 180x180 픽셀

## 이미지 변환 방법

1. 원본 이미지를 준비합니다
2. 온라인 도구 사용:
   - https://realfavicongenerator.net/ (추천)
   - https://www.favicon-generator.org/
3. 생성된 파일들을 `public` 폴더에 업로드합니다

## 현재 설정

현재는 기존 `icon-192x192.png`와 `icon-512x512.png`를 파비콘으로 사용하고 있습니다.
제공하신 이미지로 교체하시면 자동으로 적용됩니다.
