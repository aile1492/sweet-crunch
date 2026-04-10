# Monetization & AdMob

> 광고 수익 구조, AdMob 배너/보상형 광고, IAP 설계 <!-- coverage: high -->

## Purpose
<!-- coverage: high -->
Sweet Crunch의 수익은 광고(주)와 IAP(부)로 구성된다.
AdMob 배너는 레벨 선택/게임 화면 하단에, 보상형 광고는 게임 내 특정 시점에 표시된다.

## Architecture
<!-- coverage: high -->
```
src/utils/AdMobManager.ts   ← AdMob 싱글턴 관리자
    ↓
@capacitor-community/admob@8.0.0  (npm 패키지)
    ↓
android/.../AndroidManifest.xml   ← AdMob 앱 ID 등록
android/app/capacitor.build.gradle ← admob 의존성 자동 추가 (cap sync)
```

**AdMobManager API (`src/utils/AdMobManager.ts`):**
```typescript
initAdMob(): Promise<void>       // 앱 시작 시 1회 호출 (main.ts)
showBanner(): Promise<void>      // 씬 create()에서 호출
hideBanner(): Promise<void>      // 씬 전환 시 선택적
removeBanner(): Promise<void>    // 씬 shutdown()에서 호출
```

**광고 ID 설정:**
```typescript
// AdMobManager.ts 상단에서 교체
const TEST_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111'  // Google 공식 테스트 ID
const PROD_BANNER_ID = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'  // TODO: 실제 ID 교체
const USE_TEST_ADS = true  // 배포 전 false로 변경
```

## API Surface
<!-- coverage: high -->
**AdMob 초기화 흐름 (main.ts):**
```typescript
// Capacitor 네이티브 환경에서만 실행
await initAdMob()  // AdMob.initialize({ initializeForTesting: USE_TEST_ADS })
```

**배너 표시 씬:**
- `LevelSelectScene.create()` → `showBanner()`
- `GameScene.create()` → `showBanner()`
- 두 씬의 `shutdown()` → `removeBanner()`

**배너 설정:**
```typescript
adSize: BannerAdSize.ADAPTIVE_BANNER
position: BannerAdPosition.BOTTOM_CENTER
margin: 0
```

**Android 설정:**
```xml
<!-- AndroidManifest.xml -->
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-3940256099942544~3347511713"/>
```

## Game Mechanics
<!-- coverage: high -->
**광고 시점 전략 (CONCEPT.md 기준):**

| 광고 유형 | 시점 | 현황 |
|-----------|------|------|
| 배너 광고 | 레벨 선택 화면 하단 + 게임 플레이 하단 | ✅ 구현 완료 |
| 보상형 광고 | 레벨 실패 시 이동수 +5 / 부스터 획득 | 🔶 구조만 있음 |
| 인터스티셜 | 3레벨마다 클리어 후 (빈도 제한) | ⬜ 미구현 |

**보상형 광고 연결 코드 위치 (GameScene.ts):**
```typescript
// TODO: 실제 AdMob 리워드 광고 호출은 AdMob 구현 시 교체 (line ~6099)
canUseAdBooster(), grantAdBooster(), remainingAdBoosters()  // progress.ts에 인프라 준비됨
```

**IAP 계획 (미구현):**
| 상품 | 가격 |
|------|------|
| 이동수 +5 팩 | $0.99 |
| 부스터 번들 (3종×3개) | $2.99 |
| 광고 제거 | $4.99 |
| 코인 팩 | $0.99~$9.99 |

## Key Decisions
<!-- coverage: high -->
- **배너 영역 = 하단 200px 공간 전용:** 게임 컨텐츠 없는 공간으로 설계 — 네이티브 배너가 WebView 위에 오버레이
- **isNative() 체크:** 웹/개발 환경에서는 AdMob 호출 없이 플레이스홀더만 표시 — 개발 편의성
- **동적 import:** `@capacitor-community/admob`를 동적 `import()`로 가져옴 — 웹 번들에 포함되되 네이티브에서만 실행

## Gotchas
<!-- coverage: high -->
**광고 콘텐츠 제한:**
- `AdMob.initialize()`에 `maxAdContentRating: MaxAdContentRating.General` 설정 — 전체연령(G) 광고만 노출
- 게임 이용등급과 별개. COPPA/TFUA 플래그(`tagForChildDirectedTreatment`, `tagForUnderAgeOfConsent`)와 혼동하지 말 것

**배포 전 필수 교체 3곳:**
1. `AdMobManager.ts`: `PROD_BANNER_ID`, `USE_TEST_ADS = false`
2. `capacitor.config.ts`: `AdMob.appId.android`를 실제 앱 ID로
3. `AndroidManifest.xml`: `APPLICATION_ID` 값을 실제 앱 ID로

- 테스트 ID로 배포 시 Google 정책 위반 → 앱 스토어 거절 가능
- AdMob 배너는 Capacitor 8.x 기준 `@capacitor-community/admob@8.0.0` 필요
- `cap sync` 후 `android/app/capacitor.build.gradle`에 `implementation project(':capacitor-community-admob')` 자동 추가 확인
- 풀스크린 모드(WindowInsets 숨김)에서 배너 위치가 실제 화면 하단에 맞게 표시되는지 실기기 테스트 필요

## Sources
- [src/utils/AdMobManager.ts](../src/utils/AdMobManager.ts) — AdMob 싱글턴
- [capacitor.config.ts](../capacitor.config.ts) — AdMob 플러그인 설정
- [android/app/src/main/AndroidManifest.xml](../android/app/src/main/AndroidManifest.xml) — 앱 ID 등록
- [CONCEPT.md](../CONCEPT.md) — 광고 수익 모델 (섹션 10)
- [src/scenes/GameScene.ts](../src/scenes/GameScene.ts) — showBanner/removeBanner 호출
- [src/scenes/LevelSelectScene.ts](../src/scenes/LevelSelectScene.ts) — showBanner/removeBanner 호출

---
*Last compiled: 2026-04-10 · 6 sources*
