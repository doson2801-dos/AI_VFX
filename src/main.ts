import Phaser from 'phaser';
import { SLOT_FIVE_VIEW, TUNING, VIEW } from './config';
import { bindTouchControls } from './game/controls';
import { ArcRelayScene } from './scenes/ArcRelayScene';
import { GameScene } from './scenes/GameScene';
import { GatefallScene } from './scenes/GatefallScene';
import { SlotFiveScene } from './scenes/SlotFiveScene';

const isArcRelay = new URLSearchParams(window.location.search).get('game') === 'arc-relay';
if (isArcRelay) document.title = 'Arc Relay';
const isGatefall = new URLSearchParams(window.location.search).get('game') === 'gatefall';
if (isGatefall) {
  document.title = 'Gatefall';
  document.body.classList.add('game-gatefall');
}
const isSlotFive = new URLSearchParams(window.location.search).get('game') === 'slot-five';
if (isSlotFive) {
  document.title = 'Slot Five';
  document.body.classList.add('game-slot-five');
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  // The size is chosen by route before the game exists: Slot Five is portrait, the others landscape.
  width: isSlotFive ? SLOT_FIVE_VIEW.width : VIEW.width,
  height: isSlotFive ? SLOT_FIVE_VIEW.height : VIEW.height,
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
  scene: [isSlotFive ? SlotFiveScene : isGatefall ? GatefallScene : isArcRelay ? ArcRelayScene : GameScene],
});

// Gatefall and Slot Five do not use the three platformer buttons.
if (!isGatefall && !isSlotFive) bindTouchControls();

if (import.meta.env.DEV) {
  void import('./debug/devTools').then(({ installDevTools }) => installDevTools(game));
}
