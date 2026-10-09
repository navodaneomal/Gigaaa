/*
 * Paginator: pours the blocks in #source into fixed-size pages.
 *
 * Block contract (data attributes on each top-level child of #source):
 *   data-page          a complete page (already a .page element): placed as-is
 *   data-newpage       start a new flow page before this block
 *   data-sec="§ 04|Title"   updates the running header from here on
 *   data-keep          keep with the next block (headings, kickers)
 *   data-split="p"     a paragraph: may split between words (2+ lines each side)
 *   data-split="list"  an <ol>/<ul>: may split between items
 *   data-split="stanzas"  a poem section: may split between stanzas
 *   (anything else is atomic and moves whole to the next page)
 *
 * When done: window.__report = { pages, problems[] } and the folios/contents are filled.
 */
(function () {
  'use strict';
  var out = document.getElementById('pages');
  var src = document.getElementById('source');
  var problems = [];
  var pages = [];
  var frame = null;
  var curSec = { no: '', title: '' };
  var meta = window.__META || { ref: 'CSC-0001', title: 'The Small Things' };

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function furnish(page, opts) {
    opts = opts || {};
    if (!opts.bare) {
      var head = el('div', 'run-head');
      head.innerHTML = '<span>' + meta.title + ' · Field Study</span><span class="sec-label"></span>';
      page.appendChild(head);
      page.appendChild(el('div', 'ruler'));
      var foot = el('div', 'run-foot');
      foot.innerHTML = '<span class="coord"></span><span class="folio"></span>';
      page.appendChild(foot);
    }
  }
  function newFlowPage(variant) {
    var page = el('section', 'page page--flow' + (variant ? ' ' + variant : ''));
    furnish(page);
    frame = el('div', 'frame flow');
    page.appendChild(frame);
    out.appendChild(page);
    pages.push({ page: page, sec: Object.assign({}, curSec), flow: true });
    return frame;
  }
  function fits(f) {
    return f.scrollHeight <= f.clientHeight + 0.5;
  }
  function lineH(n) {
    var cs = getComputedStyle(n);
    var lh = parseFloat(cs.lineHeight);
    return isNaN(lh) ? parseFloat(cs.fontSize) * 1.4 : lh;
  }

  /* ---- paragraph splitting between words, preserving inline markup ---- */
  function wordBreaks(p) {
    var pts = [];
    var w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    var t;
    while ((t = w.nextNode())) {
      var s = t.data;
      for (var i = 1; i < s.length; i++) if (s[i - 1] === ' ' && s[i] !== ' ') pts.push({ node: t, off: i });
    }
    return pts;
  }
  function cut(p, pt) {
    var r1 = document.createRange();
    r1.setStart(p, 0);
    r1.setEnd(pt.node, pt.off);
    var r2 = document.createRange();
    r2.setStart(pt.node, pt.off);
    r2.setEnd(p, p.childNodes.length);
    var a = p.cloneNode(false);
    a.appendChild(r1.cloneContents());
    var b = p.cloneNode(false);
    b.appendChild(r2.cloneContents());
    b.classList.add('cont');
    b.classList.remove('first');
    b.removeAttribute('data-newpage');
    return [a, b];
  }
  // Try to fit the first part of paragraph `p` (already appended to frame) on this page.
  // Returns the remainder element (to place next), or null if nothing could stay here.
  function splitParagraph(p) {
    var pts = wordBreaks(p);
    if (!pts.length) return null;
    var lh = lineH(p);
    var lo = 0, hi = pts.length - 1, best = -1;
    var probe = null;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      var parts = cut(p, pts[mid]);
      if (probe) probe.remove();
      probe = parts[0];
      p.replaceWith(probe);
      var ok = fits(frame);
      probe.replaceWith(p);
      probe = null;
      if (ok) { best = mid; lo = mid + 1; } else hi = mid - 1;
    }
    if (best < 0) return null;
    // orphan/widow control: at least 2 lines on each side
    var k = best;
    for (var guard = 0; guard < 60 && k >= 0; guard++) {
      var pr = cut(p, pts[k]);
      p.replaceWith(pr[0]);
      var firstLines = Math.round(pr[0].getBoundingClientRect().height / lh);
      // measure the remainder off-page at the frame width
      var meas = el('div', 'flow');
      meas.style.cssText = 'position:absolute;visibility:hidden;width:' + frame.clientWidth + 'px';
      frame.parentNode.appendChild(meas);
      meas.appendChild(pr[1]);
      var restLines = Math.round(pr[1].getBoundingClientRect().height / lh);
      meas.remove();
      pr[0].replaceWith(p);
      if (firstLines < 2) return null;
      if (restLines >= 2) {
        p.replaceWith(pr[0]);
        return pr[1];
      }
      k -= 3; // pull a few words back so the last line isn't stranded
    }
    return null;
  }
  function splitList(list) {
    var items = Array.prototype.slice.call(list.children);
    if (items.length < 2) return null;
    var rest = list.cloneNode(false);
    rest.removeAttribute('data-newpage');
    while (!fits(frame) && list.children.length > 1) rest.insertBefore(list.lastElementChild, rest.firstChild);
    if (!fits(frame) || !rest.children.length) {
      while (rest.firstChild) list.appendChild(rest.firstChild);
      return null;
    }
    return rest;
  }
  function splitStanzas(sec) {
    var stz = Array.prototype.slice.call(sec.querySelectorAll('.stanza'));
    if (stz.length < 2) return null;
    var rest = sec.cloneNode(false);
    rest.removeAttribute('data-newpage');
    rest.classList.add('cont');
    var moved = [];
    while (!fits(frame)) {
      var all = sec.querySelectorAll('.stanza');
      if (all.length <= 1) break;
      moved.unshift(all[all.length - 1]);
      all[all.length - 1].remove();
    }
    if (!fits(frame) || !moved.length) {
      moved.forEach(function (m) { sec.appendChild(m); });
      return null;
    }
    // balance: don't strand a short tail on the next page (aim for at least a quarter of the lines there)
    var lines = function (n) { return n.textContent.split('\n').length; };
    var total = stz.reduce(function (a, n) { return a + lines(n); }, 0);
    var movedLines = moved.reduce(function (a, n) { return a + lines(n); }, 0);
    while (movedLines < total * 0.25) {
      var left = sec.querySelectorAll('.stanza');
      if (left.length <= 2) break;
      var last = left[left.length - 1];
      movedLines += lines(last);
      moved.unshift(last);
      last.remove();
    }
    moved.forEach(function (m) { rest.appendChild(m); });
    return rest;
  }

  // move trailing keep-with-next blocks from the current page onto a new page
  function carryKeeps() {
    var carry = [];
    while (frame.lastElementChild && frame.lastElementChild.hasAttribute('data-keep')) carry.unshift(frame.lastElementChild);
    carry.forEach(function (c) { c.remove(); });
    return carry;
  }

  function trySplit(block) {
    var kind = block.dataset.split;
    if (kind === 'p') return splitParagraph(block);
    if (kind === 'list') return splitList(block);
    if (kind === 'stanzas') return splitStanzas(block);
    return null;
  }
  // put `block` on the current frame, splitting or moving to the next page as needed
  function pour(block, fresh) {
    frame.appendChild(block);
    if (fits(frame)) return;
    var rest = trySplit(block);
    if (rest) {
      newFlowPage(block.dataset.variant);
      pour(rest, true);
      return;
    }
    block.remove();
    if (fresh || !frame.children.length) {
      frame.appendChild(block);
      problems.push('block taller than a page: ' + (block.className || block.tagName) + ' "' + block.textContent.trim().slice(0, 40) + '"');
      return;
    }
    var carry = carryKeeps();
    newFlowPage(block.dataset.variant);
    carry.forEach(function (c) { frame.appendChild(c); });
    pour(block, !carry.length);
  }

  function place(block) {
    if (block.hasAttribute('data-page')) {
      block.removeAttribute('data-page');
      out.appendChild(block);
      if (!block.classList.contains('page--bare')) furnish(block, {});
      pages.push({ page: block, sec: Object.assign({}, curSec), flow: false });
      frame = null;
      var inner = block.querySelector('.frame');
      if (inner && !fits(inner)) problems.push('fixed page overflows: ' + (block.dataset.name || block.className));
      return;
    }
    if (block.dataset.sec) {
      var bits = block.dataset.sec.split('|');
      curSec = { no: bits[0], title: bits[1] || '' };
    }
    var np = block.getAttribute('data-newpage');
    if (frame && np === 'soft' && frame.children.length) {
      // continue on this page when at least ~45% of it is still free
      var last = frame.lastElementChild.getBoundingClientRect();
      var used = last.bottom - frame.getBoundingClientRect().top;
      if (frame.clientHeight - used >= frame.clientHeight * 0.45) {
        block.classList.add('sec--inline');
        pour(block, false);
        return;
      }
    }
    if (!frame || np !== null) newFlowPage(block.dataset.variant);
    pour(block, false);
  }

  function finish() {
    var total = pages.length;
    var secPages = {};
    pages.forEach(function (pg, i) {
      var n = i + 1;
      var page = pg.page;
      var fol = page.querySelector('.folio');
      if (fol) fol.innerHTML = 'Archive ref. ' + meta.ref + ' · <b>p. ' + String(n).padStart(2, '0') + '</b> / ' + String(total).padStart(2, '0');
      var lab = page.querySelector('.sec-label');
      var top = page.querySelector('.frame > :first-child');
      var sec = pg.sec;
      if (top && top.dataset && top.dataset.sec) {
        var tb = top.dataset.sec.split('|');
        sec = { no: tb[0], title: tb[1] || '' };
      }
      if (lab) lab.textContent = sec.no ? sec.no + ' · ' + sec.title : '';
      var co = page.querySelector('.coord');
      if (co) co.textContent = (meta.coords && meta.coords[i % meta.coords.length]) || '';
      // empty frames and frames ending with a keep-with-next block are layout errors
      var f = page.querySelector('.frame.flow');
      if (f) {
        if (!f.children.length) problems.push('empty flow page ' + n);
        if (f.lastElementChild && f.lastElementChild.hasAttribute('data-keep')) problems.push('heading stranded at bottom of page ' + n);
        if (!fits(f)) problems.push('overflow on page ' + n);
      }
      Array.prototype.forEach.call(page.querySelectorAll('[data-anchor]'), function (a) {
        if (!(a.dataset.anchor in secPages)) secPages[a.dataset.anchor] = n;
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-toc]'), function (t) {
      var n = secPages[t.dataset.toc];
      t.textContent = n ? String(n).padStart(2, '0') : '—';
      if (!n) problems.push('contents entry without a page: ' + t.dataset.toc);
    });
    window.__report = { pages: total, problems: problems };
  }

  function run() {
    var blocks = Array.prototype.slice.call(src.children);
    blocks.forEach(function (b) { b.remove(); });
    blocks.forEach(place);
    finish();
    src.remove();
  }

  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () {
    // make sure every face used is actually loaded before measuring
    var faces = ['400 11pt "EB Garamond"', 'italic 400 11pt "EB Garamond"', '500 11pt "EB Garamond"', 'italic 500 11pt "EB Garamond"', '600 11pt "EB Garamond"', '400 8pt "Plex Condensed"', '500 8pt "Plex Condensed"', '600 8pt "Plex Condensed"', '500 13pt "Caveat"'];
    return Promise.all(faces.map(function (f) { return document.fonts.load(f); }));
  }).then(run, function (e) {
    problems.push('font load failed: ' + e);
    run();
  });
})();
