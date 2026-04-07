import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';

// 기준 해상도 (SCREEN_SPEC.md 기반)
export const GAME_WIDTH = 1080;
export const GAME_HEIGHT = 1920;

// 그리드 설정
export const GRID_ROWS = 8;
export const GRID_COLS = 8;
export const TILE_SIZE = 120;
export const TILE_GAP = 8;
export const TILE_TOTAL = TILE_SIZE + TILE_GAP; // 128

// 보드 위치 (화면 중앙)
export const BOARD_OFFSET_X = (GAME_WIDTH - (GRID_COLS * TILE_TOTAL - TILE_GAP)) / 2;
export const BOARD_OFFSET_Y = 304;

// 타일 종류
export const TILE_TYPES = [
  'cupcake',
  'donut',
  'macaron',
  'croissant',
  'icecream',
  'chocolate',
] as const;

export type TileType = typeof TILE_TYPES[number];

// 타일 색상 (에셋 로드 전 임시 표시용)
export const TILE_COLORS: Record<TileType, number> = {
  cupcake: 0xff9baa,
  donut: 0xc4a7e7,
  macaron: 0xa8e6cf,
  croissant: 0xffd07b,
  icecream: 0x89cff0,
  chocolate: 0xa0725b,
};

// Phaser 게임 설정
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#FFF8F0',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, GameScene],
};
