import { expect, test, type Page } from '@playwright/test';
import { TUNING_RANGES } from '../src/config';
import type { ArcRelayState } from '../src/scenes/ArcRelayScene';

/** Values copied from section 5 of docs/briefs/arc-relay.md on purpose: expectations come from the brief, not from src/. */
const BRIEF = {
  arcRadius: 220,
  pylons: [
    { id: 0, x: 590, y: 330 },
    { id: 1, x: 940, y: 300 },
    { id: 2, x: 1290, y: 320 },
    { id: 3, x: 1610, y: 300 },
    { id: 4, x: 1950, y: 330 },
  ],
};

const COIN_HOP_KEYS = ['coins', 'elapsedMs', 'grounded', 'status', 'totalCoins', 'vx', 'vy', 'x', 'y'];

/** Over the first pit, inside pylon 0's radius only, far enough for the arc to span several frames. */
const AIR_NEAR_PYLON_0 = { x: 740, y: 420 };

interface QaRecorder {
  samples: ArcRelayState[];
  pressState: ArcRelayState | null;
}

declare global {
  interface Window {
    __qa?: QaRecorder;
    __qaFrameStamps?: number[];
  }
}

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

const openArc = async (page: Page) => {
  await page.goto('/?game=arc-relay');
  await page.waitForFunction(() => window.__game?.getState<ArcRelayState>()?.status === 'playing');
};

const readState = (page: Page) => page.evaluate(() => window.__game!.getState<ArcRelayState>()!);

const readQa = (page: Page) => page.evaluate(() => window.__qa!);

/** Teleports, then presses jump for exactly one frame on the first airborne frame. Records every frame. */
const tapJumpInAir = (page: Page, x: number, y: number) =>
  page.evaluate(
    ([px, py]) => {
      const qa: QaRecorder = { samples: [], pressState: null };
      window.__qa = qa;
      window.__game!.setBot<ArcRelayState>((s) => {
        qa.samples.push(s);
        const press = qa.pressState === null && !s.grounded;
        if (press) qa.pressState = s;
        return { left: false, right: false, jump: press };
      });
      window.__game!.teleport(px, py);
    },
    [x, y],
  );

/** Records every frame with no input. */
const watchIdle = (page: Page, x: number, y: number) =>
  page.evaluate(
    ([px, py]) => {
      const qa: QaRecorder = { samples: [], pressState: null };
      window.__qa = qa;
      window.__game!.setBot<ArcRelayState>((s) => {
        qa.samples.push(s);
        return { left: false, right: false, jump: false };
      });
      window.__game!.teleport(px, py);
    },
    [x, y],
  );

const waitFrames = (page: Page, frames: number) =>
  page.waitForFunction((n) => (window.__qa?.samples.length ?? 0) >= n, frames, { timeout: 10_000 });

const waitArcFinished = (page: Page, arcCount: number) =>
  page.waitForFunction(
    (n) => Boolean(window.__qa?.samples.some((s) => s.arcCount === n && !s.arcing)),
    arcCount,
    { timeout: 10_000 },
  );

const standAt = async (page: Page, x: number) => {
  await page.evaluate((px) => window.__game!.teleport(px, 470), x);
  await page.waitForFunction(
    (px) => {
      const s = window.__game!.getState<ArcRelayState>();
      return Boolean(s?.grounded) && s!.x === px;
    },
    x,
    { timeout: 10_000 },
  );
};

/** Reads the target synchronously after a teleport, before gravity can move the player. */
const targetableAt = (page: Page, x: number, y: number) =>
  page.evaluate(
    ([px, py]) => {
      window.__game!.teleport(px, py);
      return window.__game!.getState<ArcRelayState>()!.arcTargetableId;
    },
    [x, y],
  );

const lightPylon0 = async (page: Page) => {
  await tapJumpInAir(page, AIR_NEAR_PYLON_0.x, AIR_NEAR_PYLON_0.y);
  await waitArcFinished(page, 1);
};

const expectCoinHopState = async (page: Page, path: string) => {
  await page.goto(path);
  await page.waitForFunction(() => window.__game?.getState()?.status === 'playing');
  const state = (await page.evaluate(() => window.__game!.getState()))!;
  expect(state).not.toHaveProperty('gameId');
  expect(state.totalCoins).toBe(3);
  expect(Object.keys(state).sort()).toEqual(COIN_HOP_KEYS);
};

test.describe('C1', () => {
  test('C1.1 mở / vẫn là Coin Hop với đúng 9 trường', async ({ page }) => {
    await expectCoinHopState(page, '/');
  });

  test('C1.2 tham số game khác vẫn mở Coin Hop', async ({ page }) => {
    await expectCoinHopState(page, '/?game=khac');
  });

  test('C1.3 mở Arc Relay với trạng thái đầu đúng', async ({ page }) => {
    await openArc(page);
    const s = await readState(page);
    expect(s.gameId).toBe('arc-relay');
    expect(s.status).toBe('playing');
    expect(s.pylonsTotal).toBe(5);
    expect(s.pylons).toHaveLength(5);
    expect(s.pylonsLit).toBe(0);
    expect(s.arcCount).toBe(0);
    expect(s.pylons.map(({ id, x, y }) => ({ id, x, y }))).toEqual(BRIEF.pylons);
    expect(s.pylons.every((p) => !p.lit)).toBe(true);
  });

  test('C1.4 bấm nhảy trên đất trong bán kính là nhảy thường', async ({ page }) => {
    await openArc(page);
    const standX = 860;
    await standAt(page, standX);
    const before = await readState(page);
    expect(distance(before, BRIEF.pylons[1])).toBeLessThanOrEqual(BRIEF.arcRadius);
    expect(before.arcTargetableId).toBeNull();

    await page.evaluate(() => {
      const qa: QaRecorder = { samples: [], pressState: null };
      window.__qa = qa;
      window.__game!.setBot<ArcRelayState>((s) => {
        qa.samples.push(s);
        return { left: false, right: false, jump: true };
      });
    });
    await page.waitForFunction(() => Boolean(window.__qa?.samples.some((s) => !s.grounded && s.vy < 0)), null, {
      timeout: 10_000,
    });
    const { samples } = await readQa(page);
    const airborne = samples.find((s) => !s.grounded && s.vy < 0)!;
    expect(airborne.vy).toBeLessThan(0);
    expect(airborne.arcing).toBe(false);
    expect(samples.every((s) => s.arcCount === 0)).toBe(true);
  });

  test('C1.4 biên: bấm trong coyote là nhảy thường, không phóng', async ({ page }) => {
    await openArc(page);
    await standAt(page, 340);
    await page.evaluate(() => {
      const qa: QaRecorder = { samples: [], pressState: null };
      window.__qa = qa;
      window.__game!.setBot<ArcRelayState>((s) => {
        qa.samples.push(s);
        const press = qa.pressState === null && !s.grounded;
        if (press) qa.pressState = s;
        return { left: false, right: true, jump: qa.pressState !== null };
      });
    });
    await page.waitForFunction(() => Boolean(window.__qa?.samples.some((s) => !s.grounded && s.vy < -300)), null, {
      timeout: 10_000,
    });
    const { samples, pressState } = await readQa(page);
    expect(distance(pressState!, BRIEF.pylons[0])).toBeLessThanOrEqual(BRIEF.arcRadius);
    expect(pressState!.arcTargetableId).toBeNull();
    expect(samples.every((s) => s.arcCount === 0)).toBe(true);
  });

  test('C1.5 trên không có cột 0 hợp lệ thì bấm nhảy sẽ phóng', async ({ page }) => {
    await openArc(page);
    await tapJumpInAir(page, AIR_NEAR_PYLON_0.x, AIR_NEAR_PYLON_0.y);
    await page.waitForFunction(() => Boolean(window.__qa?.samples.some((s) => s.arcing)), null, { timeout: 10_000 });
    const { samples, pressState } = await readQa(page);
    expect(pressState!.arcTargetableId).toBe(0);
    const arcing = samples.find((s) => s.arcing)!;
    expect(arcing.arcTargetId).toBe(0);
    expect(arcing.arcCount).toBe(1);
  });

  test('C1.6 kết thúc cú phóng thì cột 0 được thắp', async ({ page }) => {
    await openArc(page);
    await lightPylon0(page);
    const { samples } = await readQa(page);
    const finished = samples.find((s) => s.arcCount === 1 && !s.arcing)!;
    expect(finished.arcing).toBe(false);
    expect(finished.pylons[0].lit).toBe(true);
    expect(finished.pylonsLit).toBe(1);
    expect(finished.pylons.filter((p) => p.lit).map((p) => p.id)).toEqual([0]);
  });

  test('C1.6 biên: cú phóng vẫn thắp cột ở FPS thấp', async ({ page }) => {
    await openArc(page);
    // CDP CPU throttling did not change the frame time here, so each frame is blocked directly.
    await page.evaluate(() => {
      const stamps: number[] = [];
      window.__qaFrameStamps = stamps;
      const hog = () => {
        stamps.push(performance.now());
        const end = performance.now() + 90;
        while (performance.now() < end) {
          // Busy wait to hold the frame rate near 10 FPS.
        }
        requestAnimationFrame(hog);
      };
      requestAnimationFrame(hog);
    });
    await page.waitForFunction(() => (window.__qaFrameStamps?.length ?? 0) >= 5, null, { timeout: 10_000 });
    await lightPylon0(page);

    const { samples } = await readQa(page);
    const finished = samples.find((s) => s.arcCount === 1 && !s.arcing)!;
    expect(finished.pylons[0].lit).toBe(true);
    expect(finished.pylonsLit).toBe(1);

    const stamps = await page.evaluate(() => window.__qaFrameStamps!);
    const intervals = stamps.slice(1).map((t, i) => t - stamps[i]).sort((a, b) => a - b);
    const medianMs = intervals[Math.floor(intervals.length / 2)];
    expect(medianMs).toBeGreaterThanOrEqual(50); // Proves the run really was low FPS.
    const gameDeltas = samples.slice(1).map((s, i) => s.elapsedMs - samples[i].elapsedMs);
    test.info().annotations.push({
      type: 'low-fps',
      description: `realMedianMs=${Math.round(medianMs)} maxGameDeltaMs=${Math.max(...gameDeltas)} arcFrames=${samples.filter((s) => s.arcing).length}`,
    });
  });

  test('C1.7 trên không ngoài bán kính thì bấm nhảy không phóng', async ({ page }) => {
    await openArc(page);
    const point = { x: 250, y: 300 };
    expect(Math.min(...BRIEF.pylons.map((p) => distance(point, p)))).toBeGreaterThan(BRIEF.arcRadius);
    await tapJumpInAir(page, point.x, point.y);
    await page.waitForFunction(() => Boolean(window.__qa?.samples.some((s) => s.grounded)), null, { timeout: 10_000 });
    const { samples, pressState } = await readQa(page);
    expect(pressState!.arcTargetableId).toBeNull();
    expect(samples.every((s) => s.arcCount === 0 && !s.arcing)).toBe(true);
  });

  test('C1.8 có hai cột trong bán kính thì chọn cột gần hơn', async ({ page }) => {
    await openArc(page);
    const nearer1 = { x: 800, y: 320 };
    const nearer0 = { x: 730, y: 320 };
    const tie = { x: 765, y: 315 };
    for (const point of [nearer1, nearer0, tie]) {
      expect(distance(point, BRIEF.pylons[0])).toBeLessThanOrEqual(BRIEF.arcRadius);
      expect(distance(point, BRIEF.pylons[1])).toBeLessThanOrEqual(BRIEF.arcRadius);
    }
    expect(distance(tie, BRIEF.pylons[0])).toBe(distance(tie, BRIEF.pylons[1]));

    expect(await targetableAt(page, nearer1.x, nearer1.y)).toBe(1);
    expect(await targetableAt(page, nearer0.x, nearer0.y)).toBe(0);
    expect(await targetableAt(page, tie.x, tie.y)).toBe(0);

    await tapJumpInAir(page, nearer1.x, nearer1.y);
    await page.waitForFunction(() => Boolean(window.__qa?.samples.some((s) => s.arcing)), null, { timeout: 10_000 });
    const { samples } = await readQa(page);
    expect(samples.find((s) => s.arcing)!.arcTargetId).toBe(1);
  });

  test('C1.9 cột đã thắp không còn là mục tiêu', async ({ page }) => {
    await openArc(page);
    const point = { x: 590, y: 400 };
    expect(await targetableAt(page, point.x, point.y)).toBe(0);

    await lightPylon0(page);
    expect(await targetableAt(page, point.x, point.y)).toBeNull();

    await tapJumpInAir(page, point.x, point.y);
    await waitFrames(page, 12);
    const { samples, pressState } = await readQa(page);
    expect(pressState!.arcTargetableId).toBeNull();
    expect(samples.every((s) => s.arcCount === 1 && !s.arcing && s.pylonsLit === 1)).toBe(true);
  });

  test('C1.10 giữ nút nhảy qua bán kính cột không phóng', async ({ page }) => {
    await openArc(page);
    await standAt(page, 300);
    await page.evaluate(() => {
      const qa: QaRecorder = { samples: [], pressState: null };
      window.__qa = qa;
      window.__game!.setBot<ArcRelayState>((s) => {
        qa.samples.push(s);
        if (qa.pressState === null && s.grounded && s.x >= 360) qa.pressState = s;
        return { left: false, right: true, jump: qa.pressState !== null };
      });
    });
    await page.waitForFunction(
      () => {
        const samples = window.__qa?.samples ?? [];
        const entered = samples.findIndex((s) => s.arcTargetableId === 0);
        return entered >= 0 && samples.slice(entered).some((s) => s.arcTargetableId === null || s.y > 520);
      },
      null,
      { timeout: 10_000 },
    );
    const { samples } = await readQa(page);
    expect(samples.some((s) => !s.grounded && s.arcTargetableId === 0)).toBe(true);
    expect(samples.every((s) => s.arcCount === 0 && !s.arcing)).toBe(true);
  });

  test('C1.11 đi xuyên vị trí cột không thắp cột', async ({ page }) => {
    await openArc(page);
    for (const pylon of BRIEF.pylons) {
      await watchIdle(page, pylon.x, pylon.y - 40);
      await page.waitForFunction(
        (targetY) => Boolean(window.__qa?.samples.some((s) => s.y >= targetY)),
        pylon.y + 20,
        { timeout: 10_000 },
      );
      const { samples } = await readQa(page);
      expect(samples.every((s) => s.x === pylon.x)).toBe(true);
      expect(samples.every((s) => s.pylonsLit === 0 && s.arcCount === 0 && !s.arcing)).toBe(true);
    }
  });

  test('C1 console: không có lỗi khi chơi Arc Relay', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await openArc(page);
    await page.screenshot({ path: 'artifacts/arc-c1-start.png' });
    await lightPylon0(page);
    await tapJumpInAir(page, 800, 320);
    await waitArcFinished(page, 2);
    await page.evaluate(() => window.__game!.restart());
    await page.waitForFunction(() => {
      const s = window.__game?.getState<ArcRelayState>();
      return s?.status === 'playing' && s.arcCount === 0;
    });
    expect(errors).toEqual([]);
  });

  test('C1 ảnh: cột đã thắp, cột hợp lệ và cột thường cùng khung hình', async ({ page }) => {
    await openArc(page);
    await lightPylon0(page);
    // Zero gravity only holds the pose for the screenshot; the page is discarded afterwards.
    await page.evaluate(() => {
      window.__game!.setBot(null);
      window.__game!.tuning.gravity = 0;
      window.__game!.teleport(1040, 320);
    });
    await page.waitForFunction(() => window.__game?.getState<ArcRelayState>()?.arcTargetableId === 1);
    await page.waitForTimeout(1_000); // Lets the smoothed camera settle; no state exposes it.
    const s = await readState(page);
    expect(s.arcTargetableId).toBe(1);
    expect(s.pylons[0].lit).toBe(true);
    await page.screenshot({ path: 'artifacts/arc-c1-tints.png' });
  });
});

/** Values from section 5 of the brief. */
const BRIEF_C2 = { moveSpeed: 260, gravity: 1400, arcExitJumpVelocity: 520, peakTolerancePx: 12 };

/** Frames recorded after the first arc has ended. */
const afterFirstArc = (samples: ArcRelayState[]) =>
  samples.slice(samples.findIndex((s) => s.arcCount === 1 && !s.arcing));

const waitPastApex = (page: Page) =>
  page.waitForFunction(
    () => {
      const samples = window.__qa?.samples ?? [];
      const end = samples.findIndex((s) => s.arcCount === 1 && !s.arcing);
      return end >= 0 && samples.slice(end).some((s) => s.vy > 0);
    },
    null,
    { timeout: 10_000 },
  );

const expectFullBounce = (samples: ArcRelayState[]) => {
  const flight = afterFirstArc(samples);
  const rising = flight.slice(0, flight.findIndex((s) => s.vy > 0) + 1);
  const peak = BRIEF.pylons[0].y - Math.min(...rising.map((s) => s.y));
  const expected = BRIEF_C2.arcExitJumpVelocity ** 2 / (2 * BRIEF_C2.gravity);
  expect(Math.abs(peak - expected)).toBeLessThanOrEqual(BRIEF_C2.peakTolerancePx);
};

test.describe('C2', () => {
  test('C2.1 lần đọc đầu sau khi tới cột đang bật lên và không chạm đất', async ({ page }) => {
    await openArc(page);
    await lightPylon0(page);
    const { samples } = await readQa(page);
    const first = afterFirstArc(samples)[0];
    expect(first.arcing).toBe(false);
    expect(first.vy).toBeLessThan(0);
    expect(first.grounded).toBe(false);
  });

  test('C2.1 biên: vx theo hướng phóng, phóng thẳng đứng thì vx bằng 0', async ({ page }) => {
    await openArc(page);
    await tapJumpInAir(page, AIR_NEAR_PYLON_0.x, AIR_NEAR_PYLON_0.y); // Arcs left.
    await waitArcFinished(page, 1);
    expect(afterFirstArc((await readQa(page)).samples)[0].vx).toBe(-BRIEF_C2.moveSpeed);

    await openArc(page);
    await tapJumpInAir(page, 450, 420); // Arcs right.
    await waitArcFinished(page, 1);
    expect(afterFirstArc((await readQa(page)).samples)[0].vx).toBe(BRIEF_C2.moveSpeed);

    await openArc(page);
    await tapJumpInAir(page, BRIEF.pylons[0].x, 420); // Arcs straight up.
    await waitArcFinished(page, 1);
    expect(afterFirstArc((await readQa(page)).samples)[0].vx).toBe(0);
  });

  test('C2.2 giữ phải sau khi tới cột thì vx dương tới khi có cột kế tiếp', async ({ page }) => {
    await openArc(page);
    await page.evaluate(() => {
      const qa: QaRecorder = { samples: [], pressState: null };
      window.__qa = qa;
      window.__game!.setBot<ArcRelayState>((s) => {
        qa.samples.push(s);
        const press = qa.pressState === null && !s.grounded;
        if (press) qa.pressState = s;
        return { left: false, right: true, jump: press };
      });
      window.__game!.teleport(450, 420);
    });
    await page.waitForFunction(
      () => Boolean(window.__qa?.samples.some((s) => s.pylonsLit === 1 && (s.arcTargetableId === 1 || s.grounded))),
      null,
      { timeout: 10_000 },
    );
    const flight = afterFirstArc((await readQa(page)).samples);
    const stop = flight.findIndex((s) => s.arcTargetableId === 1 || s.grounded);
    expect(flight[stop].arcTargetableId).toBe(1);
    expect(flight.slice(0, stop + 1).every((s) => s.vx > 0)).toBe(true);
  });

  test('C2.3 nhả nút ngay khi tới cột vẫn bật đủ độ cao', async ({ page }) => {
    await openArc(page);
    await page.evaluate((x) => {
      const qa: QaRecorder = { samples: [], pressState: null };
      window.__qa = qa;
      window.__game!.setBot<ArcRelayState>((s) => {
        qa.samples.push(s);
        if (qa.pressState === null && !s.grounded) qa.pressState = s;
        const arrived = s.arcCount === 1 && !s.arcing;
        return { left: false, right: false, jump: qa.pressState !== null && !arrived };
      });
      window.__game!.teleport(x, 420);
    }, BRIEF.pylons[0].x);
    await waitPastApex(page);
    expectFullBounce((await readQa(page)).samples);
  });

  test('C2.3 biên: nhả nút trước khi tới cột vẫn bật đủ độ cao', async ({ page }) => {
    await openArc(page);
    await tapJumpInAir(page, BRIEF.pylons[0].x, 420);
    await waitPastApex(page);
    expectFullBounce((await readQa(page)).samples);
  });

  for (const parity of [0, 1]) {
    test(`C2.4 bấm liên tục trong lúc phóng không tăng arcCount (nhịp ${parity})`, async ({ page }) => {
      await openArc(page);
      await page.evaluate((offset) => {
        const qa: QaRecorder = { samples: [], pressState: null };
        window.__qa = qa;
        let frame = offset;
        window.__game!.setBot<ArcRelayState>((s) => {
          qa.samples.push(s);
          const press = qa.pressState === null && !s.grounded;
          if (press) qa.pressState = s;
          frame += 1;
          return { left: false, right: true, jump: press || (s.arcing && frame % 2 === 0) };
        });
        window.__game!.teleport(450, 420);
      }, parity);
      await waitArcFinished(page, 1);
      const endIndex = (await readQa(page)).samples.findIndex((s) => s.arcCount === 1 && !s.arcing);
      await waitFrames(page, endIndex + 30);
      const { samples } = await readQa(page);
      expect(samples.filter((s) => s.arcing).length).toBeGreaterThan(1);
      expect(samples.every((s) => s.arcCount <= 1)).toBe(true);
      expect(samples[samples.length - 1].arcCount).toBe(1);
    });
  }

  test('C2.5 bấm ngay trước khi vào bán kính thì tự phóng', async ({ page }) => {
    await openArc(page);
    const start = { x: BRIEF.pylons[0].x, y: BRIEF.pylons[0].y - BRIEF.arcRadius - 2 };
    await tapJumpInAir(page, start.x, start.y);
    await page.waitForFunction(() => Boolean(window.__qa?.samples.some((s) => s.arcing)), null, { timeout: 5_000 });
    const { samples, pressState } = await readQa(page);
    expect(pressState!.arcTargetableId).toBeNull();
    expect(pressState!.arcCount).toBe(0);
    const arc = samples.find((s) => s.arcing)!;
    expect(arc.arcTargetId).toBe(0);
    expect(arc.arcCount).toBe(1);
    expect(arc.elapsedMs - pressState!.elapsedMs).toBeLessThanOrEqual(110 + 34); // Buffer plus two frames of sampling.
  });

  test('C2.5 biên: bấm quá sớm so với jumpBufferMs thì không phóng', async ({ page }) => {
    await openArc(page);
    await tapJumpInAir(page, BRIEF.pylons[0].x, 60); // About 270 ms of falling before the radius.
    await page.waitForFunction(() => Boolean(window.__qa?.samples.some((s) => s.arcTargetableId === 0)), null, {
      timeout: 5_000,
    });
    const entered = (await readQa(page)).samples.findIndex((s) => s.arcTargetableId === 0);
    await waitFrames(page, entered + 5);
    const { samples, pressState } = await readQa(page);
    expect(pressState!.arcTargetableId).toBeNull();
    expect(samples.every((s) => s.arcCount === 0 && !s.arcing)).toBe(true);
  });

  test('C2.6 bot nối cột 0 sang cột 1 không chạm đất', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await openArc(page);
    await standAt(page, 300);
    await page.evaluate(() => {
      const qa: QaRecorder = { samples: [], pressState: null };
      window.__qa = qa;
      let jumped = false;
      let previousJump = false;
      window.__game!.setBot<ArcRelayState>((s) => {
        qa.samples.push(s);
        let jump = false;
        if (!jumped && s.grounded && s.x >= 360) {
          jumped = true;
          jump = true;
        } else if (jumped && s.arcCount === 0 && !s.grounded && s.vy < 0) {
          jump = true; // Holds the ground jump to full height.
        } else if (s.pylonsLit < 2 && s.arcTargetableId === s.pylonsLit && !previousJump) {
          jump = true;
        }
        previousJump = jump;
        return { left: false, right: true, jump };
      });
    });
    await page.waitForFunction(() => Boolean(window.__qa?.samples.some((s) => s.pylonsLit === 2)), null, {
      timeout: 15_000,
    });
    await page.screenshot({ path: 'artifacts/arc-c2-chain.png' });
    const { samples } = await readQa(page);
    const firstArcEnd = samples.findIndex((s) => s.pylonsLit === 1);
    const secondArcStart = samples.findIndex((s) => s.arcCount === 2);
    const litBoth = samples.findIndex((s) => s.pylonsLit === 2);
    expect(firstArcEnd).toBeGreaterThanOrEqual(0);
    expect(secondArcStart).toBeGreaterThan(firstArcEnd);
    expect(samples[litBoth].pylonsLit).toBe(2);
    expect(samples[litBoth].arcCount).toBe(2);
    expect(samples.slice(firstArcEnd, litBoth + 1).every((s) => !s.grounded)).toBe(true);
    expect(errors).toEqual([]);
  });
});

/** Blocks the main thread on every animation frame to create a real low frame rate. */
const blockEveryFrame = async (page: Page, blockMs: number) => {
  await page.evaluate((ms) => {
    const stamps: number[] = [];
    window.__qaFrameStamps = stamps;
    const hog = () => {
      stamps.push(performance.now());
      const end = performance.now() + ms;
      while (performance.now() < end) {
        // Busy wait on purpose.
      }
      requestAnimationFrame(hog);
    };
    requestAnimationFrame(hog);
  }, blockMs);
  await page.waitForFunction(() => (window.__qaFrameStamps?.length ?? 0) >= 3, null, { timeout: 10_000 });
};

/** Waits out Phaser's 120-frame delta cooldown, then starts a fresh round. */
const settleThenRestart = async (page: Page) => {
  await page.waitForFunction(() => (window.__qaFrameStamps?.length ?? 0) >= 130, null, { timeout: 30_000 });
  await page.evaluate(() => window.__game!.restart());
  await page.waitForFunction(() => {
    const s = window.__game?.getState<ArcRelayState>();
    return s?.status === 'playing' && s.arcCount === 0 && s.grounded;
  }, null, { timeout: 10_000 });
};

const waitStatus = (page: Page, status: ArcRelayState['status'], timeout = 25_000) =>
  page.waitForFunction((v) => window.__game?.getState<ArcRelayState>()?.status === v, status, { timeout });

/** Plays from the spawn point using only left, right and jump. */
const installRunBot = (page: Page) =>
  page.evaluate(() => {
    const qa: QaRecorder = { samples: [], pressState: null };
    window.__qa = qa;
    let jumped = false;
    let previousJump = false;
    window.__game!.setBot<ArcRelayState>((s) => {
      qa.samples.push(s);
      let jump = false;
      if (!jumped && s.grounded && s.x >= 360) {
        jumped = true;
        jump = true;
      } else if (jumped && s.arcCount === 0 && !s.grounded && s.vy < 0) {
        jump = true;
      } else if (s.arcTargetableId !== null && !previousJump) {
        jump = true;
      }
      previousJump = jump;
      return { left: false, right: true, jump };
    });
  });

/** Lights pylons in the given order from a point straight below each one. */
const lightPylons = async (page: Page, ids: number[]) => {
  let count = (await readState(page)).arcCount;
  for (const id of ids) {
    const pylon = BRIEF.pylons[id];
    await tapJumpInAir(page, pylon.x, pylon.y + 90);
    count += 1;
    if (count === BRIEF.pylons.length) await waitStatus(page, 'won', 10_000);
    else await waitArcFinished(page, count);
  }
};

/**
 * Starts an arc, then on one arcing frame expires the clock from inside the bot. The bot runs after
 * the clock step and before the arc step, so `arrive` forces arrival in that very frame.
 */
const expireClockDuringArc = (page: Page, x: number, y: number, arrive: boolean) =>
  page.evaluate(
    ([px, py, forceArrival]) => {
      const qa: QaRecorder = { samples: [], pressState: null };
      window.__qa = qa;
      let expired = false;
      window.__game!.setBot<ArcRelayState>((s) => {
        qa.samples.push(s);
        const press = qa.pressState === null && !s.grounded;
        if (press) qa.pressState = s;
        if (s.arcing && !expired) {
          expired = true;
          window.__game!.tuning.arcTimeLimitMs = Math.max(1, s.elapsedMs - 1);
          if (forceArrival) window.__game!.tuning.arcSpeed = 1_000_000;
        }
        return { left: false, right: false, jump: press };
      });
      window.__game!.teleport(px as number, py as number);
    },
    [x, y, arrive] as const,
  );

test.describe('C3', () => {
  test('C3.1 timeLeftMs đúng công thức và giảm theo thời gian', async ({ page }) => {
    await openArc(page);
    await watchIdle(page, 80, 470);
    await waitFrames(page, 40);
    const { samples } = await readQa(page);
    for (const s of samples) expect(s.timeLeftMs).toBe(Math.max(0, s.timeLimitMs - s.elapsedMs));
    for (let i = 1; i < samples.length; i += 1) {
      expect(samples[i].timeLeftMs).toBeLessThanOrEqual(samples[i - 1].timeLeftMs);
    }
    expect(samples[samples.length - 1].timeLeftMs).toBeLessThan(samples[0].timeLeftMs);
  });

  for (const blockMs of [40, 90]) {
    test(`C3.1 biên: đồng hồ bám thời gian thực khi chặn ${blockMs} ms mỗi khung`, async ({ page }) => {
      await openArc(page);
      await blockEveryFrame(page, blockMs);
      const { realMs, gameMs } = await page.evaluate(async () => {
        const g0 = window.__game!.getState<ArcRelayState>()!.elapsedMs;
        const t0 = performance.now();
        await new Promise((resolve) => setTimeout(resolve, 5_000));
        const g1 = window.__game!.getState<ArcRelayState>()!.elapsedMs;
        return { realMs: performance.now() - t0, gameMs: g1 - g0 };
      });
      const ratio = gameMs / realMs;
      test.info().annotations.push({ type: 'clock-ratio', description: `block=${blockMs} ratio=${ratio.toFixed(3)}` });
      expect(ratio).toBeGreaterThan(0.95);
      expect(ratio).toBeLessThan(1.05);
    });
  }

  test('C3.1 biên: một khung rất dài chỉ tính tối đa 250 ms', async ({ page }) => {
    await openArc(page);
    await watchIdle(page, 80, 470);
    await waitFrames(page, 10);
    await page.evaluate(() => {
      const end = performance.now() + 1_000;
      while (performance.now() < end) {
        // One long frame.
      }
    });
    const before = (await readQa(page)).samples.length;
    await waitFrames(page, before + 5);
    const { samples } = await readQa(page);
    const steps = samples.slice(1).map((s, i) => s.elapsedMs - samples[i].elapsedMs);
    const longest = Math.max(...steps);
    test.info().annotations.push({ type: 'longest-step', description: String(longest) });
    expect(longest).toBeGreaterThanOrEqual(200);
    expect(longest).toBeLessThanOrEqual(251);
  });

  test('C3.2 thắp cột cuối thì thắng', async ({ page }) => {
    await openArc(page);
    await lightPylons(page, [0, 1, 2, 3, 4]);
    const s = await readState(page);
    expect(s.pylonsLit).toBe(s.pylonsTotal);
    expect(s.status).toBe('won');
    expect(s.loseReason).toBeNull();
    expect(s.arcing).toBe(false);
  });

  test('C3.2 biên: thắp theo thứ tự ngược vẫn thắng', async ({ page }) => {
    await openArc(page);
    await lightPylons(page, [4, 3, 2, 1, 0]);
    const s = await readState(page);
    expect(s.status).toBe('won');
    expect(s.pylonsLit).toBe(5);
    expect(s.loseReason).toBeNull();
  });

  test('C3.2 biên: tới cột cuối và hết giờ cùng khung thì thắng', async ({ page }) => {
    await openArc(page);
    await lightPylons(page, [0, 1, 2, 3]);
    await expireClockDuringArc(page, BRIEF.pylons[4].x, BRIEF.pylons[4].y + 150, true);
    await page.waitForFunction(() => window.__game?.getState<ArcRelayState>()?.status !== 'playing');
    const s = await readState(page);
    const { samples } = await readQa(page);
    expect(samples[samples.length - 1].arcing).toBe(true); // Nothing ran between arrival and expiry.
    expect(s.elapsedMs).toBeGreaterThanOrEqual(s.timeLimitMs);
    expect(s.status).toBe('won');
    expect(s.loseReason).toBeNull();
    expect(s.pylonsLit).toBe(5);
  });

  test('C3.3 bot chơi hết màn và thắng dưới 20 giây', async ({ page }) => {
    await openArc(page);
    await installRunBot(page);
    await waitStatus(page, 'won');
    const s = await readState(page);
    expect(s.pylonsLit).toBe(5);
    expect(s.elapsedMs).toBeLessThan(20_000);
    await page.waitForTimeout(700); // Lets the smoothed camera settle for the screenshot.
    await page.screenshot({ path: 'artifacts/arc-c3-won.png' });
  });

  for (const blockMs of [40, 90]) {
    test(`C3.3 biên: bot vẫn thắng khi chặn ${blockMs} ms mỗi khung`, async ({ page }) => {
      await openArc(page);
      await blockEveryFrame(page, blockMs);
      await installRunBot(page);
      await page.waitForFunction(() => window.__game?.getState<ArcRelayState>()?.status !== 'playing', null, {
        timeout: 35_000,
      });
      const s = await readState(page);
      test.info().annotations.push({ type: 'low-fps-win', description: `block=${blockMs} elapsed=${s.elapsedMs}` });
      expect(s.status).toBe('won');
      expect(s.pylonsLit).toBe(5);
      expect(s.elapsedMs).toBeLessThan(20_000);
    });
  }

  test('C3.4 giữ phải từ điểm xuất phát thì rơi hố và thua', async ({ page }) => {
    await openArc(page);
    await page.evaluate(() => window.__game!.setInput({ left: false, right: true, jump: false }));
    await waitStatus(page, 'lost', 10_000);
    const s = await readState(page);
    expect(s.status).toBe('lost');
    expect(s.loseReason).toBe('pit');
    await page.waitForTimeout(700); // Lets the smoothed camera settle for the screenshot.
    await page.screenshot({ path: 'artifacts/arc-c3-lost.png' });
  });

  test('C3.5 teleport xuống bẫy thì thua', async ({ page }) => {
    await openArc(page);
    await page.evaluate(() => window.__game!.teleport(940, 470));
    await waitStatus(page, 'lost', 5_000);
    const s = await readState(page);
    expect(s.status).toBe('lost');
    expect(s.loseReason).toBe('trap');
  });

  test('C3.6 hết giờ khi đứng yên thì thua timeout', async ({ page }) => {
    await openArc(page);
    await page.evaluate(() => {
      window.__game!.tuning.arcTimeLimitMs = 2_000;
      window.__game!.restart();
    });
    await page.waitForFunction(() => {
      const s = window.__game?.getState<ArcRelayState>();
      return s?.status === 'playing' && s.timeLimitMs === 2_000 && s.elapsedMs < 1_000;
    });
    await waitStatus(page, 'lost', 10_000);
    const s = await readState(page);
    expect(s.status).toBe('lost');
    expect(s.loseReason).toBe('timeout');
    expect(s.timeLeftMs).toBe(0);
  });

  test('C3.6 biên: hết giờ giữa cú phóng thì thua và cột không được thắp', async ({ page }) => {
    await openArc(page);
    await expireClockDuringArc(page, AIR_NEAR_PYLON_0.x, AIR_NEAR_PYLON_0.y, false);
    await waitStatus(page, 'lost', 5_000);
    const s = await readState(page);
    expect(s.loseReason).toBe('timeout');
    expect(s.arcing).toBe(false);
    expect(s.arcTargetId).toBeNull();
    expect(s.pylonsLit).toBe(0);
    expect(s.pylons[0].lit).toBe(false);
    expect(s.timeLeftMs).toBe(0);
  });

  test('C3.6 biên: tới cột giữa và hết giờ cùng khung thì thắp rồi mới thua', async ({ page }) => {
    await openArc(page);
    await expireClockDuringArc(page, AIR_NEAR_PYLON_0.x, AIR_NEAR_PYLON_0.y, true);
    await waitStatus(page, 'lost', 5_000);
    const s = await readState(page);
    const { samples } = await readQa(page);
    const last = samples[samples.length - 1];
    expect(last.arcing).toBe(true); // Nothing ran between arrival and expiry.
    expect(last.pylonsLit).toBe(0);
    expect(s.loseReason).toBe('timeout');
    expect(s.arcing).toBe(false);
    expect(s.pylons[0].lit).toBe(true);
    expect(s.pylonsLit).toBe(1);
  });

  const frozenFields = (s: ArcRelayState) => ({ elapsedMs: s.elapsedMs, pylonsLit: s.pylonsLit, arcCount: s.arcCount });

  test('C3.7 sau khi thua các giá trị không đổi qua 500 ms', async ({ page }) => {
    await openArc(page);
    await lightPylons(page, [0]);
    await page.evaluate(() => window.__game!.teleport(940, 470));
    await waitStatus(page, 'lost', 5_000);
    const before = await readState(page);
    await page.waitForTimeout(500);
    const after = await readState(page);
    expect(before.pylonsLit).toBe(1);
    expect(frozenFields(after)).toEqual(frozenFields(before));
  });

  test('C3.7 sau khi thắng các giá trị không đổi qua 500 ms', async ({ page }) => {
    await openArc(page);
    await lightPylons(page, [0, 1, 2, 3, 4]);
    const before = await readState(page);
    await page.waitForTimeout(500);
    const after = await readState(page);
    expect(before.status).toBe('won');
    expect(frozenFields(after)).toEqual(frozenFields(before));
  });

  test('C3.8 mọi giá trị arcTimeLimitMs trong khoảng tune đều dưới 60 giây', async ({ page }) => {
    expect(TUNING_RANGES.arcTimeLimitMs).toEqual([15_000, 55_000, 1_000]);
    await openArc(page);
    const limits = await page.evaluate(([min, max, step]) => {
      const seen: number[] = [];
      for (let value = min; value <= max; value += step) {
        window.__game!.tuning.arcTimeLimitMs = value;
        seen.push(window.__game!.getState<ArcRelayState>()!.timeLimitMs);
      }
      return seen;
    }, TUNING_RANGES.arcTimeLimitMs);
    expect(limits).toHaveLength(41);
    expect(limits.every((value) => value < 60_000)).toBe(true);
  });
});

test.describe('C2 đo lại ở FPS thấp', () => {
  test.describe.configure({ timeout: 70_000 });

  for (const blockMs of [40, 90]) {
    for (const settled of [false, true]) {
      const phase = settled ? 'sau 130 khung' : 'đầu ván';

      test(`C2.3 FPS thấp: chặn ${blockMs} ms, ${phase}`, async ({ page }) => {
        await openArc(page);
        await blockEveryFrame(page, blockMs);
        if (settled) await settleThenRestart(page);
        await tapJumpInAir(page, BRIEF.pylons[0].x, 420);
        await page.waitForFunction(
          () => {
            const samples = window.__qa?.samples ?? [];
            const end = samples.findIndex((s) => s.arcCount === 1 && !s.arcing);
            return end >= 0 && samples.slice(end).some((s) => s.vy > 0);
          },
          null,
          { timeout: 30_000 },
        );
        expectFullBounce((await readQa(page)).samples);
      });

      test(`C2.6 FPS thấp: chặn ${blockMs} ms, ${phase}`, async ({ page }) => {
        await openArc(page);
        await blockEveryFrame(page, blockMs);
        if (settled) await settleThenRestart(page);
        await installRunBot(page);
        await page.waitForFunction(
          () => {
            const s = window.__game?.getState<ArcRelayState>();
            return Boolean(s && (s.pylonsLit >= 2 || s.status !== 'playing'));
          },
          null,
          { timeout: 30_000 },
        );
        expect((await readState(page)).pylonsLit).toBeGreaterThanOrEqual(2);
        await page.waitForFunction(() => Boolean(window.__qa?.samples.some((s) => s.pylonsLit >= 2)), null, {
          timeout: 10_000,
        });
        const { samples } = await readQa(page);
        const firstArcEnd = samples.findIndex((s) => s.pylonsLit === 1);
        const litBoth = samples.findIndex((s) => s.pylonsLit === 2);
        expect(firstArcEnd).toBeGreaterThanOrEqual(0);
        expect(samples.slice(firstArcEnd, litBoth + 1).every((s) => !s.grounded)).toBe(true);
      });
    }
  }
});

const TRAP_POINT = { x: 940, y: 470 };

const passFrames = (page: Page, frames: number) =>
  page.evaluate(async (n) => {
    for (let i = 0; i < n; i += 1) await new Promise(requestAnimationFrame);
  }, frames);

/** Lights pylon 0, hands input back to the player, then loses on a trap. */
const loseWithProgress = async (page: Page) => {
  await lightPylons(page, [0]);
  await page.evaluate(({ x, y }) => {
    window.__game!.setBot(null);
    window.__game!.teleport(x, y);
  }, TRAP_POINT);
  await waitStatus(page, 'lost', 5_000);
  const s = await readState(page);
  expect(s.pylonsLit).toBe(1);
  expect(s.arcCount).toBe(1);
  return s;
};

const waitLockOver = (page: Page) =>
  page.waitForFunction(() => window.__game?.getState<ArcRelayState>()?.restartLockLeftMs === 0, null, {
    timeout: 5_000,
  });

/** Resolves with the first state of a fresh round, so `elapsedMs` is read as early as possible. */
const waitFreshRound = async (page: Page) => {
  const handle = await page.waitForFunction(
    () => {
      const s = window.__game?.getState<ArcRelayState>();
      return s && s.status === 'playing' && s.arcCount === 0 && s.pylonsLit === 0 ? s : null;
    },
    null,
    { timeout: 5_000 },
  );
  return (await handle.jsonValue()) as ArcRelayState;
};

const expectFreshRound = (s: ArcRelayState) => {
  expect(s.status).toBe('playing');
  expect(s.pylonsLit).toBe(0);
  expect(s.arcCount).toBe(0);
  expect(s.loseReason).toBeNull();
  expect(s.elapsedMs).toBeLessThan(200);
};

/** Logs state on every animation frame without touching the input path. */
const logFrames = (page: Page) =>
  page.evaluate(() => {
    const qa: QaRecorder = { samples: [], pressState: null };
    window.__qa = qa;
    const tick = () => {
      const s = window.__game?.getState<ArcRelayState>();
      if (s) qa.samples.push(s);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

const waitElapsed = (page: Page, ms: number) =>
  page.waitForFunction((v) => (window.__game?.getState<ArcRelayState>()?.elapsedMs ?? 0) >= v, ms, { timeout: 5_000 });

const expectNoJumpIn = async (page: Page) => {
  await logFrames(page);
  await waitElapsed(page, 300);
  const s = await readState(page);
  expect(s.grounded).toBe(true);
  expect(s.arcCount).toBe(0);
  const { samples } = await readQa(page);
  expect(samples.every((f) => f.vy >= 0)).toBe(true);
};

const waitGroundedPast = (page: Page, x: number) =>
  page.waitForFunction(
    (v) => {
      const s = window.__game?.getState<ArcRelayState>();
      return Boolean(s?.grounded) && s!.x >= v;
    },
    x,
    { timeout: 10_000, polling: 'raf' },
  );

const waitApexInPylon0Radius = (page: Page) =>
  page.waitForFunction(
    () => {
      const s = window.__game?.getState<ArcRelayState>();
      return s?.arcTargetableId === 0 && s.vy >= 0;
    },
    null,
    { timeout: 5_000, polling: 'raf' },
  );

const waitArcLit = (page: Page) =>
  page.waitForFunction(
    () => {
      const s = window.__game?.getState<ArcRelayState>();
      return s?.arcCount === 1 && s.pylonsLit === 1;
    },
    null,
    { timeout: 5_000 },
  );

test.describe('C4', () => {
  test('C4.1 bấm R lúc đang chơi thì đặt lại ván', async ({ page }) => {
    await openArc(page);
    await lightPylons(page, [0]);
    await page.evaluate(() => window.__game!.setBot(null));
    expect((await readState(page)).status).toBe('playing');
    await page.keyboard.press('r');
    expectFreshRound(await waitFreshRound(page));
  });

  test('C4.1 bấm R sau khi thua, kể cả còn khóa nút nhảy', async ({ page }) => {
    await openArc(page);
    await page.evaluate(() => {
      window.__game!.tuning.arcRestartLockMs = 1_000;
    });
    await loseWithProgress(page);
    expect((await readState(page)).restartLockLeftMs).toBeGreaterThan(0);
    await page.keyboard.press('r');
    expectFreshRound(await waitFreshRound(page));
  });

  test('C4.1 bấm R sau khi thắng', async ({ page }) => {
    await openArc(page);
    await lightPylons(page, [0, 1, 2, 3, 4]);
    await page.evaluate(() => window.__game!.setBot(null));
    expect((await readState(page)).status).toBe('won');
    await page.keyboard.press('r');
    expectFreshRound(await waitFreshRound(page));
  });

  test('C4.1 biên: giữ R kèm auto-repeat chỉ chơi lại một lần', async ({ page }) => {
    await openArc(page);
    await waitElapsed(page, 300);
    await page.keyboard.down('r');
    await page.waitForFunction(() => {
      const s = window.__game?.getState<ArcRelayState>();
      return Boolean(s) && s!.elapsedMs < 200;
    });
    await waitElapsed(page, 400);
    const before = (await readState(page)).elapsedMs;
    for (let i = 0; i < 5; i += 1) {
      await page.keyboard.down('r'); // A second down while held is sent with `repeat: true`.
      await passFrames(page, 3);
    }
    const after = (await readState(page)).elapsedMs;
    await page.keyboard.up('r');
    expect(after).toBeGreaterThan(before);
  });

  test('C4.2 còn khóa thì setInput nhảy không đổi status', async ({ page }) => {
    await openArc(page);
    await page.evaluate(() => {
      window.__game!.tuning.arcRestartLockMs = 1_000;
    });
    await loseWithProgress(page);
    await page.evaluate(() => window.__game!.setInput({ left: false, right: false, jump: false }));
    await passFrames(page, 2);
    await page.evaluate(() => window.__game!.setInput({ left: false, right: false, jump: true }));
    await passFrames(page, 5);
    const s = await readState(page);
    expect(s.restartLockLeftMs).toBeGreaterThan(0);
    expect(s.status).toBe('lost');
    expect(s.pylonsLit).toBe(1);
  });

  test('C4.2 còn khóa thì phím Space không đổi status, kể cả sau khi hết khóa', async ({ page }) => {
    await openArc(page);
    await page.evaluate(() => {
      window.__game!.tuning.arcRestartLockMs = 1_000;
    });
    await loseWithProgress(page);
    await page.keyboard.press('Space');
    await passFrames(page, 5);
    const during = await readState(page);
    expect(during.restartLockLeftMs).toBeGreaterThan(0);
    expect(during.status).toBe('lost');
    await waitLockOver(page);
    await passFrames(page, 5);
    expect((await readState(page)).status).toBe('lost'); // The locked press must not be buffered.
  });

  test('C4.2 biên: giữ Space từ lúc khóa qua lúc hết khóa không chơi lại', async ({ page }) => {
    await openArc(page);
    await loseWithProgress(page);
    await page.keyboard.down('Space');
    await waitLockOver(page);
    await page.keyboard.down('Space'); // Auto-repeat.
    await passFrames(page, 5);
    expect((await readState(page)).status).toBe('lost');
    await page.keyboard.up('Space');
    await passFrames(page, 2);
    await page.keyboard.press('Space');
    expectFreshRound(await waitFreshRound(page));
  });

  test('C4.3 hết khóa thì setInput nhảy đặt lại ván', async ({ page }) => {
    await openArc(page);
    const lost = await loseWithProgress(page);
    expect(lost.restartLockLeftMs).toBeGreaterThan(0);
    expect(lost.restartLockLeftMs).toBeLessThanOrEqual(400);
    await page.evaluate(() => window.__game!.setInput({ left: false, right: false, jump: false }));
    await waitLockOver(page);
    await passFrames(page, 2);
    await page.evaluate(() => window.__game!.setInput({ left: false, right: false, jump: true }));
    expectFreshRound(await waitFreshRound(page));
  });

  test('C4.3 hết khóa thì phím Space đặt lại ván, cả sau khi thắng', async ({ page }) => {
    await openArc(page);
    await lightPylons(page, [0, 1, 2, 3, 4]);
    await page.evaluate(() => window.__game!.setBot(null));
    await waitLockOver(page);
    await page.keyboard.press('Space');
    expectFreshRound(await waitFreshRound(page));
  });

  test('C4.4 giữ Space dùng để chơi lại không tạo cú nhảy ở ván mới', async ({ page }) => {
    await openArc(page);
    await loseWithProgress(page);
    await waitLockOver(page);
    await page.keyboard.down('Space');
    await waitFreshRound(page);
    await page.keyboard.down('Space'); // Auto-repeat reaches the new scene's Key as its first down.
    await expectNoJumpIn(page);
    await page.keyboard.up('Space');
  });

  test('C4.4 giữ setInput dùng để chơi lại không tạo cú nhảy ở ván mới', async ({ page }) => {
    await openArc(page);
    await loseWithProgress(page);
    await page.evaluate(() => window.__game!.setInput({ left: false, right: false, jump: false }));
    await waitLockOver(page);
    await passFrames(page, 2);
    await page.evaluate(() => window.__game!.setInput({ left: false, right: false, jump: true }));
    await waitFreshRound(page);
    await expectNoJumpIn(page);
  });

  test('C4.4 biên: nhả rồi bấm lại ở ván mới thì nhảy bình thường', async ({ page }) => {
    await openArc(page);
    await loseWithProgress(page);
    await waitLockOver(page);
    await page.keyboard.down('Space');
    await waitFreshRound(page);
    await page.keyboard.down('Space');
    await page.waitForFunction(() => window.__game?.getState<ArcRelayState>()?.grounded === true);
    await page.keyboard.up('Space');
    await passFrames(page, 2);
    await page.keyboard.down('Space');
    await page.waitForFunction(() => (window.__game?.getState<ArcRelayState>()?.vy ?? 0) < 0, null, { timeout: 3_000 });
    await page.keyboard.up('Space');
  });

  for (const [moveKey, jumpKey] of [['ArrowRight', 'Space'], ['d', 'w'], ['ArrowRight', 'ArrowUp']]) {
    test(`C4.5 phím thật ${moveKey} và ${jumpKey}: nhảy rồi phóng`, async ({ page }) => {
      await openArc(page);
      await page.keyboard.down(moveKey);
      await waitGroundedPast(page, 340);
      await page.keyboard.down(jumpKey);
      await waitApexInPylon0Radius(page);
      await page.keyboard.up(jumpKey);
      await page.keyboard.down(jumpKey);
      await waitArcLit(page);
      await page.keyboard.up(jumpKey);
      await page.keyboard.up(moveKey);
      const s = await readState(page);
      expect(s.arcCount).toBe(1);
      expect(s.pylons[0].lit).toBe(true);
    });
  }

  test.describe('cảm ứng', () => {
    test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });

    test('C4.6 dùng #btn-right và #btn-jump để nhảy rồi phóng', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      await openArc(page);
      const right = page.locator('#btn-right');
      const jump = page.locator('#btn-jump');
      await expect(right).toBeVisible();
      await expect(jump).toBeVisible();
      await right.dispatchEvent('pointerdown');
      await waitGroundedPast(page, 340);
      await jump.dispatchEvent('pointerdown');
      await waitApexInPylon0Radius(page);
      await jump.dispatchEvent('pointerup');
      await jump.dispatchEvent('pointerdown');
      await waitArcLit(page);
      await jump.dispatchEvent('pointerup');
      await right.dispatchEvent('pointerup');
      const s = await readState(page);
      expect(s.arcCount).toBe(1);
      expect(s.pylonsLit).toBe(1);
      expect(errors).toEqual([]);
    });

    test('C4.6 biên: chạm thật ngắn hai lần vẫn nhảy rồi phóng', async ({ page }) => {
      await openArc(page);
      const right = page.locator('#btn-right');
      const jump = page.locator('#btn-jump');
      await right.dispatchEvent('pointerdown');
      await waitGroundedPast(page, 370);
      await jump.tap();
      await page.waitForFunction(() => window.__game?.getState<ArcRelayState>()?.arcTargetableId === 0, null, {
        timeout: 5_000,
        polling: 'raf',
      });
      await jump.tap();
      await waitArcLit(page);
      await right.dispatchEvent('pointerup');
      const s = await readState(page);
      expect(s.arcCount).toBe(1);
      expect(s.pylonsLit).toBe(1);
    });

    test('C4.6 đo: độ cao nhảy khi chạm ngắn so với khi giữ', async ({ page }) => {
      await openArc(page);
      await page.waitForFunction(() => window.__game?.getState<ArcRelayState>()?.grounded === true);
      const groundY = (await readState(page)).y;
      const jump = page.locator('#btn-jump');

      const measure = async (act: () => Promise<void>) => {
        await logFrames(page);
        await act();
        await page.waitForFunction(() => (window.__qa?.samples ?? []).some((s) => s.vy > 0), null, { timeout: 5_000 });
        const { samples } = await readQa(page);
        await page.waitForFunction(() => window.__game?.getState<ArcRelayState>()?.grounded === true);
        return groundY - Math.min(...samples.map((s) => s.y));
      };

      const tapPx = await measure(() => jump.tap());
      await passFrames(page, 3);
      const heldPx = await measure(() => jump.dispatchEvent('pointerdown'));
      await jump.dispatchEvent('pointerup');
      test.info().annotations.push({ type: 'jump-height', description: `tapPx=${tapPx} heldPx=${heldPx}` });
      expect(tapPx).toBeGreaterThan(0);
      expect(heldPx).toBeGreaterThan(tapPx);
    });

    test('C4.7 sau khi thua và hết khóa, bấm #btn-jump thì chơi lại', async ({ page }) => {
      await openArc(page);
      await loseWithProgress(page);
      await passFrames(page, 45); // Lets the camera reach the player for the screenshot.
      await page.screenshot({ path: 'artifacts/arc-c4-mobile-lost.png' });
      await waitLockOver(page);
      await page.locator('#btn-jump').tap();
      const s = await waitFreshRound(page);
      expect(s.status).toBe('playing');
      expect(s.pylonsLit).toBe(0);
    });

    test('C4.7 biên: chạm #btn-jump khi còn khóa không chơi lại và không bị nhớ', async ({ page }) => {
      await openArc(page);
      await page.evaluate(() => {
        window.__game!.tuning.arcRestartLockMs = 1_000;
      });
      await loseWithProgress(page);
      await page.locator('#btn-jump').tap();
      await passFrames(page, 5);
      const during = await readState(page);
      expect(during.restartLockLeftMs).toBeGreaterThan(0);
      expect(during.status).toBe('lost');
      await waitLockOver(page);
      await passFrames(page, 5);
      expect((await readState(page)).status).toBe('lost');
    });

    test('C4.7 biên: giữ #btn-jump để chơi lại không tạo cú nhảy ở ván mới', async ({ page }) => {
      await openArc(page);
      await loseWithProgress(page);
      await waitLockOver(page);
      const jump = page.locator('#btn-jump');
      await jump.dispatchEvent('pointerdown');
      await waitFreshRound(page);
      await expectNoJumpIn(page);
      await jump.dispatchEvent('pointerup');
    });

    test('C4 ảnh cảm ứng: bố cục lúc xuất phát và khoảng chồng với nút', async ({ page }) => {
      await openArc(page);
      await page.waitForFunction(() => window.__game?.getState<ArcRelayState>()?.grounded === true);
      await page.screenshot({ path: 'artifacts/arc-c4-mobile-start.png' });
      const overlap = await page.evaluate(() => {
        const s = window.__game!.getState<ArcRelayState>()!;
        const canvas = document.querySelector('canvas')!.getBoundingClientRect();
        const scale = canvas.width / 960;
        const player = {
          left: canvas.left + (s.x - 14) * scale,
          right: canvas.left + (s.x + 14) * scale,
          top: canvas.top + (s.y - 22) * scale,
          bottom: canvas.top + (s.y + 22) * scale,
        };
        return ['btn-left', 'btn-right', 'btn-jump'].map((id) => {
          const b = document.getElementById(id)!.getBoundingClientRect();
          const w = Math.max(0, Math.min(player.right, b.right) - Math.max(player.left, b.left));
          const h = Math.max(0, Math.min(player.bottom, b.bottom) - Math.max(player.top, b.top));
          const area = (player.right - player.left) * (player.bottom - player.top);
          return `${id}=${Math.round((w * h * 100) / area)}%`;
        }).join(' ') + ` canvas=${Math.round(canvas.left)},${Math.round(canvas.top)},${Math.round(canvas.width)}x${Math.round(canvas.height)}`;
      });
      // Reported for the layout review; the brief sets no numeric criterion for it.
      test.info().annotations.push({ type: 'touch-overlap', description: overlap });
    });
  });
});

const collectPageErrors = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

const collectConsoleErrors = (page: Page) => {
  const errors = collectPageErrors(page);
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
};

const playBotToWin = async (page: Page) => {
  await installRunBot(page);
  await waitStatus(page, 'won');
  return readState(page);
};

const hideDevPanel = (page: Page) => page.addStyleTag({ content: '.lil-gui { display: none !important; }' });

test.describe('C5', () => {
  test('C5.1 vfxKeys có đúng arc-bolt và pylon-spark', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await openArc(page);
    const s = await readState(page);
    expect(s.vfxKeys).toHaveLength(2);
    expect([...s.vfxKeys].sort()).toEqual(['arc-bolt', 'pylon-spark']);
    expect(s.vfxPlays).toEqual({ 'arc-bolt': 0, 'pylon-spark': 0 });
    expect(errors).toEqual([]);
  });

  test('C5.2 mỗi cú phóng bắt đầu thì arc-bolt bằng arcCount', async ({ page }) => {
    await openArc(page);
    const final = await playBotToWin(page);
    const { samples } = await readQa(page);
    expect(new Set(samples.map((s) => s.arcCount)).size).toBe(6); // Counts 0 to 5: the last arc spans several frames.
    for (const s of [...samples, final]) expect(s.vfxPlays['arc-bolt']).toBe(s.arcCount);
    expect(final.vfxPlays['arc-bolt']).toBe(5);
  });

  test('C5.3 mỗi cột được thắp thì pylon-spark bằng pylonsLit', async ({ page }) => {
    await openArc(page);
    const final = await playBotToWin(page);
    const { samples } = await readQa(page);
    for (const s of [...samples, final]) expect(s.vfxPlays['pylon-spark']).toBe(s.pylonsLit);
    expect(final.vfxPlays['pylon-spark']).toBe(5);
  });

  test('C5.4 bot chạy lại C3.3 có VFX vẫn thắng dưới 20 giây', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await openArc(page);
    expect((await readState(page)).vfxKeys).toHaveLength(2);
    const s = await playBotToWin(page);
    expect(s.status).toBe('won');
    expect(s.pylonsLit).toBe(5);
    expect(s.elapsedMs).toBeLessThan(20_000);
    expect(errors).toEqual([]);
  });

  test('C5.4 biên: có và không có VFX cho cùng kết quả gameplay', async ({ page }) => {
    await openArc(page);
    const withVfx = await playBotToWin(page);
    await page.route('**/vfx/**', (route) => route.abort());
    await openArc(page);
    expect((await readState(page)).vfxKeys).toEqual([]);
    const withoutVfx = await playBotToWin(page);
    for (const s of [withVfx, withoutVfx]) {
      expect(s.status).toBe('won');
      expect(s.pylonsLit).toBe(5);
      expect(s.arcCount).toBe(5);
    }
    expect(Math.abs(withVfx.elapsedMs - withoutVfx.elapsedMs)).toBeLessThan(1_000);
  });

  test('C5 biên: vfxPlays reset khi chơi lại bằng R và bằng nút nhảy', async ({ page }) => {
    await openArc(page);
    await lightPylons(page, [0]);
    expect((await readState(page)).vfxPlays).toEqual({ 'arc-bolt': 1, 'pylon-spark': 1 });
    await page.evaluate(() => window.__game!.setBot(null));
    await page.keyboard.press('r');
    let s = await waitFreshRound(page);
    expect(s.vfxPlays).toEqual({ 'arc-bolt': 0, 'pylon-spark': 0 });
    expect(s.vfxKeys).toHaveLength(2);

    await loseWithProgress(page);
    expect((await readState(page)).vfxPlays).toEqual({ 'arc-bolt': 1, 'pylon-spark': 1 });
    await waitLockOver(page);
    await page.keyboard.press('Space');
    s = await waitFreshRound(page);
    expect(s.vfxPlays).toEqual({ 'arc-bolt': 0, 'pylon-spark': 0 });

    await lightPylons(page, [0]);
    expect((await readState(page)).vfxPlays).toEqual({ 'arc-bolt': 1, 'pylon-spark': 1 });
  });

  test('C5 biên: chơi lại giữa lúc hiệu ứng đang phát không gây lỗi', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await openArc(page);
    await tapJumpInAir(page, AIR_NEAR_PYLON_0.x, AIR_NEAR_PYLON_0.y);
    await page.waitForFunction(() => Boolean(window.__qa?.samples.some((s) => s.arcing)), null, { timeout: 5_000 });
    await page.keyboard.press('r');
    await page.evaluate(() => window.__game!.setBot(null));
    await waitFreshRound(page);
    await passFrames(page, 30); // Longer than neither clip, but enough for destroyed sprites to be touched.
    await waitElapsed(page, 500);
    await lightPylons(page, [0]);
    expect((await readState(page)).vfxPlays).toEqual({ 'arc-bolt': 1, 'pylon-spark': 1 });
    expect(errors).toEqual([]);
  });

  test('C5 biên: thiếu toàn bộ asset thì vẫn chơi được, không có page error', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.route('**/vfx/**', (route) => route.fulfill({ status: 404, body: 'missing' }));
    await openArc(page);
    expect((await readState(page)).vfxKeys).toEqual([]);
    const s = await playBotToWin(page);
    expect(s.status).toBe('won');
    expect(s.pylonsLit).toBe(5);
    expect(s.vfxPlays).toEqual({ 'arc-bolt': 0, 'pylon-spark': 0 });
    await page.evaluate(() => window.__game!.setBot(null));
    await page.keyboard.press('r');
    await waitFreshRound(page);
    expect(errors).toEqual([]);
  });

  for (const [blocked, kept] of [['arc-bolt', 'pylon-spark'], ['pylon-spark', 'arc-bolt']] as const) {
    test(`C5 biên: thiếu riêng ${blocked} thì ${kept} vẫn phát`, async ({ page }) => {
      const errors = collectPageErrors(page);
      await page.route(`**/vfx/${blocked}/**`, (route) => route.fulfill({ status: 404, body: 'missing' }));
      await openArc(page);
      expect((await readState(page)).vfxKeys).toEqual([kept]);
      const s = await playBotToWin(page);
      expect(s.status).toBe('won');
      expect(s.vfxPlays[kept]).toBe(5);
      expect(s.vfxPlays[blocked]).toBe(0);
      expect(errors).toEqual([]);
    });
  }

  test('C5 biên: request VFX treo thì game vẫn vào được', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.route('**/vfx/**', () => {
      // Never answered on purpose.
    });
    await page.goto('/?game=arc-relay');
    // ARC_VFX_LOAD_TIMEOUT_MS is 3000, so 10 s is a generous bound for reaching the game.
    await page.waitForFunction(() => window.__game?.getState<ArcRelayState>()?.status === 'playing', null, {
      timeout: 10_000,
    });
    expect((await readState(page)).vfxKeys).toEqual([]);
    const s = await playBotToWin(page);
    expect(s.status).toBe('won');
    expect(errors).toEqual([]);
  });

  test('C5 biên: Coin Hop không gửi request tới /vfx/', async ({ page }) => {
    const vfxRequests: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/vfx/')) vfxRequests.push(r.url());
    });
    await page.goto('/');
    await page.waitForFunction(() => window.__game?.getState()?.status === 'playing');
    await page.waitForTimeout(500); // Proves that no late request appears.
    expect(vfxRequests).toEqual([]);
  });

  test('C5 ảnh cuối: lúc có hiệu ứng và lúc thắng', async ({ page }) => {
    await openArc(page);
    await hideDevPanel(page);
    // Zero gravity holds the player over the pit while the smoothed camera catches up.
    await page.evaluate(() => {
      window.__game!.tuning.gravity = 0;
      window.__game!.teleport(450, 420);
    });
    await passFrames(page, 40);
    await page.evaluate((gravity) => {
      window.__game!.tuning.gravity = gravity;
    }, BRIEF_C2.gravity);
    await tapJumpInAir(page, 450, 420);
    await waitArcFinished(page, 1);
    await page.screenshot({ path: 'artifacts/arc-final-vfx.png' });

    await openArc(page);
    await hideDevPanel(page);
    const s = await playBotToWin(page);
    expect(s.status).toBe('won');
    await page.waitForTimeout(700); // Lets the camera settle and the last spark finish.
    await page.screenshot({ path: 'artifacts/arc-final-won.png' });
  });
});
