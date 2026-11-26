import Phaser from 'phaser';
import { TUNING, VIEW } from '../config';
import { classifySwipe } from '../game/controls';
import {
  createGatefallSim, defaultGatefallSeed, GF_DIRS, readGatefallLevelConfig,
  type Dir, type GatefallCell, type GatefallEvent, type GatefallFixture, type GatefallLevelConfig,
  type GatefallLogicState, type GatefallSim,
} from '../game/gatefallLogic';

export interface GatefallState extends GatefallLogicState {
  animating: boolean;
  endLockLeftMs: number;
  viewCounts: { pieces: number; gatePieces: number };
  rejectFeedbacks: number;
}

/** Layout and look only. Everything that affects play or timing is in TUNING. */
const FONT = 'Segoe UI, Arial, sans-serif';
const BOARD_CENTER_X = 620;
const HUD_X = 28;
const EDGE_MARGIN_PX = 6;
const LABEL_BAND_PX = 18;
const GATE_GAP_PX = 4;
const GATE_DEPTH_RATIO = 0.86;
const CELL_INSET_PX = 6;
const GATE_PIECE_INSET_PX = 13;
const GATE_PIECE_SHIFT_PX = 5;
const SHAKE_PX = 6;
const SHAKE_CYCLES = 2;
const CLEAR_PREP_SCALE = 1.18;
const CLEAR_END_SCALE = 0.2;
const REFILL_START_SCALE = 0.3;
const TEXTURE_PX = 96;

/** Left HUD column, in game pixels. It ends before the LEFT-side gate label of every tunable board size. */
const MESSAGE_Y = 306;
const HINT_Y = 346;
const END_PANEL = { x: 18, y: 300, w: 330, h: 138 };
const RETRY_BUTTON = { x: 28, y: 448, w: 150, h: 76 };
const NEXT_BUTTON = { x: 190, y: 448, w: 150, h: 76 };
const BUTTON_FONT_PX = 24;
const BUTTON_MIN_FONT_PX = 15;
/** Input plumbing, not a gameplay value: how long after a pointer release its trailing `click` is ignored. */
const BUTTON_GHOST_CLICK_MS = 500;
const WON_COLOR = 0x69db7c;
const LOST_COLOR = 0xff8f8f;

const KEY_DIRS: Partial<Record<string, Dir>> = {
  ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left',
};
/** Typing or adjusting a value in these must not play the game (the dev tuning panel lives here). */
// The tune panel exists only in dev builds; the release build must not even name it.
const TEXT_ENTRY_SELECTOR = import.meta.env.DEV
  ? 'input, textarea, select, [contenteditable], .lil-gui'
  : 'input, textarea, select, [contenteditable]';

const BOARD_COLOR = 0x252a4a;
const GRID_COLOR = 0x3a4170;
const GATE_BAND_COLOR = 0x1c2040;
const GATE_SLOT_COLOR = 0x2e3560;
const GATE_ACCENT_COLOR = 0x8fd3ff;
const VENT_COLOR = 0xff5c5c;
const PIECE_COLORS = ['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c', '#da77f2', '#ffa94d'];

const DIR_LABELS: Record<Dir, string> = { up: 'LÊN', right: 'PHẢI', down: 'XUỐNG', left: 'TRÁI' };
const DIR_VECTORS: Record<Dir, { x: number; y: number }> = {
  up: { x: 0, y: -1 }, right: { x: 1, y: 0 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 },
};

interface Layout {
  size: number;
  cell: number;
  gateDepth: number;
  boardPx: number;
  left: number;
  top: number;
  cellScale: number;
  gateScale: number;
}

interface Pose {
  x: number;
  y: number;
  scale: number;
  alpha: number;
}

interface PoseKey {
  start: number;
  end: number;
  from: Pose;
  to: Pose;
  easeIn: boolean;
}

interface PieceView {
  image: Phaser.GameObjects.Image;
  keys: PoseKey[];
  /** The pose the piece ends the current playback in. */
  pose: Pose;
  bornAt: number;
  diesAt: number | null;
  startedInGate: boolean;
  leavesGateAt: number | null;
  color: number;
}

interface HudKey {
  at: number;
  tiltsLeft?: number;
  color?: number;
  gained?: number;
  message?: string;
}

interface Playback {
  startedAt: number;
  /** Equals the sim's animMs; input stays locked until then. */
  durationMs: number;
  /** Refill pops may finish after the unlock, so they never lengthen the lock. */
  visualEndMs: number;
  settled: boolean;
  dir: Dir;
  dying: PieceView[];
  hudKeys: HudKey[];
  baseCollected: number[];
  vent: { start: number; end: number; cells: GatefallCell[] } | null;
}

function drawPieceShape(ctx: CanvasRenderingContext2D, shape: number): void {
  const c = TEXTURE_PX / 2;
  const r = TEXTURE_PX * 0.44;
  const polygon = (points: [number, number][]) => {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(c + x * r, c + y * r) : ctx.lineTo(c + x * r, c + y * r)));
    ctx.closePath();
  };
  switch (shape) {
    case 0:
      ctx.beginPath();
      ctx.arc(c, c, r, 0, Math.PI * 2);
      break;
    case 1:
      polygon([[-0.86, -0.86], [0.86, -0.86], [0.86, 0.86], [-0.86, 0.86]]);
      break;
    case 2:
      polygon([[0, -1], [1, 0.86], [-1, 0.86]]);
      break;
    case 3:
      polygon([[0, -1.05], [1.05, 0], [0, 1.05], [-1.05, 0]]);
      break;
    case 4: {
      const star: [number, number][] = [];
      for (let i = 0; i < 10; i += 1) {
        const radius = i % 2 === 0 ? 1.08 : 0.46;
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        star.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
      }
      polygon(star);
      break;
    }
    default:
      polygon([
        [-0.34, -0.95], [0.34, -0.95], [0.34, -0.34], [0.95, -0.34], [0.95, 0.34], [0.34, 0.34],
        [0.34, 0.95], [-0.34, 0.95], [-0.34, 0.34], [-0.95, 0.34], [-0.95, -0.34], [-0.34, -0.34],
      ]);
  }
}

export class GatefallScene extends Phaser.Scene {
  private sim!: GatefallSim;
  private config!: GatefallLevelConfig;
  private levelIndex = 0;
  private seed: number | undefined;
  private fixture: GatefallFixture | undefined;

  private layer!: Phaser.GameObjects.Container;
  private boardGraphics!: Phaser.GameObjects.Graphics;
  private fxGraphics!: Phaser.GameObjects.Graphics;
  private gateLabels: Phaser.GameObjects.Text[] = [];
  private layout!: Layout;

  private levelText!: Phaser.GameObjects.Text;
  private tiltsText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private goalRows: { icon: Phaser.GameObjects.Image; text: Phaser.GameObjects.Text }[] = [];
  private hintText!: Phaser.GameObjects.Text;
  private endBackdrop!: Phaser.GameObjects.Rectangle;
  private endText!: Phaser.GameObjects.Text;
  private endDetailText!: Phaser.GameObjects.Text;

  private views = new Set<PieceView>();
  private cellViews: (PieceView | null)[][] = [];
  private gateViews: Record<Dir, (PieceView | null)[]> = { up: [], right: [], down: [], left: [] };
  private playback: Playback | null = null;

  private rejectFeedbacks = 0;
  private rejectShakeMs = 0;
  private shake: { startedAt: number; dir: Dir } | null = null;

  /** Copied from TUNING when a level starts, like the rest of the level's parameters. */
  private swipeMinPx = 0;
  private swipeAxisRatio = 1;
  private endLockMs = 0;
  /** performance.now() at which the next level unlocks: end of the winning replay plus gfEndLockMs. */
  private endLockUntil = 0;

  /** The one touch being read. Null also means a spent touch: its later moves match nothing until a new press. */
  private swipe: { pointerId: number; x: number; y: number } | null = null;
  /** Fingers that went down on the canvas. A new swipe can only start when this is empty. */
  private canvasPointers = new Set<number>();
  private inputBindings: AbortController | null = null;
  private retryButton: HTMLElement | null = null;
  private nextButton: HTMLElement | null = null;
  private buttonRect = { left: NaN, top: NaN, width: NaN };

  constructor() {
    // Shares the key with the other games: only one of them is registered per page load.
    super('game');
  }

  create(): void {
    // scene.restart() destroyed the old display objects, so nothing may still point at them.
    this.views = new Set();
    this.playback = null;
    this.shake = null;
    this.gateLabels = [];
    this.goalRows = [];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.playback = null;
      this.views.clear();
      this.releaseInput();
    });
    this.events.off(Phaser.Scenes.Events.DESTROY, this.releaseInput, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.releaseInput, this);

    this.createPieceTextures();
    this.boardGraphics = this.add.graphics();
    this.fxGraphics = this.add.graphics();
    this.layer = this.add.container(0, 0, [this.boardGraphics, this.fxGraphics]);

    this.levelText = this.add.text(HUD_X, 28, '', { fontFamily: FONT, fontSize: '30px', fontStyle: 'bold', color: '#ffffff', resolution: 2 });
    this.tiltsText = this.add.text(HUD_X, 76, '', { fontFamily: FONT, fontSize: '24px', color: '#ffe08a', resolution: 2 });
    this.add.text(HUD_X, 124, 'MỤC TIÊU', { fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#9aa3d0', resolution: 2 });
    this.messageText = this.add.text(HUD_X, MESSAGE_Y, '', { fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#ff8f8f', resolution: 2 });
    this.hintText = this.add.text(HUD_X, HINT_Y, 'Nghiêng về hướng nào,\nđợt quân ở cửa mang tên\nhướng đó sẽ vào bàn.', {
      fontFamily: FONT, fontSize: '17px', color: '#b7bee6', lineSpacing: 4, resolution: 2,
    });
    this.endBackdrop = this.add.rectangle(END_PANEL.x, END_PANEL.y, END_PANEL.w, END_PANEL.h, 0x0b0d1c, 1)
      .setOrigin(0).setVisible(false);
    this.endText = this.add.text(END_PANEL.x + 14, END_PANEL.y + 8, '', {
      fontFamily: FONT, fontSize: '36px', fontStyle: 'bold', color: '#ffffff', resolution: 2,
    }).setVisible(false);
    this.endDetailText = this.add.text(END_PANEL.x + 14, END_PANEL.y + 60, '', {
      fontFamily: FONT, fontSize: '18px', color: '#ffffff', lineSpacing: 6, resolution: 2,
    }).setVisible(false);

    this.swipe = null;
    this.bindInput();
    this.startSim(this.levelIndex, this.seed, this.fixture);
    this.syncButtonLayout();
  }

  update(): void {
    this.advancePlayback(true);
    this.updateShake();
    this.syncButtonLayout();
    this.nextButton?.classList.toggle('locked', this.readEndLockLeft() > 0);
  }

  getState(): GatefallState {
    this.advancePlayback(false);
    return {
      ...this.sim.getState(),
      animating: this.isAnimating(),
      endLockLeftMs: this.readEndLockLeft(),
      viewCounts: this.countViews(),
      rejectFeedbacks: this.rejectFeedbacks,
    };
  }

  /** The debug API's shared `teleport` has no meaning on a grid board. */
  teleport(_x: number, _y: number): void {}

  loadLevel(levelIndex: number, seed?: number): void {
    defaultGatefallSeed(levelIndex);
    this.startSim(levelIndex, seed, undefined);
  }

  loadFixture(fixture: GatefallFixture): void {
    this.startSim(this.levelIndex, this.seed, fixture);
  }

  /** Returns false when rejected or while the replay holds the input lock. Nothing is queued. */
  tilt(dir: Dir): boolean {
    this.advancePlayback(false);
    if (this.isAnimating()) return false;

    const { accepted, events, animMs } = this.sim.tilt(dir);
    if (!accepted) {
      this.rejectFeedbacks += 1;
      if (this.rejectShakeMs > 0) this.shake = { startedAt: performance.now(), dir };
      return false;
    }
    this.endPlayback();
    this.stopShake();
    this.beginPlayback(events, animMs);
    if (this.sim.getState().status === 'won' && this.playback) {
      this.endLockUntil = this.playback.startedAt + animMs + this.endLockMs;
    }
    return true;
  }

  /** Same level, same seed, at any moment. Cancels the replay and ignores the end lock. */
  retry(): void {
    this.startSim(this.levelIndex, this.seed, this.fixture);
  }

  /** Only after a win and once the lock is over. After the last level this returns to level 1. */
  nextLevel(): boolean {
    this.advancePlayback(false);
    const { status, levelIndex, levelCount } = this.sim.getState();
    if (status !== 'won' || this.isAnimating() || this.readEndLockLeft() > 0) return false;
    this.startSim((levelIndex + 1) % levelCount, undefined, undefined);
    return true;
  }

  private readEndLockLeft(): number {
    return Math.max(0, Math.ceil(this.endLockUntil - performance.now()));
  }

  // --- Player input ------------------------------------------------------------------------

  /** One AbortController owns every listener, so a restart can never leave a second copy bound. */
  private bindInput(): void {
    this.releaseInput();
    const bindings = new AbortController();
    this.inputBindings = bindings;
    const { signal } = bindings;
    const canvas = this.game.canvas;
    // Phaser calls preventDefault on a non-cancelable touchcancel, which logs a console error. Its capture flag
    // is lowered only while that one event passes: leaving it off for good makes taps on the DOM buttons unreliable.
    const touchManager = this.input.manager.touch;
    if (touchManager) {
      window.addEventListener('touchcancel', () => { touchManager.capture = false; }, { capture: true, signal });
      window.addEventListener('touchcancel', () => { touchManager.capture = true; }, { signal });
    }

    window.addEventListener('keydown', (event) => this.onKeyDown(event), { signal });
    // Only the canvas starts a swipe, so a press on a DOM button is never read as one.
    canvas.addEventListener('pointerdown', (event) => this.onSwipeStart(event), { signal });
    window.addEventListener('pointermove', (event) => this.onSwipeMove(event), { signal });
    for (const type of ['pointerup', 'pointercancel'] as const) {
      window.addEventListener(type, (event) => {
        this.canvasPointers.delete(event.pointerId);
        if (event.pointerId === this.swipe?.pointerId) this.swipe = null;
      }, { signal });
    }
    // The browser's own count of fingers is the backstop if a pointerup never arrived.
    for (const type of ['touchend', 'touchcancel'] as const) {
      window.addEventListener(type, (event) => {
        if (event.touches.length === 0) this.clearSwipeGesture();
      }, { signal });
    }
    window.addEventListener('blur', () => this.clearSwipeGesture(), { signal });
    document.addEventListener('visibilitychange', () => this.clearSwipeGesture(), { signal });

    this.retryButton = document.getElementById('gf-retry');
    this.nextButton = document.getElementById('gf-next');
    if (this.retryButton) this.bindButton(this.retryButton, () => this.retry(), signal);
    if (this.nextButton) this.bindButton(this.nextButton, () => this.nextLevel(), signal);
    this.buttonRect = { left: NaN, top: NaN, width: NaN };
  }

  /**
   * Fires from the button's own pointer, because Chromium sends no `click` for a second finger.
   * Each finger is judged alone: it activates the button only if it went down on it, was never cancelled
   * (dragged out, pointercancel, blur, hidden tab) and is released inside it. No finger can block another;
   * the first one to fire spends the fingers still resting on the button, so two fingers fire once.
   * `click` stays for keyboard and assistive activation, minus the ones that follow a pointer release.
   */
  private bindButton(button: HTMLElement, action: () => void, signal: AbortSignal): void {
    const presses = new Map<number, { pointerType: string; cancelled: boolean }>();
    let releasedAt = -Infinity;
    const isInside = (event: PointerEvent) => {
      const r = button.getBoundingClientRect();
      return r.width > 0 && event.clientX >= r.left && event.clientX <= r.right
        && event.clientY >= r.top && event.clientY <= r.bottom;
    };
    const cancelAll = () => {
      for (const press of presses.values()) press.cancelled = true;
    };

    button.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      // A primary pointer means no other pointer of its type is down, so entries whose release was lost go here.
      if (event.isPrimary) {
        for (const [id, press] of presses) if (press.pointerType === event.pointerType) presses.delete(id);
      }
      presses.set(event.pointerId, { pointerType: event.pointerType, cancelled: false });
    }, { signal });
    window.addEventListener('pointermove', (event) => {
      const press = presses.get(event.pointerId);
      if (press && !press.cancelled && !isInside(event)) press.cancelled = true;
    }, { signal });
    window.addEventListener('pointerup', (event) => {
      const press = presses.get(event.pointerId);
      if (!press) return;
      presses.delete(event.pointerId);
      // Recorded for cancelled releases too, so the click a release may still bring is dropped either way.
      releasedAt = event.timeStamp;
      if (press.cancelled || !isInside(event)) return;
      // One activation per touch of the button: fingers already on it when it fires are spent, not queued.
      cancelAll();
      action();
    }, { signal });
    window.addEventListener('pointercancel', (event) => { presses.delete(event.pointerId); }, { signal });
    // Fires after the last pointerup, so only fingers whose release never arrived are left to drop.
    for (const type of ['touchend', 'touchcancel'] as const) {
      window.addEventListener(type, (event) => {
        if (event.touches.length > 0) return;
        for (const [id, press] of presses) if (press.pointerType === 'touch') presses.delete(id);
      }, { signal });
    }
    window.addEventListener('blur', cancelAll, { signal });
    document.addEventListener('visibilitychange', cancelAll, { signal });
    button.addEventListener('click', (event) => {
      // Keyboard activation has detail 0. A pointer's click has detail >= 1 and comes right after its release.
      if (event.detail > 0 && event.timeStamp - releasedAt < BUTTON_GHOST_CLICK_MS) return;
      action();
    }, { signal });
    button.addEventListener('contextmenu', (event) => event.preventDefault(), { signal });
  }

  private clearSwipeGesture(): void {
    this.canvasPointers.clear();
    this.swipe = null;
  }

  private releaseInput(): void {
    this.inputBindings?.abort();
    this.inputBindings = null;
    this.clearSwipeGesture();
  }

  private onKeyDown(event: KeyboardEvent): void {
    // Ctrl+R and similar belong to the browser.
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target instanceof Element && event.target.closest(TEXT_ENTRY_SELECTOR)) return;
    const dir = KEY_DIRS[event.key];
    const key = event.key.toLowerCase();
    if (!dir && key !== 'r' && key !== 'enter') return;
    // Also stops Enter from clicking a focused DOM button, which would run a second action.
    event.preventDefault();
    if (event.repeat) return;
    if (dir) this.tilt(dir);
    else if (key === 'r') this.retry();
    else this.nextLevel();
  }

  private onSwipeStart(event: PointerEvent): void {
    if (event.button !== 0) return;
    const firstFinger = this.canvasPointers.size === 0;
    this.canvasPointers.add(event.pointerId);
    if (firstFinger) this.swipe = { pointerId: event.pointerId, ...this.toGamePixels(event) };
  }

  /** Decides once, the moment the swipe is long enough. Either way no finger can swipe until all have lifted. */
  private onSwipeMove(event: PointerEvent): void {
    const swipe = this.swipe;
    if (!swipe || event.pointerId !== swipe.pointerId) return;
    const point = this.toGamePixels(event);
    const result = classifySwipe(point.x - swipe.x, point.y - swipe.y, this.swipeMinPx, this.swipeAxisRatio);
    if (result === null) return;
    this.swipe = null;
    if (result !== 'invalid') this.tilt(result);
  }

  /** Scale.FIT shrinks the canvas, so screen pixels are converted before any distance is measured. */
  private toGamePixels(event: PointerEvent): { x: number; y: number } {
    const rect = this.game.canvas.getBoundingClientRect();
    const scale = VIEW.width / rect.width;
    return { x: (event.clientX - rect.left) * scale, y: (event.clientY - rect.top) * scale };
  }

  /** Keeps the DOM buttons on their spot in the left HUD column at any canvas size. */
  private syncButtonLayout(): void {
    const { left, top, width } = this.game.canvas.getBoundingClientRect();
    const last = this.buttonRect;
    if (width === 0 || (left === last.left && top === last.top && width === last.width)) return;
    this.buttonRect = { left, top, width };
    const scale = width / VIEW.width;
    const place = (button: HTMLElement | null, box: typeof RETRY_BUTTON) => {
      if (!button) return;
      button.style.left = `${left + box.x * scale}px`;
      button.style.top = `${top + box.y * scale}px`;
      button.style.width = `${box.w * scale}px`;
      button.style.height = `${box.h * scale}px`;
      button.style.fontSize = `${Math.max(BUTTON_MIN_FONT_PX, BUTTON_FONT_PX * scale)}px`;
    };
    place(this.retryButton, RETRY_BUTTON);
    place(this.nextButton, NEXT_BUTTON);
  }

  // --- Level setup -------------------------------------------------------------------------

  /** Builds the sim first, so a rejected fixture leaves the running level and its view untouched. */
  private startSim(levelIndex: number, seed: number | undefined, fixture: GatefallFixture | undefined): void {
    const resolvedSeed = seed ?? defaultGatefallSeed(levelIndex);
    const sim = createGatefallSim(levelIndex, resolvedSeed, fixture);
    this.sim = sim;
    this.config = readGatefallLevelConfig(levelIndex, resolvedSeed);
    this.levelIndex = levelIndex;
    this.seed = seed;
    this.fixture = fixture;
    this.rejectShakeMs = TUNING.gfRejectShakeMs;
    this.swipeMinPx = TUNING.gfSwipeMinPx;
    this.swipeAxisRatio = TUNING.gfSwipeAxisRatio;
    this.endLockMs = TUNING.gfEndLockMs;
    this.endLockUntil = 0;
    this.swipe = null;
    this.rejectFeedbacks = 0;

    this.playback = null;
    this.stopShake();
    this.fxGraphics.clear();
    for (const view of this.views) view.image.destroy();
    this.views.clear();

    const state = sim.getState();
    this.layout = this.computeLayout(state.boardSize);
    this.drawBoard();
    this.buildGoalRows(state);
    this.buildPieces(state);
    this.refreshHud(state.tiltsLeft, state.collected, '');
    this.refreshEndBanner();
  }

  private computeLayout(size: number): Layout {
    const available = VIEW.height - 2 * (EDGE_MARGIN_PX + LABEL_BAND_PX + GATE_GAP_PX);
    const cell = Math.floor(available / (size + 2 * GATE_DEPTH_RATIO));
    const gateDepth = Math.round(cell * GATE_DEPTH_RATIO);
    const boardPx = cell * size;
    return {
      size,
      cell,
      gateDepth,
      boardPx,
      left: Math.round(BOARD_CENTER_X - boardPx / 2),
      top: Math.round((VIEW.height - boardPx) / 2),
      cellScale: (cell - CELL_INSET_PX) / TEXTURE_PX,
      gateScale: (gateDepth - GATE_PIECE_INSET_PX) / TEXTURE_PX,
    };
  }

  private createPieceTextures(): void {
    PIECE_COLORS.forEach((fill, color) => {
      const key = `gf-piece-${color}`;
      if (this.textures.exists(key)) return;
      const texture = this.textures.createCanvas(key, TEXTURE_PX, TEXTURE_PX);
      if (!texture) throw new Error(`Gatefall: cannot create texture ${key}`);
      const ctx = texture.getContext();
      drawPieceShape(ctx, color);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#10122a';
      ctx.stroke();
      texture.refresh();
    });
  }

  private cellPosition(x: number, y: number): { x: number; y: number } {
    const { left, top, cell } = this.layout;
    return { x: left + (x + 0.5) * cell, y: top + (y + 0.5) * cell };
  }

  /** Center of a gate slot. Each slot lines up with its lane, on the edge opposite the tilt direction. */
  private slotPosition(dir: Dir, lane: number): { x: number; y: number } {
    const { left, top, cell, boardPx, gateDepth } = this.layout;
    const along = (lane + 0.5) * cell;
    const offset = GATE_GAP_PX + gateDepth / 2;
    switch (dir) {
      case 'down': return { x: left + along, y: top - offset };
      case 'up': return { x: left + along, y: top + boardPx + offset };
      case 'right': return { x: left - offset, y: top + along };
      case 'left': return { x: left + boardPx + offset, y: top + along };
    }
  }

  /** Pieces sit toward the outer edge of the slot so the inward arrow stays visible. */
  private gatePiecePose(dir: Dir, lane: number): Pose {
    const slot = this.slotPosition(dir, lane);
    const inward = DIR_VECTORS[dir];
    return {
      x: slot.x - inward.x * GATE_PIECE_SHIFT_PX,
      y: slot.y - inward.y * GATE_PIECE_SHIFT_PX,
      scale: this.layout.gateScale,
      alpha: 1,
    };
  }

  private cellPose(cell: GatefallCell): Pose {
    return { ...this.cellPosition(cell.x, cell.y), scale: this.layout.cellScale, alpha: 1 };
  }

  private drawBoard(): void {
    const { size, cell, gateDepth, boardPx, left, top } = this.layout;
    const g = this.boardGraphics;
    g.clear();
    g.fillStyle(BOARD_COLOR, 1);
    g.fillRect(left, top, boardPx, boardPx);
    g.lineStyle(1, GRID_COLOR, 1);
    for (let i = 0; i <= size; i += 1) {
      g.lineBetween(left + i * cell, top, left + i * cell, top + boardPx);
      g.lineBetween(left, top + i * cell, left + boardPx, top + i * cell);
    }

    for (const label of this.gateLabels) label.destroy();
    this.gateLabels = [];

    for (const dir of GF_DIRS) {
      const inward = DIR_VECTORS[dir];
      const horizontal = inward.y !== 0;
      const first = this.slotPosition(dir, 0);
      const bandW = horizontal ? boardPx : gateDepth;
      const bandH = horizontal ? gateDepth : boardPx;
      g.fillStyle(GATE_BAND_COLOR, 1);
      g.fillRect(
        horizontal ? left : first.x - gateDepth / 2,
        horizontal ? first.y - gateDepth / 2 : top,
        bandW,
        bandH,
      );
      g.lineStyle(2, GATE_ACCENT_COLOR, 0.75);
      g.strokeRect(
        horizontal ? left : first.x - gateDepth / 2,
        horizontal ? first.y - gateDepth / 2 : top,
        bandW,
        bandH,
      );

      for (let lane = 0; lane < size; lane += 1) {
        const slot = this.slotPosition(dir, lane);
        const slotW = horizontal ? cell - 4 : gateDepth - 4;
        const slotH = horizontal ? gateDepth - 4 : cell - 4;
        g.fillStyle(GATE_SLOT_COLOR, 1);
        g.fillRect(slot.x - slotW / 2, slot.y - slotH / 2, slotW, slotH);
        const tip = gateDepth / 2 - 2;
        this.fillArrow(g, slot.x + inward.x * tip, slot.y + inward.y * tip, inward, 6, GATE_ACCENT_COLOR);
      }

      const outer = gateDepth / 2 + LABEL_BAND_PX / 2 + 1;
      const center = this.slotPosition(dir, 0);
      const labelX = horizontal ? left + boardPx / 2 : center.x - inward.x * outer;
      const labelY = horizontal ? center.y - inward.y * outer : top + boardPx / 2;
      const label = this.add.text(labelX, labelY, DIR_LABELS[dir], {
        fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', color: '#8fd3ff', resolution: 2,
      }).setOrigin(0.5);
      if (!horizontal) label.setAngle(dir === 'right' ? -90 : 90);
      this.layer.add(label);
      this.gateLabels.push(label);

      const spread = 46;
      for (const side of [-1, 1]) {
        const arrowX = labelX + (horizontal ? side * spread : 0);
        const arrowY = labelY + (horizontal ? 0 : side * spread);
        this.fillArrow(g, arrowX + inward.x * 5, arrowY + inward.y * 5, inward, 7, GATE_ACCENT_COLOR);
      }
    }
  }

  private fillArrow(
    g: Phaser.GameObjects.Graphics, tipX: number, tipY: number, dir: { x: number; y: number }, size: number, color: number,
  ): void {
    const baseX = tipX - dir.x * size;
    const baseY = tipY - dir.y * size;
    g.fillStyle(color, 1);
    g.fillTriangle(tipX, tipY, baseX - dir.y * size, baseY + dir.x * size, baseX + dir.y * size, baseY - dir.x * size);
  }

  private buildGoalRows(state: GatefallLogicState): void {
    for (const row of this.goalRows) {
      row.icon.destroy();
      row.text.destroy();
    }
    this.goalRows = state.goals.map((goal, i) => {
      const y = 170 + i * 52;
      const icon = this.add.image(HUD_X + 20, y, `gf-piece-${goal.color}`).setScale(40 / TEXTURE_PX);
      const text = this.add.text(HUD_X + 52, y, '', {
        fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: '#ffffff', resolution: 2,
        // Room above the cap height, so the hook in 'ĐỦ' is not clipped into what looks like an acute accent.
        padding: { top: 6, bottom: 6 },
      }).setOrigin(0, 0.5);
      return { icon, text };
    });
  }

  private buildPieces(state: GatefallLogicState): void {
    this.cellViews = state.board.map((row, y) => row.map((color, x) => (
      color === null ? null : this.createView(color, this.cellPose({ x, y }), false)
    )));
    for (const dir of GF_DIRS) {
      this.gateViews[dir] = state.gates[dir].map((color, lane) => (
        color === null ? null : this.createView(color, this.gatePiecePose(dir, lane), true)
      ));
    }
  }

  private createView(color: number, pose: Pose, startedInGate: boolean): PieceView {
    const image = this.add.image(pose.x, pose.y, `gf-piece-${color}`).setScale(pose.scale);
    this.layer.add(image);
    const view: PieceView = {
      image, keys: [], pose: { ...pose }, bornAt: 0, diesAt: null, startedInGate, leavesGateAt: null, color,
    };
    this.views.add(view);
    return view;
  }

  // --- Event replay ------------------------------------------------------------------------

  private slideMs(cells: number): number {
    return cells === 0 ? 0 : Math.min(this.config.slideMaxMs, cells * this.config.slideMsPerCell);
  }

  private addKey(view: PieceView, start: number, end: number, to: Pose, easeIn = false): void {
    view.keys.push({ start, end, from: { ...view.pose }, to: { ...to }, easeIn });
    view.pose = { ...to };
  }

  /** Plays one move phase at once. Returns its length, set by the piece that travels farthest. */
  private planMoves(moves: Extract<GatefallEvent, { type: 'move' }>[], at: number): number {
    const lifted = moves.map((move) => {
      const view = this.cellViews[move.from.y][move.from.x];
      if (!view) throw new Error(`Gatefall view: no piece at ${move.from.x},${move.from.y}`);
      this.cellViews[move.from.y][move.from.x] = null;
      return { move, view };
    });
    let longest = 0;
    for (const { move, view } of lifted) {
      const cells = Math.abs(move.to.x - move.from.x) + Math.abs(move.to.y - move.from.y);
      const ms = this.slideMs(cells);
      longest = Math.max(longest, ms);
      this.cellViews[move.to.y][move.to.x] = view;
      this.addKey(view, at, at + ms, this.cellPose(move.to), true);
    }
    return longest;
  }

  /** Turns the event list into timed keys, in event order. Reads no rule and asks the sim nothing. */
  private beginPlayback(events: GatefallEvent[], animMs: number): void {
    const { enterMs, clearPrepMs, clearMs, chainPauseMs, ventMs } = this.config;
    const dir = events[0].type === 'tiltStart' ? events[0].dir : 'down';
    const baseCollected = this.readHudCollected(events);
    const playback: Playback = {
      startedAt: performance.now(),
      durationMs: animMs,
      visualEndMs: animMs,
      settled: false,
      dir,
      dying: [],
      hudKeys: [],
      baseCollected,
      vent: null,
    };

    let cursor = 0;
    let refillAt = 0;
    let i = 0;
    const takeRun = <T extends GatefallEvent['type']>(type: T, match: (e: Extract<GatefallEvent, { type: T }>) => boolean) => {
      const run: Extract<GatefallEvent, { type: T }>[] = [];
      while (i < events.length && events[i].type === type && match(events[i] as Extract<GatefallEvent, { type: T }>)) {
        run.push(events[i] as Extract<GatefallEvent, { type: T }>);
        i += 1;
      }
      return run;
    };

    while (i < events.length) {
      const event = events[i];
      switch (event.type) {
        case 'tiltStart':
          playback.hudKeys.push({ at: 0, tiltsLeft: event.tiltsLeft });
          i += 1;
          break;
        case 'move': {
          const chain = event.chain;
          cursor += this.planMoves(takeRun('move', (e) => e.chain === chain), cursor);
          refillAt = cursor;
          break;
        }
        case 'enter': {
          for (const enter of takeRun('enter', () => true)) {
            const view = this.gateViews[enter.dir][enter.lane];
            if (!view) throw new Error(`Gatefall view: no piece in gate ${enter.dir}[${enter.lane}]`);
            this.gateViews[enter.dir][enter.lane] = null;
            this.cellViews[enter.to.y][enter.to.x] = view;
            view.leavesGateAt = cursor;
            this.addKey(view, cursor, cursor + enterMs, this.cellPose(enter.to), true);
          }
          cursor += enterMs;
          refillAt = cursor;
          break;
        }
        case 'clusterClear': {
          const chain = event.chain;
          const popAt = cursor + clearPrepMs;
          for (const cluster of takeRun('clusterClear', (e) => e.chain === chain)) {
            for (const cell of cluster.cells) {
              const view = this.removeCellView(cell);
              const rest = view.pose;
              this.addKey(view, cursor, popAt, { ...rest, scale: rest.scale * CLEAR_PREP_SCALE });
              this.addKey(view, popAt, popAt + clearMs, { ...rest, scale: rest.scale * CLEAR_END_SCALE, alpha: 0 });
              view.diesAt = popAt + clearMs;
              playback.dying.push(view);
            }
            playback.hudKeys.push({ at: popAt, color: cluster.color, gained: cluster.cells.length });
          }
          cursor = popAt + clearMs;
          cursor += this.planMoves(takeRun('move', (e) => e.chain === chain), cursor);
          refillAt = cursor;
          cursor += chainPauseMs;
          break;
        }
        case 'gateRefill': {
          const view = this.createView(event.color, this.gatePiecePose(event.dir, event.lane), true);
          const rest = { ...view.pose };
          view.bornAt = refillAt;
          view.pose = { ...rest, scale: rest.scale * REFILL_START_SCALE, alpha: 0.2 };
          this.addKey(view, refillAt, refillAt + enterMs, rest);
          this.gateViews[event.dir][event.lane] = view;
          playback.visualEndMs = Math.max(playback.visualEndMs, refillAt + enterMs);
          i += 1;
          break;
        }
        case 'vent': {
          for (const cell of event.cells) {
            const view = this.removeCellView(cell);
            this.addKey(view, cursor, cursor + ventMs, { ...view.pose, scale: view.pose.scale * CLEAR_END_SCALE, alpha: 0 });
            view.diesAt = cursor + ventMs;
            playback.dying.push(view);
          }
          playback.vent = { start: cursor, end: cursor + ventMs, cells: event.cells };
          const turnEnd = events[events.length - 1];
          if (turnEnd.type === 'turnEnd') {
            const before = events[0].type === 'tiltStart' ? events[0].tiltsLeft : turnEnd.tiltsLeft;
            playback.hudKeys.push({
              at: cursor, tiltsLeft: turnEnd.tiltsLeft, message: `XẢ BÀN: -${before - turnEnd.tiltsLeft} lượt`,
            });
          }
          cursor += ventMs;
          i += 1;
          break;
        }
        default:
          i += 1;
      }
    }

    if (import.meta.env.DEV && cursor !== animMs) {
      console.error(`Gatefall view: replay is ${cursor} ms but animMs is ${animMs} ms`);
    }

    this.playback = playback;
    this.setEndPanelVisible(false);
    this.renderPlayback(0);
  }

  private removeCellView(cell: GatefallCell): PieceView {
    const view = this.cellViews[cell.y][cell.x];
    if (!view) throw new Error(`Gatefall view: no piece at ${cell.x},${cell.y}`);
    this.cellViews[cell.y][cell.x] = null;
    return view;
  }

  /** `collected` as it stood before this tilt, rebuilt from the events so the HUD counts up during replay. */
  private readHudCollected(events: GatefallEvent[]): number[] {
    const collected = [...this.sim.getState().collected];
    for (const event of events) {
      if (event.type === 'clusterClear') collected[event.color] -= event.cells.length;
    }
    return collected;
  }

  private isAnimating(): boolean {
    return this.playback !== null && !this.playback.settled;
  }

  /**
   * Uses the wall clock instead of Phaser's smoothed delta, so the lock lasts animMs at any frame rate
   * and still ends while the tab is hidden and no frames run.
   */
  private advancePlayback(render: boolean): void {
    const playback = this.playback;
    if (!playback) return;
    const t = performance.now() - playback.startedAt;
    if (!playback.settled && t >= playback.durationMs) this.settlePlayback(playback);
    if (playback.settled && t >= playback.visualEndMs) {
      this.endPlayback();
      return;
    }
    if (render) this.renderPlayback(t);
  }

  /** The replay is over: dead sprites go, the HUD shows the real state and input unlocks. */
  private settlePlayback(playback: Playback): void {
    playback.settled = true;
    for (const view of playback.dying) {
      view.image.destroy();
      this.views.delete(view);
    }
    playback.dying = [];
    playback.vent = null;
    this.fxGraphics.clear();
    const state = this.sim.getState();
    const vented = playback.hudKeys.find((key) => key.message)?.message ?? '';
    this.refreshHud(state.tiltsLeft, state.collected, state.status === 'playing' ? vented : '');
    this.refreshEndBanner();
    if (import.meta.env.DEV) this.checkViewMatches(state);
  }

  private endPlayback(): void {
    if (!this.playback) return;
    if (!this.playback.settled) this.settlePlayback(this.playback);
    this.playback = null;
    for (const view of this.views) {
      view.keys = [];
      view.bornAt = 0;
      view.diesAt = null;
      view.leavesGateAt = null;
      this.applyPose(view, view.pose);
      view.image.setVisible(true);
    }
    for (const row of this.cellViews) {
      for (const view of row) if (view) view.startedInGate = false;
    }
    for (const dir of GF_DIRS) {
      for (const view of this.gateViews[dir]) if (view) view.startedInGate = true;
    }
  }

  private applyPose(view: PieceView, pose: Pose): void {
    view.image.setPosition(pose.x, pose.y).setScale(pose.scale).setAlpha(pose.alpha);
  }

  private renderPlayback(t: number): void {
    const playback = this.playback;
    if (!playback) return;
    for (const view of this.views) {
      const alive = t >= view.bornAt && (view.diesAt === null || t < view.diesAt);
      view.image.setVisible(alive);
      if (!alive || view.keys.length === 0) continue;
      let key = view.keys[0];
      for (const candidate of view.keys) {
        if (candidate.start <= t) key = candidate;
      }
      const span = key.end - key.start;
      const raw = span <= 0 ? 1 : Phaser.Math.Clamp((t - key.start) / span, 0, 1);
      const u = key.easeIn ? raw * raw : raw;
      this.applyPose(view, {
        x: key.from.x + (key.to.x - key.from.x) * u,
        y: key.from.y + (key.to.y - key.from.y) * u,
        scale: key.from.scale + (key.to.scale - key.from.scale) * u,
        alpha: key.from.alpha + (key.to.alpha - key.from.alpha) * u,
      });
    }

    if (playback.settled) return;
    let tiltsLeft = this.sim.getState().tiltsLeft;
    let message = '';
    const collected = [...playback.baseCollected];
    for (const key of playback.hudKeys) {
      if (key.at > t) continue;
      if (key.tiltsLeft !== undefined) tiltsLeft = key.tiltsLeft;
      if (key.color !== undefined) collected[key.color] += key.gained ?? 0;
      if (key.message) message = key.message;
    }
    this.refreshHud(tiltsLeft, collected, message);
    this.drawPlaybackFx(playback, t);
  }

  private drawPlaybackFx(playback: Playback, t: number): void {
    const { cell, gateDepth, boardPx, left, top } = this.layout;
    const g = this.fxGraphics;
    g.clear();

    const slot = this.slotPosition(playback.dir, 0);
    const horizontal = DIR_VECTORS[playback.dir].y !== 0;
    g.lineStyle(4, 0xffffff, Math.max(0, 1 - t / playback.durationMs));
    g.strokeRect(
      horizontal ? left : slot.x - gateDepth / 2,
      horizontal ? slot.y - gateDepth / 2 : top,
      horizontal ? boardPx : gateDepth,
      horizontal ? gateDepth : boardPx,
    );

    const vent = playback.vent;
    if (vent && t >= vent.start && t < vent.end) {
      g.fillStyle(VENT_COLOR, 0.55 * (1 - (t - vent.start) / (vent.end - vent.start)));
      for (const c of vent.cells) g.fillRect(left + c.x * cell, top + c.y * cell, cell, cell);
    }
  }

  private countViews(): { pieces: number; gatePieces: number } {
    const playback = this.playback;
    if (!playback || playback.settled) {
      return {
        pieces: this.cellViews.flat().filter(Boolean).length,
        gatePieces: GF_DIRS.reduce((sum, dir) => sum + this.gateViews[dir].filter(Boolean).length, 0),
      };
    }
    const t = performance.now() - playback.startedAt;
    let pieces = 0;
    let gatePieces = 0;
    for (const view of this.views) {
      if (t < view.bornAt || (view.diesAt !== null && t >= view.diesAt)) continue;
      const inGate = view.startedInGate && (view.leavesGateAt === null || t < view.leavesGateAt);
      if (inGate) gatePieces += 1;
      else pieces += 1;
    }
    return { pieces, gatePieces };
  }

  /** Dev-only guard: the replayed sprites must land exactly on the logic's board and gates. */
  private checkViewMatches(state: GatefallLogicState): void {
    const same = (views: (PieceView | null)[], colors: (number | null)[]) =>
      views.every((view, i) => (view?.color ?? null) === colors[i]);
    const ok = this.cellViews.every((row, y) => same(row, state.board[y]))
      && GF_DIRS.every((dir) => same(this.gateViews[dir], state.gates[dir]));
    if (!ok) console.error('Gatefall view: sprites do not match the logic state after replay');
    const { pieces, gatePieces } = this.countViews();
    const liveImages = this.layer.list.filter((child) => child instanceof Phaser.GameObjects.Image).length;
    if (liveImages !== pieces + gatePieces) {
      console.error(`Gatefall view: ${liveImages} live sprites for ${pieces + gatePieces} pieces`);
    }
  }

  // --- HUD and feedback --------------------------------------------------------------------

  private refreshHud(tiltsLeft: number, collected: number[], message: string): void {
    const state = this.sim.getState();
    this.levelText.setText(`MÀN ${state.levelIndex + 1}/${state.levelCount}`);
    this.tiltsText.setText(`Lượt còn lại: ${tiltsLeft}`);
    state.goals.forEach((goal, i) => {
      const value = collected[goal.color];
      const done = value >= goal.target;
      this.goalRows[i].text.setText(`${value}/${goal.target}${done ? '  ĐỦ' : ''}`);
      this.goalRows[i].text.setColor(done ? '#69db7c' : '#ffffff');
    });
    this.messageText.setText(message);
  }

  private refreshEndBanner(): void {
    const { status, tiltsLeft, campaignComplete, levelCount } = this.sim.getState();
    this.setEndPanelVisible(status !== 'playing');
    this.nextButton?.classList.toggle('show', status === 'won');
    if (this.nextButton) this.nextButton.textContent = campaignComplete ? 'Về màn 1' : 'Màn kế';
    if (status === 'playing') return;

    const touch = window.matchMedia('(pointer: coarse)').matches;
    const nextName = campaignComplete ? 'về màn 1' : 'màn kế';
    if (status === 'won') {
      const result = campaignComplete ? `Xong cả ${levelCount} màn, còn ${tiltsLeft} lượt` : `Còn ${tiltsLeft} lượt nghiêng`;
      const action = touch ? `Chạm nút: ${nextName} hoặc thử lại` : `Enter: ${nextName}   R: thử lại`;
      this.endText.setText('THẮNG!').setColor('#69db7c');
      this.endDetailText.setText(`${result}\n${action}`);
      this.endBackdrop.setStrokeStyle(3, WON_COLOR);
    } else {
      this.endText.setText('THUA').setColor('#ff8f8f');
      this.endDetailText.setText(`Hết lượt nghiêng\n${touch ? 'Chạm nút Thử lại' : 'R: thử lại'}`);
      this.endBackdrop.setStrokeStyle(3, LOST_COLOR);
    }
  }

  /** The result replaces the how-to hint in the left column, so the final board stays fully visible. */
  private setEndPanelVisible(visible: boolean): void {
    this.endBackdrop.setVisible(visible);
    this.endText.setVisible(visible);
    this.endDetailText.setVisible(visible);
    this.hintText.setVisible(!visible);
    if (!visible) this.nextButton?.classList.remove('show');
  }

  private updateShake(): void {
    if (!this.shake) return;
    const u = (performance.now() - this.shake.startedAt) / this.rejectShakeMs;
    if (u >= 1) {
      this.stopShake();
      return;
    }
    const v = DIR_VECTORS[this.shake.dir];
    const offset = Math.sin(u * Math.PI * 2 * SHAKE_CYCLES) * SHAKE_PX * (1 - u);
    this.layer.setPosition(v.x * offset, v.y * offset);
  }

  private stopShake(): void {
    this.shake = null;
    this.layer.setPosition(0, 0);
  }
}
