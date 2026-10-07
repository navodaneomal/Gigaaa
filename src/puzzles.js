/*
 * Stage 01 (Referee Check) and Stage 02 (The Four-Day Run).
 * Each puzzle exposes mount(root, onDone) and builds its own markup.
 */
(function () {
  'use strict';
  var RFC = (window.RFC = window.RFC || {});
  var fx = RFC.fx;
  var audio = RFC.audio;
  var CFG = window.RFC_CONFIG;

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function say(box, text, tone) {
    box.classList.remove('is-bad', 'is-good');
    if (tone) box.classList.add('is-' + tone);
    box.querySelector('p').textContent = text;
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  /*
   * Full-screen referee verdict: lines appear one by one, then a stamp,
   * then a button. Resolves when the button is pressed.
   */
  function verdict(host, opts) {
    var wrap = el('div', 'verdict');
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-label', 'Referee verdict');
    var inner = el('div', 'verdict__inner');
    wrap.appendChild(inner);
    host.appendChild(wrap);
    var seq = fx.sequence(wrap);

    return (async function () {
      await seq.wait(350);
      for (var i = 0; i < opts.lines.length; i++) {
        var line = opts.lines[i];
        var p = el('p', 'verdict__line reveal' + (line.big ? ' verdict__line--big' : ''));
        p.textContent = line.text;
        inner.appendChild(p);
        if (i === 0) {
          p.tabIndex = -1;
          p.focus({ preventScroll: true });
        }
        await seq.wait(30);
        p.classList.add('is-shown');
        fx.announce(line.text);
        await seq.wait(line.pause || 1100);
      }
      if (opts.stamp) {
        var s = el('div', 'stamp');
        s.textContent = opts.stamp;
        inner.appendChild(s);
        s.classList.add('is-shown');
        audio.stamp();
        fx.vibrate(20);
        fx.announce(opts.stamp);
        await seq.wait(260);
        fx.confettiFrom(s, { count: 90, power: 11 });
        audio.chime();
        await seq.wait(700);
      }
      if (opts.lesson) {
        var l = el('p', 'verdict__lesson reveal');
        l.textContent = opts.lesson;
        inner.appendChild(l);
        await seq.wait(30);
        l.classList.add('is-shown');
        await seq.wait(900);
      }
      var b = el('button', 'btn btn--gold reveal', fx.escapeHtml(opts.button) + ' ' + fx.svgIcon('i-arrow'));
      b.type = 'button';
      inner.appendChild(b);
      await seq.wait(30);
      b.classList.add('is-shown');
      fx.focusSoft(b);
      seq.done();
      return new Promise(function (res) {
        b.addEventListener('click', function () {
          audio.tap();
          res(wrap);
        });
      });
    })();
  }

  /* =====================================================================
     Stage 01: Referee Check
     ===================================================================== */
  var TRAITS = [
    { id: 'strength', name: 'Strength', desc: 'Keeps going in the last quarter.', ok: true },
    { id: 'determination', name: 'Determination', desc: 'Will not drop it. Literally.', ok: true },
    { id: 'ambition', name: 'Ambition', desc: 'Aims higher than the ring.', ok: true },
    { id: 'calm', name: 'Calmness', desc: 'Steady when the whistle blows.', ok: true },
    { id: 'teamwork', name: 'Teamwork', desc: 'Makes everyone around her better.', ok: true },
    { id: 'courage', name: 'Courage', desc: 'Takes the shot anyway.', ok: true },
    { id: 'quits', name: 'Gives up easily', desc: 'Quits at the first whistle.', ok: false, reject: 'Objection. “Gives up easily”? Have you met yourself?' },
    { id: 'pressure', name: 'Scared of pressure', desc: 'Panics in close games.', ok: false, reject: 'Rejected. Pressure is scared of you.' },
    { id: 'bench', name: 'Bench warmer', desc: 'Prefers the sidelines.', ok: false, reject: 'Bench? You? The referee laughed out loud.' },
    { id: 'average', name: 'Average', desc: 'Nothing to report.', ok: false, reject: 'The referee refuses to even read this card.' },
  ];
  var NEEDED = TRAITS.filter(function (t) {
    return t.ok;
  }).length;

  function mountCheck(root, onDone) {
    root.innerHTML = '';
    var head = el(
      'div',
      'p-head',
      '<p class="eyebrow">Stage 01 · Referee Check</p>' +
        '<h2 class="display" id="check-title" tabindex="-1">Captain profile assessment</h2>' +
        '<p class="lede">Tap (or drag) every trait that belongs on the official captain profile. Leave the suspicious ones out.</p>'
    );
    var profile = el(
      'section',
      'profile',
      '<div class="profile__head"><strong>Captain profile</strong><span>Player: Chooty Bole</span>' +
        '<span class="profile__count" aria-live="polite"><span data-count>0</span> / ' + NEEDED + ' filed</span></div>'
    );
    profile.setAttribute('aria-label', 'Captain profile');
    var slots = el('div', 'slots');
    for (var s = 0; s < NEEDED; s++) slots.appendChild(el('div', 'slot'));
    profile.appendChild(slots);
    var poolLabel = el('p', 'pool-label', 'Evidence submitted to the referee');
    var pool = el('div', 'pool');
    pool.setAttribute('role', 'group');
    pool.setAttribute('aria-label', 'Trait cards');
    var sayBox = el('div', 'ref-says', fx.svgIcon('i-whistle') + '<p>The referee is waiting. Patiently. Ish.</p>');
    sayBox.setAttribute('aria-live', 'polite');
    var actions = el('div', 'p-actions');
    var submit = el('button', 'btn', 'Submit to the referee');
    submit.type = 'button';
    submit.disabled = true;
    actions.appendChild(submit);

    root.appendChild(head);
    root.appendChild(profile);
    root.appendChild(poolLabel);
    root.appendChild(pool);
    root.appendChild(sayBox);
    root.appendChild(actions);

    var order = shuffle(TRAITS.slice());
    // keep at least one decoy in the first four cards so it isn't trivially "top six"
    if (order.slice(0, 4).every(function (t) { return t.ok; })) order.reverse();
    var cards = order.map(function (t, i) {
      var b = el(
        'button',
        'trait',
        '<span class="trait__code">TR-' + String(i + 1).padStart(2, '0') + '</span>' +
          '<span class="trait__name">' + fx.escapeHtml(t.name) + '</span>' +
          '<span class="trait__desc">' + fx.escapeHtml(t.desc) + '</span>'
      );
      b.type = 'button';
      b.dataset.id = t.id;
      b.dataset.order = i;
      b.setAttribute('aria-pressed', 'false');
      b._trait = t;
      pool.appendChild(b);
      return b;
    });

    var busy = false;
    var countEl = profile.querySelector('[data-count]');

    function placed() {
      return cards.filter(function (c) {
        return c.parentNode && c.parentNode.classList.contains('slot');
      });
    }
    function refresh() {
      var n = placed().length;
      countEl.textContent = n;
      submit.disabled = n === 0 || busy;
    }
    function toProfile(card) {
      var slot = Array.prototype.find.call(slots.children, function (sl) {
        return !sl.firstElementChild;
      });
      if (!slot) {
        say(sayBox, 'The profile is full. Take something out first. (Tap a card to send it back.)', 'bad');
        fx.vibrate(30);
        return false;
      }
      var first = card.getBoundingClientRect();
      slot.appendChild(card);
      card.classList.add('is-placed');
      card.setAttribute('aria-pressed', 'true');
      fx.flip(card, first);
      audio.tap();
      return true;
    }
    function toPool(card) {
      var first = card.getBoundingClientRect();
      var ord = +card.dataset.order;
      var before = Array.prototype.find.call(pool.children, function (c) {
        return +c.dataset.order > ord;
      });
      pool.insertBefore(card, before || null);
      card.classList.remove('is-placed');
      card.setAttribute('aria-pressed', 'false');
      // compact the profile so there are no gaps
      var kids = Array.prototype.slice.call(slots.children);
      var filled = kids
        .map(function (sl) {
          return sl.firstElementChild;
        })
        .filter(Boolean);
      kids.forEach(function (sl, i) {
        if (filled[i] && filled[i].parentNode !== sl) sl.appendChild(filled[i]);
      });
      fx.flip(card, first);
      audio.tap();
    }
    function toggle(card) {
      if (busy) return;
      if (card.classList.contains('is-placed')) toPool(card);
      else toProfile(card);
      refresh();
    }

    /* Tap, or drag (mouse immediately, touch after a short press so scrolling still works). */
    cards.forEach(function (card) {
      var st = null;
      card.addEventListener('pointerdown', function (e) {
        if (busy || (e.pointerType === 'mouse' && e.button !== 0)) return;
        st = { id: e.pointerId, x: e.clientX, y: e.clientY, type: e.pointerType, drag: false, armed: e.pointerType !== 'touch', ghost: null, moved: false };
        if (e.pointerType === 'touch') {
          st.timer = setTimeout(function () {
            if (st && !st.moved) {
              st.armed = true;
              fx.vibrate(12);
              startDrag(e.clientX, e.clientY);
            }
          }, 260);
        }
      });
      card.addEventListener('pointermove', function (e) {
        if (!st || e.pointerId !== st.id) return;
        var dx = e.clientX - st.x;
        var dy = e.clientY - st.y;
        if (!st.drag) {
          if (Math.hypot(dx, dy) > 8) {
            st.moved = true;
            if (st.armed) startDrag(e.clientX, e.clientY);
            else clearTimeout(st.timer);
          }
          return;
        }
        moveGhost(e.clientX, e.clientY);
      });
      function startDrag(x, y) {
        if (!st || st.drag) return;
        st.drag = true;
        try {
          card.setPointerCapture(st.id);
        } catch (err) {}
        var r = card.getBoundingClientRect();
        st.offX = x - r.left;
        st.offY = y - r.top;
        var g = card.cloneNode(true);
        g.classList.add('trait-ghost');
        g.removeAttribute('id');
        g.setAttribute('aria-hidden', 'true');
        g.style.width = r.width + 'px';
        g.style.height = r.height + 'px';
        document.body.appendChild(g);
        st.ghost = g;
        card.classList.add('is-drag-src');
        document.addEventListener('touchmove', blockScroll, { passive: false });
        moveGhost(x, y);
      }
      function moveGhost(x, y) {
        st.ghost.style.left = x - st.offX + 'px';
        st.ghost.style.top = y - st.offY + 'px';
        var pr = profile.getBoundingClientRect();
        profile.classList.toggle('is-target', x >= pr.left && x <= pr.right && y >= pr.top && y <= pr.bottom);
      }
      function end(e, cancelled) {
        if (!st || (e && e.pointerId !== st.id)) return;
        clearTimeout(st.timer);
        document.removeEventListener('touchmove', blockScroll);
        if (st.drag) {
          var overProfile = profile.classList.contains('is-target');
          profile.classList.remove('is-target');
          if (st.ghost) st.ghost.remove();
          card.classList.remove('is-drag-src');
          if (!cancelled) {
            var inProfile = card.classList.contains('is-placed');
            if (overProfile && !inProfile) toProfile(card);
            else if (!overProfile && inProfile) toPool(card);
            refresh();
          }
          card._suppressClick = true;
          setTimeout(function () {
            card._suppressClick = false;
          }, 50);
        }
        st = null;
      }
      card.addEventListener('pointerup', function (e) {
        end(e, false);
      });
      card.addEventListener('pointercancel', function (e) {
        end(e, true);
      });
      card.addEventListener('click', function () {
        if (card._suppressClick) return;
        toggle(card);
      });
      card.addEventListener('contextmenu', function (e) {
        e.preventDefault();
      });
    });
    function blockScroll(e) {
      e.preventDefault();
    }

    submit.addEventListener('click', async function () {
      if (busy) return;
      busy = true;
      refresh();
      audio.whistle(0.18);
      var list = placed();
      var wrong = list.filter(function (c) {
        return !c._trait.ok;
      });
      if (wrong.length) {
        for (var i = 0; i < wrong.length; i++) {
          var c = wrong[i];
          c.classList.add('is-rejected');
          say(sayBox, c._trait.reject, 'bad');
          audio.buzz();
          fx.vibrate(40);
          await fx.wait(1500);
          c.classList.remove('is-rejected');
          toPool(c);
        }
      }
      var good = placed().length;
      busy = false;
      if (good === NEEDED) return finish();
      if (wrong.length) {
        await fx.wait(250);
        say(sayBox, 'Suspicious evidence removed. ' + (NEEDED - good) + ' real trait' + (NEEDED - good === 1 ? ' is' : 's are') + ' still missing.', 'bad');
      } else {
        say(sayBox, 'So far, so good… but the referee counted. ' + (NEEDED - good) + ' trait' + (NEEDED - good === 1 ? ' is' : 's are') + ' still missing.', null);
      }
      refresh();
    });

    function finish() {
      busy = true;
      refresh();
      cards.forEach(function (c) {
        c.classList.add('is-locked');
        c.disabled = true;
      });
      say(sayBox, 'All six. The referee is reviewing the evidence…', 'good');
      setTimeout(function () {
        verdict(root.closest('.scene'), {
          lines: [
            { text: 'Hmm.', pause: 1000 },
            { text: 'Suspicious.', pause: 1100 },
            { text: 'Unfortunately, you’re showing signs of being annoyingly capable.', pause: 1500 },
          ],
          stamp: 'Referee verdict: Qualified',
          button: 'Next check',
        }).then(onDone);
      }, 700);
    }

    refresh();
  }

  /* =====================================================================
     Stage 02: The Four-Day Run
     ===================================================================== */
  var DAYS = [
    { n: '01', scene: 'Opening match. Nerves everywhere.' },
    { n: '02', scene: 'Back-to-back games. Legs filing complaints.' },
    { n: '03', scene: 'The toughest opponent. Everyone is tired.' },
    { n: '04', scene: 'Finals day. Whatever is left in the tank.' },
  ];
  var ORDER = ['push', 'attack', 'defend', 'recover'];
  var LINES = {
    push: ['All in. The referee winced on your legs’ behalf.', 'Full send. Somewhere, a physio sighed.', 'Everything you had, and then a bit more.', 'Absolutely no chill. Respect.'],
    attack: ['Sharp, aggressive, slightly terrifying.', 'You went looking for the ball. The ball was scared.', 'Fast break after fast break.', 'Pressure, pressure, pressure.'],
    defend: ['Solid. Nothing got past you.', 'Held the line. Quietly brilliant.', 'Patient. Smart. Annoying for the other team.', 'Calm hands, safe passes.'],
    recover: ['Ice packs, water, an early night. Smart.', 'Stretch, eat, sleep. Proper sleep.', 'Recharged. The referee approves.', 'Breathed. Reset. Ready.'],
  };

  function fxBadge(kind, n) {
    var sign = n > 0 ? '+' : n < 0 ? '−' : '±';
    var icon = kind === 'energy' ? 'i-bolt' : 'i-up';
    var neg = kind === 'energy' && n < 0 ? ' is-neg' : '';
    var label = (kind === 'energy' ? 'energy ' : 'momentum ') + sign + Math.abs(n);
    return '<span class="fx fx--' + (kind === 'energy' ? 'energy' : 'mom') + neg + '" aria-label="' + label + '">' + fx.svgIcon(icon, '') + sign + Math.abs(n) + '</span>';
  }

  function project(plan) {
    var R = CFG.fourDay;
    var e = R.startEnergy;
    var m = 0;
    var energies = [e];
    var failDay = -1;
    var wasted = [];
    for (var d = 0; d < 4; d++) {
      var k = plan[d];
      if (!k) {
        energies.push(null);
        continue;
      }
      var a = R.actions[k];
      e += a.energy;
      if (e > R.maxEnergy) {
        wasted[d] = e - R.maxEnergy;
        e = R.maxEnergy;
      }
      m += a.momentum;
      energies.push(e);
      if (e < 0 && failDay < 0) failDay = d;
    }
    return { energies: energies, momentum: m, failDay: failDay, wasted: wasted };
  }

  function mountRun(root, onDone) {
    var R = CFG.fourDay;
    root.innerHTML = '';
    var plan = [null, null, null, null];
    var busy = false;
    var attempts = 0;

    root.appendChild(
      el(
        'div',
        'p-head',
        '<p class="eyebrow">Stage 02 · The Four-Day Run</p>' +
          '<h2 class="display" id="run-title" tabindex="-1">Plan your four days</h2>' +
          '<p class="lede">You start with <strong>' + R.startEnergy + ' energy</strong> (max ' + R.maxEnergy + '). Choose one move for each day. ' +
          'Build <strong>' + R.targetMomentum + ' momentum</strong> by the end of Day 04 without running out of energy.</p>'
      )
    );

    var days = el('div', 'days');
    var dayEls = DAYS.map(function (d, i) {
      var fs = el('fieldset', 'day');
      var legend = el('legend', '', '<span><span class="day__num">DAY ' + d.n + '</span></span><span class="day__energy" data-energy></span>');
      fs.appendChild(legend);
      fs.appendChild(el('p', 'day__scene', fx.escapeHtml(d.scene)));
      var choices = el('div', 'choices');
      ORDER.forEach(function (k) {
        var a = R.actions[k];
        var lab = el('label', 'choice');
        lab.innerHTML =
          '<input type="radio" name="day-' + i + '" value="' + k + '">' +
          '<span class="choice__box"><span class="choice__label">' + a.label + '</span>' +
          '<span class="fx-row">' + fxBadge('energy', a.energy) + (a.momentum ? fxBadge('mom', a.momentum) : '') + '</span></span>';
        choices.appendChild(lab);
      });
      fs.appendChild(choices);
      fs.addEventListener('change', function (e) {
        if (busy) return;
        plan[i] = e.target.value;
        audio.tap();
        update();
      });
      days.appendChild(fs);
      return fs;
    });
    root.appendChild(days);

    var meters = el(
      'div',
      'run-meters',
      '<div><div class="meter__label"><span>Momentum</span><b data-mom>0 / ' + R.targetMomentum + '</b></div>' +
        '<div class="mom-bar"><span class="mom-bar__fill"></span><span class="mom-bar__target"></span></div></div>' +
        '<div><div class="meter__label"><span>Energy, day by day</span><b data-eng></b></div><div class="energy-track"></div></div>'
    );
    meters.style.position = 'sticky';
    meters.style.bottom = '10px';
    meters.style.zIndex = '2';
    var track = meters.querySelector('.energy-track');
    var cols = ['Start', 'D1', 'D2', 'D3', 'D4'].map(function (label) {
      var c = el('div', 'et-col');
      var cells = el('div', 'et-cells');
      for (var j = 0; j < R.maxEnergy; j++) cells.appendChild(document.createElement('i'));
      c.appendChild(cells);
      c.appendChild(document.createTextNode(label));
      track.appendChild(c);
      return c;
    });
    var maxMom = 12;
    meters.querySelector('.mom-bar__target').style.left = (R.targetMomentum / maxMom) * 100 + '%';

    var sayBox = el('div', 'ref-says', fx.svgIcon('i-whistle') + '<p>Four days. Limited energy. Choose wisely… or at least entertainingly.</p>');
    sayBox.setAttribute('aria-live', 'polite');
    var log = el('ol', 'run-log');
    log.setAttribute('aria-label', 'How the four days went');
    var actions = el('div', 'p-actions');
    var play = el('button', 'btn', 'Play the four days');
    play.type = 'button';
    var clear = el('button', 'btn-link', 'Clear the plan');
    clear.type = 'button';
    actions.appendChild(play);
    actions.appendChild(clear);

    root.appendChild(sayBox);
    root.appendChild(log);
    root.appendChild(actions);
    root.appendChild(meters);

    function paintMeters(p, upto) {
      // upto: how many days to reveal (4 = all). Used during the playback.
      var mom = 0;
      for (var d = 0; d < 4; d++) {
        if (d < upto && plan[d]) mom += R.actions[plan[d]].momentum;
      }
      meters.querySelector('[data-mom]').textContent = mom + ' / ' + R.targetMomentum;
      meters.querySelector('.mom-bar__fill').style.width = Math.min(100, (mom / maxMom) * 100) + '%';
      var engText = '';
      cols.forEach(function (c, idx) {
        var v = idx === 0 ? p.energies[0] : idx <= upto ? p.energies[idx] : null;
        var cells = c.querySelectorAll('i');
        c.classList.toggle('is-out', v != null && v < 0);
        c.classList.toggle('is-low', v != null && v >= 0 && v <= 1);
        for (var j = 0; j < cells.length; j++) cells[j].classList.toggle('on', v != null && j < v);
        if (v != null) engText = v < 0 ? 'Out of energy' : v + ' left';
      });
      meters.querySelector('[data-eng]').textContent = engText;
    }

    function update() {
      var p = project(plan);
      dayEls.forEach(function (fs, i) {
        var v = p.energies[i + 1];
        fs.querySelector('[data-energy]').textContent = v == null ? '' : v < 0 ? 'Energy: out' : 'Energy after: ' + v;
        fs.classList.remove('is-fail', 'is-ok');
      });
      paintMeters(p, 4);
      play.disabled = plan.some(function (k) {
        return !k;
      });
    }

    clear.addEventListener('click', function () {
      if (busy) return;
      plan = [null, null, null, null];
      root.querySelectorAll('input[type=radio]').forEach(function (r) {
        r.checked = false;
      });
      log.innerHTML = '';
      say(sayBox, 'Fresh plan. Fresh legs. Imaginary ones, anyway.', null);
      update();
    });

    function lock(on) {
      busy = on;
      root.querySelectorAll('input[type=radio]').forEach(function (r) {
        r.disabled = on;
      });
      play.disabled = on;
      clear.disabled = on;
    }

    play.addEventListener('click', async function () {
      if (busy || play.disabled) return;
      attempts++;
      lock(true);
      log.innerHTML = '';
      audio.whistle(0.2);
      say(sayBox, 'And they’re off…', null);
      var p = project(plan);
      paintMeters(p, 0);
      for (var d = 0; d < 4; d++) {
        var fs = dayEls[d];
        fs.classList.add('is-playing');
        if (fs.scrollIntoView && !fx.reduced()) fs.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        await fx.wait(650);
        paintMeters(p, d + 1);
        var k = plan[d];
        var text;
        if (d === p.failDay) {
          text = 'Out of energy. The referee had to call an imaginary stretcher.';
        } else if (k === 'recover' && p.wasted[d]) {
          text = 'Recovered on an almost full tank. Bold use of a rest day.';
        } else {
          text = LINES[k][d];
        }
        var li = el('li', '', '<b>Day ' + DAYS[d].n + ' · ' + R.actions[k].label + '.</b> ' + fx.escapeHtml(text));
        log.appendChild(li);
        fs.classList.remove('is-playing');
        if (d === p.failDay) {
          fs.classList.add('is-fail');
          audio.buzz();
          fx.vibrate(60);
          break;
        }
        fs.classList.add('is-ok');
        audio.bounce(0.18);
        await fx.wait(450);
      }

      if (p.failDay >= 0) {
        var hint = p.wasted[0] || p.wasted[1]
          ? 'Recovering while you’re still fresh doesn’t help much. It’s all about when.'
          : 'Even the strongest players recover. It’s all about when.';
        say(sayBox, 'Day ' + DAYS[p.failDay].n + ': out of energy. ' + hint, 'bad');
        lock(false);
        update();
        return;
      }
      if (p.momentum < R.targetMomentum) {
        say(
          sayBox,
          'You survived… but the referee fell asleep somewhere around Day 03. ' + p.momentum + ' momentum. Push a little harder.' +
            (attempts > 1 ? ' (Hint: one well-timed recovery buys you a big push.)' : ''),
          'bad'
        );
        lock(false);
        update();
        return;
      }

      say(sayBox, 'Four days. ' + p.momentum + ' momentum. Still standing.', 'good');
      await fx.wait(700);
      verdict(root.closest('.scene'), {
        lines: [
          { text: 'Interesting.', big: true, pause: 1100 },
          { text: 'You survived four imaginary days.', pause: 1300 },
          { text: 'The referee is becoming concerned.', pause: 1200 },
        ],
        lesson: 'Strength isn’t only about pushing harder. Sometimes it’s knowing when to breathe, so you can keep going.',
        button: 'Final match',
      }).then(onDone);
    });

    update();
  }

  RFC.puzzles = {
    mountCheck: mountCheck,
    mountRun: mountRun,
    _project: project,
  };
})();
