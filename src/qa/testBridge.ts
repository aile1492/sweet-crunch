import type Phaser from 'phaser';
import type { SweetCrunchTestBridge } from '../game-core/qa-contract';
import { GameScene } from '../scenes/GameScene';

declare global {
  interface Window {
    __sweetCrunchQA?: SweetCrunchTestBridge;
  }
}

export function installTestBridge(game: Phaser.Game): SweetCrunchTestBridge {
  const stateElement = document.createElement('script');
  stateElement.id = 'sweet-crunch-qa-state';
  stateElement.type = 'application/json';
  stateElement.hidden = true;
  document.body.appendChild(stateElement);
  document.documentElement.dataset.sweetCrunchQaBridge = '1.0';

  const bridge: SweetCrunchTestBridge = {
    version: '1.0',
    startLevel(level: number, seed: number): void {
      if (!Number.isInteger(level) || level < 1) throw new Error('Level은 1 이상의 정수여야 합니다.');
      if (!Number.isFinite(seed)) throw new Error('Seed는 유한한 숫자여야 합니다.');
      game.scene.start('GameScene', { level, qaSeed: seed });
    },
    getState() {
      const scene = game.scene.getScene('GameScene');
      if (!(scene instanceof GameScene) || !scene.scene.isActive()) return null;
      return scene.getQASnapshot();
    },
  };

  window.__sweetCrunchQA = bridge;

  const mirrorState = () => {
    const state = bridge.getState();
    stateElement.textContent = state ? JSON.stringify(state) : 'null';
  };
  const mirrorTimer = window.setInterval(mirrorState, 100);
  window.addEventListener('beforeunload', () => window.clearInterval(mirrorTimer), { once: true });
  mirrorState();

  return bridge;
}
