import Phaser from 'phaser';
import { Capacitor } from '@capacitor/core';
import { gameConfig } from './config';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { GameScene } from './scenes/GameScene';
import { SettingsScene } from './scenes/SettingsScene';
import { initAdMob } from './utils/AdMobManager';
import { SoundManager } from './utils/SoundManager';
import { installTestBridge } from './qa/testBridge';

// ─── Capacitor 네이티브 플러그인 초기화 ───
async function initNativePlugins(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { SplashScreen } = await import('@capacitor/splash-screen');
      const { StatusBar, Style } = await import('@capacitor/status-bar');

      // 상태바 숨김
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.hide();

      // 스플래시 스크린 숨김 (게임 로딩 후)
      await SplashScreen.hide();

      // AdMob 초기화
      await initAdMob();
    } catch {
      // Native plugins unavailable in web — expected
    }
  }
}

// ─── 게임 시작 ───
const config: Phaser.Types.Core.GameConfig = {
  ...gameConfig,
  scene: [BootScene, TitleScene, LevelSelectScene, GameScene, SettingsScene],
};

const game = new Phaser.Game(config);
(window as unknown as Record<string, unknown>).__game = game;

const query = new URLSearchParams(window.location.search);
if (import.meta.env.DEV || query.get('qa') === '1') {
  installTestBridge(game);
}

// 네이티브 플러그인은 게임 시작 후 초기화
initNativePlugins();

// ─── 이슈 3: 백그라운드/포그라운드 BGM lifecycle ──────────────────────────────
// Android WebView는 visibilitychange 이벤트로 탭 전환/홈 버튼을 감지한다.
document.addEventListener('visibilitychange', () => {
  const sm = SoundManager.getInstance();
  if (document.hidden) {
    // 백그라운드 진입: BGM 일시정지
    sm.pauseBGM();
  } else {
    // 포그라운드 복귀: BGM 재개 + 이슈 4 canvas refresh
    sm.resumeBGM();
    // 이슈 4: Android WebView 복귀 시 캔버스 scale/renderer 갱신
    if (game?.scale) {
      game.scale.refresh();
    }
    if (game?.renderer) {
      const r = game.renderer as Phaser.Renderer.WebGL.WebGLRenderer | Phaser.Renderer.Canvas.CanvasRenderer;
      if (r.resize) {
        r.resize(game.scale.width, game.scale.height);
      }
    }
  }
});

// blur/focus는 visibilitychange의 보조 안전망 (일부 Android WebView에서 visibilitychange가 누락됨)
window.addEventListener('blur', () => {
  SoundManager.getInstance().pauseBGM();
});

window.addEventListener('focus', () => {
  SoundManager.getInstance().resumeBGM();
  if (game?.scale) {
    game.scale.refresh();
  }
});
