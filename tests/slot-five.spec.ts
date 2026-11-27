import { expect, test, type Page } from '@playwright/test';
import type { SlotFiveState } from '../src/scenes/SlotFiveScene';

/**
 * Slot Five acceptance tests, brief v4 (4x4 grid). Expectations come from section 8 of docs/briefs/slot-five.md.
 * `__qaSf` is an independent implementation of section 4.2 (mulberry32, stream seeds, column-first weighted draw of
 * 16 cells) and `__qaSfEval` of sections 4.3 to 4.6 and 4.10 (14 lines, chain values, battle, analytic formula), so the
 * game is not checked against itself.
 */

type Grid = number[][];

interface QaSfLib {
  streamSeed(seed: number, k: number): number;
  rng(seed: number): { next(): number; int(n: number): number };
  weights(): number[];
  draw(rng: { int(n: number): number }, weights: number[]): Grid;
  refGrids(seed: number, stream: number, count: number): Grid[];
  same(a: Grid, b: Grid): boolean;
}

declare global {
  interface Window {
    __qaSf?: QaSfLib;
    __qaSimA?: { spin(): { spinIndex: number; grid: Grid } };
    __qaSimALog?: { spinIndex: number; grid: Grid }[];
    __qaSfEval?: QaEvalLib;
  }
}

const COIN_HOP_KEYS = ['coins', 'elapsedMs', 'grounded', 'status', 'totalCoins', 'vx', 'vy', 'x', 'y'];
const ARC_RELAY_KEYS = [
  'arcCount', 'arcTargetId', 'arcTargetableId', 'arcing', 'elapsedMs', 'gameId', 'grounded', 'loseReason',
  'pylons', 'pylonsLit', 'pylonsTotal', 'restartLockLeftMs', 'status', 'timeLeftMs', 'timeLimitMs', 'vfxKeys',
  'vfxPlays', 'vx', 'vy', 'x', 'y',
];
const GATEFALL_KEYS = [
  'animating', 'board', 'boardSize', 'campaignComplete', 'collected', 'colorCount', 'endLockLeftMs', 'gameId',
  'gates', 'goals', 'lastAnimMs', 'lastChain', 'lastEvents', 'lastTiltDir', 'levelCount', 'levelIndex',
  'loseReason', 'rejectFeedbacks', 'rejectedTilts', 'seed', 'stateHash', 'status', 'tiltLimit', 'tiltsLeft',
  'tiltsUsed', 'validTilts', 'ventCount', 'viewCounts', 'waveSize',
];
/** Fields that exist only on Slot Five. None of them may leak into another game's state. */
const SLOT_FIVE_ONLY = ['cols', 'rows', 'iconCount', 'luckyIcon', 'grid', 'spinIndex', 'phase', 'matchIndex'];
const WEIGHT_KEYS = ['sfWFire', 'sfWVolt', 'sfWFrost', 'sfWEarth', 'sfWBlade', 'sfWHeal', 'sfWShield', 'sfWLucky'];

const installQaLib = () => {
  const streamSeed = (seed: number, k: number) => (seed + Math.imul(k + 1, 0x9e3779b9)) >>> 0;
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
  const weights = () => {
    const t = window.__game!.tuning as unknown as Record<string, number>;
    return ['Fire', 'Volt', 'Frost', 'Earth', 'Blade', 'Heal', 'Shield', 'Lucky'].map((n) => t[`sfW${n}`]);
  };
  /** Section 4.2 (v4): 16 cells column-first on a 4x4 grid, r = int(total), first icon whose running sum exceeds r. */
  const draw = (r: { int(n: number): number }, w: number[]) => {
    const total = w.reduce((a, b) => a + b, 0);
    const grid: number[][] = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
    for (let x = 0; x < 4; x += 1) {
      for (let y = 0; y < 4; y += 1) {
        const v = r.int(total);
        let sum = 0;
        let icon = 0;
        for (; icon < w.length; icon += 1) {
          sum += w[icon];
          if (sum > v) break;
        }
        grid[y][x] = icon;
      }
    }
    return grid;
  };
  const refGrids = (seed: number, stream: number, count: number) => {
    const r = rng(streamSeed(seed, stream));
    const w = weights();
    return Array.from({ length: count }, () => draw(r, w));
  };
  const same = (a: number[][], b: number[][]) =>
    a.length === b.length && a.every((row, y) => row.length === b[y].length && row.every((v, x) => v === b[y][x]));
  window.__qaSf = { streamSeed, rng, weights, draw, refGrids, same };
};

/** Fixture base B from section 8: grid[y][x] = (x + 2y) % 4. */
const baseB = (): Grid => Array.from({ length: 4 }, (_, y) => Array.from({ length: 4 }, (_, x) => (x + 2 * y) % 4));
/** F1: B with (0,0) (1,0) (2,0) = 4. */
const F1 = (): Grid => {
  const g = baseB();
  for (const [x, y] of [[0, 0], [1, 0], [2, 0]]) g[y][x] = 4;
  return g;
};

interface RefChain { icon: number; dir: string; length: number; cells: [number, number][]; kind: string; value: number }
interface RefEffects { damage: number; heal: number; shield: number }
interface RefEval { chains: RefChain[]; effects: RefEffects }
interface RefFighter { hp: number; maxHp: number; shield: number }
interface RefSetup { player?: Partial<RefFighter>; foe?: Partial<RefFighter>; turn?: 'player' | 'foe'; grids?: Grid[] }
interface QaEvalLib {
  evaluate(grid: Grid): RefEval;
  analytic(): RefEffects;
  battle(seed: number, setup?: RefSetup): { getState(): unknown; spin(): Record<string, unknown> };
}

/**
 * Independent brute-force checker for sections 4.3, 4.4 and 4.6 (v4). On the 4x4 grid it walks every line of 3 or
 * more cells from its start cell (14 lines), splits it into maximal runs and keeps runs of 3 or more. Ordering:
 * by direction h, v, dr, ur, then by the chain's first cell in scan order (y first, then x).
 * A length other than 3 or 4 gets value NaN, so a stray 5-chain would show up as a mismatch.
 */
const installQaEval = () => {
  const NAMES = ['Fire', 'Volt', 'Frost', 'Earth', 'Blade', 'Heal', 'Shield', 'Lucky'];
  const KINDS = ['damage', 'damage', 'damage', 'damage', 'damage', 'heal', 'shield', 'none'];
  const DIRS: [string, number, number][] = [['h', 1, 0], ['v', 0, 1], ['dr', 1, 1], ['ur', 1, -1]];
  const t = () => window.__game!.tuning as unknown as Record<string, number>;
  const evaluate = (grid: number[][]) => {
    const tu = t();
    const mult = (len: number) => (len === 3 ? 1 : len === 4 ? tu.sfLen4Mult : NaN);
    const chains: RefChain[] = [];
    for (const [dir, dx, dy] of DIRS) {
      const found: RefChain[] = [];
      for (let y0 = 0; y0 < 4; y0 += 1) {
        for (let x0 = 0; x0 < 4; x0 += 1) {
          const px = x0 - dx;
          const py = y0 - dy;
          if (px >= 0 && px < 4 && py >= 0 && py < 4) continue; // not the start of a line
          const line: [number, number][] = [];
          for (let x = x0, y = y0; x >= 0 && x < 4 && y >= 0 && y < 4; x += dx, y += dy) line.push([x, y]);
          if (line.length < 3) continue;
          let i = 0;
          while (i < line.length) {
            let j = i;
            const icon = grid[line[i][1]][line[i][0]];
            while (j + 1 < line.length && grid[line[j + 1][1]][line[j + 1][0]] === icon) j += 1;
            const len = j - i + 1;
            if (len >= 3) {
              const kind = KINDS[icon];
              found.push({
                icon, dir, length: len, cells: line.slice(i, j + 1).map(([x, y]) => [x, y] as [number, number]), kind,
                value: kind === 'none' ? 0 : tu[`sfB${NAMES[icon]}`] * mult(len),
              });
            }
            i = j + 1;
          }
        }
      }
      found.sort((a, b) => a.cells[0][1] - b.cells[0][1] || a.cells[0][0] - b.cells[0][0]);
      chains.push(...found);
    }
    const effects = { damage: 0, heal: 0, shield: 0 };
    for (const c of chains) if (c.kind !== 'none') effects[c.kind as keyof RefEffects] += c.value;
    return { chains, effects };
  };
  /** Section 4.6 formula (v4) from the current tuning: E3 = p^3 (4 + 20q), E4 = 10 p^4. */
  const analytic = () => {
    const tu = t();
    const w = NAMES.map((n) => tu[`sfW${n}`]);
    const total = w.reduce((a, b) => a + b, 0);
    const out = { damage: 0, heal: 0, shield: 0 };
    NAMES.forEach((n, i) => {
      if (KINDS[i] === 'none') return;
      const p = w[i] / total;
      const q = 1 - p;
      const e3 = p ** 3 * (4 + 20 * q);
      const e4 = 10 * p ** 4;
      out[KINDS[i] as keyof RefEffects] += tu[`sfB${n}`] * (e3 + tu.sfLen4Mult * e4);
    });
    return out;
  };
  /** Section 4.5, step by step, on top of the QA grid stream (4.2) and the QA evaluator (4.3, 4.4). */
  const battle = (seed: number, setup: RefSetup = {}) => {
    const tu = t();
    const qa = window.__qaSf!;
    const r = qa.rng(qa.streamSeed(seed, 1));
    const w = qa.weights();
    const forced = (setup.grids ?? []).map((g) => g.map((row) => [...row]));
    const mk = (max: number, o?: Partial<RefFighter>) => ({ hp: o?.hp ?? o?.maxHp ?? max, maxHp: o?.maxHp ?? max, shield: o?.shield ?? 0 });
    const f: Record<string, RefFighter> = { player: mk(tu.sfPlayerMaxHp, setup.player), foe: mk(tu.sfFoeMaxHp, setup.foe) };
    let status = 'playing';
    let turn = setup.turn ?? 'player';
    let spinIndex = 0;
    const getState = () => ({
      status, turn, spinIndex, player: { ...f.player }, foe: { ...f.foe },
    });
    const spin = () => {
      const side = turn;
      if (status !== 'playing') return { accepted: false, side };
      const a = f[side];
      const b = f[side === 'player' ? 'foe' : 'player'];
      a.shield = 0;
      const drawn = qa.draw(r, w);
      const grid = forced.shift() ?? drawn;
      spinIndex += 1;
      const { chains, effects } = evaluate(grid);
      const healed = Math.min(a.maxHp, a.hp + effects.heal) - a.hp;
      a.hp += healed;
      a.shield = effects.shield;
      const absorbed = Math.min(b.shield, effects.damage);
      b.shield -= absorbed;
      const hpLoss = Math.min(b.hp, effects.damage - absorbed);
      b.hp -= hpLoss;
      if (b.hp === 0) status = side === 'player' ? 'won' : 'lost';
      else turn = side === 'player' ? 'foe' : 'player';
      return { accepted: true, side, grid, chains, effects, absorbed, hpLoss, healed };
    };
    return { getState, spin };
  };
  window.__qaSfEval = { evaluate, analytic, battle };
};

const openSlotFive = async (page: Page) => {
  await page.addInitScript(installQaLib);
  await page.addInitScript(installQaEval);
  await page.goto('/?game=slot-five');
  await page.waitForFunction(() => {
    const s = window.__game?.getState<SlotFiveState>();
    return s?.gameId === 'slot-five' && Boolean(window.__game?.slotFive);
  });
  if (QA_DEFAULTS) await applyTuningAndReload(page, QA_DEFAULTS);
  if (pinBrief) tuningBeforePin = await applyTuningAndReload(page, BRIEF_TUNING);
};

const readState = (page: Page) => page.evaluate(() => window.__game!.getState<SlotFiveState>()!);

const settleFrames = (page: Page) =>
  page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));

/** Waits until `phase` is one of `phases` (C6: spinning and resolving take real time). */
const waitPhase = (page: Page, phases: string[], timeout = 15_000) =>
  page.waitForFunction((ps) => ps.includes(window.__game?.getState<SlotFiveState>()?.phase ?? ''), phases, { timeout });

/**
 * Short animation timing (lowest values of TUNING_RANGES) for tests that check logic or input, not timing.
 * TUNING is snapshotted at match start, so call `loadMatch` after this. Keys are restored by `setTuning(page, old)`
 * or, in pinned groups, by the pin restore.
 */
const FAST_TIMING = {
  sfSpinBaseMs: 300, sfReelStopGapMs: 80, sfResolveMs: 300, sfBlankResolveMs: 0,
  sfCastDelayMs: 0, sfCastStaggerMs: 0, sfCastFlightMs: 150, sfCastTailMs: 0,
};

/**
 * Base values of section 5 of the brief. Fixture tests (C1.7, C1.8, C2, C3, comeback edges) pin these so their
 * expected numbers stay valid when the Balance Tuner changes the game's defaults. C10 acceptance (later) does not pin:
 * it measures the game's current TUNING.
 */
const BRIEF_TUNING: Record<string, number> = {
  // Bảng 5.1, 5.2, 5.3 bản 4. Không còn sfLen5Mult.
  sfWFire: 8, sfWVolt: 6, sfWFrost: 6, sfWEarth: 8, sfWBlade: 40, sfWHeal: 13, sfWShield: 13, sfWLucky: 6,
  sfBFire: 10, sfBVolt: 15, sfBFrost: 15, sfBEarth: 10, sfBBlade: 5, sfBHeal: 20, sfBShield: 20,
  sfLen4Mult: 2,
  sfPlayerMaxHp: 450, sfFoeMaxHp: 450, sfSeed: 777,
  sfSpinBaseMs: 700, sfReelStopGapMs: 180, sfStopBounceMs: 120, sfReelSpeed: 2.4, sfResolveMs: 900,
  sfBlankResolveMs: 300, sfFoeDelayMs: 500,
  sfCastDelayMs: 150, sfCastStaggerMs: 120, sfCastFlightMs: 350, sfCastTailMs: 250,
  sfFastFactor: 0.35, // bản 4.1, mục 4.11
};

/**
 * Test-only harness to rehearse a tuning change without editing src: SF_QA_DEFAULTS='{"sfBBlade":15}' applies these
 * values as if they were the game's defaults, before any pinning. Unset in normal runs.
 */
const QA_ENV = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.SF_QA_DEFAULTS;
const QA_DEFAULTS: Record<string, number> | null = QA_ENV ? JSON.parse(QA_ENV) : null;

/** Set by `pinBriefTuning()` before `openSlotFive`; the old values are restored after the test. */
let pinBrief = false;
let tuningBeforePin: Record<string, number> | null = null;

/** Call in a test (before `openSlotFive`) or in a describe-level beforeEach to run on the brief's base values. */
const pinBriefTuning = () => {
  pinBrief = true;
};

/**
 * Writes `values` into TUNING, then reloads match 0 with `loadMatch(sfSeed)` so the running match reads them.
 * `loadMatch` is synchronous; `restart()` is queued by Phaser and a test could race the old scene.
 * Returns the old values.
 */
const applyTuningAndReload = async (page: Page, values: Record<string, number>) =>
  page.evaluate((v) => {
    const t = window.__game!.tuning as unknown as Record<string, number>;
    const prev: Record<string, number> = {};
    for (const [k, val] of Object.entries(v)) {
      if (!(k in t)) throw new Error(`TUNING không có khóa ${k}`);
      prev[k] = t[k];
      t[k] = val;
    }
    window.__game!.slotFive!.loadMatch(t.sfSeed);
    return prev;
  }, values);

let problems: string[] = [];

test.beforeEach(({ page }) => {
  pinBrief = false;
  tuningBeforePin = null;
  problems = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
  });
});

test.afterEach(async ({ page }) => {
  if (tuningBeforePin && !page.isClosed()) {
    const restore = tuningBeforePin;
    await page.evaluate((v) => Object.assign(window.__game!.tuning as unknown as Record<string, number>, v), restore);
    const now = await page.evaluate((keys) => {
      const t = window.__game!.tuning as unknown as Record<string, number>;
      return Object.fromEntries(keys.map((k) => [k, t[k]]));
    }, Object.keys(restore));
    expect(now, 'TUNING được khôi phục sau test').toEqual(restore);
  }
  expect(problems, 'không có lỗi console hoặc lỗi trang').toEqual([]);
});

test.describe('Slot Five C1.1: các game cũ không đổi', () => {
  for (const url of ['/', '/?game=khac']) {
    test(`C1.1 ${url} vẫn là Coin Hop đúng 9 trường`, async ({ page }) => {
      await page.goto(url);
      await page.waitForFunction(() => window.__game?.getState()?.status === 'playing');
      const state = await page.evaluate(() => window.__game!.getState()!);
      expect(Object.keys(state).sort()).toEqual(COIN_HOP_KEYS);
      expect(state).not.toHaveProperty('gameId');
      expect(state.totalCoins).toBe(3);
      expect(state.coins).toBe(0);
      expect(await page.evaluate(() => window.__game!.slotFive)).toBeUndefined();
      expect(await page.evaluate(() => document.title)).not.toBe('Slot Five');
      expect(await page.evaluate(() => document.body.classList.contains('game-slot-five'))).toBe(false);
    });
  }

  test('C1.1 /?game=arc-relay vẫn là Arc Relay, không có trường Slot Five', async ({ page }) => {
    await page.goto('/?game=arc-relay');
    await page.waitForFunction(() => window.__game?.getState()?.status === 'playing');
    const state = await page.evaluate(() => window.__game!.getState()! as unknown as Record<string, unknown>);
    expect(state.gameId).toBe('arc-relay');
    expect(Object.keys(state).sort()).toEqual(ARC_RELAY_KEYS);
    for (const key of SLOT_FIVE_ONLY) expect(state, key).not.toHaveProperty(key);
    expect(await page.evaluate(() => window.__game!.slotFive)).toBeUndefined();
  });

  test('C1.1 /?game=gatefall vẫn là Gatefall, không có trường Slot Five', async ({ page }) => {
    await page.goto('/?game=gatefall');
    await page.waitForFunction(() => {
      const s = window.__game?.getState() as unknown as { gameId?: string; status?: string } | null;
      return s?.gameId === 'gatefall' && s.status === 'playing';
    });
    const state = await page.evaluate(() => window.__game!.getState()! as unknown as Record<string, unknown>);
    expect(Object.keys(state).sort()).toEqual(GATEFALL_KEYS);
    for (const key of SLOT_FIVE_ONLY) expect(state, key).not.toHaveProperty(key);
    expect(await page.evaluate(() => window.__game!.slotFive)).toBeUndefined();
    expect(await page.evaluate(() => Boolean(window.__game!.gatefall))).toBe(true);
  });
});

test.describe('Slot Five C1.2: trạng thái đầu', () => {
  test('C1.2 getState đúng hằng số và lưới 4x5 trong [0, 8)', async ({ page }) => {
    await openSlotFive(page);
    const s = await readState(page);
    expect(s.gameId).toBe('slot-five');
    expect(s.cols).toBe(4);
    expect(s.rows).toBe(4);
    expect(s.iconCount).toBe(8);
    expect(s.luckyIcon).toBe(7);
    expect(s.spinIndex).toBe(0);
    expect(s.grid).toHaveLength(4);
    for (const row of s.grid) {
      expect(row).toHaveLength(4);
      for (const v of row) {
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(8);
      }
    }
    // Seed theo báo cáo lập trình: sfSeed = 777, trận đầu matchIndex 0.
    expect(s.seed).toBe(await page.evaluate(() => (window.__game!.tuning as unknown as Record<string, number>).sfSeed));
    expect(s.matchIndex).toBe(0);
    // getState trả bản sao: sửa kết quả không làm đổi trạng thái.
    const untouched = await page.evaluate(() => {
      const a = window.__game!.getState<SlotFiveState>()!;
      a.grid[0][0] = 99;
      return window.__game!.getState<SlotFiveState>()!.grid[0][0];
    });
    expect(untouched).not.toBe(99);
    // Nút platformer bị ẩn ở Slot Five (mục 3).
    for (const id of ['#btn-left', '#btn-right', '#btn-jump']) await expect(page.locator(id)).toBeHidden();
    await settleFrames(page);
    await page.screenshot({ path: 'artifacts/slot-five-c1-start.png' });
  });

  test('Mục 4.2: lưới ban đầu là lưới đầu của luồng init, cố định theo seed', async ({ page }) => {
    await openSlotFive(page);
    const s = await readState(page);
    const ref = await page.evaluate((seed) => window.__qaSf!.refGrids(seed, 0, 1)[0], s.seed);
    expect(s.grid).toEqual(ref);
    // Tải lại trang: cùng seed thì cùng lưới.
    await page.reload();
    await page.waitForFunction(() => window.__game?.getState<SlotFiveState>()?.gameId === 'slot-five');
    // Chỉ khi diễn tập SF_QA_DEFAULTS: tải lại làm mất giá trị giả lập, nên đặt lại như lúc mở.
    if (QA_DEFAULTS) await applyTuningAndReload(page, QA_DEFAULTS);
    expect((await readState(page)).grid).toEqual(s.grid);
  });

  test('Chơi lại: restart() trả về trận đầu, spinIndex 0, lưới như lúc mở', async ({ page }) => {
    await openSlotFive(page);
    const before = await readState(page);
    // forceNextGrid trước khi restart không được sót sang trận sau (không đổi spinIndex hay grid).
    await page.evaluate((g) => window.__game!.slotFive!.forceNextGrid(g), F1());
    await page.evaluate(() => window.__game!.restart());
    await page.waitForFunction(() => window.__game?.getState<SlotFiveState>()?.gameId === 'slot-five');
    const after = await readState(page);
    expect(after).toEqual(before);
  });
});

test.describe('Slot Five C1.3 đến C1.5: tái lập theo seed', () => {
  test('C1.3 hai sim cùng seed giống nhau 1000 lượt, seed 1 đến 50, và khớp bản tham chiếu mục 4.2', async ({ page }) => {
    await openSlotFive(page);
    const out = await page.evaluate(() => {
      const api = window.__game!.slotFive!;
      const qa = window.__qaSf!;
      const mismatches: string[] = [];
      const refMismatches: string[] = [];
      const badIndex: string[] = [];
      let compared = 0;
      for (let seed = 1; seed <= 50; seed += 1) {
        const a = api.createSim(seed);
        const b = api.createSim(seed);
        const ref = qa.refGrids(seed, 1, 1000);
        for (let n = 0; n < 1000; n += 1) {
          const ra = a.spin();
          const rb = b.spin();
          compared += 1;
          if (!qa.same(ra.grid, rb.grid)) mismatches.push(`seed ${seed} lượt ${n}`);
          if (!qa.same(ra.grid, ref[n])) refMismatches.push(`seed ${seed} lượt ${n}`);
          if (ra.spinIndex !== n || rb.spinIndex !== n) badIndex.push(`seed ${seed} lượt ${n}: ${ra.spinIndex}/${rb.spinIndex}`);
        }
      }
      return { compared, mismatches: mismatches.slice(0, 5), refMismatches: refMismatches.slice(0, 5), badIndex: badIndex.slice(0, 5) };
    });
    console.log(`C1.3: so sánh ${out.compared} lượt`);
    expect(out.compared).toBe(50_000);
    expect(out.mismatches).toEqual([]);
    expect(out.badIndex).toEqual([]);
    expect(out.refMismatches, 'lưới khớp bản tham chiếu mulberry32 + luồng spin + rút theo cột').toEqual([]);
  });

  test('C1.4 chèn thao tác không quay giữa các lượt của sim A, lưới thứ n vẫn trùng sim B', async ({ page }) => {
    await openSlotFive(page);
    const SEED = 4242;
    const SPINS = 200;
    await page.evaluate((seed) => {
      window.__qaSimA = window.__game!.slotFive!.createSim(seed);
      window.__qaSimALog = [];
    }, SEED);
    for (let n = 0; n < SPINS; n += 1) {
      // Thao tác không phải quay, mỗi loại xen kẽ, và mỗi lượt quay nằm trong một lần evaluate riêng.
      await page.evaluate((i) => {
        const api = window.__game!.slotFive! as unknown as Record<string, unknown> & {
          createSim(seed: number): { spin(): unknown };
          forceNextGrid(g: number[][]): void;
        };
        window.__game!.getState();
        if (typeof api.evaluate === 'function') {
          (api.evaluate as (g: number[][]) => unknown)(window.__game!.getState<SlotFiveState>()!.grid);
        }
        if (i % 3 === 0) {
          const other = api.createSim(i + 1);
          other.spin();
        }
        if (i % 7 === 0) void (window.__game!.tuning as unknown as Record<string, number>).sfWBlade;
        // forceNextGrid của scene là luồng khác, không được ảnh hưởng sim A.
        if (i % 11 === 0) api.forceNextGrid(window.__game!.getState<SlotFiveState>()!.grid);
      }, n);
      if (n % 25 === 0) await settleFrames(page);
      await page.evaluate(() => window.__qaSimALog!.push(window.__qaSimA!.spin()));
    }
    const out = await page.evaluate(([seed, spins]) => {
      const b = window.__game!.slotFive!.createSim(seed);
      const qa = window.__qaSf!;
      const ref = qa.refGrids(seed, 1, spins);
      const bad: string[] = [];
      window.__qaSimALog!.forEach((ra, n) => {
        const rb = b.spin();
        if (ra.spinIndex !== n || rb.spinIndex !== n) bad.push(`lượt ${n}: spinIndex ${ra.spinIndex}/${rb.spinIndex}`);
        if (!qa.same(ra.grid, rb.grid)) bad.push(`lượt ${n}: A khác B`);
        if (!qa.same(ra.grid, ref[n])) bad.push(`lượt ${n}: A khác tham chiếu (seed, n)`);
      });
      return { count: window.__qaSimALog!.length, bad: bad.slice(0, 5) };
    }, [SEED, SPINS] as const);
    expect(out.count).toBe(SPINS);
    expect(out.bad).toEqual([]);
  });

  test('C1.5 seed 1 và 2 khác nhau ở ít nhất 990 trong 1000 lượt đầu', async ({ page }) => {
    await openSlotFive(page);
    const differing = await page.evaluate(() => {
      const a = window.__game!.slotFive!.createSim(1);
      const b = window.__game!.slotFive!.createSim(2);
      let diff = 0;
      for (let n = 0; n < 1000; n += 1) if (!window.__qaSf!.same(a.spin().grid, b.spin().grid)) diff += 1;
      return diff;
    });
    console.log(`C1.5: ${differing}/1000 lượt khác nhau`);
    expect(differing).toBeGreaterThanOrEqual(990);
  });
});

test.describe('Slot Five C1.6 và C1.7: trọng số', () => {
  test('C1.6 tỉ lệ icon trên 100.000 lượt lệch trọng số không quá 0,003', async ({ page }) => {
    await openSlotFive(page);
    const out = await page.evaluate((keys) => {
      const t = window.__game!.tuning as unknown as Record<string, number>;
      const weights = keys.map((k) => t[k]);
      const total = weights.reduce((a, b) => a + b, 0);
      const counts = new Array<number>(8).fill(0);
      let cells = 0;
      let spins = 0;
      for (let seed = 9001; seed <= 9010; seed += 1) {
        const sim = window.__game!.slotFive!.createSim(seed);
        for (let n = 0; n < 10_000; n += 1) {
          const { grid } = sim.spin();
          spins += 1;
          for (const row of grid) for (const v of row) {
            counts[v] += 1;
            cells += 1;
          }
        }
      }
      const rows = keys.map((key, i) => {
        const expected = weights[i] / total;
        const actual = counts[i] / cells;
        return { key, expected, actual, dev: Math.abs(actual - expected) };
      });
      return { spins, cells, total, rows };
    }, WEIGHT_KEYS);
    console.log(`C1.6: ${out.spins} lượt, ${out.cells} ô, tổng trọng số ${out.total}`);
    for (const r of out.rows) {
      console.log(`  ${r.key}: mong đợi ${r.expected.toFixed(4)}, thực tế ${r.actual.toFixed(4)}, lệch ${r.dev.toFixed(5)}`);
    }
    expect(out.spins).toBe(100_000);
    expect(out.cells).toBe(1_600_000);
    for (const r of out.rows) expect(r.dev, r.key).toBeLessThanOrEqual(0.003);
  });

  test('C1.7 sfWShield = 0 thì 10.000 lượt không có icon 6, và giá trị được khôi phục', async ({ page }) => {
    pinBriefTuning();
    await openSlotFive(page);
    const original = await page.evaluate(() => window.__game!.tuning.sfWShield);
    let out: { shields: number; spins: number; othersSeen: number[] } | undefined;
    try {
      out = await page.evaluate(() => {
        const t = window.__game!.tuning;
        const old = t.sfWShield;
        t.sfWShield = 0;
        try {
          const sim = window.__game!.slotFive!.createSim(31337);
          const seen = new Array<number>(8).fill(0);
          let shields = 0;
          let spins = 0;
          for (let n = 0; n < 10_000; n += 1) {
            spins += 1;
            for (const row of sim.spin().grid) for (const v of row) {
              seen[v] += 1;
              if (v === 6) shields += 1;
            }
          }
          return { shields, spins, othersSeen: seen };
        } finally {
          t.sfWShield = old;
        }
      });
    } finally {
      // Lưới an toàn nếu evaluate hỏng giữa chừng.
      await page.evaluate((v) => {
        window.__game!.tuning.sfWShield = v;
      }, original);
    }
    console.log(`C1.7: ${out!.spins} lượt, icon 6 xuất hiện ${out!.shields} lần, đếm từng icon ${out!.othersSeen.join('/')}`);
    expect(out!.spins).toBe(10_000);
    expect(out!.shields).toBe(0);
    // Các icon khác vẫn xuất hiện: sim không hỏng khi một trọng số bằng 0.
    for (const i of [0, 1, 2, 3, 4, 5, 7]) expect(out!.othersSeen[i], `icon ${i}`).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.__game!.tuning.sfWShield)).toBe(original);
    expect(original).toBe(BRIEF_TUNING.sfWShield);
    // Sau khi khôi phục, sim mới lại có icon 6.
    const shieldsAfter = await page.evaluate(() => {
      const sim = window.__game!.slotFive!.createSim(31337);
      let c = 0;
      for (let n = 0; n < 200; n += 1) for (const row of sim.spin().grid) for (const v of row) if (v === 6) c += 1;
      return c;
    });
    expect(shieldsAfter).toBeGreaterThan(0);
  });
});

test.describe('Slot Five C1.8: forceNextGrid', () => {
  // Fixture có số kỳ vọng theo giá trị gốc của brief: ghim TUNING mục 5.
  test.beforeEach(() => pinBriefTuning());
  type LogicModule = typeof import('../src/game/slotFiveLogic');

  test('C1.8 ép F1 thì lượt đó là F1, lượt kế giống sim không bị ép (tầng logic)', async ({ page }) => {
    await openSlotFive(page);
    const out = await page.evaluate(async (f1) => {
      const mod = (await import('/src/game/slotFiveLogic.ts' as string)) as LogicModule;
      const qa = window.__qaSf!;
      const config = mod.readGridConfig(window.__game!.tuning);
      const results: Record<string, unknown> = {};

      // Ép ở lượt đầu.
      const seed = 555;
      const forced = new mod.SlotFiveGridStream(seed, config);
      const plain = window.__game!.slotFive!.createSim(seed);
      forced.forceNext(f1);
      const r0 = forced.next();
      const p0 = plain.spin();
      const r1 = forced.next();
      const p1 = plain.spin();
      results.firstIsF1 = qa.same(r0.grid, f1);
      results.firstIndex = r0.spinIndex;
      results.nextIndex = r1.spinIndex;
      results.nextMatchesPlain = qa.same(r1.grid, p1.grid);
      results.plainFirstNotF1 = !qa.same(p0.grid, f1);
      // Các lượt sau cũng giữ đúng chuỗi lưới.
      let tailOk = true;
      for (let n = 2; n < 50; n += 1) if (!qa.same(forced.next().grid, plain.spin().grid)) tailOk = false;
      results.tailOk = tailOk;

      // Ép giữa trận (lượt 5), hai lượt liên tiếp (6 và 7), rồi kiểm lượt 8 trở đi.
      const s2 = new mod.SlotFiveGridStream(seed, config);
      const ref = qa.refGrids(seed, 1, 20);
      const mid: string[] = [];
      for (let n = 0; n < 20; n += 1) {
        if (n === 5 || n === 6) s2.forceNext(f1);
        if (n === 6) s2.forceNext(f1); // hàng đợi: ép thêm cho lượt 7
        const r = s2.next();
        const want = n >= 5 && n <= 7 ? f1 : ref[n];
        if (r.spinIndex !== n) mid.push(`lượt ${n}: spinIndex ${r.spinIndex}`);
        if (!qa.same(r.grid, want)) mid.push(`lượt ${n}: lưới sai`);
      }
      results.midProblems = mid;

      // Sửa mảng sau khi ép không được làm đổi lưới đã ép.
      const s3 = new mod.SlotFiveGridStream(seed, config);
      const copy = f1.map((row) => [...row]);
      s3.forceNext(copy);
      copy[0][0] = 7;
      results.copied = qa.same(s3.next().grid, f1);

      // Lưới sai kích thước hoặc giá trị ngoài [0, 8) bị từ chối.
      const bad = [
        f1.slice(0, 3),
        f1.map((row) => row.slice(0, 3)),
        f1.map((row) => [...row, 0]), // 4 hàng x 5 cột (lưới bản 2, 3)
        [...f1, [0, 1, 2, 3]], // 5 hàng x 4 cột
        f1.map((row, y) => (y === 0 ? [8, ...row.slice(1)] : row)),
        f1.map((row, y) => (y === 0 ? [-1, ...row.slice(1)] : row)),
        f1.map((row, y) => (y === 0 ? [1.5, ...row.slice(1)] : row)),
      ];
      results.rejected = bad.map((g) => {
        try {
          new mod.SlotFiveGridStream(seed, config).forceNext(g);
          return false;
        } catch {
          return true;
        }
      });
      return results;
    }, F1());
    expect(out.firstIsF1).toBe(true);
    expect(out.firstIndex).toBe(0);
    expect(out.nextIndex).toBe(1);
    expect(out.nextMatchesPlain).toBe(true);
    expect(out.plainFirstNotF1).toBe(true);
    expect(out.tailOk).toBe(true);
    expect(out.midProblems).toEqual([]);
    expect(out.copied).toBe(true);
    expect(out.rejected).toEqual([true, true, true, true, true, true, true]);
  });

  test('C1.8 (phần scene) forceNextGrid nhận F1 mà không quay, không đổi trạng thái; lưới sai bị từ chối', async ({ page }) => {
    // Scene chưa có lệnh quay (thuộc C3), nên phần "quay ra F1" qua scene sẽ kiểm lại ở C3.
    await openSlotFive(page);
    const before = await readState(page);
    await page.evaluate((g) => window.__game!.slotFive!.forceNextGrid(g), F1());
    await settleFrames(page);
    expect(await readState(page)).toEqual(before);
    const threw = await page.evaluate(() => {
      try {
        window.__game!.slotFive!.forceNextGrid([[0, 1, 2]]);
        return false;
      } catch {
        return true;
      }
    });
    expect(threw).toBe(true);
  });
});

/** Base C from section 8: grid[y][x] = 4 + (x + 2y) % 4. */
const baseC = (): Grid => Array.from({ length: 4 }, (_, y) => Array.from({ length: 4 }, (_, x) => 4 + ((x + 2 * y) % 4)));
const paint = (base: Grid, cells: [number, number][], icon: number) => {
  const g = base.map((row) => [...row]);
  for (const [x, y] of cells) g[y][x] = icon;
  return g;
};
const row = (y: number, x0: number, x1: number) =>
  Array.from({ length: x1 - x0 + 1 }, (_, i) => [x0 + i, y] as [number, number]);
const col = (x: number, y0: number, y1: number) =>
  Array.from({ length: y1 - y0 + 1 }, (_, i) => [x, y0 + i] as [number, number]);

type T = Record<string, number>;
interface FixtureCase { id: string; grid: Grid; expected(t: T): RefEval }

/** Fixture table F0 to F12 of section 8 (brief v4, 4x4 grid), written from the brief and not from the reference checker. */
const FIXTURES: FixtureCase[] = [
  { id: 'F0', grid: baseB(), expected: () => ({ chains: [], effects: { damage: 0, heal: 0, shield: 0 } }) },
  {
    id: 'F1', grid: paint(baseB(), row(0, 0, 2), 4),
    expected: (t) => ({
      chains: [{ icon: 4, dir: 'h', length: 3, cells: row(0, 0, 2), kind: 'damage', value: t.sfBBlade }],
      effects: { damage: t.sfBBlade, heal: 0, shield: 0 },
    }),
  },
  {
    // Đúng 1 chuỗi dài 4, không có chuỗi con dài 3.
    id: 'F2', grid: paint(baseB(), row(2, 0, 3), 5),
    expected: (t) => ({
      chains: [{ icon: 5, dir: 'h', length: 4, cells: row(2, 0, 3), kind: 'heal', value: t.sfBHeal * t.sfLen4Mult }],
      effects: { damage: 0, heal: t.sfBHeal * t.sfLen4Mult, shield: 0 },
    }),
  },
  {
    id: 'F3', grid: paint(baseB(), row(1, 1, 3), 6),
    expected: (t) => ({
      chains: [{ icon: 6, dir: 'h', length: 3, cells: row(1, 1, 3), kind: 'shield', value: t.sfBShield }],
      effects: { damage: 0, heal: 0, shield: t.sfBShield },
    }),
  },
  {
    id: 'F4', grid: paint(baseB(), col(2, 0, 3), 7),
    expected: () => ({
      chains: [{ icon: 7, dir: 'v', length: 4, cells: col(2, 0, 3), kind: 'none', value: 0 }],
      effects: { damage: 0, heal: 0, shield: 0 },
    }),
  },
  {
    id: 'F5', grid: paint(baseB(), [[0, 0], [1, 1], [2, 2], [3, 3]], 4),
    expected: (t) => ({
      chains: [{ icon: 4, dir: 'dr', length: 4, cells: [[0, 0], [1, 1], [2, 2], [3, 3]], kind: 'damage', value: t.sfBBlade * t.sfLen4Mult }],
      effects: { damage: t.sfBBlade * t.sfLen4Mult, heal: 0, shield: 0 },
    }),
  },
  {
    id: 'F6', grid: paint(baseB(), [[0, 3], [1, 2], [2, 1]], 5),
    expected: (t) => ({
      chains: [{ icon: 5, dir: 'ur', length: 3, cells: [[0, 3], [1, 2], [2, 1]], kind: 'heal', value: t.sfBHeal }],
      effects: { damage: 0, heal: t.sfBHeal, shield: 0 },
    }),
  },
  {
    // Chữ thập: h trước v, cùng chứa (1,1), 5 ô khác nhau.
    id: 'F7', grid: paint(baseB(), [[0, 1], [1, 1], [2, 1], [1, 0], [1, 2]], 6),
    expected: (t) => ({
      chains: [
        { icon: 6, dir: 'h', length: 3, cells: row(1, 0, 2), kind: 'shield', value: t.sfBShield },
        { icon: 6, dir: 'v', length: 3, cells: col(1, 0, 2), kind: 'shield', value: t.sfBShield },
      ],
      effects: { damage: 0, heal: 0, shield: 2 * t.sfBShield },
    }),
  },
  { id: 'F8', grid: paint(baseB(), [[0, 0], [1, 0]], 4), expected: () => ({ chains: [], effects: { damage: 0, heal: 0, shield: 0 } }) },
  {
    // Đoạn bị ngăn bởi (2,3).
    id: 'F9', grid: paint(baseB(), [[0, 3], [1, 3], [3, 3]], 4),
    expected: () => ({ chains: [], effects: { damage: 0, heal: 0, shield: 0 } }),
  },
  {
    id: 'F10', grid: paint(baseC(), row(0, 0, 2), 0),
    expected: (t) => ({
      chains: [{ icon: 0, dir: 'h', length: 3, cells: row(0, 0, 2), kind: 'damage', value: t.sfBFire }],
      effects: { damage: t.sfBFire, heal: 0, shield: 0 },
    }),
  },
  {
    id: 'F11', grid: paint(paint(baseC(), row(0, 0, 2), 1), row(3, 0, 3), 3),
    expected: (t) => ({
      chains: [
        { icon: 1, dir: 'h', length: 3, cells: row(0, 0, 2), kind: 'damage', value: t.sfBVolt },
        { icon: 3, dir: 'h', length: 4, cells: row(3, 0, 3), kind: 'damage', value: t.sfBEarth * t.sfLen4Mult },
      ],
      effects: { damage: t.sfBVolt + t.sfBEarth * t.sfLen4Mult, heal: 0, shield: 0 },
    }),
  },
  {
    id: 'F12', grid: paint(paint(paint(baseB(), row(0, 0, 2), 4), row(3, 1, 3), 5), col(3, 0, 2), 6),
    expected: (t) => ({
      chains: [
        { icon: 4, dir: 'h', length: 3, cells: row(0, 0, 2), kind: 'damage', value: t.sfBBlade },
        { icon: 5, dir: 'h', length: 3, cells: row(3, 1, 3), kind: 'heal', value: t.sfBHeal },
        { icon: 6, dir: 'v', length: 3, cells: col(3, 0, 2), kind: 'shield', value: t.sfBShield },
      ],
      effects: { damage: t.sfBBlade, heal: t.sfBHeal, shield: t.sfBShield },
    }),
  },
  {
    // Bản 4.2: chuỗi Băng dài 3 trên nền C, dùng cho C12.
    id: 'F13', grid: paint(baseC(), row(0, 0, 2), 2),
    expected: (t) => ({
      chains: [{ icon: 2, dir: 'h', length: 3, cells: row(0, 0, 2), kind: 'damage', value: t.sfBFrost }],
      effects: { damage: t.sfBFrost, heal: 0, shield: 0 },
    }),
  },
];

/** Numbers in brackets of the v4 fixture table (BRIEF_TUNING v4), to catch a fixture whose formula above was mistyped. */
const FIXTURE_TABLE_NUMBERS: Record<string, Partial<RefEffects>> = {
  F1: { damage: 5 }, F2: { heal: 40 }, F3: { shield: 20 }, F5: { damage: 10 }, F6: { heal: 20 }, F7: { shield: 40 },
  F10: { damage: 10 }, F11: { damage: 35 }, F12: { damage: 5, heal: 20, shield: 20 }, F13: { damage: 15 },
};

const readTuning = (page: Page) => page.evaluate(() => ({ ...(window.__game!.tuning as unknown as T) }));

test.describe('Slot Five C2: chuỗi và hiệu ứng', () => {
  // Fixture có số kỳ vọng theo giá trị gốc của brief: ghim TUNING mục 5.
  test.beforeEach(() => pinBriefTuning());
  test('C2.1 evaluate F0 đến F12 khớp bảng fixture', async ({ page }) => {
    await openSlotFive(page);
    const t = await readTuning(page);
    for (const f of FIXTURES) {
      const got = await page.evaluate((g) => window.__game!.slotFive!.evaluate(g), f.grid);
      const want = f.expected(t);
      expect(got, f.id).toEqual(want);
      for (const [k, v] of Object.entries(FIXTURE_TABLE_NUMBERS[f.id] ?? {})) {
        expect(got.effects[k as keyof RefEffects], `${f.id} ${k} theo bảng`).toBe(v);
      }
      // Bộ vét cạn cũng phải đồng ý với bảng, nếu không thì chính bộ kiểm tra sai.
      expect(await page.evaluate((g) => window.__qaSfEval!.evaluate(g), f.grid), `${f.id} tham chiếu`).toEqual(want);
    }
  });

  test('C2.1 evaluate không sửa lưới truyền vào', async ({ page }) => {
    await openSlotFive(page);
    const g = FIXTURES.find((f) => f.id === 'F7')!.grid;
    const after = await page.evaluate((grid) => {
      const copy = grid.map((r) => [...r]);
      window.__game!.slotFive!.evaluate(copy);
      return copy;
    }, g);
    expect(after).toEqual(g);
  });

  test('C2.2 lưới toàn Kiếm: 14 chuỗi đúng thứ tự mục 4.3, damage = sfBBlade * (10 * sfLen4Mult + 4)', async ({ page }) => {
    await openSlotFive(page);
    const t = await readTuning(page);
    const all4 = Array.from({ length: 4 }, () => [4, 4, 4, 4]);
    const got = await page.evaluate((g) => window.__game!.slotFive!.evaluate(g), all4);
    const summary = got.chains.map((c) => `${c.dir}${c.length}@${c.cells[0][0]},${c.cells[0][1]}`);
    console.log(`C2.2: ${summary.join(' ')} | damage ${got.effects.damage}`);
    expect(got.chains).toHaveLength(14);
    const byDir = (d: string) => got.chains.filter((c) => c.dir === d).map((c) => c.length);
    expect(got.chains.map((c) => c.dir)).toEqual([
      ...Array(4).fill('h'), ...Array(4).fill('v'), ...Array(3).fill('dr'), ...Array(3).fill('ur'),
    ]);
    expect(byDir('h')).toEqual([4, 4, 4, 4]);
    expect(byDir('v')).toEqual([4, 4, 4, 4]);
    expect(byDir('dr')).toEqual([4, 3, 3]);
    expect(byDir('ur')).toEqual([3, 4, 3]);
    expect(got.chains.filter((c) => c.dir === 'dr').map((c) => c.cells[0])).toEqual([[0, 0], [1, 0], [0, 1]]);
    expect(got.chains.filter((c) => c.dir === 'ur').map((c) => c.cells[0])).toEqual([[0, 2], [0, 3], [1, 3]]);
    expect(got.chains.filter((c) => c.dir === 'h').map((c) => c.cells[0])).toEqual([[0, 0], [0, 1], [0, 2], [0, 3]]);
    expect(got.chains.filter((c) => c.dir === 'v').map((c) => c.cells[0])).toEqual([[0, 0], [1, 0], [2, 0], [3, 0]]);
    expect(got.effects.damage).toBe(t.sfBBlade * (10 * t.sfLen4Mult + 4));
    expect(got.effects).toEqual({ damage: 120, heal: 0, shield: 0 });
    expect(got).toEqual(await page.evaluate((g) => window.__qaSfEval!.evaluate(g), all4));
  });

  test('C2.3, C2.4 và C9.5: 10.000 lưới seed 1 khớp bộ vét cạn, effects bằng tổng value, giá trị hợp lệ, ô trong 4x4', async ({ page }) => {
    await openSlotFive(page);
    const out = await page.evaluate(() => {
      const api = window.__game!.slotFive!;
      const ref = window.__qaSfEval!;
      const sim = api.createSim(1);
      const mismatch: string[] = [];
      const sumBad: string[] = [];
      const c24: string[] = [];
      const c95: string[] = [];
      const isNat = (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v >= 0;
      const stats = { grids: 0, withChains: 0, chains: 0, len3: 0, len4: 0, other: 0, lucky: 0, multi: 0, maxChains: 0 };
      const dirSeen: Record<string, number> = {};
      for (let n = 0; n < 10_000; n += 1) {
        const { grid } = sim.spin();
        const got = api.evaluate(grid);
        const want = ref.evaluate(grid);
        stats.grids += 1;
        if (JSON.stringify(got) !== JSON.stringify(want)) mismatch.push(`lượt ${n}: ${JSON.stringify(grid)}`);
        const sum = { damage: 0, heal: 0, shield: 0 };
        for (const c of got.chains) if (c.kind !== 'none') sum[c.kind as 'damage' | 'heal' | 'shield'] += c.value;
        if (sum.damage !== got.effects.damage || sum.heal !== got.effects.heal || sum.shield !== got.effects.shield) {
          sumBad.push(`lượt ${n}`);
        }
        for (const v of Object.values(got.effects)) if (!isNat(v)) c24.push(`lượt ${n}: effects ${v}`);
        if (got.chains.length > 0) stats.withChains += 1;
        if (got.chains.length > 1) stats.multi += 1;
        stats.maxChains = Math.max(stats.maxChains, got.chains.length);
        for (const c of got.chains) {
          stats.chains += 1;
          dirSeen[c.dir] = (dirSeen[c.dir] ?? 0) + 1;
          if (c.length === 3) stats.len3 += 1;
          if (c.length === 4) stats.len4 += 1;
          if (c.length !== 3 && c.length !== 4) stats.other += 1;
          for (const v of [c.icon, c.length, c.value, ...c.cells.flat()]) if (!isNat(v)) c24.push(`lượt ${n}: giá trị ${v}`);
          if (c.length !== 3 && c.length !== 4) c24.push(`lượt ${n}: dài ${c.length}`);
          for (const [cx, cy] of c.cells) if (cx < 0 || cx > 3 || cy < 0 || cy > 3) c95.push(`lượt ${n}: ô (${cx},${cy})`);
          if (c.icon === 7) {
            stats.lucky += 1;
            if (c.kind !== 'none' || c.value !== 0) c24.push(`lượt ${n}: May mắn ${c.kind} ${c.value}`);
          }
        }
      }
      return { mismatch: mismatch.slice(0, 3), mismatchCount: mismatch.length, sumBad: sumBad.slice(0, 3), c24: c24.slice(0, 5), c95: c95.slice(0, 5), stats, dirSeen };
    });
    console.log(`C2.3: ${JSON.stringify(out.stats)} hướng ${JSON.stringify(out.dirSeen)}`);
    expect(out.stats.grids).toBe(10_000);
    expect(out.mismatch, `${out.mismatchCount} lưới lệch bộ vét cạn`).toEqual([]);
    expect(out.sumBad).toEqual([]);
    expect(out.c24).toEqual([]);
    // Mẫu đủ phủ: có chuỗi mọi hướng, mọi độ dài, có chuỗi May mắn và lưới nhiều chuỗi.
    expect(out.stats.withChains).toBeGreaterThan(1000);
    expect(out.stats.len4).toBeGreaterThan(0);
    expect(out.stats.other).toBe(0);
    // C9.5: tối đa 14 chuỗi mỗi lượt, không ô nào ngoài [0, 3] x [0, 3].
    expect(out.stats.maxChains).toBeLessThanOrEqual(14);
    expect(out.c95).toEqual([]);
    expect(out.stats.lucky).toBeGreaterThan(0);
    expect(out.stats.multi).toBeGreaterThan(0);
    for (const d of ['h', 'v', 'dr', 'ur']) expect(out.dirSeen[d] ?? 0, d).toBeGreaterThan(0);
  });

  test('C2.3 evaluate đọc TUNING tại lúc gọi, và khôi phục sau test', async ({ page }) => {
    await openSlotFive(page);
    const before = await readTuning(page);
    const F11 = FIXTURES.find((f) => f.id === 'F11')!.grid;
    const all4 = Array.from({ length: 4 }, () => [4, 4, 4, 4]);
    let out: { f11: number; all4: number; ref11: number; refAll: number } | undefined;
    try {
      out = await page.evaluate(([g11, gAll]) => {
        const t = window.__game!.tuning as unknown as Record<string, number>;
        t.sfBVolt = 50;
        t.sfBEarth = 25;
        t.sfLen4Mult = 3;
        t.sfBBlade = 10;
        const api = window.__game!.slotFive!;
        return {
          f11: api.evaluate(g11).effects.damage,
          all4: api.evaluate(gAll).effects.damage,
          ref11: window.__qaSfEval!.evaluate(g11).effects.damage,
          refAll: window.__qaSfEval!.evaluate(gAll).effects.damage,
        };
      }, [F11, all4] as const);
    } finally {
      await page.evaluate((orig) => {
        const t = window.__game!.tuning as unknown as Record<string, number>;
        for (const k of ['sfBVolt', 'sfBEarth', 'sfLen4Mult', 'sfBBlade']) t[k] = orig[k];
      }, before);
    }
    expect(out!.f11).toBe(50 + 25 * 3);
    expect(out!.all4).toBe(10 * (10 * 3 + 4));
    expect(out!.f11).toBe(out!.ref11);
    expect(out!.all4).toBe(out!.refAll);
    expect(await readTuning(page)).toEqual(before);
    expect((await page.evaluate((g) => window.__game!.slotFive!.evaluate(g), F11)).effects.damage).toBe(FIXTURE_TABLE_NUMBERS.F11.damage!);
  });

  test('C2.5 analyticEffects với giá trị đầu nằm trong khoảng, khớp công thức mục 4.6 và mô phỏng', async ({ page }) => {
    await openSlotFive(page);
    const out = await page.evaluate(() => {
      const got = window.__game!.slotFive!.analyticEffects();
      const ref = window.__qaSfEval!.analytic();
      // Kiểm chéo bằng mô phỏng: trung bình effects trên 200.000 lưới (seed 1 đến 20).
      const sum = { damage: 0, heal: 0, shield: 0 };
      const sq = { damage: 0, heal: 0, shield: 0 };
      let n = 0;
      for (let seed = 1; seed <= 20; seed += 1) {
        const sim = window.__game!.slotFive!.createSim(seed);
        for (let i = 0; i < 10_000; i += 1) {
          const e = window.__game!.slotFive!.evaluate(sim.spin().grid).effects;
          for (const k of ['damage', 'heal', 'shield'] as const) {
            sum[k] += e[k];
            sq[k] += e[k] * e[k];
          }
          n += 1;
        }
      }
      const mc = { damage: 0, heal: 0, shield: 0 };
      const se = { damage: 0, heal: 0, shield: 0 };
      for (const k of ['damage', 'heal', 'shield'] as const) {
        mc[k] = sum[k] / n;
        se[k] = Math.sqrt((sq[k] / n - mc[k] ** 2) / n);
      }
      return { got, ref, mc, se, n };
    });
    const f = (e: RefEffects) => `damage ${e.damage.toFixed(4)}, heal ${e.heal.toFixed(4)}, shield ${e.shield.toFixed(4)}`;
    console.log(`C2.5 analyticEffects: ${f(out.got)}`);
    console.log(`C2.5 công thức QA:    ${f(out.ref)}`);
    console.log(`C2.5 mô phỏng ${out.n} lưới: ${f(out.mc)} (sai số chuẩn ${f(out.se)})`);
    expect(out.got.damage).toBeGreaterThanOrEqual(8.03);
    expect(out.got.damage).toBeLessThanOrEqual(8.13);
    expect(out.got.heal).toBeGreaterThanOrEqual(1.00);
    expect(out.got.heal).toBeLessThanOrEqual(1.10);
    expect(out.got.shield).toBeGreaterThanOrEqual(1.00);
    expect(out.got.shield).toBeLessThanOrEqual(1.10);
    for (const k of ['damage', 'heal', 'shield'] as const) {
      expect(Math.abs(out.got[k] - out.ref[k]), `${k} khớp công thức`).toBeLessThan(1e-9);
      expect(Math.abs(out.mc[k] - out.got[k]), `${k} khớp mô phỏng trong 4 sai số chuẩn`).toBeLessThan(4 * out.se[k]);
    }
  });

  test('C2.5 analyticEffects đổi theo TUNING lúc gọi', async ({ page }) => {
    await openSlotFive(page);
    const before = await readTuning(page);
    let out: { got: RefEffects; ref: RefEffects } | undefined;
    try {
      out = await page.evaluate(() => {
        const t = window.__game!.tuning as unknown as Record<string, number>;
        t.sfWHeal = 20;
        t.sfBShield = 60;
        t.sfLen4Mult = 3;
        return { got: window.__game!.slotFive!.analyticEffects(), ref: window.__qaSfEval!.analytic() };
      });
    } finally {
      await page.evaluate((orig) => {
        const t = window.__game!.tuning as unknown as Record<string, number>;
        for (const k of ['sfWHeal', 'sfBShield', 'sfLen4Mult']) t[k] = orig[k];
      }, before);
    }
    for (const k of ['damage', 'heal', 'shield'] as const) expect(Math.abs(out!.got[k] - out!.ref[k]), k).toBeLessThan(1e-9);
    expect(out!.got.heal).toBeGreaterThan(1.10);
    expect(await readTuning(page)).toEqual(before);
  });
});

const fx = (id: string) => FIXTURES.find((f) => f.id === id)!.grid;

interface BattleOut {
  first: { accepted: boolean; side: string; absorbed: number; hpLoss: number; healed: number; effects: RefEffects };
  second?: { accepted: boolean; side: string; absorbed: number; hpLoss: number; healed: number; effects: RefEffects };
  s0: { status: string; turn: string; spinIndex: number; player: RefFighter; foe: RefFighter };
  s1: { status: string; turn: string; spinIndex: number; player: RefFighter; foe: RefFighter };
  s2?: { status: string; turn: string; spinIndex: number; player: RefFighter; foe: RefFighter };
}

/** Runs one or two spins of a pure battle with a setup, returning states around each spin. */
const runBattle = (page: Page, setup: RefSetup, spins: 1 | 2, seed = 1) =>
  page.evaluate(([sd, st, n]) => {
    const b = window.__game!.slotFive!.createBattle(sd, st as never);
    const s0 = b.getState();
    const first = b.spin();
    const s1 = b.getState();
    if (n === 1) return { first, s0, s1 };
    const second = b.spin();
    return { first, s0, s1, second, s2: b.getState() };
  }, [seed, setup, spins] as const) as Promise<BattleOut>;

const setTuning = (page: Page, values: Record<string, number>) =>
  page.evaluate((v) => {
    const t = window.__game!.tuning as unknown as Record<string, number>;
    const old: Record<string, number> = {};
    for (const [k, val] of Object.entries(v)) {
      old[k] = t[k];
      t[k] = val;
    }
    return old;
  }, values);

test.describe('Slot Five C3: trận luân phiên, máu và khiên', () => {
  // Fixture có số kỳ vọng theo giá trị gốc của brief: ghim TUNING mục 5.
  test.beforeEach(() => pinBriefTuning());
  test('C3.1 vào trận: playing, lượt người chơi, máu đầy, khiên 0 (sim và scene)', async ({ page }) => {
    await openSlotFive(page);
    const t = await readTuning(page);
    const sim = await page.evaluate(() => window.__game!.slotFive!.createBattle(5).getState());
    expect(sim).toEqual({
      status: 'playing', turn: 'player', spinIndex: 0,
      player: { hp: t.sfPlayerMaxHp, maxHp: t.sfPlayerMaxHp, shield: 0 },
      foe: { hp: t.sfFoeMaxHp, maxHp: t.sfFoeMaxHp, shield: 0 },
    });
    const s = await readState(page);
    expect(s.status).toBe('playing');
    expect(s.turn).toBe('player');
    expect(s.phase).toBe('idle');
    expect(s.player).toEqual({ hp: t.sfPlayerMaxHp, maxHp: t.sfPlayerMaxHp, shield: 0 });
    expect(s.foe).toEqual({ hp: t.sfFoeMaxHp, maxHp: t.sfFoeMaxHp, shield: 0 });
    expect(s.lastSide).toBeNull();
    expect(s.lastChains).toEqual([]);
    expect(s.lastEffects).toEqual({ damage: 0, heal: 0, shield: 0, absorbed: 0, hpLoss: 0, healed: 0 });
    expect(s.rejectedSpins).toBe(0);
    expect(s.lastReject).toBeNull();
    // Máu tối đa đọc từ TUNING lúc tạo trận.
    const old = await setTuning(page, { sfPlayerMaxHp: 150, sfFoeMaxHp: 120 });
    try {
      const changed = await page.evaluate(() => window.__game!.slotFive!.createBattle(5).getState());
      expect(changed.player).toEqual({ hp: 150, maxHp: 150, shield: 0 });
      expect(changed.foe).toEqual({ hp: 120, maxHp: 120, shield: 0 });
    } finally {
      await setTuning(page, old);
    }
    expect(await readTuning(page)).toEqual(t);
  });

  test('C3.2 lượt chẵn là người chơi, lẻ là đối thủ, lưới lượt n bằng lưới n của createSim (seed 1 đến 300)', async ({ page }) => {
    await openSlotFive(page);
    const out = await page.evaluate(() => {
      const api = window.__game!.slotFive!;
      const bad: string[] = [];
      let spins = 0;
      for (let seed = 1; seed <= 300; seed += 1) {
        const b = api.createBattle(seed);
        const sim = api.createSim(seed);
        while (b.getState().status === 'playing') {
          const n = b.getState().spinIndex;
          const r = b.spin();
          const g = sim.spin();
          spins += 1;
          if (r.side !== (n % 2 === 0 ? 'player' : 'foe')) bad.push(`seed ${seed} lượt ${n}: side ${r.side}`);
          if (g.spinIndex !== n || !window.__qaSf!.same(r.grid, g.grid)) bad.push(`seed ${seed} lượt ${n}: lưới khác createSim`);
          if (b.getState().spinIndex !== n + 1) bad.push(`seed ${seed} lượt ${n}: spinIndex không tăng 1`);
          if (n > 2100) break;
        }
      }
      return { spins, bad: bad.slice(0, 5) };
    });
    console.log(`C3.2: ${out.spins} lượt trên 300 trận`);
    expect(out.spins).toBeGreaterThan(300);
    expect(out.bad).toEqual([]);
  });

  // C3.3 đến C3.9 bản 4: số tính từ BRIEF_TUNING bản 4 (Kiếm 5, Hồi máu 20, Khiên 20, máu 450).
  test('C3.3 khiên đối thủ 3, người chơi quay F1: absorbed 3, hpLoss 2, khiên về 0', async ({ page }) => {
    await openSlotFive(page);
    const t = await readTuning(page);
    const o = await runBattle(page, { foe: { shield: 3 }, grids: [fx('F1')] }, 1);
    expect(o.first.accepted).toBe(true);
    expect(o.first.side).toBe('player');
    expect(o.first.absorbed).toBe(3);
    expect(o.first.hpLoss).toBe(t.sfBBlade - 3);
    expect(o.first.hpLoss).toBe(2);
    expect(o.s1.foe.shield).toBe(0);
    expect(o.s1.foe.hp).toBe(o.s0.foe.hp - 2);
  });

  test('C3.4 khiên đối thủ 50 chặn hết F1 còn 45, rồi hết hạn khi đối thủ quay F0', async ({ page }) => {
    await openSlotFive(page);
    const o = await runBattle(page, { foe: { shield: 50 }, grids: [fx('F1'), fx('F0')] }, 2);
    expect(o.s1.foe.hp).toBe(o.s0.foe.hp);
    expect(o.s1.foe.shield).toBe(45);
    expect(o.first.absorbed).toBe(5);
    expect(o.first.hpLoss).toBe(0);
    expect(o.second!.side).toBe('foe');
    expect(o.s2!.foe.shield).toBe(0);
    expect(o.s2!.foe.hp).toBe(o.s0.foe.hp);
    expect(o.s2!.player).toEqual(o.s0.player);
  });

  test('C3.5 máu maxHp-10, khiên 25, quay F12: máu đầy, healed 10, khiên 20 không cộng dồn, đối thủ mất 5', async ({ page }) => {
    await openSlotFive(page);
    const t = await readTuning(page);
    const o = await runBattle(page, { player: { hp: t.sfPlayerMaxHp - 10, shield: 25 }, grids: [fx('F12')] }, 1);
    expect(o.s1.player.hp).toBe(t.sfPlayerMaxHp);
    expect(o.first.healed).toBe(10);
    expect(o.first.effects).toEqual({ damage: 5, heal: 20, shield: 20 });
    expect(o.s1.player.shield).toBe(20);
    expect(o.s1.foe.hp).toBe(o.s0.foe.hp - 5);
  });

  test('C3.6 người chơi quay F3 (khiên 20), đối thủ quay F5 (10): absorbed 10, còn khiên 10', async ({ page }) => {
    await openSlotFive(page);
    const o = await runBattle(page, { grids: [fx('F3'), fx('F5')] }, 2);
    expect(o.s1.player.shield).toBe(20);
    expect(o.second!.side).toBe('foe');
    expect(o.second!.effects.damage).toBe(10);
    expect(o.second!.absorbed).toBe(10);
    expect(o.second!.hpLoss).toBe(0);
    expect(o.s2!.player.hp).toBe(o.s0.player.hp);
    expect(o.s2!.player.shield).toBe(10);
  });

  test('C3.7 đối thủ 5 máu, quay F1 thì thắng; quay tiếp bị từ chối, không rút RNG', async ({ page }) => {
    await openSlotFive(page);
    const out = await page.evaluate((f1) => {
      const b = window.__game!.slotFive!.createBattle(1, { foe: { hp: 5 }, grids: [f1] });
      const first = b.spin();
      const s1 = b.getState();
      const again = b.spin();
      const again2 = b.spin();
      return { first, s1, again, again2, s2: b.getState() };
    }, fx('F1'));
    expect(out.first.accepted).toBe(true);
    expect(out.s1.status).toBe('won');
    expect(out.s1.foe.hp).toBe(0);
    expect(out.again.accepted).toBe(false);
    expect(out.again2.accepted).toBe(false);
    // Không rút RNG: spinIndex đứng yên và trạng thái không đổi.
    expect(out.s2).toEqual(out.s1);
    expect(out.again.absorbed + out.again.hpLoss + out.again.healed).toBe(0);
  });

  test('C3.8 đối thủ 3 máu, người chơi 100 quay F12: thắng, vẫn hồi lên 120 và dựng khiên 20', async ({ page }) => {
    await openSlotFive(page);
    const o = await runBattle(page, { foe: { hp: 3 }, player: { hp: 100 }, grids: [fx('F12')] }, 1);
    expect(o.s1.status).toBe('won');
    expect(o.s1.foe.hp).toBe(0);
    expect(o.first.hpLoss).toBe(3);
    expect(o.s1.player.hp).toBe(120);
    expect(o.s1.player.shield).toBe(20);
  });

  test('C3.9 người chơi 4 máu, lượt đối thủ quay F1: thua, hp 0', async ({ page }) => {
    await openSlotFive(page);
    const o = await runBattle(page, { player: { hp: 4, shield: 0 }, turn: 'foe', grids: [fx('F1')] }, 1);
    expect(o.s0.turn).toBe('foe');
    expect(o.first.side).toBe('foe');
    expect(o.s1.status).toBe('lost');
    expect(o.s1.player.hp).toBe(0);
    expect(o.first.hpLoss).toBe(4);
  });

  test('C3.10 2000 trận seed 1 đến 2000 (giá trị đầu bản 4): kết thúc dưới 2000 lượt, bất biến máu và khiên, khớp bộ tham chiếu', async ({ page }) => {
    test.setTimeout(300_000);
    await openSlotFive(page);
    const out = await page.evaluate(() => {
      const api = window.__game!.slotFive!;
      const bad: string[] = [];
      const refBad: string[] = [];
      const turns: number[] = [];
      let won = 0;
      const okF = (f: { hp: number; maxHp: number; shield: number }) =>
        Number.isInteger(f.hp) && f.hp >= 0 && f.hp <= f.maxHp && Number.isInteger(f.shield) && f.shield >= 0;
      for (let seed = 1; seed <= 2000; seed += 1) {
        const b = api.createBattle(seed);
        const ref = window.__qaSfEval!.battle(seed);
        let n = 0;
        while (b.getState().status === 'playing' && n < 2000) {
          const r = b.spin();
          const rr = ref.spin();
          n += 1;
          const s = b.getState();
          if (!okF(s.player) || !okF(s.foe)) bad.push(`seed ${seed} lượt ${n}: ${JSON.stringify(s)}`);
          if (refBad.length < 5) {
            const pick = (x: Record<string, unknown>) => JSON.stringify([x.accepted, x.side, x.grid, x.chains, x.effects, x.absorbed, x.hpLoss, x.healed]);
            if (pick(r as unknown as Record<string, unknown>) !== pick(rr) || JSON.stringify(s) !== JSON.stringify(ref.getState())) {
              refBad.push(`seed ${seed} lượt ${n}: game ${JSON.stringify(s)} QA ${JSON.stringify(ref.getState())}`);
            }
          }
        }
        const s = b.getState();
        if (s.status === 'playing') bad.push(`seed ${seed}: chưa kết thúc sau 2000 lượt`);
        const zeros = [s.player.hp === 0, s.foe.hp === 0].filter(Boolean).length;
        if (s.status !== 'playing' && zeros !== 1) bad.push(`seed ${seed}: ${zeros} bên hp 0`);
        if (s.status === 'won' && s.foe.hp !== 0) bad.push(`seed ${seed}: won mà foe.hp ${s.foe.hp}`);
        if (s.status === 'lost' && s.player.hp !== 0) bad.push(`seed ${seed}: lost mà player.hp ${s.player.hp}`);
        if (s.status === 'won') won += 1;
        turns.push(n);
      }
      turns.sort((a, b) => a - b);
      return { bad: bad.slice(0, 5), refBad, median: turns[1000], p10: turns[200], p90: turns[1800], max: turns[1999], won };
    });
    console.log(`C3.10: 2000 trận, lượt trung vị ${out.median} (p10 ${out.p10}, p90 ${out.p90}, dài nhất ${out.max}), người chơi thắng ${out.won}`);
    expect(out.bad).toEqual([]);
    expect(out.max).toBeLessThan(2000);
    expect(out.refBad, 'mọi lượt khớp mô phỏng mục 4.5 của QA').toEqual([]);
  });

  test('C3.11 cùng seed và cùng BattleSetup chạy hai lần ra chuỗi spin giống hệt', async ({ page }) => {
    await openSlotFive(page);
    const setups: RefSetup[] = [
      {},
      { player: { hp: 60, shield: 10 }, foe: { maxHp: 150, hp: 140 }, turn: 'foe', grids: [fx('F3'), fx('F12')] },
      { player: { maxHp: 40 }, foe: { maxHp: 40 }, grids: [fx('F2')] },
    ];
    const out = await page.evaluate((list) => {
      const api = window.__game!.slotFive!;
      const run = (seed: number, setup: unknown) => {
        const b = api.createBattle(seed, setup as never);
        const log: string[] = [];
        for (let i = 0; i < 2100 && b.getState().status === 'playing'; i += 1) log.push(JSON.stringify([b.spin(), b.getState()]));
        log.push(JSON.stringify(b.spin()));
        return log;
      };
      const diffs: string[] = [];
      let compared = 0;
      for (const setup of list) {
        for (const seed of [3, 77, 2024]) {
          const a = run(seed, setup);
          const b = run(seed, JSON.parse(JSON.stringify(setup)));
          compared += a.length;
          if (JSON.stringify(a) !== JSON.stringify(b)) diffs.push(`seed ${seed} setup ${JSON.stringify(setup).slice(0, 60)}`);
        }
      }
      return { compared, diffs };
    }, setups);
    expect(out.compared).toBeGreaterThan(9);
    expect(out.diffs).toEqual([]);
  });

  test('Mục 4.8: trận chụp TUNING lúc tạo, đổi tune giữa trận không ảnh hưởng', async ({ page }) => {
    await openSlotFive(page);
    const t = await readTuning(page);
    const out = await page.evaluate((f1) => {
      const tu = window.__game!.tuning as unknown as Record<string, number>;
      const b = window.__game!.slotFive!.createBattle(1, { grids: [f1] });
      const old = tu.sfBBlade;
      tu.sfBBlade = 100;
      try {
        return b.spin().effects.damage;
      } finally {
        tu.sfBBlade = old;
      }
    }, fx('F1'));
    expect(out).toBe(t.sfBBlade);
    expect(await readTuning(page)).toEqual(t);
  });
});

test.describe('Slot Five C3 và C1.8 trong scene', () => {
  // Fixture có số kỳ vọng theo giá trị gốc của brief: ghim TUNING mục 5.
  test.beforeEach(() => pinBriefTuning());
  test('C1.8 (scene) forceNextGrid(F1) rồi quay ra F1; lượt đối thủ kế tiếp khớp createSim', async ({ page }) => {
    await openSlotFive(page);
    const SEED = 4242;
    await setTuning(page, FAST_TIMING);
    await page.evaluate(([seed, f1]) => {
      window.__game!.slotFive!.loadMatch(seed);
      window.__game!.slotFive!.forceNextGrid(f1);
    }, [SEED, fx('F1')] as const);
    expect(await page.evaluate(() => window.__game!.slotFive!.spin())).toBe(true);
    const s1 = await readState(page);
    expect(s1.grid).toEqual(fx('F1'));
    expect(s1.spinIndex).toBe(1);
    expect(s1.lastSide).toBe('player');
    expect(s1.lastEffects.damage).toBe(BRIEF_TUNING.sfBBlade);
    expect(s1.foe.hp).toBe(s1.foe.maxHp - BRIEF_TUNING.sfBBlade);
    expect(s1.turn).toBe('foe');
    // C6: lượt vừa nhận đang diễn hoạt; sau resolving mới sang foeWait.
    expect(s1.phase).toBe('spinning');
    await waitPhase(page, ['foeWait']);
    await settleFrames(page);
    await page.screenshot({ path: 'artifacts/slot-five-c3-forced-f1.png' });
    await page.waitForFunction(() => window.__game!.getState<SlotFiveState>()!.spinIndex === 2, null, { timeout: 5_000 });
    const s2 = await readState(page);
    const simGrids = await page.evaluate((seed) => {
      const sim = window.__game!.slotFive!.createSim(seed);
      return [sim.spin().grid, sim.spin().grid, sim.spin().grid];
    }, SEED);
    expect(simGrids[0]).not.toEqual(fx('F1'));
    expect(s2.lastSide).toBe('foe');
    expect(s2.grid).toEqual(simGrids[1]);
    // Kết quả lượt đối thủ trong scene khớp trận sim với cùng lưới ép.
    const ref = await page.evaluate(([seed, f1]) => {
      const b = window.__game!.slotFive!.createBattle(seed, { grids: [f1] });
      b.spin();
      const r = b.spin();
      return { r, s: b.getState() };
    }, [SEED, fx('F1')] as const);
    expect(s2.player).toEqual(ref.s.player);
    expect(s2.foe).toEqual(ref.s.foe);
    expect(s2.lastEffects).toEqual({ ...ref.r.effects, absorbed: ref.r.absorbed, hpLoss: ref.r.hpLoss, healed: ref.r.healed });
    expect(s2.lastChains).toEqual(ref.r.chains);
    if (s2.status === 'playing') {
      await waitPhase(page, ['idle']);
      expect(await page.evaluate(() => window.__game!.slotFive!.spin())).toBe(true);
      expect((await readState(page)).grid).toEqual(simGrids[2]);
    }
  });

  test('Từ chối lệnh quay khi không tới lượt: notYourTurn, không xếp hàng, không đổi spinIndex', async ({ page }) => {
    await openSlotFive(page);
    const t = await readTuning(page);
    const old = await setTuning(page, { ...FAST_TIMING, sfFoeDelayMs: 1500 });
    try {
      await page.evaluate(() => window.__game!.slotFive!.loadMatch(4242));
      expect(await page.evaluate(() => window.__game!.slotFive!.spin())).toBe(true);
      // Chờ hết diễn hoạt của lượt người chơi; trong foeWait mọi lệnh quay đều là notYourTurn.
      await waitPhase(page, ['foeWait']);
      const results = await page.evaluate(() => [1, 2, 3].map(() => window.__game!.slotFive!.spin()));
      expect(results).toEqual([false, false, false]);
      const s = await readState(page);
      expect(s.spinIndex).toBe(1);
      expect(s.phase).toBe('foeWait');
      expect(s.rejectedSpins).toBe(3);
      expect(s.lastReject).toBe('notYourTurn');
      await page.waitForFunction(() => window.__game!.getState<SlotFiveState>()!.spinIndex === 2, null, { timeout: 5_000 });
      await waitPhase(page, ['idle', 'ended']);
      // Lệnh bị từ chối không được xếp hàng: sau khi đối thủ quay, không có lượt người chơi tự chạy.
      await page.waitForTimeout(400);
      const after = await readState(page);
      if (after.status === 'playing') {
        expect(after.spinIndex).toBe(2);
        expect(after.turn).toBe('player');
        expect(after.phase).toBe('idle');
      }
    } finally {
      await setTuning(page, old);
    }
    expect(await readTuning(page)).toEqual(t);
  });

  test('Scene chơi trọn trận khớp createBattle cùng seed; thắng thì từ chối ended; loadMatch đặt lại trận', async ({ page }) => {
    await openSlotFive(page);
    const t = await readTuning(page);
    // Trễ đủ dài để test đọc được từng lượt, nhưng vẫn ngắn để trận chạy nhanh.
    const old = await setTuning(page, { ...FAST_TIMING, sfFoeDelayMs: 250 });
    const SEED = 31;
    try {
      // Bản 4: máu thấp (40) để trận ngắn; createBattle dưới đây dùng cùng setup.
      await page.evaluate((seed) => window.__game!.slotFive!.loadMatch(seed, { player: { maxHp: 40 }, foe: { maxHp: 40 } }), SEED);
      const sceneLog: string[] = [];
      for (let guard = 0; guard < 2000; guard += 1) {
        const s = await readState(page);
        if (s.status !== 'playing') break;
        if (s.phase === 'spinning' || s.phase === 'resolving') {
          // C6: chờ diễn hoạt của lượt đã ghi xong rồi mới xét lượt kế.
          await waitPhase(page, ['idle', 'foeWait', 'ended']);
          continue;
        }
        if (s.phase === 'idle') {
          // Quay và đọc trong cùng một lần evaluate để lượt đối thủ không chen vào giữa.
          const { ok, a } = await page.evaluate(() => ({
            ok: window.__game!.slotFive!.spin(),
            a: window.__game!.getState<SlotFiveState>()!,
          }));
          expect(ok).toBe(true);
          sceneLog.push(JSON.stringify([a.spinIndex, a.lastSide, a.grid, a.player, a.foe]));
        } else {
          const n = s.spinIndex;
          await page.waitForFunction((k) => window.__game!.getState<SlotFiveState>()!.spinIndex > k, n, { timeout: 5_000 });
          const a = await readState(page);
          sceneLog.push(JSON.stringify([a.spinIndex, a.lastSide, a.grid, a.player, a.foe]));
        }
      }
      const simLog = await page.evaluate((seed) => {
        const b = window.__game!.slotFive!.createBattle(seed, { player: { maxHp: 40 }, foe: { maxHp: 40 } });
        const log: string[] = [];
        while (b.getState().status === 'playing') {
          const r = b.spin();
          const s = b.getState();
          log.push(JSON.stringify([s.spinIndex, r.side, r.grid, s.player, s.foe]));
        }
        return { log, status: b.getState().status };
      }, SEED);
      expect(sceneLog).toEqual(simLog.log);
      await waitPhase(page, ['ended']);
      const end = await readState(page);
      expect(end.status).toBe(simLog.status);
      expect(end.phase).toBe('ended');
      console.log(`Scene seed ${SEED}: ${sceneLog.length} lượt, kết quả ${end.status}`);
      await settleFrames(page);
      await page.screenshot({ path: `artifacts/slot-five-c3-${end.status}.png` });
      expect(await page.evaluate(() => window.__game!.slotFive!.spin())).toBe(false);
      const rej = await readState(page);
      expect(rej.lastReject).toBe('ended');
      expect(rej.rejectedSpins).toBe(1);
      expect(rej.spinIndex).toBe(end.spinIndex);
      expect(rej.grid).toEqual(end.grid);
      // Trận mới qua loadMatch: đặt lại theo mục 4.8, matchIndex giữ nguyên.
      await page.evaluate(() => window.__game!.slotFive!.loadMatch(32));
      const fresh = await readState(page);
      expect(fresh).toMatchObject({
        seed: 32, matchIndex: end.matchIndex, spinIndex: 0, status: 'playing', turn: 'player', phase: 'idle',
        player: { hp: t.sfPlayerMaxHp, maxHp: t.sfPlayerMaxHp, shield: 0 }, foe: { hp: t.sfFoeMaxHp, maxHp: t.sfFoeMaxHp, shield: 0 },
        lastSide: null, lastChains: [],
      });
    } finally {
      await setTuning(page, old);
    }
    expect(await readTuning(page)).toEqual(t);
  });

  test('Scene: thua khi đối thủ hạ người chơi, phase ended, quay bị từ chối', async ({ page }) => {
    await openSlotFive(page);
    await page.evaluate((f1) => window.__game!.slotFive!.loadMatch(9, { player: { hp: 5 }, turn: 'foe', grids: [f1] }), fx('F1'));
    const s0 = await readState(page);
    expect(s0.turn).toBe('foe');
    expect(s0.phase).toBe('foeWait');
    expect(await page.evaluate(() => window.__game!.slotFive!.spin())).toBe(false);
    expect((await readState(page)).lastReject).toBe('notYourTurn');
    await page.waitForFunction(() => window.__game!.getState<SlotFiveState>()!.status === 'lost', null, { timeout: 5_000 });
    // status đổi ngay khi lượt được xử lý; phase sang ended sau khi diễn hoạt xong.
    await waitPhase(page, ['ended']);
    const s = await readState(page);
    expect(s.player.hp).toBe(0);
    expect(s.phase).toBe('ended');
    expect(s.lastSide).toBe('foe');
    expect(s.lastEffects.hpLoss).toBe(BRIEF_TUNING.sfBBlade);
    expect(await page.evaluate(() => window.__game!.slotFive!.spin())).toBe(false);
    expect((await readState(page)).lastReject).toBe('ended');
    await settleFrames(page);
    await page.screenshot({ path: 'artifacts/slot-five-c3-lost.png' });
    // Chơi lại: restart() đưa về trận đầu.
    await page.evaluate(() => window.__game!.restart());
    await page.waitForFunction(() => window.__game?.getState<SlotFiveState>()?.status === 'playing');
    const r = await readState(page);
    expect(r).toMatchObject({ spinIndex: 0, turn: 'player', phase: 'idle', matchIndex: 0, rejectedSpins: 0, lastReject: null });
  });

  test.describe('điện thoại ngang 844x390', () => {
    test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
    test('Ảnh giữa trận trên điện thoại ngang', async ({ page }) => {
      await openSlotFive(page);
      await page.evaluate((f12) => {
        window.__game!.slotFive!.loadMatch(4242, { player: { hp: 70 }, grids: [f12] });
        window.__game!.slotFive!.spin();
      }, fx('F12'));
      await settleFrames(page);
      await page.screenshot({ path: 'artifacts/slot-five-c3-844x390-mid.png' });
      expect((await readState(page)).player.hp).toBe(70 + BRIEF_TUNING.sfBHeal);
    });
  });
});

interface SfReport {
  matches: number; playerWinRate: number; turnsMedian: number; turnsP10: number; turnsP90: number; turnsMax: number;
  comebackRate: number; comebackRateByWinner: { player: number; foe: number }; blankTurnRate: number;
  attackTurnRate: number; chainTurnRateByIcon: number[];
  meanDamage: number; meanDamageStdErr: number; meanHeal: number; meanShield: number; meanAbsorbed: number;
  estMatchMsMedian: number; estMatchMsP90: number; meanTurnMs: number; unfinished: number;
  estMatchMsMedianFast: number; estMatchMsP90Fast: number;
}

const ACCEPT_SEEDS = Array.from({ length: 2000 }, (_, i) => 9001 + i);
const TUNE_SEEDS = Array.from({ length: 2000 }, (_, i) => 1 + i);

const simulate = (page: Page, seeds: number[], setup?: RefSetup) =>
  page.evaluate(([s, st]) => {
    const t0 = performance.now();
    const report = window.__game!.slotFive!.simulateMatches({ seeds: s, ...(st ? { setup: st as never } : {}) });
    return { report: report as unknown as SfReport, ms: performance.now() - t0 };
  }, [seeds, setup ?? null] as const);

/**
 * QA reference for the v4 MatchReport, written from the brief only: plays each seed with the QA battle (4.5) up to the
 * 2000-turn cap, comeback by the integer form of C10 after turns with spinIndex >= 2, nearest-rank percentiles,
 * blank turn = no chain at all, attack turn = damage > 0, per-icon chain-turn rate, and estMatchMs of 5.3 with
 * lastSpinMs = base + 3 * gap and lastResolveMs of 4.10, 600 ms per player press.
 */
const qaReport = (page: Page, seeds: number[], setup?: RefSetup) =>
  page.evaluate(([s, st]) => {
    const t = window.__game!.tuning as unknown as Record<string, number>;
    const nearest = (sorted: number[], k: number) => sorted[Math.ceil((k / 100) * sorted.length) - 1];
    // eff(k) = Math.round(k * scale) (mục 4.11); scale 1 là tốc độ thường.
    const eff = (k: string, scale: number) => Math.round(t[k] * scale);
    const resolveMsAt = (chains: { kind: string }[], sc: number) => {
      if (chains.length === 0) return eff('sfBlankResolveMs', sc);
      const n = chains.filter((c) => c.kind !== 'none').length;
      if (n === 0) return eff('sfResolveMs', sc);
      return Math.max(eff('sfResolveMs', sc), eff('sfCastDelayMs', sc) + (n - 1) * eff('sfCastStaggerMs', sc) + eff('sfCastFlightMs', sc) + eff('sfCastTailMs', sc));
    };
    const turnMsAt = (chains: { kind: string }[], side: string, sc: number) =>
      eff('sfSpinBaseMs', sc) + 3 * eff('sfReelStopGapMs', sc) + resolveMsAt(chains, sc) + (side === 'foe' ? eff('sfFoeDelayMs', sc) : 600);
    const fastF = t.sfFastFactor;
    const estFast: number[] = [];
    const turns: number[] = [];
    const est: number[] = [];
    let wins = 0;
    let foeWins = 0;
    let comeback = 0;
    const byW = { player: 0, foe: 0 };
    let unfinished = 0;
    let all = 0;
    let blank = 0;
    let attack = 0;
    const iconTurns = new Array<number>(8).fill(0);
    let dmg = 0;
    let dmg2 = 0;
    let heal = 0;
    let shield = 0;
    let absorbed = 0;
    let estSum = 0;
    for (const seed of s) {
      const b = window.__qaSfEval!.battle(seed, (st ?? undefined) as never);
      const after: { spinIndex: number; player: RefFighter; foe: RefFighter }[] = [];
      let n = 0;
      let ms = 0;
      let msFast = 0;
      let state = b.getState() as { status: string; spinIndex: number; player: RefFighter; foe: RefFighter };
      while (state.status === 'playing' && n < 2000) {
        const r = b.spin() as { side: string; chains: { icon: number; kind: string }[]; effects: RefEffects; absorbed: number };
        n += 1;
        all += 1;
        if (r.chains.length === 0) blank += 1;
        if (r.effects.damage > 0) attack += 1;
        for (const icon of new Set(r.chains.map((c) => c.icon))) iconTurns[icon] += 1;
        dmg += r.effects.damage;
        dmg2 += r.effects.damage ** 2;
        heal += r.effects.heal;
        shield += r.effects.shield;
        absorbed += r.absorbed;
        ms += turnMsAt(r.chains, r.side, 1);
        msFast += turnMsAt(r.chains, r.side, fastF);
        state = b.getState() as typeof state;
        after.push(state);
      }
      turns.push(n);
      est.push(ms);
      estFast.push(msFast);
      estSum += ms;
      if (state.status === 'playing') {
        unfinished += 1;
        continue;
      }
      const w = state.status === 'won' ? 'player' : 'foe';
      if (w === 'player') wins += 1;
      else foeWins += 1;
      const hit = after.some((a) => {
        if (a.spinIndex < 2) return false;
        const W = a[w];
        const L = a[w === 'player' ? 'foe' : 'player'];
        return 5 * (L.hp * W.maxHp - W.hp * L.maxHp) >= W.maxHp * L.maxHp;
      });
      if (hit) {
        comeback += 1;
        byW[w] += 1;
      }
    }
    turns.sort((a, b) => a - b);
    est.sort((a, b) => a - b);
    estFast.sort((a, b) => a - b);
    const mean = dmg / all;
    const sd = Math.sqrt((dmg2 - all * mean * mean) / (all - 1));
    return {
      matches: s.length,
      playerWinRate: wins / s.length,
      turnsMedian: nearest(turns, 50), turnsP10: nearest(turns, 10), turnsP90: nearest(turns, 90), turnsMax: turns[turns.length - 1],
      comebackRate: comeback / s.length,
      comebackRateByWinner: { player: wins ? byW.player / wins : 0, foe: foeWins ? byW.foe / foeWins : 0 },
      blankTurnRate: blank / all,
      attackTurnRate: attack / all,
      chainTurnRateByIcon: iconTurns.map((c) => c / all),
      meanDamage: mean, meanDamageStdErr: sd / Math.sqrt(all),
      meanHeal: heal / all, meanShield: shield / all, meanAbsorbed: absorbed / all,
      estMatchMsMedian: nearest(est, 50),
      estMatchMsP90: nearest(est, 90),
      meanTurnMs: estSum / all,
      estMatchMsMedianFast: nearest(estFast, 50),
      estMatchMsP90Fast: nearest(estFast, 90),
      unfinished,
    } as SfReport;
  }, [seeds, setup ?? null] as const);

const expectReportMatches = (got: SfReport, ref: SfReport) => {
  expect(Object.keys(got).sort()).toEqual(Object.keys(ref).sort());
  for (const key of Object.keys(ref) as (keyof SfReport)[]) {
    if (key === 'comebackRateByWinner') {
      expect(got[key].player, `${key}.player`).toBeCloseTo(ref[key].player, 12);
      expect(got[key].foe, `${key}.foe`).toBeCloseTo(ref[key].foe, 12);
    } else if (key === 'chainTurnRateByIcon') {
      expect(got[key]).toHaveLength(8);
      got[key].forEach((v, i) => expect(v, `${key}[${i}]`).toBeCloseTo(ref[key][i], 12));
    } else {
      expect(got[key] as number, key).toBeCloseTo(ref[key] as number, 9);
    }
  }
};

const fmt = (r: SfReport) =>
  `trận ${r.matches}, thắng ${r.playerWinRate.toFixed(4)}, lượt P10/trung vị/P90/max ${r.turnsP10}/${r.turnsMedian}/${r.turnsP90}/${r.turnsMax}, ` +
  `lật ngược ${r.comebackRate.toFixed(4)} (player ${r.comebackRateByWinner.player.toFixed(4)}, foe ${r.comebackRateByWinner.foe.toFixed(4)}), ` +
  `blank ${r.blankTurnRate.toFixed(4)}, ra đòn ${r.attackTurnRate.toFixed(4)}, chuỗi theo icon [${r.chainTurnRateByIcon.map((v) => v.toFixed(4)).join(', ')}], ` +
  `damage ${r.meanDamage.toFixed(4)} ± ${r.meanDamageStdErr.toFixed(4)}, heal ${r.meanHeal.toFixed(4)}, ` +
  `shield ${r.meanShield.toFixed(4)}, absorbed ${r.meanAbsorbed.toFixed(4)}, estMs trung vị ${r.estMatchMsMedian} P90 ${r.estMatchMsP90}, ` +
  `meanTurnMs ${r.meanTurnMs.toFixed(1)}, unfinished ${r.unfinished}, nhanh: estMs trung vị ${r.estMatchMsMedianFast} P90 ${r.estMatchMsP90Fast}`;

/**
 * C4 (bản 2) đã được thay bằng C10. Nhóm này chỉ kiểm "code đo đúng": MatchReport bản 4 khớp tham chiếu QA.
 * Ngưỡng C10 chưa xét ở đợt này; số ghi ra chỉ để tham khảo cho Balance Tuner.
 */
test.describe('Slot Five C10 (chuẩn bị): MatchReport bản 4 đo đúng, so với tham chiếu QA', () => {
  test('Tập nghiệm thu 9001 đến 11000, TUNING hiện tại: mọi trường MatchReport khớp tham chiếu QA', async ({ page }) => {
    test.setTimeout(300_000);
    await openSlotFive(page);
    const { report, ms } = await simulate(page, ACCEPT_SEEDS);
    const ref = await qaReport(page, ACCEPT_SEEDS);
    console.log(`C10 game (${ms.toFixed(0)} ms): ${fmt(report)}`);
    console.log(`C10 QA:   ${fmt(ref)}`);
    expectReportMatches(report, ref);
    // Chạy hai lần cho cùng báo cáo.
    expect((await simulate(page, ACCEPT_SEEDS)).report).toEqual(report);
  });

  test('Tập tune 300 seed và đối thủ đi trước 300 seed cũng khớp tham chiếu QA', async ({ page }) => {
    test.setTimeout(240_000);
    await openSlotFive(page);
    const tune = TUNE_SEEDS.slice(0, 300);
    expectReportMatches((await simulate(page, tune)).report, await qaReport(page, tune));
    const accept = ACCEPT_SEEDS.slice(0, 300);
    expectReportMatches((await simulate(page, accept, { turn: 'foe' })).report, await qaReport(page, accept, { turn: 'foe' }));
  });

  test('Lật ngược: đúng mép 20 điểm, bỏ qua lượt có spinIndex < 2, tính cho bên đối thủ thắng', async ({ page }) => {
    pinBriefTuning();
    await openSlotFive(page);
    const all4: Grid = Array.from({ length: 4 }, () => [4, 4, 4, 4]);
    const F0 = fx('F0');
    const F1 = fx('F1');
    const F2 = fx('F2');
    // Máu 100 để Kiếm 5 (F1) tạo đúng mép; lưới toàn Kiếm gây 120 sát thương, đủ hạ một bên.
    const cases: { name: string; setup: RefSetup; want: Partial<SfReport> & { byW?: { player: number; foe: number } } }[] = [
      {
        // Sau lượt 1 (spinIndex 2): người chơi 80/100, đối thủ 100/100, dẫn đúng 20 điểm, người chơi thắng ở lượt 2.
        name: 'mép đúng 20 điểm thì tính',
        setup: { player: { maxHp: 100, hp: 85 }, foe: { maxHp: 100 }, grids: [F0, F1, all4] },
        want: { comebackRate: 1, playerWinRate: 1, turnsMedian: 3, byW: { player: 1, foe: 0 } },
      },
      {
        // Đối thủ chỉ có 99 máu: khoảng cách 19 điểm, không tính.
        name: '19 điểm thì không tính',
        setup: { player: { maxHp: 100, hp: 85 }, foe: { maxHp: 100, hp: 99 }, grids: [F0, F1, all4] },
        want: { comebackRate: 0, playerWinRate: 1, turnsMedian: 3 },
      },
      {
        // Bị dẫn 30 điểm chỉ sau lượt 0 (spinIndex 1); lượt 1 hồi đầy (F2 hồi 40) nên không còn bị dẫn.
        name: 'chỉ bị dẫn khi spinIndex 1 thì không tính',
        setup: { turn: 'foe', player: { maxHp: 100, hp: 70 }, foe: { maxHp: 100 }, grids: [F0, F2, F0, all4] },
        want: { comebackRate: 0, playerWinRate: 1, turnsMedian: 4 },
      },
      {
        // Đối thủ 85 máu, sau F1 còn 80: bị dẫn 20 điểm ở spinIndex 2, rồi hạ người chơi ở lượt 3.
        name: 'đối thủ lật ngược',
        setup: { player: { maxHp: 100 }, foe: { maxHp: 100, hp: 85 }, grids: [F1, F0, F0, all4] },
        want: { comebackRate: 1, playerWinRate: 0, turnsMedian: 4, byW: { player: 0, foe: 1 } },
      },
    ];
    for (const c of cases) {
      const r = (await simulate(page, [1], c.setup)).report;
      const { byW, ...rest } = c.want;
      expect(r, c.name).toMatchObject(rest);
      if (byW) expect(r.comebackRateByWinner, c.name).toEqual(byW);
      expectReportMatches(r, await qaReport(page, [1], c.setup));
    }
  });

  test('Phân vị nearest-rank, estMatchMs theo lastResolveMs và meanTurnMs trên tập nhỏ tính tay', async ({ page }) => {
    await openSlotFive(page);
    // 7 seed: trung vị là phần tử thứ ceil(3.5) = 4, P10 là phần tử 1, P90 là phần tử ceil(6.3) = 7.
    const seeds = [11, 12, 13, 14, 15, 16, 17];
    const out = await page.evaluate((s) => {
      const t = window.__game!.tuning as unknown as Record<string, number>;
      const perSeed = s.map((seed) => {
        const b = window.__game!.slotFive!.createBattle(seed);
        let n = 0;
        let ms = 0;
        while (b.getState().status === 'playing') {
          const r = b.spin();
          n += 1;
          const casts = r.chains.filter((c) => c.kind !== 'none').length;
          const resolve = r.chains.length === 0 ? t.sfBlankResolveMs : casts === 0 ? t.sfResolveMs
            : Math.max(t.sfResolveMs, t.sfCastDelayMs + (casts - 1) * t.sfCastStaggerMs + t.sfCastFlightMs + t.sfCastTailMs);
          ms += t.sfSpinBaseMs + 3 * t.sfReelStopGapMs + resolve + (r.side === 'foe' ? t.sfFoeDelayMs : 600);
        }
        return { n, ms };
      });
      return { perSeed, report: window.__game!.slotFive!.simulateMatches({ seeds: s }) as unknown as SfReport };
    }, seeds);
    const turns = out.perSeed.map((p) => p.n).sort((a, b) => a - b);
    const ms = out.perSeed.map((p) => p.ms).sort((a, b) => a - b);
    console.log(`Phân vị tay: lượt ${turns.join(',')}; estMs ${ms.join(',')}`);
    expect(out.report.turnsP10).toBe(turns[0]);
    expect(out.report.turnsMedian).toBe(turns[3]);
    expect(out.report.turnsP90).toBe(turns[6]);
    expect(out.report.turnsMax).toBe(turns[6]);
    expect(out.report.estMatchMsMedian).toBe(ms[3]);
    expect(out.report.estMatchMsP90).toBe(ms[6]);
    const totalMs = out.perSeed.reduce((a, p) => a + p.ms, 0);
    const totalTurns = out.perSeed.reduce((a, p) => a + p.n, 0);
    expect(out.report.meanTurnMs).toBeCloseTo(totalMs / totalTurns, 9);
  });

  test('simulateMatches đọc TUNING lúc gọi (máu, nhịp, cast)', async ({ page }) => {
    test.setTimeout(180_000);
    await openSlotFive(page);
    const t = await readTuning(page);
    const seeds = TUNE_SEEDS.slice(0, 200);
    const old = await setTuning(page, { sfPlayerMaxHp: 300, sfFoeMaxHp: 900, sfFoeDelayMs: 1000, sfCastStaggerMs: 300, sfCastTailMs: 600 });
    try {
      const got = (await simulate(page, seeds)).report;
      expectReportMatches(got, await qaReport(page, seeds));
      expect(got.playerWinRate).toBeLessThan(0.5);
    } finally {
      await setTuning(page, old);
    }
    expect(await readTuning(page)).toEqual(t);
  });
});

// ---------------------------------------------------------------- C5: điều khiển thật

/** Waits until the scene is ready for input or the match is over (brief C5: spinning/resolving may pass instantly). */
const waitSettled = (page: Page) =>
  page.waitForFunction(() => {
    const p = window.__game?.getState<SlotFiveState>()?.phase;
    return p === 'idle' || p === 'ended';
  }, null, { timeout: 10_000 });

const waitSpinIndex = (page: Page, n: number) =>
  page.waitForFunction((k) => window.__game!.getState<SlotFiveState>()!.spinIndex >= k, n, { timeout: 5_000 });

/** Opens Slot Five and puts keyboard focus on the page (not on a DOM button). */
const openForInput = async (page: Page) => {
  await openSlotFive(page);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await waitSettled(page);
};

/** Loads a match whose first player spin wins: foe at 1 hp, first grid F1 (damage > 0 under any tuning). */
const loadOneHitMatch = (page: Page, seed = 50) =>
  page.evaluate(([s, f1]) => window.__game!.slotFive!.loadMatch(s, { foe: { hp: 1 }, grids: [f1] }), [seed, fx('F1')] as const);

/** C5.1 path: one real player input, then the foe spins on its own and the game returns to idle. */
const expectPlayerThenFoe = async (page: Page, act: () => Promise<void>) => {
  const before = await readState(page);
  expect(before.phase).toBe('idle');
  expect(before.turn).toBe('player');
  await act();
  await waitSpinIndex(page, before.spinIndex + 1);
  const mid = await readState(page);
  expect(mid.spinIndex).toBe(before.spinIndex + 1);
  expect(mid.lastSide).toBe('player');
  if (mid.status !== 'playing') return;
  await waitSpinIndex(page, before.spinIndex + 2);
  await waitSettled(page);
  const after = await readState(page);
  expect(after.spinIndex).toBe(before.spinIndex + 2);
  expect(after.lastSide).toBe('foe');
  if (after.status === 'playing') expect(after.phase).toBe('idle');
};

/** C5.6 expectations after a new-match input. */
const expectNewMatch = async (page: Page, prevMatchIndex: number) => {
  await page.waitForFunction((m) => window.__game!.getState<SlotFiveState>()!.matchIndex === m + 1, prevMatchIndex, { timeout: 5_000 });
  const s = await readState(page);
  const t = await readTuning(page);
  expect(s.matchIndex).toBe(prevMatchIndex + 1);
  expect(s.seed).toBe(t.sfSeed + s.matchIndex);
  expect(s.status).toBe('playing');
  expect(s.spinIndex).toBe(0);
  expect(s.turn).toBe('player');
  expect(s.phase).toBe('idle');
  expect(s.player).toEqual({ hp: t.sfPlayerMaxHp, maxHp: t.sfPlayerMaxHp, shield: 0 });
  expect(s.foe).toEqual({ hp: t.sfFoeMaxHp, maxHp: t.sfFoeMaxHp, shield: 0 });
  // Lưới mở trận là lưới init của seed mới.
  expect(s.grid).toEqual(await page.evaluate((seed) => window.__qaSf!.refGrids(seed, 0, 1)[0], s.seed));
};

/** Plays a match to the end, pressing `act` on every player turn. Returns the final state and the number of inputs. */
const playToEnd = async (page: Page, act: () => Promise<void>) => {
  let presses = 0;
  for (let guard = 0; guard < 300; guard += 1) {
    await waitSettled(page);
    const s = await readState(page);
    if (s.status !== 'playing') return { s, presses };
    await act();
    presses += 1;
    await waitSpinIndex(page, s.spinIndex + 1);
  }
  throw new Error('trận không kết thúc sau 300 lần bấm');
};

test.describe('Slot Five C5: bàn phím thật', () => {
  test('C5.1 Space thật: người chơi quay, đối thủ tự quay, về idle', async ({ page }) => {
    await openForInput(page);
    await expectPlayerThenFoe(page, () => page.keyboard.press('Space'));
    await settleFrames(page);
    await page.screenshot({ path: 'artifacts/slot-five-c5-desktop-after-turn.png' });
  });

  test('C5.2 Enter thật: kết quả giống C5.1', async ({ page }) => {
    await openForInput(page);
    await expectPlayerThenFoe(page, () => page.keyboard.press('Enter'));
  });

  test('C5.3 quay trong foeWait bị từ chối notYourTurn, spinIndex chỉ tăng do đối thủ', async ({ page }) => {
    await openForInput(page);
    const t = await readTuning(page);
    const old = await setTuning(page, { sfFoeDelayMs: 1500 });
    try {
      await page.evaluate((seed) => window.__game!.slotFive!.loadMatch(seed), t.sfSeed);
      await expect(page.locator('#sf-spin')).not.toHaveClass(/dim/);
      await page.keyboard.press('Space');
      // C6: lượt người chơi diễn hoạt xong mới sang foeWait.
      await waitPhase(page, ['foeWait']);
      const s1 = await readState(page);
      expect(s1.spinIndex).toBe(1);
      expect(s1.phase).toBe('foeWait');
      await expect(page.locator('#sf-spin')).toHaveClass(/dim/);
      await settleFrames(page);
      await page.screenshot({ path: 'artifacts/slot-five-c5-desktop-foewait.png' });
      await page.keyboard.press('Space');
      const s2 = await readState(page);
      expect(s2.rejectedSpins).toBe(s1.rejectedSpins + 1);
      expect(s2.lastReject).toBe('notYourTurn');
      expect(s2.spinIndex).toBe(1);
      // Enter khi đang chơi cũng là quay, nên cũng bị từ chối.
      await page.keyboard.press('Enter');
      const s3 = await readState(page);
      expect(s3.rejectedSpins).toBe(s1.rejectedSpins + 2);
      expect(s3.spinIndex).toBe(1);
      await waitSpinIndex(page, 2);
      await waitSettled(page);
      const s4 = await readState(page);
      expect(s4.spinIndex).toBe(2);
      expect(s4.lastSide).toBe('foe');
      await expect(page.locator('#sf-spin')).not.toHaveClass(/dim/);
    } finally {
      await setTuning(page, old);
    }
  });

  test('C5.4 giữ Space 800 ms (có lặp phím) chỉ tăng 1 lượt người chơi', async ({ page }) => {
    await openForInput(page);
    await page.evaluate(() => {
      (window as unknown as { __qaRepeats: number }).__qaRepeats = 0;
      window.addEventListener('keydown', (e) => {
        if (e.repeat) (window as unknown as { __qaRepeats: number }).__qaRepeats += 1;
      });
    });
    const before = await readState(page);
    await page.keyboard.down('Space');
    const start = Date.now();
    // Giả lập tự động lặp của hệ điều hành: keydown lặp lại với repeat = true trong lúc giữ.
    while (Date.now() - start < 800) {
      await page.waitForTimeout(33);
      await page.keyboard.down('Space');
    }
    await page.keyboard.up('Space');
    const repeats = await page.evaluate(() => (window as unknown as { __qaRepeats: number }).__qaRepeats);
    await waitSettled(page);
    await page.waitForTimeout(300);
    const after = await readState(page);
    const playerSpins = (n: number) => Math.ceil(n / 2);
    console.log(`C5.4: ${repeats} sự kiện lặp, spinIndex ${before.spinIndex} -> ${after.spinIndex}, rejectedSpins ${after.rejectedSpins}`);
    expect(repeats).toBeGreaterThan(10);
    expect(playerSpins(after.spinIndex) - playerSpins(before.spinIndex)).toBe(1);
    // Giữ 800 ms dài hơn sfFoeDelayMs (500), nên đối thủ đã quay xong trong lúc giữ mà người chơi không quay thêm.
    expect(after.spinIndex).toBe(before.spinIndex + 2);
  });

  test('C5.5 10 lượt bằng Space với seed sfSeed khớp createBattle(sfSeed)', async ({ page }) => {
    await openForInput(page);
    const t = await readTuning(page);
    await page.evaluate((seed) => window.__game!.slotFive!.loadMatch(seed), t.sfSeed);
    const sim = await page.evaluate((seed) => {
      const b = window.__game!.slotFive!.createBattle(seed);
      const out: { spinIndex: number; grid: number[][]; chains: unknown[]; player: unknown; foe: unknown; status: string }[] = [];
      while (b.getState().status === 'playing' && out.length < 10) {
        const r = b.spin();
        const s = b.getState();
        out.push({ spinIndex: s.spinIndex, grid: r.grid, chains: r.chains, player: s.player, foe: s.foe, status: s.status });
      }
      return out;
    }, t.sfSeed);
    let checked = 0;
    for (const want of sim) {
      const s = await readState(page);
      if (want.spinIndex % 2 === 1) {
        // Lượt của người chơi: bấm Space thật.
        expect(s.phase).toBe('idle');
        await page.keyboard.press('Space');
      }
      await waitSpinIndex(page, want.spinIndex);
      const got = await readState(page);
      expect(got.spinIndex, `lượt ${want.spinIndex}`).toBe(want.spinIndex);
      expect(got.grid, `grid lượt ${want.spinIndex}`).toEqual(want.grid);
      expect(got.lastChains, `lastChains lượt ${want.spinIndex}`).toEqual(want.chains);
      expect(got.player, `player lượt ${want.spinIndex}`).toEqual(want.player);
      expect(got.foe, `foe lượt ${want.spinIndex}`).toEqual(want.foe);
      expect(got.status).toBe(want.status);
      checked += 1;
      if (want.status === 'playing') await waitSettled(page);
    }
    console.log(`C5.5: đã so ${checked} lượt (seed ${t.sfSeed})`);
    expect(checked).toBe(Math.min(10, sim.length));
    expect(checked).toBeGreaterThan(0);
  });

  test('C5.6 trận kết thúc: ended, quay bị từ chối; Enter mở trận mới', async ({ page }) => {
    await openForInput(page);
    await loadOneHitMatch(page);
    await page.keyboard.press('Space');
    await waitSettled(page);
    const end = await readState(page);
    expect(end.status).toBe('won');
    expect(end.phase).toBe('ended');
    await expect(page.locator('#sf-new')).toHaveClass(/highlight/);
    await expect(page.locator('#sf-spin')).toHaveClass(/dim/);
    await settleFrames(page);
    await page.screenshot({ path: 'artifacts/slot-five-c5-desktop-ended.png' });
    // Quay bị từ chối với lý do ended (qua lệnh quay của debug API, vì Enter lúc này là trận mới).
    expect(await page.evaluate(() => window.__game!.slotFive!.spin())).toBe(false);
    expect((await readState(page)).lastReject).toBe('ended');
    // Space thật lúc ended cũng bị từ chối, không mở trận mới.
    await page.keyboard.press('Space');
    const s = await readState(page);
    expect(s.lastReject).toBe('ended');
    expect(s.matchIndex).toBe(end.matchIndex);
    expect(s.spinIndex).toBe(end.spinIndex);
    await page.keyboard.press('Enter');
    await expectNewMatch(page, end.matchIndex);
    await expect(page.locator('#sf-new')).not.toHaveClass(/highlight/);
    await expect(page.locator('#sf-spin')).not.toHaveClass(/dim/);
  });

  test('C5.6 trận thua cũng ended; R mở trận mới', async ({ page }) => {
    await openForInput(page);
    await page.evaluate((f1) => window.__game!.slotFive!.loadMatch(60, { player: { hp: 1 }, turn: 'foe', grids: [f1] }), fx('F1'));
    await waitPhase(page, ['ended']);
    const end = await readState(page);
    expect(end.status).toBe('lost');
    expect(end.phase).toBe('ended');
    await page.keyboard.press('Space');
    expect((await readState(page)).lastReject).toBe('ended');
    await page.keyboard.press('r');
    await expectNewMatch(page, end.matchIndex);
  });

  test('C5.6 chơi lại liên tiếp: mỗi lần Enter sau khi kết thúc tăng matchIndex đúng 1', async ({ page }) => {
    await openForInput(page);
    for (let i = 0; i < 3; i += 1) {
      await loadOneHitMatch(page, 70 + i);
      await page.keyboard.press('Space');
      await waitSettled(page);
      const end = await readState(page);
      expect(end.status).toBe('won');
      await page.keyboard.press('Enter');
      await expectNewMatch(page, end.matchIndex);
    }
    expect((await readState(page)).matchIndex).toBe(3);
  });

  test('C5.7 R giữa trận (idle) mở trận mới giống C5.6', async ({ page }) => {
    await openForInput(page);
    await page.keyboard.press('Space');
    await waitSpinIndex(page, 2);
    await waitSettled(page);
    const mid = await readState(page);
    expect(mid.status).toBe('playing');
    expect(mid.spinIndex).toBe(2);
    await page.keyboard.press('KeyR');
    await expectNewMatch(page, mid.matchIndex);
    // Sau trận mới, đối thủ không còn lượt chờ sót lại.
    await page.waitForTimeout(800);
    expect((await readState(page)).spinIndex).toBe(0);
  });

  test('C5.7 R trong foeWait (quyết định tạm: hủy lượt đối thủ đang chờ)', async ({ page }) => {
    await openForInput(page);
    await page.keyboard.press('Space');
    await waitPhase(page, ['foeWait']);
    const s = await readState(page);
    expect(s.phase).toBe('foeWait');
    await page.keyboard.press('r');
    await expectNewMatch(page, s.matchIndex);
    await page.waitForTimeout(800);
    const after = await readState(page);
    expect(after.spinIndex).toBe(0);
    expect(after.phase).toBe('idle');
  });

  test('Lọc phím: Ctrl/Alt + Space không quay; Space sau khi click nút không quay hai lần; Space không cuộn trang', async ({ page }) => {
    await openForInput(page);
    await page.keyboard.press('Control+Space');
    await page.keyboard.press('Alt+Space');
    await page.waitForTimeout(200);
    expect((await readState(page)).spinIndex).toBe(0);
    // Click chuột thật vào nút Trận mới để nút giữ focus, rồi bấm Space: chỉ một lượt quay.
    await page.click('#sf-new');
    const s0 = await readState(page);
    expect(s0.matchIndex).toBe(1);
    await page.keyboard.press('Space');
    await waitSpinIndex(page, 1);
    const s1 = await readState(page);
    expect(s1.spinIndex).toBe(1);
    expect(s1.matchIndex).toBe(1);
    expect(await page.evaluate(() => [window.scrollX, window.scrollY])).toEqual([0, 0]);
  });
});

test.describe('Slot Five C5: nút bằng chuột (desktop)', () => {
  test('C5.9 desktop: #sf-spin, #sf-new hiện, nút platformer ẩn; click thật hoạt động', async ({ page }) => {
    await openForInput(page);
    for (const id of ['#btn-left', '#btn-right', '#btn-jump']) await expect(page.locator(id)).toBeHidden();
    await expect(page.locator('#sf-spin')).toBeVisible();
    await expect(page.locator('#sf-new')).toBeVisible();
    await expectPlayerThenFoe(page, () => page.click('#sf-spin'));
    const s = await readState(page);
    await page.click('#sf-new');
    await expectNewMatch(page, s.matchIndex);
  });

  test('Kéo chuột ra khỏi #sf-spin trước khi thả thì không quay (quyết định tạm)', async ({ page }) => {
    await openForInput(page);
    const box = (await page.locator('#sf-spin').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x - 150, box.y - 150, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    expect((await readState(page)).spinIndex).toBe(0);
  });

  for (const url of ['/', '/?game=arc-relay', '/?game=gatefall']) {
    test(`C5.9 ${url}: không có nút #sf-* nào hiện`, async ({ page }) => {
      await page.goto(url);
      await page.waitForFunction(() => window.__game?.getState() != null);
      await expect(page.locator('#sf-spin')).toBeHidden();
      await expect(page.locator('#sf-new')).toBeHidden();
    });
  }
});

/** Button rectangles, plus the reel frame and hp HUD area in page pixels, from the scene layout. */
const layoutBoxes = (page: Page) =>
  page.evaluate(() => {
    // Bố cục đọc từ layout của scene (C7: 540x960). Vùng "status" là hai HUD máu, "legend" là khung quay
    // (nơi bảng chú giải phủ lên khi mở).
    const s = window.__game!.getState() as unknown as { layout: { scale: number; canvasOffset: [number, number]; boxes: Record<string, [number, number, number, number]> } };
    const { scale: k, canvasOffset: [ox, oy], boxes } = s.layout;
    const toPage = ([x, y, w, h]: [number, number, number, number]) => ({ left: ox + x * k, top: oy + y * k, right: ox + (x + w) * k, bottom: oy + (y + h) * k });
    const r = (id: string) => {
      const b = document.getElementById(id)!.getBoundingClientRect();
      return { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
    };
    const ph = toPage(boxes.playerHud);
    const fh = toPage(boxes.foeHud);
    return {
      spin: r('sf-spin'), news: r('sf-new'),
      grid: toPage(boxes.reelFrame),
      status: { left: ph.left, top: Math.min(ph.top, fh.top), right: fh.right, bottom: Math.max(ph.bottom, fh.bottom) },
      legend: toPage(boxes.reelFrame),
      view: { w: innerWidth, h: innerHeight },
    };
  });
type Rect = { left: number; top: number; right: number; bottom: number };
const overlaps = (a: Rect, b: Rect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const inside = (a: Rect, w: number, h: number) => a.left >= 0 && a.top >= 0 && a.right <= w && a.bottom <= h;

for (const vp of [{ width: 844, height: 390, name: '844x390' }, { width: 390, height: 844, name: '390x844' }]) {
  test.describe(`Slot Five C5: cảm ứng ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: true, isMobile: true });

    test(`C5.8 ${vp.name}: chạm #sf-spin giống C5.1, chạm #sf-new giống C5.6`, async ({ page }) => {
      await openForInput(page);
      for (const id of ['#btn-left', '#btn-right', '#btn-jump']) await expect(page.locator(id)).toBeHidden();
      await expect(page.locator('#sf-spin')).toBeVisible();
      await expect(page.locator('#sf-new')).toBeVisible();
      const box = await layoutBoxes(page);
      console.log(`C5.8 ${vp.name}: ${JSON.stringify(box)}`);
      expect(inside(box.spin, box.view.w, box.view.h), 'nút quay nằm trong màn').toBe(true);
      expect(inside(box.news, box.view.w, box.view.h), 'nút trận mới nằm trong màn').toBe(true);
      expect(overlaps(box.spin, box.grid), 'nút quay không che lưới').toBe(false);
      expect(overlaps(box.news, box.grid), 'nút trận mới không che lưới').toBe(false);
      expect(overlaps(box.spin, box.status), 'nút quay không che bảng máu').toBe(false);
      expect(overlaps(box.spin, box.legend), 'nút quay không che chú giải').toBe(false);
      expect(overlaps(box.news, box.legend), 'nút trận mới không che chú giải').toBe(false);
      expect(overlaps(box.news, box.status), 'nút trận mới không che bảng máu').toBe(false);
      expect(overlaps(box.spin, box.news), 'hai nút không chồng nhau').toBe(false);
      await settleFrames(page);
      await page.screenshot({ path: `artifacts/slot-five-c5-${vp.name}-start.png` });

      await expectPlayerThenFoe(page, () => page.tap('#sf-spin'));
      await settleFrames(page);
      await page.screenshot({ path: `artifacts/slot-five-c5-${vp.name}-after-turn.png` });

      const s = await readState(page);
      await page.tap('#sf-new');
      await expectNewMatch(page, s.matchIndex);

      // Kết thúc trận rồi chạm Trận mới.
      await loadOneHitMatch(page);
      await page.tap('#sf-spin');
      await waitSettled(page);
      const end = await readState(page);
      expect(end.status).toBe('won');
      expect(end.phase).toBe('ended');
      await expect(page.locator('#sf-new')).toHaveClass(/highlight/);
      await settleFrames(page);
      await page.screenshot({ path: `artifacts/slot-five-c5-${vp.name}-ended.png` });
      // Chạm quay khi đã kết thúc bị từ chối.
      await page.tap('#sf-spin');
      expect((await readState(page)).lastReject).toBe('ended');
      expect((await readState(page)).matchIndex).toBe(end.matchIndex);
      await page.tap('#sf-new');
      await expectNewMatch(page, end.matchIndex);
    });

    test(`C5.3 ${vp.name}: chạm #sf-spin lúc foeWait (nút mờ) bị từ chối notYourTurn`, async ({ page }) => {
      await openForInput(page);
      const old = await setTuning(page, { sfFoeDelayMs: 1500 });
      try {
        await page.evaluate(() => window.__game!.slotFive!.loadMatch(window.__game!.tuning.sfSeed));
        await page.tap('#sf-spin');
        // C6: chạm lần hai phải rơi vào foeWait, không phải lúc spinning (khi đó lý do là busy).
        await waitPhase(page, ['foeWait']);
        await expect(page.locator('#sf-spin')).toHaveClass(/dim/);
        await settleFrames(page);
        await page.screenshot({ path: `artifacts/slot-five-c5-${vp.name}-foewait.png` });
        await page.tap('#sf-spin');
        const s = await readState(page);
        expect(s.spinIndex).toBe(1);
        expect(s.rejectedSpins).toBe(1);
        expect(s.lastReject).toBe('notYourTurn');
        await waitSpinIndex(page, 2);
        expect((await readState(page)).lastSide).toBe('foe');
      } finally {
        await setTuning(page, old);
      }
    });

    test(`C5.8 ${vp.name}: hai ngón cùng chạm #sf-spin chỉ quay một lần`, async ({ page }) => {
      await openForInput(page);
      const box = (await page.locator('#sf-spin').boundingBox())!;
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      const cdp = await page.context().newCDPSession(page);
      const tp = (id: number, dx: number) => ({ x: cx + dx, y: cy, id });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [tp(1, -10)] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [tp(1, -10), tp(2, 10)] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [tp(2, 10)] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await waitSpinIndex(page, 1);
      await page.waitForTimeout(150);
      const s = await readState(page);
      expect(s.spinIndex).toBe(1);
      expect(s.rejectedSpins).toBe(0);
    });
  });
}

test.describe('Slot Five C5.10: bot Space rồi bot chạm, cùng seed', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });

  test('C5.10 hai lần chơi trọn trận cùng seed ra cùng kết quả', async ({ page }) => {
    await openForInput(page);
    // Bản 4: nhịp nhanh và máu 40 để trận ngắn; cùng setup cho cả hai lần chơi và cho createBattle.
    const old = await setTuning(page, { ...FAST_TIMING, sfFoeDelayMs: 100 });
    const LOW = { player: { maxHp: 40 }, foe: { maxHp: 40 } };
    try {
      const SEED = 4321;
      await page.evaluate(([s, low]) => window.__game!.slotFive!.loadMatch(s, low), [SEED, LOW] as const);
      const byKey = await playToEnd(page, () => page.keyboard.press('Space'));
      await page.evaluate(([s, low]) => window.__game!.slotFive!.loadMatch(s, low), [SEED, LOW] as const);
      const byTouch = await playToEnd(page, () => page.tap('#sf-spin'));
      const pick = (s: SlotFiveState) => ({ status: s.status, spinIndex: s.spinIndex, playerHp: s.player.hp, foeHp: s.foe.hp });
      console.log(`C5.10: Space ${JSON.stringify(pick(byKey.s))} sau ${byKey.presses} lần bấm; chạm ${JSON.stringify(pick(byTouch.s))} sau ${byTouch.presses} lần chạm`);
      expect(pick(byTouch.s)).toEqual(pick(byKey.s));
      expect(byTouch.presses).toBe(byKey.presses);
      const sim = await page.evaluate(([s, low]) => {
        const b = window.__game!.slotFive!.createBattle(s, low);
        while (b.getState().status === 'playing') b.spin();
        return b.getState();
      }, [SEED, LOW] as const);
      expect(pick(byKey.s)).toEqual({ status: sim.status, spinIndex: sim.spinIndex, playerHp: sim.player.hp, foeHp: sim.foe.hp });
      expect(byKey.s.rejectedSpins).toBe(0);
      expect(byTouch.s.rejectedSpins).toBe(0);
    } finally {
      await setTuning(page, old);
    }
  });
});

// ---------------------------------------------------------------- C6: diễn hoạt và HUD máu

interface Sample {
  t: number; phase: string; spinIndex: number; lastSide: string | null; reelsStopped: number;
  hl: number; hlCells: number; icons: number; fighters: number;
  dPlayer: number; dFoe: number; player: number; foe: number; status: string;
  resolveMs: number; inFlight: number; casts: number; impacted: number; nonNoneChains: number;
  dsPlayer: number; dsFoe: number; shPlayer: number; shFoe: number;
}

declare global {
  interface Window { __qaSamples?: Sample[]; __qaSampling?: boolean }
}

/** Records the scene state on every animation frame, with performance.now() timestamps. */
const startSampler = (page: Page) =>
  page.evaluate(() => {
    window.__qaSamples = [];
    window.__qaSampling = true;
    const tick = () => {
      if (!window.__qaSampling) return;
      const s = window.__game?.getState<SlotFiveState>();
      if (s) {
        window.__qaSamples!.push({
          t: performance.now(), phase: s.phase, spinIndex: s.spinIndex, lastSide: s.lastSide, reelsStopped: s.reelsStopped,
          hl: s.highlightedChainCount, hlCells: s.highlightedCells, icons: s.viewCounts.icons, fighters: s.viewCounts.fighters,
          dPlayer: s.displayHp.player, dFoe: s.displayHp.foe, player: s.player.hp, foe: s.foe.hp, status: s.status,
          resolveMs: s.lastResolveMs, inFlight: s.castsInFlight, casts: s.lastCasts.length,
          impacted: s.lastCasts.filter((c) => c.impactedAtMs !== null).length,
          nonNoneChains: s.lastChains.filter((c) => c.kind !== 'none').length,
          dsPlayer: s.displayShield.player, dsFoe: s.displayShield.foe, shPlayer: s.player.shield, shFoe: s.foe.shield,
        });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

const stopSampler = (page: Page) =>
  page.evaluate(() => {
    window.__qaSampling = false;
    return window.__qaSamples!;
  });

interface TurnReport {
  spinIndex: number; side: string; reelStops: number[]; spinMs: number; resolveDisplayLagMs: number | null;
  spinDisplayOk: boolean; firstSpinSample: Sample; foeDelayMs: number | null; resolveMs: number;
  resolveRealMs: number | null; leaveSample: Sample | null;
}

/** Splits a sample stream into turns (by spinIndex) and measures each one. */
const analyseTurns = (samples: Sample[], resolveMs: number) => {
  const turns: TurnReport[] = [];
  const problems: string[] = [];
  for (let i = 1; i < samples.length; i += 1) {
    if (samples[i].spinIndex !== samples[i - 1].spinIndex + 1) continue;
    const start = i;
    const before = samples[i - 1];
    const idx = samples[i].spinIndex;
    let j = start;
    while (j < samples.length && samples[j].spinIndex === idx && samples[j].phase === 'spinning') j += 1;
    const spinSamples = samples.slice(start, j);
    // C6.5: trong spinning, displayHp bằng máu trước lượt.
    const spinDisplayOk = spinSamples.every((s) => s.dPlayer === before.player && s.dFoe === before.foe);
    let resolveDisplayLagMs: number | null = null;
    let resolveRealMs: number | null = null;
    let leaveSample: Sample | null = null;
    if (j < samples.length && samples[j].phase === 'resolving') {
      const enter = samples[j].t;
      const done = samples.slice(j).find((s) => s.dPlayer === s.player && s.dFoe === s.foe);
      resolveDisplayLagMs = done ? done.t - enter : null;
      let k = j;
      while (k < samples.length && samples[k].spinIndex === idx && samples[k].phase === 'resolving') k += 1;
      if (k < samples.length && samples[k].spinIndex === idx) {
        resolveRealMs = samples[k].t - enter;
        leaveSample = samples[k];
      }
    }
    // C6.6: khi người chơi hết resolving (sang foeWait) tới lúc đối thủ bắt đầu quay.
    let foeDelayMs: number | null = null;
    if (samples[start].lastSide === 'player') {
      const waitStart = samples.slice(start).find((s) => s.phase === 'foeWait');
      const foeStart = samples.slice(start).find((s) => s.spinIndex === idx + 1);
      if (waitStart && foeStart) foeDelayMs = foeStart.t - waitStart.t;
    }
    turns.push({
      spinIndex: idx, side: samples[start].lastSide ?? '?', reelStops: [], spinMs: 0, resolveDisplayLagMs,
      spinDisplayOk, firstSpinSample: samples[start], foeDelayMs, resolveMs: samples[start].resolveMs, resolveRealMs, leaveSample,
    });
  }
  // C6.7 bản 4: mỗi khi không còn diễn hoạt, lưới có đúng 16 sprite và 2 nhân vật.
  for (const s of samples) {
    if ((s.phase === 'idle' || s.phase === 'foeWait' || s.phase === 'ended') && (s.icons !== 16 || s.fighters !== 2)) {
      problems.push(`spinIndex ${s.spinIndex} ${s.phase}: icons ${s.icons}, fighters ${s.fighters}`);
    }
  }
  void resolveMs;
  return { turns, problems };
};

test.describe('Slot Five C6: diễn hoạt và HUD máu', () => {
  test('C6.1 ngay sau khi lượt bắt đầu: spinning, 0 cột dừng, chưa highlight, kết quả đã là kết quả cuối', async ({ page }) => {
    await openForInput(page);
    const t = await readTuning(page);
    await page.evaluate((s) => window.__game!.slotFive!.loadMatch(s), t.sfSeed);
    const sim = await page.evaluate((seed) => {
      const b = window.__game!.slotFive!.createBattle(seed);
      const r0 = b.spin();
      const s0 = b.getState();
      const r1 = b.spin();
      return { r0, s0, r1, s1: b.getState() };
    }, t.sfSeed);
    // Lượt người chơi: đọc state trong cùng evaluate với lệnh quay.
    const p = await page.evaluate(() => {
      const ok = window.__game!.slotFive!.spin();
      return { ok, s: window.__game!.getState<SlotFiveState>()! };
    });
    expect(p.ok).toBe(true);
    expect(p.s.phase).toBe('spinning');
    expect(p.s.reelsStopped).toBe(0);
    expect(p.s.highlightedChainCount).toBe(0);
    expect(p.s.grid).toEqual(sim.r0.grid);
    expect(p.s.player).toEqual(sim.s0.player);
    expect(p.s.foe).toEqual(sim.s0.foe);
    // Lượt đối thủ: lấy mẫu đầu tiên sau khi spinIndex tăng.
    await startSampler(page);
    await page.waitForFunction(() => window.__game!.getState<SlotFiveState>()!.spinIndex >= 2, null, { timeout: 15_000 });
    const samples = await stopSampler(page);
    const first = samples.find((s) => s.spinIndex === 2)!;
    expect(first.phase).toBe('spinning');
    expect(first.reelsStopped).toBe(0);
    expect(first.hl).toBe(0);
    expect(first.player).toBe(sim.s1.player.hp);
    expect(first.foe).toBe(sim.s1.foe.hp);
    const f = await readState(page);
    expect(f.grid).toEqual(sim.r1.grid);
  });

  test('C6.2, C6.5, C6.6, C6.7, C8.6, C8.9 trận đầy đủ với nhịp mặc định (máu 50 để trận ngắn)', async ({ page }) => {
    test.setTimeout(180_000);
    await openForInput(page);
    const t = await readTuning(page);
    const SEED = t.sfSeed;
    // Bản 4: 450 máu cho khoảng 120 lượt; trận nghiệm thu nhịp dùng máu 50 mỗi bên, nhịp vẫn là giá trị mặc định.
    await page.evaluate((s) => window.__game!.slotFive!.loadMatch(s, { player: { maxHp: 50 }, foe: { maxHp: 50 } }), SEED);
    await startSampler(page);
    const stops: { spinIndex: number; side: string; stops: number[]; lastSpinMs: number; icons: number; fighters: number }[] = [];
    for (let guard = 0; guard < 200; guard += 1) {
      await waitPhase(page, ['idle', 'foeWait', 'ended'], 20_000);
      const s = await readState(page);
      if (s.spinIndex > 0 && !stops.some((x) => x.spinIndex === s.spinIndex)) {
        stops.push({ spinIndex: s.spinIndex, side: s.lastSide!, stops: s.lastReelStopMs, lastSpinMs: s.lastSpinMs, icons: s.viewCounts.icons, fighters: s.viewCounts.fighters });
      }
      if (s.phase === 'ended') break;
      if (s.phase === 'idle') await page.keyboard.press('Space');
      else await waitSpinIndex(page, s.spinIndex + 1);
      await page.waitForFunction((k) => {
        const st = window.__game!.getState<SlotFiveState>()!;
        return st.spinIndex > k || st.phase === 'ended';
      }, s.spinIndex, { timeout: 20_000 });
    }
    const samples = await stopSampler(page);
    const end = await readState(page);
    expect(end.phase).toBe('ended');
    if (!stops.some((x) => x.spinIndex === end.spinIndex)) {
      stops.push({ spinIndex: end.spinIndex, side: end.lastSide!, stops: end.lastReelStopMs, lastSpinMs: end.lastSpinMs, icons: end.viewCounts.icons, fighters: end.viewCounts.fighters });
    }
    // C6.2
    const c62: string[] = [];
    let maxFirstDev = 0;
    let maxGapDev = 0;
    for (const x of stops) {
      if (x.stops.length !== 4) c62.push(`lượt ${x.spinIndex}: ${x.stops.length} phần tử`);
      for (let i = 1; i < x.stops.length; i += 1) {
        if (!(x.stops[i] > x.stops[i - 1])) c62.push(`lượt ${x.spinIndex}: không tăng dần`);
        const gapDev = Math.abs(x.stops[i] - x.stops[i - 1] - t.sfReelStopGapMs);
        maxGapDev = Math.max(maxGapDev, gapDev);
        if (gapDev > 40) c62.push(`lượt ${x.spinIndex}: khoảng ${i - 1}-${i} = ${(x.stops[i] - x.stops[i - 1]).toFixed(1)}`);
      }
      const d0 = x.stops[0] - t.sfSpinBaseMs;
      maxFirstDev = Math.max(maxFirstDev, Math.abs(d0));
      if (d0 < -30 || d0 > 60) c62.push(`lượt ${x.spinIndex}: cột 0 dừng ở ${x.stops[0].toFixed(1)}`);
      if (x.lastSpinMs !== t.sfSpinBaseMs + 3 * t.sfReelStopGapMs) c62.push(`lượt ${x.spinIndex}: lastSpinMs ${x.lastSpinMs}`);
    }
    const { turns, problems } = analyseTurns(samples, t.sfResolveMs);
    // C6.5 (mở lại bản 3): mốc là lastResolveMs + 150 của từng lượt.
    const c65 = turns.filter((x) => !x.spinDisplayOk || x.resolveDisplayLagMs === null || x.resolveDisplayLagMs > x.resolveMs + 150)
      .map((x) => `lượt ${x.spinIndex}: spinning đúng ${x.spinDisplayOk}, trễ ${x.resolveDisplayLagMs}`);
    const foeDelays = turns.filter((x) => x.foeDelayMs !== null).map((x) => x.foeDelayMs!);
    const c66 = foeDelays.filter((d) => Math.abs(d - t.sfFoeDelayMs) > 60);
    const c61 = turns.filter((x) => x.firstSpinSample.phase !== 'spinning' || x.firstSpinSample.reelsStopped !== 0 || x.firstSpinSample.hl !== 0)
      .map((x) => `lượt ${x.spinIndex}`);
    const c67 = stops.filter((x) => x.icons !== 16 || x.fighters !== 2).map((x) => `lượt ${x.spinIndex}: ${x.icons}/${x.fighters}`);
    const frameGaps = samples.slice(1).map((s, i) => s.t - samples[i].t).sort((a, b) => a - b);
    console.log(`C6 trận seed ${SEED}: ${end.spinIndex} lượt, ${end.status}; ${samples.length} mẫu, khung hình trung vị ${frameGaps[Math.floor(frameGaps.length / 2)].toFixed(1)} ms, lớn nhất ${frameGaps[frameGaps.length - 1].toFixed(1)} ms`);
    console.log(`C6.2: lệch cột 0 lớn nhất ${maxFirstDev.toFixed(1)} ms, lệch khoảng cột lớn nhất ${maxGapDev.toFixed(1)} ms; ví dụ ${JSON.stringify(stops[0].stops.map((v) => Math.round(v)))}`);
    console.log(`C6.5: trễ displayHp sau khi vào resolving (ms): ${turns.map((x) => x.resolveDisplayLagMs === null ? 'null' : Math.round(x.resolveDisplayLagMs)).join(', ')}`);
    console.log(`C6.6: foeWait thực đo (ms): ${foeDelays.map((d) => Math.round(d)).join(', ')}`);
    expect(stops.length).toBe(end.spinIndex);
    expect(c62, 'C6.2').toEqual([]);
    expect(c61, 'C6.1 ở mọi lượt').toEqual([]);
    expect(c65, 'C6.5').toEqual([]);
    expect(foeDelays.length).toBeGreaterThan(0);
    expect(c66, 'C6.6').toEqual([]);
    expect(c67, 'C6.7 sau mỗi lượt').toEqual([]);
    expect(problems, 'C6.7 mọi mẫu khi không diễn hoạt').toEqual([]);
    // C8.6: thời gian resolving thật nằm trong lastResolveMs ± 60.
    const c86 = turns.filter((x) => x.resolveRealMs === null || Math.abs(x.resolveRealMs - x.resolveMs) > 60)
      .map((x) => `lượt ${x.spinIndex}: resolving ${x.resolveRealMs === null ? 'null' : x.resolveRealMs.toFixed(1)} so với ${x.resolveMs}`);
    // C8.9: số viên = số chuỗi khác May mắn; rời resolving khi không còn viên bay, mọi viên đã trúng;
    // kết quả trận chỉ hiện sau viên cuối (mẫu ended đầu tiên đã trúng đủ viên).
    const c89: string[] = [];
    for (const x of turns) {
      if (x.firstSpinSample.casts !== x.firstSpinSample.nonNoneChains) c89.push(`lượt ${x.spinIndex}: ${x.firstSpinSample.casts} viên, ${x.firstSpinSample.nonNoneChains} chuỗi`);
      const l = x.leaveSample;
      if (l && (l.inFlight !== 0 || l.impacted !== l.casts)) c89.push(`lượt ${x.spinIndex}: rời resolving khi còn ${l.inFlight} viên bay, trúng ${l.impacted}/${l.casts}`);
    }
    for (let i = 1; i < samples.length; i += 1) {
      const s = samples[i];
      if (s.phase === 'resolving' && samples[i - 1].phase === 'resolving' && s.spinIndex === samples[i - 1].spinIndex && s.inFlight > s.casts) c89.push('castsInFlight > số viên');
    }
    const firstEnded = samples.find((s) => s.phase === 'ended');
    if (!firstEnded || firstEnded.impacted !== firstEnded.casts || firstEnded.dPlayer !== firstEnded.player || firstEnded.dFoe !== firstEnded.foe) {
      c89.push(`mẫu ended đầu tiên: ${JSON.stringify(firstEnded)}`);
    }
    const casts = turns.reduce((a, x) => a + x.firstSpinSample.casts, 0);
    console.log(`C8.6: resolving thật trừ lastResolveMs (ms): ${turns.map((x) => x.resolveRealMs === null ? 'null' : Math.round(x.resolveRealMs - x.resolveMs)).join(', ')}`);
    console.log(`C8.9: ${turns.length} lượt, ${casts} viên cast`);
    expect(c86, 'C8.6').toEqual([]);
    expect(c89, 'C8.9').toEqual([]);
    expect(casts).toBeGreaterThan(0);
    // Trong lúc quay có thêm sprite dự phòng (quyết định của Programmer).
    const spinningIcons = [...new Set(samples.filter((s) => s.phase === 'spinning').map((s) => s.icons))];
    console.log(`C6.7: số sprite icon lúc spinning: ${spinningIcons.join(',')}`);
  });

  test('C6.3 quay trong spinning/resolving bị từ chối: busy (lượt người chơi), notYourTurn (lượt đối thủ)', async ({ page }) => {
    await openForInput(page);
    const t = await readTuning(page);
    await page.evaluate((f1) => window.__game!.slotFive!.loadMatch(4242, { grids: [f1, f1] }), fx('F1'));
    const press = async (expected: string, phase: string) => {
      const before = await readState(page);
      expect(before.phase).toBe(phase);
      await page.keyboard.press('Space');
      const after = await readState(page);
      expect(after.rejectedSpins, `${phase}`).toBe(before.rejectedSpins + 1);
      expect(after.lastReject, `${phase}`).toBe(expected);
      expect(after.spinIndex, `${phase}`).toBe(before.spinIndex);
    };
    await page.keyboard.press('Space');
    await press('busy', 'spinning');
    await waitPhase(page, ['resolving']);
    await press('busy', 'resolving');
    await waitPhase(page, ['foeWait']);
    await waitSpinIndex(page, 2);
    await press('notYourTurn', 'spinning');
    await waitPhase(page, ['resolving']);
    await press('notYourTurn', 'resolving');
    await waitPhase(page, ['idle', 'ended']);
    expect((await readState(page)).spinIndex).toBe(2);
    void t;
  });

  test('C6.3 chạm #sf-spin trong lúc diễn hoạt cũng bị từ chối busy', async ({ page }) => {
    await openForInput(page);
    await page.click('#sf-spin');
    const s0 = await readState(page);
    expect(s0.phase).toBe('spinning');
    await page.click('#sf-spin');
    const s1 = await readState(page);
    expect(s1.lastReject).toBe('busy');
    expect(s1.spinIndex).toBe(1);
  });

  for (const [id, chains, cells] of [['F7', 2, 5], ['F0', 0, 0], ['F12', 3, 9]] as const) {
    test(`C6.4 ép ${id}: khi cột cuối dừng thì resolving, ${chains} chuỗi sáng, ${cells} ô sáng`, async ({ page }) => {
      await openForInput(page);
      await page.evaluate((g) => window.__game!.slotFive!.loadMatch(4242, { grids: [g] }), fx(id));
      await startSampler(page);
      await page.keyboard.press('Space');
      await page.waitForFunction(() => window.__game!.getState<SlotFiveState>()!.reelsStopped === 4, null, { timeout: 10_000, polling: 'raf' });
      const s = await readState(page);
      const samples = await stopSampler(page);
      const firstFive = samples.find((x) => x.spinIndex === 1 && x.reelsStopped === 4)!;
      console.log(`C6.4 ${id}: lúc đọc ${s.phase} ${s.highlightedChainCount}/${s.highlightedCells}; mẫu đầu có 4 cột dừng: ${firstFive.phase} ${firstFive.hl}/${firstFive.hlCells}; reelsStopped đã qua ${[...new Set(samples.filter((x) => x.spinIndex === 1).map((x) => x.reelsStopped))].join(',')}`);
      expect(firstFive.phase).toBe('resolving');
      expect(firstFive.hl).toBe(chains);
      expect(firstFive.hlCells).toBe(cells);
      if (id === 'F12') {
        await page.screenshot({ path: 'artifacts/slot-five-c6-960x540-f12-highlight.png' });
      }
      // Highlight được xóa khi lượt quay kế bắt đầu (lượt đối thủ).
      await waitSpinIndex(page, 2);
      const next = await readState(page);
      if (next.phase === 'spinning') expect(next.highlightedChainCount).toBe(0);
    });
  }
});

/** C6.8 screenshots for the user: mid-spin, F12 highlight with floating numbers, end of match. */
for (const vp of [
  { width: 960, height: 540, name: '960x540', touch: false },
  { width: 844, height: 390, name: '844x390', touch: true },
  { width: 390, height: 844, name: '390x844', touch: true },
]) {
  test.describe(`Slot Five C6.8: ảnh ${vp.name}`, () => {
    test.use(vp.touch ? { viewport: { width: vp.width, height: vp.height }, hasTouch: true, isMobile: true } : { viewport: { width: vp.width, height: vp.height } });

    test(`C6.8 ${vp.name}: ảnh giữa lúc quay, highlight F12 có số nổi, màn kết thúc`, async ({ page }) => {
      await openForInput(page);
      const t = await readTuning(page);
      // Lượt đầu F12 (Kiếm 3, Hồi máu 3, Khiên 3) với người chơi 70 máu để thấy đủ ba số.
      // Đối thủ có 2 * sfBBlade máu: F12 rồi F0 (đối thủ) rồi F1 thì trận kết thúc ở lượt 3.
      const foeHp = 2 * t.sfBBlade;
      await page.evaluate(([f12, f0, f1, hp]) => window.__game!.slotFive!.loadMatch(4242, { player: { maxHp: 450, hp: 70 }, foe: { maxHp: 450, hp: hp as number }, grids: [f12 as number[][], f0 as number[][], f1 as number[][]] }), [fx('F12'), fx('F0'), fx('F1'), foeHp] as const);
      if (vp.touch) await page.tap('#sf-spin');
      else await page.keyboard.press('Space');
      // Giữa lúc quay: sau khi 2 cột đã dừng.
      await page.waitForFunction(() => window.__game!.getState<SlotFiveState>()!.reelsStopped >= 2, null, { timeout: 10_000, polling: 'raf' });
      await page.screenshot({ path: `artifacts/slot-five-c6-${vp.name}-spinning.png` });
      // Highlight F12 khi số sát thương vừa nổi (displayHp của đối thủ bắt đầu giảm).
      await page.waitForFunction((hp) => {
        const s = window.__game!.getState<SlotFiveState>()!;
        return s.phase === 'resolving' && s.displayHp.foe < hp;
      }, foeHp, { timeout: 10_000, polling: 'raf' });
      const hl = await readState(page);
      await page.screenshot({ path: `artifacts/slot-five-c6-${vp.name}-f12-floats.png` });
      expect(hl.highlightedChainCount).toBe(3);
      expect(hl.lastEffects).toMatchObject({ damage: t.sfBBlade, heal: t.sfBHeal, shield: t.sfBShield });
      // Chơi tới khi kết thúc.
      for (let guard = 0; guard < 50; guard += 1) {
        await waitPhase(page, ['idle', 'ended'], 20_000);
        const s = await readState(page);
        if (s.phase === 'ended') break;
        if (vp.touch) await page.tap('#sf-spin');
        else await page.keyboard.press('Space');
        await waitSpinIndex(page, s.spinIndex + 1);
      }
      await waitPhase(page, ['ended']);
      await settleFrames(page);
      const end = await readState(page);
      console.log(`C6.8 ${vp.name}: kết thúc ${end.status} sau ${end.spinIndex} lượt, máu ${end.player.hp}/${end.foe.hp}, displayHp ${JSON.stringify(end.displayHp)}`);
      expect(end.displayHp).toEqual({ player: end.player.hp, foe: end.foe.hp });
      await page.screenshot({ path: `artifacts/slot-five-c6-${vp.name}-ended.png` });
    });
  });
}

test.describe('Slot Five C6.8: chú giải đổi theo TUNING', () => {
  test('Chú giải icon đọc TUNING lúc vào trận (ảnh để soát)', async ({ page }) => {
    await openForInput(page);
    const old = await setTuning(page, { sfBFire: 55, sfBHeal: 25, sfLen4Mult: 3 });
    try {
      await page.evaluate(() => window.__game!.slotFive!.loadMatch(4242));
      await settleFrames(page);
      await page.screenshot({ path: 'artifacts/slot-five-c6-960x540-legend-changed.png' });
    } finally {
      await setTuning(page, old);
    }
  });
});

// ---------------------------------------------------------------- C7: layout dọc, panel dưới, nút "?"

type GBox = [number, number, number, number];

/**
 * Table of section 4.9 (brief v4.1), written from the brief: `helpBtn` at 20, 832 and `fastBtn` (C11) at 96, 832.
 */
const LAYOUT_TABLE: Record<string, GBox> = {
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
};
const LEGEND_TABLE: GBox = [57, 64, 426, 426];
/** Producer ruling (v4): `#sf-help-close` is 64x64 at the legend's top-right corner. */
const HELP_CLOSE_BOX: GBox = [419, 64, 64, 64];
const BUTTON_BOX: Record<string, GBox> = {
  'sf-spin': LAYOUT_TABLE.spinBtn, 'sf-new': LAYOUT_TABLE.newBtn, 'sf-help': LAYOUT_TABLE.helpBtn, 'sf-fast': LAYOUT_TABLE.fastBtn, 'sf-help-close': HELP_CLOSE_BOX,
};
const PANEL_CHILDREN = ['helpBtn', 'fastBtn', 'spinBtn', 'newBtn'];

const interArea = (a: GBox, b: GBox) =>
  Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]));
const boxInside = (inner: GBox, outer: GBox, tol = 0) =>
  inner[0] >= outer[0] - tol && inner[1] >= outer[1] - tol && inner[0] + inner[2] <= outer[0] + outer[2] + tol && inner[1] + inner[3] <= outer[1] + outer[3] + tol;

/** WCAG 2.x contrast ratio of two '#rrggbb' (or '#rgb', 'rgb(...)') colours. */
const parseColor = (c: string): [number, number, number] => {
  const s = c.trim().toLowerCase();
  if (s.startsWith('#')) {
    const h = s.length === 4 ? s.slice(1).split('').map((x) => x + x).join('') : s.slice(1, 7);
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(',').map((v) => parseFloat(v));
    return [r, g, b];
  }
  throw new Error(`không đọc được màu ${c}`);
};
const contrast = (a: string, b: string) => {
  const lum = (c: string) => {
    const [r, g, b] = parseColor(c).map((v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

interface LayoutState {
  width: number; height: number; scale: number; canvasOffset: [number, number];
  boxes: Record<string, GBox>; castGap: { top: number; bottom: number };
  texts: { id: string; fontPx: number; color: string; bg: string }[];
}
interface C7State extends SlotFiveState {
  legendOpen: boolean;
  displayShield: { player: number; foe: number };
  floatTexts: { side: 'player' | 'foe'; text: string; box: GBox }[];
  layout: LayoutState;
}
const readC7 = (page: Page) => page.evaluate(() => window.__game!.getState() as unknown as C7State);

/** DOM rect of a button versus its box times scale plus canvas offset. */
const buttonFit = (page: Page) =>
  page.evaluate((map) => {
    const s = window.__game!.getState() as unknown as C7State;
    const { scale, canvasOffset } = s.layout;
    const out: Record<string, { visible: boolean; rect: number[]; want: number[]; fontPx: number }> = {};
    for (const [id, box] of Object.entries(map)) {
      const el = document.getElementById(id)!;
      const r = el.getBoundingClientRect();
      const visible = getComputedStyle(el).display !== 'none' && r.width > 0;
      out[id] = {
        visible,
        rect: [r.left, r.top, r.width, r.height],
        want: [canvasOffset[0] + box[0] * scale, canvasOffset[1] + box[1] * scale, box[2] * scale, box[3] * scale],
        fontPx: parseFloat(getComputedStyle(el).fontSize),
      };
    }
    return out;
  }, BUTTON_BOX);

const textProblems = (layout: LayoutState, minCssPx: number | null) => {
  const out: string[] = [];
  for (const t of layout.texts) {
    if (minCssPx !== null && t.fontPx * layout.scale < minCssPx - 1e-9) out.push(`${t.id}: ${t.fontPx}px game = ${(t.fontPx * layout.scale).toFixed(2)}px CSS`);
    if (['turnBanner', 'playerHp', 'foeHp'].includes(t.id) && t.fontPx < 22) out.push(`${t.id}: ${t.fontPx}px game < 22`);
    const ratio = contrast(t.color, t.bg);
    if (ratio < 4.5) out.push(`${t.id}: tương phản ${ratio.toFixed(2)} (${t.color} trên ${t.bg})`);
  }
  return out;
};

test.describe('Slot Five C7: layout 540x960 (desktop mặc định)', () => {
  test('C7.1 layout 540x960, mọi hộp khớp bảng mục 4.9', async ({ page }) => {
    await openForInput(page);
    const s = await readC7(page);
    expect(s.layout.width).toBe(540);
    expect(s.layout.height).toBe(960);
    expect(s.legendOpen).toBe(false);
    expect(s.layout.boxes).not.toHaveProperty('legend');
    for (const [key, want] of Object.entries(LAYOUT_TABLE)) {
      const got = s.layout.boxes[key];
      expect(got, key).toBeDefined();
      for (let i = 0; i < 4; i += 1) expect(Math.abs(got[i] - want[i]), `${key}[${i}] = ${got[i]}`).toBeLessThanOrEqual(1);
    }
    const canvas = await page.evaluate(() => {
      const c = document.querySelector('canvas')!;
      return [c.width, c.height];
    });
    console.log(`C7.1 slot-five canvas ${canvas.join('x')}, các khóa ${Object.keys(s.layout.boxes).join(',')}`);
    expect(canvas[0] * 960).toBe(canvas[1] * 540);
  });

  for (const url of ['/', '/?game=arc-relay', '/?game=gatefall']) {
    test(`C7.1 ${url} vẫn 960x540`, async ({ page }) => {
      await page.goto(url);
      await page.waitForFunction(() => window.__game?.getState() != null);
      const out = await page.evaluate(() => {
        const c = document.querySelector('canvas')!;
        const r = c.getBoundingClientRect();
        return { w: c.width, h: c.height, rw: r.width, rh: r.height };
      });
      console.log(`C7.1 ${url}: canvas ${out.w}x${out.h}, hiển thị ${out.rw.toFixed(1)}x${out.rh.toFixed(1)}`);
      expect([out.w, out.h]).toEqual([960, 540]);
      expect(Math.abs(out.rw * 540 / 960 - out.rh)).toBeLessThanOrEqual(1);
    });
  }

  test('C7.2 không hộp nào chồng nhau, tất cả nằm trong 540x960 (đóng và mở chú giải)', async ({ page }) => {
    await openForInput(page);
    const check = (boxes: Record<string, GBox>) => {
      const bad: string[] = [];
      const keys = Object.keys(boxes);
      for (const k of keys) if (!boxInside(boxes[k], [0, 0, 540, 960])) bad.push(`${k} ra ngoài`);
      for (let i = 0; i < keys.length; i += 1) {
        for (let j = i + 1; j < keys.length; j += 1) {
          const [a, b] = [keys[i], keys[j]];
          const pair = [a, b].sort().join('+');
          if (pair === 'legend+reelFrame') continue;
          if ((a === 'panel' && PANEL_CHILDREN.includes(b)) || (b === 'panel' && PANEL_CHILDREN.includes(a))) continue;
          if (interArea(boxes[a], boxes[b]) > 0) bad.push(`${a} giao ${b}`);
        }
      }
      return bad;
    };
    expect(check((await readC7(page)).layout.boxes)).toEqual([]);
    for (const k of PANEL_CHILDREN) expect(boxInside(LAYOUT_TABLE[k], LAYOUT_TABLE.panel), `${k} trong panel`).toBe(true);
    await page.keyboard.press('h');
    const open = await readC7(page);
    expect(open.layout.boxes.legend).toEqual(LEGEND_TABLE);
    expect(check(open.layout.boxes)).toEqual([]);
    // Nút đóng nằm trong bảng chú giải (miễn kiểm chồng với legend và reelFrame theo Producer).
    expect(boxInside(HELP_CLOSE_BOX, LEGEND_TABLE)).toBe(true);
    for (const k of Object.keys(open.layout.boxes).filter((x) => !['legend', 'reelFrame'].includes(x))) {
      expect(interArea(HELP_CLOSE_BOX, open.layout.boxes[k]), `helpClose giao ${k}`).toBe(0);
    }
  });

  test('C7.4 khoảng trống cast từ đáy khung quay tới đỉnh nhân vật, chỉ có hộp số nổi', async ({ page }) => {
    await openForInput(page);
    const { layout } = await readC7(page);
    const b = layout.boxes;
    expect(layout.castGap.top).toBe(b.reelFrame[1] + b.reelFrame[3]);
    expect(layout.castGap.top).toBe(490);
    expect(layout.castGap.bottom).toBe(636);
    expect(layout.castGap.bottom).toBe(Math.min(b.playerFighter[1], b.foeFighter[1]));
    expect(layout.castGap.bottom - layout.castGap.top).toBeGreaterThanOrEqual(0.15 * layout.height);
    console.log(`C7.4: castGap ${layout.castGap.top}..${layout.castGap.bottom} = ${layout.castGap.bottom - layout.castGap.top} px`);
    for (const [k, box] of Object.entries(b)) {
      if (k === 'playerFloat' || k === 'foeFloat') continue;
      const hits = box[1] < layout.castGap.bottom && box[1] + box[3] > layout.castGap.top;
      expect(hits, `${k} [${box.join(',')}] giao dải cast`).toBe(false);
    }
  });

  test('C7.3 số nổi luôn nằm trong vùng số nổi của bên nhận, không giao khung quay (trận đầy đủ F12, F11)', async ({ page }) => {
    test.setTimeout(240_000);
    await openForInput(page);
    // Bản 4: máu 60 mỗi bên để trận đầy đủ ngắn; hai lượt đầu ép F12 rồi F11 như tiêu chí.
    await page.evaluate(([f12, f11]) => window.__game!.slotFive!.loadMatch(4242, { player: { maxHp: 60 }, foe: { maxHp: 60 }, grids: [f12, f11] }), [fx('F12'), fx('F11')] as const);
    await page.evaluate(() => {
      const w = window as unknown as { __qaFloat: { n: number; floats: number; bad: string[]; kinds: Record<string, number> } };
      w.__qaFloat = { n: 0, floats: 0, bad: [], kinds: {} };
      const id = setInterval(() => {
        const s = window.__game?.getState() as unknown as C7State | null;
        if (!s) return;
        const q = w.__qaFloat;
        q.n += 1;
        const B = s.layout.boxes;
        for (const f of s.floatTexts) {
          q.floats += 1;
          const area = B[`${f.side}Float`];
          const kind = f.text.startsWith('+') ? (/khiên/i.test(f.text) ? 'shield' : 'heal') : f.text.startsWith('-') ? 'damage' : /chặn/i.test(f.text) ? 'absorb' : 'other';
          q.kinds[`${f.side}:${kind}`] = (q.kinds[`${f.side}:${kind}`] ?? 0) + 1;
          const [x, y, wd, h] = f.box;
          const inside = x >= area[0] - 1 && y >= area[1] - 1 && x + wd <= area[0] + area[2] + 1 && y + h <= area[1] + area[3] + 1;
          const R = B.reelFrame;
          const hitsReel = Math.min(x + wd, R[0] + R[2]) > Math.max(x, R[0]) && Math.min(y + h, R[1] + R[3]) > Math.max(y, R[1]);
          if ((!inside || hitsReel) && q.bad.length < 10) q.bad.push(`${f.side} "${f.text}" [${f.box.map((v) => v.toFixed(1)).join(',')}] spinIndex ${s.spinIndex}`);
        }
        if (s.phase === 'ended' && s.floatTexts.length === 0) clearInterval(id);
      }, 50);
    });
    const end = await playToEnd(page, () => page.keyboard.press('Space'));
    await page.waitForTimeout(1500);
    const q = await page.evaluate(() => (window as unknown as { __qaFloat: { n: number; floats: number; bad: string[]; kinds: Record<string, number> } }).__qaFloat);
    console.log(`C7.3: trận ${end.s.status} sau ${end.s.spinIndex} lượt; ${q.n} lần lấy mẫu, ${q.floats} lần thấy số nổi; loại ${JSON.stringify(q.kinds)}`);
    expect(q.bad).toEqual([]);
    expect(q.floats).toBeGreaterThan(0);
    for (const k of ['player:heal', 'player:shield', 'foe:damage']) expect(q.kinds[k] ?? 0, k).toBeGreaterThan(0);
  });

  test('C7.6 tương phản mọi chữ ≥ 4,5 (đóng, mở chú giải, có số nổi)', async ({ page }) => {
    await openForInput(page);
    const all: string[] = [];
    const seen = new Set<string>();
    const take = async (label: string) => {
      const { layout } = await readC7(page);
      layout.texts.forEach((t) => seen.add(t.id));
      all.push(...textProblems(layout, null).map((p) => `${label}: ${p}`));
    };
    await take('đóng');
    await page.keyboard.press('h');
    await take('mở');
    await page.keyboard.press('Escape');
    await page.evaluate((f12) => window.__game!.slotFive!.loadMatch(4242, { player: { maxHp: 450, hp: 70 }, grids: [f12] }), fx('F12'));
    await page.keyboard.press('Space');
    for (let i = 0; i < 40; i += 1) {
      await take(`lượt 1 mẫu ${i}`);
      await page.waitForTimeout(50);
    }
    console.log(`C7.6: đã soát ${seen.size} id: ${[...seen].sort().join(', ')}`);
    expect(all).toEqual([]);
    for (const id of ['turnBanner', 'playerHp', 'playerShield', 'foeHp', 'foeShield', 'legendTitle', 'legendHeader', 'legend-0', 'legend-7', 'float-player', 'float-foe']) {
      expect(seen.has(id), `đã thấy ${id}`).toBe(true);
    }
  });

  test('C7.9 phím H, H, ?, Esc bật và tắt chú giải', async ({ page }) => {
    await openForInput(page);
    const st = async () => {
      const s = await readC7(page);
      return { open: s.legendOpen, box: 'legend' in s.layout.boxes };
    };
    expect(await st()).toEqual({ open: false, box: false });
    await page.keyboard.press('h');
    expect(await st()).toEqual({ open: true, box: true });
    await page.keyboard.press('h');
    expect(await st()).toEqual({ open: false, box: false });
    await page.keyboard.press('?');
    expect(await st()).toEqual({ open: true, box: true });
    await page.keyboard.press('Escape');
    expect(await st()).toEqual({ open: false, box: false });
    // Esc khi đã đóng vẫn đóng; H in hoa (Shift+H) cũng bật.
    await page.keyboard.press('Escape');
    expect((await st()).open).toBe(false);
    await page.keyboard.press('Shift+KeyH');
    expect((await st()).open).toBe(true);
    // Mở chú giải không làm đổi trận.
    const s = await readC7(page);
    expect(s.spinIndex).toBe(0);
    expect(s.phase).toBe('idle');
  });

  test('C7.11 chú giải mở rồi bấm Space: lượt được nhận, bảng tự đóng khi spinning; lượt đối thủ cũng tự đóng', async ({ page }) => {
    await openForInput(page);
    await page.keyboard.press('h');
    expect((await readC7(page)).legendOpen).toBe(true);
    await page.keyboard.press('Space');
    const s = await readC7(page);
    expect(s.spinIndex).toBe(1);
    expect(s.lastSide).toBe('player');
    expect(s.phase).toBe('spinning');
    expect(s.legendOpen).toBe(false);
    expect(s.layout.boxes).not.toHaveProperty('legend');
    await waitPhase(page, ['foeWait']);
    await page.keyboard.press('h');
    expect((await readC7(page)).legendOpen).toBe(true);
    await waitSpinIndex(page, 2);
    const f = await readC7(page);
    expect(f.phase).toBe('spinning');
    expect(f.legendOpen).toBe(false);
    await waitSettled(page);
    expect((await readState(page)).phase).toBe('idle');
  });

  test('C7.11 bảng chú giải có đủ 8 dòng icon (nội dung soát bằng ảnh)', async ({ page }) => {
    await openForInput(page);
    await page.keyboard.press('h');
    const ids = (await readC7(page)).layout.texts.map((t) => t.id);
    for (let i = 0; i < 8; i += 1) expect(ids, `legend-${i}`).toContain(`legend-${i}`);
    await settleFrames(page);
    await page.screenshot({ path: 'artifacts/slot-five-c7-desktop-legend.png' });
  });
});

test.describe('Slot Five C7: điện thoại 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('C7.5 chữ ≥ 12 px CSS, số máu và chỉ báo lượt ≥ 22 px game; chữ trên nút ≥ 12 px', async ({ page }) => {
    await openForInput(page);
    const all: string[] = [];
    const seen = new Set<string>();
    const take = async (label: string) => {
      const { layout } = await readC7(page);
      layout.texts.forEach((t) => seen.add(t.id));
      all.push(...textProblems(layout, 12).map((p) => `${label}: ${p}`));
      return layout;
    };
    const l0 = await take('đóng');
    console.log(`C7.5: scale ${l0.scale.toFixed(4)}; ${l0.texts.map((t) => `${t.id} ${t.fontPx}`).join(', ')}`);
    expect(l0.scale).toBeCloseTo(Math.min(390 / 540, 844 / 960), 3);
    await page.tap('#sf-help');
    const l1 = await take('mở');
    console.log(`C7.5 mở: ${l1.texts.map((t) => `${t.id} ${t.fontPx}`).join(', ')}`);
    await page.tap('#sf-help-close');
    await page.evaluate((f12) => window.__game!.slotFive!.loadMatch(4242, { player: { maxHp: 450, hp: 70 }, grids: [f12] }), fx('F12'));
    await page.tap('#sf-spin');
    for (let i = 0; i < 40; i += 1) {
      await take(`số nổi ${i}`);
      await page.waitForTimeout(50);
    }
    expect(all).toEqual([]);
    expect(seen.has('float-player') && seen.has('float-foe')).toBe(true);
    // Chữ trên nút DOM (quyết định Producer: kiểm riêng bằng computed style).
    await page.tap('#sf-help');
    const fit = await buttonFit(page);
    for (const [id, f] of Object.entries(fit)) {
      if (!f.visible) continue;
      expect(f.fontPx, `${id} font`).toBeGreaterThanOrEqual(12);
    }
    console.log(`C7.5 nút: ${Object.entries(fit).map(([id, f]) => `${id} ${f.fontPx}px`).join(', ')}`);
  });

  test('C7.7 bốn nút ≥ 44 px CSS và khớp hộp × scale + canvasOffset (±2)', async ({ page }) => {
    await openForInput(page);
    await page.tap('#sf-help');
    expect((await readC7(page)).legendOpen).toBe(true);
    const fit = await buttonFit(page);
    console.log(`C7.7: ${Object.entries(fit).map(([id, f]) => `${id} ${f.rect.map((v) => v.toFixed(1)).join('/')}`).join('; ')}`);
    for (const [id, f] of Object.entries(fit)) {
      expect(f.visible, `${id} hiện`).toBe(true);
      expect(f.rect[2], `${id} rộng`).toBeGreaterThanOrEqual(44);
      expect(f.rect[3], `${id} cao`).toBeGreaterThanOrEqual(44);
      for (let i = 0; i < 4; i += 1) expect(Math.abs(f.rect[i] - f.want[i]), `${id}[${i}]`).toBeLessThanOrEqual(2);
    }
  });

  test('C7.10 chạm ? mở, chạm ✕ đóng, chạm ? hai lần về đóng', async ({ page }) => {
    await openForInput(page);
    await expect(page.locator('#sf-help-close')).toBeHidden();
    await page.tap('#sf-help');
    expect((await readC7(page)).legendOpen).toBe(true);
    await expect(page.locator('#sf-help-close')).toBeVisible();
    await page.tap('#sf-help-close');
    expect((await readC7(page)).legendOpen).toBe(false);
    await expect(page.locator('#sf-help-close')).toBeHidden();
    await page.tap('#sf-help');
    await page.tap('#sf-help');
    expect((await readC7(page)).legendOpen).toBe(false);
    // Chạm ? khi mở rồi chạm quay: lượt nhận, bảng đóng.
    await page.tap('#sf-help');
    await page.tap('#sf-spin');
    const s = await readC7(page);
    expect(s.spinIndex).toBe(1);
    expect(s.legendOpen).toBe(false);
  });

  test('C7.12 nút platformer ẩn; ảnh 390x844: idle, chú giải, đang quay, số nổi, kết thúc', async ({ page }) => {
    await openForInput(page);
    for (const id of ['#btn-left', '#btn-right', '#btn-jump']) await expect(page.locator(id)).toBeHidden();
    for (const id of ['#sf-spin', '#sf-new', '#sf-help']) await expect(page.locator(id)).toBeVisible();
    await settleFrames(page);
    await page.screenshot({ path: 'artifacts/slot-five-c7-390x844-idle.png' });
    await page.tap('#sf-help');
    await settleFrames(page);
    await page.screenshot({ path: 'artifacts/slot-five-c7-390x844-legend.png' });
    await page.tap('#sf-help-close');
    const t = await readTuning(page);
    const foeHp = 2 * t.sfBBlade;
    await page.evaluate(([f12, f0, f1, hp]) => window.__game!.slotFive!.loadMatch(4242, { player: { maxHp: 450, hp: 70 }, foe: { maxHp: 450, hp: hp as number }, grids: [f12 as number[][], f0 as number[][], f1 as number[][]] }), [fx('F12'), fx('F0'), fx('F1'), foeHp] as const);
    await page.tap('#sf-spin');
    await page.waitForFunction(() => window.__game!.getState<SlotFiveState>()!.reelsStopped >= 2, null, { timeout: 10_000, polling: 'raf' });
    await page.screenshot({ path: 'artifacts/slot-five-c7-390x844-spinning.png' });
    await page.waitForFunction(() => (window.__game!.getState() as unknown as C7State).floatTexts.length >= 2, null, { timeout: 10_000, polling: 'raf' });
    await page.screenshot({ path: 'artifacts/slot-five-c7-390x844-floats.png' });
    for (let guard = 0; guard < 20; guard += 1) {
      await waitPhase(page, ['idle', 'ended'], 20_000);
      const s = await readState(page);
      if (s.phase === 'ended') break;
      await page.tap('#sf-spin');
      await waitSpinIndex(page, s.spinIndex + 1);
    }
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'artifacts/slot-five-c7-390x844-ended.png' });
    expect((await readState(page)).phase).toBe('ended');
  });
});

for (const vp of [{ width: 1280, height: 720 }, { width: 844, height: 390 }]) {
  test.describe(`Slot Five C7.8: letterbox ${vp.width}x${vp.height}`, () => {
    test.use({ viewport: vp });
    test(`C7.8 ${vp.width}x${vp.height}: canvas giữa, tỉ lệ 540:960, trong màn; nút khớp hộp`, async ({ page }) => {
      await openForInput(page);
      const c = await page.evaluate(() => {
        const r = document.querySelector('canvas')!.getBoundingClientRect();
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight };
      });
      console.log(`C7.8 ${vp.width}x${vp.height}: canvas ${c.w.toFixed(1)}x${c.h.toFixed(1)} tại ${c.left.toFixed(1)},${c.top.toFixed(1)}`);
      expect(Math.abs(c.left - (c.vw - c.right))).toBeLessThanOrEqual(1);
      expect(Math.abs(c.w * 960 / 540 - c.h)).toBeLessThanOrEqual(1);
      expect(c.left >= 0 && c.top >= 0 && c.right <= c.vw && c.bottom <= c.vh).toBe(true);
      const s = await readC7(page);
      expect(s.layout.scale).toBeCloseTo(Math.min(vp.width / 540, vp.height / 960), 3);
      await page.keyboard.press('h');
      const fit = await buttonFit(page);
      for (const [id, f] of Object.entries(fit)) {
        expect(f.visible, `${id} hiện`).toBe(true);
        for (let i = 0; i < 4; i += 1) expect(Math.abs(f.rect[i] - f.want[i]), `${id}[${i}]`).toBeLessThanOrEqual(2);
      }
      await page.keyboard.press('Escape');
      await settleFrames(page);
      await page.screenshot({ path: `artifacts/slot-five-c7-${vp.width}x${vp.height}-idle.png` });
    });
  });
}

test.describe('Slot Five C7.12: route khác không có nút Slot Five', () => {
  for (const url of ['/', '/?game=arc-relay', '/?game=gatefall']) {
    test(`C7.12 ${url}: #sf-help, #sf-help-close và các #sf-* ẩn`, async ({ page }) => {
      await page.goto(url);
      await page.waitForFunction(() => window.__game?.getState() != null);
      for (const id of ['#sf-spin', '#sf-new', '#sf-help', '#sf-help-close', '#sf-fast']) await expect(page.locator(id)).toBeHidden();
      await page.keyboard.press('h');
      await expect(page.locator('#sf-help-close')).toBeHidden();
    });
  }
});

// ---------------------------------------------------------------- C8: cast chiêu (bản 4, lưới 4x4)

type C8State = SlotFiveState;
const readC8 = (page: Page) => page.evaluate(() => window.__game!.getState() as unknown as C8State);

/** Section 4.9 v4: centre of cell (x, y) and of the fighter boxes, written from the brief. */
const cellCentre = (x: number, y: number): [number, number] => [117 + 102 * x, 124 + 102 * y];
const FIGHTER_CENTRE: Record<'player' | 'foe', [number, number]> = { player: [40 + 32, 636 + 44], foe: [436 + 32, 636 + 44] };
const meanCentre = (cells: [number, number][]): [number, number] => {
  const c = cells.map(([x, y]) => cellCentre(x, y));
  return [c.reduce((a, p) => a + p[0], 0) / c.length, c.reduce((a, p) => a + p[1], 0) / c.length];
};
/** Section 4.10: firing order heal, shield, damage; lucky never fires. Returns chain indexes. */
const castOrderRef = (chains: { kind: string }[]) =>
  (['heal', 'shield', 'damage'] as const).flatMap((k) => chains.map((c, i) => (c.kind === k ? i : -1)).filter((i) => i >= 0));
const resolveMsRef = (chains: { kind: string }[], t: T) => {
  if (chains.length === 0) return t.sfBlankResolveMs;
  const n = chains.filter((c) => c.kind !== 'none').length;
  if (n === 0) return t.sfResolveMs;
  return Math.max(t.sfResolveMs, t.sfCastDelayMs + (n - 1) * t.sfCastStaggerMs + t.sfCastFlightMs + t.sfCastTailMs);
};

/** Loads a match with forced grids, starts the first turn (player by key, foe by itself) and returns the state at spin start. */
const startForcedTurn = async (page: Page, grids: Grid[], setup: RefSetup = {}) => {
  await page.evaluate(([g, st]) => window.__game!.slotFive!.loadMatch(4242, { ...(st as object), grids: g as number[][][] }), [grids, setup] as const);
  if ((setup.turn ?? 'player') === 'player') await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__game!.getState<SlotFiveState>()!.spinIndex === 1, null, { timeout: 10_000 });
  return readC8(page);
};

test.describe('Slot Five C8: cast chiêu', () => {
  test.beforeEach(() => pinBriefTuning());

  test('C8.1, C8.2, C8.5 F12 lượt người chơi: 3 viên heal, shield, damage; đích và điểm đến đúng', async ({ page }) => {
    await openForInput(page);
    const t = await readTuning(page);
    const s = await startForcedTurn(page, [fx('F12')]);
    const order = castOrderRef(s.lastChains);
    console.log(`C8.1: ${JSON.stringify(s.lastCasts.map((c) => [c.chainIndex, c.kind, c.target, c.from, c.to, c.value, c.launchMs, c.impactMs]))}`);
    expect(s.lastCasts.map((c) => c.kind)).toEqual(['heal', 'shield', 'damage']);
    expect(s.lastCasts.map((c) => c.chainIndex)).toEqual(order);
    expect(new Set(s.lastCasts.map((c) => c.chainIndex)).size).toBe(3);
    s.lastCasts.forEach((c) => {
      expect(s.lastChains[c.chainIndex].kind).toBe(c.kind);
      expect(c.value).toBe(s.lastChains[c.chainIndex].value);
    });
    expect(s.lastCasts.map((c) => c.target)).toEqual(['player', 'player', 'foe']);
    for (const c of s.lastCasts) {
      const want = FIGHTER_CENTRE[c.target];
      expect(Math.abs(c.to[0] - want[0]), 'to.x').toBeLessThanOrEqual(1);
      expect(Math.abs(c.to[1] - want[1]), 'to.y').toBeLessThanOrEqual(1);
      const from = meanCentre(s.lastChains[c.chainIndex].cells);
      expect(Math.abs(c.from[0] - from[0]), 'from.x').toBeLessThanOrEqual(1);
      expect(Math.abs(c.from[1] - from[1]), 'from.y').toBeLessThanOrEqual(1);
    }
    expect(s.lastResolveMs).toBe(resolveMsRef(s.lastChains, t));
  });

  test('C8.2 F12 lượt đối thủ: đích đảo ngược (heal, shield về đối thủ; damage về người chơi)', async ({ page }) => {
    await openForInput(page);
    const s = await startForcedTurn(page, [fx('F12')], { turn: 'foe' });
    expect(s.lastSide).toBe('foe');
    expect(s.lastCasts.map((c) => c.kind)).toEqual(['heal', 'shield', 'damage']);
    expect(s.lastCasts.map((c) => c.target)).toEqual(['foe', 'foe', 'player']);
    for (const c of s.lastCasts) {
      const want = FIGHTER_CENTRE[c.target];
      expect(Math.abs(c.to[0] - want[0]) <= 1 && Math.abs(c.to[1] - want[1]) <= 1, `${c.kind} to`).toBe(true);
    }
  });

  test('C8.3 F4 (chỉ May mắn): 1 chuỗi, 0 viên, lastResolveMs = sfResolveMs; F0: 0 viên, sfBlankResolveMs', async ({ page }) => {
    await openForInput(page);
    const t = await readTuning(page);
    const a = await startForcedTurn(page, [fx('F4')]);
    expect(a.lastChains).toHaveLength(1);
    expect(a.lastChains[0].kind).toBe('none');
    expect(a.lastCasts).toHaveLength(0);
    expect(a.lastResolveMs).toBe(t.sfResolveMs);
    const b = await startForcedTurn(page, [fx('F0')]);
    expect(b.lastChains).toHaveLength(0);
    expect(b.lastCasts).toHaveLength(0);
    expect(b.lastResolveMs).toBe(t.sfBlankResolveMs);
  });

  test('C8.4, C8.5 F7: 2 viên khiên cùng đích, from là trung bình tâm ô (117 + 102x, 124 + 102y), to là tâm nhân vật', async ({ page }) => {
    await openForInput(page);
    const s = await startForcedTurn(page, [fx('F7')]);
    expect(s.lastCasts).toHaveLength(2);
    expect(s.lastCasts.map((c) => c.kind)).toEqual(['shield', 'shield']);
    expect(s.lastCasts.map((c) => c.target)).toEqual(['player', 'player']);
    // h: (0,1) (1,1) (2,1) -> (219, 226); v: (1,0) (1,1) (1,2) -> (219, 226). Hai viên trùng điểm xuất phát.
    for (const c of s.lastCasts) {
      const want = meanCentre(s.lastChains[c.chainIndex].cells);
      console.log(`C8.4: chuỗi ${c.chainIndex} ${s.lastChains[c.chainIndex].dir} from ${c.from.join(',')} (mong đợi ${want.join(',')}), to ${c.to.join(',')}`);
      expect(Math.abs(c.from[0] - want[0])).toBeLessThanOrEqual(1);
      expect(Math.abs(c.from[1] - want[1])).toBeLessThanOrEqual(1);
      expect(Math.abs(c.to[0] - FIGHTER_CENTRE.player[0])).toBeLessThanOrEqual(1);
      expect(Math.abs(c.to[1] - FIGHTER_CENTRE.player[1])).toBeLessThanOrEqual(1);
    }
  });

  for (const id of ['F12', 'F7', 'F1', 'F11'] as const) {
    test(`C8.6 lịch bắn ${id}: launchMs, impactMs theo công thức; thời điểm đo lệch ≤ 40 ms; resolving thật trong lastResolveMs ± 60`, async ({ page }) => {
      await openForInput(page);
      const t = await readTuning(page);
      await startSampler(page);
      const s0 = await startForcedTurn(page, [fx(id)]);
      await page.waitForFunction(() => {
        const s = window.__game!.getState<SlotFiveState>()!;
        return s.phase === 'foeWait' || s.phase === 'ended' || s.spinIndex > 1;
      }, null, { timeout: 15_000 });
      const s = await readC8(page);
      const samples = await stopSampler(page);
      expect(s.lastResolveMs).toBe(resolveMsRef(s0.lastChains, t));
      s.lastCasts.forEach((c, k) => {
        const launch = t.sfCastDelayMs + k * t.sfCastStaggerMs;
        expect(c.launchMs, `viên ${k} launchMs`).toBe(launch);
        expect(c.impactMs, `viên ${k} impactMs`).toBe(launch + t.sfCastFlightMs);
        expect(c.launchedAtMs, `viên ${k} đã bắn`).not.toBeNull();
        expect(c.impactedAtMs, `viên ${k} đã trúng`).not.toBeNull();
        expect(Math.abs(c.launchedAtMs! - c.launchMs), `viên ${k} launchedAtMs ${c.launchedAtMs}`).toBeLessThanOrEqual(40);
        expect(Math.abs(c.impactedAtMs! - c.impactMs), `viên ${k} impactedAtMs ${c.impactedAtMs}`).toBeLessThanOrEqual(40);
      });
      const enter = samples.find((x) => x.spinIndex === 1 && x.phase === 'resolving');
      const leave = samples.find((x) => x.spinIndex === 1 && enter && x.t > enter.t && x.phase !== 'resolving');
      const real = enter && leave ? leave.t - enter.t : NaN;
      console.log(`C8.6 ${id}: lastResolveMs ${s.lastResolveMs}, resolving thật ${real.toFixed(1)} ms; ${JSON.stringify(s.lastCasts.map((c) => [c.launchMs, c.launchedAtMs, c.impactMs, c.impactedAtMs]))}`);
      expect(Math.abs(real - s.lastResolveMs)).toBeLessThanOrEqual(60);
    });
  }

  test('C8.7 F12, người chơi 80 máu, khiên đối thủ 0: hiển thị chỉ đổi khi từng viên trúng, đúng phần của viên đó', async ({ page }) => {
    await openForInput(page);
    const t = await readTuning(page);
    await startSampler(page);
    await startForcedTurn(page, [fx('F12')], { player: { hp: 80 }, foe: { shield: 0 } });
    await waitPhase(page, ['foeWait', 'ended']);
    const samples = (await stopSampler(page)).filter((x) => x.spinIndex === 1 && (x.phase === 'spinning' || x.phase === 'resolving'));
    const maxFoe = t.sfFoeMaxHp;
    // Giá trị hiển thị mong đợi sau k viên trúng (thứ tự heal 20, shield 20, damage 5).
    const want = [
      { dPlayer: 80, dsPlayer: 0, dFoe: maxFoe, dsFoe: 0 },
      { dPlayer: 80 + t.sfBHeal, dsPlayer: 0, dFoe: maxFoe, dsFoe: 0 },
      { dPlayer: 80 + t.sfBHeal, dsPlayer: t.sfBShield, dFoe: maxFoe, dsFoe: 0 },
      { dPlayer: 80 + t.sfBHeal, dsPlayer: t.sfBShield, dFoe: maxFoe - t.sfBBlade, dsFoe: 0 },
    ];
    const bad: string[] = [];
    const seen = new Set<number>();
    for (const x of samples) {
      const k = x.phase === 'spinning' ? 0 : x.impacted;
      seen.add(k);
      const got = { dPlayer: x.dPlayer, dsPlayer: x.dsPlayer, dFoe: x.dFoe, dsFoe: x.dsFoe };
      if (JSON.stringify(got) !== JSON.stringify(want[k])) bad.push(`${x.phase} sau ${k} viên: ${JSON.stringify(got)}`);
    }
    const last = samples[samples.length - 1];
    console.log(`C8.7: ${samples.length} mẫu, các mốc trúng đã thấy ${[...seen].sort().join(',')}`);
    expect(bad.slice(0, 5)).toEqual([]);
    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
    expect({ hp: last.player, sh: last.shPlayer, foe: last.foe, shFoe: last.shFoe }).toEqual({ hp: 80 + t.sfBHeal, sh: t.sfBShield, foe: maxFoe - t.sfBBlade, shFoe: 0 });
  });

  test('C8.7 biên: khiên cũ của bên quay về 0 trên màn ngay khi lượt quay bắt đầu', async ({ page }) => {
    await openForInput(page);
    await page.evaluate((g) => window.__game!.slotFive!.loadMatch(4242, { player: { shield: 7 }, grids: [g] }), fx('F0'));
    expect((await readC8(page) as unknown as { displayShield: { player: number } }).displayShield.player).toBe(7);
    const s = await page.evaluate(() => {
      window.__game!.slotFive!.spin();
      return window.__game!.getState() as unknown as { phase: string; displayShield: { player: number }; player: { shield: number } };
    });
    expect(s.phase).toBe('spinning');
    expect(s.displayShield.player).toBe(0);
    expect(s.player.shield).toBe(0);
  });

  test('C8.8 khiên đối thủ 20, người chơi quay F11 (Điện 15, Đất 20): khiên hấp thụ theo từng viên', async ({ page }) => {
    await openForInput(page);
    const t = await readTuning(page);
    await startSampler(page);
    await startForcedTurn(page, [fx('F11')], { foe: { shield: 20 } });
    await waitPhase(page, ['foeWait', 'ended']);
    const samples = (await stopSampler(page)).filter((x) => x.spinIndex === 1 && x.phase === 'resolving');
    const maxFoe = t.sfFoeMaxHp;
    const want = [
      { dFoe: maxFoe, dsFoe: 20 },
      { dFoe: maxFoe, dsFoe: 5 },
      { dFoe: maxFoe - 15, dsFoe: 0 },
    ];
    const bad: string[] = [];
    for (const x of samples) {
      const got = { dFoe: x.dFoe, dsFoe: x.dsFoe };
      if (JSON.stringify(got) !== JSON.stringify(want[x.impacted])) bad.push(`sau ${x.impacted} viên: ${JSON.stringify(got)}`);
    }
    expect(bad.slice(0, 5)).toEqual([]);
    expect(new Set(samples.map((x) => x.impacted))).toEqual(new Set([0, 1, 2]));
    const end = await readC8(page);
    expect(end.foe.hp).toBe(maxFoe - 15);
    expect(end.foe.shield).toBe(0);
    expect(end.displayHp.foe).toBe(end.foe.hp);
  });
});

/** C8.10: screenshots for the user, 390x844 portrait. */
test.describe('Slot Five C8.10: ảnh 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('C8.10 ảnh: đang quay, F12 đang cast, số nổi, chú giải, kết thúc', async ({ page }) => {
    await openForInput(page);
    const t = await readTuning(page);
    const foeHp = 2 * t.sfBBlade;
    await page.tap('#sf-help');
    await settleFrames(page);
    await page.screenshot({ path: 'artifacts/slot-five-c8-390x844-legend.png' });
    await page.tap('#sf-help-close');
    await page.evaluate(([f12, f0, f1, hp]) => window.__game!.slotFive!.loadMatch(4242, { player: { maxHp: 450, hp: 70 }, foe: { maxHp: 450, hp: hp as number }, grids: [f12 as number[][], f0 as number[][], f1 as number[][]] }), [fx('F12'), fx('F0'), fx('F1'), foeHp] as const);
    await page.tap('#sf-spin');
    await page.waitForFunction(() => window.__game!.getState<SlotFiveState>()!.reelsStopped >= 2, null, { timeout: 10_000, polling: 'raf' });
    await page.screenshot({ path: 'artifacts/slot-five-c8-390x844-spinning.png' });
    await page.waitForFunction(() => (window.__game!.getState() as unknown as C8State).castsInFlight >= 1, null, { timeout: 10_000, polling: 'raf' });
    await page.screenshot({ path: 'artifacts/slot-five-c8-390x844-casting.png' });
    await page.waitForFunction(() => (window.__game!.getState() as unknown as { floatTexts: unknown[] }).floatTexts.length >= 2, null, { timeout: 10_000, polling: 'raf' });
    await page.screenshot({ path: 'artifacts/slot-five-c8-390x844-floats.png' });
    for (let guard = 0; guard < 20; guard += 1) {
      await waitPhase(page, ['idle', 'ended'], 20_000);
      const s = await readState(page);
      if (s.phase === 'ended') break;
      await page.tap('#sf-spin');
      await waitSpinIndex(page, s.spinIndex + 1);
    }
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'artifacts/slot-five-c8-390x844-ended.png' });
    expect((await readState(page)).phase).toBe('ended');
  });
});

test.describe('Slot Five C8.10: letterbox 1280x720', () => {
  test.use({ viewport: { width: 1280, height: 720 } });
  test('C8.10 ảnh letterbox 1280x720 trên lưới 4x4', async ({ page }) => {
    await openForInput(page);
    await settleFrames(page);
    await page.screenshot({ path: 'artifacts/slot-five-c8-1280x720-idle.png' });
    expect((await readState(page)).cols).toBe(4);
  });
});

// ---------------------------------------------------------------- C9: chuyển sang lưới 4x4

test.describe('Slot Five C9: lưới 4x4', () => {
  test('C9.1 cols là hằng 4; mỗi lượt createSim rút đúng 16 số', async ({ page }) => {
    await openSlotFive(page);
    const out = await page.evaluate(async () => {
      const mod = (await import('/src/game/slotFiveLogic.ts' as string)) as { SF_COLS: number; SF_ROWS: number };
      const qa = window.__qaSf!;
      const w = qa.weights();
      const bad: string[] = [];
      for (let seed = 1; seed <= 200; seed += 1) {
        const sim = window.__game!.slotFive!.createSim(seed);
        sim.spin();
        const second = sim.spin().grid;
        // Trạng thái sau một lượt phải bằng trạng thái sau đúng 16 lần next() từ cùng hạt.
        const r = qa.rng(qa.streamSeed(seed, 1));
        for (let i = 0; i < 16; i += 1) r.next();
        const want = qa.draw(r, w);
        if (!qa.same(second, want)) bad.push(`seed ${seed}`);
      }
      return { cols: mod.SF_COLS, rows: mod.SF_ROWS, bad };
    });
    expect(out.cols).toBe(4);
    expect(out.rows).toBe(4);
    expect(out.bad).toEqual([]);
    const s = await readState(page);
    expect([s.cols, s.rows]).toEqual([4, 4]);
  });

  test('C9.2 TUNING_RANGES đúng bảng 5.1, 5.2, 5.3; không còn sfLen5Mult; mọi giá trị TUNING nằm trong khoảng tune', async ({ page }) => {
    // Không so giá trị TUNING cụ thể: Balance Tuner được đổi chúng ở C10. Giá trị đầu so qua BRIEF_TUNING ở C9.3.
    await openSlotFive(page);
    const cfg = await page.evaluate(async () => {
      const mod = (await import('/src/config.ts' as string)) as { TUNING: Record<string, number>; TUNING_RANGES: Record<string, number[]> };
      return { tuning: { ...mod.TUNING }, ranges: { ...mod.TUNING_RANGES } };
    });
    expect(cfg.tuning).not.toHaveProperty('sfLen5Mult');
    expect(cfg.ranges).not.toHaveProperty('sfLen5Mult');
    const table: Record<string, [number, number, number]> = {
      sfWFire: [1, 60, 1], sfWVolt: [1, 60, 1], sfWFrost: [1, 60, 1], sfWEarth: [1, 60, 1],
      sfWBlade: [1, 60, 1], sfWHeal: [1, 60, 1], sfWShield: [1, 60, 1], sfWLucky: [1, 60, 1],
      sfBFire: [1, 120, 1], sfBVolt: [1, 120, 1], sfBFrost: [1, 120, 1], sfBEarth: [1, 120, 1],
      sfBBlade: [1, 120, 1], sfBHeal: [1, 120, 1], sfBShield: [1, 120, 1],
      sfLen4Mult: [1, 6, 1],
      sfPlayerMaxHp: [40, 2000, 10], sfFoeMaxHp: [40, 2000, 10], sfSeed: [1, 999, 1],
      sfSpinBaseMs: [300, 1500, 50], sfReelStopGapMs: [80, 400, 10], sfStopBounceMs: [0, 250, 10], sfReelSpeed: [1, 5, 0.1],
      sfResolveMs: [300, 2000, 100], sfBlankResolveMs: [0, 800, 50], sfFoeDelayMs: [0, 1500, 50],
      sfCastDelayMs: [0, 400, 10], sfCastStaggerMs: [0, 300, 10], sfCastFlightMs: [150, 800, 10], sfCastTailMs: [0, 600, 10],
      sfFastFactor: [0.1, 1, 0.05],
    };
    const sfKeys = Object.keys(cfg.tuning).filter((k) => k.startsWith('sf')).sort();
    expect(sfKeys, 'bảng phủ đủ khóa sf* của TUNING').toEqual(Object.keys(table).sort());
    const bad: string[] = [];
    for (const [k, r] of Object.entries(table)) {
      if (JSON.stringify(cfg.ranges[k]) !== JSON.stringify(r)) bad.push(`${k} khoảng ${JSON.stringify(cfg.ranges[k])}, bảng ${JSON.stringify(r)}`);
      const v = cfg.tuning[k];
      const [min, max, step] = r;
      const steps = (v - min) / step;
      if (!(v >= min && v <= max) || Math.abs(steps - Math.round(steps)) > 1e-9) bad.push(`${k} = ${v} ngoài khoảng ${JSON.stringify(r)}`);
    }
    console.log(`C9.2: ${sfKeys.length} khóa sf*, TUNING hiện tại ${JSON.stringify(Object.fromEntries(sfKeys.map((k) => [k, cfg.tuning[k]])))}`);
    expect(bad).toEqual([]);
  });

  test('C9.3 BRIEF_TUNING của test bằng bảng 5.1, 5.2 (5.3) bản 4 và phủ đủ khóa sf* của game', async ({ page }) => {
    await openSlotFive(page);
    const keys = await page.evaluate(() => Object.keys(window.__game!.tuning).filter((k) => k.startsWith('sf')).sort());
    expect(BRIEF_TUNING).not.toHaveProperty('sfLen5Mult');
    expect(Object.keys(BRIEF_TUNING).sort()).toEqual(keys);
    expect(BRIEF_TUNING).toMatchObject({
      sfWFire: 8, sfWVolt: 6, sfWFrost: 6, sfWEarth: 8, sfWBlade: 40, sfWHeal: 13, sfWShield: 13, sfWLucky: 6,
      sfBFire: 10, sfBVolt: 15, sfBFrost: 15, sfBEarth: 10, sfBBlade: 5, sfBHeal: 20, sfBShield: 20,
      sfLen4Mult: 2, sfPlayerMaxHp: 450, sfFoeMaxHp: 450,
    });
  });

  test('C9.4 forceNextGrid, createBattle và loadMatch ném lỗi khi lưới không phải 4x4', async ({ page }) => {
    await openSlotFive(page);
    const out = await page.evaluate(() => {
      const api = window.__game!.slotFive!;
      const g = (rows: number, cols: number) => Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
      const shapes: [number, number][] = [[4, 5], [5, 4], [3, 4], [4, 3], [5, 5]];
      const throws = (fn: () => void) => {
        try {
          fn();
          return false;
        } catch {
          return true;
        }
      };
      const before = window.__game!.getState<SlotFiveState>()!;
      const res = shapes.map(([r, c]) => ({
        shape: `${r}x${c}`,
        force: throws(() => api.forceNextGrid(g(r, c))),
        battle: throws(() => api.createBattle(1, { grids: [g(r, c)] })),
        load: throws(() => api.loadMatch(1, { grids: [g(r, c)] })),
      }));
      const ok4 = !throws(() => api.createBattle(1, { grids: [g(4, 4)] }));
      return { res, ok4, unchanged: JSON.stringify(before) === JSON.stringify(window.__game!.getState()) };
    });
    console.log(`C9.4: ${JSON.stringify(out.res)}`);
    for (const r of out.res) expect(r, r.shape).toEqual({ shape: r.shape, force: true, battle: true, load: true });
    expect(out.ok4).toBe(true);
    expect(out.unchanged).toBe(true);
  });

  test('C9.6 ép F0 đến F12 qua scene: highlightedCells bằng số ô khác nhau trong lastChains', async ({ page }) => {
    test.setTimeout(120_000);
    pinBriefTuning();
    await openForInput(page);
    await setTuning(page, { ...FAST_TIMING, sfFoeDelayMs: 1500 });
    const rows: string[] = [];
    for (const f of FIXTURES) {
      await page.evaluate((g) => window.__game!.slotFive!.loadMatch(4242, { grids: [g] }), f.grid);
      await page.keyboard.press('Space');
      await page.waitForFunction(() => window.__game!.getState<SlotFiveState>()!.reelsStopped === 4, null, { timeout: 10_000, polling: 'raf' });
      const s = await readState(page);
      const distinct = new Set(s.lastChains.flatMap((c) => c.cells.map(([x, y]) => `${x},${y}`))).size;
      rows.push(`${f.id}: ${s.highlightedCells}/${distinct}`);
      expect(s.grid, f.id).toEqual(f.grid);
      expect(s.highlightedCells, f.id).toBe(distinct);
      expect(s.highlightedChainCount, f.id).toBe(s.lastChains.length);
      if (f.id === 'F12') {
        await page.screenshot({ path: 'artifacts/slot-five-c9-960x540-f12.png' });
      }
    }
    console.log(`C9.6: ${rows.join('; ')}`);
  });
});

// ---------------------------------------------------------------- C10: nghiệm thu số liệu (TUNING thật)

test.describe('Slot Five C10: chỉ tiêu trên tập nghiệm thu 9001 đến 11000 (TUNING thật)', () => {
  let report: SfReport;
  let ms = 0;
  let analytic: RefEffects;
  let tuning: T;

  test.beforeEach(async ({ page }) => {
    await openSlotFive(page);
    tuning = await readTuning(page);
    const out = await simulate(page, ACCEPT_SEEDS);
    report = out.report;
    ms = out.ms;
    analytic = await page.evaluate(() => window.__game!.slotFive!.analyticEffects());
  });

  test('C10.1 meanDamage khớp analyticEffects trong 3 sai số chuẩn', async () => {
    const diff = Math.abs(report.meanDamage - analytic.damage);
    console.log(`C10.1: meanDamage ${report.meanDamage.toFixed(4)}, analytic ${analytic.damage.toFixed(4)}, lệch ${diff.toFixed(4)}, 3*SE ${(3 * report.meanDamageStdErr).toFixed(4)}`);
    expect(diff).toBeLessThanOrEqual(3 * report.meanDamageStdErr);
  });

  test('C10.2 estMatchMsMedian trong [300000, 420000], P90 <= 540000', async () => {
    console.log(`C10.2: trung vị ${report.estMatchMsMedian} ms, P90 ${report.estMatchMsP90} ms`);
    expect(report.estMatchMsMedian).toBeGreaterThanOrEqual(300_000);
    expect(report.estMatchMsMedian).toBeLessThanOrEqual(420_000);
    expect(report.estMatchMsP90).toBeLessThanOrEqual(540_000);
  });

  test('C10.3 turnsMedian trong [110, 160], turnsP90 <= 225', async () => {
    console.log(`C10.3: trung vị ${report.turnsMedian}, P90 ${report.turnsP90}, meanTurnMs ${report.meanTurnMs.toFixed(1)} (lệch 2,7 s ${(((report.meanTurnMs - 2700) / 2700) * 100).toFixed(1)}%)`);
    expect(report.turnsMedian).toBeGreaterThanOrEqual(110);
    expect(report.turnsMedian).toBeLessThanOrEqual(160);
    expect(report.turnsP90).toBeLessThanOrEqual(225);
  });

  test('C10.4 attackTurnRate >= 0.60', async () => {
    console.log(`C10.4: attackTurnRate ${report.attackTurnRate}`);
    expect(report.attackTurnRate).toBeGreaterThanOrEqual(0.6);
  });

  test('C10.5 playerWinRate trong [0.50, 0.60] (người dùng chấp nhận đối thủ ít máu hơn)', async () => {
    console.log(`C10.5: playerWinRate ${report.playerWinRate}; máu người chơi ${tuning.sfPlayerMaxHp}, đối thủ ${tuning.sfFoeMaxHp}`);
    expect(report.playerWinRate).toBeGreaterThanOrEqual(0.5);
    expect(report.playerWinRate).toBeLessThanOrEqual(0.6);
  });

  test('C10.6 comebackRate trong [0.15, 0.40]', async () => {
    console.log(`C10.6: comebackRate ${report.comebackRate} (player ${report.comebackRateByWinner.player}, foe ${report.comebackRateByWinner.foe})`);
    expect(report.comebackRate).toBeGreaterThanOrEqual(0.15);
    expect(report.comebackRate).toBeLessThanOrEqual(0.4);
  });

  test('C10.7 unfinished 0 với trần 2000 lượt, chạy hai lần ra MatchReport giống hệt', async ({ page }) => {
    expect(report.matches).toBe(2000);
    expect(report.unfinished).toBe(0);
    expect((await simulate(page, ACCEPT_SEEDS)).report).toEqual(report);
  });

  test('C10.8 2000 trận chạy dưới 15 giây', async ({ page }) => {
    const second = (await simulate(page, ACCEPT_SEEDS)).ms;
    console.log(`C10.8: lần 1 ${ms.toFixed(0)} ms, lần 2 ${second.toFixed(0)} ms`);
    expect(ms).toBeLessThan(15_000);
    expect(second).toBeLessThan(15_000);
  });

  test('C10.9 và C11.12 ghi số (không xét đạt)', async ({ page }) => {
    const foeFirst = (await simulate(page, ACCEPT_SEEDS, { turn: 'foe' })).report;
    const sfKeys = Object.keys(tuning).filter((k) => k.startsWith('sf')).sort();
    console.log(`C10.9 nghiệm thu: ${fmt(report)}`);
    console.log(`C10.9 đối thủ đi trước: playerWinRate ${foeFirst.playerWinRate}`);
    console.log(`C10.9 TUNING: ${JSON.stringify(Object.fromEntries(sfKeys.map((k) => [k, tuning[k]])))}`);
    console.log(`C11.12: sfFastFactor ${tuning.sfFastFactor}; thường trung vị ${report.estMatchMsMedian} P90 ${report.estMatchMsP90}; nhanh trung vị ${report.estMatchMsMedianFast} P90 ${report.estMatchMsP90Fast}`);
    expect(foeFirst.unfinished).toBe(0);
    expect(report.estMatchMsMedianFast).toBeLessThanOrEqual(report.estMatchMsMedian);
  });
});

// ---------------------------------------------------------------- C11: quay nhanh

interface C11State extends SlotFiveState { fastMode: boolean; lastTimeScale: number; lastFoeDelayMs: number }
const readC11 = (page: Page) => page.evaluate(() => window.__game!.getState() as unknown as C11State);
/** eff(k) of section 4.11, the exact JS expression. */
const effOf = (t: T, key: string, scale: number) => Math.round(t[key] * scale);
const resolveEff = (chains: { kind: string }[], t: T, sc: number) => {
  if (chains.length === 0) return effOf(t, 'sfBlankResolveMs', sc);
  const n = chains.filter((c) => c.kind !== 'none').length;
  if (n === 0) return effOf(t, 'sfResolveMs', sc);
  return Math.max(effOf(t, 'sfResolveMs', sc), effOf(t, 'sfCastDelayMs', sc) + (n - 1) * effOf(t, 'sfCastStaggerMs', sc) + effOf(t, 'sfCastFlightMs', sc) + effOf(t, 'sfCastTailMs', sc));
};
const checkStops = (stops: number[], t: T, sc: number) => {
  const bad: string[] = [];
  const base = effOf(t, 'sfSpinBaseMs', sc);
  const gap = effOf(t, 'sfReelStopGapMs', sc);
  if (stops.length !== 4) bad.push(`${stops.length} phần tử`);
  if (stops[0] < base - 30 || stops[0] > base + 60) bad.push(`cột 0 ở ${stops[0]}, mốc ${base}`);
  for (let i = 1; i < stops.length; i += 1) {
    if (!(stops[i] > stops[i - 1])) bad.push('không tăng dần');
    if (Math.abs(stops[i] - stops[i - 1] - gap) > 40) bad.push(`khoảng ${i - 1}-${i} = ${stops[i] - stops[i - 1]}, mốc ${gap}`);
  }
  return bad;
};

/** Plays a scene match to the end with Space, recording the logic result of every spin (both sides). */
const playAndLog = async (page: Page) => {
  const log: string[] = [];
  for (let guard = 0; guard < 2000; guard += 1) {
    const s = await readState(page);
    if (s.status !== 'playing') break;
    if (s.phase === 'spinning' || s.phase === 'resolving') {
      // Lượt đã ghi đang diễn hoạt: chờ xong rồi xét lượt kế.
      await waitPhase(page, ['idle', 'foeWait', 'ended'], 20_000);
      continue;
    }
    if (s.phase === 'idle') await page.keyboard.press('Space');
    await page.waitForFunction((k) => {
      const st = window.__game!.getState<SlotFiveState>()!;
      return st.spinIndex > k || st.phase === 'ended';
    }, s.spinIndex, { timeout: 20_000 });
    const a = await readState(page);
    if (a.spinIndex > s.spinIndex) log.push(JSON.stringify([a.spinIndex, a.lastSide, a.grid, a.lastChains, a.lastEffects, a.player, a.foe]));
  }
  await waitPhase(page, ['ended'], 20_000);
  const end = await readState(page);
  return { log, status: end.status, spinIndex: end.spinIndex };
};

test.describe('Slot Five C11: quay nhanh', () => {
  test('C11.1 phím F bật, tắt; giữ F 800 ms chỉ đổi một lần; không tính là lệnh quay', async ({ page }) => {
    await openForInput(page);
    const s0 = await readC11(page);
    expect(s0.fastMode).toBe(false);
    expect(s0.lastTimeScale).toBe(1);
    expect(s0.lastFoeDelayMs).toBe(0);
    await page.keyboard.press('f');
    expect((await readC11(page)).fastMode).toBe(true);
    await page.keyboard.press('f');
    expect((await readC11(page)).fastMode).toBe(false);
    await page.keyboard.down('f');
    const start = Date.now();
    while (Date.now() - start < 800) {
      await page.waitForTimeout(33);
      await page.keyboard.down('f');
    }
    await page.keyboard.up('f');
    const s = await readC11(page);
    expect(s.fastMode).toBe(true);
    expect(s.rejectedSpins).toBe(0);
    expect(s.spinIndex).toBe(0);
    await expect(page.locator('#sf-fast')).toHaveAttribute('aria-pressed', 'true');
  });

  test('C11.3 Nhanh giữ qua R, Enter sau khi kết thúc, click #sf-new, loadMatch; tải lại trang thì về tắt', async ({ page }) => {
    await openForInput(page);
    await page.keyboard.press('f');
    const m0 = (await readC11(page)).matchIndex;
    await page.keyboard.press('r');
    await page.waitForFunction((m) => window.__game!.getState<SlotFiveState>()!.matchIndex === m + 1, m0);
    expect((await readC11(page)).fastMode).toBe(true);
    await loadOneHitMatch(page);
    await page.keyboard.press('Space');
    await waitPhase(page, ['ended']);
    const m1 = (await readC11(page)).matchIndex;
    await page.keyboard.press('Enter');
    await page.waitForFunction((m) => window.__game!.getState<SlotFiveState>()!.matchIndex === m + 1, m1);
    expect((await readC11(page)).fastMode).toBe(true);
    await page.click('#sf-new');
    await page.waitForFunction((m) => window.__game!.getState<SlotFiveState>()!.matchIndex === m + 2, m1);
    expect((await readC11(page)).fastMode).toBe(true);
    await page.evaluate(() => window.__game!.slotFive!.loadMatch(99));
    expect((await readC11(page)).fastMode).toBe(true);
    await page.reload();
    await page.waitForFunction(() => window.__game?.getState<SlotFiveState>()?.gameId === 'slot-five');
    expect((await readC11(page)).fastMode).toBe(false);
  });

  test('C11.4 bật Nhanh rồi quay: lastTimeScale, lastSpinMs và lịch dừng cột theo eff(...)', async ({ page }) => {
    await openForInput(page);
    const t = await readTuning(page);
    const f = t.sfFastFactor;
    await page.keyboard.press('f');
    await page.keyboard.press('Space');
    await waitPhase(page, ['foeWait', 'ended']);
    const s = await readC11(page);
    console.log(`C11.4: sfFastFactor ${f}, lastSpinMs ${s.lastSpinMs}, lastReelStopMs ${JSON.stringify(s.lastReelStopMs.map((v) => Math.round(v)))}, eff(base) ${effOf(t, 'sfSpinBaseMs', f)}, eff(gap) ${effOf(t, 'sfReelStopGapMs', f)}`);
    expect(s.lastSide).toBe('player');
    expect(s.lastTimeScale).toBe(f);
    expect(s.lastSpinMs).toBe(effOf(t, 'sfSpinBaseMs', f) + 3 * effOf(t, 'sfReelStopGapMs', f));
    expect(checkStops(s.lastReelStopMs, t, f)).toEqual([]);
  });

  test('C11.5 bật Nhanh, ép F12: lastResolveMs, lịch cast co theo eff, resolving thật ± 60, thanh máu đổi khi trúng; F0 dùng eff(blank)', async ({ page }) => {
    await openForInput(page);
    const t = await readTuning(page);
    const f = t.sfFastFactor;
    await page.keyboard.press('f');
    await startSampler(page);
    await page.evaluate((g) => window.__game!.slotFive!.loadMatch(4242, { player: { hp: 80 }, foe: { shield: 0 }, grids: [g] }), fx('F12'));
    await page.keyboard.press('Space');
    await waitPhase(page, ['foeWait', 'ended']);
    const samples = await stopSampler(page);
    const s = await readC8(page);
    expect(s.lastResolveMs).toBe(resolveEff(s.lastChains, t, f));
    expect(s.lastCasts.map((c) => c.kind)).toEqual(['heal', 'shield', 'damage']);
    s.lastCasts.forEach((c, k) => {
      const launch = effOf(t, 'sfCastDelayMs', f) + k * effOf(t, 'sfCastStaggerMs', f);
      expect(c.launchMs, `viên ${k}`).toBe(launch);
      expect(c.impactMs, `viên ${k}`).toBe(launch + effOf(t, 'sfCastFlightMs', f));
      expect(Math.abs(c.launchedAtMs! - c.launchMs), `viên ${k} bắn ${c.launchedAtMs}`).toBeLessThanOrEqual(40);
      expect(Math.abs(c.impactedAtMs! - c.impactMs), `viên ${k} trúng ${c.impactedAtMs}`).toBeLessThanOrEqual(40);
    });
    const turn = samples.filter((x) => x.spinIndex === 1);
    const enter = turn.find((x) => x.phase === 'resolving')!;
    const leave = turn.find((x) => x.t > enter.t && x.phase !== 'resolving')!;
    const real = leave.t - enter.t;
    console.log(`C11.5: lastResolveMs ${s.lastResolveMs}, resolving thật ${real.toFixed(1)} ms; lịch ${JSON.stringify(s.lastCasts.map((c) => [c.launchMs, c.launchedAtMs, c.impactMs, c.impactedAtMs]))}`);
    expect(Math.abs(real - s.lastResolveMs)).toBeLessThanOrEqual(60);
    const maxFoe = t.sfFoeMaxHp;
    const healed = Math.min(t.sfBHeal, t.sfPlayerMaxHp - 80);
    const want = [
      { dPlayer: 80, dsPlayer: 0, dFoe: maxFoe, dsFoe: 0 },
      { dPlayer: 80 + healed, dsPlayer: 0, dFoe: maxFoe, dsFoe: 0 },
      { dPlayer: 80 + healed, dsPlayer: t.sfBShield, dFoe: maxFoe, dsFoe: 0 },
      { dPlayer: 80 + healed, dsPlayer: t.sfBShield, dFoe: maxFoe - t.sfBBlade, dsFoe: 0 },
    ];
    const bad = turn.filter((x) => x.phase === 'spinning' || x.phase === 'resolving').flatMap((x) => {
      const k = x.phase === 'spinning' ? 0 : x.impacted;
      const got = { dPlayer: x.dPlayer, dsPlayer: x.dsPlayer, dFoe: x.dFoe, dsFoe: x.dsFoe };
      return JSON.stringify(got) === JSON.stringify(want[k]) ? [] : [`sau ${k} viên: ${JSON.stringify(got)}`];
    });
    expect(bad.slice(0, 5)).toEqual([]);
    // F0: lastResolveMs = eff(sfBlankResolveMs).
    await page.evaluate((g) => window.__game!.slotFive!.loadMatch(4243, { grids: [g] }), fx('F0'));
    await page.keyboard.press('Space');
    const b = await readC8(page);
    expect(b.lastChains).toHaveLength(0);
    expect(b.lastResolveMs).toBe(effOf(t, 'sfBlankResolveMs', f));
  });

  test('C11.6 bật Nhanh: lastFoeDelayMs = eff(sfFoeDelayMs), chờ đối thủ thật trong ± 60', async ({ page }) => {
    await openForInput(page);
    const t = await readTuning(page);
    const f = t.sfFastFactor;
    await page.keyboard.press('f');
    await startSampler(page);
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__game!.getState<SlotFiveState>()!.spinIndex >= 2, null, { timeout: 15_000 });
    const samples = await stopSampler(page);
    const s = await readC11(page);
    const waitStart = samples.find((x) => x.spinIndex === 1 && x.phase === 'foeWait')!;
    const foeStart = samples.find((x) => x.spinIndex === 2)!;
    const real = foeStart.t - waitStart.t;
    console.log(`C11.6: lastFoeDelayMs ${s.lastFoeDelayMs}, eff ${effOf(t, 'sfFoeDelayMs', f)}, đo ${real.toFixed(1)} ms`);
    expect(s.lastFoeDelayMs).toBe(effOf(t, 'sfFoeDelayMs', f));
    expect(Math.abs(real - effOf(t, 'sfFoeDelayMs', f))).toBeLessThanOrEqual(60);
  });

  test('C11.7 kết quả không đổi: cùng seed chơi thường rồi chơi nhanh, mọi lượt giống nhau (3 seed, máu 40)', async ({ page }) => {
    test.setTimeout(400_000);
    await openForInput(page);
    const t = await readTuning(page);
    const LOW = { player: { maxHp: 40 }, foe: { maxHp: 40 } };
    for (const seed of [t.sfSeed, 31, 4321]) {
      await page.evaluate((on) => window.__game!.slotFive!.setFastMode(on), false);
      await page.evaluate(([s, low]) => window.__game!.slotFive!.loadMatch(s, low), [seed, LOW] as const);
      const normal = await playAndLog(page);
      await page.keyboard.press('f');
      expect((await readC11(page)).fastMode).toBe(true);
      await page.evaluate(([s, low]) => window.__game!.slotFive!.loadMatch(s, low), [seed, LOW] as const);
      const fast = await playAndLog(page);
      console.log(`C11.7 seed ${seed}: thường ${normal.status} sau ${normal.spinIndex} lượt (${normal.log.length} bản ghi), nhanh ${fast.status} sau ${fast.spinIndex} lượt (${fast.log.length} bản ghi)`);
      expect(fast.log).toEqual(normal.log);
      expect(normal.log).toHaveLength(normal.spinIndex);
      expect([fast.status, fast.spinIndex]).toEqual([normal.status, normal.spinIndex]);
    }
  });

  test('C11.8 đổi giữa lượt áp từ lượt sau (người chơi rồi đối thủ)', async ({ page }) => {
    await openForInput(page);
    // foeWait nhanh chỉ còn eff(500) = 175 ms; kéo dài sfFoeDelayMs để kịp bấm F trong foeWait. Khôi phục ở cuối.
    const old = await setTuning(page, { sfFoeDelayMs: 1500 });
    await page.evaluate(() => window.__game!.slotFive!.loadMatch(window.__game!.tuning.sfSeed));
    const t = await readTuning(page);
    const f = t.sfFastFactor;
    await page.keyboard.press('Space');
    expect((await readC11(page)).phase).toBe('spinning');
    await page.keyboard.press('f');
    const a = await readC11(page);
    expect(a.fastMode).toBe(true);
    expect(a.lastTimeScale).toBe(1);
    await waitPhase(page, ['foeWait']);
    const b = await readC11(page);
    // Lượt người chơi vẫn chạy theo lịch thường; lượt đối thủ chụp hệ số nhanh từ foeWait.
    expect(checkStops(b.lastReelStopMs, t, 1)).toEqual([]);
    expect(b.lastTimeScale).toBe(f);
    expect(b.lastFoeDelayMs).toBe(effOf(t, 'sfFoeDelayMs', f));
    await page.keyboard.press('f');
    expect((await readC11(page)).fastMode).toBe(false);
    await page.waitForFunction(() => window.__game!.getState<SlotFiveState>()!.spinIndex >= 2, null, { timeout: 10_000 });
    expect((await readC11(page)).lastTimeScale).toBe(f);
    await waitPhase(page, ['idle', 'ended']);
    const c = await readC11(page);
    expect(c.lastSide).toBe('foe');
    expect(checkStops(c.lastReelStopMs, t, f)).toEqual([]);
    expect(c.lastSpinMs).toBe(effOf(t, 'sfSpinBaseMs', f) + 3 * effOf(t, 'sfReelStopGapMs', f));
    await page.keyboard.press('Space');
    const d = await readC11(page);
    expect(d.spinIndex).toBe(3);
    expect(d.lastTimeScale).toBe(1);
    expect(d.lastSpinMs).toBe(t.sfSpinBaseMs + 3 * t.sfReelStopGapMs);
    await setTuning(page, old);
  });

  test('C11.9 bật Nhanh: từ chối busy, notYourTurn như C6.3; F khi ended vẫn đổi; không tự quay khi idle 5 giây', async ({ page }) => {
    await openForInput(page);
    await page.evaluate((f1) => window.__game!.slotFive!.loadMatch(4242, { grids: [f1, f1] }), fx('F1'));
    await page.keyboard.press('f');
    const press = async (expected: string, phase: string) => {
      const before = await readState(page);
      expect(before.phase).toBe(phase);
      await page.keyboard.press('Space');
      const after = await readState(page);
      expect(after.lastReject, phase).toBe(expected);
      expect(after.rejectedSpins).toBe(before.rejectedSpins + 1);
      expect(after.spinIndex).toBe(before.spinIndex);
    };
    await page.keyboard.press('Space');
    await press('busy', 'spinning');
    await waitPhase(page, ['resolving']);
    await press('busy', 'resolving');
    await page.waitForFunction(() => window.__game!.getState<SlotFiveState>()!.spinIndex === 2, null, { timeout: 10_000 });
    await press('notYourTurn', 'spinning');
    await waitPhase(page, ['resolving']);
    await press('notYourTurn', 'resolving');
    await waitPhase(page, ['idle']);
    const idle = await readState(page);
    await page.waitForTimeout(5000);
    expect((await readState(page)).spinIndex).toBe(idle.spinIndex);
    await loadOneHitMatch(page);
    await page.keyboard.press('Space');
    await waitPhase(page, ['ended']);
    const fm = (await readC11(page)).fastMode;
    await page.keyboard.press('f');
    expect((await readC11(page)).fastMode).toBe(!fm);
    expect((await readC11(page)).phase).toBe('ended');
  });

  test('C11.10 sfFastFactor = 1: bật Nhanh cho đúng lastSpinMs, lastResolveMs, lastFoeDelayMs của tốc độ thường', async ({ page }) => {
    await openForInput(page);
    const t = await readTuning(page);
    const old = await setTuning(page, { sfFastFactor: 1 });
    try {
      await page.keyboard.press('f');
      await page.evaluate((g) => window.__game!.slotFive!.loadMatch(4242, { grids: [g] }), fx('F12'));
      await page.keyboard.press('Space');
      await waitPhase(page, ['foeWait']);
      const s = await readC11(page) as C11State & { lastResolveMs: number };
      expect(s.fastMode).toBe(true);
      expect(s.lastTimeScale).toBe(1);
      expect(s.lastSpinMs).toBe(t.sfSpinBaseMs + 3 * t.sfReelStopGapMs);
      expect(s.lastResolveMs).toBe(resolveEff(s.lastChains, t, 1));
      expect(s.lastFoeDelayMs).toBe(t.sfFoeDelayMs);
    } finally {
      await setTuning(page, old);
    }
    expect(await readTuning(page)).toEqual(t);
  });
});

test.describe('Slot Five C11: cảm ứng 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('C11.2 và C11.11 chạm #sf-fast đảo trạng thái, aria-pressed khớp; nút ≥ 44 px, khớp hộp; chữ "Nhanh" đọc được ở cả hai trạng thái', async ({ page }) => {
    await openForInput(page);
    const dom = () =>
      page.evaluate(() => {
        const el = document.getElementById('sf-fast')!;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return { aria: el.getAttribute('aria-pressed'), text: el.textContent, color: cs.color, bg: cs.backgroundColor, fontPx: parseFloat(cs.fontSize), w: r.width, h: r.height };
      });
    const check = async (label: string) => {
      const s = await readC11(page);
      const d = await dom();
      const lt = (s as unknown as { layout: LayoutState }).layout.texts.find((x) => x.id === 'fastBtn');
      console.log(`C11.11 ${label}: fastMode ${s.fastMode}, DOM ${JSON.stringify(d)}, layout ${JSON.stringify(lt)}`);
      expect(d.aria).toBe(String(s.fastMode));
      expect(d.w).toBeGreaterThanOrEqual(44);
      expect(d.h).toBeGreaterThanOrEqual(44);
      expect(d.fontPx).toBeGreaterThanOrEqual(12);
      expect(contrast(d.color, d.bg), `${label} tương phản DOM`).toBeGreaterThanOrEqual(4.5);
      expect(lt, 'fastBtn trong layout.texts').toBeDefined();
      expect(textProblems({ ...(s as unknown as { layout: LayoutState }).layout, texts: [lt!] }, 12)).toEqual([]);
      return s.fastMode;
    };
    expect(await check('tắt')).toBe(false);
    await settleFrames(page);
    await page.screenshot({ path: 'artifacts/slot-five-c11-390x844-fast-off.png' });
    await page.tap('#sf-fast');
    expect(await check('bật')).toBe(true);
    await settleFrames(page);
    await page.screenshot({ path: 'artifacts/slot-five-c11-390x844-fast-on.png' });
    await page.tap('#sf-fast');
    expect(await check('tắt lại')).toBe(false);
    // Hai lần chạm liên tiếp về trạng thái ban đầu.
    await page.tap('#sf-fast');
    await page.tap('#sf-fast');
    expect((await readC11(page)).fastMode).toBe(false);
    // Chạm Nhanh không tính là lệnh quay.
    expect((await readC11(page)).rejectedSpins).toBe(0);
    expect((await readC11(page)).spinIndex).toBe(0);
    // Ảnh lúc đang quay nhanh.
    await page.tap('#sf-fast');
    await page.tap('#sf-spin');
    await page.waitForFunction(() => window.__game!.getState<SlotFiveState>()!.reelsStopped >= 1, null, { timeout: 10_000, polling: 'raf' });
    await page.screenshot({ path: 'artifacts/slot-five-c11-390x844-fast-spinning.png' });
  });
});

// ---------------------------------------------------------------- C12: VFX (bản 4.2)

const VFX_KEYS = [
  'sf_proj_fire', 'sf_proj_volt', 'sf_proj_frost', 'sf_proj_earth', 'sf_proj_blade', 'sf_proj_heal', 'sf_proj_shield',
  'sf_hit_fire', 'sf_hit_volt', 'sf_hit_frost', 'sf_hit_earth', 'sf_hit_blade', 'sf_hit_heal', 'sf_hit_shield',
  'sf_block', 'sf_chain_flash',
];
const ICON_KEY = ['fire', 'volt', 'frost', 'earth', 'blade', 'heal', 'shield', 'lucky'];
interface VfxEntry {
  key: string; kind: 'proj' | 'hit' | 'block' | 'flash'; castIndex: number | null; cell: [number, number] | null;
  pos: [number, number]; box: GBox; startedAtMs: number; endedAtMs: number | null; timeScale: number;
}
type C12State = Omit<SlotFiveState, 'vfxLog'> & { vfxLog: VfxEntry[] };
const readC12 = (page: Page) => page.evaluate(() => window.__game!.getState() as unknown as C12State);
const waitVfxLoaded = (page: Page) =>
  page.waitForFunction(() => ((window.__game?.getState() as unknown as { vfxLoaded?: string[] } | null)?.vfxLoaded?.length ?? 0) >= 16, null, { timeout: 15_000 });
/** Earth-only grid (C base, row 0 x0..2 = 3), for the earth projectile and hit. */
const earthGrid = () => paint(baseC(), row(0, 0, 2), 3);
const dur = (e: VfxEntry) => (e.endedAtMs ?? NaN) - e.startedAtMs;
const cellBox = ([x, y]: [number, number]): GBox => [117 + 102 * x - 48, 124 + 102 * y - 48, 96, 96];

/**
 * Plays one forced player turn and returns the state once the turn has left resolving (foeWait or ended).
 * sfFoeDelayMs is raised so the foe's turn cannot clear vfxLog before it is read; callers restore TUNING.
 */
const vfxTurn = async (page: Page, grid: Grid, setup: RefSetup = {}) => {
  await page.evaluate(([g, st]) => window.__game!.slotFive!.loadMatch(4242, { ...(st as object), grids: [g as number[][]] }), [grid, setup] as const);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => {
    const s = window.__game!.getState<SlotFiveState>()!;
    return s.spinIndex === 1 && (s.phase === 'foeWait' || s.phase === 'ended');
  }, null, { timeout: 15_000 });
  await page.waitForTimeout(60);
  return readC12(page);
};

/** Problems of one finished turn against sections 4.10 to 4.12 (C12.2, C12.3, C12.6, C12.7, C12.8, C12.9). */
const vfxProblems = (s: C12State, t: T, sc: number) => {
  const bad: string[] = [];
  const log = s.vfxLog;
  const casts = s.lastCasts;
  const B = s.layout.boxes as Record<string, GBox>;
  const effSum = Math.round((t.sfCastDelayMs + t.sfCastFlightMs) * sc);
  const tail = effOf(t, 'sfCastTailMs', sc);
  const tag = `lượt ${s.spinIndex}`;
  // Lịch cast và thời lượng lượt không đổi (C12.8).
  if (s.lastResolveMs !== resolveEff(s.lastChains, t, sc)) bad.push(`${tag}: lastResolveMs ${s.lastResolveMs}`);
  casts.forEach((c, k) => {
    const launch = effOf(t, 'sfCastDelayMs', sc) + k * effOf(t, 'sfCastStaggerMs', sc);
    if (c.launchMs !== launch || c.impactMs !== launch + effOf(t, 'sfCastFlightMs', sc)) bad.push(`${tag}: lịch viên ${k}`);
  });
  for (const kind of ['proj', 'hit'] as const) {
    const items = log.filter((e) => e.kind === kind);
    if (items.length !== casts.length) bad.push(`${tag}: ${items.length} ${kind} cho ${casts.length} viên`);
    casts.forEach((c, k) => {
      const mine = items.filter((e) => e.castIndex === k);
      if (mine.length !== 1) {
        bad.push(`${tag}: viên ${k} có ${mine.length} ${kind}`);
        return;
      }
      const e = mine[0];
      const icon = ICON_KEY[s.lastChains[c.chainIndex].icon];
      if (e.key !== `sf_${kind}_${icon}`) bad.push(`${tag}: viên ${k} key ${e.key}, mong đợi sf_${kind}_${icon}`);
      if (kind === 'proj') {
        if (Math.abs(e.startedAtMs - c.launchMs) > 40) bad.push(`${tag}: proj ${k} bắt đầu ${e.startedAtMs} so với ${c.launchMs}`);
        if (e.endedAtMs === null || Math.abs(e.endedAtMs - c.impactMs) > 40) bad.push(`${tag}: proj ${k} kết thúc ${e.endedAtMs} so với ${c.impactMs}`);
        if (e.box[2] < 56 || e.box[3] < 56) bad.push(`${tag}: proj ${k} box ${e.box.join(',')}`);
      } else {
        if (Math.abs(e.startedAtMs - c.impactMs) > 40) bad.push(`${tag}: hit ${k} bắt đầu ${e.startedAtMs} so với ${c.impactMs}`);
        if (Math.abs(e.pos[0] - c.to[0]) > 2 || Math.abs(e.pos[1] - c.to[1]) > 2) bad.push(`${tag}: hit ${k} pos ${e.pos.join(',')} so với ${c.to.join(',')}`);
        if (e.box[2] < 72 || e.box[2] > 120 || e.box[3] < 72 || e.box[3] > 104) bad.push(`${tag}: hit ${k} box ${e.box.join(',')}`);
      }
    });
  }
  for (const e of log.filter((x) => x.kind === 'block')) {
    const c = e.castIndex === null ? undefined : casts[e.castIndex];
    if (!c || c.kind !== 'damage') bad.push(`${tag}: block trên viên ${e.castIndex} loại ${c?.kind}`);
    if (e.box[2] < 80 || e.box[2] > 112 || e.box[3] < 80 || e.box[3] > 112) bad.push(`${tag}: block box ${e.box.join(',')}`);
  }
  const flashes = log.filter((e) => e.kind === 'flash');
  const cells = new Set(s.lastChains.flatMap((c) => c.cells.map(([x, y]) => `${x},${y}`)));
  if (flashes.length !== cells.size) bad.push(`${tag}: ${flashes.length} flash cho ${cells.size} ô`);
  if (new Set(flashes.map((e) => `${e.cell}`)).size !== flashes.length) bad.push(`${tag}: flash trùng ô`);
  for (const e of flashes) {
    if (!e.cell || !cells.has(`${e.cell[0]},${e.cell[1]}`)) bad.push(`${tag}: flash ô ${e.cell}`);
    if (e.startedAtMs > 40) bad.push(`${tag}: flash bắt đầu ${e.startedAtMs}`);
    if (e.cell) {
      const want = cellBox(e.cell);
      if (want.some((v, i) => Math.abs(v - e.box[i]) > 4)) bad.push(`${tag}: flash box ${e.box.join(',')} so với ${want.join(',')}`);
    }
  }
  for (const e of log) {
    if (e.endedAtMs === null) {
      bad.push(`${tag}: ${e.key} chưa kết thúc`);
      continue;
    }
    if ((e.kind === 'hit' || e.kind === 'block') && dur(e) > tail + 40) bad.push(`${tag}: ${e.key} dài ${dur(e)} > ${tail} + 40`);
    if (e.kind === 'flash' && dur(e) > effSum + 40) bad.push(`${tag}: flash dài ${dur(e)} > ${effSum} + 40`);
    if (e.endedAtMs > s.lastResolveMs + 40) bad.push(`${tag}: ${e.key} kết thúc ${e.endedAtMs} > lastResolveMs ${s.lastResolveMs} + 40`);
    if (Math.abs(e.timeScale - sc) > 1e-9) bad.push(`${tag}: ${e.key} timeScale ${e.timeScale}`);
    // C12.9: giao HUD thì tối đa 150 ms; không giao turnBanner hay panel.
    if ((interArea(e.box, B.playerHud) > 0 || interArea(e.box, B.foeHud) > 0) && dur(e) > 150) bad.push(`${tag}: ${e.key} giao HUD ${dur(e)} ms`);
    if (interArea(e.box, B.turnBanner) > 0 || interArea(e.box, B.panel) > 0) bad.push(`${tag}: ${e.key} giao turnBanner/panel, box ${e.box.join(',')}`);
  }
  return bad;
};

test.describe('Slot Five C12: VFX', () => {
  test.beforeEach(() => pinBriefTuning());

  test('C12.1 nạp đủ 16 key, sheet ≤ 1024 px, tổng ≤ 1.572.864 byte, một manifest, không request ra ngoài origin', async ({ page }) => {
    const outside: string[] = [];
    page.on('request', (r) => {
      const u = r.url();
      if (!u.startsWith('http://127.0.0.1:5173/') && !u.startsWith('data:') && !u.startsWith('blob:')) outside.push(u);
    });
    await openForInput(page);
    await waitVfxLoaded(page);
    const s = await readC12(page);
    expect(s.vfxLoaded).toEqual([...VFX_KEYS].sort());
    const files = await page.evaluate(async () => {
      const mod = (await import('/src/game/slotFiveVfx.ts' as string)) as { SF_VFX_MANIFEST: Record<string, string> };
      const out: { file: string; bytes: number; w?: number; h?: number }[] = [];
      for (const path of Object.values(mod.SF_VFX_MANIFEST)) {
        const res = await fetch(`/${path}`);
        const text = await res.text();
        out.push({ file: path, bytes: new TextEncoder().encode(text).length });
        const dir = path.slice(0, path.lastIndexOf('/') + 1);
        for (const sheet of (JSON.parse(text) as { sheets: string[] }).sheets) {
          const buf = new Uint8Array(await (await fetch(`/${dir}${sheet}`)).arrayBuffer());
          const dv = new DataView(buf.buffer);
          out.push({ file: `${dir}${sheet}`, bytes: buf.length, w: dv.getUint32(16), h: dv.getUint32(20) });
        }
      }
      // Chỉ slotFiveVfx.ts nhắc tới đường dẫn sheet; module logic không import VFX (C12.11).
      const raw = async (p: string) => ((await import(`${p}?raw` as string)) as { default: string }).default;
      const others = ['/src/scenes/SlotFiveScene.ts', '/src/game/slotFiveLogic.ts', '/src/main.ts', '/src/debug/devTools.ts', '/src/config.ts'];
      const mentions = [];
      for (const p of others) if ((await raw(p)).includes('vfx/sf-')) mentions.push(p);
      const logic = await raw('/src/game/slotFiveLogic.ts');
      const logicImports = [...logic.matchAll(/^import[^;]*from\s+'([^']+)'/gm)].map((m) => m[1]);
      return { manifest: Object.keys(mod.SF_VFX_MANIFEST), out, mentions, logicImports };
    });
    const pngs = files.out.filter((x) => x.file.endsWith('.png'));
    const total = files.out.reduce((a, x) => a + x.bytes, 0);
    console.log(`C12.1: ${files.manifest.length} key, ${pngs.length} sheet, tổng ${total} byte; sheet lớn nhất ${Math.max(...pngs.map((p) => Math.max(p.w!, p.h!)))} px; logic import ${files.logicImports.join(', ')}`);
    expect([...files.manifest].sort()).toEqual([...VFX_KEYS].sort());
    for (const p of pngs) expect(Math.max(p.w!, p.h!), p.file).toBeLessThanOrEqual(1024);
    for (const p of pngs) expect(p.file, 'tên sheet T_sf_*').toMatch(/\/T_sf_[A-Za-z_0-9]+\.png$/);
    expect(total).toBeLessThanOrEqual(1_572_864);
    expect(files.mentions).toEqual([]);
    expect(files.logicImports.some((m) => /vfx/i.test(m))).toBe(false);
    expect(outside).toEqual([]);
  });

  test('C12.2, C12.7 F12 lượt người chơi: 3 đạn heal, shield, blade đúng lịch; không còn chấm tròn (soát ảnh)', async ({ page }) => {
    await openForInput(page);
    await waitVfxLoaded(page);
    await setTuning(page, { sfFoeDelayMs: 1500 });
    const t = await readTuning(page);
    const s = await vfxTurn(page, fx('F12'));
    const proj = s.vfxLog.filter((e) => e.kind === 'proj');
    console.log(`C12.2: ${JSON.stringify(proj.map((e) => [e.key, e.castIndex, Math.round(e.startedAtMs), Math.round(e.endedAtMs ?? -1), e.box.map(Math.round)]))}; lịch ${JSON.stringify(s.lastCasts.map((c) => [c.launchMs, c.impactMs]))}`);
    expect(proj.map((e) => e.key)).toEqual(['sf_proj_heal', 'sf_proj_shield', 'sf_proj_blade']);
    expect(proj.map((e) => e.castIndex).sort()).toEqual([0, 1, 2]);
    expect(vfxProblems(s, t, 1)).toEqual([]);
  });

  for (const [id, keys] of [['F10', ['fire']], ['F11', ['volt', 'earth']], ['F13', ['frost']], ['F5', ['blade']], ['F2', ['heal']], ['F3', ['shield']]] as const) {
    test(`C12.4 ${id}: đạn và va chạm ${keys.join(', ')}; heal, shield ở bên quay, sát thương ở bên kia`, async ({ page }) => {
      await openForInput(page);
      await waitVfxLoaded(page);
      await setTuning(page, { sfFoeDelayMs: 1500 });
      const t = await readTuning(page);
      const s = await vfxTurn(page, fx(id));
      expect(s.vfxLog.filter((e) => e.kind === 'proj').map((e) => e.key)).toEqual(keys.map((k) => `sf_proj_${k}`));
      expect(s.vfxLog.filter((e) => e.kind === 'hit').map((e) => e.key)).toEqual(keys.map((k) => `sf_hit_${k}`));
      for (const e of s.vfxLog.filter((x) => x.kind === 'hit')) {
        const c = s.lastCasts[e.castIndex!];
        const side = c.kind === 'damage' ? 'foe' : 'player';
        expect(c.target).toBe(side);
        expect(Math.abs(e.pos[0] - FIGHTER_CENTRE[side][0]) <= 2 && Math.abs(e.pos[1] - FIGHTER_CENTRE[side][1]) <= 2, `${e.key} tại ${e.pos}`).toBe(true);
      }
      expect(vfxProblems(s, t, 1)).toEqual([]);
    });
  }

  test('C12.5 chặn: khiên đối thủ 20 với F11 có 2 block cùng lúc với hit; khiên 0 với F1 không có block', async ({ page }) => {
    await openForInput(page);
    await waitVfxLoaded(page);
    await setTuning(page, { sfFoeDelayMs: 1500 });
    const t = await readTuning(page);
    const s = await vfxTurn(page, fx('F11'), { foe: { shield: 20 } });
    const blocks = s.vfxLog.filter((e) => e.kind === 'block');
    const hits = s.vfxLog.filter((e) => e.kind === 'hit');
    console.log(`C12.5: block ${JSON.stringify(blocks.map((e) => [e.castIndex, Math.round(e.startedAtMs), e.box.map(Math.round)]))}, hit ${JSON.stringify(hits.map((e) => [e.castIndex, Math.round(e.startedAtMs)]))}`);
    expect(blocks.map((e) => e.castIndex)).toEqual([0, 1]);
    for (const b of blocks) {
      const h = hits.find((x) => x.castIndex === b.castIndex)!;
      expect(Math.abs(b.startedAtMs - h.startedAtMs)).toBeLessThanOrEqual(40);
    }
    expect(vfxProblems(s, t, 1)).toEqual([]);
    const s2 = await vfxTurn(page, fx('F1'), { foe: { shield: 0 } });
    expect(s2.vfxLog.filter((e) => e.kind === 'block')).toHaveLength(0);
    // Viên heal và shield không bao giờ có block, kể cả khi bên quay đang có khiên.
    const s3 = await vfxTurn(page, fx('F12'), { player: { shield: 30 }, foe: { shield: 30 } });
    expect(s3.vfxLog.filter((e) => e.kind === 'block').map((e) => s3.lastCasts[e.castIndex!].kind)).toEqual(['damage']);
  });

  for (const [id, flashes, proj] of [['F7', 5, 2], ['F4', 4, 0], ['F0', 0, 0]] as const) {
    test(`C12.6 ${id}: ${flashes} lóe chuỗi trong 40 ms đầu, ${proj} đạn, số lóe bằng highlightedCells`, async ({ page }) => {
      await openForInput(page);
      await waitVfxLoaded(page);
      await setTuning(page, { sfFoeDelayMs: 1500 });
      const t = await readTuning(page);
      const s = await vfxTurn(page, fx(id));
      const fl = s.vfxLog.filter((e) => e.kind === 'flash');
      expect(fl).toHaveLength(flashes);
      expect(fl.length).toBe(s.highlightedCells);
      expect(s.vfxLog.filter((e) => e.kind === 'proj')).toHaveLength(proj);
      expect(vfxProblems(s, t, 1)).toEqual([]);
    });
  }

  test('C12.3, C12.5, C12.6, C12.7, C12.8, C12.9, C12.11, C12.12 trận đầy đủ chơi bằng Space (máu 60)', async ({ page }) => {
    test.setTimeout(300_000);
    const warnings: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'warning' && /texture|frame|anim/i.test(m.text())) warnings.push(m.text());
    });
    await openForInput(page);
    await waitVfxLoaded(page);
    const t = await readTuning(page);
    const LOW = { player: { maxHp: 60 }, foe: { maxHp: 60 } };
    await page.evaluate((low) => window.__game!.slotFive!.loadMatch(window.__game!.tuning.sfSeed, low), LOW);
    // Chụp state ở frame đầu tiên rời resolving của mỗi lượt, và 50 ms sau đó.
    await page.evaluate(() => {
      const w = window as unknown as { __qaTurns: unknown[]; __qaMaxVfx: number; __qaDom: string[] };
      w.__qaTurns = [];
      w.__qaMaxVfx = 0;
      w.__qaDom = [];
      let prev = '';
      const tick = () => {
        const s = window.__game?.getState() as unknown as C12State | null;
        if (s) {
          w.__qaMaxVfx = Math.max(w.__qaMaxVfx, s.vfxPlaying);
          if (prev === 'resolving' && s.phase !== 'resolving') {
            const snap = { state: s, playingAfter50: -1 };
            w.__qaTurns.push(snap);
            setTimeout(() => {
              snap.playingAfter50 = (window.__game!.getState() as unknown as C12State).vfxPlaying;
            }, 50);
          }
          // Cờ DOM phản chiếu đúng state (C12.14, bản dev).
          const el = document.getElementById('game')!;
          const d = el.dataset;
          if (d.sfSpinIndex !== String(s.spinIndex) || d.sfPhase !== s.phase || d.sfLastCasts !== String(s.lastCasts.length)) {
            if (w.__qaDom.length < 5 && prev === s.phase) w.__qaDom.push(`${s.spinIndex}/${s.phase}/${s.lastCasts.length} DOM ${d.sfSpinIndex}/${d.sfPhase}/${d.sfLastCasts}`);
          }
          prev = s.phase;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const end = await playToEnd(page, () => page.keyboard.press('Space'));
    await waitPhase(page, ['ended']);
    await page.waitForTimeout(200);
    const out = await page.evaluate(() => {
      const w = window as unknown as { __qaTurns: { state: C12State; playingAfter50: number }[]; __qaMaxVfx: number; __qaDom: string[] };
      return { turns: w.__qaTurns, maxVfx: w.__qaMaxVfx, dom: w.__qaDom, hitsFlag: Number(document.getElementById('game')!.dataset.sfVfxHits) };
    });
    const sim = await page.evaluate(([seed, low]) => {
      const b = window.__game!.slotFive!.createBattle(seed, low);
      const log: string[] = [];
      while (b.getState().status === 'playing') {
        const r = b.spin();
        const s = b.getState();
        log.push(JSON.stringify([s.spinIndex, r.grid, r.chains, { ...r.effects, absorbed: r.absorbed, hpLoss: r.hpLoss, healed: r.healed }, s.player, s.foe]));
      }
      return log;
    }, [t.sfSeed, LOW] as const);
    const bad: string[] = [];
    let casts = 0;
    let hits = 0;
    let blocks = 0;
    for (const { state: s, playingAfter50 } of out.turns) {
      bad.push(...vfxProblems(s, t, 1));
      if (playingAfter50 !== 0) bad.push(`lượt ${s.spinIndex}: vfxPlaying ${playingAfter50} sau 50 ms`);
      if (s.vfxLog.filter((e) => e.kind === 'flash').length !== s.highlightedCells) bad.push(`lượt ${s.spinIndex}: flash khác highlightedCells`);
      casts += s.lastCasts.length;
      hits += s.vfxLog.filter((e) => e.kind === 'hit').length;
      blocks += s.vfxLog.filter((e) => e.kind === 'block').length;
    }
    const sceneLog = out.turns.map(({ state: s }) => JSON.stringify([s.spinIndex, s.grid, s.lastChains, s.lastEffects, s.player, s.foe]));
    console.log(`C12 trận đầy đủ: ${end.s.status} sau ${end.s.spinIndex} lượt; ${casts} viên, ${hits} hit, ${blocks} block; vfxPlaying tối đa ${out.maxVfx}; data-sf-vfx-hits ${out.hitsFlag}`);
    expect(out.turns.length).toBe(end.s.spinIndex);
    expect(bad.slice(0, 10)).toEqual([]);
    expect(sceneLog, 'C12.11: mỗi lượt khớp createBattle').toEqual(sim);
    expect(out.maxVfx).toBeLessThanOrEqual(40);
    expect(out.hitsFlag).toBe(hits);
    expect(out.dom, 'cờ DOM phản chiếu state').toEqual([]);
    expect(warnings).toEqual([]);
    expect(hits).toBe(casts);
    expect(casts).toBeGreaterThan(0);
  });

  test('C12.10 chế độ Nhanh: timeScale = sfFastFactor, lịch và thời lượng theo eff, hit ngắn lại theo hệ số', async ({ page }) => {
    await openForInput(page);
    await waitVfxLoaded(page);
    await setTuning(page, { sfFoeDelayMs: 3000 });
    const t = await readTuning(page);
    const f = t.sfFastFactor;
    const normal = await vfxTurn(page, fx('F12'));
    await page.keyboard.press('f');
    const fast = await vfxTurn(page, fx('F12'));
    expect((await readC11(page)).fastMode).toBe(true);
    expect(fast.vfxLog.length).toBeGreaterThan(0);
    expect(fast.vfxLog.every((e) => Math.abs(e.timeScale - f) < 1e-9)).toBe(true);
    expect(vfxProblems(fast, t, f)).toEqual([]);
    const pairs = fast.vfxLog.filter((e) => e.kind === 'hit').map((e) => {
      const n = normal.vfxLog.find((x) => x.kind === 'hit' && x.castIndex === e.castIndex)!;
      return { key: e.key, fast: dur(e), normal: dur(n) };
    });
    console.log(`C12.10: hit thường/nhanh ${JSON.stringify(pairs)}`);
    for (const p of pairs) expect(Math.abs(p.fast - p.normal * f), p.key).toBeLessThanOrEqual(40);
    // Ảnh chế độ Nhanh không ở đây; xem C12.13.
  });

  test('C12.11 các trường getState() trước bản 4.2 vẫn đủ và cùng kiểu', async ({ page }) => {
    await openForInput(page);
    const s = await page.evaluate(() => window.__game!.getState() as unknown as Record<string, unknown>);
    const want: Record<string, string> = {
      gameId: 'string', seed: 'number', matchIndex: 'number', cols: 'number', rows: 'number', iconCount: 'number', luckyIcon: 'number',
      grid: 'array', spinIndex: 'number', turn: 'string', status: 'string', player: 'object', foe: 'object', displayHp: 'object',
      displayShield: 'object', lastSide: 'null', lastChains: 'array', lastEffects: 'object', phase: 'string', rejectedSpins: 'number',
      lastReject: 'null', reelsStopped: 'number', lastSpinMs: 'number', lastResolveMs: 'number', lastReelStopMs: 'array',
      highlightedChainCount: 'number', highlightedCells: 'number', viewCounts: 'object', legendOpen: 'boolean', lastCasts: 'array',
      castsInFlight: 'number', floatTexts: 'array', layout: 'object', fastMode: 'boolean', lastTimeScale: 'number', lastFoeDelayMs: 'number',
    };
    const kind = (v: unknown) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
    const bad = Object.entries(want).filter(([k, ty]) => kind(s[k]) !== ty).map(([k, ty]) => `${k}: ${kind(s[k])} thay vì ${ty}`);
    expect(bad).toEqual([]);
    expect(kind(s.vfxLoaded)).toBe('array');
    expect(kind(s.vfxPlaying)).toBe('number');
    expect(kind(s.vfxLog)).toBe('array');
  });
});

/** C12.13: screenshots for the user, 390x844. */
test.describe('Slot Five C12.13: ảnh VFX 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test.beforeEach(() => pinBriefTuning());

  test('C12.13 ảnh đạn (7), va chạm (7), block, lóe chuỗi F7, F12 ba đạn, chế độ Nhanh', async ({ page }) => {
    test.setTimeout(240_000);
    await openForInput(page);
    await waitVfxLoaded(page);
    await setTuning(page, { sfFoeDelayMs: 1500 });
    const shot = (name: string) => page.screenshot({ path: `artifacts/slot-five-c12-390x844-${name}.png` });
    const start = async (grid: Grid, setup: RefSetup = {}) => {
      await page.evaluate(([g, st]) => window.__game!.slotFive!.loadMatch(4242, { ...(st as object), grids: [g as number[][]] }), [grid, setup] as const);
      await page.tap('#sf-spin');
    };
    /** Waits until a VFX of this kind and key is playing (started, not ended). */
    const waitLog = (kind: string, key: string) =>
      page.waitForFunction(([k, ky]) => {
        const s = window.__game!.getState() as unknown as C12State;
        return s.vfxLog.some((x) => x.kind === k && x.key === ky && x.endedAtMs === null);
      }, [kind, key] as const, { timeout: 10_000, polling: 'raf' });
    const cases: [string, Grid][] = [
      ['fire', fx('F10')], ['volt', paint(baseC(), row(0, 0, 2), 1)], ['frost', fx('F13')], ['earth', earthGrid()],
      ['blade', fx('F1')], ['heal', fx('F2')], ['shield', fx('F3')],
    ];
    for (const [name, grid] of cases) {
      await start(grid);
      await waitLog('proj', `sf_proj_${name}`);
      // Khoảng 75% đường bay (sfCastFlightMs 350): đạn đang qua khoảng trống cast.
      await page.waitForTimeout(250);
      await shot(`proj-${name}`);
      await waitLog('hit', `sf_hit_${name}`);
      await page.waitForTimeout(90);
      await shot(`hit-${name}`);
      await waitPhase(page, ['foeWait', 'ended']);
    }
    await start(fx('F11'), { foe: { shield: 20 } });
    await waitLog('block', 'sf_block');
    await page.waitForTimeout(90);
    await shot('block');
    await waitPhase(page, ['foeWait', 'ended']);
    await start(fx('F7'));
    await waitLog('flash', 'sf_chain_flash');
    await page.waitForTimeout(150);
    await shot('flash-f7');
    await waitPhase(page, ['foeWait', 'ended']);
    await start(fx('F12'));
    await page.waitForFunction(() => {
      const s = window.__game!.getState() as unknown as C12State;
      const p = s.vfxLog.filter((e) => e.kind === 'proj');
      return p.length === 3 && p.every((e) => e.endedAtMs === null);
    }, null, { timeout: 10_000, polling: 'raf' });
    await shot('f12-three-proj');
    await waitPhase(page, ['foeWait', 'ended']);
    await page.tap('#sf-fast');
    await start(fx('F12'));
    await page.waitForFunction(() => (window.__game!.getState() as unknown as C12State).vfxLog.some((e) => e.kind === 'proj' && e.endedAtMs === null), null, { timeout: 10_000, polling: 'raf' });
    await page.waitForTimeout(40);
    await shot('fast-mode');
    expect((await readC11(page)).fastMode).toBe(true);
  });
});

test.describe('Slot Five C1: khung hình', () => {
  const fit = (page: Page) =>
    page.evaluate(() => {
      const c = document.querySelector('canvas')!.getBoundingClientRect();
      const d = document.documentElement;
      return {
        canvasInside: c.left >= 0 && c.top >= 0 && c.right <= innerWidth && c.bottom <= innerHeight,
        scrollX: d.scrollWidth > d.clientWidth,
        scrollY: d.scrollHeight > d.clientHeight,
      };
    });
  const FITS = { canvasInside: true, scrollX: false, scrollY: false };

  test.describe('desktop 1600x900', () => {
    test.use({ viewport: { width: 1600, height: 900 } });
    test('Canvas vừa khung 1600x900', async ({ page }) => {
      await openSlotFive(page);
      await settleFrames(page);
      expect(await fit(page)).toEqual(FITS);
      await page.screenshot({ path: 'artifacts/slot-five-c1-1600x900.png' });
    });
  });

  test.describe('điện thoại 390x844', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    test('Canvas vừa khung 390x844, nút platformer ẩn', async ({ page }) => {
      await openSlotFive(page);
      await settleFrames(page);
      expect(await fit(page)).toEqual(FITS);
      for (const id of ['#btn-left', '#btn-right', '#btn-jump', '#gf-retry', '#gf-next']) await expect(page.locator(id)).toBeHidden();
      await page.screenshot({ path: 'artifacts/slot-five-c1-390x844.png' });
    });
  });

  test.describe('điện thoại ngang 844x390', () => {
    test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
    test('Canvas vừa khung 844x390, nút platformer ẩn', async ({ page }) => {
      await openSlotFive(page);
      await settleFrames(page);
      expect(await fit(page)).toEqual(FITS);
      for (const id of ['#btn-left', '#btn-right', '#btn-jump']) await expect(page.locator(id)).toBeHidden();
      await page.screenshot({ path: 'artifacts/slot-five-c1-844x390.png' });
    });
  });
});
