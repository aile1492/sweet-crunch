import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config';

const LOADING_TIPS = [
  'Mixing the batter...',
  'Preheating the oven...',
  'Adding sprinkles...',
  'Frosting the cupcakes...',
  'Glazing the donuts...',
];

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.cameras.main.setBackgroundColor(COLORS.background);

    // ─── 로딩 화면 UI ─────────────────────────
    // 로고
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.38, 'Sweet\nCrunch', {
      fontSize: '96px',
      color: '#8B1A1A',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5);

    // 프로그레스 바 배경
    const barW = 560;
    const barH = 20;
    const barY = GAME_HEIGHT * 0.58;
    const barX = GAME_WIDTH / 2 - barW / 2;

    const barBg = this.add.graphics();
    barBg.fillStyle(COLORS.surfaceContainerHighest, 1);
    barBg.fillRoundedRect(barX, barY, barW, barH, 10);

    // 프로그레스 바 채우기
    const barFill = this.add.graphics();
    this.load.on('progress', (value: number) => {
      barFill.clear();
      barFill.fillStyle(COLORS.primary, 1);
      const fillW = Math.round(barW * value);
      if (fillW > 0) {
        barFill.fillRoundedRect(barX, barY, fillW, barH, 10);
      }
    });

    // 로딩 팁 텍스트
    const tipText = this.add.text(GAME_WIDTH / 2, barY + 50, LOADING_TIPS[0], {
      fontSize: '26px',
      color: '#58413f',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
    }).setOrigin(0.5);

    let tipIdx = 0;
    this.time.addEvent({
      delay: 700,
      loop: true,
      callback: () => {
        tipIdx = (tipIdx + 1) % LOADING_TIPS.length;
        tipText.setText(LOADING_TIPS[tipIdx]);
      },
    });

    // ─── 에셋 로드 ────────────────────────────
    this.load.image('cupcake', 'assets/tiles/cupcake.webp');
    this.load.image('donut', 'assets/tiles/donut.webp');
    this.load.image('macaron', 'assets/tiles/macaron.webp');
    this.load.image('croissant', 'assets/tiles/croissant.webp');
    this.load.image('icecream', 'assets/tiles/icecream.webp');
    this.load.image('chocolate', 'assets/tiles/chocolate.webp');

    // ─── VFX 파티클 (CC0 — Kenney) ─────
    this.load.image('fx_glow', 'assets/fx/particles/circle_01.webp');
    this.load.image('fx_star', 'assets/fx/particles/star_01.webp');
    this.load.image('fx_flare', 'assets/fx/particles/flare_01.webp');
    this.load.image('fx_magic', 'assets/fx/particles/magic_01.webp');
    this.load.image('fx_spark', 'assets/fx/particles/spark_01.webp');
    this.load.image('fx_smoke', 'assets/fx/particles/smoke_01.webp');
    this.load.image('fx_twirl', 'assets/fx/particles/twirl_01.webp');
    this.load.image('fx_flame', 'assets/fx/particles/flame_01.webp');
    this.load.image('fx_heart', 'assets/fx/particles/heart.webp');
    this.load.image('fx_soft_star', 'assets/fx/particles/soft_star.webp');
    this.load.image('fx_sparkle_4pt', 'assets/fx/particles/sparkle_4pt.webp');
    this.load.image('fx_twinkle', 'assets/fx/particles/twinkle.webp');
    this.load.image('fx_soft_ring', 'assets/fx/particles/soft_ring.webp');
    this.load.image('fx_swirl', 'assets/fx/particles/twirl_01.webp');
    this.load.image('fx_petal', 'assets/fx/particles/petal.webp');
    this.load.image('fx_sparkle', 'assets/fx/particles/bishie_sparkle.webp');
    this.load.image('fx_bubble', 'assets/fx/particles/bubble.webp');
    // ─── VFX 라이트 마스크 (CC0 — Kenney) ─────
    this.load.image('fx_glow_streaks', 'assets/fx/masks/glow_streaks.webp');
    this.load.image('fx_rings', 'assets/fx/masks/rings.webp');
    // ─── VFX 스프라이트시트 (CC0 — OpenGameArt, Brackeys) ─────
    this.load.spritesheet('fx_poof', 'assets/fx/spritesheets/poof.webp', {
      frameWidth: 256, frameHeight: 256,
    });
    this.load.spritesheet('fx_heart_anim', 'assets/fx/spritesheets/heart_pop.webp', {
      frameWidth: 256, frameHeight: 256,
    });
    this.load.spritesheet('fx_vortex', 'assets/fx/spritesheets/vortex.webp', {
      frameWidth: 427, frameHeight: 431,
    });
    this.load.spritesheet('fx_firework', 'assets/fx/spritesheets/firework.webp', {
      frameWidth: 256, frameHeight: 256,
    });
    this.load.spritesheet('fx_party_confetti', 'assets/fx/spritesheets/party_confetti.webp', {
      frameWidth: 64, frameHeight: 64,
    });

    // ── 오디오 (CC0 — Kenney, OpenGameArt) ──
    this.load.audio('sfx_swap', 'assets/audio/sfx/swap.ogg');
    this.load.audio('sfx_match_pop1', 'assets/audio/sfx/match_pop1.ogg');
    this.load.audio('sfx_match_pop2', 'assets/audio/sfx/match_pop2.ogg');
    this.load.audio('sfx_match_pop3', 'assets/audio/sfx/match_pop3.ogg');
    this.load.audio('sfx_special_create', 'assets/audio/sfx/special_create.ogg');
    this.load.audio('sfx_combo_chime', 'assets/audio/sfx/combo_chime.ogg');
    this.load.audio('sfx_bomb', 'assets/audio/sfx/bomb.ogg');
    this.load.audio('sfx_bomb_impact', 'assets/audio/sfx/bomb_impact.ogg');
    this.load.audio('sfx_line_blast', 'assets/audio/sfx/line_blast.ogg');
    this.load.audio('sfx_cross_blast', 'assets/audio/sfx/cross_blast.ogg');
    this.load.audio('sfx_color_bomb', 'assets/audio/sfx/color_bomb.ogg');
    this.load.audio('sfx_wrapped_pop', 'assets/audio/sfx/wrapped_pop.ogg');
    this.load.audio('sfx_cascade', 'assets/audio/sfx/cascade.ogg');
    this.load.audio('sfx_tile_land', 'assets/audio/sfx/tile_land.ogg');
    this.load.audio('sfx_invalid_swap', 'assets/audio/sfx/invalid_swap.ogg');
    this.load.audio('sfx_button_click', 'assets/audio/sfx/button_click.ogg');
    this.load.audio('sfx_tile_select', 'assets/audio/sfx/tile_select.ogg');
    this.load.audio('sfx_win_jingle', 'assets/audio/sfx/win_jingle.ogg');
    this.load.audio('sfx_level_clear', 'assets/audio/sfx/level_clear.ogg');
    // Title BGM만 선로딩하고, gameplay BGM은 진입 시 지연 로딩
    this.load.audio('bgm_title', 'assets/audio/bgm/cozy_puzzle_title.ogg');
  }

  create(): void {
    this.createParticleTextures();
    this.createBeamTextures();
    this.createFxAnimations();
    this.scene.start('TitleScene');
  }

  /** 빔 전용 고품질 텍스처 생성 (LineBlast / CrossBlast) */
  private createBeamTextures(): void {
    // ── 1) 빔 코어: 밝은 중심선 + 급격한 Y 감쇠 (1024x48) ──
    const coreW = 1024, coreH = 48;
    const gfxCore = this.add.graphics();
    const halfH = coreH / 2;
    for (let y = 0; y < coreH; y++) {
      const d = Math.abs(y - halfH) / halfH;
      // 중심: 순백 밝음 → 가장자리: 급격 감쇠
      const alpha = Math.pow(1 - d, 4);
      gfxCore.fillStyle(0xffffff, alpha);
      gfxCore.fillRect(0, y, coreW, 1);
    }
    // 양 끝 X축 페이드 (좌우 64px)
    const fadeX = 64;
    for (let x = 0; x < fadeX; x++) {
      const a = x / fadeX;
      gfxCore.fillStyle(0x000000, 1 - a);
      gfxCore.fillRect(x, 0, 1, coreH);
      gfxCore.fillRect(coreW - 1 - x, 0, 1, coreH);
    }
    gfxCore.generateTexture('fx_beam_core', coreW, coreH);
    gfxCore.destroy();

    // ── 2) 빔 글로우: 넓은 부드러운 후광 (1024x160) ──
    const glowW = 1024, glowH = 160;
    const gfxGlow = this.add.graphics();
    const glowHalfH = glowH / 2;
    for (let y = 0; y < glowH; y++) {
      const d = Math.abs(y - glowHalfH) / glowHalfH;
      const alpha = Math.pow(1 - d, 2) * 0.45;
      gfxGlow.fillStyle(0xffffff, alpha);
      gfxGlow.fillRect(0, y, glowW, 1);
    }
    // 양 끝 X축 페이드
    for (let x = 0; x < fadeX; x++) {
      const a = x / fadeX;
      gfxGlow.fillStyle(0x000000, 1 - a);
      gfxGlow.fillRect(x, 0, 1, glowH);
      gfxGlow.fillRect(glowW - 1 - x, 0, 1, glowH);
    }
    gfxGlow.generateTexture('fx_beam_glow', glowW, glowH);
    gfxGlow.destroy();

    // ── 3) 에너지 노이즈 빔: 불규칙 에너지선 (1024x80) ──
    const noiseW = 1024, noiseH = 80;
    const gfxNoise = this.add.graphics();
    const noiseHalfH = noiseH / 2;
    // 여러 줄의 불규칙 에너지 선
    for (let pass = 0; pass < 5; pass++) {
      const thickness = 1 + pass * 0.5;
      const yOffset = (pass - 2) * 6;
      const alphaBase = pass === 2 ? 0.9 : 0.3 + Math.random() * 0.3;
      gfxNoise.lineStyle(thickness, 0xffffff, alphaBase);
      gfxNoise.beginPath();
      gfxNoise.moveTo(0, noiseHalfH + yOffset);
      for (let x = 0; x < noiseW; x += 8) {
        const jitter = (Math.random() - 0.5) * (pass === 2 ? 3 : 12);
        gfxNoise.lineTo(x, noiseHalfH + yOffset + jitter);
      }
      gfxNoise.strokePath();
    }
    // Y축 소프트 마스크
    for (let y = 0; y < noiseH; y++) {
      const d = Math.abs(y - noiseHalfH) / noiseHalfH;
      if (d > 0.6) {
        gfxNoise.fillStyle(0x000000, (d - 0.6) / 0.4);
        gfxNoise.fillRect(0, y, noiseW, 1);
      }
    }
    gfxNoise.generateTexture('fx_beam_energy', noiseW, noiseH);
    gfxNoise.destroy();
  }

  /** VFX 스프라이트시트 애니메이션 등록 */
  private createFxAnimations(): void {
    // 팡! 효과 (bomb 대체) — 30프레임 (CC0 OpenGameArt)
    this.anims.create({
      key: 'anim_poof',
      frames: this.anims.generateFrameNumbers('fx_poof', { start: 0, end: 29 }),
      frameRate: 36,
      repeat: 0,
    });
    // 하트 팝 (bomb 보조) — 30프레임 (CC0 OpenGameArt)
    this.anims.create({
      key: 'anim_heart_pop',
      frames: this.anims.generateFrameNumbers('fx_heart_anim', { start: 0, end: 29 }),
      frameRate: 36,
      repeat: 0,
    });
    // 소용돌이 (colorBomb) — 30프레임
    this.anims.create({
      key: 'anim_vortex',
      frames: this.anims.generateFrameNumbers('fx_vortex', { start: 0, end: 29 }),
      frameRate: 36,
      repeat: 0,
    });
    // 불꽃놀이 (레벨 클리어 축하) — 30프레임 (5행6열, 256x256, CC0)
    this.anims.create({
      key: 'anim_firework',
      frames: this.anims.generateFrameNumbers('fx_firework', { start: 0, end: 29 }),
      frameRate: 30,
      repeat: 0,
    });
    // 파티 컨페티 (레벨 클리어 축하) — 10프레임 (10열, 64x64, CC0)
    this.anims.create({
      key: 'anim_party_confetti',
      frames: this.anims.generateFrameNumbers('fx_party_confetti', { start: 0, end: 9 }),
      frameRate: 20,
      repeat: 0,
    });
  }

  /** FX용 파티클 텍스처 생성 (4종 + 레거시 호환) */
  private createParticleTextures(): void {
    // 1) 레거시 호환: 기본 원형
    const gfxCircle = this.add.graphics();
    gfxCircle.fillStyle(0xffffff, 1);
    gfxCircle.fillCircle(8, 8, 8);
    gfxCircle.generateTexture('particle_circle', 16, 16);
    gfxCircle.destroy();

    // 2) 소프트 글로우 (가장 중요! ADD 블렌드용)
    const glowSize = 32;
    const gfxGlow = this.add.graphics();
    for (let i = glowSize; i > 0; i--) {
      const ratio = i / glowSize;
      gfxGlow.fillStyle(0xffffff, ratio * ratio * 0.7);
      gfxGlow.fillCircle(glowSize, glowSize, i);
    }
    gfxGlow.generateTexture('particle_glow', glowSize * 2, glowSize * 2);
    gfxGlow.destroy();

    // 3) 별(Star) 파티클 — 4꼭지
    const starSize = 32;
    const gfxStar = this.add.graphics();
    gfxStar.fillStyle(0xffffff, 1);
    gfxStar.beginPath();
    const outerR = 14, innerR = 5, points = 4;
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      const px = starSize / 2 + Math.cos(angle) * r;
      const py = starSize / 2 + Math.sin(angle) * r;
      if (i === 0) gfxStar.moveTo(px, py);
      else gfxStar.lineTo(px, py);
    }
    gfxStar.closePath();
    gfxStar.fillPath();
    gfxStar.generateTexture('particle_star', starSize, starSize);
    gfxStar.destroy();

    // 4) 다이아몬드 파티클
    const gfxDiamond = this.add.graphics();
    gfxDiamond.fillStyle(0xffffff, 1);
    gfxDiamond.beginPath();
    gfxDiamond.moveTo(8, 0);
    gfxDiamond.lineTo(16, 8);
    gfxDiamond.lineTo(8, 16);
    gfxDiamond.lineTo(0, 8);
    gfxDiamond.closePath();
    gfxDiamond.fillPath();
    gfxDiamond.generateTexture('particle_diamond', 16, 16);
    gfxDiamond.destroy();

    // 5) 링(Ring) 파티클
    const gfxRing = this.add.graphics();
    gfxRing.lineStyle(3, 0xffffff, 1);
    gfxRing.strokeCircle(12, 12, 10);
    gfxRing.generateTexture('particle_ring', 24, 24);
    gfxRing.destroy();

    // ── 디저트 테마 파티클 (6종) ──

    // 6) 스프링클 (sprinkle) — 작은 막대형, 디저트 장식
    const sprW = 16, sprH = 6;
    const gfxSpr = this.add.graphics();
    gfxSpr.fillStyle(0xffffff, 1);
    gfxSpr.fillRoundedRect(0, 0, sprW, sprH, 3);
    gfxSpr.generateTexture('particle_sprinkle', sprW, sprH);
    gfxSpr.destroy();

    // 7) 부스러기 (crumb) — 불규칙 원형, 쿠키 파편
    const gfxCrumb = this.add.graphics();
    gfxCrumb.fillStyle(0xffffff, 1);
    gfxCrumb.fillCircle(5, 5, 5);
    gfxCrumb.fillCircle(10, 7, 3);
    gfxCrumb.fillCircle(3, 9, 2);
    gfxCrumb.generateTexture('particle_crumb', 14, 12);
    gfxCrumb.destroy();

    // 8) 셰드 (shard) — 삼각 파편, 타일 파괴 시
    const gfxShard = this.add.graphics();
    gfxShard.fillStyle(0xffffff, 1);
    gfxShard.beginPath();
    gfxShard.moveTo(6, 0);
    gfxShard.lineTo(12, 10);
    gfxShard.lineTo(0, 7);
    gfxShard.closePath();
    gfxShard.fillPath();
    gfxShard.generateTexture('particle_shard', 12, 10);
    gfxShard.destroy();

    // 9) 콘페티 (confetti) — 작은 사각형, 축하용
    const gfxConf = this.add.graphics();
    gfxConf.fillStyle(0xffffff, 1);
    gfxConf.fillRect(0, 0, 8, 6);
    gfxConf.generateTexture('particle_confetti', 8, 6);
    gfxConf.destroy();

    // 10) 크림 방울 (cream drop) — 부드러운 방울
    const gfxCream = this.add.graphics();
    gfxCream.fillStyle(0xffffff, 1);
    gfxCream.fillCircle(8, 10, 8);
    gfxCream.fillCircle(8, 4, 5);
    gfxCream.generateTexture('particle_cream', 16, 18);
    gfxCream.destroy();

    // 11) 설탕가루 (sugar dust) — 아주 작은 원, 미세 파티클
    const gfxSugar = this.add.graphics();
    gfxSugar.fillStyle(0xffffff, 1);
    gfxSugar.fillCircle(3, 3, 3);
    gfxSugar.generateTexture('particle_sugar', 6, 6);
    gfxSugar.destroy();
  }
}
