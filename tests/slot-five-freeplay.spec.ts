import { expect, test } from '@playwright/test';
import type { SlotFiveState } from '../src/scenes/SlotFiveScene';

/**
 * Free play for Slot Five (skill playwright-interactive): about 60 s of real input at 960x540, not following the
 * expected path. Keys and clicks are picked by a fixed-seed generator so a failure can be replayed.
 * Checks every frame: phase is valid, 0 <= hp <= maxHp, 0 <= displayHp <= maxHp, shield >= 0; whenever nothing is
 * animating, 16 icon sprites (brief v4, 4x4 grid) and 2 fighters; no console or page errors.
 */

interface Problem { t: number; msg: string }
declare global {
  interface Window { __qaFree?: { problems: Problem[]; frames: number; phases: Record<string, number> } }
}

test('Chơi tự do 60 giây bằng phím và chuột thật', async ({ page }) => {
  test.setTimeout(150_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  await page.goto('/?game=slot-five');
  await page.waitForFunction(() => window.__game?.getState<SlotFiveState>()?.gameId === 'slot-five');

  await page.evaluate(() => {
    const out = { problems: [] as Problem[], frames: 0, phases: {} as Record<string, number> };
    window.__qaFree = out;
    const valid = ['idle', 'spinning', 'resolving', 'foeWait', 'ended'];
    const tick = () => {
      const s = window.__game?.getState<SlotFiveState>();
      if (s) {
        out.frames += 1;
        out.phases[s.phase] = (out.phases[s.phase] ?? 0) + 1;
        const bad = (msg: string) => out.problems.length < 20 && out.problems.push({ t: performance.now(), msg });
        if (!valid.includes(s.phase)) bad(`phase ${s.phase}`);
        for (const side of ['player', 'foe'] as const) {
          const f = s[side];
          if (f.hp < 0 || f.hp > f.maxHp || f.shield < 0) bad(`${side} ${JSON.stringify(f)}`);
          const d = s.displayHp[side];
          if (d < 0 || d > f.maxHp) bad(`displayHp ${side} ${d}`);
        }
        if ((s.phase === 'idle' || s.phase === 'foeWait' || s.phase === 'ended') && (s.viewCounts.icons !== 16 || s.viewCounts.fighters !== 2)) {
          bad(`${s.phase}: viewCounts ${JSON.stringify(s.viewCounts)}`);
        }
        if (s.phase === 'ended' && s.status === 'playing') bad('ended mà status playing');
        if (s.status !== 'playing' && s.phase === 'idle') bad(`idle mà status ${s.status}`);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  let seed = 20261126;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const log: string[] = [];
  const start = Date.now();
  let shot = 0;
  const matches = new Set<number>();
  while (Date.now() - start < 60_000) {
    const r = rand();
    if (r < 0.45) {
      await page.keyboard.press('Space');
      log.push('Space');
    } else if (r < 0.6) {
      await page.keyboard.press('Enter');
      log.push('Enter');
    } else if (r < 0.75) {
      await page.click('#sf-spin');
      log.push('click quay');
    } else if (r < 0.8) {
      await page.keyboard.press('r');
      log.push('R');
    } else if (r < 0.84) {
      await page.click('#sf-new');
      log.push('click trận mới');
    } else if (r < 0.9) {
      const ms = 200 + Math.floor(rand() * 900);
      await page.keyboard.down('Space');
      await page.waitForTimeout(ms);
      await page.keyboard.up('Space');
      log.push(`giữ Space ${ms}ms`);
    } else {
      // Bấm dồn dập 5 lần.
      for (let i = 0; i < 5; i += 1) await page.keyboard.press(rand() < 0.5 ? 'Space' : 'Enter');
      log.push('bấm dồn 5 lần');
    }
    await page.waitForTimeout(150 + Math.floor(rand() * 1200));
    const s = await page.evaluate(() => window.__game!.getState<SlotFiveState>()!);
    matches.add(s.matchIndex);
    if (Date.now() - start > shot * 15_000) {
      await page.screenshot({ path: `artifacts/slot-five-freeplay-${shot}.png` });
      shot += 1;
    }
  }
  const out = await page.evaluate(() => window.__qaFree!);
  const end = await page.evaluate(() => window.__game!.getState<SlotFiveState>()!);
  await page.screenshot({ path: 'artifacts/slot-five-freeplay-end.png' });
  console.log(`Chơi tự do: ${log.length} thao tác, ${out.frames} khung hình, ${matches.size} trận (matchIndex tới ${Math.max(...matches)}), phase ${JSON.stringify(out.phases)}`);
  console.log(`Cuối: trận ${end.matchIndex} seed ${end.seed}, ${end.status}, spinIndex ${end.spinIndex}, máu ${end.player.hp}/${end.foe.hp}, rejectedSpins ${end.rejectedSpins}, lastReject ${end.lastReject}`);
  console.log(`Thao tác: ${Object.entries(log.reduce<Record<string, number>>((a, k) => ({ ...a, [k.replace(/\d+ms/, 'Nms')]: (a[k.replace(/\d+ms/, 'Nms')] ?? 0) + 1 }), {})).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  expect(out.problems).toEqual([]);
  expect(errors).toEqual([]);
  expect(out.frames).toBeGreaterThan(1000);
  expect(matches.size).toBeGreaterThan(1);
});
