import { expect, test, type Page } from '@playwright/test';
import type { Dir, GatefallEvent, GatefallFixture } from '../src/game/gatefallLogic';
import type { GatefallState } from '../src/scenes/GatefallScene';

/**
 * Gatefall C5 acceptance. Criteria come from section 8 of docs/briefs/gatefall.md.
 * `__qa5` reads the real display objects of the running scene, so `viewCounts` is not checked against itself.
 * The scene is only read, except in the tests that deliberately corrupt it to prove the dev guards fire.
 */

type Board = (number | null)[][];
type Gates = Record<Dir, (number | null)[]>;

interface QaSprite {
  x: number;
  y: number;
  key: string;
  visible: boolean;
  alpha: number;
}

interface QaScene {
  layer: { list: unknown[]; x: number; y: number };
  children: { list: unknown[] };
  layout: { left: number; top: number; cell: number; boardPx: number; size: number };
  sim: { tilt: (dir: Dir) => unknown };
  config: { enterMs: number };
  cellViews: ({ color: number } | null)[][];
  views: Set<unknown>;
  textures: { list: Record<string, unknown> };
  game: { loop: { sleep(): void; wake(): void } };
  playback: unknown;
  add: { image(x: number, y: number, key: string): unknown };
}

interface Qa5 {
  scene(): QaScene;
  sprites(): QaSprite[];
  /** Compares every live sprite with the logic state: right cell or slot, right color, nothing extra. */
  spriteProblems(checkPose: boolean): string[];
  expectedAnimMs(events: GatefallEvent[]): number;
  skip(): void;
  freeze(atMs: number | null): void;
  now(): number;
}

declare global {
  interface Window {
    __qa5?: Qa5;
  }
}

const DIRS: Dir[] = ['up', 'right', 'down', 'left'];
const SIZE = 7;
const LOCK_SLACK_MS = 250;

const emptyGates = (): Gates => ({
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
const F4 = () => fixture([[0, 4, 2], [0, 5, 0], [1, 4, 1], [1, 5, 0], [2, 4, 1], [2, 5, 0], [3, 5, 1]]);
const F7 = (extra: Partial<GatefallFixture> = {}): GatefallFixture => {
  const board: Board = Array.from({ length: SIZE }, (_, y) => Array.from({ length: SIZE }, (_, x) => (x + 2 * y) % 4));
  board[0][0] = null;
  const gates = emptyGates();
  gates.down[0] = 0;
  return { board, gates, ...extra };
};
const REJECT = () => fixture([[0, 6, 0]]);
/**
 * Three-step cascade after a one-cell drop. Bottom row 0 0 0 1 2 clears the 0s, which lines up 1 1 1,
 * and clearing those lines up 2 2 2. Nothing but the 0s is a group at the start.
 */
const LONG_CASCADE = () => fixture([
  [0, 5, 0], [1, 5, 0], [2, 5, 0], [3, 5, 1], [4, 5, 2],
  [0, 4, 2], [1, 4, 1], [2, 4, 1],
  [1, 3, 2], [2, 3, 2],
]);
/** All six colors on the board and in the gates, with no group of three. */
const SIX_COLORS = (): GatefallFixture => {
  let next = 0;
  const board: Board = Array.from({ length: SIZE }, (_, y) => Array.from({ length: SIZE }, (_, x) => {
    if ((x + y) % 2 !== 0) return null;
    next += 1;
    return (next - 1) % 6;
  }));
  const gates = emptyGates();
  for (const dir of DIRS) gates[dir] = gates[dir].map((_, lane) => (lane + DIRS.indexOf(dir)) % 6);
  return { board, gates };
};

const installQa5 = async (page: Page) => {
  await page.evaluate(async () => {
    const entry = performance.getEntriesByType('resource')
      .map((item) => item.name)
      .find((name) => name.includes('/src/scenes/GatefallScene.ts'));
    if (!entry) throw new Error('GatefallScene module URL not found');
    const module = await import(/* @vite-ignore */ entry);
    const proto = module.GatefallScene.prototype;
    const original = proto.getState;
    let captured: QaScene | null = null;
    proto.getState = function capture(this: QaScene) {
      captured = this;
      return original.call(this);
    };
    window.__game!.getState();
    proto.getState = original;
    if (!captured) throw new Error('scene not captured');
    const scene = () => captured!;

    const realNow = performance.now.bind(performance);
    let skew = 0;
    let frozen: number | null = null;
    performance.now = () => (frozen ?? realNow() + skew);

    const read = () => window.__game!.getState<GatefallState>()!;
    const sprites = (): QaSprite[] => (scene().layer.list as {
      type: string; x: number; y: number; visible: boolean; alpha: number; texture: { key: string };
    }[]).filter((child) => child.type === 'Image').map((image) => ({
      x: image.x, y: image.y, key: image.texture.key, visible: image.visible, alpha: image.alpha,
    }));

    const spriteProblems = (checkPose: boolean) => {
      const state = read();
      const { left, top, cell, boardPx } = scene().layout;
      const remaining = sprites();
      const out: string[] = [];
      const take = (label: string, color: number, match: (s: QaSprite) => boolean) => {
        const found = remaining.filter((s) => s.key === `gf-piece-${color}` && match(s));
        if (found.length !== 1) {
          out.push(`${label}: ${found.length} sprite màu ${color}`);
          return;
        }
        remaining.splice(remaining.indexOf(found[0]), 1);
        if (checkPose && (!found[0].visible || found[0].alpha !== 1)) out.push(`${label}: chưa hiện đủ`);
      };
      const near = (a: number, b: number) => Math.abs(a - b) <= 0.51;
      state.board.forEach((row, y) => row.forEach((color, x) => {
        if (color === null) return;
        take(`ô ${x},${y}`, color, (s) => near(s.x, left + (x + 0.5) * cell) && near(s.y, top + (y + 0.5) * cell));
      }));
      for (const dir of ['up', 'right', 'down', 'left'] as Dir[]) {
        state.gates[dir].forEach((color, lane) => {
          if (color === null) return;
          const along = (lane + 0.5) * cell;
          take(`cửa ${dir}[${lane}]`, color, (s) => {
            // Section 4.2: the gate sits on the edge opposite the tilt direction.
            if (dir === 'down') return near(s.x, left + along) && s.y < top;
            if (dir === 'up') return near(s.x, left + along) && s.y > top + boardPx;
            if (dir === 'right') return near(s.y, top + along) && s.x < left;
            return near(s.y, top + along) && s.x > left + boardPx;
          });
        });
      }
      if (remaining.length > 0) out.push(`thừa ${remaining.length} sprite`);
      return out;
    };

    const expectedAnimMs = (events: GatefallEvent[]) => {
      const t = window.__game!.tuning;
      const slide = (n: number) => (n === 0 ? 0 : Math.min(t.gfSlideMaxMs, n * t.gfSlideMsPerCell));
      const farthest = (chain: number) => Math.max(0, ...events
        .filter((e): e is Extract<GatefallEvent, { type: 'move' }> => e.type === 'move' && e.chain === chain)
        .map((e) => Math.abs(e.to.x - e.from.x) + Math.abs(e.to.y - e.from.y)));
      const chains = new Set(events.flatMap((e) => (e.type === 'clusterClear' ? [e.chain] : [])));
      let total = slide(farthest(0));
      if (events.some((e) => e.type === 'enter')) total += t.gfEnterMs;
      for (const chain of chains) total += t.gfClearPrepMs + t.gfClearMs + slide(farthest(chain)) + t.gfChainPauseMs;
      if (events.some((e) => e.type === 'vent')) total += t.gfVentMs;
      return total;
    };

    window.__qa5 = {
      scene,
      sprites,
      spriteProblems,
      expectedAnimMs,
      skip() {
        const state = read();
        if (state.animating) skew += state.lastAnimMs + 1;
        if (read().animating) throw new Error('playback did not end after lastAnimMs');
      },
      freeze(atMs) {
        if (atMs === null) {
          if (frozen !== null) skew = frozen - realNow();
          frozen = null;
        } else {
          frozen = atMs;
        }
      },
      now: () => performance.now(),
    };
  });
};

const open = async (page: Page, level = 0) => {
  await page.goto('/?game=gatefall');
  await page.waitForFunction(() => {
    const state = window.__game?.getState<GatefallState>();
    return state?.gameId === 'gatefall' && state.status === 'playing' && Boolean(window.__game?.gatefall);
  });
  await installQa5(page);
  if (level !== 0) await page.evaluate((lv) => window.__game!.gatefall!.loadLevel(lv), level);
};

const readState = (page: Page) => page.evaluate(() => window.__game!.getState<GatefallState>()!);
const nextFrames = (page: Page) =>
  page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
const waitUnlocked = (page: Page) =>
  page.waitForFunction(() => window.__game?.getState<GatefallState>()?.animating === false);
/** Past the lock and past the refill pop that may outlive it. */
const waitVisualEnd = (page: Page) =>
  page.waitForFunction(() => window.__game?.getState<GatefallState>()?.animating === false && window.__qa5!.scene().playback === null);

const countBoard = (board: Board) => board.flat().filter((c) => c !== null).length;
const countGates = (gates: Gates) => DIRS.reduce((sum, d) => sum + gates[d].filter((c) => c !== null).length, 0);

let problems: string[] = [];
let allowedErrors: RegExp[] = [];

test.beforeEach(({ page }) => {
  problems = [];
  allowedErrors = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
  });
});

test.afterEach(() => {
  const unexpected = problems.filter((text) => !allowedErrors.some((pattern) => pattern.test(text)));
  expect(unexpected, 'không có lỗi console hoặc lỗi trang').toEqual([]);
});

test.describe('Gatefall C5.1: sprite khớp logic', () => {
  for (const level of [0, 1, 2]) {
    test(`C5.1 màn ${level + 1}: sau khi vào màn và sau 10 nước, sprite thật khớp board và cửa`, async ({ page }) => {
      await open(page, level);
      await nextFrames(page);
      for (let i = 0; i <= 10; i += 1) {
        const state = await readState(page);
        expect(state.animating).toBe(false);
        expect(state.viewCounts.pieces, `nước ${i}`).toBe(countBoard(state.board));
        expect(state.viewCounts.gatePieces, `nước ${i}`).toBe(countGates(state.gates));
        await waitVisualEnd(page);
        await nextFrames(page);
        expect(await page.evaluate(() => window.__qa5!.spriteProblems(true)), `nước ${i}`).toEqual([]);
        if (i === 10 || state.status !== 'playing') break;
        const dir = state.validTilts[i % state.validTilts.length];
        expect(await page.evaluate((d) => window.__game!.gatefall!.tilt(d), dir)).toBe(true);
        await waitUnlocked(page);
      }
    });
  }

  test('C5.1 ngay khi mở khóa, trong lúc quân mới còn hiện dần, số đếm và vị trí vẫn đúng', async ({ page }) => {
    await open(page);
    const out = await page.evaluate(async () => {
      const api = window.__game!.gatefall!;
      const read = () => window.__game!.getState<GatefallState>()!;
      const failures: string[] = [];
      let sawTail = 0;
      for (let i = 0; i < 12; i += 1) {
        const before = read();
        if (before.status !== 'playing') break;
        api.tilt(before.validTilts[i % before.validTilts.length]);
        while (read().animating) await new Promise((r) => setTimeout(r, 1));
        const s = read();
        if (window.__qa5!.scene().playback !== null) sawTail += 1;
        if (s.viewCounts.pieces !== s.board.flat().filter((c) => c !== null).length) failures.push(`pieces nước ${i}`);
        const gates = (['up', 'right', 'down', 'left'] as Dir[]).reduce((n, d) => n + s.gates[d].filter((c) => c !== null).length, 0);
        if (s.viewCounts.gatePieces !== gates) failures.push(`gates nước ${i}`);
        await new Promise((r) => requestAnimationFrame(r));
        failures.push(...window.__qa5!.spriteProblems(false).map((p) => `nước ${i}: ${p}`));
      }
      return { failures, sawTail };
    });
    expect(out.failures).toEqual([]);
    expect(out.sawTail, 'phải thực sự rơi vào đoạn hiệu ứng sau mở khóa').toBeGreaterThan(0);
  });
});

test.describe('Gatefall C5.2: thời lượng khóa', () => {
  const cases: [string, () => GatefallFixture][] = [
    ['trượt', F1], ['một chain', F2], ['cascade F4', F4], ['cascade dài', LONG_CASCADE], ['xả bàn', () => F7({ tiltsLeft: 10 })],
  ];

  for (const [name, data] of cases) {
    test(`C5.2 ${name}: khóa đúng lastAnimMs ở tốc độ khung hình thường`, async ({ page }) => {
      await open(page);
      const out = await page.evaluate(async (fx) => {
        const api = window.__game!.gatefall!;
        const read = () => window.__game!.getState<GatefallState>()!;
        api.loadFixture(fx);
        const start = performance.now();
        const accepted = api.tilt('down');
        const first = read();
        while (read().animating) await new Promise((r) => setTimeout(r, 1));
        const elapsed = performance.now() - start;
        const s = read();
        return { accepted, first: first.animating, elapsed, animMs: s.lastAnimMs, expected: window.__qa5!.expectedAnimMs(s.lastEvents), chain: s.lastChain, vent: s.ventCount };
      }, data());
      expect(out.accepted).toBe(true);
      expect(out.first).toBe(true);
      expect(out.animMs).toBe(out.expected);
      expect(out.elapsed).toBeGreaterThanOrEqual(out.animMs);
      expect(out.elapsed).toBeLessThanOrEqual(out.animMs + LOCK_SLACK_MS);
      if (name === 'cascade dài') expect(out.chain).toBeGreaterThanOrEqual(3);
      if (name === 'xả bàn') expect(out.vent).toBe(1);
    });

    test(`C5.2 ${name}: đúng thời lượng ở khoảng 8 FPS`, async ({ page }) => {
      await open(page);
      const out = await page.evaluate(async (fx) => {
        let hogging = true;
        let frames = 0;
        const hog = () => {
          if (!hogging) return;
          frames += 1;
          const until = performance.now() + 120;
          while (performance.now() < until) { /* simulate a slow device */ }
          requestAnimationFrame(hog);
        };
        requestAnimationFrame(hog);
        await new Promise((r) => setTimeout(r, 300));
        const api = window.__game!.gatefall!;
        const read = () => window.__game!.getState<GatefallState>()!;
        api.loadFixture(fx);
        const start = performance.now();
        api.tilt('down');
        const first = read().animating;
        const framesAtStart = frames;
        while (read().animating) await new Promise((r) => setTimeout(r, 1));
        const elapsed = performance.now() - start;
        const framesDuring = frames - framesAtStart;
        hogging = false;
        return { first, elapsed, animMs: read().lastAnimMs, framesDuring };
      }, data());
      expect(out.first).toBe(true);
      expect(out.elapsed).toBeGreaterThanOrEqual(out.animMs);
      expect(out.elapsed).toBeLessThanOrEqual(out.animMs + LOCK_SLACK_MS);
      expect(out.framesDuring / (out.elapsed / 1000), 'phép thử phải thật sự chạy ở FPS thấp').toBeLessThan(12);
    });
  }

  test('C5.2 không có khung hình nào (tab ẩn): vẫn mở khóa đúng lastAnimMs', async ({ page }) => {
    await open(page);
    const out = await page.evaluate(async (fx) => {
      const api = window.__game!.gatefall!;
      const read = () => window.__game!.getState<GatefallState>()!;
      api.loadFixture(fx);
      const loop = window.__qa5!.scene().game.loop;
      loop.sleep();
      const start = performance.now();
      api.tilt('down');
      const animMs = read().lastAnimMs;
      await new Promise((r) => setTimeout(r, Math.max(0, animMs - 40)));
      const before = read().animating;
      await new Promise((r) => setTimeout(r, 60));
      const after = read().animating;
      const elapsed = performance.now() - start;
      const second = api.tilt('up');
      loop.wake();
      return { before, after, elapsed, animMs, second };
    }, F4());
    expect(out.before, 'chưa hết lastAnimMs thì vẫn khóa').toBe(true);
    expect(out.after).toBe(false);
    expect(out.elapsed).toBeLessThanOrEqual(out.animMs + LOCK_SLACK_MS);
    await waitVisualEnd(page);
    await nextFrames(page);
    expect(await page.evaluate(() => window.__qa5!.spriteProblems(true))).toEqual([]);
  });

  test('C5.2 trên 3 màn: lastAnimMs luôn đúng công thức mục 5.3', async ({ page }) => {
    await open(page);
    const wrong = await page.evaluate(() => {
      const api = window.__game!.gatefall!;
      const read = () => window.__game!.getState<GatefallState>()!;
      const out: string[] = [];
      for (const level of [0, 1, 2]) {
        for (let seed = 1; seed <= 15; seed += 1) {
          api.loadLevel(level, seed);
          for (let i = 0; i < 40; i += 1) {
            const s = read();
            if (s.status !== 'playing') break;
            api.tilt(s.validTilts[(i * 7 + seed) % s.validTilts.length]);
            const after = read();
            const expected = window.__qa5!.expectedAnimMs(after.lastEvents);
            if (after.lastAnimMs !== expected) out.push(`L${level} seed ${seed} nước ${i}: ${after.lastAnimMs} != ${expected}`);
            window.__qa5!.skip();
          }
        }
      }
      return out;
    });
    expect(wrong).toEqual([]);
  });
});

test.describe('Gatefall C5.3: khóa nhập khi diễn hoạt', () => {
  test('C5.3 tilt lúc animating trả false, không gọi logic, không xếp hàng, không tăng rejectedTilts', async ({ page }) => {
    await open(page);
    const out = await page.evaluate(async (fx) => {
      const api = window.__game!.gatefall!;
      const read = () => window.__game!.getState<GatefallState>()!;
      api.loadFixture(fx);
      api.tilt('down');
      const locked = read();
      const sim = window.__qa5!.scene().sim;
      const realTilt = sim.tilt;
      let calls = 0;
      sim.tilt = (dir: Dir) => {
        calls += 1;
        return realTilt.call(sim, dir);
      };
      const returned: boolean[] = [];
      while (read().animating) {
        for (const dir of ['up', 'right', 'down', 'left'] as Dir[]) {
          if (read().animating) returned.push(api.tilt(dir));
        }
        await new Promise((r) => setTimeout(r, 5));
      }
      sim.tilt = realTilt;
      const callsWhileLocked = calls;
      await new Promise((r) => setTimeout(r, 400));
      return { locked, returned, callsWhileLocked, after: read() };
    }, F4());
    expect(out.returned.length).toBeGreaterThan(8);
    expect(out.returned.every((value) => value === false)).toBe(true);
    expect(out.callsWhileLocked).toBe(0);
    expect(out.after.tiltsUsed).toBe(out.locked.tiltsUsed);
    expect(out.after.stateHash).toBe(out.locked.stateHash);
    expect(out.after.rejectedTilts).toBe(out.locked.rejectedTilts);
    expect(out.after.rejectFeedbacks).toBe(out.locked.rejectFeedbacks);
    expect(out.after.lastTiltDir).toBe('down');
  });

  test('C5.3 lệnh cuối ngay trước khi mở khóa không được chạy sau đó', async ({ page }) => {
    await open(page);
    const out = await page.evaluate(async (fx) => {
      const api = window.__game!.gatefall!;
      const read = () => window.__game!.getState<GatefallState>()!;
      api.loadFixture(fx);
      const start = performance.now();
      api.tilt('down');
      const animMs = read().lastAnimMs;
      while (performance.now() - start < animMs - 8) { /* stay just inside the lock */ }
      const stillLocked = read().animating;
      const late = api.tilt('up');
      const hash = read().stateHash;
      await new Promise((r) => setTimeout(r, animMs + 200));
      return { stillLocked, late, hash, after: read() };
    }, F1());
    expect(out.stillLocked).toBe(true);
    expect(out.late).toBe(false);
    expect(out.after.stateHash).toBe(out.hash);
    expect(out.after.tiltsUsed).toBe(1);
  });
});

test.describe('Gatefall C5.4: scene khớp createSim', () => {
  for (const level of [0, 1, 2]) {
    test(`C5.4 màn ${level + 1}: 10 nước qua scene và qua createSim cùng hash từng bước`, async ({ page }) => {
      await open(page, level);
      const start = await readState(page);
      const steps: { scene: string; sim: string; sceneEvents: string; simEvents: string }[] = [];
      await page.evaluate(([lv, seed]) => {
        (window as unknown as { __sim: unknown }).__sim = window.__game!.gatefall!.createSim(lv, seed);
      }, [level, start.seed] as const);
      expect(await page.evaluate(() => (window as unknown as { __sim: { getState(): GatefallState } }).__sim.getState().stateHash))
        .toBe(start.stateHash);
      for (let i = 0; i < 10; i += 1) {
        const step = await page.evaluate((index) => {
          const s = window.__game!.getState<GatefallState>()!;
          if (s.status !== 'playing') return null;
          const dir = s.validTilts[(index * 3 + 1) % s.validTilts.length];
          const sim = (window as unknown as { __sim: { tilt(d: Dir): unknown; getState(): GatefallState } }).__sim;
          window.__game!.gatefall!.tilt(dir);
          sim.tilt(dir);
          const a = window.__game!.getState<GatefallState>()!;
          const b = sim.getState();
          return { scene: a.stateHash, sim: b.stateHash, sceneEvents: JSON.stringify(a.lastEvents), simEvents: JSON.stringify(b.lastEvents) };
        }, i);
        expect(step, `nước ${i}`).not.toBeNull();
        steps.push(step!);
        await waitUnlocked(page);
      }
      expect(steps).toHaveLength(10);
      for (const step of steps) {
        expect(step.scene).toBe(step.sim);
        expect(step.sceneEvents).toBe(step.simEvents);
      }
    });
  }
});

test.describe('Gatefall C5.5: nghiêng không hợp lệ', () => {
  test('C5.5 rejectedTilts và rejectFeedbacks cùng tăng 1, không khóa, hash không đổi', async ({ page }) => {
    await open(page);
    const out = await page.evaluate((fx) => {
      const api = window.__game!.gatefall!;
      const read = () => window.__game!.getState<GatefallState>()!;
      api.loadFixture(fx);
      const steps = [];
      for (let i = 0; i < 5; i += 1) {
        const before = read();
        const returned = api.tilt('down');
        const after = read();
        steps.push({ before, returned, after });
      }
      return steps;
    }, REJECT());
    for (const { before, returned, after } of out) {
      expect(returned).toBe(false);
      expect(after.rejectedTilts).toBe(before.rejectedTilts + 1);
      expect(after.rejectFeedbacks).toBe(before.rejectFeedbacks + 1);
      expect(after.animating).toBe(false);
      expect(after.stateHash).toBe(before.stateHash);
      expect(after.tiltsUsed).toBe(before.tiltsUsed);
      expect(after.lastEvents.map((e) => e.type)).toEqual(['tiltRejected']);
    }
  });

  test('C5.5 rung báo lỗi trả bàn về đúng vị trí và không chặn nước hợp lệ ngay sau đó', async ({ page }) => {
    await open(page);
    const out = await page.evaluate(async (fx) => {
      const api = window.__game!.gatefall!;
      api.loadFixture(fx);
      api.tilt('down');
      const acceptedDuringShake = api.tilt('up');
      const read = () => window.__game!.getState<GatefallState>()!;
      while (read().animating) await new Promise((r) => setTimeout(r, 2));
      api.tilt('right');
      api.tilt('right');
      await new Promise((r) => setTimeout(r, 500));
      const layer = window.__qa5!.scene().layer;
      return { acceptedDuringShake, x: layer.x, y: layer.y };
    }, REJECT());
    expect(out.acceptedDuringShake).toBe(true);
    expect([out.x, out.y]).toEqual([0, 0]);
  });

  test('C5.5 gfRejectShakeMs = 0 vẫn đếm phản hồi và không lỗi', async ({ page }) => {
    await open(page);
    const out = await page.evaluate((fx) => {
      window.__game!.tuning.gfRejectShakeMs = 0;
      const api = window.__game!.gatefall!;
      api.loadFixture(fx);
      api.tilt('down');
      return window.__game!.getState<GatefallState>()!;
    }, REJECT());
    expect(out.rejectedTilts).toBe(1);
    expect(out.rejectFeedbacks).toBe(1);
    expect(out.animating).toBe(false);
    await nextFrames(page);
  });

  for (const [name, data] of [
    ['thắng', () => ({ ...F4(), tiltsLeft: 1, collected: [24, 21, 0, 0] })],
    ['thua', () => ({ ...F1(), tiltsLeft: 1 })],
  ] as [string, () => GatefallFixture][]) {
    test(`C5.5 sau khi ${name}: tilt bị từ chối, hai bộ đếm cùng tăng`, async ({ page }) => {
      await open(page);
      const out = await page.evaluate((fx) => {
        const api = window.__game!.gatefall!;
        const read = () => window.__game!.getState<GatefallState>()!;
        api.loadFixture(fx);
        api.tilt('down');
        window.__qa5!.skip();
        const before = read();
        const returned = api.tilt('up');
        return { before, returned, after: read() };
      }, data());
      expect(out.before.status).toBe(name === 'thắng' ? 'won' : 'lost');
      expect(out.returned).toBe(false);
      expect(out.after.rejectedTilts).toBe(out.before.rejectedTilts + 1);
      expect(out.after.rejectFeedbacks).toBe(out.before.rejectFeedbacks + 1);
      expect(out.after.stateHash).toBe(out.before.stateHash);
    });
  }
});

test.describe('Gatefall C5: nạp màn và chơi lại khi đang diễn hoạt', () => {
  test('loadLevel giữa diễn hoạt: hủy ngay, đồng bộ sprite, đặt lại rejectFeedbacks', async ({ page }) => {
    await open(page);
    const out = await page.evaluate((fx) => {
      const api = window.__game!.gatefall!;
      api.loadFixture({ ...fx });
      api.tilt('up');
      api.tilt('down');
      const during = window.__game!.getState<GatefallState>()!.animating;
      api.loadLevel(2);
      const s = window.__game!.getState<GatefallState>()!;
      return { during, s, sprites: window.__qa5!.spriteProblems(true) };
    }, F4());
    expect(out.during).toBe(true);
    expect(out.s.animating).toBe(false);
    expect(out.s.levelIndex).toBe(2);
    expect(out.s.collected).toHaveLength(6);
    expect(out.s.rejectFeedbacks).toBe(0);
    expect(out.s.viewCounts.pieces).toBe(countBoard(out.s.board));
    expect(out.s.viewCounts.gatePieces).toBe(countGates(out.s.gates));
    expect(out.sprites).toEqual([]);
    await nextFrames(page);
    expect(await page.evaluate(() => window.__qa5!.spriteProblems(true))).toEqual([]);
  });

  test('loadFixture giữa diễn hoạt và đặt lại rejectFeedbacks', async ({ page }) => {
    await open(page);
    const out = await page.evaluate(([reject, fx]) => {
      const api = window.__game!.gatefall!;
      api.loadFixture(reject);
      api.tilt('down');
      const counted = window.__game!.getState<GatefallState>()!.rejectFeedbacks;
      api.loadFixture(fx);
      api.tilt('down');
      api.loadFixture(fx);
      const s = window.__game!.getState<GatefallState>()!;
      return { counted, s, sprites: window.__qa5!.spriteProblems(true) };
    }, [REJECT(), F2()] as const);
    expect(out.counted).toBe(1);
    expect(out.s.animating).toBe(false);
    expect(out.s.rejectFeedbacks).toBe(0);
    expect(out.s.tiltsUsed).toBe(0);
    expect(out.sprites).toEqual([]);
  });

  test('fixture sai ném lỗi, giữ nguyên màn và diễn hoạt đang chạy', async ({ page }) => {
    await open(page, 1);
    const out = await page.evaluate((fx) => {
      const api = window.__game!.gatefall!;
      const read = () => window.__game!.getState<GatefallState>()!;
      const s0 = read();
      api.tilt(s0.validTilts[0]);
      const before = read();
      const attempts = [
        { ...fx, board: fx.board.slice(1) },
        { ...fx, gates: { ...fx.gates, left: [] } },
        { ...fx, board: fx.board.map((row) => row.map(() => 9)) },
      ].map((bad) => {
        try {
          api.loadFixture(bad as GatefallFixture);
          return 'no error';
        } catch (error) {
          return (error as Error).name;
        }
      });
      const after = read();
      return { attempts, before, after };
    }, F1());
    expect(out.attempts).toEqual(['RangeError', 'RangeError', 'RangeError']);
    expect(out.after.stateHash).toBe(out.before.stateHash);
    expect(out.after.levelIndex).toBe(1);
    expect(out.after.animating).toBe(true);
    await waitVisualEnd(page);
    await nextFrames(page);
    expect(await page.evaluate(() => window.__qa5!.spriteProblems(true))).toEqual([]);
  });

  for (const [name, data, dir] of [
    ['cascade', F4, 'down'],
    ['xả bàn', () => F7({ tiltsLeft: 10 }), 'down'],
    ['thường', F1, 'down'],
  ] as [string, () => GatefallFixture, Dir][]) {
    for (const fraction of [0, 0.3, 0.7, 0.98, 1.05]) {
      test(`restart() lúc ${name} ở ${Math.round(fraction * 100)}% diễn hoạt về đúng đầu màn`, async ({ page }) => {
        await open(page);
        await page.evaluate((fx) => window.__game!.gatefall!.loadFixture(fx), data());
        const initial = await readState(page);
        await page.evaluate(async ([d, f]) => {
          const api = window.__game!.gatefall!;
          const start = performance.now();
          api.tilt(d as Dir);
          const animMs = window.__game!.getState<GatefallState>()!.lastAnimMs;
          while (performance.now() - start < animMs * (f as number)) await new Promise((r) => setTimeout(r, 1));
          window.__game!.restart();
        }, [dir, fraction] as const);
        await page.waitForFunction((hash) => {
          const s = window.__game?.getState<GatefallState>();
          return s?.stateHash === hash && s.tiltsUsed === 0 && s.animating === false;
        }, initial.stateHash);
        await nextFrames(page);
        const after = await readState(page);
        expect(after.rejectFeedbacks).toBe(0);
        expect(after.rejectedTilts).toBe(0);
        expect(after.viewCounts.pieces).toBe(countBoard(after.board));
        expect(after.viewCounts.gatePieces).toBe(countGates(after.gates));
        expect(await page.evaluate(() => window.__qa5!.spriteProblems(true))).toEqual([]);
        expect(await page.evaluate((d) => window.__game!.gatefall!.tilt(d), dir)).toBe(true);
        await waitVisualEnd(page);
        await nextFrames(page);
        expect(await page.evaluate(() => window.__qa5!.spriteProblems(true))).toEqual([]);
      });
    }
  }

  test('restart liên tiếp trong lúc diễn hoạt 25 lần không lỗi, không rò rỉ', async ({ page }) => {
    await open(page);
    const initial = await readState(page);
    const counts = new Set<string>();
    for (let i = 0; i < 25; i += 1) {
      await page.evaluate((index) => {
        const s = window.__game!.getState<GatefallState>()!;
        window.__game!.gatefall!.tilt(s.validTilts[index % s.validTilts.length]);
        window.__game!.restart();
        if (index % 5 === 0) window.__game!.restart();
      }, i);
      await page.waitForFunction((hash) => {
        const s = window.__game?.getState<GatefallState>();
        return s?.stateHash === hash && s.tiltsUsed === 0 && s.animating === false;
      }, initial.stateHash);
      await nextFrames(page);
      counts.add(await page.evaluate(() => {
        const scene = window.__qa5!.scene();
        return `${scene.children.list.length}/${scene.layer.list.length}/${scene.views.size}`;
      }));
      expect(await page.evaluate(() => window.__qa5!.spriteProblems(true))).toEqual([]);
    }
    expect([...counts]).toHaveLength(1);
  });
});

test.describe('Gatefall C5: bộ kiểm tra của bản dev', () => {
  test('Phát lại lệch animMs thì ghi console.error', async ({ page }) => {
    allowedErrors = [/replay is \d+ ms but animMs is \d+ ms/];
    await open(page);
    await page.evaluate((fx) => {
      window.__game!.gatefall!.loadFixture(fx);
      window.__qa5!.scene().config.enterMs += 10;
      window.__game!.gatefall!.tilt('down');
    }, fixture([[2, 1, 0]], { gates: { ...emptyGates(), down: [null, null, null, 1, null, null, null] } }));
    await expect.poll(() => problems.some((text) => /replay is \d+ ms/.test(text))).toBe(true);
  });

  test('Sprite lệch logic thì ghi console.error', async ({ page }) => {
    allowedErrors = [/sprites do not match the logic state/];
    await open(page);
    await page.evaluate((fx) => {
      const api = window.__game!.gatefall!;
      api.loadFixture(fx);
      api.tilt('down');
      const scene = window.__qa5!.scene();
      scene.cellViews[6][2]!.color = 3;
    }, F1());
    await expect.poll(() => problems.some((text) => /sprites do not match/.test(text))).toBe(true);
  });

  test('Rò rỉ sprite thì ghi console.error', async ({ page }) => {
    allowedErrors = [/live sprites for/];
    await open(page);
    await page.evaluate((fx) => {
      const api = window.__game!.gatefall!;
      api.loadFixture(fx);
      api.tilt('down');
      const scene = window.__qa5!.scene();
      const stray = scene.add.image(10, 10, 'gf-piece-0');
      (scene.layer as unknown as { add(child: unknown): void }).add(stray);
    }, F1());
    await expect.poll(() => problems.some((text) => /live sprites for/.test(text))).toBe(true);
  });
});

test.describe('Gatefall C5: chơi dài', () => {
  test('Chơi 18 ván trên 3 màn, xen thua, thắng, restart: không rò rỉ sprite, không lỗi', async ({ page }) => {
    test.setTimeout(120_000);
    await open(page);
    const ends = { won: 0, lost: 0 };
    const baseline = new Map<number, string>();
    for (let game = 0; game < 18; game += 1) {
      const level = game % 3;
      const out = await page.evaluate(async ([lv, g]) => {
        const api = window.__game!.gatefall!;
        const read = () => window.__game!.getState<GatefallState>()!;
        api.loadLevel(lv, 1000 + g);
        const scene = window.__qa5!.scene();
        // Each Text owns a texture and levels differ in goal rows, so this is compared per level.
        const shape = `${scene.children.list.length}/${scene.layer.list.length - scene.views.size}/${Object.keys(scene.textures.list).length}`;
        const planner = api.createSim(lv, 1000 + g);
        const greedy = g % 2 === 0;
        const failures: string[] = [];
        for (let i = 0; i < 60; i += 1) {
          const s = read();
          if (s.status !== 'playing') break;
          let dir = s.validTilts[(i * 5 + g) % s.validTilts.length];
          if (greedy) {
            let best = -Infinity;
            for (const option of s.validTilts) {
              const p = planner.preview(option, { useGates: true });
              const score = 10 * p.useful + p.cleared - (p.wouldVent ? 30 : 0);
              if (score > best) {
                best = score;
                dir = option;
              }
            }
          }
          planner.tilt(dir);
          if (!api.tilt(dir)) failures.push(`nước ${i} bị từ chối`);
          if (i % 4 === 0) await new Promise((r) => requestAnimationFrame(r));
          window.__qa5!.skip();
          const after = read();
          if (after.viewCounts.pieces !== after.board.flat().filter((c) => c !== null).length) failures.push(`pieces nước ${i}`);
          if (after.stateHash !== planner.getState().stateHash) failures.push(`hash lệch sim nước ${i}`);
        }
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const end = read();
        return { shape, failures, status: end.status, sprites: window.__qa5!.spriteProblems(false) };
      }, [level, game] as const);
      expect(out.failures, `ván ${game}`).toEqual([]);
      expect(out.sprites, `ván ${game}`).toEqual([]);
      expect(out.status, `ván ${game}`).not.toBe('playing');
      ends[out.status as 'won' | 'lost'] += 1;
      if (!baseline.has(level)) baseline.set(level, out.shape);
      expect(out.shape, `ván ${game}: số đối tượng đầu màn`).toBe(baseline.get(level));
      if (game % 6 === 5) {
        await page.evaluate(() => window.__game!.restart());
        await page.waitForFunction(() => window.__game?.getState<GatefallState>()?.tiltsUsed === 0);
        await nextFrames(page);
        await installQa5Again(page);
      }
    }
    expect(ends.lost, 'phải có ván thua').toBeGreaterThan(0);
    expect(ends.won, 'phải có ván thắng').toBeGreaterThan(0);
  });
});

test.describe('Gatefall C5: tình huống biên', () => {
  test('restart rồi tilt ngay trong cùng tick vẫn về đúng đầu màn', async ({ page }) => {
    await open(page);
    const initial = await readState(page);
    await page.evaluate(() => {
      const s = window.__game!.getState<GatefallState>()!;
      window.__game!.gatefall!.tilt(s.validTilts[0]);
      window.__game!.restart();
      window.__game!.gatefall!.tilt(s.validTilts[0]);
    });
    await page.waitForFunction((hash) => {
      const s = window.__game?.getState<GatefallState>();
      return s?.stateHash === hash && s.tiltsUsed === 0 && s.animating === false;
    }, initial.stateHash);
    await nextFrames(page);
    expect(await page.evaluate(() => window.__qa5!.spriteProblems(true))).toEqual([]);
  });

  const extremes: [string, Record<string, number>][] = [
    ['nhịp nhỏ nhất', { gfSlideMsPerCell: 20, gfSlideMaxMs: 120, gfEnterMs: 60, gfClearPrepMs: 0, gfClearMs: 100, gfChainPauseMs: 0, gfVentMs: 150, gfRejectShakeMs: 0 }],
    ['nhịp lớn nhất', { gfSlideMsPerCell: 90, gfSlideMaxMs: 400, gfEnterMs: 240, gfClearPrepMs: 120, gfClearMs: 300, gfChainPauseMs: 160, gfVentMs: 600, gfRejectShakeMs: 200 }],
    ['bàn 6, đợt 2', { gfBoardSize: 6, gfWaveSize: 2, gfInitialPieces: 16 }],
    ['bàn 8, đợt 5', { gfBoardSize: 8, gfWaveSize: 5, gfInitialPieces: 34 }],
  ];
  for (const [name, values] of extremes) {
    test(`Biên TUNING ${name}: phát lại khớp animMs và sprite khớp logic`, async ({ page }) => {
      await open(page);
      const out = await page.evaluate(async (tune) => {
        Object.assign(window.__game!.tuning, tune);
        const api = window.__game!.gatefall!;
        const read = () => window.__game!.getState<GatefallState>()!;
        const failures: string[] = [];
        let moves = 0;
        for (const level of [0, 1, 2]) {
          for (let seed = 1; seed <= 4; seed += 1) {
            api.loadLevel(level, seed);
            for (let i = 0; i < 40; i += 1) {
              const s = read();
              if (s.status !== 'playing') break;
              api.tilt(s.validTilts[(i * 3 + seed) % s.validTilts.length]);
              moves += 1;
              const after = read();
              if (after.lastAnimMs !== window.__qa5!.expectedAnimMs(after.lastEvents)) failures.push(`animMs L${level} s${seed} n${i}`);
              window.__qa5!.skip();
              if (i % 5 === 0) {
                await new Promise((r) => requestAnimationFrame(r));
                failures.push(...window.__qa5!.spriteProblems(false).map((text) => `L${level} s${seed} n${i}: ${text}`));
              }
            }
          }
        }
        return { failures: failures.slice(0, 10), moves };
      }, values);
      expect(out.failures).toEqual([]);
      expect(out.moves).toBeGreaterThan(100);
    });
  }

  test('Chơi thời gian thực 30 giây, bấm dồn ở thời điểm ngẫu nhiên có seed, xen restart', async ({ page }) => {
    test.setTimeout(75_000);
    await open(page);
    const out = await page.evaluate(async (slackMs) => {
      let state = 0x2f6e2b1;
      const random = () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      const api = window.__game!.gatefall!;
      const read = () => window.__game!.getState<GatefallState>() ?? null;
      const dirs: Dir[] = ['up', 'right', 'down', 'left'];
      const failures: string[] = [];
      const qa = window.__qa5!;
      const end = performance.now() + 30_000;
      let accepted = 0;
      let lockedRefused = 0;
      let restarts = 0;
      let games = 0;
      /** Attempts that land in the last 5 ms and 20 ms of a lock: the reach of the test against an early unlock. */
      let lastFive = 0;
      let lastTwenty = 0;
      /**
       * Accept instant and lastAnimMs of the last accepted tilt, kept by the test so an early unlock in the scene
       * cannot also move the expectation. With the clock frozen, `acceptAt` is the very value the scene stored as
       * the replay start, and `now - acceptAt` is the same subtraction the scene does, so there is no rounding gap.
       */
      let acceptAt = -Infinity;
      let acceptAnimMs = 0;

      /** Runs with the clock stopped: the state read and the tilt see the same instant, so no gap and no tolerance. */
      const step = (): number => {
        const s = read();
        if (!s) return 5;
        if (s.status !== 'playing') {
          games += 1;
          api.loadLevel(games % 3, 1 + games);
          acceptAt = -Infinity;
          return 0;
        }
        if (s.tiltsUsed === 0) acceptAt = -Infinity;
        const now = qa.now();
        const elapsed = now - acceptAt;
        // C5.2: the lock may not end before lastAnimMs and must end by lastAnimMs + 250.
        const mustLock = elapsed < acceptAnimMs;
        const mayLock = elapsed < acceptAnimMs + slackMs;
        if (mustLock && acceptAnimMs - elapsed <= 5) lastFive += 1;
        if (mustLock && acceptAnimMs - elapsed <= 20) lastTwenty += 1;
        if (mustLock && !s.animating) failures.push(`mở khóa sớm: animating=false sau ${elapsed} ms, lastAnimMs=${acceptAnimMs}`);
        if (!mayLock && s.animating) failures.push(`còn khóa sau ${elapsed} ms, quá lastAnimMs + ${slackMs}`);
        const dir = dirs[Math.floor(random() * 4)];
        const before = s.stateHash;
        const result = api.tilt(dir);
        // C5.3: refused while animating. mustLock is checked on its own, so dropping the lock and the flag together is caught.
        if (s.animating || mustLock) {
          if (result) failures.push('tilt được nhận khi đang khóa');
          const after = read()!;
          if (after.stateHash !== before) failures.push('hash đổi khi đang khóa');
          if (after.tiltsUsed !== s.tiltsUsed) failures.push('tiltsUsed đổi khi đang khóa');
          lockedRefused += 1;
        } else if (result) {
          accepted += 1;
          acceptAt = now;
          acceptAnimMs = read()!.lastAnimMs;
        } else if (s.validTilts.includes(dir)) {
          failures.push('hướng hợp lệ bị từ chối sau khi đã hết khóa');
        }
        if (random() < 0.004) {
          window.__game!.restart();
          restarts += 1;
          return 30;
        }
        return random() * 45;
      };

      while (performance.now() < end) {
        qa.freeze(qa.now());
        let pauseMs: number;
        try {
          pauseMs = step();
        } finally {
          qa.freeze(null);
        }
        await new Promise((r) => setTimeout(r, pauseMs));
      }
      while (!read() || read()!.animating) await new Promise((r) => setTimeout(r, 5));
      await new Promise((r) => setTimeout(r, 400));
      failures.push(...window.__qa5!.spriteProblems(true));
      return { failures, accepted, lockedRefused, restarts, games, lastFive, lastTwenty };
    }, LOCK_SLACK_MS);
    console.log(`[c5-realtime] ${JSON.stringify({ ...out, failures: out.failures.slice(0, 5), failureCount: out.failures.length })}`);
    expect(out.failures).toEqual([]);
    expect(out.accepted).toBeGreaterThan(15);
    expect(out.lockedRefused).toBeGreaterThan(50);
    // Enough attempts land right before the unlock for an early unlock to be seen. Over 20 runs the last 20 ms got
    // 22 to 40 attempts and the last 5 ms got 2 to 16, so only the 20 ms count is a stable floor; lastFive is logged.
    expect(out.lastTwenty).toBeGreaterThan(10);
  });
});

/** restart keeps the same scene instance, so the capture stays valid; this only asserts that. */
const installQa5Again = async (page: Page) => {
  expect(await page.evaluate(() => window.__qa5!.scene().layer.list.length)).toBeGreaterThan(0);
};

const shots: [string, { width: number; height: number }, boolean][] = [
  ['960x540', { width: 960, height: 540 }, false],
  ['844x390', { width: 844, height: 390 }, true],
];

for (const [label, viewport, touch] of shots) {
  test.describe(`Gatefall C5: ảnh ${label}`, () => {
    test.use({ viewport, hasTouch: touch, isMobile: touch });

    test(`Ảnh ${label}: đầu màn, giữa diễn hoạt, thắng, thua, 6 màu`, async ({ page }) => {
      test.setTimeout(60_000);
      await open(page);
      const shoot = (name: string) => page.screenshot({ path: `artifacts/gatefall-c5-${label}-${name}.png` });
      await nextFrames(page);
      await shoot('start');

      await page.evaluate((fx) => window.__game!.gatefall!.loadFixture(fx), F4());
      await nextFrames(page);
      for (const [name, fraction] of [['mid-slide', 0.08], ['mid-clear', 0.35], ['mid-chain', 0.7]] as const) {
        await page.evaluate(([fx, f]) => {
          const api = window.__game!.gatefall!;
          api.loadFixture(fx as GatefallFixture);
          const start = window.__qa5!.now();
          api.tilt('down');
          window.__qa5!.freeze(start + window.__game!.getState<GatefallState>()!.lastAnimMs * (f as number));
        }, [F4(), fraction] as const);
        await nextFrames(page);
        await shoot(name);
        await page.evaluate(() => {
          window.__qa5!.freeze(null);
          window.__qa5!.skip();
        });
      }

      await page.evaluate((fx) => {
        const api = window.__game!.gatefall!;
        api.loadFixture(fx);
        api.tilt('down');
        window.__qa5!.skip();
      }, { ...F4(), tiltsLeft: 1, collected: [24, 21, 0, 0] });
      await waitVisualEnd(page);
      await nextFrames(page);
      expect((await readState(page)).status).toBe('won');
      await shoot('won');

      await page.evaluate((fx) => {
        const api = window.__game!.gatefall!;
        api.loadFixture(fx);
        api.tilt('down');
        window.__qa5!.skip();
      }, { ...F1(), tiltsLeft: 1 });
      await waitVisualEnd(page);
      await nextFrames(page);
      expect((await readState(page)).status).toBe('lost');
      await shoot('lost');

      await page.evaluate((fx) => {
        const api = window.__game!.gatefall!;
        api.loadLevel(2);
        api.loadFixture(fx);
      }, SIX_COLORS());
      await nextFrames(page);
      const six = await readState(page);
      expect(six.colorCount).toBe(6);
      expect(new Set(six.board.flat().filter((c) => c !== null)).size).toBe(6);
      await shoot('six-colors');
      await page.addStyleTag({ content: 'canvas { filter: grayscale(1) !important; }' });
      await nextFrames(page);
      await shoot('six-colors-gray');

      const bounds = await page.evaluate(() => window.__qa5!.sprites().map((s) => ({ x: s.x, y: s.y })));
      for (const s of bounds) {
        expect(s.x).toBeGreaterThan(0);
        expect(s.x).toBeLessThan(960);
        expect(s.y).toBeGreaterThan(0);
        expect(s.y).toBeLessThan(540);
      }
    });
  });
}
