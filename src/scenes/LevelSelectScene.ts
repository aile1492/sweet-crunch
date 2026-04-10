import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, TileType } from '../config';
import { LEVELS, getLevelDef } from '../data/levels';
import { loadProgress, regenerateHearts, consumeHeart, MAX_HEARTS, getNextHeartTimeMs } from '../data/progress';
import { SoundManager } from '../utils/SoundManager';
import { fadeToScene, fadeIn } from '../utils/SceneTransition';
import { showBanner, removeBanner } from '../utils/AdMobManager';
import { loadRun, clearRun, RunSnapshot } from '../data/activeRun';

// ─── 레벨맵 레이아웃 상수 ───
const NODE_SIZE_NORMAL = 160;      // 일반 레벨 노드 (w-20 → 80px → 1080 스케일)
const NODE_SIZE_CURRENT = 224;     // 현재 레벨 노드 (w-28 → 112px → 스케일)
const LEVEL_GAP_Y = 240;          // 레벨 간 세로 간격
const PATH_START_Y = 400;         // 첫 레벨 Y 위치
const TOP_BAR_HEIGHT = 160;       // 상단 바 높이
const BOTTOM_BAR_HEIGHT = 200;    // 하단 광고 영역 높이

// 와인딩 경로: 레벨별 X 오프셋 패턴 (중앙 기준 좌우)
const X_OFFSETS = [120, 0, -140, 80, -40, 160, -100, 60, -160, 120, -60, 140, -120, 40, 100, -80, 160, -140, 60, -40];

export class LevelSelectScene extends Phaser.Scene {
  private scrollContainer!: Phaser.GameObjects.Container;
  private totalContentHeight = 0;
  private scrollY = 0;
  private isDragging = false;
  private dragStartY = 0;
  private dragStartScrollY = 0;
  private velocity = 0;
  private lastPointerY = 0;
  private lastPointerTime = 0;

  constructor() {
    super({ key: 'LevelSelectScene' });
  }

  create(): void {
    fadeIn(this);
    const progress = loadProgress();

    SoundManager.getInstance().setScene(this);
    this.input.once('pointerdown', () => SoundManager.getInstance().ensureContext());

    this.cameras.main.setBackgroundColor('#FFF8F3');

    // ─── 배경 점 패턴 ───
    this.drawDotPattern();

    // ─── 스크롤 가능한 컨텐츠 컨테이너 ───
    this.scrollContainer = this.add.container(0, 0);
    this.totalContentHeight = PATH_START_Y + LEVELS.length * LEVEL_GAP_Y + 200;

    // ─── 와인딩 경로 점선 ───
    this.drawWindingPath(progress);

    // ─── 레벨 노드 ───
    // 현재 레벨 찾기 (스크롤 위치 계산용)
    let currentLevelIndex = 0;
    for (let i = 0; i < LEVELS.length; i++) {
      const level = LEVELS[i];
      const isUnlocked = level.level <= progress.highestUnlocked;
      const starCount = progress.stars[level.level] ?? 0;
      const isCurrent = isUnlocked && starCount === 0 && level.level === progress.highestUnlocked;

      const x = GAME_WIDTH / 2 + (X_OFFSETS[i % X_OFFSETS.length] ?? 0);
      const y = PATH_START_Y + i * LEVEL_GAP_Y;

      if (isCurrent) currentLevelIndex = i;

      if (isCurrent) {
        this.createCurrentLevelNode(x, y, level.level);
      } else if (isUnlocked) {
        this.createCompletedLevelNode(x, y, level.level, starCount);
      } else {
        this.createLockedLevelNode(x, y, level.level);
      }
    }

    // ─── 고정 UI (상단 바) ───
    this.drawTopBar();
    this.drawHeartsDisplay();

    // ─── 좌상단 진행도 표시 ───
    this.drawProgressIndicator(progress);

    // ─── 하단 광고 영역 (AdMob 배너) ───
    this.drawAdArea();
    showBanner();

    // ─── 스크롤 초기화 (현재 레벨이 화면 중앙에 오도록) ───
    const targetY = PATH_START_Y + currentLevelIndex * LEVEL_GAP_Y;
    this.scrollY = Math.max(0, targetY - GAME_HEIGHT / 2);
    this.scrollContainer.y = -this.scrollY;

    // ─── 스크롤 인터랙션 ───
    this.setupScrolling();

    // ─── 런 복구 프롬프트 (앱 재진입 시 이전 판 감지) ───
    const savedRun = loadRun();
    // phase === 'fail_popup' 인 스냅샷은 이어하기 대상이 아님 (패배 직전 롤백 방지)
    // 구버전 스냅샷(phase 없음)은 playing으로 간주
    if (savedRun && savedRun.phase !== 'fail_popup') {
      this.showResumePrompt(savedRun);
    }
  }

  // ─── 배경 점 패턴 ────────────────────────────────────
  private drawDotPattern(): void {
    // 원본: radial-gradient(#efe0cd 2px, transparent 2px), 24px 간격, opacity-40
    const pattern = this.add.graphics();
    pattern.setAlpha(0.4);
    for (let x = 12; x < GAME_WIDTH; x += 48) {
      for (let y = 12; y < GAME_HEIGHT; y += 48) {
        pattern.fillStyle(0xefe0cd, 1);
        pattern.fillCircle(x, y, 3);
      }
    }
  }

  // ─── 와인딩 경로 점선 ─────────────────────────────────
  private drawWindingPath(progress: ReturnType<typeof loadProgress>): void {
    const pathGraphics = this.add.graphics();
    this.scrollContainer.add(pathGraphics);

    for (let i = 0; i < LEVELS.length - 1; i++) {
      const x1 = GAME_WIDTH / 2 + (X_OFFSETS[i % X_OFFSETS.length] ?? 0);
      const y1 = PATH_START_Y + i * LEVEL_GAP_Y;
      const x2 = GAME_WIDTH / 2 + (X_OFFSETS[(i + 1) % X_OFFSETS.length] ?? 0);
      const y2 = PATH_START_Y + (i + 1) * LEVEL_GAP_Y;

      const isUnlocked = LEVELS[i].level < progress.highestUnlocked;

      // 점선 경로 — 베지어 커브
      const segments = 20;
      const dashLen = 16;
      const gapLen = 12;
      let dashAccum = 0;
      let drawing = true;

      pathGraphics.lineStyle(6, isUnlocked ? 0x8b1a1a : 0xefe0cd, isUnlocked ? 0.4 : 0.3);

      for (let s = 0; s < segments; s++) {
        const t1 = s / segments;
        const t2 = (s + 1) / segments;

        // 컨트롤 포인트: 중간에서 약간 벗어남
        const cpX = (x1 + x2) / 2 + (x2 - x1) * 0.2;
        const cpY = (y1 + y2) / 2;

        const px1 = this.quadBezier(x1, cpX, x2, t1);
        const py1 = this.quadBezier(y1, cpY, y2, t1);
        const px2 = this.quadBezier(x1, cpX, x2, t2);
        const py2 = this.quadBezier(y1, cpY, y2, t2);

        const segDist = Math.hypot(px2 - px1, py2 - py1);
        dashAccum += segDist;

        if (drawing) {
          pathGraphics.beginPath();
          pathGraphics.moveTo(px1, py1);
          pathGraphics.lineTo(px2, py2);
          pathGraphics.strokePath();
        }

        if (drawing && dashAccum >= dashLen) {
          dashAccum = 0;
          drawing = false;
        } else if (!drawing && dashAccum >= gapLen) {
          dashAccum = 0;
          drawing = true;
        }
      }
    }
  }

  private quadBezier(p0: number, p1: number, p2: number, t: number): number {
    return (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;
  }

  // ─── 클리어된 레벨 노드 ──────────────────────────────
  private createCompletedLevelNode(x: number, y: number, levelNum: number, stars: number): void {
    const container = this.add.container(x, y);
    this.scrollContainer.add(container);

    const r = NODE_SIZE_NORMAL / 2;

    // 배경 원
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.primaryContainer, 1);
    bg.fillCircle(0, 0, r);
    // 테두리
    bg.lineStyle(8, COLORS.surfaceContainerHighest, 1);
    bg.strokeCircle(0, 0, r);
    container.add(bg);

    // 레벨 번호
    const numText = this.add.text(0, -4, `${levelNum}`, {
      fontSize: '48px',
      color: '#ffffff',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(numText);

    // 쿠키 표시 (별 대신 디저트 컨셉)
    if (stars > 0) {
      const cookieY = r + 16;
      const cookieSpacing = 28;
      const startX = -((Math.min(stars, 3) - 1) * cookieSpacing) / 2;
      for (let s = 0; s < Math.min(stars, 3); s++) {
        const cookieText = this.add.text(startX + s * cookieSpacing, cookieY, '🍪', {
          fontSize: '22px',
        }).setOrigin(0.5);
        container.add(cookieText);
      }
    }

    // 인터랙티브
    container.setSize(NODE_SIZE_NORMAL, NODE_SIZE_NORMAL);
    container.setInteractive();
    container.on('pointerdown', () => {
      SoundManager.getInstance().playButtonClick();
      this.tweens.add({
        targets: container,
        scaleX: 0.9, scaleY: 0.9,
        duration: 80, yoyo: true,
        onComplete: () => this.showLevelStartPopup(levelNum),
      });
    });
  }

  // ─── 현재 레벨 노드 (강조) ────────────────────────────
  private createCurrentLevelNode(x: number, y: number, levelNum: number): void {
    const container = this.add.container(x, y);
    this.scrollContainer.add(container);

    const r = NODE_SIZE_CURRENT / 2;

    // 글로우 이펙트 (blur simulation)
    const glow = this.add.graphics();
    glow.fillStyle(0xfacc15, 0.2);
    glow.fillCircle(0, 0, r * 1.3);
    container.add(glow);

    // 펄스 글로우
    this.tweens.add({
      targets: glow,
      alpha: 0.4,
      scaleX: 1.1, scaleY: 1.1,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 메인 원 — 노란색
    const bg = this.add.graphics();
    bg.fillStyle(0xfacc15, 1);
    bg.fillCircle(0, 0, r);
    // 흰색 테두리 (border-8 border-surface-container-lowest)
    bg.lineStyle(14, 0xffffff, 1);
    bg.strokeCircle(0, 0, r);
    container.add(bg);

    // "Level" 라벨
    const levelLabel = this.add.text(0, -24, 'LEVEL', {
      fontSize: '20px',
      color: '#1c1917',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
      letterSpacing: 6,
    }).setOrigin(0.5).setAlpha(0.6);
    container.add(levelLabel);

    // 레벨 번호 (큰 글씨)
    const numText = this.add.text(0, 20, `${levelNum}`, {
      fontSize: '72px',
      color: '#1c1917',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(numText);

    // 바운스 애니메이션
    this.tweens.add({
      targets: container,
      scaleX: 1.06, scaleY: 1.06,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 인터랙티브
    container.setSize(NODE_SIZE_CURRENT, NODE_SIZE_CURRENT);
    container.setInteractive();
    container.on('pointerdown', () => {
      SoundManager.getInstance().playButtonClick();
      this.tweens.add({
        targets: container,
        scaleX: 0.9, scaleY: 0.9,
        duration: 80, yoyo: true,
        onComplete: () => this.showLevelStartPopup(levelNum),
      });
    });
  }

  // ─── 잠긴 레벨 노드 ──────────────────────────────────
  private createLockedLevelNode(x: number, y: number, levelNum: number): void {
    const container = this.add.container(x, y);
    this.scrollContainer.add(container);

    const r = NODE_SIZE_NORMAL / 2;

    // 배경 원 (surface-dim)
    const bg = this.add.graphics();
    bg.fillStyle(0xe6d8c5, 1);
    bg.fillCircle(0, 0, r);
    bg.lineStyle(8, COLORS.surfaceContainerHighest, 1);
    bg.strokeCircle(0, 0, r);
    container.add(bg);

    // 자물쇠 아이콘
    const lock = this.add.text(0, 0, '🔒', {
      fontSize: '40px',
    }).setOrigin(0.5).setAlpha(0.4);
    container.add(lock);

    // 레벨 번호 (아래)
    const numText = this.add.text(0, r + 30, `${levelNum}`, {
      fontSize: '28px',
      color: '#58413f',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.5);
    this.scrollContainer.add(numText);
    // numText도 스크롤 컨테이너에 넣되, 절대 위치
    numText.setPosition(x, y + r + 30);
  }

  // ─── 상단 바 (고정) ───────────────────────────────────
  private drawTopBar(): void {
    // 배경 (rounded-b-3xl, backdrop-blur 시뮬레이션)
    const barBg = this.add.graphics().setDepth(40);
    barBg.fillStyle(0xfff8f0, 0.85);
    barBg.fillRoundedRect(0, 0, GAME_WIDTH, TOP_BAR_HEIGHT, { tl: 0, tr: 0, bl: 48, br: 48 });
    // 그림자
    barBg.fillStyle(0x221a0f, 0.04);
    barBg.fillRect(0, TOP_BAR_HEIGHT, GAME_WIDTH, 16);

    // 뒤로가기 (홈) 버튼
    const backBtn = this.add.text(80, TOP_BAR_HEIGHT / 2, '←', {
      fontSize: '48px',
      color: '#690008',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(41);

    const backZone = this.add.zone(80, TOP_BAR_HEIGHT / 2, 80, 80)
      .setInteractive().setDepth(42);
    backZone.on('pointerdown', () => {
      SoundManager.getInstance().playButtonClick();
      fadeToScene(this, 'TitleScene');
    });

    // 타이틀
    this.add.text(GAME_WIDTH / 2, TOP_BAR_HEIGHT / 2, 'Sweet Crunch 🧁', {
      fontSize: '36px',
      color: '#1c1917',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(41);

    // 하트 표시 (비활성화)
    // this.drawHeartsDisplay();
  }

  private heartsText!: Phaser.GameObjects.Text;
  private heartsTimerText!: Phaser.GameObjects.Text;

  private drawHeartsDisplay(): void {
    const progress = regenerateHearts(loadProgress());
    const hx = GAME_WIDTH - 120;
    const hy = TOP_BAR_HEIGHT / 2;

    // 하트 배경
    const hBg = this.add.graphics().setDepth(41);
    hBg.fillStyle(0xffdad6, 0.8);
    hBg.fillRoundedRect(hx - 70, hy - 30, 140, 60, 30);

    // 하트 아이콘
    this.add.text(hx - 40, hy, '❤️', {
      fontSize: '28px',
    }).setOrigin(0.5).setDepth(42);

    // 하트 수
    this.heartsText = this.add.text(hx + 10, hy, `${progress.hearts}/${MAX_HEARTS}`, {
      fontSize: '28px',
      color: progress.hearts > 0 ? '#690008' : '#ba1a1a',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(42);

    // 타이머 (회복 중일 때)
    this.heartsTimerText = this.add.text(hx, hy + 38, '', {
      fontSize: '20px',
      color: '#58413f',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
    }).setOrigin(0.5).setDepth(42);

    // 주기적 하트 타이머 업데이트
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.updateHeartsTimer(),
    });
    this.updateHeartsTimer();
  }

  private updateHeartsTimer(): void {
    const progress = regenerateHearts(loadProgress());
    this.heartsText?.setText(`${progress.hearts}/${MAX_HEARTS}`);
    this.heartsText?.setColor(progress.hearts > 0 ? '#690008' : '#ba1a1a');

    const ms = getNextHeartTimeMs(progress);
    if (ms > 0) {
      const min = Math.floor(ms / 60000);
      const sec = Math.floor((ms % 60000) / 1000);
      this.heartsTimerText?.setText(`${min}:${sec.toString().padStart(2, '0')}`);
    } else {
      this.heartsTimerText?.setText('');
    }
  }

  // ─── 좌상단 진행도 표시 ───────────────────────────────
  private drawProgressIndicator(progress: ReturnType<typeof loadProgress>): void {
    const totalStars = Object.values(progress.stars).reduce((sum, s) => sum + s, 0);
    const x = 80;
    const y = TOP_BAR_HEIGHT + 70;

    // 배경 카드
    const cardBg = this.add.graphics().setDepth(40);
    cardBg.fillStyle(0xffffff, 0.8);
    cardBg.fillRoundedRect(x - 56, y - 40, 112, 80, 24);
    cardBg.lineStyle(2, COLORS.surfaceContainerHighest, 0.1);
    cardBg.strokeRoundedRect(x - 56, y - 40, 112, 80, 24);

    // 쿠키 아이콘 + 카운트
    const maxCookies = LEVELS.length * 3;
    this.add.text(x, y - 14, '🍪', {
      fontSize: '28px',
    }).setOrigin(0.5).setDepth(41);

    this.add.text(x, y + 18, `${totalStars}/${maxCookies}`, {
      fontSize: '18px',
      color: '#58413f',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(41);
  }

  // ─── 하단 AdMob 배너 영역 ──────────────────────────────
  // 네이티브(Android)에서는 AdMob SDK가 이 공간 위에 네이티브 배너를 오버레이합니다.
  // 웹 환경에서는 "AD" 레이블이 표시된 플레이스홀더가 나타납니다.
  private drawAdArea(): void {
    const adBg = this.add.graphics().setDepth(40);
    adBg.fillStyle(0xf5e6d8, 1);
    adBg.fillRect(0, GAME_HEIGHT - BOTTOM_BAR_HEIGHT, GAME_WIDTH, BOTTOM_BAR_HEIGHT);

    // 구분선
    adBg.lineStyle(2, 0xd4b8a8, 1);
    adBg.lineBetween(0, GAME_HEIGHT - BOTTOM_BAR_HEIGHT, GAME_WIDTH, GAME_HEIGHT - BOTTOM_BAR_HEIGHT);

    // 웹 환경 전용 플레이스홀더 텍스트 (네이티브에서는 AdMob 배너가 덮어씀)
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - BOTTOM_BAR_HEIGHT / 2, 'Advertisement', {
      fontSize: '24px',
      color: '#b09080',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      letterSpacing: 4,
    }).setOrigin(0.5).setDepth(41).setAlpha(0.5);
  }

  shutdown(): void {
    removeBanner();
  }

  // ─── 런 복구 프롬프트 ──────────────────────────────────
  /** 직전에 저장된 진행 중 판이 있으면 "이어하기 / 새로 시작" 팝업을 표시 */
  private showResumePrompt(snap: RunSnapshot): void {
    const allElements: Phaser.GameObjects.GameObject[] = [];

    // 딤 오버레이
    const overlay = this.add.graphics().setDepth(80);
    overlay.fillStyle(0x221a0e, 0.45);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    overlay.setAlpha(0);
    overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );
    allElements.push(overlay);

    // 팝업 카드
    const popupW = 720;
    const popupH = 420;
    const px = (GAME_WIDTH - popupW) / 2;
    const py = (GAME_HEIGHT - popupH) / 2;

    const card = this.add.graphics().setDepth(81);
    card.fillStyle(0x221a0f, 0.1);
    card.fillRoundedRect(px + 4, py + 16, popupW, popupH, 48);
    card.fillStyle(0xfff8f3, 1);
    card.fillRoundedRect(px, py, popupW, popupH, 48);
    card.setAlpha(0);
    allElements.push(card);

    // 제목 아이콘
    const icon = this.add.text(GAME_WIDTH / 2, py + 72, '📍', {
      fontSize: '56px',
    }).setOrigin(0.5).setDepth(82).setAlpha(0);
    allElements.push(icon);

    // 제목
    const title = this.add.text(GAME_WIDTH / 2, py + 148, `Level ${snap.level} 진행 중`, {
      fontSize: '40px',
      color: '#221a0f',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(82).setAlpha(0);
    allElements.push(title);

    // 설명
    const desc = this.add.text(GAME_WIDTH / 2, py + 210, `이동 ${snap.movesLeft}회 남음  •  점수 ${snap.score.toLocaleString()}`, {
      fontSize: '28px',
      color: '#58413f',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
    }).setOrigin(0.5).setDepth(82).setAlpha(0);
    allElements.push(desc);

    // 버튼 공통
    const btnW = 280;
    const btnH = 96;
    const btnY = py + popupH - 56 - btnH;

    // "이어하기" 버튼
    const resumeBg = this.add.graphics().setDepth(82);
    resumeBg.fillStyle(0x690008, 1);
    resumeBg.fillRoundedRect(px + 40, btnY, btnW, btnH, 32);
    resumeBg.setAlpha(0);
    allElements.push(resumeBg);

    const resumeText = this.add.text(px + 40 + btnW / 2, btnY + btnH / 2, '이어하기', {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(83).setAlpha(0);
    allElements.push(resumeText);

    const resumeZone = this.add.zone(px + 40 + btnW / 2, btnY + btnH / 2, btnW, btnH)
      .setInteractive().setDepth(84);

    // "새로 시작" 버튼
    const freshBg = this.add.graphics().setDepth(82);
    freshBg.fillStyle(0xf5e6d8, 1);
    freshBg.fillRoundedRect(px + popupW - 40 - btnW, btnY, btnW, btnH, 32);
    freshBg.setAlpha(0);
    allElements.push(freshBg);

    const freshText = this.add.text(px + popupW - 40 - btnW / 2, btnY + btnH / 2, '새로 시작', {
      fontSize: '32px',
      color: '#690008',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(83).setAlpha(0);
    allElements.push(freshText);

    const freshZone = this.add.zone(px + popupW - 40 - btnW / 2, btnY + btnH / 2, btnW, btnH)
      .setInteractive().setDepth(84);

    const close = () => {
      this.tweens.add({
        targets: allElements,
        alpha: 0,
        duration: 150,
        onComplete: () => {
          allElements.forEach(el => el.destroy());
          resumeZone.destroy();
          freshZone.destroy();
        },
      });
    };

    // 페이드 인
    this.tweens.add({ targets: allElements, alpha: 1, duration: 200, ease: 'Cubic.easeOut' });

    // 이어하기
    resumeZone.on('pointerdown', () => {
      SoundManager.getInstance().playButtonClick();
      fadeToScene(this, 'GameScene', { level: snap.level, resumeRun: true });
    });

    // 새로 시작 (복구 데이터 삭제 후 팝업 닫기)
    freshZone.on('pointerdown', () => {
      SoundManager.getInstance().playButtonClick();
      clearRun();
      close();
    });
  }

  // ─── 스크롤 인터랙션 ──────────────────────────────────
  private setupScrolling(): void {
    const maxScroll = Math.max(0, this.totalContentHeight - GAME_HEIGHT + BOTTOM_BAR_HEIGHT);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // 상단/하단 고정 UI 영역은 스크롤 무시
      if (pointer.y < TOP_BAR_HEIGHT || pointer.y > GAME_HEIGHT - BOTTOM_BAR_HEIGHT) return;
      this.isDragging = true;
      this.dragStartY = pointer.y;
      this.dragStartScrollY = this.scrollY;
      this.velocity = 0;
      this.lastPointerY = pointer.y;
      this.lastPointerTime = Date.now();
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      const dy = this.dragStartY - pointer.y;
      this.scrollY = Phaser.Math.Clamp(this.dragStartScrollY + dy, 0, maxScroll);
      this.scrollContainer.y = -this.scrollY;

      // 속도 계산
      const now = Date.now();
      const dt = now - this.lastPointerTime;
      if (dt > 0) {
        this.velocity = (this.lastPointerY - pointer.y) / dt * 16; // px/frame
      }
      this.lastPointerY = pointer.y;
      this.lastPointerTime = now;
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
    });

    // 관성 스크롤
    this.events.on('update', () => {
      if (this.isDragging) return;
      if (Math.abs(this.velocity) < 0.5) {
        this.velocity = 0;
        return;
      }
      this.velocity *= 0.92; // 감속
      this.scrollY = Phaser.Math.Clamp(this.scrollY + this.velocity, 0, maxScroll);
      this.scrollContainer.y = -this.scrollY;
    });
  }

  // ─── 레벨 스타트 팝업 ─────────────────────────────────
  showLevelStartPopup(levelNum: number): void {
    const levelDef = getLevelDef(levelNum);
    if (!levelDef) return;

    const allElements: Phaser.GameObjects.GameObject[] = [];
    const allZones: Phaser.GameObjects.Zone[] = [];

    // ── 오버레이 ──
    const overlay = this.add.graphics().setDepth(60);
    overlay.fillStyle(0x221a0e, 0.3);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    overlay.setAlpha(0);
    overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains
    );
    allElements.push(overlay);

    // ── 팝업 레이아웃 (HTML 구조 기반) ──
    // HTML: max-w-sm, px-8 pt-10 pb-12
    // 스케일: 1px CSS ≈ 2px 게임좌표
    const popupW = 780;
    const padX = 64;       // px-8 = 32px → 64
    const padTop = 80;     // pt-10 = 40px → 80
    const padBot = 96;     // pb-12 = 48px → 96
    const cardRadius = 64; // rounded-[40px]

    // 컨텐츠 높이 계산 (위→아래 순서대로)
    const labelH = 24;          // "BAKERY CHALLENGE" text-xs
    const labelGap = 8;         // mb-2
    const titleH = 112;         // text-[3.5rem]
    const titleGap = 64;        // mb-8
    const goalCardPad = 48;     // p-6
    const iconSize = 120;       // w-16 h-16 → 스케일
    const iconGap = 16;         // gap-2
    const countH = 40;          // text-xl
    const goalInnerGap = 48;    // gap-6 (아이콘→pill)
    const pillH = 48;           // py-2 + text
    const goalCardH = goalCardPad + iconSize + iconGap + countH + goalInnerGap + pillH + goalCardPad;
    const startGap = 80;        // mt-10 = 40px → 80
    const startBtnH = 120;      // h-16 → 스케일

    const popupH = padTop + labelH + labelGap + titleH + titleGap
                 + goalCardH + startGap + startBtnH + padBot;

    const px = (GAME_WIDTH - popupW) / 2;
    const py = (GAME_HEIGHT - popupH) / 2;

    // ── 팝업 카드 배경 ──
    const popupBg = this.add.graphics().setDepth(61);
    popupBg.fillStyle(0x221a0f, 0.12);
    popupBg.fillRoundedRect(px + 4, py + 16, popupW, popupH, cardRadius);
    popupBg.fillStyle(0xffffff, 1);
    popupBg.fillRoundedRect(px, py, popupW, popupH, cardRadius);
    popupBg.setAlpha(0);
    allElements.push(popupBg);

    // ── 닫기 버튼 (✕) — absolute top-6 right-6 ──
    const closeX = px + popupW - 70;
    const closeY = py + 64;
    const closeBtn = this.add.text(closeX, closeY, '✕', {
      fontSize: '40px',
      color: '#58413f',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
    }).setOrigin(0.5).setDepth(62).setAlpha(0);
    allElements.push(closeBtn);

    const closeZone = this.add.zone(closeX, closeY, 80, 80)
      .setInteractive().setDepth(63);
    allZones.push(closeZone);

    // ── Y 커서 (위에서 아래로 순차 배치) ──
    let cy = py + padTop;

    // "BAKERY CHALLENGE" — text-xs, mb-2
    const challengeLabel = this.add.text(GAME_WIDTH / 2, cy + labelH / 2, 'BAKERY CHALLENGE', {
      fontSize: '20px',
      color: '#690008',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
      letterSpacing: 8,
    }).setOrigin(0.5).setDepth(62).setAlpha(0);
    allElements.push(challengeLabel);
    cy += labelH + labelGap;

    // "Level X" — text-[3.5rem], mb-8
    const levelTitle = this.add.text(GAME_WIDTH / 2, cy + titleH / 2, `Level ${levelNum}`, {
      fontSize: '112px',
      color: '#221a0f',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(62).setAlpha(0);
    allElements.push(levelTitle);
    cy += titleH + titleGap;

    // ── 목표 카드 — bg-surface-container-low rounded-xl p-6 ──
    const goalBoxW = popupW - padX * 2;
    const goalBoxX = px + padX;
    const goalBoxY = cy;

    const goalBg = this.add.graphics().setDepth(61);
    goalBg.fillStyle(0xfff2e2, 1);
    goalBg.fillRoundedRect(goalBoxX, goalBoxY, goalBoxW, goalCardH, 28);
    goalBg.setAlpha(0);
    allElements.push(goalBg);

    // 목표 아이콘들 — flex justify-around
    const goals = levelDef.goals;
    const goalSpacing = goalBoxW / (goals.length + 1);
    const iconCenterY = goalBoxY + goalCardPad + iconSize / 2;

    goals.forEach((goal, i) => {
      const gx = goalBoxX + goalSpacing * (i + 1);

      // 아이콘 배경 — w-16 h-16 rounded-2xl
      const iconBg = this.add.graphics().setDepth(62);
      iconBg.fillStyle(0x782e3d, 0.1);
      iconBg.fillRoundedRect(gx - iconSize / 2, iconCenterY - iconSize / 2, iconSize, iconSize, 32);
      iconBg.setAlpha(0);
      allElements.push(iconBg);

      // 타일 이미지
      const tileImg = this.add.image(gx, iconCenterY, goal.tileType ?? 'cupcake')
        .setDisplaySize(80, 80)
        .setDepth(62).setAlpha(0);
      allElements.push(tileImg);

      // 수량 — text-xl font-bold, gap-2 below icon
      const countText = this.add.text(gx, iconCenterY + iconSize / 2 + iconGap + countH / 2, `x${goal.count}`, {
        fontSize: '40px',
        color: '#221a0f',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(62).setAlpha(0);
      allElements.push(countText);
    });

    // Moves pill — inside goal card, after gap-6
    const movesPillY = iconCenterY + iconSize / 2 + iconGap + countH + goalInnerGap;
    const movesPillW = 280;

    const movesBg = this.add.graphics().setDepth(62);
    movesBg.fillStyle(COLORS.surfaceContainerHighest, 0.5);
    movesBg.fillRoundedRect(
      GAME_WIDTH / 2 - movesPillW / 2, movesPillY,
      movesPillW, pillH, pillH / 2
    );
    movesBg.setAlpha(0);
    allElements.push(movesBg);

    const movesText = this.add.text(GAME_WIDTH / 2, movesPillY + pillH / 2, `👟  Moves: ${levelDef.moves}`, {
      fontSize: '24px',
      color: '#6e6353',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(62).setAlpha(0);
    allElements.push(movesText);

    cy += goalCardH + startGap;

    // ── START 버튼 — mt-10 w-full h-16 rounded-xl ──
    const startBtnW = popupW - padX * 2;
    const startBtnX = px + padX;
    const startBtnY = cy;

    const startBg = this.add.graphics().setDepth(62);
    startBg.fillStyle(0x690008, 1);
    startBg.fillRoundedRect(startBtnX, startBtnY, startBtnW, startBtnH, 28);
    startBg.fillStyle(0x8b1a1a, 1);
    startBg.fillRoundedRect(startBtnX, startBtnY, startBtnW, startBtnH * 0.55, { tl: 28, tr: 28, bl: 0, br: 0 });
    // 그림자
    const startShadow = this.add.graphics().setDepth(61);
    startShadow.fillStyle(0x690008, 0.15);
    startShadow.fillRoundedRect(startBtnX + 2, startBtnY + 8, startBtnW, startBtnH, 28);
    startShadow.setAlpha(0);
    startBg.setAlpha(0);
    allElements.push(startShadow);
    allElements.push(startBg);

    const startText = this.add.text(GAME_WIDTH / 2, startBtnY + startBtnH / 2, 'START', {
      fontSize: '40px',
      color: '#ffffff',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
      letterSpacing: 4,
    }).setOrigin(0.5).setDepth(62).setAlpha(0);
    allElements.push(startText);

    const startZone = this.add.zone(
      GAME_WIDTH / 2, startBtnY + startBtnH / 2,
      startBtnW, startBtnH
    ).setInteractive().setDepth(63);
    allZones.push(startZone);

    // ── 등장 애니메이션 ──
    this.tweens.add({
      targets: allElements,
      alpha: 1,
      duration: 250,
      ease: 'Cubic.easeOut',
    });

    // ── 닫기 ──
    const closePopup = () => {
      SoundManager.getInstance().playButtonClick();
      this.tweens.add({
        targets: allElements,
        alpha: 0,
        duration: 150,
        onComplete: () => {
          allElements.forEach(el => el.destroy());
          allZones.forEach(z => z.destroy());
        },
      });
    };

    closeZone.on('pointerdown', closePopup);
    overlay.on('pointerdown', closePopup);

    // ── START 클릭 ──
    startZone.on('pointerdown', () => {
      SoundManager.getInstance().playButtonClick();
      allElements.forEach(el => el.destroy());
      allZones.forEach(z => z.destroy());
      // BGM 페이드 아웃과 화면 페이드 아웃을 동시에 시작
      SoundManager.getInstance().fadeBGMOut(this, 250);
      fadeToScene(this, 'GameScene', { level: levelNum });
    });
  }
}
