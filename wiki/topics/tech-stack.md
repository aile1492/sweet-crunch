# Tech Stack

> Phaser 3 + TypeScript + Vite + Capacitor 기반의 모바일 게임 기술 스택 <!-- coverage: high -->

## Purpose
<!-- coverage: high -->
Sweet Crunch의 기술 스택은 웹 기술로 네이티브 모바일 앱을 만드는 하이브리드 아키텍처다.
웹 표준 기술로 빠르게 개발하고, Capacitor로 Android/iOS에 배포한다.

## Architecture
<!-- coverage: high -->
```
TypeScript (strict mode)
       ↓
Phaser 3 v3.90+    (게임 엔진)
       ↓
Vite v8.x          (빌드 도구 — HMR, 번들링)
       ↓
dist/              (프로덕션 빌드 결과)
       ↓
Capacitor 8.x      (네이티브 래퍼)
       ↓
Android (API 21+) / iOS (추후)
```

**Phaser 3 설정 (`config.ts`):**
```typescript
type: Phaser.AUTO          // Canvas/WebGL 자동 선택
width: 1080, height: 1920  // 기준 해상도
scale.mode: Phaser.Scale.FIT
scale.autoCenter: CENTER_BOTH
backgroundColor: '#FFF8F3'
dom.createContainer: true   // Phaser DOM Element 지원
```

**씬 목록 (`main.ts`):**
```
BootScene → TitleScene → LevelSelectScene → GameScene → SettingsScene
```

## API Surface
<!-- coverage: high -->
**핵심 설정 상수 (`src/config.ts` 전부 export):**
```typescript
GAME_WIDTH = 1080, GAME_HEIGHT = 1920
GRID_ROWS = 8, GRID_COLS = 8
TILE_DISPLAY_SIZE = 108, TILE_GAP = 12, TILE_TOTAL = 120
BOARD_OFFSET_X, BOARD_OFFSET_Y  // 첫 타일 중심 좌표
TILE_TYPES: string[]             // 6종 타일명
COLORS: Record<string, number>   // Phaser hex 컬러 맵
SpecialType, CellModifier        // 타입 정의
SCORE_BASE=100, SCORE_PER_EXTRA=100, COMBO_MULTIPLIER=0.5
```

**빌드 커맨드:**
```bash
npm run dev        # 개발 서버 (localhost:3000, HMR)
npm run build      # tsc + vite build → dist/
npm run preview    # dist/ 미리보기
npm run cap:sync   # build + cap sync
npm run cap:android # build + sync + Android Studio 열기
```

## Key Decisions
<!-- coverage: high -->
- **Phaser AUTO 타입:** WebGL 가능 시 WebGL, 불가 시 Canvas로 자동 폴백 — 쉐이더 지원 및 모바일 호환성 균형
- **strict TypeScript:** 컴파일 타임 타입 체크로 6000줄+ 코드 안전성 유지
- **Vite:** esbuild 기반 초고속 빌드, HMR으로 개발 생산성 향상
- **scene 배열을 main.ts에서 주입:** 씬 간 순환 참조 방지 (`config.ts`에 scene 넣으면 순환)
- **Capacitor androidScheme: 'https':** WebView에서 `https://` 프로토콜 사용 → CORS 이슈 방지

## Gotchas
<!-- coverage: medium -->
- `BOARD_OFFSET_X/Y`는 첫 타일 **중심** 좌표 (Phaser origin 0.5 기본값 대응)
- `TILE_TOTAL = 108 + 12 = 120`으로 타일 위치 계산: `x = BOARD_OFFSET_X + col * TILE_TOTAL`
- Android `minSdkVersion`은 `variables.gradle`에서 제어
- Capacitor sync 후 `android/app/capacitor.build.gradle`이 자동 재생성됨 — 수동 편집 금지
- TypeScript v6.x 사용 중 (최신 버전) — devDependencies에만 있으므로 런타임 영향 없음

## Sources
- [src/config.ts](../src/config.ts) — 전체 게임 상수 정의
- [src/main.ts](../src/main.ts) — 엔트리포인트, 씬 등록
- [CLAUDE.md](../CLAUDE.md) — 기술 스택 문서
- [capacitor.config.ts](../capacitor.config.ts) — Capacitor 설정
- [package.json](../package.json) — 의존성 목록

---
*Last compiled: 2026-04-10 · 5 sources*
