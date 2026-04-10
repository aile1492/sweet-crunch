// ─── 하이브리드 사운드 매니저 (Web Audio 합성 + Phaser 파일 재생) ──
// playPop/playCascade: 동적 주파수 → Web Audio 유지
// 나머지: CC0 오디오 파일 기반 재생 (Phaser Sound)

import Phaser from 'phaser';

const STORAGE_MUTE_KEY = 'sweet_crunch_muted';
const STORAGE_BGM_KEY = 'sweet_crunch_bgm_muted';
const BGM_ASSET_PATHS: Record<string, string> = {
  bgm_gameplay_1: 'assets/audio/bgm/cozy_puzzle_1.ogg',
  bgm_gameplay_2: 'assets/audio/bgm/cozy_puzzle_2.ogg',
  bgm_gameplay_3: 'assets/audio/bgm/cozy_puzzle_3.ogg',
  bgm_title: 'assets/audio/bgm/cozy_puzzle_title.ogg',
};

export class SoundManager {
  private static instance: SoundManager;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted = false;
  private bgmMuted = false;
  private lastPopTime = 0;
  private scene: Phaser.Scene | null = null;
  private currentBGM: Phaser.Sound.BaseSound | null = null;
  private pendingBGMKey: string | null = null;

  private constructor() {
    this.muted = localStorage.getItem(STORAGE_MUTE_KEY) === 'true';
    this.bgmMuted = localStorage.getItem(STORAGE_BGM_KEY) === 'true';
  }

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  /** Phaser Scene 연결 — create()에서 호출 */
  setScene(scene: Phaser.Scene): void {
    this.scene = scene;
    // Phaser 전역 볼륨 동기화
    if (scene.sound) {
      scene.sound.volume = this.muted ? 0 : 1;
    }
  }

  /** 유저 제스처 내에서 호출 — AudioContext 초기화/재개 */
  ensureContext(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 1;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  get isMuted(): boolean { return this.muted; }
  get isBGMMuted(): boolean { return this.bgmMuted; }

  setMute(m: boolean): void {
    this.muted = m;
    if (this.masterGain) {
      this.masterGain.gain.value = m ? 0 : 1;
    }
    if (this.scene?.sound) {
      this.scene.sound.volume = m ? 0 : 1;
    }
    try { localStorage.setItem(STORAGE_MUTE_KEY, String(m)); } catch { /* ignore */ }
  }

  toggleMute(): boolean {
    this.setMute(!this.muted);
    return this.muted;
  }

  setBGMMute(m: boolean): void {
    this.bgmMuted = m;
    if (this.currentBGM && 'volume' in this.currentBGM) {
      (this.currentBGM as Phaser.Sound.WebAudioSound).volume = m ? 0 : 0.3;
    }
    try { localStorage.setItem(STORAGE_BGM_KEY, String(m)); } catch { /* ignore */ }
  }

  toggleBGMMute(): boolean {
    this.setBGMMute(!this.bgmMuted);
    return this.bgmMuted;
  }

  // ─── Phaser 파일 재생 헬퍼 ────────────────────────

  private playSfx(key: string, volume = 0.5): void {
    if (!this.scene || this.muted) return;
    try {
      this.scene.sound.play(key, { volume });
    } catch { /* 에셋 미로드 시 무시 */ }
  }

  // ─── Web Audio 헬퍼 (동적 주파수용) ─────────────────

  private osc(type: OscillatorType, freq: number, duration: number, gain: number, delay = 0): OscillatorNode | null {
    if (!this.ctx || !this.masterGain) return null;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    o.connect(g).connect(this.masterGain);
    o.start(t);
    o.stop(t + duration + 0.05);
    return o;
  }

  // ─── BGM ──────────────────────────────────────────

  /** BGM 루프 재생 */
  playBGM(key: string): void {
    if (!this.scene) return;
    if (!this.scene.cache.audio.exists(key)) {
      const assetPath = BGM_ASSET_PATHS[key];
      if (!assetPath) return;
      if (this.pendingBGMKey === key) return;
      this.pendingBGMKey = key;
      this.scene.load.audio(key, assetPath);
      this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
        const requestedKey = this.pendingBGMKey;
        this.pendingBGMKey = null;
        if (requestedKey === key) {
          this.playBGM(key);
        }
      });
      this.scene.load.start();
      return;
    }
    if (this.currentBGM && this.currentBGM.key === key && this.currentBGM.isPlaying) {
      return;
    }
    this.stopBGM();
    try {
      this.currentBGM = this.scene.sound.add(key, {
        loop: true,
        volume: this.bgmMuted ? 0 : 0.3,
      });
      this.currentBGM.play();
    } catch { /* 에셋 미로드 시 무시 */ }
  }

  /** BGM 정지 */
  stopBGM(): void {
    if (this.currentBGM) {
      this.currentBGM.stop();
      this.currentBGM.destroy();
      this.currentBGM = null;
    }
  }

  /** BGM 일시정지 (재생 위치 보존) */
  pauseBGM(): void {
    if (this.currentBGM?.isPlaying) {
      this.currentBGM.pause();
    }
  }

  /** BGM 이어서 재생 */
  resumeBGM(): void {
    if (this.currentBGM?.isPaused) {
      this.currentBGM.resume();
    }
  }

  /** BGM 볼륨을 서서히 줄인 후 정지 (씬 전환 전 호출) */
  fadeBGMOut(scene: Phaser.Scene, duration = 300): void {
    if (!this.currentBGM) return;
    const sound = this.currentBGM;
    scene.tweens.add({
      targets: sound,
      volume: 0,
      duration,
      ease: 'Linear',
      onComplete: () => {
        if (this.currentBGM === sound) this.stopBGM();
      },
    });
  }

  /** BGM을 볼륨 0으로 시작 후 서서히 올림 (씬 진입 시 호출) */
  fadeBGMIn(key: string, duration = 400): void {
    if (!this.scene) return;
    const targetVol = this.bgmMuted ? 0 : 0.3;

    if (!this.scene.cache.audio.exists(key)) {
      const assetPath = BGM_ASSET_PATHS[key];
      if (!assetPath) return;
      if (this.pendingBGMKey === key) return;
      this.pendingBGMKey = key;
      this.scene.load.audio(key, assetPath);
      this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
        const requestedKey = this.pendingBGMKey;
        this.pendingBGMKey = null;
        if (requestedKey === key) this.fadeBGMIn(key, duration);
      });
      this.scene.load.start();
      return;
    }

    if (this.currentBGM?.key === key && this.currentBGM.isPlaying) return;
    this.stopBGM();
    try {
      this.currentBGM = this.scene.sound.add(key, { loop: true, volume: 0 });
      this.currentBGM.play();
      if (!this.bgmMuted) {
        this.scene.tweens.add({
          targets: this.currentBGM,
          volume: targetVol,
          duration,
          ease: 'Linear',
        });
      }
    } catch { /* 에셋 미로드 시 무시 */ }
  }

  // ─── 효과음들 (파일 기반) ──────────────────────────

  /** 타일 스왑 */
  playSwap(): void {
    this.playSfx('sfx_swap', 0.4);
  }

  // C5 메이저 스케일 — 콤보가 올라갈수록 도레미파솔라시도 순서로 상승
  private static readonly COMBO_SCALE = [523, 587, 659, 698, 784, 880, 988, 1047];

  /** 매칭 팝 (콤보 깊이에 따라 음악적 스케일 상승) — Web Audio 유지 */
  playPop(comboDepth: number): void {
    const now = performance.now();
    if (now - this.lastPopTime < 30) return;
    this.lastPopTime = now;

    // 파일 기반 팝 (3종 랜덤)
    const popKeys = ['sfx_match_pop1', 'sfx_match_pop2', 'sfx_match_pop3'];
    const pick = popKeys[Math.min(comboDepth - 1, popKeys.length - 1)] ?? popKeys[0];
    this.playSfx(pick, 0.3 + Math.min(comboDepth * 0.05, 0.3));

    // Web Audio 음계 레이어 (기분 좋은 음악적 피드백)
    const scale = SoundManager.COMBO_SCALE;
    const baseFreq = scale[Math.min(comboDepth, scale.length - 1)];
    this.osc('sine', baseFreq, 0.1, 0.1);
  }

  /** 캐스케이드 (상승 차임) — 하이브리드 */
  playCascade(depth: number): void {
    this.playSfx('sfx_cascade', 0.3 + Math.min(depth * 0.05, 0.2));
    const freq = 440 * (1 + depth * 0.15);
    this.osc('sine', freq, 0.12, 0.08);
  }

  /** 특수 젬 생성 (스파클) */
  playSpecialCreate(): void {
    this.playSfx('sfx_special_create', 0.5);
  }

  /** Line Blast */
  playLineBlast(): void {
    this.playSfx('sfx_line_blast', 0.5);
  }

  /** Bomb */
  playBomb(): void {
    this.playSfx('sfx_bomb', 0.5);
    this.playSfx('sfx_bomb_impact', 0.3);
    this.osc('triangle', 220, 0.12, 0.03);
  }

  /** Color Bomb */
  playColorBomb(): void {
    this.playSfx('sfx_color_bomb', 0.6);
  }

  /** Cross Blast */
  playCrossBlast(): void {
    this.playSfx('sfx_cross_blast', 0.5);
    this.osc('sine', 880, 0.1, 0.04);
  }

  /** Wrapped Gem */
  playWrapped(): void {
    this.playSfx('sfx_wrapped_pop', 0.5);
    this.osc('triangle', 660, 0.12, 0.04);
  }

  /** Wrapped 2차 폭발 */
  playWrappedFinale(): void {
    this.playSfx('sfx_wrapped_pop', 0.6);
    this.playSfx('sfx_combo_chime', 0.22);
    this.osc('triangle', 740, 0.18, 0.05);
  }

  /** 유효하지 않은 스왑 */
  playInvalidSwap(): void {
    this.playSfx('sfx_invalid_swap', 0.4);
  }

  /** 레벨 클리어 */
  playLevelClear(): void {
    this.playSfx('sfx_win_jingle', 0.6);
  }

  /** 게임 오버 */
  playGameOver(): void {
    this.playSfx('sfx_level_clear', 0.4);
  }

  /** UI 버튼 클릭 */
  playButtonClick(): void {
    this.playSfx('sfx_button_click', 0.35);
  }

  /** 타일 착지 */
  playTileLand(): void {
    this.playSfx('sfx_tile_land', 0.25);
  }

  /** 콤보 차임 (높은 콤보용) */
  playComboChime(): void {
    this.playSfx('sfx_combo_chime', 0.5);
  }

  /** 타일 선택 */
  playTileSelect(): void {
    this.playSfx('sfx_tile_select', 0.3);
  }

  /** Zap 부스터 — 마법 완드 파괴 */
  playZap(): void {
    this.playSfx('sfx_special_create', 0.65);
    this.playSfx('sfx_combo_chime', 0.38);
    // 부드럽게 오르는 마법 음계 (삼각파 + 사인파)
    this.osc('triangle', 880, 0.1, 0.1);
    this.osc('triangle', 1100, 0.08, 0.09, 0.08);
    this.osc('sine', 1320, 0.07, 0.12, 0.15);
  }

  /** Shuffle 부스터 */
  playShuffle(): void {
    this.playSfx('sfx_combo_chime', 0.55);
  }
}
