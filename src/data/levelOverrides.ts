import { mixedBoard, BoardLayout } from './levelFactories';

// ─── Override 타입 (LevelGoal과 동일 구조, 순환 임포트 방지) ──
export interface LevelGoalOverride {
  type: 'collect' | 'clearIce' | 'clearStone';
  tileType?: string;
  count: number;
}

export interface LevelOverrideSpec {
  level: number;
  moves?: number;
  tileCount?: 4 | 5 | 6;
  goals?: LevelGoalOverride[];
  board?: BoardLayout;
  timedGems?: { row: number; col: number; turns: number }[];
  starThresholds?: [number, number, number];
  notes?: string;
}

// ─── P3 밸런스 수정 + 특수 레벨 오버라이드 ──────────────────
export const LEVEL_OVERRIDES: LevelOverrideSpec[] = [

  // ── Pod 02: 돌 첫 도입 구간 5색 유지 ────────────────────────
  {
    level: 16,
    tileCount: 5,
    notes: '돌 첫 도입 구간 — 6색 전환 전 5색 유지',
  },
  {
    level: 17,
    tileCount: 5,
    notes: '5색 유지, 돌 반복 타격 학습',
  },

  // ── Level 50: World 1 마일스톤 ──────────────────────────────
  {
    level: 50,
    moves: 25,
    tileCount: 6,
    goals: [
      { type: 'collect', tileType: 'cupcake', count: 20 },
      { type: 'clearStone', count: 4 },
    ],
    board: mixedBoard(
      [[1, 1], [1, 6], [6, 1], [6, 6]],     // 코너 근처 얼음 1겹
      [],
      [[0, 3], [0, 4], [7, 3], [7, 4]],      // 상하 중앙 돌
      1, 1
    ),
    timedGems: [],  // 마일스톤 레벨 — 타이머 없이 여유
    starThresholds: [3200, 5400, 8000],
    notes: 'World 1 피날레 — 달성감 중심, 타이머 없음, 특수젬 조합 유도',
  },

  // ── Level 100: World 2 대형 마일스톤 ───────────────────────
  {
    level: 100,
    moves: 28,
    tileCount: 6,
    goals: [
      { type: 'collect', tileType: 'cupcake', count: 25 },
      { type: 'clearIce', count: 8 },
      { type: 'clearStone', count: 4 },
    ],
    board: mixedBoard(
      [[1, 2], [1, 3], [1, 4], [1, 5], [6, 2], [6, 3], [6, 4], [6, 5]],
      [[0, 3], [0, 4], [7, 3], [7, 4]],
      [[0, 0], [0, 7], [7, 0], [7, 7]],
      2, 1
    ),
    timedGems: [],  // 대형 마일스톤 — 긴장감보다 성취감 우선
    starThresholds: [8000, 13000, 20000],
    notes: 'World 2 피날레 — 트리플 목표, 풍성한 이동 수, 타이머 없음',
  },
];

export function getOverride(level: number): LevelOverrideSpec | undefined {
  return LEVEL_OVERRIDES.find(o => o.level === level);
}
