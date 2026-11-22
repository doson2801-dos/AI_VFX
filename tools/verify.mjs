// Single quality gate: typecheck, browser tests, release build, then a scan of dist/.
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const SCANNED = /\.(js|html)$/;
const DEV_ONLY_MARKERS = ['__game', 'Tune gameplay', 'lil-gui'];

for (const script of ['typecheck', 'test', 'build']) {
  console.log(`\n=== npm run ${script} ===`);
  try {
    execSync(`npm run ${script}`, { stdio: 'inherit' });
  } catch {
    console.error(`\nVERIFY FAILED at: ${script}`);
    process.exit(1);
  }
}

const files = readdirSync(DIST, { recursive: true, encoding: 'utf8' }).filter((f) => SCANNED.test(f));
if (files.length === 0) {
  console.error(`\nVERIFY FAILED: no build output found in ${DIST}/`);
  process.exit(1);
}

const leaks = files.flatMap((file) => {
  const text = readFileSync(join(DIST, file), 'utf8');
  return DEV_ONLY_MARKERS.filter((marker) => text.includes(marker)).map((marker) => `${file}: ${marker}`);
});
if (leaks.length > 0) {
  console.error('\nVERIFY FAILED: dev-only code in release build:');
  leaks.forEach((leak) => console.error(`  ${leak}`));
  process.exit(1);
}

console.log(`\nVERIFY PASSED: ${files.length} release file(s) contain no dev-only code.`);
