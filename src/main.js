/*
 * Scene manager and the scripted story beats between the games:
 * gate → intro → welcome → check → run → match (+ victory) → report → oya → envelope → letter
 */
(function () {
  'use strict';
  var RFC = window.RFC;
  var fx = RFC.fx;
  var audio = RFC.audio;
  var CFG = window.RFC_CONFIG;

  var ORDER = ['gate', 'intro', 'welcome', 'check', 'run', 'match', 'report', 'oya', 'envelope', 'letter'];
  var TONE = { gate: 'dark', intro: 'dark', welcome: 'paper', check: 'paper', run: 'paper', match: 'dark', report: 'desk', oya: 'cream', envelope: 'cream', letter: 'paper' };
  var STAGE = { check: 'check', run: 'run', match: 'match', report: 'report', oya: 'letter', envelope: 'letter', letter: 'letter' };
  var STAGES = ['check', 'run', 'match', 'report', 'letter'];
  var AMBIENCE = { gate: 0, intro: 0.12, welcome: 0.09, check: 0.07, run: 0.07, match: 0.12, report: 0.05, oya: 0, envelope: 0, letter: 0 };
  var LABEL = {
    welcome: 'the pre-match briefing',
    check: 'the Referee Check',
    run: 'the Four-Day Run',
    match: 'the Final Match',
    report: 'the Referee Report',
    oya: 'the unofficial part',
    envelope: 'the unofficial part',
    letter: 'the letter',
  };

  var app = document.getElementById('app');
  var current = 'gate';
  var busy = false;
  var activeSeq = null;
  var progress = load();

  function $(id) {
    return document.getElementById(id);
  }
  function sceneEl(name) {
    return document.querySelector('.scene[data-scene="' + name + '"]');
  }

  /* ---------- progress (localStorage, optional) ---------- */
  function load() {
    try {
      return JSON.parse(localStorage.getItem(CFG.storageKey)) || {};
    } catch (e) {
      return {};
    }
  }
  function save() {
    try {
      localStorage.setItem(CFG.storageKey, JSON.stringify(progress));
    } catch (e) {}
  }
  function reach(name) {
    var i = ORDER.indexOf(name);
    if (i > (progress.furthest || 0)) {
      progress.furthest = i;
      save();
    }
  }

  /* ---------- scene switching ---------- */
  var pending = null;
  function go(name, opts) {
    if (busy) {
      // a tap that lands mid-transition is queued, not lost
      if (name !== current) pending = [name, opts];
      return Promise.resolve();
    }
    if (name === current) return Promise.resolve();
    busy = true;
    opts = opts || {};
    var from = sceneEl(current);
    var to = sceneEl(name);
    leave(current);
    return transition(opts.transition || 'whistle', function () {
      from.hidden = true;
      from.classList.remove('is-active');
      to.hidden = false;
      to.classList.add('is-active');
      to.scrollTop = 0;
      current = name;
      app.dataset.current = name;
      app.dataset.tone = TONE[name];
      updateStages();
      safely(setup, name);
    }).then(function () {
      reach(name);
      busy = false;
      safely(play, name);
      if (pending) {
        var next = pending;
        pending = null;
        if (next[0] !== current) go(next[0], next[1]);
      }
    });
  }

  function transition(kind, swap) {
    var wipe = $('wipe');
    if (kind === 'whistle' && wipe.animate) {
      audio.whoosh();
      wipe.classList.add('is-running');
      var reduced = fx.reduced();
      var a1 = reduced
        ? wipe.animate([{ opacity: 0, transform: 'none' }, { opacity: 1, transform: 'none' }], { duration: 160, fill: 'forwards' })
        : wipe.animate([{ transform: 'translateX(-102%)' }, { transform: 'translateX(0)' }], { duration: 340 / fx.speed, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' });
      return a1.finished.then(function () {
        swap();
        var a2 = reduced
          ? wipe.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'none' }], { duration: 200, fill: 'forwards' })
          : wipe.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(102%)' }], { duration: 420 / fx.speed, delay: 90 / fx.speed, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' });
        return a2.finished.then(function () {
          wipe.classList.remove('is-running');
          a1.cancel();
          a2.cancel();
        });
      });
    }
    // gentle fade
    swap();
    var to = sceneEl(current);
    if (to.animate && !fx.reduced()) {
      return to.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 520 / fx.speed, easing: 'ease' }).finished.catch(function () {});
    }
    return Promise.resolve();
  }

  function updateStages() {
    app.dataset.showStages = ORDER.indexOf(current) >= ORDER.indexOf('welcome') ? 'true' : 'false';
    var stage = STAGE[current];
    var idx = STAGES.indexOf(stage);
    document.querySelectorAll('#stages li').forEach(function (li, i) {
      li.classList.toggle('is-current', i === idx);
      li.classList.toggle('is-done', idx > -1 && i < idx);
    });
  }

  function focusHeading(scene) {
    var h = scene.querySelector('[tabindex="-1"]');
    if (h) h.focus({ preventScroll: true });
  }

  // Never leave the player stranded on a broken screen.
  function safely(fn, name) {
    try {
      fn(name, sceneEl(name));
    } catch (err) {
      if (window.console) console.error(err);
    }
  }

  // Prepare a scene's DOM while it is still behind the transition, so it is
  // revealed in its starting state and taps during the wipe aren't undone.
  function setup(name, scene) {
    switch (name) {
      case 'intro':
        scene.querySelectorAll('[data-step]').forEach(function (s) {
          s.classList.remove('is-shown');
        });
        break;
      case 'check':
        RFC.puzzles.mountCheck($('check-root'), function () {
          go('run');
        });
        break;
      case 'run':
        RFC.puzzles.mountRun($('run-root'), function () {
          go('match');
        });
        break;
      case 'match':
        $('ov-victory').hidden = true;
        RFC.game.enter();
        break;
      case 'report':
        resetReport();
        break;
      case 'oya':
        scene.querySelectorAll('[data-oya]').forEach(function (n) {
          n.classList.remove('is-shown');
        });
        break;
      case 'envelope':
        resetEnvelope();
        break;
      case 'letter':
        RFC.letter.enter($('letter-root'));
        break;
    }
  }

  // Run the scene's scripted beats once it is on screen.
  function play(name, scene) {
    audio.setAmbience(AMBIENCE[name] || 0, 1.2);
    switch (name) {
      case 'intro':
        runIntro(scene);
        break;
      case 'welcome':
      case 'check':
      case 'run':
      case 'match':
        focusHeading(scene);
        break;
      case 'report':
        runReport(scene);
        break;
      case 'oya':
        runOya(scene);
        break;
      case 'envelope':
        focusHeading(scene);
        fx.focusSoft($('envelope'));
        break;
    }
  }

  function leave(name) {
    if (activeSeq) {
      activeSeq.cancel();
      activeSeq = null;
    }
    var scene = sceneEl(name);
    scene.querySelectorAll('.verdict').forEach(function (v) {
      v.remove();
    });
    if (name === 'match') {
      RFC.game.leave();
      $('ov-victory').hidden = true;
    }
  }

  function seqFor(scene) {
    if (activeSeq) activeSeq.cancel();
    activeSeq = fx.sequence(scene);
    return activeSeq;
  }

  /* ---------- gate ---------- */
  function initGate() {
    var minShow = fx.wait(900);
    var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var cap = fx.wait(2200);
    Promise.all([minShow, Promise.race([fonts, cap])]).then(function () {
      $('gate-loading').hidden = true;
      $('gate-ready').hidden = false;
      var f = progress.furthest || 0;
      if (f >= ORDER.indexOf('welcome')) {
        $('gate-resume').hidden = false;
        $('resume-label').textContent = LABEL[ORDER[f]] || 'the match';
        document.querySelector('.gate__label').textContent = 'Continue';
      }
    });

    $('gate-start').addEventListener('click', function () {
      audio.unlock();
      audio.whistle(0.38);
      var f = progress.furthest || 0;
      go(f >= ORDER.indexOf('welcome') ? ORDER[f] : 'intro');
    });
    $('restart-btn').addEventListener('click', function () {
      audio.unlock();
      audio.whistle(0.38);
      go('intro');
    });
  }

  /* ---------- intro: official match notice ---------- */
  async function runIntro(scene) {
    var steps = scene.querySelectorAll('[data-step]');
    var seq = seqFor(scene);
    var title = $('intro-title');
    await seq.wait(450);
    for (var i = 0; i < steps.length; i++) {
      var s = steps[i];
      s.classList.add('is-shown');
      if (s === title) title.focus({ preventScroll: true });
      if (s.tagName === 'BUTTON') {
        fx.focusSoft(s);
        break;
      }
      var pause = s === title ? 1100 : s.classList.contains('notice__row') ? 600 : s.classList.contains('notice__line') ? 1700 : 500;
      await seq.wait(pause);
    }
    seq.done();
  }

  /* ---------- victory ---------- */
  async function showVictory(result) {
    var ov = $('ov-victory');
    var parts = ov.querySelectorAll('[data-v]');
    parts.forEach(function (p) {
      p.classList.remove('is-shown');
    });
    var home = $('v-home');
    var away = $('v-away');
    var note = $('v-note');
    home.textContent = '00';
    away.textContent = '00';
    note.hidden = true;
    var finalAway = CFG.match.opponentFinalScore;
    var finalHome = CFG.match.targetGoals;
    progress.score = [finalHome, finalAway];
    save();
    reach('report');
    $('report-score').textContent = pad(finalHome) + ' – ' + pad(finalAway);

    // a moment of silence before the whistle
    var seq = seqFor(ov);
    await seq.wait(650);
    ov.hidden = false;
    audio.finalWhistle();
    fx.vibrate([30, 60, 30, 60, 200]);
    $('v-title').focus({ preventScroll: true });
    await seq.wait(1700);
    show(parts[0]); // match complete
    await seq.wait(800);
    show(parts[1]); // board
    await countUp(home, finalHome, seq);
    var actualAway = Math.min(result.away, finalAway);
    await countUp(away, actualAway, seq);
    if (actualAway < finalAway || result.mercy) {
      await seq.wait(500);
      var awarded = finalAway - actualAway;
      note.textContent = result.mercy
        ? 'Match awarded by referee’s mercy. ' + (awarded ? '+' + awarded + ' to the referee’s team for “emotional damages”.' : 'The referee will be complaining about this too.')
        : '+' + awarded + ' awarded to the referee’s team after a highly questionable video review.';
      note.hidden = false;
      if (awarded) {
        audio.buzz();
        away.textContent = pad(finalAway);
      }
    }
    await seq.wait(900);
    show(parts[2]); // winner
    audio.cheer(2.2);
    audio.chime();
    fx.confettiFrom(parts[2], { count: 140, power: 13 });
    fx.announce('Winner: Chooty Bole. ' + finalHome + ' to ' + finalAway + '.');
    await seq.wait(1200);
    show(parts[3]); // trophy
    await seq.wait(700);
    show(parts[4]); // complaint
    await seq.wait(1400);
    show(parts[5]); // button
    fx.focusSoft(parts[5]);
    seq.done();
  }
  function show(n) {
    n.classList.add('is-shown');
  }
  function pad(n) {
    return String(n).padStart(2, '0');
  }
  async function countUp(elm, to, seq) {
    for (var i = 0; i <= to; i++) {
      elm.textContent = pad(i);
      if (i > 0) audio.tap();
      await seq.wait(170);
    }
  }

  // Hold the trophy for a hidden message.
  function initTrophy() {
    var t = $('trophy');
    var start = 0;
    var raf = 0;
    var done = false;
    var HOLD = 1100;
    function tick(now) {
      var p = Math.min(1, (now - start) / HOLD);
      t.style.setProperty('--hold', p.toFixed(3));
      if (p >= 1) {
        stop(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    }
    function begin() {
      if (raf) return;
      start = performance.now();
      t.classList.add('is-holding');
      raf = requestAnimationFrame(tick);
    }
    function stop(complete) {
      cancelAnimationFrame(raf);
      raf = 0;
      t.classList.remove('is-holding');
      t.style.setProperty('--hold', 0);
      if (complete) {
        audio.chime();
        fx.vibrate(30);
        fx.confettiFrom(t, { count: 60, power: 8 });
        fx.toast('Okay fine. You did well. Don’t get used to hearing that.', 4200);
        done = true;
      }
    }
    t.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      try {
        t.setPointerCapture(e.pointerId);
      } catch (err) {}
      begin();
    });
    ['pointerup', 'pointercancel'].forEach(function (ev) {
      t.addEventListener(ev, function () {
        if (raf) {
          stop(false);
          if (!done) fx.toast('It’s an official trophy. You have to hold it properly.', 2200);
        }
      });
    });
    t.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
        e.preventDefault();
        begin();
      }
    });
    t.addEventListener('keyup', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (raf) stop(false);
      }
    });
    t.addEventListener('contextmenu', function (e) {
      e.preventDefault();
    });
  }

  /* ---------- referee report ---------- */
  function resetReport() {
    var report = $('report');
    if (progress.score) $('report-score').textContent = pad(progress.score[0]) + ' – ' + pad(progress.score[1]);
    report.querySelectorAll('[data-obs]').forEach(function (li) {
      li.classList.remove('is-shown');
      li.querySelector('span').textContent = '';
    });
    $('report-unofficial').classList.remove('is-shown');
    $('to-unofficial').classList.add('is-waiting');
    report.classList.remove('is-arriving');
    void report.offsetWidth;
    report.classList.add('is-arriving');
    audio.paper();
  }

  async function runReport(scene) {
    var items = $('report').querySelectorAll('[data-obs]');
    var unofficial = $('report-unofficial');
    var btn = $('to-unofficial');
    $('report-title').focus({ preventScroll: true });
    var seq = seqFor(scene);
    setTimeout(function () {
      audio.stamp();
    }, 300 / fx.speed);
    await seq.wait(1000);
    for (var i = 0; i < items.length; i++) {
      var li = items[i];
      var span = li.querySelector('span');
      li.classList.add('is-shown');
      await seq.wait(160);
      var isLast = i === items.length - 1;
      await seq.type(span, span.dataset.text, isLast ? 26 : 38);
      await seq.wait(isLast ? 1300 : 420);
    }
    unofficial.classList.add('is-shown');
    fx.announce('…but unofficially…');
    audio.setAmbience(0, 2);
    await seq.wait(1800);
    btn.classList.remove('is-waiting');
    fx.focusSoft(btn);
    seq.done();
  }

  /* ---------- oya mala anayak ---------- */
  async function runOya(scene) {
    var items = scene.querySelectorAll('[data-oya]');
    $('oya-title').focus({ preventScroll: true });
    var seq = seqFor(scene);
    var pauses = [1700, 1900, 900, 1200, 0];
    await seq.wait(1300);
    for (var i = 0; i < items.length; i++) {
      items[i].classList.add('is-shown');
      if (items[i].tagName === 'P') fx.announce(items[i].textContent);
      if (items[i].tagName === 'BUTTON') fx.focusSoft(items[i]);
      await seq.wait(pauses[i]);
    }
    seq.done();
  }

  /* ---------- envelope ---------- */
  function resetEnvelope() {
    var env = $('envelope');
    env.classList.remove('is-open');
    env.disabled = false;
    $('env-hint').textContent = 'Tap the envelope to break the seal';
  }
  function initEnvelope() {
    var env = $('envelope');
    var hint = $('env-hint');
    env.addEventListener('click', function () {
      if (env.classList.contains('is-open')) return;
      env.classList.add('is-open');
      env.disabled = true;
      hint.textContent = '…';
      audio.paper();
      setTimeout(function () {
        audio.paper();
      }, 450);
      fx.vibrate(15);
      fx.wait(fx.reduced() ? 500 : 1600).then(function () {
        go('letter', { transition: 'fade' });
      });
    });
  }

  /* ---------- top bar & easter eggs ---------- */
  function initTopbar() {
    var mute = $('mute-btn');
    function paintMute() {
      var m = audio.isMuted();
      mute.setAttribute('aria-pressed', m ? 'true' : 'false');
      mute.setAttribute('aria-label', m ? 'Unmute sound' : 'Mute sound');
    }
    mute.addEventListener('click', function () {
      audio.unlock();
      audio.setMuted(!audio.isMuted());
      paintMute();
      if (!audio.isMuted()) audio.tap();
    });
    paintMute();

    var theme = $('theme-btn');
    var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    function currentTheme() {
      var t = document.documentElement.getAttribute('data-theme');
      return t || (mq && mq.matches ? 'dark' : 'light');
    }
    function paintTheme() {
      var t = currentTheme();
      app.dataset.themeNow = t;
      theme.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', t === 'dark' ? '#0c1424' : '#f7f1e5');
    }
    theme.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try {
        localStorage.setItem('rfc.theme', next);
      } catch (e) {}
      audio.tap();
      paintTheme();
    });
    if (mq && mq.addEventListener) mq.addEventListener('change', paintTheme);
    paintTheme();

    var whistle = $('whistle-btn');
    whistle.addEventListener('click', function () {
      audio.unlock();
      audio.whistle(0.25);
      fx.toast('Stop disturbing official equipment.');
      whistle.classList.remove('is-tooting');
      void whistle.offsetWidth;
      whistle.classList.add('is-tooting');
    });

    $('ref-badge').addEventListener('click', function () {
      audio.stamp();
      fx.toast('Yes, I am extremely qualified. Don’t ask for proof.');
    });

    // three quick taps on the scoreboard
    var taps = [];
    $('scoreboard').addEventListener('click', function () {
      var now = performance.now();
      taps = taps.filter(function (t) {
        return now - t < 1400;
      });
      taps.push(now);
      if (taps.length >= 3) {
        taps = [];
        audio.paper();
        fx.toast('You found the referee’s classified documents.', 3400);
      }
    });
  }

  /* ---------- wiring ---------- */
  function initButtons() {
    $('enter-court').addEventListener('click', function () {
      audio.whistle(0.2);
      go('welcome');
    });
    $('begin-check').addEventListener('click', function () {
      audio.tap();
      go('check');
    });
    $('view-report').addEventListener('click', function () {
      audio.tap();
      go('report', { transition: 'fade' });
    });
    $('to-unofficial').addEventListener('click', function () {
      audio.tap();
      go('oya', { transition: 'fade' });
    });
    $('to-envelope').addEventListener('click', function () {
      audio.tap();
      go('envelope', { transition: 'fade' });
    });
  }

  function boot() {
    app.dataset.current = 'gate';
    app.dataset.tone = 'dark';
    updateStages();
    initTopbar();
    initButtons();
    initTrophy();
    initEnvelope();
    RFC.game.init({ onWin: showVictory });
    RFC.letter.init({
      onReplay: function () {
        go('intro');
      },
    });
    initGate();

    // ?debug&scene=letter jumps straight to a scene (for testing only)
    var p = fx.params;
    if (p.has('debug') && p.get('scene') && ORDER.indexOf(p.get('scene')) > 0) {
      var target = p.get('scene');
      setTimeout(function () {
        go(target, { transition: 'fade' });
      }, 50);
    }
  }

  RFC.main = {
    go: go,
    current: function () {
      return current;
    },
  };

  boot();
})();
