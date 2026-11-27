import Phaser from 'phaser';
import { SLOT_FIVE_VIEW, TUNING } from '../config';
import {
  castOrder, createSlotFiveBattle, readEffectConfig, readTurnTiming, resolveMsFor, scaleTurnTiming, SF_COLS, SF_ICON_KEYS, SF_ICON_COUNT, SF_ICON_KINDS, SF_ICON_NAMES, SF_LUCKY_ICON, SF_ROWS,
  type BattleSetup, type BattleSpin, type Kind, type TurnTiming, type BattleStatus, type Chain, type Fighter, type Grid, type Side, type SlotFiveBattle,
  spinMsFor,
} from '../game/slotFiveLogic';
import { getSlotFiveVfx, loadedSlotFiveVfxKeys, loadSlotFiveVfx, SF_VFX_KEYS, type SfVfxKey } from '../game/slotFiveVfx';

export type SlotFivePhase = 'idle' | 'spinning' | 'resolving' | 'foeWait' | 'ended';
export type SlotFiveReject = 'notYourTurn' | 'busy' | 'ended';
export interface SlotFiveLastEffects { damage: number; heal: number; shield: number; absorbed: number; hpLoss: number; healed: number }
/** [x, y, w, h] in game pixels. */
export type Box = [number, number, number, number];
export interface LayoutText { id: string; fontPx: number; color: string; bg: string }
export interface SlotFiveLayout {
  width: number;
  height: number;
  /** CSS pixels per game pixel. */
  scale: number;
  /** Canvas top-left in CSS pixels of the viewport. */
  canvasOffset: [number, number];
  boxes: Record<string, Box>;
  castGap: { top: number; bottom: number };
  texts: LayoutText[];
}
export interface FloatTextState { side: Side; text: string; box: Box }
export type VfxKind = 'proj' | 'hit' | 'block' | 'flash';
/** One VFX of the latest turn (brief C12). Times are ms from entering resolving on the scene clock. */
export interface VfxLogEntry {
  key: SfVfxKey;
  kind: VfxKind;
  castIndex: number | null;
  cell: [number, number] | null;
  pos: [number, number];
  /** Largest display box seen while it played, in game pixels. */
  box: Box;
  startedAtMs: number;
  endedAtMs: number | null;
  timeScale: number;
}

export interface SlotFiveState {
  gameId: 'slot-five';
  seed: number;
  matchIndex: number;
  cols: number;
  rows: number;
  iconCount: number;
  luckyIcon: number;
  grid: Grid;
  spinIndex: number;
  turn: Side;
  status: BattleStatus;
  player: Fighter;
  foe: Fighter;
  displayHp: { player: number; foe: number };
  displayShield: { player: number; foe: number };
  lastSide: Side | null;
  lastChains: Chain[];
  lastEffects: SlotFiveLastEffects;
  phase: SlotFivePhase;
  rejectedSpins: number;
  lastReject: SlotFiveReject | null;
  reelsStopped: number;
  lastSpinMs: number;
  lastReelStopMs: number[];
  highlightedChainCount: number;
  highlightedCells: number;
  viewCounts: { icons: number; fighters: number };
  legendOpen: boolean;
  floatTexts: FloatTextState[];
  layout: SlotFiveLayout;
  lastResolveMs: number;
  lastCasts: CastState[];
  castsInFlight: number;
  /** Fast-mode switch (brief 4.11). Kept across matches in the session, false after a page reload. */
  fastMode: boolean;
  /** Time scale captured for the latest turn: 1 or sfFastFactor. */
  lastTimeScale: number;
  /** Planned foeWait of the latest foe turn, eff(sfFoeDelayMs). */
  lastFoeDelayMs: number;
  /** VFX keys loaded so far, sorted alphabetically. */
  vfxLoaded: string[];
  /** VFX sprites currently shown. */
  vfxPlaying: number;
  vfxLog: VfxLogEntry[];
  /** Element of the running match (sfElement snapshot), 0..3. */
  element: number;
  /** Icons the RNG can draw in this match: [element, 4, 5, 6, 7]. */
  activeIcons: number[];
  /** Icons listed by the legend, in row order. */
  legendIcons: number[];
}

const zeroEffects = (): SlotFiveLastEffects => ({ damage: 0, heal: 0, shield: 0, absorbed: 0, hpLoss: 0, healed: 0 });
const SIDES: readonly Side[] = ['player', 'foe'];

// --- Layout (brief 4.9). Look only; everything that affects play or timing is in TUNING. ---------------

const VIEW_W = SLOT_FIVE_VIEW.width;
const VIEW_H = SLOT_FIVE_VIEW.height;

/** Region boxes from the table in brief 4.9, [x, y, w, h]. */
const BOXES = {
  turnBanner: [120, 16, 300, 40],
  reelFrame: [57, 64, 426, 426],
  playerFloat: [16, 536, 160, 90],
  foeFloat: [364, 536, 160, 90],
  playerFighter: [40, 636, 64, 88],
  foeFighter: [436, 636, 64, 88],
  playerHud: [16, 732, 200, 28],
  foeHud: [324, 732, 200, 28],
  panel: [0, 768, 540, 192],
  helpBtn: [20, 832, 64, 64],
  fastBtn: [96, 832, 64, 64],
  spinBtn: [170, 820, 200, 88],
  newBtn: [400, 832, 96, 64],
} as const satisfies Record<string, Box>;
/** Shown only while open; covers the reel frame exactly. */
const LEGEND_BOX: Box = [...BOXES.reelFrame];
/** Close button inside the legend's top-right corner. */
const HELP_CLOSE_BOX: Box = [LEGEND_BOX[0] + LEGEND_BOX[2] - 64, LEGEND_BOX[1], 64, 64];

/** Cells fill the reel frame inside its padding: the cell size follows from the frame, cols and the gap. */
const FRAME_PAD = 12;
const CELL_GAP = 6;
const CELL_PX = (BOXES.reelFrame[2] - 2 * FRAME_PAD - (SF_COLS - 1) * CELL_GAP) / SF_COLS;
const CELL_PITCH = CELL_PX + CELL_GAP;
const GRID_X = BOXES.reelFrame[0] + FRAME_PAD;
const GRID_Y = BOXES.reelFrame[1] + FRAME_PAD;
const GRID_BOTTOM = GRID_Y + (SF_ROWS - 1) * CELL_PITCH + CELL_PX;
const FRAME_BOTTOM = BOXES.reelFrame[1] + BOXES.reelFrame[3];
const ICON_PX = 80;
const ICON_TEXTURE_PREFIX = 'sf-icon-';
/** fire, volt, frost, earth, blade, heal, shield, lucky. */
const ICON_COLORS = [0xe8453c, 0xffd84a, 0xbfe9ff, 0x9a7452, 0xa9afbd, 0x4fcf5f, 0x3d8bff, 0xffffff];
/** Height of the stop bounce, in game pixels. Its duration is sfStopBounceMs. */
const BOUNCE_PX = 10;
const HIGHLIGHT_COLOR = 0xffe14d;

const FONT = 'Segoe UI, Arial, sans-serif';
/** Colours as #rrggbb so layout.texts can report them; every text/background pair is at least 4.5:1. */
const COLORS = {
  page: '#14162b',
  frame: '#0b0d1c',
  cell: '#1f2342',
  banner: '#232850',
  panel: '#0e1022',
  legend: '#0e1022',
  track: '#0b0d1c',
  shieldCell: '#2b5cc8',
  shieldCellEmpty: '#262b4d',
  white: '#ffffff',
  yellow: '#ffe14d',
  green: '#6dff8a',
  red: '#ff6b6b',
  blue: '#8fc2ff',
  muted: '#c8cde8',
};
/** hp bar fills, dark enough that white numbers on them stay above 4.5:1. */
const HP_FILL = { high: '#1e7a34', mid: '#8a6a00', low: '#a3262a' };
const hex = (color: string) => Number.parseInt(color.slice(1), 16);

const BANNER_FONT_PX = 24;
const HP_FONT_PX = 22;
const SHIELD_FONT_PX = 18;
const FLOAT_FONT_PX = 24;
const LEGEND_TITLE_PX = 24;
const LEGEND_HEADER_PX = 18;
const LEGEND_ROW_PX = 20;

/** hp bar is 150 px, then a 6 px gap, then the 44 px shield cell (mirrored on the foe side). */
const HP_BAR_W = 150;
const SHIELD_CELL_W = 44;

/** Floats live in two lanes of their side's *Float box and rise a little inside their lane. */
const FLOAT_LANE_H = 45;
const FLOAT_RISE_PX = 8;
const FLOAT_MS = 650;

/** DOM buttons. */
const BUTTON_FONT_PX = { spin: 34, new: 20, help: 36, close: 30, fast: 18 };
/** #sf-fast colours, mirrored from index.html so layout.texts can report them; on and off differ in background. */
const FAST_BUTTON_COLORS = { off: { color: '#ffffff', bg: '#2e3560' }, on: { color: '#14162b', bg: '#ffe14d' } };
const BUTTON_MIN_FONT_PX = 12;
/** A pointer release is followed by a click within this window; that click must not fire the button again. */
const BUTTON_GHOST_CLICK_MS = 700;
const TEXT_ENTRY_SELECTOR = 'input, textarea, select, [contenteditable]';

/** Cast shot: a filled circle in the chain's icon colour with a white rim. */
const CAST_RADIUS = 13;

type Pt = [number, number];

/** Unit-space outlines (-1..1). Each icon has its own shape so colour is never the only cue. */
function iconShape(icon: number): Pt[] {
  const star = (spikes: number, inner: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? 0.95 : inner;
      const a = -Math.PI / 2 + (i * Math.PI) / spikes;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return pts;
  };
  const regular = (sides: number, r: number, rot: number): Pt[] =>
    Array.from({ length: sides }, (_, i) => {
      const a = rot + (i * 2 * Math.PI) / sides;
      return [Math.cos(a) * r, Math.sin(a) * r] as Pt;
    });
  // Dome with a flat bottom edge: arc from left (angle pi) over the top to right (2 pi).
  const halfDisc: Pt[] = Array.from({ length: 17 }, (_, i) => {
    const a = Math.PI + (i * Math.PI) / 16;
    return [Math.cos(a) * 0.92, 0.45 + Math.sin(a) * 0.92] as Pt;
  });
  switch (icon) {
    case 0: return [[0, -0.95], [0.85, 0.8], [-0.85, 0.8]]; // fire: triangle
    case 1: return [[0.2, -0.95], [-0.6, 0.1], [-0.05, 0.1], [-0.25, 0.95], [0.6, -0.15], [0.05, -0.15]]; // volt: zigzag bolt
    case 2: return regular(6, 0.92, Math.PI / 6); // frost: hexagon
    case 3: return [[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8]]; // earth: square
    case 4: return [[0.62, -0.92], [0.92, -0.62], [-0.62, 0.92], [-0.92, 0.62]]; // blade: diagonal bar
    case 5: return [[-0.28, -0.9], [0.28, -0.9], [0.28, -0.28], [0.9, -0.28], [0.9, 0.28], [0.28, 0.28], [0.28, 0.9], [-0.28, 0.9], [-0.28, 0.28], [-0.9, 0.28], [-0.9, -0.28], [-0.28, -0.28]]; // heal: plus
    case 6: return halfDisc; // shield: half disc
    default: return star(5, 0.42); // lucky: star
  }
}

/** Animation timing, copied from TUNING when a match starts so mid-match slider changes wait for the next match. */
interface MatchTiming {
  /** Normal-speed timings; each turn uses a copy scaled by its captured time scale. */
  base: TurnTiming;
  reelSpeed: number;
  fastFactor: number;
}

/** One shot of the last turn, as reported in getState().lastCasts. Times are ms from entering resolving. */
export interface CastState {
  chainIndex: number;
  kind: Kind;
  target: Side;
  from: [number, number];
  to: [number, number];
  value: number;
  launchMs: number;
  impactMs: number;
  launchedAtMs: number | null;
  impactedAtMs: number | null;
}

/** One column: five sprites so the strip has no gap while it scrolls; the top one shows only while spinning. */
interface ReelView {
  sprites: Phaser.GameObjects.Image[];
  icons: number[];
  /** Scroll offset in [0, CELL_PITCH). */
  offset: number;
  stopped: boolean;
  stoppedAt: number;
}

/** The turn being played back: the logic result is already final, this only times its display. */
interface TurnPlayback {
  side: Side;
  result: BattleSpin;
  startedAt: number;
  resolveStartAt: number;
}

interface FighterView {
  body: Phaser.GameObjects.Graphics;
  ring: Phaser.GameObjects.Graphics;
  hud: Phaser.GameObjects.Graphics;
  hpText: Phaser.GameObjects.Text;
  shieldText: Phaser.GameObjects.Text;
}

/** A VFX being played: its log entry, its sprites (two for a sheet with a light pass) and its planned end. */
interface ActiveVfx { entry: VfxLogEntry; sprites: Phaser.GameObjects.Sprite[]; endsAt: number; cast: CastState | null }

/** Depths: chain flashes sit on the reels; shots, hits and blocks fly above the fighters, under the floats. */
const VFX_DEPTH: Record<VfxKind, number> = { flash: 3.5, proj: 7, hit: 7.1, block: 7.2 };
/** Shots whose art points along the flight: fire and frost turn to atan2(dy, dx); the others keep their own spin. */
const ROTATING_PROJ = new Set<SfVfxKey>(['sf_proj_fire', 'sf_proj_frost']);

interface FloatView { side: Side; lane: 0 | 1; label: Phaser.GameObjects.Text }

/** A canvas text that layout.texts reports, with the colour of what is behind it. */
interface HudText { id: string; text: Phaser.GameObjects.Text; bg: () => string }

export class SlotFiveScene extends Phaser.Scene {
  private seed = 0;
  private matchIndex = 0;
  private battle!: SlotFiveBattle;
  private grid: Grid = [];
  private phase: SlotFivePhase = 'idle';
  private lastSide: Side | null = null;
  private lastChains: Chain[] = [];
  private lastEffects: SlotFiveLastEffects = zeroEffects();
  private rejectedSpins = 0;
  private lastReject: SlotFiveReject | null = null;
  /** Scene time at which the foe spins, while phase is foeWait. */
  private foeSpinAt = 0;
  private timing!: MatchTiming;

  private playback: TurnPlayback | null = null;
  private reelsStopped = SF_COLS;
  private lastReelStopMs: number[] = [];
  private highlighted: Chain[] = [];
  private displayHp: Record<Side, number> = { player: 0, foe: 0 };
  private displayShield: Record<Side, number> = { player: 0, foe: 0 };
  private legendOpen = false;
  private lastResolveMs = 0;
  /** Not reset by create(): it lasts for the page session, across matches and restarts. */
  private fastMode = false;
  private lastTimeScale = 1;
  private lastFoeDelayMs = 0;
  /** Timings of the current or latest turn, already scaled by lastTimeScale. */
  private turnTiming!: TurnTiming;
  private fastButton: HTMLElement | null = null;
  private vfxLog: VfxLogEntry[] = [];
  private activeVfx: ActiveVfx[] = [];
  /** Hit VFX played in this match, mirrored to data-sf-vfx-hits. */
  private matchVfxHits = 0;
  /** Last values written to the #game data flags, so the DOM is touched only on change. */
  private domFlags: Record<string, string> = {};
  private lastCasts: CastState[] = [];
  private castGraphics!: Phaser.GameObjects.Graphics;
  /** Next lane per side for floats, so back-to-back impacts on one side alternate lanes. */
  private floatLane: Record<Side, 0 | 1> = { player: 0, foe: 0 };

  private reels: ReelView[] = [];
  private highlightGraphics!: Phaser.GameObjects.Graphics;
  private fighters = new Map<Side, FighterView>();
  private floats = new Set<FloatView>();
  private hudTexts: HudText[] = [];
  private bannerText!: Phaser.GameObjects.Text;
  private bannerColor = COLORS.yellow;
  private legend!: Phaser.GameObjects.Container;
  private legendHeader!: Phaser.GameObjects.Text;
  private legendTexts: Phaser.GameObjects.Text[] = [];
  private legendImages: Phaser.GameObjects.Image[] = [];
  private legendIcons: number[] = [];

  /** One AbortController owns every DOM listener, so a restart can never leave a second copy bound. */
  private inputBindings: AbortController | null = null;
  private spinButton: HTMLElement | null = null;
  private newButton: HTMLElement | null = null;
  private helpButton: HTMLElement | null = null;
  private helpCloseButton: HTMLElement | null = null;
  private buttonRect = { left: NaN, top: NaN, width: NaN };

  constructor() {
    // Shares the key with the other games: only one of them is registered per page load.
    super('game');
  }

  create(): void {
    // scene.restart() destroyed the old display objects, so nothing may still point at them.
    this.reels = [];
    this.fighters = new Map();
    this.floats = new Set();
    this.hudTexts = [];
    this.legendTexts = [];
    this.legendImages = [];
    this.playback = null;
    this.legendOpen = false;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.releaseInput());
    this.events.off(Phaser.Scenes.Events.DESTROY, this.releaseInput, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.releaseInput, this);

    this.createIconTextures();
    this.drawFrame();
    this.createReels();
    this.drawReelCovers();
    this.highlightGraphics = this.add.graphics().setDepth(3);
    // Shots fly above the reels, fighters and panel, below the floats and the legend.
    this.castGraphics = this.add.graphics().setDepth(7);
    this.drawPanel();
    this.createBanner();
    for (const side of SIDES) this.createFighter(side);
    this.createLegend();

    // Match k of the session uses seed sfSeed + k. TUNING is snapshotted when the match starts.
    this.matchIndex = 0;
    this.activeVfx = [];
    this.domFlags = {};
    this.startMatch(TUNING.sfSeed + this.matchIndex);
    this.bindInput();
    this.syncButtons();
    // Loads in the background, once per page; the match never waits for it.
    void loadSlotFiveVfx(this.game);
    this.syncDomFlags();
  }

  update(_time: number, delta: number): void {
    const now = this.time.now;
    if (this.phase === 'foeWait' && now >= this.foeSpinAt) this.startTurn(this.battle.spin());
    this.advancePlayback(now, delta);
    this.drawHud();
    this.syncButtons();
    this.syncDomFlags();
  }

  getState(): SlotFiveState {
    const battle = this.battle.getState();
    return {
      gameId: 'slot-five',
      seed: this.seed,
      matchIndex: this.matchIndex,
      cols: SF_COLS,
      rows: SF_ROWS,
      iconCount: SF_ICON_COUNT,
      luckyIcon: SF_LUCKY_ICON,
      grid: this.grid.map((row) => [...row]),
      ...battle,
      displayHp: { player: this.displayHp.player, foe: this.displayHp.foe },
      displayShield: { player: this.displayShield.player, foe: this.displayShield.foe },
      lastSide: this.lastSide,
      lastChains: this.lastChains.map((c) => ({ ...c, cells: c.cells.map(([x, y]) => [x, y] as [number, number]) })),
      lastEffects: { ...this.lastEffects },
      phase: this.phase,
      rejectedSpins: this.rejectedSpins,
      lastReject: this.lastReject,
      reelsStopped: this.reelsStopped,
      lastSpinMs: spinMsFor(this.turnTiming),
      lastReelStopMs: [...this.lastReelStopMs],
      highlightedChainCount: this.highlighted.length,
      highlightedCells: new Set(this.highlighted.flatMap((c) => c.cells.map(([x, y]) => y * SF_COLS + x))).size,
      viewCounts: {
        icons: this.reels.reduce((n, reel) => n + reel.sprites.filter((s) => s.visible).length, 0),
        fighters: this.fighters.size,
      },
      legendOpen: this.legendOpen,
      floatTexts: [...this.floats].map(({ side, label }) => ({ side, text: label.text, box: this.boundsOf(label) })),
      layout: this.readLayout(),
      lastResolveMs: this.lastResolveMs,
      lastCasts: this.lastCasts.map((c) => ({ ...c, from: [...c.from] as [number, number], to: [...c.to] as [number, number] })),
      castsInFlight: this.lastCasts.filter((c) => c.launchedAtMs !== null && c.impactedAtMs === null).length,
      fastMode: this.fastMode,
      lastTimeScale: this.lastTimeScale,
      lastFoeDelayMs: this.lastFoeDelayMs,
      vfxLoaded: loadedSlotFiveVfxKeys(),
      vfxPlaying: this.countVfxSprites(),
      element: this.battle.element,
      activeIcons: [...this.battle.activeIcons],
      legendIcons: [...this.legendIcons],
      vfxLog: this.vfxLog.map((e) => ({
        ...e, cell: e.cell ? [...e.cell] as [number, number] : null, pos: [...e.pos] as [number, number], box: [...e.box] as Box,
      })),
    };
  }

  /** The debug API's shared `teleport` has no meaning on a slot grid. */
  teleport(_x: number, _y: number): void {}

  /** The next spin of this match uses `grid`; the spin still draws and discards its 20 RNG numbers. */
  forceNextGrid(grid: Grid): void {
    this.battle.forceNextGrid(grid);
  }

  /** Player spin, like pressing spin. Accepted only on the player's turn, in idle, while playing. */
  spin(): boolean {
    const reject = this.readReject();
    if (reject) {
      this.rejectedSpins += 1;
      this.lastReject = reject;
      return false;
    }
    this.startTurn(this.battle.spin());
    return true;
  }

  /**
   * New match (R, #sf-new, or Enter once the match is over): match k of the session uses seed sfSeed + k.
   * Allowed any time except while the reels spin. Returns false when refused.
   */
  newMatch(): boolean {
    if (this.phase === 'spinning') return false;
    this.matchIndex += 1;
    this.startMatch(TUNING.sfSeed + this.matchIndex);
    return true;
  }

  /** Loads a match into the running scene. Keeps matchIndex; TUNING is snapshotted now. */
  loadMatch(seed: number, setup?: BattleSetup): void {
    this.startMatch(seed, setup);
  }

  /**
   * Fast mode switch (F or #sf-fast). Allowed in any phase and never counts as a spin. A change applies from the
   * next turn: each turn captures its time scale when it starts (brief 4.11).
   */
  setFastMode(on: boolean): void {
    this.fastMode = on;
    this.fastButton?.classList.toggle('on', on);
    this.fastButton?.setAttribute('aria-pressed', String(on));
  }

  /** The legend blocks nothing; it only covers the reels while open. */
  setLegendOpen(open: boolean): void {
    this.legendOpen = open;
    this.legend.setVisible(open);
    this.helpButton?.classList.toggle('open', open);
    this.helpButton?.setAttribute('aria-expanded', String(open));
    this.helpCloseButton?.classList.toggle('show', open);
  }

  /** While a turn plays back, its own side is busy and the other side is waiting. Logic state is already final. */
  private readReject(): SlotFiveReject | null {
    if (this.phase === 'spinning' || this.phase === 'resolving') {
      return this.playback?.side === 'player' ? 'busy' : 'notYourTurn';
    }
    if (this.battle.getState().status !== 'playing') return 'ended';
    if (this.battle.getState().turn !== 'player' || this.phase === 'foeWait') return 'notYourTurn';
    if (this.phase !== 'idle') return 'busy';
    return null;
  }

  private startMatch(seed: number, setup?: BattleSetup): void {
    // Build first so a bad setup throws before the running match is touched.
    const battle = createSlotFiveBattle(seed, TUNING, setup);
    this.battle = battle;
    this.seed = seed;
    this.timing = { base: readTurnTiming(TUNING), reelSpeed: TUNING.sfReelSpeed, fastFactor: TUNING.sfFastFactor };
    // Until the first turn starts, the reported timings are the normal ones.
    this.lastTimeScale = 1;
    this.turnTiming = this.timing.base;
    this.lastFoeDelayMs = 0;
    this.lastResolveMs = 0;
    this.lastCasts = [];
    this.castGraphics.clear();
    this.grid = battle.getGrid();
    this.lastSide = null;
    this.lastChains = [];
    this.lastEffects = zeroEffects();
    this.rejectedSpins = 0;
    this.lastReject = null;
    this.playback = null;
    this.reelsStopped = SF_COLS;
    this.lastReelStopMs = [];
    this.highlighted = [];
    this.clearFloats();
    this.clearVfx(null);
    this.vfxLog = [];
    this.matchVfxHits = 0;
    const { player, foe } = battle.getState();
    this.displayHp = { player: player.hp, foe: foe.hp };
    this.displayShield = { player: player.shield, foe: foe.shield };
    for (let x = 0; x < SF_COLS; x++) this.settleReel(x);
    this.updateLegend();
    // The legend starts closed in every match (brief 3).
    this.setLegendOpen(false);
    this.enterTurnPhase();
    this.drawHighlights();
    this.drawHud();
  }

  /** The logic turn is already resolved; from here on only its display is timed. */
  private startTurn(result: BattleSpin): void {
    if (!result.accepted) return;
    const now = this.time.now;
    // A spin of either side closes the legend so it never hides the turn.
    this.setLegendOpen(false);
    this.grid = result.grid;
    this.lastSide = result.side;
    this.lastChains = result.chains;
    this.lastEffects = { ...result.effects, absorbed: result.absorbed, hpLoss: result.hpLoss, healed: result.healed };
    // The spinner's old shield expires as its turn starts (brief 4.5 step 2).
    this.displayShield[result.side] = 0;
    if (result.side === 'player') this.captureTurnScale();
    this.playback = { side: result.side, result, startedAt: now, resolveStartAt: Infinity };
    this.lastResolveMs = resolveMsFor(result.chains, this.turnTiming);
    this.lastCasts = this.planCasts(result.side, result.chains);
    this.castGraphics.clear();
    this.clearVfx(null);
    this.vfxLog = [];
    this.phase = 'spinning';
    this.reelsStopped = 0;
    this.lastReelStopMs = [];
    this.highlighted = [];
    this.drawHighlights();
    for (const reel of this.reels) {
      reel.stopped = false;
      reel.sprites[0].setVisible(true);
    }
  }

  private advancePlayback(now: number, delta: number): void {
    const pb = this.playback;
    if (!pb) {
      this.bounceReels(now);
      return;
    }
    if (this.phase === 'spinning') {
      const elapsed = now - pb.startedAt;
      for (let x = 0; x < SF_COLS; x++) {
        const reel = this.reels[x];
        if (reel.stopped) continue;
        if (elapsed >= this.turnTiming.spinBaseMs + x * this.turnTiming.reelStopGapMs) {
          this.settleReel(x);
          reel.stoppedAt = now;
          this.reelsStopped += 1;
          this.lastReelStopMs[x] = elapsed;
        } else {
          this.scrollReel(reel, delta);
        }
      }
      if (this.reelsStopped === SF_COLS) {
        this.phase = 'resolving';
        pb.resolveStartAt = now;
        this.highlighted = pb.result.chains;
        this.drawHighlights();
        this.spawnChainFlashes();
      }
    }
    this.bounceReels(now);
    if (this.phase === 'resolving') this.advanceResolve(pb, now);
  }

  /**
   * Casts fly on their schedule (brief 4.10). The hp bars and shields on screen change only when a shot lands,
   * each by exactly its own chain's part, so after the last shot they equal the logic values.
   */
  private advanceResolve(pb: TurnPlayback, now: number): void {
    const elapsed = now - pb.resolveStartAt;
    this.castGraphics.clear();
    this.lastCasts.forEach((cast, castIndex) => {
      if (cast.launchedAtMs === null && elapsed >= cast.launchMs) {
        cast.launchedAtMs = elapsed;
        this.spawnProjectile(cast, castIndex, elapsed);
      }
      if (cast.launchedAtMs !== null && cast.impactedAtMs === null && elapsed >= cast.impactMs) {
        cast.impactedAtMs = elapsed;
        // The shot is removed exactly when its impact starts.
        for (const vfx of this.activeVfx.filter((v) => v.entry.kind === 'proj' && v.entry.castIndex === castIndex)) {
          this.endVfx(vfx, elapsed);
        }
        const absorbed = this.applyCast(cast);
        this.spawnImpact(cast, castIndex, absorbed, elapsed);
      }
      // Fallback dot only when the shot flipbook could not be loaded.
      const hasProj = this.activeVfx.some((v) => v.entry.kind === 'proj' && v.entry.castIndex === castIndex);
      if (cast.launchedAtMs !== null && cast.impactedAtMs === null && !hasProj) this.drawCast(cast, elapsed);
    });
    this.updateVfx(elapsed);
    if (elapsed >= this.lastResolveMs) {
      this.castGraphics.clear();
      this.clearVfx(elapsed);
      // Safety net only: with every shot applied the display already equals the logic.
      const final = this.battle.getState();
      for (const s of SIDES) {
        this.displayHp[s] = final[s].hp;
        this.displayShield[s] = final[s].shield;
      }
      this.playback = null;
      this.enterTurnPhase();
    }
  }

  /** One shot lands: only its target's fields change, by this chain's share (brief 4.10). Returns the shield absorbed. */
  private applyCast(cast: CastState): number {
    const t = cast.target;
    if (cast.kind === 'heal') {
      const maxHp = this.battle.getState()[t].maxHp;
      const healed = Math.min(cast.value, maxHp - this.displayHp[t]);
      this.displayHp[t] += healed;
      this.floatText(t, `+${healed}`, COLORS.green);
    } else if (cast.kind === 'shield') {
      this.displayShield[t] += cast.value;
      this.floatText(t, `+${cast.value} khiên`, COLORS.blue);
    } else if (cast.kind === 'damage') {
      const absorbed = Math.min(this.displayShield[t], cast.value);
      this.displayShield[t] -= absorbed;
      const hpLoss = Math.min(this.displayHp[t], cast.value - absorbed);
      this.displayHp[t] -= hpLoss;
      this.floatText(t, `-${hpLoss}`, COLORS.red);
      if (absorbed > 0) this.floatText(t, `chặn ${absorbed}`, COLORS.blue);
      return absorbed;
    }
    return 0;
  }

  // --- VFX (brief 4.12): display only, never touches timing, logic or state --------------------

  /**
   * Starts a flipbook at (x, y). Its frame rate is fps / lastTimeScale, so in fast mode it is shorter by the same
   * factor. A key that is not loaded is skipped and leaves no log entry.
   */
  private spawnVfx(key: SfVfxKey, kind: VfxKind, x: number, y: number, elapsed: number,
    extra: { castIndex?: number; cell?: [number, number]; tint?: number; rotation?: number; cast?: CastState } = {}): ActiveVfx | null {
    const vfx = getSlotFiveVfx(key);
    if (!vfx) return null;
    const { meta } = vfx;
    const scale = this.lastTimeScale;
    const sprites = vfx.layers.map((layer) => {
      const sprite = this.add.sprite(x, y, layer.texture, 0)
        .setOrigin(meta.pivot[0], meta.pivot[1])
        .setBlendMode(layer.blend)
        .setDepth(VFX_DEPTH[kind])
        .setRotation(extra.rotation ?? 0);
      if (extra.tint !== undefined) sprite.setTint(extra.tint);
      sprite.play({ key: layer.anim, frameRate: meta.fps / scale, repeat: meta.loop ? -1 : 0 });
      return sprite;
    });
    const entry: VfxLogEntry = {
      key, kind, castIndex: extra.castIndex ?? null, cell: extra.cell ?? null, pos: [x, y],
      box: this.boxOf(sprites[0]), startedAtMs: elapsed, endedAtMs: null, timeScale: scale,
    };
    this.vfxLog.push(entry);
    const active: ActiveVfx = {
      entry, sprites, cast: extra.cast ?? null,
      // A loop runs until its impact; a one-shot ends after its own frames.
      endsAt: meta.loop ? Infinity : elapsed + (meta.frames / meta.fps) * 1000 * scale,
    };
    this.activeVfx.push(active);
    return active;
  }

  /** Every distinct cell of the turn's chains flashes once, tinted by its icon, lucky chains included. */
  private spawnChainFlashes(): void {
    const seen = new Set<number>();
    for (const chain of this.highlighted) {
      for (const [x, y] of chain.cells) {
        if (seen.has(y * SF_COLS + x)) continue;
        seen.add(y * SF_COLS + x);
        const [cx, cy] = this.cellCenter(x, y);
        this.spawnVfx('sf_chain_flash', 'flash', cx, cy, 0, { cell: [x, y], tint: ICON_COLORS[this.grid[y][x]] });
      }
    }
  }

  private spawnProjectile(cast: CastState, castIndex: number, elapsed: number): void {
    const iconKey = SF_ICON_KEYS[this.lastChains[cast.chainIndex].icon];
    const key = `sf_proj_${iconKey}` as SfVfxKey;
    const rotation = ROTATING_PROJ.has(key) ? Math.atan2(cast.to[1] - cast.from[1], cast.to[0] - cast.from[0]) : 0;
    this.spawnVfx(key, 'proj', cast.from[0], cast.from[1], elapsed, { castIndex, rotation, cast });
  }

  /** Exactly one hit per shot at the target fighter; a block on top when the shown shield absorbed some damage. */
  private spawnImpact(cast: CastState, castIndex: number, absorbed: number, elapsed: number): void {
    const iconKey = SF_ICON_KEYS[this.lastChains[cast.chainIndex].icon];
    const [x, y] = cast.to;
    if (this.spawnVfx(`sf_hit_${iconKey}` as SfVfxKey, 'hit', x, y, elapsed, { castIndex })) this.matchVfxHits += 1;
    if (cast.kind === 'damage' && absorbed > 0) this.spawnVfx('sf_block', 'block', x, y, elapsed, { castIndex });
  }

  /** Moves shots along their straight path, grows the logged boxes and ends one-shots on their planned time. */
  private updateVfx(elapsed: number): void {
    for (const vfx of [...this.activeVfx]) {
      const cast = vfx.cast;
      if (vfx.entry.kind === 'proj' && cast) {
        const span = cast.impactMs - cast.launchMs;
        const t = span > 0 ? Math.max(0, Math.min(1, (elapsed - cast.launchMs) / span)) : 1;
        const x = cast.from[0] + (cast.to[0] - cast.from[0]) * t;
        const y = cast.from[1] + (cast.to[1] - cast.from[1]) * t;
        for (const sprite of vfx.sprites) sprite.setPosition(x, y);
      }
      const box = this.boxOf(vfx.sprites[0]);
      if (box[2] * box[3] > vfx.entry.box[2] * vfx.entry.box[3]) vfx.entry.box = box;
      if (elapsed >= vfx.endsAt) this.endVfx(vfx, elapsed);
    }
  }

  private endVfx(vfx: ActiveVfx, elapsed: number | null): void {
    for (const sprite of vfx.sprites) sprite.destroy();
    if (vfx.entry.endedAtMs === null && elapsed !== null) vfx.entry.endedAtMs = elapsed;
    this.activeVfx = this.activeVfx.filter((v) => v !== vfx);
  }

  /** Ends everything still playing; with a time it is recorded as their end, without one (new turn or match) it is not. */
  private clearVfx(elapsed: number | null): void {
    for (const vfx of [...this.activeVfx]) this.endVfx(vfx, elapsed);
  }

  private countVfxSprites(): number {
    return this.activeVfx.reduce((n, vfx) => n + vfx.sprites.filter((s) => s.active && s.visible).length, 0);
  }

  private boxOf(sprite: Phaser.GameObjects.Sprite): Box {
    const b = sprite.getBounds();
    return [Math.round(b.x * 10) / 10, Math.round(b.y * 10) / 10, Math.round(b.width * 10) / 10, Math.round(b.height * 10) / 10];
  }

  private cellCenter(x: number, y: number): [number, number] {
    return [GRID_X + x * CELL_PITCH + CELL_PX / 2, GRID_Y + y * CELL_PITCH + CELL_PX / 2];
  }

  /**
   * Read-only data flags on #game (brief C12.14) for tests of the release build, which has no window.__game.
   * They only mirror state and control nothing.
   */
  private syncDomFlags(): void {
    const el = document.getElementById('game');
    if (!el) return;
    const flags: Record<string, string> = {
      'data-sf-ready': 'true',
      'data-vfx-loaded': String(SF_VFX_KEYS.every((key) => getSlotFiveVfx(key) !== undefined)),
      'data-sf-spin-index': String(this.battle.getState().spinIndex),
      'data-sf-phase': this.phase,
      'data-sf-last-casts': String(this.lastCasts.length),
      'data-sf-vfx-hits': String(this.matchVfxHits),
    };
    for (const [name, value] of Object.entries(flags)) {
      if (this.domFlags[name] === value) continue;
      this.domFlags[name] = value;
      el.setAttribute(name, value);
    }
  }

  /** Straight line at constant speed from the chain centre to the fighter centre. */
  private drawCast(cast: CastState, elapsed: number): void {
    const span = cast.impactMs - cast.launchMs;
    const t = span > 0 ? Math.max(0, Math.min(1, (elapsed - cast.launchMs) / span)) : 1;
    const x = cast.from[0] + (cast.to[0] - cast.from[0]) * t;
    const y = cast.from[1] + (cast.to[1] - cast.from[1]) * t;
    const icon = this.lastChains[cast.chainIndex].icon;
    this.castGraphics.fillStyle(ICON_COLORS[icon], 1).fillCircle(x, y, CAST_RADIUS);
    this.castGraphics.lineStyle(3, 0xffffff, 1).strokeCircle(x, y, CAST_RADIUS);
  }

  /** Shots of a turn in firing order, with their planned times. */
  private planCasts(side: Side, chains: readonly Chain[]): CastState[] {
    const other: Side = side === 'player' ? 'foe' : 'player';
    return castOrder(chains).map((chainIndex, k) => {
      const chain = chains[chainIndex];
      const target = chain.kind === 'damage' ? other : side;
      const [fx, fy, fw, fh] = target === 'player' ? BOXES.playerFighter : BOXES.foeFighter;
      const centres = chain.cells.map(([x, y]) => [GRID_X + x * CELL_PITCH + CELL_PX / 2, GRID_Y + y * CELL_PITCH + CELL_PX / 2]);
      const from: [number, number] = [
        centres.reduce((s, c) => s + c[0], 0) / centres.length,
        centres.reduce((s, c) => s + c[1], 0) / centres.length,
      ];
      const launchMs = this.turnTiming.castDelayMs + k * this.turnTiming.castStaggerMs;
      return {
        chainIndex, kind: chain.kind, target, from, to: [fx + fw / 2, fy + fh / 2], value: chain.value,
        launchMs, impactMs: launchMs + this.turnTiming.castFlightMs, launchedAtMs: null, impactedAtMs: null,
      };
    });
  }

  /** Freezes the time scale of the turn that starts now (brief 4.11). */
  private captureTurnScale(): void {
    this.lastTimeScale = this.fastMode ? this.timing.fastFactor : 1;
    this.turnTiming = scaleTurnTiming(this.timing.base, this.lastTimeScale);
  }

  /** Phase that follows from the battle state: ended, waiting for the foe, or waiting for the player. */
  private enterTurnPhase(): void {
    const { status, turn } = this.battle.getState();
    if (status !== 'playing') this.phase = 'ended';
    else if (turn === 'foe') {
      this.phase = 'foeWait';
      // The foe's turn starts here: its scale covers foeWait, spinning and resolving.
      this.captureTurnScale();
      this.lastFoeDelayMs = this.turnTiming.foeDelayMs;
      this.foeSpinAt = this.time.now + this.lastFoeDelayMs;
    } else this.phase = 'idle';
  }

  // --- Layout state -----------------------------------------------------------------------

  private readLayout(): SlotFiveLayout {
    const rect = this.game.canvas.getBoundingClientRect();
    const boxes: Record<string, Box> = {};
    for (const [key, box] of Object.entries(BOXES)) boxes[key] = [...box] as Box;
    if (this.legendOpen) boxes.legend = [...LEGEND_BOX] as Box;
    const lowestFighterTop = Math.min(BOXES.playerFighter[1], BOXES.foeFighter[1]);
    const texts = this.hudTexts
      .filter(({ text }) => text.active && text.visible && text.text !== '' && this.isShown(text))
      .map(({ id, text, bg }) => ({ id, fontPx: Number.parseFloat(String(text.style.fontSize)), color: String(text.style.color), bg: bg() }));
    if (this.fastButton) {
      const c = this.fastMode ? FAST_BUTTON_COLORS.on : FAST_BUTTON_COLORS.off;
      texts.push({ id: 'fastBtn', fontPx: BUTTON_FONT_PX.fast, color: c.color, bg: c.bg });
    }
    for (const { side, label } of this.floats) {
      texts.push({ id: `float-${side}`, fontPx: FLOAT_FONT_PX, color: String(label.style.color), bg: COLORS.page });
    }
    return {
      width: VIEW_W,
      height: VIEW_H,
      scale: rect.width / VIEW_W,
      canvasOffset: [rect.left, rect.top],
      boxes,
      castGap: { top: FRAME_BOTTOM, bottom: lowestFighterTop },
      texts,
    };
  }

  /** A text inside the legend counts only while the legend is open. */
  private isShown(text: Phaser.GameObjects.Text): boolean {
    return text.parentContainer ? text.parentContainer.visible : true;
  }

  private boundsOf(label: Phaser.GameObjects.Text): Box {
    const b = label.getBounds();
    return [b.x, b.y, b.width, b.height];
  }

  private registerText(id: string, text: Phaser.GameObjects.Text, bg: () => string): void {
    this.hudTexts.push({ id, text, bg });
  }

  // --- Reels ------------------------------------------------------------------------------

  private createReels(): void {
    for (let x = 0; x < SF_COLS; x++) {
      const cx = GRID_X + x * CELL_PITCH + CELL_PX / 2;
      const sprites = Array.from({ length: SF_ROWS + 1 }, () => this.add.image(cx, 0, `${ICON_TEXTURE_PREFIX}0`).setDepth(1));
      this.reels.push({ sprites, icons: new Array<number>(SF_ROWS + 1).fill(0), offset: 0, stopped: true, stoppedAt: -Infinity });
    }
  }

  /** Decorative strip only: it uses Math.random, never the logic RNG. */
  private scrollReel(reel: ReelView, delta: number): void {
    reel.offset += (this.timing.reelSpeed / this.lastTimeScale) * delta;
    while (reel.offset >= CELL_PITCH) {
      reel.offset -= CELL_PITCH;
      reel.icons.pop();
      reel.icons.unshift(Math.floor(Math.random() * SF_ICON_COUNT));
    }
    this.placeReel(reel, 0);
  }

  /** Shows the final column of `grid` and hides the spare sprite above the grid. */
  private settleReel(x: number): void {
    const reel = this.reels[x];
    reel.stopped = true;
    reel.offset = 0;
    reel.icons = [reel.icons[0], ...this.grid.map((row) => row[x])];
    reel.sprites[0].setVisible(false);
    this.placeReel(reel, 0);
  }

  private placeReel(reel: ReelView, bouncePx: number): void {
    reel.sprites.forEach((sprite, k) => {
      sprite.setTexture(`${ICON_TEXTURE_PREFIX}${reel.icons[k]}`);
      sprite.y = GRID_Y + (k - 1) * CELL_PITCH + CELL_PX / 2 + reel.offset + bouncePx;
    });
  }

  /** A small drop and settle right after a column stops; it never delays the next stop. */
  private bounceReels(now: number): void {
    const ms = this.turnTiming.stopBounceMs;
    for (const reel of this.reels) {
      if (!reel.stopped) continue;
      const t = ms > 0 ? (now - reel.stoppedAt) / ms : 1;
      this.placeReel(reel, t >= 0 && t < 1 ? Math.sin(Math.PI * t) * BOUNCE_PX : 0);
    }
  }

  // --- Drawing ----------------------------------------------------------------------------

  private drawFrame(): void {
    const [fx, fy, fw, fh] = BOXES.reelFrame;
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(hex(COLORS.frame), 1).fillRoundedRect(fx, fy, fw, fh, 14);
    for (let y = 0; y < SF_ROWS; y++) {
      for (let x = 0; x < SF_COLS; x++) {
        g.fillStyle(hex(COLORS.cell), 1).fillRoundedRect(GRID_X + x * CELL_PITCH, GRID_Y + y * CELL_PITCH, CELL_PX, CELL_PX, 10);
      }
    }
  }

  /** Hides the parts of scrolling icons that leave the grid, above and below it. */
  private drawReelCovers(): void {
    const [fx, fy, fw] = BOXES.reelFrame;
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(hex(COLORS.page), 1).fillRect(fx, 0, fw, fy);
    g.fillStyle(hex(COLORS.frame), 1).fillRect(fx + 8, fy, fw - 16, FRAME_PAD);
    g.fillStyle(hex(COLORS.frame), 1).fillRect(fx + 8, GRID_BOTTOM, fw - 16, FRAME_BOTTOM - GRID_BOTTOM);
    g.fillStyle(hex(COLORS.page), 1).fillRect(fx, FRAME_BOTTOM, fw, CELL_PITCH + BOUNCE_PX);
  }

  /** Every chain lights up at once: a border on each of its cells and a line through it. */
  private drawHighlights(): void {
    const g = this.highlightGraphics;
    g.clear();
    const center = ([x, y]: [number, number]) => [GRID_X + x * CELL_PITCH + CELL_PX / 2, GRID_Y + y * CELL_PITCH + CELL_PX / 2];
    const cells = new Set<number>();
    for (const chain of this.highlighted) for (const [x, y] of chain.cells) cells.add(y * SF_COLS + x);
    g.lineStyle(5, HIGHLIGHT_COLOR, 1);
    for (const id of cells) {
      const x = id % SF_COLS;
      const y = Math.floor(id / SF_COLS);
      g.strokeRoundedRect(GRID_X + x * CELL_PITCH + 2, GRID_Y + y * CELL_PITCH + 2, CELL_PX - 4, CELL_PX - 4, 10);
    }
    g.lineStyle(6, HIGHLIGHT_COLOR, 0.75);
    for (const chain of this.highlighted) {
      const [x0, y0] = center(chain.cells[0]);
      const [x1, y1] = center(chain.cells[chain.cells.length - 1]);
      g.lineBetween(x0, y0, x1, y1);
    }
  }

  private drawPanel(): void {
    const [px, py, pw, ph] = BOXES.panel;
    const g = this.add.graphics().setDepth(4);
    g.fillStyle(hex(COLORS.panel), 1).fillRect(px, py, pw, ph);
    g.lineStyle(2, 0x3a4070, 1).lineBetween(px, py + 1, px + pw, py + 1);
  }

  private createBanner(): void {
    const [bx, by, bw, bh] = BOXES.turnBanner;
    this.add.graphics().setDepth(4).fillStyle(hex(COLORS.banner), 1).fillRoundedRect(bx, by, bw, bh, 12);
    this.bannerText = this.add.text(bx + bw / 2, by + bh / 2, '', {
      fontFamily: FONT, fontSize: `${BANNER_FONT_PX}px`, fontStyle: 'bold', color: COLORS.yellow, resolution: 2,
    }).setOrigin(0.5).setDepth(5);
    this.registerText('turnBanner', this.bannerText, () => COLORS.banner);
  }

  private createFighter(side: Side): void {
    const [fx, fy, fw, fh] = side === 'player' ? BOXES.playerFighter : BOXES.foeFighter;
    const ring = this.add.graphics().setDepth(4);
    // Placeholder characters: player a teal block with a round head, foe a purple spiky head on a narrow body.
    const body = this.add.graphics().setDepth(5);
    const cx = fx + fw / 2;
    const headY = fy + 30;
    if (side === 'player') {
      body.fillStyle(0x2fc6b5, 1).fillRoundedRect(fx + 10, fy + 50, fw - 20, fh - 58, 10);
      body.fillCircle(cx, headY, 22);
    } else {
      body.fillStyle(0xb04ad8, 1).fillRoundedRect(fx + 12, fy + 50, fw - 24, fh - 58, 8);
      const pts = Array.from({ length: 12 }, (_, i) => {
        const r = i % 2 === 0 ? 26 : 18;
        const a = -Math.PI / 2 + (i * Math.PI) / 6;
        return new Phaser.Math.Vector2(cx + Math.cos(a) * r, headY + Math.sin(a) * r);
      });
      body.fillPoints(pts, true);
    }
    const look = side === 'player' ? 2 : -2;
    body.fillStyle(0xffffff, 1).fillCircle(cx - 9, headY - 2, 6).fillCircle(cx + 9, headY - 2, 6);
    body.fillStyle(0x14162b, 1).fillCircle(cx - 9 + look, headY - 1, 3).fillCircle(cx + 9 + look, headY - 1, 3);

    const hud = this.add.graphics().setDepth(5);
    const [hx, hy, , hh] = side === 'player' ? BOXES.playerHud : BOXES.foeHud;
    const barX = side === 'player' ? hx : hx + SHIELD_CELL_W + 6;
    const cellX = side === 'player' ? hx + HP_BAR_W + 6 : hx;
    const hpText = this.add.text(barX + HP_BAR_W / 2, hy + hh / 2, '', {
      fontFamily: FONT, fontSize: `${HP_FONT_PX}px`, fontStyle: 'bold', color: COLORS.white, resolution: 2,
    }).setOrigin(0.5).setDepth(6);
    const shieldText = this.add.text(cellX + SHIELD_CELL_W / 2, hy + hh / 2, '', {
      fontFamily: FONT, fontSize: `${SHIELD_FONT_PX}px`, fontStyle: 'bold', color: COLORS.white, resolution: 2,
    }).setOrigin(0.5).setDepth(6);
    this.registerText(`${side}Hp`, hpText, () => this.hpFill(side));
    this.registerText(`${side}Shield`, shieldText, () => (this.displayShield[side] > 0 ? COLORS.shieldCell : COLORS.shieldCellEmpty));
    this.fighters.set(side, { body, ring, hud, hpText, shieldText });
  }

  /** Fill colour behind the hp number: the bar colour, or the empty track at 0 hp. */
  private hpFill(side: Side): string {
    const maxHp = this.battle.getState()[side].maxHp;
    const ratio = maxHp > 0 ? this.displayHp[side] / maxHp : 0;
    if (ratio <= 0) return COLORS.track;
    return ratio > 0.5 ? HP_FILL.high : ratio > 0.25 ? HP_FILL.mid : HP_FILL.low;
  }

  /** Whose turn it is on screen: the side being played back, else the side the logic waits for. */
  private activeSide(): Side | null {
    if (this.playback) return this.playback.side;
    if (this.phase === 'ended') return null;
    return this.battle.getState().turn;
  }

  private drawHud(): void {
    const state = this.battle.getState();
    const active = this.activeSide();
    for (const side of SIDES) {
      const view = this.fighters.get(side);
      if (!view) continue;
      const [fx, fy, fw, fh] = side === 'player' ? BOXES.playerFighter : BOXES.foeFighter;
      view.ring.clear();
      if (active === side) view.ring.lineStyle(4, HIGHLIGHT_COLOR, 1).strokeRoundedRect(fx + 2, fy + 2, fw - 4, fh - 4, 12);

      const [hx, hy, , hh] = side === 'player' ? BOXES.playerHud : BOXES.foeHud;
      const barX = side === 'player' ? hx : hx + SHIELD_CELL_W + 6;
      const cellX = side === 'player' ? hx + HP_BAR_W + 6 : hx;
      const maxHp = state[side].maxHp;
      const ratio = maxHp > 0 ? Math.max(0, Math.min(1, this.displayHp[side] / maxHp)) : 0;
      view.hud.clear();
      view.hud.fillStyle(hex(COLORS.track), 1).fillRoundedRect(barX, hy, HP_BAR_W, hh, 7);
      if (ratio > 0) {
        const w = Math.max(14, HP_BAR_W * ratio);
        // The foe bar drains toward the middle, mirroring the player's.
        view.hud.fillStyle(hex(this.hpFill(side)), 1).fillRoundedRect(side === 'player' ? barX : barX + HP_BAR_W - w, hy, w, hh, 7);
      }
      view.hud.lineStyle(2, 0x3a4070, 1).strokeRoundedRect(barX, hy, HP_BAR_W, hh, 7);
      const shield = this.displayShield[side];
      view.hud.fillStyle(hex(shield > 0 ? COLORS.shieldCell : COLORS.shieldCellEmpty), 1)
        .fillRoundedRect(cellX, hy, SHIELD_CELL_W, hh, 7);
      view.hpText.setText(`${this.displayHp[side]}/${maxHp}`);
      view.shieldText.setText(`${shield}`);
    }
    let message: string;
    let color = COLORS.yellow;
    if (this.phase === 'ended') {
      message = state.status === 'won' ? 'Bạn thắng!' : 'Bạn thua';
      color = state.status === 'won' ? COLORS.green : COLORS.red;
    } else message = active === 'player' ? 'Lượt của bạn' : 'Lượt đối thủ';
    this.bannerText.setText(message);
    if (color !== this.bannerColor) {
      this.bannerColor = color;
      this.bannerText.setColor(color);
    }
  }

  /**
   * A number shown inside the receiving side's *Float box. Impacts on one side alternate between two lanes, and a new
   * number replaces any still fading in its lane, so numbers never stack. It rises a few pixels and never leaves the box.
   */
  private floatText(side: Side, text: string, color: string): void {
    const lane = this.floatLane[side];
    this.floatLane[side] = lane === 0 ? 1 : 0;
    for (const old of [...this.floats]) if (old.side === side && old.lane === lane) this.removeFloat(old);
    const [bx, by, bw] = side === 'player' ? BOXES.playerFloat : BOXES.foeFloat;
    const laneTop = by + lane * FLOAT_LANE_H;
    const label = this.add.text(bx + bw / 2, laneTop + FLOAT_RISE_PX, text, {
      fontFamily: FONT, fontSize: `${FLOAT_FONT_PX}px`, fontStyle: 'bold', color, resolution: 2,
    }).setOrigin(0.5, 0).setDepth(8);
    // Long labels shrink to the box width rather than spill out of it.
    if (label.width > bw) label.setScale(bw / label.width);
    const view: FloatView = { side, lane, label };
    this.floats.add(view);
    this.tweens.add({
      targets: label,
      y: laneTop,
      alpha: { from: 1, to: 0 },
      ease: 'Cubic.easeIn',
      duration: Math.round(FLOAT_MS * this.lastTimeScale),
      onComplete: () => this.removeFloat(view),
    });
  }

  private removeFloat(view: FloatView): void {
    this.tweens.killTweensOf(view.label);
    view.label.destroy();
    this.floats.delete(view);
  }

  private clearFloats(): void {
    for (const view of [...this.floats]) this.removeFloat(view);
    this.floatLane = { player: 0, foe: 0 };
  }

  // --- Legend -----------------------------------------------------------------------------

  /** Icon legend over the reel frame, opened with "?" or H. Texts are filled per match by updateLegend(). */
  private createLegend(): void {
    const [lx, ly, lw, lh] = LEGEND_BOX;
    const bg = this.add.graphics();
    bg.fillStyle(hex(COLORS.legend), 1).fillRoundedRect(lx, ly, lw, lh, 14);
    bg.lineStyle(3, HIGHLIGHT_COLOR, 1).strokeRoundedRect(lx, ly, lw, lh, 14);
    const title = this.add.text(lx + 20, ly + 18, 'Chú giải icon', {
      fontFamily: FONT, fontSize: `${LEGEND_TITLE_PX}px`, fontStyle: 'bold', color: COLORS.white, resolution: 2,
    });
    this.legendHeader = this.add.text(lx + 20, ly + 56, '', {
      fontFamily: FONT, fontSize: `${LEGEND_HEADER_PX}px`, color: COLORS.muted, resolution: 2,
    });
    const children: Phaser.GameObjects.GameObject[] = [bg, title, this.legendHeader];
    // Row slots; updateLegend fills one per icon in use (brief v5: only the match's active icons).
    this.legendImages = [];
    const rowTop = ly + 90;
    const rowH = (lh - 90 - 12) / SF_ICON_COUNT;
    for (let slot = 0; slot < SF_ICON_COUNT; slot++) {
      const cy = rowTop + slot * rowH + rowH / 2;
      const image = this.add.image(lx + 40, cy, `${ICON_TEXTURE_PREFIX}0`).setDisplaySize(32, 32);
      const text = this.add.text(lx + 68, cy, '', {
        fontFamily: FONT, fontSize: `${LEGEND_ROW_PX}px`, color: COLORS.white, resolution: 2,
      }).setOrigin(0, 0.5);
      this.legendImages.push(image);
      this.legendTexts.push(text);
      children.push(image, text);
      this.registerText(`legend-${slot}`, text, () => COLORS.legend);
    }
    this.registerText('legendTitle', title, () => COLORS.legend);
    this.registerText('legendHeader', this.legendHeader, () => COLORS.legend);
    this.legend = this.add.container(0, 0, children).setDepth(20).setVisible(false);
  }

  /** Values from the TUNING snapshot of the match that just started, like the battle itself. */
  private updateLegend(): void {
    const config = readEffectConfig(TUNING);
    this.legendHeader.setText(`Giá trị cho chuỗi 3 ô. Chuỗi dài 4 ×${config.len4Mult}`);
    this.legendIcons = [...this.battle.activeIcons];
    this.legendTexts.forEach((text, slot) => {
      const icon = this.legendIcons[slot];
      const image = this.legendImages[slot];
      if (icon === undefined) {
        text.setText('').setVisible(false);
        image.setVisible(false);
        return;
      }
      const name = SF_ICON_NAMES[icon];
      const value = config.base[icon];
      const kind = SF_ICON_KINDS[icon];
      image.setTexture(`${ICON_TEXTURE_PREFIX}${icon}`).setDisplaySize(32, 32).setVisible(true);
      text.setVisible(true).setText(
        kind === 'damage' ? `${name}: sát thương ${value}`
          : kind === 'heal' ? `${name}: hồi ${value} máu`
            : kind === 'shield' ? `${name}: khiên chặn ${value}`
              : `${name}: chưa có tác dụng`,
      );
    });
  }

  // --- Input -------------------------------------------------------------------------------

  private bindInput(): void {
    this.releaseInput();
    const bindings = new AbortController();
    this.inputBindings = bindings;
    const { signal } = bindings;
    // Phaser calls preventDefault on a non-cancelable touchcancel, which logs a console error. Its capture flag
    // is lowered only while that one event passes, as in Gatefall.
    const touchManager = this.input.manager.touch;
    if (touchManager) {
      window.addEventListener('touchcancel', () => { touchManager.capture = false; }, { capture: true, signal });
      window.addEventListener('touchcancel', () => { touchManager.capture = true; }, { signal });
    }
    window.addEventListener('keydown', (event) => this.onKeyDown(event), { signal });
    // A focused button is clicked by Space on keyup, which would run a second action (e.g. reopen the legend).
    window.addEventListener('keyup', (event) => {
      if (event.target instanceof Element && event.target.closest(TEXT_ENTRY_SELECTOR)) return;
      if (event.code === 'Space' || event.key === ' ' || event.key === 'Enter') event.preventDefault();
    }, { signal });
    this.spinButton = document.getElementById('sf-spin');
    this.newButton = document.getElementById('sf-new');
    this.helpButton = document.getElementById('sf-help');
    this.helpCloseButton = document.getElementById('sf-help-close');
    this.fastButton = document.getElementById('sf-fast');
    if (this.spinButton) this.bindButton(this.spinButton, () => this.spin(), signal);
    if (this.newButton) this.bindButton(this.newButton, () => this.newMatch(), signal);
    if (this.helpButton) this.bindButton(this.helpButton, () => this.setLegendOpen(!this.legendOpen), signal);
    if (this.helpCloseButton) this.bindButton(this.helpCloseButton, () => this.setLegendOpen(false), signal);
    if (this.fastButton) this.bindButton(this.fastButton, () => this.setFastMode(!this.fastMode), signal);
    this.setFastMode(this.fastMode);
    this.setLegendOpen(this.legendOpen);
    this.buttonRect = { left: NaN, top: NaN, width: NaN };
  }

  private releaseInput(): void {
    this.inputBindings?.abort();
    this.inputBindings = null;
    // Leave no Slot Five button lit for a scene that no longer exists.
    this.helpCloseButton?.classList.remove('show');
  }

  private onKeyDown(event: KeyboardEvent): void {
    // Ctrl+R and similar belong to the browser.
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target instanceof Element && event.target.closest(TEXT_ENTRY_SELECTOR)) return;
    const isSpace = event.code === 'Space' || event.key === ' ';
    const isEnter = event.key === 'Enter';
    const isR = event.key.toLowerCase() === 'r';
    const isHelp = event.key.toLowerCase() === 'h' || event.key === '?';
    const isEscape = event.key === 'Escape';
    const isFast = event.key.toLowerCase() === 'f';
    if (!isSpace && !isEnter && !isR && !isHelp && !isEscape && !isFast) return;
    // Stops page scroll on Space and stops Enter or Space from also clicking a focused DOM button.
    event.preventDefault();
    // Holding a key never repeats a command: OS auto-repeat is dropped.
    if (event.repeat) return;
    if (isFast) this.setFastMode(!this.fastMode);
    else if (isHelp) this.setLegendOpen(!this.legendOpen);
    else if (isEscape) this.setLegendOpen(false);
    else if (isR) this.newMatch();
    // Enter starts a new match only once the end of the match is on screen.
    else if (isEnter && this.phase === 'ended') this.newMatch();
    else this.spin();
  }

  /**
   * Fires on a release inside the button by a pointer that went down on it, so dragging off cancels and a second
   * finger cannot fire it twice. `click` stays for keyboard and assistive activation, minus ones after a release.
   */
  private bindButton(button: HTMLElement, action: () => void, signal: AbortSignal): void {
    const presses = new Map<number, { cancelled: boolean }>();
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
      // A primary pointer means no other pointer is down, so presses whose release was lost are dropped here.
      if (event.isPrimary) presses.clear();
      presses.set(event.pointerId, { cancelled: false });
    }, { signal });
    window.addEventListener('pointermove', (event) => {
      const press = presses.get(event.pointerId);
      if (press && !press.cancelled && !isInside(event)) press.cancelled = true;
    }, { signal });
    window.addEventListener('pointerup', (event) => {
      const press = presses.get(event.pointerId);
      if (!press) return;
      presses.delete(event.pointerId);
      releasedAt = event.timeStamp;
      if (press.cancelled || !isInside(event)) return;
      // One activation per touch: fingers still resting on the button are spent, not queued.
      cancelAll();
      action();
    }, { signal });
    window.addEventListener('pointercancel', (event) => { presses.delete(event.pointerId); }, { signal });
    window.addEventListener('blur', cancelAll, { signal });
    document.addEventListener('visibilitychange', cancelAll, { signal });
    button.addEventListener('click', (event) => {
      // Keyboard activation has detail 0. A pointer's click has detail >= 1 and comes right after its release.
      if (event.detail > 0 && event.timeStamp - releasedAt < BUTTON_GHOST_CLICK_MS) return;
      action();
    }, { signal });
    button.addEventListener('contextmenu', (event) => event.preventDefault(), { signal });
  }

  /** Shows whose turn it is on the buttons and keeps every button on its box over the scaled canvas. */
  private syncButtons(): void {
    const { status, turn } = this.battle.getState();
    const canSpin = status === 'playing' && turn === 'player' && this.phase === 'idle';
    this.spinButton?.classList.toggle('dim', !canSpin);
    this.newButton?.classList.toggle('highlight', this.phase === 'ended');

    const { left, top, width } = this.game.canvas.getBoundingClientRect();
    const last = this.buttonRect;
    if (width === 0 || (left === last.left && top === last.top && width === last.width)) return;
    this.buttonRect = { left, top, width };
    const scale = width / VIEW_W;
    const place = (button: HTMLElement | null, [x, y, w, h]: readonly number[], fontPx: number) => {
      if (!button) return;
      button.style.left = `${left + x * scale}px`;
      button.style.top = `${top + y * scale}px`;
      button.style.width = `${w * scale}px`;
      button.style.height = `${h * scale}px`;
      button.style.fontSize = `${Math.max(BUTTON_MIN_FONT_PX, fontPx * scale)}px`;
    };
    place(this.spinButton, BOXES.spinBtn, BUTTON_FONT_PX.spin);
    place(this.newButton, BOXES.newBtn, BUTTON_FONT_PX.new);
    place(this.helpButton, BOXES.helpBtn, BUTTON_FONT_PX.help);
    place(this.fastButton, BOXES.fastBtn, BUTTON_FONT_PX.fast);
    place(this.helpCloseButton, HELP_CLOSE_BOX, BUTTON_FONT_PX.close);
  }

  private createIconTextures(): void {
    const half = ICON_PX / 2;
    for (let icon = 0; icon < SF_ICON_COUNT; icon++) {
      const key = `${ICON_TEXTURE_PREFIX}${icon}`;
      if (this.textures.exists(key)) continue;
      const g = this.make.graphics({}, false);
      const r = half - 3;
      const pts = iconShape(icon).map(([px, py]) => new Phaser.Math.Vector2(half + px * r, half + py * r));
      g.fillStyle(ICON_COLORS[icon], 1).lineStyle(3, 0x0b0d1c, 0.9);
      g.fillPoints(pts, true).strokePoints(pts, true);
      g.generateTexture(key, ICON_PX, ICON_PX);
      g.destroy();
    }
  }
}
