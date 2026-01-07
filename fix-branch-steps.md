# 브랜치 재생성 수정 가이드

## 현재 문제
1. `MainActivity.java`에 커밋되지 않은 변경사항이 있음
2. `feature/android-conversion` 브랜치에 있어서 삭제 불가
3. `main` 브랜치가 아닌 `master` 브랜치가 존재할 수 있음

## 해결 방법

### 1단계: 현재 변경사항 커밋 또는 stash
```bash
# 옵션 A: 변경사항 커밋
git add android/app/src/main/java/com/mupl/cleaningapp/MainActivity.java
git commit -m "fix: MainActivity WebChromeClient 카메라 권한 처리 추가"

# 옵션 B: 변경사항 임시 저장 (나중에 다시 적용)
git stash
```

### 2단계: master 또는 main 브랜치로 전환
```bash
# master 브랜치 확인
git branch

# master 브랜치로 전환 (main이 없으면)
git checkout master

# 또는 main 브랜치로 전환 (main이 있으면)
git checkout main
```

### 3단계: 브랜치 최신화
```bash
git pull origin master
# 또는
git pull origin main
```

### 4단계: feature/android-conversion 브랜치 삭제
```bash
# 로컬 브랜치 삭제
git branch -D feature/android-conversion

# 원격 브랜치 삭제 (존재하는 경우)
git push origin --delete feature/android-conversion
```

### 5단계: 새 브랜치 생성
```bash
git checkout -b feature/android-conversion
```

### 6단계: Android 관련 파일 다시 적용
(Android 관련 파일들을 다시 추가해야 함)
