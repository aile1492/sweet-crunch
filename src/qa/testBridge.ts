import type Phaser from 'phaser';
import type {
  GameQACommand,
  GameQACommandResponse,
  SweetCrunchTestBridge,
} from '../game-core/qa-contract';
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
  const commandElement = document.createElement('textarea');
  commandElement.id = 'sweet-crunch-qa-command';
  commandElement.dataset.testid = 'sweet-crunch-qa-command';
  commandElement.setAttribute('aria-label', 'Sweet Crunch QA command');
  commandElement.value = 'null';
  Object.assign(commandElement.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: '1px',
    height: '1px',
    opacity: '0.01',
    zIndex: '-1',
  });
  document.body.appendChild(commandElement);
  const responseElement = document.createElement('script');
  responseElement.id = 'sweet-crunch-qa-response';
  responseElement.type = 'application/json';
  responseElement.hidden = true;
  responseElement.textContent = 'null';
  document.body.appendChild(responseElement);
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
    async performAction(action) {
      const scene = game.scene.getScene('GameScene');
      if (!(scene instanceof GameScene) || !scene.scene.isActive()) {
        throw new Error('GameScene이 활성 상태가 아닙니다.');
      }
      return scene.performQAAction(action);
    },
  };

  window.__sweetCrunchQA = bridge;

  let lastCommandId: string | null = null;
  const writeResponse = (response: GameQACommandResponse) => {
    responseElement.textContent = JSON.stringify(response);
  };
  const handleCommand = async () => {
    try {
      const command = JSON.parse(commandElement.value || 'null') as GameQACommand | null;
      if (!command || typeof command.id !== 'string' || command.id === lastCommandId) return;
      const commandId = command.id;
      lastCommandId = commandId;
      if (command.type === 'startLevel') {
        bridge.startLevel(command.level, command.seed);
        writeResponse({ id: commandId, ok: true, result: { started: true } });
      } else if (command.type === 'performAction') {
        const result = await bridge.performAction(command.action);
        writeResponse({ id: commandId, ok: true, result });
      } else {
        writeResponse({ id: commandId, ok: false, error: '지원하지 않는 QA 명령입니다.' });
      }
    } catch (error) {
      const id = lastCommandId ?? 'unknown';
      writeResponse({
        id,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
  commandElement.addEventListener('input', () => void handleCommand());

  const mirrorState = () => {
    const state = bridge.getState();
    stateElement.textContent = state ? JSON.stringify(state) : 'null';
  };
  const mirrorTimer = window.setInterval(mirrorState, 100);
  window.addEventListener('beforeunload', () => {
    window.clearInterval(mirrorTimer);
  }, { once: true });
  mirrorState();

  return bridge;
}
