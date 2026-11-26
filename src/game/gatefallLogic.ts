import { TUNING } from '../config';

/** Gatefall rules. Pure TypeScript: no Phaser, no DOM, no clock, no Math.random. */

export const GF_DIRS = ['up', 'right', 'down', 'left'] as const;
export type Dir = (typeof GF_DIRS)[number];

export const GF_LEVEL_COUNT = 3;

const MIN_CLUSTER_SIZE = 3;
const RNG_STREAMS = { board: 0, up: 1, right: 2, down: 3, left: 4 } as const;
const RNG_STREAM_COUNT = Object.keys(RNG_STREAMS).length;

export type GatefallStatus = 'playing' | 'won' | 'lost';
export type GatefallLoseReason = 'outOfTilts';

export interface GatefallCell {
  x: number;
  y: number;
}

export interface GatefallGoal {
  color: number;
  target: number;
  collected: number;
  remaining: number;
}

export type GatefallEvent =
  | { seq: number; type: 'tiltStart'; dir: Dir; tiltsLeft: number }
  | { seq: number; type: 'move'; pieceId: number; from: GatefallCell; to: GatefallCell; chain: number }
  | { seq: number; type: 'enter'; pieceId: number; dir: Dir; lane: number; to: GatefallCell; color: number }
  | { seq: number; type: 'clusterClear'; chain: number; clusterIndex: number; color: number; cells: GatefallCell[] }
  | { seq: number; type: 'gateRefill'; dir: Dir; lane: number; color: number; pieceId: number }
  | { seq: number; type: 'vent'; dir: Dir; cells: GatefallCell[]; tiltCost: number }
  | { seq: number; type: 'turnEnd'; status: GatefallStatus; tiltsLeft: number; stateHash: string }
  | { seq: number; type: 'tiltRejected'; dir: Dir };

type WithoutSeq<E> = E extends unknown ? Omit<E, 'seq'> : never;

export interface GatefallFixture {
  /** board[y][x] */
  board: (number | null)[][];
  gates: Record<Dir, (number | null)[]>;
  tiltsLeft?: number;
  collected?: number[];
}

export interface GatefallLogicState {
  gameId: 'gatefall';
  status: GatefallStatus;
  loseReason: GatefallLoseReason | null;
  levelIndex: number;
  levelCount: number;
  campaignComplete: boolean;
  seed: number;
  boardSize: number;
  colorCount: number;
  waveSize: number;
  board: (number | null)[][];
  gates: Record<Dir, (number | null)[]>;
  goals: GatefallGoal[];
  collected: number[];
  tiltLimit: number;
  tiltsLeft: number;
  tiltsUsed: number;
  rejectedTilts: number;
  ventCount: number;
  validTilts: Dir[];
  lastTiltDir: Dir | null;
  lastChain: number;
  lastEvents: GatefallEvent[];
  lastAnimMs: number;
  stateHash: string;
}

export interface GatefallTiltResult {
  accepted: boolean;
  events: GatefallEvent[];
  animMs: number;
}

export interface GatefallPreview {
  valid: boolean;
  /** Sum over goal colors of min(remaining, pieces of that color cleared). */
  useful: number;
  /** Pieces cleared across every chain, goal color or not. */
  cleared: number;
  wouldVent: boolean;
}

export interface GatefallSim {
  getState(): GatefallLogicState;
  validTilts(): Dir[];
  tilt(dir: Dir): GatefallTiltResult;
  /** Reads only. With `useGates: false` the result does not depend on gate contents at all. */
  preview(dir: Dir, options: { useGates: boolean }): GatefallPreview;
}

/** Values copied from TUNING when a level starts, so moving a slider cannot affect a level in progress. */
export interface GatefallLevelConfig {
  levelIndex: number;
  seed: number;
  boardSize: number;
  initialPieces: number;
  waveSize: number;
  colorCount: number;
  tiltLimit: number;
  ventTiltCost: number;
  goalColors: number;
  goalCount: number;
  slideMsPerCell: number;
  slideMaxMs: number;
  enterMs: number;
  clearPrepMs: number;
  clearMs: number;
  chainPauseMs: number;
  ventMs: number;
}

interface Piece {
  id: number;
  color: number;
}

class Mulberry32 {
  constructor(public state: number) {}

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(n: number): number {
    return Math.floor(this.next() * n);
  }
}

export function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function assertLevelIndex(levelIndex: number): asserts levelIndex is 0 | 1 | 2 {
  if (!Number.isInteger(levelIndex) || levelIndex < 0 || levelIndex >= GF_LEVEL_COUNT) {
    throw new RangeError(`Gatefall: invalid levelIndex ${levelIndex}`);
  }
}

export function defaultGatefallSeed(levelIndex: number): number {
  assertLevelIndex(levelIndex);
  const n = (levelIndex + 1) as 1 | 2 | 3;
  return TUNING[`gfL${n}Seed`];
}

export function readGatefallLevelConfig(levelIndex: number, seed: number): GatefallLevelConfig {
  assertLevelIndex(levelIndex);
  const n = (levelIndex + 1) as 1 | 2 | 3;
  return {
    levelIndex,
    seed: seed >>> 0,
    boardSize: TUNING.gfBoardSize,
    initialPieces: TUNING.gfInitialPieces,
    waveSize: TUNING.gfWaveSize,
    colorCount: TUNING[`gfL${n}Colors`],
    tiltLimit: TUNING[`gfL${n}TiltLimit`],
    ventTiltCost: TUNING.gfVentTiltCost,
    goalColors: TUNING[`gfL${n}GoalColors`],
    goalCount: TUNING[`gfL${n}GoalCount`],
    slideMsPerCell: TUNING.gfSlideMsPerCell,
    slideMaxMs: TUNING.gfSlideMaxMs,
    enterMs: TUNING.gfEnterMs,
    clearPrepMs: TUNING.gfClearPrepMs,
    clearMs: TUNING.gfClearMs,
    chainPauseMs: TUNING.gfChainPauseMs,
    ventMs: TUNING.gfVentMs,
  };
}

class GatefallGame implements GatefallSim {
  private readonly size: number;
  private readonly rngs: Mulberry32[];
  private cells: (Piece | null)[];
  private readonly gates: Record<Dir, (Piece | null)[]>;
  private collected: number[];
  private status: GatefallStatus = 'playing';
  private loseReason: GatefallLoseReason | null = null;
  private tiltsLeft: number;
  private tiltsUsed = 0;
  private rejectedTilts = 0;
  private ventCount = 0;
  private lastTiltDir: Dir | null = null;
  private lastChain = 0;
  private lastEvents: GatefallEvent[] = [];
  private lastAnimMs = 0;
  private nextPieceId = 0;

  constructor(private readonly config: GatefallLevelConfig, fixture?: GatefallFixture) {
    this.size = config.boardSize;
    this.rngs = Array.from({ length: RNG_STREAM_COUNT }, (_, k) =>
      new Mulberry32((config.seed + Math.imul(k + 1, 0x9e3779b9)) >>> 0));
    this.cells = new Array<Piece | null>(this.size * this.size).fill(null);
    this.gates = {
      up: new Array<Piece | null>(this.size).fill(null),
      right: new Array<Piece | null>(this.size).fill(null),
      down: new Array<Piece | null>(this.size).fill(null),
      left: new Array<Piece | null>(this.size).fill(null),
    };
    this.collected = new Array<number>(config.colorCount).fill(0);
    this.tiltsLeft = config.tiltLimit;
    if (fixture) this.applyFixture(fixture);
    else {
      this.generateBoard();
      for (const dir of GF_DIRS) this.refillGate(dir);
    }
  }

  getState(): GatefallLogicState {
    return {
      gameId: 'gatefall',
      status: this.status,
      loseReason: this.loseReason,
      levelIndex: this.config.levelIndex,
      levelCount: GF_LEVEL_COUNT,
      campaignComplete: this.status === 'won' && this.config.levelIndex === GF_LEVEL_COUNT - 1,
      seed: this.config.seed,
      boardSize: this.size,
      colorCount: this.config.colorCount,
      waveSize: this.config.waveSize,
      board: this.readBoard(),
      gates: {
        up: this.gates.up.map((piece) => piece?.color ?? null),
        right: this.gates.right.map((piece) => piece?.color ?? null),
        down: this.gates.down.map((piece) => piece?.color ?? null),
        left: this.gates.left.map((piece) => piece?.color ?? null),
      },
      goals: this.readGoals(),
      collected: [...this.collected],
      tiltLimit: this.config.tiltLimit,
      tiltsLeft: this.tiltsLeft,
      tiltsUsed: this.tiltsUsed,
      rejectedTilts: this.rejectedTilts,
      ventCount: this.ventCount,
      validTilts: this.validTilts(),
      lastTiltDir: this.lastTiltDir,
      lastChain: this.lastChain,
      lastEvents: cloneEvents(this.lastEvents),
      lastAnimMs: this.lastAnimMs,
      stateHash: this.hash(),
    };
  }

  validTilts(): Dir[] {
    return GF_DIRS.filter((dir) => this.canTilt(dir));
  }

  tilt(dir: Dir): GatefallTiltResult {
    if (!GF_DIRS.includes(dir)) throw new RangeError(`Gatefall: invalid direction ${String(dir)}`);

    const events: GatefallEvent[] = [];
    const emit = (event: WithoutSeq<GatefallEvent>) => {
      events.push({ seq: events.length, ...event } as GatefallEvent);
    };

    if (!this.canTilt(dir)) {
      this.rejectedTilts += 1;
      emit({ type: 'tiltRejected', dir });
      this.lastEvents = events;
      return { accepted: false, events: cloneEvents(events), animMs: 0 };
    }

    const clearedChains = this.playTurn(dir, true, emit);

    this.lastTiltDir = dir;
    this.lastChain = clearedChains;
    this.lastAnimMs = this.computeAnimMs(events);
    emit({ type: 'turnEnd', status: this.status, tiltsLeft: this.tiltsLeft, stateHash: this.hash() });
    this.lastEvents = events;
    return { accepted: true, events: cloneEvents(events), animMs: this.lastAnimMs };
  }

  preview(dir: Dir, options: { useGates: boolean }): GatefallPreview {
    if (!GF_DIRS.includes(dir)) throw new RangeError(`Gatefall: invalid direction ${String(dir)}`);

    const { useGates } = options;
    const valid = useGates
      ? this.canTilt(dir)
      : this.status === 'playing' && this.tiltsLeft > 0 && this.wouldMove(dir);
    if (!valid) return { valid: false, useful: 0, cleared: 0, wouldVent: false };

    const clearedByColor = new Array<number>(this.config.colorCount).fill(0);
    let wouldVent = false;
    // The turn runs on a throwaway copy, so this sim's state, RNG and piece ids stay untouched.
    this.fork(useGates).playTurn(dir, useGates, (event) => {
      if (event.type === 'clusterClear') clearedByColor[event.color] += event.cells.length;
      else if (event.type === 'vent') wouldVent = true;
    });

    const useful = this.readGoals().reduce(
      (sum, goal) => sum + Math.min(goal.remaining, clearedByColor[goal.color]), 0);
    const cleared = clearedByColor.reduce((sum, count) => sum + count, 0);
    return { valid: true, useful, cleared, wouldVent };
  }

  /** Brief 4.3 steps 3 to 8, shared by `tilt` and `preview`. Returns the number of chains that cleared. */
  private playTurn(dir: Dir, useGates: boolean, emit: (event: WithoutSeq<GatefallEvent>) => void): number {
    this.tiltsUsed += 1;
    this.tiltsLeft -= 1;
    emit({ type: 'tiltStart', dir, tiltsLeft: this.tiltsLeft });
    this.slide(dir, 0, emit);
    if (useGates) this.enterFromGate(dir, emit);

    let chain = 1;
    let clearedChains = 0;
    for (;;) {
      const clusters = this.findClusters();
      if (clusters.length === 0) break;
      clusters.forEach((cluster, clusterIndex) => {
        const color = this.cells[cluster[0]]!.color;
        emit({ type: 'clusterClear', chain, clusterIndex, color, cells: cluster.map((i) => this.toCell(i)) });
        this.collected[color] += cluster.length;
      });
      for (const cluster of clusters) {
        for (const index of cluster) this.cells[index] = null;
      }
      this.slide(dir, chain, emit);
      clearedChains = chain;
      chain += 1;
    }

    if (useGates) this.refillGate(dir, emit);
    this.endTurn(dir, emit);
    return clearedChains;
  }

  /** Copy for `preview`. Without gates the copy gets empty gates, so gate contents cannot reach the result. */
  private fork(useGates: boolean): GatefallGame {
    const readGate = (dir: Dir) => (useGates
      ? this.gates[dir].map((piece) => piece?.color ?? null)
      : new Array<number | null>(this.size).fill(null));
    const copy = new GatefallGame(this.config, {
      board: this.readBoard(),
      gates: { up: readGate('up'), right: readGate('right'), down: readGate('down'), left: readGate('left') },
      tiltsLeft: this.tiltsLeft,
      collected: this.collected,
    });
    copy.rngs.forEach((rng, k) => { rng.state = this.rngs[k].state; });
    return copy;
  }

  /** Brief 5.3. Reads the events of one accepted tilt. */
  private computeAnimMs(events: GatefallEvent[]): number {
    const { slideMsPerCell, slideMaxMs, enterMs, clearPrepMs, clearMs, chainPauseMs, ventMs } = this.config;
    const slideMs = (cells: number) => (cells === 0 ? 0 : Math.min(slideMaxMs, cells * slideMsPerCell));

    const farthestByChain = new Map<number, number>();
    const clearedChains = new Set<number>();
    let entered = false;
    let vented = false;
    for (const event of events) {
      if (event.type === 'move') {
        const cells = Math.abs(event.to.x - event.from.x) + Math.abs(event.to.y - event.from.y);
        farthestByChain.set(event.chain, Math.max(farthestByChain.get(event.chain) ?? 0, cells));
      } else if (event.type === 'enter') entered = true;
      else if (event.type === 'clusterClear') clearedChains.add(event.chain);
      else if (event.type === 'vent') vented = true;
    }

    let total = slideMs(farthestByChain.get(0) ?? 0) + (entered ? enterMs : 0) + (vented ? ventMs : 0);
    for (const chain of clearedChains) {
      total += clearPrepMs + clearMs + slideMs(farthestByChain.get(chain) ?? 0) + chainPauseMs;
    }
    return total;
  }

  private readBoard(): (number | null)[][] {
    const board: (number | null)[][] = [];
    for (let y = 0; y < this.size; y += 1) {
      board.push(this.cells.slice(y * this.size, (y + 1) * this.size).map((piece) => piece?.color ?? null));
    }
    return board;
  }

  /** Brief 4.3 step 8. The order matters: a win on the last tilt beats running out, and both beat venting. */
  private endTurn(dir: Dir, emit: (event: WithoutSeq<GatefallEvent>) => void): void {
    if (this.readGoals().every((goal) => goal.remaining === 0)) {
      this.finish('won');
      return;
    }
    if (this.tiltsLeft === 0) {
      this.finish('lost');
      return;
    }
    if (this.cells.every((piece) => piece !== null)) {
      this.vent(dir, emit);
      if (this.tiltsLeft === 0) this.finish('lost');
    }
  }

  /** Clears the line next to the used gate. Uses no RNG and adds nothing to `collected`. */
  private vent(dir: Dir, emit: (event: WithoutSeq<GatefallEvent>) => void): void {
    const line = Array.from({ length: this.size }, (_, lane) => this.laneIndex(dir, lane, this.size - 1));
    for (const index of line) this.cells[index] = null;
    this.ventCount += 1;
    this.tiltsLeft = Math.max(0, this.tiltsLeft - this.config.ventTiltCost);
    // tiltCost is the configured cost; turnEnd.tiltsLeft shows what was actually left after clamping.
    emit({ type: 'vent', dir, cells: line.map((i) => this.toCell(i)), tiltCost: this.config.ventTiltCost });
  }

  private finish(status: 'won' | 'lost'): void {
    if (this.status !== 'playing') return;
    this.status = status;
    this.loseReason = status === 'lost' ? 'outOfTilts' : null;
  }

  private readGoals(): GatefallGoal[] {
    return Array.from({ length: this.config.goalColors }, (_, color) => {
      const collected = this.collected[color];
      const target = this.config.goalCount;
      return { color, target, collected, remaining: Math.max(0, target - collected) };
    });
  }

  /** The budget check only matters for a fixture loaded with `tiltsLeft: 0`; real play ends through `finish`. */
  private canTilt(dir: Dir): boolean {
    return this.status === 'playing' && this.tiltsLeft > 0 && (this.wouldMove(dir) || this.gateCanEnter(dir));
  }

  private gateCanEnter(dir: Dir): boolean {
    return this.gates[dir].some((piece, lane) => piece !== null && this.firstEmptyDepth(dir, lane) !== null);
  }

  /** Depth of the empty cell closest to the edge the pieces fall toward, or null when the lane is full. */
  private firstEmptyDepth(dir: Dir, lane: number): number | null {
    for (let depth = 0; depth < this.size; depth += 1) {
      if (this.cells[this.laneIndex(dir, lane, depth)] === null) return depth;
    }
    return null;
  }

  /** Runs once per tilt, after the first slide. A piece in a full lane stays in its slot. */
  private enterFromGate(dir: Dir, emit: (event: WithoutSeq<GatefallEvent>) => void): void {
    const gate = this.gates[dir];
    for (let lane = 0; lane < this.size; lane += 1) {
      const piece = gate[lane];
      if (!piece) continue;
      const depth = this.firstEmptyDepth(dir, lane);
      if (depth === null) continue;
      const index = this.laneIndex(dir, lane, depth);
      this.cells[index] = piece;
      gate[lane] = null;
      emit({ type: 'enter', pieceId: piece.id, dir, lane, to: this.toCell(index), color: piece.color });
    }
  }

  /** Draws only from this gate's RNG stream and never reads the board, progress or loss count. */
  private refillGate(dir: Dir, emit?: (event: WithoutSeq<GatefallEvent>) => void): void {
    const gate = this.gates[dir];
    const rng = this.rngs[RNG_STREAMS[dir]];
    let count = gate.filter((piece) => piece !== null).length;
    while (count < this.config.waveSize) {
      const emptyLanes = gate.flatMap((piece, lane) => (piece === null ? [lane] : []));
      const lane = emptyLanes[rng.int(emptyLanes.length)];
      const piece = this.createPiece(rng.int(this.config.colorCount));
      gate[lane] = piece;
      count += 1;
      emit?.({ type: 'gateRefill', dir, lane, color: piece.color, pieceId: piece.id });
    }
  }

  private wouldMove(dir: Dir): boolean {
    for (let lane = 0; lane < this.size; lane += 1) {
      let seenEmpty = false;
      for (let depth = 0; depth < this.size; depth += 1) {
        if (this.cells[this.laneIndex(dir, lane, depth)] === null) seenEmpty = true;
        else if (seenEmpty) return true;
      }
    }
    return false;
  }

  /** Cell index for a lane, where depth 0 is the edge the pieces fall toward. */
  private laneIndex(dir: Dir, lane: number, depth: number): number {
    const far = this.size - 1 - depth;
    switch (dir) {
      case 'up': return depth * this.size + lane;
      case 'down': return far * this.size + lane;
      case 'left': return lane * this.size + depth;
      case 'right': return lane * this.size + far;
    }
  }

  private slide(dir: Dir, chain: number, emit: (event: WithoutSeq<GatefallEvent>) => void): void {
    const next = new Array<Piece | null>(this.cells.length).fill(null);
    const moves: { pieceId: number; from: number; to: number }[] = [];
    for (let lane = 0; lane < this.size; lane += 1) {
      let write = 0;
      for (let depth = 0; depth < this.size; depth += 1) {
        const from = this.laneIndex(dir, lane, depth);
        const piece = this.cells[from];
        if (!piece) continue;
        const to = this.laneIndex(dir, lane, write);
        write += 1;
        next[to] = piece;
        if (to !== from) moves.push({ pieceId: piece.id, from, to });
      }
    }
    this.cells = next;
    moves.sort((a, b) => a.from - b.from);
    for (const move of moves) {
      emit({ type: 'move', pieceId: move.pieceId, from: this.toCell(move.from), to: this.toCell(move.to), chain });
    }
  }

  /** Clusters ordered by their first cell in scan order, with each cluster's cells in scan order. */
  private findClusters(): number[][] {
    const visited = new Array<boolean>(this.cells.length).fill(false);
    const clusters: number[][] = [];
    for (let start = 0; start < this.cells.length; start += 1) {
      const piece = this.cells[start];
      if (visited[start] || !piece) continue;
      visited[start] = true;
      const component = [start];
      for (let head = 0; head < component.length; head += 1) {
        for (const neighbor of this.neighbors(component[head])) {
          if (!visited[neighbor] && this.cells[neighbor]?.color === piece.color) {
            visited[neighbor] = true;
            component.push(neighbor);
          }
        }
      }
      if (component.length >= MIN_CLUSTER_SIZE) clusters.push(component.sort((a, b) => a - b));
    }
    return clusters;
  }

  private neighbors(index: number): number[] {
    const x = index % this.size;
    const y = Math.floor(index / this.size);
    const result: number[] = [];
    if (y > 0) result.push(index - this.size);
    if (x < this.size - 1) result.push(index + 1);
    if (y < this.size - 1) result.push(index + this.size);
    if (x > 0) result.push(index - 1);
    return result;
  }

  private generateBoard(): void {
    const rng = this.rngs[RNG_STREAMS.board];
    const order = Array.from({ length: this.cells.length }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = rng.int(i + 1);
      [order[i], order[j]] = [order[j], order[i]];
    }
    const occupied = order.slice(0, this.config.initialPieces).sort((a, b) => a - b);
    for (const index of occupied) {
      let color = rng.int(this.config.colorCount);
      while (this.wouldFormCluster(index, color)) color = (color + 1) % this.config.colorCount;
      this.cells[index] = this.createPiece(color);
    }
  }

  private wouldFormCluster(index: number, color: number): boolean {
    const seen = new Set([index]);
    const stack = [index];
    while (stack.length > 0) {
      for (const neighbor of this.neighbors(stack.pop()!)) {
        if (seen.has(neighbor) || this.cells[neighbor]?.color !== color) continue;
        seen.add(neighbor);
        if (seen.size >= MIN_CLUSTER_SIZE) return true;
        stack.push(neighbor);
      }
    }
    return false;
  }

  private applyFixture(fixture: GatefallFixture): void {
    if (fixture.board.length !== this.size || fixture.board.some((row) => row.length !== this.size)) {
      throw new RangeError(`Gatefall fixture: board must be ${this.size}x${this.size}`);
    }
    fixture.board.flat().forEach((color, index) => {
      if (color !== null) this.cells[index] = this.createPiece(this.checkColor(color));
    });
    for (const dir of GF_DIRS) {
      const slots = fixture.gates?.[dir];
      if (!slots || slots.length !== this.size) {
        throw new RangeError(`Gatefall fixture: gates.${dir} must have ${this.size} slots`);
      }
      this.gates[dir] = slots.map((color) => (color === null ? null : this.createPiece(this.checkColor(color))));
    }
    if (fixture.tiltsLeft !== undefined) this.tiltsLeft = fixture.tiltsLeft;
    if (fixture.collected !== undefined) {
      if (fixture.collected.length !== this.config.colorCount) {
        throw new RangeError(`Gatefall fixture: collected must have ${this.config.colorCount} entries`);
      }
      this.collected = [...fixture.collected];
    }
  }

  private checkColor(color: number): number {
    if (!Number.isInteger(color) || color < 0 || color >= this.config.colorCount) {
      throw new RangeError(`Gatefall fixture: invalid color ${color}`);
    }
    return color;
  }

  private createPiece(color: number): Piece {
    const piece = { id: this.nextPieceId, color };
    this.nextPieceId += 1;
    return piece;
  }

  private toCell(index: number): GatefallCell {
    return { x: index % this.size, y: Math.floor(index / this.size) };
  }

  private hash(): string {
    const encode = (slots: (Piece | null)[]) => slots.map((piece) => piece?.color ?? '.').join('');
    const { levelIndex, seed } = this.config;
    return fnv1a([
      'v1',
      `L${levelIndex}`,
      `S${seed}`,
      this.status,
      `T${this.tiltsUsed}/${this.tiltsLeft}`,
      `B${encode(this.cells)}`,
      `G${GF_DIRS.map((dir) => encode(this.gates[dir])).join('/')}`,
      `C${this.collected.join(',')}`,
      `V${this.ventCount}`,
      `R${this.rngs.map((rng) => rng.state).join(',')}`,
    ].join('|'));
  }
}

function cloneEvents(events: GatefallEvent[]): GatefallEvent[] {
  return JSON.parse(JSON.stringify(events)) as GatefallEvent[];
}

/** Reads TUNING once, here, so the returned sim is unaffected by later slider changes. */
export function createGatefallSim(levelIndex: number, seed: number, fixture?: GatefallFixture): GatefallSim {
  return new GatefallGame(readGatefallLevelConfig(levelIndex, seed), fixture);
}
