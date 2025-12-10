# GitHub 연동 가이드

## 1단계: Git 사용자 정보 설정

다음 명령어를 실행하여 Git 사용자 정보를 설정하세요:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

또는 이 저장소에만 적용하려면 `--global` 옵션을 제거하세요.

## 2단계: 초기 커밋 생성

```bash
git commit -m "Initial commit: 청소 관리 앱"
```

## 3단계: GitHub에서 새 리포지토리 생성

1. GitHub.com에 로그인
2. 우측 상단의 "+" 버튼 클릭 → "New repository" 선택
3. Repository name 입력 (예: `cleaning-management-app`)
4. Public 또는 Private 선택
5. **"Initialize this repository with a README"는 체크하지 마세요** (이미 로컬에 파일이 있으므로)
6. "Create repository" 클릭

## 4단계: 원격 저장소 연결 및 푸시

GitHub에서 생성한 리포지토리의 URL을 복사한 후 다음 명령어를 실행하세요:

```bash
# 원격 저장소 추가 (YOUR_USERNAME과 REPO_NAME을 실제 값으로 변경)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# 또는 SSH를 사용하는 경우
git remote add origin git@github.com:YOUR_USERNAME/REPO_NAME.git

# 메인 브랜치 이름 확인 및 설정 (필요시)
git branch -M main

# GitHub에 푸시
git push -u origin main
```

## 중요 사항

- `.env` 파일은 `.gitignore`에 포함되어 있어 커밋되지 않습니다
- 민감한 정보(API 키, 데이터베이스 비밀번호 등)가 코드에 하드코딩되어 있지 않은지 확인하세요
- GitHub에서 리포지토리를 Private으로 설정하는 것을 권장합니다

## 문제 해결

### 인증 오류 발생 시

GitHub 인증을 위해 Personal Access Token을 사용해야 할 수 있습니다:

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token" 클릭
3. 필요한 권한 선택 (최소한 `repo` 권한)
4. 토큰 생성 후 복사
5. `git push` 시 패스워드 대신 토큰 입력

또는 GitHub CLI를 사용:
```bash
gh auth login
```


