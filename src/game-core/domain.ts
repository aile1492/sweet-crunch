export const GRID_ROWS = 8;
export const GRID_COLS = 8;

export const TILE_TYPES = [
  'cupcake',
  'donut',
  'macaron',
  'croissant',
  'icecream',
  'chocolate',
] as const;

export type TileType = (typeof TILE_TYPES)[number];

export type SpecialType = 'lineBlast' | 'bomb' | 'colorBomb' | 'crossBlast' | 'wrapped';

export type CellModifier =
  | { type: 'ice'; layers: 1 | 2 | 3 }
  | { type: 'chain' }
  | { type: 'stone'; layers: 1 | 2 };

export type CellModifierType = CellModifier['type'];

export interface GridPosition {
  row: number;
  col: number;
}

export interface SwapAction {
  type: 'swap';
  from: GridPosition;
  to: GridPosition;
}

export type TileGrid = (TileType | null)[][];
export type ModifierGrid = (CellModifier | null)[][];

