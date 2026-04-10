// ─── Band (50레벨 월드 단위) 스펙 ────────────────────────

export interface LevelBandSpec {
  id: string;
  levelStart: number;
  levelEnd: number;
  worldName: string;
  description: string;
  tileCountDefault: 4 | 5 | 6;
  allowedGoals: Array<'collect' | 'clearIce' | 'clearStone'>;
  allowedModifiers: Array<'ice' | 'chain' | 'stone'>;
  allowTimedGems: boolean;
  movesRange: [number, number];
  collectPressureRange: [number, number];
  multiGoalFrequency: 'none' | 'low' | 'medium' | 'high';
  timedGemFrequency: 'none' | 'low' | 'medium' | 'high';
}

export const LEVEL_BANDS: LevelBandSpec[] = [
  {
    id: 'world_01',
    levelStart: 1,
    levelEnd: 50,
    worldName: 'Bakery Basics',
    description: 'FTUE — 기초 매치와 첫 장애물 경험',
    tileCountDefault: 6,
    allowedGoals: ['collect', 'clearIce', 'clearStone'],
    allowedModifiers: ['ice', 'chain', 'stone'],
    allowTimedGems: true,
    movesRange: [18, 30],
    collectPressureRange: [0.65, 1.8],
    multiGoalFrequency: 'low',
    timedGemFrequency: 'low',
  },
  {
    id: 'world_02',
    levelStart: 51,
    levelEnd: 100,
    worldName: 'Sugar Rush',
    description: '숙련 구간 — 특수젬 전략과 복합 장애물',
    tileCountDefault: 6,
    allowedGoals: ['collect', 'clearIce', 'clearStone'],
    allowedModifiers: ['ice', 'chain', 'stone'],
    allowTimedGems: true,
    movesRange: [16, 26],
    collectPressureRange: [1.0, 2.5],
    multiGoalFrequency: 'medium',
    timedGemFrequency: 'medium',
  },
];

export function getBand(level: number): LevelBandSpec {
  const band = LEVEL_BANDS.find(b => level >= b.levelStart && level <= b.levelEnd);
  if (!band) {
    throw new Error(
      `getBand: level ${level}에 대한 Band 정의가 없습니다. ` +
      `LEVEL_BANDS에 새 LevelBandSpec을 추가하세요.`
    );
  }
  return band;
}
