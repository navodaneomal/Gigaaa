/*
 * End-to-end checks with Playwright (Chromium).
 *
 *   npm test                 run everything
 *   SHOTS=dir npm test       also save screenshots of every scene/viewport
 *
 * Needs the `playwright` package (npm i -D playwright && npx playwright install chromium).
 * It plays the whole experience like a real visitor: puzzles, a bot that actually
 * plays the netball match through the on-screen touch controls, the victory,
 * report, envelope and letter, then checks reload behaviour, layouts at many
 * viewport sizes, and reduced motion.
 */
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    try {
      const globalRoot = execSync('npm root -g').toString().trim();
      return require(join(globalRoot, 'playwright'));
    } catch {
      console.error('Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium');
      process.exit(1);
    }
  }
}
const { chromium, devices } = loadPlaywright();

const PORT = 5000 + Math.floor(Math.random() * 1000);
const BASE = `http://localhost:${PORT}`;
const SHOTS = process.env.SHOTS || '';
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

let failures = 0;
function check(cond, msg) {
  if (cond) console.log('  ✓ ' + msg);
  else {
    failures++;
    console.log('  ✗ ' + msg);
  }
}

function startServer() {
  return new Promise((resolve, reject) => {
    const srv = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'inherit'] });
    srv.stdout.on('data', (d) => {
      if (String(d).includes('ready')) resolve(srv);
    });
    srv.on('error', reject);
    setTimeout(() => reject(new Error('server did not start')), 5000);
  });
}

function watchErrors(page, bucket) {
  page.on('console', (m) => {
    if (m.type() === 'error') bucket.push(m.text());
  });
  page.on('pageerror', (e) => bucket.push(e.message));
}

const activeScene = (page) => page.evaluate(() => document.querySelector('.scene.is-active')?.dataset.scene);
async function waitScene(page, name, timeout = 15000) {
  await page.waitForFunction((n) => document.querySelector('.scene.is-active')?.dataset.scene === n, name, { timeout });
}

/* A bot that plays the match through the real touch controls. */
async function playMatchWithTouch(page) {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        const G = window.RFC.game;
        const joy = document.getElementById('joystick');
        const passBtn = document.getElementById('btn-pass');
        const shootBtn = document.getElementById('btn-shoot');
        const fire = (el, type, x, y, id) =>
          el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: id, pointerType: 'touch', isPrimary: id === 1, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
        const center = (el) => {
          const r = el.getBoundingClientRect();
          return [r.left + r.width / 2, r.top + r.height / 2];
        };
        let joyDown = false;
        let jx = 0;
        let jy = 0;
        function stick(dx, dy) {
          const [cx, cy] = center(joy);
          const l = Math.hypot(dx, dy);
          if (l < 0.2) {
            if (joyDown) fire(joy, 'pointerup', cx, cy, 1);
            joyDown = false;
            return;
          }
          if (!joyDown) {
            fire(joy, 'pointerdown', cx, cy, 1);
            joyDown = true;
            jx = cx;
            jy = cy;
          }
          fire(joy, 'pointermove', jx + (dx / l) * 60, jy + (dy / l) * 60, 1);
        }
        const tap = (el, id) => {
          const [x, y] = center(el);
          fire(el, 'pointerdown', x, y, id);
          fire(el, 'pointerup', x, y, id);
        };
        let side = 1;
        let holding = false;
        let lastPass = 0;
        const t0 = performance.now();
        const iv = setInterval(() => {
          const s = G._state();
          if (s.phase === 'won' || performance.now() - t0 > 240000) {
            stick(0, 0);
            clearInterval(iv);
            resolve({ home: s.home, away: s.away, extra: s.extra, secs: Math.round((performance.now() - t0) / 1000) });
            return;
          }
          if (s.phase === 'timeup') {
            document.getElementById('extra-time').click();
            return;
          }
          if (s.phase !== 'play') {
            stick(0, 0);
            if (holding) {
              const [x, y] = center(shootBtn);
              fire(shootBtn, 'pointerup', x, y, 3);
              holding = false;
            }
            return;
          }
          const p = s.p;
          if (s.ball.owner === 'mate' && !s.flight) {
            const tx = side * 2.6;
            const ty = 2.5;
            if (Math.abs(p.x - tx) < 0.5) side = -side;
            stick(tx - p.x, ty - p.y);
            if (s.open && Math.hypot(p.x, p.y) < 4.3 && performance.now() - lastPass > 500) {
              tap(passBtn, 2);
              lastPass = performance.now();
            }
          } else if (s.ball.owner === 'player') {
            stick(0, 0);
            if (Math.hypot(p.x, p.y) > 4.8) {
              if (performance.now() - lastPass > 500) {
                tap(passBtn, 2);
                lastPass = performance.now();
              }
              return;
            }
            const z = G._debug.zoneFor();
            const [x, y] = center(shootBtn);
            if (!holding) {
              fire(shootBtn, 'pointerdown', x, y, 3);
              holding = true;
              return;
            }
            if (Math.abs(s.power - z.center) < z.half * 0.45) {
              fire(shootBtn, 'pointerup', x, y, 3);
              holding = false;
            }
          } else stick(0, 0);
        }, 16);
      })
  );
}

async function fullPlaythrough(browser, label, contextOpts) {
  console.log(`\n▶ Full playthrough: ${label}`);
  const ctx = await browser.newContext(contextOpts);
  const page = await ctx.newPage();
  const errors = [];
  watchErrors(page, errors);
  await page.goto(`${BASE}/?speed=6`);

  await page.waitForSelector('#gate-start', { state: 'visible' });
  await page.locator('#gate-start').click();
  await waitScene(page, 'intro');
  await page.waitForSelector('#enter-court.is-shown');
  check(true, 'intro notice reveals and ENTER THE COURT appears');
  await page.locator('#enter-court').click();

  await waitScene(page, 'welcome');
  await page.locator('#ref-badge').click();
  await page.waitForFunction(() => document.getElementById('toast').textContent.includes('extremely qualified'));
  check(true, 'referee badge easter egg');
  await page.locator('#begin-check').click();

  // Puzzle one
  await waitScene(page, 'check');
  const good = ['strength', 'determination', 'ambition', 'calm', 'teamwork'];
  for (const id of [...good, 'quits']) await page.locator(`.trait[data-id="${id}"]`).click();
  check((await page.locator('.slot .trait').count()) === 6, 'six cards placed on the profile by tapping');
  await page.locator('.p-actions .btn').click();
  await page.waitForFunction(() => document.querySelector('[data-scene="check"] .ref-says p').textContent.includes('Have you met yourself'));
  check(true, 'decoy card is rejected with a referee line');
  await page.waitForFunction(() => document.querySelectorAll('.slot .trait').length === 5, null, { timeout: 8000 });
  check(true, 'rejected card returns to the pool');
  // drag the last correct trait onto the profile (mouse-style drag)
  const card = page.locator('.trait[data-id="courage"]');
  const box = await card.boundingBox();
  const prof = await page.locator('.profile').boundingBox();
  await page.evaluate(
    ({ b, p }) => {
      const el = document.querySelector('.trait[data-id="courage"]');
      const ev = (t, x, y) => el.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerId: 9, pointerType: 'mouse', clientX: x, clientY: y, button: 0 }));
      ev('pointerdown', b.x + 20, b.y + 20);
      ev('pointermove', b.x + 40, b.y + 10);
      ev('pointermove', p.x + p.width / 2, p.y + 30);
      ev('pointerup', p.x + p.width / 2, p.y + 30);
    },
    { b: box, p: prof }
  );
  check((await page.locator('.slot .trait[data-id="courage"]').count()) === 1, 'drag-and-drop places a card');
  await page.locator('.p-actions .btn').click();
  await page.waitForSelector('.verdict .stamp');
  check((await page.locator('.verdict .stamp').textContent()).includes('Qualified'), 'verdict stamp: QUALIFIED');
  await page.waitForSelector('.verdict .btn.is-shown');
  await page.locator('.verdict .btn').click();

  // Puzzle two: a failing plan first, then a winning one
  await waitScene(page, 'run');
  const choose = async (day, value) => page.locator(`fieldset.day >> nth=${day}`).locator(`label.choice:has(input[value="${value}"])`).click();
  for (let d = 0; d < 4; d++) await choose(d, 'push');
  await page.getByRole('button', { name: 'Play the four days' }).click();
  await page.waitForFunction(() => document.querySelector('[data-scene="run"] .ref-says.is-bad'), null, { timeout: 10000 });
  check((await page.locator('[data-scene="run"] .ref-says p').textContent()).includes('out of energy'), 'all-out plan runs out of energy');
  for (const [d, v] of [[0, 'push'], [1, 'recover'], [2, 'push'], [3, 'attack']]) await choose(d, v);
  await page.getByRole('button', { name: 'Play the four days' }).click();
  await page.waitForSelector('.verdict .verdict__lesson', { timeout: 15000 });
  check(true, 'paced plan succeeds and shows the lesson');
  await page.waitForSelector('.verdict .btn.is-shown');
  await page.locator('.verdict .btn').click();

  // The match
  await waitScene(page, 'match');
  await page.locator('#start-match').click();
  // scoreboard easter egg
  for (let i = 0; i < 3; i++) await page.locator('#scoreboard').click();
  check((await page.locator('#toast').textContent()).includes('classified'), 'scoreboard triple-tap easter egg');
  const result = await playMatchWithTouch(page);
  check(result.home >= 5, `bot won the match with touch controls (${result.home}–${result.away}, ${result.secs}s, extra periods: ${result.extra})`);
  await page.waitForSelector('#view-report.is-shown', { timeout: 20000 });
  check((await page.locator('#v-home').textContent()) === '05' && (await page.locator('#v-away').textContent()) === '03', 'victory board reads 05 – 03');
  // hold the trophy
  await page.evaluate(() => {
    const t = document.getElementById('trophy');
    t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7, pointerType: 'touch' }));
  });
  await page.waitForFunction(() => document.getElementById('toast').textContent.includes('Okay fine'), null, { timeout: 4000 });
  check(true, 'holding the trophy reveals the hidden message');
  await page.locator('#view-report').click();

  await waitScene(page, 'report');
  await page.waitForSelector('#to-unofficial:not(.is-waiting)', { timeout: 20000 });
  check((await page.locator('#report-obs li.is-shown').count()) === 7, 'all seven observations typed out');
  await page.locator('#to-unofficial').click();

  await waitScene(page, 'oya');
  await page.waitForSelector('#to-envelope.is-shown', { timeout: 15000 });
  check((await page.locator('#oya-title').textContent()).includes('oya mala anayak'), '“oya mala anayak” screen');
  await page.locator('#to-envelope').click();

  await waitScene(page, 'envelope');
  await page.locator('#envelope').click({ force: true }); // it floats gently, so it's never "stable"
  await waitScene(page, 'letter');
  const words = await page.evaluate(() => document.querySelector('.letter-body').innerText.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length);
  check(words >= 1500 && words <= 2100, `letter body has ${words} words`);
  check((await page.locator('.poem__stanza').count()) >= 8, 'poem rendered');
  // scroll to the end
  await page.evaluate(async () => {
    const sc = document.querySelector('.scene--letter');
    for (let y = 0; y < sc.scrollHeight; y += 500) {
      sc.scrollTop = y;
      await new Promise((r) => setTimeout(r, 30));
    }
    sc.scrollTop = sc.scrollHeight;
  });
  await page.waitForSelector('.approval .stamp.is-shown', { timeout: 5000 });
  await page.waitForSelector('.ending.is-in', { timeout: 5000 });
  check(true, 'approval stamp and ending appear on scroll');
  const progressScale = await page.evaluate(() => getComputedStyle(document.getElementById('read-progress')).getPropertyValue('--p'));
  check(parseFloat(progressScale) > 0.95, 'reading progress reaches the end');
  await page.locator('[data-ending-whistle]').click();
  check((await page.locator('#toast').textContent()).includes('official equipment'), 'whistle easter egg on the ending');

  // Reload: the letter must stay reachable
  await page.reload();
  await page.waitForSelector('#gate-resume', { state: 'visible' });
  check((await page.locator('#resume-label').textContent()) === 'the letter', 'after reload the gate offers to continue to the letter');
  await page.locator('#gate-start').click();
  await waitScene(page, 'letter');
  check(true, 'continue goes straight back to the letter');

  check(errors.length === 0, 'no console errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await ctx.close();
}

async function layoutChecks(browser) {
  console.log('\n▶ Layout checks (no horizontal overflow, nothing outside the viewport)');
  const viewports = [
    ['iPhone SE', { width: 320, height: 568 }, true],
    ['small Android', { width: 360, height: 640 }, true],
    ['iPhone 13', { width: 390, height: 844 }, true],
    ['large Android', { width: 412, height: 915 }, true],
    ['phone landscape', { width: 844, height: 390 }, true],
    ['small landscape', { width: 667, height: 375 }, true],
    ['iPad', { width: 768, height: 1024 }, true],
    ['laptop', { width: 1280, height: 800 }, false],
    ['desktop', { width: 1440, height: 900 }, false],
  ];
  const scenes = ['gate', 'intro', 'welcome', 'check', 'run', 'match', 'report', 'oya', 'envelope', 'letter'];
  for (const [name, viewport, touch] of viewports) {
    const ctx = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch && viewport.width < 900, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    watchErrors(page, errors);
    const problems = [];
    for (const s of scenes) {
      await page.goto(s === 'gate' ? `${BASE}/?speed=20` : `${BASE}/?debug&speed=20&scene=${s}`);
      await page.waitForTimeout(s === 'gate' ? 300 : 900);
      if (s !== 'gate') await waitScene(page, s).catch(() => problems.push(`${s}: did not open`));
      await page.waitForTimeout(700);
      const res = await page.evaluate(() => {
        const out = [];
        const vw = window.innerWidth;
        if (document.documentElement.scrollWidth > vw + 1) out.push('page scrolls sideways');
        const sc = document.querySelector('.scene.is-active');
        if (sc.scrollWidth > sc.clientWidth + 1) out.push('scene scrolls sideways');
        sc.querySelectorAll('button, p, h1, h2, h3, dd, dt, li, label, canvas, .trait, .day, .scoreboard').forEach((el) => {
          if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return;
          const r = el.getBoundingClientRect();
          if (r.width === 0) return;
          if (r.left < -1 || r.right > vw + 1) out.push(`${el.tagName.toLowerCase()}.${el.className || ''} outside viewport (${Math.round(r.left)}–${Math.round(r.right)})`);
        });
        sc.querySelectorAll('p, li, dd, button').forEach((el) => {
          const fs = parseFloat(getComputedStyle(el).fontSize);
          if (el.offsetParent && fs < 11) out.push(`tiny text (${fs}px) in ${el.tagName.toLowerCase()}`);
        });
        return out;
      });
      res.forEach((r) => problems.push(`${s}: ${r}`));
      if (SHOTS) await page.screenshot({ path: join(SHOTS, `${name.replace(/\s+/g, '-')}-${s}.png`) });
    }
    check(problems.length === 0 && errors.length === 0, `${name} ${viewport.width}×${viewport.height}` + (problems.length ? ' → ' + [...new Set(problems)].slice(0, 6).join('; ') : '') + (errors.length ? ' errors: ' + errors.join('|') : ''));
    await ctx.close();
  }
}

async function reducedMotion(browser) {
  console.log('\n▶ Reduced motion');
  const ctx = await browser.newContext({ ...devices['Pixel 7'], reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errors = [];
  watchErrors(page, errors);
  await page.goto(`${BASE}/?debug&scene=letter`);
  await waitScene(page, 'letter');
  await page.waitForTimeout(300);
  const hidden = await page.evaluate(() => [...document.querySelectorAll('.letter-root p, .letter-root h3')].filter((n) => getComputedStyle(n).opacity === '0').length);
  check(hidden === 0, 'letter text is fully visible without animation');
  await page.goto(`${BASE}/?debug&scene=report`);
  await waitScene(page, 'report');
  await page.waitForSelector('#to-unofficial:not(.is-waiting)', { timeout: 20000 });
  check(true, 'report sequence completes with reduced motion');
  await page.goto(`${BASE}/?debug&scene=match`);
  await waitScene(page, 'match');
  await page.locator('#start-match').click();
  await page.locator('#pause-btn').click();
  await page.locator('#mercy-btn').click();
  await page.waitForSelector('#view-report.is-shown', { timeout: 20000 });
  check((await page.locator('#v-home').textContent()) === '05', 'mercy option awards the match');
  check(errors.length === 0, 'no console errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await ctx.close();
}

async function keyboardMatch(browser) {
  console.log('\n▶ Desktop keyboard controls');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  watchErrors(page, errors);
  await page.goto(`${BASE}/?debug&scene=match`);
  await waitScene(page, 'match');
  check(await page.locator('.keys-hint').isVisible(), 'keyboard hints visible on desktop');
  await page.keyboard.press('Tab');
  await page.locator('#start-match').click();
  const x0 = await page.evaluate(() => window.RFC.game._state().p.x);
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(350);
  await page.keyboard.up('ArrowLeft');
  const x1 = await page.evaluate(() => window.RFC.game._state().p.x);
  check(x1 < x0 - 0.5, 'arrow keys move the player');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(350);
  await page.keyboard.up('KeyD');
  const x2 = await page.evaluate(() => window.RFC.game._state().p.x);
  check(x2 > x1 + 0.5, 'WASD moves the player');
  await page.keyboard.press('Escape');
  check(await page.locator('#ov-pause').isVisible(), 'Escape pauses the match');
  await page.keyboard.press('Escape');
  check(await page.locator('#ov-pause').isHidden(), 'Escape resumes');
  // force a timeout to check extra time
  await page.evaluate(() => {
    window.RFC.game._state().time = 0.05;
  });
  await page.waitForSelector('#ov-timeup', { state: 'visible' });
  await page.locator('#extra-time').click();
  check((await page.locator('#sb-period').textContent()) === 'Extra time', 'extra time is offered when the clock runs out');
  check(errors.length === 0, 'no console errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await ctx.close();
}

const server = await startServer();
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
try {
  await fullPlaythrough(browser, 'iPhone 13 (touch)', { ...devices['iPhone 13'] });
  await keyboardMatch(browser);
  await reducedMotion(browser);
  await layoutChecks(browser);
} catch (e) {
  failures++;
  console.error('\n✗ Test run crashed:', e);
} finally {
  await browser.close();
  server.kill();
}
console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);
