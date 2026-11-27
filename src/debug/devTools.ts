import GUI from 'lil-gui';
import type Phaser from 'phaser';
import { TUNING, TUNING_RANGES } from '../config';
import { inputOverride, type InputState } from '../game/controls';
import type { ArcRelayScene, ArcRelayState } from '../scenes/ArcRelayScene';
import type { GameScene, GameState } from '../scenes/GameScene';
import { createGatefallSim, type Dir, type GatefallFixture, type GatefallSim } from '../game/gatefallLogic';
import type { GatefallScene, GatefallState } from '../scenes/GatefallScene';
import {
  analyticEffects, createSlotFiveBattle, createSlotFiveSim, evaluateGrid, readEffectConfig, readGridConfig, simulateMatches, validateGrid,
  type BattleSetup, type MatchReport, type SimulateMatchesOptions, type BattleSpin, type BattleState, type Effects, type Evaluation, type GridSim,
} from '../game/slotFiveLogic';
import type { SlotFiveScene, SlotFiveState } from '../scenes/SlotFiveScene';

export type AnyGameState = GameState | ArcRelayState | GatefallState | SlotFiveState;

export interface GatefallDebug {
  loadLevel(levelIndex: number, seed?: number): void;
  loadFixture(fixture: GatefallFixture): void;
  tilt(dir: Dir): boolean;
  createSim(levelIndex: number, seed: number, fixture?: GatefallFixture): GatefallSim;
}

/** Pure battle sim for tests. */
export interface BattleSim {
  getState(): BattleState;
  spin(): BattleSpin;
}

/** Slot Five debug API, C1 to C4. */
export interface SlotFiveDebug {
  /** Grid-only sim, snapshots TUNING at call time. spin() returns the 0-based spinIndex of that spin and its grid. */
  createSim(seed: number): GridSim;
  /** The next spin of the running match uses this grid; it still draws and discards 20 RNG numbers. */
  forceNextGrid(grid: number[][]): void;
  /** Pure chain and effect evaluation with TUNING read at call time. Throws on a malformed grid. */
  evaluate(grid: number[][]): Evaluation;
  /** Brief 4.6 expected effects per spin with TUNING read at call time. */
  analyticEffects(): Effects;
  /** Pure battle, TUNING snapshotted at call time. */
  createBattle(seed: number, setup?: BattleSetup): BattleSim;
  /** Loads a match into the running scene. Throws on a bad setup and leaves the running match untouched. */
  loadMatch(seed: number, setup?: BattleSetup): void;
  /** Like pressing spin; false when rejected. */
  spin(): boolean;
  /** Like pressing F until the switch reaches `on`. Applies from the next turn. */
  setFastMode(on: boolean): void;
  /** One battle per seed, TUNING read at call time. Optional setup (e.g. { turn: 'foe' }) applies to every match. */
  simulateMatches(opts: SimulateMatchesOptions): MatchReport;
}

/** State defaults to Coin Hop. Arc Relay callers use `getState<ArcRelayState>()` and `setBot<ArcRelayState>(...)`. */
export interface DebugApi {
  getState<S extends AnyGameState = GameState>(): S | null;
  setInput(input: InputState | null): void;
  setBot<S extends AnyGameState = GameState>(bot: ((state: S) => InputState) | null): void;
  teleport(x: number, y: number): void;
  restart(): void;
  tuning: typeof TUNING;
  /** Present only on `/?game=gatefall`. */
  gatefall?: GatefallDebug;
  /** Present only on `/?game=slot-five`. */
  slotFive?: SlotFiveDebug;
}

declare global {
  interface Window {
    __game?: DebugApi;
  }
}

/** Loaded only in dev builds. Gives agents and tests a way to read and drive the game. */
export function installDevTools(game: Phaser.Game): void {
  const scene = () => game.scene.getScene('game') as GameScene | ArcRelayScene | GatefallScene | SlotFiveScene | null;
  const isReady = () => Boolean(scene()?.scene.isActive());

  window.__game = {
    getState: <S extends AnyGameState = GameState>() => (isReady() ? (scene()!.getState() as S) : null),
    setInput: (input) => {
      inputOverride.manual = input;
    },
    setBot: (bot) => {
      inputOverride.bot = bot as unknown as typeof inputOverride.bot;
    },
    teleport: (x, y) => scene()?.teleport(x, y),
    restart: () => scene()?.scene.restart(),
    tuning: TUNING,
  };

  if (new URLSearchParams(window.location.search).get('game') === 'gatefall') {
    const gatefallScene = () => {
      if (!isReady()) throw new Error('Gatefall scene is not ready');
      return scene() as GatefallScene;
    };
    window.__game.gatefall = {
      loadLevel: (levelIndex, seed) => gatefallScene().loadLevel(levelIndex, seed),
      loadFixture: (fixture) => gatefallScene().loadFixture(fixture),
      tilt: (dir) => (isReady() ? (scene() as GatefallScene).tilt(dir) : false),
      createSim: createGatefallSim,
    };
  }

  if (new URLSearchParams(window.location.search).get('game') === 'slot-five') {
    window.__game.slotFive = {
      createSim: (seed) => createSlotFiveSim(seed, TUNING),
      forceNextGrid: (grid) => {
        if (!isReady()) throw new Error('Slot Five scene is not ready');
        (scene() as SlotFiveScene).forceNextGrid(grid);
      },
      evaluate: (grid) => evaluateGrid(validateGrid(grid), readEffectConfig(TUNING)),
      analyticEffects: () => analyticEffects(readGridConfig(TUNING), readEffectConfig(TUNING)),
      createBattle: (seed, setup) => {
        const battle = createSlotFiveBattle(seed, TUNING, setup);
        return { getState: () => battle.getState(), spin: () => battle.spin() };
      },
      loadMatch: (seed, setup) => {
        if (!isReady()) throw new Error('Slot Five scene is not ready');
        (scene() as SlotFiveScene).loadMatch(seed, setup);
      },
      spin: () => (isReady() ? (scene() as SlotFiveScene).spin() : false),
      setFastMode: (on) => {
        if (!isReady()) throw new Error('Slot Five scene is not ready');
        (scene() as SlotFiveScene).setFastMode(on);
      },
      simulateMatches: (opts) => simulateMatches(opts, TUNING),
    };
  }

  const gui = new GUI({ title: 'Tune gameplay' });
  for (const key of Object.keys(TUNING) as (keyof typeof TUNING)[]) {
    const [min, max, step] = TUNING_RANGES[key];
    gui.add(TUNING, key, min, max, step);
  }
  gui.add({ copy: () => navigator.clipboard.writeText(JSON.stringify(TUNING, null, 2)) }, 'copy').name('Copy JSON');
  gui.close();
}
