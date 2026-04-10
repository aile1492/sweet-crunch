import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config';
import { SoundManager } from '../utils/SoundManager';
import { fadeToScene, fadeIn } from '../utils/SceneTransition';
// progress import 제거됨 (일일 보상 삭제)

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    fadeIn(this);
    this.cameras.main.setBackgroundColor('#FFF8F3');

    // 사운드 시스템 초기화
    const sm = SoundManager.getInstance();
    sm.setScene(this);
    this.input.once('pointerdown', () => {
      sm.ensureContext();
      sm.playBGM('bgm_title');
    });

    // ─── 배경 텍스처 (밀가루/파우더) ───
    this.drawFlourTexture();

    // ─── 하단 스프링클 패턴 ───
    this.drawSprinklePattern();

    // ─── 상단 장식 아이콘 ───
    this.drawFloatingIcons();

    // ─── 중앙 로고 ───
    this.drawLogo();

    // ─── 하단 버튼 ───
    this.drawButtons();
    // 세팅 버튼 및 일일 보상 제거됨 (설정은 게임 내 일시정지에서 접근)
  }

  // ─── 배경 밀가루 텍스처 ──────────────────────────────
  private drawFlourTexture(): void {
    // 원본: 전체 배경에 opacity-5인 밀가루 텍스처
    // Phaser에서 이미지 없이 노이즈 패턴으로 대체
    const texture = this.add.graphics();
    texture.setAlpha(0.04);

    // 부드러운 원형 노이즈 패턴으로 밀가루 느낌
    for (let i = 0; i < 300; i++) {
      const x = Math.random() * GAME_WIDTH;
      const y = GAME_HEIGHT * 0.3 + Math.random() * GAME_HEIGHT * 0.5;
      const r = 20 + Math.random() * 60;
      texture.fillStyle(0xd3c4b1, 0.3 + Math.random() * 0.4);
      texture.fillCircle(x, y, r);
    }

    // 중앙에 큰 밀가루 뭉침
    texture.fillStyle(0xe0d0c0, 0.6);
    texture.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT * 0.55, 300);
    texture.fillStyle(0xf0e5d8, 0.4);
    texture.fillCircle(GAME_WIDTH / 2 - 80, GAME_HEIGHT * 0.5, 200);
    texture.fillCircle(GAME_WIDTH / 2 + 100, GAME_HEIGHT * 0.6, 220);
  }

  // ─── 하단 스프링클 패턴 ────────────────────────────────
  private drawSprinklePattern(): void {
    // 원본: radial-gradient(#E0BFBC 1px, transparent 1px), 24px 간격
    // mask-image: linear-gradient(to top, black, transparent) — 하단에서 위로 페이드
    const pattern = this.add.graphics();
    const patternHeight = 400; // 하단 400px 영역
    const startY = GAME_HEIGHT - patternHeight;

    for (let x = 12; x < GAME_WIDTH; x += 24) {
      for (let y = startY; y < GAME_HEIGHT; y += 24) {
        // 아래로 갈수록 진해지는 마스크
        const progress = (y - startY) / patternHeight;
        const alpha = progress * 0.3; // max 0.3 opacity
        pattern.fillStyle(0xe0bfbc, alpha);
        pattern.fillCircle(x, y, 1.5);
      }
    }
  }

  // ─── 장식 아이콘 (상단) ────────────────────────────────
  private drawFloatingIcons(): void {
    // 원본 HTML 기준:
    // 좌: w-16 h-16 (64px), -rotate-12 translate-y-4, tertiary gradient
    // 중: w-20 h-20 (80px), rotate-6 -translate-y-6, secondary gradient
    // 우: w-14 h-14 (56px), -rotate-6 translate-y-2, primary gradient
    // 전체 영역: py-12(48px) 후 h-32(128px) 영역

    const topPadding = 100;
    const iconAreaY = topPadding + 130; // 아이콘 중심 Y

    const icons = [
      {
        x: GAME_WIDTH * 0.18, // 좌측
        y: iconAreaY + 30,     // translate-y-4 (아래로)
        size: 130,             // w-16 → 1080 기준 스케일업
        gradTop: 0x782e3d,
        gradBot: 0x5b1827,
        emoji: '🥐',
        rot: -12,
      },
      {
        x: GAME_WIDTH * 0.5,  // 중앙
        y: iconAreaY - 50,     // -translate-y-6 (위로)
        size: 170,             // w-20 → 스케일업
        gradTop: 0xf0e0cc,
        gradBot: 0xd3c4b1,
        emoji: '🍪',
        rot: 6,
      },
      {
        x: GAME_WIDTH * 0.82, // 우측
        y: iconAreaY + 15,     // translate-y-2 (약간 아래)
        size: 115,             // w-14 → 스케일업
        gradTop: 0x8b1a1a,
        gradBot: 0x690008,
        emoji: '🎂',
        rot: -6,
      },
    ];

    icons.forEach((icon, i) => {
      const container = this.add.container(icon.x, icon.y);
      const r = icon.size / 2;

      // 그림자
      const shadow = this.add.graphics();
      shadow.fillStyle(0x000000, 0.12);
      shadow.fillEllipse(4, r * 0.6, icon.size * 0.7, 16);
      container.add(shadow);

      // 원형 배경 (그라디언트: 상단 밝은색 → 하단 어두운색)
      const bg = this.add.graphics();
      bg.fillStyle(icon.gradBot, 1);
      bg.fillCircle(0, 0, r);
      // 상단 하이라이트
      bg.fillStyle(icon.gradTop, 1);
      bg.fillCircle(0, -r * 0.12, r - 3);
      container.add(bg);

      // 이모지
      const fontSize = Math.round(icon.size * 0.42);
      const text = this.add.text(0, 0, icon.emoji, {
        fontSize: `${fontSize}px`,
        padding: { x: Math.round(fontSize * 0.25), y: Math.round(fontSize * 0.25) },
      }).setOrigin(0.5);
      container.add(text);

      container.setAngle(icon.rot);

      // 떠다니는 애니메이션
      this.tweens.add({
        targets: container,
        y: icon.y + (i % 2 === 0 ? 12 : -12),
        duration: 2000 + i * 300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  // ─── 로고 (중앙, justify-between 기준 중간) ───────────
  private drawLogo(): void {
    // 원본: flex justify-between → 아이콘, 로고, 버튼이 수직 균등 배치
    // 아이콘 영역: ~top 15%, 버튼 영역: ~bottom 15%, 로고: 중간
    const centerY = GAME_HEIGHT / 2;

    // Sweet Crunch 타이틀
    const title = this.add.text(GAME_WIDTH / 2, centerY, 'Sweet\nCrunch', {
      fontSize: '140px',
      color: '#8B1A1A',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: -20,
    }).setOrigin(0.5);

    // 서브타이틀
    this.add.text(GAME_WIDTH / 2, centerY + 160, 'THE GOURMET BAKERY PUZZLE', {
      fontSize: '22px',
      color: '#6e6353',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
      letterSpacing: 8,
    }).setOrigin(0.5).setAlpha(0.7);

    // 타이틀 미세 바운스
    this.tweens.add({
      targets: title,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // ─── 버튼 (하단) ───────────────────────────────────
  private drawButtons(): void {
    // 원본: py-12(48px) 하단 패딩, max-w-xs(320px) 기준
    // 1080px 스케일: max-w-xs → 약 680px, gap → 24px
    const playBtnY = GAME_HEIGHT - 340 - 128;

    // PLAY 버튼 (메인)
    this.createPlayButton(GAME_WIDTH / 2, playBtnY);

    // Recipes + Settings 버튼 (비활성화)
    // const subBtnY = playBtnY + 120;
    // const totalWidth = 680;
    // const gap = 24;
    // const btnWidth = (totalWidth - gap) / 2;
    // this.createSubButton(
    //   GAME_WIDTH / 2 - totalWidth / 2 + btnWidth / 2, subBtnY,
    //   btnWidth, 'Recipes', '📖',
    //   () => this.showComingSoon('Recipe Book')
    // );
    // this.createSubButton(
    //   GAME_WIDTH / 2 + totalWidth / 2 - btnWidth / 2, subBtnY,
    //   btnWidth, 'Settings', '⚙️',
    //   () => fadeToScene(this, 'SettingsScene')
    // );
  }

  private drawSettingsButton(): void {
    const x = GAME_WIDTH - 110;
    const y = 110;
    const container = this.add.container(x, y);

    const shadow = this.add.graphics();
    shadow.fillStyle(0x690008, 0.12);
    shadow.fillCircle(2, 8, 46);
    container.add(shadow);

    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.92);
    bg.fillCircle(0, 0, 44);
    bg.lineStyle(3, 0xefe0cd, 1);
    bg.strokeCircle(0, 0, 44);
    container.add(bg);

    const icon = this.add.text(0, 0, 'SET', {
      fontSize: '18px',
      color: '#690008',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
      letterSpacing: 3,
    }).setOrigin(0.5);
    container.add(icon);

    container.setSize(88, 88);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerdown', () => {
      SoundManager.getInstance().playButtonClick();
      this.tweens.add({
        targets: container,
        scaleX: 0.92,
        scaleY: 0.92,
        duration: 90,
        yoyo: true,
        onComplete: () => fadeToScene(this, 'SettingsScene', { from: 'TitleScene' }),
      });
    });
  }

  private createPlayButton(x: number, y: number): void {
    // 원본: w-full h-16 rounded-xl (16px=1rem 기준)
    // 1080 스케일: w=680, h=128, rounded=32
    const w = 680;
    const h = 128;
    const radius = 32;
    const container = this.add.container(x, y);

    // 그림자 (shadow-[0_8px_24px_rgba(105,0,8,0.2)])
    const shadow = this.add.graphics();
    shadow.fillStyle(0x690008, 0.2);
    shadow.fillRoundedRect(-w / 2 + 2, -h / 2 + 8, w, h, radius);
    container.add(shadow);

    // 그라디언트 배경 (linear-gradient(150deg, #690008, #8B1A1A))
    const bg = this.add.graphics();
    bg.fillStyle(0x690008, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    // 상단 하이라이트로 그라디언트 시뮬레이션
    bg.fillStyle(0x8b1a1a, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h * 0.55, { tl: radius, tr: radius, bl: 0, br: 0 });
    container.add(bg);

    // PLAY 텍스트
    const text = this.add.text(0, 0, 'PLAY', {
      fontSize: '48px',
      color: '#ffffff',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
      letterSpacing: 8,
    }).setOrigin(0.5);
    container.add(text);

    // 인터랙티브
    container.setSize(w, h);
    container.setInteractive();

    // 펄스 애니메이션
    this.tweens.add({
      targets: container,
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    container.on('pointerdown', () => {
      SoundManager.getInstance().playButtonClick();
      this.tweens.add({
        targets: container,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 80,
        yoyo: true,
        onComplete: () => {
          fadeToScene(this, 'LevelSelectScene');
        },
      });
    });
  }

  private createSubButton(x: number, y: number, w: number, label: string, icon: string, onClick: () => void): void {
    // 원본: h-12 rounded-xl bg-surface-container-high
    // 1080 스케일: h=96, rounded=32
    const h = 96;
    const radius = 32;
    const container = this.add.container(x, y);

    // 배경
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.surfaceContainerHigh, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    container.add(bg);

    // 아이콘 + 라벨 (중앙 정렬, gap-2)
    const totalTextWidth = 28 + 8 + label.length * 16; // 대략 추산
    const startX = -totalTextWidth / 2;

    const iconText = this.add.text(startX, 0, icon, {
      fontSize: '28px',
    }).setOrigin(0, 0.5);
    container.add(iconText);

    const labelText = this.add.text(startX + 42, 0, label, {
      fontSize: '28px',
      color: '#6e6353',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    container.add(labelText);

    // 인터랙티브
    container.setSize(w, h);
    container.setInteractive();

    container.on('pointerdown', () => {
      SoundManager.getInstance().playButtonClick();
      this.tweens.add({
        targets: container,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 80,
        yoyo: true,
        onComplete: onClick,
      });
    });
  }

  // ─── 설정 팝업 ─────────────────────────────────────
  private showSettingsPopup(): void {
    const overlay = this.add.graphics().setDepth(50);
    overlay.fillStyle(0x221a0f, 0.3);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    overlay.setAlpha(0);
    overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains
    );

    const popupW = 640;
    const popupH = 400;
    const px = GAME_WIDTH / 2 - popupW / 2;
    const py = GAME_HEIGHT / 2 - popupH / 2;

    const popupBg = this.add.graphics().setDepth(51);
    popupBg.fillStyle(0xffffff, 1);
    popupBg.fillRoundedRect(px, py, popupW, popupH, 40);
    popupBg.setAlpha(0);

    // 제목
    const title = this.add.text(GAME_WIDTH / 2, py + 60, 'Settings', {
      fontSize: '48px',
      color: '#221a0f',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(52).setAlpha(0);

    // 사운드 토글
    const sound = SoundManager.getInstance();
    const soundLabel = this.add.text(px + 60, py + 160, 'Sound', {
      fontSize: '32px',
      color: '#58413f',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(52).setAlpha(0);

    const toggleBg = this.add.graphics().setDepth(52).setAlpha(0);
    const toggleCircle = this.add.graphics().setDepth(53).setAlpha(0);
    const drawToggle = (muted: boolean) => {
      toggleBg.clear();
      toggleBg.fillStyle(muted ? 0xbdbdbd : 0x690008, 1);
      toggleBg.fillRoundedRect(px + popupW - 160, py + 140, 100, 44, 22);
      toggleCircle.clear();
      toggleCircle.fillStyle(0xffffff, 1);
      toggleCircle.fillCircle(muted ? px + popupW - 138 : px + popupW - 82, py + 162, 18);
    };
    drawToggle(sound.isMuted);

    const toggleZone = this.add.zone(px + popupW - 110, py + 162, 100, 44)
      .setInteractive().setDepth(54);
    toggleZone.on('pointerdown', () => {
      sound.ensureContext();
      const muted = sound.toggleMute();
      drawToggle(muted);
      sound.playButtonClick();
    });

    // CLOSE 버튼
    const closeBtnY = py + popupH - 80;
    const closeBg = this.add.graphics().setDepth(52).setAlpha(0);
    closeBg.fillStyle(COLORS.primaryContainer, 1);
    closeBg.fillRoundedRect(px + 40, closeBtnY - 30, popupW - 80, 60, 30);

    const closeText = this.add.text(GAME_WIDTH / 2, closeBtnY, 'CLOSE', {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(53).setAlpha(0);

    const closeZone = this.add.zone(GAME_WIDTH / 2, closeBtnY, popupW - 80, 60)
      .setInteractive().setDepth(54);

    const allElements = [overlay, popupBg, title, soundLabel, toggleBg, toggleCircle, closeBg, closeText];

    // 등장
    this.tweens.add({
      targets: allElements,
      alpha: 1,
      duration: 200,
      ease: 'Cubic.easeOut',
    });

    // 닫기
    const closePopup = () => {
      SoundManager.getInstance().playButtonClick();
      this.tweens.add({
        targets: allElements,
        alpha: 0,
        duration: 150,
        onComplete: () => {
          allElements.forEach(el => el.destroy());
          toggleZone.destroy();
          closeZone.destroy();
        },
      });
    };

    closeZone.on('pointerdown', closePopup);
    overlay.on('pointerdown', closePopup);
  }

  // ─── Coming Soon 안내 ──────────────────────────────
  private showComingSoon(feature: string): void {
    const text = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `${feature}\nComing Soon!`, {
      fontSize: '44px',
      color: '#690008',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
      align: 'center',
      stroke: '#ffffff',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(30).setAlpha(0);

    this.tweens.add({
      targets: text,
      alpha: 1,
      y: GAME_HEIGHT / 2 - 30,
      duration: 300,
      yoyo: true,
      hold: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }
}
