// Packs dist/ into one self-contained HTML file that opens Slot Five by default.
// Usage: node tools/pack-single.mjs [distDir=dist] [outFile=artifacts/slot-five-play.html]
// Run `npm run build` first. The normal build is untouched: only the packed copy defaults to Slot Five.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const [distDir = 'dist', outFile = 'artifacts/slot-five-play.html'] = process.argv.slice(2);
const MANIFEST_SOURCE = 'src/game/slotFiveVfx.ts';
const EXPECTED_VFX_KEYS = 16;

let html = readFileSync(join(distDir, 'index.html'), 'utf8');

const m = html.match(/<script type="module" crossorigin src="\.\/(assets\/[^"]+\.js)"><\/script>/);
if (!m) throw new Error('module script tag not found in dist/index.html');
let js = readFileSync(join(distDir, m[1]), 'utf8');

// Without ?game= the packed file opens Slot Five (file:// and iframes need no query).
const re = /new URLSearchParams\(window\.location\.search\)\.get\((["'`])game\1\)/g;
const hits = (js.match(re) || []).length;
js = js.replace(re, (s) => `(${s}||"slot-five")`);
if (hits < 1) throw new Error('.get("game") not found in the bundle');

// Slot Five VFX: every json and sheet of the one manifest, inline. The game reads them from SF_VFX_EMBED by path,
// so no request leaves the file.
const manifestSource = readFileSync(MANIFEST_SOURCE, 'utf8');
const block = manifestSource.match(/export const SF_VFX_MANIFEST = \{([\s\S]*?)\} as const;/);
if (!block) throw new Error(`SF_VFX_MANIFEST not found in ${MANIFEST_SOURCE}`);
const entries = [...block[1].matchAll(/"(sf_[a-z_]+)":\s*"([^"]+\.json)"/g)].map(([, key, path]) => ({ key, path }));
if (entries.length !== EXPECTED_VFX_KEYS) throw new Error(`expected ${EXPECTED_VFX_KEYS} VFX keys, found ${entries.length}`);
const embed = { json: {}, images: {} };
let vfxBytes = 0;
for (const { path } of entries) {
  const jsonText = readFileSync(join(distDir, path), 'utf8');
  vfxBytes += Buffer.byteLength(jsonText);
  const meta = JSON.parse(jsonText);
  embed.json[path] = meta;
  const dir = path.slice(0, path.lastIndexOf('/') + 1);
  for (const sheet of meta.sheets) {
    const png = readFileSync(join(distDir, dir, sheet));
    vfxBytes += png.length;
    embed.images[`${dir}${sheet}`] = `data:image/png;base64,${png.toString('base64')}`;
  }
}
const embedScript = `<script>globalThis.SF_VFX_EMBED=${JSON.stringify(embed).replace(/</g, '\\u003c')};</script>`;

// Escape </script inside the JS so the tag is not cut short.
js = js.replace(/<\/script/gi, '<\\/script');

const others = readdirSync(join(distDir, 'assets')).filter((f) => !m[1].endsWith(f));
html = html
  .replace(m[0], () => `${embedScript}\n    <script type="module">${js}</script>`)
  .replace(/<title>[^<]*<\/title>/, '<title>Slot Five</title>');

for (const banned of ['__game', 'lil-gui', 'Tune gameplay']) {
  if (html.includes(banned)) throw new Error(`packed file contains dev-only text: ${banned}`);
}

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, html);
const bytes = Buffer.byteLength(html);
console.log(
  `ok: ${outFile} (${bytes} bytes, ${(bytes / 1024).toFixed(0)} KB), replaced ${hits} ?game read(s), ` +
  `${entries.length} VFX keys / ${Object.keys(embed.images).length} sheets inline (${vfxBytes} bytes raw), ` +
  `other dist assets not embedded: ${others.join(', ') || 'none'}`,
);
