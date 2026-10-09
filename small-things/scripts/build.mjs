/*
 * Build "The Small Things" PDF.
 *   node scripts/build.mjs [--previews]
 * Reads content/letter.json + content/poem.json, writes build/document.html,
 * paginates it in Chromium, prints dist/the-small-things.pdf and runs checks.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { chromium } = (() => {
  try {
    return require('playwright');
  } catch {
    return require(join(execSync('npm root -g').toString().trim(), 'playwright'));
  }
})();

const L = JSON.parse(readFileSync(join(root, 'content/letter.json'), 'utf8'));
const P = JSON.parse(readFileSync(join(root, 'content/poem.json'), 'utf8'));
const D = JSON.parse(readFileSync(join(root, 'content/design.json'), 'utf8'));
const args = new Set(process.argv.slice(2));

/* ---------------- text helpers ---------------- */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function smart(s) {
  return String(s)
    .replace(/(^|[\s(\[—–-])"/g, '$1“')
    .replace(/"/g, '”')
    .replace(/(^|[\s(\[—–-])'/g, '$1‘')
    .replace(/'/g, '’')
    .replace(/\.\.\./g, '…')
    .replace(/ -- /g, ' — ')
    .replace(/--/g, '—');
}
function md(s) {
  let h = esc(smart(s));
  h = h.replace(/~~(.+?)~~/g, '<s class="x">$1</s>');
  h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
  return h;
}
const paras = (text) => String(text).split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean);
function prose(text, o = {}) {
  return paras(text)
    .map((t, i) => `<p data-split="p" class="${i === 0 && o.dropcap ? 'first' : ''}">${md(t.replace(/\n/g, ' '))}</p>`)
    .join('\n');
}

/* ---------------- figures (SVG) ---------------- */
const NAVY = '#1f2d4a', GOLD = '#b08d4a', BROWN = '#7a5c43', INK = '#2b2926', FAINT = '#8a8174', PEN = '#2c4372';
function arrowSvg() {
  return `<svg viewBox="0 0 30 22" aria-hidden="true"><path d="M27 18 C 20 18, 10 15, 5 5" fill="none" stroke="${PEN}" stroke-width="1.4" stroke-linecap="round"/><path d="M2.5 9.5 L5 4 L10 7" fill="none" stroke="${PEN}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function contours() {
  // irregular concentric rings, like a survey of a small hill
  let s = '';
  const cx = 150, cy = 120;
  for (let k = 1; k <= 9; k++) {
    const r = k * 13;
    let d = '';
    for (let a = 0; a <= 64; a++) {
      const t = (a / 64) * Math.PI * 2;
      const rr = r * (1 + 0.09 * Math.sin(3 * t + k * 0.7) + 0.05 * Math.cos(5 * t - k));
      const x = cx + Math.cos(t) * rr * 1.25, y = cy + Math.sin(t) * rr * 0.82;
      d += (a ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    s += `<path d="${d}Z" fill="none" stroke="${NAVY}" stroke-width="${k % 3 === 0 ? 0.9 : 0.5}" opacity="${0.5 - k * 0.03}"/>`;
  }
  s += `<path d="M24 222 C 70 200, 90 160, 132 138" fill="none" stroke="${GOLD}" stroke-width="1.1" stroke-dasharray="2 3"/>`;
  s += `<g stroke="${NAVY}" stroke-width="1.3" stroke-linecap="round"><path d="M144 112 L156 124"/><path d="M156 112 L144 124"/></g>`;
  s += `<text x="161" y="112" font-family="Plex Condensed" font-size="7" letter-spacing="1" fill="${NAVY}">SUBJECT (APPROX.)</text>`;
  s += `<text x="30" y="214" font-family="Plex Condensed" font-size="6" letter-spacing="1" fill="${FAINT}">ROUTE OF OBSERVER</text>`;
  return `<svg viewBox="0 0 300 240" aria-hidden="true">${s}</svg>`;
}
function laughFigure() {
  let s = `<rect x="6" y="6" width="288" height="118" fill="none" stroke="${INK}" stroke-width="0.8" opacity="0.6"/>`;
  s += `<path d="M120 6 v10 M120 34 v12" stroke="${INK}" stroke-width="0.8" opacity="0.6"/>`; // a doorway
  const ox = 46, oy = 74;
  for (let k = 1; k <= 6; k++) s += `<path d="M${ox + k * 22} ${oy - k * 16} A ${k * 27} ${k * 27} 0 0 1 ${ox + k * 22} ${oy + k * 16}" fill="none" stroke="${GOLD}" stroke-width="${1.2 - k * 0.12}" opacity="${0.95 - k * 0.12}"/>`;
  s += `<circle cx="${ox}" cy="${oy}" r="4" fill="${NAVY}"/>`;
  const people = [[150, 40], [176, 96], [214, 58], [246, 104], [262, 32], [112, 104]];
  people.forEach(([x, y], i) => {
    s += `<circle cx="${x}" cy="${y}" r="5.5" fill="none" stroke="${INK}" stroke-width="0.8"/>`;
    s += `<path d="M${x - 2.6} ${y + 1} q 2.6 2.6 5.2 0" fill="none" stroke="${i === 3 ? FAINT : NAVY}" stroke-width="0.9" stroke-linecap="round"/>`;
  });
  s += `<text x="${ox - 6}" y="${oy + 17}" font-family="Plex Condensed" font-size="6.5" letter-spacing="0.8" fill="${NAVY}">ORIGIN</text>`;
  s += `<text x="196" y="120" font-family="Plex Condensed" font-size="6" letter-spacing="0.6" fill="${FAINT}">1 HOLDOUT (TEMPORARY)</text>`;
  return `<svg viewBox="0 0 300 130" aria-hidden="true">${s}</svg>`;
}
function distortionGrid() {
  const w = 300, h = 150, cx = 182, cy = 78, step = 15;
  const warp = (x, y) => {
    const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy) || 1;
    const k = 24 * Math.exp(-(r * r) / (2 * 46 * 46));
    return [x + (dx / r) * k, y + (dy / r) * k];
  };
  let s = '';
  for (let x = 0; x <= w; x += step) {
    let d = '';
    for (let y = 0; y <= h; y += 3) { const [a, b] = warp(x, y); d += (y ? 'L' : 'M') + a.toFixed(1) + ' ' + b.toFixed(1); }
    s += `<path d="${d}" fill="none" stroke="${NAVY}" stroke-width="0.45" opacity="0.55"/>`;
  }
  for (let y = 0; y <= h; y += step) {
    let d = '';
    for (let x = 0; x <= w; x += 3) { const [a, b] = warp(x, y); d += (x ? 'L' : 'M') + a.toFixed(1) + ' ' + b.toFixed(1); }
    s += `<path d="${d}" fill="none" stroke="${NAVY}" stroke-width="0.45" opacity="0.55"/>`;
  }
  s += `<circle cx="${cx}" cy="${cy}" r="3.2" fill="${GOLD}"/><circle cx="${cx}" cy="${cy}" r="9" fill="none" stroke="${GOLD}" stroke-width="0.7" stroke-dasharray="1.5 2"/>`;
  s += `<text x="${cx + 13}" y="${cy - 10}" font-family="Plex Condensed" font-size="6.5" letter-spacing="0.8" fill="${NAVY}">SUBJECT</text>`;
  s += `<rect x="3" y="${h - 14}" width="186" height="11" fill="#f7f1e3" opacity="0.92"/><text x="6" y="${h - 6}" font-family="Plex Condensed" font-size="6" letter-spacing="0.6" fill="${FAINT}">GRID: ORDINARY MEANING, 1 SQUARE = 1 AFTERNOON</text>`;
  return `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true"><rect x="0" y="0" width="${w}" height="${h}" fill="none" stroke="${INK}" stroke-width="0.6" opacity="0.5"/>${s}</svg>`;
}
function flightFigure() {
  let s = `<path d="M0 118 H300" stroke="${INK}" stroke-width="0.8" opacity="0.6"/>`;
  for (let x = 8; x < 92; x += 12) s += `<path d="M${x} 124 h7" stroke="${INK}" stroke-width="1.2" opacity="0.55"/>`;
  s += `<path d="M14 116 C 90 112, 150 70, 288 18" fill="none" stroke="${GOLD}" stroke-width="1.4" stroke-dasharray="3 3"/>`;
  [[60, 'FL 010'], [130, 'FL 080'], [200, 'FL 240'], [262, 'FL ???']].forEach(([x, t]) => {
    const y = x < 100 ? 109 : x < 160 ? 82 : x < 230 ? 52 : 30;
    s += `<path d="M${x} ${y - 4} v-6" stroke="${NAVY}" stroke-width="0.6"/><text x="${x - 9}" y="${y - 13}" font-family="Plex Condensed" font-size="6" letter-spacing="0.6" fill="${NAVY}">${t}</text>`;
  });
  s += `<path d="M288 18 l-11 2 l4 3 l-2 6 z" fill="${NAVY}"/>`;
  s += `<path d="M150 118 q 30 -9 60 0 q 30 9 60 0" fill="none" stroke="${FAINT}" stroke-width="0.6"/>`;
  s += `<text x="150" y="134" font-family="Plex Condensed" font-size="6" letter-spacing="0.6" fill="${FAINT}">HORIZON (FOR ADMIRING)</text>`;
  s += `<text x="196" y="40" font-family="Plex Condensed" font-size="6" letter-spacing="0.6" fill="${NAVY}">ROUTE (FOR TAKING)</text>`;
  return `<svg viewBox="0 0 300 142" aria-hidden="true">${s}</svg>`;
}
function experimentFigure() {
  // two traces across one day: both alive; one more so
  const W = 300, H = 120, x0 = 22, x1 = 290, base = 96;
  const t2x = (h) => x0 + ((h - 6) / 16) * (x1 - x0);
  const lively = (h) => 0.42 + 0.16 * Math.sin(h * 1.7) + 0.12 * Math.sin(h * 3.1 + 1) + (h > 15 && h < 18.5 ? 0.22 * Math.sin(((h - 15) / 3.5) * Math.PI) : 0) + (h > 9 && h < 10 ? 0.2 : 0);
  const flat = (h) => 0.34 + 0.05 * Math.sin(h * 1.7) + 0.03 * Math.sin(h * 3.1 + 1);
  const path = (f) => { let d = ''; for (let h = 6; h <= 22.001; h += 0.2) d += (h === 6 ? 'M' : 'L') + t2x(h).toFixed(1) + ' ' + (base - f(h) * 80).toFixed(1); return d; };
  let s = `<path d="M${x0} ${base}H${x1}" stroke="${INK}" stroke-width="0.6" opacity="0.55"/>`;
  [6, 10, 14, 18, 22].forEach((h) => (s += `<path d="M${t2x(h)} ${base}v3" stroke="${INK}" stroke-width="0.6" opacity="0.55"/><text x="${t2x(h) - 8}" y="${base + 11}" font-family="Plex Condensed" font-size="6" fill="${FAINT}">${String(h).padStart(2, '0')}:00</text>`));
  s += `<text x="0" y="${base - 66}" font-family="Plex Condensed" font-size="6" fill="${FAINT}" transform="rotate(-90 6 ${base - 40})">LIVELINESS</text>`;
  s += `<path d="${path(flat)}" fill="none" stroke="${BROWN}" stroke-width="1.4" stroke-dasharray="4 2.5"/>`;
  s += `<path d="${path(lively)}" fill="none" stroke="${NAVY}" stroke-width="1.5"/>`;
  s += `<text x="${t2x(19.2)}" y="${base - flat(22) * 80 + 12}" font-family="Plex Condensed" font-size="6.4" fill="${BROWN}">WITHOUT</text>`;
  s += `<text x="${t2x(16.2)}" y="${base - 0.86 * 80 - 4}" font-family="Plex Condensed" font-size="6.4" fill="${NAVY}">WITH SUBJECT</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${s}</svg>`;
}
function dumbbell(before, after) {
  // 0–10 scale; values outside become an arrow off the end
  const W = 300, x0 = 6, x1 = 270, y = 9;
  const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; };
  const b = num(before), a = num(after);
  const X = (v) => x0 + (Math.min(Math.max(v, 0), 10) / 10) * (x1 - x0);
  let s = `<path d="M${x0} ${y}H${x1}" stroke="${INK}" stroke-width="0.5" opacity="0.25"/>`;
  for (let i = 0; i <= 10; i++) s += `<path d="M${X(i)} ${y - (i % 5 ? 1.6 : 2.6)}V${y + (i % 5 ? 1.6 : 2.6)}" stroke="${INK}" stroke-width="0.5" opacity="${i % 5 ? 0.22 : 0.4}"/>`;
  if (b != null && a != null) {
    s += `<path d="M${X(b)} ${y}H${X(a)}" stroke="${GOLD}" stroke-width="2" opacity="0.9"/>`;
    if (a > 10) s += `<path d="M${x1} ${y}H${W - 4}" stroke="${GOLD}" stroke-width="2" stroke-dasharray="2 2"/><path d="M${W - 6} ${y - 3.4}L${W} ${y}L${W - 6} ${y + 3.4}" fill="none" stroke="${NAVY}" stroke-width="1.2"/>`;
    s += `<circle cx="${X(b)}" cy="${y}" r="3.6" fill="#f7f1e3" stroke="${BROWN}" stroke-width="1.5"/>`;
    if (a <= 10) s += `<circle cx="${X(a)}" cy="${y}" r="4" fill="${NAVY}" stroke="#f7f1e3" stroke-width="1"/>`;
  } else {
    // unmeasurable: a scribble across the scale
    let d = `M${X(1)} ${y}`;
    for (let i = 0; i < 26; i++) d += ` L${X(1 + i * 0.34).toFixed(1)} ${(y + (i % 2 ? -4 : 4)).toFixed(1)}`;
    s += `<path d="${d}" fill="none" stroke="${PEN}" stroke-width="0.9" stroke-linejoin="round" opacity="0.85"/>`;
  }
  return `<svg viewBox="0 0 ${W} 18" preserveAspectRatio="none" aria-hidden="true">${s}</svg>`;
}

/* ---------------- blocks ---------------- */
const SEC = Object.fromEntries(D.sections.map((s) => [s.id, s]));
function head(id, o = {}) {
  const s = SEC[id];
  return `<header class="sec${o.quiet ? ' sec--quiet' : ''}" data-keep data-newpage="${s.soft ? 'soft' : ''}" data-sec="${esc(s.no)}|${esc(s.short || s.title)}" data-anchor="${id}">
  <div class="sec__kicker"><span class="no">${esc(s.no)}</span><span>${esc(s.sector || '')}</span></div>
  <h2 class="sec__title">${md(s.title)}</h2>
  <div class="sec__rule"></div>
</header>`;
}
const fnCount = { n: 0 };
function fieldnote(f) {
  fnCount.n++;
  const tick = fnCount.n % 3 === 1 ? '<span class="tick">Observation confirmed</span>' : '';
  return `<aside class="fieldnote${tick ? ' has-tick' : ''}">
  <div class="fieldnote__head"><b>Field note ${esc(f.no)}</b><span>${esc(D.logged[fnCount.n % D.logged.length])}</span></div>
  <div class="fieldnote__obs">${md(f.observation)}</div>
  <div class="fieldnote__con"><span class="label">Observed consequence</span>${md(f.consequence)}</div>
  ${tick}
</aside>`;
}
let mCount = 0;
function marginal(m) {
  mCount++;
  return `<div class="marginal${mCount % 2 === 0 ? ' marginal--left' : ''}">${arrowSvg()}${md(m.text)}</div>`;
}
const fig = (svg, no, cap) => `<figure class="fig">${svg}<figcaption><b>Fig. ${no}</b>${esc(cap)}</figcaption></figure>`;
const gap = (k = 'm') => `<div class="gap-${k}"></div>`;

// prose with marginalia tucked after the first paragraph when there is room
function sectionProse(id, text, o = {}) {
  const ps = paras(text);
  const ms = L.marginalia.filter((m) => m.after === id && !usedM.has(m));
  ms.forEach((m) => usedM.add(m));
  // a margin note sits after paragraph `para` (a number, or "end"); default: after the first paragraph
  const at = (m) => (m.para === 'end' || ps.length < 2 ? ps.length - 1 : Math.min(ps.length - 1, Number.isInteger(m.para) ? m.para : 0));
  const html = [];
  ps.forEach((t, i) => {
    html.push(`<p data-split="p" class="${i === 0 && o.dropcap && t.length > 230 ? 'first' : ''}">${md(t.replace(/\n/g, ' '))}</p>`);
    ms.filter((m) => at(m) === i).forEach((m) => html.push(marginal(m)));
    if (o.figAfter === i && o.fig) html.push(o.fig);
  });
  return html.join('\n');
}
const usedM = new Set();
const usedF = new Set();
// field notes for a section, then any of its margin notes not already tucked into its prose
const notesAfter = (id) => {
  const f = L.fieldnotes.filter((n) => n.after === id && !usedF.has(n));
  f.forEach((n) => usedF.add(n));
  const m = L.marginalia.filter((n) => n.after === id && !usedM.has(n));
  m.forEach((n) => usedM.add(n));
  return f.map(fieldnote).concat(m.map(marginal)).join('\n');
};

function fixedPage(name, inner, cls = '') {
  return `<section class="page ${cls}" data-page data-name="${name}"><div class="frame">${inner}</div></section>`;
}

/* cover */
const cover = `<section class="page page--bare page--cover" data-page data-name="cover">
  <div class="cover">
    <div class="cover__top"><span>Case file No. ${esc(D.caseNo)}</span><span>Classification: Difficult to measure</span></div>
    <div class="cover__map">${contours()}</div>
    <div class="cover__title">
      <div class="cover__kicker">An unofficial field study</div>
      <h1>The Small Things</h1>
      <div class="cover__rule"></div>
      <p class="cover__sub">${md(D.subtitle)}</p>
    </div>
    <table class="form cover__form">
      <tr><td class="k">Case file</td><td class="v">No. ${esc(D.caseNo)} <span class="faint sans" style="font-style:normal;font-size:6.4pt;letter-spacing:.12em">· SUBJECT WITHHELD</span></td></tr>
      <tr><td class="k">Observer</td><td class="v">A Cartographer of Small Changes</td></tr>
      <tr><td class="k">Classification</td><td class="v">Difficult to measure</td></tr>
    </table>
    <span class="stamp stamp--abs cover__stamp">Unofficial</span>
    <div class="cover__foot"><span>Archive ref. ${esc(D.ref)} · Vol. I</span><span>Do not fold. Do not measure.</span></div>
    <div class="ruler"></div>
  </div>
</section>`;

/* routing slip: the ONLY place names appear */
const routing = `<section class="page page--routing" data-page data-name="routing"><div class="frame">
  <div class="slip">
    <div class="slip__head"><span class="label">Internal routing slip</span><span class="label faint">Form CSC-1 · Handle with care</span></div>
    <table class="form slip__form">
      <tr><td class="k">To</td><td class="v slip__name">${esc(D.to)}</td></tr>
      <tr><td class="k">From</td><td class="v slip__name">${esc(D.from)}</td></tr>
      <tr><td class="k">Re</td><td class="v">${md(D.re)}</td></tr>
      <tr><td class="k">File opened</td><td class="v">${md(D.opened)}</td></tr>
      <tr><td class="k">Handling</td><td class="v">${md(D.handling)}</td></tr>
    </table>
    <div class="slip__note hand">${md(D.slipNote)}</div>
    <span class="stamp stamp--navy stamp--abs slip__stamp">Received</span>
  </div>
</div></section>`;

/* contents register */
const contents = fixedPage('contents', `
  <div class="label">Register of contents</div>
  <h2 class="sec__title" style="margin-top:2mm">Contents of this file</h2>
  <div class="sec__rule"></div>
  <ol class="toc">
    ${D.sections.filter((s) => !s.noToc).map((s) => `<li><span class="toc__no">${esc(s.no)}</span><span class="toc__t">${md(s.title)}</span><span class="toc__dots"></span><span class="toc__p" data-toc="${s.id}">00</span></li>`).join('\n')}
  </ol>
  <p class="toc__foot faint">${md(D.tocFoot)}</p>`);

const pull = (q) => fixedPage('pull', `<div class="pull"><span class="mark">“</span><blockquote>${q.lines.map((l) => `<p>${md(l)}</p>`).join('')}</blockquote><div class="src label">${esc(q.src)}</div></div>`, 'page--center page--pull');

/* report */
const reportRows = L.report.map((r) => {
  const isName = /^(name|subject)$/i.test(String(r.field).trim());
  const v = isName ? `<span class="redact"></span><small>withheld · see slip</small>` : md(r.value);
  return `<tr><td class="k">${esc(r.field)}</td><td class="v">${v}</td></tr>`;
}).join('');

/* index */
const indexRows = L.index.map((r) => `<div class="wdi__row">
  <div class="wdi__item"><b>${md(r.item)}</b><span>Before <em>${md(r.before)}</em> · After <em>${md(r.after)}</em></span></div>
  ${dumbbell(r.before, r.after)}
  <div class="wdi__note">${md(r.note)}</div>
</div>`);

/* poem */
const poemOpener = fixedPage('appendix', `
  <div class="appx">
    <div class="label">Appendix A</div>
    <p class="appx__note">${md(D.appendixNote)}</p>
    <div class="hr hr--gold"></div>
    <h2 class="appx__title">${md(P.title)}</h2>
    ${P.epigraph ? `<p class="appx__epi">${md(P.epigraph)}</p>` : ''}
  </div>`, 'page--center');
const poemSecs = P.sections.map((s, i) => `<section class="poem-sec" data-newpage data-split="stanzas" data-sec="App. A|The Poem" ${i === 0 ? 'data-anchor="poem"' : ''}>
  <div class="poem-head"><div class="num">${esc(s.numeral)}</div>${s.heading ? `<div class="h">${md(s.heading)}</div>` : ''}</div>
  ${paras(s.text).map((st) => `<div class="stanza">${st.split('\n').map((ln) => md(ln)).join('\n')}</div>`).join('\n')}
</section>`).join('\n');

const finalPage = `<section class="page page--bare page--final" data-page data-name="final"><div class="frame">
  <div class="final">
    <p class="final__q">${D.finalLines.map(md).join('<br>')}</p>
    <div class="hr hr--gold" style="width:18mm;margin:9mm auto"></div>
    <table class="final__meta"><tr><td>Field study</td><td>Case file No. ${esc(D.caseNo)}</td></tr><tr><td>Status</td><td>Still observing</td></tr></table>
    <p class="final__filed"><span class="label">Filed by</span><br><em>The Cartographer of Small Changes</em></p>
    <span class="stamp stamp--abs final__stamp">Still observing</span>
  </div>
</div></section>`;

/* ---------------- assemble ---------------- */
const blocks = [];
const push = (...b) => blocks.push(...b);
push(cover, routing, contents);

push(head('disclaimer'), sectionProse('disclaimer', L.disclaimer, { dropcap: true }));
push(`<div class="box keep"><div class="box__title label">Standard instruments &amp; units of the profession</div><dl class="units">${L.instruments.map((u) => `<dt>${md(u.unit)}</dt><dd>${md(u.definition)}</dd>`).join('')}</dl></div>`);
push(notesAfter('disclaimer'), notesAfter('instruments'));

push(head('talk_listen'), sectionProse('talk_listen', L.talk_listen, { dropcap: true }), notesAfter('talk_listen'));
push(head('excitement_aliens'), sectionProse('excitement_aliens', L.excitement_aliens, { dropcap: true, figAfter: 0, fig: fig(laughFigure(), 2, D.figs.laugh) }), notesAfter('excitement_aliens'));
push(head('arguments_pig'), sectionProse('arguments_pig', L.arguments_pig, { dropcap: true }), notesAfter('arguments_pig'));

push(head('distortion'), sectionProse('distortion', L.distortion.intro, { dropcap: true }));
push(fig(distortionGrid(), 3, D.figs.grid), notesAfter('distortion'));
push(`<table class="ba keep"><thead><tr><th>Before the subject enters</th><th>After the subject enters the story</th></tr></thead><tbody>${L.distortion.pairs.map((p) => `<tr><td>${md(p.before)}</td><td>${md(p.after)}</td></tr>`).join('')}</tbody></table>`);
push(prose(L.distortion.close));
if (D.pulls[0]) push(pull(D.pulls[0]));

push(head('report'), `<table class="form report keep">${reportRows}</table>`, `<div class="report__foot keep"><div class="photo"><span class="label">Photograph</span><p>${md(D.photoNote)}</p></div><span class="stamp">Inconclusive</span></div>`, notesAfter('report'));

push(head('index'), `<p class="muted" data-split="p" style="font-size:10.2pt">${md(D.indexIntro)}</p>`, `<div class="wdi"><div class="wdi__legend"><span><i class="b"></i>Before the subject</span><span><i class="a"></i>After</span><span style="margin-left:auto">Scale 0–10</span></div></div>`);
indexRows.forEach((row) => push(`<div class="wdi keep">${row}</div>`));
push(`<p class="faint" style="font-size:8.6pt;margin-top:2.4mm" data-split="p">${md(D.indexFoot)}</p>`, notesAfter('index'));

push(head('turn'), sectionProse('turn', L.turn, { dropcap: true }), notesAfter('turn'));
push(head('ambition'), sectionProse('ambition', L.ambition, { dropcap: true, figAfter: 1, fig: fig(flightFigure(), 4, D.figs.flight) }), notesAfter('ambition'));
if (D.pulls[1]) push(pull(D.pulls[1]));

push(head('things'), `<ol class="nlist" data-split="list">${L.things.map((t, i) => `<li><span class="n">${String(i + 1).padStart(2, '0')}</span><span>${md(t)}</span></li>`).join('')}</ol>`, notesAfter('things'));

push(head('experiment'));
push(`<div class="proto__h label keep" data-keep>Procedure</div>`, prose(L.experiment.setup));
push(`<div class="keep"><div class="proto__h label">Held constant</div><ul class="checks">${L.experiment.constants.map((c) => `<li>${md(c)}</li>`).join('')}</ul></div>`);
push(`<div class="proto__h label" data-keep>Observations</div>`, prose(L.experiment.observations));
push(fig(experimentFigure(), 5, D.figs.experiment));
push(`<div class="proto__h label" data-keep>Conclusion</div>`, prose(L.experiment.conclusion), notesAfter('experiment'));

push(head('unmeasurables'), `<ul class="abandon" data-split="list">${L.unmeasurables.filter((u) => !/^\s*result\s*:/i.test(u)).map((u, i) => `<li><span>${md(u)}</span><span class="val">${esc(D.abandonVals[i % D.abandonVals.length])}</span></li>`).join('')}</ul>`, `<div class="result keep" style="position:relative"><b>Result</b>Human variables remain inconveniently immeasurable.<span class="stamp stamp--abs" style="right:3mm;bottom:-13mm;transform:rotate(-8deg)">Abandoned</span></div>`, notesAfter('unmeasurables'));

push(head('conclusion'), `<table class="form keep">${L.conclusion.fields.map((r) => `<tr><td class="k">${esc(r.field)}</td><td class="v">${/^subject$/i.test(r.field.trim()) ? '<span class="redact"></span><small>see routing slip</small>' : md(r.value)}</td></tr>`).join('')}</table>`, gap('m'), prose(L.conclusion.paragraph), notesAfter('conclusion'));

const strayF = L.fieldnotes.filter((n) => !usedF.has(n));
const strayM = L.marginalia.filter((n) => !usedM.has(n));
if (strayF.length || strayM.length) {
  console.warn('notes with unknown "after":', strayF.map((n) => n.after).concat(strayM.map((n) => n.after)).join(', '));
  push(strayF.map(fieldnote).join('\n'), strayM.map(marginal).join('\n'));
  strayF.forEach((n) => usedF.add(n));
  strayM.forEach((n) => usedM.add(n));
}
push(head('ending', { quiet: true }), `<div class="ending">${sectionProse('ending', L.ending)}</div>`, notesAfter('ending'));
push(fixedPage('final-line', `<p class="final-line">${md(L.final_line)}</p>`, 'page--center page--quietline'));

push(poemOpener, poemSecs, finalPage);

const html = `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8">
<title>The Small Things: An Unofficial Field Study</title>
<link rel="stylesheet" href="../src/styles.css">
<link rel="stylesheet" href="../src/pages.css">
<script>window.__META = ${JSON.stringify({ ref: D.ref, title: 'The Small Things', coords: D.conditions })};</script>
</head><body>
<main id="pages"></main>
<div id="source">
${blocks.join('\n')}
</div>
<script src="../src/paginate.js"></script>
</body></html>`;

mkdirSync(join(root, 'build'), { recursive: true });
mkdirSync(join(root, 'dist'), { recursive: true });
const htmlPath = join(root, 'build/document.html');
writeFileSync(htmlPath, html);

/* ---------------- render ---------------- */
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
const consoleErrors = [];
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
page.on('pageerror', (e) => consoleErrors.push(e.message));
await page.goto(pathToFileURL(htmlPath).href);
await page.waitForFunction(() => window.__report, null, { timeout: 60000 });
const report = await page.evaluate(() => window.__report);
const pdfPath = join(root, 'dist/the-small-things.pdf');
await page.pdf({ path: pdfPath, width: '120mm', height: '213mm', printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 }, tagged: true, outline: true });
await browser.close();

/* ---------------- checks ---------------- */
const text = execSync(`pdftotext -enc UTF-8 "${pdfPath}" -`).toString();
const count = (re) => (text.match(re) || []).length;
const checks = [];
const pdfPages = parseInt(/Pages:\s+(\d+)/.exec(execSync(`pdfinfo "${pdfPath}"`).toString())[1], 10);
checks.push([pdfPages === report.pages, `PDF has ${pdfPages} pages (paginator laid out ${report.pages})`]);
checks.push([count(/Chooty Bole/g) === 1, `"Chooty Bole" appears exactly once (routing slip): ${count(/Chooty Bole/g)}`]);
checks.push([count(/Chooty/g) === 1 && count(/\bBole\b/g) === 1, `no other "Chooty"/"Bole": ${count(/Chooty/g)}/${count(/\bBole\b/g)}`]);
checks.push([count(/Matta/g) === 1 && count(/Gon Satha/gi) === 1 && count(/Navoda/gi) === 0, `sender named only on the slip: Matta ${count(/Matta/g)}, Gon Satha ${count(/Gon Satha/gi)}, Navoda ${count(/Navoda/gi)}`]);
checks.push([report.problems.length === 0, `layout problems: ${report.problems.length ? report.problems.join(' | ') : 'none'}`]);
checks.push([consoleErrors.length === 0, `console errors: ${consoleErrors.length ? consoleErrors.join(' | ') : 'none'}`]);
const fonts = execSync(`pdffonts "${pdfPath}"`).toString();
const fallback = fonts.split('\n').slice(2).filter((l) => l.trim() && !/EBGaramond|EB Garamond|IBMPlexSansCond|Plex|Caveat/i.test(l));
checks.push([fallback.length === 0, `fonts embedded: ${fallback.length ? 'FALLBACK FONTS USED: ' + fallback.map((l) => l.split(/\s+/)[0]).join(', ') : 'only the three families'}`]);
const words = (s) => (String(s).match(/[A-Za-z’'-]+/g) || []).length;
const letterProse = ['disclaimer', 'talk_listen', 'excitement_aliens', 'arguments_pig', 'turn', 'ambition', 'ending'].reduce((n, k) => n + words(L[k]), 0) + words(L.distortion.intro) + words(L.distortion.close) + words(L.experiment.setup) + words(L.experiment.observations) + words(L.experiment.conclusion) + words(L.conclusion.paragraph) + words(L.final_line);
const letterAll = letterProse + [L.instruments.map((u) => u.unit + ' ' + u.definition), L.things, L.unmeasurables, L.fieldnotes.map((f) => f.observation + ' ' + f.consequence), L.marginalia.map((m) => m.text), L.distortion.pairs.map((p) => p.before + ' ' + p.after), L.report.map((r) => r.value), L.index.map((r) => r.item + ' ' + r.note)].flat().reduce((n, s) => n + words(s), 0);
const poemWords = P.sections.reduce((n, s) => n + words(s.text), 0);
console.log(`\nwords: letter prose ${letterProse}, letter incl. features ${letterAll}, poem ${poemWords}`);
checks.forEach(([ok, msg]) => console.log(`${ok ? '✓' : '✗'} ${msg}`));

if (args.has('--previews')) {
  const pv = join(root, 'build/preview');
  if (existsSync(pv)) rmSync(pv, { recursive: true });
  mkdirSync(pv, { recursive: true });
  execSync(`pdftoppm -r 110 -png "${pdfPath}" "${join(pv, 'p')}"`);
  console.log('previews: build/preview/p-NN.png');
}
console.log(`\nwrote ${pdfPath}`);
process.exitCode = checks.every(([ok]) => ok) ? 0 : 1;
