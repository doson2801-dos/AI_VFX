import { expect, test, type Page } from '@playwright/test';
import type { Dir, GatefallEvent, GatefallFixture } from '../src/game/gatefallLogic';
import type { GatefallState } from '../src/scenes/GatefallScene';

/**
 * Gatefall acceptance tests. Expectations come from section 8 of docs/briefs/gatefall.md.
 * `__qaGf` is an independent implementation of sections 4.3, 4.5 and 4.6, so the game is not checked against itself.
 * No hash value is pinned: hashes change in C2 when gates start drawing from the RNG.
 */

type Board = (number | null)[][];

interface RefResolve {
  valid: boolean;
  board: Board;
  chains: number;
  cleared: number[];
}

interface QaLib {
  dirs: Dir[];
  rng(seed: number): { next(): number; int(n: number): number };
  streamSeed(seed: number, k: number): number;
  board(seed: number, size: number, pieces: number, colors: number): Board;
  components(board: Board): number[];
  resolve(board: Board, dir: Dir, colors: number): RefResolve;
  hash(text: string): string;
  eventProblem(events: GatefallEvent[], stateHash: string): string | null;
}

declare global {
  interface Window {
    __qaGf?: QaLib;
    __qaClock?: { finishAnim(): void };
  }
}

const COIN_HOP_KEYS = ['coins', 'elapsedMs', 'grounded', 'status', 'totalCoins', 'vx', 'vy', 'x', 'y'];
const SIZE = 7;
const SEEDS = 200;
const LEVELS = [0, 1, 2];
const MAX_MOVES = 30;

const installQaLib = () => {
  const dirs: Dir[] = ['up', 'right', 'down', 'left'];
  const rng = (seed: number) => {
    let state = seed >>> 0;
    const next = () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return { next, int: (n: number) => Math.floor(next() * n) };
  };
  const streamSeed = (seed: number, k: number) => (seed + Math.imul(k + 1, 0x9e3779b9)) >>> 0;

  /** Sizes of all same-color 4-connected components. */
  const groups = (board: Board) => {
    const size = board.length;
    const seen = new Set<number>();
    const result: number[][] = [];
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const color = board[y][x];
        if (color === null || seen.has(y * size + x)) continue;
        const stack = [y * size + x];
        const group: number[] = [];
        seen.add(y * size + x);
        while (stack.length > 0) {
          const index = stack.pop()!;
          group.push(index);
          const cx = index % size;
          const cy = Math.floor(index / size);
          for (const [nx, ny] of [[cx, cy - 1], [cx + 1, cy], [cx, cy + 1], [cx - 1, cy]]) {
            if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
            const key = ny * size + nx;
            if (board[ny][nx] === color && !seen.has(key)) {
              seen.add(key);
              stack.push(key);
            }
          }
        }
        result.push(group);
      }
    }
    return result;
  };

  const generate = (seed: number, size: number, pieces: number, colors: number) => {
    const random = rng(streamSeed(seed, 0));
    const order = Array.from({ length: size * size }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = random.int(i + 1);
      [order[i], order[j]] = [order[j], order[i]];
    }
    const board: Board = Array.from({ length: size }, () => new Array<number | null>(size).fill(null));
    for (const index of order.slice(0, pieces).sort((a, b) => a - b)) {
      const x = index % size;
      const y = Math.floor(index / size);
      let color = random.int(colors);
      for (;;) {
        board[y][x] = color;
        if (!groups(board).some((group) => group.length >= 3)) break;
        color = (color + 1) % colors;
      }
    }
    return board;
  };

  const laneCells = (dir: Dir, lane: number, size: number) => {
    const cells: [number, number][] = [];
    for (let depth = 0; depth < size; depth += 1) {
      const far = size - 1 - depth;
      if (dir === 'up') cells.push([lane, depth]);
      if (dir === 'down') cells.push([lane, far]);
      if (dir === 'left') cells.push([depth, lane]);
      if (dir === 'right') cells.push([far, lane]);
    }
    return cells;
  };

  const slid = (board: Board, dir: Dir) => {
    const size = board.length;
    const next: Board = board.map((row) => row.map(() => null));
    for (let lane = 0; lane < size; lane += 1) {
      const cells = laneCells(dir, lane, size);
      const values = cells.map(([x, y]) => board[y][x]).filter((value) => value !== null);
      values.forEach((value, i) => {
        const [x, y] = cells[i];
        next[y][x] = value;
      });
    }
    return next;
  };

  const resolve = (start: Board, dir: Dir, colors: number): RefResolve => {
    const cleared = new Array<number>(colors).fill(0);
    let board = slid(start, dir);
    const valid = JSON.stringify(board) !== JSON.stringify(start);
    if (!valid) return { valid, board: start, chains: 0, cleared };
    let chains = 0;
    for (;;) {
      const clusters = groups(board).filter((group) => group.length >= 3);
      if (clusters.length === 0) break;
      const size = board.length;
      const next = board.map((row) => [...row]);
      for (const cluster of clusters) {
        cleared[board[Math.floor(cluster[0] / size)][cluster[0] % size]!] += cluster.length;
        for (const index of cluster) next[Math.floor(index / size)][index % size] = null;
      }
      board = slid(next, dir);
      chains += 1;
    }
    return { valid, board, chains, cleared };
  };

  const hash = (text: string) => {
    let value = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
      value ^= text.charCodeAt(i);
      value = Math.imul(value, 0x01000193);
    }
    return (value >>> 0).toString(16).padStart(8, '0');
  };

  const scan = (cell: { x: number; y: number }) => cell.y * 1000 + cell.x;

  /** Checks seq, first and last event, the phase order of section 4.7 and scan order. */
  const eventProblem = (events: GatefallEvent[], stateHash: string) => {
    if (events.length < 2) return 'too few events';
    for (let i = 0; i < events.length; i += 1) if (events[i].seq !== i) return `seq break at ${i}`;
    const first = events[0];
    const last = events[events.length - 1];
    if (first.type !== 'tiltStart') return `first is ${first.type}`;
    if (last.type !== 'turnEnd') return `last is ${last.type}`;
    if (last.stateHash !== stateHash) return 'turnEnd.stateHash differs from stateHash';
    if (events.filter((e) => e.type === 'tiltStart' || e.type === 'turnEnd').length !== 2) return 'extra start or end';

    let chain = 0;
    let phase: 'move' | 'clear' = 'move';
    let clusterIndex = -1;
    let lastMove = -1;
    let lastCluster = -1;
    for (const event of events.slice(1, -1)) {
      if (event.type === 'clusterClear') {
        if (phase === 'move') {
          if (event.chain !== chain + 1) return `chain jump to ${event.chain}`;
          chain = event.chain;
          phase = 'clear';
          clusterIndex = -1;
          lastCluster = -1;
        }
        if (event.chain !== chain) return 'cluster chain mismatch';
        if (event.clusterIndex !== clusterIndex + 1) return 'clusterIndex not continuous';
        clusterIndex = event.clusterIndex;
        if (event.cells.length < 3) return 'cluster under 3 cells';
        const order = event.cells.map(scan);
        if (order.some((value, i) => i > 0 && value <= order[i - 1])) return 'cluster cells not in scan order';
        if (order[0] <= lastCluster) return 'clusters not ordered by first cell';
        lastCluster = order[0];
      } else if (event.type === 'move') {
        if (phase === 'clear') {
          phase = 'move';
          lastMove = -1;
        }
        if (event.chain !== chain) return `move chain ${event.chain} during chain ${chain}`;
        if (scan(event.from) <= lastMove) return 'moves not in scan order of from';
        lastMove = scan(event.from);
      }
    }
    return null;
  };

  window.__qaGf = {
    dirs,
    rng,
    streamSeed,
    board: generate,
    components: (board) => groups(board).map((group) => group.length),
    resolve,
    hash,
    eventProblem,
  };
};

const emptyGates = (): Record<Dir, (number | null)[]> => ({
  up: new Array<number | null>(SIZE).fill(null),
  right: new Array<number | null>(SIZE).fill(null),
  down: new Array<number | null>(SIZE).fill(null),
  left: new Array<number | null>(SIZE).fill(null),
});

const fixture = (cells: [number, number, number][], extra: Partial<GatefallFixture> = {}): GatefallFixture => {
  const board: Board = Array.from({ length: SIZE }, () => new Array<number | null>(SIZE).fill(null));
  for (const [x, y, color] of cells) board[y][x] = color;
  return { board, gates: emptyGates(), ...extra };
};

const F1 = () => fixture([[2, 1, 0], [2, 4, 1]]);
const F2 = () => fixture([[0, 5, 1], [1, 6, 1], [2, 5, 1], [4, 5, 0], [5, 6, 0], [6, 5, 0]]);
const F3 = () => fixture([[2, 5, 0], [3, 3, 0], [3, 4, 0], [4, 5, 0]]);
const F4 = () => fixture([[0, 4, 2], [0, 5, 0], [1, 4, 1], [1, 5, 0], [2, 4, 1], [2, 5, 0], [3, 5, 1]]);

const countPieces = (board: Board) => board.flat().filter((cell) => cell !== null).length;
const clears = (events: GatefallEvent[]) =>
  events.filter((e): e is Extract<GatefallEvent, { type: 'clusterClear' }> => e.type === 'clusterClear');

const openGatefall = async (page: Page) => {
  await page.addInitScript(installQaLib);
  await page.goto('/?game=gatefall');
  await page.waitForFunction(() => {
    const state = window.__game?.getState<GatefallState>();
    return state?.gameId === 'gatefall' && state.status === 'playing' && Boolean(window.__game?.gatefall);
  });
};

const readState = (page: Page) => page.evaluate(() => window.__game!.getState<GatefallState>()!);

const simTilt = (page: Page, data: GatefallFixture, dir: Dir = 'down') =>
  page.evaluate(([fx, d]) => {
    const sim = window.__game!.gatefall!.createSim(0, 101, fx as GatefallFixture);
    const before = sim.getState();
    const result = sim.tilt(d as Dir);
    return { before, result, after: sim.getState() };
  }, [data, dir] as const);

const sceneTilt = (page: Page, data: GatefallFixture, dir: Dir = 'down') =>
  page.evaluate(([fx, d]) => {
    const api = window.__game!.gatefall!;
    api.loadFixture(fx as GatefallFixture);
    const accepted = api.tilt(d as Dir);
    return { accepted, after: window.__game!.getState<GatefallState>()! };
  }, [data, dir] as const);

/**
 * C5.3 locks input during playback, and the lock follows performance.now. Tests that play a whole game through the
 * scene jump the clock past each playback, so they still go through the real lock without waiting for it.
 */
const installQaClock = () => {
  if (window.__qaClock) return;
  const realNow = performance.now.bind(performance);
  let skew = 0;
  performance.now = () => realNow() + skew;
  window.__qaClock = {
    finishAnim() {
      const state = window.__game!.getState<GatefallState>()!;
      if (!state.animating) return;
      skew += state.lastAnimMs + 1;
      if (window.__game!.getState<GatefallState>()!.animating) throw new Error('playback did not end after lastAnimMs');
    },
  };
};

const waitUnlocked = (page: Page) =>
  page.waitForFunction(() => window.__game?.getState<GatefallState>()?.animating === false);

const settleFrames = (page: Page) =>
  page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));

let problems: string[] = [];

test.beforeEach(({ page }) => {
  problems = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
  });
});

test.afterEach(() => {
  expect(problems, 'không có lỗi console hoặc lỗi trang').toEqual([]);
});

test.describe('Gatefall C1: route', () => {
  test('C1.1 mở / vẫn là Coin Hop đúng 9 trường', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__game?.getState()?.status === 'playing');
    const state = await page.evaluate(() => window.__game!.getState()!);
    expect(state).not.toHaveProperty('gameId');
    expect(state.totalCoins).toBe(3);
    expect(Object.keys(state).sort()).toEqual(COIN_HOP_KEYS);
    expect(await page.evaluate(() => window.__game!.gatefall)).toBeUndefined();
  });

  test('C1.2 tham số game không hợp lệ mở Coin Hop', async ({ page }) => {
    await page.goto('/?game=khac');
    await page.waitForFunction(() => window.__game?.getState()?.status === 'playing');
    const state = await page.evaluate(() => window.__game!.getState()!);
    expect(state).not.toHaveProperty('gameId');
    expect(state.totalCoins).toBe(3);
    expect(Object.keys(state).sort()).toEqual(COIN_HOP_KEYS);
  });

  test('C1.2 game=arc-relay vẫn mở Arc Relay', async ({ page }) => {
    await page.goto('/?game=arc-relay');
    await page.waitForFunction(() => window.__game?.getState()?.status === 'playing');
    const state = await page.evaluate(() => window.__game!.getState()! as unknown as { gameId?: string });
    expect(state.gameId).toBe('arc-relay');
    expect(await page.evaluate(() => window.__game!.gatefall)).toBeUndefined();
  });

  test('C1.3 mở Gatefall có trạng thái đầu đúng', async ({ page }) => {
    await openGatefall(page);
    const state = await readState(page);
    expect(state.gameId).toBe('gatefall');
    expect(state.status).toBe('playing');
    expect(state.levelIndex).toBe(0);
    expect(state.levelCount).toBe(3);
    expect(state.boardSize).toBe(7);
    expect(state.tiltsUsed).toBe(0);
    expect(state.stateHash).toMatch(/^[0-9a-f]{8}$/);
    await settleFrames(page);
    await page.screenshot({ path: 'artifacts/gatefall-c1-start.png' });
  });

  test('C1.3 getState có đủ các trường trong mục 8', async ({ page }) => {
    await openGatefall(page);
    const state = await readState(page);
    for (const key of [
      'gameId', 'status', 'loseReason', 'levelIndex', 'levelCount', 'campaignComplete', 'seed', 'boardSize',
      'colorCount', 'waveSize', 'board', 'gates', 'goals', 'collected', 'tiltLimit', 'tiltsLeft', 'tiltsUsed',
      'rejectedTilts', 'ventCount', 'validTilts', 'lastTiltDir', 'lastChain', 'lastEvents', 'lastAnimMs',
      'animating', 'endLockLeftMs', 'viewCounts', 'rejectFeedbacks', 'stateHash',
    ]) expect(state, key).toHaveProperty(key);
  });
});

test.describe('Gatefall C1: khởi tạo', () => {
  for (const level of LEVELS) {
    test(`C1.4 màn ${level + 1}: 200 seed đúng số quân, màu hợp lệ, không có cụm`, async ({ page }) => {
      await openGatefall(page);
      const bad = await page.evaluate(([lv, seeds]) => {
        const tuning = window.__game!.tuning as unknown as Record<string, number>;
        const out: string[] = [];
        for (let seed = 1; seed <= seeds; seed += 1) {
          const s = window.__game!.gatefall!.createSim(lv, seed).getState();
          const cells = s.board.flat().filter((c): c is number => c !== null);
          if (cells.length !== tuning.gfInitialPieces) out.push(`seed ${seed}: ${cells.length} quân`);
          if (s.colorCount !== tuning[`gfL${lv + 1}Colors`]) out.push(`seed ${seed}: colorCount ${s.colorCount}`);
          if (cells.some((c) => !Number.isInteger(c) || c < 0 || c >= s.colorCount)) out.push(`seed ${seed}: màu sai`);
          if (window.__qaGf!.components(s.board).some((n) => n >= 3)) out.push(`seed ${seed}: có cụm 3+`);
        }
        return out;
      }, [level, SEEDS] as const);
      expect(bad).toEqual([]);
    });

    test(`Mục 4.5 màn ${level + 1}: bàn khớp bộ sinh độc lập trên 200 seed`, async ({ page }) => {
      await openGatefall(page);
      const result = await page.evaluate(([lv, seeds]) => {
        const tuning = window.__game!.tuning as unknown as Record<string, number>;
        const out: number[] = [];
        const distinct = new Set<string>();
        for (let seed = 1; seed <= seeds; seed += 1) {
          const s = window.__game!.gatefall!.createSim(lv, seed).getState();
          const expected = window.__qaGf!.board(seed, s.boardSize, tuning.gfInitialPieces, s.colorCount);
          if (JSON.stringify(expected) !== JSON.stringify(s.board)) out.push(seed);
          distinct.add(JSON.stringify(s.board));
        }
        return { out, distinct: distinct.size };
      }, [level, SEEDS] as const);
      expect(result.out).toEqual([]);
      expect(result.distinct).toBe(SEEDS);
    });
  }

  test('Mục 4.5 logic không gọi Math.random hay đồng hồ khi chạy', async ({ page }) => {
    await openGatefall(page);
    const calls = await page.evaluate(() => {
      const saved = { random: Math.random, now: Date.now, perf: performance.now };
      let count = 0;
      const spy = () => {
        count += 1;
        return 0.5;
      };
      Math.random = spy;
      Date.now = spy;
      performance.now = spy;
      try {
        for (let seed = 1; seed <= 20; seed += 1) {
          const sim = window.__game!.gatefall!.createSim(0, seed);
          for (let i = 0; i < 10; i += 1) {
            const valid = sim.validTilts();
            if (valid.length === 0) break;
            sim.tilt(valid[i % valid.length]);
            sim.getState();
          }
        }
      } finally {
        Math.random = saved.random;
        Date.now = saved.now;
        performance.now = saved.perf;
      }
      return count;
    });
    expect(calls).toBe(0);
  });

  test('Yêu cầu kỹ thuật: module logic không import Phaser, không đọc DOM', async ({ page }) => {
    const response = await page.request.get('/src/game/gatefallLogic.ts?raw');
    expect(response.ok()).toBe(true);
    const literal = (await response.text()).match(/export default (".*")/s);
    expect(literal, 'Vite trả về mã nguồn thô').not.toBeNull();
    const raw = JSON.parse(literal![1]) as string;
    expect(raw).toContain('class GatefallGame');
    const source = raw
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(source).not.toMatch(/from\s+['"]phaser['"]/i);
    expect(source).not.toMatch(/\b(window|document|navigator|localStorage)\b/);
    expect(source).not.toMatch(/Math\.random|Date\.now|performance\.now/);
  });
});

test.describe('Gatefall C1: trượt và cụm', () => {
  for (const via of ['sim', 'scene'] as const) {
    const run = async (page: Page, data: GatefallFixture) => {
      if (via === 'sim') {
        const { result, after } = await simTilt(page, data);
        return { accepted: result.accepted, after };
      }
      return sceneTilt(page, data);
    };

    test(`C1.5 F1 qua ${via}: hai quân dồn xuống, giữ thứ tự`, async ({ page }) => {
      await openGatefall(page);
      const { accepted, after } = await run(page, F1());
      expect(accepted).toBe(true);
      expect(after.board[6][2]).toBe(1);
      expect(after.board[5][2]).toBe(0);
      expect(countPieces(after.board)).toBe(2);
    });

    test(`C1.6 F2 qua ${via}: hai cụm nổ cùng lúc`, async ({ page }) => {
      await openGatefall(page);
      const { after } = await run(page, F2());
      const clusters = clears(after.lastEvents);
      expect(after.lastChain).toBe(1);
      expect(clusters).toHaveLength(2);
      expect(clusters.find((c) => c.clusterIndex === 0)?.color).toBe(1);
      expect(after.collected[0]).toBe(3);
      expect(after.collected[1]).toBe(3);
      expect(countPieces(after.board)).toBe(0);
    });

    test(`C1.7 F3 qua ${via}: cụm chữ T 4 ô tính một lần`, async ({ page }) => {
      await openGatefall(page);
      const { after } = await run(page, F3());
      const clusters = clears(after.lastEvents);
      expect(clusters).toHaveLength(1);
      expect(clusters[0].cells).toHaveLength(4);
      expect(after.collected[0]).toBe(4);
      expect(countPieces(after.board)).toBe(0);
    });

    test(`C1.8 F4 qua ${via}: cascade 2 bước`, async ({ page }) => {
      await openGatefall(page);
      const { after } = await run(page, F4());
      expect(after.lastChain).toBe(2);
      expect(after.collected[0]).toBe(3);
      expect(after.collected[1]).toBe(3);
      expect(after.board[6][0]).toBe(2);
      expect(countPieces(after.board)).toBe(1);
      expect(clears(after.lastEvents).map((c) => c.chain)).toEqual([1, 2]);
    });
  }

  test('Hai quân cùng màu không thành cụm', async ({ page }) => {
    await openGatefall(page);
    const { after } = await simTilt(page, fixture([[0, 0, 1], [1, 0, 1]]));
    expect(after.lastChain).toBe(0);
    expect(clears(after.lastEvents)).toHaveLength(0);
    expect(after.collected).toEqual([0, 0, 0, 0]);
    expect(countPieces(after.board)).toBe(2);
  });

  test('Ba quân chéo nhau không thành cụm 4 hướng', async ({ page }) => {
    await openGatefall(page);
    const diagonal = fixture([[0, 6, 1], [1, 5, 1], [2, 6, 1], [1, 6, 0]]);
    const { after } = await simTilt(page, diagonal, 'left');
    expect(after.collected[1]).toBe(0);
  });

  test('Mục 4.3 bốn hướng khớp mô hình độc lập trên bàn sinh và bàn dày', async ({ page }) => {
    await openGatefall(page);
    const result = await page.evaluate(([seeds, size]) => {
      const qa = window.__qaGf!;
      const api = window.__game!.gatefall!;
      const gates = () => ({
        up: new Array(size).fill(null), right: new Array(size).fill(null),
        down: new Array(size).fill(null), left: new Array(size).fill(null),
      });
      const failures: string[] = [];
      let cases = 0;
      let cascades = 0;
      for (let level = 0; level < 3; level += 1) {
        for (let seed = 1; seed <= seeds; seed += 1) {
          const generated = api.createSim(level, seed).getState();
          const random = qa.rng(seed * 31 + level);
          const dense = generated.board.map((row) => row.map(() =>
            (random.next() < 0.72 ? random.int(3) : null)));
          for (const board of [generated.board, dense]) {
            for (const dir of qa.dirs) {
              const sim = api.createSim(level, seed, { board, gates: gates() });
              const expected = qa.resolve(board, dir, generated.colorCount);
              const { accepted } = sim.tilt(dir);
              const s = sim.getState();
              cases += 1;
              if (expected.chains > 1) cascades += 1;
              const same = accepted === expected.valid
                && JSON.stringify(s.board) === JSON.stringify(expected.board)
                && JSON.stringify(s.collected) === JSON.stringify(expected.cleared)
                && (!accepted || s.lastChain === expected.chains);
              if (!same) failures.push(`L${level} seed ${seed} ${dir}`);
            }
          }
        }
      }
      return { failures: failures.slice(0, 10), failed: failures.length, cases, cascades };
    }, [SEEDS, SIZE] as const);
    expect(result.failures).toEqual([]);
    expect(result.failed).toBe(0);
    expect(result.cases).toBe(SEEDS * 3 * 2 * 4);
    expect(result.cascades, 'bộ dữ liệu phải thực sự có cascade').toBeGreaterThan(0);
  });
});

test.describe('Gatefall C1: từ chối', () => {
  const corner = () => fixture([[0, 6, 0]]);

  test('C1.9 nghiêng không làm bàn đổi thì bị từ chối', async ({ page }) => {
    await openGatefall(page);
    const { before, result, after } = await simTilt(page, corner());
    expect(result.accepted).toBe(false);
    expect(after.stateHash).toBe(before.stateHash);
    expect(after.tiltsLeft).toBe(before.tiltsLeft);
    expect(after.tiltsUsed).toBe(before.tiltsUsed);
    expect(after.rejectedTilts).toBe(before.rejectedTilts + 1);
    expect(after.board).toEqual(before.board);
    expect(after.gates).toEqual(before.gates);
    expect(result.events).toEqual([{ seq: 0, type: 'tiltRejected', dir: 'down' }]);
    expect(after.lastEvents).toEqual(result.events);
    expect(after.validTilts).toEqual(['up', 'right']);
  });

  test('C1.9 qua scene: tilt trả false, trạng thái giữ nguyên', async ({ page }) => {
    await openGatefall(page);
    const result = await page.evaluate((fx) => {
      const api = window.__game!.gatefall!;
      api.loadFixture(fx);
      const before = window.__game!.getState<GatefallState>()!;
      const accepted = api.tilt('down');
      return { before, accepted, after: window.__game!.getState<GatefallState>()! };
    }, corner());
    expect(result.accepted).toBe(false);
    expect(result.after.stateHash).toBe(result.before.stateHash);
    expect(result.after.rejectedTilts).toBe(result.before.rejectedTilts + 1);
  });

  test('C1.9 bấm liên tục 50 lần chỉ tăng rejectedTilts', async ({ page }) => {
    await openGatefall(page);
    const result = await page.evaluate((fx) => {
      const sim = window.__game!.gatefall!.createSim(0, 101, fx);
      const before = sim.getState();
      for (let i = 0; i < 50; i += 1) sim.tilt('down');
      return { before, after: sim.getState() };
    }, corner());
    expect(result.after.rejectedTilts).toBe(50);
    expect(result.after.stateHash).toBe(result.before.stateHash);
    expect(result.after.tiltsLeft).toBe(result.before.tiltsLeft);
  });

  test('Lần từ chối giữ lastTiltDir và lastChain của nước được chấp nhận', async ({ page }) => {
    await openGatefall(page);
    const result = await page.evaluate((fx) => {
      const sim = window.__game!.gatefall!.createSim(0, 101, fx);
      sim.tilt('down');
      const accepted = sim.getState();
      // Brief 4.3 step 7 refills the `down` gate, so `down` stays valid. The `left` gate is still empty
      // and the only piece, (0,6), already rests against the left edge, so `left` is the rejected tilt.
      const rejected = sim.tilt('left');
      return { accepted, rejected, after: sim.getState() };
    }, F4());
    expect(result.accepted.validTilts).toContain('down');
    expect(result.accepted.validTilts).not.toContain('left');
    expect(result.accepted.lastChain).toBe(2);
    expect(result.rejected.accepted).toBe(false);
    expect(result.after.lastTiltDir).toBe('down');
    expect(result.after.lastChain).toBe(result.accepted.lastChain);
    expect(result.after.lastAnimMs).toBe(result.accepted.lastAnimMs);
    expect(result.after.stateHash).toBe(result.accepted.stateHash);
    expect(result.after.lastEvents.map((e) => e.type)).toEqual(['tiltRejected']);
  });

  test('Bàn rỗng và cửa rỗng: cả 4 hướng bị từ chối', async ({ page }) => {
    await openGatefall(page);
    const result = await page.evaluate((fx) => {
      const sim = window.__game!.gatefall!.createSim(0, 101, fx);
      const before = sim.getState();
      const accepted = (['up', 'right', 'down', 'left'] as const).map((d) => sim.tilt(d).accepted);
      return { before, accepted, after: sim.getState() };
    }, fixture([]));
    expect(result.before.validTilts).toEqual([]);
    expect(result.accepted).toEqual([false, false, false, false]);
    expect(result.after.stateHash).toBe(result.before.stateHash);
  });
});

test.describe('Gatefall C1: xác định và sự kiện', () => {
  for (const level of LEVELS) {
    test(`C1.10 và C1.12 màn ${level + 1}: 200 seed, tối đa 30 nước`, async ({ page }) => {
      await openGatefall(page);
      const result = await page.evaluate(([lv, seeds, maxMoves]) => {
        const qa = window.__qaGf!;
        const api = window.__game!.gatefall!;
        const diffs: string[] = [];
        const eventIssues: string[] = [];
        let accepted = 0;
        for (let seed = 1; seed <= seeds; seed += 1) {
          const a = api.createSim(lv, seed);
          const b = api.createSim(lv, seed);
          const picker = qa.rng((seed * 2654435761) >>> 0);
          if (a.getState().stateHash !== b.getState().stateHash) diffs.push(`seed ${seed} bước 0`);
          for (let step = 1; step <= maxMoves; step += 1) {
            const before = a.getState();
            const valid = before.validTilts;
            if (before.status !== 'playing' || valid.length === 0) break;
            const dir = valid[picker.int(valid.length)];
            const ra = a.tilt(dir);
            const rb = b.tilt(dir);
            const sa = a.getState();
            const sb = b.getState();
            if (!ra.accepted || !rb.accepted) {
              eventIssues.push(`seed ${seed} bước ${step}: hướng hợp lệ ${dir} bị từ chối`);
              break;
            }
            accepted += 1;
            if (sa.stateHash !== sb.stateHash
              || JSON.stringify(sa.lastEvents) !== JSON.stringify(sb.lastEvents)) {
              diffs.push(`seed ${seed} bước ${step}`);
            }
            if (JSON.stringify(ra.events) !== JSON.stringify(sa.lastEvents)) {
              eventIssues.push(`seed ${seed} bước ${step}: events khác lastEvents`);
            }
            const problem = qa.eventProblem(sa.lastEvents, sa.stateHash);
            if (problem) eventIssues.push(`seed ${seed} bước ${step}: ${problem}`);
          }
        }
        return { diffs: diffs.slice(0, 10), eventIssues: eventIssues.slice(0, 10), accepted };
      }, [level, SEEDS, MAX_MOVES] as const);
      expect(result.diffs).toEqual([]);
      expect(result.eventIssues).toEqual([]);
      expect(result.accepted, 'phải có nước đi thật').toBeGreaterThan(SEEDS);
    });
  }

  test('C1.11 đổi màu bất kỳ một ô thì stateHash đổi', async ({ page }) => {
    await openGatefall(page);
    const result = await page.evaluate(([size]) => {
      const api = window.__game!.gatefall!;
      const gates = () => ({
        up: new Array(size).fill(null), right: new Array(size).fill(null),
        down: new Array(size).fill(null), left: new Array(size).fill(null),
      });
      const base = Array.from({ length: size }, (_, y) =>
        Array.from({ length: size }, (_, x) => (x + 2 * y) % 4 as number | null));
      const baseHash = api.createSim(0, 101, { board: base, gates: gates() }).getState().stateHash;
      const same: string[] = [];
      const hashes = new Set([baseHash]);
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const board = base.map((row) => [...row]);
          board[y][x] = (base[y][x]! + 1) % 4;
          const hash = api.createSim(0, 101, { board, gates: gates() }).getState().stateHash;
          if (hash === baseHash) same.push(`${x},${y}`);
          hashes.add(hash);
        }
      }
      return { same, distinct: hashes.size };
    }, [SIZE] as const);
    expect(result.same).toEqual([]);
    expect(result.distinct).toBe(SIZE * SIZE + 1);
  });

  test('Mục 4.6 hash khớp công thức của brief trên fixture chưa rút RNG', async ({ page }) => {
    await openGatefall(page);
    const result = await page.evaluate((fx) => {
      const qa = window.__qaGf!;
      const seed = 101;
      const s = window.__game!.gatefall!.createSim(0, seed, fx).getState();
      const encode = (slots: (number | null)[]) => slots.map((c) => (c === null ? '.' : String(c))).join('');
      const text = [
        'v1', 'L0', `S${seed}`, s.status, `T${s.tiltsUsed}/${s.tiltsLeft}`,
        `B${encode(s.board.flat())}`,
        `G${qa.dirs.map((d) => encode(s.gates[d])).join('/')}`,
        `C${s.collected.join(',')}`, `V${s.ventCount}`,
        `R${[0, 1, 2, 3, 4].map((k) => qa.streamSeed(seed, k)).join(',')}`,
      ].join('|');
      return { actual: s.stateHash, expected: qa.hash(text) };
    }, F4());
    expect(result.actual).toBe(result.expected);
  });

  test('Mục 4.6 hash không gồm rejectedTilts', async ({ page }) => {
    await openGatefall(page);
    const result = await page.evaluate((fx) => {
      const api = window.__game!.gatefall!;
      const a = api.createSim(0, 101, fx);
      const b = api.createSim(0, 101, fx);
      a.tilt('down');
      return { a: a.getState(), b: b.getState() };
    }, fixture([[0, 6, 0]]));
    expect(result.a.rejectedTilts).toBe(1);
    expect(result.b.rejectedTilts).toBe(0);
    expect(result.a.stateHash).toBe(result.b.stateHash);
  });
});

test.describe('Gatefall C1: tải lại, cô lập và fixture', () => {
  test('Chơi lại bằng restart và loadLevel về đúng hash đầu màn', async ({ page }) => {
    await openGatefall(page);
    const initial = await readState(page);
    await page.evaluate(() => {
      const state = window.__game!.getState<GatefallState>()!;
      window.__game!.gatefall!.tilt(state.validTilts[0]);
    });
    expect((await readState(page)).tiltsUsed).toBe(1);

    await page.evaluate(() => window.__game!.restart());
    await page.waitForFunction((hash) => {
      const state = window.__game?.getState<GatefallState>();
      return state?.tiltsUsed === 0 && state.stateHash === hash;
    }, initial.stateHash);

    await page.evaluate(() => {
      const state = window.__game!.getState<GatefallState>()!;
      window.__game!.gatefall!.tilt(state.validTilts[0]);
      window.__game!.gatefall!.loadLevel(0);
    });
    const reloaded = await readState(page);
    expect(reloaded.stateHash).toBe(initial.stateHash);
    expect(reloaded.tiltsUsed).toBe(0);
    expect(reloaded.lastTiltDir).toBeNull();
    expect(reloaded.lastEvents).toEqual([]);
  });

  test('loadLevel nạp đúng màn và seed, loadLevel sau fixture bỏ fixture', async ({ page }) => {
    await openGatefall(page);
    const result = await page.evaluate((fx) => {
      const api = window.__game!.gatefall!;
      const read = () => window.__game!.getState<GatefallState>()!;
      api.loadLevel(1);
      const level2 = read();
      api.loadLevel(2, 77);
      const level3 = read();
      const sim3 = api.createSim(2, 77).getState();
      api.loadFixture(fx);
      const fixtureState = read();
      api.loadLevel(0);
      return { level2, level3, sim3, fixtureState, back: read() };
    }, F1());
    expect(result.level2.levelIndex).toBe(1);
    expect(result.level2.seed).toBe(202);
    expect(result.level3.levelIndex).toBe(2);
    expect(result.level3.seed).toBe(77);
    expect(result.level3.stateHash).toBe(result.sim3.stateHash);
    expect(countPieces(result.fixtureState.board)).toBe(2);
    expect(result.back.levelIndex).toBe(0);
    expect(result.back.seed).toBe(101);
    expect(countPieces(result.back.board)).toBe(24);
  });

  test('Sửa object trả về hoặc fixture đã nạp không làm đổi sim', async ({ page }) => {
    await openGatefall(page);
    const result = await page.evaluate((fx) => {
      const sim = window.__game!.gatefall!.createSim(0, 101, fx);
      const before = sim.getState().stateHash;
      fx.board[1][2] = 3;
      fx.gates.down[0] = 1;
      const view = sim.getState();
      view.board[4][2] = 3;
      view.collected[0] = 99;
      view.gates.up[0] = 2;
      return { before, after: sim.getState().stateHash };
    }, F1());
    expect(result.after).toBe(result.before);
  });

  test('Fixture thiếu cửa hoặc sai kích thước bị báo lỗi rõ', async ({ page }) => {
    await openGatefall(page);
    const errors = await page.evaluate((fx) => {
      const api = window.__game!.gatefall!;
      const attempt = (data: unknown) => {
        try {
          api.createSim(0, 101, data as GatefallFixture);
          return 'no error';
        } catch (error) {
          return (error as Error).name;
        }
      };
      return [
        attempt({ ...fx, gates: { ...fx.gates, left: [] } }),
        attempt({ ...fx, board: fx.board.slice(1) }),
        attempt({ ...fx, board: fx.board.map((row) => row.map(() => 9)) }),
      ];
    }, F1());
    expect(errors).toEqual(['RangeError', 'RangeError', 'RangeError']);
  });

  test('Ảnh chụp fixture F4 sau khi nghiêng', async ({ page }) => {
    await openGatefall(page);
    await page.evaluate((fx) => window.__game!.gatefall!.loadFixture(fx), F4());
    await settleFrames(page);
    await page.screenshot({ path: 'artifacts/gatefall-c1-f4-before.png' });
    await page.evaluate(() => window.__game!.gatefall!.tilt('down'));
    await waitUnlocked(page);
    await settleFrames(page);
    const state = await readState(page);
    expect(state.viewCounts.pieces).toBe(1);
    await page.screenshot({ path: 'artifacts/gatefall-c1-f4-after.png' });
  });
});

const readFit = (page: Page) => page.evaluate(() => {
  const c = document.querySelector('canvas')!.getBoundingClientRect();
  const d = document.documentElement;
  return {
    canvasInside: c.left >= 0 && c.top >= 0 && c.right <= innerWidth && c.bottom <= innerHeight,
    scrollX: d.scrollWidth > d.clientWidth,
    scrollY: d.scrollHeight > d.clientHeight,
  };
});
const FITS = { canvasInside: true, scrollX: false, scrollY: false };

test.describe('Gatefall C1: vừa khung hình desktop', () => {
  test.use({ viewport: { width: 1600, height: 900 } });

  test('Canvas vừa khung 1600x900', async ({ page }) => {
    await openGatefall(page);
    await settleFrames(page);
    expect(await readFit(page)).toEqual(FITS);
    await page.screenshot({ path: 'artifacts/gatefall-c1-1600x900.png' });
  });
});

test.describe('Gatefall C1: vừa khung hình điện thoại dọc', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('Canvas vừa khung 390x844', async ({ page }) => {
    await openGatefall(page);
    await settleFrames(page);
    expect(await readFit(page)).toEqual(FITS);
    await page.screenshot({ path: 'artifacts/gatefall-c1-390x844.png' });
  });
});

test.describe('Gatefall C1: nhập liệu thật không gây lỗi', () => {
  test('Bấm phím mũi tên, R, Enter liên tục không làm hỏng trạng thái', async ({ page }) => {
    await openGatefall(page);
    await page.locator('canvas').click();
    for (let round = 0; round < 5; round += 1) {
      for (const key of ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'r', 'Enter']) {
        await page.keyboard.press(key);
      }
    }
    await settleFrames(page);
    const state = await readState(page);
    expect(state.gameId).toBe('gatefall');
    expect(state.stateHash).toMatch(/^[0-9a-f]{8}$/);
  });
});

test.describe('Gatefall C1: viewport cảm ứng', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });

  test('Canvas vừa khung 844x390', async ({ page }) => {
    await openGatefall(page);
    await settleFrames(page);
    expect(await readFit(page)).toEqual(FITS);
  });

  test('Vuốt cảm ứng thật trên canvas không làm hỏng trạng thái', async ({ page }) => {
    await openGatefall(page);
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
      });
    for (const [dx, dy] of [[0, -90], [90, 0], [0, 90], [-90, 0]]) {
      await touch('touchStart', 420, 195);
      await touch('touchMove', 420 + dx / 2, 195 + dy / 2);
      await touch('touchMove', 420 + dx, 195 + dy);
      await touch('touchEnd', 420 + dx, 195 + dy);
    }
    await settleFrames(page);
    const state = await readState(page);
    expect(state.gameId).toBe('gatefall');
    expect(state.stateHash).toMatch(/^[0-9a-f]{8}$/);
  });

  test('Gatefall chạy được ở viewport điện thoại ngang', async ({ page }) => {
    await openGatefall(page);
    const state = await readState(page);
    expect(state.gameId).toBe('gatefall');
    expect(state.boardSize).toBe(7);
    await settleFrames(page);
    await page.screenshot({ path: 'artifacts/gatefall-c1-mobile.png' });
  });
});

/* ---------- C2: four gates. `__qaGate` re-implements brief 4.2, 4.3, 4.5 and 4.6 without reading the game code. ---------- */

type GateMap = Record<Dir, (number | null)[]>;

interface GateRun {
  failures: string[];
  tilts: number;
  enters: number;
  refills: number;
  clears: number;
  maxEnters: number;
  digest: string;
}

interface QaGate {
  initialProblem(level: number, seed: number): string | null;
  play(level: number, seed: number, maxMoves: number): GateRun;
}

declare global {
  interface Window {
    __qaGate?: QaGate;
  }
}

const installQaGate = () => {
  const DIRS: Dir[] = ['up', 'right', 'down', 'left'];
  const makeRng = (seed: number) => {
    const r = {
      state: seed >>> 0,
      next() {
        r.state = (r.state + 0x6d2b79f5) >>> 0;
        let t = r.state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      int: (n: number) => Math.floor(r.next() * n),
    };
    return r;
  };
  const cellAt = (dir: Dir, lane: number, depth: number, size: number): [number, number] => {
    if (dir === 'up') return [lane, depth];
    if (dir === 'down') return [lane, size - 1 - depth];
    if (dir === 'left') return [depth, lane];
    return [size - 1 - depth, lane];
  };
  const clusters = (board: Board) => {
    const size = board.length;
    const seen = new Set<number>();
    const out: [number, number][][] = [];
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (board[y][x] === null || seen.has(y * size + x)) continue;
        const group: [number, number][] = [];
        const stack: [number, number][] = [[x, y]];
        seen.add(y * size + x);
        while (stack.length > 0) {
          const [cx, cy] = stack.pop()!;
          group.push([cx, cy]);
          for (const [nx, ny] of [[cx, cy - 1], [cx + 1, cy], [cx, cy + 1], [cx - 1, cy]]) {
            if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
            if (board[ny][nx] !== board[y][x] || seen.has(ny * size + nx)) continue;
            seen.add(ny * size + nx);
            stack.push([nx, ny]);
          }
        }
        if (group.length >= 3) out.push(group);
      }
    }
    return out;
  };
  const fnv = (text: string) => {
    let value = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
      value ^= text.charCodeAt(i);
      value = Math.imul(value, 0x01000193);
    }
    return (value >>> 0).toString(16).padStart(8, '0');
  };

  const createModel = (level: number, seed: number) => {
    const tuning = window.__game!.tuning as unknown as Record<string, number>;
    const size = tuning.gfBoardSize;
    const wave = tuning.gfWaveSize;
    const colors = tuning[`gfL${level + 1}Colors`];
    const rngs = [0, 1, 2, 3, 4].map((k) => makeRng((seed + Math.imul(k + 1, 0x9e3779b9)) >>> 0));
    const board: Board = Array.from({ length: size }, () => new Array<number | null>(size).fill(null));
    const order = Array.from({ length: size * size }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = rngs[0].int(i + 1);
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (const index of order.slice(0, tuning.gfInitialPieces).sort((a, b) => a - b)) {
      const x = index % size;
      const y = Math.floor(index / size);
      let color = rngs[0].int(colors);
      for (;;) {
        board[y][x] = color;
        if (clusters(board).length === 0) break;
        color = (color + 1) % colors;
      }
    }
    const gates = Object.fromEntries(DIRS.map((d) => [d, new Array<number | null>(size).fill(null)])) as GateMap;
    const refill = (dir: Dir) => {
      const rng = rngs[DIRS.indexOf(dir) + 1];
      const drawn: { lane: number; color: number }[] = [];
      while (gates[dir].filter((c) => c !== null).length < wave) {
        const empty = gates[dir].flatMap((c, lane) => (c === null ? [lane] : []));
        const lane = empty[rng.int(empty.length)];
        const color = rng.int(colors);
        gates[dir][lane] = color;
        drawn.push({ lane, color });
      }
      return drawn;
    };
    DIRS.forEach(refill);
    const m = {
      size, wave, board, gates, collected: new Array<number>(colors).fill(0),
      tiltsUsed: 0, tiltsLeft: tuning[`gfL${level + 1}TiltLimit`],
      slide(dir: Dir) {
        const next: Board = m.board.map((row) => row.map(() => null));
        for (let lane = 0; lane < size; lane += 1) {
          let write = 0;
          for (let depth = 0; depth < size; depth += 1) {
            const [x, y] = cellAt(dir, lane, depth, size);
            if (m.board[y][x] === null) continue;
            const [tx, ty] = cellAt(dir, lane, write, size);
            next[ty][tx] = m.board[y][x];
            write += 1;
          }
        }
        m.board = next;
      },
      valid(dir: Dir) {
        if (m.tiltsLeft <= 0) return false;
        for (let lane = 0; lane < size; lane += 1) {
          let gap = false;
          for (let depth = 0; depth < size; depth += 1) {
            const [x, y] = cellAt(dir, lane, depth, size);
            if (m.board[y][x] === null) gap = true;
            else if (gap) return true;
          }
          if (gap && m.gates[dir][lane] !== null) return true;
        }
        return false;
      },
      tilt(dir: Dir) {
        m.tiltsUsed += 1;
        m.tiltsLeft -= 1;
        m.slide(dir);
        const enters: { lane: number; x: number; y: number; color: number }[] = [];
        for (let lane = 0; lane < size; lane += 1) {
          const color = m.gates[dir][lane];
          if (color === null) continue;
          for (let depth = 0; depth < size; depth += 1) {
            const [x, y] = cellAt(dir, lane, depth, size);
            if (m.board[y][x] !== null) continue;
            m.board[y][x] = color;
            m.gates[dir][lane] = null;
            enters.push({ lane, x, y, color });
            break;
          }
        }
        let chains = 0;
        for (;;) {
          const found = clusters(m.board);
          if (found.length === 0) break;
          const next = m.board.map((row) => [...row]);
          for (const group of found) {
            m.collected[m.board[group[0][1]][group[0][0]]!] += group.length;
            for (const [x, y] of group) next[y][x] = null;
          }
          m.board = next;
          m.slide(dir);
          chains += 1;
        }
        return { enters, chains, refills: refill(dir) };
      },
      hash(status: string) {
        const encode = (slots: (number | null)[]) => slots.map((c) => (c === null ? '.' : String(c))).join('');
        return fnv([
          'v1', `L${level}`, `S${seed}`, status, `T${m.tiltsUsed}/${m.tiltsLeft}`,
          `B${encode(m.board.flat())}`,
          `G${DIRS.map((d) => encode(m.gates[d])).join('/')}`,
          `C${m.collected.join(',')}`, 'V0',
          `R${rngs.map((r) => r.state).join(',')}`,
        ].join('|'));
      },
    };
    return m;
  };

  const initialProblem = (level: number, seed: number) => {
    const s = window.__game!.gatefall!.createSim(level, seed).getState();
    const m = createModel(level, seed);
    for (const d of DIRS) {
      const slots = s.gates[d];
      if (slots.length !== s.boardSize) return `${d}: ${slots.length} khe`;
      const pieces = slots.filter((c): c is number => c !== null);
      if (pieces.length !== s.waveSize) return `${d}: ${pieces.length} quân`;
      if (pieces.some((c) => !Number.isInteger(c) || c < 0 || c >= s.colorCount)) return `${d}: màu sai`;
      if (JSON.stringify(slots) !== JSON.stringify(m.gates[d])) return `${d}: khác mô hình`;
    }
    return s.stateHash === m.hash(s.status) ? null : 'hash đầu khác mô hình';
  };

  const play = (level: number, seed: number, maxMoves: number): GateRun => {
    const sim = window.__game!.gatefall!.createSim(level, seed);
    const m = createModel(level, seed);
    const picker = makeRng((seed * 2654435761) >>> 0);
    const run: GateRun = { failures: [], tilts: 0, enters: 0, refills: 0, clears: 0, maxEnters: 0, digest: '' };
    const trace: string[] = [];
    const slotIds = Object.fromEntries(DIRS.map((d) => [d, new Map<number, number>()])) as Record<Dir, Map<number, number>>;
    const usedIds = new Set<number>();
    for (let step = 1; step <= maxMoves; step += 1) {
      const before = sim.getState();
      if (before.status !== 'playing' || before.validTilts.length === 0) break;
      const dir = before.validTilts[picker.int(before.validTilts.length)];
      const fail = (text: string) => run.failures.push(`L${level} seed ${seed} bước ${step} ${dir}: ${text}`);
      const result = sim.tilt(dir);
      const s = sim.getState();
      const ev = s.lastEvents;
      if (!result.accepted) {
        fail('hướng hợp lệ bị từ chối');
        break;
      }
      if (ev.some((e) => e.type === 'vent')) break; // Venting belongs to C3.
      run.tilts += 1;
      trace.push(s.stateHash, JSON.stringify(ev));

      const expected = m.tilt(dir);
      const enters = ev.filter((e): e is Extract<GatefallEvent, { type: 'enter' }> => e.type === 'enter');
      const refills = ev.filter((e): e is Extract<GatefallEvent, { type: 'gateRefill' }> => e.type === 'gateRefill');
      const clearsAt = ev.findIndex((e) => e.type === 'clusterClear');
      run.enters += enters.length;
      run.refills += refills.length;
      run.clears += ev.filter((e) => e.type === 'clusterClear').length;
      run.maxEnters = Math.max(run.maxEnters, enters.length);

      if (enters.length > s.waveSize) fail(`${enters.length} enter`);
      if (clearsAt >= 0 && enters.some((e) => e.seq > clearsAt)) fail('enter sau clusterClear');
      if (enters.some((e, i) => e.dir !== dir || (i > 0 && e.lane <= enters[i - 1].lane))) fail('enter sai hướng hoặc thứ tự làn');
      const firstEnter = enters[0]?.seq ?? Infinity;
      if (ev.some((e) => e.type === 'move' && e.chain === 0 && e.seq > firstEnter)) fail('move chain 0 sau enter');
      const firstRefill = refills[0]?.seq ?? Infinity;
      if (ev.some((e) => (e.type === 'move' || e.type === 'clusterClear' || e.type === 'enter') && e.seq > firstRefill)) {
        fail('gateRefill trước khi giải cụm xong');
      }
      if (refills.some((e) => e.dir !== dir)) fail('gateRefill sai cửa');
      const start = ev[0];
      if (start.type !== 'tiltStart' || start.tiltsLeft !== before.tiltsLeft - 1) fail('tiltStart.tiltsLeft không phải giá trị sau khi trừ');

      for (const e of enters) {
        const known = slotIds[dir].get(e.lane);
        if (known !== undefined && known !== e.pieceId) fail(`enter làn ${e.lane} đổi pieceId`);
        if (before.gates[dir][e.lane] !== e.color) fail(`enter làn ${e.lane} khác màu đang hiển thị`);
        slotIds[dir].delete(e.lane);
      }
      for (const e of refills) {
        if (usedIds.has(e.pieceId)) fail(`pieceId ${e.pieceId} bị dùng lại`);
        usedIds.add(e.pieceId);
        slotIds[dir].set(e.lane, e.pieceId);
      }

      for (const d of DIRS) {
        if (d !== dir && JSON.stringify(s.gates[d]) !== JSON.stringify(before.gates[d])) fail(`cửa ${d} không dùng bị đổi`);
      }
      if (s.gates[dir].filter((c) => c !== null).length !== s.waveSize) fail('cửa vừa dùng sai số quân');

      if (JSON.stringify(enters.map((e) => ({ lane: e.lane, x: e.to.x, y: e.to.y, color: e.color })))
        !== JSON.stringify(expected.enters)) fail('enter khác mô hình');
      if (JSON.stringify(refills.map((e) => ({ lane: e.lane, color: e.color }))) !== JSON.stringify(expected.refills)) fail('gateRefill khác mô hình');
      if (JSON.stringify(s.board) !== JSON.stringify(m.board)) fail('bàn khác mô hình');
      if (JSON.stringify(s.gates) !== JSON.stringify(m.gates)) fail('cửa khác mô hình');
      if (JSON.stringify(s.collected) !== JSON.stringify(m.collected)) fail('collected khác mô hình');
      if (s.lastChain !== expected.chains) fail('lastChain khác mô hình');
      if (s.stateHash !== m.hash(s.status)) fail('hash khác công thức mục 4.6');
      if (s.status === 'playing' && JSON.stringify(s.validTilts) !== JSON.stringify(DIRS.filter((d) => m.valid(d)))) {
        fail('validTilts khác mô hình');
      }
      if (run.failures.length > 0) break;
    }
    run.digest = fnv(trace.join('\n'));
    return run;
  };

  window.__qaGate = { initialProblem, play };
};

const openC2 = async (page: Page) => {
  await page.addInitScript(installQaGate);
  await openGatefall(page);
};

const gatesWith = (dir: Dir, lane: number, color: number): GateMap => {
  const gates = emptyGates();
  gates[dir][lane] = color;
  return gates;
};
const F5 = () => fixture([[2, 5, 3], [2, 6, 3]], { gates: gatesWith('down', 2, 3) });
const F6 = () => {
  const cells: [number, number, number][] = [[4, 0, 2]];
  for (let y = 0; y < SIZE; y += 1) cells.push([2, y, y % 2]);
  return fixture(cells, { gates: gatesWith('down', 2, 2) });
};
const gateCount = (slots: (number | null)[]) => slots.filter((c) => c !== null).length;
const column = (board: Board, x: number) => board.map((row) => row[x]);

test.describe('Gatefall C2: cửa nạp', () => {
  for (const level of LEVELS) {
    test(`C2.1 màn ${level + 1}: 200 seed đủ khe, đúng waveSize, màu hợp lệ, khớp luồng RNG`, async ({ page }) => {
      await openC2(page);
      const bad = await page.evaluate(([lv, seeds]) => {
        const out: string[] = [];
        for (let seed = 1; seed <= seeds; seed += 1) {
          const problem = window.__qaGate!.initialProblem(lv, seed);
          if (problem) out.push(`seed ${seed}: ${problem}`);
        }
        return out.slice(0, 10);
      }, [level, SEEDS] as const);
      expect(bad).toEqual([]);
    });
  }

  const C22: [Dir, number, number][] = [['down', 3, 6], ['up', 3, 0], ['left', 0, 3], ['right', 6, 3]];
  for (const via of ['sim', 'scene'] as const) {
    for (const [dir, x, y] of C22) {
      test(`C2.2 qua ${via}: nghiêng ${dir} đưa quân làn 3 tới (${x},${y})`, async ({ page }) => {
        await openC2(page);
        for (let color = 0; color < 4; color += 1) {
          const data = fixture([], { gates: gatesWith(dir, 3, color) });
          const { after } = via === 'sim' ? await simTilt(page, data, dir) : await sceneTilt(page, data, dir);
          expect(after.board[y][x]).toBe(color);
          expect(countPieces(after.board)).toBe(1);
          const enters = after.lastEvents.filter((e) => e.type === 'enter');
          expect(enters).toHaveLength(1);
          expect(enters[0]).toMatchObject({ dir, lane: 3, to: { x, y }, color });
        }
      });
    }
  }

  for (const via of ['sim', 'scene'] as const) {
    test(`C2.3 F5 qua ${via}: enter trước clusterClear, cột x=2 rỗng`, async ({ page }) => {
      await openC2(page);
      const { after } = via === 'sim' ? await simTilt(page, F5()) : await sceneTilt(page, F5());
      const types = after.lastEvents.map((e) => e.type);
      expect(types.filter((t) => t === 'enter')).toHaveLength(1);
      expect(types).toContain('clusterClear');
      expect(types.indexOf('enter')).toBeLessThan(types.indexOf('clusterClear'));
      expect(after.collected[3]).toBe(3);
      expect(column(after.board, 2)).toEqual(new Array(SIZE).fill(null));
    });

    test(`C2.4 F6 qua ${via}: làn đầy giữ quân ở khe`, async ({ page }) => {
      await openC2(page);
      const data = F6();
      const { after } = via === 'sim' ? await simTilt(page, data) : await sceneTilt(page, data);
      expect(after.gates.down[2]).toBe(2);
      expect(column(after.board, 2)).toEqual(column(data.board, 2));
      expect(gateCount(after.gates.down)).toBe(after.waveSize);
      expect(after.lastEvents.filter((e) => e.type === 'enter')).toHaveLength(0);
      expect(after.lastEvents.some((e) => e.type === 'gateRefill' && e.lane === 2)).toBe(false);
    });
  }

  test('Mục 4.3 bước 6.5: cascade mở chỗ trong làn đầy vẫn không nạp thêm', async ({ page }) => {
    await openC2(page);
    const colors = [0, 0, 0, 1, 2, 1, 2];
    const cells: [number, number, number][] = [[4, 0, 2], ...colors.map((c, y): [number, number, number] => [2, y, c])];
    const { after } = await simTilt(page, fixture(cells, { gates: gatesWith('down', 2, 3) }));
    expect(after.collected[0]).toBe(3);
    expect(after.gates.down[2]).toBe(3);
    expect(after.lastEvents.filter((e) => e.type === 'enter')).toHaveLength(0);
    expect(gateCount(column(after.board, 2))).toBe(4);
  });

  test('Mục 4.3 bước 1: chỉ có quân cửa vào được thì hợp lệ, làn đầy và bàn đứng yên thì từ chối', async ({ page }) => {
    await openC2(page);
    const entering = await simTilt(page, fixture([[0, 6, 0]], { gates: gatesWith('down', 3, 1) }));
    expect(entering.before.validTilts).toContain('down');
    expect(entering.result.accepted).toBe(true);
    expect(entering.after.board[6][3]).toBe(1);

    const full: [number, number, number][] = [];
    for (let y = 0; y < SIZE; y += 1) full.push([2, y, y % 2]);
    const blocked = await simTilt(page, fixture(full, { gates: gatesWith('down', 2, 2) }));
    expect(blocked.before.validTilts).not.toContain('down');
    expect(blocked.result.accepted).toBe(false);
    expect(blocked.after.stateHash).toBe(blocked.before.stateHash);
    expect(blocked.after.gates).toEqual(blocked.before.gates);
    expect(blocked.result.events.map((e) => e.type)).toEqual(['tiltRejected']);
  });

  for (const level of LEVELS) {
    test(`C2.5, C2.6 và mô hình độc lập màn ${level + 1}: mọi lần nghiêng trên 200 seed`, async ({ page }) => {
      await openC2(page);
      const total = await page.evaluate(([lv, seeds, maxMoves]) => {
        const sum = { failures: [] as string[], tilts: 0, enters: 0, refills: 0, clears: 0, maxEnters: 0 };
        for (let seed = 1; seed <= seeds; seed += 1) {
          const run = window.__qaGate!.play(lv, seed, maxMoves);
          sum.failures.push(...run.failures);
          sum.tilts += run.tilts;
          sum.enters += run.enters;
          sum.refills += run.refills;
          sum.clears += run.clears;
          sum.maxEnters = Math.max(sum.maxEnters, run.maxEnters);
        }
        sum.failures = sum.failures.slice(0, 10);
        return sum;
      }, [level, SEEDS, MAX_MOVES] as const);
      expect(total.failures).toEqual([]);
      expect(total.tilts, 'phải có nước đi thật').toBeGreaterThan(SEEDS);
      expect(total.enters).toBeGreaterThan(0);
      expect(total.refills).toBeGreaterThan(0);
      expect(total.clears, 'bộ dữ liệu phải có cụm nổ').toBeGreaterThan(0);
    });
  }

  test('C2.6 cửa fixture nhiều hơn waveSize: quân kẹt được giữ, không rút thêm RNG', async ({ page }) => {
    await openC2(page);
    const cells: [number, number, number][] = [[6, 0, 2]];
    for (const x of [0, 1, 2, 3, 4]) for (let y = 0; y < SIZE; y += 1) cells.push([x, y, (x + y) % 2]);
    const gates = emptyGates();
    gates.down = [3, 3, 3, 3, 3, null, null];
    const { after } = await simTilt(page, fixture(cells, { gates }));
    expect(after.gates.down).toEqual([3, 3, 3, 3, 3, null, null]);
    expect(after.lastEvents.filter((e) => e.type === 'gateRefill')).toHaveLength(0);
  });
});

test.describe('Gatefall C2: không có refill thiên lệch', () => {
  test('C2.7 hai bàn khác nhau, cùng seed, cửa rỗng, nghiêng down 3 lần cho gates.down giống nhau', async ({ page }) => {
    await openC2(page);
    const result = await page.evaluate(([size, seeds]) => {
      const api = window.__game!.gatefall!;
      const rand = window.__qaGf!.rng(987654);
      const gates = () => ({
        up: new Array(size).fill(null), right: new Array(size).fill(null),
        down: new Array(size).fill(null), left: new Array(size).fill(null),
      });
      const failures: string[] = [];
      let compared = 0;
      for (let seed = 1; seed <= seeds; seed += 1) {
        // Pieces only in rows 0..2: each column holds at most 3 + 2 entries, so every gate piece can enter.
        const a: Board = Array.from({ length: size }, () => new Array(size).fill(null));
        const b: Board = Array.from({ length: size }, () => new Array(size).fill(null));
        a[0][rand.int(size)] = rand.int(4);
        for (let y = 0; y < 3; y += 1) for (let x = 0; x < size; x += 1) if (rand.next() < 0.7) b[y][x] = rand.int(4);
        b[0][0] = 1;
        if (JSON.stringify(a) === JSON.stringify(b)) continue;
        const simA = api.createSim(0, seed, { board: a, gates: gates() });
        const simB = api.createSim(0, seed, { board: b, gates: gates() });
        for (let step = 1; step <= 3; step += 1) {
          const preA = simA.getState().gates.down.filter((c) => c !== null).length;
          const preB = simB.getState().gates.down.filter((c) => c !== null).length;
          const ra = simA.tilt('down');
          const rb = simB.tilt('down');
          const sa = simA.getState();
          const sb = simB.getState();
          const entersA = sa.lastEvents.filter((e) => e.type === 'enter').length;
          const entersB = sb.lastEvents.filter((e) => e.type === 'enter').length;
          if (!ra.accepted || !rb.accepted) failures.push(`seed ${seed} bước ${step}: bị từ chối`);
          if (entersA !== preA || entersB !== preB) failures.push(`seed ${seed} bước ${step}: có quân không vào được`);
          if (JSON.stringify(sa.gates.down) !== JSON.stringify(sb.gates.down)) failures.push(`seed ${seed} bước ${step}: gates.down khác`);
          compared += 1;
        }
      }
      return { failures: failures.slice(0, 10), compared };
    }, [SIZE, SEEDS] as const);
    expect(result.failures).toEqual([]);
    expect(result.compared).toBe(SEEDS * 3);
  });

  test('Mục 4.5 quân sắp vào không phụ thuộc tiến độ hay ngân sách lượt', async ({ page }) => {
    await openC2(page);
    const failures = await page.evaluate(([size, seeds]) => {
      const api = window.__game!.gatefall!;
      const gates = () => ({
        up: new Array(size).fill(null), right: new Array(size).fill(null),
        down: new Array(size).fill(null), left: new Array(size).fill(null),
      });
      const board = () => {
        const b: Board = Array.from({ length: size }, () => new Array(size).fill(null));
        b[0][3] = 2;
        return b;
      };
      const out: string[] = [];
      for (let seed = 1; seed <= seeds; seed += 1) {
        const base = api.createSim(0, seed, { board: board(), gates: gates() });
        // Color 1 stays out of reach, so this run cannot end in a win once C3 adds win detection.
        const nearGoal = api.createSim(0, seed, {
          board: board(), gates: gates(), collected: [window.__game!.tuning.gfL1GoalCount - 1, 0, 0, 0],
        });
        const lowBudget = api.createSim(0, seed, { board: board(), gates: gates(), tiltsLeft: 3 });
        for (let step = 1; step <= 3; step += 1) {
          base.tilt('down');
          nearGoal.tilt('down');
          lowBudget.tilt('down');
          const expected = JSON.stringify(base.getState().gates.down);
          if (JSON.stringify(nearGoal.getState().gates.down) !== expected) out.push(`seed ${seed} bước ${step}: theo tiến độ`);
          if (JSON.stringify(lowBudget.getState().gates.down) !== expected) out.push(`seed ${seed} bước ${step}: theo ngân sách`);
        }
      }
      return out.slice(0, 10);
    }, [SIZE, SEEDS] as const);
    expect(failures).toEqual([]);
  });

  test('Mục 4.5 màu rút ra chỉ phụ thuộc số quân đã rút, kể cả khi có làn đầy', async ({ page }) => {
    await openC2(page);
    const result = await page.evaluate(([size, seeds]) => {
      const api = window.__game!.gatefall!;
      const gates = () => ({
        up: new Array(size).fill(null), right: new Array(size).fill(null),
        down: new Array(size).fill(null), left: new Array(size).fill(null),
      });
      const colorsDrawn = (board: Board, seed: number) => {
        const sim = api.createSim(0, seed, { board, gates: gates() });
        const drawn: number[] = [];
        for (let i = 0; i < 6; i += 1) {
          if (!sim.tilt('down').accepted) break;
          for (const e of sim.getState().lastEvents) if (e.type === 'gateRefill') drawn.push(e.color);
        }
        return drawn;
      };
      const out: string[] = [];
      let comparedColors = 0;
      for (let seed = 1; seed <= seeds; seed += 1) {
        const sparse: Board = Array.from({ length: size }, () => new Array(size).fill(null));
        sparse[0][6] = 0;
        const packed: Board = Array.from({ length: size }, (_, y) =>
          Array.from({ length: size }, (_, x) => (x < 3 ? (x + y) % 2 : null)));
        packed[0][6] = 0;
        const a = colorsDrawn(sparse, seed);
        const b = colorsDrawn(packed, seed);
        const shared = Math.min(a.length, b.length);
        comparedColors += shared;
        if (JSON.stringify(a.slice(0, shared)) !== JSON.stringify(b.slice(0, shared))) out.push(`seed ${seed}`);
      }
      return { out: out.slice(0, 10), comparedColors };
    }, [SIZE, SEEDS] as const);
    expect(result.out).toEqual([]);
    expect(result.comparedColors).toBeGreaterThan(SEEDS);
  });

  test('Mục 4.5 chơi hết lượt rồi thử lại nhiều lần vẫn ra đúng cửa và hash như lần đầu', async ({ page }) => {
    await openC2(page);
    await page.evaluate(installQaClock);
    const result = await page.evaluate(() => {
      const api = window.__game!.gatefall!;
      const read = () => window.__game!.getState<GatefallState>()!;
      const attempts: string[] = [];
      let exhausted = 0;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        api.loadLevel(0);
        const trace: string[] = [read().stateHash, JSON.stringify(read().gates)];
        for (let i = 0; i < 40; i += 1) {
          const state = read();
          if (state.status !== 'playing' || state.validTilts.length === 0) break;
          if (!api.tilt(state.validTilts[i % state.validTilts.length])) throw new Error('valid tilt was not accepted');
          window.__qaClock!.finishAnim();
          trace.push(read().stateHash, JSON.stringify(read().gates));
        }
        const end = read();
        if (end.status !== 'playing' || end.tiltsLeft === 0) exhausted += 1;
        attempts.push(trace.join('|'));
      }
      return { same: new Set(attempts).size === 1, exhausted };
    });
    expect(result.same).toBe(true);
    expect(result.exhausted).toBe(4);
  });
});

test.describe('Gatefall C2: xác định và điểm Producer đã chốt', () => {
  for (const level of LEVELS) {
    test(`C2.8 màn ${level + 1}: chạy lại với cửa bật, kể cả sau sim khác và sau khi tải lại trang`, async ({ page }) => {
      await openC2(page);
      const runAll = () => page.evaluate(([lv, seeds, maxMoves]) => {
        const digests: string[] = [];
        let refills = 0;
        let enters = 0;
        const failures: string[] = [];
        for (let seed = 1; seed <= seeds; seed += 1) {
          const first = window.__qaGate!.play(lv, seed, maxMoves);
          window.__qaGate!.play(lv, seed + 1000, 5);
          const second = window.__qaGate!.play(lv, seed, maxMoves);
          if (first.digest !== second.digest) failures.push(`seed ${seed}`);
          failures.push(...first.failures);
          digests.push(first.digest);
          refills += first.refills;
          enters += first.enters;
        }
        return { digests, refills, enters, failures: failures.slice(0, 10) };
      }, [level, SEEDS, MAX_MOVES] as const);
      const before = await runAll();
      expect(before.failures).toEqual([]);
      expect(before.refills, 'cửa nạp phải thực sự hoạt động').toBeGreaterThan(SEEDS);
      expect(before.enters).toBeGreaterThan(SEEDS);
      await page.reload();
      await page.waitForFunction(() => window.__game?.getState<GatefallState>()?.status === 'playing'
        && Boolean(window.__game?.gatefall) && Boolean(window.__qaGate));
      const after = await runAll();
      expect(after.digests).toEqual(before.digests);
    });
  }

  test('Producer chốt: lần bị từ chối không đổi lastChain, lastAnimMs, không rút RNG', async ({ page }) => {
    await openC2(page);
    const result = await page.evaluate((fx) => {
      const sim = window.__game!.gatefall!.createSim(0, 101, fx);
      sim.tilt('down');
      const accepted = sim.getState();
      const rejected = sim.tilt('left');
      return { accepted, rejected, after: sim.getState() };
    }, F4());
    expect(result.rejected.accepted).toBe(false);
    expect(result.accepted.lastChain).toBe(2);
    expect(result.after.lastChain).toBe(2);
    expect(result.after.lastAnimMs).toBe(result.accepted.lastAnimMs);
    expect(result.after.stateHash).toBe(result.accepted.stateHash);
    expect(result.after.gates).toEqual(result.accepted.gates);
  });

  test('Producer chốt: tiltStart.tiltsLeft là giá trị sau khi trừ', async ({ page }) => {
    await openC2(page);
    const { result, after } = await simTilt(page, fixture([[2, 1, 0], [2, 4, 1]], { tiltsLeft: 5 }));
    expect(result.events[0]).toMatchObject({ type: 'tiltStart', dir: 'down', tiltsLeft: 4 });
    expect(after.tiltsLeft).toBe(4);
  });

  test('Mục 4.6 đổi một quân trong cửa thì stateHash đổi', async ({ page }) => {
    await openC2(page);
    const result = await page.evaluate(([base, changed]) => {
      const api = window.__game!.gatefall!;
      return [api.createSim(0, 101, base).getState().stateHash, api.createSim(0, 101, changed).getState().stateHash];
    }, [fixture([], { gates: gatesWith('left', 4, 1) }), fixture([], { gates: gatesWith('left', 4, 2) })] as const);
    expect(result[0]).not.toBe(result[1]);
  });
});

/* ---------------------------------- C3 ---------------------------------- */

interface VentRun {
  failures: string[];
  tilts: number;
  vents: number;
  ventDirs: Dir[];
  status: string;
  path: Dir[];
  playingStates: number;
}

interface QaVent {
  search(level: number, seed: number, fx: GatefallFixture | null, width: number): Dir[];
  replay(level: number, seed: number, fx: GatefallFixture | null, dirs: Dir[], salt: number): VentRun;
  expectedHash(level: number, seed: number, fx: GatefallFixture, dir: Dir): string;
}

declare global {
  interface Window {
    __qaVent?: QaVent;
  }
}

/** Independent model of sections 4.3 to 4.6, including step 8 and venting. Shares no code with the game. */
const installQaVent = () => {
  const DIRS: Dir[] = ['up', 'right', 'down', 'left'];
  type Slots = (number | null)[];
  interface Model {
    level: number; seed: number; size: number; wave: number; colors: number; cost: number;
    goalColors: number; goalCount: number; board: Slots[]; gates: Record<Dir, Slots>; rng: number[];
    collected: number[]; tiltsUsed: number; tiltsLeft: number; ventCount: number; status: string;
  }

  const drawFrom = (rng: number[], k: number, n: number) => {
    rng[k] = (rng[k] + 0x6d2b79f5) >>> 0;
    let t = rng[k];
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n);
  };
  const at = (dir: Dir, lane: number, depth: number, size: number): [number, number] => {
    if (dir === 'up') return [lane, depth];
    if (dir === 'down') return [lane, size - 1 - depth];
    if (dir === 'left') return [depth, lane];
    return [size - 1 - depth, lane];
  };
  const findClusters = (board: Slots[]) => {
    const size = board.length;
    const seen = new Set<number>();
    const out: [number, number][][] = [];
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (board[y][x] === null || seen.has(y * size + x)) continue;
        const group: [number, number][] = [];
        const stack: [number, number][] = [[x, y]];
        seen.add(y * size + x);
        while (stack.length > 0) {
          const [cx, cy] = stack.pop()!;
          group.push([cx, cy]);
          for (const [nx, ny] of [[cx, cy - 1], [cx + 1, cy], [cx, cy + 1], [cx - 1, cy]]) {
            if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
            if (board[ny][nx] !== board[y][x] || seen.has(ny * size + nx)) continue;
            seen.add(ny * size + nx);
            stack.push([nx, ny]);
          }
        }
        if (group.length >= 3) out.push(group);
      }
    }
    return out;
  };
  const refill = (m: Model, dir: Dir) => {
    const k = DIRS.indexOf(dir) + 1;
    const gate = m.gates[dir];
    while (gate.filter((c) => c !== null).length < m.wave) {
      const empty = gate.flatMap((c, lane) => (c === null ? [lane] : []));
      const lane = empty[drawFrom(m.rng, k, empty.length)];
      gate[lane] = drawFrom(m.rng, k, m.colors);
    }
  };
  const create = (level: number, seed: number, fx: GatefallFixture | null): Model => {
    const tuning = window.__game!.tuning as unknown as Record<string, number>;
    const n = level + 1;
    const size = tuning.gfBoardSize;
    const colors = tuning[`gfL${n}Colors`];
    const m: Model = {
      level, seed, size, colors, wave: tuning.gfWaveSize, cost: tuning.gfVentTiltCost,
      goalColors: tuning[`gfL${n}GoalColors`], goalCount: tuning[`gfL${n}GoalCount`],
      board: Array.from({ length: size }, () => new Array<number | null>(size).fill(null)),
      gates: Object.fromEntries(DIRS.map((d) => [d, new Array<number | null>(size).fill(null)])) as Record<Dir, Slots>,
      rng: [0, 1, 2, 3, 4].map((k) => (seed + Math.imul(k + 1, 0x9e3779b9)) >>> 0),
      collected: new Array<number>(colors).fill(0),
      tiltsUsed: 0, tiltsLeft: tuning[`gfL${n}TiltLimit`], ventCount: 0, status: 'playing',
    };
    if (fx) {
      m.board = fx.board.map((row) => [...row]);
      for (const d of DIRS) m.gates[d] = [...fx.gates[d]];
      if (fx.tiltsLeft !== undefined) m.tiltsLeft = fx.tiltsLeft;
      if (fx.collected) m.collected = [...fx.collected];
      return m;
    }
    const order = Array.from({ length: size * size }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = drawFrom(m.rng, 0, i + 1);
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (const index of order.slice(0, tuning.gfInitialPieces).sort((a, b) => a - b)) {
      const x = index % size;
      const y = Math.floor(index / size);
      let color = drawFrom(m.rng, 0, colors);
      for (;;) {
        m.board[y][x] = color;
        if (findClusters(m.board).length === 0) break;
        color = (color + 1) % colors;
      }
    }
    DIRS.forEach((d) => refill(m, d));
    return m;
  };
  const clone = (m: Model): Model => ({
    ...m,
    board: m.board.map((row) => [...row]),
    gates: Object.fromEntries(DIRS.map((d) => [d, [...m.gates[d]]])) as Record<Dir, Slots>,
    rng: [...m.rng],
    collected: [...m.collected],
  });
  const slide = (m: Model, dir: Dir) => {
    const next: Slots[] = m.board.map((row) => row.map(() => null));
    for (let lane = 0; lane < m.size; lane += 1) {
      let write = 0;
      for (let depth = 0; depth < m.size; depth += 1) {
        const [x, y] = at(dir, lane, depth, m.size);
        if (m.board[y][x] === null) continue;
        const [tx, ty] = at(dir, lane, write, m.size);
        next[ty][tx] = m.board[y][x];
        write += 1;
      }
    }
    m.board = next;
  };
  const valid = (m: Model, dir: Dir) => {
    if (m.status !== 'playing' || m.tiltsLeft <= 0) return false;
    for (let lane = 0; lane < m.size; lane += 1) {
      let gap = false;
      for (let depth = 0; depth < m.size; depth += 1) {
        const [x, y] = at(dir, lane, depth, m.size);
        if (m.board[y][x] === null) gap = true;
        else if (gap) return true;
      }
      if (gap && m.gates[dir][lane] !== null) return true;
    }
    return false;
  };
  const goalsMet = (m: Model) => {
    for (let c = 0; c < m.goalColors; c += 1) if (m.collected[c] < m.goalCount) return false;
    return true;
  };
  /** Returns the vented cells in scan order, or null. */
  const tilt = (m: Model, dir: Dir): { x: number; y: number }[] | null => {
    m.tiltsUsed += 1;
    m.tiltsLeft -= 1;
    slide(m, dir);
    for (let lane = 0; lane < m.size; lane += 1) {
      const color = m.gates[dir][lane];
      if (color === null) continue;
      for (let depth = 0; depth < m.size; depth += 1) {
        const [x, y] = at(dir, lane, depth, m.size);
        if (m.board[y][x] !== null) continue;
        m.board[y][x] = color;
        m.gates[dir][lane] = null;
        break;
      }
    }
    for (;;) {
      const found = findClusters(m.board);
      if (found.length === 0) break;
      const next = m.board.map((row) => [...row]);
      for (const group of found) {
        m.collected[m.board[group[0][1]][group[0][0]]!] += group.length;
        for (const [x, y] of group) next[y][x] = null;
      }
      m.board = next;
      slide(m, dir);
    }
    refill(m, dir);
    if (goalsMet(m)) { m.status = 'won'; return null; }
    if (m.tiltsLeft === 0) { m.status = 'lost'; return null; }
    if (m.board.some((row) => row.some((c) => c === null))) return null;
    const cells: { x: number; y: number }[] = [];
    for (let i = 0; i < m.size; i += 1) {
      if (dir === 'down') cells.push({ x: i, y: 0 });
      if (dir === 'up') cells.push({ x: i, y: m.size - 1 });
      if (dir === 'right') cells.push({ x: 0, y: i });
      if (dir === 'left') cells.push({ x: m.size - 1, y: i });
    }
    for (const { x, y } of cells) m.board[y][x] = null;
    m.ventCount += 1;
    m.tiltsLeft = Math.max(0, m.tiltsLeft - m.cost);
    if (m.tiltsLeft === 0) m.status = 'lost';
    return cells;
  };
  const hashOf = (m: Model) => {
    const encode = (slots: Slots) => slots.map((c) => (c === null ? '.' : String(c))).join('');
    const text = [
      'v1', `L${m.level}`, `S${m.seed}`, m.status, `T${m.tiltsUsed}/${m.tiltsLeft}`,
      `B${encode(m.board.flat())}`, `G${DIRS.map((d) => encode(m.gates[d])).join('/')}`,
      `C${m.collected.join(',')}`, `V${m.ventCount}`, `R${m.rng.join(',')}`,
    ].join('|');
    let value = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
      value ^= text.charCodeAt(i);
      value = Math.imul(value, 0x01000193);
    }
    return (value >>> 0).toString(16).padStart(8, '0');
  };

  /** Beam search on the model for the path with the most vents. Goal progress is penalised so games stay alive. */
  const search: QaVent['search'] = (level, seed, fx, width) => {
    let beam: { m: Model; path: Dir[] }[] = [{ m: create(level, seed, fx), path: [] }];
    let best: Dir[] = [];
    let bestVents = 0;
    const score = (m: Model) => m.ventCount * 100 + m.board.flat().filter((c) => c !== null).length
      - m.collected.reduce((a, b) => a + b, 0) * 0.5;
    while (beam.length > 0) {
      const next = new Map<string, { m: Model; path: Dir[] }>();
      for (const node of beam) {
        for (const dir of DIRS) {
          if (!valid(node.m, dir)) continue;
          const m = clone(node.m);
          tilt(m, dir);
          const path = [...node.path, dir];
          if (m.ventCount > bestVents) {
            bestVents = m.ventCount;
            best = path;
          }
          if (m.status === 'playing') next.set(hashOf(m), { m, path });
        }
      }
      beam = [...next.values()].sort((a, b) => score(b.m) - score(a.m)).slice(0, width);
    }
    return best;
  };

  /** Plays `dirs`, then random valid tilts to the end, checking the game against the model after every tilt. */
  const replay: QaVent['replay'] = (level, seed, fx, dirs, salt) => {
    const sim = window.__game!.gatefall!.createSim(level, seed, fx ?? undefined);
    const m = create(level, seed, fx);
    const tuning = window.__game!.tuning as unknown as Record<string, number>;
    const limit = tuning[`gfL${level + 1}TiltLimit`];
    const budgetIsLimit = !fx || fx.tiltsLeft === undefined || fx.tiltsLeft === limit;
    const picker = [(Math.imul(seed, 2654435761) ^ salt) >>> 0];
    const run: VentRun = { failures: [], tilts: 0, vents: 0, ventDirs: [], status: 'playing', path: [], playingStates: 0 };
    for (let step = 0; step < 200; step += 1) {
      const before = sim.getState();
      run.status = before.status;
      if (before.status !== 'playing') break;
      run.playingStates += 1;
      const label = `L${level} seed ${seed} bước ${step + 1}, chuỗi ${run.path.join(',')}`;
      if (before.validTilts.length === 0) {
        run.failures.push(`${label}: playing nhưng validTilts rỗng`);
        break;
      }
      const expectedValid = DIRS.filter((d) => valid(m, d));
      if (JSON.stringify(before.validTilts) !== JSON.stringify(expectedValid)) {
        run.failures.push(`${label}: validTilts ${before.validTilts} khác mô hình ${expectedValid}`);
        break;
      }
      const dir = step < dirs.length ? dirs[step] : before.validTilts[drawFrom(picker, 0, before.validTilts.length)];
      run.path.push(dir);
      const result = sim.tilt(dir);
      const cells = tilt(m, dir);
      const s = sim.getState();
      const ev = s.lastEvents;
      const fail = (text: string) => run.failures.push(`${label} ${dir}: ${text}`);
      if (!result.accepted) fail('hướng hợp lệ bị từ chối');
      run.tilts += 1;
      const vents = ev.filter((e): e is Extract<GatefallEvent, { type: 'vent' }> => e.type === 'vent');
      if (vents.length !== (cells ? 1 : 0)) fail(`số sự kiện vent ${vents.length}`);
      if (cells && vents.length === 1) {
        run.vents += 1;
        if (!run.ventDirs.includes(dir)) run.ventDirs.push(dir);
        const vent = vents[0];
        if (vent.seq !== ev.length - 2) fail('vent không nằm ngay trước turnEnd');
        if (ev.some((e) => e.type === 'gateRefill' && e.seq > vent.seq)) fail('gateRefill sau vent');
        if (vent.dir !== dir) fail('vent sai hướng');
        if (vent.tiltCost !== m.cost) fail('vent.tiltCost khác chi phí cấu hình');
        if (JSON.stringify(vent.cells) !== JSON.stringify(cells)) fail('vent.cells sai hàng hoặc sai thứ tự quét');
      }
      const gained = ev.reduce((sum, e) => sum + (e.type === 'clusterClear' ? e.cells.length : 0), 0);
      const delta = s.collected.reduce((a, b) => a + b, 0) - before.collected.reduce((a, b) => a + b, 0);
      if (gained !== delta) fail(`collected tăng ${delta}, cụm nổ ${gained}`);
      const last = ev[ev.length - 1];
      if (last.type !== 'turnEnd' || last.tiltsLeft !== s.tiltsLeft || last.status !== s.status) fail('turnEnd sai');
      if (ev.some((e, i) => e.seq !== i)) fail('seq không liên tục');
      for (const key of ['board', 'gates', 'collected'] as const) {
        if (JSON.stringify(s[key]) !== JSON.stringify(m[key])) fail(`${key} khác mô hình`);
      }
      if (s.tiltsLeft !== m.tiltsLeft || s.tiltsUsed !== m.tiltsUsed || s.ventCount !== m.ventCount) fail('bộ đếm khác mô hình');
      if (s.status !== m.status) fail(`status ${s.status}, mô hình ${m.status}`);
      if (s.stateHash !== hashOf(m)) fail('hash khác mô hình (gồm trạng thái RNG)');
      if (budgetIsLimit && s.tiltsLeft !== Math.max(0, limit - s.tiltsUsed - s.ventCount * m.cost)) fail('sai công thức C3.7');
      if (s.loseReason !== (s.status === 'lost' ? 'outOfTilts' : null)) fail('loseReason sai');
      if (s.status !== 'playing' && s.validTilts.length !== 0) fail('ván kết thúc nhưng validTilts không rỗng');
      run.status = s.status;
      if (run.failures.length > 0) break;
    }
    return run;
  };

  const expectedHash: QaVent['expectedHash'] = (level, seed, fx, dir) => {
    const m = create(level, seed, fx);
    tilt(m, dir);
    return hashOf(m);
  };

  window.__qaVent = { search, replay, expectedHash };
};

/** Level 1 goal count, read from the running game by openC3. NaN until then, so a test that skips openC3 fails. */
let GOAL_L1 = Number.NaN;

const openC3 = async (page: Page) => {
  await page.addInitScript(installQaVent);
  await openGatefall(page);
  GOAL_L1 = await page.evaluate(() => window.__game!.tuning.gfL1GoalCount);
};

const VENT_LINES: Record<Dir, (i: number) => [number, number]> = {
  down: (i) => [i, 0],
  up: (i) => [i, SIZE - 1],
  right: (i) => [0, i],
  left: (i) => [SIZE - 1, i],
};
const ALL_DIRS: Dir[] = ['up', 'right', 'down', 'left'];

/** Full board of pattern (x + 2y) % 4 with one hole next to the gate; the gate piece refills the hole. F7 is `down`. */
const fullBoard = (dir: Dir, extra: Partial<GatefallFixture> = {}): GatefallFixture => {
  const [hx, hy] = VENT_LINES[dir](0);
  const cells: [number, number, number][] = [];
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) if (x !== hx || y !== hy) cells.push([x, y, (x + 2 * y) % 4]);
  }
  return fixture(cells, { gates: gatesWith(dir, 0, (hx + 2 * hy) % 4), ...extra });
};
const F7 = (extra: Partial<GatefallFixture> = {}) => fullBoard('down', extra);
const ventsOf = (events: GatefallEvent[]) =>
  events.filter((e): e is Extract<GatefallEvent, { type: 'vent' }> => e.type === 'vent');

test.describe('Gatefall C3: cấu hình màn và mục tiêu', () => {
  for (const level of LEVELS) {
    test(`C3.1 màn ${level + 1}: cấu hình và goals khớp tuning`, async ({ page }) => {
      await openC3(page);
      const { s, tuning, scene } = await page.evaluate((lv) => {
        const t = window.__game!.tuning as unknown as Record<string, number>;
        const api = window.__game!.gatefall!;
        api.loadLevel(lv);
        return {
          s: api.createSim(lv, t[`gfL${lv + 1}Seed`]).getState(),
          tuning: { ...t },
          scene: window.__game!.getState<GatefallState>()!,
        };
      }, level);
      const n = level + 1;
      for (const state of [s, scene]) {
        expect(state.seed).toBe(tuning[`gfL${n}Seed`]);
        expect(state.colorCount).toBe(tuning[`gfL${n}Colors`]);
        expect(state.tiltLimit).toBe(tuning[`gfL${n}TiltLimit`]);
        expect(state.tiltsLeft).toBe(tuning[`gfL${n}TiltLimit`]);
        expect(state.goals).toHaveLength(tuning[`gfL${n}GoalColors`]);
        state.goals.forEach((goal, i) => {
          expect(goal).toEqual({ color: i, target: tuning[`gfL${n}GoalCount`], collected: 0, remaining: tuning[`gfL${n}GoalCount`] });
        });
      }
    });

    test(`C3.1 màn ${level + 1}: đổi tuning thì màn mới đổi theo, sim đang chơi giữ nguyên`, async ({ page }) => {
      await openC3(page);
      const result = await page.evaluate((lv) => {
        const t = window.__game!.tuning as unknown as Record<string, number>;
        const n = lv + 1;
        const api = window.__game!.gatefall!;
        const running = api.createSim(lv, 7);
        const hash = running.getState().stateHash;
        t[`gfL${n}Colors`] = 6;
        t[`gfL${n}TiltLimit`] = 31;
        t[`gfL${n}GoalColors`] = 1;
        t[`gfL${n}GoalCount`] = 23;
        t.gfVentTiltCost = 4;
        const fresh = api.createSim(lv, 7).getState();
        return { hash, runningAfter: running.getState(), fresh };
      }, level);
      expect(result.runningAfter.stateHash).toBe(result.hash);
      expect(result.fresh.colorCount).toBe(6);
      expect(result.fresh.tiltLimit).toBe(31);
      expect(result.fresh.goals).toEqual([{ color: 0, target: 23, collected: 0, remaining: 23 }]);
    });
  }

  test('C3.2 collected vượt target giữ giá trị thật, remaining = 0, màu kia chưa đủ thì vẫn chơi', async ({ page }) => {
    await openC3(page);
    const { after } = await simTilt(page, { ...F2(), collected: [GOAL_L1 - 1, 0, 0, 0] });
    expect(after.collected[0]).toBe(GOAL_L1 + 2);
    expect(after.goals[0]).toEqual({ color: 0, target: GOAL_L1, collected: GOAL_L1 + 2, remaining: 0 });
    expect(after.goals[1].remaining).toBe(GOAL_L1 - 3);
    expect(after.status).toBe('playing');
  });

  test('C3.2 thắng khi cả hai màu vượt target vẫn giữ collected thật', async ({ page }) => {
    await openC3(page);
    const { after } = await simTilt(page, { ...F2(), collected: [GOAL_L1 + 5, GOAL_L1 - 1, 0, 0] });
    expect(after.status).toBe('won');
    expect(after.collected.slice(0, 2)).toEqual([GOAL_L1 + 8, GOAL_L1 + 2]);
    expect(after.goals.map((g) => g.remaining)).toEqual([0, 0]);
  });

  test('Đường sai: chỉ đủ một trong hai màu mục tiêu thì chưa thắng', async ({ page }) => {
    await openC3(page);
    const { after } = await simTilt(page, { ...F1(), tiltsLeft: 5, collected: [GOAL_L1, GOAL_L1 - 1, 0, 0] });
    expect(after.status).toBe('playing');
    expect(after.loseReason).toBeNull();
  });

  test('Đường sai: màu ngoài mục tiêu đủ số lượng không tính thắng', async ({ page }) => {
    await openC3(page);
    const { after } = await simTilt(page, { ...F1(), tiltsLeft: 5, collected: [0, 0, 99, 99] });
    expect(after.status).toBe('playing');
  });
});

test.describe('Gatefall C3: thứ tự kết lượt', () => {
  test('C3.3 thắng ở lượt cuối chỉ nhờ cascade bước 2', async ({ page }) => {
    await openC3(page);
    const { after, result } = await simTilt(page, { ...F4(), tiltsLeft: 1, collected: [GOAL_L1, GOAL_L1 - 3, 0, 0] });
    expect(after.status).toBe('won');
    expect(after.loseReason).toBeNull();
    expect(after.tiltsLeft).toBe(0);
    expect(after.lastChain).toBe(2);
    const steps = clears(result.events);
    expect(steps.map((e) => [e.chain, e.color])).toEqual([[1, 0], [2, 1]]);
    expect(after.validTilts).toEqual([]);
  });

  test('C3.3 đối chứng: thiếu 1 quân ở cascade thì thua', async ({ page }) => {
    await openC3(page);
    const { after } = await simTilt(page, { ...F4(), tiltsLeft: 1, collected: [GOAL_L1, GOAL_L1 - 4, 0, 0] });
    expect(after.status).toBe('lost');
    expect(after.loseReason).toBe('outOfTilts');
  });

  test('C3.4 hết lượt khi chưa đủ mục tiêu thì thua outOfTilts', async ({ page }) => {
    await openC3(page);
    const { after } = await simTilt(page, { ...F1(), tiltsLeft: 1 });
    expect(after.status).toBe('lost');
    expect(after.loseReason).toBe('outOfTilts');
    expect(after.tiltsLeft).toBe(0);
    expect(after.validTilts).toEqual([]);
    expect(after.campaignComplete).toBe(false);
  });

  test('Bước 8.1 trước 8.3: thắng khi bàn đầy thì không xả', async ({ page }) => {
    await openC3(page);
    const { after, result } = await simTilt(page, F7({ tiltsLeft: 10, collected: [GOAL_L1, GOAL_L1, 0, 0] }));
    expect(after.status).toBe('won');
    expect(after.ventCount).toBe(0);
    expect(ventsOf(result.events)).toEqual([]);
    expect(countPieces(after.board)).toBe(SIZE * SIZE);
    expect(after.tiltsLeft).toBe(9);
  });

  test('Producer chốt: bàn đầy ở lượt cuối thì thua ngay, không xả', async ({ page }) => {
    await openC3(page);
    const { after, result } = await simTilt(page, F7({ tiltsLeft: 1 }));
    expect(after.status).toBe('lost');
    expect(after.loseReason).toBe('outOfTilts');
    expect(after.ventCount).toBe(0);
    expect(ventsOf(result.events)).toEqual([]);
    expect(countPieces(after.board)).toBe(SIZE * SIZE);
    expect(after.tiltsLeft).toBe(0);
  });

  test('Thắng ở lượt cuối khi bàn đầy: won, không xả', async ({ page }) => {
    await openC3(page);
    const { after, result } = await simTilt(page, F7({ tiltsLeft: 1, collected: [GOAL_L1, GOAL_L1, 0, 0] }));
    expect(after.status).toBe('won');
    expect(after.loseReason).toBeNull();
    expect(ventsOf(result.events)).toEqual([]);
  });
});

test.describe('Gatefall C3: xả bàn', () => {
  test('C3.5 F7, tiltsLeft 10: xả đúng hàng y=0, còn 42 quân, collected không đổi', async ({ page }) => {
    await openC3(page);
    const { after, result } = await simTilt(page, F7({ tiltsLeft: 10 }));
    expect(after.ventCount).toBe(1);
    expect(after.tiltsLeft).toBe(7);
    expect(after.board[0]).toEqual(new Array(SIZE).fill(null));
    expect(countPieces(after.board)).toBe(42);
    expect(after.collected).toEqual([0, 0, 0, 0]);
    expect(after.status).toBe('playing');
    expect(after.validTilts.length).toBeGreaterThanOrEqual(1);
    expect(clears(result.events)).toEqual([]);
  });

  test('C3.5 qua scene cho cùng kết quả với sim', async ({ page }) => {
    await openC3(page);
    const { accepted, after } = await sceneTilt(page, F7({ tiltsLeft: 10 }));
    expect(accepted).toBe(true);
    expect(after.ventCount).toBe(1);
    expect(after.tiltsLeft).toBe(7);
    expect(countPieces(after.board)).toBe(42);
    const { after: sim } = await simTilt(page, F7({ tiltsLeft: 10 }));
    expect(after.stateHash).toBe(sim.stateHash);
    await settleFrames(page);
    await page.screenshot({ path: 'artifacts/gatefall-c3-after-vent.png' });
  });

  test('C3.6 F7, tiltsLeft 2: xả rồi thua, tiltsLeft kẹp ở 0', async ({ page }) => {
    await openC3(page);
    const { after, result } = await simTilt(page, F7({ tiltsLeft: 2 }));
    expect(after.ventCount).toBe(1);
    expect(after.tiltsLeft).toBe(0);
    expect(after.status).toBe('lost');
    expect(after.loseReason).toBe('outOfTilts');
    expect(after.validTilts).toEqual([]);
    expect(countPieces(after.board)).toBe(42);
    const vent = ventsOf(result.events)[0];
    expect(vent.tiltCost, 'Producer chốt: tiltCost là chi phí cấu hình').toBe(2);
    const end = result.events[result.events.length - 1];
    expect(end).toMatchObject({ type: 'turnEnd', status: 'lost', tiltsLeft: 0 });
  });

  for (const [start, left, status] of [[3, 0, 'lost'], [4, 1, 'playing']] as const) {
    test(`Biên xả: tiltsLeft ${start} còn ${left}, ${status}`, async ({ page }) => {
      await openC3(page);
      const { after } = await simTilt(page, F7({ tiltsLeft: start }));
      expect(after.ventCount).toBe(1);
      expect(after.tiltsLeft).toBe(left);
      expect(after.status).toBe(status);
    });
  }

  test('Producer chốt: chi phí lớn hơn số lượt còn lại, tiltCost vẫn là cấu hình, turnEnd là số thật', async ({ page }) => {
    await openC3(page);
    const { result, after } = await page.evaluate((fx) => {
      window.__game!.tuning.gfVentTiltCost = 4;
      const sim = window.__game!.gatefall!.createSim(0, 101, fx);
      const r = sim.tilt('down');
      return { result: r, after: sim.getState() };
    }, F7({ tiltsLeft: 3 }));
    expect(ventsOf(result.events)[0].tiltCost).toBe(4);
    expect(result.events[result.events.length - 1]).toMatchObject({ type: 'turnEnd', tiltsLeft: 0, status: 'lost' });
    expect(after.tiltsLeft).toBe(0);
  });

  test('Đổi gfVentTiltCost giữa màn không ảnh hưởng màn đang chơi', async ({ page }) => {
    await openC3(page);
    const after = await page.evaluate((fx) => {
      const sim = window.__game!.gatefall!.createSim(0, 101, fx);
      window.__game!.tuning.gfVentTiltCost = 4;
      sim.tilt('down');
      return sim.getState();
    }, F7({ tiltsLeft: 10 }));
    expect(after.tiltsLeft).toBe(7);
  });

  for (const dir of ALL_DIRS) {
    test(`Xả hướng ${dir}: đúng làn sát cửa, thứ tự quét, sau gateRefill, trước turnEnd, còn hướng hợp lệ`, async ({ page }) => {
      await openC3(page);
      const { after, result, before } = await simTilt(page, fullBoard(dir, { tiltsLeft: 10 }), dir);
      const line = Array.from({ length: SIZE }, (_, i) => VENT_LINES[dir](i));
      expect(after.ventCount).toBe(1);
      expect(after.tiltsLeft).toBe(7);
      expect(countPieces(after.board)).toBe(42);
      for (const [x, y] of line) expect(after.board[y][x]).toBeNull();
      expect(after.collected).toEqual(before.collected);

      const vents = ventsOf(result.events);
      expect(vents).toHaveLength(1);
      expect(vents[0].dir).toBe(dir);
      expect(vents[0].tiltCost).toBe(2);
      expect(vents[0].cells).toEqual(line.map(([x, y]) => ({ x, y })));
      expect(vents[0].seq).toBe(result.events.length - 2);
      expect(result.events[vents[0].seq - 1].type).toBe('gateRefill');
      expect(result.events[result.events.length - 1].type).toBe('turnEnd');
      expect(after.status).toBe('playing');
      expect(after.validTilts).toContain(dir);
      expect(after.validTilts.length).toBeGreaterThanOrEqual(1);
    });

    test(`Xả hướng ${dir} không dùng RNG: hash khớp công thức với RNG chỉ do refill`, async ({ page }) => {
      await openC3(page);
      const result = await page.evaluate(([fx, d]) => {
        const data = fx as GatefallFixture;
        const sim = window.__game!.gatefall!.createSim(0, 101, data);
        sim.tilt(d as Dir);
        return { hash: sim.getState().stateHash, vents: sim.getState().ventCount, expected: window.__qaVent!.expectedHash(0, 101, data, d as Dir) };
      }, [fullBoard(dir, { tiltsLeft: 10 }), dir] as const);
      expect(result.vents).toBe(1);
      expect(result.hash).toBe(result.expected);
    });
  }

  test('Xả không dùng RNG: đợt rút sau xả giống hệt ván cùng seed không xả', async ({ page }) => {
    await openC3(page);
    const noVent = fixture([[3, 3, 1]], { gates: gatesWith('down', 0, 0), tiltsLeft: 10 });
    const result = await page.evaluate(([full, empty]) => {
      const api = window.__game!.gatefall!;
      const a = api.createSim(0, 101, full as GatefallFixture);
      const b = api.createSim(0, 101, empty as GatefallFixture);
      a.tilt('down');
      b.tilt('down');
      const first = [a.getState().gates.down, b.getState().gates.down];
      const vents = a.getState().ventCount + b.getState().ventCount * 100;
      const colors = (sim: typeof a) => sim.tilt('down').events.flatMap((e) => (e.type === 'gateRefill' ? [e.color] : []));
      return { first, vents, second: [colors(a), colors(b)] };
    }, [F7({ tiltsLeft: 10 }), noVent] as const);
    expect(result.vents, 'chỉ ván đầu có xả').toBe(1);
    expect(result.first[0]).toEqual(result.first[1]);
    expect(result.second[0].length).toBeGreaterThan(0);
    expect(result.second[0]).toEqual(result.second[1]);
  });

  for (const dir of ALL_DIRS) {
    test(`Nhiều lần xả trong một ván từ fixture dày ${dir}: công thức C3.7 đúng từng bước`, async ({ page }) => {
      await openC3(page);
      const run = await page.evaluate((fx) => {
        const path = window.__qaVent!.search(0, 101, fx, 40);
        return window.__qaVent!.replay(0, 101, fx, path, 1);
      }, fullBoard(dir));
      expect(run.failures).toEqual([]);
      expect(run.vents, `chuỗi ${run.path.join(',')}`).toBeGreaterThanOrEqual(3);
      expect(['won', 'lost']).toContain(run.status);
    });
  }
});

test.describe('Gatefall C3: chơi hết ván từ seed thật', () => {
  for (const level of LEVELS) {
    test(`C3.7 màn ${level + 1}: 200 seed ngẫu nhiên, mọi trạng thái playing có nước đi, công thức đúng`, async ({ page }) => {
      await openC3(page);
      const out = await page.evaluate(([lv, seeds]) => {
        const failures: string[] = [];
        let won = 0;
        let lost = 0;
        let unfinished = 0;
        let vents = 0;
        let playingStates = 0;
        for (let seed = 1; seed <= seeds; seed += 1) {
          const run = window.__qaVent!.replay(lv, seed, null, [], 0x51ed27);
          failures.push(...run.failures);
          vents += run.vents;
          playingStates += run.playingStates;
          if (run.status === 'won') won += 1;
          else if (run.status === 'lost') lost += 1;
          else unfinished += 1;
        }
        return { failures: failures.slice(0, 10), won, lost, unfinished, vents, playingStates };
      }, [level, SEEDS] as const);
      console.log(`C3.7 L${level + 1}: won ${out.won}, lost ${out.lost}, vents ${out.vents}, playing states ${out.playingStates}`);
      expect(out.failures).toEqual([]);
      expect(out.unfinished, 'mọi ván phải kết thúc').toBe(0);
      expect(out.won + out.lost).toBe(SEEDS);
      expect(out.lost, 'phải có ván thua thật').toBeGreaterThan(0);
    });

    test(`C3.7 màn ${level + 1}: ván có xả thật từ seed thật, công thức đúng, không kẹt`, async ({ page }) => {
      test.setTimeout(120_000);
      await openC3(page);
      const out = await page.evaluate((lv) => {
        const failures: string[] = [];
        const dirs = new Set<Dir>();
        let games = 0;
        let vents = 0;
        let maxVents = 0;
        let sample = '';
        for (let seed = 1; seed <= 40; seed += 1) {
          const path = window.__qaVent!.search(lv, seed, null, 30);
          const run = window.__qaVent!.replay(lv, seed, null, path, 7);
          failures.push(...run.failures);
          if (run.vents > 0) games += 1;
          vents += run.vents;
          run.ventDirs.forEach((d) => dirs.add(d));
          if (run.vents > maxVents) {
            maxVents = run.vents;
            sample = `seed ${seed}: ${run.path.join(',')}`;
          }
          if (run.status === 'playing') failures.push(`seed ${seed}: chưa kết thúc`);
        }
        return { failures: failures.slice(0, 10), games, vents, maxVents, dirs: [...dirs].sort(), sample };
      }, level);
      console.log(`C3.7 xả thật L${level + 1}: ${out.games}/40 ván có xả, ${out.vents} lần, tối đa ${out.maxVents}, hướng ${out.dirs}; ${out.sample}`);
      expect(out.failures).toEqual([]);
      expect(out.games, 'beam search phải tạo được ván có xả từ seed thật').toBeGreaterThan(0);
      expect(out.maxVents).toBeGreaterThanOrEqual(2);
    });
  }
});

test.describe('Gatefall C3: không kẹt ở seed thật', () => {
  for (const level of LEVELS) {
    test(`Màn ${level + 1}: 1000 seed, 3 cách chơi, cộng 100 seed ép xả, không có playing mà hết hướng`, async ({ page }) => {
      test.setTimeout(120_000);
      await openC3(page);
      const out = await page.evaluate((lv) => {
        const failures: string[] = [];
        let games = 0;
        let vents = 0;
        let states = 0;
        const take = (run: VentRun) => {
          failures.push(...run.failures);
          if (run.status === 'playing') failures.push(`chưa kết thúc: ${run.path.join(',')}`);
          games += 1;
          vents += run.vents;
          states += run.playingStates;
        };
        for (let seed = 1; seed <= 1000; seed += 1) {
          for (const salt of [11, 222, 3333]) take(window.__qaVent!.replay(lv, seed, null, [], salt));
        }
        for (let seed = 1001; seed <= 1100; seed += 1) {
          const path = window.__qaVent!.search(lv, seed, null, 20);
          for (const salt of [11, 222, 3333]) take(window.__qaVent!.replay(lv, seed, null, path, salt));
        }
        return { failures: failures.slice(0, 10), games, vents, states };
      }, level);
      console.log(`Không kẹt L${level + 1}: ${out.games} ván, ${out.states} trạng thái playing, ${out.vents} lần xả`);
      expect(out.failures).toEqual([]);
      expect(out.vents, 'phép quét phải đi qua nhánh xả').toBeGreaterThan(100);
    });
  }
});

test.describe('Gatefall C3: sau khi ván kết thúc', () => {
  const ended: [string, () => GatefallFixture][] = [
    ['won', () => ({ ...F4(), tiltsLeft: 1, collected: [GOAL_L1, GOAL_L1 - 3, 0, 0] })],
    ['lost', () => ({ ...F1(), tiltsLeft: 1 })],
    ['lost do xả', () => F7({ tiltsLeft: 2 })],
  ];
  for (const [name, data] of ended) {
    test(`C3.8 ${name}: tilt mọi hướng bị từ chối, hash không đổi, validTilts rỗng`, async ({ page }) => {
      await openC3(page);
      const out = await page.evaluate((fx) => {
        const sim = window.__game!.gatefall!.createSim(0, 101, fx);
        sim.tilt('down');
        const end = sim.getState();
        const tries = (['up', 'right', 'down', 'left'] as Dir[]).map((d) => {
          const result = sim.tilt(d);
          return { d, result, s: sim.getState() };
        });
        return { end, tries };
      }, data());
      expect(out.end.status).toBe(name === 'won' ? 'won' : 'lost');
      expect(out.end.validTilts).toEqual([]);
      out.tries.forEach(({ d, result, s }, i) => {
        expect(result.accepted).toBe(false);
        expect(result.events).toEqual([{ seq: 0, type: 'tiltRejected', dir: d }]);
        expect(s.lastEvents).toEqual(result.events);
        expect(s.stateHash).toBe(out.end.stateHash);
        expect(s.validTilts).toEqual([]);
        expect(s.status).toBe(out.end.status);
        expect(s.tiltsLeft).toBe(out.end.tiltsLeft);
        expect(s.tiltsUsed).toBe(out.end.tiltsUsed);
        expect(s.board).toEqual(out.end.board);
        expect(s.gates).toEqual(out.end.gates);
        expect(s.collected).toEqual(out.end.collected);
        expect(s.rejectedTilts).toBe(out.end.rejectedTilts + i + 1);
      });
    });

    test(`C3.8 ${name} qua scene: tilt trả false, hash không đổi`, async ({ page }) => {
      await openC3(page);
      await page.evaluate(installQaClock);
      const out = await page.evaluate((fx) => {
        const api = window.__game!.gatefall!;
        api.loadFixture(fx);
        api.tilt('down');
        // Without this the four tilts below would only hit the playback lock, not the ended-game rule.
        window.__qaClock!.finishAnim();
        const end = window.__game!.getState<GatefallState>()!;
        const returned = (['up', 'right', 'down', 'left'] as Dir[]).map((d) => api.tilt(d));
        return { end, returned, after: window.__game!.getState<GatefallState>()! };
      }, data());
      expect(out.end.status).toBe(name === 'won' ? 'won' : 'lost');
      expect(out.returned).toEqual([false, false, false, false]);
      expect(out.end.animating).toBe(false);
      expect(out.after.rejectedTilts).toBe(out.end.rejectedTilts + 4);
      expect(out.after.stateHash).toBe(out.end.stateHash);
      expect(out.after.validTilts).toEqual([]);
    });
  }
});

test.describe('Gatefall C3: thua rồi tạo lại màn', () => {
  for (const level of LEVELS) {
    test(`Mục 4.5 màn ${level + 1}: thua thật nhiều lần vẫn cho cùng cửa, cùng hash, cùng đợt rút`, async ({ page }) => {
      await openC3(page);
      await page.evaluate(installQaClock);
      const out = await page.evaluate((lv) => {
        const api = window.__game!.gatefall!;
        let seed = 0;
        let path: Dir[] = [];
        const baselines: Record<number, string> = {};
        for (let candidate = 1; candidate <= 200; candidate += 1) {
          baselines[candidate] = api.createSim(lv, candidate).getState().stateHash;
        }
        for (let candidate = 1; candidate <= 200 && !seed; candidate += 1) {
          const attempt = window.__qaVent!.replay(lv, candidate, null, [], 0x51ed27);
          if (attempt.status === 'lost') {
            seed = candidate;
            path = attempt.path;
          }
        }
        if (!seed) return null;
        const cycles = [];
        for (let i = 0; i < 4; i += 1) {
          api.loadLevel(lv, seed);
          const start = window.__game!.getState<GatefallState>()!;
          const hashes: string[] = [];
          const gates: string[] = [];
          for (const dir of path) {
            if (!api.tilt(dir)) throw new Error('valid tilt was not accepted');
            window.__qaClock!.finishAnim();
            const s = window.__game!.getState<GatefallState>()!;
            hashes.push(s.stateHash);
            gates.push(JSON.stringify(s.gates));
          }
          const status = window.__game!.getState<GatefallState>()!.status;
          cycles.push({ hash: start.stateHash, gates: start.gates, board: start.board, played: { hashes, gates, status } });
        }
        const fresh = api.createSim(lv, seed).getState();
        const changed: number[] = [];
        for (let candidate = 1; candidate <= 200; candidate += 1) {
          if (api.createSim(lv, candidate).getState().stateHash !== baselines[candidate]) changed.push(candidate);
        }
        return { seed, baseline: baselines[seed], cycles, fresh, changed };
      }, level);
      expect(out, 'phải tìm được ván thua thật').not.toBeNull();
      const data = out!;
      expect(data.changed, 'hash đầu các seed không đổi sau khi đã có ván thua').toEqual([]);
      for (const cycle of data.cycles) {
        expect(cycle.played.status).toBe('lost');
        expect(cycle.hash).toBe(data.baseline);
        expect(cycle.gates).toEqual(data.cycles[0].gates);
        expect(cycle.board).toEqual(data.cycles[0].board);
        expect(cycle.played.hashes).toEqual(data.cycles[0].played.hashes);
        expect(cycle.played.gates).toEqual(data.cycles[0].played.gates);
      }
      expect(data.fresh.stateHash).toBe(data.baseline);
      expect(data.fresh.gates).toEqual(data.cycles[0].gates);
    });
  }

  test('Mục 4.5: thua do xả rồi tạo lại vẫn cùng hash đầu', async ({ page }) => {
    await openC3(page);
    const out = await page.evaluate(() => {
      const api = window.__game!.gatefall!;
      for (let seed = 1; seed <= 200; seed += 1) {
        const before = api.createSim(0, seed).getState();
        const path = window.__qaVent!.search(0, seed, null, 30);
        const sim = api.createSim(0, seed);
        path.forEach((dir) => sim.tilt(dir));
        // Keep tilting until the game ends; only a game whose final tilt vented counts as lost by venting.
        for (let i = 0; i < 60 && sim.getState().status === 'playing'; i += 1) {
          const valid = sim.getState().validTilts;
          sim.tilt(valid[i % valid.length]);
        }
        const end = sim.getState();
        if (end.status !== 'lost' || !end.lastEvents.some((e) => e.type === 'vent')) continue;
        return { seed, before, end, after: api.createSim(0, seed).getState() };
      }
      return null;
    });
    expect(out, 'phải tìm được ván thật thua ngay tại lượt xả').not.toBeNull();
    expect(out!.end.ventCount).toBeGreaterThan(0);
    expect(out!.end.tiltsLeft).toBe(0);
    expect(out!.after.stateHash).toBe(out!.before.stateHash);
    expect(out!.after.gates).toEqual(out!.before.gates);
    expect(out!.after.board).toEqual(out!.before.board);
  });

  test('restart sau khi ván kết thúc trả về đúng trạng thái đầu màn', async ({ page }) => {
    await openC3(page);
    await page.evaluate(installQaClock);
    const initial = await readState(page);
    await page.evaluate(() => {
      const api = window.__game!.gatefall!;
      for (let i = 0; i < 200; i += 1) {
        const s = window.__game!.getState<GatefallState>()!;
        if (s.status !== 'playing') break;
        if (!api.tilt(s.validTilts[i % s.validTilts.length])) throw new Error('valid tilt was not accepted');
        window.__qaClock!.finishAnim();
      }
    });
    const ended = await readState(page);
    expect(ended.status).not.toBe('playing');
    await page.evaluate(() => window.__game!.restart());
    await page.waitForFunction((hash) => {
      const s = window.__game?.getState<GatefallState>();
      return s?.status === 'playing' && s.tiltsUsed === 0 && s.stateHash === hash;
    }, initial.stateHash);
    const after = await readState(page);
    expect(after.gates).toEqual(initial.gates);
    expect(after.rejectedTilts).toBe(0);
    expect(after.ventCount).toBe(0);
    expect(after.loseReason).toBeNull();
  });
});
