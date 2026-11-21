import GUI from 'lil-gui';
import type Phaser from 'phaser';
import { TUNING, TUNING_RANGES } from '../config';
import { inputOverride, type InputState } from '../game/controls';
import type { GameScene, GameState } from '../scenes/GameScene';

export interface DebugApi {
  getState(): GameState | null;
  setInput(input: InputState | null): void;
  setBot(bot: ((state: GameState) => InputState) | null): void;
  teleport(x: number, y: number): void;
  restart(): void;
  tuning: typeof TUNING;
}

declare global {
  interface Window {
    __game?: DebugApi;
  }
}

/** Loaded only in dev builds. Gives agents and tests a way to read and drive the game. */
export function installDevTools(game: Phaser.Game): void {
  const scene = () => game.scene.getScene('game') as GameScene | null;
  const isReady = () => Boolean(scene()?.scene.isActive());

  window.__game = {
    getState: () => (isReady() ? scene()!.getState() : null),
    setInput: (input) => {
      inputOverride.manual = input;
    },
    setBot: (bot) => {
      inputOverride.bot = bot as typeof inputOverride.bot;
    },
    teleport: (x, y) => scene()?.teleport(x, y),
    restart: () => scene()?.scene.restart(),
    tuning: TUNING,
  };

  const gui = new GUI({ title: 'Tune gameplay' });
  for (const key of Object.keys(TUNING) as (keyof typeof TUNING)[]) {
    const [min, max, step] = TUNING_RANGES[key];
    gui.add(TUNING, key, min, max, step);
  }
  gui.add({ copy: () => navigator.clipboard.writeText(JSON.stringify(TUNING, null, 2)) }, 'copy').name('Copy JSON');
  gui.close();
}
