import { expect, test, type Page } from '@playwright/test';
import type { Dir, GatefallEvent, GatefallFixture, GatefallPreview, GatefallSim } from '../src/game/gatefallLogic';
import type { GatefallState } from '../src/scenes/GatefallScene';
import {
  BOTS, installGatefallBots, judge, pairedDiff, percentile, seedRange,
  type GameResult, type RunResults,
} from './gatefall-bots';

/**
 * Gatefall C4.1 to C4.4 and C4.9, plus the correctness of the bots and statistics.
 * C4.5 to C4.8 are measured by tests/gatefall-measure.mjs, because the seed-set order is a process rule.
 */

type Board = (number | null)[][];
type Gates = Record<Dir, (number | null)[]>;

interface RefPreview {
  valid: boolean;
  clearedByColor: number[];
}

interface QaC4 {
  dirs: Dir[];
  refNoGates(board: Board, dir: Dir, colors: number): RefPreview;
  randomStates(count: number): { level: number; seed: number; moves: Dir[] }[];
  replay(level: number, seed: number, moves: Dir[]): GatefallSim;
  compare(makeSim: () => GatefallSim): string[];
  denseFixtures(): GatefallFixture[];
}

declare global {
  interface Window {
    __qaC4?: QaC4;
  }
}

const installQaC4 = () => {
  const dirs: Dir[] = ['up', 'right', 'down', 'left'];
  const api = () => window.__game!.gatefall!;

  const lanePath = (dir: Dir, lane: number, size: number) => Array.from({ length: size }, (_, depth) => {
    const far = size - 1 - depth;
    if (dir === 'up') return [lane, depth];
    if (dir === 'down') return [lane, far];
    if (dir === 'left') return [depth, lane];
    return [far, lane];
  });

  const slideBoard = (board: Board, dir: Dir) => {
    const size = board.length;
    const next: Board = board.map((row) => row.map(() => null));
    for (let lane = 0; lane < size; lane += 1) {
      const path = lanePath(dir, lane, size);
      const pieces = path.map(([x, y]) => board[y][x]).filter((c) => c !== null);
      pieces.forEach((color, i) => {
        const [x, y] = path[i];
        next[y][x] = color;
      });
    }
    return next;
  };

  const clusters = (board: Board) => {
    const size = board.length;
    const seen = new Set<number>();
    const found: number[][] = [];
    for (let start = 0; start < size * size; start += 1) {
      const color = board[Math.floor(start / size)][start % size];
      if (color === null || seen.has(start)) continue;
      seen.add(start);
      const group = [start];
      for (let i = 0; i < group.length; i += 1) {
        const x = group[i] % size;
        const y = Math.floor(group[i] / size);
        for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
          if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
          const key = ny * size + nx;
          if (!seen.has(key) && board[ny][nx] === color) {
            seen.add(key);
            group.push(key);
          }
        }
      }
      if (group.length >= 3) found.push(group);
    }
    return found;
  };

  const refNoGates = (start: Board, dir: Dir, colors: number): RefPreview => {
    const clearedByColor = new Array<number>(colors).fill(0);
    let board = slideBoard(start, dir);
    const valid = JSON.stringify(board) !== JSON.stringify(start);
    if (!valid) return { valid, clearedByColor };
    for (;;) {
      const groups = clusters(board);
      if (groups.length === 0) break;
      const size = board.length;
      const copy = board.map((row) => [...row]);
      for (const group of groups) {
        clearedByColor[board[Math.floor(group[0] / size)][group[0] % size]!] += group.length;
        for (const index of group) copy[Math.floor(index / size)][index % size] = null;
      }
      board = slideBoard(copy, dir);
    }
    return { valid, clearedByColor };
  };

  const replay = (level: number, seed: number, moves: Dir[]) => {
    const sim = api().createSim(level, seed);
    for (const dir of moves) sim.tilt(dir);
    return sim;
  };

  const randomStates = (count: number) => {
    const random = window.__qaBots!.rng(0x51ab);
    const states: { level: number; seed: number; moves: Dir[] }[] = [];
    for (let i = 0; states.length < count; i += 1) {
      const level = i % 3;
      const seed = 7000 + i;
      const sim = api().createSim(level, seed);
      const moves: Dir[] = [];
      const target = random.int(19);
      while (moves.length < target) {
        const valid = sim.validTilts();
        if (valid.length === 0) break;
        const dir = valid[random.int(valid.length)];
        const probe = api().createSim(level, seed);
        for (const move of moves) probe.tilt(move);
        probe.tilt(dir);
        if (probe.getState().status !== 'playing') break;
        sim.tilt(dir);
        moves.push(dir);
      }
      states.push({ level, seed, moves });
    }
    return states;
  };

  /** Every mismatch between preview and the real tilt on an identical sim. */
  const compare = (makeSim: () => GatefallSim) => {
    const problems: string[] = [];
    const base = makeSim();
    const start = base.getState();
    const before = JSON.stringify(start);
    const valid = base.validTilts();
    for (const dir of dirs) {
      const withGates = base.preview(dir, { useGates: true });
      const noGates = base.preview(dir, { useGates: false });
      if (JSON.stringify(base.getState()) !== before) problems.push(`${dir}: preview changed the state`);
      if (withGates.valid !== valid.includes(dir)) problems.push(`${dir}: valid != validTilts`);

      const zero = (p: GatefallPreview) => p.useful === 0 && p.cleared === 0 && p.wouldVent === false;
      if (!withGates.valid && !zero(withGates)) problems.push(`${dir}: invalid preview(true) not zero`);
      if (!noGates.valid && !zero(noGates)) problems.push(`${dir}: invalid preview(false) not zero`);
      if (noGates.wouldVent) problems.push(`${dir}: preview(false).wouldVent`);

      const real = makeSim();
      const result = real.tilt(dir);
      if (result.accepted !== withGates.valid) problems.push(`${dir}: accepted != valid`);
      const clearedByColor = new Array<number>(start.colorCount).fill(0);
      for (const event of result.events) {
        if (event.type === 'clusterClear') clearedByColor[event.color] += event.cells.length;
      }
      if (result.accepted) {
        const cleared = clearedByColor.reduce((a, b) => a + b, 0);
        const useful = start.goals.reduce((sum, g) => sum + Math.min(g.remaining, clearedByColor[g.color]), 0);
        const vented = result.events.some((event) => event.type === 'vent');
        if (withGates.cleared !== cleared) problems.push(`${dir}: cleared ${withGates.cleared} != ${cleared}`);
        if (withGates.useful !== useful) problems.push(`${dir}: useful ${withGates.useful} != ${useful}`);
        if (withGates.wouldVent !== vented) problems.push(`${dir}: wouldVent ${withGates.wouldVent} != ${vented}`);
      }

      const playable = start.status === 'playing' && start.tiltsLeft > 0;
      const ref = refNoGates(start.board, dir, start.colorCount);
      if (noGates.valid !== (playable && ref.valid)) problems.push(`${dir}: preview(false).valid`);
      if (noGates.valid) {
        const refCleared = ref.clearedByColor.reduce((a, b) => a + b, 0);
        const refUseful = start.goals.reduce((sum, g) => sum + Math.min(g.remaining, ref.clearedByColor[g.color]), 0);
        if (noGates.cleared !== refCleared) problems.push(`${dir}: preview(false).cleared`);
        if (noGates.useful !== refUseful) problems.push(`${dir}: preview(false).useful`);
      }

      const afterPreview = makeSim();
      afterPreview.preview(dir, { useGates: true });
      afterPreview.preview(dir, { useGates: false });
      afterPreview.tilt(dir);
      if (afterPreview.getState().stateHash !== real.getState().stateHash) {
        problems.push(`${dir}: preview changed a later tilt`);
      }
    }
    return problems;
  };

  /** Boards one piece short of full, so real tilts reach the vent branch and the last-tilt branch. */
  const denseFixtures = () => {
    const size = 7;
    const random = window.__qaBots!.rng(0x7e57);
    const list: GatefallFixture[] = [];
    for (let i = 0; i < 60; i += 1) {
      const holeX = random.int(size);
      const holeY = random.int(size);
      const board: Board = Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) =>
        (x === holeX && y === holeY ? null : (x + 2 * y) % 4)));
      const gates = {} as Gates;
      for (const dir of dirs) {
        gates[dir] = new Array<number | null>(size).fill(null);
        const lane = dir === 'up' || dir === 'down' ? holeX : holeY;
        gates[dir][lane] = random.int(4);
      }
      list.push({ board, gates, tiltsLeft: i % 5 === 0 ? 1 : 10 });
    }
    return list;
  };

  window.__qaC4 = { dirs, refNoGates, randomStates, replay, compare, denseFixtures };
};

const emptyGates = (): Gates => ({
  up: new Array<number | null>(7).fill(null),
  right: new Array<number | null>(7).fill(null),
  down: new Array<number | null>(7).fill(null),
  left: new Array<number | null>(7).fill(null),
});

const fixtureOf = (cells: [number, number, number][], extra: Partial<GatefallFixture> = {}): GatefallFixture => {
  const board: Board = Array.from({ length: 7 }, () => new Array<number | null>(7).fill(null));
  for (const [x, y, color] of cells) board[y][x] = color;
  return { board, gates: emptyGates(), ...extra };
};

const fakeGame = (seed: number, won: boolean): GameResult => ({
  seed, won, tiltsLeft: 1, vents: 0, moves: 1, durationMs: 1, stateHash: '', anomaly: null,
});

/** Builds per-bot results from win counts over n seeds, with wins on the first seeds. */
const fakeResults = (n: number, winsByLevel: Record<string, number>[]): RunResults => {
  const results: RunResults = {};
  winsByLevel.forEach((wins, level) => {
    results[level] = {};
    for (const bot of BOTS) {
      results[level][bot] = Array.from({ length: n }, (_, i) => fakeGame(i, i < (wins[bot] ?? 0)));
    }
  });
  return results;
};

let consoleErrors: string[] = [];

const openGatefall = async (page: Page) => {
  consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));
  await page.goto('/?game=gatefall');
  await page.waitForFunction(() => window.__game?.getState<GatefallState>()?.status === 'playing');
  await page.evaluate(installGatefallBots);
  await page.evaluate(installQaC4);
};

test.describe('Gatefall C4', () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await openGatefall(page);
  });

  test.afterEach(() => {
    expect(consoleErrors).toEqual([]);
  });

  test('C4.1 preview không đổi trạng thái và khớp tilt thật trên 200 trạng thái ngẫu nhiên', async ({ page }) => {
    const result = await page.evaluate(() => {
      const qa = window.__qaC4!;
      const states = qa.randomStates(200);
      const problems = states.flatMap(({ level, seed, moves }) =>
        qa.compare(() => qa.replay(level, seed, moves)).map((p) => `L${level} S${seed} +${moves.length}: ${p}`));
      return { count: states.length, withMoves: states.filter((s) => s.moves.length > 0).length, problems };
    });
    expect(result.problems).toEqual([]);
    expect(result.count).toBe(200);
    expect(result.withMoves).toBeGreaterThan(150);
  });

  test('C4.1 preview khớp tilt thật ở nhánh xả bàn và lượt cuối', async ({ page }) => {
    const result = await page.evaluate(() => {
      const qa = window.__qaC4!;
      const api = window.__game!.gatefall!;
      const problems: string[] = [];
      let vents = 0;
      let lastTiltFullBoards = 0;
      qa.denseFixtures().forEach((data, i) => {
        problems.push(...qa.compare(() => api.createSim(0, 900 + i, data)).map((p) => `fixture ${i}: ${p}`));
        const sim = api.createSim(0, 900 + i, data);
        for (const dir of qa.dirs) {
          const preview = sim.preview(dir, { useGates: true });
          if (preview.wouldVent) vents += 1;
          if (data.tiltsLeft !== 1 || !preview.valid) continue;
          // Brief 4.3 step 8: a full board on the last tilt loses without venting.
          const real = api.createSim(0, 900 + i, data);
          real.tilt(dir);
          const end = real.getState();
          if (end.board.flat().every((cell) => cell !== null) && end.status === 'lost') {
            lastTiltFullBoards += 1;
            if (preview.wouldVent || end.ventCount !== 0) problems.push(`fixture ${i} ${dir}: vented on last tilt`);
          }
        }
      });
      return { problems, vents, lastTiltFullBoards };
    });
    expect(result.problems).toEqual([]);
    expect(result.vents).toBeGreaterThan(0);
    expect(result.lastTiltFullBoards).toBeGreaterThan(0);
  });

  test('C4.1 preview đúng khi hướng chỉ hợp lệ nhờ cửa, khi ván kết thúc và khi hết lượt', async ({ page }) => {
    const gateOnly = fixtureOf([[0, 6, 0]], { gates: { ...emptyGates(), down: [null, null, 1, null, null, null, null] } });
    const noBudget = fixtureOf([[2, 1, 0]], { tiltsLeft: 0 });
    const oneLeft = fixtureOf([[2, 1, 0]], { tiltsLeft: 1 });
    const result = await page.evaluate(({ gateOnly, noBudget, oneLeft }) => {
      const api = window.__game!.gatefall!;
      const a = api.createSim(0, 1, gateOnly);
      const b = api.createSim(0, 1, noBudget);
      const c = api.createSim(0, 1, oneLeft);
      c.tilt('down');
      const ended = c.getState().status;
      return {
        gateTrue: a.preview('down', { useGates: true }),
        gateFalse: a.preview('down', { useGates: false }),
        inValid: a.validTilts().includes('down'),
        budgetTrue: b.preview('down', { useGates: true }),
        budgetFalse: b.preview('down', { useGates: false }),
        ended,
        endedTrue: c.preview('up', { useGates: true }),
        endedFalse: c.preview('up', { useGates: false }),
      };
    }, { gateOnly, noBudget, oneLeft });
    const zero = { valid: false, useful: 0, cleared: 0, wouldVent: false };
    expect(result.inValid).toBe(true);
    expect(result.gateTrue.valid).toBe(true);
    expect(result.gateFalse).toEqual(zero);
    expect(result.budgetTrue).toEqual(zero);
    expect(result.budgetFalse).toEqual(zero);
    expect(result.ended).toBe('lost');
    expect(result.endedTrue).toEqual(zero);
    expect(result.endedFalse).toEqual(zero);
  });

  test('C4.1 cleared tính mọi màu qua mọi chain, useful dùng remaining trước lần nghiêng', async ({ page }) => {
    // F4: chain 1 clears color 0, chain 2 clears color 1. Goals are colors 0 and 1, target from tuning.
    const target = await page.evaluate(() => window.__game!.tuning.gfL1GoalCount);
    const f4: [number, number, number][] = [[0, 4, 2], [0, 5, 0], [1, 4, 1], [1, 5, 0], [2, 4, 1], [2, 5, 0], [3, 5, 1]];
    const nonGoal: [number, number, number][] = [[0, 5, 3], [1, 6, 3], [2, 5, 3]];
    const data = {
      plain: fixtureOf(f4),
      capped: fixtureOf(f4, { collected: [target - 1, target, 0, 0] }),
      nonGoal: fixtureOf(nonGoal),
    };
    const result = await page.evaluate((d) => {
      const api = window.__game!.gatefall!;
      const read = (fixture: GatefallFixture, useGates: boolean) =>
        api.createSim(0, 1, fixture).preview('down', { useGates });
      return {
        plainTrue: read(d.plain, true),
        plainFalse: read(d.plain, false),
        capped: read(d.capped, true),
        nonGoal: read(d.nonGoal, true),
      };
    }, data);
    expect(result.plainTrue).toEqual({ valid: true, useful: 6, cleared: 6, wouldVent: false });
    expect(result.plainFalse).toEqual({ valid: true, useful: 6, cleared: 6, wouldVent: false });
    expect(result.capped).toEqual({ valid: true, useful: 1, cleared: 6, wouldVent: false });
    expect(result.nonGoal).toEqual({ valid: true, useful: 0, cleared: 3, wouldVent: false });
  });

  test('C4.1 animMs đúng công thức mục 5.3 trên ván thật và tình huống dựng tay', async ({ page }) => {
    const data = {
      f1: fixtureOf([[2, 1, 0], [2, 4, 1]]),
      capped: fixtureOf([[2, 0, 0]]),
      entered: fixtureOf([], { gates: { ...emptyGates(), down: [null, null, null, 1, null, null, null] } }),
      f4: fixtureOf([[0, 4, 2], [0, 5, 0], [1, 4, 1], [1, 5, 0], [2, 4, 1], [2, 5, 0], [3, 5, 1]]),
    };
    const result = await page.evaluate((d) => {
      const api = window.__game!.gatefall!;
      const t = window.__game!.tuning;
      const slide = (n: number) => (n === 0 ? 0 : Math.min(t.gfSlideMaxMs, n * t.gfSlideMsPerCell));
      const formula = (events: GatefallEvent[]) => {
        const far = new Map<number, number>();
        const chains = new Set<number>();
        let entered = false;
        let vented = false;
        for (const e of events) {
          if (e.type === 'move') {
            const n = Math.abs(e.to.x - e.from.x) + Math.abs(e.to.y - e.from.y);
            far.set(e.chain, Math.max(far.get(e.chain) ?? 0, n));
          }
          if (e.type === 'enter') entered = true;
          if (e.type === 'vent') vented = true;
          if (e.type === 'clusterClear') chains.add(e.chain);
        }
        let total = slide(far.get(0) ?? 0) + (entered ? t.gfEnterMs : 0) + (vented ? t.gfVentMs : 0);
        for (const c of chains) total += t.gfClearPrepMs + t.gfClearMs + slide(far.get(c) ?? 0) + t.gfChainPauseMs;
        return total;
      };

      const mismatches: string[] = [];
      let tilts = 0;
      let withVent = 0;
      for (let seed = 1; seed <= 60; seed += 1) {
        const sim = api.createSim(seed % 3, seed);
        const random = window.__qaBots!.rng(seed);
        while (sim.getState().status === 'playing') {
          const valid = sim.validTilts();
          const r = sim.tilt(valid[random.int(valid.length)]);
          tilts += 1;
          if (r.animMs !== formula(r.events)) mismatches.push(`seed ${seed}: ${r.animMs}`);
          if (sim.getState().lastAnimMs !== r.animMs) mismatches.push(`seed ${seed}: lastAnimMs`);
        }
      }
      for (const data of window.__qaC4!.denseFixtures()) {
        const sim = api.createSim(0, 3, data);
        for (const dir of sim.validTilts()) {
          const copy = api.createSim(0, 3, data);
          const r = copy.tilt(dir);
          if (r.events.some((e) => e.type === 'vent')) withVent += 1;
          if (r.animMs !== formula(r.events)) mismatches.push(`dense ${dir}: ${r.animMs}`);
        }
      }
      const rejected = api.createSim(0, 1, { board: d.f1.board.map((row) => row.map(() => null)), gates: d.f1.gates });
      return {
        mismatches, tilts, withVent,
        f1: api.createSim(0, 1, d.f1).tilt('down').animMs,
        capped: api.createSim(0, 1, d.capped).tilt('down').animMs,
        entered: api.createSim(0, 1, d.entered).tilt('down').animMs,
        f4: api.createSim(0, 1, d.f4).tilt('down').animMs,
        rejected: rejected.tilt('down').animMs,
      };
    }, data);
    expect(result.mismatches).toEqual([]);
    expect(result.tilts).toBeGreaterThan(500);
    expect(result.withVent).toBeGreaterThan(0);
    expect(result.f1).toBe(180); // The piece at y=1 moves 4 cells: 4 * 45.
    expect(result.capped).toBe(220); // 6 * 45 = 270, capped by gfSlideMaxMs.
    expect(result.entered).toBe(120); // Nothing slides, one piece enters.
    expect(result.rejected).toBe(0);
    // F4: first slide 1 cell (45). Chain 1: 60 + 180 + slide 1 (45) + 80. Chain 2: 60 + 180 + no slide + 80.
    expect(result.f4).toBe(45 + 365 + 320);
  });

  test('C4.2 preview(false) không phụ thuộc nội dung cửa', async ({ page }) => {
    const result = await page.evaluate(() => {
      const qa = window.__qaC4!;
      const api = window.__game!.gatefall!;
      const random = window.__qaBots!.rng(0xc42);
      const problems: string[] = [];
      let compared = 0;
      let differentGates = 0;
      for (const { level, seed, moves } of qa.randomStates(200)) {
        const state = qa.replay(level, seed, moves).getState();
        const randomGates = () => {
          const gates = {} as Gates;
          for (const dir of qa.dirs) {
            gates[dir] = Array.from({ length: state.boardSize }, () =>
              (random.int(2) === 0 ? null : random.int(state.colorCount)));
          }
          return gates;
        };
        const make = (gates: Gates) => api.createSim(level, seed, {
          board: state.board, gates, tiltsLeft: state.tiltsLeft, collected: state.collected,
        });
        const gatesA = randomGates();
        const gatesB = randomGates();
        if (JSON.stringify(gatesA) !== JSON.stringify(gatesB)) differentGates += 1;
        const a = make(gatesA);
        const b = make(gatesB);
        const real = qa.replay(level, seed, moves);
        for (const dir of qa.dirs) {
          if (!qa.refNoGates(state.board, dir, state.colorCount).valid) continue;
          compared += 1;
          const pa = a.preview(dir, { useGates: false });
          const pb = b.preview(dir, { useGates: false });
          const pr = real.preview(dir, { useGates: false });
          if (JSON.stringify(pa) !== JSON.stringify(pb) || JSON.stringify(pa) !== JSON.stringify(pr)) {
            problems.push(`L${level} S${seed} ${dir}: ${JSON.stringify([pa, pb, pr])}`);
          }
        }
      }
      return { problems, compared, differentGates };
    });
    expect(result.problems).toEqual([]);
    expect(result.differentGates).toBe(200);
    expect(result.compared).toBeGreaterThan(400);
  });

  for (const level of [0, 1, 2]) {
    test(`C4.3 và C4.4 màn ${level + 1}: dưới 5% trên 1000 bàn khởi tạo`, async ({ page }) => {
      const result = await page.evaluate((levelIndex) => {
        const api = window.__game!.gatefall!;
        const dirs: Dir[] = ['up', 'right', 'down', 'left'];
        let noValid = 0;
        let noClear = 0;
        let boards = 0;
        for (let seed = 5000; seed <= 5999; seed += 1) {
          const sim = api.createSim(levelIndex, seed);
          boards += 1;
          if (sim.validTilts().length === 0) noValid += 1;
          if (dirs.every((dir) => sim.preview(dir, { useGates: true }).cleared === 0)) noClear += 1;
        }
        return { boards, noValid, noClear };
      }, level);
      console.log(`C4.3/C4.4 màn ${level + 1}: không có nước ${result.noValid}/1000, không nổ ${result.noClear}/1000`);
      expect(result.boards).toBe(1000);
      expect(result.noValid).toBeLessThan(50);
      expect(result.noClear).toBeLessThan(50);
    });
  }

  for (const level of [0, 1, 2]) {
    test(`C4.9 màn ${level + 1}: bot G thắng với seed mặc định`, async ({ page }) => {
      const result = await page.evaluate((levelIndex) => {
        const t = window.__game!.tuning;
        const seed = [t.gfL1Seed, t.gfL2Seed, t.gfL3Seed][levelIndex];
        return { seed, game: window.__qaBots!.run({ levels: [levelIndex], seeds: [seed], bots: ['G'] })[levelIndex].G[0] };
      }, level);
      expect(result.game.anomaly).toBeNull();
      expect(result.game.won, `seed ${result.seed}: ${JSON.stringify(result.game)}`).toBe(true);
    });
  }

  test('Bot: điểm số, phạt xả, phá hòa và fallback của B2 đúng định nghĩa', async ({ page }) => {
    const result = await page.evaluate(() => {
      const bots = window.__qaBots!;
      const p = (valid: boolean, useful: number, cleared: number, wouldVent: boolean) => ({ valid, useful, cleared, wouldVent });
      const stub = (valid: Dir[], gated: Partial<Record<Dir, GatefallPreview>>, plain: Partial<Record<Dir, GatefallPreview>>) => ({
        validTilts: () => valid,
        preview: (dir: Dir, { useGates }: { useGates: boolean }) =>
          (useGates ? gated : plain)[dir] ?? p(false, 0, 0, false),
      });
      const fixedRng = (value: number) => ({ int: (n: number) => Math.min(value, n - 1) });

      const vent = stub(['up', 'down'], { up: p(true, 3, 3, true), down: p(true, 1, 3, false) }, {});
      const gateOnly = stub(['up', 'left'], {}, { left: p(true, 0, 0, false) });
      const allGateOnly = stub(['up', 'right'], {}, {});
      const tie = stub(['up', 'right', 'down'], {
        up: p(true, 1, 0, false), right: p(true, 1, 0, false), down: p(true, 0, 0, false),
      }, {});
      const first = bots.rng(123);
      const second = bots.rng(123);
      return {
        scoreVent: bots.score(p(true, 2, 5, true), true),
        scoreNoPenalty: bots.score(p(true, 2, 5, true), false),
        gAvoids: bots.choose(vent, 'G', fixedRng(0)),
        g0Takes: bots.choose(vent, 'G0', fixedRng(0)),
        bPicksFirstOfTie: bots.choose(gateOnly, 'B', fixedRng(0)),
        b2SkipsGateOnly: bots.choose(gateOnly, 'B2', fixedRng(0)),
        b2Fallback: bots.choose(allGateOnly, 'B2', fixedRng(1)),
        tie0: bots.choose(tie, 'G', fixedRng(0)),
        tie1: bots.choose(tie, 'G', fixedRng(1)),
        none: bots.choose(stub([], {}, {}), 'G', fixedRng(0)),
        rngRepeat: [first.int(1000), first.int(1000)].join() === [second.int(1000), second.int(1000)].join(),
      };
    });
    expect(result.scoreVent).toBe(-5);
    expect(result.scoreNoPenalty).toBe(25);
    expect(result.gAvoids).toBe('down'); // up: 10*3 + 3 - 30 = 3, down: 10 + 3 = 13.
    expect(result.g0Takes).toBe('up');
    expect(result.bPicksFirstOfTie).toBe('up');
    expect(result.b2SkipsGateOnly).toBe('left');
    expect(result.b2Fallback).toBe('right');
    expect(result.tie0).toBe('up');
    expect(result.tie1).toBe('right');
    expect(result.none).toBeNull();
    expect(result.rngRepeat).toBe(true);
  });

  test('Bot: chạy lại cho kết quả giống hệt, không có ván bất thường', async ({ page }) => {
    const result = await page.evaluate((bots) => {
      const args = { levels: [0, 1, 2], seeds: [11, 12, 13, 14, 15, 16, 17, 18], bots };
      const a = window.__qaBots!.run(args);
      const b = window.__qaBots!.run(args);
      return { same: JSON.stringify(a) === JSON.stringify(b), a };
    }, [...BOTS]);
    expect(result.same).toBe(true);
    const games = Object.values(result.a).flatMap((byBot) => Object.values(byBot).flat());
    expect(games).toHaveLength(3 * 8 * BOTS.length);
    expect(games.filter((game) => game.anomaly !== null)).toEqual([]);
  });

  test('Thống kê: khoảng tin cậy, phân vị và ngưỡng đúng công thức C4.6', async () => {
    const games = (wins: number[]) => wins.map((won, seed) => fakeGame(seed, won === 1));
    const diff = pairedDiff(games([1, 1, 1, 0]), games([0, 1, 0, 0]));
    const sd = Math.sqrt(((1 - 0.5) ** 2 * 2 + 0.5 ** 2 * 2) / 3);
    expect(diff.gapPts).toBeCloseTo(50, 10);
    expect(diff.lowerPts).toBeCloseTo((0.5 - (1.96 * sd) / 2) * 100, 10);
    expect(() => pairedDiff(games([1]), [fakeGame(9, true)])).toThrow();

    expect(percentile([5, 1, 3, 2, 4], 50)).toBe(3);
    expect(percentile(seedRange([1, 10]), 10)).toBe(1);
    expect(percentile(seedRange([1, 10]), 90)).toBe(9);
    expect(percentile([], 50)).toBeNull();

    const level = (G: number, B: number, R: number) => ({ G, G0: G, B, B2: B, R });
    const pass = judge(fakeResults(100, [level(70, 55, 40), level(70, 55, 40), level(70, 55, 40)]));
    expect(pass).toMatchObject({ c45: true, c46: true, c46B2: true, c47: true, gatePass: true, unstable: false });
    // A gap of exactly 10 points meets ">= 10"; 9 does not.
    expect(judge(fakeResults(100, [level(70, 60, 40), level(70, 60, 40), level(70, 60, 40)])).c46).toBe(true);
    expect(judge(fakeResults(100, [level(70, 61, 40), level(70, 61, 40), level(70, 61, 40)])).c46).toBe(false);
    // The pooled gap passes but one level is not above 0.
    expect(judge(fakeResults(100, [level(90, 60, 40), level(70, 55, 40), level(50, 50, 40)])).c46).toBe(false);
    // G outside [0.40, 0.95] on one level.
    expect(judge(fakeResults(100, [level(96, 60, 40), level(70, 55, 40), level(70, 55, 40)])).c47).toBe(false);
    expect(judge(fakeResults(100, [level(39, 20, 10), level(70, 55, 40), level(70, 55, 40)])).c47).toBe(false);
    // Passes with B, fails with B2: reported as not robust.
    const control = fakeResults(100, [level(70, 55, 40), level(70, 55, 40), level(70, 55, 40)]);
    for (const l of [0, 1, 2]) control[l].B2 = control[l].G.map((game) => ({ ...game }));
    expect(judge(control)).toMatchObject({ c46: true, c46B2: false, unstable: true });
  });

  test('Ghi đè tuning trong trang có tác dụng với createSim', async ({ page }) => {
    const result = await page.evaluate(() => {
      const game = window.__game!;
      const original = game.tuning.gfL1TiltLimit;
      game.tuning.gfL1TiltLimit = original + 3;
      const changed = game.gatefall!.createSim(0, 1).getState().tiltLimit;
      game.tuning.gfL1TiltLimit = original;
      return { original, changed, restored: game.gatefall!.createSim(0, 1).getState().tiltLimit };
    });
    expect(result.changed).toBe(result.original + 3);
    expect(result.restored).toBe(result.original);
  });
});
