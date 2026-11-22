// Measures a bot against runtime tuning overrides. Never writes to src/config.ts.
// Usage: node measure.mjs "<bot function>" "<overrides JSON>" [runs]
import { chromium } from '@playwright/test';

const URL = 'http://127.0.0.1:5173';
const RUN_TIMEOUT_MS = 30_000;
const [bot, overridesText = '{}', runsText = '3'] = process.argv.slice(2);

if (!bot) {
  console.error('Usage: node measure.mjs "<bot function>" "<overrides JSON>" [runs]');
  process.exit(2);
}
const overrides = JSON.parse(overridesText);
const runs = Number(runsText);
if (!Number.isInteger(runs) || runs < 1) {
  console.error('runs must be a positive integer');
  process.exit(2);
}

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  for (let i = 0; i < runs; i += 1) {
    await page.goto(URL);
    await page.waitForFunction(() => window.__game?.getState()?.status === 'playing');
    const unknown = await page.evaluate((o) => Object.keys(o).filter((k) => !(k in window.__game.tuning)), overrides);
    if (unknown.length > 0) throw new Error(`Unknown tuning keys: ${unknown.join(', ')}`);
    await page.evaluate(([o, source]) => {
      Object.assign(window.__game.tuning, o);
      window.__game.setBot((0, eval)(`(${source})`));
    }, [overrides, bot]);
    const ended = await page
      .waitForFunction(() => window.__game.getState()?.status !== 'playing', null, { timeout: RUN_TIMEOUT_MS })
      .then(() => true, () => false);
    const state = await page.evaluate(() => window.__game.getState());
    results.push({ status: ended ? state.status : 'timeout', elapsedMs: state.elapsedMs, x: state.x });
  }
} finally {
  await browser.close();
}

const wins = results.filter((r) => r.status === 'won');
console.log(JSON.stringify({
  overrides,
  runs,
  won: wins.length,
  lost: results.filter((r) => r.status === 'lost').length,
  timeout: results.filter((r) => r.status === 'timeout').length,
  avgWinMs: wins.length ? Math.round(wins.reduce((sum, r) => sum + r.elapsedMs, 0) / wins.length) : null,
  results,
}, null, 2));
