import { CellModifier } from '../config';

// ─── 공유 타입 ────────────────────────────────────────
export interface CellDef {
  modifier?: CellModifier;
}

export type BoardLayout = (CellDef | null)[][];

// ─── 내부 헬퍼 ──────────────────────────────────────
function makeBoard(): BoardLayout {
  return Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => ({})));
}

// ─── 보드 팩토리 함수들 ──────────────────────────────

/** 8x8 빈 보드 */
export function emptyBoard(): BoardLayout {
  return makeBoard();
}

/** 지정 셀에 얼음 배치 */
export function iceBoard(cells: [number, number][], layers: 1 | 2 | 3 = 1): BoardLayout {
  const board = makeBoard();
  for (const [r, c] of cells) {
    board[r][c] = { modifier: { type: 'ice', layers } };
  }
  return board;
}

/** 지정 셀에 돌 배치 */
export function stoneBoard(cells: [number, number][], layers: 1 | 2 = 1): BoardLayout {
  const board = makeBoard();
  for (const [r, c] of cells) {
    board[r][c] = { modifier: { type: 'stone', layers } };
  }
  return board;
}

/** 지정 셀에 체인 배치 */
export function chainBoard(cells: [number, number][]): BoardLayout {
  const board = makeBoard();
  for (const [r, c] of cells) {
    board[r][c] = { modifier: { type: 'chain' } };
  }
  return board;
}

/** 얼음/체인/돌 혼합 보드 */
export function mixedBoard(
  ice: [number, number][] = [],
  chain: [number, number][] = [],
  stone: [number, number][] = [],
  iceLayers: 1 | 2 | 3 = 1,
  stoneLayers: 1 | 2 = 1,
): BoardLayout {
  const board = makeBoard();
  for (const [r, c] of ice) board[r][c] = { modifier: { type: 'ice', layers: iceLayers } };
  for (const [r, c] of chain) board[r][c] = { modifier: { type: 'chain' } };
  for (const [r, c] of stone) board[r][c] = { modifier: { type: 'stone', layers: stoneLayers } };
  return board;
}

/** 4 모서리 돌 배치 */
export function cornerStoneBoard(stoneLayers: 1 | 2 = 1): BoardLayout {
  return stoneBoard([[0, 0], [0, 7], [7, 0], [7, 7]], stoneLayers);
}

/** 테두리/내부 링 얼음 배치 */
export function ringIceBoard(outerRing: boolean, innerRing: boolean, layers: 1 | 2 | 3 = 1): BoardLayout {
  const board = makeBoard();
  const add = (r: number, c: number) => {
    if (r >= 0 && r < 8 && c >= 0 && c < 8) {
      board[r][c] = { modifier: { type: 'ice', layers } };
    }
  };
  if (outerRing) {
    for (let c = 0; c < 8; c++) { add(0, c); add(7, c); }
    for (let r = 1; r < 7; r++) { add(r, 0); add(r, 7); }
  }
  if (innerRing) {
    for (let c = 2; c < 6; c++) { add(2, c); add(5, c); }
    for (let r = 3; r < 5; r++) { add(r, 2); add(r, 5); }
  }
  return board;
}
