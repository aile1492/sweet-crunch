import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GRID_ROWS,
  GRID_COLS,
  TILE_SIZE,
  TILE_GAP,
  TILE_TOTAL,
  TILE_TYPES,
  TILE_COLORS,
  BOARD_OFFSET_X,
  BOARD_OFFSET_Y,
  TileType,
} from '../config';

export class GameScene extends Phaser.Scene {
  private grid: (TileType | null)[][] = [];
  private tileSprites: (Phaser.GameObjects.Rectangle | null)[][] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // 보드 배경
    const boardWidth = GRID_COLS * TILE_TOTAL - TILE_GAP;
    const boardHeight = GRID_ROWS * TILE_TOTAL - TILE_GAP;
    const boardCenterX = BOARD_OFFSET_X + boardWidth / 2;
    const boardCenterY = BOARD_OFFSET_Y + boardHeight / 2;

    this.add.rectangle(boardCenterX, boardCenterY, boardWidth + 40, boardHeight + 40, 0xf5e6d3)
      .setStrokeStyle(0)
      .setOrigin(0.5);

    // 그리드 초기화
    this.initGrid();
    this.drawGrid();

    // HUD (임시)
    this.add.text(GAME_WIDTH / 2, 140, 'Sweet Crunch', {
      fontSize: '64px',
      color: '#4A3728',
      fontFamily: 'Nunito, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  private initGrid(): void {
    for (let row = 0; row < GRID_ROWS; row++) {
      this.grid[row] = [];
      this.tileSprites[row] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        let tileType: TileType;
        // 초기 매칭 방지: 같은 타입이 3개 연속되지 않도록
        do {
          tileType = TILE_TYPES[Phaser.Math.Between(0, TILE_TYPES.length - 1)];
        } while (this.wouldCauseMatch(row, col, tileType));

        this.grid[row][col] = tileType;
        this.tileSprites[row][col] = null;
      }
    }
  }

  private wouldCauseMatch(row: number, col: number, type: TileType): boolean {
    // 가로 체크: 왼쪽 2개가 같은 타입인지
    if (
      col >= 2 &&
      this.grid[row][col - 1] === type &&
      this.grid[row][col - 2] === type
    ) {
      return true;
    }
    // 세로 체크: 위쪽 2개가 같은 타입인지
    if (
      row >= 2 &&
      this.grid[row - 1]?.[col] === type &&
      this.grid[row - 2]?.[col] === type
    ) {
      return true;
    }
    return false;
  }

  private drawGrid(): void {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const tileType = this.grid[row][col];
        if (!tileType) continue;

        const x = BOARD_OFFSET_X + col * TILE_TOTAL + TILE_SIZE / 2;
        const y = BOARD_OFFSET_Y + row * TILE_TOTAL + TILE_SIZE / 2;
        const color = TILE_COLORS[tileType];

        // 임시: 색상 사각형으로 타일 표시 (나중에 스프라이트로 교체)
        const tile = this.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, color)
          .setOrigin(0.5)
          .setStrokeStyle(0);

        // 둥근 모서리 효과를 위해 RoundedRectangle은 Graphics로 대체 가능
        // 지금은 단순 사각형으로 표시

        this.tileSprites[row][col] = tile;
      }
    }
  }
}
