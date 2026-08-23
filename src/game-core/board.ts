import {
  GRID_COLS,
  GRID_ROWS,
  type GridPosition,
  type ModifierGrid,
  type SwapAction,
  type TileGrid,
  type TileType,
} from './domain';
import { SeededRandom } from './random';

export interface InitialBoardOptions {
  tileTypes: readonly TileType[];
  modifiers?: ModifierGrid;
  maxAttempts?: number;
}
export interface InitialBoardResult {
  grid: TileGrid;
  attempts: number;
}

export function isInsideBoard(position: GridPosition): boolean {
  return position.row >= 0
    && position.row < GRID_ROWS
    && position.col >= 0
    && position.col < GRID_COLS;
}

export function isActionLocked(modifiers: ModifierGrid | undefined, row: number, col: number): boolean {
  const modifier = modifiers?.[row]?.[col];
  return modifier?.type === 'stone' || modifier?.type === 'chain';
}

export function wouldCauseMatch(grid: TileGrid, row: number, col: number, type: TileType): boolean {
  if (col >= 2 && grid[row]?.[col - 1] === type && grid[row]?.[col - 2] === type) return true;
  if (row >= 2 && grid[row - 1]?.[col] === type && grid[row - 2]?.[col] === type) return true;
  return false;
}

export function hasMatchAt(grid: TileGrid, row: number, col: number): boolean {
  const type = grid[row]?.[col];
  if (!type) return false;

  let horizontal = 1;
  for (let current = col - 1; current >= 0 && grid[row][current] === type; current--) horizontal++;
  for (let current = col + 1; current < GRID_COLS && grid[row][current] === type; current++) horizontal++;
  if (horizontal >= 3) return true;

  let vertical = 1;
  for (let current = row - 1; current >= 0 && grid[current]?.[col] === type; current--) vertical++;
  for (let current = row + 1; current < GRID_ROWS && grid[current]?.[col] === type; current++) vertical++;
  return vertical >= 3;
}

export function findMatchedCells(grid: TileGrid): GridPosition[] {
  const matched = new Set<string>();

  for (let row = 0; row < GRID_ROWS; row++) {
    let col = 0;
    while (col < GRID_COLS) {
      const type = grid[row]?.[col];
      if (!type) {
        col++;
        continue;
      }
      let end = col + 1;
      while (end < GRID_COLS && grid[row][end] === type) end++;
      if (end - col >= 3) {
        for (let current = col; current < end; current++) matched.add(`${row},${current}`);
      }
      col = end;
    }
  }

  for (let col = 0; col < GRID_COLS; col++) {
    let row = 0;
    while (row < GRID_ROWS) {
      const type = grid[row]?.[col];
      if (!type) {
        row++;
        continue;
      }
      let end = row + 1;
      while (end < GRID_ROWS && grid[end]?.[col] === type) end++;
      if (end - row >= 3) {
        for (let current = row; current < end; current++) matched.add(`${current},${col}`);
      }
      row = end;
    }
  }

  return [...matched]
    .map((key) => {
      const [row, col] = key.split(',').map(Number);
      return { row, col };
    })
    .sort((left, right) => left.row - right.row || left.col - right.col);
}

export function hasMatchAtSwap(grid: TileGrid, action: SwapAction): boolean {
  if (!isInsideBoard(action.from) || !isInsideBoard(action.to)) return false;
  const rowDistance = Math.abs(action.from.row - action.to.row);
  const colDistance = Math.abs(action.from.col - action.to.col);
  if (rowDistance + colDistance !== 1) return false;

  const fromType = grid[action.from.row]?.[action.from.col] ?? null;
  const toType = grid[action.to.row]?.[action.to.col] ?? null;
  if (!fromType || !toType || fromType === toType) return false;

  grid[action.from.row][action.from.col] = toType;
  grid[action.to.row][action.to.col] = fromType;
  const matched = hasMatchAt(grid, action.from.row, action.from.col)
    || hasMatchAt(grid, action.to.row, action.to.col);
  grid[action.from.row][action.from.col] = fromType;
  grid[action.to.row][action.to.col] = toType;
  return matched;
}

export function listLegalSwaps(grid: TileGrid, modifiers?: ModifierGrid): SwapAction[] {
  const actions: SwapAction[] = [];

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (!grid[row]?.[col] || isActionLocked(modifiers, row, col)) continue;

      const candidates: GridPosition[] = [
        { row, col: col + 1 },
        { row: row + 1, col },
      ];
      for (const to of candidates) {
        if (!isInsideBoard(to) || !grid[to.row]?.[to.col] || isActionLocked(modifiers, to.row, to.col)) continue;
        const action: SwapAction = { type: 'swap', from: { row, col }, to };
        if (hasMatchAtSwap(grid, action)) actions.push(action);
      }
    }
  }

  return actions;
}

export function createInitialBoard(random: SeededRandom, options: InitialBoardOptions): InitialBoardResult {
  if (options.tileTypes.length < 3) {
    throw new Error('초기 보드를 만들려면 최소 3종류의 타일이 필요합니다.');
  }

  const maxAttempts = options.maxAttempts ?? 100;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const grid: TileGrid = Array.from({ length: GRID_ROWS }, () => Array<TileType | null>(GRID_COLS).fill(null));

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (options.modifiers?.[row]?.[col]?.type === 'stone') continue;

        let type: TileType;
        do {
          type = random.pick(options.tileTypes);
        } while (wouldCauseMatch(grid, row, col, type));
        grid[row][col] = type;
      }
    }

    if (listLegalSwaps(grid, options.modifiers).length > 0) {
      return { grid, attempts: attempt };
    }
  }

  throw new Error(`합법 행동이 있는 초기 보드를 ${maxAttempts}회 안에 생성하지 못했습니다.`);
}

