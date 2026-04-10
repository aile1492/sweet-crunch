// ─── Template — 레벨 디자인 어휘 레퍼런스 ───────────────────
//
// 이 파일은 런타임 레벨 생성 로직과 직접 연결되지 않습니다.
// 목적: 101~500 레벨 신규 제작 시 레벨 디자이너가 참조하는
//       보드 패턴/목표 조합 어휘 사전입니다.
//
// 런타임 흐름:  buildLevel() → applyBoardLayout() → applyPodXXBoard()
//               (Template 데이터를 직접 실행하지 않음)
//
// Template 활용 흐름 (레벨 디자인 작업 시):
//   1. getLevelTemplate(levelNum) 으로 해당 Pod의 대표 템플릿 조회
//   2. boardFactoryHint 값으로 적합한 팩토리 함수 선택
//   3. preferredGoals/preferredModifiers 로 목표·장애물 구성 참고
//   4. 실제 적용은 applyPodXXBoard() 또는 levelOverrides 에서 코딩

export interface LevelTemplateSpec {
  id: string;
  layoutType:
    | 'open_center' | 'open_edges' | 'narrow_vertical' | 'narrow_horizontal'
    | 'split_left_right' | 'split_top_bottom' | 'corner_pressure'
    | 'ring_layout' | 'cross_layout' | 'stair_layout'
    | 'core_lock_layout' | 'outer_shell_layout';
  description: string;
  /**
   * 이 패턴에 어울리는 보드 팩토리 함수 이름 (levelFactories.ts 참고).
   * 런타임에 호출되지 않습니다 — 레벨 디자인 참고용 힌트입니다.
   */
  boardFactoryHint: string;
  preferredGoals: Array<'collect' | 'clearIce' | 'clearStone'>;
  preferredModifiers: Array<'ice' | 'chain' | 'stone'>;
}

export const LEVEL_TEMPLATES: LevelTemplateSpec[] = [
  {
    id: 'open_collect',
    layoutType: 'open_center',
    description: '개방형 보드 — 연쇄 유도, 수집 목표',
    boardFactoryHint: 'emptyBoard',
    preferredGoals: ['collect'],
    preferredModifiers: [],
  },
  {
    id: 'center_ice_patch',
    layoutType: 'open_edges',
    description: '중앙 얼음 패치 — clearIce 유도',
    boardFactoryHint: 'iceBoard',
    preferredGoals: ['collect', 'clearIce'],
    preferredModifiers: ['ice'],
  },
  {
    id: 'edge_ice_shell',
    layoutType: 'outer_shell_layout',
    description: '상하 가장자리 얼음 행',
    boardFactoryHint: 'iceBoard',
    preferredGoals: ['clearIce'],
    preferredModifiers: ['ice'],
  },
  {
    id: 'corner_chain',
    layoutType: 'corner_pressure',
    description: '코너 체인 잠금 — 중앙 매치 유도',
    boardFactoryHint: 'chainBoard',
    preferredGoals: ['collect'],
    preferredModifiers: ['chain'],
  },
  {
    id: 'corner_stone',
    layoutType: 'corner_pressure',
    description: '코너 돌 — 특수젬으로 해소',
    boardFactoryHint: 'cornerStoneBoard',
    preferredGoals: ['collect', 'clearStone'],
    preferredModifiers: ['stone'],
  },
  {
    id: 'core_ice_2layer',
    layoutType: 'core_lock_layout',
    description: '중앙 얼음 2겹 코어',
    boardFactoryHint: 'iceBoard',
    preferredGoals: ['clearIce'],
    preferredModifiers: ['ice'],
  },
  {
    id: 'mixed_ice_chain',
    layoutType: 'split_top_bottom',
    description: '상하 얼음, 측면 체인',
    boardFactoryHint: 'mixedBoard',
    preferredGoals: ['clearIce'],
    preferredModifiers: ['ice', 'chain'],
  },
  {
    id: 'mixed_stone_chain',
    layoutType: 'cross_layout',
    description: '중앙 체인, 코너 돌 2겹',
    boardFactoryHint: 'mixedBoard',
    preferredGoals: ['clearStone'],
    preferredModifiers: ['stone', 'chain'],
  },
  {
    id: 'full_pressure_mix',
    layoutType: 'ring_layout',
    description: '얼음+체인+돌 전체 혼합 압박',
    boardFactoryHint: 'mixedBoard',
    preferredGoals: ['collect', 'clearIce'],
    preferredModifiers: ['ice', 'chain', 'stone'],
  },
  {
    id: 'hardcore_mixed',
    layoutType: 'outer_shell_layout',
    description: '외곽 얼음 3겹 + 코너 돌 + 측면 체인',
    boardFactoryHint: 'mixedBoard',
    preferredGoals: ['collect', 'clearStone'],
    preferredModifiers: ['ice', 'chain', 'stone'],
  },
  {
    id: 'ring_ice_outer',
    layoutType: 'ring_layout',
    description: '외곽 링 얼음',
    boardFactoryHint: 'ringIceBoard',
    preferredGoals: ['clearIce'],
    preferredModifiers: ['ice'],
  },
];

/** Template ID로 단일 템플릿 조회 */
export function getTemplate(id: string): LevelTemplateSpec | undefined {
  return LEVEL_TEMPLATES.find(t => t.id === id);
}
