# UI Scenes

> GameScene을 제외한 모든 씬 — Boot, Title, LevelSelect, Settings <!-- coverage: high -->

## Purpose
<!-- coverage: high -->
게임의 메뉴 흐름과 레벨 진입을 담당하는 씬들.
모든 씬은 Phaser Scene을 상속하며, `fadeToScene()` 유틸로 부드러운 전환을 처리한다.

## Architecture
<!-- coverage: high -->
**씬 흐름:**
```
BootScene (에셋 로딩)
    ↓
TitleScene (메인 메뉴)
    ↓
LevelSelectScene (레벨 선택 — 스크롤 가능)
    ↓ (레벨 선택 팝업)
GameScene (게임플레이)
    ↓
SettingsScene (설정 — GameScene에서도 접근)
```

**씬 전환 유틸 (`src/utils/SceneTransition.ts`):**
```typescript
fadeToScene(scene, key, data?)  // 페이드 아웃 → 씬 전환
fadeIn(scene)                   // 씬 create()에서 페이드 인
```

## API Surface
<!-- coverage: high -->

### BootScene
```typescript
preload()  // 모든 에셋 로드 (타일 이미지, FX 텍스처, 스프라이트시트)
create()   // → LevelSelectScene 이동
```
로드 대상: 타일 6종 PNG, FX 파티클 텍스처 (kenney_particle-pack, feminine, brackeys), poof spritesheet, vortex 스프라이트시트, 셰이더용 리소스

### TitleScene
게임 제목, 플레이 버튼 → LevelSelectScene

### LevelSelectScene
```typescript
create()          // 와인딩 경로 + 레벨 노드 + 고정 UI
showLevelStartPopup(levelNum)  // 레벨 시작 팝업 (공개)
shutdown()        // AdMob 배너 제거
```
**레이아웃 상수:**
```typescript
BOTTOM_BAR_HEIGHT = 200    // 하단 AdMob 영역
TOP_BAR_HEIGHT = 160       // 상단 고정 바
LEVEL_GAP_Y = 240          // 레벨 노드 간격
PATH_START_Y = 400         // 첫 레벨 Y 위치
```
**스크롤 시스템:** `scrollContainer` + 포인터 드래그 + 관성 (velocity × 0.92 감속)
**레벨 노드 3종:** 잠금 (🔒), 클리어 (🍪 쿠키 별), 현재 (노란 원 + 바운스 펄스)

**레벨 시작 팝업 내용:**
- "BAKERY CHALLENGE" 라벨
- "Level N" 타이틀
- 목표 아이콘 + 수량 카드
- Moves pill
- START 버튼 → `fadeToScene('GameScene', { level: N })`

### SettingsScene
- 사운드 ON/OFF 토글 (SoundManager 연동)
- 진동 ON/OFF 토글
- 뒤로가기 버튼

## UI & Visual
<!-- coverage: high -->
**LevelSelectScene 배경:** `#FFF8F3` + 점 패턴 (48px 간격, alpha 0.4)
**와인딩 경로:** 베지어 커브 점선, 완료 구간은 진한 색 (0x8b1a1a), 미완료는 연한 색
**X 오프셋 패턴:** `[120, 0, -140, 80, -40, 160, -100, ...]` — 20개 패턴 반복

**레벨 노드 시각:**
| 상태 | 배경 | 크기 | 특수 효과 |
|------|------|------|-----------|
| 잠금 | 연한 베이지 | 160px | 자물쇠 🔒 (alpha 0.4) |
| 클리어 | primary container 색 | 160px | 쿠키 🍪 별 표시 |
| 현재 | 노란색 (0xfacc15) | 224px | 글로우 펄스 + 바운스 애니 |

## Key Decisions
<!-- coverage: medium -->
- **스크롤 컨테이너 방식:** 모든 레벨 노드를 `scrollContainer`에 담고 Y 위치를 이동 — Phaser 카메라 이동보다 안정적
- **고정 UI(상단/하단)는 scrollContainer 외부:** depth 40+ 로 설정해 스크롤 컨텐츠 위에 항상 표시
- **하단 200px는 AdMob 배너 전용:** `drawAdArea()`만 배경 처리, 게임 컨텐츠 없음

## Gotchas
<!-- coverage: medium -->
- `scrollContainer` 내부 오브젝트의 y 좌표는 컨테이너 기준 절대 좌표 — 잠긴 레벨 번호 텍스트는 예외적으로 scrollContainer.add 후 절대 좌표로 재설정
- 스크롤 이벤트는 상단/하단 고정 UI 영역에서 무시: `if (pointer.y < TOP_BAR_HEIGHT || pointer.y > GAME_HEIGHT - BOTTOM_BAR_HEIGHT) return`
- 씬 전환 시 `shutdown()` 자동 호출 → AdMob `removeBanner()` 실행

## Sources
- [src/scenes/LevelSelectScene.ts](../src/scenes/LevelSelectScene.ts)
- [src/scenes/BootScene.ts](../src/scenes/BootScene.ts)
- [src/scenes/SettingsScene.ts](../src/scenes/SettingsScene.ts)
- [src/utils/SceneTransition.ts](../src/utils/SceneTransition.ts)
- [SCREEN_SPEC.md](../SCREEN_SPEC.md)

---
*Last compiled: 2026-04-10 · 5 sources*
