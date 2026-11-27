// C12.14 (brief v4.2): the single-file HTML build of Slot Five, opened over file:// with no server and no network.
// Written in plain JS because it needs node:fs and node:child_process (the project has no @types/node).
import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const OUT = resolve('artifacts/slot-five-play.html');
const LOOSE = /\.(js|png|json)$/i;

test.describe('Slot Five C12.14: bản HTML đơn', () => {
  test.setTimeout(240_000);

  test('C12.14 build + pack:single, mở qua file:// offline, lượt có cast tăng data-sf-vfx-hits, không request ra ngoài', async ({ browser }) => {
    // 1. Build rồi đóng gói; mỗi lệnh phải thoát mã 0 (execSync ném lỗi nếu không). Không thêm file rời nào vào artifacts/.
    const before = new Set(readdirSync('artifacts').filter((f) => LOOSE.test(f)));
    execSync('npm run build', { stdio: 'pipe' });
    const packed = execSync('npm run pack:single', { stdio: 'pipe' }).toString();
    expect(existsSync(OUT)).toBe(true);
    const added = readdirSync('artifacts').filter((f) => LOOSE.test(f) && !before.has(f));
    expect(added, 'không có file JS, PNG, JSON rời mới').toEqual([]);
    const bytes = statSync(OUT).size;
    console.log(`C12.14.1: ${OUT} ${bytes} byte (${(bytes / 1024 / 1024).toFixed(2)} MB); ${packed.trim().split('\n').pop()}`);

    // 6. Không chứa chuỗi của bản dev.
    const text = readFileSync(OUT, 'utf8');
    for (const banned of ['__game', 'lil-gui', 'Tune gameplay']) expect(text.includes(banned), banned).toBe(false);

    // 2. Mở qua file:// không có ?game=, context offline, không server.
    const context = await browser.newContext({ offline: true, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    const errors = [];
    const requests = [];
    const failed = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`console: ${m.text()}`);
    });
    page.on('request', (r) => requests.push(r.url()));
    page.on('requestfailed', (r) => failed.push(`${r.url()} ${r.failure()?.errorText}`));
    const url = pathToFileURL(OUT).href;
    await page.goto(url);
    await page.waitForFunction(() => {
      const d = document.getElementById('game')?.dataset;
      return d?.sfReady === 'true' && d?.vfxLoaded === 'true';
    }, null, { timeout: 10_000 });
    expect(await page.evaluate(() => typeof window.__game)).toBe('undefined');

    // 3. Chạm quay ở lượt người chơi, chờ về idle hoặc ended; tối đa 10 lượt người chơi tới khi có lượt có cast.
    const flags = () => page.evaluate(() => {
      const d = document.getElementById('game').dataset;
      return { spin: Number(d.sfSpinIndex), phase: d.sfPhase, casts: Number(d.sfLastCasts), hits: Number(d.sfVfxHits) };
    });
    let found = null;
    for (let i = 0; i < 10 && !found; i += 1) {
      const a = await flags();
      expect(a.phase).toBe('idle');
      await page.tap('#sf-spin');
      // Đọc sau lượt người chơi, ở foeWait (quyết định Producer), rồi chờ cả lượt đối thủ về idle hoặc ended.
      await page.waitForFunction((s) => {
        const d = document.getElementById('game').dataset;
        return Number(d.sfSpinIndex) > s && (d.sfPhase === 'foeWait' || d.sfPhase === 'ended');
      }, a.spin, { timeout: 15_000 });
      const b = await flags();
      if (b.casts > 0) {
        found = { before: a, after: b, turn: i + 1 };
        await page.screenshot({ path: 'artifacts/slot-five-c12-single-390x844-after-cast.png' });
      }
      await page.waitForFunction(() => ['idle', 'ended'].includes(document.getElementById('game').dataset.sfPhase), null, { timeout: 15_000 });
    }
    console.log(`C12.14.3: ${JSON.stringify(found)}`);
    expect(found, 'có lượt người chơi có cast trong 10 lượt').not.toBeNull();
    expect(found.after.hits - found.before.hits).toBe(found.after.casts);
    expect(found.after.spin).toBeGreaterThan(found.before.spin);

    // 4, 5. Không lỗi; request chỉ là file đó, data: hoặc blob:, không request thất bại.
    const bad = requests.filter((u) => !(u === url || u.startsWith('data:') || u.startsWith('blob:')));
    console.log(`C12.14.5: ${requests.length} request, ${requests.filter((u) => u.startsWith('data:')).length} data:, ${requests.filter((u) => u.startsWith('blob:')).length} blob:`);
    expect(errors).toEqual([]);
    expect(bad).toEqual([]);
    expect(failed).toEqual([]);
    await context.close();
  });
});
