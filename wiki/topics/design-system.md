# Design System

> "The Artisanal Patisserie" — 컬러 팔레트, 타이포그래피, 컴포넌트 스타일 가이드 <!-- coverage: high -->

## Purpose
<!-- coverage: high -->
고급 부티크 베이커리 메뉴처럼 세련되고 숨쉬는 디자인 시스템.
전통적인 Match-3의 강렬한 컬러 대신 따뜻하고 에디토리얼한 분위기를 추구한다.

## Architecture
<!-- coverage: high -->
**컬러 토큰 체계 (Material Design 기반):**
```typescript
// config.ts COLORS 객체 — Phaser hex 포맷
COLORS = {
  background:                0xfff8f3   // 웜 크림 캔버스
  surfaceContainerLowest:    0xffffff   // 카드/타일 배경
  surfaceContainerLow:       0xfff2e2   // 미묘한 그룹핑
  surfaceContainer:          0xfbecd9   // 표준 컨테이너
  surfaceContainerHigh:      0xf5e6d3   // 높은 엘리베이션
  surfaceContainerHighest:   0xefe0cd   // 최고 엘리베이션
  primary:                   0x690008   // 체리 레드 — 주요 액션
  primaryContainer:          0x8b1a1a   // 주요 그라데이션 끝
  onPrimary:                 0xffffff   // 주요 위 텍스트
  onSurface:                 0x221a0f   // 기본 텍스트 (거의 검정)
  onSurfaceVariant:          0x58413f   // 보조 텍스트 (따뜻한 갈색)
  error:                     0xba1a1a   // 오류/위험
  errorContainer:            0xffdad6   // 오류 배경
  tertiaryContainer:         0x782e3d   // 큐케이크 아이콘 색
}
```

**DESIGN.md 기준 디자인 토큰 (CSS ↔ Phaser):**
```
#fcf5ed (surface) ↔ 0xfcf5ed
#a83028 (primary) ↔ 0xa83028   ← DESIGN.md 기준
#690008 (primary) ↔ 0x690008   ← config.ts 실제 사용값 (더 어두움)
```
> **주의:** DESIGN.md와 config.ts의 primary 색상이 약간 다름. 코드는 config.ts 기준.

## API Surface
<!-- coverage: high -->
**Stitch → Phaser 변환 규칙 (CLAUDE.md):**
```
CSS → Phaser
background-color: #690008  →  graphics.fillStyle(0x690008, 1)
border-radius: 40px        →  graphics.fillRoundedRect(x, y, w, h, 40)
box-shadow: 0 8px 24px     →  별도 Graphics 레이어, Y+8 오프셋
linear-gradient(A,B)       →  상단 fillStyle(B) + 하위 fillStyle(A)
opacity: 0.7               →  .setAlpha(0.7)
transform: rotate(-12deg)  →  container.setAngle(-12)
```

**좌표 변환 (Stitch 375x812 뷰포트 → 1080x1920):**
```
스케일 팩터: X=2.88, Y=2.36
Stitch 1080 기준 출력 → 1:1 사용
```

**타일 색상 (`config.ts TILE_ICON_COLORS`):**
| 타일 | CSS | Phaser |
|------|-----|--------|
| cupcake | #782E3D | 0x782e3d |
| donut | #6E6353 | 0x6e6353 |
| macaron | #A8E6CF | 0xa8e6cf |
| croissant | amber-500 | 0xf59e0b |
| icecream | sky-400 | 0x38bdf8 |
| chocolate | #58413f | 0x58413f |

## UI & Visual
<!-- coverage: high -->
**타이포그래피:** Plus Jakarta Sans (고급 대안 Nunito)
```
Display: 3.5rem / 2.75rem — 승리 화면
Headline: 1.5rem — 레벨 목표, 상점 카테고리
Title: 1.125rem — 아이템명
Body: 0.875rem — 설명 (on-surface-variant 색)
Label: 0.75rem — 올캡스, 5% 레터스페이싱
```

**엘리베이션 (Tonal Layering):**
```
Level 0 (Floor): surface (#fff8f3)
Level 1 (Sections): surface-container-low (#fff2e2)
Level 2 (Cards): surface-container-lowest (#ffffff)
```
> 전통 drop-shadow 금지. 색조 차이로 깊이감 표현.

**버튼 스타일:**
- Primary: 완전 둥근 pill, primary → primary-container 그라데이션
- 카드/팝업 radius: 40px
- 구분선 금지 — 색조 차이 또는 2rem 간격으로 구분

**The "No-Line" Rule:** 1px 솔리드 테두리 금지. 경계는 색조 변화로만 표현.
단, 아주 약한 outline-variant (b2aca5) 1.5px @ 20% opacity는 허용 ("Ghost Border").

## Key Decisions
<!-- coverage: medium -->
- **파스텔 톤 강제:** 색약 접근성 — 형태+색상 이중 구분으로 모든 타일 구별 가능
- **따뜻한 검정 (#221a0f):** 순수 검정(#000000) 금지 — 따뜻한 갈색 계열 텍스트
- **의도적 비대칭:** 32px 좌/24px 우 마진처럼 손으로 만든 느낌 추구

## Gotchas
<!-- coverage: medium -->
- DESIGN.md의 primary `#a83028`와 실제 코드 `0x690008` 사이에 불일치 존재 — 새 씬 개발 시 config.ts COLORS 우선
- Google Stitch 출력 HTML의 CSS hex는 Phaser hex로 반드시 변환 필요 (`#690008` → `0x690008`)
- Stitch가 Tailwind 클래스 사용 시 직접 색상값으로 변환: `text-[#782E3D]` → `0x782e3d`

## Sources
- [DESIGN.md](../DESIGN.md) — 전체 디자인 시스템 가이드
- [src/config.ts](../src/config.ts) — Phaser COLORS 객체
- [CLAUDE.md](../CLAUDE.md) — Stitch → Phaser 변환 규칙
- [SCREEN_SPEC.md](../SCREEN_SPEC.md) — 폰트, 컴포넌트 규격

---
*Last compiled: 2026-04-10 · 4 sources*
