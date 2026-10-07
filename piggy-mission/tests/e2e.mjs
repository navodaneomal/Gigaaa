/*
 * End-to-end checks for Piggy's Netball Mission (Playwright, Chromium).
 *
 *   npm test                       everything
 *   SHOTS=dir npm test             also save a screenshot per scene per viewport
 *   ONLY=play|layout|reduced|file  run one group
 *
 * 1. Plays the whole film like a person would (real taps, holds, swipes and
 *    pokes on the pig: no ?auto) on a touch phone, then presses "Watch again".
 * 2. Runs the film on 9 screen sizes and samples it every few hundred ms:
 *    no sideways scrolling, every caption/bubble/prompt inside the stage, no tiny text.
 * 3. Reduced motion: the whole story still plays to the end.
 * 4. Opened straight from disk (file://): gate works, fonts load.
 */
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const require = createRequire(import.meta.url);
function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    try {
      return require(join(execSync('npm root -g').toString().trim(), 'playwright'));
    } catch {
      console.error('Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium');
      process.exit(1);
    }
  }
}
const { chromium, devices } = loadPlaywright();
const SHOTS = process.env.SHOTS || '';
const ONLY = process.env.ONLY || '';
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

let failures = 0;
function check(ok, msg) {
  console.log((ok ? '  ✓ ' : '  ✗ ') + msg);
  if (!ok) failures++;
}

const port = 7000 + Math.floor(Math.random() * 2000);
const BASE = `http://localhost:${port}/index.html`;
const server = spawn(process.execPath, [join(root, 'scripts', 'serve.mjs')], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((res) => server.stdout.once('data', res));
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

function watch(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}
const sceneOf = (page) => page.evaluate(() => (/\bscene-(\S+)/.exec(document.getElementById('stage').className) || [])[1] || '');
const sceneIds = (page) => page.evaluate(() => window.PIGGY.scenes.list().map((s) => s.id));

/* ---------- 1. full playthrough with real input ---------- */
async function playthrough() {
  console.log('\n▶ Full playthrough on a touch phone (real taps, holds, swipes, pokes)');
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const errors = watch(page);
  await page.goto(`${BASE}?speed=3`);
  const ids = await sceneIds(page);
  await page.locator('#gate-btn').click({ force: true }); // the CTA bobs forever, so it is never "stable"
  const seen = [];
  const t0 = Date.now();
  let lastAction = Date.now();
  let pokes = 0;
  while (Date.now() - t0 < 8 * 60 * 1000) {
    const st = await page.evaluate(() => {
      const vis = (sel) => {
        const el = document.querySelector(sel);
        return !!el && el.classList.contains('is-in') && !el.classList.contains('is-out');
      };
      const stage = document.getElementById('stage').getBoundingClientRect();
      const go = document.querySelector('.mc-go.is-in button');
      const gb = go && go.getBoundingClientRect();
      const pig = window.PIGGY.debug.ctx.pig.el.getBoundingClientRect();
      return {
        scene: (/\bscene-(\S+)/.exec(document.getElementById('stage').className) || [])[1] || '',
        ended: !document.getElementById('end').hidden,
        tap: vis('.prompt--tap'),
        hold: vis('.prompt--hold'),
        swipe: vis('.prompt--swipe'),
        button: gb ? { x: gb.left + gb.width / 2, y: gb.top + gb.height / 2 } : null,
        pig: { x: pig.left + pig.width / 2, y: pig.top + pig.height * 0.55 },
        stage: { x: stage.left + stage.width / 2, y: stage.top + stage.height * 0.45, w: stage.width, l: stage.left },
      };
    });
    if (st.scene && seen[seen.length - 1] !== st.scene) seen.push(st.scene);
    if (st.ended) break;
    const idle = Date.now() - lastAction;
    if (st.button) {
      await page.mouse.click(st.button.x, st.button.y);
      lastAction = Date.now();
    } else if (st.hold) {
      await page.mouse.move(st.stage.x, st.stage.y);
      await page.mouse.down();
      await page.waitForTimeout(1100);
      await page.mouse.up();
      lastAction = Date.now();
    } else if (st.swipe) {
      const y = st.stage.y;
      await page.mouse.move(st.stage.l + st.stage.w * 0.78, y);
      await page.mouse.down();
      for (let k = 1; k <= 6; k++) await page.mouse.move(st.stage.l + st.stage.w * (0.78 - k * 0.09), y);
      await page.mouse.up();
      lastAction = Date.now();
    } else if (st.scene === 'poke' && idle > 900) {
      await page.mouse.click(st.pig.x, st.pig.y);
      pokes++;
      lastAction = Date.now();
    } else if (st.tap) {
      await page.mouse.click(st.stage.x, st.stage.y);
      lastAction = Date.now();
    } else if (idle > 6000) {
      // nothing asked of us for a while: a harmless tap (scenes must ignore it or treat it kindly)
      await page.mouse.click(st.stage.x, st.stage.y);
      lastAction = Date.now();
    }
    await page.waitForTimeout(150);
  }
  const ended = await page.evaluate(() => !document.getElementById('end').hidden);
  check(ended, `film reaches the end (${Math.round((Date.now() - t0) / 1000)}s at 3× speed)`);
  check(JSON.stringify(seen) === JSON.stringify(ids), `every scene played, in order: ${seen.join(' → ')}`);
  check(pokes >= 5 || !ids.includes('poke'), `the pig was poked ${pokes} times`);
  await page.locator('#replay-btn').click({ force: true });
  await page.waitForFunction(() => /scene-opening/.test(document.getElementById('stage').className), null, { timeout: 15000 }).catch(() => {});
  check(/opening/.test(await sceneOf(page)), '"Watch again" restarts the film');
  check(errors.length === 0, 'no console errors' + (errors.length ? ': ' + [...new Set(errors)].slice(0, 5).join(' | ') : ''));
  await ctx.close();
}

/* ---------- 2. layout sweep ---------- */
async function layout() {
  console.log('\n▶ Layout on 9 screen sizes (sampled through the whole film)');
  const sizes = [
    ['iPhone SE', { width: 320, height: 568 }, true],
    ['small Android', { width: 360, height: 640 }, true],
    ['iPhone 13', { width: 390, height: 844 }, true],
    ['large Android', { width: 412, height: 915 }, true],
    ['iPad', { width: 820, height: 1180 }, true],
    ['phone landscape', { width: 844, height: 390 }, true],
    ['small landscape', { width: 667, height: 375 }, true],
    ['laptop', { width: 1280, height: 800 }, false],
    ['desktop', { width: 1440, height: 900 }, false],
  ];
  for (const [name, viewport, touch] of sizes) {
    const ctx = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch && viewport.width < 900, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = watch(page);
    await page.goto(`${BASE}?nogate&auto&speed=4`);
    const problems = new Set();
    const shot = new Set();
    const t0 = Date.now();
    while (Date.now() - t0 < 4 * 60 * 1000) {
      const r = await page.evaluate(() => {
        const out = [];
        const stageEl = document.getElementById('stage');
        const s = stageEl.getBoundingClientRect();
        const scene = (/\bscene-(\S+)/.exec(stageEl.className) || [])[1] || '';
        if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push('page scrolls sideways');
        if (s.right > window.innerWidth + 1 || s.bottom > window.innerHeight + 1 || s.left < -1 || s.top < -1) out.push('stage larger than the screen');
        document.querySelectorAll('.cap .cap__text, .bubble, .prompt, .panel > *').forEach((el) => {
          const cs = getComputedStyle(el.closest('.cap, .bubble, .prompt, .panel') || el);
          if (parseFloat(cs.opacity) < 0.6 || cs.visibility === 'hidden') return;
          const r = el.getBoundingClientRect();
          if (!r.width) return;
          const tol = 3;
          if (r.left < s.left - tol || r.right > s.right + tol || r.top < s.top - tol || r.bottom > s.bottom + tol) {
            out.push(`${(el.className && el.className.baseVal == null ? el.className : '') || el.tagName} "${(el.textContent || '').trim().slice(0, 28)}" outside the stage`);
          }
          const fs = parseFloat(getComputedStyle(el).fontSize);
          if (fs && fs < 11 && (el.textContent || '').trim()) out.push(`tiny text ${fs.toFixed(1)}px "${el.textContent.trim().slice(0, 20)}"`);
        });
        return { out, scene, ended: !document.getElementById('end').hidden };
      });
      r.out.forEach((p) => problems.add(`${r.scene}: ${p}`));
      if (SHOTS && r.scene && !shot.has(r.scene)) {
        shot.add(r.scene);
        await page.waitForTimeout(900);
        await page.screenshot({ path: join(SHOTS, `${name.replace(/\W+/g, '-')}-${r.scene}.png`) });
      }
      if (r.ended) break;
      await page.waitForTimeout(350);
    }
    const ended = await page.evaluate(() => !document.getElementById('end').hidden);
    const list = [...problems];
    check(ended && !list.length && !errors.length, `${name} ${viewport.width}×${viewport.height}` + (ended ? '' : ' (did not reach the end)') + (list.length ? ' → ' + list.slice(0, 6).join('; ') : '') + (errors.length ? ' errors: ' + [...new Set(errors)].slice(0, 3).join(' | ') : ''));
    await ctx.close();
  }
}

/* ---------- 3. reduced motion ---------- */
async function reduced() {
  console.log('\n▶ Reduced motion');
  const ctx = await browser.newContext({ ...devices['Pixel 7'], reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errors = watch(page);
  await page.goto(`${BASE}?nogate&auto&speed=4`);
  const ids = await sceneIds(page);
  const seen = [];
  const t0 = Date.now();
  while (Date.now() - t0 < 4 * 60 * 1000) {
    const s = await sceneOf(page);
    if (s && seen[seen.length - 1] !== s) seen.push(s);
    if (await page.evaluate(() => !document.getElementById('end').hidden)) break;
    await page.waitForTimeout(300);
  }
  check(await page.evaluate(() => window.PIGGY.anim.reduced()), 'reduced-motion mode detected');
  check(JSON.stringify(seen) === JSON.stringify(ids), 'the whole story plays with reduced motion');
  check(errors.length === 0, 'no console errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await ctx.close();
}

/* ---------- 4. opened from disk ---------- */
async function fromDisk() {
  console.log('\n▶ Opened straight from disk (file://)');
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.goto(pathToFileURL(join(root, 'index.html')).href + '?speed=3');
  await page.locator('#gate-btn').click({ force: true }); // the CTA bobs forever, so it is never "stable"
  await page.waitForFunction(() => /scene-opening/.test(document.getElementById('stage').className), null, { timeout: 10000 });
  await page.waitForTimeout(1500);
  const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family));
  check(fonts.includes('Nunito'), 'fonts load from the embedded copy (' + [...new Set(fonts)].join(', ') + ')');
  check(pageErrors.length === 0, 'no script errors' + (pageErrors.length ? ': ' + pageErrors.join(' | ') : ''));
  await ctx.close();
}

try {
  if (!ONLY || ONLY === 'play') await playthrough();
  if (!ONLY || ONLY === 'reduced') await reduced();
  if (!ONLY || ONLY === 'file') await fromDisk();
  if (!ONLY || ONLY === 'layout') await layout();
} catch (e) {
  failures++;
  console.error('\n✗ Test run crashed:', e);
} finally {
  await browser.close();
  server.kill();
}
console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);
