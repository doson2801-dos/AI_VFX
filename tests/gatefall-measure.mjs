// Gatefall C4.5 to C4.8 measurement. Kept out of `npm test` on purpose: see the usage text.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const lib = await import('./gatefall-bots.ts');
const { TUNING, TUNING_RANGES } = await import('../src/config.ts');
const { ACCEPT_SEEDS, BOTS, LEVELS, TUNE_SEEDS, judge, pairedDiff, percentile, pooledGames, seedRange } = lib;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXIT_NOT_MET = 2;
const USAGE = `
Dung: node tests/gatefall-measure.mjs [--set tune|accept] [--seeds A-B] [--tune khoa=gia_tri]... [--url URL]

  --set tune     Tap tune 1000-1399 (mac dinh).
  --set accept   Chay lai tap tune truoc. Chi do 5000-5399 neu tap tune dat C4.5, C4.6, C4.7.
                 Khong nhan --tune hay --seeds, de khong tune tren tap nghiem thu.
  --seeds A-B    Tap seed rieng de tune, khong duoc cham 5000-5399.
  --tune k=v     Ghi de TUNING trong trang do, khong sua file. Lap lai duoc. Phai nam trong TUNING_RANGES.
  --url URL      Mac dinh http://127.0.0.1:5173 (can npm run dev dang chay).

Ma thoat: 0 dat, ${EXIT_NOT_MET} khong dat tieu chi, 1 loi chay.
`;

const fail = (message) => {
  console.error(`LOI: ${message}\n${USAGE}`);
  process.exit(1);
};

const parseArgs = (argv) => {
  const options = { set: 'tune', seeds: null, overrides: {}, url: 'http://127.0.0.1:5173' };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--help' || flag === '-h') {
      console.log(USAGE);
      process.exit(0);
    }
    const value = argv[i + 1];
    if (!['--set', '--seeds', '--tune', '--url'].includes(flag)) fail(`tham so la: ${flag}`);
    if (value === undefined) fail(`thieu gia tri cho ${flag}`);
    i += 1;
    if (flag === '--set') {
      if (!['tune', 'accept'].includes(value)) fail(`--set khong hop le: ${value}`);
      options.set = value;
    } else if (flag === '--url') options.url = value;
    else if (flag === '--seeds') {
      const match = /^(\d+)-(\d+)$/.exec(value);
      if (!match || Number(match[1]) > Number(match[2])) fail(`--seeds khong hop le: ${value}`);
      options.seeds = [Number(match[1]), Number(match[2])];
    } else {
      const match = /^(\w+)=(-?[\d.]+)$/.exec(value);
      if (!match) fail(`--tune khong hop le: ${value}`);
      const [, key, raw] = match;
      const number = Number(raw);
      if (!(key in TUNING)) fail(`khong co khoa TUNING: ${key}`);
      const [min, max, step] = TUNING_RANGES[key];
      const steps = (number - min) / step;
      if (number < min || number > max || Math.abs(steps - Math.round(steps)) > 1e-9) {
        fail(`${key}=${number} ngoai TUNING_RANGES [${min}, ${max}], buoc ${step}`);
      }
      options.overrides[key] = number;
    }
  }
  if (options.set === 'accept' && (options.seeds || Object.keys(options.overrides).length > 0)) {
    fail('--set accept khong nhan --seeds hay --tune');
  }
  if (options.seeds && options.seeds[0] <= ACCEPT_SEEDS[1] && options.seeds[1] >= ACCEPT_SEEDS[0]) {
    fail('tap seed tune khong duoc cham tap nghiem thu 5000-5399');
  }
  return options;
};

const pct = (value) => `${value.toFixed(2)}`;
const rate = (games) => (games.length === 0 ? 0 : (games.filter((g) => g.won).length / games.length) * 100);
const avg = (values) => (values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length);
const scopes = () => [...LEVELS.map((level) => ({ name: `Man ${level + 1}`, levels: [level] })), { name: 'Gop 3 man', levels: LEVELS }];
const gamesOf = (results, bot, levels) => pooledGames(results, bot, levels);

const table = (title, header, rows) => [
  `\n${title}`,
  `| ${header.join(' | ')} |`,
  `|${header.map(() => '---').join('|')}|`,
  ...rows.map((row) => `| ${row.join(' | ')} |`),
].join('\n');

const report = (label, results) => {
  const out = [`\n===== ${label} =====`];
  out.push(table('winRate (%)', ['Pham vi', ...BOTS], scopes().map(({ name, levels }) =>
    [name, ...BOTS.map((bot) => pct(rate(gamesOf(results, bot, levels))))])));

  const pairs = [['G', 'R'], ['G', 'B'], ['G', 'B2'], ['G', 'G0'], ['G0', 'B']];
  out.push(table('Chenh lech theo cap seed: diem % (can duoi 95%)', ['Pham vi', ...pairs.map(([a, b]) => `${a}-${b}`)],
    scopes().map(({ name, levels }) => [name, ...pairs.map(([a, b]) => {
      const diff = pairedDiff(gamesOf(results, a, levels), gamesOf(results, b, levels));
      return `${pct(diff.gapPts)} (${pct(diff.lowerPts)})`;
    })])));

  out.push(table('Thoi luong uoc tinh cua G (giay)', ['Pham vi', 'P10', 'P50', 'P90'],
    scopes().map(({ name, levels }) => {
      const durations = gamesOf(results, 'G', levels).map((g) => g.durationMs);
      return [name, ...[10, 50, 90].map((p) => (percentile(durations, p) / 1000).toFixed(1))];
    })));

  out.push(table('Luot con lai trung vi khi thang', ['Pham vi', ...BOTS], scopes().map(({ name, levels }) =>
    [name, ...BOTS.map((bot) => percentile(gamesOf(results, bot, levels).filter((g) => g.won).map((g) => g.tiltsLeft), 50) ?? '-')])));

  out.push(table('So lan xa trung binh moi van', ['Pham vi', ...BOTS], scopes().map(({ name, levels }) =>
    [name, ...BOTS.map((bot) => avg(gamesOf(results, bot, levels).map((g) => g.vents)).toFixed(3))])));

  const verdict = judge(results);
  out.push(`\nC4.5 ${verdict.c45 ? 'DAT' : 'KHONG DAT'} | C4.6 (B) ${verdict.c46 ? 'DAT' : 'KHONG DAT'} | C4.6 doi chung (B2) ${verdict.c46B2 ? 'DAT' : 'KHONG DAT'} | C4.7 ${verdict.c47 ? 'DAT' : 'KHONG DAT'} | C4.8 ${verdict.c48 ? 'DAT' : 'KHONG DAT'}`);
  if (verdict.unstable) out.push('Canh bao: C4.6 dat voi B nhung khong dat voi B2, ket qua CHUA VUNG.');
  console.log(out.join('\n'));
  return verdict;
};

const anomalies = (results) => LEVELS.flatMap((level) => BOTS.flatMap((bot) =>
  results[level][bot].filter((g) => g.anomaly).map((g) => `L${level} ${bot} seed ${g.seed}: ${g.anomaly}`)));

const options = parseArgs(process.argv.slice(2));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let exitCode = 0;
try {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));
  await page.goto(`${options.url}/?game=gatefall`);
  await page.waitForFunction(() => window.__game?.getState()?.status === 'playing', null, { timeout: 30_000 });
  await page.evaluate(lib.installGatefallBots);
  await page.evaluate((overrides) => Object.assign(window.__game.tuning, overrides), options.overrides);

  const measure = async (range) => page.evaluate(
    (args) => window.__qaBots.run(args),
    { levels: LEVELS, seeds: seedRange(range), bots: [...BOTS] },
  );

  const tuneRange = options.seeds ?? TUNE_SEEDS;
  const output = { overrides: options.overrides, tuneRange };
  console.log(`Ghi de TUNING: ${JSON.stringify(options.overrides)}`);
  const tune = await measure(tuneRange);
  const tuneVerdict = report(`Tap tune ${tuneRange.join('-')}`, tune);
  output.tuneVerdict = tuneVerdict;
  const problems = anomalies(tune);

  if (options.set === 'accept') {
    if (tuneVerdict.gatePass) {
      const accept = await measure(ACCEPT_SEEDS);
      const acceptVerdict = report(`Tap nghiem thu ${ACCEPT_SEEDS.join('-')}`, accept);
      output.acceptVerdict = acceptVerdict;
      problems.push(...anomalies(accept));
      if (!(acceptVerdict.c45 && acceptVerdict.c46 && acceptVerdict.c47 && acceptVerdict.c48)) exitCode = EXIT_NOT_MET;
    } else {
      console.log('\nTap tune chua dat dong thoi C4.5, C4.6, C4.7: KHONG chay tap nghiem thu.');
      exitCode = EXIT_NOT_MET;
    }
  } else if (!tuneVerdict.gatePass) exitCode = EXIT_NOT_MET;

  if (problems.length > 0) {
    console.error(`\nVan bat thuong (${problems.length}):\n${problems.slice(0, 20).join('\n')}`);
    exitCode = 1;
  }
  if (consoleErrors.length > 0) {
    console.error(`\nLoi console:\n${consoleErrors.join('\n')}`);
    exitCode = 1;
  }
  output.anomalies = problems.length;
  output.consoleErrors = consoleErrors.length;
  mkdirSync(join(ROOT, 'artifacts'), { recursive: true });
  const file = join(ROOT, 'artifacts', `gatefall-c4-${options.set}.json`);
  writeFileSync(file, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`\nDa ghi ${file}`);
} finally {
  await browser.close();
}
process.exit(exitCode);
