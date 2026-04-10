import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  GRID_ROWS,
  GRID_COLS,
  TILE_DISPLAY_SIZE,
  TILE_TOTAL,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  BOARD_X,
  BOARD_Y,
  BOARD_OFFSET_X,
  BOARD_OFFSET_Y,
  TILE_TYPES,
  TILE_BG_COLOR,
  COLORS,
  TileType,
  SpecialType,
  SCORE_BASE,
  SCORE_PER_EXTRA,
  COMBO_MULTIPLIER,
  CellModifier,
} from '../config';
import { LevelDef, LevelGoal, getLevelDef, LEVELS } from '../data/levels';
import { updateLevelProgress, updateLevelProgressNoCoin, consumeHeart, getBoosterInventory, consumeBooster as consumeStoredBooster, canUseFreeSecondChance, markFreeSecondChanceUsed, canUseAdBooster, grantAdBooster, remainingAdBoosters, BoosterType } from '../data/progress';
import { SoundManager } from '../utils/SoundManager';
import { fadeToScene, fadeIn, launchOverScene } from '../utils/SceneTransition';
import { getLevelTutorial, TutorialStep, LevelTutorial } from '../data/tutorials';
import { RainbowPipeline, ShockwavePipeline, ShimmerPipeline } from '../shaders/RainbowPipeline';
import { getMotionFactor, isReducedMotionEnabled, vibrateCelebrate, vibrateSpecial, vibrateTap } from '../utils/UserSettings';
import { showBanner, removeBanner, showRewardedAd } from '../utils/AdMobManager';
import { saveRun, loadRun, clearRun, RunSnapshot } from '../data/activeRun';

const TILE_SYMBOLS: Record<TileType, string> = {
  cupcake: '🧁',
  donut: '🍩',
  macaron: '🟢',
  croissant: '🥐',
  icecream: '🍦',
  chocolate: '🍫',
};

const SWAP_DURATION = 200;
const FALL_DURATION_PER_ROW = 100;
const REMOVE_DURATION = 200;
const HIGHLIGHT_DURATION = 150;     // 매칭 하이라이트 지속
const STAGGER_DELAY = 30;           // 타일 간 제거 딜레이 (웨이브 효과)
const DEBUG_GRID = false; // 테스트용 고정 배치 (true로 바꾸면 디버그)

interface TileData {
  container: Phaser.GameObjects.Container;
  row: number;
  col: number;
  type: TileType;
  special?: SpecialType;
  lineDirection?: 'horizontal' | 'vertical';
}

interface MatchRun {
  cells: { row: number; col: number }[];
  direction: 'horizontal' | 'vertical';
  type: TileType;
}

interface MatchGroup {
  cells: { row: number; col: number }[];
  pattern: 'match3' | 'match4' | 'match5plus' | 'L_shape' | 'T_shape' | 'cross' | 'square';
  type: TileType;
  direction?: 'horizontal' | 'vertical';
  spawnCell: { row: number; col: number };
}

export class GameScene extends Phaser.Scene {
  // P-8: 레벨 데이터
  private currentLevel!: LevelDef;
  /** 현재 레벨에서 사용하는 타일 종류 (tileCount에 따라 TILE_TYPES를 slice) */
  private get activeTileTypes(): TileType[] {
    const count = this.currentLevel?.tileCount ?? TILE_TYPES.length;
    return TILE_TYPES.slice(0, count);
  }

  private grid: (TileType | null)[][] = [];
  private specialGrid: (SpecialType | null)[][] = [];
  private tileObjects: (TileData | null)[][] = [];
  // 장애물 시스템
  private cellModifiers: (CellModifier | null)[][] = [];
  private modifierVisuals: (Phaser.GameObjects.GameObject[] | null)[][] = [];
  private iceCleared = 0;
  private stoneCleared = 0;
  private selectedTile: { row: number; col: number } | null = null;
  private selectionGlow: Phaser.GameObjects.Graphics | null = null;
  private isAnimating = false;
  private dragStart: { row: number; col: number; x: number; y: number } | null = null;

  // P-6: 게임 상태
  private score = 0;
  private movesLeft = 25;
  private goalCollected = 0;
  private cascadeDepth = 0;
  private gameOver = false;
  private displayScore = 0;

  // P-9: 부스터
  private shuffleBoosterCount = 5;
  private hintBoosterCount = 3;

  // 아이들 힌트 타이머 (2단계)
  private idleShimmerTimer: Phaser.Time.TimerEvent | null = null;
  private idleHintTimer: Phaser.Time.TimerEvent | null = null;
  private static readonly IDLE_SHIMMER_DELAY = 8000;  // 8초: 전체 shimmer
  private static readonly IDLE_HINT_DELAY = 15000;    // 15초: 스왑 방향 표시
  private shuffleBadgeText!: Phaser.GameObjects.Text;
  private hintBadgeText!: Phaser.GameObjects.Text;
  private lightningBadgeText!: Phaser.GameObjects.Text;

  // 라이트닝 부스터
  private lightningBoosterCount = 3;
  private lightningMode = false;
  private lightningOverlay: Phaser.GameObjects.Graphics | null = null;
  private secondChanceUsed = false;
  private isPaused = false;
  private currentBGMKey = '';
  private burstEmitters = new Map<string, Phaser.GameObjects.Particles.ParticleEmitter>();

  // 래핑 젬 2단계 폭발 큐
  private wrappedPendingBursts: { row: number; col: number }[] = [];

  // 이슈 5: 승리 진행도 중복 저장 방지 플래그
  private progressSaved = false;

  // 런 복구: init()에서 설정, create()에서 소비 후 null
  private pendingSnap: RunSnapshot | null = null;

  // 타이머 젬 시스템
  private timedGemCounters: (number | null)[][] = [];
  private timedGemVisuals: (Phaser.GameObjects.Text | null)[][] = [];
  private timedGemDecrementPending = false;

  // 튜토리얼 시스템
  private tutorial: LevelTutorial | null = null;
  private tutorialStepIndex = 0;
  private tutorialMovesDone = 0;
  private tutorialFirstMatchDone = false;
  private tutorialOverlay: Phaser.GameObjects.GameObject[] = [];

  // P-6: HUD 텍스트 참조
  private scoreText!: Phaser.GameObjects.Text;
  private movesText!: Phaser.GameObjects.Text;
  private goalTexts: Phaser.GameObjects.Text[] = [];
  private goalProgressFills: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { level?: number; resumeRun?: boolean }): void {
    this.currentLevel = getLevelDef(data.level ?? 1);

    // 상태 리셋
    this.grid = [];
    this.specialGrid = [];
    this.tileObjects = [];
    this.cellModifiers = [];
    this.modifierVisuals = [];
    this.iceCleared = 0;
    this.stoneCleared = 0;
    this.selectedTile = null;
    this.selectionGlow = null;
    this.isAnimating = false;
    this.dragStart = null;
    this.score = 0;
    this.displayScore = 0;
    this.movesLeft = this.currentLevel.moves;
    this.goalCollected = 0;
    this.goalTexts = [];
    this.goalProgressFills = [];
    this.cascadeDepth = 0;
    this.gameOver = false;
    this.shuffleBoosterCount = 5;
    this.hintBoosterCount = 3;
    this.lightningBoosterCount = 3;
    this.lightningMode = false;
    this.lightningOverlay = null;
    this.secondChanceUsed = false;
    this.wrappedPendingBursts = [];
    this.timedGemCounters = [];
    this.timedGemVisuals = [];
    this.timedGemDecrementPending = false;
    this.burstEmitters.forEach(emitter => emitter.destroy());
    this.burstEmitters.clear();
    if (this.idleHintTimer) { this.idleHintTimer.destroy(); this.idleHintTimer = null; }
    // 이슈 5B: 재진입 시 항상 입력 잠금 해제
    this.isAnimating = false;
    this.gameOver = false;
    this.progressSaved = false;
    if (this.input) this.input.enabled = true;
    this.tutorial = getLevelTutorial(this.currentLevel.level);
    this.tutorialStepIndex = 0;
    this.tutorialMovesDone = 0;
    this.tutorialFirstMatchDone = false;
    this.tutorialOverlay = [];

    const boosters = getBoosterInventory();
    this.shuffleBoosterCount = boosters.shuffle;
    this.hintBoosterCount = boosters.hint;
    this.lightningBoosterCount = boosters.lightning;

    // ── 런 복구: resumeRun 플래그가 있으면 저장된 스냅샷으로 상태 덮어쓰기 ──
    if (data.resumeRun) {
      const snap = loadRun();
      if (snap && snap.level === this.currentLevel.level) {
        this.pendingSnap = snap;
        this.movesLeft = snap.movesLeft;
        this.score = snap.score;
        this.displayScore = snap.score;
        this.goalCollected = snap.goalCollected;
        this.iceCleared = snap.iceCleared;
        this.stoneCleared = snap.stoneCleared;
        this.secondChanceUsed = snap.secondChanceUsed;
        // 복구 중에는 튜토리얼 스킵
        this.tutorial = null;
      }
    }
  }

  create(): void {
    // ─── 커스텀 셰이더 파이프라인 등록 ───
    const renderer = this.game.renderer;
    if (renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
      if (!renderer.pipelines.has('RainbowPipeline')) {
        renderer.pipelines.addPostPipeline('RainbowPipeline', RainbowPipeline);
      }
      if (!renderer.pipelines.has('ShockwavePipeline')) {
        renderer.pipelines.addPostPipeline('ShockwavePipeline', ShockwavePipeline);
      }
      if (!renderer.pipelines.has('ShimmerPipeline')) {
        renderer.pipelines.addPostPipeline('ShimmerPipeline', ShimmerPipeline);
      }
    }

    fadeIn(this);
    this.drawHUD();
    this.drawBoard();
    // isFreshStart: 신규 판 여부 (resumeRun 복구면 false)
    const isFreshStart = !this.pendingSnap;
    if (this.pendingSnap) {
      this.restoreGridFromSnapshot(this.pendingSnap);
    } else {
      this.initGrid();
    }
    this.drawGrid();
    // 복구 시: 저장된 점수·골 진행도를 HUD에 반영
    if (this.pendingSnap) {
      this.scoreText.setText(`${this.score}`);
      this.updateGoalDisplay();
      this.pendingSnap = null;
    }
    this.animateBoardEntry();
    // 신규 판: 보드 등장 애니메이션 완료 후 초기 스냅샷 저장
    // (마지막 타일 등장 delay + duration + 바운스 ≈ 1100ms)
    if (isFreshStart) {
      const boardEntryMs = (GRID_ROWS - 1) * 50 + (GRID_COLS - 1) * 30 + 350 + 200;
      this.time.delayedCall(boardEntryMs, () => {
        if (!this.gameOver) saveRun(this.captureSnapshot());
      });
    }
    this.drawBottomBar();
    showBanner();

    // 사운드 시스템 초기화
    const sm = SoundManager.getInstance();
    sm.setScene(this);
    this.input.once('pointerdown', () => sm.ensureContext());

    // 드래그 스왑 이벤트
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.onPointerMove(pointer));
    this.input.on('pointerup', () => this.onPointerUp());

    // 아이들 힌트: 입력 시 타이머 리셋
    this.input.on('pointerdown', () => this.resetIdleHintTimer());

    // BGM 시작 (3곡 중 랜덤) — 페이드 인으로 자연스럽게
    const bgmKeys = ['bgm_gameplay_1', 'bgm_gameplay_2', 'bgm_gameplay_3'];
    this.currentBGMKey = bgmKeys[Math.floor(Math.random() * bgmKeys.length)];
    sm.fadeBGMIn(this.currentBGMKey, 500);

    // 튜토리얼: 보드 등장 후 'onStart' 스텝 표시
    if (this.tutorial) {
      const entryDelay = GRID_ROWS * 50 + GRID_COLS * 30 + 400;
      this.time.delayedCall(entryDelay, () => this.advanceTutorial('onStart'));
    }
    this.resetIdleHintTimer();
  }

  // ─── 유틸리티 ─────────────────────────────────


  private idleFloatTweens: Phaser.Tweens.Tween[] = [];

  /** 아이들 힌트 타이머 리셋 — 입력이 있을 때마다 호출 (2단계) */
  private resetIdleHintTimer(): void {
    if (this.idleShimmerTimer) { this.idleShimmerTimer.destroy(); this.idleShimmerTimer = null; }
    if (this.idleHintTimer) { this.idleHintTimer.destroy(); this.idleHintTimer = null; }
    this.stopIdleFloat();
    if (this.gameOver || this.isAnimating || this.isPaused) return;

    // 1단계: 8초 후 전체 shimmer + 떠다니기
    this.idleShimmerTimer = this.time.delayedCall(GameScene.IDLE_SHIMMER_DELAY, () => {
      if (this.gameOver || this.isAnimating || this.isPaused) return;
      this.showIdleShimmer();
      this.startIdleFloat();
    });

    // 2단계: 15초 후 스왑 방향 힌트 표시
    this.idleHintTimer = this.time.delayedCall(GameScene.IDLE_HINT_DELAY, () => {
      if (this.gameOver || this.isAnimating || this.isPaused) return;
      const hint = this.findAutoHintMove();
      if (hint) this.showHintHighlight(hint.r1, hint.c1, hint.r2, hint.c2);
    });
  }

  /** 타일 미세 떠다니기 시작 (아이들 상태) */
  private startIdleFloat(): void {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const tile = this.tileObjects[row]?.[col];
        if (!tile) continue;
        const baseY = tile.container.y;
        const tw = this.tweens.add({
          targets: tile.container,
          y: baseY + 3,
          duration: 2000 + Phaser.Math.Between(0, 500),
          delay: col * 120 + row * 160,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        this.idleFloatTweens.push(tw);
      }
    }
  }

  /** 타일 떠다니기 정지 + 정확한 그리드 위치로 snap */
  private stopIdleFloat(): void {
    for (const tw of this.idleFloatTweens) {
      if (tw.isPlaying()) tw.stop();
    }
    this.idleFloatTweens = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const tile = this.tileObjects[row]?.[col];
        if (!tile) continue;
        const pos = this.getTilePosition(row, col);
        tile.container.y = pos.y;
      }
    }
  }

  /** 8초 아이들 시 전체 타일 shimmer — 부드럽게 물결처럼 */
  private showIdleShimmer(): void {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const tile = this.tileObjects[row]?.[col];
        if (!tile) continue;
        this.tweens.add({
          targets: tile.container,
          alpha: 0.55,
          duration: 350,
          delay: (row + col) * 60,
          yoyo: true,
          ease: 'Sine.easeInOut',
        });
      }
    }
  }

  // ─── HUD ──────────────────────────────────────────
  private drawHUD(): void {
    const hudY = 40;
    const hudHeight = 200;

    const hudBg = this.add.graphics();
    hudBg.fillStyle(0xfff8f3, 0.95);
    hudBg.fillRoundedRect(0, 0, GAME_WIDTH, hudHeight + hudY, { tl: 0, tr: 0, bl: 48, br: 48 });
    hudBg.setDepth(10);

    const shadow = this.add.graphics();
    shadow.fillStyle(0x221a0f, 0.04);
    shadow.fillRoundedRect(0, hudHeight + hudY, GAME_WIDTH, 12, { tl: 0, tr: 0, bl: 12, br: 12 });
    shadow.setDepth(10);

    const centerY = hudY + hudHeight / 2;

    // ── Goals (동적 멀티 골 지원) ──
    const goals = this.currentLevel.goals;
    const goalContainer = this.add.container(0, 0).setDepth(11);
    if (goals.length <= 1) {
      this.drawSingleGoalHUD(goalContainer, centerY, goals[0]);
    } else {
      this.drawMultiGoalHUD(goalContainer, centerY, goals);
    }

    // Level 표시
    this.add.text(GAME_WIDTH / 2, centerY - 52, `LEVEL ${this.currentLevel.level}`, {
      fontSize: '22px', color: '#690008', fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold', letterSpacing: 4,
    }).setOrigin(0.5).setDepth(11).setAlpha(0.7);

    // Score
    this.add.text(GAME_WIDTH / 2, centerY - 28, 'SCORE', {
      fontSize: '24px', color: '#58413f', fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold', letterSpacing: 8,
    }).setOrigin(0.5).setAlpha(0.6).setDepth(11);
    this.scoreText = this.add.text(GAME_WIDTH / 2, centerY + 20, '0', {
      fontSize: '80px', color: '#221a0f', fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11);

    // Moves
    const movesX = GAME_WIDTH - 120;
    this.add.text(movesX, centerY - 46, 'MOVES', {
      fontSize: '24px', color: '#58413f', fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold', letterSpacing: 6,
    }).setOrigin(0.5).setAlpha(0.6).setDepth(12);

    const movesBg = this.add.graphics().setDepth(11);
    movesBg.fillStyle(COLORS.errorContainer, 1);
    movesBg.fillCircle(movesX, centerY + 12, 56);
    movesBg.lineStyle(8, COLORS.surface, 1);
    movesBg.strokeCircle(movesX, centerY + 12, 56);
    this.movesText = this.add.text(movesX, centerY + 12, `${this.movesLeft}`, {
      fontSize: '56px', color: '#690008', fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11);
  }

  /** 싱글 골 HUD (레벨 1-35 등) */
  private drawSingleGoalHUD(container: Phaser.GameObjects.Container, centerY: number, goal: LevelGoal): void {
    const goalBg = this.add.graphics();
    goalBg.fillStyle(COLORS.surfaceContainerLow, 1);
    goalBg.fillRoundedRect(48, centerY - 52, 380, 104, 52);
    container.add(goalBg);

    const { icon, bgColor } = this.getGoalVisualInfo(goal);
    const goalIconBg = this.add.graphics();
    goalIconBg.fillStyle(bgColor, 1);
    goalIconBg.fillCircle(110, centerY, 42);
    container.add(goalIconBg);

    if (goal.tileType && this.textures.exists(goal.tileType)) {
      const goalImg = this.add.image(110, centerY, goal.tileType);
      goalImg.setScale(60 / Math.max(goalImg.width, goalImg.height));
      container.add(goalImg);
    } else {
      container.add(this.add.text(110, centerY, icon, { fontSize: '36px' }).setOrigin(0.5));
    }

    container.add(this.add.text(175, centerY - 22, 'GOAL', {
      fontSize: '24px', color: '#58413f', fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold', letterSpacing: 6,
    }).setOrigin(0, 0.5));

    const goalText = this.add.text(175, centerY + 16, `${goal.count}`, {
      fontSize: '48px', color: '#690008', fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    container.add(goalText);
    this.goalTexts.push(goalText);

    const progressBg = this.add.graphics();
    progressBg.fillStyle(COLORS.surfaceContainerHighest, 1);
    progressBg.fillRoundedRect(245, centerY + 11, 140, 10, 5);
    container.add(progressBg);

    const progressFill = this.add.graphics();
    container.add(progressFill);
    this.goalProgressFills.push(progressFill);
  }

  /** 멀티 골 HUD (레벨 36+ 듀얼 골) */
  private drawMultiGoalHUD(container: Phaser.GameObjects.Container, centerY: number, goals: LevelGoal[]): void {
    const panelX = 36;
    const panelW = 420;
    const panelH = 108;

    // 배경 패널
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.surfaceContainerLow, 1);
    bg.fillRoundedRect(panelX, centerY - panelH / 2, panelW, panelH, 28);
    container.add(bg);

    const rowH = panelH / goals.length;
    goals.forEach((goal, idx) => {
      const rowY = centerY - panelH / 2 + rowH * idx + rowH / 2;
      const { icon, bgColor } = this.getGoalVisualInfo(goal);

      // 구분선 (첫 번째 이후)
      if (idx > 0) {
        const divider = this.add.graphics();
        divider.fillStyle(COLORS.surfaceContainerHighest, 0.6);
        divider.fillRect(panelX + 20, rowY - rowH / 2, panelW - 40, 1);
        container.add(divider);
      }

      // 아이콘 원
      const iconBg = this.add.graphics();
      iconBg.fillStyle(bgColor, 1);
      iconBg.fillCircle(panelX + 40, rowY, 22);
      container.add(iconBg);

      // 아이콘
      if (goal.tileType && this.textures.exists(goal.tileType)) {
        const img = this.add.image(panelX + 40, rowY, goal.tileType);
        img.setScale(30 / Math.max(img.width, img.height));
        container.add(img);
      } else {
        container.add(this.add.text(panelX + 40, rowY, icon, { fontSize: '24px' }).setOrigin(0.5));
      }

      // 남은 개수
      const goalText = this.add.text(panelX + 76, rowY, `${goal.count}`, {
        fontSize: '32px', color: '#690008', fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontStyle: 'bold',
      }).setOrigin(0, 0.5);
      container.add(goalText);
      this.goalTexts.push(goalText);

      // 미니 프로그레스 바
      const barX = panelX + 165;
      const barW = panelW - 165 - 24;
      const barH = 8;

      const progressBg = this.add.graphics();
      progressBg.fillStyle(COLORS.surfaceContainerHighest, 1);
      progressBg.fillRoundedRect(barX, rowY - barH / 2, barW, barH, barH / 2);
      container.add(progressBg);

      const progressFill = this.add.graphics();
      container.add(progressFill);
      this.goalProgressFills.push(progressFill);
    });
  }

  /** 골 타입별 아이콘/색상 정보 */
  private getGoalVisualInfo(goal: LevelGoal): { icon: string; bgColor: number } {
    switch (goal.type) {
      case 'collect':
        return { icon: goal.tileType ? TILE_SYMBOLS[goal.tileType] : '🍬', bgColor: COLORS.tertiaryContainer };
      case 'clearIce':
        return { icon: '❄️', bgColor: 0x4fc3f7 };
      case 'clearStone':
        return { icon: '🪨', bgColor: 0x8d7e73 };
      default:
        return { icon: '🎯', bgColor: COLORS.tertiaryContainer };
    }
  }

  // ─── 보드 배경 ────────────────────────────────────
  private drawBoard(): void {
    const boardShadow = this.add.graphics();
    boardShadow.fillStyle(COLORS.onSurface, 0.03);
    boardShadow.fillRoundedRect(
      BOARD_X - BOARD_WIDTH / 2 + 4, BOARD_Y - BOARD_HEIGHT / 2 + 8,
      BOARD_WIDTH, BOARD_HEIGHT, 40
    );
    boardShadow.setDepth(-1);

    const boardBg = this.add.graphics();
    boardBg.fillStyle(COLORS.surfaceContainerHigh, 1);
    boardBg.fillRoundedRect(
      BOARD_X - BOARD_WIDTH / 2, BOARD_Y - BOARD_HEIGHT / 2,
      BOARD_WIDTH, BOARD_HEIGHT, 40
    );
  }

  // ─── 그리드 초기화 ────────────────────────────────
  private initGrid(): void {
    if (DEBUG_GRID) {
      this.initDebugGrid();
      return;
    }
    const boardDef = this.currentLevel.board;
    for (let row = 0; row < GRID_ROWS; row++) {
      this.grid[row] = [];
      this.specialGrid[row] = [];
      this.tileObjects[row] = [];
      this.cellModifiers[row] = [];
      this.modifierVisuals[row] = [];
      this.timedGemCounters[row] = [];
      this.timedGemVisuals[row] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        this.timedGemCounters[row][col] = null;
        this.timedGemVisuals[row][col] = null;

        // 장애물 로드
        const cellDef = boardDef?.[row]?.[col];
        this.cellModifiers[row][col] = cellDef?.modifier ? { ...cellDef.modifier } as CellModifier : null;
        this.modifierVisuals[row][col] = null;

        // 돌 셀은 타일 없음
        if (cellDef?.modifier?.type === 'stone') {
          this.grid[row][col] = null;
          this.specialGrid[row][col] = null;
          this.tileObjects[row][col] = null;
          continue;
        }

        let tileType: TileType;
        do {
          tileType = this.activeTileTypes[Phaser.Math.Between(0, this.activeTileTypes.length - 1)];
        } while (this.wouldCauseMatch(row, col, tileType));
        this.grid[row][col] = tileType;
        this.specialGrid[row][col] = null;
        this.tileObjects[row][col] = null;
      }
    }

    // 타이머 젬 배치
    if (this.currentLevel.timedGems) {
      for (const tg of this.currentLevel.timedGems) {
        if (tg.row < GRID_ROWS && tg.col < GRID_COLS && this.grid[tg.row][tg.col]) {
          this.timedGemCounters[tg.row][tg.col] = tg.turns;
        }
      }
    }
  }

  /** 저장된 RunSnapshot으로 그리드 배열 초기화 (initGrid 대체) */
  private restoreGridFromSnapshot(snap: RunSnapshot): void {
    for (let row = 0; row < GRID_ROWS; row++) {
      this.grid[row] = [];
      this.specialGrid[row] = [];
      this.tileObjects[row] = [];
      this.cellModifiers[row] = [];
      this.modifierVisuals[row] = [];
      this.timedGemCounters[row] = [];
      this.timedGemVisuals[row] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        this.grid[row][col] = snap.grid[row]?.[col] ?? null;
        this.specialGrid[row][col] = snap.specialGrid[row]?.[col] ?? null;
        this.cellModifiers[row][col] = snap.cellModifiers[row]?.[col] ?? null;
        this.timedGemCounters[row][col] = snap.timedGemCounters[row]?.[col] ?? null;
        this.timedGemVisuals[row][col] = null;
        this.modifierVisuals[row][col] = null;
        this.tileObjects[row][col] = null;
      }
    }
    // lineDirections는 drawGrid()에서 this.pendingSnap를 통해 참조된다
  }

  /**
   * 특수 젬 테스트용 고정 배치
   *
   * 테스트 1: row7 col0(🧁)↔col1(🍩) → row7 cols 1,2,3,4 = 🧁×4 → 🔥 Line Blast!
   * 테스트 2: row3 col7(🍩)↔row4 col7(🍫) → col7 rows 1,2,3 = 🍩×3 + row3 cols 5,6,7 = 🍩×3 → L형 → 💣 Bomb!
   * 테스트 3: row0 col0(🟢)↔row1 col0(🍫) → col0 rows 1,2,3,4,5 = 🟢×5 → ✨ Color Bomb!
   */
  private initDebugGrid(): void {
    const C = 'cupcake' as TileType;
    const D = 'donut' as TileType;
    const M = 'macaron' as TileType;
    const R = 'croissant' as TileType;
    const I = 'icecream' as TileType;
    const H = 'chocolate' as TileType;

    //                col: 0  1  2  3  4  5  6  7
    const layout: TileType[][] = [
      /* row 0 */    [ R, D, I, H, R, D, I, R ],
      /* row 1 */    [ H, I, H, R, I, H, R, D ],
      /* row 2 */    [ D, R, R, D, H, R, I, H ],
      /* row 3 */    [ I, H, D, I, R, D, R, I ],
      /* row 4 */    [ R, D, I, D, H, I, D, H ],
      /* row 5 */    [ H, R, C, R, I, H, R, D ],
      /* row 6 */    [ I, H, C, C, D, R, I, H ],
      /* row 7 */    [ H, D, R, C, R, D, H, I ],
      //  row5,6 col2 = 🧁🧁, row7 col3 = 🧁(Line Blast)
      //  스왑: row7,col2(🥐) ↔ row7,col3(🧁LineBlast)
      //  → col2: row5=🧁, row6=🧁, row7=🧁(LineBlast) → 세로 🧁×3 매칭!
      //  → Line Blast 발동 → 가로 한 줄 폭발!
    ];

    for (let row = 0; row < GRID_ROWS; row++) {
      this.grid[row] = [];
      this.specialGrid[row] = [];
      this.tileObjects[row] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        this.grid[row][col] = layout[row][col];
        this.specialGrid[row][col] = null;
        this.tileObjects[row][col] = null;
      }
    }

    // 특수 젬 직접 배치: row7,col3 = 🧁 Line Blast (가로)
    this.specialGrid[7][3] = 'lineBlast';
  }

  private wouldCauseMatch(row: number, col: number, type: TileType): boolean {
    if (col >= 2 && this.grid[row][col - 1] === type && this.grid[row][col - 2] === type) return true;
    if (row >= 2 && this.grid[row - 1]?.[col] === type && this.grid[row - 2]?.[col] === type) return true;
    return false;
  }

  // ─── 타일 그리기 ──────────────────────────────────
  private drawGrid(): void {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const { x, y } = this.getTilePosition(row, col);
        const mod = this.cellModifiers[row][col];

        // 돌 렌더링 (타일 대신)
        if (mod?.type === 'stone') {
          this.renderStone(row, col, x, y, mod.layers);
          continue;
        }

        const tileType = this.grid[row][col];
        if (!tileType) continue;
        const special = this.specialGrid[row][col] ?? undefined;
        // 복구 시: 저장된 lineDirection 사용 / 신규 시: 기본 horizontal
        const savedDir = this.pendingSnap?.lineDirections[row]?.[col];
        const lineDir = special === 'lineBlast'
          ? ((savedDir ?? 'horizontal') as 'horizontal' | 'vertical')
          : undefined;
        this.tileObjects[row][col] = this.createTile(x, y, row, col, tileType, special, lineDir);

        // 얼음/체인 오버레이
        if (mod) this.renderModifierOverlay(row, col, x, y, mod);

        // 타이머 젬 카운트 오버레이
        if (this.timedGemCounters[row]?.[col] != null) {
          this.renderTimedGemOverlay(row, col, x, y);
        }
      }
    }
  }

  // ─── 장애물 렌더링 ────────────────────────────────

  /** 돌 장애물 렌더링 */
  private renderStone(row: number, col: number, x: number, y: number, layers: number): void {
    const visuals: Phaser.GameObjects.GameObject[] = [];
    const r = TILE_DISPLAY_SIZE / 2;

    const g = this.add.graphics();
    g.setDepth(2);
    // 레이어별 색상 (2겹: 어둡고 강함)
    const baseColor = layers >= 2 ? 0x5d4c3f : 0x8d7e73;
    const highlightColor = layers >= 2 ? 0x7d6c5f : 0xa89e93;
    // 그림자
    g.fillStyle(0x3a2a1f, 0.3);
    g.fillCircle(x + 2, y + 3, r);
    // 메인 돌
    g.fillStyle(baseColor, 1);
    g.fillCircle(x, y, r);
    // 상단 하이라이트 (입체감)
    g.fillStyle(highlightColor, 0.4);
    g.fillCircle(x - 6, y - 8, r * 0.65);
    // 테두리
    g.lineStyle(4, 0x4a3a2f, 0.8);
    g.strokeCircle(x, y, r - 2);
    // 균열 패턴 (더 많은 디테일)
    g.lineStyle(2, 0x3a2a1f, 0.25);
    g.lineBetween(x - 25, y - 8, x + 10, y + 5);
    g.lineBetween(x - 5, y - 28, x + 12, y + 18);
    g.lineStyle(1, 0x3a2a1f, 0.15);
    g.lineBetween(x + 15, y - 15, x - 8, y + 25);
    visuals.push(g);

    // 레이어 뱃지 (2겹: 더 눈에 띄게)
    if (layers >= 2) {
      const badgeBg = this.add.graphics().setDepth(3);
      badgeBg.fillStyle(0x3a2a1f, 0.7);
      badgeBg.fillCircle(x, y, 18);
      badgeBg.lineStyle(2, 0xd4c4b0, 0.6);
      badgeBg.strokeCircle(x, y, 18);
      visuals.push(badgeBg);
      const badge = this.add.text(x, y, `${layers}`, {
        fontSize: '28px', color: '#d4c4b0',
        fontFamily: 'Plus Jakarta Sans, sans-serif', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(4);
      visuals.push(badge);
    }

    this.modifierVisuals[row][col] = visuals;
  }

  /** 얼음/체인 오버레이 렌더링 */
  private renderModifierOverlay(row: number, col: number, x: number, y: number, mod: CellModifier): void {
    this.clearModifierVisuals(row, col);
    const visuals: Phaser.GameObjects.GameObject[] = [];
    const r = TILE_DISPLAY_SIZE / 2;

    if (mod.type === 'ice') {
      const g = this.add.graphics();
      g.setDepth(6);
      // 얼음 배경 (레이어별 불투명도)
      const alpha = 0.12 + mod.layers * 0.14;
      g.fillStyle(0xb3e5fc, alpha);
      g.fillCircle(x, y, r + 2);
      // 내부 프로스트 반사광
      g.fillStyle(0xe1f5fe, alpha * 0.5);
      g.fillCircle(x - 8, y - 10, r * 0.5);
      // 다중 테두리 (레이어별 강화)
      g.lineStyle(2 + mod.layers * 2, 0x81d4fa, 0.3 + mod.layers * 0.15);
      g.strokeCircle(x, y, r);
      g.lineStyle(1 + mod.layers, 0xb3e5fc, 0.2 + mod.layers * 0.1);
      g.strokeCircle(x, y, r - 5);
      // 얼음 결정 무늬 (✦ 패턴)
      g.lineStyle(1, 0xffffff, 0.15 + mod.layers * 0.08);
      const cr = r * 0.5;
      g.lineBetween(x - cr, y, x + cr, y);
      g.lineBetween(x, y - cr, x, y + cr);
      g.lineBetween(x - cr * 0.7, y - cr * 0.7, x + cr * 0.7, y + cr * 0.7);
      g.lineBetween(x + cr * 0.7, y - cr * 0.7, x - cr * 0.7, y + cr * 0.7);
      visuals.push(g);
      // 레이어 뱃지 (2겹 이상)
      if (mod.layers >= 2) {
        const lBg = this.add.graphics().setDepth(7);
        lBg.fillStyle(0x0288d1, 0.6);
        lBg.fillCircle(x + r - 14, y - r + 14, 14);
        visuals.push(lBg);
        const layerText = this.add.text(x + r - 14, y - r + 14, `${mod.layers}`, {
          fontSize: '18px', color: '#ffffff',
          fontFamily: 'Plus Jakarta Sans, sans-serif', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(8);
        visuals.push(layerText);
      }
    }

    else if (mod.type === 'chain') {
      const g = this.add.graphics();
      g.setDepth(6);
      // 어두운 오버레이
      g.fillStyle(0x455a64, 0.3);
      g.fillCircle(x, y, r + 2);
      // 금속 테두리 (이중 링)
      g.lineStyle(5, 0x546e7a, 0.8);
      g.strokeCircle(x, y, r);
      g.lineStyle(2, 0x78909c, 0.5);
      g.strokeCircle(x, y, r - 6);
      // 체인 고리 패턴 (여러 개)
      const chainColor = 0x90a4ae;
      const linkSize = 10;
      const linkGap = 22;
      g.lineStyle(3, chainColor, 0.6);
      for (let dx = -linkGap; dx <= linkGap; dx += linkGap) {
        g.strokeCircle(x + dx, y - linkSize, linkSize);
        g.strokeCircle(x + dx, y + linkSize, linkSize);
      }
      visuals.push(g);
      // 자물쇠 아이콘 (하단, 더 눈에 띄게)
      const lockBg = this.add.graphics().setDepth(7);
      lockBg.fillStyle(0x455a64, 0.7);
      lockBg.fillCircle(x, y + r - 14, 14);
      visuals.push(lockBg);
      const lock = this.add.text(x, y + r - 14, '🔒', {
        fontSize: '16px',
      }).setOrigin(0.5).setDepth(8);
      visuals.push(lock);
    }

    this.modifierVisuals[row][col] = visuals;
  }

  /** 장애물 비주얼 제거 */
  private clearModifierVisuals(row: number, col: number): void {
    const vis = this.modifierVisuals[row]?.[col];
    if (vis) {
      for (const v of vis) v.destroy();
      this.modifierVisuals[row][col] = null;
    }
  }

  /** 셀의 얼음 레이어 감소 (매칭 시 호출) */
  private reduceIce(row: number, col: number): void {
    const mod = this.cellModifiers[row]?.[col];
    if (!mod || mod.type !== 'ice') return;
    mod.layers--;
    if (mod.layers <= 0) {
      this.cellModifiers[row][col] = null;
      this.clearModifierVisuals(row, col);
      this.iceCleared++;
      this.updateGoalDisplay();
      // 얼음 깨지는 사운드 + 파티클
      SoundManager.getInstance().playPop(1);
      this.spawnIceBreakEffect(row, col);
    } else {
      // 오버레이 재렌더
      const { x, y } = this.getTilePosition(row, col);
      this.renderModifierOverlay(row, col, x, y, mod);
      this.spawnIceBreakEffect(row, col);
    }
  }

  /** 체인 해제 (인접 매칭 시 호출) */
  private reduceChain(row: number, col: number): void {
    const mod = this.cellModifiers[row]?.[col];
    if (!mod || mod.type !== 'chain') return;
    this.cellModifiers[row][col] = null;
    this.clearModifierVisuals(row, col);
    SoundManager.getInstance().playPop(1);
    this.spawnChainBreakEffect(row, col);
  }

  /** 돌 파괴 (인접 매칭 시 호출) */
  private reduceStone(row: number, col: number): void {
    const mod = this.cellModifiers[row]?.[col];
    if (!mod || mod.type !== 'stone') return;
    if (mod.layers > 1) {
      (mod as { type: 'stone'; layers: 1 | 2 }).layers = (mod.layers - 1) as 1 | 2;
      const { x, y } = this.getTilePosition(row, col);
      this.clearModifierVisuals(row, col);
      this.renderStone(row, col, x, y, mod.layers);
    } else {
      // 완전 파괴 → 빈 셀로 전환 (새 타일 생성 가능)
      this.cellModifiers[row][col] = null;
      this.clearModifierVisuals(row, col);
      this.stoneCleared++;
      this.updateGoalDisplay();
      // 셀이 비었으므로 나중에 dropAndFill에서 채워짐
    }
    SoundManager.getInstance().playPop(2);
    this.spawnStoneBreakEffect(row, col);
  }

  /** 얼음 깨짐 이펙트 */
  private spawnIceBreakEffect(row: number, col: number): void {
    const { x, y } = this.getTilePosition(row, col);
    for (let i = 0; i < 6; i++) {
      const shard = this.add.graphics().setDepth(16);
      shard.fillStyle(0xb3e5fc, 0.8);
      shard.fillRect(-4, -4, 8 + Math.random() * 6, 8 + Math.random() * 6);
      shard.setPosition(x, y);
      const angle = (Math.PI * 2 / 6) * i;
      this.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * (40 + Math.random() * 30),
        y: y + Math.sin(angle) * (40 + Math.random() * 30),
        alpha: 0, rotation: Math.random() * 3,
        duration: 350, ease: 'Cubic.easeOut',
        onComplete: () => shard.destroy(),
      });
    }
  }

  /** 체인 해제 이펙트 */
  private spawnChainBreakEffect(row: number, col: number): void {
    const { x, y } = this.getTilePosition(row, col);
    const flash = this.add.graphics().setDepth(16);
    flash.fillStyle(0xffd600, 0.6);
    flash.fillCircle(x, y, TILE_DISPLAY_SIZE / 2);
    this.tweens.add({
      targets: flash, alpha: 0, scaleX: 1.5, scaleY: 1.5,
      duration: 300, ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  /** 돌 파괴 이펙트 */
  private spawnStoneBreakEffect(row: number, col: number): void {
    const { x, y } = this.getTilePosition(row, col);
    for (let i = 0; i < 8; i++) {
      const debris = this.add.graphics().setDepth(16);
      debris.fillStyle(i % 2 === 0 ? 0x6d5c4f : 0x8d7e73, 1);
      debris.fillRect(-3, -3, 6 + Math.random() * 5, 6 + Math.random() * 5);
      debris.setPosition(x, y);
      const angle = (Math.PI * 2 / 8) * i;
      this.tweens.add({
        targets: debris,
        x: x + Math.cos(angle) * (50 + Math.random() * 40),
        y: y + Math.sin(angle) * (50 + Math.random() * 40) - 20,
        alpha: 0, rotation: Math.random() * 4,
        duration: 400, ease: 'Cubic.easeOut',
        onComplete: () => debris.destroy(),
      });
    }
    this.cameras.main.shake(80, 0.001);
  }

  /** 매칭된 셀 기반 장애물 처리 */
  private processBlockers(matchedCells: { row: number; col: number }[]): void {
    const processed = new Set<string>();

    for (const { row, col } of matchedCells) {
      // 매칭된 셀의 얼음 제거
      if (this.cellModifiers[row]?.[col]?.type === 'ice') {
        this.reduceIce(row, col);
      }

      // 인접 셀의 체인/돌 처리
      const neighbors = [
        { row: row - 1, col }, { row: row + 1, col },
        { row, col: col - 1 }, { row, col: col + 1 },
      ];
      for (const n of neighbors) {
        if (n.row < 0 || n.row >= GRID_ROWS || n.col < 0 || n.col >= GRID_COLS) continue;
        const key = `${n.row},${n.col}`;
        if (processed.has(key)) continue;
        processed.add(key);

        const nMod = this.cellModifiers[n.row]?.[n.col];
        if (nMod?.type === 'chain') this.reduceChain(n.row, n.col);
        if (nMod?.type === 'stone') this.reduceStone(n.row, n.col);
      }
    }
  }

  /** 돌 셀인지 체크 (타일 배치 불가 영역) */
  private isStoneCell(row: number, col: number): boolean {
    return this.cellModifiers[row]?.[col]?.type === 'stone';
  }

  private getTilePosition(row: number, col: number): { x: number; y: number } {
    return {
      x: BOARD_OFFSET_X + col * TILE_TOTAL,
      y: BOARD_OFFSET_Y + row * TILE_TOTAL,
    };
  }

  /** 디버그: 스왑 힌트 위치 (빨간 테두리로 강조) */
  private readonly debugHints: Set<string> = new Set([
    '7,2', '7,3',  // row7,col2(🥐) ↔ row7,col3(🧁LineBlast) → col2 세로 🧁×3 → Line Blast 발동!
  ]);

  private createTile(x: number, y: number, row: number, col: number, type: TileType, special?: SpecialType, lineDir?: 'horizontal' | 'vertical'): TileData {
    const container = this.add.container(x, y);
    const radius = TILE_DISPLAY_SIZE / 2;

    const bg = this.add.graphics();
    // 디버그: 힌트 타일은 노란 배경
    const isHint = DEBUG_GRID && this.debugHints.has(`${row},${col}`);
    bg.fillStyle(isHint ? 0xfff176 : TILE_BG_COLOR, 1);
    bg.fillCircle(0, 0, radius);
    if (isHint) {
      bg.lineStyle(5, 0xf48fb1, 1);
      bg.strokeCircle(0, 0, radius);
    }
    container.add(bg);

    // 타일 이미지 스프라이트
    const icon = this.add.image(0, 0, type);
    const imgScale = (TILE_DISPLAY_SIZE - 16) / Math.max(icon.width, icon.height);
    icon.setScale(imgScale);
    container.add(icon);

    // 특수 젬: 아이들 글로우/쉬머 FX + 글로우 언더레이
    if (special) {
      this.addSpecialGlowUnderlay(container, special);
      this.addSpecialOverlay(container, special, lineDir);
      this.applySpecialIdleFX(icon, special);
    }

    container.setSize(TILE_DISPLAY_SIZE, TILE_DISPLAY_SIZE);
    container.setInteractive();

    const tileData: TileData = { container, row, col, type, special, lineDirection: lineDir };
    container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.onTilePointerDown(tileData.row, tileData.col, pointer.x, pointer.y);
    });

    return tileData;
  }

  private addSpecialOverlay(container: Phaser.GameObjects.Container, special: SpecialType, lineDir?: 'horizontal' | 'vertical'): void {
    const r = TILE_DISPLAY_SIZE / 2;
    const g = this.add.graphics();

    switch (special) {
      case 'lineBlast': {
        // 로즈핑크 글로우 링
        g.fillStyle(0xffb7c5, 0.2);
        g.fillCircle(0, 0, r);
        g.lineStyle(6, 0xffb7c5, 0.9);
        g.strokeCircle(0, 0, r - 2);
        // 내부 화살표 (Graphics로 그리기)
        const arrowG = this.add.graphics();
        arrowG.lineStyle(5, 0xffffff, 0.9);
        if (lineDir === 'vertical') {
          arrowG.lineBetween(0, -r + 16, 0, r - 16);
          // 위쪽 화살촉
          arrowG.lineBetween(0, -r + 16, -8, -r + 28);
          arrowG.lineBetween(0, -r + 16, 8, -r + 28);
          // 아래쪽 화살촉
          arrowG.lineBetween(0, r - 16, -8, r - 28);
          arrowG.lineBetween(0, r - 16, 8, r - 28);
        } else {
          arrowG.lineBetween(-r + 16, 0, r - 16, 0);
          arrowG.lineBetween(-r + 16, 0, -r + 28, -8);
          arrowG.lineBetween(-r + 16, 0, -r + 28, 8);
          arrowG.lineBetween(r - 16, 0, r - 28, -8);
          arrowG.lineBetween(r - 16, 0, r - 28, 8);
        }
        container.addAt(g, 1);
        container.add(arrowG);
        break;
      }
      case 'bomb': {
        // 소프트 핑크 글로우
        g.fillStyle(0xf48fb1, 0.2);
        g.fillCircle(0, 0, r);
        g.lineStyle(6, 0xf48fb1, 0.9);
        g.strokeCircle(0, 0, r - 2);
        // 동심원 충격파 패턴
        g.lineStyle(3, 0xf8bbd0, 0.35);
        g.strokeCircle(0, 0, r * 0.6);
        g.lineStyle(2, 0xf8bbd0, 0.2);
        g.strokeCircle(0, 0, r * 0.35);
        // 중앙 도트
        g.fillStyle(0xf8bbd0, 0.5);
        g.fillCircle(0, 0, 6);
        container.addAt(g, 1);
        break;
      }
      case 'colorBomb': {
        // 금색 글로우
        g.fillStyle(0xffd700, 0.3);
        g.fillCircle(0, 0, r);
        g.lineStyle(6, 0xffd700, 1);
        g.strokeCircle(0, 0, r - 2);
        // 무지개 내부 링
        g.lineStyle(3, 0xff69b4, 0.6);
        g.strokeCircle(0, 0, r - 12);
        // 별 광선 (8방향)
        const rayG = this.add.graphics();
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI / 4) * i;
          const inner = 12;
          const outer = r - 18;
          rayG.lineStyle(2, 0xffe5a0, 0.4);
          rayG.lineBetween(
            Math.cos(angle) * inner, Math.sin(angle) * inner,
            Math.cos(angle) * outer, Math.sin(angle) * outer,
          );
        }
        container.addAt(g, 1);
        container.add(rayG);
        break;
      }
      case 'crossBlast': {
        // 라벤더 글로우
        g.fillStyle(0xd1a3ff, 0.2);
        g.fillCircle(0, 0, r);
        g.lineStyle(6, 0xd1a3ff, 0.9);
        g.strokeCircle(0, 0, r - 2);
        // 십자 패턴 (두꺼운 + 얇은 이중선)
        g.lineStyle(6, 0xe8d5f5, 0.7);
        g.lineBetween(-r + 12, 0, r - 12, 0);
        g.lineBetween(0, -r + 12, 0, r - 12);
        g.lineStyle(2, 0xf3e5f5, 0.35);
        g.lineBetween(-r + 14, 0, r - 14, 0);
        g.lineBetween(0, -r + 14, 0, r - 14);
        // 중앙 다이아몬드
        g.fillStyle(0xf3e5f5, 0.4);
        g.fillRect(-5, -5, 10, 10);
        container.addAt(g, 1);
        break;
      }
      case 'wrapped': {
        // 민트 글로우
        g.fillStyle(0xa8e6cf, 0.2);
        g.fillCircle(0, 0, r);
        g.lineStyle(6, 0xa8e6cf, 0.9);
        g.strokeCircle(0, 0, r - 2);
        // 리본 X 패턴 (이중선)
        g.lineStyle(6, 0xdcedc8, 0.7);
        g.lineBetween(-r + 16, -r + 16, r - 16, r - 16);
        g.lineBetween(r - 16, -r + 16, -r + 16, r - 16);
        g.lineStyle(2, 0xe0f5ec, 0.3);
        g.lineBetween(-r + 18, -r + 18, r - 18, r - 18);
        g.lineBetween(r - 18, -r + 18, -r + 18, r - 18);
        // 중앙 매듭
        g.fillStyle(0xe0f5ec, 0.45);
        g.fillCircle(0, 0, 7);
        container.addAt(g, 1);
        break;
      }
    }
  }

  /** 특수 젬 글로우 언더레이 — Graphics 기반 circle glow (Android 안전) */
  private addSpecialGlowUnderlay(container: Phaser.GameObjects.Container, special: SpecialType): void {
    const glowColorMap: Record<SpecialType, number> = {
      lineBlast: 0xffb7c5,
      bomb: 0xf48fb1,
      colorBomb: 0xffd700,
      crossBlast: 0xd1a3ff,
      wrapped: 0xa8e6cf,
    };
    const color = glowColorMap[special];
    const r = TILE_DISPLAY_SIZE / 2;

    // SCREEN/ADD blendMode 대신 Graphics 동심원으로 소프트 글로우 표현
    const glow = this.add.graphics();
    glow.fillStyle(color, 0.18);
    glow.fillCircle(0, 0, r + 8);
    glow.fillStyle(color, 0.10);
    glow.fillCircle(0, 0, r + 16);
    container.addAt(glow, 0); // 배경 뒤에

    // 맥동 애니메이션 (alpha 범위를 좁게 — 배경처럼 보이지 않도록)
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.6, to: 1.0 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** 특수 젬 아이콘 아이들 FX — preFX를 사용하지 않고 tween만으로 처리 (Android 안전) */
  private applySpecialIdleFX(icon: Phaser.GameObjects.Image, special: SpecialType): void {
    // preFX (addGlow / addShine 등)는 Android WebGL에서 렌더링이 깨지는 경우가 있어 제거.
    // 대신 tween 기반의 경량 아이들 애니메이션만 적용한다.
    switch (special) {
      case 'colorBomb': {
        // 천천한 자전 회전 (소용돌이 암시)
        this.tweens.add({
          targets: icon,
          angle: { from: -3, to: 3 },
          duration: 2500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        break;
      }
      case 'wrapped': {
        // 리본 매듭 호흡감 (스케일 미세 변화)
        this.tweens.add({
          targets: icon,
          scaleX: icon.scaleX * 1.04,
          scaleY: icon.scaleY * 1.04,
          duration: 2000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        break;
      }
      default:
        // lineBlast / bomb / crossBlast: 언더레이 맥동만으로 충분
        break;
    }
  }

  // ─── P-2: 타일 선택 & 스왑 ────────────────────────
  private onTilePointerDown(row: number, col: number, px: number, py: number): void {
    if (this.isAnimating || this.isPaused) return;

    // 라이트닝 부스터 모드: 탭한 타일 파괴
    if (this.lightningMode) {
      if (this.grid[row][col]) {
        this.activateLightning(row, col);
      }
      return;
    }

    // 드래그 시작 기록
    this.dragStart = { row, col, x: px, y: py };

    // 기존 선택이 있고 인접 타일이면 바로 스왑 (탭 방식)
    if (this.selectedTile) {
      if (this.selectedTile.row === row && this.selectedTile.col === col) {
        this.clearSelection();
        this.dragStart = null;
        return;
      }
      if (this.isAdjacent(this.selectedTile.row, this.selectedTile.col, row, col)) {
        const fromRow = this.selectedTile.row;
        const fromCol = this.selectedTile.col;
        this.clearSelection();
        this.dragStart = null;
        this.trySwap(fromRow, fromCol, row, col);
        return;
      }
      // 인접하지 않은 타일 → 새로 선택
      this.clearSelection();
    }

    // 선택 표시
    this.selectedTile = { row, col };
    this.showSelectionGlow(row, col);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.isAnimating || !this.dragStart || !pointer.isDown) return;

    const dx = pointer.x - this.dragStart.x;
    const dy = pointer.y - this.dragStart.y;
    const threshold = TILE_TOTAL * 0.35; // 드래그 감지 임계값

    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

    // 드래그 방향 결정 (가로 vs 세로)
    let targetRow = this.dragStart.row;
    let targetCol = this.dragStart.col;

    if (Math.abs(dx) > Math.abs(dy)) {
      targetCol += dx > 0 ? 1 : -1;
    } else {
      targetRow += dy > 0 ? 1 : -1;
    }

    // 범위 체크
    if (targetRow < 0 || targetRow >= GRID_ROWS || targetCol < 0 || targetCol >= GRID_COLS) {
      this.dragStart = null;
      return;
    }

    // 타일 존재 체크 (빈 셀 드래그 방지)
    if (!this.grid[targetRow]?.[targetCol]) {
      this.dragStart = null;
      return;
    }

    const fromRow = this.dragStart.row;
    const fromCol = this.dragStart.col;
    this.clearSelection();
    this.dragStart = null;
    this.trySwap(fromRow, fromCol, targetRow, targetCol);
  }

  private onPointerUp(): void {
    this.dragStart = null;
  }

  private isAdjacent(r1: number, c1: number, r2: number, c2: number): boolean {
    return (Math.abs(r1 - r2) + Math.abs(c1 - c2)) === 1;
  }

  private showSelectionGlow(row: number, col: number): void {
    this.clearSelectionGlow();
    const { x, y } = this.getTilePosition(row, col);
    this.selectionGlow = this.add.graphics();
    this.selectionGlow.lineStyle(5, 0xffd1dc, 0.6);
    this.selectionGlow.strokeCircle(x, y, TILE_DISPLAY_SIZE / 2 + 4);
    this.selectionGlow.fillStyle(0xffd1dc, 0.1);
    this.selectionGlow.fillCircle(x, y, TILE_DISPLAY_SIZE / 2 + 4);
    this.selectionGlow.setDepth(5);

    // 선택 애니메이션 (살짝 커졌다 돌아오기)
    const tile = this.tileObjects[row][col];
    if (tile) {
      this.tweens.add({
        targets: tile.container,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 150,
        ease: 'Back.easeOut',
      });

      // PostFX Glow 제거 — Android WebGL FBO 자글거림 방지
    }
  }

  private clearSelectionGlow(): void {
    if (this.selectionGlow) {
      this.selectionGlow.destroy();
      this.selectionGlow = null;
    }
  }

  private clearSelection(): void {
    if (this.selectedTile) {
      const tile = this.tileObjects[this.selectedTile.row][this.selectedTile.col];
      if (tile) {
        this.tweens.add({
          targets: tile.container,
          scaleX: 1,
          scaleY: 1,
          duration: 100,
          ease: 'Sine.easeOut',
        });
        // PostFX Glow 제거 — Android WebGL FBO 자글거림 방지 (clearSelection)
      }
    }
    this.clearSelectionGlow();
    this.selectedTile = null;
  }

  // ─── 스왑 실행 ────────────────────────────────────
  private trySwap(r1: number, c1: number, r2: number, c2: number): void {
    if (this.gameOver) return;
    // 체인 잠금 체크: 체인된 타일은 스왑 불가
    if (this.cellModifiers[r1]?.[c1]?.type === 'chain' || this.cellModifiers[r2]?.[c2]?.type === 'chain') {
      SoundManager.getInstance().playInvalidSwap();
      this.isAnimating = false;
      return;
    }
    this.isAnimating = true;
    this.timedGemDecrementPending = true; // 무브 후 타이머 젬 감소 예약
    SoundManager.getInstance().playSwap();
    this.swapGridData(r1, c1, r2, c2);

    // 특수 젬 + 특수 젬 조합 체크
    const s1 = this.specialGrid[r1][c1];
    const s2 = this.specialGrid[r2][c2];
    if (s1 && s2) {
      this.animateSwap(r1, c1, r2, c2, () => {
        this.movesLeft--;
        this.updateMovesDisplay();
        this.cascadeDepth = 0;
        this.handleSpecialCombo(r1, c1, s1, r2, c2, s2);
      });
      return;
    }

    // 컬러밤 직접 발동 (매칭 불필요)
    if (s1 === 'colorBomb' || s2 === 'colorBomb') {
      this.animateSwap(r1, c1, r2, c2, () => {
        this.movesLeft--;
        this.updateMovesDisplay();
        this.cascadeDepth = 0;
        const bombPos = s1 === 'colorBomb' ? { row: r1, col: c1 } : { row: r2, col: c2 };
        const targetPos = s1 === 'colorBomb' ? { row: r2, col: c2 } : { row: r1, col: c1 };
        const targetType = this.grid[targetPos.row][targetPos.col];
        const cells = this.getActivationCells(bombPos.row, bombPos.col, 'colorBomb', targetType);
        cells.push(bombPos);
        const expanded = this.expandActivations(cells);
        this.cascadeDepth++;
        this.calculateScore(expanded);
        this.trackGoal(expanded);
        this.processBlockers(expanded);
        this.animateRemoval(expanded, () => {
          for (const c of expanded) {
            this.grid[c.row][c.col] = null;
            this.specialGrid[c.row][c.col] = null;
            if (this.tileObjects[c.row][c.col]) {
              this.tileObjects[c.row][c.col] = null;
            }
          }
          this.dropAndFill(() => {
            const newGroups = this.findAllMatchGroups();
            if (newGroups.length > 0) {
              this.processMatchGroups(newGroups);
            } else {
              this.onCascadeSettled();
            }
          });
        });
      });
      return;
    }

    // 일반 매칭 확인
    const groups = this.findAllMatchGroups({ row: r1, col: c1 });
    this.animateSwap(r1, c1, r2, c2, () => {
      if (groups.length > 0) {
        this.movesLeft--;
        this.tutorialMovesDone++;
        this.updateMovesDisplay();
        this.cascadeDepth = 0;
        // 튜토리얼 트리거
        if (!this.tutorialFirstMatchDone) {
          this.tutorialFirstMatchDone = true;
          this.time.delayedCall(600, () => this.advanceTutorial('afterFirstMatch'));
        }
        if (this.tutorial) this.advanceTutorial('onMovesMade');
        this.processMatchGroups(groups);
      } else {
        SoundManager.getInstance().playInvalidSwap();
        this.swapGridData(r1, c1, r2, c2);
        this.animateSwap(r1, c1, r2, c2, () => {
          this.isAnimating = false;
        });
      }
    });
  }

  private swapGridData(r1: number, c1: number, r2: number, c2: number): void {
    // 타입 스왑
    const tempType = this.grid[r1][c1];
    this.grid[r1][c1] = this.grid[r2][c2];
    this.grid[r2][c2] = tempType;

    // 특수 스왑
    const tempSpecial = this.specialGrid[r1][c1];
    this.specialGrid[r1][c1] = this.specialGrid[r2][c2];
    this.specialGrid[r2][c2] = tempSpecial;

    // 오브젝트 스왑
    const tempObj = this.tileObjects[r1][c1];
    this.tileObjects[r1][c1] = this.tileObjects[r2][c2];
    this.tileObjects[r2][c2] = tempObj;

    // row/col 업데이트
    if (this.tileObjects[r1][c1]) {
      this.tileObjects[r1][c1]!.row = r1;
      this.tileObjects[r1][c1]!.col = c1;
    }
    if (this.tileObjects[r2][c2]) {
      this.tileObjects[r2][c2]!.row = r2;
      this.tileObjects[r2][c2]!.col = c2;
    }
  }

  private animateSwap(r1: number, c1: number, r2: number, c2: number, onComplete: () => void): void {
    const tile1 = this.tileObjects[r1][c1];
    const tile2 = this.tileObjects[r2][c2];
    const pos1 = this.getTilePosition(r1, c1);
    const pos2 = this.getTilePosition(r2, c2);

    let completed = 0;
    const checkDone = () => {
      completed++;
      if (completed === 2) onComplete();
    };

    if (tile1) {
      this.tweens.add({
        targets: tile1.container,
        x: pos1.x, y: pos1.y,
        duration: SWAP_DURATION,
        ease: 'Sine.easeInOut',
        onComplete: checkDone,
      });
    }
    if (tile2) {
      this.tweens.add({
        targets: tile2.container,
        x: pos2.x, y: pos2.y,
        duration: SWAP_DURATION,
        ease: 'Sine.easeInOut',
        onComplete: checkDone,
      });
    }
  }

  // ─── P-3: 매칭 감지 ──────────────────────────────

  /** 하위 호환용 — hasValidMove, shuffleBoard에서 사용 */
  private findAllMatches(): { row: number; col: number }[] {
    const groups = this.findAllMatchGroups();
    const set = new Set<string>();
    for (const g of groups) {
      for (const c of g.cells) set.add(`${c.row},${c.col}`);
    }
    return Array.from(set).map(k => {
      const [row, col] = k.split(',').map(Number);
      return { row, col };
    });
  }

  /** 구조화된 매칭 감지 — 패턴별 분류 */
  private findAllMatchGroups(swapPos?: { row: number; col: number }): MatchGroup[] {
    // Phase A: 모든 run 찾기
    const runs: MatchRun[] = [];

    // 가로 run
    for (let row = 0; row < GRID_ROWS; row++) {
      let col = 0;
      while (col < GRID_COLS) {
        const type = this.grid[row][col];
        if (!type) { col++; continue; }
        let end = col;
        while (end + 1 < GRID_COLS && this.grid[row][end + 1] === type) end++;
        if (end - col >= 2) {
          const cells = [];
          for (let c = col; c <= end; c++) cells.push({ row, col: c });
          runs.push({ cells, direction: 'horizontal', type });
        }
        col = end + 1;
      }
    }

    // 세로 run
    for (let col = 0; col < GRID_COLS; col++) {
      let row = 0;
      while (row < GRID_ROWS) {
        const type = this.grid[row][col];
        if (!type) { row++; continue; }
        let end = row;
        while (end + 1 < GRID_ROWS && this.grid[end + 1]?.[col] === type) end++;
        if (end - row >= 2) {
          const cells = [];
          for (let r = row; r <= end; r++) cells.push({ row: r, col });
          runs.push({ cells, direction: 'vertical', type });
        }
        row = end + 1;
      }
    }

    if (runs.length === 0) return [];

    // Phase B: run들을 교차점 기준으로 그룹화 + 패턴 분류
    const used = new Set<number>();
    const groups: MatchGroup[] = [];

    // 교차하는 run 쌍 찾기
    for (let i = 0; i < runs.length; i++) {
      for (let j = i + 1; j < runs.length; j++) {
        if (runs[i].type !== runs[j].type) continue;
        if (runs[i].direction === runs[j].direction) continue;
        // 교차점 확인
        const overlap = runs[i].cells.find(a =>
          runs[j].cells.some(b => a.row === b.row && a.col === b.col)
        );
        if (overlap) {
          // L/T형 매칭 (두 run이 교차)
          const allCells = new Map<string, { row: number; col: number }>();
          for (const c of runs[i].cells) allCells.set(`${c.row},${c.col}`, c);
          for (const c of runs[j].cells) allCells.set(`${c.row},${c.col}`, c);
          const cells = Array.from(allCells.values());

          // 5매치 이상이면 colorBomb 우선
          if (runs[i].cells.length >= 5 || runs[j].cells.length >= 5) {
            const longerRun = runs[i].cells.length >= runs[j].cells.length ? runs[i] : runs[j];
            groups.push({
              cells,
              pattern: 'match5plus',
              type: runs[i].type,
              direction: longerRun.direction,
              spawnCell: swapPos && cells.some(c => c.row === swapPos.row && c.col === swapPos.col)
                ? swapPos : overlap,
            });
          } else {
            // 교차점이 양쪽 run의 끝이 아닌 중앙에 있으면 십자(+) 패턴 → crossBlast
            const runA = runs[i];
            const runB = runs[j];
            const idxA = runA.cells.findIndex(c => c.row === overlap.row && c.col === overlap.col);
            const idxB = runB.cells.findIndex(c => c.row === overlap.row && c.col === overlap.col);
            const isCross = idxA > 0 && idxA < runA.cells.length - 1 &&
                            idxB > 0 && idxB < runB.cells.length - 1;

            let pattern: MatchGroup['pattern'];
            if (isCross) {
              pattern = 'cross';
            } else if (runs[i].cells.length >= 4 || runs[j].cells.length >= 4) {
              pattern = 'T_shape';
            } else {
              pattern = 'L_shape';
            }
            groups.push({
              cells,
              pattern,
              type: runs[i].type,
              spawnCell: swapPos && cells.some(c => c.row === swapPos.row && c.col === swapPos.col)
                ? swapPos : overlap,
            });
          }
          used.add(i);
          used.add(j);
        }
      }
    }

    // 교차되지 않은 단독 run 처리
    for (let i = 0; i < runs.length; i++) {
      if (used.has(i)) continue;
      const run = runs[i];
      let pattern: MatchGroup['pattern'] = 'match3';
      if (run.cells.length >= 5) pattern = 'match5plus';
      else if (run.cells.length === 4) pattern = 'match4';

      const midIdx = Math.floor(run.cells.length / 2);
      groups.push({
        cells: run.cells,
        pattern,
        type: run.type,
        direction: run.direction,
        spawnCell: swapPos && run.cells.some(c => c.row === swapPos.row && c.col === swapPos.col)
          ? swapPos : run.cells[midIdx],
      });
    }

    // Phase C: 2×2 정사각형 감지 → Wrapped Gem
    const usedInSpecialGroups = new Set<string>();
    for (const g of groups) {
      if (g.pattern !== 'match3') {
        for (const c of g.cells) usedInSpecialGroups.add(`${c.row},${c.col}`);
      }
    }

    for (let row = 0; row < GRID_ROWS - 1; row++) {
      for (let col = 0; col < GRID_COLS - 1; col++) {
        const type = this.grid[row][col];
        if (!type) continue;
        if (this.grid[row][col + 1] !== type) continue;
        if (this.grid[row + 1]?.[col] !== type) continue;
        if (this.grid[row + 1]?.[col + 1] !== type) continue;

        const squareCells = [
          { row, col }, { row, col: col + 1 },
          { row: row + 1, col }, { row: row + 1, col: col + 1 },
        ];

        // 이미 특수 젬 생성 그룹에 4셀 전부 포함되면 스킵
        const allInSpecial = squareCells.every(c => usedInSpecialGroups.has(`${c.row},${c.col}`));
        if (allInSpecial) continue;

        const spawnCell = (swapPos && squareCells.some(c => c.row === swapPos.row && c.col === swapPos.col))
          ? swapPos : squareCells[0];

        groups.push({
          cells: squareCells,
          pattern: 'square',
          type,
          spawnCell,
        });

        // 셀 마킹
        for (const c of squareCells) usedInSpecialGroups.add(`${c.row},${c.col}`);
      }
    }

    return groups;
  }

  // ─── P-4: 매칭 제거 + 낙하 + 채우기 ──────────────

  private processMatchGroups(groups: MatchGroup[]): void {
    this.cascadeDepth++;
    const sound = SoundManager.getInstance();
    sound.playPop(this.cascadeDepth);
    if (this.cascadeDepth > 1) sound.playCascade(this.cascadeDepth);

    // 콤보 콜아웃 (연쇄 2회 이상)
    if (this.cascadeDepth >= 2) {
      this.showComboCallout(this.cascadeDepth);
    }
    // 콤보 3+ 카메라 미세 shake
    if (this.cascadeDepth >= 3) {
      this.shakeCamera(60 + this.cascadeDepth * 10, this.cascadeDepth * 0.0002);
    }

    // 전체 셀 수집
    const allCellSet = new Set<string>();
    for (const g of groups) {
      for (const c of g.cells) allCellSet.add(`${c.row},${c.col}`);
    }

    // 특수 젬 생성 목록 (우선순위: colorBomb > crossBlast > bomb > wrapped > lineBlast)
    const spawns: { row: number; col: number; type: TileType; special: SpecialType; lineDir?: 'horizontal' | 'vertical' }[] = [];
    for (const g of groups) {
      if (g.pattern === 'match5plus') {
        spawns.push({ ...g.spawnCell, type: g.type, special: 'colorBomb' });
      } else if (g.pattern === 'cross') {
        spawns.push({ ...g.spawnCell, type: g.type, special: 'crossBlast' });
      } else if (g.pattern === 'L_shape' || g.pattern === 'T_shape') {
        spawns.push({ ...g.spawnCell, type: g.type, special: 'bomb' });
      } else if (g.pattern === 'square') {
        spawns.push({ ...g.spawnCell, type: g.type, special: 'wrapped' });
      } else if (g.pattern === 'match4') {
        spawns.push({ ...g.spawnCell, type: g.type, special: 'lineBlast', lineDir: g.direction });
      }
    }
    // 매칭에 포함된 기존 특수 젬 발동
    const activationCells: { row: number; col: number }[] = [];
    for (const key of allCellSet) {
      const [r, c] = key.split(',').map(Number);
      const sp = this.specialGrid[r][c];
      if (sp && !spawns.some(s => s.row === r && s.col === c)) {
        const targetType = this.grid[r][c];
        const effect = this.getActivationCells(r, c, sp, targetType);
        activationCells.push(...effect);
        // 특수 젬 발동 시각 효과
        const tile = this.tileObjects[r][c];
        this.playSpecialActivationEffect(r, c, sp, tile?.lineDirection);
      }
    }

    // 발동 효과 셀 추가
    for (const c of activationCells) allCellSet.add(`${c.row},${c.col}`);

    // 연쇄 발동 (특수 젬이 또 다른 특수 젬 터뜨리기)
    const allCells = this.expandActivations(
      Array.from(allCellSet).map(k => {
        const [row, col] = k.split(',').map(Number);
        return { row, col };
      })
    );

    // 스폰 셀은 제거 대상에서 제외
    const spawnKeys = new Set(spawns.map(s => `${s.row},${s.col}`));
    const removeCells = allCells.filter(c => !spawnKeys.has(`${c.row},${c.col}`));

    // 장애물 처리: 매칭된 셀의 얼음 + 인접 셀의 체인/돌
    this.processBlockers(allCells);

    // 점수 + 목표
    this.calculateScore(allCells);
    this.trackGoal(allCells);

    // 제거 애니메이션
    this.animateRemoval(removeCells, () => {
      // 데이터 제거
      for (const { row, col } of removeCells) {
        this.grid[row][col] = null;
        this.specialGrid[row][col] = null;
        this.tileObjects[row][col] = null;
      }

      // 특수 젬 생성
      if (spawns.length > 0) {
        SoundManager.getInstance().playSpecialCreate();
        this.advanceTutorial('afterSpecialCreate');
      }
      for (const s of spawns) {
        const old = this.tileObjects[s.row][s.col];
        if (old) old.container.destroy();
        this.grid[s.row][s.col] = s.type;
        this.specialGrid[s.row][s.col] = s.special;
        const pos = this.getTilePosition(s.row, s.col);
        this.tileObjects[s.row][s.col] = this.createTile(pos.x, pos.y, s.row, s.col, s.type, s.special, s.lineDir);
        const tile = this.tileObjects[s.row][s.col]!;
        tile.container.setScale(0);
        this.tweens.add({
          targets: tile.container,
          scaleX: 1, scaleY: 1,
          duration: 300,
          ease: 'Back.easeOut',
        });
      }

      // 낙하 + 채우기
      this.dropAndFill(() => {
        const newGroups = this.findAllMatchGroups();
        if (newGroups.length > 0) {
          this.processMatchGroups(newGroups);
        } else {
          this.onCascadeSettled();
        }
      });
    });
  }

  private animateRemoval(matches: { row: number; col: number }[], onComplete: () => void): void {
    if (matches.length === 0) { onComplete(); return; }

    // 1단계: 매칭된 타일에 하이라이트 플래시
    const validTiles: { row: number; col: number; tileData: TileData }[] = [];
    for (const { row, col } of matches) {
      const tileData = this.tileObjects[row][col];
      if (tileData) validTiles.push({ row, col, tileData });
    }

    if (validTiles.length === 0) { onComplete(); return; }

    // 하이라이트: 타일 흰색 플래시
    for (const { tileData } of validTiles) {
      const flash = this.add.graphics();
      flash.fillStyle(0xfff0f5, 0.35);
      flash.fillCircle(0, 0, TILE_DISPLAY_SIZE / 2);
      tileData.container.add(flash);
      this.tweens.add({
        targets: flash,
        alpha: 0,
        duration: HIGHLIGHT_DURATION,
        ease: 'Sine.easeOut',
      });
      // 약간 커졌다 돌아오기
      this.tweens.add({
        targets: tileData.container,
        scaleX: 1.15,
        scaleY: 1.15,
        duration: HIGHLIGHT_DURATION / 2,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
    }

    // 카메라 Bloom 플래시 제거 — Android WebGL FBO 자글거림 방지

    // 2단계: 스태거 제거 (하이라이트 후)
    this.time.delayedCall(HIGHLIGHT_DURATION, () => {
      let completed = 0;
      const total = validTiles.length;
      const missing = matches.length - validTiles.length;

      // 중심 좌표 계산 (웨이브 정렬용)
      let cx = 0, cy = 0;
      for (const { tileData } of validTiles) {
        cx += tileData.container.x;
        cy += tileData.container.y;
      }
      cx /= validTiles.length;
      cy /= validTiles.length;

      // 중심에서 가까운 순으로 정렬 (안→밖 웨이브)
      validTiles.sort((a, b) => {
        const da = Math.abs(a.tileData.container.x - cx) + Math.abs(a.tileData.container.y - cy);
        const db = Math.abs(b.tileData.container.x - cx) + Math.abs(b.tileData.container.y - cy);
        return da - db;
      });

      validTiles.forEach(({ tileData }, index) => {
        const delay = index * STAGGER_DELAY;

        this.time.delayedCall(delay, () => {
          // 파티클 버스트
          this.spawnParticleBurst(tileData.container.x, tileData.container.y, tileData.type);

          this.tweens.add({
            targets: tileData.container,
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            angle: Phaser.Math.Between(-25, 25),
            duration: REMOVE_DURATION,
            ease: 'Back.easeIn',
            onComplete: () => {
              tileData.container.destroy();
              completed++;
              if (completed + missing >= matches.length) onComplete();
            },
          });
        });
      });

      // 타일 데이터가 없는 경우 바로 완료 처리
      if (validTiles.length === 0) onComplete();
    });
  }

  // ─── Phase 3: 빠른 매칭 체크 (성능 최적화) ────────

  /** 특정 위치에서 3연속 매칭이 있는지 빠르게 체크 */
  private hasMatchAt(row: number, col: number): boolean {
    const type = this.grid[row]?.[col];
    if (!type) return false;

    // 가로 체크
    let hCount = 1;
    for (let c = col - 1; c >= 0 && this.grid[row][c] === type; c--) hCount++;
    for (let c = col + 1; c < GRID_COLS && this.grid[row][c] === type; c++) hCount++;
    if (hCount >= 3) return true;

    // 세로 체크
    let vCount = 1;
    for (let r = row - 1; r >= 0 && this.grid[r]?.[col] === type; r--) vCount++;
    for (let r = row + 1; r < GRID_ROWS && this.grid[r]?.[col] === type; r++) vCount++;
    return vCount >= 3;
  }

  /** 스왑 후 매칭 가능 여부만 boolean으로 빠르게 확인 */
  private hasMatchAtSwap(r1: number, c1: number, r2: number, c2: number): boolean {
    this.swapGridDataOnly(r1, c1, r2, c2);
    const has = this.hasMatchAt(r1, c1) || this.hasMatchAt(r2, c2);
    this.swapGridDataOnly(r1, c1, r2, c2);
    return has;
  }

  // ─── Phase 2: 보드 등장 & 콤보 콜아웃 ─────────────

  /** 레벨 시작 시 타일 낙하 등장 애니메이션 */
  private animateBoardEntry(): void {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const tile = this.tileObjects[row][col];
        if (!tile) continue;
        const targetY = tile.container.y;
        tile.container.y = BOARD_OFFSET_Y - TILE_TOTAL * 2;
        tile.container.setAlpha(0);
        const delay = col * 30 + row * 50;
        this.tweens.add({
          targets: tile.container,
          y: targetY,
          alpha: 1,
          duration: 350,
          delay,
          ease: 'Cubic.easeIn',
          onComplete: () => {
            this.tweens.chain({
              targets: tile.container,
              tweens: [
                { scaleY: 0.82, scaleX: 1.18, duration: 50, ease: 'Cubic.easeOut' },
                { scaleY: 1, scaleX: 1, duration: 60, ease: 'Sine.easeOut' },
              ],
            });
          },
        });
      }
    }
  }

  /** 연쇄 콤보 콜아웃 텍스트 */
  private showComboCallout(depth: number): void {
    const labels = ['', '', 'Yummy!', 'So Sweet!', 'Delicious!', 'Sugar Rush!'];
    const colorMap = ['', '', '#f48fb1', '#ce93d8', '#e8a0bf', '#ffd700'];
    const sizeMap = ['', '', '64px', '72px', '80px', '88px'];
    const idx = Math.min(depth, labels.length - 1);

    const callout = this.add.text(GAME_WIDTH / 2, BOARD_Y - BOARD_HEIGHT / 2 - 60, labels[idx], {
      fontSize: sizeMap[idx],
      color: colorMap[idx],
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(25).setScale(0);

    this.tweens.add({
      targets: callout,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: callout,
          scaleX: 1,
          scaleY: 1,
          duration: 100,
        });
      },
    });

    this.tweens.add({
      targets: callout,
      y: callout.y - 80,
      alpha: 0,
      duration: 800,
      delay: 400,
      ease: 'Cubic.easeOut',
      onComplete: () => callout.destroy(),
    });

    // ── 콤보 강화 파티클 (깊이에 따라 점진 상승) ──
    const cx = GAME_WIDTH / 2;
    const cy = BOARD_Y - BOARD_HEIGHT / 2 - 60;
    const pastelColors = [0xffb3c1, 0xffd6a5, 0xfdffb6, 0xb5ead7, 0xb5d8ff, 0xe2c6ff];

    if (depth >= 3) {
      // 설탕가루 버스트
      const sugarE = this.add.particles(cx, cy, 'particle_sugar', {
        speed: { min: 40, max: 120 },
        scale: { start: 1.5, end: 0 },
        alpha: { start: 0.5, end: 0 },
        lifespan: { min: 400, max: 700 },
        angle: { min: 0, max: 360 },
        tint: pastelColors,
        gravityY: 60,
        emitting: false,
      });
      sugarE.setDepth(26);
      sugarE.explode(depth * 2);
      this.time.delayedCall(800, () => sugarE.destroy());
    }
    if (depth >= 4) {
      // 스프링클 버스트
      const sprinkleE = this.add.particles(cx, cy, 'particle_sprinkle', {
        speed: { min: 60, max: 180 },
        scale: { start: 1.2, end: 0.3 },
        alpha: { start: 0.6, end: 0 },
        lifespan: { min: 500, max: 800 },
        angle: { min: 200, max: 340 },
        tint: pastelColors,
        rotate: { min: -180, max: 180 },
        gravityY: 100,
        emitting: false,
      });
      sprinkleE.setDepth(26);
      sprinkleE.explode(6);
      this.time.delayedCall(900, () => sprinkleE.destroy());
      SoundManager.getInstance().playComboChime();
    }
    if (depth >= 5) {
      // 콘페티 비 (화면 상단에서)
      const confettiE = this.add.particles(GAME_WIDTH / 2, -20, 'particle_confetti', {
        speed: { min: 30, max: 80 },
        scale: { start: 1, end: 0.5 },
        alpha: { start: 0.6, end: 0 },
        lifespan: { min: 800, max: 1200 },
        angle: { min: 80, max: 100 },
        tint: pastelColors,
        rotate: { min: -360, max: 360 },
        gravityY: 80,
        emitting: false,
      });
      confettiE.setDepth(26);
      confettiE.explode(12);
      this.time.delayedCall(1300, () => confettiE.destroy());
    }
  }

  /** 타일 제거 시 파티클 버스트 (고퀄리티 — 글로우 + 스파크 2레이어) */
  private spawnParticleBurst(x: number, y: number, type: TileType): void {
    const colorMap: Record<TileType, number[]> = {
      cupcake: [0xf48fb1, 0xf06292, 0xfce4ec],
      donut: [0xb39ddb, 0x9575cd, 0xede7f6],
      macaron: [0x80cbc4, 0x4db6ac, 0xe0f2f1],
      croissant: [0xffc107, 0xffb300, 0xfff8e1],
      icecream: [0x90caf9, 0x64b5f6, 0xe3f2fd],
      chocolate: [0x8d6e63, 0xa1887f, 0xefebe9],
    };
    const tints = colorMap[type] ?? [0xffffff];

    // 레이어 1: 소프트 글로우 파티클 (NORMAL 블렌드 — Android WebGL 안전)
    const glowEmitter = this.add.particles(x, y, 'fx_glow', {
      speed: { min: 40, max: 120 },
      scale: { start: 0.05, end: 0 },
      alpha: { start: 0.25, end: 0 },
      lifespan: { min: 300, max: 500 },
      angle: { min: 0, max: 360 },
      tint: tints,
      gravityY: 60,
      emitting: false,
    });
    glowEmitter.setDepth(15);
    const cd = Math.max(1, this.cascadeDepth);
    glowEmitter.explode(4 + cd * 2);

    // 레이어 2: 둥근 별 + 하트 파티클 (NORMAL — 파스텔 색감 보존)
    const tex = Math.random() > 0.5 ? 'fx_soft_star' : 'fx_heart';
    const sparkEmitter = this.add.particles(x, y, tex, {
      speed: { min: 60, max: 160 },
      scale: { start: 0.04, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: { min: 250, max: 450 },
      angle: { min: 0, max: 360 },
      tint: tints,
      rotate: { min: -30, max: 30 },
      gravityY: 80,
      emitting: false,
    });
    sparkEmitter.setDepth(16);
    sparkEmitter.explode(3 + cd);

    // 레이어 3: 디저트 파편 (shard + sprinkle — 물리적 존재감)
    const shardTex = Math.random() > 0.5 ? 'particle_shard' : 'particle_sprinkle';
    const shardEmitter = this.add.particles(x, y, shardTex, {
      speed: { min: 80, max: 200 },
      scale: { start: 1, end: 0.3 },
      alpha: { start: 0.6, end: 0 },
      lifespan: { min: 300, max: 500 },
      angle: { min: 0, max: 360 },
      tint: tints,
      rotate: { min: -90, max: 90 },
      gravityY: 200,
      emitting: false,
    });
    shardEmitter.setDepth(17);
    shardEmitter.explode(3);

    // 자동 정리
    this.time.delayedCall(600, () => {
      glowEmitter.destroy();
      sparkEmitter.destroy();
      shardEmitter.destroy();
    });
  }

  /** 특수 젬 발동 시각 효과 */
  private playSpecialActivationEffect(row: number, col: number, special: SpecialType, lineDir?: 'horizontal' | 'vertical'): void {
    const { x, y } = this.getTilePosition(row, col);

    const sound = SoundManager.getInstance();
    switch (special) {
      case 'lineBlast':
        this.playLineBlastEffect(x, y, lineDir ?? 'horizontal');
        sound.playLineBlast();
        break;
      case 'bomb':
        this.playBombEffect(x, y);
        sound.playBomb();
        break;
      case 'colorBomb':
        this.playColorBombEffect(x, y);
        sound.playColorBomb();
        break;
      case 'crossBlast':
        this.playCrossBlastEffect(x, y);
        sound.playCrossBlast();
        break;
      case 'wrapped':
        this.playWrappedEffect(x, y);
        sound.playWrapped();
        break;
    }
    if (special === 'lineBlast') {
      vibrateTap();
    } else {
      vibrateSpecial();
    }

    // 카메라 흔들림 (파스텔 — 대폭 약화)
    const intensity = special === 'colorBomb' ? 4 : special === 'crossBlast' ? 3 : special === 'bomb' || special === 'wrapped' ? 2 : 1;
    this.shakeCamera(80 + intensity * 10, intensity / 4000);

    // 강력한 특수젬은 부드러운 파스텔 플래시
    if (special === 'colorBomb' || special === 'crossBlast') {
      this.flashCamera(120, 255, 240, 245, 0.12);
    }
  }

  /** Line Blast 빔 이펙트 (고퀄리티 — 글로우 빔 + ADD 블렌드 + 파티클 스트림) */
  private getMotionFactor(): number {
    return getMotionFactor();
  }

  private getFxDuration(duration: number): number {
    return Math.max(90, Math.round(duration * (isReducedMotionEnabled() ? 0.72 : 1)));
  }

  private getBurstCount(count: number): number {
    return Math.max(2, Math.round(count * this.getMotionFactor()));
  }

  private shakeCamera(duration: number, intensity: number): void {
    if (isReducedMotionEnabled()) return;
    this.cameras.main.shake(this.getFxDuration(duration), intensity * this.getMotionFactor());
  }

  private flashCamera(duration: number, r: number, g: number, b: number, alpha = 0.12): void {
    if (isReducedMotionEnabled()) return;
    this.cameras.main.flash(this.getFxDuration(duration), r, g, b, false, (_cam: Phaser.Cameras.Scene2D.Camera, progress: number) => {
      if (progress > 0.1) _cam.flashEffect.alpha = alpha * (1 - progress);
    });
  }

  private getBurstEmitter(poolKey: string, texture: string, depth: number, blendMode?: Phaser.BlendModes): Phaser.GameObjects.Particles.ParticleEmitter {
    let emitter = this.burstEmitters.get(poolKey);
    if (!emitter) {
      emitter = this.add.particles(0, 0, texture, { emitting: false, speed: 0, lifespan: 1 });
      this.burstEmitters.set(poolKey, emitter);
    }
    emitter.setDepth(depth);
    if (blendMode != null) emitter.setBlendMode(blendMode);
    return emitter;
  }

  private explodeBurst(
    poolKey: string,
    texture: string,
    x: number,
    y: number,
    count: number,
    config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
    depth: number,
    blendMode?: Phaser.BlendModes,
  ): void {
    const emitter = this.getBurstEmitter(poolKey, texture, depth, blendMode);
    emitter.setPosition(x, y);
    emitter.setConfig({ ...config, emitting: false });
    emitter.explode(this.getBurstCount(count), x, y);
  }

  private spawnSparkDots(
    x: number,
    y: number,
    count: number,
    spread: number,
    textureChoices: string[],
    tintChoices: number[],
    depth: number,
  ): void {
    for (let i = 0; i < this.getBurstCount(count); i++) {
      const dx = x + (Math.random() - 0.5) * spread;
      const dy = y + (Math.random() - 0.5) * spread;
      const tex = textureChoices[Math.floor(Math.random() * textureChoices.length)] ?? textureChoices[0];
      const tint = tintChoices[Math.floor(Math.random() * tintChoices.length)] ?? tintChoices[0];
      const dot = this.add.image(dx, dy, tex);
      dot.setDepth(depth);
      // SCREEN 블렌드 제거 — Android WebGL FBO 자글거림 방지
      dot.setTint(tint);
      dot.setScale(0.02 + Math.random() * 0.04);
      dot.setAlpha(0.3);
      this.tweens.add({
        targets: dot,
        alpha: 0,
        scaleX: dot.scaleX * 1.35,
        scaleY: dot.scaleY * 1.35,
        y: dy - 4 - Math.random() * 12,
        angle: Math.random() * 70 - 35,
        duration: this.getFxDuration(280 + Math.random() * 180),
        ease: 'Cubic.easeOut',
        onComplete: () => dot.destroy(),
      });
    }
  }

  private playLineBlastEffect(x: number, y: number, dir: 'horizontal' | 'vertical'): void {
    const len = dir === 'horizontal' ? GAME_WIDTH : GAME_HEIGHT;
    const scaleMain = (len * 2.2) / 1024;
    const isH = dir === 'horizontal';

    // ── 1) 외부 글로우 빔 (부드러운 로즈핑크 후광) — NORMAL 블렌드 (Android 안전)
    const outerGlow = this.add.image(x, y, 'fx_beam_glow');
    outerGlow.setDepth(17);
    outerGlow.setTint(0xffb7c5);
    if (isH) {
      outerGlow.setScale(scaleMain, 1.2);
    } else {
      outerGlow.setAngle(90);
      outerGlow.setScale(scaleMain, 1.2);
    }
    outerGlow.setAlpha(0);
    this.tweens.add({
      targets: outerGlow,
      alpha: 0.4,
      duration: 60,
      yoyo: true,
      hold: 220,
      ease: 'Sine.easeInOut',
      onComplete: () => outerGlow.destroy(),
    });

    // ── 2) 코어 빔 (파스텔 핑크 중심선) — NORMAL 블렌드 (Android 안전)
    const coreBeam = this.add.image(x, y, 'fx_beam_core');
    coreBeam.setDepth(20);
    coreBeam.setTint(0xffd1dc);
    if (isH) {
      coreBeam.setScale(scaleMain, 0.8);
    } else {
      coreBeam.setAngle(90);
      coreBeam.setScale(scaleMain, 0.8);
    }
    coreBeam.setAlpha(0);
    this.tweens.add({
      targets: coreBeam,
      alpha: 0.5,
      duration: 40,
      yoyo: true,
      hold: 220,
      ease: 'Sine.easeInOut',
      onComplete: () => coreBeam.destroy(),
    });

    // ── 3) 중앙 소프트 플래시 — NORMAL 블렌드 (Android 안전)
    const flash = this.add.image(x, y, 'fx_flare');
    flash.setDepth(21);
    flash.setTint(0xffc8d6);
    flash.setScale(0.4);
    flash.setAlpha(0.35);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 0.7,
      scaleY: 0.7,
      duration: 300,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });

    // ── 4) 양방향 하트 + 별 스파클 파티클 ──
    const angles1 = isH ? { min: -20, max: 20 } : { min: 70, max: 110 };
    const angles2 = isH ? { min: 160, max: 200 } : { min: 250, max: 290 };
    for (const angleRange of [angles1, angles2]) {
      const heartE = this.add.particles(x, y, 'fx_heart', {
        speed: { min: 100, max: 250 },
        scale: { start: 0.05, end: 0 },
        alpha: { start: 0.5, end: 0 },
        lifespan: { min: 250, max: 450 },
        angle: angleRange,
        tint: [0xffb7c5, 0xf48fb1, 0xffd1dc],
        rotate: { min: -20, max: 20 },
        emitting: false,
      });
      heartE.setDepth(21);
      heartE.explode(4);
      this.time.delayedCall(500, () => heartE.destroy());

      const sparkE = this.add.particles(x, y, 'fx_soft_star', {
        speed: { min: 120, max: 280 },
        scale: { start: 0.04, end: 0 },
        alpha: { start: 0.5, end: 0 },
        lifespan: { min: 200, max: 400 },
        angle: angleRange,
        tint: [0xffb7c5, 0xffd1dc, 0xfce4ec],
        rotate: { min: 0, max: 360 },
        emitting: false,
      });
      sparkE.setDepth(21);
      sparkE.explode(3);
      this.time.delayedCall(500, () => sparkE.destroy());
    }

    // ── 5) 빔 경로 위 트윙클 도트 (설탕가루 글레이즈 느낌) ──
    for (let i = 0; i < 5; i++) {
      const offset = (Math.random() - 0.5) * len * 1.6;
      const dx = isH ? x + offset : x + (Math.random() - 0.5) * 30;
      const dy = isH ? y + (Math.random() - 0.5) * 30 : y + offset;
      const tex = Math.random() > 0.5 ? 'fx_twinkle' : 'fx_sparkle_4pt';
      const dot = this.add.image(dx, dy, tex);
      dot.setDepth(18);
      // SCREEN 블렌드 제거 — Android WebGL 안전
      dot.setTint(Math.random() > 0.5 ? 0xffd1dc : 0xffb7c5);
      dot.setScale(0.02 + Math.random() * 0.03);
      dot.setAlpha(0.3);
      this.tweens.add({
        targets: dot,
        alpha: 0,
        scaleX: dot.scaleX * 1.3,
        scaleY: dot.scaleY * 1.3,
        angle: Math.random() * 60 - 30,
        y: dy - 6 - Math.random() * 10,
        duration: 250 + Math.random() * 200,
        delay: Math.random() * 120,
        ease: 'Cubic.easeOut',
        onComplete: () => dot.destroy(),
      });
    }

    // ── 6) 꽃잎 파티클 (글레이즈 리본 질감) ──
    const petalEmitter = this.add.particles(x, y, 'fx_petal', {
      speed: { min: 40, max: 120 },
      scale: { start: 0.04, end: 0 },
      alpha: { start: 0.4, end: 0 },
      lifespan: { min: 400, max: 700 },
      angle: isH ? { min: -30, max: 30 } : { min: 60, max: 120 },
      tint: [0xffd1dc, 0xfce4ec, 0xffb7c5],
      rotate: { min: -90, max: 90 },
      gravityY: 40,
      emitting: false,
    });
    petalEmitter.setDepth(17);
    petalEmitter.explode(4);
    this.time.delayedCall(800, () => petalEmitter.destroy());
  }

  /** Bomb 충격파 이펙트 (파스텔 — 소프트 글로우 + 링 + 파티클) */
  private playBombEffect(x: number, y: number): void {
    {
    const palette = [0xf48fb1, 0xffd1dc, 0xfce4ec];
    const burstScale = 1 + this.getMotionFactor() * 0.18;

    const flash = this.add.image(x, y, 'fx_glow');
    flash.setDepth(21);
    // SCREEN 블렌드 제거 — Android WebGL 안전
    flash.setTint(0xffc8d6);
    flash.setScale(0.34);
    flash.setAlpha(0.40);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 1.05 * burstScale,
      scaleY: 1.05 * burstScale,
      duration: this.getFxDuration(260),
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });

    const glaze = this.add.image(x, y, 'fx_flare');
    glaze.setDepth(22);
    // SCREEN 블렌드 제거 — Android WebGL 안전
    glaze.setTint(0xfff1f4);
    glaze.setScale(0.18);
    glaze.setAlpha(0.48);
    this.tweens.add({
      targets: glaze,
      alpha: 0,
      angle: 30,
      scaleX: 0.72,
      scaleY: 0.72,
      duration: this.getFxDuration(220),
      ease: 'Cubic.easeOut',
      onComplete: () => glaze.destroy(),
    });

    const poofSprite = this.add.sprite(x, y, 'fx_poof');
    poofSprite.setDepth(23);
    poofSprite.setScale((TILE_TOTAL * 3.1) / 256);
    poofSprite.setAlpha(0.62);
    poofSprite.play('anim_poof');
    poofSprite.once('animationcomplete', () => poofSprite.destroy());

    const heartPop = this.add.sprite(x, y, 'fx_heart_anim');
    heartPop.setDepth(24);
    heartPop.setScale((TILE_TOTAL * 2.6) / 256);
    heartPop.setAlpha(0.5);
    heartPop.play('anim_heart_pop');
    heartPop.once('animationcomplete', () => heartPop.destroy());

    for (let i = 0; i < 3; i++) {
      const ring = this.add.image(x, y, 'fx_soft_ring');
      ring.setDepth(19);
      // SCREEN 블렌드 제거 — Android WebGL 안전
      ring.setTint(palette[i] ?? palette[0]);
      ring.setScale(0.22 + i * 0.04);
      ring.setAlpha(0.28 - i * 0.06);
      this.tweens.add({
        targets: ring,
        scaleX: 1.4 + i * 0.55,
        scaleY: 1.4 + i * 0.55,
        alpha: 0,
        duration: this.getFxDuration(320 + i * 80),
        delay: i * 40,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy(),
      });
    }

    this.explodeBurst('bomb-heart', 'fx_heart', x, y, 8, {
      speed: { min: 70, max: 200 },
      scale: { start: 0.06, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: { min: 360, max: 620 },
      angle: { min: 0, max: 360 },
      tint: palette,
      rotate: { min: -40, max: 40 },
      gravityY: 70,
    }, 18);
    this.explodeBurst('bomb-star', 'fx_soft_star', x, y, 7, {
      speed: { min: 90, max: 220 },
      scale: { start: 0.05, end: 0 },
      alpha: { start: 0.55, end: 0 },
      lifespan: { min: 280, max: 460 },
      angle: { min: 0, max: 360 },
      tint: palette,
      rotate: { min: 0, max: 360 },
      gravityY: 90,
    }, 19);
    this.explodeBurst('bomb-glow', 'fx_glow', x, y, 6, {
      speed: { min: 40, max: 140 },
      scale: { start: 0.05, end: 0 },
      alpha: { start: 0.28, end: 0 },
      lifespan: { min: 320, max: 520 },
      angle: { min: 0, max: 360 },
      tint: palette,
      gravityY: 20,
    }, 17);
    this.spawnSparkDots(x, y, 7, TILE_TOTAL * 2.4, ['fx_twinkle', 'fx_sparkle_4pt'], palette, 20);

    this.flashCamera(95, 255, 244, 247, 0.12);
    // postFX.addBloom 제거 — Android WebGL FBO 자글거림 방지
    }

    return;
    // ── 1) 중앙 핑크 글로우 플래시 ──
    const flash = this.add.image(x, y, 'fx_glow');
    flash.setDepth(20);
    flash.setBlendMode(Phaser.BlendModes.SCREEN);
    flash.setTint(0xffc8d6);
    flash.setScale(0.44);
    flash.setAlpha(0.45);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 0.75,
      scaleY: 0.75,
      duration: 350,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });

    // ── 2) 핑크 글로우 후광 ──
    const pinkGlow = this.add.image(x, y, 'fx_glow');
    pinkGlow.setDepth(18);
    pinkGlow.setBlendMode(Phaser.BlendModes.SCREEN);
    pinkGlow.setTint(0xf8bbd0);
    pinkGlow.setScale(0.25);
    pinkGlow.setAlpha(0.35);
    this.tweens.add({
      targets: pinkGlow,
      alpha: 0,
      scaleX: 0.63,
      scaleY: 0.63,
      duration: 400,
      ease: 'Cubic.easeOut',
      onComplete: () => pinkGlow.destroy(),
    });

    // ── 3) 팡! 스프라이트 애니메이션 (귀여운 폭죽) ──
    const poofSprite = this.add.sprite(x, y, 'fx_poof');
    poofSprite.setDepth(22);
    poofSprite.setScale(TILE_TOTAL * 3 / 256);
    poofSprite.setAlpha(0.6);
    poofSprite.play('anim_poof');
    poofSprite.once('animationcomplete', () => poofSprite.destroy());

    // 하트 팝 애니메이션
    const heartPop = this.add.sprite(x, y, 'fx_heart_anim');
    heartPop.setDepth(21);
    heartPop.setScale(TILE_TOTAL * 2.5 / 256);
    heartPop.setAlpha(0.5);
    heartPop.play('anim_heart_pop');
    heartPop.once('animationcomplete', () => heartPop.destroy());

    // ── 4) 부드러운 링 확산 ──
    for (let i = 0; i < 3; i++) {
      const ring = this.add.image(x, y, 'fx_soft_ring');
      ring.setDepth(19);
      ring.setBlendMode(Phaser.BlendModes.SCREEN);
      ring.setTint(i === 0 ? 0xf8bbd0 : 0xfce4ec);
      ring.setScale(0.15);
      ring.setAlpha(0.4 - i * 0.1);

      this.tweens.add({
        targets: ring,
        scaleX: 1.2 + i * 0.3,
        scaleY: 1.2 + i * 0.3,
        alpha: 0,
        duration: 400 + i * 80,
        delay: i * 40,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy(),
      });
    }

    // ── 5) 하트 + 별 파티클 버스트 ──
    const heartEmitter = this.add.particles(x, y, 'fx_heart', {
      speed: { min: 60, max: 180 },
      scale: { start: 0.06, end: 0 },
      alpha: { start: 0.45, end: 0 },
      lifespan: { min: 400, max: 650 },
      angle: { min: 0, max: 360 },
      tint: [0xf48fb1, 0xf8bbd0, 0xfce4ec],
      rotate: { min: -30, max: 30 },
      gravityY: 60,
      emitting: false,
    });
    heartEmitter.setDepth(17);
    heartEmitter.explode(7);

    const sparkEmitter = this.add.particles(x, y, 'fx_soft_star', {
      speed: { min: 80, max: 200 },
      scale: { start: 0.05, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: { min: 300, max: 500 },
      angle: { min: 0, max: 360 },
      tint: [0xf48fb1, 0xffd1dc, 0xfce4ec],
      rotate: { min: 0, max: 360 },
      gravityY: 80,
      emitting: false,
    });
    sparkEmitter.setDepth(18);
    sparkEmitter.explode(5);

    // ── 6) 부드러운 카메라 블룸 ──
    try {
      const cam = this.cameras.main;
      const bloom = cam.postFX?.addBloom(0xffffff, 0.5, 0.5, 0.4, 1.02);
      if (bloom) {
        this.tweens.add({
          targets: bloom,
          strength: 0.6,
          duration: 150,
          yoyo: true,
          ease: 'Sine.easeInOut',
          onComplete: () => cam.postFX?.remove(bloom),
        });
      }
    } catch { /* Canvas 모드 무시 */ }

    // 자동 정리
    this.time.delayedCall(700, () => {
      heartEmitter.destroy();
      sparkEmitter.destroy();
    });
  }

  /** Color Bomb 무지개 이펙트 (파스텔 — 소프트 무지개 링 + 파티클 + 약한 셰이더) */
  private playColorBombEffect(x: number, y: number): void {
    const colors = [0xffb3c1, 0xffd6a5, 0xfdffb6, 0xb5ead7, 0xb5d8ff, 0xe2c6ff];

    // ── 0) 소프트 소용돌이 (회전 확대 → 소멸) — NORMAL 블렌드 (Android 안전)
    const swirl = this.add.image(x, y, 'fx_swirl');
    swirl.setDepth(23);
    swirl.setScale(0.01);
    swirl.setAlpha(0.45);
    this.tweens.add({
      targets: swirl,
      scaleX: TILE_TOTAL * 4 / 512,
      scaleY: TILE_TOTAL * 4 / 512,
      angle: 180,
      alpha: 0,
      duration: 500,
      ease: 'Cubic.easeOut',
      onComplete: () => swirl.destroy(),
    });

    // ── 1) 중앙 골든 글로우 플래시 — NORMAL 블렌드 (Android 안전)
    const flash = this.add.image(x, y, 'fx_glow');
    flash.setDepth(20);
    flash.setTint(0xffe5a0);
    flash.setScale(0.5);
    flash.setAlpha(0.32);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 1.0,
      scaleY: 1.0,
      duration: 500,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });

    // 파스텔 코어 플래시 — NORMAL 블렌드 (Android 안전)
    const coreFlash = this.add.image(x, y, 'fx_glow');
    coreFlash.setDepth(21);
    coreFlash.setTint(0xfff5e6);
    coreFlash.setScale(0.25);
    coreFlash.setAlpha(0.45);
    this.tweens.add({
      targets: coreFlash,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 300,
      ease: 'Cubic.easeOut',
      onComplete: () => coreFlash.destroy(),
    });

    // ── 2) 파스텔 무지개 링 — NORMAL 블렌드 (Android 안전)
    colors.forEach((color, i) => {
      const glowRing = this.add.image(x, y, 'fx_soft_ring');
      glowRing.setDepth(18);
      glowRing.setTint(color);
      glowRing.setScale(0.3);
      glowRing.setAlpha(0.32);

      this.tweens.add({
        targets: glowRing,
        scaleX: 4 + i * 1.0,
        scaleY: 4 + i * 1.0,
        alpha: 0,
        duration: 500 + i * 60,
        delay: i * 35,
        ease: 'Cubic.easeOut',
        onComplete: () => glowRing.destroy(),
      });

      const colorGlow = this.add.image(x, y, 'fx_glow');
      colorGlow.setDepth(17);
      // SCREEN 블렌드 제거 — Android WebGL 안전
      colorGlow.setTint(color);
      colorGlow.setScale(0.12);
      colorGlow.setAlpha(0.25);

      this.tweens.add({
        targets: colorGlow,
        scaleX: 0.5 + i * 0.1,
        scaleY: 0.5 + i * 0.1,
        alpha: 0,
        duration: 450 + i * 50,
        delay: i * 35,
        ease: 'Cubic.easeOut',
        onComplete: () => colorGlow.destroy(),
      });
    });

    // ── 3) 하트 + 별 파티클 사방 발사 (NORMAL — 파스텔 보존) ──
    const heartEmitter = this.add.particles(x, y, 'fx_heart', {
      speed: { min: 80, max: 220 },
      scale: { start: 0.05, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: { min: 400, max: 700 },
      angle: { min: 0, max: 360 },
      tint: colors,
      rotate: { min: -30, max: 30 },
      emitting: false,
    });
    heartEmitter.setDepth(20);
    heartEmitter.explode(8);

    const starEmitter = this.add.particles(x, y, 'fx_soft_star', {
      speed: { min: 100, max: 250 },
      scale: { start: 0.04, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: { min: 400, max: 700 },
      angle: { min: 0, max: 360 },
      tint: colors,
      rotate: { min: 0, max: 360 },
      emitting: false,
    });
    starEmitter.setDepth(20);
    starEmitter.explode(8);

    // 글로우 파티클 (부드러운 레이어) — NORMAL 블렌드 (Android 안전)
    const glowEmitter = this.add.particles(x, y, 'fx_glow', {
      speed: { min: 50, max: 180 },
      scale: { start: 0.05, end: 0 },
      alpha: { start: 0.2, end: 0 },
      lifespan: { min: 350, max: 600 },
      angle: { min: 0, max: 360 },
      tint: colors,
      gravityY: -20,
      emitting: false,
    });
    glowEmitter.setDepth(19);
    glowEmitter.explode(8);

    // postFX.addBloom 제거 — Android WebGL FBO 자글거림 방지
    // RainbowPipeline 셰이더 제거 — Android WebGL postPipeline 자글거림 방지

    // ── 6) 소용돌이 스프라이트 애니메이션 (디저트 쇼케이스 감성) ──
    const vortex = this.add.sprite(x, y, 'fx_vortex');
    vortex.setDepth(19);
    // SCREEN 블렌드 제거 — Android WebGL 안전
    vortex.setScale(TILE_TOTAL * 2.5 / 427);
    vortex.setAlpha(0.3);
    vortex.setTint(0xffe5a0);
    vortex.play('anim_vortex');
    vortex.once('animationcomplete', () => vortex.destroy());

    // ── 7) 버블 파티클 (탄산캔디 부유감) ──
    const bubbleEmitter = this.add.particles(x, y, 'fx_bubble', {
      speed: { min: 30, max: 100 },
      scale: { start: 0.03, end: 0.01 },
      alpha: { start: 0.35, end: 0 },
      lifespan: { min: 600, max: 1000 },
      angle: { min: 220, max: 320 },
      tint: colors,
      rotate: { min: 0, max: 360 },
      gravityY: -40,
      emitting: false,
    });
    bubbleEmitter.setDepth(20);
    bubbleEmitter.explode(6);

    // 자동 정리
    this.time.delayedCall(1050, () => {
      heartEmitter.destroy();
      starEmitter.destroy();
      glowEmitter.destroy();
      bubbleEmitter.destroy();
    });
  }

  /** Cross Blast 십자 빔 이펙트 (파스텔 — 소프트 라벤더 빔 + 파티클) */
  private playCrossBlastEffect(x: number, y: number): void {
    {
      const palette = [0xe2c6ff, 0xf3e5f5, 0xffd1dc];
      const hold = this.getFxDuration(210);

      for (const dir of ['horizontal', 'vertical'] as const) {
        const len = dir === 'horizontal' ? GAME_WIDTH : GAME_HEIGHT;
        const scaleMain = (len * 2.2) / 1024;
        const isHorizontal = dir === 'horizontal';

        const outerGlow = this.add.image(x, y, 'fx_beam_glow');
        outerGlow.setDepth(17);
        // SCREEN 블렌드 제거 — Android WebGL 안전
        outerGlow.setTint(0xe2c6ff);
        if (!isHorizontal) outerGlow.setAngle(90);
        outerGlow.setScale(scaleMain, 1.26);
        outerGlow.setAlpha(0);
        this.tweens.add({
          targets: outerGlow,
          alpha: 0.38,
          duration: this.getFxDuration(70),
          yoyo: true,
          hold,
          ease: 'Sine.easeInOut',
          onComplete: () => outerGlow.destroy(),
        });

        const coreBeam = this.add.image(x, y, 'fx_beam_core');
        coreBeam.setDepth(20);
        // SCREEN 블렌드 제거 — Android WebGL 안전
        coreBeam.setTint(0xfdf2ff);
        if (!isHorizontal) coreBeam.setAngle(90);
        coreBeam.setScale(scaleMain, 0.86);
        coreBeam.setAlpha(0);
        this.tweens.add({
          targets: coreBeam,
          alpha: 0.6,
          duration: this.getFxDuration(50),
          yoyo: true,
          hold,
          ease: 'Sine.easeInOut',
          onComplete: () => coreBeam.destroy(),
        });

        for (let i = 0; i < this.getBurstCount(7); i++) {
          const offset = (Math.random() - 0.5) * len * 1.5;
          const dotX = isHorizontal ? x + offset : x + (Math.random() - 0.5) * 30;
          const dotY = isHorizontal ? y + (Math.random() - 0.5) * 30 : y + offset;
          const dot = this.add.image(dotX, dotY, Math.random() > 0.5 ? 'fx_sparkle_4pt' : 'fx_twinkle');
          dot.setDepth(18);
          // SCREEN 블렌드 제거 — Android WebGL 안전
          dot.setTint(palette[i % palette.length] ?? palette[0]);
          dot.setScale(0.02 + Math.random() * 0.03);
          dot.setAlpha(0.28);
          this.tweens.add({
            targets: dot,
            alpha: 0,
            scaleX: dot.scaleX * 1.3,
            scaleY: dot.scaleY * 1.3,
            duration: this.getFxDuration(200 + Math.random() * 180),
            ease: 'Cubic.easeOut',
            onComplete: () => dot.destroy(),
          });
        }
      }

      const flare = this.add.image(x, y, 'fx_flare');
      flare.setDepth(23);
      // SCREEN 블렌드 제거 — Android WebGL 안전
      flare.setTint(0xf6edff);
      flare.setScale(0.26);
      flare.setAlpha(0.38);
      this.tweens.add({
        targets: flare,
        alpha: 0,
        angle: 25,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: this.getFxDuration(260),
        ease: 'Cubic.easeOut',
        onComplete: () => flare.destroy(),
      });

      this.explodeBurst('cross-glow', 'fx_glow', x, y, 10, {
        speed: { min: 60, max: 180 },
        scale: { start: 0.05, end: 0 },
        alpha: { start: 0.24, end: 0 },
        lifespan: { min: 320, max: 560 },
        angle: { min: 0, max: 360 },
        tint: palette,
      }, 19); // SCREEN 블렌드 제거 — Android WebGL 안전
      this.explodeBurst('cross-petal', 'fx_petal', x, y, 8, {
        speed: { min: 50, max: 120 },
        scale: { start: 0.045, end: 0 },
        alpha: { start: 0.42, end: 0 },
        lifespan: { min: 420, max: 760 },
        angle: { min: 0, max: 360 },
        tint: palette,
        rotate: { min: -120, max: 120 },
        gravityY: 26,
      }, 20);
      this.explodeBurst('cross-star', 'fx_soft_star', x, y, 8, {
        speed: { min: 90, max: 220 },
        scale: { start: 0.045, end: 0 },
        alpha: { start: 0.5, end: 0 },
        lifespan: { min: 240, max: 420 },
        angle: { min: 0, max: 360 },
        tint: palette,
        rotate: { min: 0, max: 360 },
      }, 21);
      this.spawnSparkDots(x, y, 8, TILE_TOTAL * 2.6, ['fx_twinkle', 'fx_sparkle_4pt'], palette, 22);

      this.flashCamera(105, 247, 237, 255, 0.13);
      // postFX.addBloom 제거 — Android WebGL FBO 자글거림 방지
    }

    return;
    // ── 1) 가로 + 세로 빔 (2레이어 × 2방향 = 라벤더 빛줄기) ──
    for (const dir of ['horizontal', 'vertical'] as const) {
      const len = dir === 'horizontal' ? GAME_WIDTH : GAME_HEIGHT;
      const scaleMain = (len * 2.2) / 1024;
      const isH = dir === 'horizontal';

      // 외부 글로우 빔 (부드러운 라벤더 후광)
      const outerGlow = this.add.image(x, y, 'fx_beam_glow');
      outerGlow.setDepth(17);
      outerGlow.setBlendMode(Phaser.BlendModes.SCREEN);
      outerGlow.setTint(0xe2c6ff);
      if (!isH) outerGlow.setAngle(90);
      outerGlow.setScale(scaleMain, 1.2);
      outerGlow.setAlpha(0);
      this.tweens.add({
        targets: outerGlow,
        alpha: 0.35,
        duration: 60,
        yoyo: true,
        hold: 220,
        ease: 'Sine.easeInOut',
        onComplete: () => outerGlow.destroy(),
      });

      // 코어 빔 (파스텔 라벤더 중심선)
      const coreBeam = this.add.image(x, y, 'fx_beam_core');
      coreBeam.setDepth(20);
      coreBeam.setBlendMode(Phaser.BlendModes.SCREEN);
      coreBeam.setTint(0xf3e5f5);
      if (!isH) coreBeam.setAngle(90);
      coreBeam.setScale(scaleMain, 0.8);
      coreBeam.setAlpha(0);
      this.tweens.add({
        targets: coreBeam,
        alpha: 0.5,
        duration: 40,
        yoyo: true,
        hold: 240,
        ease: 'Sine.easeInOut',
        onComplete: () => coreBeam.destroy(),
      });

      // 빔 방향 하트 + 별 스파클 파티클
      const angles = isH
        ? [{ min: -15, max: 15 }, { min: 165, max: 195 }]
        : [{ min: 75, max: 105 }, { min: 255, max: 285 }];
      for (const angleRange of angles) {
        const heartE = this.add.particles(x, y, 'fx_heart', {
          speed: { min: 100, max: 250 },
          scale: { start: 0.05, end: 0 },
          alpha: { start: 0.45, end: 0 },
          lifespan: { min: 250, max: 450 },
          angle: angleRange,
          tint: [0xe2c6ff, 0xe8d5f5, 0xf3e5f5],
          rotate: { min: -20, max: 20 },
          emitting: false,
        });
        heartE.setDepth(21);
        heartE.explode(3);
        this.time.delayedCall(500, () => heartE.destroy());

        const sparkE = this.add.particles(x, y, 'fx_soft_star', {
          speed: { min: 120, max: 280 },
          scale: { start: 0.04, end: 0 },
          alpha: { start: 0.45, end: 0 },
          lifespan: { min: 200, max: 400 },
          angle: angleRange,
          tint: [0xe2c6ff, 0xe8d5f5, 0xf3e5f5],
          rotate: { min: 0, max: 360 },
          emitting: false,
        });
        sparkE.setDepth(21);
        sparkE.explode(3);
        this.time.delayedCall(500, () => sparkE.destroy());
      }

      // 빔 경로 위 스파클 도트
      for (let i = 0; i < 5; i++) {
        const offset = (Math.random() - 0.5) * len * 1.6;
        const dx = isH ? x + offset : x + (Math.random() - 0.5) * 30;
        const dy = isH ? y + (Math.random() - 0.5) * 30 : y + offset;
        const tex = Math.random() > 0.5 ? 'fx_sparkle_4pt' : 'fx_glow';
        const dot = this.add.image(dx, dy, tex);
        dot.setDepth(18);
        dot.setBlendMode(Phaser.BlendModes.SCREEN);
        dot.setTint(Math.random() > 0.5 ? 0xf3e5f5 : 0xe2c6ff);
        dot.setScale(0.02 + Math.random() * 0.03);
        dot.setAlpha(0.35);
        this.tweens.add({
          targets: dot,
          alpha: 0,
          scaleX: dot.scaleX * 1.3,
          scaleY: dot.scaleY * 1.3,
          duration: 200 + Math.random() * 200,
          delay: Math.random() * 100,
          ease: 'Cubic.easeOut',
          onComplete: () => dot.destroy(),
        });
      }
    }

    // ── 2) 중앙 교차점 소프트 플레어 ──
    const flash = this.add.image(x, y, 'fx_flare');
    flash.setDepth(22);
    flash.setBlendMode(Phaser.BlendModes.SCREEN);
    flash.setTint(0xf3e5f5);
    flash.setScale(0.5);
    flash.setAlpha(0.4);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 0.9,
      scaleY: 0.9,
      duration: 350,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });

    // 라벤더 글로우 후광
    const lavGlow = this.add.image(x, y, 'fx_glow');
    lavGlow.setDepth(21);
    lavGlow.setBlendMode(Phaser.BlendModes.SCREEN);
    lavGlow.setTint(0xe2c6ff);
    lavGlow.setScale(0.25);
    lavGlow.setAlpha(0.35);
    this.tweens.add({
      targets: lavGlow,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 350,
      ease: 'Cubic.easeOut',
      onComplete: () => lavGlow.destroy(),
    });

    // ── 3) 글로우 파티클 방사 ──
    const burstEmitter = this.add.particles(x, y, 'fx_glow', {
      speed: { min: 60, max: 180 },
      scale: { start: 0.04, end: 0 },
      alpha: { start: 0.35, end: 0 },
      lifespan: { min: 300, max: 500 },
      angle: { min: 0, max: 360 },
      tint: [0xe2c6ff, 0xe8d5f5, 0xf3e5f5],
      blendMode: Phaser.BlendModes.SCREEN,
      emitting: false,
    });
    burstEmitter.setDepth(19);
    burstEmitter.explode(8);

    // ── 3.5) 교차점 꽃잎 파티클 (리본 교차 질감) ──
    const petalEmitter = this.add.particles(x, y, 'fx_petal', {
      speed: { min: 30, max: 90 },
      scale: { start: 0.04, end: 0 },
      alpha: { start: 0.4, end: 0 },
      lifespan: { min: 500, max: 800 },
      angle: { min: 0, max: 360 },
      tint: [0xe2c6ff, 0xf3e5f5, 0xffd1dc],
      rotate: { min: -120, max: 120 },
      gravityY: 30,
      emitting: false,
    });
    petalEmitter.setDepth(20);
    petalEmitter.explode(5);

    // ── 4) 부드러운 카메라 블룸 ──
    try {
      const cam = this.cameras.main;
      const bloom = cam.postFX?.addBloom(0xffffff, 0.5, 0.5, 0.4, 1.02);
      if (bloom) {
        this.tweens.add({
          targets: bloom,
          strength: 0.6,
          duration: 150,
          yoyo: true,
          ease: 'Sine.easeInOut',
          onComplete: () => cam.postFX?.remove(bloom),
        });
      }
    } catch { /* Canvas 모드 무시 */ }

    this.time.delayedCall(850, () => {
      burstEmitter.destroy();
      petalEmitter.destroy();
    });
  }

  /** Wrapped Gem 래핑 폭발 이펙트 (파스텔 — 소프트 민트 + 링 + 파티클) */
  private playWrappedEffect(x: number, y: number, stage: 'primary' | 'secondary' = 'primary'): void {
    {
      const isSecondary = stage === 'secondary';
      const palette = isSecondary
        ? [0xffd6a5, 0xffc9de, 0xfff1d6]
        : [0xb5ead7, 0xdcedc8, 0xe0f5ec];

      if (!isSecondary) {
        const ribbonLeft = this.add.image(x, y, 'fx_petal');
        const ribbonRight = this.add.image(x, y, 'fx_petal');
        for (const [ribbon, startAngle] of [[ribbonLeft, -42], [ribbonRight, 42]] as const) {
          ribbon.setDepth(24);
          ribbon.setTint(0xffd1dc);
          ribbon.setScale(0.06);
          ribbon.setAlpha(0.55);
          ribbon.setAngle(startAngle);
          this.tweens.add({
            targets: ribbon,
            angle: startAngle + (startAngle > 0 ? 95 : -95),
            scaleX: 0.14,
            scaleY: 0.025,
            alpha: 0,
            duration: this.getFxDuration(220),
            ease: 'Cubic.easeOut',
            onComplete: () => ribbon.destroy(),
          });
        }
      }

      const poofSprite = this.add.sprite(x, y, 'fx_poof');
      poofSprite.setDepth(23);
      poofSprite.setScale((TILE_TOTAL * (isSecondary ? 3.1 : 2.7)) / 256);
      poofSprite.setTint(isSecondary ? 0xffd6a5 : 0xb5ead7);
      poofSprite.setAlpha(isSecondary ? 0.62 : 0.55);
      poofSprite.play('anim_poof');
      poofSprite.once('animationcomplete', () => poofSprite.destroy());

      const flash = this.add.image(x, y, 'fx_glow');
      flash.setDepth(21);
      // SCREEN 블렌드 제거 — Android WebGL 안전
      flash.setTint(isSecondary ? 0xffd6a5 : 0xb5ead7);
      flash.setScale(isSecondary ? 0.44 : 0.34);
      flash.setAlpha(0.35);
      this.tweens.add({
        targets: flash,
        alpha: 0,
        scaleX: isSecondary ? 1.1 : 0.92,
        scaleY: isSecondary ? 1.1 : 0.92,
        duration: this.getFxDuration(isSecondary ? 300 : 260),
        ease: 'Cubic.easeOut',
        onComplete: () => flash.destroy(),
      });

      for (let i = 0; i < 3; i++) {
        const ring = this.add.image(x, y, 'fx_soft_ring');
        ring.setDepth(19);
        // SCREEN 블렌드 제거 — Android WebGL 안전
        ring.setTint(palette[i] ?? palette[0]);
        ring.setScale(0.24 + i * 0.06);
        ring.setAlpha(0.28 - i * 0.06);
        this.tweens.add({
          targets: ring,
          scaleX: (isSecondary ? 2.6 : 2.2) + i * 0.9,
          scaleY: (isSecondary ? 2.6 : 2.2) + i * 0.9,
          alpha: 0,
          duration: this.getFxDuration((isSecondary ? 380 : 320) + i * 90),
          delay: i * 45,
          ease: 'Cubic.easeOut',
          onComplete: () => ring.destroy(),
        });
      }

      this.explodeBurst(`wrapped-star-${stage}`, 'fx_soft_star', x, y, isSecondary ? 10 : 8, {
        speed: { min: 90, max: isSecondary ? 240 : 190 },
        scale: { start: 0.05, end: 0 },
        alpha: { start: 0.52, end: 0 },
        lifespan: { min: 280, max: 520 },
        angle: { min: 0, max: 360 },
        tint: palette,
        rotate: { min: 0, max: 360 },
        gravityY: 80,
      }, 18);
      this.explodeBurst(`wrapped-glow-${stage}`, 'fx_glow', x, y, isSecondary ? 8 : 6, {
        speed: { min: 50, max: 160 },
        scale: { start: 0.045, end: 0 },
        alpha: { start: 0.22, end: 0 },
        lifespan: { min: 320, max: 540 },
        angle: { min: 0, max: 360 },
        tint: palette,
        gravityY: 10,
      }, 17); // SCREEN 블렌드 제거 — Android WebGL 안전
      this.explodeBurst(`wrapped-petal-${stage}`, 'fx_petal', x, y, isSecondary ? 8 : 6, {
        speed: { min: 40, max: 120 },
        scale: { start: 0.04, end: 0 },
        alpha: { start: 0.4, end: 0 },
        lifespan: { min: 420, max: 760 },
        angle: { min: 0, max: 360 },
        tint: palette,
        rotate: { min: -120, max: 120 },
        gravityY: 30,
      }, 20);
      this.spawnSparkDots(x, y, isSecondary ? 9 : 7, TILE_TOTAL * (isSecondary ? 2.9 : 2.3), ['fx_twinkle', 'fx_sparkle_4pt'], palette, 21);

      this.flashCamera(isSecondary ? 105 : 90, isSecondary ? 255 : 230, isSecondary ? 244 : 248, isSecondary ? 232 : 240, 0.11);
      // ShockwavePipeline (postPipeline) 제거 — Android WebGL FBO 자글거림 방지
    }

    return;
    // ── PRE) 리본 풀림 예고 (짧은 회전 팽창 → 소멸) ──
    const ribbon1 = this.add.image(x, y, 'fx_petal');
    const ribbon2 = this.add.image(x, y, 'fx_petal');
    for (const [rb, startAngle] of [[ribbon1, -45], [ribbon2, 45]] as const) {
      rb.setDepth(23);
      rb.setTint(0xdcedc8);
      rb.setScale(0.06);
      rb.setAlpha(0.5);
      rb.setAngle(startAngle);
      this.tweens.add({
        targets: rb,
        angle: startAngle + (startAngle > 0 ? 90 : -90),
        scaleX: 0.12,
        scaleY: 0.02,
        alpha: 0,
        duration: 250,
        ease: 'Cubic.easeOut',
        onComplete: () => rb.destroy(),
      });
    }

    // ── 0) 팡! 스프라이트 (민트 톤) ──
    const poofSprite = this.add.sprite(x, y, 'fx_poof');
    poofSprite.setDepth(22);
    poofSprite.setScale(TILE_TOTAL * 2.5 / 256);
    poofSprite.setTint(0xb5ead7);
    poofSprite.setAlpha(0.55);
    poofSprite.play('anim_poof');
    poofSprite.once('animationcomplete', () => poofSprite.destroy());

    // ── 1) 중앙 민트 글로우 플래시 ──
    const flash = this.add.image(x, y, 'fx_glow');
    flash.setDepth(20);
    flash.setBlendMode(Phaser.BlendModes.SCREEN);
    flash.setTint(0xb5ead7);
    flash.setScale(0.38);
    flash.setAlpha(0.4);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 0.75,
      scaleY: 0.75,
      duration: 350,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });

    // 파스텔 코어
    const core = this.add.image(x, y, 'fx_glow');
    core.setDepth(21);
    core.setBlendMode(Phaser.BlendModes.SCREEN);
    core.setTint(0xe0f5ec);
    core.setScale(0.19);
    core.setAlpha(0.4);
    this.tweens.add({
      targets: core,
      alpha: 0,
      scaleX: 0.38,
      scaleY: 0.38,
      duration: 250,
      ease: 'Cubic.easeOut',
      onComplete: () => core.destroy(),
    });

    // ── 2) 부드러운 링 확산 ──
    for (let i = 0; i < 3; i++) {
      const ring = this.add.image(x, y, 'fx_soft_ring');
      ring.setDepth(19);
      ring.setBlendMode(Phaser.BlendModes.SCREEN);
      ring.setTint(i === 0 ? 0xdcedc8 : 0xb5ead7);
      ring.setScale(0.3);
      ring.setAlpha(0.35 - i * 0.08);

      this.tweens.add({
        targets: ring,
        scaleX: 3 + i * 1.0,
        scaleY: 3 + i * 1.0,
        alpha: 0,
        duration: 350 + i * 100,
        delay: i * 50,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy(),
      });
    }

    // ── 3) 별 + 하트 파티클 ──
    const ribbonEmitter = this.add.particles(x, y, 'fx_soft_star', {
      speed: { min: 80, max: 200 },
      scale: { start: 0.05, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: { min: 300, max: 550 },
      angle: { min: 0, max: 360 },
      tint: [0xb5ead7, 0xdcedc8, 0xe0f5ec],
      rotate: { min: 0, max: 360 },
      gravityY: 70,
      emitting: false,
    });
    ribbonEmitter.setDepth(18);
    ribbonEmitter.explode(7);

    // 글로우 방사
    const glowEmitter = this.add.particles(x, y, 'fx_glow', {
      speed: { min: 50, max: 150 },
      scale: { start: 0.04, end: 0 },
      alpha: { start: 0.3, end: 0 },
      lifespan: { min: 300, max: 500 },
      angle: { min: 0, max: 360 },
      tint: [0xb5ead7, 0xdcedc8, 0xe0f5ec],
      blendMode: Phaser.BlendModes.SCREEN,
      emitting: false,
    });
    glowEmitter.setDepth(17);
    glowEmitter.explode(6);

    // ── 4) Shockwave 셰이더 (진폭 대폭 감소) ──
    try {
      const cam = this.cameras.main;
      cam.setPostPipeline(ShockwavePipeline);
      const rawPipelines = cam.getPostPipeline(ShockwavePipeline) as unknown;
      const pipelineList = (Array.isArray(rawPipelines) ? (rawPipelines as unknown[]).flat() : [rawPipelines]) as ShockwavePipeline[];
      const shockwave = pipelineList[pipelineList.length - 1];
      if (shockwave) {
        const normX = x / GAME_WIDTH;
        const normY = y / GAME_HEIGHT;
        shockwave.setCenter(normX, normY);
        shockwave.setAmplitude(0.006);
        shockwave.setWavelength(0.1);

        const proxy = { progress: 0 };
        this.tweens.add({
          targets: proxy,
          progress: 1,
          duration: 500,
          ease: 'Cubic.easeOut',
          onUpdate: () => shockwave.setProgress(proxy.progress),
          onComplete: () => {
            try { cam.removePostPipeline('ShockwavePipeline'); } catch { /* */ }
          },
        });
      }
    } catch { /* Canvas/미지원 무시 */ }

    // ── 5) 부드러운 블룸 ──
    try {
      const cam = this.cameras.main;
      const bloom = cam.postFX?.addBloom(0xffffff, 0.5, 0.5, 0.3, 1.01);
      if (bloom) {
        this.tweens.add({
          targets: bloom,
          strength: 0.5,
          duration: 150,
          yoyo: true,
          ease: 'Sine.easeInOut',
          onComplete: () => cam.postFX?.remove(bloom),
        });
      }
    } catch { /* */ }

    // 자동 정리
    this.time.delayedCall(600, () => {
      ribbonEmitter.destroy();
      glowEmitter.destroy();
    });
  }

  /** 타이머 젬 카운트 오버레이 렌더링 */
  private renderTimedGemOverlay(row: number, col: number, x: number, y: number): void {
    // 기존 비주얼 제거
    if (this.timedGemVisuals[row]?.[col]) {
      this.timedGemVisuals[row][col]!.destroy();
      this.timedGemVisuals[row][col] = null;
    }
    const count = this.timedGemCounters[row][col];
    if (count == null) return;

    const r = TILE_DISPLAY_SIZE / 2;
    // 위험도에 따른 색상
    const color = count <= 2 ? '#f48fb1' : count <= 4 ? '#ffb74d' : '#ffd700';
    const bgAlpha = count <= 2 ? 0.25 : 0.12;

    // 배경 글로우
    const bg = this.add.graphics().setDepth(8);
    bg.fillStyle(count <= 2 ? 0xf48fb1 : 0xffb74d, bgAlpha);
    bg.fillCircle(x, y, r + 3);
    bg.lineStyle(3, count <= 2 ? 0xf48fb1 : 0xffcc80, 0.6);
    bg.strokeCircle(x, y, r);

    // 카운트 텍스트
    const text = this.add.text(x, y - r + 18, `${count}`, {
      fontSize: '26px',
      color,
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(9);

    // ⏰ 아이콘
    const icon = this.add.text(x + r - 14, y + r - 14, '⏰', {
      fontSize: '18px',
    }).setOrigin(0.5).setDepth(9);

    // 위험 펄스 (2턴 이하)
    if (count <= 2) {
      this.tweens.add({
        targets: bg,
        alpha: 0.1,
        duration: 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // 컨테이너 대신 text만 저장 (간단히)
    this.timedGemVisuals[row][col] = text;
    // bg와 icon은 씬에 남음 — 타일 제거 시 정리 필요
    // drawGrid에서 전체 리드로우하므로 큰 문제 없음
  }

  // ─── P-7: 특수 젬 발동 ────────────────────────────

  private getActivationCells(row: number, col: number, special: SpecialType, targetType?: TileType | null): { row: number; col: number }[] {
    const cells: { row: number; col: number }[] = [];

    switch (special) {
      case 'lineBlast': {
        const tile = this.tileObjects[row][col];
        const dir = tile?.lineDirection ?? (Math.random() > 0.5 ? 'horizontal' : 'vertical');
        if (dir === 'horizontal') {
          for (let c = 0; c < GRID_COLS; c++) cells.push({ row, col: c });
        } else {
          for (let r = 0; r < GRID_ROWS; r++) cells.push({ row: r, col });
        }
        break;
      }
      case 'bomb': {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const r = row + dr, c = col + dc;
            if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) {
              cells.push({ row: r, col: c });
            }
          }
        }
        break;
      }
      case 'colorBomb': {
        if (targetType) {
          for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
              if (this.grid[r][c] === targetType) cells.push({ row: r, col: c });
            }
          }
        }
        break;
      }
      case 'crossBlast': {
        // 행 + 열 전체 (십자형)
        for (let c = 0; c < GRID_COLS; c++) cells.push({ row, col: c });
        for (let r = 0; r < GRID_ROWS; r++) {
          if (r !== row) cells.push({ row: r, col });
        }
        break;
      }
      case 'wrapped': {
        // 3×3 영역 (1차 폭발) — 2차는 onCascadeSettled에서 처리
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const r = row + dr, c = col + dc;
            if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) {
              cells.push({ row: r, col: c });
            }
          }
        }
        // 2차 폭발 예약
        this.wrappedPendingBursts.push({ row, col });
        break;
      }
    }
    return cells;
  }

  private expandActivations(initialCells: { row: number; col: number }[]): { row: number; col: number }[] {
    const visited = new Set<string>();
    const queue = [...initialCells];
    const result: { row: number; col: number }[] = [];

    while (queue.length > 0) {
      const cell = queue.shift()!;
      const key = `${cell.row},${cell.col}`;
      if (visited.has(key)) continue;
      visited.add(key);
      result.push(cell);

      const sp = this.specialGrid[cell.row]?.[cell.col];
      if (sp) {
        const extra = this.getActivationCells(cell.row, cell.col, sp, this.grid[cell.row][cell.col]);
        for (const ec of extra) {
          if (!visited.has(`${ec.row},${ec.col}`)) queue.push(ec);
        }
      }
    }
    return result;
  }

  private handleSpecialCombo(r1: number, c1: number, s1: SpecialType, r2: number, c2: number, s2: SpecialType): void {
    let cells: { row: number; col: number }[] = [];

    const combo = [s1, s2].sort().join('+');

    // ── 기존 콤보 ──
    switch (combo) {
      case 'lineBlast+lineBlast':
        // 십자: 행 + 열 전체
        for (let c = 0; c < GRID_COLS; c++) cells.push({ row: r1, col: c });
        for (let r = 0; r < GRID_ROWS; r++) cells.push({ row: r, col: c1 });
        break;

      case 'bomb+lineBlast': {
        // 3행 + 3열
        const bPos = s1 === 'bomb' ? r1 : r2;
        const bCol = s1 === 'bomb' ? c1 : c2;
        for (let dr = -1; dr <= 1; dr++) {
          const r = bPos + dr;
          if (r >= 0 && r < GRID_ROWS) for (let c = 0; c < GRID_COLS; c++) cells.push({ row: r, col: c });
        }
        for (let dc = -1; dc <= 1; dc++) {
          const c = bCol + dc;
          if (c >= 0 && c < GRID_COLS) for (let r = 0; r < GRID_ROWS; r++) cells.push({ row: r, col: c });
        }
        break;
      }

      case 'bomb+bomb':
        // 5x5
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const r = r1 + dr, c = c1 + dc;
            if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) cells.push({ row: r, col: c });
          }
        }
        break;

      case 'colorBomb+colorBomb':
        // 전체 보드 클리어
        for (let r = 0; r < GRID_ROWS; r++) {
          for (let c = 0; c < GRID_COLS; c++) cells.push({ row: r, col: c });
        }
        break;

      // ── ColorBomb 강화 콤보 (같은 색 → 해당 special로 변환 후 연쇄 발동) ──
      case 'colorBomb+lineBlast': {
        const cbPos = s1 === 'colorBomb' ? { row: r1, col: c1 } : { row: r2, col: c2 };
        const otherPos = s1 === 'colorBomb' ? { row: r2, col: c2 } : { row: r1, col: c1 };
        const targetType = this.grid[otherPos.row][otherPos.col];
        cells.push(cbPos);
        if (targetType) {
          for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
              if (this.grid[r][c] === targetType) {
                this.specialGrid[r][c] = 'lineBlast';
                const tile = this.tileObjects[r][c];
                if (tile) tile.lineDirection = Math.random() > 0.5 ? 'horizontal' : 'vertical';
                cells.push({ row: r, col: c });
              }
            }
          }
        }
        break;
      }

      case 'bomb+colorBomb': {
        const cbPos2 = s1 === 'colorBomb' ? { row: r1, col: c1 } : { row: r2, col: c2 };
        const otherPos2 = s1 === 'colorBomb' ? { row: r2, col: c2 } : { row: r1, col: c1 };
        const targetType2 = this.grid[otherPos2.row][otherPos2.col];
        cells.push(cbPos2);
        if (targetType2) {
          for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
              if (this.grid[r][c] === targetType2) {
                this.specialGrid[r][c] = 'bomb';
                cells.push({ row: r, col: c });
              }
            }
          }
        }
        break;
      }

      case 'colorBomb+crossBlast': {
        const cbPos3 = s1 === 'colorBomb' ? { row: r1, col: c1 } : { row: r2, col: c2 };
        const otherPos3 = s1 === 'colorBomb' ? { row: r2, col: c2 } : { row: r1, col: c1 };
        const targetType3 = this.grid[otherPos3.row][otherPos3.col];
        cells.push(cbPos3);
        if (targetType3) {
          for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
              if (this.grid[r][c] === targetType3) {
                this.specialGrid[r][c] = 'crossBlast';
                cells.push({ row: r, col: c });
              }
            }
          }
        }
        break;
      }

      case 'colorBomb+wrapped': {
        const cbPos4 = s1 === 'colorBomb' ? { row: r1, col: c1 } : { row: r2, col: c2 };
        const otherPos4 = s1 === 'colorBomb' ? { row: r2, col: c2 } : { row: r1, col: c1 };
        const targetType4 = this.grid[otherPos4.row][otherPos4.col];
        cells.push(cbPos4);
        if (targetType4) {
          for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
              if (this.grid[r][c] === targetType4) {
                this.specialGrid[r][c] = 'wrapped';
                cells.push({ row: r, col: c });
              }
            }
          }
        }
        break;
      }

      // ── Cross Blast 콤보 ──
      case 'crossBlast+crossBlast': {
        // 3행 + 3열 (대규모 십자)
        for (let dr = -1; dr <= 1; dr++) {
          const r = r1 + dr;
          if (r >= 0 && r < GRID_ROWS) for (let c = 0; c < GRID_COLS; c++) cells.push({ row: r, col: c });
        }
        for (let dc = -1; dc <= 1; dc++) {
          const c = c1 + dc;
          if (c >= 0 && c < GRID_COLS) for (let r = 0; r < GRID_ROWS; r++) cells.push({ row: r, col: c });
        }
        break;
      }

      case 'crossBlast+lineBlast':
        // 행+열 십자 (lineBlast+lineBlast와 동일)
        for (let c = 0; c < GRID_COLS; c++) cells.push({ row: r1, col: c });
        for (let r = 0; r < GRID_ROWS; r++) cells.push({ row: r, col: c1 });
        break;

      case 'bomb+crossBlast': {
        // 행+열 전체 + 3×3 영역
        const crossPos = s1 === 'crossBlast' ? { row: r1, col: c1 } : { row: r2, col: c2 };
        const bombPos = s1 === 'bomb' ? { row: r1, col: c1 } : { row: r2, col: c2 };
        for (let c = 0; c < GRID_COLS; c++) cells.push({ row: crossPos.row, col: c });
        for (let r = 0; r < GRID_ROWS; r++) cells.push({ row: r, col: crossPos.col });
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const r = bombPos.row + dr, c = bombPos.col + dc;
            if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) cells.push({ row: r, col: c });
          }
        }
        break;
      }

      case 'crossBlast+wrapped': {
        // 십자 + 2차 폭발 예약
        const crossP = s1 === 'crossBlast' ? { row: r1, col: c1 } : { row: r2, col: c2 };
        const wrapP = s1 === 'wrapped' ? { row: r1, col: c1 } : { row: r2, col: c2 };
        for (let c = 0; c < GRID_COLS; c++) cells.push({ row: crossP.row, col: c });
        for (let r = 0; r < GRID_ROWS; r++) cells.push({ row: r, col: crossP.col });
        this.wrappedPendingBursts.push(wrapP);
        break;
      }

      // ── Wrapped 콤보 ──
      case 'wrapped+wrapped':
        // 5×5 + 2차 폭발 예약
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const r = r1 + dr, c = c1 + dc;
            if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) cells.push({ row: r, col: c });
          }
        }
        this.wrappedPendingBursts.push({ row: r1, col: c1 });
        break;

      case 'lineBlast+wrapped': {
        // 3행 클리어
        const wPos = s1 === 'wrapped' ? { row: r1, col: c1 } : { row: r2, col: c2 };
        for (let dr = -1; dr <= 1; dr++) {
          const r = wPos.row + dr;
          if (r >= 0 && r < GRID_ROWS) for (let c = 0; c < GRID_COLS; c++) cells.push({ row: r, col: c });
        }
        break;
      }

      case 'bomb+wrapped': {
        // 5×5 + 2차 폭발 예약
        const center = { row: r1, col: c1 };
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const r = center.row + dr, c = center.col + dc;
            if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) cells.push({ row: r, col: c });
          }
        }
        this.wrappedPendingBursts.push(center);
        break;
      }
    }

    // 중복 제거 + 연쇄 발동
    const expanded = this.expandActivations(cells);

    // 특수 콤보 발동 시각 효과
    const tile1 = this.tileObjects[r1][c1];
    const tile2 = this.tileObjects[r2][c2];
    this.playSpecialActivationEffect(r1, c1, s1, tile1?.lineDirection);
    this.playSpecialActivationEffect(r2, c2, s2, tile2?.lineDirection);

    this.cascadeDepth++;
    this.calculateScore(expanded);
    this.trackGoal(expanded);
    this.processBlockers(expanded);

    this.animateRemoval(expanded, () => {
      for (const c of expanded) {
        this.grid[c.row][c.col] = null;
        this.specialGrid[c.row][c.col] = null;
        this.tileObjects[c.row][c.col] = null;
      }
      this.dropAndFill(() => {
        const newGroups = this.findAllMatchGroups();
        if (newGroups.length > 0) {
          this.processMatchGroups(newGroups);
        } else {
          this.onCascadeSettled();
        }
      });
    });
  }

  // ─── 캐스케이드 종료 처리 (Wrapped 2차 폭발 + 타이머 젬 + 게임 종료) ──

  /** 현재 보드 상태를 RunSnapshot으로 캡처 */
  private captureSnapshot(): RunSnapshot {
    const lineDirections: ('horizontal' | 'vertical' | null)[][] = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      lineDirections[row] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        lineDirections[row][col] = this.tileObjects[row]?.[col]?.lineDirection ?? null;
      }
    }
    return {
      version: 1,
      phase: 'playing' as const,
      level: this.currentLevel.level,
      grid: this.grid.map(r => [...r]),
      specialGrid: this.specialGrid.map(r => [...r]),
      lineDirections,
      cellModifiers: this.cellModifiers.map(r => r.map(m => (m ? { ...m } as CellModifier : null))),
      timedGemCounters: this.timedGemCounters.map(r => [...r]),
      movesLeft: this.movesLeft,
      score: this.score,
      goalCollected: this.goalCollected,
      iceCleared: this.iceCleared,
      stoneCleared: this.stoneCleared,
      secondChanceUsed: this.secondChanceUsed,
      savedAt: Date.now(),
    };
  }

  /** 모든 캐스케이드 완료 후 호출되는 통합 핸들러 */
  private onCascadeSettled(): void {
    // 1. Wrapped 2차 폭발 처리
    if (this.wrappedPendingBursts.length > 0) {
      this.processWrappedBurst();
      return;
    }

    // 2. 타이머 젬 감소 (플레이어 무브당 1회만)
    if (this.timedGemDecrementPending) {
      this.timedGemDecrementPending = false;
      if (this.processTimedGems()) return; // 폭발이 발생하면 새 캐스케이드 진행
    }

    // 3. 게임 종료 체크
    this.isAnimating = false;
    // 보드가 안정된 시점에 런 스냅샷 저장
    // movesLeft > 0 조건: 이동 소진 직후(= 게임오버 직전) 상태를 저장하지 않음
    // → 세컨드 찬스 흐름에서 직전 저장(이동 있을 때)이 그대로 보존됨
    if (!this.gameOver && this.movesLeft > 0) {
      saveRun(this.captureSnapshot());
    }
    this.checkGameEnd();
  }

  /** Wrapped 젬 2차 폭발 처리 */
  private processWrappedBurst(): void {
    const burst = this.wrappedPendingBursts.shift()!;
    const { x, y } = this.getTilePosition(burst.row, burst.col);

    // 2차 폭발 이펙트
    this.playWrappedEffect(x, y, 'secondary');
    SoundManager.getInstance().playWrappedFinale();
    this.shakeCamera(110, 0.0012);

    // 3×3 영역 재폭발
    const cells: { row: number; col: number }[] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = burst.row + dr, c = burst.col + dc;
        if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS && this.grid[r][c]) {
          cells.push({ row: r, col: c });
        }
      }
    }

    if (cells.length === 0) {
      this.onCascadeSettled();
      return;
    }

    this.cascadeDepth++;
    this.calculateScore(cells);
    this.trackGoal(cells);
    this.processBlockers(cells);

    // 발동 확장 (2차 폭발이 또 다른 특수 젬을 터뜨릴 수 있음)
    const expanded = this.expandActivations(cells);

    this.animateRemoval(expanded, () => {
      for (const c of expanded) {
        this.grid[c.row][c.col] = null;
        this.specialGrid[c.row][c.col] = null;
        if (this.tileObjects[c.row][c.col]) {
          this.tileObjects[c.row][c.col]!.container.destroy();
          this.tileObjects[c.row][c.col] = null;
        }
      }
      this.dropAndFill(() => {
        const newGroups = this.findAllMatchGroups();
        if (newGroups.length > 0) {
          this.processMatchGroups(newGroups);
        } else {
          this.onCascadeSettled();
        }
      });
    });
  }

  /** 타이머 젬 감소 처리 — 폭발 발생 시 true 반환 */
  private processTimedGems(): boolean {
    const exploding: { row: number; col: number }[] = [];

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (this.timedGemCounters[row]?.[col] != null) {
          this.timedGemCounters[row][col]!--;
          if (this.timedGemCounters[row][col]! <= 0) {
            exploding.push({ row, col });
            this.timedGemCounters[row][col] = null;
          }
          // 비주얼 업데이트
          this.updateTimedGemVisual(row, col);
        }
      }
    }

    if (exploding.length === 0) return false;

    // 타이머 젬 폭발 (3×3 영역)
    const allCells: { row: number; col: number }[] = [];
    for (const pos of exploding) {
      const { x, y } = this.getTilePosition(pos.row, pos.col);
      this.playTimedGemExplosionEffect(x, y);
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const r = pos.row + dr, c = pos.col + dc;
          if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS && this.grid[r][c]) {
            allCells.push({ row: r, col: c });
          }
        }
      }
    }

    // 중복 제거
    const uniqueMap = new Map<string, { row: number; col: number }>();
    for (const c of allCells) uniqueMap.set(`${c.row},${c.col}`, c);
    const cells = Array.from(uniqueMap.values());

    const expanded = this.expandActivations(cells);
    this.cascadeDepth++;
    this.calculateScore(expanded);
    this.trackGoal(expanded);
    this.processBlockers(expanded);

    SoundManager.getInstance().playBomb();
    this.cameras.main.shake(120, 0.0015);

    this.animateRemoval(expanded, () => {
      for (const c of expanded) {
        this.grid[c.row][c.col] = null;
        this.specialGrid[c.row][c.col] = null;
        if (this.tileObjects[c.row][c.col]) {
          this.tileObjects[c.row][c.col]!.container.destroy();
          this.tileObjects[c.row][c.col] = null;
        }
      }
      this.dropAndFill(() => {
        const newGroups = this.findAllMatchGroups();
        if (newGroups.length > 0) {
          this.processMatchGroups(newGroups);
        } else {
          this.onCascadeSettled();
        }
      });
    });

    return true;
  }

  /** 타이머 젬 개별 비주얼 업데이트 */
  private updateTimedGemVisual(row: number, col: number): void {
    const count = this.timedGemCounters[row]?.[col];
    if (this.timedGemVisuals[row]?.[col]) {
      if (count == null) {
        this.timedGemVisuals[row][col]!.destroy();
        this.timedGemVisuals[row][col] = null;
      } else {
        this.timedGemVisuals[row][col]!.setText(`${count}`);
        this.timedGemVisuals[row][col]!.setColor(count <= 2 ? '#ff1744' : count <= 4 ? '#ff9100' : '#ffd600');
      }
    }
  }

  /** 타이머 젬 폭발 이펙트 */
  private playTimedGemExplosionEffect(x: number, y: number): void {
    // 시계 파편 이펙트
    const clockParts = ['⏰', '⏱️', '💥'];
    for (let i = 0; i < 8; i++) {
      const part = this.add.text(x, y, clockParts[i % clockParts.length], {
        fontSize: `${16 + Math.random() * 12}px`,
      }).setOrigin(0.5).setDepth(19);
      const angle = (Math.PI * 2 / 8) * i;
      this.tweens.add({
        targets: part,
        x: x + Math.cos(angle) * (60 + Math.random() * 50),
        y: y + Math.sin(angle) * (60 + Math.random() * 50),
        alpha: 0, rotation: Math.random() * 3,
        duration: 400,
        ease: 'Cubic.easeOut',
        onComplete: () => part.destroy(),
      });
    }

    // 핑크 충격파
    const ring = this.add.graphics().setDepth(18).setPosition(x, y);
    ring.lineStyle(6, 0xf48fb1, 0.9);
    ring.strokeCircle(0, 0, 15);
    ring.setScale(0.3);
    this.tweens.add({
      targets: ring,
      scaleX: 3, scaleY: 3, alpha: 0,
      duration: 400,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  // ─── 라이트닝 부스터 ──────────────────────────────

  /** 라이트닝 모드 진입 */
  private enterLightningMode(): void {
    if (this.lightningMode || this.isAnimating || this.gameOver) return;
    this.lightningMode = true;
    vibrateTap();

    // 보드에 반투명 오버레이 + 안내
    this.lightningOverlay = this.add.graphics().setDepth(35);
    this.lightningOverlay.fillStyle(0x7b2fbe, 0.12);
    this.lightningOverlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const hint = this.add.text(GAME_WIDTH / 2, BOARD_Y - BOARD_HEIGHT / 2 - 50, '🪄 없앨 타일을 탭하세요!', {
      fontSize: '36px',
      color: '#f9a8d4',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(36);

    // 오버레이 전체 화면 인터랙티브 — 클릭 좌표로 타일/빈곳 판별
    this.lightningOverlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains
    );

    this.lightningOverlay.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.lightningMode) return;
      // 클릭 좌표 → 그리드 좌표 변환
      const col = Math.round((pointer.x - BOARD_OFFSET_X) / TILE_TOTAL);
      const row = Math.round((pointer.y - BOARD_OFFSET_Y) / TILE_TOTAL);

      if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS && this.grid[row]?.[col]) {
        hint.destroy();
        this.activateLightning(row, col);
      } else {
        // 빈 곳 탭 → 취소
        hint.destroy();
        this.exitLightningMode();
      }
    });

    // 5초 후 자동 취소
    this.time.delayedCall(5000, () => {
      if (this.lightningMode) this.exitLightningMode();
      if (hint?.active) hint.destroy();
    });
  }

  /** 라이트닝 모드 종료 */
  private exitLightningMode(): void {
    this.lightningMode = false;
    if (this.lightningOverlay) {
      this.lightningOverlay.destroy();
      this.lightningOverlay = null;
    }
  }

  /** 라이트닝 부스터 발동 — 타일 1개 + 인접 4방향 파괴 */
  private activateLightning(row: number, col: number): void {
    this.exitLightningMode();
    if (!consumeStoredBooster('lightning')) return;
    this.lightningBoosterCount--;
    this.lightningBadgeText.setText(`${this.lightningBoosterCount}`);
    this.isAnimating = true;

    const cells: { row: number; col: number }[] = [{ row, col }];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const r = row + dr, c = col + dc;
      if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS && this.grid[r][c]) {
        cells.push({ row: r, col: c });
      }
    }

    // ─── 마법 완드 이펙트 ──────────────────────────────────────
    const { x, y } = this.getTilePosition(row, col);

    // 1. 완드: 우상단 → 타일 중심으로 스윙
    const wand = this.add.text(x + 220, y - 220, '🪄', { fontSize: '88px' })
      .setOrigin(0.5).setDepth(40).setAngle(-40);
    this.tweens.add({
      targets: wand,
      x,
      y: y - 10,
      angle: -5,
      duration: 220,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: wand,
          x: x - 80, y: y - 120,
          alpha: 0,
          scaleX: 0.6, scaleY: 0.6,
          duration: 250,
          ease: 'Cubic.easeIn',
          onComplete: () => wand.destroy(),
        });
      },
    });

    // 2. 완드 팁 골드 플래시 — 부드러운 원형 확산
    const tipFlash = this.add.graphics().setDepth(42);
    tipFlash.fillStyle(0xffe066, 0.75);
    tipFlash.fillCircle(x, y, 32);
    this.tweens.add({
      targets: tipFlash,
      scaleX: 3, scaleY: 3,
      alpha: 0,
      duration: 320,
      delay: 200,
      ease: 'Cubic.easeOut',
      onComplete: () => tipFlash.destroy(),
    });

    // 3. 별 파티클 8개 산란
    const starAngles = [0, 45, 90, 135, 180, 225, 270, 315];
    starAngles.forEach((angle, i) => {
      const rad = Phaser.Math.DegToRad(angle);
      const dist = 75 + Math.random() * 55;
      const star = this.add.text(x, y, '✨', {
        fontSize: `${26 + Math.floor(Math.random() * 18)}px`,
      }).setOrigin(0.5).setDepth(38);
      this.tweens.add({
        targets: star,
        x: x + Math.cos(rad) * dist,
        y: y + Math.sin(rad) * dist,
        scaleX: 0.2, scaleY: 0.2,
        alpha: 0,
        duration: 480 + i * 25,
        delay: 210,
        ease: 'Quad.easeOut',
        onComplete: () => star.destroy(),
      });
    });

    // 4. 글리터 — 위로 떠오르는 별빛 5개
    for (let i = 0; i < 5; i++) {
      const gx = x + (Math.random() - 0.5) * 90;
      const gy = y + (Math.random() - 0.5) * 60;
      const glitter = this.add.text(gx, gy, '⭐', { fontSize: '16px' })
        .setOrigin(0.5).setDepth(36);
      this.tweens.add({
        targets: glitter,
        y: gy - 90 - Math.random() * 60,
        alpha: 0,
        duration: 750 + i * 90,
        delay: 240 + i * 70,
        ease: 'Cubic.easeOut',
        onComplete: () => glitter.destroy(),
      });
    }

    // 장애물 처리 + 확장
    this.processBlockers(cells);
    const expanded = this.expandActivations(cells);

    this.time.delayedCall(220, () => {
      SoundManager.getInstance().playZap();
      vibrateSpecial();
      this.shakeCamera(80, 0.001);
      this.cascadeDepth = 1;
      this.calculateScore(expanded);
      this.trackGoal(expanded);

      this.animateRemoval(expanded, () => {
        for (const c of expanded) {
          this.grid[c.row][c.col] = null;
          this.specialGrid[c.row][c.col] = null;
          if (this.tileObjects[c.row][c.col]) {
            this.tileObjects[c.row][c.col]!.container.destroy();
            this.tileObjects[c.row][c.col] = null;
          }
        }
        this.dropAndFill(() => {
          const newGroups = this.findAllMatchGroups();
          if (newGroups.length > 0) {
            this.processMatchGroups(newGroups);
          } else {
            this.onCascadeSettled();
          }
        });
      });
    });
  }

  private dropAndFill(onComplete: () => void): void {
    const tweens: Promise<void>[] = [];

    // 열별로 처리
    for (let col = 0; col < GRID_COLS; col++) {
      // 아래에서 위로 빈칸 채우기
      let emptyRow = GRID_ROWS - 1;

      // 1단계: 기존 타일 낙하
      for (let row = GRID_ROWS - 1; row >= 0; row--) {
        // 돌 셀은 건너뛰기 (블록킹)
        if (this.isStoneCell(row, col)) {
          emptyRow = row - 1; // 돌 위로만 채움
          continue;
        }
        if (this.isStoneCell(emptyRow, col)) {
          emptyRow--;
          if (emptyRow < 0) break;
        }
        if (this.grid[row][col] !== null) {
          if (row !== emptyRow) {
            // 타일을 emptyRow로 이동
            this.grid[emptyRow][col] = this.grid[row][col];
            this.grid[row][col] = null;
            this.specialGrid[emptyRow][col] = this.specialGrid[row][col];
            this.specialGrid[row][col] = null;

            const tileData = this.tileObjects[row][col];
            this.tileObjects[emptyRow][col] = tileData;
            this.tileObjects[row][col] = null;

            if (tileData) {
              tileData.row = emptyRow;
              tileData.col = col;
              const targetPos = this.getTilePosition(emptyRow, col);
              const distance = emptyRow - row;

              tweens.push(new Promise<void>(resolve => {
                this.tweens.add({
                  targets: tileData.container,
                  y: targetPos.y,
                  duration: FALL_DURATION_PER_ROW * distance,
                  ease: 'Cubic.easeIn',
                  onComplete: () => {
                    // Squash & Stretch 착지 효과
                    this.tweens.chain({
                      targets: tileData.container,
                      tweens: [
                        { scaleY: 0.78, scaleX: 1.22, duration: 50, ease: 'Cubic.easeOut' },
                        { scaleY: 1.04, scaleX: 0.96, duration: 70, ease: 'Sine.easeInOut' },
                        { scaleY: 1, scaleX: 1, duration: 50, ease: 'Sine.easeOut' },
                      ],
                      onComplete: () => resolve(),
                    });
                  },
                });
              }));
            }
          }
          emptyRow--;
        }
      }

      // 2단계: 빈칸에 새 타일 채우기 (위에서 떨어지는 효과)
      for (let row = emptyRow; row >= 0; row--) {
        // 돌 셀은 건너뛰기
        if (this.isStoneCell(row, col)) continue;
        const newType = this.activeTileTypes[Phaser.Math.Between(0, this.activeTileTypes.length - 1)];
        this.grid[row][col] = newType;
        this.specialGrid[row][col] = null;

        const targetPos = this.getTilePosition(row, col);
        const startY = BOARD_OFFSET_Y - TILE_TOTAL * (emptyRow - row + 1);

        const tileData = this.createTile(targetPos.x, startY, row, col, newType);
        this.tileObjects[row][col] = tileData;

        const distance = emptyRow - row + 1;
        tweens.push(new Promise<void>(resolve => {
          this.tweens.add({
            targets: tileData.container,
            y: targetPos.y,
            duration: FALL_DURATION_PER_ROW * distance + 50,
            ease: 'Cubic.easeIn',
            delay: 50 * (emptyRow - row),
            onComplete: () => {
              // Squash & Stretch 착지 효과
              this.tweens.chain({
                targets: tileData.container,
                tweens: [
                  { scaleY: 0.78, scaleX: 1.22, duration: 50, ease: 'Cubic.easeOut' },
                  { scaleY: 1.04, scaleX: 0.96, duration: 70, ease: 'Sine.easeInOut' },
                  { scaleY: 1, scaleX: 1, duration: 50, ease: 'Sine.easeOut' },
                ],
                onComplete: () => resolve(),
              });
            },
          });
        }));
      }
    }

    // 모든 낙하 완료 후 콜백
    Promise.all(tweens).then(() => {
      if (tweens.length > 0) SoundManager.getInstance().playTileLand();
      onComplete();
    });
  }

  // ─── P-6: 점수 / 이동 / 목표 시스템 ──────────────
  private calculateScore(matches: { row: number; col: number }[]): void {
    // 매치 그룹별로 점수 계산 (연결된 타일 묶음 분리)
    const matchCount = matches.length;
    const baseScore = SCORE_BASE + SCORE_PER_EXTRA * Math.max(0, matchCount - 3);
    const comboMultiplier = 1 + COMBO_MULTIPLIER * (this.cascadeDepth - 1);
    const earned = Math.round(baseScore * comboMultiplier);

    this.score += earned;
    this.updateScoreDisplay();

    // 점수 팝업 애니메이션
    this.showScorePopup(matches, earned);
  }

  private trackGoal(matches: { row: number; col: number }[]): void {
    const collectGoal = this.currentLevel.goals.find(g => g.type === 'collect');
    if (collectGoal?.tileType) {
      let goalCount = 0;
      for (const { row, col } of matches) {
        if (this.grid[row][col] === collectGoal.tileType) goalCount++;
      }
      if (goalCount > 0) {
        this.goalCollected = Math.min(this.goalCollected + goalCount, collectGoal.count);
      }
    }
    // ice/stone 골은 reduceIce/reduceStone에서 자동 추적
    this.updateGoalDisplay();
  }

  private updateScoreDisplay(): void {
    // 점수 카운트업 애니메이션
    const from = this.displayScore;
    const to = this.score;
    this.tweens.addCounter({
      from,
      to,
      duration: Math.min(400, (to - from) * 2),
      ease: 'Cubic.easeOut',
      onUpdate: (tween) => {
        this.displayScore = Math.round(tween.getValue() ?? 0);
        this.scoreText.setText(this.displayScore.toLocaleString());
      },
    });

    // 점수 변경 시 펀치 애니메이션
    this.tweens.add({
      targets: this.scoreText,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 80,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  private updateMovesDisplay(): void {
    this.movesLeft = Math.max(0, this.movesLeft);
    this.movesText.setText(`${this.movesLeft}`);

    // 남은 횟수 적으면 색상 강조
    if (this.movesLeft <= 5) {
      this.movesText.setColor('#ba1a1a');
      this.tweens.add({
        targets: this.movesText,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 100,
        yoyo: true,
        ease: 'Back.easeOut',
      });
    }

    // 3 이하: 위기 펄스 애니메이션 (반복 빨간 펄스)
    if (this.movesLeft <= 3 && this.movesLeft > 0) {
      // 기존 펄스 중복 방지
      if (!this.movesText.getData('pulsing')) {
        this.movesText.setData('pulsing', true);
        this.tweens.add({
          targets: this.movesText,
          alpha: 0.4,
          duration: 400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
      // 카메라 미세 흔들림 (1회)
      this.cameras.main.shake(100, 0.001);
    }
  }

  private updateGoalDisplay(): void {
    const goals = this.currentLevel.goals;
    const isMulti = goals.length > 1;
    const hudY = 40;
    const hudHeight = 200;
    const centerY = hudY + hudHeight / 2;

    goals.forEach((goal, idx) => {
      if (!this.goalTexts[idx]) return;

      // 현재 진행도
      let current = 0;
      switch (goal.type) {
        case 'collect': current = this.goalCollected; break;
        case 'clearIce': current = this.iceCleared; break;
        case 'clearStone': current = this.stoneCleared; break;
      }

      const remaining = Math.max(0, goal.count - current);
      const progress = Math.min(current / goal.count, 1);

      // 완료 체크마크 or 남은 수
      if (remaining <= 0) {
        this.goalTexts[idx].setText('✓');
        this.goalTexts[idx].setColor('#4caf50');
      } else {
        this.goalTexts[idx].setText(`${remaining}`);
        this.goalTexts[idx].setColor('#690008');
      }

      // 프로그레스 바 업데이트
      const fill = this.goalProgressFills[idx];
      if (fill) {
        fill.clear();
        const barColor = progress >= 1 ? 0x4caf50 : COLORS.primaryContainer;
        fill.fillStyle(barColor, 1);

        if (!isMulti) {
          const barWidth = Math.round(140 * progress);
          if (barWidth > 0) {
            fill.fillRoundedRect(245, centerY + 11, barWidth, 10, 5);
          }
        } else {
          const panelX = 36;
          const panelW = 420;
          const panelH = 108;
          const rowH = panelH / goals.length;
          const rowY = centerY - panelH / 2 + rowH * idx + rowH / 2;
          const barX = panelX + 165;
          const barW = panelW - 165 - 24;
          const barH = 8;
          const fillW = Math.round(barW * progress);
          if (fillW > 0) {
            fill.fillRoundedRect(barX, rowY - barH / 2, fillW, barH, barH / 2);
          }
        }
      }
    });

    // 펀치 애니메이션
    if (this.goalTexts.length > 0) {
      this.tweens.add({
        targets: this.goalTexts,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 80,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
    }
  }

  private showScorePopup(matches: { row: number; col: number }[], earned: number): void {
    // 매칭 중앙 좌표 계산
    let cx = 0, cy = 0;
    for (const { row, col } of matches) {
      const pos = this.getTilePosition(row, col);
      cx += pos.x;
      cy += pos.y;
    }
    cx /= matches.length;
    cy /= matches.length;

    const comboText = this.cascadeDepth > 1 ? ` x${this.cascadeDepth}` : '';
    const fontSize = this.cascadeDepth > 2 ? '56px' : this.cascadeDepth > 1 ? '50px' : '44px';
    const color = this.cascadeDepth > 2 ? '#ff6b35' : this.cascadeDepth > 1 ? '#d32f2f' : '#690008';

    const popup = this.add.text(cx, cy, `+${earned}${comboText}`, {
      fontSize,
      color,
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(20).setScale(0);

    // 스케일 바운스 등장
    this.tweens.add({
      targets: popup,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 150,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: popup,
          scaleX: 1,
          scaleY: 1,
          duration: 100,
          ease: 'Sine.easeInOut',
        });
      },
    });

    // 위로 날아가며 페이드
    this.tweens.add({
      targets: popup,
      y: cy - 100,
      alpha: 0,
      duration: 1000,
      delay: 200,
      ease: 'Cubic.easeOut',
      onComplete: () => popup.destroy(),
    });
  }

  private checkGameEnd(): void {
    // 모든 목표 달성 여부 체크
    if (this.areAllGoalsMet()) {
      this.showGameOverPopup(true);
      return;
    }
    // 이동 횟수 소진 체크
    if (this.movesLeft <= 0) {
      this.showGameOverPopup(false);
      return;
    }
    // 교착 상태 체크 (유효한 스왑이 없으면 셔플)
    if (!this.hasValidMove()) {
      this.shuffleBoard();
    }
  }

  /** 모든 레벨 목표가 달성되었는지 확인 */
  private areAllGoalsMet(): boolean {
    for (const goal of this.currentLevel.goals) {
      switch (goal.type) {
        case 'collect':
          if (this.goalCollected < goal.count) return false;
          break;
        case 'clearIce':
          if (this.iceCleared < goal.count) return false;
          break;
        case 'clearStone':
          if (this.stoneCleared < goal.count) return false;
          break;
      }
    }
    return true;
  }

  /** 유효한 스왑이 하나라도 있는지 확인 (특수젬 직접 발동 포함) */
  private hasValidMove(): boolean {
    // 특수젬 직접 탭 발동도 유효한 수
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (this.specialGrid[row]?.[col]) return true;
      }
    }
    // 일반 스왑 체크
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (this.isStoneCell(row, col) || this.cellModifiers[row]?.[col]?.type === 'chain') continue;
        if (col < GRID_COLS - 1
          && !this.isStoneCell(row, col + 1)
          && this.cellModifiers[row]?.[col + 1]?.type !== 'chain'
          && this.hasMatchAtSwap(row, col, row, col + 1)) return true;
        if (row < GRID_ROWS - 1
          && !this.isStoneCell(row + 1, col)
          && this.cellModifiers[row + 1]?.[col]?.type !== 'chain'
          && this.hasMatchAtSwap(row, col, row + 1, col)) return true;
      }
    }
    return false;
  }

  /** grid 배열만 스왑 (tileObjects 건드리지 않음 — 체크용) */
  private swapGridDataOnly(r1: number, c1: number, r2: number, c2: number): void {
    const temp = this.grid[r1][c1];
    this.grid[r1][c1] = this.grid[r2][c2];
    this.grid[r2][c2] = temp;
  }

  /** 보드 셔플 — 매칭 없이 유효 스왑이 있을 때까지 반복 */
  private shuffleBoard(): void {
    // 셔플 안내 텍스트
    const notice = this.add.text(GAME_WIDTH / 2, BOARD_Y, 'Shuffle!', {
      fontSize: '56px', color: '#690008', fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(30).setAlpha(0);

    this.tweens.add({
      targets: notice,
      alpha: 1,
      duration: 300,
      yoyo: true,
      hold: 400,
      onComplete: () => notice.destroy(),
    });

    // 일반 타일만 모아서 셔플 (특수 젬 보존)
    const normalPositions: { row: number; col: number }[] = [];
    const types: TileType[] = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (this.grid[row][col] && !this.specialGrid[row][col]) {
          normalPositions.push({ row, col });
          types.push(this.grid[row][col]!);
        }
      }
    }

    let attempts = 0;
    do {
      Phaser.Utils.Array.Shuffle(types);
      for (let i = 0; i < normalPositions.length; i++) {
        const { row, col } = normalPositions[i];
        this.grid[row][col] = types[i];
      }
      attempts++;
    } while ((this.findAllMatches().length > 0 || !this.hasValidMove()) && attempts < 100);

    // 안전 장치: 100회 시도 후에도 매칭이 남아있으면 강제 제거
    if (this.findAllMatches().length > 0) {
      for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
          if (this.specialGrid[row][col]) continue;
          let safety = 0;
          while (this.wouldCauseMatch(row, col, this.grid[row][col]!) && safety < this.activeTileTypes.length) {
            this.grid[row][col] = this.activeTileTypes[(this.activeTileTypes.indexOf(this.grid[row][col]!) + 1) % this.activeTileTypes.length];
            safety++;
          }
        }
      }
    }

    // 타일 오브젝트 시각 업데이트
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const tileData = this.tileObjects[row][col];
        const lineDir = tileData?.lineDirection;
        if (tileData) tileData.container.destroy();

        // 얼음/체인 오버레이 임시 숨김 (타일과 동시 등장을 위해)
        const modVisuals = this.modifierVisuals[row][col] ?? [];
        modVisuals.forEach(v => { (v as any).setAlpha(0); });

        const type = this.grid[row][col]!;
        const special = this.specialGrid[row][col] ?? undefined;
        const { x, y } = this.getTilePosition(row, col);
        this.tileObjects[row][col] = this.createTile(x, y, row, col, type, special, lineDir);

        // 셔플 등장 애니메이션 — 타일과 오버레이 동시 시작
        const tile = this.tileObjects[row][col]!;
        const delay = (row * GRID_COLS + col) * 15;
        tile.container.setScale(0);
        this.tweens.add({
          targets: tile.container,
          scaleX: 1,
          scaleY: 1,
          duration: 300,
          ease: 'Back.easeOut',
          delay,
        });
        if (modVisuals.length > 0) {
          this.tweens.add({
            targets: modVisuals,
            alpha: 1,
            duration: 300,
            delay,
            ease: 'Linear',
          });
        }
      }
    }
  }

  private showGameOverPopup(isWin: boolean): void {
    this.gameOver = true;
    // WIN 확정: 즉시 삭제 (레벨이 끝났으므로 복구 불필요)
    // LOSE: 여기서 삭제하지 않음 — 세컨드 찬스 사용 시 이전 스냅샷을 보존해야 함
    //        최종 삭제는 showFailPopup()의 Retry / Back to Map 핸들러에서 수행
    if (isWin) {
      clearRun();
      // 이슈 5A: Sugar Rush 이전 즉시 진행도 저장 (중복 방지)
      // Sugar Rush 도중 앱이 종료되어도 다음 레벨 해금이 보장된다
      if (!this.progressSaved) {
        this.progressSaved = true;
        updateLevelProgress(
          this.currentLevel.level, this.score, this.currentLevel.starThresholds,
        );
      }
    }

    if (isWin && this.movesLeft > 0) {
      // 남은 이동 보너스 연출 후 팝업 표시
      this.playRemainingMovesBonus(() => {
        SoundManager.getInstance().playLevelClear();
        this.showWinPopup();
      });
    } else {
      const sound = SoundManager.getInstance();
      if (isWin) sound.playLevelClear(); else sound.playGameOver();
      if (isWin) this.showWinPopup(); else this.showFailPopup();
    }
  }

  // ─── 남은 이동 보너스 연출 (Sweet Crunch!) ──────────
  // 최대 3개만 실제 특수젬 연출, 나머지는 즉시 점수로 추가 (99콤보 방지)
  private playRemainingMovesBonus(onComplete: () => void): void {
    const totalBonusMoves = this.movesLeft;
    // 최대 3개만 시각 연출 (실제 보드 조작)
    const visualMoves = Math.min(totalBonusMoves, 3);
    // 나머지는 즉시 flatBonus로 점수 추가
    const flatBonusMoves = totalBonusMoves - visualMoves;

    this.movesLeft = 0;
    this.movesText.setText('0');

    // 즉시 점수 추가 (flatBonus — 애니메이션 없음)
    if (flatBonusMoves > 0) {
      const flatBonus = flatBonusMoves * 100;
      this.score += flatBonus;
      this.displayScore = this.score;
      this.scoreText.setText(`${this.score}`);
    }

    // "Sweet Crunch!" 배너
    const banner = this.add.text(GAME_WIDTH / 2, BOARD_Y - BOARD_HEIGHT / 2 - 80, 'Sweet Crunch!', {
      fontSize: '80px',
      color: '#ffd700',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
      stroke: '#690008',
      strokeThickness: 10,
    }).setOrigin(0.5).setDepth(30).setScale(0);

    this.tweens.add({
      targets: banner,
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      ease: 'Back.easeOut',
    });

    // 배너 유지 후 페이드 (visualMoves 개수에 맞게 짧게)
    this.tweens.add({
      targets: banner,
      alpha: 0,
      y: banner.y - 40,
      duration: 500,
      delay: 1200 + visualMoves * 350,
      ease: 'Cubic.easeOut',
      onComplete: () => banner.destroy(),
    });

    if (visualMoves === 0) {
      // 연출 없이 바로 팝업
      this.time.delayedCall(600, () => onComplete());
      return;
    }

    // 빈 셀이 아닌 랜덤 위치에 특수 젬 배치 → 폭발 (최대 3개)
    const specials: SpecialType[] = ['lineBlast', 'bomb', 'colorBomb', 'crossBlast', 'wrapped'];

    // 매 단계마다 현재 보드 상태 기준으로 유효한 칸을 재선정한다.
    // (앞선 폭발이 뒤에 올 타깃 칸을 지웠을 수 있으므로 미리 수집하지 않는다)
    const pickValidTarget = (): { row: number; col: number } | null => {
      const live: { row: number; col: number }[] = [];
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          if (this.grid[r][c] !== null && this.tileObjects[r][c] !== null) {
            live.push({ row: r, col: c });
          }
        }
      }
      if (live.length === 0) return null;
      return live[Math.floor(Math.random() * live.length)];
    };

    let remaining = visualMoves;
    let specialIdx = 0;
    const activateNext = () => {
      if (remaining <= 0) {
        // 모든 보너스 폭발 완료 → 낙하 후 즉시 팝업 (추가 캐스케이드 없음)
        this.time.delayedCall(400, () => onComplete());
        return;
      }
      remaining--;

      const target = pickValidTarget();
      if (!target) {
        // 유효한 칸이 없으면 조용히 종료
        this.time.delayedCall(400, () => onComplete());
        return;
      }
      const { row, col } = target;
      const specialType = specials[specialIdx % specials.length];
      specialIdx++;

      // 배치 직전 재확인 (pickValidTarget 이후 상태가 바뀌는 경우 방어)
      if (!this.grid[row][col] || !this.tileObjects[row][col]) {
        this.time.delayedCall(200, () => activateNext());
        return;
      }

      // 특수 젬으로 변환 시각 효과
      this.specialGrid[row][col] = specialType;
      const oldTile = this.tileObjects[row][col];
      if (oldTile) oldTile.container.destroy();
      const pos = this.getTilePosition(row, col);
      const type = this.grid[row][col]!;
      const lineDir = specialType === 'lineBlast' ? (Math.random() > 0.5 ? 'horizontal' as const : 'vertical' as const) : undefined;
      this.tileObjects[row][col] = this.createTile(pos.x, pos.y, row, col, type, specialType, lineDir);
      const tile = this.tileObjects[row][col]!;
      tile.container.setScale(0);

      SoundManager.getInstance().playSpecialCreate();
      this.tweens.add({
        targets: tile.container,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 200,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: tile.container,
            scaleX: 1,
            scaleY: 1,
            duration: 100,
          });

          // 발동 후 폭발
          this.time.delayedCall(150, () => {
            const effect = this.getActivationCells(row, col, specialType, type);
            effect.push({ row, col });
            const expanded = this.expandActivations(effect);

            this.playSpecialActivationEffect(row, col, specialType, lineDir);
            this.cascadeDepth++;
            this.calculateScore(expanded);

            this.animateRemoval(expanded, () => {
              for (const c of expanded) {
                this.grid[c.row][c.col] = null;
                this.specialGrid[c.row][c.col] = null;
                if (this.tileObjects[c.row][c.col]) {
                  this.tileObjects[c.row][c.col]!.container.destroy();
                  this.tileObjects[c.row][c.col] = null;
                }
              }
              // 낙하 없이 다음 특수젬 바로 활성화 (속도 단축)
              this.time.delayedCall(200, () => activateNext());
            });
          });
        },
      });
    };

    // 800ms 딜레이 후 보너스 시작 (배너 등장 후)
    this.time.delayedCall(800, () => activateNext());
  }

  /** 레벨 클리어 축하 이펙트 (firework + confetti + 파티클) */
  private playCelebrationEffect(): void {
    const pastelColors = [0xffb3c1, 0xffd6a5, 0xfdffb6, 0xb5ead7, 0xb5d8ff, 0xe2c6ff];

    // ── 1) 불꽃놀이 2~3개 랜덤 위치 ──
    const fwCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < fwCount; i++) {
      const fx = 200 + Math.random() * (GAME_WIDTH - 400);
      const fy = 300 + Math.random() * 400;
      this.time.delayedCall(i * 200, () => {
        const fw = this.add.sprite(fx, fy, 'fx_firework');
        fw.setDepth(55);
        fw.setScale(1.5);
        fw.setAlpha(0.7);
        fw.setTint(pastelColors[Math.floor(Math.random() * pastelColors.length)]);
        fw.play('anim_firework');
        fw.once('animationcomplete', () => fw.destroy());
      });
    }

    // ── 2) 파티 컨페티 스프라이트 (화면 상단 양쪽) ──
    for (const sx of [GAME_WIDTH * 0.25, GAME_WIDTH * 0.75]) {
      const pc = this.add.sprite(sx, 100, 'fx_party_confetti');
      pc.setDepth(55);
      pc.setScale(3);
      pc.setAlpha(0.7);
      pc.play('anim_party_confetti');
      pc.once('animationcomplete', () => pc.destroy());
    }

    // ── 3) 콘페티 파티클 비 (화면 상단에서 쏟아짐) ──
    const confettiE = this.add.particles(GAME_WIDTH / 2, -30, 'particle_confetti', {
      x: { min: -GAME_WIDTH / 2, max: GAME_WIDTH / 2 },
      speed: { min: 50, max: 150 },
      scale: { start: 1.2, end: 0.4 },
      alpha: { start: 0.7, end: 0 },
      lifespan: { min: 1500, max: 2500 },
      angle: { min: 75, max: 105 },
      tint: pastelColors,
      rotate: { min: -360, max: 360 },
      gravityY: 60,
      frequency: 40,
      quantity: 3,
    });
    confettiE.setDepth(54);
    this.time.delayedCall(2000, () => {
      confettiE.stop();
      this.time.delayedCall(2600, () => confettiE.destroy());
    });

    // ── 4) 스프링클 폭발 (중앙) ──
    const sprinkleE = this.add.particles(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100, 'particle_sprinkle', {
      speed: { min: 100, max: 300 },
      scale: { start: 1.5, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: { min: 600, max: 1000 },
      angle: { min: 0, max: 360 },
      tint: pastelColors,
      rotate: { min: -180, max: 180 },
      gravityY: 120,
      emitting: false,
    });
    sprinkleE.setDepth(54);
    sprinkleE.explode(20);
    this.time.delayedCall(1100, () => sprinkleE.destroy());
  }

  // ─── 승리 팝업 (원본 HTML 기반) ─────────────────────
  private showWinPopup(): void {
    // ── 축하 이펙트 (firework + confetti) ──
    vibrateCelebrate();
    this.playCelebrationEffect();
    SoundManager.getInstance().stopBGM();

    // 이슈 5A: showGameOverPopup에서 이미 저장했으면 중복 저장 방지
    // progressSaved=true: Sugar Rush 이전 점수로 이미 저장됨 (해금 보장됨)
    //   → Sugar Rush 보너스 점수로 별/하이스코어만 추가 갱신 (코인 재지급 없음)
    // progressSaved=false: movesLeft=0 직접 승리 등 — 여기서 처음 저장
    let result: { stars: number; isNewBest: boolean; coinsEarned: number };
    if (this.progressSaved) {
      // 이미 저장된 상태 → 코인 중복 지급 없이 별/하이스코어만 갱신
      const { stars, isNewBest } = updateLevelProgressNoCoin(
        this.currentLevel.level, this.score, this.currentLevel.starThresholds,
      );
      result = { stars, isNewBest, coinsEarned: 0 };
    } else {
      this.progressSaved = true;
      result = updateLevelProgress(
        this.currentLevel.level, this.score, this.currentLevel.starThresholds,
      );
    }
    const earnedStars = result.stars;
    const hasNextLevel = this.currentLevel.level < LEVELS.length;

    const allElements: Phaser.GameObjects.GameObject[] = [];
    const allZones: Phaser.GameObjects.Zone[] = [];

    // ── 오버레이 ──
    const overlay = this.add.graphics().setDepth(50);
    overlay.fillStyle(0x221a0f, 0.4);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    overlay.setAlpha(0);
    allElements.push(overlay);

    // ── 팝업 레이아웃 계산 ──
    const popupW = 780;
    const pad = 64;
    const cardRadius = 64;

    const confettiH = 100;
    const titleH = 60;
    const titleGap = 48;      // mb-6
    const starsH = 192;       // h-24 scaled, with larger middle star
    const starsGap = 64;      // mb-8
    const scoreLabelH = 24;
    const scoreNumH = 80;
    const scoreGap = 64;      // mb-8
    const dividerH = 2;
    const dividerGap = 64;    // mb-8
    const nextBtnH = 120;     // py-5
    const menuGap = 48;       // gap-6
    const menuH = 40;

    const popupH = confettiH + pad + titleH + titleGap + starsH + starsGap
                 + scoreLabelH + 8 + scoreNumH + scoreGap
                 + dividerH + dividerGap
                 + nextBtnH + menuGap + menuH + pad;

    const px = (GAME_WIDTH - popupW) / 2;
    const py = (GAME_HEIGHT - popupH) / 2;

    // ── 카드 배경 ──
    const popupBg = this.add.graphics().setDepth(51);
    popupBg.fillStyle(0x221a0f, 0.15);
    popupBg.fillRoundedRect(px + 4, py + 12, popupW, popupH, cardRadius);
    popupBg.fillStyle(0xffffff, 1);
    popupBg.fillRoundedRect(px, py, popupW, popupH, cardRadius);
    popupBg.setAlpha(0);
    allElements.push(popupBg);

    // ── 콘페티 장식 (상단) ──
    const confettiEmojis = ['🎉', '🥐', '🎂', '🍪'];
    const confettiAngles = [12, -45, 45, -12];
    const confettiSpacing = (popupW - pad * 2) / (confettiEmojis.length - 1);
    confettiEmojis.forEach((emoji, i) => {
      const cx = px + pad + i * confettiSpacing;
      const confetti = this.add.text(cx, py + 50, emoji, {
        fontSize: '36px',
      }).setOrigin(0.5).setDepth(52).setAlpha(0).setAngle(confettiAngles[i]);
      allElements.push(confetti);
    });

    let cy = py + confettiH + pad;

    // ── "Level Complete!" — text-3xl font-extrabold ──
    const titleText = this.add.text(GAME_WIDTH / 2, cy, 'Level Complete!', {
      fontSize: '60px',
      color: '#690008',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(52).setAlpha(0);
    allElements.push(titleText);
    cy += titleH + titleGap;

    // ── 쿠키 (별 대신) — 중앙 큰, 좌우 작은 ──
    const starCenterY = cy + starsH / 2;

    // 좌측 쿠키 (작은)
    const star1 = this.add.text(GAME_WIDTH / 2 - 120, starCenterY + 10,
      earnedStars >= 1 ? '🍪' : '☆', {
      fontSize: '72px',
      color: '#d3c4b1',
      padding: { top: 16, bottom: 8, left: 8, right: 8 },
    }).setOrigin(0.5).setDepth(52).setAlpha(0);
    allElements.push(star1);

    // 중앙 쿠키 (큰, 위로 올라감)
    const star2 = this.add.text(GAME_WIDTH / 2, starCenterY - 30,
      earnedStars >= 2 ? '🍪' : '☆', {
      fontSize: '100px',
      color: '#d3c4b1',
      padding: { top: 20, bottom: 12, left: 12, right: 12 },
    }).setOrigin(0.5).setDepth(52).setAlpha(0);
    allElements.push(star2);

    // 우측 쿠키 (작은)
    const star3 = this.add.text(GAME_WIDTH / 2 + 120, starCenterY + 10,
      earnedStars >= 3 ? '🍪' : '☆', {
      fontSize: '72px',
      color: '#d3c4b1',
      padding: { top: 16, bottom: 8, left: 8, right: 8 },
    }).setOrigin(0.5).setDepth(52).setAlpha(0);
    allElements.push(star3);

    cy += starsH + starsGap;

    // ── SCORE 라벨 + 점수 ──
    const scoreLabel = this.add.text(GAME_WIDTH / 2, cy, 'SCORE', {
      fontSize: '22px',
      color: '#58413f',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
      letterSpacing: 8,
    }).setOrigin(0.5, 0).setDepth(52).setAlpha(0);
    allElements.push(scoreLabel);
    cy += scoreLabelH + 8;

    const scoreNum = this.add.text(GAME_WIDTH / 2, cy, this.score.toLocaleString(), {
      fontSize: '96px',
      color: '#221a0f',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(52).setAlpha(0);
    allElements.push(scoreNum);
    cy += scoreNumH + scoreGap;

    // ── 구분선 ──
    const divider = this.add.graphics().setDepth(52);
    divider.fillStyle(COLORS.surfaceContainerHighest, 1);
    divider.fillRect(px + pad, cy, popupW - pad * 2, dividerH);
    divider.setAlpha(0);
    allElements.push(divider);
    cy += dividerH + dividerGap;

    // ── Next Level 버튼 ──
    const btnW = popupW - pad * 2;
    const btnX = px + pad;

    const nextBg = this.add.graphics().setDepth(52);
    nextBg.fillStyle(0x690008, 1);
    nextBg.fillRoundedRect(btnX, cy, btnW, nextBtnH, 28);
    nextBg.fillStyle(0x8b1a1a, 1);
    nextBg.fillRoundedRect(btnX, cy, btnW, nextBtnH * 0.55,
      { tl: 28, tr: 28, bl: 0, br: 0 });
    nextBg.setAlpha(0);
    allElements.push(nextBg);

    const nextText = this.add.text(GAME_WIDTH / 2, cy + nextBtnH / 2,
      hasNextLevel ? 'Next Level' : 'Back to Map', {
      fontSize: '40px',
      color: '#ffffff',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(53).setAlpha(0);
    allElements.push(nextText);

    const nextZone = this.add.zone(
      GAME_WIDTH / 2, cy + nextBtnH / 2, btnW, nextBtnH
    ).setInteractive().setDepth(54);
    allZones.push(nextZone);
    cy += nextBtnH + menuGap;

    // ── MENU 텍스트 링크 ──
    const menuText = this.add.text(GAME_WIDTH / 2, cy, 'MENU', {
      fontSize: '24px',
      color: '#58413f',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
      letterSpacing: 8,
    }).setOrigin(0.5, 0).setDepth(53).setAlpha(0);
    allElements.push(menuText);

    const menuZone = this.add.zone(
      GAME_WIDTH / 2, cy + menuH / 2, 300, menuH
    ).setInteractive().setDepth(54);
    allZones.push(menuZone);

    // ── 등장 애니메이션 ──
    this.tweens.add({
      targets: allElements,
      alpha: 1,
      duration: 400,
      ease: 'Cubic.easeOut',
      delay: 200,
    });

    // 쿠키 등장 애니메이션 (순차 스케일업)
    [star1, star2, star3].forEach((s, i) => {
      s.setScale(0);
      this.tweens.add({
        targets: s,
        scaleX: 1, scaleY: 1,
        duration: 300,
        ease: 'Back.easeOut',
        delay: 600 + i * 200,
      });
    });

    // ── 버튼 이벤트 ──
    nextZone.on('pointerdown', () => {
      SoundManager.getInstance().playButtonClick();
      if (hasNextLevel) {
        fadeToScene(this, 'GameScene', { level: this.currentLevel.level + 1 });
      } else {
        fadeToScene(this, 'LevelSelectScene');
      }
    });

    menuZone.on('pointerdown', () => {
      SoundManager.getInstance().playButtonClick();
      fadeToScene(this, 'LevelSelectScene');
    });
  }

  // ─── 실패 팝업 (원본 HTML 기반) ────────────────────────
  private showFailPopup(): void {
    // 실패 팝업 진입 = 패배 직전 보드로의 롤백을 막기 위해 phase를 'fail_popup'으로 마킹
    // 스냅샷 자체는 유지: 세컨드 찬스 사용 후 다음 캐스케이드가 'playing'으로 덮어씀
    const _existing = loadRun();
    if (_existing) saveRun({ ..._existing, phase: 'fail_popup' });

    SoundManager.getInstance().stopBGM();
    const allElements: Phaser.GameObjects.GameObject[] = [];
    const allZones: Phaser.GameObjects.Zone[] = [];
    // 미달성 골 목록 생성
    const unmetGoalLines: string[] = [];
    for (const goal of this.currentLevel.goals) {
      let current = 0;
      switch (goal.type) {
        case 'collect': current = this.goalCollected; break;
        case 'clearIce': current = this.iceCleared; break;
        case 'clearStone': current = this.stoneCleared; break;
      }
      const rem = Math.max(0, goal.count - current);
      if (rem > 0) {
        switch (goal.type) {
          case 'collect': unmetGoalLines.push(`${rem} more ${goal.tileType ?? 'tiles'}s`); break;
          case 'clearIce': unmetGoalLines.push(`${rem} more ice blocks`); break;
          case 'clearStone': unmetGoalLines.push(`${rem} more stones`); break;
        }
      }
    }

    // ── 오버레이 (rgba(34,26,15,0.4) + blur) ──
    const overlay = this.add.graphics().setDepth(50);
    overlay.fillStyle(0x221a0f, 0.4);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    overlay.setAlpha(0);
    allElements.push(overlay);

    // ── 팝업 카드 ──
    // HTML: max-w-[400px] → ~800px, rounded-[40px], p-8
    const popupW = 800;
    const pad = 64;  // p-8
    const cardRadius = 64;

    // 컨텐츠 높이 계산
    const illustH = 280;    // 캐릭터 일러스트
    const illustGap = 32;   // mb-4
    const titleH = 60;      // text-3xl
    const titleGap = 16;    // mb-2
    const descH = 80;       // 설명 2줄
    const dividerGap = 64;  // my-8
    const dividerH = 2;
    const btnSpacing = 32;  // space-y-4
    const primaryBtnH = 120; // h-16
    const secondaryBtnH = 108; // h-14
    const quitH = 60;       // 텍스트 버튼
    const quitGap = 32;     // mt-4
    const popupH = pad + illustH + illustGap + titleH + titleGap + descH
                 + dividerGap + dividerH + dividerGap
                 + primaryBtnH + btnSpacing + secondaryBtnH + quitGap + quitH + pad;

    const px = (GAME_WIDTH - popupW) / 2;
    const py = (GAME_HEIGHT - popupH) / 2;

    // 카드 배경 + 그림자
    const popupBg = this.add.graphics().setDepth(51);
    popupBg.fillStyle(0x221a0f, 0.15);
    popupBg.fillRoundedRect(px + 4, py + 12, popupW, popupH, cardRadius);
    popupBg.fillStyle(0xffffff, 1);
    popupBg.fillRoundedRect(px, py, popupW, popupH, cardRadius);
    popupBg.lineStyle(2, 0xffffff, 0.4);
    popupBg.strokeRoundedRect(px, py, popupW, popupH, cardRadius);
    popupBg.setAlpha(0);
    allElements.push(popupBg);

    let cy = py + pad;

    // ── 캐릭터 일러스트 (슬픈 컵케이크) ──
    const illustCx = GAME_WIDTH / 2;
    const illustCy = cy + illustH / 2;

    // 배경 블러 원
    const blurBg = this.add.graphics().setDepth(51);
    blurBg.fillStyle(0xf0e0cc, 0.3);
    blurBg.fillCircle(illustCx, illustCy, 120);
    blurBg.setAlpha(0);
    allElements.push(blurBg);

    // 컵케이크 상단 (frosting) — tertiary-container
    const cakeTop = this.add.graphics().setDepth(52);
    cakeTop.fillStyle(0x782e3d, 1);
    cakeTop.fillRoundedRect(illustCx - 96, illustCy - 80, 192, 120,
      { tl: 8, tr: 8, bl: 32, br: 32 });
    cakeTop.setAlpha(0);
    allElements.push(cakeTop);

    // 슬픈 눈
    const eyeL = this.add.graphics().setDepth(53);
    eyeL.fillStyle(0xfd99a8, 0.6);
    eyeL.fillCircle(illustCx - 28, illustCy - 30, 6);
    eyeL.setAlpha(0);
    allElements.push(eyeL);

    const eyeR = this.add.graphics().setDepth(53);
    eyeR.fillStyle(0xfd99a8, 0.6);
    eyeR.fillCircle(illustCx + 28, illustCy - 30, 6);
    eyeR.setAlpha(0);
    allElements.push(eyeR);

    // 컵케이크 하단 (wrapper) — surface-container-highest
    const cakeBot = this.add.graphics().setDepth(52);
    cakeBot.fillStyle(COLORS.surfaceContainerHighest, 1);
    cakeBot.fillRoundedRect(illustCx - 108, illustCy + 30, 216, 80, 60);
    // 하단 보더
    cakeBot.lineStyle(6, 0xe6d8c5, 1);
    cakeBot.strokeRoundedRect(illustCx - 108, illustCy + 30, 216, 80, 60);
    cakeBot.setAlpha(0);
    allElements.push(cakeBot);

    // 점 장식
    const dot1 = this.add.graphics().setDepth(53);
    dot1.fillStyle(COLORS.primary, 0.2);
    dot1.fillCircle(illustCx - 40, illustCy + 56, 8);
    dot1.setAlpha(0);
    allElements.push(dot1);

    const dot2 = this.add.graphics().setDepth(53);
    dot2.fillStyle(COLORS.primary, 0.2);
    dot2.fillCircle(illustCx + 30, illustCy + 62, 6);
    dot2.setAlpha(0);
    allElements.push(dot2);

    // 그림자
    const shadow = this.add.graphics().setDepth(51);
    shadow.fillStyle(0x6e6353, 0.1);
    shadow.fillEllipse(illustCx, illustCy + 130, 180, 24);
    shadow.setAlpha(0);
    allElements.push(shadow);

    // 슬픈 이모지 (우상단)
    const sadEmoji = this.add.text(illustCx + 100, illustCy - 90, '😞', {
      fontSize: '52px',
    }).setOrigin(0.5).setDepth(53).setAlpha(0).setAngle(12);
    allElements.push(sadEmoji);

    cy += illustH + illustGap;

    // ── "Out of Moves!" — text-3xl font-extrabold, mb-2 ──
    const titleText = this.add.text(GAME_WIDTH / 2, cy, 'Out of Moves!', {
      fontSize: '60px',
      color: '#221a0f',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(52).setAlpha(0);
    allElements.push(titleText);
    cy += titleH + titleGap;

    // ── 설명 텍스트 (멀티 골 대응) ──
    const descText = this.add.text(GAME_WIDTH / 2, cy, 'So close! You needed', {
      fontSize: '32px',
      color: '#58413f',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
    }).setOrigin(0.5, 0).setDepth(52).setAlpha(0);
    allElements.push(descText);

    const descLine = unmetGoalLines.length > 0 ? unmetGoalLines.join(' & ') + '...' : 'just a little more...';
    const descBold = this.add.text(GAME_WIDTH / 2, cy + 42, descLine, {
      fontSize: '30px',
      color: '#690008',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(52).setAlpha(0);
    allElements.push(descBold);
    cy += descH;

    // ── 구분선 — h-px bg-surface-container-highest my-8 ──
    cy += dividerGap;
    const divider = this.add.graphics().setDepth(52);
    divider.fillStyle(COLORS.surfaceContainerHighest, 1);
    divider.fillRect(px + pad, cy, popupW - pad * 2, dividerH);
    divider.setAlpha(0);
    allElements.push(divider);
    cy += dividerH + dividerGap;

    // ── +5 MOVES 버튼 (광고 보상) ──
    const adBtnW = popupW - pad * 2;
    const adBtnX = px + pad;
    const canUseSecondChance = !this.secondChanceUsed && canUseFreeSecondChance();

    const adBtnBg = this.add.graphics().setDepth(52);
    adBtnBg.fillStyle(0x690008, 1);
    adBtnBg.fillRoundedRect(adBtnX, cy, adBtnW, primaryBtnH, 28);
    adBtnBg.fillStyle(0x8b1a1a, 1);
    adBtnBg.fillRoundedRect(adBtnX, cy, adBtnW, primaryBtnH * 0.55,
      { tl: 28, tr: 28, bl: 0, br: 0 });
    adBtnBg.setAlpha(0);
    allElements.push(adBtnBg);

    // 비디오 아이콘 + 텍스트
    const adIcon = this.add.text(adBtnX + 48, cy + primaryBtnH / 2, '▶', {
      fontSize: '32px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(53).setAlpha(0);
    allElements.push(adIcon);

    const adText = this.add.text(adBtnX + 48 + 60, cy + primaryBtnH / 2, '+5 MOVES', {
      fontSize: '36px', color: '#ffffff',
      fontFamily: 'Plus Jakarta Sans, sans-serif', fontStyle: 'bold',
      letterSpacing: 4,
    }).setOrigin(0, 0.5).setDepth(53).setAlpha(0);
    allElements.push(adText);

    // FREE 뱃지
    const freeX = adBtnX + adBtnW - 60;
    const freeBg = this.add.graphics().setDepth(53);
    freeBg.fillStyle(0xffffff, 0.2);
    freeBg.fillRoundedRect(freeX - 40, cy + primaryBtnH / 2 - 18, 80, 36, 8);
    freeBg.setAlpha(0);
    allElements.push(freeBg);

    const freeText = this.add.text(freeX, cy + primaryBtnH / 2, 'FREE', {
      fontSize: '18px', color: '#ffffff',
      fontFamily: 'Plus Jakarta Sans, sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(53).setAlpha(0);
    allElements.push(freeText);

    const adZone = this.add.zone(
      GAME_WIDTH / 2, cy + primaryBtnH / 2, adBtnW, primaryBtnH
    ).setInteractive().setDepth(54);
    allZones.push(adZone);

    const secondChanceOverlay = this.add.graphics().setDepth(55);
    secondChanceOverlay.fillStyle(canUseSecondChance ? 0x690008 : 0x9e9187, 0.96);
    secondChanceOverlay.fillRoundedRect(adBtnX, cy, adBtnW, primaryBtnH, 28);
    secondChanceOverlay.fillStyle(canUseSecondChance ? 0x8b1a1a : 0xbcaea2, 1);
    secondChanceOverlay.fillRoundedRect(adBtnX, cy, adBtnW, primaryBtnH * 0.55, { tl: 28, tr: 28, bl: 0, br: 0 });
    secondChanceOverlay.setAlpha(0);
    allElements.push(secondChanceOverlay);

    const secondChanceText = this.add.text(GAME_WIDTH / 2, cy + primaryBtnH / 2 - 10, canUseSecondChance ? 'SECOND CHANCE' : 'SECOND CHANCE USED', {
      fontSize: '34px',
      color: '#ffffff',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
      letterSpacing: 4,
    }).setOrigin(0.5).setDepth(56).setAlpha(0);
    allElements.push(secondChanceText);

    const secondChanceSub = this.add.text(GAME_WIDTH / 2, cy + primaryBtnH / 2 + 24, canUseSecondChance ? '+5 moves, free once daily' : 'Try Again is still available below', {
      fontSize: '18px',
      color: '#fff6f1',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(56).setAlpha(0);
    allElements.push(secondChanceSub);
    cy += primaryBtnH + btnSpacing;

    // ── TRY AGAIN 버튼 ──
    const retryBg = this.add.graphics().setDepth(52);
    retryBg.fillStyle(COLORS.surfaceContainerHigh, 1);
    retryBg.fillRoundedRect(adBtnX, cy, adBtnW, secondaryBtnH, 28);
    retryBg.setAlpha(0);
    allElements.push(retryBg);

    const retryText = this.add.text(GAME_WIDTH / 2, cy + secondaryBtnH / 2, 'TRY AGAIN', {
      fontSize: '28px', color: '#6e6353',
      fontFamily: 'Plus Jakarta Sans, sans-serif', fontStyle: 'bold',
      letterSpacing: 8,
    }).setOrigin(0.5).setDepth(53).setAlpha(0);
    allElements.push(retryText);

    const retryZone = this.add.zone(
      GAME_WIDTH / 2, cy + secondaryBtnH / 2, adBtnW, secondaryBtnH
    ).setInteractive().setDepth(54);
    allZones.push(retryZone);
    cy += secondaryBtnH + quitGap;

    // ── BACK TO MAP (텍스트 링크) ──
    const quitText = this.add.text(GAME_WIDTH / 2, cy + quitH / 2, 'BACK TO MAP', {
      fontSize: '24px', color: '#58413f',
      fontFamily: 'Plus Jakarta Sans, sans-serif', fontStyle: 'bold',
      letterSpacing: 8,
    }).setOrigin(0.5).setDepth(53).setAlpha(0);
    allElements.push(quitText);

    const quitZone = this.add.zone(
      GAME_WIDTH / 2, cy + quitH / 2, 400, quitH
    ).setInteractive().setDepth(54);
    allZones.push(quitZone);

    // ── 등장 애니메이션 ──
    this.tweens.add({
      targets: allElements,
      alpha: 1,
      duration: 400,
      ease: 'Cubic.easeOut',
      delay: 200,
    });

    // ── 버튼 이벤트 ──
    adZone.on('pointerdown', () => {
      if (!canUseSecondChance) return;
      SoundManager.getInstance().playButtonClick();
      this.secondChanceUsed = true;
      this.gameOver = false;
      vibrateSpecial();
      markFreeSecondChanceUsed();
      this.movesLeft += 5;
      this.movesText.setText(`${this.movesLeft}`);
      allElements.forEach(el => el.destroy());
      allZones.forEach(z => z.destroy());
    });

    retryZone.on('pointerdown', () => {
      SoundManager.getInstance().playButtonClick();
      // 진짜 게임오버 확정 (Retry = 새 판 시작) → 복구 데이터 삭제
      clearRun();
      fadeToScene(this, 'GameScene', { level: this.currentLevel.level });
    });

    quitZone.on('pointerdown', () => {
      SoundManager.getInstance().playButtonClick();
      // 진짜 게임오버 확정 (맵으로 나감) → 복구 데이터 삭제
      clearRun();
      fadeToScene(this, 'LevelSelectScene');
    });
  }

  /** 팝업 내 버튼 생성 헬퍼 */
  private createPopupButton(
    cx: number, cy: number, w: number, h: number,
    label: string, bgColor: number, textColor: string,
    onClick: () => void,
    elements: Phaser.GameObjects.GameObject[],
  ): void {
    const bg = this.add.graphics().setDepth(52);
    bg.fillStyle(bgColor, 1);
    bg.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    bg.setAlpha(0);

    const txt = this.add.text(cx, cy, label, {
      fontSize: '34px',
      color: textColor,
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(53).setAlpha(0);

    const zone = this.add.zone(cx, cy, w, h).setInteractive().setDepth(54);
    zone.on('pointerdown', onClick);

    elements.push(bg, txt);
  }

  // ─── 하단 광고 영역 + 버튼 바 ──────────────────────────
  // ─── 튜토리얼 시스템 ───────────────────────────────

  /** 트리거에 맞는 다음 튜토리얼 스텝을 표시 */
  private advanceTutorial(trigger: TutorialStep['trigger']): void {
    if (!this.tutorial) return;
    const steps = this.tutorial.steps;

    while (this.tutorialStepIndex < steps.length) {
      const step = steps[this.tutorialStepIndex];
      if (step.trigger !== trigger) break;
      if (trigger === 'onMovesMade' && this.tutorialMovesDone < (step.movesCount ?? 0)) break;

      this.showTutorialStep(step);
      this.tutorialStepIndex++;

      // 같은 트리거의 연속 스텝은 딜레이를 두고 표시
      if (this.tutorialStepIndex < steps.length && steps[this.tutorialStepIndex].trigger === trigger) {
        const delay = step.autoAdvanceMs ?? 3000;
        this.time.delayedCall(delay, () => this.advanceTutorial(trigger));
        return;
      }
      break;
    }
  }

  /** 튜토리얼 스텝 하나를 화면에 표시 */
  private showTutorialStep(step: TutorialStep): void {
    this.clearTutorialOverlay();

    // 반투명 오버레이
    const overlay = this.add.graphics().setDepth(40);
    overlay.fillStyle(0x221a0f, 0.3);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    overlay.setAlpha(0);
    this.tutorialOverlay.push(overlay);

    // 메시지 박스
    const boxW = 900;
    const boxH = 160;
    const boxY = step.position === 'top'
      ? BOARD_Y - BOARD_HEIGHT / 2 - boxH - 30
      : BOARD_Y + BOARD_HEIGHT / 2 + 30;
    const boxX = (GAME_WIDTH - boxW) / 2;

    const box = this.add.graphics().setDepth(41);
    box.fillStyle(0xffffff, 0.95);
    box.fillRoundedRect(boxX, boxY, boxW, boxH, 32);
    box.lineStyle(4, 0x690008, 0.3);
    box.strokeRoundedRect(boxX, boxY, boxW, boxH, 32);
    box.setAlpha(0);
    this.tutorialOverlay.push(box);

    // 메인 메시지
    const msg = this.add.text(GAME_WIDTH / 2, boxY + boxH / 2 - (step.subMessage ? 16 : 0), step.message, {
      fontSize: '40px',
      color: '#690008',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: boxW - 60 },
    }).setOrigin(0.5).setDepth(42).setAlpha(0);
    this.tutorialOverlay.push(msg);

    // 서브 메시지
    if (step.subMessage) {
      const sub = this.add.text(GAME_WIDTH / 2, boxY + boxH / 2 + 24, step.subMessage, {
        fontSize: '26px',
        color: '#58413f',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        align: 'center',
      }).setOrigin(0.5).setDepth(42).setAlpha(0);
      this.tutorialOverlay.push(sub);
    }

    // 페이드인
    for (const obj of this.tutorialOverlay) {
      this.tweens.add({
        targets: obj,
        alpha: 1,
        duration: 300,
        ease: 'Sine.easeOut',
      });
    }

    // 자동 진행 또는 터치로 닫기
    const dismiss = () => this.clearTutorialOverlay();
    if (step.autoAdvanceMs) {
      this.time.delayedCall(step.autoAdvanceMs, dismiss);
    }
    // 터치로도 닫기 가능
    overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains
    );
    overlay.once('pointerdown', dismiss);
  }

  /** 튜토리얼 오버레이 제거 */
  private clearTutorialOverlay(): void {
    for (const obj of this.tutorialOverlay) {
      this.tweens.add({
        targets: obj,
        alpha: 0,
        duration: 200,
        ease: 'Sine.easeIn',
        onComplete: () => obj.destroy(),
      });
    }
    this.tutorialOverlay = [];
  }

  private drawBottomBar(): void {
    // 광고 영역 (AdMob 배너)
    this.drawAdArea();

    const AD_HEIGHT = 200;
    const barY = GAME_HEIGHT - AD_HEIGHT - 100;

    // ── 배경 바 ──
    const barW = 920;
    const barH = 120;
    const barBg = this.add.graphics().setDepth(5);
    // 그림자
    barBg.fillStyle(0x221a0f, 0.06);
    barBg.fillRoundedRect(GAME_WIDTH / 2 - barW / 2 + 3, barY - barH / 2 + 4, barW, barH, 36);
    // 메인 배경
    barBg.fillStyle(COLORS.surfaceContainerLow, 0.95);
    barBg.fillRoundedRect(GAME_WIDTH / 2 - barW / 2, barY - barH / 2, barW, barH, 36);
    // 테두리
    barBg.lineStyle(2, COLORS.surfaceContainerHighest, 0.6);
    barBg.strokeRoundedRect(GAME_WIDTH / 2 - barW / 2, barY - barH / 2, barW, barH, 36);

    // ── 버튼 배치: [🏠] [셔플 | 라이트닝 | 힌트] [⚙️] ──
    const utilSize = 68;    // 유틸 버튼 (작게)
    const boostSize = 88;   // 부스터 버튼 (크게)
    const boostGap = 120;   // 부스터 간 간격

    // 유틸 버튼 (양쪽 끝)
    const homeX = GAME_WIDTH / 2 - barW / 2 + 60;
    const settingsX = GAME_WIDTH / 2 + barW / 2 - 60;
    this.createHomeButton(homeX, barY, utilSize);
    this.createSettingsButton(settingsX, barY, utilSize);

    // 부스터 버튼 (중앙 그룹)
    this.createShuffleBoosterButton(GAME_WIDTH / 2 - boostGap, barY);
    this.createLightningBoosterButton(GAME_WIDTH / 2, barY);
    this.createHintBoosterButton(GAME_WIDTH / 2 + boostGap, barY);
  }

  // ─── 하단 AdMob 배너 영역 ──────────────────────────────
  // 네이티브(Android)에서는 AdMob SDK가 이 공간 위에 네이티브 배너를 오버레이합니다.
  // 웹 환경에서는 "Advertisement" 레이블이 표시된 플레이스홀더가 나타납니다.
  private drawAdArea(): void {
    const AD_HEIGHT = 200;

    const adBg = this.add.graphics().setDepth(40);
    adBg.fillStyle(0xf5e6d8, 1);
    adBg.fillRect(0, GAME_HEIGHT - AD_HEIGHT, GAME_WIDTH, AD_HEIGHT);

    // 구분선
    adBg.lineStyle(2, 0xd4b8a8, 1);
    adBg.lineBetween(0, GAME_HEIGHT - AD_HEIGHT, GAME_WIDTH, GAME_HEIGHT - AD_HEIGHT);

    // 웹 환경 전용 플레이스홀더 텍스트 (네이티브에서는 AdMob 배너가 덮어씀)
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - AD_HEIGHT / 2, 'Advertisement', {
      fontSize: '24px',
      color: '#b09080',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      letterSpacing: 4,
    }).setOrigin(0.5).setDepth(41).setAlpha(0.5);
  }

  /** 부스터 버튼 공통 배경 (그라데이션 효과) */
  private drawBoosterButtonBg(x: number, y: number, radius: number): void {
    const bg = this.add.graphics().setDepth(6);
    // 외부 글로우
    bg.fillStyle(COLORS.surfaceContainerHighest, 0.4);
    bg.fillCircle(x, y, radius + 4);
    // 메인 원
    bg.fillStyle(TILE_BG_COLOR, 1);
    bg.fillCircle(x, y, radius);
    // 하이라이트 상단 반원
    bg.fillStyle(0xffffff, 0.3);
    bg.fillCircle(x, y - 4, radius - 6);
    // 테두리
    bg.lineStyle(4, COLORS.surfaceContainerHigh, 1);
    bg.strokeCircle(x, y, radius);
  }

  /** 셔플 부스터 버튼 */
  private createShuffleBoosterButton(x: number, y: number): void {
    const size = 88;
    const radius = size / 2;

    this.drawBoosterButtonBg(x, y - 6, radius);

    this.add.text(x, y - 6, '🔀', {
      fontSize: '36px',
      padding: { top: 4, bottom: 4, left: 4, right: 4 },
    }).setOrigin(0.5).setDepth(7);

    // 뱃지
    const badgeX = x + radius * 0.7;
    const badgeY = y - 6 - radius * 0.7;
    const badgeBg = this.add.graphics().setDepth(8);
    badgeBg.fillStyle(COLORS.error, 1);
    badgeBg.fillCircle(badgeX, badgeY, 18);
    badgeBg.lineStyle(3, 0xffffff, 1);
    badgeBg.strokeCircle(badgeX, badgeY, 18);
    this.shuffleBadgeText = this.add.text(badgeX, badgeY, `${this.shuffleBoosterCount}`, {
      fontSize: '20px', color: '#ffffff', fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(9);

    // 라벨
    this.add.text(x, y + radius - 2, 'Shuffle', {
      fontSize: '16px', color: '#58413f', fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(7).setAlpha(0.6);

    // 인터랙티브
    const zone = this.add.zone(x, y, size + 20, size + 30).setInteractive().setDepth(10);
    zone.on('pointerdown', () => {
      if (this.isAnimating || this.gameOver) return;
      if (this.shuffleBoosterCount <= 0) {
        this.showAdBoosterPopup('shuffle', () => {
          this.shuffleBoosterCount = getBoosterInventory().shuffle;
          this.shuffleBadgeText.setText(`${this.shuffleBoosterCount}`);
        });
        return;
      }
      if (!consumeStoredBooster('shuffle')) return;
      this.shuffleBoosterCount--;
      this.shuffleBadgeText.setText(`${this.shuffleBoosterCount}`);
      SoundManager.getInstance().playShuffle();
      vibrateTap();
      this.isAnimating = true;
      this.shuffleBoard();
      this.time.delayedCall(600, () => {
        this.isAnimating = false;
      });
    });
  }

  /** 라이트닝 부스터 버튼 */
  private createLightningBoosterButton(x: number, y: number): void {
    const size = 88;
    const radius = size / 2;

    this.drawBoosterButtonBg(x, y - 6, radius);

    this.add.text(x, y - 6, '🪄', {
      fontSize: '36px',
      padding: { top: 4, bottom: 4, left: 4, right: 4 },
    }).setOrigin(0.5).setDepth(7);

    // 뱃지
    const badgeX = x + radius * 0.7;
    const badgeY = y - 6 - radius * 0.7;
    const badgeBg = this.add.graphics().setDepth(8);
    badgeBg.fillStyle(COLORS.error, 1);
    badgeBg.fillCircle(badgeX, badgeY, 18);
    badgeBg.lineStyle(3, 0xffffff, 1);
    badgeBg.strokeCircle(badgeX, badgeY, 18);
    this.lightningBadgeText = this.add.text(badgeX, badgeY, `${this.lightningBoosterCount}`, {
      fontSize: '20px', color: '#ffffff', fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(9);

    // 라벨
    this.add.text(x, y + radius - 2, 'Zap', {
      fontSize: '16px', color: '#58413f', fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(7).setAlpha(0.6);

    // 인터랙티브
    const zone = this.add.zone(x, y, size + 20, size + 30).setInteractive().setDepth(10);
    zone.on('pointerdown', () => {
      if (this.isAnimating || this.gameOver) return;
      if (this.lightningBoosterCount <= 0) {
        this.showAdBoosterPopup('lightning', () => {
          this.lightningBoosterCount = getBoosterInventory().lightning;
          this.lightningBadgeText.setText(`${this.lightningBoosterCount}`);
        });
        return;
      }
      SoundManager.getInstance().playButtonClick();
      this.enterLightningMode();
    });
  }

  /** 힌트 부스터 버튼 */
  private createHintBoosterButton(x: number, y: number): void {
    const size = 88;
    const radius = size / 2;

    this.drawBoosterButtonBg(x, y - 6, radius);

    this.add.text(x, y - 6, '💡', {
      fontSize: '36px',
      padding: { top: 4, bottom: 4, left: 4, right: 4 },
    }).setOrigin(0.5).setDepth(7);

    // 뱃지
    const badgeX = x + radius * 0.7;
    const badgeY = y - 6 - radius * 0.7;
    const badgeBg = this.add.graphics().setDepth(8);
    badgeBg.fillStyle(COLORS.error, 1);
    badgeBg.fillCircle(badgeX, badgeY, 18);
    badgeBg.lineStyle(3, 0xffffff, 1);
    badgeBg.strokeCircle(badgeX, badgeY, 18);
    this.hintBadgeText = this.add.text(badgeX, badgeY, `${this.hintBoosterCount}`, {
      fontSize: '20px', color: '#ffffff', fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(9);

    // 라벨
    this.add.text(x, y + radius - 2, 'Hint', {
      fontSize: '16px', color: '#58413f', fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(7).setAlpha(0.6);

    // 인터랙티브
    const zone = this.add.zone(x, y, size + 20, size + 30).setInteractive().setDepth(10);
    zone.on('pointerdown', () => {
      if (this.isAnimating || this.gameOver) return;
      // 부스터 0이면 광고 충전 팝업
      if (this.hintBoosterCount <= 0) {
        this.showAdBoosterPopup('hint', () => {
          this.hintBoosterCount = getBoosterInventory().hint;
          this.hintBadgeText.setText(`${this.hintBoosterCount}`);
        });
        return;
      }
      const hint = this.findBestHintMove();
      if (!hint) return;
      if (!consumeStoredBooster('hint')) return;
      this.hintBoosterCount--;
      this.hintBadgeText.setText(`${this.hintBoosterCount}`);
      SoundManager.getInstance().playButtonClick();
      vibrateTap();
      this.showHintHighlight(hint.r1, hint.c1, hint.r2, hint.c2);
    });
  }

  /** 자동 힌트용: 최다 매치 셀 수 기준으로 스왑 쌍 반환 */
  private findAutoHintMove(): { r1: number; c1: number; r2: number; c2: number } | null {
    let best: { r1: number; c1: number; r2: number; c2: number } | null = null;
    let bestCount = 0;

    const trySwap = (r1: number, c1: number, r2: number, c2: number) => {
      if (this.isStoneCell(r2, c2) || this.cellModifiers[r2]?.[c2]?.type === 'chain') return;
      if (!this.hasMatchAtSwap(r1, c1, r2, c2)) return;
      this.swapGridDataOnly(r1, c1, r2, c2);
      const count = this.findAllMatchGroups().reduce((s, g) => s + g.cells.length, 0);
      this.swapGridDataOnly(r1, c1, r2, c2);
      if (count > bestCount) { bestCount = count; best = { r1, c1, r2, c2 }; }
    };

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (this.isStoneCell(row, col) || this.cellModifiers[row]?.[col]?.type === 'chain') continue;
        if (col < GRID_COLS - 1) trySwap(row, col, row, col + 1);
        if (row < GRID_ROWS - 1) trySwap(row, col, row + 1, col);
      }
    }
    return best;
  }

  /** 힌트 부스터용: 목표 가치 기반 점수로 최적 스왑 쌍 반환 */
  private findBestHintMove(): { r1: number; c1: number; r2: number; c2: number } | null {
    let best: { r1: number; c1: number; r2: number; c2: number } | null = null;
    let bestScore = -1;

    const scoreSwap = (r1: number, c1: number, r2: number, c2: number): number => {
      this.swapGridDataOnly(r1, c1, r2, c2);
      const groups = this.findAllMatchGroups();
      this.swapGridDataOnly(r1, c1, r2, c2);
      if (groups.length === 0) return -1;

      let score = 0;
      for (const group of groups) {
        const { cells } = group;
        const size = cells.length;
        score += size * 5; // 기본 점수

        // 타이머 젬 포함 매치: 최우선 (카운트다운 위기 해소)
        if (cells.some(({ row, col }) => (this.timedGemCounters[row]?.[col] ?? null) !== null)) score += 100;

        // 특수젬 생성 가능성
        if (size >= 5) score += 40;      // 컬러봄
        else if (size === 4) score += 15; // 스트라이프/래핑

        // 목표별 보너스
        for (const goal of this.currentLevel.goals) {
          if (goal.type === 'clearIce') {
            // 얼음 셀 직접 매치 (얼음 위 타일 제거 시 얼음 레이어 감소)
            if (cells.some(({ row, col }) => this.cellModifiers[row]?.[col]?.type === 'ice')) score += 25;
            // 얼음 인접 매치 (인접 타일 제거 시 얼음 타격)
            if (cells.some(({ row, col }) => this.cellAdjacentToIce(row, col))) score += 15;
          }
          if (goal.type === 'clearStone') {
            if (cells.some(({ row, col }) => this.cellAdjacentToStone(row, col))) score += 25;
          }
          if (goal.type === 'collect') {
            score += size * 2;
          }
        }
      }

      // 특수젬 스왑 조합 보너스
      const sp1 = this.specialGrid[r1]?.[c1];
      const sp2 = this.specialGrid[r2]?.[c2];
      if (sp1 && sp2) score += 80;
      else if (sp1 || sp2) score += 20;

      return score;
    };

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (this.isStoneCell(row, col) || this.cellModifiers[row]?.[col]?.type === 'chain') continue;
        if (col < GRID_COLS - 1
          && !this.isStoneCell(row, col + 1)
          && this.cellModifiers[row]?.[col + 1]?.type !== 'chain'
          && this.hasMatchAtSwap(row, col, row, col + 1)) {
          const s = scoreSwap(row, col, row, col + 1);
          if (s > bestScore) { bestScore = s; best = { r1: row, c1: col, r2: row, c2: col + 1 }; }
        }
        if (row < GRID_ROWS - 1
          && !this.isStoneCell(row + 1, col)
          && this.cellModifiers[row + 1]?.[col]?.type !== 'chain'
          && this.hasMatchAtSwap(row, col, row + 1, col)) {
          const s = scoreSwap(row, col, row + 1, col);
          if (s > bestScore) { bestScore = s; best = { r1: row, c1: col, r2: row + 1, c2: col }; }
        }
      }
    }
    return best;
  }

  /** 셀이 얼음 셀에 인접해 있는지 (4방향) */
  private cellAdjacentToIce(row: number, col: number): boolean {
    const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    return dirs.some(([dr, dc]) => {
      const r = row + dr, c = col + dc;
      return r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS
        && this.cellModifiers[r]?.[c]?.type === 'ice';
    });
  }

  /** 셀이 돌 셀에 인접해 있는지 (4방향) */
  private cellAdjacentToStone(row: number, col: number): boolean {
    const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    return dirs.some(([dr, dc]) => {
      const r = row + dr, c = col + dc;
      return r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS && this.isStoneCell(r, c);
    });
  }

  /** 힌트 하이라이트 표시 (두 타일을 반짝이게) */
  private showHintHighlight(r1: number, c1: number, r2: number, c2: number): void {
    SoundManager.getInstance().playTileSelect();

    const tiles = [
      this.tileObjects[r1][c1],
      this.tileObjects[r2][c2],
    ];

    for (const tile of tiles) {
      if (!tile) continue;

      // 반짝이는 글로우 링 (강화)
      const glow = this.add.graphics();
      glow.lineStyle(6, 0xffd600, 1);
      glow.strokeCircle(0, 0, TILE_DISPLAY_SIZE / 2 + 4);
      glow.fillStyle(0xffd600, 0.35);
      glow.fillCircle(0, 0, TILE_DISPLAY_SIZE / 2);
      tile.container.addAt(glow, 0);

      // 펄스 3회 후 제거 (강화된 알파)
      this.tweens.add({
        targets: glow,
        alpha: 0.5,
        duration: 350,
        yoyo: true,
        repeat: 3,
        ease: 'Sine.easeInOut',
        onComplete: () => glow.destroy(),
      });

      // 타일 바운스
      this.tweens.add({
        targets: tile.container,
        scaleX: 1.15,
        scaleY: 1.15,
        duration: 300,
        yoyo: true,
        repeat: 1,
        ease: 'Sine.easeInOut',
      });
    }

    // 스왑 방향 화살표
    const t1 = this.tileObjects[r1][c1];
    const t2 = this.tileObjects[r2][c2];
    if (t1 && t2) {
      const ax = t1.container.x, ay = t1.container.y;
      const bx = t2.container.x, by = t2.container.y;
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      const arrow = this.add.text(mx, my, '👆', { fontSize: '48px' })
        .setOrigin(0.5).setDepth(25);
      arrow.setAngle(Phaser.Math.RadToDeg(Math.atan2(by - ay, bx - ax)) - 90);
      this.tweens.add({
        targets: arrow,
        alpha: 0,
        y: my + (by - ay) * 0.2,
        x: mx + (bx - ax) * 0.2,
        duration: 1200, delay: 500,
        ease: 'Cubic.easeOut',
        onComplete: () => arrow.destroy(),
      });
    }
  }

  private createHomeButton(x: number, y: number, size = 88): void {
    const radius = size / 2;

    const bg = this.add.graphics().setDepth(6);
    bg.fillStyle(COLORS.surfaceContainerHighest, 0.6);
    bg.fillCircle(x, y, radius);
    bg.lineStyle(2, COLORS.surfaceContainerHigh, 0.5);
    bg.strokeCircle(x, y, radius);

    this.add.text(x, y, '⏸', {
      fontSize: `${Math.round(size * 0.38)}px`,
      padding: { top: 4, bottom: 4, left: 4, right: 4 },
    }).setOrigin(0.5).setDepth(7);

    const zone = this.add.zone(x, y, size + 10, size + 10).setInteractive().setDepth(10);
    zone.on('pointerdown', () => {
      SoundManager.getInstance().playButtonClick();
      this.showPauseOverlay();
    });
  }

  /** 일시정지 오버레이 */
  private showPauseOverlay(): void {
    if (this.isPaused || this.gameOver) return;
    this.isPaused = true;
    SoundManager.getInstance().pauseBGM();
    if (this.idleHintTimer) { this.idleHintTimer.destroy(); this.idleHintTimer = null; }

    const allElements: Phaser.GameObjects.GameObject[] = [];

    // 어두운 오버레이
    const overlay = this.add.graphics().setDepth(50);
    overlay.fillStyle(0x221a0f, 0.5);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    overlay.setAlpha(0);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT), Phaser.Geom.Rectangle.Contains);
    allElements.push(overlay);

    // 팝업 카드
    const popupW = 640, popupH = 480;
    const px = (GAME_WIDTH - popupW) / 2, py = (GAME_HEIGHT - popupH) / 2;

    const popupBg = this.add.graphics().setDepth(51);
    popupBg.fillStyle(0xffffff, 1);
    popupBg.fillRoundedRect(px, py, popupW, popupH, 40);
    popupBg.setAlpha(0);
    allElements.push(popupBg);

    // PAUSED 타이틀
    const title = this.add.text(GAME_WIDTH / 2, py + 80, 'PAUSED', {
      fontSize: '56px', color: '#690008', fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold', letterSpacing: 8,
    }).setOrigin(0.5).setDepth(52).setAlpha(0);
    allElements.push(title);

    // Resume 버튼
    const btnW = popupW - 80, btnH = 96;
    const resumeY = py + 200;
    const resumeBg = this.add.graphics().setDepth(52);
    resumeBg.fillStyle(0x690008, 1);
    resumeBg.fillRoundedRect(px + 40, resumeY, btnW, btnH, 28);
    resumeBg.fillStyle(0x8b1a1a, 1);
    resumeBg.fillRoundedRect(px + 40, resumeY, btnW, btnH * 0.55, { tl: 28, tr: 28, bl: 0, br: 0 });
    resumeBg.setAlpha(0);
    allElements.push(resumeBg);

    const resumeText = this.add.text(GAME_WIDTH / 2, resumeY + btnH / 2, 'RESUME', {
      fontSize: '36px', color: '#ffffff', fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold', letterSpacing: 8,
    }).setOrigin(0.5).setDepth(53).setAlpha(0);
    allElements.push(resumeText);

    const resumeZone = this.add.zone(GAME_WIDTH / 2, resumeY + btnH / 2, btnW, btnH).setInteractive().setDepth(54);

    // Back to Map 버튼
    const quitY = resumeY + btnH + 24;
    const quitBg = this.add.graphics().setDepth(52);
    quitBg.fillStyle(COLORS.surfaceContainerHigh, 1);
    quitBg.fillRoundedRect(px + 40, quitY, btnW, btnH, 28);
    quitBg.setAlpha(0);
    allElements.push(quitBg);

    const quitText = this.add.text(GAME_WIDTH / 2, quitY + btnH / 2, 'BACK TO MAP', {
      fontSize: '28px', color: '#6e6353', fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold', letterSpacing: 8,
    }).setOrigin(0.5).setDepth(53).setAlpha(0);
    allElements.push(quitText);

    const quitZone = this.add.zone(GAME_WIDTH / 2, quitY + btnH / 2, btnW, btnH).setInteractive().setDepth(54);

    // 페이드 인
    this.tweens.add({ targets: allElements, alpha: 1, duration: 200, ease: 'Cubic.easeOut' });

    // Resume
    resumeZone.on('pointerdown', () => {
      SoundManager.getInstance().playButtonClick();
      this.tweens.add({
        targets: allElements, alpha: 0, duration: 150,
        onComplete: () => {
          allElements.forEach(el => el.destroy());
          resumeZone.destroy();
          quitZone.destroy();
          this.isPaused = false;
          SoundManager.getInstance().resumeBGM();
          this.resetIdleHintTimer();
        },
      });
    });

    // Quit (수동 종료 — 복구 데이터 삭제 후 맵으로)
    quitZone.on('pointerdown', () => {
      SoundManager.getInstance().playButtonClick();
      clearRun();
      fadeToScene(this, 'LevelSelectScene');
    });
  }

  /** 광고로 부스터 충전 팝업 (부스터 0일 때 표시) */
  private showAdBoosterPopup(type: BoosterType, onGrant: () => void): void {
    if (!canUseAdBooster()) {
      // 일일 한도 초과 — 토스트만 표시
      const toast = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Daily ad limit reached', {
        fontSize: '28px', color: '#690008', fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontStyle: 'bold', backgroundColor: '#ffffff', padding: { x: 24, y: 12 },
      }).setOrigin(0.5).setDepth(60);
      this.tweens.add({ targets: toast, alpha: 0, y: toast.y - 60, duration: 1200, delay: 800, onComplete: () => toast.destroy() });
      return;
    }

    SoundManager.getInstance().playButtonClick();
    const allElements: Phaser.GameObjects.GameObject[] = [];
    const remaining = remainingAdBoosters();
    const labels: Record<string, string> = { shuffle: 'Shuffle', hint: 'Hint', lightning: 'Zap' };
    const icons: Record<string, string> = { shuffle: '🔀', hint: '💡', lightning: '🪄' };

    const overlay = this.add.graphics().setDepth(50);
    overlay.fillStyle(0x221a0f, 0.4);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    overlay.setAlpha(0);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT), Phaser.Geom.Rectangle.Contains);
    allElements.push(overlay);

    const popupW = 600, popupH = 340;
    const px = (GAME_WIDTH - popupW) / 2, py = (GAME_HEIGHT - popupH) / 2;

    const bg = this.add.graphics().setDepth(51);
    bg.fillStyle(0xffffff, 1);
    bg.fillRoundedRect(px, py, popupW, popupH, 36);
    bg.setAlpha(0);
    allElements.push(bg);

    const icon = this.add.text(GAME_WIDTH / 2, py + 50, icons[type] ?? '🎁', { fontSize: '48px' })
      .setOrigin(0.5).setDepth(52).setAlpha(0);
    allElements.push(icon);

    const title = this.add.text(GAME_WIDTH / 2, py + 110, `Watch Ad for ${labels[type] ?? type}?`, {
      fontSize: '36px', color: '#690008', fontFamily: 'Plus Jakarta Sans, sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(52).setAlpha(0);
    allElements.push(title);

    const sub = this.add.text(GAME_WIDTH / 2, py + 155, `${remaining} free ads remaining today`, {
      fontSize: '22px', color: '#8b7355', fontFamily: 'Plus Jakarta Sans, sans-serif',
    }).setOrigin(0.5).setDepth(52).setAlpha(0);
    allElements.push(sub);

    // Watch Ad 버튼
    const btnW = popupW - 80, btnH = 80, btnY = py + 200;
    const btnBg = this.add.graphics().setDepth(52);
    btnBg.fillStyle(0x690008, 1);
    btnBg.fillRoundedRect(px + 40, btnY, btnW, btnH, 24);
    btnBg.setAlpha(0);
    allElements.push(btnBg);

    const btnText = this.add.text(GAME_WIDTH / 2, btnY + btnH / 2, '▶  WATCH AD', {
      fontSize: '28px', color: '#ffffff', fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold', letterSpacing: 6,
    }).setOrigin(0.5).setDepth(53).setAlpha(0);
    allElements.push(btnText);

    const watchZone = this.add.zone(GAME_WIDTH / 2, btnY + btnH / 2, btnW, btnH).setInteractive().setDepth(54);

    // 닫기
    const closeBtn = this.add.text(px + popupW - 20, py + 16, '✕', {
      fontSize: '28px', color: '#aaa',
    }).setOrigin(1, 0).setDepth(53).setAlpha(0).setInteractive();
    allElements.push(closeBtn);

    this.tweens.add({ targets: allElements, alpha: 1, duration: 200, ease: 'Cubic.easeOut' });

    const close = () => {
      this.tweens.add({
        targets: allElements, alpha: 0, duration: 150,
        onComplete: () => { allElements.forEach(el => el.destroy()); watchZone.destroy(); },
      });
    };

    watchZone.on('pointerdown', () => {
      SoundManager.getInstance().playButtonClick();
      // 팝업 닫고 광고 표시 (광고는 네이티브 오버레이로 전체화면 표시됨)
      close();

      // 로딩 토스트
      const loadingToast = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Loading ad...', {
        fontSize: '28px', color: '#690008', fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontStyle: 'bold', backgroundColor: '#ffffff', padding: { x: 24, y: 12 },
      }).setOrigin(0.5).setDepth(60);

      const sm = SoundManager.getInstance();

      showRewardedAd(
        // 광고 시청 완료 → BGM 재개 + 보상 지급
        () => {
          sm.resumeBGM();
          if (loadingToast.active) loadingToast.destroy();
          grantAdBooster(type);
          onGrant();
          // 성공 토스트
          const labels: Record<string, string> = { shuffle: 'Shuffle', hint: 'Hint', lightning: 'Zap' };
          const toast = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, `+1 ${labels[type] ?? type} booster!`, {
            fontSize: '30px', color: '#ffffff', fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontStyle: 'bold', backgroundColor: '#4caf50', padding: { x: 24, y: 12 },
          }).setOrigin(0.5).setDepth(60);
          this.tweens.add({ targets: toast, alpha: 0, y: toast.y - 60, duration: 1200, delay: 800, onComplete: () => toast.destroy() });
        },
        // 광고 로드 실패 또는 중간 스킵 → BGM 재개, 지급 없음
        () => {
          sm.resumeBGM();
          if (loadingToast.active) loadingToast.destroy();
          const toast = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Ad not available.\nTry again later.', {
            fontSize: '26px', color: '#690008', fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontStyle: 'bold', backgroundColor: '#ffffff', padding: { x: 24, y: 12 },
            align: 'center',
          }).setOrigin(0.5).setDepth(60);
          this.tweens.add({ targets: toast, alpha: 0, y: toast.y - 60, duration: 1200, delay: 1200, onComplete: () => toast.destroy() });
        },
        // 광고가 실제로 화면에 표시되는 순간 → BGM 정지
        () => {
          if (loadingToast.active) loadingToast.destroy();
          sm.pauseBGM();
        },
      );
    });

    closeBtn.on('pointerdown', close);
    overlay.on('pointerdown', close);
  }

  private createSettingsButton(x: number, y: number, size = 88): void {
    const radius = size / 2;

    const bg = this.add.graphics().setDepth(6);
    bg.fillStyle(COLORS.surfaceContainerHighest, 0.6);
    bg.fillCircle(x, y, radius);
    bg.lineStyle(2, COLORS.surfaceContainerHigh, 0.5);
    bg.strokeCircle(x, y, radius);

    this.add.text(x, y, '⚙️', {
      fontSize: `${Math.round(size * 0.38)}px`,
      padding: { top: 4, bottom: 4, left: 4, right: 4 },
    }).setOrigin(0.5).setDepth(7);

    const zone = this.add.zone(x, y, size + 10, size + 10).setInteractive().setDepth(10);
    zone.on('pointerdown', () => {
      SoundManager.getInstance().playButtonClick();
      launchOverScene(this, 'SettingsScene', { from: 'GameScene' });
    });
  }

  shutdown(): void {
    removeBanner();
  }
}
