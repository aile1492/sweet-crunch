// ─── Pod (10레벨 리듬 단위) 스펙 ─────────────────────────

export interface LevelPodSpec {
  id: string;
  bandId: string;
  levelStart: number;
  levelEnd: number;
  focus: string;
  dominantMechanics: string[];
  /**
   * 이 Pod에서 참고하는 보드 레이아웃 패턴 ID 목록 (levelTemplates.ts 참조).
   * 런타임 생성 로직과 직접 연결되지 않습니다 — 레벨 디자인 작업 시 참고용.
   * 실제 보드 생성은 levels.ts의 applyPodXXBoard() 함수가 담당합니다.
   */
  allowedTemplates: string[];
  targetDifficulty: 'teach' | 'easy' | 'normal' | 'hard' | 'milestone';
  reliefLevel: number;
  spikeLevel: number;
  milestoneLevel: number;
  tutorialLevel?: number;
  notes?: string;
}

export const LEVEL_PODS: LevelPodSpec[] = [
  // ─── Band 1: Bakery Basics (1~50) ────────────────────────────────
  {
    id: 'pod_01', bandId: 'world_01',
    levelStart: 1, levelEnd: 10,
    focus: '3-match 기초와 첫 얼음 장애물',
    dominantMechanics: ['collect', 'ice_1layer'],
    allowedTemplates: ['open_collect', 'center_ice_patch', 'edge_ice_shell'],
    targetDifficulty: 'teach',
    reliefLevel: 5, spikeLevel: 9, milestoneLevel: 10,
    tutorialLevel: 1,
    notes: '1-5: 4색 보드, 6-10: 5색 보드',
  },
  {
    id: 'pod_02', bandId: 'world_01',
    levelStart: 11, levelEnd: 20,
    focus: '체인 도입과 돌 첫 경험',
    dominantMechanics: ['collect', 'chain', 'stone_1layer'],
    allowedTemplates: ['corner_chain', 'corner_stone'],
    targetDifficulty: 'easy',
    reliefLevel: 15, spikeLevel: 19, milestoneLevel: 20,
    tutorialLevel: 11,
    notes: '11-15 체인, 16-17 돌(5색 유지), 18-20 6색 전환',
  },
  {
    id: 'pod_03', bandId: 'world_01',
    levelStart: 21, levelEnd: 30,
    focus: '2겹 얼음과 혼합 장애물 입문',
    dominantMechanics: ['clearIce', 'ice_2layer', 'chain_ice_mix'],
    allowedTemplates: ['core_ice_2layer', 'mixed_ice_chain'],
    targetDifficulty: 'normal',
    reliefLevel: 25, spikeLevel: 29, milestoneLevel: 30,
    notes: '21-25 얼음 2겹, 26-30 얼음+체인 혼합',
  },
  {
    id: 'pod_04', bandId: 'world_01',
    levelStart: 31, levelEnd: 40,
    focus: '돌 2겹과 첫 멀티 목표',
    dominantMechanics: ['clearIce', 'stone_2layer', 'chain', 'multi_goal'],
    allowedTemplates: ['mixed_stone_chain', 'center_ice_patch'],
    targetDifficulty: 'hard',
    reliefLevel: 35, spikeLevel: 39, milestoneLevel: 40,
    notes: '31-35 돌2겹+체인, 36-40 얼음3겹+clearIce 멀티목표',
  },
  {
    id: 'pod_05', bandId: 'world_01',
    levelStart: 41, levelEnd: 50,
    focus: '풀 혼합 + 타이머 젬 + World 1 마일스톤',
    dominantMechanics: ['clearIce', 'clearStone', 'timed_gem', 'full_mix'],
    allowedTemplates: ['full_pressure_mix', 'hardcore_mixed'],
    targetDifficulty: 'hard',
    reliefLevel: 45, spikeLevel: 49, milestoneLevel: 50,
    notes: '41-44 풀혼합, 44-45 타이머젬 첫 경험, 46-50 하드코어, 50 World 1 마일스톤',
  },

  // ─── Band 2: Sugar Rush (51~100) ─────────────────────────────────
  {
    id: 'pod_06', bandId: 'world_02',
    levelStart: 51, levelEnd: 60,
    focus: '외곽 압박 레이아웃 — World 1 복습',
    dominantMechanics: ['collect', 'ice_chain_mix', 'outer_shell'],
    allowedTemplates: ['edge_ice_shell', 'mixed_ice_chain'],
    targetDifficulty: 'teach',
    reliefLevel: 55, spikeLevel: 59, milestoneLevel: 60,
    notes: '새 월드 진입 부담 완화, 외곽 위치 읽기',
  },
  {
    id: 'pod_07', bandId: 'world_02',
    levelStart: 61, levelEnd: 70,
    focus: '중앙 압박 레이아웃',
    dominantMechanics: ['clearIce', 'chain', 'center_control'],
    allowedTemplates: ['core_ice_2layer', 'ring_ice_outer'],
    targetDifficulty: 'easy',
    reliefLevel: 65, spikeLevel: 69, milestoneLevel: 70,
    notes: '중앙 제어 중요성 학습',
  },
  {
    id: 'pod_08', bandId: 'world_02',
    levelStart: 71, levelEnd: 80,
    focus: '돌 목표 + 타이머 압박',
    dominantMechanics: ['clearStone', 'stone_2layer', 'timed_gem'],
    allowedTemplates: ['corner_stone', 'mixed_stone_chain'],
    targetDifficulty: 'normal',
    reliefLevel: 75, spikeLevel: 79, milestoneLevel: 80,
    notes: '복합 목표 심화',
  },
  {
    id: 'pod_09', bandId: 'world_02',
    levelStart: 81, levelEnd: 90,
    focus: '3겹 장애물과 이동 효율 극대화',
    dominantMechanics: ['clearIce', 'ice_3layer', 'chain', 'limited_moves'],
    allowedTemplates: ['full_pressure_mix', 'core_ice_2layer'],
    targetDifficulty: 'hard',
    reliefLevel: 85, spikeLevel: 89, milestoneLevel: 90,
    notes: '이동 효율 퍼즐',
  },
  {
    id: 'pod_10', bandId: 'world_02',
    levelStart: 91, levelEnd: 100,
    focus: 'World 2 총결산 + 대형 마일스톤',
    dominantMechanics: ['full_mix', 'timed_gem', 'multi_goal'],
    allowedTemplates: ['hardcore_mixed', 'full_pressure_mix'],
    targetDifficulty: 'milestone',
    reliefLevel: 95, spikeLevel: 99, milestoneLevel: 100,
    notes: '100레벨 대형 마일스톤 클리어',
  },
];

export function getPod(level: number): LevelPodSpec {
  const pod = LEVEL_PODS.find(p => level >= p.levelStart && level <= p.levelEnd);
  if (!pod) {
    throw new Error(
      `getPod: level ${level}에 대한 Pod 정의가 없습니다. ` +
      `LEVEL_PODS에 새 LevelPodSpec을 추가하세요.`
    );
  }
  return pod;
}
