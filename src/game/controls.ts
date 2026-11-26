import type Phaser from 'phaser';
import type { Dir } from './gatefallLogic';

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
}

export const touchInput: InputState = { left: false, right: false, jump: false };

/** Debug-only sources. When set, they replace player input so tests are repeatable. */
export const inputOverride: {
  manual: InputState | null;
  bot: ((state: unknown) => InputState) | null;
} = { manual: null, bot: null };

export type PlayerKeys = Record<'left' | 'right' | 'up' | 'a' | 'd' | 'w' | 'space' | 'r', Phaser.Input.Keyboard.Key>;

export function addPlayerKeys(keyboard: Phaser.Input.Keyboard.KeyboardPlugin): PlayerKeys {
  return keyboard.addKeys({
    left: 'LEFT', right: 'RIGHT', up: 'UP', a: 'A', d: 'D', w: 'W', space: 'SPACE', r: 'R',
  }) as PlayerKeys;
}

/** Resolves input in priority order: bot, manual override, then keyboard and touch. */
export function readPlayerInput(keys: PlayerKeys, getState: () => unknown): InputState {
  if (inputOverride.bot) return inputOverride.bot(getState());
  if (inputOverride.manual) return inputOverride.manual;
  return {
    left: keys.left.isDown || keys.a.isDown || touchInput.left,
    right: keys.right.isDown || keys.d.isDown || touchInput.right,
    jump: keys.up.isDown || keys.w.isDown || keys.space.isDown || touchInput.jump,
  };
}

export const approach = (value: number, target: number, step: number) =>
  value < target ? Math.min(value + step, target) : Math.max(value - step, target);

let touchJumpPresses = 0;
let seenTouchJumpPresses = 0;

export const hasInputOverride = () => Boolean(inputOverride.bot || inputOverride.manual);
export const hasBot = () => inputOverride.bot !== null;

/**
 * Calls back on each real key press, even one released within a frame (`JustDown` misses those).
 * OS auto-repeat of a key held through `scene.restart()` reaches a new Key as a first "down", so it is filtered.
 */
export function onFreshKeyDown(key: Phaser.Input.Keyboard.Key, callback: () => void): void {
  key.on('down', (_key: Phaser.Input.Keyboard.Key, event: KeyboardEvent) => {
    if (!event.repeat) callback();
  });
}

/** Consumes touch jump presses since the last call, including a tap shorter than one frame. */
export function consumeTouchJumpPress(): boolean {
  const pressed = touchJumpPresses !== seenTouchJumpPresses;
  seenTouchJumpPresses = touchJumpPresses;
  return pressed;
}

/**
 * Judges a Gatefall swipe from its offset in game pixels. Returns null while it is still too short to judge,
 * and 'invalid' once it is long enough but too diagonal (an exact diagonal has no direction at any ratio).
 */
export function classifySwipe(dx: number, dy: number, minPx: number, axisRatio: number): Dir | 'invalid' | null {
  if (Math.hypot(dx, dy) < minPx) return null;
  const long = Math.max(Math.abs(dx), Math.abs(dy));
  const short = Math.min(Math.abs(dx), Math.abs(dy));
  if (long === short || long < axisRatio * short) return 'invalid';
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

export function bindTouchControls(): void {
  const bind = (id: string, key: keyof InputState) => {
    const button = document.getElementById(id);
    if (!button) return;
    const set = (down: boolean) => {
      touchInput[key] = down;
      button.classList.toggle('active', down);
    };
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (key === 'jump' && !touchInput.jump) touchJumpPresses += 1;
      set(true);
    });
    for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
      button.addEventListener(type, () => set(false));
    }
    button.addEventListener('contextmenu', (event) => event.preventDefault());
  };
  bind('btn-left', 'left');
  bind('btn-right', 'right');
  bind('btn-jump', 'jump');
}
