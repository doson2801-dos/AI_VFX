/**
 * Slot Five pure logic: seeded RNG, grid generation (C1), chains (C2), battle (C3) and balance sim (C4).
 * No Phaser, no DOM. The scene only calls into this module and plays results back.
 */
import { SLOT_FIVE_SIM, type TUNING } from '../config';

export type SlotFiveTuning = typeof TUNING;

/** Fixed by the brief, not tunable. */
export const SF_COLS = 4;
export const SF_ROWS = 4;
export const SF_ICON_KEYS = ['fire', 'volt', 'frost', 'earth', 'blade', 'heal', 'shield', 'lucky'] as const;
export const SF_ICON_NAMES = ['Lửa', 'Điện', 'Băng', 'Đất', 'Kiếm', 'Hồi máu', 'Khiên', 'May mắn'] as const;
export const SF_ICON_COUNT = SF_ICON_KEYS.length;
export const SF_LUCKY_ICON = 7;

/** RNG stream ids. */
export const SF_STREAM_INIT = 0;
export const SF_STREAM_SPIN = 1;

/** Suffix of each icon's `sfW<Name>` tuning key, by icon index. */
const TUNING_NAMES = ['Fire', 'Volt', 'Frost', 'Earth', 'Blade', 'Heal', 'Shield', 'Lucky'] as const;

/** grid[y][x] is an icon index. */
export type Grid = number[][];

export interface SlotFiveGridConfig {
  weights: number[];
  totalWeight: number;
}

export interface GridSpin { spinIndex: number; grid: Grid }

export interface GridSim {
  spin(): GridSpin;
}

export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** floor(next() * n). */
  int(n: number): number;
}

/** mulberry32 with a uint32 state. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, int: (n) => Math.floor(next() * n) };
}

/** Seed of stream k: (seed + imul(k + 1, 0x9E3779B9)) >>> 0. */
export function streamSeed(seed: number, stream: number): number {
  return (seed + Math.imul(stream + 1, 0x9e3779b9)) >>> 0;
}

/** Snapshot of the weights one match or sim uses. Non-integers round down, negatives clamp to 0. */
export function readGridConfig(tuning: SlotFiveTuning): SlotFiveGridConfig {
  const t = tuning as unknown as Record<string, number>;
  const weights = TUNING_NAMES.map((name) => Math.max(0, Math.floor(t[`sfW${name}`])));
  return { weights, totalWeight: weights.reduce((a, b) => a + b, 0) };
}

/** Draws one icon: r = int(total), first icon whose running weight sum exceeds r. */
function drawIcon(rng: Rng, weights: number[], totalWeight: number): number {
  const r = rng.int(totalWeight);
  let sum = 0;
  for (let icon = 0; icon < weights.length; icon++) {
    sum += weights[icon];
    if (sum > r) return icon;
  }
  throw new Error('Slot Five: icon draw fell through the weight table');
}

/** Draws all 20 cells column-first (x 0..4, then y 0..3 in each column). Always consumes exactly 20 numbers. */
export function drawGrid(rng: Rng, config: SlotFiveGridConfig): Grid {
  if (config.totalWeight <= 0) throw new Error('Slot Five: total icon weight must be positive');
  const grid: Grid = Array.from({ length: SF_ROWS }, () => new Array<number>(SF_COLS).fill(0));
  for (let x = 0; x < SF_COLS; x++) {
    for (let y = 0; y < SF_ROWS; y++) grid[y][x] = drawIcon(rng, config.weights, config.totalWeight);
  }
  return grid;
}

/** The grid shown when a match opens, drawn from the `init` stream. Not a spin. */
export function initialGrid(seed: number, config: SlotFiveGridConfig): Grid {
  return drawGrid(createRng(streamSeed(seed, SF_STREAM_INIT)), config);
}

/** Throws unless `grid` is 4 rows x 5 columns of integer icons in [0, 8). Returns a copy. */
export function validateGrid(grid: unknown): Grid {
  const ok = Array.isArray(grid) && grid.length === SF_ROWS && grid.every((row) =>
    Array.isArray(row) && row.length === SF_COLS &&
    row.every((v) => Number.isInteger(v) && v >= 0 && v < SF_ICON_COUNT));
  if (!ok) throw new Error(`Slot Five: grid must be ${SF_ROWS} rows x ${SF_COLS} columns of icons 0..${SF_ICON_COUNT - 1}`);
  return (grid as Grid).map((row) => [...row]);
}

/**
 * Spin-stream grid source for one match. Both sides share it: spin n (0-based, both sides counted)
 * takes the n-th grid, so the grid depends only on seed, weights and n.
 */
export class SlotFiveGridStream {
  private readonly rng: Rng;
  private count = 0;
  private forced: Grid[] = [];

  constructor(seed: number, private readonly config: SlotFiveGridConfig) {
    this.rng = createRng(streamSeed(seed, SF_STREAM_SPIN));
  }

  /** Number of spins taken so far, which is also the index of the next spin. */
  get spinIndex(): number {
    return this.count;
  }

  /** Queues a grid for the next spin. The spin still draws and discards its 20 numbers. */
  forceNext(grid: Grid): void {
    this.forced.push(validateGrid(grid));
  }

  next(): GridSpin {
    const spinIndex = this.count;
    const drawn = drawGrid(this.rng, this.config);
    const grid = this.forced.shift() ?? drawn;
    this.count += 1;
    return { spinIndex, grid };
  }
}

// ---------------------------------------------------------------- C2: chains and effects

export type Dir = 'h' | 'v' | 'dr' | 'ur';
export type Kind = 'damage' | 'heal' | 'shield' | 'none';
/** cells are [x, y], listed along the line's step. */
export interface Chain { icon: number; dir: Dir; length: number; cells: [number, number][]; kind: Kind; value: number }
export interface Effects { damage: number; heal: number; shield: number }
export interface Evaluation { chains: Chain[]; effects: Effects }

/** Effect kind by icon index: four elements and blade damage, then heal, shield, lucky. */
export const SF_ICON_KINDS: readonly Kind[] = ['damage', 'damage', 'damage', 'damage', 'damage', 'heal', 'shield', 'none'];

export interface SlotFiveEffectConfig {
  /** Base value of a 3-chain per icon. Lucky has no effect, so 0. */
  base: number[];
  len4Mult: number;
}

/** Snapshot of the chain values one match or evaluation uses. */
export function readEffectConfig(tuning: SlotFiveTuning): SlotFiveEffectConfig {
  const t = tuning as unknown as Record<string, number>;
  return {
    base: TUNING_NAMES.map((name, icon) => (SF_ICON_KINDS[icon] === 'none' ? 0 : t[`sfB${name}`])),
    len4Mult: tuning.sfLen4Mult,
  };
}

const DIR_ORDER: readonly Dir[] = ['h', 'v', 'dr', 'ur'];
const DIR_STEP: Record<Dir, [number, number]> = { h: [1, 0], v: [0, 1], dr: [1, 1], ur: [1, -1] };

/** Every straight line of 3 or more cells, grouped by direction. 14 lines on 4x4 (10 of length 4, 4 of length 3). */
function buildLines(): Record<Dir, [number, number][][]> {
  const inside = (x: number, y: number) => x >= 0 && x < SF_COLS && y >= 0 && y < SF_ROWS;
  const out = { h: [], v: [], dr: [], ur: [] } as Record<Dir, [number, number][][]>;
  for (const dir of DIR_ORDER) {
    const [dx, dy] = DIR_STEP[dir];
    for (let y = 0; y < SF_ROWS; y++) {
      for (let x = 0; x < SF_COLS; x++) {
        // A line starts at a cell whose previous cell along the step is outside the grid.
        if (inside(x - dx, y - dy)) continue;
        const cells: [number, number][] = [];
        for (let cx = x, cy = y; inside(cx, cy); cx += dx, cy += dy) cells.push([cx, cy]);
        if (cells.length >= 3) out[dir].push(cells);
      }
    }
  }
  return out;
}

const SF_LINES = buildLines();

/** mult(3) = 1, mult(4) = sfLen4Mult. A 4x4 grid has no longer chain (brief v4 4.4). */
const lengthMult = (length: number, config: SlotFiveEffectConfig): number => (length >= 4 ? config.len4Mult : 1);

/**
 * Finds every maximal run of 3+ equal icons on each line. Each chain counts on its own, even when chains share cells.
 * Order: dir h, v, dr, ur; within a dir by the chain's first cell in scan order (y, then x).
 */
export function evaluateGrid(grid: Grid, config: SlotFiveEffectConfig): Evaluation {
  const chains: Chain[] = [];
  const effects: Effects = { damage: 0, heal: 0, shield: 0 };
  for (const dir of DIR_ORDER) {
    const found: Chain[] = [];
    for (const line of SF_LINES[dir]) {
      let start = 0;
      while (start < line.length) {
        const icon = grid[line[start][1]][line[start][0]];
        let end = start + 1;
        while (end < line.length && grid[line[end][1]][line[end][0]] === icon) end++;
        const length = end - start;
        if (length >= 3) {
          const kind = SF_ICON_KINDS[icon];
          const value = kind === 'none' ? 0 : config.base[icon] * lengthMult(length, config);
          found.push({ icon, dir, length, cells: line.slice(start, end).map(([x, y]) => [x, y]), kind, value });
          if (kind !== 'none') effects[kind] += value;
        }
        start = end;
      }
    }
    found.sort((a, b) => a.cells[0][1] - b.cells[0][1] || a.cells[0][0] - b.cells[0][0]);
    chains.push(...found);
  }
  return { chains, effects };
}

/**
 * Expected number of maximal runs of exactly `k` equal icons on one line of `len` cells, each cell independently
 * the icon with probability p. A run touching a line end needs no neighbour; inner ends need a different icon (q).
 */
function expectedRuns(len: number, k: number, p: number): number {
  const q = 1 - p;
  let sum = 0;
  for (let start = 0; start + k <= len; start++) {
    const before = start > 0 ? q : 1;
    const after = start + k < len ? q : 1;
    sum += p ** k * before * after;
  }
  return sum;
}

/**
 * Exact expected effects per spin, summed over the grid's own lines. On 4x4 (brief v4 4.6) this is
 * E3 = p^3 (4 + 20q), E4 = 10 p^4, value = B (E3 + len4Mult E4).
 */
export function analyticEffects(gridConfig: SlotFiveGridConfig, effectConfig: SlotFiveEffectConfig): Effects {
  const out: Effects = { damage: 0, heal: 0, shield: 0 };
  if (gridConfig.totalWeight <= 0) throw new Error('Slot Five: total icon weight must be positive');
  const lineLengths = DIR_ORDER.flatMap((dir) => SF_LINES[dir].map((line) => line.length));
  for (let icon = 0; icon < SF_ICON_COUNT; icon++) {
    const kind = SF_ICON_KINDS[icon];
    if (kind === 'none') continue;
    const p = gridConfig.weights[icon] / gridConfig.totalWeight;
    let expected = 0;
    for (const len of lineLengths) {
      for (let k = 3; k <= len; k++) expected += expectedRuns(len, k, p) * lengthMult(k, effectConfig);
    }
    out[kind] += effectConfig.base[icon] * expected;
  }
  return out;
}

// ---------------------------------------------------------------- C8: cast order and resolve time (display only)

/** Cast timing, copied from TUNING when a match starts. */
export interface CastTiming {
  resolveMs: number;
  blankResolveMs: number;
  castDelayMs: number;
  castStaggerMs: number;
  castFlightMs: number;
  castTailMs: number;
}

export function readCastTiming(tuning: SlotFiveTuning): CastTiming {
  return {
    resolveMs: tuning.sfResolveMs,
    blankResolveMs: tuning.sfBlankResolveMs,
    castDelayMs: tuning.sfCastDelayMs,
    castStaggerMs: tuning.sfCastStaggerMs,
    castFlightMs: tuning.sfCastFlightMs,
    castTailMs: tuning.sfCastTailMs,
  };
}

const CAST_KIND_ORDER: readonly Kind[] = ['heal', 'shield', 'damage'];

/**
 * Indexes into `chains` of the chains that fire, in firing order: heal, then shield, then damage, keeping the
 * chains' own order within a kind (brief 4.10). Lucky chains (kind 'none') never fire.
 */
export function castOrder(chains: readonly Chain[]): number[] {
  return CAST_KIND_ORDER.flatMap((kind) => chains.flatMap((chain, i) => (chain.kind === kind ? [i] : [])));
}

/** Length of `resolving` for a turn with these chains (brief 4.10). */
export function resolveMsFor(chains: readonly Chain[], timing: CastTiming): number {
  if (chains.length === 0) return timing.blankResolveMs;
  const n = castOrder(chains).length;
  if (n === 0) return timing.resolveMs;
  return Math.max(
    timing.resolveMs,
    timing.castDelayMs + (n - 1) * timing.castStaggerMs + timing.castFlightMs + timing.castTailMs,
  );
}

// ---------------------------------------------------------------- C3: alternating battle, hp and shield

export type Side = 'player' | 'foe';
export type BattleStatus = 'playing' | 'won' | 'lost';
export interface Fighter { hp: number; maxHp: number; shield: number }

export interface BattleSetup {
  player?: Partial<Fighter>;
  foe?: Partial<Fighter>;
  /** Defaults to 'player'. */
  turn?: Side;
  /** Grids forced on the first spins, in order. Each forced spin still draws and discards 20 RNG numbers. */
  grids?: number[][][];
}

export interface BattleState {
  status: BattleStatus;
  turn: Side;
  spinIndex: number;
  player: Fighter;
  foe: Fighter;
}

export interface BattleSpin {
  accepted: boolean;
  side: Side;
  grid: Grid;
  chains: Chain[];
  effects: Effects;
  absorbed: number;
  hpLoss: number;
  healed: number;
}

const otherSide = (side: Side): Side => (side === 'player' ? 'foe' : 'player');
const cloneFighter = (f: Fighter): Fighter => ({ hp: f.hp, maxHp: f.maxHp, shield: f.shield });
const cloneChains = (chains: Chain[]): Chain[] =>
  chains.map((c) => ({ ...c, cells: c.cells.map(([x, y]) => [x, y] as [number, number]) }));

function makeFighter(defaultMaxHp: number, over: Partial<Fighter> | undefined, label: Side): Fighter {
  const maxHp = over?.maxHp ?? defaultMaxHp;
  const fighter = { maxHp, hp: over?.hp ?? maxHp, shield: over?.shield ?? 0 };
  const isInt = (v: number) => Number.isInteger(v);
  if (!isInt(fighter.maxHp) || fighter.maxHp < 1) throw new Error(`Slot Five: ${label}.maxHp must be a positive integer`);
  if (!isInt(fighter.hp) || fighter.hp < 1 || fighter.hp > fighter.maxHp) {
    throw new Error(`Slot Five: ${label}.hp must be an integer in [1, maxHp]`);
  }
  if (!isInt(fighter.shield) || fighter.shield < 0) throw new Error(`Slot Five: ${label}.shield must be a non-negative integer`);
  return fighter;
}

/**
 * One match. Both sides share the spin stream: spin n takes grid n whoever spins.
 * TUNING (weights, values, max hp) is snapshotted when the battle is created.
 */
export class SlotFiveBattle {
  private readonly stream: SlotFiveGridStream;
  private readonly effectConfig: SlotFiveEffectConfig;
  private status: BattleStatus = 'playing';
  private turn: Side;
  private readonly fighters: Record<Side, Fighter>;
  /** Last spin result grid, or the init-stream grid before the first spin. */
  private grid: Grid;

  constructor(readonly seed: number, tuning: SlotFiveTuning, setup: BattleSetup = {}) {
    const gridConfig = readGridConfig(tuning);
    this.effectConfig = readEffectConfig(tuning);
    this.stream = new SlotFiveGridStream(seed, gridConfig);
    this.grid = initialGrid(seed, gridConfig);
    this.fighters = {
      player: makeFighter(tuning.sfPlayerMaxHp, setup.player, 'player'),
      foe: makeFighter(tuning.sfFoeMaxHp, setup.foe, 'foe'),
    };
    if (setup.turn !== undefined && setup.turn !== 'player' && setup.turn !== 'foe') {
      throw new Error("Slot Five: setup.turn must be 'player' or 'foe'");
    }
    this.turn = setup.turn ?? 'player';
    for (const g of setup.grids ?? []) this.stream.forceNext(g);
  }

  getState(): BattleState {
    return {
      status: this.status,
      turn: this.turn,
      spinIndex: this.stream.spinIndex,
      player: cloneFighter(this.fighters.player),
      foe: cloneFighter(this.fighters.foe),
    };
  }

  /** Copy of the last spin's grid, or the opening grid. */
  getGrid(): Grid {
    return this.grid.map((row) => [...row]);
  }

  /** Queues a grid for the next spin, after any grids still queued. */
  forceNextGrid(grid: Grid): void {
    this.stream.forceNext(grid);
  }

  /** Spins for the side whose turn it is, following brief 4.5 step by step. */
  spin(): BattleSpin {
    const side = this.turn;
    // 1. A finished match rejects without touching the RNG.
    if (this.status !== 'playing') {
      return {
        accepted: false, side, grid: this.getGrid(), chains: [],
        effects: { damage: 0, heal: 0, shield: 0 }, absorbed: 0, hpLoss: 0, healed: 0,
      };
    }
    const a = this.fighters[side];
    const b = this.fighters[otherSide(side)];
    // 2. The spinner's old shield has already covered the other side's last attack.
    a.shield = 0;
    // 3. Draw and evaluate. The stream advances spinIndex.
    const { grid } = this.stream.next();
    this.grid = grid;
    const { chains, effects } = evaluateGrid(grid, this.effectConfig);
    // 4. Heal, capped at maxHp.
    const healed = Math.min(a.maxHp - a.hp, effects.heal);
    a.hp += healed;
    // 5. New shield replaces, never stacks.
    a.shield = effects.shield;
    // 6. Damage hits the other side's shield first.
    const absorbed = Math.min(b.shield, effects.damage);
    b.shield -= absorbed;
    const hpLoss = Math.min(b.hp, effects.damage - absorbed);
    b.hp -= hpLoss;
    // 7. End of turn.
    if (b.hp === 0) this.status = side === 'player' ? 'won' : 'lost';
    else this.turn = otherSide(side);
    return {
      accepted: true, side, grid: this.getGrid(), chains: cloneChains(chains),
      effects: { ...effects }, absorbed, hpLoss, healed,
    };
  }
}

/** Snapshots TUNING at call time. */
export function createSlotFiveBattle(seed: number, tuning: SlotFiveTuning, setup?: BattleSetup): SlotFiveBattle {
  return new SlotFiveBattle(seed, tuning, setup);
}

/** Snapshots TUNING at call time. `spinIndex` of each result is the 0-based index of that spin. */
export function createSlotFiveSim(seed: number, tuning: SlotFiveTuning): GridSim {
  const stream = new SlotFiveGridStream(seed, readGridConfig(tuning));
  return { spin: () => stream.next() };
}

// ---------------------------------------------------------------- C4: balance simulation

export interface MatchReport {
  matches: number;
  playerWinRate: number;
  turnsMedian: number;
  turnsP10: number;
  turnsP90: number;
  turnsMax: number;
  comebackRate: number;
  /** Comeback share among the matches each side won; 0 when that side won none. */
  comebackRateByWinner: { player: number; foe: number };
  /** Turns with no chain at all (brief v4). */
  blankTurnRate: number;
  /** Turns with damage > 0, over every turn of every match, both sides (brief v4). */
  attackTurnRate: number;
  /** Per icon: share of turns with at least one chain of that icon (brief v4). */
  chainTurnRateByIcon: number[];
  meanDamage: number;
  meanDamageStdErr: number;
  meanHeal: number;
  meanShield: number;
  meanAbsorbed: number;
  estMatchMsMedian: number;
  /** Nearest-rank P90 of estMatchMs (brief v4). */
  estMatchMsP90: number;
  /** Sum of estMatchMs over sum of turns, all matches (brief v4). */
  meanTurnMs: number;
  /** Matches still playing after SLOT_FIVE_SIM.maxTurns spins. */
  unfinished: number;
}

export interface SimulateMatchesOptions {
  seeds: number[];
  /** Optional setup applied to every match, e.g. { turn: 'foe' } for the first-mover check in C4.8. */
  setup?: BattleSetup;
}

/** Nearest-rank percentile of an ascending array: element ceil(k/100 * n) - 1. Always an actual sample. */
function percentile(sorted: number[], k: number): number {
  if (sorted.length === 0) return 0;
  const rank = Math.max(1, Math.ceil((k / 100) * sorted.length));
  return sorted[rank - 1];
}

/**
 * Plays one battle per seed to the end (or the turn cap). TUNING is read at call time.
 * Turn means one spin of either side. Effects means are raw per-turn evaluate output, before any cap.
 */
export function simulateMatches(opts: SimulateMatchesOptions, tuning: SlotFiveTuning): MatchReport {
  // lastSpinMs: the first column stops at sfSpinBaseMs, then one gap per further column.
  const spinMs = tuning.sfSpinBaseMs + (SF_COLS - 1) * tuning.sfReelStopGapMs;
  const castTiming = readCastTiming(tuning);
  const turnsList: number[] = [];
  const estMsList: number[] = [];
  let playerWins = 0;
  let foeWins = 0;
  let comebacks = 0;
  const comebacksBy = { player: 0, foe: 0 };
  let unfinished = 0;
  let totalTurns = 0;
  let blankTurns = 0;
  let attackTurns = 0;
  const chainTurnsByIcon = new Array<number>(SF_ICON_COUNT).fill(0);
  let totalEstMs = 0;
  let sumDamage = 0;
  let sumDamageSq = 0;
  let sumHeal = 0;
  let sumShield = 0;
  let sumAbsorbed = 0;

  for (const seed of opts.seeds) {
    const battle = createSlotFiveBattle(seed, tuning, opts.setup);
    /** State after every turn: [spinIndex, player hp, player max, foe hp, foe max]. */
    const history: [number, number, number, number, number][] = [];
    let turns = 0;
    let estMs = 0;
    while (battle.getState().status === 'playing' && turns < SLOT_FIVE_SIM.maxTurns) {
      const r = battle.spin();
      turns += 1;
      const { damage, heal, shield } = r.effects;
      if (r.chains.length === 0) blankTurns += 1;
      if (damage > 0) attackTurns += 1;
      for (const icon of new Set(r.chains.map((c) => c.icon))) chainTurnsByIcon[icon] += 1;
      sumDamage += damage;
      sumDamageSq += damage * damage;
      sumHeal += heal;
      sumShield += shield;
      sumAbsorbed += r.absorbed;
      // Brief 5.3: each turn costs lastSpinMs + lastResolveMs (4.10).
      estMs += spinMs + resolveMsFor(r.chains, castTiming);
      estMs += r.side === 'foe' ? tuning.sfFoeDelayMs : SLOT_FIVE_SIM.playerPressMs;
      const s = battle.getState();
      history.push([s.spinIndex, s.player.hp, s.player.maxHp, s.foe.hp, s.foe.maxHp]);
    }
    totalTurns += turns;
    turnsList.push(turns);
    estMsList.push(estMs);
    totalEstMs += estMs;
    const status = battle.getState().status;
    if (status === 'playing') {
      unfinished += 1;
      continue;
    }
    const winner: Side = status === 'won' ? 'player' : 'foe';
    if (winner === 'player') playerWins += 1;
    else foeWins += 1;
    // Comeback (brief C4): after some turn with spinIndex >= 2, the eventual winner W trailed the loser L by at least
    // COMEBACK_GAP points: L.hp/L.max - W.hp/W.max >= gap/100, compared in integers by cross-multiplying.
    const gap = SLOT_FIVE_SIM.comebackGapPct;
    const trailed = history.some(([spinIndex, ph, pm, fh, fm]) => {
      if (spinIndex < 2) return false;
      const [wh, wm, lh, lm] = winner === 'player' ? [ph, pm, fh, fm] : [fh, fm, ph, pm];
      return 100 * (lh * wm - wh * lm) >= gap * wm * lm;
    });
    if (trailed) {
      comebacks += 1;
      comebacksBy[winner] += 1;
    }
  }

  const matches = opts.seeds.length;
  turnsList.sort((x, y) => x - y);
  estMsList.sort((x, y) => x - y);
  const meanDamage = totalTurns > 0 ? sumDamage / totalTurns : 0;
  // Sample standard deviation of per-turn damage, over every simulated turn.
  const variance = totalTurns > 1 ? Math.max(0, (sumDamageSq - totalTurns * meanDamage * meanDamage) / (totalTurns - 1)) : 0;
  return {
    matches,
    playerWinRate: matches > 0 ? playerWins / matches : 0,
    turnsMedian: percentile(turnsList, 50),
    turnsP10: percentile(turnsList, 10),
    turnsP90: percentile(turnsList, 90),
    turnsMax: turnsList.length > 0 ? turnsList[turnsList.length - 1] : 0,
    comebackRate: matches > 0 ? comebacks / matches : 0,
    comebackRateByWinner: {
      player: playerWins > 0 ? comebacksBy.player / playerWins : 0,
      foe: foeWins > 0 ? comebacksBy.foe / foeWins : 0,
    },
    blankTurnRate: totalTurns > 0 ? blankTurns / totalTurns : 0,
    attackTurnRate: totalTurns > 0 ? attackTurns / totalTurns : 0,
    chainTurnRateByIcon: chainTurnsByIcon.map((n) => (totalTurns > 0 ? n / totalTurns : 0)),
    meanDamage,
    meanDamageStdErr: totalTurns > 0 ? Math.sqrt(variance / totalTurns) : 0,
    meanHeal: totalTurns > 0 ? sumHeal / totalTurns : 0,
    meanShield: totalTurns > 0 ? sumShield / totalTurns : 0,
    meanAbsorbed: totalTurns > 0 ? sumAbsorbed / totalTurns : 0,
    estMatchMsMedian: percentile(estMsList, 50),
    estMatchMsP90: percentile(estMsList, 90),
    meanTurnMs: totalTurns > 0 ? totalEstMs / totalTurns : 0,
    unfinished,
  };
}
