import type { Dir, GatefallPreview, GatefallSim } from '../src/game/gatefallLogic';

/**
 * Gatefall C4 bots and statistics, defined by section 8 of docs/briefs/gatefall.md.
 * Shared by tests/gatefall-c4.spec.ts and tests/gatefall-measure.mjs.
 * Node runs this file directly, so it must stay erasable TypeScript: no enums, no parameter properties.
 */

export const BOTS = ['R', 'B', 'B2', 'G', 'G0'] as const;
export type BotId = (typeof BOTS)[number];

export const LEVELS = [0, 1, 2];
export const TUNE_SEEDS: [number, number] = [1000, 1399];
export const ACCEPT_SEEDS: [number, number] = [5000, 5399];

export interface GameResult {
  seed: number;
  won: boolean;
  tiltsLeft: number;
  vents: number;
  moves: number;
  durationMs: number;
  stateHash: string;
  /** Set when a game stopped in a way the rules say cannot happen. */
  anomaly: string | null;
}

export interface RunArgs {
  levels: number[];
  seeds: number[];
  bots: readonly BotId[];
}

/** results[level][bot], games in the order of `seeds`. */
export type RunResults = Record<number, Record<string, GameResult[]>>;

type PreviewSource = Pick<GatefallSim, 'validTilts' | 'preview'>;

interface BotRng {
  int(n: number): number;
}

export interface QaBots {
  score(preview: GatefallPreview, ventPenalty: boolean): number;
  rng(seed: number): BotRng;
  choose(sim: PreviewSource, bot: BotId, rng: BotRng): Dir | null;
  run(args: RunArgs): RunResults;
}

declare global {
  interface Window {
    __qaBots?: QaBots;
  }
}

/** Runs inside the page, so it must not use anything from this module's scope. */
export const installGatefallBots = () => {
  const THINK_MS = 3000;
  const MOVE_GUARD = 500;

  const rng = (seed: number): BotRng => {
    let state = seed >>> 0;
    const next = () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return { int: (n: number) => Math.floor(next() * n) };
  };

  const score = (p: GatefallPreview, ventPenalty: boolean) =>
    10 * p.useful + p.cleared - (ventPenalty && p.wouldVent ? 30 : 0);

  const choose = (sim: PreviewSource, bot: BotId, random: BotRng): Dir | null => {
    const valid = sim.validTilts();
    if (valid.length === 0) return null;
    if (bot === 'R') return valid[random.int(valid.length)];

    let candidates = valid;
    if (bot === 'B2') {
      const moving = valid.filter((dir) => sim.preview(dir, { useGates: false }).valid);
      if (moving.length > 0) candidates = moving;
    }
    const useGates = bot === 'G' || bot === 'G0';
    const ventPenalty = bot !== 'G0';
    let best = -Infinity;
    let tied: Dir[] = [];
    for (const dir of candidates) {
      const value = score(sim.preview(dir, { useGates }), ventPenalty);
      if (value > best) {
        best = value;
        tied = [dir];
      } else if (value === best) tied.push(dir);
    }
    return tied.length === 1 ? tied[0] : tied[random.int(tied.length)];
  };

  const play = (level: number, seed: number, bot: BotId): GameResult => {
    const sim = window.__game!.gatefall!.createSim(level, seed);
    const random = rng((seed ^ 0x5bd1e995) >>> 0);
    let durationMs = 0;
    let moves = 0;
    let anomaly: string | null = null;
    for (;;) {
      if (moves >= MOVE_GUARD) {
        anomaly = 'moveGuard';
        break;
      }
      const dir = choose(sim, bot, random);
      if (dir === null) {
        anomaly = 'noValidTilt';
        break;
      }
      const result = sim.tilt(dir);
      if (!result.accepted) {
        anomaly = `rejected:${dir}`;
        break;
      }
      moves += 1;
      durationMs += THINK_MS + result.animMs;
      const last = result.events[result.events.length - 1];
      if (last.type !== 'turnEnd') {
        anomaly = 'noTurnEnd';
        break;
      }
      if (last.status !== 'playing') break;
    }
    const final = sim.getState();
    if (!anomaly && final.status === 'playing') anomaly = 'stillPlaying';
    return {
      seed,
      won: final.status === 'won',
      tiltsLeft: final.tiltsLeft,
      vents: final.ventCount,
      moves,
      durationMs,
      stateHash: final.stateHash,
      anomaly,
    };
  };

  const run = ({ levels, seeds, bots }: RunArgs): RunResults => {
    const results: RunResults = {};
    for (const level of levels) {
      results[level] = {};
      for (const bot of bots) results[level][bot] = seeds.map((seed) => play(level, seed, bot));
    }
    return results;
  };

  window.__qaBots = { score, rng, choose, run };
};

export const seedRange = ([from, to]: [number, number]) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** Nearest-rank percentile. */
export const percentile = (values: number[], p: number) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
};

export interface PairedDiff {
  n: number;
  /** Percentage points. */
  gapPts: number;
  /** Lower 95% bound, percentage points: mean(d) - 1.96 * sd(d) / sqrt(n), with sample sd. */
  lowerPts: number;
  winDiff: number;
}

export const pairedDiff = (a: GameResult[], b: GameResult[]): PairedDiff => {
  if (a.length !== b.length || a.some((game, i) => game.seed !== b[i].seed)) {
    throw new Error('pairedDiff needs the same seeds in the same order');
  }
  const d = a.map((game, i) => Number(game.won) - Number(b[i].won));
  const n = d.length;
  const sum = d.reduce((total, value) => total + value, 0);
  const mean = sum / n;
  const variance = n > 1 ? d.reduce((total, value) => total + (value - mean) ** 2, 0) / (n - 1) : 0;
  return { n, gapPts: mean * 100, lowerPts: (mean - 1.96 * Math.sqrt(variance / n)) * 100, winDiff: sum };
};

export interface Verdict {
  c45: boolean;
  c46: boolean;
  c46B2: boolean;
  c47: boolean;
  c48: boolean;
  gatePass: boolean;
  /** C4.6 passes with B but not with the control bot B2. */
  unstable: boolean;
}

const pooled = (results: RunResults, bot: BotId, levels: number[]) =>
  levels.flatMap((level) => results[level][bot].map((game) => ({ ...game, seed: level * 1_000_000 + game.seed })));

const gapPasses = (results: RunResults, levels: number[], other: BotId) => {
  const all = pairedDiff(pooled(results, 'G', levels), pooled(results, other, levels));
  return all.winDiff * 100 >= 10 * all.n && all.lowerPts > 0
    && levels.every((level) => pairedDiff(results[level].G, results[level][other]).winDiff > 0);
};

/** Thresholds from C4.5 to C4.8, compared on win counts so floating point cannot flip a boundary. */
export const judge = (results: RunResults, levels: number[] = LEVELS): Verdict => {
  const all = pairedDiff(pooled(results, 'G', levels), pooled(results, 'R', levels));
  const c45 = all.winDiff * 100 >= 20 * all.n
    && levels.every((level) => pairedDiff(results[level].G, results[level].R).winDiff > 0);
  const c46 = gapPasses(results, levels, 'B');
  const c46B2 = gapPasses(results, levels, 'B2');
  const c47 = levels.every((level) => {
    const games = results[level].G;
    const wins = games.filter((game) => game.won).length;
    return wins * 100 >= 40 * games.length && wins * 100 <= 95 * games.length;
  });
  const c48 = levels.every((level) => {
    const durations = results[level].G.map((game) => game.durationMs);
    return percentile(durations, 10)! >= 60_000 && percentile(durations, 90)! <= 180_000;
  });
  return { c45, c46, c46B2, c47, c48, gatePass: c45 && c46 && c47, unstable: c46 && !c46B2 };
};

export const pooledGames = pooled;
