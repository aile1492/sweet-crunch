// ─── 씬 전환 페이드 유틸 ────────────────────────────
// 배경색(0xFFF8F3)으로 페이드 아웃 → 씬 전환 → 페이드 인

const FADE_DURATION = 250;
const FADE_R = 255;
const FADE_G = 248;
const FADE_B = 243;

/** 페이드 아웃 후 다른 씬으로 전환 */
export function fadeToScene(
  scene: Phaser.Scene,
  targetKey: string,
  data?: object,
  duration = FADE_DURATION,
): void {
  scene.cameras.main.fadeOut(duration, FADE_R, FADE_G, FADE_B);
  scene.cameras.main.once('camerafadeoutcomplete', () => {
    scene.scene.start(targetKey, data);
  });
}

/** create()에서 호출 — 페이드 인 */
export function fadeIn(scene: Phaser.Scene, duration = FADE_DURATION): void {
  scene.cameras.main.fadeIn(duration, FADE_R, FADE_G, FADE_B);
}

/** 현재 씬을 pause하고 오버레이 씬을 위에 띄움 (게임 상태 보존) */
export function launchOverScene(scene: Phaser.Scene, targetKey: string, data?: object): void {
  scene.scene.pause();
  scene.scene.launch(targetKey, data);
}

/** 오버레이 씬을 페이드 후 닫고, 아래 씬을 resume */
export function closeOverScene(scene: Phaser.Scene, targetKey: string): void {
  scene.cameras.main.fadeOut(FADE_DURATION, FADE_R, FADE_G, FADE_B);
  scene.cameras.main.once('camerafadeoutcomplete', () => {
    scene.scene.stop();
    scene.scene.resume(targetKey);
  });
}
