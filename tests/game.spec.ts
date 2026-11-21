import { expect, test, type Page } from '@playwright/test';

const ready = async (page: Page) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__game?.getState()?.status === 'playing');
};

const status = (page: Page, value: string) =>
  page.waitForFunction((v) => window.__game?.getState()?.status === v, value, { timeout: 25_000 });

test('game boots without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await ready(page);
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
  expect((await page.evaluate(() => window.__game!.getState()))!.grounded).toBe(true);
  await page.screenshot({ path: 'artifacts/start.png' });
});

test('a bot can finish the level with every coin', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    const zones = [[555, 610], [840, 880], [1130, 1180]];
    window.__game!.setBot((s) => {
      const inZone = s.grounded && s.y > 440 && zones.some(([a, b]) => s.x >= a && s.x < b);
      return { left: false, right: true, jump: inZone || (!s.grounded && s.vy < 0) };
    });
  });
  await status(page, 'won');
  const state = (await page.evaluate(() => window.__game!.getState()))!;
  expect(state.coins).toBe(state.totalCoins);
  await page.screenshot({ path: 'artifacts/won.png' });
});

test('falling into the pit loses', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => window.__game!.setInput({ left: false, right: true, jump: false }));
  await status(page, 'lost');
});

test('the flag does not win without all coins', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => window.__game!.teleport(1500, 470));
  await page.waitForTimeout(600);
  const state = (await page.evaluate(() => window.__game!.getState()))!;
  expect(state.x).toBeGreaterThan(1450);
  expect(state.status).toBe('playing');
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });

  test('touch button moves the player', async ({ page }) => {
    await ready(page);
    await expect(page.locator('#btn-right')).toBeVisible();
    const before = (await page.evaluate(() => window.__game!.getState()))!.x;
    await page.locator('#btn-right').dispatchEvent('pointerdown');
    await page.waitForTimeout(400);
    await page.locator('#btn-right').dispatchEvent('pointerup');
    const after = (await page.evaluate(() => window.__game!.getState()))!.x;
    expect(after).toBeGreaterThan(before);
    await page.screenshot({ path: 'artifacts/mobile.png' });
  });
});
