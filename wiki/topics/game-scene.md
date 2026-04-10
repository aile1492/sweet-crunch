# Game Scene

> 6000줄+ 메인 게임플레이 씬 — GameScene의 아키텍처, API, 핵심 알고리즘 <!-- coverage: high -->

## Purpose
<!-- coverage: high -->
`src/scenes/GameScene.ts`는 실제 Match-3 게임플레이가 구현된 핵심 씬이다.
그리드 렌더링, 스왑/매칭/낙하/캐스케이드, 특수 젬, HUD, 부스터, 레벨 클리어/실패, AdMob 배너를 모두 담당한다.

## Architecture
<!-- coverage: high -->
**씬 수명주기:**
```
init(data) → create() → update() [매 프레임]
```

**`init(data)`에서 수신하는 데이터:**
```typescript
{ level: number }  // LevelSelectScene에서 전달
```

**핵심 상태 변수:**
```typescript
grid: TileData[][]        // 8x8 타일 데이터
specialGrid: (SpecialType | null)[][]  // 특수 젬 병렬 배열
tileObjects: (Phaser.GameObjects.Container | null)[][]  // 렌더링 오브젝트
currentLevel: LevelDef    // 현재 레벨 정의
movesLeft: number         // 남은 이동 횟수
score: number             // 현재 점수
goalCollected: number     // 목표 수집 수
iceCleared: number        // 얼음 제거 수
stoneCleared: number      // 돌 제거 수
isAnimating: boolean      // 애니메이션 진행 중 플래그 (입력 차단)
cascadeDepth: number      // 현재 캐스케이드 깊이 (콤보 배수 계산용)
```

**TileData 구조:**
```typescript
interface TileData {
  type: TileType          // 'cupcake' | 'donut' | ...
  row: number; col: number
  special?: SpecialType   // undefined = 일반 타일
  lineDirection?: 'h' | 'v'  // lineBlast 방향
  modifier?: CellModifier  // 장애물 상태
  timerCount?: number      // timedGem 남은 턴
}
```

## API Surface
<!-- coverage: high -->
**주요 메서드 (공개 / 내부):**

| 메서드 | 역할 |
|--------|------|
| `create()` | 씬 초기화: HUD, 보드, 그리드, 하단 바, AdMob 배너 |
| `initGrid()` | 8x8 그리드 초기화 (초기 매칭 없도록 `wouldCauseMatch` 검사) |
| `drawGrid()` | 모든 타일 오브젝트 렌더링 |
| `trySwap(r1,c1,r2,c2)` | 스왑 시도: 특수조합 → colorBomb → 일반매칭 순서 |
| `findAllMatchGroups()` | 전체 매칭 그룹 탐색 (L/T형 감지, 5매치 우선) |
| `processMatchGroups(groups)` | 매칭 제거 + 특수 젬 생성 |
| `dropAndFill()` | 중력 낙하 + 새 타일 채우기 |
| `cascade()` | 낙하 후 재귀 매칭 (캐스케이드) |
| `activateSpecial(r,c,type)` | 특수 젬 발동 |
| `handleSpecialCombo(r1,c1,r2,c2)` | 특수+특수 조합 처리 |
| `hasValidMove()` | 유효한 스왑 존재 여부 확인 (교착 상태 감지) |
| `shuffleBoard()` | 보드 셔플 (매칭 없음 + 유효 스왑 있음 보장) |
| `showLevelClear()` | 레벨 클리어 팝업 |
| `showGameOver()` | 게임 오버 팝업 |
| `shutdown()` | AdMob 배너 제거 |

## Game Mechanics
<!-- coverage: high -->
**매칭 탐색 알고리즘 (`findAllMatchGroups`):**
1. Phase A: 가로/세로 run 수집 (연속 3+ 같은 타입)
2. Phase B: 교차 run 병합 → L/T형 감지, 5매치 우선순위
3. Phase C: match3 / match4 / match5plus 분류

**특수 젬 생성 규칙:**
- match4 → `lineBlast` (스왑 방향에 따라 'h'/'v')
- L/T형 → `bomb`
- match5+ → `colorBomb`
- 스폰 셀 = 스왑 타일 위치

**특수 젬 발동:**
- `lineBlast`: 해당 행 또는 열 전체
- `bomb`: 3×3 범위 (중심 포함)
- `colorBomb`: 보드 위 같은 타입 전체 (스왑 대상 타입 기준)
- `crossBlast`: 가로+세로 동시
- `wrapped`: 2단계 폭발 (발동 + 캐스케이드 시 재발동)

**특수+특수 조합 (`handleSpecialCombo`):**
| 조합 | 효과 |
|------|------|
| line+line | 십자 (가로+세로) |
| bomb+line | 3행 3열 |
| bomb+bomb | 5×5 범위 |
| color+line | 같은 타입 → lineBlast로 변환 후 전부 발동 |
| color+bomb | 같은 타입 → bomb으로 변환 후 전부 발동 |
| color+color | 전체 보드 제거 |

**점수 계산:**
```
match3: 100점
match4+: 100 + (extra_count × 100)
cascade 콤보: score × (1 + cascadeDepth × 0.5)
```

**이동 횟수 차감:** 유효 스왑(매칭 발생)마다 `-1`

## UI & Visual
<!-- coverage: high -->
**HUD 레이아웃 (상단 고정):**
- 목표 아이콘 + 진행 프로그레스 바 (좌측)
- 남은 이동수 배지 (우측, 5이하 시 빨간색)
- 점수 (중앙)
- 레벨 번호

**하단 바 (GAME_HEIGHT - 300 ~ GAME_HEIGHT - 100):**
- 홈 버튼 (좌측) → TitleScene
- 셔플 부스터 (중앙 좌)
- 라이트닝 부스터 (중앙)
- 힌트 부스터 (중앙 우)
- 설정 버튼 (우측) → SettingsScene

**AdMob 배너 영역 (하단 200px):**
- 네이티브에서 AdMob SDK가 Phaser 캔버스 위에 배너 오버레이
- 웹에서는 "Advertisement" 플레이스홀더 표시

**씬 내 depth 체계:**
```
0-4: 배경, 보드
5-9: 타일, 특수 젬 오버레이
10-19: 인터랙션 존
20-39: 파티클, 이펙트
40-49: AdMob 영역, 하단 바
50-59: HUD
60+: 팝업, 오버레이
```

## Key Decisions
<!-- coverage: high -->
- **`isAnimating` 플래그:** 애니메이션 중 입력 차단 — Phaser Tween 비동기 특성 때문에 필수
- **specialGrid 병렬 배열:** grid와 독립된 배열로 특수 젬 상태 관리 → 스왑/낙하/셔플 시 함께 동기화
- **큐 기반 연쇄 발동:** `expandActivations()` 큐로 특수 젬이 다른 특수 젬 트리거 시 처리
- **`hasValidMove` + `shuffleBoard`:** 교착 상태 자동 감지 후 자동 셔플 — "Shuffle!" 안내 메시지 표시

## Gotchas
<!-- coverage: high -->
- `tileObjects`와 `grid`/`specialGrid`의 행/열 인덱스가 항상 동기화되어야 함 — 낙하/셔플 시 불일치 버그 주의
- `trySwap` 흐름: **특수 조합 먼저 → colorBomb 직접발동 → 일반 매칭** 순서 반드시 유지
- `dropAndFill`: specialGrid도 반드시 함께 낙하 처리, 새 타일은 `special=null`
- `shuffleBoard`: 특수 젬 위치 보존 (일반 타일만 셔플)
- 타일 클릭 핸들러는 클로저 캡처 주의 — `tileData` 참조로 변경 필요 (스왑 후 좌표 불일치 버그 이력)
- `tween.getValue()` null 처리 필요 (TS 에러 이력)

## Sources
- [src/scenes/GameScene.ts](../src/scenes/GameScene.ts) — 메인 소스 (6060줄)
- [src/config.ts](../src/config.ts) — 게임 상수
- [src/data/levels.ts](../src/data/levels.ts) — 레벨 정의
- [WORKLOG.md](../WORKLOG.md) — P-2~P-9 상세 구현 로그
- [SCREEN_SPEC.md](../SCREEN_SPEC.md) — 화면 레이아웃 규격

---
*Last compiled: 2026-04-10 · 5 sources*
