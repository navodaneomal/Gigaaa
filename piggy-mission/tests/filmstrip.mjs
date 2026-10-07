/*
 * Filmstrip: play the film (or one scene) in Chromium and save a contact sheet
 * of frames taken at an interval, so animation can be reviewed at a glance.
 *
 *   node tests/filmstrip.mjs --scene=training --frames=16 --every=700
 *        [--device="iPhone 13" | --device=desktop | --device=landscape | --device=se]
 *        [--query="&reduced"] [--out=sheet.png] [--keep=dir]
 *
 * Starts its own server on a random port, prints console errors, writes
 * the sheet (default: tests/out/<scene>-<device>.png). Needs `playwright`.
 */
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const require = createRequire(import.meta.url);
function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    const g = execSync('npm root -g').toString().trim();
    return require(join(g, 'playwright'));
  }
}
const { chromium, devices } = loadPlaywright();

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = /^--([^=]+)=?(.*)$/.exec(a);
    return m ? [m[1], m[2] === '' ? true : m[2]] : [a, true];
  })
);
const scene = args.scene || '';
const frames = +(args.frames || 16);
const every = +(args.every || 700);
const deviceName = args.device || 'iPhone 13';
const query = args.query || '';
const outDir = join(root, 'tests', 'out');
mkdirSync(outDir, { recursive: true });
const out = args.out || join(outDir, `${scene || 'film'}-${String(deviceName).replace(/\W+/g, '-')}.png`);

const DEVICES = {
  desktop: { viewport: { width: 1280, height: 800 } },
  landscape: { ...devices['iPhone 13 landscape'] },
  se: { viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 },
  tablet: { viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 },
};
const ctxOpts = DEVICES[deviceName] || devices[deviceName] || devices['iPhone 13'];

const port = 6000 + Math.floor(Math.random() * 2000);
const srv = spawn(process.execPath, [join(root, 'scripts', 'serve.mjs')], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((res) => srv.stdout.once('data', res));

const browser = await chromium.launch();
try {
  const page = await (await browser.newContext({ ...ctxOpts, deviceScaleFactor: 1 })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text());
  });
  const q = scene ? `?scene=${scene}&auto${query}` : `?nogate&auto${query}`;
  await page.goto(`http://localhost:${port}/index.html${q}`);
  const shots = [];
  for (let i = 0; i < frames; i++) {
    await page.waitForTimeout(every);
    shots.push((await page.screenshot({ type: 'jpeg', quality: 70 })).toString('base64'));
  }
  const current = await page.evaluate(() => {
    const segs = [...document.querySelectorAll('#progress .seg')];
    return { now: segs.findIndex((s) => s.classList.contains('is-now')), total: segs.length, ended: !document.getElementById('end').hidden };
  });
  // compose the contact sheet in the browser itself
  const vp = page.viewportSize();
  const cols = vp.width > vp.height ? 4 : 8;
  const w = vp.width > vp.height ? 420 : 240;
  const h = Math.round((w * vp.height) / vp.width);
  const sheetPage = await (await browser.newContext({ viewport: { width: cols * (w + 6) + 6, height: 200 } })).newPage();
  const html = `<body style="margin:0;background:#1d1d28;font:12px sans-serif;color:#ddd"><div style="display:grid;grid-template-columns:repeat(${cols},${w}px);gap:6px;padding:6px">${shots
    .map((b, i) => `<div><div style="height:16px">${i} · ${((i + 1) * every / 1000).toFixed(1)}s</div><img style="width:${w}px;height:${h}px;display:block" src="data:image/jpeg;base64,${b}"></div>`)
    .join('')}</div></body>`;
  await sheetPage.setContent(html);
  await sheetPage.waitForTimeout(200);
  await sheetPage.screenshot({ path: out, fullPage: true });
  console.log(`sheet: ${out}`);
  console.log(`progress: segment ${current.now} of ${current.total}${current.ended ? ' (film ended)' : ''}`);
  console.log(errors.length ? errors.join('\n') : 'no console errors');
} finally {
  await browser.close();
  srv.kill();
}
