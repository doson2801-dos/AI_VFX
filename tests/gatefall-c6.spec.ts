import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { classifySwipe } from '../src/game/controls';
import type { Dir, GatefallFixture } from '../src/game/gatefallLogic';
import type { GatefallState } from '../src/scenes/GatefallScene';

/**
 * Gatefall C6 acceptance. Criteria come from section 3 and section 8 (C6) of docs/briefs/gatefall.md.
 * Controls are driven only by real input: page.keyboard and CDP touch events. `loadFixture` and `loadLevel`
 * only set up a situation. The debug `tilt` is never called here.
 * Blur and visibilitychange are dispatched on the page, so they stand in for a real hidden tab.
 */

type Board = (number | null)[][];
type Gates = Record<Dir, (number | null)[]>;
interface Box { left: number; top: number; right: number; bottom: number }
interface Point { x: number; y: number }

const DIRS: Dir[] = ['up', 'right', 'down', 'left'];
const SIZE = 7;
const KEY: Record<Dir, string> = { up: 'ArrowUp', right: 'ArrowRight', down: 'ArrowDown', left: 'ArrowLeft' };
const VECTOR: Record<Dir, Point> = { up: { x: 0, y: -1 }, right: { x: 1, y: 0 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 } };
const GAME_W = 960;
const GAME_H = 540;
/** A spot on the board, away from every DOM button. */
const SWIPE_FROM: Point = { x: 620, y: 270 };
const PHONE = { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true };

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

/** One piece in the middle: every direction is valid, in any order, for four tilts. */
const FOUR_WAY = () => fixture([[3, 3, 0]]);
const F1_LAST_TILT = () => fixture([[2, 1, 0], [2, 4, 1]], { tiltsLeft: 1 });
const F2_CELLS: [number, number, number][] = [[0, 5, 1], [1, 6, 1], [2, 5, 1], [4, 5, 0], [5, 6, 0], [6, 5, 0]];
/** Three-step cascade on `down`: its replay is long enough for a second real input to land inside it. */
const LONG_CASCADE = () => fixture([
  [0, 5, 0], [1, 5, 0], [2, 5, 0], [3, 5, 1], [4, 5, 2],
  [0, 4, 2], [1, 4, 1], [2, 4, 1],
  [1, 3, 2], [2, 3, 2],
]);

const collectProblems = (page: Page) => {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    // Same rule as the other specs: errors fail. The software GL driver logs occasional warnings on every route.
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
  });
  return problems;
};

const read = (page: Page) => page.evaluate(() => window.__game!.getState<GatefallState>()!);

const open = async (page: Page) => {
  const problems = collectProblems(page);
  await page.goto('/?game=gatefall');
  await page.waitForFunction(() => window.__game?.getState<GatefallState>()?.status === 'playing');
  return problems;
};

const settle = (page: Page) =>
  page.waitForFunction(() => window.__game!.getState<GatefallState>()!.animating === false, null, { timeout: 8_000 });

const lockOver = (page: Page) =>
  page.waitForFunction(() => {
    const state = window.__game!.getState<GatefallState>()!;
    return !state.animating && state.endLockLeftMs === 0;
  }, null, { timeout: 8_000 });

const load = async (page: Page, data: GatefallFixture, level = 0) => {
  await page.evaluate(({ data, level }) => {
    window.__game!.gatefall!.loadLevel(level);
    window.__game!.gatefall!.loadFixture(data);
  }, { data, level });
};

/** F2 clears three of color 0 and three of color 1, which finishes every goal of the level. */
const loadWin = async (page: Page, level = 0) => {
  await page.evaluate(({ cells, level, size }) => {
    const api = window.__game!;
    api.gatefall!.loadLevel(level);
    const state = api.getState<GatefallState>()!;
    const collected = new Array<number>(state.colorCount).fill(0);
    for (const goal of state.goals) collected[goal.color] = goal.color < 2 ? goal.target - 3 : goal.target;
    const board: Board = Array.from({ length: size }, () => new Array<number | null>(size).fill(null));
    for (const [x, y, color] of cells) board[y][x] = color;
    const gates = () => new Array<number | null>(size).fill(null);
    api.gatefall!.loadFixture({ board, gates: { up: gates(), right: gates(), down: gates(), left: gates() }, collected });
  }, { cells: F2_CELLS, level, size: SIZE });
};

const winByKey = async (page: Page, level = 0) => {
  await loadWin(page, level);
  await page.keyboard.press('ArrowDown');
  expect((await read(page)).status).toBe('won');
};

const toScreen = (page: Page, point: Point) =>
  page.evaluate(({ point, w }) => {
    const rect = document.querySelector('canvas')!.getBoundingClientRect();
    const scale = rect.width / w;
    return { x: rect.left + point.x * scale, y: rect.top + point.y * scale, scale };
  }, { point, w: GAME_W });

const centerOf = async (page: Page, selector: string): Promise<Point> => {
  const box = (await page.locator(selector).boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

interface PointerRecord { type: string; x: number; y: number; t: number }
type QaPointerWindow = Window & { __qaPointerLog?: PointerRecord[] };

/**
 * Real multi-finger touch. A traced fact of CDP: a finger left out of a touchMove is NOT lifted.
 * Lifting one finger takes a touchEnd that lists that finger, so `up` sends that and proves its pointerup arrived.
 */
class Fingers {
  private active = new Map<number, Point>();

  private constructor(private cdp: CDPSession, private page: Page) {}

  static async on(page: Page) {
    await page.evaluate(() => {
      const w = window as QaPointerWindow;
      if (w.__qaPointerLog) return;
      const log: PointerRecord[] = [];
      w.__qaPointerLog = log;
      for (const type of ['pointerup', 'pointercancel']) {
        window.addEventListener(type, (event) => {
          const e = event as PointerEvent;
          log.push({ type, x: e.clientX, y: e.clientY, t: e.timeStamp });
        }, true);
      }
    });
    return new Fingers(await page.context().newCDPSession(page), page);
  }

  private points() {
    return [...this.active].map(([id, p]) => ({ id, x: p.x, y: p.y }));
  }

  async down(id: number, at: Point) {
    this.active.set(id, at);
    await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: this.points() });
  }

  async move(id: number, to: Point, steps = 1) {
    const from = this.active.get(id)!;
    for (let i = 1; i <= steps; i += 1) {
      this.active.set(id, { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps });
      await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: this.points() });
    }
  }

  async up(id: number) {
    const lifted = this.active.get(id)!;
    this.active.delete(id);
    const seen = await this.page.evaluate(() => (window as QaPointerWindow).__qaPointerLog!.length);
    await this.cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: this.active.size > 0 ? [{ id, x: lifted.x, y: lifted.y }] : [],
    });
    await this.page.waitForFunction(({ seen, x, y }) => (window as QaPointerWindow).__qaPointerLog!.slice(seen)
      .some((e) => e.type === 'pointerup' && Math.abs(e.x - x) <= 2 && Math.abs(e.y - y) <= 2),
    { seen, x: lifted.x, y: lifted.y }, { timeout: 2_000, polling: 10 });
  }

  async cancel() {
    this.active.clear();
    await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  }
}

/** A straight swipe given in game pixels, so the distance means the same at every canvas scale. */
const swipeGame = async (page: Page, fingers: Fingers, dx: number, dy: number, from: Point = SWIPE_FROM) => {
  const start = await toScreen(page, from);
  await fingers.down(1, { x: start.x, y: start.y });
  await fingers.move(1, { x: start.x + dx * start.scale, y: start.y + dy * start.scale }, 4);
  await fingers.up(1);
};

const swipeDir = (page: Page, fingers: Fingers, dir: Dir, px = 90) =>
  swipeGame(page, fingers, VECTOR[dir].x * px, VECTOR[dir].y * px);

const tapElement = async (page: Page, fingers: Fingers, selector: string) => {
  const at = await centerOf(page, selector);
  await fingers.down(5, at);
  await fingers.up(5);
};

/** Measures from the input event to the first frame that shows a clean restart of the level. */
const armResetClock = (page: Page, eventType: 'keydown' | 'pointerup', hash: string) =>
  page.evaluate(({ eventType, hash }) => {
    const qa = window as unknown as { __qaResetMs?: number };
    qa.__qaResetMs = undefined;
    window.addEventListener(eventType, () => {
      const t0 = performance.now();
      const poll = () => {
        const s = window.__game!.getState<GatefallState>()!;
        if (s.stateHash === hash && s.status === 'playing' && s.tiltsUsed === 0 && !s.animating) {
          qa.__qaResetMs = performance.now() - t0;
        } else requestAnimationFrame(poll);
      };
      poll();
    }, { once: true, capture: true });
  }, { eventType, hash });

const expectResetWithin200 = async (page: Page, hash: string) => {
  await page.waitForFunction(() => (window as unknown as { __qaResetMs?: number }).__qaResetMs !== undefined);
  const ms = await page.evaluate(() => (window as unknown as { __qaResetMs: number }).__qaResetMs);
  expect(ms).toBeLessThanOrEqual(200);
  const state = await read(page);
  expect(state).toMatchObject({ stateHash: hash, status: 'playing', tiltsUsed: 0, animating: false });
};

/** Picks moves with the C4 scoring on a private sim, so both playthroughs get the same list. */
const planLevelOne = (page: Page) =>
  page.evaluate(() => {
    const live = window.__game!.getState<GatefallState>()!;
    const sim = window.__game!.gatefall!.createSim(live.levelIndex, live.seed);
    const moves: Dir[] = [];
    while (sim.getState().status === 'playing' && moves.length < 60) {
      let best: Dir | null = null;
      let bestScore = -Infinity;
      for (const dir of sim.validTilts()) {
        const p = sim.preview(dir, { useGates: true });
        const value = 10 * p.useful + p.cleared - (p.wouldVent ? 30 : 0);
        if (value > bestScore) {
          bestScore = value;
          best = dir;
        }
      }
      moves.push(best!);
      sim.tilt(best!);
    }
    return { moves, status: sim.getState().status, hash: sim.getState().stateHash };
  });

const visible = (page: Page, id: string) =>
  page.evaluate((id) => getComputedStyle(document.getElementById(id)!).display !== 'none', id);

/** Read-only view of the running scene's layout and HUD, in game pixels. */
const readLayout = (page: Page) =>
  page.evaluate(async () => {
    const entry = performance.getEntriesByType('resource').map((r) => r.name)
      .find((name) => name.includes('/src/scenes/GatefallScene.ts'));
    const module = await import(/* @vite-ignore */ entry!);
    const proto = module.GatefallScene.prototype;
    const original = proto.getState;
    interface TextLike { visible: boolean; text: string; getBounds(): { left: number; top: number; right: number; bottom: number } }
    let scene: Record<string, unknown> | null = null;
    proto.getState = function capture(this: Record<string, unknown>) {
      scene = this;
      return original.call(this);
    };
    window.__game!.getState();
    proto.getState = original;
    const s = scene as unknown as {
      layout: { left: number; top: number; boardPx: number; gateDepth: number };
      levelText: TextLike; tiltsText: TextLike; messageText: TextLike; hintText: TextLike;
      endText: TextLike; endDetailText: TextLike; endBackdrop: TextLike;
      goalRows: { text: TextLike }[];
      gateLabels: TextLike[];
      input: { manager: { touch?: { capture: boolean } } };
    };
    const box = (t: TextLike) => {
      const b = t.getBounds();
      return { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
    };
    const shown = (list: TextLike[]) => list.filter((t) => t.visible && t.text !== '').map(box);
    const { left, top, boardPx, gateDepth } = s.layout;
    const reach = gateDepth + 4;
    const rect = document.querySelector('canvas')!.getBoundingClientRect();
    const scale = 960 / rect.width;
    const dom = (id: string) => {
      const el = document.getElementById(id)!;
      if (getComputedStyle(el).display === 'none') return null;
      const b = el.getBoundingClientRect();
      return {
        left: (b.left - rect.left) * scale, top: (b.top - rect.top) * scale,
        right: (b.right - rect.left) * scale, bottom: (b.bottom - rect.top) * scale,
      };
    };
    const buttonText = (id: string) => {
      const el = document.getElementById(id)!;
      return { scrollW: el.scrollWidth, clientW: el.clientWidth, scrollH: el.scrollHeight, clientH: el.clientHeight };
    };
    return {
      boardAndGates: { left: left - reach, top: top - reach, right: left + boardPx + reach, bottom: top + boardPx + reach },
      labels: shown(s.gateLabels),
      hud: shown([s.levelText, s.tiltsText, s.messageText, s.hintText, ...s.goalRows.map((r) => r.text)]),
      endTexts: shown([s.endText, s.endDetailText]),
      panel: s.endBackdrop.visible ? box(s.endBackdrop) : null,
      retry: dom('gf-retry'),
      next: dom('gf-next'),
      retryText: buttonText('gf-retry'),
      nextText: buttonText('gf-next'),
      touchCapture: s.input.manager.touch?.capture ?? null,
    };
  });

const overlaps = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

const expectCleanLayout = async (page: Page) => {
  const layout = await readLayout(page);
  const buttons = [layout.retry, layout.next].filter((b): b is Box => b !== null);
  const covers = [layout.boardAndGates, ...layout.labels, ...layout.hud, ...layout.endTexts];
  for (const button of buttons) {
    for (const item of covers) expect(overlaps(button, item), `nút ${JSON.stringify(button)} đè ${JSON.stringify(item)}`).toBe(false);
    expect(button.left).toBeGreaterThanOrEqual(0);
    expect(button.bottom).toBeLessThanOrEqual(GAME_H + 0.5);
  }
  if (layout.panel) {
    for (const item of [layout.boardAndGates, ...layout.labels, ...layout.hud]) {
      expect(overlaps(layout.panel, item), `bảng kết quả đè ${JSON.stringify(item)}`).toBe(false);
    }
    for (const text of layout.endTexts) {
      expect(text.left).toBeGreaterThanOrEqual(layout.panel.left);
      expect(text.right).toBeLessThanOrEqual(layout.panel.right);
      expect(text.bottom).toBeLessThanOrEqual(layout.panel.bottom);
    }
  }
  for (const text of [layout.retryText, layout.nextText]) {
    if (text.clientW === 0) continue;
    expect(text.scrollW, 'chữ trên nút tràn ngang').toBeLessThanOrEqual(text.clientW);
    expect(text.scrollH, 'chữ trên nút tràn dọc').toBeLessThanOrEqual(text.clientH);
  }
};

test.describe('C6 bàn phím', () => {
  for (const order of [DIRS, ['left', 'down', 'right', 'up'] as Dir[]]) {
    test(`C6.1 phím mũi tên thật theo thứ tự ${order.join(', ')}`, async ({ page }) => {
      const problems = await open(page);
      await load(page, FOUR_WAY());
      for (const [i, dir] of order.entries()) {
        await page.keyboard.press(KEY[dir]);
        const state = await read(page);
        expect(state.lastTiltDir).toBe(dir);
        expect(state.tiltsUsed).toBe(i + 1);
        await settle(page);
      }
      expect(problems).toEqual([]);
    });
  }

  test('C6.2 giữ phím 800 ms có auto-repeat chỉ tạo một lần nghiêng', async ({ page }) => {
    const problems = await open(page);
    await load(page, FOUR_WAY());
    await page.keyboard.down('ArrowDown');
    const end = Date.now() + 800;
    let repeats = 0;
    while (Date.now() < end) {
      await page.waitForTimeout(40);
      await page.keyboard.down('ArrowDown');
      repeats += 1;
    }
    await page.keyboard.up('ArrowDown');
    await settle(page);
    expect(repeats).toBeGreaterThan(5);
    expect((await read(page)).tiltsUsed).toBe(1);
    await page.keyboard.press('ArrowLeft');
    expect((await read(page)).tiltsUsed).toBe(2);
    expect(problems).toEqual([]);
  });

  test('C6.2 biên: lệnh trong lúc diễn hoạt bị bỏ, không xếp hàng', async ({ page }) => {
    await open(page);
    await load(page, LONG_CASCADE());
    await page.keyboard.press('ArrowDown');
    expect((await read(page)).animating).toBe(true);
    await page.keyboard.press('ArrowLeft');
    await settle(page);
    await page.waitForTimeout(250);
    const state = await read(page);
    expect(state.tiltsUsed).toBe(1);
    expect(state.lastTiltDir).toBe('down');
    expect(state.rejectedTilts).toBe(0);
  });

  test('C6.2 mất focus khi đang giữ phím không tạo thêm lần nghiêng, phím sau đó vẫn dùng được', async ({ page }) => {
    const problems = await open(page);
    await load(page, FOUR_WAY());
    await page.keyboard.down('ArrowDown');
    await settle(page);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.keyboard.down('ArrowDown');
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.keyboard.down('ArrowDown');
    await page.waitForTimeout(150);
    expect((await read(page)).tiltsUsed).toBe(1);
    await page.keyboard.up('ArrowDown');
    await page.keyboard.press('ArrowLeft');
    const state = await read(page);
    expect(state.tiltsUsed).toBe(2);
    expect(state.lastTiltDir).toBe('left');
    expect(problems).toEqual([]);
  });

  test('C6.6 R lúc đang chơi về đúng hash đầu màn trong 200 ms', async ({ page }) => {
    const problems = await open(page);
    const initial = await read(page);
    await page.keyboard.press(KEY[initial.validTilts[0]]);
    await settle(page);
    expect((await read(page)).stateHash).not.toBe(initial.stateHash);
    await armResetClock(page, 'keydown', initial.stateHash);
    await page.keyboard.press('r');
    await expectResetWithin200(page, initial.stateHash);
    expect(problems).toEqual([]);
  });

  test('C6.6 R ngay trong lúc diễn hoạt hủy diễn hoạt, hình khớp logic', async ({ page }) => {
    const problems = await open(page);
    await load(page, LONG_CASCADE());
    const initial = await read(page);
    await page.keyboard.press('ArrowDown');
    expect((await read(page)).animating).toBe(true);
    await armResetClock(page, 'keydown', initial.stateHash);
    await page.keyboard.press('r');
    await expectResetWithin200(page, initial.stateHash);
    const state = await read(page);
    const pieces = state.board.flat().filter((c) => c !== null).length;
    const gatePieces = DIRS.reduce((sum, d) => sum + state.gates[d].filter((c) => c !== null).length, 0);
    expect(state.viewCounts).toEqual({ pieces, gatePieces });
    await page.waitForTimeout(700);
    expect(await read(page)).toMatchObject({ stateHash: initial.stateHash, tiltsUsed: 0, animating: false });
    expect(problems).toEqual([]);
  });

  for (const outcome of ['won', 'lost'] as const) {
    test(`C6.6 R sau khi ${outcome === 'won' ? 'thắng, kể cả còn khóa' : 'thua'}`, async ({ page }) => {
      const problems = await open(page);
      if (outcome === 'won') await loadWin(page);
      else await load(page, F1_LAST_TILT());
      const initial = await read(page);
      await page.keyboard.press('ArrowDown');
      expect((await read(page)).status).toBe(outcome);
      await armResetClock(page, 'keydown', initial.stateHash);
      await page.keyboard.press('r');
      await expectResetWithin200(page, initial.stateHash);
      expect((await read(page)).endLockLeftMs).toBe(0);
      expect((await read(page)).levelIndex).toBe(0);
      expect(problems).toEqual([]);
    });
  }

  test('C6.6 biên: giữ R không reset lặp lại sau khi đã nghiêng tiếp', async ({ page }) => {
    await open(page);
    await load(page, FOUR_WAY());
    await page.keyboard.down('r');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.down('r');
    await page.keyboard.down('r');
    expect((await read(page)).tiltsUsed).toBe(1);
    await page.keyboard.up('r');
  });

  test('C6.8 Enter khi còn khóa không sang màn, hết khóa thì sang màn', async ({ page }) => {
    const problems = await open(page);
    await loadWin(page);
    await page.keyboard.press('ArrowDown');
    const won = await read(page);
    expect(won.status).toBe('won');
    expect(won.animating).toBe(true);
    expect(won.endLockLeftMs).toBeGreaterThan(won.lastAnimMs);
    expect(won.endLockLeftMs).toBeLessThanOrEqual(won.lastAnimMs + 300);

    await page.keyboard.press('Enter');
    expect((await read(page)).levelIndex).toBe(0);

    await page.waitForFunction(() => {
      const s = window.__game!.getState<GatefallState>()!;
      return !s.animating && s.endLockLeftMs > 80;
    });
    await page.keyboard.press('Enter');
    let state = await read(page);
    expect(state.levelIndex).toBe(0);
    expect(state.status).toBe('won');

    await lockOver(page);
    await page.keyboard.press('Enter');
    state = await read(page);
    expect(state).toMatchObject({ levelIndex: 1, status: 'playing', tiltsUsed: 0, campaignComplete: false, endLockLeftMs: 0 });
    expect(problems).toEqual([]);
  });

  test('C6.8 Enter khi đang chơi không sang màn', async ({ page }) => {
    await open(page);
    const before = await read(page);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    expect(await read(page)).toMatchObject({ levelIndex: 0, stateHash: before.stateHash, status: 'playing' });
  });

  test('C6.8 đường sai: Enter khi thua không sang màn, kể cả chờ lâu; endLockLeftMs = 0', async ({ page }) => {
    await open(page);
    await load(page, F1_LAST_TILT());
    await page.keyboard.press('ArrowDown');
    const lost = await read(page);
    expect(lost.status).toBe('lost');
    expect(lost.endLockLeftMs).toBe(0);
    await page.keyboard.press('Enter');
    await settle(page);
    await page.waitForTimeout(450);
    await page.keyboard.press('Enter');
    expect(await read(page)).toMatchObject({ levelIndex: 0, status: 'lost', stateHash: lost.stateHash });
  });

  test('C6.8 biên: giữ Enter từ trước khi thắng, auto-repeat không tự sang màn', async ({ page }) => {
    await open(page);
    await loadWin(page);
    await page.keyboard.down('Enter');
    await page.keyboard.press('ArrowDown');
    await lockOver(page);
    await page.keyboard.down('Enter');
    await page.keyboard.down('Enter');
    expect(await read(page)).toMatchObject({ levelIndex: 0, status: 'won' });
    await page.keyboard.up('Enter');
    await page.keyboard.press('Enter');
    expect((await read(page)).levelIndex).toBe(1);
  });

  test('C6.8 thử lại sau khi thắng giữ màn hiện tại và đặt lại khóa', async ({ page }) => {
    await open(page);
    await winByKey(page, 1);
    await lockOver(page);
    await page.keyboard.press('r');
    expect(await read(page)).toMatchObject({ levelIndex: 1, status: 'playing', tiltsUsed: 0 });
    await page.keyboard.press('Enter');
    expect((await read(page)).levelIndex).toBe(1);
  });

  test('C6.10 thắng màn cuối, Enter về màn 1; thử lại màn cuối hạ campaignComplete', async ({ page }) => {
    const problems = await open(page);
    await winByKey(page, 2);
    expect((await read(page)).campaignComplete).toBe(true);
    await page.keyboard.press('Enter');
    expect((await read(page)).levelIndex).toBe(2);
    await lockOver(page);
    await page.keyboard.press('r');
    expect(await read(page)).toMatchObject({ levelIndex: 2, campaignComplete: false, status: 'playing' });

    await winByKey(page, 2);
    await lockOver(page);
    await page.keyboard.press('Enter');
    expect(await read(page)).toMatchObject({ levelIndex: 0, status: 'playing', campaignComplete: false, tiltsUsed: 0 });
    expect(problems).toEqual([]);
  });

  test('C6.10 chuỗi đủ 3 màn bằng Enter, mỗi màn đúng seed', async ({ page }) => {
    await open(page);
    const tuning = await page.evaluate(() => {
      const t = window.__game!.tuning;
      return [t.gfL1Seed, t.gfL2Seed, t.gfL3Seed];
    });
    for (const level of [0, 1, 2]) {
      await winByKey(page, level);
      expect((await read(page)).campaignComplete).toBe(level === 2);
      await lockOver(page);
      await page.keyboard.press('Enter');
      const state = await read(page);
      const next = (level + 1) % 3;
      expect(state).toMatchObject({ levelIndex: next, seed: tuning[next], status: 'playing' });
    }
  });

  test('Listener: sau nhiều lần thử lại, sang màn và restart scene, một phím chỉ một lần nghiêng', async ({ page }) => {
    const problems = await open(page);
    for (let i = 0; i < 6; i += 1) await page.keyboard.press('r');
    await winByKey(page, 0);
    await lockOver(page);
    await page.keyboard.press('Enter');
    for (let i = 0; i < 3; i += 1) {
      await page.evaluate(() => window.__game!.restart());
      await page.waitForTimeout(60);
      await page.waitForFunction(() => window.__game?.getState<GatefallState>()?.status === 'playing');
    }
    await load(page, FOUR_WAY());
    await page.keyboard.press('ArrowDown');
    expect((await read(page)).tiltsUsed).toBe(1);
    await settle(page);
    await page.keyboard.press('ArrowLeft');
    const state = await read(page);
    expect(state.tiltsUsed).toBe(2);
    expect(state.rejectedTilts).toBe(0);
    expect(problems).toEqual([]);
  });

  test('C6.11 desktop: nút Gatefall bị ẩn vì không phải pointer coarse', async ({ page }) => {
    await open(page);
    expect(await visible(page, 'gf-retry')).toBe(false);
    await winByKey(page);
    await settle(page);
    expect(await visible(page, 'gf-next')).toBe(false);
  });

  test('Chuột: nút ép hiện trên desktop, click chuột chạy đúng một lần, kéo ra thì không chạy', async ({ page }) => {
    const problems = await open(page);
    // The buttons are hidden at pointer: fine. Forcing them visible checks the mouse path of the same handlers.
    await page.addStyleTag({ content: 'body.game-gatefall #gf-retry, body.game-gatefall #gf-next.show { display: block !important; }' });
    await load(page, FOUR_WAY());
    await page.keyboard.press('ArrowDown');
    await settle(page);
    await spyActions(page);
    const retry = await centerOf(page, '#gf-retry');
    await page.mouse.click(retry.x, retry.y);
    expect((await actionCalls(page)).retry).toBe(1);
    await page.waitForTimeout(CLICK_WINDOW_WAIT_MS);
    expect((await actionCalls(page)).retry, 'click theo sau lần nhả chuột bị tính thêm').toBe(1);
    expect((await read(page)).tiltsUsed).toBe(0);

    await page.mouse.move(retry.x, retry.y);
    await page.mouse.down();
    await page.mouse.move(retry.x + 300, retry.y - 200, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(CLICK_WINDOW_WAIT_MS);
    expect((await actionCalls(page)).retry).toBe(1);
    await page.mouse.click(retry.x, retry.y, { button: 'right' });
    expect((await actionCalls(page)).retry).toBe(1);
    await page.mouse.click(retry.x, retry.y);
    expect((await actionCalls(page)).retry).toBe(2);

    await winByKey(page);
    await lockOver(page);
    const next = await centerOf(page, '#gf-next');
    await page.mouse.click(next.x, next.y);
    await page.waitForTimeout(CLICK_WINDOW_WAIT_MS);
    expect((await actionCalls(page)).next).toBe(1);
    expect(await read(page)).toMatchObject({ levelIndex: 1, status: 'playing' });
    expect(problems).toEqual([]);
  });
});

test.describe('C6 cảm ứng 844x390', () => {
  test.use(PHONE);

  test('C6.3 vuốt thật 4 hướng', async ({ page }) => {
    const problems = await open(page);
    await load(page, FOUR_WAY());
    const fingers = await Fingers.on(page);
    for (const [i, dir] of DIRS.entries()) {
      await swipeDir(page, fingers, dir);
      const state = await read(page);
      expect(state.lastTiltDir).toBe(dir);
      expect(state.tiltsUsed).toBe(i + 1);
      await settle(page);
    }
    expect(problems).toEqual([]);
  });

  test('C6.3 lần vuốt được nhận khi đạt ngưỡng, chưa cần nhấc tay', async ({ page }) => {
    await open(page);
    await load(page, FOUR_WAY());
    const fingers = await Fingers.on(page);
    const start = await toScreen(page, SWIPE_FROM);
    await fingers.down(1, start);
    await fingers.move(1, { x: start.x, y: start.y + 40 * start.scale }, 3);
    await page.waitForFunction(() => window.__game!.getState<GatefallState>()!.tiltsUsed === 1);
    expect((await read(page)).lastTiltDir).toBe('down');
    await fingers.up(1);
  });

  test('C6.3 vuốt bắt đầu ở vùng HUD trống của canvas vẫn được nhận', async ({ page }) => {
    await open(page);
    await load(page, FOUR_WAY());
    const fingers = await Fingers.on(page);
    await swipeGame(page, fingers, 0, 60, { x: 200, y: 20 });
    expect((await read(page)).tiltsUsed).toBe(1);
  });

  test('C6.4 ngưỡng tính theo tọa độ game khi canvas bị co', async ({ page }) => {
    await open(page);
    await load(page, FOUR_WAY());
    const fingers = await Fingers.on(page);
    const { scale } = await toScreen(page, SWIPE_FROM);
    expect(scale).toBeLessThan(0.75);
    // 26.5 game px is under gfSwipeMinPx (28) and 29.5 is over. At this scale 29.5 game px is under 28 screen px,
    // so a threshold wrongly read in screen pixels would refuse the second swipe.
    await swipeGame(page, fingers, 0, 26.5);
    expect((await read(page)).tiltsUsed).toBe(0);
    await swipeGame(page, fingers, 0, 29.5);
    const state = await read(page);
    expect(state.tiltsUsed).toBe(1);
    expect(state.lastTiltDir).toBe('down');
  });

  test('C6.4 vuốt ngắn và vuốt chéo không đổi tiltsUsed, rejectedTilts', async ({ page }) => {
    const problems = await open(page);
    await load(page, FOUR_WAY());
    const fingers = await Fingers.on(page);
    const before = await read(page);
    const bad: [number, number][] = [
      [20, 0], [0, -20], [-26, 0], [40, 40], [-40, 40], [40, -40], [-40, -40],
      [50, 45], [45, -50], [-60, 52],
    ];
    for (const [dx, dy] of bad) {
      await swipeGame(page, fingers, dx, dy);
      const state = await read(page);
      expect(state.tiltsUsed, `${dx},${dy}`).toBe(0);
      expect(state.rejectedTilts, `${dx},${dy}`).toBe(0);
      expect(state.stateHash).toBe(before.stateHash);
    }
    expect(problems).toEqual([]);
  });

  test('C6.4 biên: tỷ lệ trục trên ngưỡng được nhận', async ({ page }) => {
    await open(page);
    await load(page, FOUR_WAY());
    const fingers = await Fingers.on(page);
    await swipeGame(page, fingers, 65, 50);
    const state = await read(page);
    expect(state.tiltsUsed).toBe(1);
    expect(state.lastTiltDir).toBe('right');
  });

  test('C6.4 quá chéo thì bỏ cả lần chạm, kéo thẳng lại cũng không nghiêng', async ({ page }) => {
    await open(page);
    await load(page, FOUR_WAY());
    const fingers = await Fingers.on(page);
    const start = await toScreen(page, SWIPE_FROM);
    await fingers.down(1, start);
    await fingers.move(1, { x: start.x + 30 * start.scale, y: start.y + 30 * start.scale }, 3);
    await fingers.move(1, { x: start.x + 150 * start.scale, y: start.y + 30 * start.scale }, 4);
    await fingers.up(1);
    expect((await read(page)).tiltsUsed).toBe(0);
    await swipeDir(page, fingers, 'left');
    expect((await read(page)).tiltsUsed).toBe(1);
  });

  test('C6.5 một lần chạm đổi hướng nhiều lần chỉ tạo một lần nghiêng', async ({ page }) => {
    const problems = await open(page);
    await load(page, FOUR_WAY());
    const fingers = await Fingers.on(page);
    const start = await toScreen(page, SWIPE_FROM);
    const at = (dx: number, dy: number) => ({ x: start.x + dx * start.scale, y: start.y + dy * start.scale });
    await fingers.down(1, start);
    await fingers.move(1, at(0, 100), 4);
    await settle(page);
    for (const [dx, dy] of [[100, 100], [100, -60], [-120, -60], [-120, 80], [0, 0]]) {
      await fingers.move(1, at(dx, dy), 3);
      await settle(page);
    }
    expect((await read(page)).tiltsUsed).toBe(1);
    expect((await read(page)).lastTiltDir).toBe('down');
    await fingers.up(1);
    await swipeDir(page, fingers, 'left');
    expect((await read(page)).tiltsUsed).toBe(2);
    expect(problems).toEqual([]);
  });

  test('C6.5 vuốt trong lúc diễn hoạt bị bỏ, không xếp hàng', async ({ page }) => {
    await open(page);
    await load(page, LONG_CASCADE());
    const fingers = await Fingers.on(page);
    await swipeDir(page, fingers, 'down');
    expect((await read(page)).animating).toBe(true);
    await swipeDir(page, fingers, 'left');
    expect((await read(page)).animating).toBe(true);
    await settle(page);
    await page.waitForTimeout(200);
    expect(await read(page)).toMatchObject({ tiltsUsed: 1, lastTiltDir: 'down', rejectedTilts: 0 });
  });

  test('Mất focus giữa lần vuốt: không nghiêng từ lần chạm đó, lần sau vẫn dùng được', async ({ page }) => {
    const problems = await open(page);
    await load(page, FOUR_WAY());
    const fingers = await Fingers.on(page);
    const start = await toScreen(page, SWIPE_FROM);
    await fingers.down(1, start);
    await fingers.move(1, { x: start.x, y: start.y + 10 * start.scale });
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await fingers.move(1, { x: start.x, y: start.y + 90 * start.scale }, 3);
    expect((await read(page)).tiltsUsed).toBe(0);
    await fingers.up(1);
    await swipeDir(page, fingers, 'down');
    expect(await read(page)).toMatchObject({ tiltsUsed: 1, lastTiltDir: 'down' });
    expect(problems).toEqual([]);
  });

  test('Tab ẩn giữa lần vuốt (giả lập visibilitychange): không nghiêng, lần sau vẫn dùng được', async ({ page }) => {
    await open(page);
    await load(page, FOUR_WAY());
    const fingers = await Fingers.on(page);
    const start = await toScreen(page, SWIPE_FROM);
    await fingers.down(1, start);
    await fingers.move(1, { x: start.x + 10 * start.scale, y: start.y });
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await fingers.move(1, { x: start.x + 90 * start.scale, y: start.y }, 3);
    expect((await read(page)).tiltsUsed).toBe(0);
    await fingers.up(1);
    await swipeDir(page, fingers, 'right');
    expect(await read(page)).toMatchObject({ tiltsUsed: 1, lastTiltDir: 'right' });
  });

  test('touchcancel giữa lần vuốt: không lỗi console, capture được trả lại, vuốt và nút vẫn đúng', async ({ page }) => {
    const problems = await open(page);
    await load(page, FOUR_WAY());
    const initialHash = (await read(page)).stateHash;
    const fingers = await Fingers.on(page);
    const start = await toScreen(page, SWIPE_FROM);
    for (let i = 0; i < 3; i += 1) {
      await fingers.down(1, start);
      await fingers.move(1, { x: start.x, y: start.y + 12 * start.scale });
      await fingers.cancel();
    }
    expect((await read(page)).tiltsUsed).toBe(0);
    expect((await readLayout(page)).touchCapture).toBe(true);

    await swipeDir(page, fingers, 'down');
    expect(await read(page)).toMatchObject({ tiltsUsed: 1, lastTiltDir: 'down' });
    await settle(page);
    await tapElement(page, fingers, '#gf-retry');
    await page.waitForFunction((hash) => window.__game!.getState<GatefallState>()!.stateHash === hash, initialHash);

    await loadWin(page);
    await swipeDir(page, fingers, 'down');
    await lockOver(page);
    await fingers.down(1, start);
    await fingers.cancel();
    await tapElement(page, fingers, '#gf-next');
    await page.waitForFunction(() => window.__game!.getState<GatefallState>()!.levelIndex === 1);
    expect(problems).toEqual([]);
  });

  for (const id of ['gf-retry', 'gf-next'] as const) {
    test(`Vuốt bắt đầu trên #${id} không tạo lần nghiêng`, async ({ page }) => {
      const problems = await open(page);
      const fingers = await Fingers.on(page);
      if (id === 'gf-next') {
        await loadWin(page);
        await swipeDir(page, fingers, 'down');
        await lockOver(page);
      } else {
        await load(page, FOUR_WAY());
        await swipeDir(page, fingers, 'up');
        await settle(page);
      }
      const before = await read(page);
      const at = await centerOf(page, `#${id}`);
      await fingers.down(1, at);
      await fingers.move(1, { x: at.x + 160, y: at.y - 120 }, 6);
      await fingers.move(1, { x: at.x + 300, y: at.y - 120 }, 6);
      await fingers.up(1);
      await page.waitForTimeout(120);
      const after = await read(page);
      expect(after.tiltsUsed).toBe(before.tiltsUsed);
      expect(after.rejectedTilts).toBe(before.rejectedTilts);
      expect(after.levelIndex).toBe(before.levelIndex);
      expect(after.stateHash).toBe(before.stateHash);
      expect(problems).toEqual([]);
    });
  }

  test('Nhiều ngón: hai ngón cùng kéo chỉ tạo một lần nghiêng', async ({ page }) => {
    const problems = await open(page);
    await load(page, FOUR_WAY());
    const fingers = await Fingers.on(page);
    const a = await toScreen(page, { x: 560, y: 200 });
    const b = await toScreen(page, { x: 680, y: 200 });
    await fingers.down(1, a);
    await fingers.down(2, b);
    for (let step = 1; step <= 5; step += 1) {
      await fingers.move(1, { x: a.x, y: a.y + step * 20 * a.scale });
      await fingers.move(2, { x: b.x, y: b.y + step * 20 * b.scale });
    }
    await settle(page);
    expect((await read(page)).tiltsUsed).toBe(1);
    await fingers.up(2);
    await fingers.up(1);
    expect(problems).toEqual([]);
  });

  test('Nhiều ngón: ngón thứ hai không chiếm lần vuốt của ngón đầu', async ({ page }) => {
    await open(page);
    await load(page, FOUR_WAY());
    const fingers = await Fingers.on(page);
    const a = await toScreen(page, { x: 560, y: 200 });
    const b = await toScreen(page, { x: 680, y: 200 });
    await fingers.down(1, a);
    await fingers.down(2, b);
    await fingers.move(2, { x: b.x - 90 * b.scale, y: b.y }, 3);
    expect((await read(page)).tiltsUsed).toBe(0);
    await fingers.move(1, { x: a.x, y: a.y + 90 * a.scale }, 3);
    expect(await read(page)).toMatchObject({ tiltsUsed: 1, lastTiltDir: 'down' });
    await fingers.up(2);
    await fingers.up(1);
  });

  test('Nhiều ngón: ngón đầu nhấc ra, ngón còn lại không tự thành lần vuốt', async ({ page }) => {
    await open(page);
    await load(page, FOUR_WAY());
    const fingers = await Fingers.on(page);
    const a = await toScreen(page, { x: 560, y: 200 });
    const b = await toScreen(page, { x: 680, y: 200 });
    await fingers.down(1, a);
    await fingers.down(2, b);
    await fingers.up(1);
    await fingers.move(2, { x: b.x, y: b.y + 90 * b.scale }, 3);
    expect((await read(page)).tiltsUsed).toBe(0);
    await fingers.up(2);
    await swipeDir(page, fingers, 'left');
    expect((await read(page)).tiltsUsed).toBe(1);
  });

  test('Nhiều ngón: giữ một ngón trên bàn vẫn bấm được #gf-retry', async ({ page }) => {
    await open(page);
    const initial = await read(page);
    const fingers = await Fingers.on(page);
    await swipeDir(page, fingers, initial.validTilts[0]);
    await settle(page);
    const held = await toScreen(page, SWIPE_FROM);
    await fingers.down(1, held);
    const button = await centerOf(page, '#gf-retry');
    await fingers.down(2, button);
    await fingers.up(2);
    await page.waitForFunction((hash) => window.__game!.getState<GatefallState>()!.stateHash === hash, initial.stateHash, { timeout: 2_000 });
    await fingers.up(1);
  });

  test('Nhiều ngón: giữ một ngón trên bàn vẫn bấm được #gf-next sau khi hết khóa', async ({ page }) => {
    await open(page);
    const fingers = await Fingers.on(page);
    await loadWin(page);
    await swipeDir(page, fingers, 'down');
    await lockOver(page);
    await fingers.down(1, await toScreen(page, SWIPE_FROM));
    await fingers.down(2, await centerOf(page, '#gf-next'));
    await fingers.up(2);
    await page.waitForFunction(() => window.__game!.getState<GatefallState>()!.levelIndex === 1, null, { timeout: 2_000 });
    await fingers.up(1);
  });

  test('C6.7 bấm #gf-retry lúc đang chơi trong 200 ms', async ({ page }) => {
    const problems = await open(page);
    const initial = await read(page);
    const fingers = await Fingers.on(page);
    await swipeDir(page, fingers, initial.validTilts[0]);
    await settle(page);
    await armResetClock(page, 'pointerup', initial.stateHash);
    await tapElement(page, fingers, '#gf-retry');
    await expectResetWithin200(page, initial.stateHash);
    expect(problems).toEqual([]);
  });

  test('C6.7 bấm #gf-retry trong lúc diễn hoạt, khi thắng còn khóa và khi thua', async ({ page }) => {
    const problems = await open(page);
    const fingers = await Fingers.on(page);
    await load(page, LONG_CASCADE());
    const initial = await read(page);
    await swipeDir(page, fingers, 'down');
    expect((await read(page)).animating).toBe(true);
    await armResetClock(page, 'pointerup', initial.stateHash);
    await tapElement(page, fingers, '#gf-retry');
    await expectResetWithin200(page, initial.stateHash);

    await loadWin(page);
    const winStart = await read(page);
    await swipeDir(page, fingers, 'down');
    expect((await read(page)).endLockLeftMs).toBeGreaterThan(0);
    await armResetClock(page, 'pointerup', winStart.stateHash);
    await tapElement(page, fingers, '#gf-retry');
    await expectResetWithin200(page, winStart.stateHash);
    expect(await page.locator('#gf-next').isVisible()).toBe(false);

    await load(page, F1_LAST_TILT());
    const loseStart = await read(page);
    await swipeDir(page, fingers, 'down');
    expect((await read(page)).status).toBe('lost');
    await settle(page);
    await armResetClock(page, 'pointerup', loseStart.stateHash);
    await tapElement(page, fingers, '#gf-retry');
    await expectResetWithin200(page, loseStart.stateHash);
    expect(problems).toEqual([]);
  });

  test('C6.9 #gf-next: ẩn khi chơi và khi thua, class locked khi còn khóa, bấm khi hết khóa thì sang màn', async ({ page }) => {
    const problems = await open(page);
    const fingers = await Fingers.on(page);
    const next = page.locator('#gf-next');
    await expect(next).toBeHidden();

    await load(page, F1_LAST_TILT());
    await swipeDir(page, fingers, 'down');
    await settle(page);
    expect((await read(page)).status).toBe('lost');
    await expect(next).toBeHidden();

    await loadWin(page);
    await swipeDir(page, fingers, 'down');
    expect((await read(page)).status).toBe('won');
    await page.waitForFunction(() => {
      const s = window.__game!.getState<GatefallState>()!;
      return !s.animating && s.endLockLeftMs > 60 && document.getElementById('gf-next')!.classList.contains('locked');
    });
    await expect(next).toBeVisible();
    expect(await next.isDisabled()).toBe(false);
    await tapElement(page, fingers, '#gf-next');
    expect(await read(page)).toMatchObject({ levelIndex: 0, status: 'won' });

    await lockOver(page);
    await page.waitForFunction(() => !document.getElementById('gf-next')!.classList.contains('locked'));
    await tapElement(page, fingers, '#gf-next');
    await page.waitForFunction(() => window.__game!.getState<GatefallState>()!.levelIndex === 1);
    expect(await read(page)).toMatchObject({ levelIndex: 1, status: 'playing', tiltsUsed: 0 });
    await expect(next).toBeHidden();
    expect(problems).toEqual([]);
  });

  test('C6.10 cảm ứng: thắng màn cuối, nút ghi Về màn 1 và đưa về màn 1', async ({ page }) => {
    await open(page);
    const fingers = await Fingers.on(page);
    await loadWin(page, 2);
    await swipeDir(page, fingers, 'down');
    expect((await read(page)).campaignComplete).toBe(true);
    await lockOver(page);
    await expect(page.locator('#gf-next')).toHaveText('Về màn 1');
    await tapElement(page, fingers, '#gf-next');
    await page.waitForFunction(() => window.__game!.getState<GatefallState>()!.levelIndex === 0
      && window.__game!.getState<GatefallState>()!.status === 'playing');
    expect((await read(page)).campaignComplete).toBe(false);
  });

  test('Listener: sau nhiều lần bấm nút và sang màn, một lần vuốt chỉ một lần nghiêng', async ({ page }) => {
    const problems = await open(page);
    const fingers = await Fingers.on(page);
    for (let i = 0; i < 5; i += 1) await tapElement(page, fingers, '#gf-retry');
    await loadWin(page);
    await swipeDir(page, fingers, 'down');
    await lockOver(page);
    await tapElement(page, fingers, '#gf-next');
    await page.waitForFunction(() => window.__game!.getState<GatefallState>()!.levelIndex === 1);
    for (let i = 0; i < 2; i += 1) {
      await page.evaluate(() => window.__game!.restart());
      await page.waitForTimeout(60);
      await page.waitForFunction(() => window.__game?.getState<GatefallState>()?.status === 'playing');
    }
    await load(page, FOUR_WAY());
    await swipeDir(page, fingers, 'down');
    expect((await read(page)).tiltsUsed).toBe(1);
    await settle(page);
    await tapElement(page, fingers, '#gf-retry');
    await page.waitForFunction(() => window.__game!.getState<GatefallState>()!.tiltsUsed === 0);
    await swipeDir(page, fingers, 'left');
    expect((await read(page)).tiltsUsed).toBe(1);
    expect(problems).toEqual([]);
  });

  test('C6.11 Gatefall: ba nút cũ ẩn, #gf-retry hiện', async ({ page }) => {
    await open(page);
    for (const id of ['btn-left', 'btn-right', 'btn-jump']) await expect(page.locator(`#${id}`)).toBeHidden();
    await expect(page.locator('#gf-retry')).toBeVisible();
    await expect(page.locator('#gf-next')).toBeHidden();
  });

  for (const route of ['/', '/?game=arc-relay', '/?game=khac']) {
    test(`C6.11 ${route}: nút Gatefall ẩn, ba nút cũ hiện và điều khiển được`, async ({ page }) => {
      const problems = collectProblems(page);
      await page.goto(route);
      await page.waitForFunction(() => window.__game?.getState()?.status === 'playing');
      await page.waitForTimeout(350);
      await expect(page.locator('#gf-retry')).toBeHidden();
      await expect(page.locator('#gf-next')).toBeHidden();
      for (const id of ['btn-left', 'btn-right', 'btn-jump']) await expect(page.locator(`#${id}`)).toBeVisible();
      expect(await page.evaluate(() => document.body.classList.contains('game-gatefall'))).toBe(false);

      const fingers = await Fingers.on(page);
      const readX = () => page.evaluate(() => (window.__game!.getState() as unknown as { x: number }).x);
      const readY = () => page.evaluate(() => (window.__game!.getState() as unknown as { y: number }).y);

      for (const [id, sign] of [['#btn-right', 1], ['#btn-left', -1]] as const) {
        const before = await readX();
        await fingers.down(1, await centerOf(page, id));
        await page.waitForFunction(({ before, sign }) => {
          const x = (window.__game!.getState() as unknown as { x: number }).x;
          return (x - before) * sign >= 8;
        }, { before, sign }, { timeout: 3_000 });
        await fingers.up(1);
        await page.waitForTimeout(120);
      }

      await page.waitForTimeout(300);
      const groundY = await readY();
      await fingers.down(1, await centerOf(page, '#btn-jump'));
      await page.waitForFunction((groundY) => (window.__game!.getState() as unknown as { y: number }).y <= groundY - 10, groundY, { timeout: 3_000 });
      await fingers.up(1);
      expect(problems).toEqual([]);
    });
  }

  test('C6.12 bot chơi hết màn 1 bằng phím thật, chơi lại bằng vuốt thật, cùng hash cuối', async ({ page }) => {
    test.setTimeout(150_000);
    const problems = await open(page);
    const initial = await read(page);
    const plan = await planLevelOne(page);
    expect(['won', 'lost']).toContain(plan.status);
    const fingers = await Fingers.on(page);

    for (const [i, dir] of plan.moves.entries()) {
      await page.keyboard.press(KEY[dir]);
      expect(await read(page), `phím ${i}`).toMatchObject({ tiltsUsed: i + 1, lastTiltDir: dir });
      await settle(page);
    }
    const byKeys = await read(page);
    expect(['won', 'lost']).toContain(byKeys.status);
    expect(byKeys.stateHash).toBe(plan.hash);
    await page.screenshot({ path: 'artifacts/gatefall-c6-play-keys-end.png' });

    await tapElement(page, fingers, '#gf-retry');
    await page.waitForFunction((hash) => window.__game!.getState<GatefallState>()!.stateHash === hash, initial.stateHash);
    for (const [i, dir] of plan.moves.entries()) {
      await swipeDir(page, fingers, dir);
      expect(await read(page), `vuốt ${i}`).toMatchObject({ tiltsUsed: i + 1, lastTiltDir: dir });
      await settle(page);
    }
    const bySwipes = await read(page);
    expect(bySwipes.status).toBe(byKeys.status);
    expect(bySwipes.tiltsUsed).toBe(byKeys.tiltsUsed);
    expect(bySwipes.stateHash).toBe(byKeys.stateHash);
    expect(problems).toEqual([]);
  });
});

/** Counts real calls of the two button actions on the running scene. */
const spyActions = (page: Page) =>
  page.evaluate(async () => {
    const entry = performance.getEntriesByType('resource').map((r) => r.name)
      .find((name) => name.includes('/src/scenes/GatefallScene.ts'));
    const module = await import(/* @vite-ignore */ entry!);
    const proto = module.GatefallScene.prototype;
    const original = proto.getState;
    let scene: { retry(): void; nextLevel(): boolean } | null = null;
    proto.getState = function capture(this: { retry(): void; nextLevel(): boolean }) {
      scene = this;
      return original.call(this);
    };
    window.__game!.getState();
    proto.getState = original;
    const target = scene as unknown as { retry(): void; nextLevel(): boolean };
    const calls = { retry: 0, next: 0 };
    (window as unknown as { __qaCalls: typeof calls }).__qaCalls = calls;
    const retry = target.retry.bind(target);
    const nextLevel = target.nextLevel.bind(target);
    target.retry = () => { calls.retry += 1; retry(); };
    target.nextLevel = () => { calls.next += 1; return nextLevel(); };
  });

const actionCalls = (page: Page) =>
  page.evaluate(() => ({ ...(window as unknown as { __qaCalls: { retry: number; next: number } }).__qaCalls }));

/** Longer than the 500 ms window in which a trailing click is ignored, so a late click would be counted. */
const CLICK_WINDOW_WAIT_MS = 700;

const loseFocus = (page: Page, how: 'blur' | 'visibilitychange') =>
  page.evaluate((how) => {
    if (how === 'blur') window.dispatchEvent(new Event('blur'));
    else document.dispatchEvent(new Event('visibilitychange'));
  }, how);

test.describe('C6 nút DOM và đa chạm 844x390', () => {
  test.use(PHONE);

  test('Chốt: sau một lần nghiêng, ngón thứ hai không nghiêng được cho tới khi nhấc hết tay', async ({ page }) => {
    const problems = await open(page);
    await load(page, FOUR_WAY());
    const fingers = await Fingers.on(page);
    const a = await toScreen(page, { x: 560, y: 200 });
    const b = await toScreen(page, { x: 680, y: 200 });
    await fingers.down(1, a);
    await fingers.move(1, { x: a.x, y: a.y + 90 * a.scale }, 3);
    expect(await read(page)).toMatchObject({ tiltsUsed: 1, lastTiltDir: 'down' });
    await settle(page);

    await fingers.down(2, b);
    await fingers.move(2, { x: b.x - 90 * b.scale, y: b.y }, 3);
    await page.waitForTimeout(80);
    expect((await read(page)).tiltsUsed).toBe(1);

    await fingers.up(1);
    await fingers.move(2, { x: b.x + 90 * b.scale, y: b.y }, 3);
    await page.waitForTimeout(80);
    expect((await read(page)).tiltsUsed).toBe(1);

    await fingers.up(2);
    await swipeDir(page, fingers, 'left');
    expect(await read(page)).toMatchObject({ tiltsUsed: 2, lastTiltDir: 'left' });
    expect(problems).toEqual([]);
  });

  for (const [id, action] of [['gf-retry', 'retry'], ['gf-next', 'next']] as const) {
    const prepare = async (page: Page, fingers: Fingers) => {
      if (id === 'gf-next') {
        await loadWin(page);
        await swipeDir(page, fingers, 'down');
        await lockOver(page);
      } else {
        await load(page, FOUR_WAY());
        await swipeDir(page, fingers, 'down');
        await settle(page);
      }
    };

    test(`#${id}: giữ ngón trên bàn, ngón kia bấm thì chạy ngay, đúng một lần`, async ({ page }) => {
      const problems = await open(page);
      const fingers = await Fingers.on(page);
      await prepare(page, fingers);
      await spyActions(page);
      const before = await read(page);
      await fingers.down(1, await toScreen(page, SWIPE_FROM));
      await fingers.down(2, await centerOf(page, `#${id}`));
      await fingers.up(2);
      await page.waitForTimeout(CLICK_WINDOW_WAIT_MS);
      expect((await actionCalls(page))[action]).toBe(1);
      expect((await read(page)).stateHash).not.toBe(before.stateHash);
      await fingers.up(1);
      await page.waitForTimeout(CLICK_WINDOW_WAIT_MS);
      expect((await actionCalls(page))[action]).toBe(1);
      expect(problems).toEqual([]);
    });

    test(`#${id}: một lần chạm một ngón chỉ chạy một lần, kể cả khi click đến sau`, async ({ page }) => {
      await open(page);
      const fingers = await Fingers.on(page);
      await prepare(page, fingers);
      await spyActions(page);
      await tapElement(page, fingers, `#${id}`);
      await page.waitForTimeout(CLICK_WINDOW_WAIT_MS);
      expect((await actionCalls(page))[action]).toBe(1);
    });

    test(`#${id}: kéo ra khỏi nút rồi nhấc thì không chạy`, async ({ page }) => {
      await open(page);
      const fingers = await Fingers.on(page);
      await prepare(page, fingers);
      await spyActions(page);
      const before = await read(page);
      const at = await centerOf(page, `#${id}`);
      await fingers.down(1, at);
      await fingers.move(1, { x: at.x + 260, y: at.y - 150 }, 5);
      await fingers.up(1);
      await page.waitForTimeout(CLICK_WINDOW_WAIT_MS);
      expect((await actionCalls(page))[action]).toBe(0);
      expect((await read(page)).stateHash).toBe(before.stateHash);
    });

    test(`#${id}: touchcancel trên nút thì không chạy, lần chạm sau vẫn chạy`, async ({ page }) => {
      const problems = await open(page);
      const fingers = await Fingers.on(page);
      await prepare(page, fingers);
      await spyActions(page);
      await fingers.down(1, await centerOf(page, `#${id}`));
      await fingers.cancel();
      await page.waitForTimeout(CLICK_WINDOW_WAIT_MS);
      expect((await actionCalls(page))[action]).toBe(0);
      await tapElement(page, fingers, `#${id}`);
      await page.waitForTimeout(CLICK_WINDOW_WAIT_MS);
      expect((await actionCalls(page))[action]).toBe(1);
      expect(problems).toEqual([]);
    });

    for (const lost of ['blur', 'visibilitychange'] as const) {
      test(`#${id}: ${lost} giữa lần bấm thì không chạy, lần chạm sau vẫn chạy`, async ({ page }) => {
        await open(page);
        const fingers = await Fingers.on(page);
        await prepare(page, fingers);
        await spyActions(page);
        const before = await read(page);
        await fingers.down(1, await centerOf(page, `#${id}`));
        await page.evaluate((lost) => {
          if (lost === 'blur') window.dispatchEvent(new Event('blur'));
          else document.dispatchEvent(new Event('visibilitychange'));
        }, lost);
        await fingers.up(1);
        await page.waitForTimeout(CLICK_WINDOW_WAIT_MS);
        expect((await actionCalls(page))[action], 'không được kích hoạt sau khi mất focus').toBe(0);
        expect((await read(page)).stateHash).toBe(before.stateHash);
        await tapElement(page, fingers, `#${id}`);
        await page.waitForTimeout(CLICK_WINDOW_WAIT_MS);
        expect((await actionCalls(page))[action]).toBe(1);
      });
    }

    for (const path of ['blur', 'visibilitychange', 'kéo ra', 'touchcancel'] as const) {
      test(`#${id}: ngay sau đường hủy ${path}, lần chạm hợp lệ chạy đúng một lần`, async ({ page }) => {
        const problems = await open(page);
        const fingers = await Fingers.on(page);
        await prepare(page, fingers);
        await spyActions(page);
        const before = await read(page);
        const at = await centerOf(page, `#${id}`);
        await fingers.down(1, at);
        if (path === 'touchcancel') {
          await fingers.cancel();
        } else {
          if (path === 'kéo ra') await fingers.move(1, { x: at.x + 260, y: at.y - 150 }, 4);
          else await loseFocus(page, path);
          await fingers.up(1);
        }
        expect((await actionCalls(page))[action], 'đường hủy không được kích hoạt').toBe(0);
        expect((await read(page)).stateHash).toBe(before.stateHash);

        // No wait here: this press lands inside the window in which a trailing click is ignored.
        await tapElement(page, fingers, `#${id}`);
        expect((await actionCalls(page))[action], 'lần chạm hợp lệ bị nuốt').toBe(1);
        await page.waitForTimeout(CLICK_WINDOW_WAIT_MS);
        expect((await actionCalls(page))[action], 'lần chạm hợp lệ chạy hai lần').toBe(1);
        expect(problems).toEqual([]);
      });
    }

    for (const path of ['blur', 'visibilitychange', 'kéo ra'] as const) {
      test(`#${id}: ngón bị hủy (${path}) còn giữ, ngón thứ hai bấm vẫn chạy đúng một lần`, async ({ page }) => {
        const problems = await open(page);
        const fingers = await Fingers.on(page);
        await prepare(page, fingers);
        await spyActions(page);
        const at = await centerOf(page, `#${id}`);
        await fingers.down(1, { x: at.x - 15, y: at.y });
        if (path === 'kéo ra') await fingers.move(1, { x: at.x + 260, y: at.y - 150 }, 4);
        else await loseFocus(page, path);

        await fingers.down(2, { x: at.x + 15, y: at.y });
        await fingers.up(2);
        expect((await actionCalls(page))[action], 'ngón thứ hai bị nuốt').toBe(1);
        await fingers.up(1);
        await page.waitForTimeout(CLICK_WINDOW_WAIT_MS);
        expect((await actionCalls(page))[action], 'ngón bị hủy không được kích hoạt thêm').toBe(1);
        expect(problems).toEqual([]);
      });
    }

    test(`#${id}: click detail = 0 vẫn chạy, kể cả ngay sau một lần chạm`, async ({ page }) => {
      await open(page);
      const fingers = await Fingers.on(page);
      await prepare(page, fingers);
      await spyActions(page);
      if (id === 'gf-retry') {
        await tapElement(page, fingers, '#gf-retry');
        expect((await actionCalls(page)).retry).toBe(1);
      }
      const detail = await page.evaluate((id) => {
        let seen = -1;
        const el = document.getElementById(id)!;
        el.addEventListener('click', (e) => { seen = e.detail; }, { once: true, capture: true });
        el.click();
        return seen;
      }, id);
      expect(detail).toBe(0);
      expect((await actionCalls(page))[action]).toBe(id === 'gf-retry' ? 2 : 1);
    });

    test(`#${id}: click detail = 0 ngay sau lần bấm bị hủy do blur vẫn chạy đúng một lần`, async ({ page }) => {
      await open(page);
      const fingers = await Fingers.on(page);
      await prepare(page, fingers);
      await spyActions(page);
      await fingers.down(1, await centerOf(page, `#${id}`));
      await loseFocus(page, 'blur');
      await fingers.up(1);
      expect((await actionCalls(page))[action]).toBe(0);
      // Inside the 500 ms window opened by that release: a keyboard-style click must still run.
      const detail = await page.evaluate((id) => {
        let seen = -1;
        const el = document.getElementById(id)!;
        el.addEventListener('click', (e) => { seen = e.detail; }, { once: true, capture: true });
        el.click();
        return seen;
      }, id);
      expect(detail).toBe(0);
      expect((await actionCalls(page))[action]).toBe(1);
      await page.waitForTimeout(CLICK_WINDOW_WAIT_MS);
      expect((await actionCalls(page))[action]).toBe(1);
    });

    test(`#${id}: hai ngón cùng trên nút chỉ chạy một lần`, async ({ page }) => {
      await open(page);
      const fingers = await Fingers.on(page);
      await prepare(page, fingers);
      await spyActions(page);
      const at = await centerOf(page, `#${id}`);
      await fingers.down(1, { x: at.x - 15, y: at.y });
      await fingers.down(2, { x: at.x + 15, y: at.y });
      await fingers.up(1);
      await fingers.up(2);
      await page.waitForTimeout(CLICK_WINDOW_WAIT_MS);
      expect((await actionCalls(page))[action]).toBe(1);
    });

    // Producer decision: once a finger fires the button, fingers already resting on it are spent.
    for (const order of ['B nhấc sau A', 'B nhấc trước A'] as const) {
      test(`#${id}: A và B cùng trên nút, ${order}: chỉ một lần, nút không kẹt`, async ({ page }) => {
        const problems = await open(page);
        const fingers = await Fingers.on(page);
        await prepare(page, fingers);
        await spyActions(page);
        const at = await centerOf(page, `#${id}`);
        await fingers.down(1, { x: at.x - 15, y: at.y });
        await fingers.down(2, { x: at.x + 15, y: at.y });
        const [first, second] = order === 'B nhấc sau A' ? [1, 2] : [2, 1];
        await fingers.up(first);
        expect((await actionCalls(page))[action], 'ngón nhấc trước phải kích hoạt ngay').toBe(1);
        await fingers.up(second);
        await page.waitForTimeout(CLICK_WINDOW_WAIT_MS);
        expect((await actionCalls(page))[action], 'ngón còn lại đã bị tính là dùng').toBe(1);
        if (id === 'gf-retry') {
          // The next single tap must run exactly once: nothing left over from the pair.
          await tapElement(page, fingers, '#gf-retry');
          expect((await actionCalls(page)).retry).toBe(2);
          await page.waitForTimeout(CLICK_WINDOW_WAIT_MS);
          expect((await actionCalls(page)).retry).toBe(2);
        } else {
          expect((await read(page)).levelIndex).toBe(1);
        }
        expect(problems).toEqual([]);
      });
    }

    test(`#${id}: ngón thứ hai bị kéo ra không chặn ngón đầu còn hợp lệ`, async ({ page }) => {
      await open(page);
      const fingers = await Fingers.on(page);
      await prepare(page, fingers);
      await spyActions(page);
      const at = await centerOf(page, `#${id}`);
      await fingers.down(1, { x: at.x - 15, y: at.y });
      await fingers.down(2, { x: at.x + 15, y: at.y });
      await fingers.move(2, { x: at.x + 260, y: at.y - 150 }, 4);
      await fingers.up(2);
      expect((await actionCalls(page))[action]).toBe(0);
      await fingers.up(1);
      expect((await actionCalls(page))[action], 'ngón đầu bị ngón bị hủy chặn').toBe(1);
      await page.waitForTimeout(CLICK_WINDOW_WAIT_MS);
      expect((await actionCalls(page))[action]).toBe(1);
    });
  }

  test('#gf-retry: sau từng tổ hợp đa chạm, lần chạm đơn kế tiếp chạy đúng một lần', async ({ page }) => {
    test.setTimeout(90_000);
    const problems = await open(page);
    await load(page, FOUR_WAY());
    const fingers = await Fingers.on(page);
    await spyActions(page);
    const at = await centerOf(page, '#gf-retry');
    const board = await toScreen(page, SWIPE_FROM);
    const out = { x: at.x + 260, y: at.y - 150 };
    const combos: [string, () => Promise<void>][] = [
      ['hai ngón, A nhấc trước', async () => {
        await fingers.down(1, at); await fingers.down(2, { x: at.x + 10, y: at.y }); await fingers.up(1); await fingers.up(2);
      }],
      ['hai ngón, B nhấc trước', async () => {
        await fingers.down(1, at); await fingers.down(2, { x: at.x + 10, y: at.y }); await fingers.up(2); await fingers.up(1);
      }],
      ['kéo ra rồi kéo vào lại', async () => {
        await fingers.down(1, at); await fingers.move(1, out, 3); await fingers.move(1, at, 3); await fingers.up(1);
      }],
      ['kéo ra, ngón hai bấm', async () => {
        await fingers.down(1, at); await fingers.move(1, out, 3);
        await fingers.down(2, at); await fingers.up(2); await fingers.up(1);
      }],
      ['blur với hai ngón', async () => {
        await fingers.down(1, at); await fingers.down(2, { x: at.x + 10, y: at.y });
        await loseFocus(page, 'blur'); await fingers.up(2); await fingers.up(1);
      }],
      ['visibilitychange', async () => {
        await fingers.down(1, at); await loseFocus(page, 'visibilitychange'); await fingers.up(1);
      }],
      ['touchcancel với hai ngón', async () => {
        await fingers.down(1, at); await fingers.down(2, { x: at.x + 10, y: at.y }); await fingers.cancel();
      }],
      ['ngón trên bàn và ngón trên nút', async () => {
        await fingers.down(1, board); await fingers.down(2, at); await fingers.up(2); await fingers.up(1);
      }],
      ['vuốt trên bàn rồi bấm nút khi còn giữ', async () => {
        await fingers.down(1, board); await fingers.move(1, { x: board.x, y: board.y + 90 * board.scale }, 3);
        await fingers.down(2, at); await fingers.up(2); await fingers.up(1);
      }],
    ];
    for (const [name, run] of combos) {
      await load(page, FOUR_WAY());
      const before = (await actionCalls(page)).retry;
      await run();
      await page.waitForTimeout(CLICK_WINDOW_WAIT_MS);
      const afterCombo = (await actionCalls(page)).retry;
      expect(afterCombo - before, `${name}: tổ hợp chạy quá một lần`).toBeLessThanOrEqual(1);
      await tapElement(page, fingers, '#gf-retry');
      expect((await actionCalls(page)).retry - afterCombo, `${name}: chạm đơn kế tiếp bị nuốt`).toBe(1);
      await page.waitForTimeout(CLICK_WINDOW_WAIT_MS);
      expect((await actionCalls(page)).retry - afterCombo, `${name}: chạm đơn kế tiếp chạy hai lần`).toBe(1);
    }
    expect(problems).toEqual([]);
  });

  test('Ngón giữ trên #gf-retry không bị xóa khi ngón khác bấm #gf-next, nhấc trên nút vẫn chạy', async ({ page }) => {
    const problems = await open(page);
    const fingers = await Fingers.on(page);
    await loadWin(page);
    await swipeDir(page, fingers, 'down');
    await lockOver(page);
    await spyActions(page);
    await fingers.down(1, await centerOf(page, '#gf-retry'));
    await fingers.down(2, await centerOf(page, '#gf-next'));
    await fingers.up(2);
    expect(await actionCalls(page)).toEqual({ retry: 0, next: 1 });
    expect((await read(page)).levelIndex).toBe(1);
    await fingers.up(1);
    await page.waitForTimeout(CLICK_WINDOW_WAIT_MS);
    expect(await actionCalls(page)).toEqual({ retry: 1, next: 1 });
    expect(await read(page)).toMatchObject({ levelIndex: 1, tiltsUsed: 0, status: 'playing' });
    expect(problems).toEqual([]);
  });

  test('#gf-retry: hai lần chạm cách nhau dưới 500 ms đều có tác dụng, không kẹt', async ({ page }) => {
    const problems = await open(page);
    await load(page, FOUR_WAY());
    const fingers = await Fingers.on(page);
    await spyActions(page);
    await tapElement(page, fingers, '#gf-retry');
    const firstUp = await page.evaluate(() => (window as QaPointerWindow).__qaPointerLog!.at(-1)!.t);
    await page.keyboard.press('ArrowDown');
    expect((await read(page)).tiltsUsed).toBe(1);
    await tapElement(page, fingers, '#gf-retry');
    const secondUp = await page.evaluate(() => (window as QaPointerWindow).__qaPointerLog!.at(-1)!.t);
    expect(secondUp - firstUp).toBeLessThan(500);
    expect(await read(page)).toMatchObject({ tiltsUsed: 0, animating: false });
    await page.waitForTimeout(CLICK_WINDOW_WAIT_MS);
    expect((await actionCalls(page)).retry).toBe(2);

    await page.keyboard.press('ArrowDown');
    await settle(page);
    await tapElement(page, fingers, '#gf-retry');
    expect((await read(page)).tiltsUsed).toBe(0);
    expect(problems).toEqual([]);
  });

  test('#gf-next: giữ ngón trên bàn, bấm khi còn khóa không sang màn, hết khóa thì sang', async ({ page }) => {
    await open(page);
    const fingers = await Fingers.on(page);
    await loadWin(page);
    await swipeDir(page, fingers, 'down');
    await page.waitForFunction(() => {
      const s = window.__game!.getState<GatefallState>()!;
      return !s.animating && s.endLockLeftMs > 120;
    }, null, { polling: 10 });
    await fingers.down(1, await toScreen(page, SWIPE_FROM));
    await tapElement(page, fingers, '#gf-next');
    expect(await read(page)).toMatchObject({ levelIndex: 0, status: 'won' });
    await lockOver(page);
    await tapElement(page, fingers, '#gf-next');
    expect(await read(page)).toMatchObject({ levelIndex: 1, status: 'playing' });
    await fingers.up(1);
  });

  test('Ngón trên nút không chặn vuốt sau khi nhấc hết tay', async ({ page }) => {
    await open(page);
    await load(page, FOUR_WAY());
    const fingers = await Fingers.on(page);
    await fingers.down(1, await centerOf(page, '#gf-retry'));
    await page.waitForTimeout(80);
    await fingers.up(1);
    await swipeDir(page, fingers, 'down');
    expect(await read(page)).toMatchObject({ tiltsUsed: 1, lastTiltDir: 'down' });
  });

  test('Chốt: ngón giữ trên nút không chặn vuốt, kể cả vuốt tiếp sau khi ngón trên canvas đã nhấc', async ({ page }) => {
    const problems = await open(page);
    await load(page, FOUR_WAY());
    const fingers = await Fingers.on(page);
    await fingers.down(9, await centerOf(page, '#gf-retry'));
    const a = await toScreen(page, SWIPE_FROM);
    await fingers.down(1, a);
    await fingers.move(1, { x: a.x, y: a.y + 90 * a.scale }, 3);
    expect(await read(page)).toMatchObject({ tiltsUsed: 1, lastTiltDir: 'down' });
    await settle(page);
    await fingers.up(1);

    await fingers.down(2, a);
    await fingers.move(2, { x: a.x - 90 * a.scale, y: a.y }, 3);
    expect(await read(page)).toMatchObject({ tiltsUsed: 2, lastTiltDir: 'left' });
    await fingers.up(2);
    await fingers.up(9);
    expect(problems).toEqual([]);
  });

  for (const how of ['blur', 'visibilitychange'] as const) {
    test(`Chốt: ${how} đặt lại bộ đếm ngón, ngón mới vuốt được dù ngón cũ còn giữ`, async ({ page }) => {
      const problems = await open(page);
      await load(page, FOUR_WAY());
      const fingers = await Fingers.on(page);
      const a = await toScreen(page, { x: 560, y: 200 });
      const b = await toScreen(page, { x: 680, y: 200 });
      await fingers.down(1, a);
      await fingers.move(1, { x: a.x, y: a.y + 90 * a.scale }, 3);
      expect((await read(page)).tiltsUsed).toBe(1);
      await settle(page);

      await loseFocus(page, how);
      // The old finger is spent: moving it further must still do nothing.
      await fingers.move(1, { x: a.x + 90 * a.scale, y: a.y + 90 * a.scale }, 3);
      expect((await read(page)).tiltsUsed).toBe(1);

      await fingers.down(2, b);
      await fingers.move(2, { x: b.x - 90 * b.scale, y: b.y }, 3);
      expect(await read(page)).toMatchObject({ tiltsUsed: 2, lastTiltDir: 'left' });
      await fingers.up(2);
      await fingers.up(1);
      expect(problems).toEqual([]);
    });
  }

  test('Không kẹt vuốt sau khi chuyển màn với ngón vẫn đang giữ', async ({ page }) => {
    const problems = await open(page);
    const fingers = await Fingers.on(page);
    await loadWin(page);
    await swipeDir(page, fingers, 'down');
    await lockOver(page);
    const held = await toScreen(page, SWIPE_FROM);
    await fingers.down(1, held);
    await tapElement(page, fingers, '#gf-next');
    expect(await read(page)).toMatchObject({ levelIndex: 1, status: 'playing', tiltsUsed: 0 });

    // The finger that was already down belongs to the previous level and must not tilt the new one.
    await fingers.move(1, { x: held.x, y: held.y + 90 * held.scale }, 3);
    await page.waitForTimeout(80);
    expect((await read(page)).tiltsUsed).toBe(0);
    await fingers.up(1);

    const dir = (await read(page)).validTilts[0];
    await swipeDir(page, fingers, dir);
    expect(await read(page)).toMatchObject({ tiltsUsed: 1, lastTiltDir: dir });
    expect(problems).toEqual([]);
  });
});

test.describe('C6 chốt vuốt đúng đường chéo', () => {
  test('classifySwipe: đường chéo đúng bị bỏ với ratio 1, lệch một chút thì có hướng', () => {
    for (const [dx, dy] of [[40, 40], [-40, 40], [40, -40], [-40, -40]]) {
      expect(classifySwipe(dx, dy, 28, 1)).toBe('invalid');
    }
    expect(classifySwipe(41, 40, 28, 1)).toBe('right');
    expect(classifySwipe(40, -41, 28, 1)).toBe('up');
  });
});

test.describe('C6 tại ngưỡng khi canvas không co', () => {
  test.use({ viewport: { width: 960, height: 540 }, hasTouch: true, isMobile: true });

  test('Chốt: vuốt thật đúng đường chéo với ratio = 1 bị bỏ qua, không tính từ chối', async ({ page }) => {
    await open(page);
    await page.evaluate(() => { window.__game!.tuning.gfSwipeAxisRatio = 1; });
    await load(page, FOUR_WAY());
    const fingers = await Fingers.on(page);
    for (const [dx, dy] of [[40, 40], [-40, 40], [40, -40], [-40, -40]]) {
      await swipeGame(page, fingers, dx, dy);
      expect(await read(page), `${dx},${dy}`).toMatchObject({ tiltsUsed: 0, rejectedTilts: 0 });
    }
    await swipeGame(page, fingers, 44, 40);
    expect(await read(page)).toMatchObject({ tiltsUsed: 1, lastTiltDir: 'right' });
  });

  test('C6.4 biên: 27 px không nhận, 28 px nhận', async ({ page }) => {
    await open(page);
    await load(page, FOUR_WAY());
    const fingers = await Fingers.on(page);
    expect((await toScreen(page, SWIPE_FROM)).scale).toBeCloseTo(1, 3);
    await swipeGame(page, fingers, 27, 0);
    expect((await read(page)).tiltsUsed).toBe(0);
    await swipeGame(page, fingers, 28, 0);
    expect(await read(page)).toMatchObject({ tiltsUsed: 1, lastTiltDir: 'right' });
  });
});

test.describe('C6 chơi tự do bằng input thật', () => {
  test('Lượt tự do từ đầu đến hết màn 1, xen phím sai, phím thừa và vuốt không có', async ({ page }) => {
    test.setTimeout(150_000);
    const problems = await open(page);
    let random = 20261123;
    const pick = (n: number) => {
      random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
      return (random >>> 16) % n;
    };
    const startedAt = Date.now();
    let presses = 0;
    let state = await read(page);
    while (state.status === 'playing' && presses < 200) {
      const dir = DIRS[pick(4)];
      await page.keyboard.press(KEY[dir]);
      presses += 1;
      if (pick(4) === 0) await page.keyboard.press(KEY[DIRS[pick(4)]]);
      if (pick(9) === 0) await page.keyboard.press('Enter');
      await settle(page);
      await page.waitForTimeout(650);
      state = await read(page);
      expect(state.tiltsLeft).toBe(Math.max(0, state.tiltLimit - state.tiltsUsed - state.ventCount * (await page.evaluate(() => window.__game!.tuning.gfVentTiltCost))));
      expect(state.viewCounts.pieces).toBe(state.board.flat().filter((c) => c !== null).length);
      if (presses === 8) await page.screenshot({ path: 'artifacts/gatefall-c6-free-mid.png' });
    }
    expect(['won', 'lost']).toContain(state.status);
    expect(Date.now() - startedAt).toBeGreaterThan(30_000);
    await page.screenshot({ path: 'artifacts/gatefall-c6-free-end.png' });
    expect(problems).toEqual([]);
    test.info().annotations.push({ type: 'free-play', description: `${presses} lượt bấm, kết thúc ${state.status}, còn ${state.tiltsLeft} lượt` });
    console.log(`[free-play] ${presses} lượt bấm, ${state.tiltsUsed} nghiêng, ${state.rejectedTilts} bị từ chối, ${state.ventCount} xả, kết thúc ${state.status}`);
  });
});

for (const [name, use] of [
  ['960x540', { viewport: { width: 960, height: 540 }, hasTouch: true, isMobile: true }],
  ['844x390', PHONE],
] as const) {
  test.describe(`C6 bố cục và ảnh ${name}`, () => {
    test.use(use);

    test('đang chơi, thắng, thua, hoàn thành 3 màn: nút và bảng không che bàn, cửa, HUD', async ({ page }) => {
      const problems = await open(page);
      const fingers = await Fingers.on(page);
      const shot = (state: string) => page.screenshot({ path: `artifacts/gatefall-c6-${name}-${state}.png` });

      await expectCleanLayout(page);
      await shot('playing');

      await loadWin(page);
      await swipeDir(page, fingers, 'down');
      await lockOver(page);
      await expectCleanLayout(page);
      await shot('won');

      await load(page, F1_LAST_TILT());
      await swipeDir(page, fingers, 'down');
      await settle(page);
      expect((await read(page)).status).toBe('lost');
      await expectCleanLayout(page);
      await shot('lost');

      await loadWin(page, 2);
      await swipeDir(page, fingers, 'down');
      await lockOver(page);
      expect((await read(page)).campaignComplete).toBe(true);
      await expectCleanLayout(page);
      await shot('complete');
      expect(problems).toEqual([]);
    });

    test('Chữ ĐỦ ở HUD mục tiêu: có đủ chỗ cho dấu, dòng không lệch khỏi biểu tượng, không chồng nhau', async ({ page }) => {
      await open(page);
      const fingers = await Fingers.on(page);
      const readRows = () => page.evaluate(async () => {
        const entry = performance.getEntriesByType('resource').map((r) => r.name)
          .find((n) => n.includes('/src/scenes/GatefallScene.ts'));
        const proto = (await import(/* @vite-ignore */ entry!)).GatefallScene.prototype;
        const original = proto.getState;
        let scene: unknown = null;
        proto.getState = function (this: unknown) { scene = this; return original.call(this); };
        window.__game!.getState();
        proto.getState = original;
        const rows = (scene as { goalRows: { icon: { y: number }; text: { text: string; getBounds(): { top: number; bottom: number; left: number; right: number } } }[] }).goalRows;
        return rows.map((r) => ({ iconY: r.icon.y, text: r.text.text, ...(({ top, bottom, left, right }) => ({ top, bottom, left, right }))(r.text.getBounds()) }));
      });
      const before = await readRows();
      await loadWin(page, 2);
      await swipeDir(page, fingers, 'down');
      await lockOver(page);
      const rows = await readRows();
      expect(rows).toHaveLength(3);
      for (const [i, row] of rows.entries()) {
        expect(row.text).toContain('ĐỦ');
        expect(Math.abs((row.top + row.bottom) / 2 - row.iconY), `dòng ${i} lệch khỏi biểu tượng`).toBeLessThanOrEqual(1);
        if (i > 0) expect(row.top, `dòng ${i} chồng dòng trên`).toBeGreaterThanOrEqual(rows[i - 1].bottom);
      }
      // Same rows before the win (level 1 has two): the done text must not move the row.
      for (const [i, row] of before.entries()) expect(row.iconY).toBe(rows[i].iconY);
      const canvas = (await page.locator('canvas').boundingBox())!;
      const scale = canvas.width / GAME_W;
      await page.screenshot({
        path: `artifacts/gatefall-c6-${name}-goals.png`,
        clip: { x: canvas.x, y: canvas.y + 120 * scale, width: 360 * scale, height: 180 * scale },
      });
    });
  });
}

test.describe('C6 vừa khung hình desktop 1600x900', () => {
  test.use({ viewport: { width: 1600, height: 900 } });

  test('canvas nằm trong khung, không cuộn', async ({ page }) => {
    await open(page);
    const fit = await page.evaluate(() => {
      const c = document.querySelector('canvas')!.getBoundingClientRect();
      const d = document.documentElement;
      return {
        canvasInside: c.left >= 0 && c.top >= 0 && c.right <= innerWidth && c.bottom <= innerHeight,
        scrollX: d.scrollWidth > d.clientWidth,
        scrollY: d.scrollHeight > d.clientHeight,
      };
    });
    expect(fit).toEqual({ canvasInside: true, scrollX: false, scrollY: false });
    await page.screenshot({ path: 'artifacts/gatefall-c6-1600x900.png' });
  });
});

test.describe('C6 vừa khung hình điện thoại dọc 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('canvas nằm trong khung, nút chạm được, ảnh để soát', async ({ page }) => {
    await open(page);
    const fingers = await Fingers.on(page);
    const fit = await page.evaluate(() => {
      const c = document.querySelector('canvas')!.getBoundingClientRect();
      const d = document.documentElement;
      return {
        canvasInside: c.left >= 0 && c.top >= 0 && c.right <= innerWidth && c.bottom <= innerHeight,
        scrollX: d.scrollWidth > d.clientWidth,
        scrollY: d.scrollHeight > d.clientHeight,
      };
    });
    expect(fit).toEqual({ canvasInside: true, scrollX: false, scrollY: false });
    await loadWin(page, 2);
    await swipeDir(page, fingers, 'down');
    await lockOver(page);
    await page.screenshot({ path: 'artifacts/gatefall-c6-390x844-complete.png' });
    await tapElement(page, fingers, '#gf-next');
    await page.waitForFunction(() => window.__game!.getState<GatefallState>()!.levelIndex === 0);
  });
});
