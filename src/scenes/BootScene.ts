import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // TODO: 에셋 로드 (타일 스프라이트, UI 등)
    // this.load.image('cupcake', 'assets/tiles/cupcake.png');
    // this.load.image('donut', 'assets/tiles/donut.png');
    // ...
  }

  create(): void {
    this.scene.start('GameScene');
  }
}
