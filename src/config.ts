import Phaser from 'phaser';

// 기준 해상도 (SCREEN_SPEC.md 기반)
export const GAME_WIDTH = 1080;
export const GAME_HEIGHT = 1920;

// 그리드 설정
export const GRID_ROWS = 8;
export const GRID_COLS = 8;
export const TILE_DISPLAY_SIZE = 108; // 타일 표시 크기 (원형 배경 포함)
export const TILE_GAP = 12;
export const TILE_TOTAL = TILE_DISPLAY_SIZE + TILE_GAP; // 120

// 보드 설정
export const BOARD_PADDING = 24;
export const BOARD_WIDTH = GRID_COLS * TILE_TOTAL - TILE_GAP + BOARD_PADDING * 2;
export const BOARD_HEIGHT = GRID_ROWS * TILE_TOTAL - TILE_GAP + BOARD_PADDING * 2;
export const BOARD_X = GAME_WIDTH / 2; // 중앙 정렬
export const BOARD_Y = GAME_HEIGHT / 2 - 40; // 약간 위로

// 보드 좌상단 첫 타일 중심 좌표
export const BOARD_OFFSET_X = BOARD_X - BOARD_WIDTH / 2 + BOARD_PADDING + TILE_DISPLAY_SIZE / 2;
export const BOARD_OFFSET_Y = BOARD_Y - BOARD_HEIGHT / 2 + BOARD_PADDING + TILE_DISPLAY_SIZE / 2;

// 타일 종류
export const TILE_TYPES = [
  'cupcake',
  'donut',
  'macaron',
  'croissant',
  'icecream',
  'chocolate',
] as const;

export type TileType = (typeof TILE_TYPES)[number];

// Stitch 디자인 기반 컬러 시스템
export const COLORS = {
  // Surface colors
  background: 0xfff8f3,
  surface: 0xfff8f3,
  surfaceContainerLowest: 0xffffff,
  surfaceContainerLow: 0xfff2e2,
  surfaceContainer: 0xfbecd9,
  surfaceContainerHigh: 0xf5e6d3,
  surfaceContainerHighest: 0xefe0cd,

  // Primary
  primary: 0x690008,
  primaryContainer: 0x8b1a1a,
  onPrimary: 0xffffff,

  // Text
  onSurface: 0x221a0f,
  onSurfaceVariant: 0x58413f,

  // Error (Moves badge)
  error: 0xba1a1a,
  errorContainer: 0xffdad6,

  // Tertiary
  tertiaryContainer: 0x782e3d,
};

// 타일 아이콘 색상 (Stitch HTML에서 추출)
export const TILE_ICON_COLORS: Record<TileType, number> = {
  cupcake: 0x782e3d,   // text-[#782E3D]
  donut: 0x6e6353,     // text-[#6E6353]
  macaron: 0xa8e6cf,   // text-[#A8E6CF]
  croissant: 0xf59e0b, // text-amber-500
  icecream: 0x38bdf8,  // text-sky-400
  chocolate: 0x58413f, // text-[#58413f]
};

// 타일 배경색 (모두 흰색 원형)
export const TILE_BG_COLOR = COLORS.surfaceContainerLowest;

// ─── P-7: 특수 젬 ──────────────────────────────────
export type SpecialType = 'lineBlast' | 'bomb' | 'colorBomb' | 'crossBlast' | 'wrapped';

export const SPECIAL_SYMBOLS: Record<SpecialType, string> = {
  lineBlast: '🔥',
  bomb: '💣',
  colorBomb: '✨',
  crossBlast: '🌀',
  wrapped: '🎁',
};

// ─── 장애물 시스템 ──────────────────────────────────
/** 셀 장애물 타입 */
export type CellModifier =
  | { type: 'ice'; layers: 1 | 2 | 3 }     // 얼음: 매칭 시 1겹씩 제거
  | { type: 'chain' }                        // 잠금: 스왑 불가, 인접 매칭으로 해제
  | { type: 'stone'; layers: 1 | 2 }         // 돌: 빈 셀 차단, 인접 매칭으로 파괴
  ;

export type CellModifierType = 'ice' | 'chain' | 'stone';

// ─── P-6: 게임 밸런스 상수 ──────────────────────────
// 점수 계산
export const SCORE_BASE = 100;          // 3매치 기본
export const SCORE_PER_EXTRA = 100;     // 4매치 이상 추가 타일당 보너스
export const COMBO_MULTIPLIER = 0.5;    // 캐스케이드 콤보 배수 증가 (1x → 1.5x → 2x ...)

// Phaser 게임 설정
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#FFF8F3',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  dom: {
    createContainer: true,
  },
  scene: [],  // main.ts에서 주입
};
