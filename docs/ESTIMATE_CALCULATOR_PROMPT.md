# 청소 견적 계산기 구현 프롬프트

아래 스펙대로 **청소업 표준 견적 진단기**를 그대로 구현해 주세요. Next.js(React) + Tailwind CSS 환경을 가정합니다.

---

## 1. 페이지 구조

- **경로**: `/estimate` 전용 페이지
- **헤더**: 고정 상단, 앱명(무플) + 네비(기능 소개, 관리 사례, 요금제, **견적 진단기** 활성), 로그인 버튼
- **본문**: 단일 컴포넌트 `CleaningEstimateCalculator` (또는 동일 역할의 섹션)

---

## 2. 계산 방식(탭) — 2가지

### 2.1 면적 기준 (area)

- **청소 유형** 2종: **정기 청소(office)** / **건물 계단 청소(stairs)**

#### 정기 청소(office)

- **입력**
  - 면적: **단위 선택(평 / ㎡)** + 숫자. 1평 = 3.3㎡로 환산해 계산(평당 금액은 원/평 기준).
  - 평당 금액(원), 방문 빈도(주 1~7회), 할인률(0~50%, 슬라이더 + 10/20/30% 버튼)
  - 추가 옵션: 화장실 칸수 + 월 단가, 분리수거(체크 + 월 금액), 엘리베이터(체크 + 월 금액)
  - 사용자 추가 항목: 품목명 + 월 금액 리스트 (추가/삭제 가능)
- **계산**
  - `WEEKS_PER_MONTH = 4.3`
  - 월 방문 수 = 방문 빈도(주) × 4.3
  - 기본 월액 = 면적 × 평당 금액 × 월 방문 수
  - 옵션 월액 = (화장실 칸수 × 화장실 단가) + 분리수거(체크 시) + 엘리베이터(체크 시) + 사용자 추가 항목 합계
  - 소계 후 할인률 적용(0~50%): `monthlyTotal = round((기본+옵션) * (1 - discountRate/100))`
  - **상세 견적(breakdown)** 에 기본, 화장실, 분리수거, 엘리베이터, 추가 항목, (할인 시) 소계·할인 항목 포함

#### 계단 청소(stairs)

- **상수**
  - `STAIRS_BASE_MONTHLY_1VISIT = 80_000` (4층 기준 주 1회 월액)
  - `STAIRS_EXTRA_PER_FLOOR = 20_000` (층당 추가, 4층 초과분만)
- **입력**
  - 층수(기본 4), 방문 빈도(주 1~3회만), 할인률(0~50%)
  - 추가 옵션: 화장실 개수+월 단가, 엘리베이터, 외부 주차장, 창틀 먼지 제거, 분리수거 (각 체크 + 월 금액), 사용자 추가 항목
- **계산**
  - 4층 기준 1회 월액: `base1 = 80_000 + max(0, floors - 4) * 20_000`
  - 기본 월액 = base1 × 방문 빈도(주)
  - 옵션 월액 = 엘리베이터 + 주차장 + 창틀 + 화장실 개수×단가 + 분리수거 + 사용자 추가 합계
  - 할인 적용 후 `monthlyTotal`·breakdown 산출

#### 업계 평균 대비(면적 기준만)

- **정기 청소**
  - 주 1~7회별 회당 평당 업계 평균(원): `OFFICE_AVG_UNIT_BY_VISITS = [2000, 1850, 1750, 1650, 1550, 1480, 1420]`
  - 사용자 회당 평당 단가 = `monthlyTotal / monthlyVisits / pyeong`
  - 업계 평균 회당 평당 = 위 배열[방문빈도-1]
  - `diffRate = (userUnitPerVisit - avgUnit) / avgUnit`
- **계단 청소**
  - 주 1~3회 배율: `STAIRS_VISIT_MULTIPLIER = [1.0, 1.9, 2.7]`
  - 업계 옵션 단가(월): 화장실 20_000, 주차 15_000, 창틀 5_000, 분리수거 15_000
  - base1 = 80_000 + (floors-4)*20_000, 옵션합 = 화장실·주차·창틀·분리수거
  - 주당 업계 = base1 + 옵션합, `avgAmount = round(basePerWeek * multiplier[방문빈도-1])`
  - `diffRate = (userAmount - avgAmount) / avgAmount`
- **판정 5단계** (diffRate 기준)
  - `<= -0.15` → low  
  - `-0.15 < x < -0.05` → slightlyLow  
  - `-0.05 <= x <= 0.05` → avg  
  - `0.05 < x <= 0.15` → slightlyHigh  
  - `> 0.15` → high  
- **isExtreme**: `diffRate <= -0.7 || diffRate >= 2.0` 이면 극단 구간으로 별도 안내(단가 재확인 유도)

### 2.2 인건비 기준 (labor)

- **입력**
  - 정직원: 시급, 인원(0~6명)
  - 알바: 시급, 인원(0~6명)
  - 작업 시간(1회): 시간 + 분 (0~12시간, +10/30/60분 버튼)
  - 주 방문 횟수(1~7), 마진율(0~50%, 슬라이더 + 10/20/30% 버튼)
- **계산**
  - 1회 인건비 = (정직원 시급×인원 + 알바 시급×인원) × 작업시간(시간)
  - 월 방문 수 = 주 방문 × 4.3
  - 월 인건비 = 1회 인건비 × 월 방문 수
  - 권장 견적 = round(월 인건비 × (1 + marginRate/100))
  - breakdown: 정직원 월 인건비, 알바 월 인건비, 소계, 마진 N%

---

## 3. UI 레이아웃

- **스텝 표시**: 1단계 “견적 정보 입력” — 2단계 “견적 비교”
- **2단 그리드**: 좌측 입력 폼, 우측(340px) 스티키 패널
  - 우측: **실시간 견적** (예상 금액 큰 글씨, 부가세 10% 포함 금액, 상세 견적/breakdown 리스트), **견적 비교**(면적 기준 금액 / 인건비 기준 금액, 인건비보다 낮으면 마진 주의 문구)
- **버튼**: “내 견적 분석하기” — 클릭 시 로딩 모달 → 분석 모달
- **모바일**: 하단 고정 바 — 카카오 상담 링크(“무플 상담하기”), 실시간 견적 요약, 견적 비교(면적|인건비)

---

## 4. 내 견적 분석 모달

### 4.1 로딩 모달

- “내 견적 분석 중” 제목, 3단계 라벨: ① 입력값 확인 / ② 업계 기준 매칭 / ③ 운영 난이도 반영
- 첫 분석 시 약 3초, 이후 약 1초 후 자동으로 분석 모달로 전환

### 4.2 분석 모달 — 면적 기준

- **공유 전**
  - isExtreme이면: “입력하신 단가가 일반 시장 범위와 많이 다릅니다…” 안내만
  - 일일 열람 한도 초과(아래 참고)면: “오늘 횟수를 모두 사용했습니다” (일일 5회)
  - 그 외: **판정 카드** 표시
    - 판정 5종: low / slightlyLow / avg / slightlyHigh / high
    - 각각 emoji·title·tagline·blocks(제목 + items 리스트 또는 body 텍스트)
    - 스타일: 5단계별 배경/테두리/아이콘 색 (빨강·주황·초록·파랑·보라)
  - 모바일이 아니면: “업계 평균 단가는 모바일에서만 확인할 수 있어요”
- **공유/복사 후(hasSharedForAnalysis)**
  - “내 견적 상세 내역”: 예상 견적(원), 부가세 포함, breakdown 리스트, 결과 합계
  - “업계 평균 단가”: avgAmount 기준 95%~105% 구간 표시(원), 부가세 포함, 판정 메시지(JUDGE_LABELS)

**판정 라벨(한국어)**

- low: 업계 평균보다 낮은 견적입니다. 인건비·품질을 한 번 더 확인해 보세요.
- slightlyLow: 업계 평균보다 다소 낮은 수준입니다. 마진이 충분한지 확인해 보세요.
- avg: 업계 평균 수준의 견적입니다.
- slightlyHigh: 업계 평균보다 다소 높은 수준입니다. 서비스·품질로 설득할 수 있는 구간입니다.
- high: 업계 평균보다 높은 견적입니다. 단가 근거(서비스 범위·품질)를 명확히 하는 것이 좋습니다.

**판정 타입(제목·태그라인·블록)** — 5종 각각 이모지·타이틀·한 줄 소개·블록(제목 + items 또는 body) 구성. 예: low = “돌격 수주형”, slightlyLow = “공격적 확장형”, avg = “표준 운영형”, slightlyHigh = “전략적 수익형”, high = “프리미엄 운영형”. (상세 블록 문구는 기존 JUDGE_TYPES 구조 참고해 동일하게 구현)

### 4.3 분석 모달 — 인건비 기준

- 업계 평균 대비 분석 없음. “업계 평균 대비 분석은 면적 기준 견적에서만 제공됩니다” 안내 + “면적 기준으로 이동” 버튼
- 공유 후에는: 예상 견적(원), 부가세 포함, 상세 breakdown·결과만 표시

### 4.4 공유·열람 제한(면적 기준)

- **일일 열람**: localStorage 키 `cleaning-estimate-daily-unlocks`, 값 `{ date: 'YYYY-MM-DD', count: N }`. 당일 5회 초과 시 “오늘 횟수를 모두 사용했습니다” 표시
- **공유 후 열람**: 모바일(뷰포트/터치/UA 또는 referrer가 카카오)에서만 “공유하고 업계 평균 단가 보기” 가능
- 공유 문구: “[내 단가 전략 점검 완료] 업계 평균 기준, 당신은 어디에 있나요?” + 현재 페이지 URL
- PC에서는 “업계 평균 단가는 모바일에서만 확인할 수 있어요” 메시지

---

## 4.5 모달 결과 상세 (계산 완료 후 노출 내용)

**모달 제목**: "업계 평균 단가 · 내 견적" (닫기 버튼 우측)

### A. 면적 기준 — 공유 전(hasSharedForAnalysis = false)

- **kakaoSharePending** (카카오 공유 창 띄운 직후):  
  파란 박스 — "카카오톡으로 공유를 완료하셨나요?" / "아래 버튼을 누르면 업계 평균 단가와 상세 견적을 확인할 수 있어요."  
  → 하단 버튼: **"공유했어요, 결과 보기"** (클릭 시 doUnlockAfterShare → 결과 화면으로 전환)

- **industryCompare.isExtreme**:  
  노란 박스 — "입력하신 단가가 일반 시장 범위와 많이 다릅니다. 평당 금액·옵션 금액을 다시 확인해 주세요." / "조건을 수정한 뒤 다시 분석해 보세요."  
  → 하단 버튼: **"다시 시도하기"** (모달 닫기)

- **dailyLimitReached**:  
  노란 박스 — "오늘 횟수를 모두 사용했습니다." / "내일 다시 시도해 주세요. (일일 5회 제한)"  
  → 하단 버튼: **"확인"** (모달 닫기)

- **shareCancelled**:  
  파란 박스 — "공유를 완료하면 결과를 확인할 수 있어요." / "다시 공유하기 버튼을 눌러 주세요."

- **!canUseShare && !canUseCopyFallback** (PC 등):  
  회색 박스 — "업계 평균 단가는 모바일에서만 확인할 수 있어요." / "모바일 기기로 접속한 뒤 공유하기를 눌러 주세요."  
  → 하단 버튼: **비활성 "모바일에서 사용해 주세요"**

- **일반(industryCompare 있고, 공유 가능)**:  
  - **판정 카드 1장**: 상단 헤더(이모지 + 타이틀, 예: 💪 돌격 수주형), 태그라인(두 줄), 그 아래 blocks 순서대로:
    - 각 block: 제목(title) + items(리스트) 또는 body(문단)
    - 블록별 카드 스타일 로테이션(흰색/파랑/노랑/보라 배경 등)
  - 문구: "공유하면 업계 평균 단가와 상세 단가를 확인할 수 있어요."
  - 카카오 인앱이면서 Web Share도 있을 때: "카카오톡으로 공유하거나 더보기에서 다른 앱으로 공유할 수 있어요."

### B. 면적 기준 — 공유 후(hasSharedForAnalysis = true)

1. **내 견적 상세 내역** (회색 테두리 박스)  
   - 소제목: "내 견적 상세 내역"  
   - 예상 견적: **금액 원** (큰 글씨)  
   - 부가세 10% 포함 **금액 원**  
   - breakdown 리스트: 라벨 | 금액 (할인 항목은 음수, 파란 배경)  
   - 마지막 행: "결과" | **합계 원**

2. **업계 평균 단가** (판정별 그라데이션 박스)  
   - 아이콘 + "업계 평균 단가" 제목  
   - 흰색 반투명 박스 안: **avgAmount×0.95 ~ avgAmount×1.05 원** (중앙 정렬)  
   - 다음 줄: 부가세 10% 포함 **low×1.1 ~ high×1.1 원**  
   - 그 아래: JUDGE_LABELS[judgment] 메시지 (한 줄)

### C. 인건비 기준

- **공유 전**:  
  파란 박스 — "업계 평균 대비 분석은 면적 기준 견적에서만 제공됩니다. 면적 기준 탭에서 견적을 입력하시면 업계 단가와 비교 분석을 확인할 수 있어요."  
  + "면적 기준으로 이동해 보세요."  
  → 하단 버튼: **"면적 기준으로 이동"** (탭 전환 + 모달 닫기)

- **공유 후**:  
  - 예상 견적: **금액 원**, 부가세 10% 포함 **금액 원**  
  - 같은 파란 박스로 "업계 평균 대비 분석은 면적 기준 견적에서만 제공됩니다" 안내 유지  
  - **상세 내역**: breakdown 리스트(라벨 | 금액), 마지막 "결과" | suggestedQuote 원  
  → 하단 버튼: **"확인"** (모달 닫기)

### D. 입력 없음(areaResult·laborResult 없음)

- "면적(평수), 방문 빈도 등 견적 정보를 입력한 후 분석해 주세요." (면적 탭)  
- "시급, 인원, 작업 시간 등 견적 정보를 입력한 후 분석해 주세요." (인건비 탭)  
→ 하단 버튼: **"확인"**

### E. 모달 하단 버튼 정리(면적 기준, 공유 전)

- kakaoSharePending → **"공유했어요, 결과 보기"**
- dailyLimitReached → **"확인"**
- canUseShare → **"공유하고 업계 평균 단가 보기"** (+ 카카오+Web Share 동시일 때 **"더보기 · 다른 앱으로 공유"**)
- canUseCopyFallback → **"링크 복사 후 결과 보기"**
- PC(공유 불가) → 비활성 **"모바일에서 사용해 주세요"**
- isExtreme 또는 공유 후 → **"다시 시도하기"** / **"확인"**

---

## 4.6 공유 방식 전체 (면적 기준 결과 열람용)

### 공유 가능 조건

- **isMobileContext**: 다음 중 하나라도 참이면 모바일로 간주  
  - `innerWidth <= 768` 또는 `screen.width <= 768`  
  - 터치 가능 + `screen.width <= 1024`  
  - `screen.width <= 480`  
  - UA에 Android|webOS|iPhone|iPad|iPod|KakaoTalk|KAKAO|Samsung|Mobile 등 포함  
  - referrer 또는 UA에 kakao|daum|kakaotalk 포함(**fromKakao**)
- **hasNativeShare**: `navigator.share` 존재
- **hasKakaoShare**: fromKakao && Kakao SDK 로드 완료 && NEXT_PUBLIC_KAKAO_JS_KEY 있음
- **canUseShare**: isMobileContext && (hasNativeShare || hasKakaoShare)
- **canUseCopyFallback**: isMobileContext && !hasNativeShare && !hasKakaoShare (공유 API 없을 때만 링크 복사 허용)

### 공유 데이터

- **shareUrl**: `window.location.href`
- **shareTitle / shareText / shareMessage**: "[내 단가 전략 점검 완료] 업계 평균 기준, 당신은 어디에 있나요?"

### 1) Web Share API (handleShareAndUnlock)

- **조건**: canUseShare && hasNativeShare
- **동작**: `navigator.share({ title: shareTitle, text: shareText, url: shareUrl })`
- **성공**: doUnlockAfterShare() → 일일 횟수+1, hasSharedForAnalysis = true (결과 화면 표시)
- **실패(취소 등)**: setShareCancelled(true) → "공유를 완료하면 결과를 확인할 수 있어요" 안내

### 2) 카카오 공유 (handleShareAndUnlock)

- **조건**: canUseShare && !hasNativeShare && fromKakao && hasKakaoShare
- **동작**: `Kakao.Share.sendDefault({ objectType: 'text', text: shareMessage, link: { mobileWebUrl: shareUrl, webUrl: shareUrl } })`
- **호출 후**: setKakaoSharePending(true) → 모달에 "카카오톡으로 공유를 완료하셨나요?" + **"공유했어요, 결과 보기"** 버튼 표시
- **"공유했어요, 결과 보기" 클릭**: handleKakaoShareConfirm() → setKakaoSharePending(false), doUnlockAfterShare()

### 3) 더보기·다른 앱으로 공유 (handleShareOtherApps)

- **조건**: fromKakao && hasKakaoShare && hasNativeShare (카카오 인앱이면서 Web Share도 있을 때만 버튼 노출)
- **동작**: navigator.share(동일 인자) → 성공 시 doUnlockAfterShare(), 실패 시 setShareCancelled(true)

### 4) 링크 복사 (handleCopyAndUnlock)

- **조건**: canUseCopyFallback (모바일이지만 Web Share·카카오 공유 둘 다 없을 때)
- **동작**: `clipboard.writeText(shareText + '\n' + shareUrl)`  
- **성공**: setCopyToast(true), 2초 후 false; doUnlockAfterShare()
- **실패**: setShareCancelled(true)
- **토스트 문구**: "링크가 복사되었어요. 업계 평균 단가와 상세 단가를 확인하세요."

### 일일 열람 제한 (doUnlockAfterShare 내부)

- **localStorage 키**: `cleaning-estimate-daily-unlocks`
- **값**: `{ date: 'YYYY-MM-DD', count: N }` (당일만 유효)
- **제한**: DAILY_UNLOCK_LIMIT = 5. 이미 5회 이상이면 setDailyLimitReached(true)만 하고 hasSharedForAnalysis는 바꾸지 않음 → "오늘 횟수를 모두 사용했습니다" 화면 유지
- **정상 시**: count+1, setHasSharedForAnalysis(true)

### JUDGE_TYPES 전체 (판정 카드 문구)

- **low**: 💪 돌격 수주형. tagline: "일단 계약부터 따내자." / 당신은 현장에서 승부를 보는 대표입니다.  
  blocks: [ { title: '이런 특징이 있습니다', items: ['가격 경쟁에서 밀리지 않음', '수주 성사율이 높은 편', '빠르게 거래처를 확보하는 스타일'] }, { title: '하지만 한 가지 질문이 있습니다.', body: '이 구조로 1년을 버틸 수 있습니까?' }, { title: '장기적으로 생길 수 있는 문제', items: ['인건비가 조금만 올라가도 압박', '직원 이탈 시 바로 흔들림', '대표의 체력에 의존하는 구조'] }, { title: '지금 필요한 것', body: '감(感)이 아니라\n최소 유지 가능한 단가를 정확히 아는 것입니다.' } ]
- **slightlyLow**: ⚡ 공격적 확장형. tagline: 지금은 시장을 넓히는 시기입니다. / 당신은 확장을 선택한 대표입니다.  
  blocks: [ '이런 운영 스타일입니다' (items 3개), '하지만 확장이 커질수록 관리도 커집니다.' (body만), '놓치기 쉬운 부분' (items 3개), '지금 필요한 것' (body: 수주보다 중요한 건 구조 점검입니다.) ]
- **avg**: 🧱 표준 운영형. tagline: 시장 흐름에 맞춰 안정적으로 운영 중입니다.  
  blocks: '이런 특징이 있습니다', '현재는 균형 상태입니다.', '기회 요소', '같은 구조라도' (body)
- **slightlyHigh**: 🎯 전략적 수익형. tagline: 단가를 방어할 줄 아는 대표입니다.  
  blocks: '이런 운영을 하고 있습니다', '좋은 구간입니다.', '유지 조건', '단가는 설득으로 만들고,' (body)
- **high**: 👑 프리미엄 운영형. tagline: 가격이 아니라 관리 체계로 계약하는 구조입니다.  
  blocks: '이런 특징이 있습니다', '이 단계는' (body: "설명"이 아니라 "증명"이 필요합니다.), '반드시 필요한 것', '프리미엄 단가는' (body)

JUDGE_STYLES: low=빨강계, slightlyLow=주황계, avg=초록계, slightlyHigh=파랑계, high=보라계 (bg, border, borderL, icon, text 클래스).

---

## 5. 상수·기본값 요약

- WEEKS_PER_MONTH = 4.3, SQM_PER_PYEONG = 3.3 (면적 ㎡ 입력 시 평으로 변환)
- 정기 청소: OFFICE_AVG_UNIT_BY_VISITS = [2000, 1850, 1750, 1650, 1550, 1480, 1420]
- 계단: 4층 8만원, 층당 +2만, STAIRS_VISIT_MULTIPLIER = [1.0, 1.9, 2.7], 옵션 업계 단가(화장실 2만, 주차 1.5만, 창틀 5천, 분리수거 1.5만)
- 정기 청소 옵션 기본 단가(코드 상): 화장실 1칸 1만, 분리수거 1.5만, 엘리베이터 1.5만(원/월). 계단 옵션 엘리베이터 1.5만, 주차 1만, 창틀 5천, 화장실 2만, 분리수거 1.5만 — 사용자 입력 0이면 이 기본값 사용 가능(현 구현은 0이면 해당 항목 0원 처리)
- DAILY_UNLOCK_LIMIT = 5
- 카카오 상담 링크: 환경변수 또는 상수(예: KAKAO_CHAT_URL)로 관리

---

## 6. 기타

- 금액 포맷: `formatWon(n)` = 천 단위 구분 + " 원", `formatNumber(n)` = 천 단위 구분만
- 실시간 견적·비교 문구: “※ 본 견적은 참고용이며, 실제 계약 금액과 다를 수 있습니다.”
- 견적 비교 박스: “인건비 기준보다 낮은 견적은 마진이 줄어들 수 있습니다.”
- 카카오 공유 시: NEXT_PUBLIC_KAKAO_JS_KEY 있으면 SDK 로드 후 Kakao.Share.sendDefault 사용 (objectType: 'text', text, link)

이 스펙대로 동작하는 단일 페이지 + 하나의 계산기 컴포넌트를 구현하면 됩니다.
