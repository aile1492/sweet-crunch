import { describe, expect, it } from 'vitest';
import { TILE_TYPES, type ModifierGrid, type TileGrid } from './domain';
import { createInitialBoard, findMatchedCells, listLegalSwaps } from './board';
import { SeededRandom } from './random';

describe('초기 보드 생성', () => {
  it('같은 Level 조건과 Seed에서 같은 보드를 만든다', () => {
    const first = createInitialBoard(new SeededRandom(1492), { tileTypes: TILE_TYPES.slice(0, 4) });
    const second = createInitialBoard(new SeededRandom(1492), { tileTypes: TILE_TYPES.slice(0, 4) });

    expect(first).toEqual(second);
  });

  it('즉시 매치가 없고 합법 행동이 있는 보드를 만든다', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const result = createInitialBoard(new SeededRandom(seed), { tileTypes: TILE_TYPES });
      expect(findMatchedCells(result.grid), `Seed ${seed}`).toEqual([]);
      expect(listLegalSwaps(result.grid).length, `Seed ${seed}`).toBeGreaterThan(0);
    }
  });

  it('돌 셀에는 타일을 만들지 않는다', () => {
    const modifiers: ModifierGrid = Array.from({ length: 8 }, () => Array(8).fill(null));
    modifiers[3][3] = { type: 'stone', layers: 2 };
    const result = createInitialBoard(new SeededRandom(16), { tileTypes: TILE_TYPES, modifiers });

    expect(result.grid[3][3]).toBeNull();
    expect(findMatchedCells(result.grid)).toEqual([]);
    expect(listLegalSwaps(result.grid, modifiers).length).toBeGreaterThan(0);
  });
});

describe('보드 검사', () => {
  it('가로와 세로 매치를 중복 없이 찾는다', () => {
    const grid: TileGrid = Array.from({ length: 8 }, () => Array(8).fill(null));
    grid[2][1] = 'cupcake';
    grid[2][2] = 'cupcake';
    grid[2][3] = 'cupcake';
    grid[1][2] = 'cupcake';
    grid[3][2] = 'cupcake';

    expect(findMatchedCells(grid)).toEqual([
      { row: 1, col: 2 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
      { row: 2, col: 3 },
      { row: 3, col: 2 },
    ]);
  });
});

