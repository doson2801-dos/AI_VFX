import Phaser from 'phaser';
import { TUNING, VIEW } from './config';
import { bindTouchControls } from './game/controls';
import { GameScene } from './scenes/GameScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW.width,
  height: VIEW.height,
  backgroundColor: '#14162b',
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: TUNING.gravity } },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 3 },
  scene: [GameScene],
});

bindTouchControls();

if (import.meta.env.DEV) {
  void import('./debug/devTools').then(({ installDevTools }) => installDevTools(game));
}
