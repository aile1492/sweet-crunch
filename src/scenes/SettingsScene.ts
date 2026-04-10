import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config';
import { SoundManager } from '../utils/SoundManager';
import { fadeToScene, fadeIn, closeOverScene } from '../utils/SceneTransition';
import {
  isReducedMotionEnabled,
  isVibrationEnabled,
  PRIVACY_POLICY_LINES,
  toggleReducedMotion,
  toggleVibration,
} from '../utils/UserSettings';

const SCALE = 2.1;
const px = (css: number) => Math.round(css * SCALE);

const HEADER_H = px(64);
const MAIN_PT = px(96);
const CARD_MAX_W = px(512);
const CARD_PAD = px(24);

type SettingRow = {
  icon: string;
  color: number;
  label: string;
  isOn: () => boolean;
  toggle: () => boolean;
};

export class SettingsScene extends Phaser.Scene {
  private returnScene: string = 'TitleScene';

  constructor() {
    super({ key: 'SettingsScene' });
  }

  init(data: Record<string, unknown>): void {
    this.returnScene = (data?.from as string) ?? 'TitleScene';
  }

  create(): void {
    fadeIn(this);
    this.cameras.main.setBackgroundColor('#FFF8F3');

    const sound = SoundManager.getInstance();
    sound.setScene(this);
    this.input.once('pointerdown', () => sound.ensureContext());

    this.drawTopBar();
    this.drawMacaronIllustration();
    this.drawSettingsCard();
    this.drawFooter();
  }

  private drawTopBar(): void {
    const barBg = this.add.graphics();
    barBg.fillStyle(0xfff8f3, 0.92);
    barBg.fillRoundedRect(0, 0, GAME_WIDTH, HEADER_H, { tl: 0, tr: 0, bl: px(16), br: px(16) });

    const shadow = this.add.graphics();
    shadow.fillStyle(0x221a0f, 0.04);
    shadow.fillRoundedRect(0, HEADER_H - px(4), GAME_WIDTH, px(8), px(4));

    const backX = px(48);
    const centerY = HEADER_H / 2;
    this.add.text(backX, centerY, '<', {
      fontSize: `${px(24)}px`,
      color: '#690008',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.zone(backX, centerY, px(48), px(48)).setInteractive().on('pointerdown', () => {
      SoundManager.getInstance().playButtonClick();
      if (this.returnScene === 'GameScene') {
        closeOverScene(this, 'GameScene');
      } else {
        fadeToScene(this, this.returnScene);
      }
    });

    this.add.text(GAME_WIDTH / 2, centerY, 'Settings', {
      fontSize: `${px(24)}px`,
      color: '#690008',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: '800',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH - px(48), centerY, '::', {
      fontSize: `${px(18)}px`,
      color: '#8b1a1a',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  private drawMacaronIllustration(): void {
    const cx = GAME_WIDTH / 2;
    const areaTopY = HEADER_H + MAIN_PT;
    const areaCenterY = areaTopY + px(64);
    const overlap = px(14);

    const goldW = px(80), goldH = px(40), goldR = px(32);
    const pinkW = px(88), pinkH = px(44), pinkR = px(32);
    const mintW = px(80), mintH = px(40), mintR = px(32);

    const totalH = goldH + pinkH + mintH - overlap * 2;
    const startY = areaCenterY - totalH / 2;

    const shadow = this.add.graphics();
    shadow.fillStyle(0x221a0f, 0.06);
    shadow.fillEllipse(cx, startY + totalH + px(8), px(120), px(12));

    const goldY = startY;
    const gold = this.add.graphics();
    gold.fillStyle(0xe6d8c5, 1);
    gold.fillRoundedRect(cx - goldW / 2, goldY, goldW, goldH, goldR);
    gold.fillStyle(0xd3c4b1, 1);
    gold.fillRect(cx - goldW / 2 + px(8), goldY + goldH - px(8), goldW - px(16), px(8));
    gold.fillStyle(0xffffff, 0.2);
    gold.fillRoundedRect(cx - goldW / 2 + px(10), goldY + px(6), goldW - px(20), px(4), px(2));

    const pinkY = goldY + goldH - overlap;
    const pink = this.add.graphics();
    pink.fillStyle(0xffb2bc, 1);
    pink.fillRoundedRect(cx - pinkW / 2, pinkY, pinkW, pinkH, pinkR);
    pink.fillStyle(0x782e3d, 0.22);
    pink.fillRect(cx - pinkW / 2 + px(8), pinkY + pinkH - px(8), pinkW - px(16), px(8));
    pink.fillStyle(0xffffff, 0.3);
    pink.fillRoundedRect(cx - pinkW / 2 + px(10), pinkY + px(6), pinkW - px(20), px(4), px(2));

    const mintY = pinkY + pinkH - overlap;
    const mint = this.add.graphics();
    mint.fillStyle(0xa8e6cf, 1);
    mint.fillRoundedRect(cx - mintW / 2, mintY, mintW, mintH, mintR);
    mint.fillStyle(0x8bd6b7, 1);
    mint.fillRect(cx - mintW / 2 + px(8), mintY + mintH - px(8), mintW - px(16), px(8));
    mint.fillStyle(0xffffff, 0.4);
    mint.fillRoundedRect(cx - mintW / 2 + px(10), mintY + px(6), mintW - px(20), px(4), px(2));

    this.data.set('macaronBottomY', mintY + mintH);
  }

  private drawSettingsCard(): void {
    const sound = SoundManager.getInstance();
    const rows: SettingRow[] = [
      {
        icon: '♪',
        color: 0xffb2bc,
        label: 'Music',
        isOn: () => !sound.isBGMMuted,
        toggle: () => {
          sound.ensureContext();
          const muted = sound.toggleBGMMute();
          sound.playButtonClick();
          return !muted;
        },
      },
      {
        icon: 'S',
        color: 0xf0e0cc,
        label: 'Sound',
        isOn: () => !sound.isMuted,
        toggle: () => {
          sound.ensureContext();
          const muted = sound.toggleMute();
          sound.playButtonClick();
          return !muted;
        },
      },
      {
        icon: 'V',
        color: 0xffd6a5,
        label: 'Vibration',
        isOn: () => isVibrationEnabled(),
        toggle: () => {
          SoundManager.getInstance().playButtonClick();
          return toggleVibration();
        },
      },
      {
        icon: 'FX',
        color: 0xb5ead7,
        label: 'Reduced Motion',
        isOn: () => isReducedMotionEnabled(),
        toggle: () => {
          SoundManager.getInstance().playButtonClick();
          return toggleReducedMotion();
        },
      },
    ];

    const macaronBottom = this.data.get('macaronBottomY') as number ?? HEADER_H + px(240);
    const cardGap = px(48);
    const cardX = (GAME_WIDTH - CARD_MAX_W) / 2;
    const cardY = macaronBottom + cardGap;
    const cardW = CARD_MAX_W;

    const rowPadY = px(16);
    const iconSize = px(40);
    const rowH = rowPadY * 2 + iconSize;
    const divH = 2;
    const linksTopMargin = px(16);
    const linksPadTop = px(16);
    const linkRowH = px(40);

    const cardH = CARD_PAD
      + rows.length * rowH + (rows.length - 1) * divH
      + divH
      + linksTopMargin + linksPadTop
      + linkRowH
      + CARD_PAD;

    const cardShadow = this.add.graphics();
    cardShadow.fillStyle(0x221a0f, 0.03);
    cardShadow.fillRoundedRect(cardX + 2, cardY + px(6), cardW, cardH, px(32));

    const cardBg = this.add.graphics();
    cardBg.fillStyle(0xffffff, 1);
    cardBg.fillRoundedRect(cardX, cardY, cardW, cardH, px(32));

    let cy = cardY + CARD_PAD;
    const leftX = cardX + CARD_PAD;
    const rightX = cardX + cardW - CARD_PAD;
    const contentW = cardW - CARD_PAD * 2;

    rows.forEach((row, index) => {
      this.drawSettingRow(leftX, rightX, cy, rowH, row);
      cy += rowH;
      if (index < rows.length - 1) {
        this.drawDivider(leftX + px(8), cy, contentW - px(16));
        cy += divH;
      }
    });

    cy += linksTopMargin;
    this.drawDivider(leftX + px(8), cy, contentW - px(16));
    cy += divH + linksPadTop;

    this.add.text(leftX, cy + linkRowH / 2, 'Privacy Policy', {
      fontSize: `${px(16)}px`,
      color: '#690008',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    this.add.text(rightX, cy + linkRowH / 2, 'OPEN', {
      fontSize: `${px(14)}px`,
      color: '#8b1a1a',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
      letterSpacing: px(1.5),
    }).setOrigin(1, 0.5);

    this.add.zone(cardX + cardW / 2, cy + linkRowH / 2, cardW, linkRowH + px(8))
      .setInteractive()
      .on('pointerdown', () => {
        SoundManager.getInstance().playButtonClick();
        this.showPrivacyPolicyModal();
      });
  }

  private drawSettingRow(leftX: number, rightX: number, cy: number, rowH: number, row: SettingRow): void {
    const rowCenterY = cy + rowH / 2;
    const iconR = px(20);

    const iconBg = this.add.graphics();
    iconBg.fillStyle(row.color, 1);
    iconBg.fillCircle(leftX + iconR, rowCenterY, iconR);

    this.add.text(leftX + iconR, rowCenterY, row.icon, {
      fontSize: `${row.icon.length > 1 ? px(11) : px(18)}px`,
      color: row.icon === 'FX' ? '#221a0f' : '#ffffff',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const labelX = leftX + iconR * 2 + px(16);
    this.add.text(labelX, rowCenterY, row.label, {
      fontSize: `${px(16)}px`,
      color: '#221a0f',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    let isOn = row.isOn();
    const toggleW = px(48);
    const toggleH = px(24);
    const toggleX = rightX - toggleW;
    const toggleY = rowCenterY - toggleH / 2;
    const knobR = px(8);

    const toggleBg = this.add.graphics();
    const toggleKnob = this.add.graphics();
    const drawToggle = () => {
      toggleBg.clear();
      toggleBg.fillStyle(isOn ? COLORS.primary : 0xe6d8c5, 1);
      toggleBg.fillRoundedRect(toggleX, toggleY, toggleW, toggleH, toggleH / 2);

      toggleKnob.clear();
      toggleKnob.fillStyle(0xffffff, 1);
      const knobCX = isOn ? toggleX + toggleW - knobR - px(4) : toggleX + knobR + px(4);
      toggleKnob.fillCircle(knobCX, rowCenterY, knobR);
    };
    drawToggle();

    this.add.zone(toggleX + toggleW / 2, rowCenterY, toggleW + px(12), toggleH + px(12))
      .setInteractive()
      .on('pointerdown', () => {
        isOn = row.toggle();
        drawToggle();
      });
  }

  private drawDivider(x: number, y: number, w: number): void {
    const line = this.add.graphics();
    line.fillStyle(0xfff2e2, 1);
    line.fillRect(x, y, w, 2);
  }

  private showPrivacyPolicyModal(): void {
    const overlay = this.add.graphics().setDepth(80);
    overlay.fillStyle(0x221a0f, 0.32);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    overlay.setAlpha(0);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT), Phaser.Geom.Rectangle.Contains);

    const popupW = 860;
    const popupH = 620;
    const popupX = (GAME_WIDTH - popupW) / 2;
    const popupY = (GAME_HEIGHT - popupH) / 2;

    const panel = this.add.graphics().setDepth(81).setAlpha(0);
    panel.fillStyle(0xffffff, 1);
    panel.fillRoundedRect(popupX, popupY, popupW, popupH, 40);
    panel.lineStyle(4, 0xeedfd1, 1);
    panel.strokeRoundedRect(popupX, popupY, popupW, popupH, 40);

    const title = this.add.text(GAME_WIDTH / 2, popupY + 58, 'Privacy Policy', {
      fontSize: '44px',
      color: '#690008',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(82).setAlpha(0);

    const body = this.add.text(popupX + 54, popupY + 124, PRIVACY_POLICY_LINES.map(line => `• ${line}`).join('\n\n'), {
      fontSize: '28px',
      color: '#58413f',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      wordWrap: { width: popupW - 108 },
      lineSpacing: 10,
    }).setOrigin(0, 0).setDepth(82).setAlpha(0);

    const closeBg = this.add.graphics().setDepth(82).setAlpha(0);
    closeBg.fillStyle(COLORS.primaryContainer, 1);
    closeBg.fillRoundedRect(GAME_WIDTH / 2 - 180, popupY + popupH - 98, 360, 64, 32);

    const closeText = this.add.text(GAME_WIDTH / 2, popupY + popupH - 66, 'CLOSE', {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
      letterSpacing: 6,
    }).setOrigin(0.5).setDepth(83).setAlpha(0);

    const closeZone = this.add.zone(GAME_WIDTH / 2, popupY + popupH - 66, 360, 64).setInteractive().setDepth(84);
    const all = [overlay, panel, title, body, closeBg, closeText];

    this.tweens.add({
      targets: all,
      alpha: 1,
      duration: 200,
      ease: 'Cubic.easeOut',
    });

    const close = () => {
      SoundManager.getInstance().playButtonClick();
      this.tweens.add({
        targets: all,
        alpha: 0,
        duration: 150,
        onComplete: () => {
          all.forEach(obj => obj.destroy());
          closeZone.destroy();
        },
      });
    };

    closeZone.on('pointerdown', close);
    overlay.on('pointerdown', close);
  }

  private drawFooter(): void {
    const footerY = GAME_HEIGHT - px(80);
    this.add.text(GAME_WIDTH / 2, footerY, 'COOKIE . CRUMB . CRUNCH', {
      fontSize: `${px(10)}px`,
      color: '#6e6353',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
      letterSpacing: px(3.2),
    }).setOrigin(0.5).setAlpha(0.45);

    this.add.text(GAME_WIDTH / 2, footerY + px(24), 'V1.0.0 | BAKERY BUILD', {
      fontSize: `${px(10)}px`,
      color: '#6e6353',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontStyle: 'bold',
      letterSpacing: px(4),
    }).setOrigin(0.5).setAlpha(0.45);
  }
}
