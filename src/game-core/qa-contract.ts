import type { LevelGoal } from '../data/levels';
import type { ModifierGrid, SpecialType, SwapAction, TileGrid } from './domain';
import type { RandomSnapshot } from './random';

export interface GameQASnapshot {
  schemaVersion: '1.0';
  level: number;
  seed: number;
  movesLeft: number;
  score: number;
  status: 'playing' | 'won' | 'lost';
  grid: TileGrid;
  specialGrid: (SpecialType | null)[][];
  modifiers: ModifierGrid;
  timedGems: (number | null)[][];
  goals: LevelGoal[];
  goalProgress: {
    collected: number;
    iceCleared: number;
    stoneCleared: number;
  };
  random: RandomSnapshot;
}

export type GameQAActionRejectReason =
  | 'busy'
  | 'game_over'
  | 'out_of_bounds'
  | 'not_adjacent'
  | 'empty_cell'
  | 'blocked_cell'
  | 'no_match';

export interface GameQAActionResult {
  accepted: boolean;
  reason?: GameQAActionRejectReason;
  before: GameQASnapshot;
  after: GameQASnapshot;
}

export interface SweetCrunchTestBridge {
  readonly version: '1.0';
  startLevel(level: number, seed: number): void;
  getState(): GameQASnapshot | null;
  performAction(action: SwapAction): Promise<GameQAActionResult>;
}

export type GameQACommand =
  | { id: string; type: 'startLevel'; level: number; seed: number }
  | { id: string; type: 'performAction'; action: SwapAction };

export type GameQACommandResponse =
  | { id: string; ok: true; result: GameQAActionResult | { started: true } }
  | { id: string; ok: false; error: string };
