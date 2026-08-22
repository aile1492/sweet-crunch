import type { LevelGoal } from '../data/levels';
import type { ModifierGrid, SpecialType, TileGrid } from './domain';
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

export interface SweetCrunchTestBridge {
  readonly version: '1.0';
  startLevel(level: number, seed: number): void;
  getState(): GameQASnapshot | null;
}

