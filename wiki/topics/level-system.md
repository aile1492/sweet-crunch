# Level System

> 50레벨 진행 구조, 목표 타입, 장애물, 진행도 저장 시스템 <!-- coverage: high -->

## Purpose
<!-- coverage: high -->
레벨 시스템은 게임의 난이도 곡선과 플레이어 진행을 정의한다.
`src/data/levels.ts`에서 레벨 데이터를, `src/data/progress.ts`에서 플레이어 진행도를 관리한다.

## Architecture
<!-- coverage: high -->
```
levels.ts
  LevelDef[]         ← generateLevels()로 50레벨 자동 생성
  getLevelDef(n)     ← GameScene에서 레벨 데이터 가져올 때 사용

progress.ts
  PlayerProgress     ← localStorage "sweet_crunch_progress"에 저장
  loadProgress()
  updateLevelProgress()
  consumeHeart()
  regenerateHearts()
  getBoosterInventory()
```

## API Surface
<!-- coverage: high -->
**`LevelDef` 인터페이스:**
```typescript
interface LevelDef {
  level: number           // 1~50
  moves: number           // 이동 횟수 제한
  goals: LevelGoal[]      // 목표 배열 (멀티 골 지원)
  starThresholds: [number, number, number]  // 1성/2성/3성 점수
  board?: (CellDef | null)[][]   // 장애물 보드 레이아웃
  timedGems?: { row, col, turns }[]  // 타이머 젬 배치
  tileCount?: number      // 사용 타일 종류 수 (기본 6)
}

interface LevelGoal {
  type: 'collect' | 'clearIce' | 'clearStone'
  tileType?: TileType     // collect 전용
  count: number
}
```

**`PlayerProgress` 구조:**
```typescript
interface PlayerProgress {
  highestUnlocked: number      // 해금된 최고 레벨
  stars: Record<number, number> // 레벨별 획득 별 수
  highScores: Record<number, number>
  hearts: number               // 라이프 (최대 5)
  lastHeartTime: number        // 마지막 하트 충전 시각 (ms)
  coins: number                // 게임 내 화폐
  boosters: Record<BoosterType, number>  // 부스터 보유량
}
```

**주요 함수:**
```typescript
loadProgress(): PlayerProgress        // localStorage 읽기
updateLevelProgress(level, score, stars)  // 진행도 업데이트 + 다음 레벨 해금
consumeHeart(): boolean               // 하트 1개 소모 (0이면 false)
regenerateHearts(progress): Progress  // 시간 기반 하트 자동 충전
getBoosterInventory(): Record          // 부스터 보유량
```

## Game Mechanics
<!-- coverage: high -->
**50레벨 구조 — 밸런스 공식:**
```
이동수: 30 → 18 (완만 감소, t^0.6)
  + 매 10번째: +5, 매 5번째: +3 (브레이크 포인트)
목표 수: 12 → 47 (완만 증가, t^0.8)
타일 종: 4종(1~5) → 5종(6~15) → 6종(16~50)
```

**챕터별 장애물:**
| 레벨 | 장애물 | 특이사항 |
|------|--------|---------|
| 1~5 | 없음 | 튜토리얼, 4종 타일 |
| 6~10 | 얼음 1겹 | 중앙/가장자리 패턴 |
| 11~15 | 체인 | 4~12개 체인 셀 |
| 16~20 | 돌 1겹 | 코너/중앙 패턴 |
| 21~25 | 얼음 2겹 | 8개 얼음 셀 |
| 26~30 | 얼음+체인 혼합 | |
| 31~35 | 돌 2겹+체인 | |
| 36~40 | 얼음 3겹 | clearIce 목표 추가 |
| 41~45 | 풀 혼합(얼음+체인+돌) + timedGem(43+) | 멀티 골 |
| 46~50 | 하드코어 혼합 + timedGem(3~4개) | clearStone 목표 추가 |

**별 계산:**
```
3성 목표: stars == 3 (score >= starThresholds[2])
updateLevelProgress: 새 별이 기존보다 높을 때만 업데이트
```

**하트 시스템:**
```
최대 5개, 30분마다 1개 자동 충전
레벨 실패 시 -1, 성공 시 소모 없음
```

## Key Decisions
<!-- coverage: high -->
- **배열 기반 보드 정의:** `iceBoard()`, `stoneBoard()`, `chainBoard()`, `mixedBoard()` 헬퍼로 보드 레이아웃 선언적 정의
- **localStorage 직접 저장:** 서버 없이 단순 오프라인 진행도 관리
- **멀티 골 지원:** `goals[]` 배열로 수집+얼음깨기 동시 목표 가능 (레벨 36+)
- **timedGem:** 긴장감 연출, 레벨 43+에서 도입 — `turns` 카운트다운 후 자동 폭발

## Gotchas
<!-- coverage: medium -->
- `getLevelDef(n)`: 없는 레벨 번호 입력 시 레벨 1 반환 (폴백)
- `regenerateHearts`: `loadProgress()` 후 항상 호출해야 최신 하트 수를 반영
- `highestUnlocked`: 1부터 시작, 클리어한 레벨 + 1이 해금
- 타이머 젬 (`timedGems`)은 `board` 정의와 별도로 GameScene에서 처리

## Sources
- [src/data/levels.ts](../src/data/levels.ts) — 50레벨 정의 + 헬퍼 함수
- [src/data/progress.ts](../src/data/progress.ts) — localStorage 진행도 관리
- [CONCEPT.md](../CONCEPT.md) — 레벨 시스템 기획 (섹션 6)
- [WORKLOG.md](../WORKLOG.md) — P-8 레벨 시스템 구현 로그

---
*Last compiled: 2026-04-10 · 4 sources*
