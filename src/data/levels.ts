import { TileType, TILE_TYPES } from '../config';
import {
  CellDef, BoardLayout,
  iceBoard, stoneBoard, chainBoard, mixedBoard,
} from './levelFactories';
import { getBand } from './levelBands';
import { getPod } from './levelPods';
import { getTemplate, LevelTemplateSpec } from './levelTemplates';
import { getOverride } from './levelOverrides';

// ─── 공유 타입 re-export (하위 호환) ────────────────────
export type { CellDef };
export type { LevelTemplateSpec };

// ─── 레벨 목표 ───────────────────────────────────────────
export interface LevelGoal {
  type: 'collect' | 'clearIce' | 'clearStone';
  tileType?: TileType;
  count: number;
}

// ─── 레벨 정의 ───────────────────────────────────────────
export interface LevelDef {
  level: number;
  moves: number;
  goals: LevelGoal[];
  starThresholds: [number, number, number];
  board?: BoardLayout;
  timedGems?: { row: number; col: number; turns: number }[];
  tileCount?: number;
}

// ═══════════════════════════════════════════════════════════
// buildLevel — 레벨 번호 → LevelDef 조립
// 조립 순서: Band 커브 → P3 조정 → 기본 정의 → L1-5 고정값 → 보드 → Override
// ═══════════════════════════════════════════════════════════
function buildLevel(i: number): LevelDef {
  const band = getBand(i);

  // ── Band별 기본 커브 ────────────────────────────────────
  let moves: number;
  let goalCount: number;
  let baseStar: number;

  if (band.id === 'world_01') {
    // Band 1 (L1~50): FTUE — 완만한 상승
    const t = (i - 1) / 49;
    moves = Math.round(30 - 12 * Math.pow(t, 0.6));
    if (i > 1 && i % 10 === 0) moves += 5;
    else if (i > 1 && i % 5 === 0) moves += 3;
    if (i >= 36 && i <= 40) moves += 3;
    goalCount = Math.round(12 + 35 * Math.pow(t, 0.8));
    baseStar = 2000 + Math.round(7000 * t);
  } else {
    // Band 2 (L51~100): Sugar Rush — 더 타이트한 커브
    const t = (i - 51) / 49;
    moves = Math.round(26 - 10 * Math.pow(t, 0.6));
    if (i > 51 && i % 10 === 0) moves += 5;
    else if (i > 51 && i % 5 === 0) moves += 3;
    goalCount = Math.round(20 + 45 * Math.pow(t, 0.8));
    baseStar = 5000 + Math.round(10000 * t);
  }

  // ── P3 이동 수 조정 ────────────────────────────────────
  if (i >= 27 && i <= 29) moves += 2;
  else if (i >= 31 && i <= 34) moves += 1;
  else if (i === 38 || i === 39) moves += 1;
  else if (i >= 41 && i <= 44) moves = 21;
  else if (i === 46) moves += 1;
  else if (i >= 47 && i <= 49) moves += 2;

  // ── P3 목표 수 조정 ─────────────────────────────────────
  if (i >= 12 && i <= 14) goalCount -= 1;
  if (i >= 22 && i <= 24) goalCount -= 2;
  if (i >= 36 && i <= 39) goalCount -= 3;
  if (i >= 41 && i <= 44) goalCount -= 2;
  goalCount = Math.max(goalCount, 8);

  // ── 타일 수 ─────────────────────────────────────────────
  // P3: L16-17은 5색 유지 (stone 첫 도입 구간, 6색 전환 전)
  const tileCount = i <= 5 ? 4 : i <= 17 ? 5 : 6;

  const tileIndex = Math.min((i - 1) % TILE_TYPES.length, tileCount - 1);
  const tileType = TILE_TYPES[tileIndex];

  // ── 기본 레벨 정의 ──────────────────────────────────────
  const def: LevelDef = {
    level: i,
    moves,
    goals: [{ type: 'collect', tileType, count: goalCount }],
    starThresholds: [baseStar, Math.round(baseStar * 1.8), Math.round(baseStar * 2.3)],
    tileCount,
  };

  // ── 레벨 1~5: FTUE 고정값 (튜토리얼 전용) ───────────────
  if (i === 1) {
    def.moves = 18;
    def.goals = [{ type: 'collect', tileType: 'cupcake', count: 12 }];
    def.starThresholds = [900, 1600, 2400];
  } else if (i === 2) {
    def.moves = 20;
    def.goals = [{ type: 'collect', tileType: 'donut', count: 14 }];
    def.starThresholds = [1200, 2100, 3200];
  } else if (i === 3) {
    def.moves = 21;
    def.goals = [{ type: 'collect', tileType: 'macaron', count: 16 }];
    def.starThresholds = [1500, 2600, 3900];
  } else if (i === 4) {
    def.moves = 20;
    def.goals = [{ type: 'collect', tileType: 'croissant', count: 16 }];
    def.starThresholds = [1750, 3000, 4400];
  } else if (i === 5) {
    def.moves = 22;
    def.goals = [{ type: 'collect', tileType: 'icecream', count: 18 }];
    def.tileCount = 5;
    def.starThresholds = [2100, 3600, 5200];
  }

  // ── 보드 레이아웃 적용 (Pod ID 기반 라우팅) ─────────────
  applyBoardLayout(def, i, tileType, goalCount);

  // ── levelOverrides 마지막에 덮어쓰기 ────────────────────
  const ov = getOverride(i);
  if (ov) {
    if (ov.moves !== undefined) def.moves = ov.moves;
    if (ov.tileCount !== undefined) def.tileCount = ov.tileCount;
    if (ov.goals !== undefined) def.goals = ov.goals as LevelGoal[];
    if (ov.board !== undefined) def.board = ov.board;
    if (ov.timedGems !== undefined) def.timedGems = ov.timedGems;
    if (ov.starThresholds !== undefined) def.starThresholds = ov.starThresholds;
  }

  return def;
}

// ═══════════════════════════════════════════════════════════
// applyBoardLayout — Pod ID 기반 라우팅
// 각 Pod 함수는 해당 구간의 보드/목표를 담당
// ═══════════════════════════════════════════════════════════
function applyBoardLayout(def: LevelDef, i: number, tileType: TileType, goalCount: number): void {
  const pod = getPod(i);

  switch (pod.id) {
    case 'pod_01': applyPod01Board(def, i); break;
    case 'pod_02': applyPod02Board(def, i); break;
    case 'pod_03': applyPod03Board(def, i); break;
    case 'pod_04': applyPod04Board(def, i); break;
    case 'pod_05': applyPod05Board(def, i, tileType, goalCount); break;
    case 'pod_06': applyPod06Board(def, i, tileType, goalCount); break;
    case 'pod_07': applyPod07Board(def, i, tileType, goalCount); break;
    case 'pod_08': applyPod08Board(def, i, tileType, goalCount); break;
    case 'pod_09': applyPod09Board(def, i, tileType, goalCount); break;
    case 'pod_10': applyPod10Board(def, i, tileType, goalCount); break;
  }
}

// ── Band 1 ────────────────────────────────────────────────

// Pod 01: 기초 + 첫 얼음 (L1~10)
// Templates: open_collect, center_ice_patch, edge_ice_shell
function applyPod01Board(def: LevelDef, i: number): void {
  // L1-5: 개방 보드 (buildLevel에서 목표/이동 수 개별 설정, 보드 없음)
  if (i < 6) return;
  if (i === 6) {
    def.board = iceBoard([[3, 3], [3, 4], [4, 3], [4, 4]]);
  } else if (i === 7) {
    def.board = iceBoard([[2, 2], [2, 5], [5, 2], [5, 5], [3, 3], [3, 4], [4, 3], [4, 4]]);
  } else if (i >= 8 && i <= 10) {
    const cells: [number, number][] = [];
    for (let c = 1; c < 7; c++) { cells.push([1, c]); cells.push([6, c]); }
    def.board = iceBoard(cells);
  }
}

// Pod 02: 체인 도입 + 돌 첫 경험 (L11~20)
// Templates: corner_chain, corner_stone
function applyPod02Board(def: LevelDef, i: number): void {
  if (i === 11) {
    def.board = chainBoard([[3, 3], [3, 4], [4, 3], [4, 4]]);
  } else if (i >= 12 && i <= 15) {
    const cc: [number, number][] = [[2, 3], [2, 4], [3, 2], [3, 5], [4, 2], [4, 5], [5, 3], [5, 4]];
    def.board = chainBoard(cc.slice(0, 4 + (i - 12) * 2));
  } else if (i === 16) {
    def.board = stoneBoard([[3, 3], [4, 4]]);
  } else if (i >= 17 && i <= 20) {
    const sc: [number, number][] = [[2, 2], [2, 5], [5, 2], [5, 5], [3, 3], [4, 4]];
    def.board = stoneBoard(sc.slice(0, 2 + (i - 17)));
  }
}

// Pod 03: 2겹 얼음 + 얼음+체인 혼합 (L21~30)
// Templates: core_ice_2layer, mixed_ice_chain
function applyPod03Board(def: LevelDef, i: number): void {
  if (i >= 21 && i <= 25) {
    const ic: [number, number][] = [[2, 2], [2, 5], [5, 2], [5, 5], [3, 3], [3, 4], [4, 3], [4, 4]];
    def.board = iceBoard(ic.slice(0, 4 + (i - 21)), 2);
  } else if (i >= 26 && i <= 30) {
    def.board = mixedBoard(
      [[1, 3], [1, 4], [6, 3], [6, 4]],
      [[3, 1], [3, 6], [4, 1], [4, 6]],
      [], 1
    );
  }
}

// Pod 04: 돌 2겹+체인 + 3겹 얼음 + 멀티 목표 (L31~40)
// Templates: mixed_stone_chain, center_ice_patch
function applyPod04Board(def: LevelDef, i: number): void {
  if (i >= 31 && i <= 35) {
    def.board = mixedBoard(
      [],
      [[3, 3], [3, 4], [4, 3], [4, 4]],
      [[0, 0], [0, 7], [7, 0], [7, 7]],
      1, 2
    );
  } else if (i >= 36 && i <= 40) {
    const ic: [number, number][] = [[3, 2], [3, 3], [3, 4], [3, 5], [4, 2], [4, 3], [4, 4], [4, 5]];
    def.board = iceBoard(ic.slice(0, 4 + (i - 36)), 3);
    def.goals.push({ type: 'clearIce', count: 4 + (i - 36) });
  }
}

// Pod 05: 풀 혼합 + 타이머 젬 + World 1 마일스톤 (L41~50)
// Templates: full_pressure_mix, hardcore_mixed
// L50은 levelOverrides에서 완전 오버라이드됨
function applyPod05Board(def: LevelDef, i: number, tileType: TileType, goalCount: number): void {
  if (i >= 41 && i <= 45) {
    def.board = mixedBoard(
      [[1, 1], [1, 6], [6, 1], [6, 6], [2, 3], [2, 4], [5, 3], [5, 4]],
      [[3, 0], [4, 0], [3, 7], [4, 7]],
      [[0, 3], [0, 4], [7, 3], [7, 4]],
      2, 1
    );
    def.goals = [
      { type: 'collect', tileType, count: Math.round(goalCount * 0.7) },
      { type: 'clearIce', count: 8 },
    ];
    // P3: 타이머 젬 44~45부터 (기존 43~45 → 44~45)
    if (i >= 44) {
      def.timedGems = [
        { row: 2, col: 2, turns: 6 },
        { row: 5, col: 5, turns: 6 },
      ];
    }
  } else if (i >= 46 && i <= 49) {
    def.board = mixedBoard(
      [[1, 2], [1, 3], [1, 4], [1, 5], [6, 2], [6, 3], [6, 4], [6, 5]],
      [[3, 1], [3, 6], [4, 1], [4, 6]],
      [[0, 0], [0, 7], [7, 0], [7, 7], [3, 3], [4, 4]],
      3, 2
    );
    def.goals = [
      { type: 'collect', tileType, count: Math.round(goalCount * 0.6) },
      { type: 'clearStone', count: 6 },
    ];
    // P3: 47-48 타이머젬 2개, 49 타이머젬 4개 + turns=6
    const tgCount = i >= 49 ? 4 : 2;
    const tgTurns = 6;
    const tgPos: { row: number; col: number; turns: number }[] = [
      { row: 2, col: 2, turns: tgTurns },
      { row: 2, col: 5, turns: tgTurns },
    ];
    if (tgCount >= 3) tgPos.push({ row: 5, col: 2, turns: tgTurns + 1 });
    if (tgCount >= 4) tgPos.push({ row: 5, col: 5, turns: tgTurns });
    def.timedGems = tgPos;
  }
  // L50: levelOverrides에서 완전 오버라이드됨 (applyBoardLayout 후)
}

// ── Band 2 ────────────────────────────────────────────────

// Pod 06: 외곽 압박 레이아웃 (L51~60)
// Templates: edge_ice_shell, mixed_ice_chain
function applyPod06Board(def: LevelDef, i: number, tileType: TileType, goalCount: number): void {
  if (i <= 53) {
    const outer: [number, number][] = [];
    for (let c = 0; c < 8; c++) { outer.push([0, c]); outer.push([7, c]); }
    def.board = iceBoard(outer.slice(0, 8 + (i - 51) * 4));
    if (i >= 52) def.goals.push({ type: 'clearIce', count: 4 + (i - 52) * 2 });
  } else if (i <= 57) {
    def.board = mixedBoard(
      [[0, 2], [0, 3], [0, 4], [0, 5], [7, 2], [7, 3], [7, 4], [7, 5]],
      [[3, 0], [4, 0], [3, 7], [4, 7]],
      [], 1
    );
    def.goals = [
      { type: 'collect', tileType, count: Math.round(goalCount * 0.8) },
      { type: 'clearIce', count: 6 },
    ];
  } else {
    def.board = mixedBoard(
      [[0, 1], [0, 2], [0, 5], [0, 6], [7, 1], [7, 2], [7, 5], [7, 6]],
      [[3, 0], [4, 0], [3, 7], [4, 7], [0, 3], [0, 4], [7, 3], [7, 4]],
      [[0, 0], [0, 7], [7, 0], [7, 7]],
      2, 1
    );
    def.goals = [
      { type: 'collect', tileType, count: Math.round(goalCount * 0.7) },
      { type: 'clearIce', count: 8 },
    ];
    if (i === 60) {
      def.timedGems = [{ row: 3, col: 3, turns: 7 }, { row: 4, col: 4, turns: 7 }];
    }
  }
}

// Pod 07: 중앙 압박 레이아웃 (L61~70)
// Templates: core_ice_2layer, ring_ice_outer
function applyPod07Board(def: LevelDef, i: number, tileType: TileType, goalCount: number): void {
  if (i <= 64) {
    const core: [number, number][] = [
      [2, 2], [2, 3], [2, 4], [2, 5], [3, 2], [3, 5], [4, 2], [4, 5], [5, 2], [5, 3], [5, 4], [5, 5],
    ];
    def.board = iceBoard(core.slice(0, 4 + (i - 61) * 2), i <= 62 ? 1 : 2);
    def.goals = [
      { type: 'collect', tileType, count: Math.round(goalCount * 0.8) },
      { type: 'clearIce', count: 4 + (i - 61) * 2 },
    ];
  } else if (i <= 68) {
    def.board = mixedBoard(
      [[2, 2], [2, 3], [2, 4], [2, 5], [5, 2], [5, 3], [5, 4], [5, 5]],
      [[3, 1], [4, 1], [3, 6], [4, 6]],
      [], 2
    );
    def.goals = [
      { type: 'collect', tileType, count: Math.round(goalCount * 0.75) },
      { type: 'clearIce', count: 8 },
    ];
    if (i >= 67) {
      def.timedGems = [{ row: 3, col: 3, turns: 6 }, { row: 4, col: 4, turns: 6 }];
    }
  } else {
    def.board = mixedBoard(
      [[2, 2], [2, 3], [2, 4], [2, 5], [5, 2], [5, 3], [5, 4], [5, 5]],
      [[3, 1], [4, 1], [3, 6], [4, 6]],
      [[1, 3], [1, 4], [6, 3], [6, 4]],
      2, 1
    );
    def.goals = [
      { type: 'collect', tileType, count: Math.round(goalCount * 0.65) },
      { type: 'clearIce', count: 8 },
    ];
    def.timedGems = [
      { row: 3, col: 2, turns: 5 }, { row: 3, col: 5, turns: 5 }, { row: 4, col: 2, turns: 6 },
    ];
  }
}

// Pod 08: 돌 목표 + 타이머 (L71~80)
// Templates: corner_stone, mixed_stone_chain
function applyPod08Board(def: LevelDef, i: number, tileType: TileType, goalCount: number): void {
  if (i <= 74) {
    def.board = mixedBoard(
      [[1, 2], [1, 5], [6, 2], [6, 5]],
      [],
      [[0, 0], [0, 7], [7, 0], [7, 7], [3, 3], [3, 4], [4, 3], [4, 4]],
      1, (i >= 73 ? 2 : 1) as 1 | 2
    );
    def.goals = [
      { type: 'collect', tileType, count: Math.round(goalCount * 0.7) },
      { type: 'clearStone', count: 4 + (i - 71) },
    ];
    if (i >= 73) def.timedGems = [{ row: 2, col: 3, turns: 6 }];
  } else if (i <= 78) {
    def.board = mixedBoard(
      [[1, 2], [1, 3], [1, 4], [1, 5], [6, 2], [6, 3], [6, 4], [6, 5]],
      [[3, 0], [4, 0], [3, 7], [4, 7]],
      [[0, 0], [0, 7], [7, 0], [7, 7], [3, 3], [4, 4]],
      1, 2
    );
    def.goals = [
      { type: 'collect', tileType, count: Math.round(goalCount * 0.65) },
      { type: 'clearStone', count: 6 },
    ];
    def.timedGems = [{ row: 2, col: 2, turns: 5 }, { row: 5, col: 5, turns: 5 }];
  } else {
    def.board = mixedBoard(
      [[1, 1], [1, 2], [1, 5], [1, 6], [6, 1], [6, 2], [6, 5], [6, 6]],
      [[0, 3], [0, 4], [7, 3], [7, 4]],
      [[0, 0], [0, 7], [7, 0], [7, 7], [3, 3], [3, 4], [4, 3], [4, 4]],
      2, 2
    );
    def.goals = [
      { type: 'collect', tileType, count: Math.round(goalCount * 0.6) },
      { type: 'clearStone', count: 8 },
    ];
    const tgPos = [
      { row: 2, col: 2, turns: 5 }, { row: 2, col: 5, turns: 5 }, { row: 5, col: 2, turns: 6 },
    ];
    if (i === 80) tgPos.push({ row: 5, col: 5, turns: 6 });
    def.timedGems = tgPos;
  }
}

// Pod 09: 3겹 장애물 심화 (L81~90)
// Templates: full_pressure_mix, core_ice_2layer
function applyPod09Board(def: LevelDef, i: number, tileType: TileType, goalCount: number): void {
  const iceCount = Math.min(4 + (i - 81), 8);
  const ic: [number, number][] = [[3, 2], [3, 3], [3, 4], [3, 5], [4, 2], [4, 3], [4, 4], [4, 5]];
  def.board = mixedBoard(
    ic.slice(0, iceCount),
    [[3, 1], [4, 1], [3, 6], [4, 6]],
    [[0, 0], [0, 7], [7, 0], [7, 7]],
    3, 2
  );
  def.goals = [
    { type: 'collect', tileType, count: Math.round(goalCount * 0.65) },
    { type: 'clearIce', count: iceCount },
  ];
  const timerCount = i >= 87 ? 3 : i >= 84 ? 2 : 1;
  const turns = Math.max(4, 7 - Math.floor((i - 81) / 3));
  const tgPos: { row: number; col: number; turns: number }[] = [{ row: 1, col: 3, turns }];
  if (timerCount >= 2) tgPos.push({ row: 6, col: 4, turns });
  if (timerCount >= 3) tgPos.push({ row: 1, col: 4, turns: turns + 1 });
  def.timedGems = tgPos;
}

// Pod 10: 풀 혼합 마일스톤 (L91~100)
// Templates: hardcore_mixed, full_pressure_mix
// L100은 levelOverrides에서 완전 오버라이드됨
function applyPod10Board(def: LevelDef, i: number, tileType: TileType, goalCount: number): void {
  def.board = mixedBoard(
    [[1, 2], [1, 3], [1, 4], [1, 5], [6, 2], [6, 3], [6, 4], [6, 5], [2, 1], [2, 6], [5, 1], [5, 6]],
    [[3, 0], [4, 0], [3, 7], [4, 7], [0, 3], [0, 4], [7, 3], [7, 4]],
    [[0, 0], [0, 7], [7, 0], [7, 7], [3, 3], [4, 4]],
    i >= 95 ? 3 : 2,
    2
  );
  if (i < 95) {
    def.goals = [
      { type: 'collect', tileType, count: Math.round(goalCount * 0.6) },
      { type: 'clearIce', count: 8 },
    ];
  } else {
    def.goals = [
      { type: 'collect', tileType, count: Math.round(goalCount * 0.55) },
      { type: 'clearStone', count: 6 },
    ];
  }
  const timerCount = i >= 99 ? 4 : i >= 96 ? 3 : 2;
  const turns = Math.max(4, 6 - Math.floor((i - 91) / 4));
  const tgPos: { row: number; col: number; turns: number }[] = [
    { row: 2, col: 2, turns }, { row: 5, col: 5, turns },
  ];
  if (timerCount >= 3) tgPos.push({ row: 2, col: 5, turns: turns + 1 });
  if (timerCount >= 4) tgPos.push({ row: 5, col: 2, turns: turns + 1 });
  def.timedGems = tgPos;
}

// ═══════════════════════════════════════════════════════════
// 공개 API
// ═══════════════════════════════════════════════════════════
export const LEVELS: LevelDef[] = Array.from({ length: 100 }, (_, idx) => buildLevel(idx + 1));

/** 레벨 번호로 LevelDef 반환 (없으면 레벨 1) */
export function getLevelDef(levelNum: number): LevelDef {
  const def = LEVELS.find(l => l.level === levelNum);
  if (!def) {
    throw new Error(
      `getLevelDef: level ${levelNum}에 대한 정의가 없습니다. ` +
      `LEVELS 배열에 해당 레벨이 포함되어 있는지 확인하세요.`
    );
  }
  return def;
}

/**
 * [설계 참고용 API — 런타임 게임 로직에서 호출하지 않음]
 *
 * 레벨 번호에 해당하는 Pod의 대표 Template 설계 어휘를 조회합니다.
 * 101~500 레벨 신규 제작 시 레벨 디자이너가 보드 패턴 선택의 참고로 사용합니다.
 * 실제 보드 생성은 applyBoardLayout() → applyPodXXBoard() 가 담당합니다.
 *
 * @param levelNum - 조회할 레벨 번호 (현재 정의된 1~100 범위만 유효)
 */
export function getLevelTemplate(levelNum: number): LevelTemplateSpec | undefined {
  const pod = getPod(levelNum);
  return pod.allowedTemplates.length > 0 ? getTemplate(pod.allowedTemplates[0]) : undefined;
}
