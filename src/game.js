/*
 * The Final Match: a small arcade netball game drawn on a canvas.
 *
 * You play GS (Goal Shooter) in the attacking third. Your Centre (C) has
 * the ball, and the referee's Goal Defence (GD) is marking you.
 *   1. Move to get free of the defender (she reacts a little late).
 *   2. PASS to call for the ball. Netball rules: no running with it.
 *   3. Inside the shooting circle, hold SHOOT and release in the green zone.
 *
 * World units are metres. The origin is the middle of the goal line and
 * +y runs from the goal line out into the court (down the screen).
 */
(function () {
  'use strict';
  var RFC = (window.RFC = window.RFC || {});
  var CFG = window.RFC_CONFIG;
  var fx = RFC.fx;
  var audio = RFC.audio;

  var HALF_W = 7.625; // half court width
  var THIRD = 10.17; // depth of the attacking third
  var CIRCLE_R = 4.9; // shooting circle radius
  var RING = { x: 0, y: 0.38, z: 3.05 };
  var Y_K = 0.92; // ground foreshortening
  var Z_K = 0.6; // screen lift per metre of height
  var VIEW_TOP = -3.3; // room above the goal line for the post (and the referee's commentary)
  var VIEW_BOTTOM = THIRD * Y_K + 0.95;
  var MIN_HALF_VIEW = 6.1;
  var MATE_Y = 9.3;
  var P_R = 0.42;
  var BALL_R = 0.16;

  var COLORS = {
    outside: '#0a1222',
    floor: '#2a5546',
    floor2: '#214539',
    line: 'rgba(240, 232, 214, 0.86)',
    circle: 'rgba(220, 190, 120, 0.08)',
    me: '#f6efe2',
    meRing: '#c39a45',
    them: '#1a2742',
    themRing: '#d39c94',
    mate: '#2f6b52',
    open: '#7cc9a2',
    covered: '#e3b55f',
    ink: '#13213a',
  };

  var MISS_LINES = [
    'The ring has clearly been bribed.',
    'Unlucky. The referee is trying very hard not to smile.',
    'So close the net felt it.',
    'The ring is being dramatic. Go again.',
  ];
  var GOAL_LINES = [
    'That looked suspiciously professional.',
    'Referee is pretending not to be impressed.',
    'Okay… okay… calm down.',
    'WHO GAVE HER THIS MUCH SKILL?',
  ];

  /* ------------------------------------------------------------------ */
  var dom = {};
  var opts = {};
  var ctx = null;
  var view = { w: 0, h: 0, dpr: 1, s: 30, ox: 0, oy: 0, halfView: HALF_W, camX: 0 };
  var raf = 0;
  var lastT = 0;
  var active = false;
  var coarse = window.matchMedia ? window.matchMedia('(any-pointer: coarse)').matches : true;

  var S = null; // game state

  function freshState() {
    return {
      phase: 'ready', // ready | play | celebrate | turnover | dead | timeup | paused | won
      prevPhase: null,
      time: CFG.match.seconds,
      home: 0,
      away: 0,
      extra: 0,
      clock: 0, // real seconds since start (for animation)
      phaseT: 0,
      p: { x: 0, y: 7.2, vx: 0, vy: 0, hold: 0, footwork: false },
      d: { x: 0, y: 8.2, vx: 0, vy: 0, arms: false },
      m: { x: 0, y: MATE_Y, base: 0 },
      ball: { owner: 'mate', x: 0, y: MATE_Y, z: 1.4 },
      flight: null,
      charging: false,
      chargeT: 0,
      power: 0,
      history: [],
      input: { x: 0, y: 0 },
      keys: {},
      joy: { x: 0, y: 0 },
      open: false,
      everCaught: false,
      coveredWarned: 0,
      shake: 0,
      ripple: 0,
      banner: null,
      said: {},
      lastCommentAt: -1e9,
      missIdx: 0,
      hint: '',
      firstOpenAt: 0,
    };
  }

  /* ---------- helpers ---------- */
  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }
  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function rand(a, b) {
    return a + Math.random() * (b - a);
  }
  function inCircle(pt) {
    return Math.hypot(pt.x, pt.y) <= CIRCLE_R - 0.05;
  }
  // How far defender c is from the passing lane a→b. A defender level with
  // or behind the receiver (or behind the passer) can't cut the pass out.
  function laneGap(a, b, c) {
    var abx = b.x - a.x;
    var aby = b.y - a.y;
    var len2 = abx * abx + aby * aby || 1;
    var t = ((c.x - a.x) * abx + (c.y - a.y) * aby) / len2;
    if (t < 0 || t > 0.95) return Infinity;
    return Math.hypot(a.x + abx * t - c.x, a.y + aby * t - c.y);
  }
  function eased(key) {
    var e = CFG.easingPerExtraTime[key] || 0;
    return e * S.extra;
  }

  /* ---------- screen mapping ---------- */
  function sx(x) {
    return view.ox + (x - view.camX) * view.s;
  }
  function sy(y, z) {
    return view.oy + (y * Y_K - (z || 0) * Z_K - VIEW_TOP) * view.s;
  }

  function resize() {
    var r = dom.wrap.getBoundingClientRect();
    var w = Math.max(1, Math.round(r.width));
    var h = Math.max(1, Math.round(r.height));
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.w = w;
    view.h = h;
    view.dpr = dpr;
    dom.canvas.width = Math.round(w * dpr);
    dom.canvas.height = Math.round(h * dpr);
    var hu = VIEW_BOTTOM - VIEW_TOP;
    var s = Math.min(h / hu, w / (MIN_HALF_VIEW * 2 + 0.4));
    view.s = s;
    view.halfView = w / s / 2;
    // spare height goes mostly above the court, where the commentary appears
    view.oy = Math.max(0, (h - hu * s) * 0.8);
    view.ox = w / 2;
    draw();
  }

  /* ---------- commentary & hints ---------- */
  var commentTimer = 0;
  function comment(text, o) {
    o = o || {};
    if (o.key) {
      if (S.said[o.key]) return false;
    }
    var now = performance.now();
    if (!o.force && now - S.lastCommentAt < 3200) return false;
    if (o.key) S.said[o.key] = true;
    S.lastCommentAt = now;
    dom.comment.textContent = text;
    dom.comment.classList.add('is-shown');
    clearTimeout(commentTimer);
    commentTimer = setTimeout(function () {
      dom.comment.classList.remove('is-shown');
    }, o.ms || 2600);
    return true;
  }

  function keyName(touchLabel, key) {
    return coarse ? touchLabel : touchLabel + ' (' + key + ')';
  }

  function setHint() {
    var h = '';
    if (S.phase === 'play') {
      if (S.ball.owner === 'mate' && !S.flight) {
        if (!S.everCaught) h = S.open ? 'You’re free. ' + keyName('Tap PASS', 'E') + ' to call for the ball!' : 'Lose your defender, then ' + keyName('tap PASS', 'E') + ' to call for the ball.';
      } else if (S.ball.owner === 'player') {
        if (!inCircle(S.p)) h = 'Outside the circle. ' + keyName('PASS', 'E') + ' it back, then lead into the circle.';
        else if (S.charging) h = 'Let go in the green!';
        else if (S.home < 2) h = 'Hold ' + keyName('SHOOT', 'Space') + ', release in the green.';
      }
    }
    if (h !== S.hint) {
      S.hint = h;
      dom.hint.textContent = h;
    }
  }

  function updateButtons() {
    var owner = S.ball.owner;
    var canShoot = S.phase === 'play' && owner === 'player' && inCircle(S.p);
    var canPass = S.phase === 'play' && !S.flight && (owner === 'player' || owner === 'mate');
    dom.shoot.classList.toggle('is-ready', canShoot && !S.charging);
    dom.shoot.classList.toggle('is-dim', S.phase === 'play' && owner === 'player' && !inCircle(S.p));
    dom.shoot.classList.toggle('is-charging', S.charging);
    dom.pass.classList.toggle('is-ready', canPass && owner === 'mate' && S.open);
    dom.pass.classList.toggle('is-dim', !canPass);
    dom.shoot.style.setProperty('--charge', S.charging ? S.power.toFixed(3) : 0);
  }

  function renderScore() {
    dom.home.textContent = String(S.home).padStart(2, '0');
    dom.away.textContent = String(S.away).padStart(2, '0');
  }
  function flash(elm) {
    elm.classList.remove('is-flash');
    void elm.offsetWidth;
    elm.classList.add('is-flash');
  }
  var lastClockText = '';
  function renderClock() {
    var t = Math.max(0, Math.ceil(S.time));
    var txt = Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
    if (txt !== lastClockText) {
      lastClockText = txt;
      dom.clock.textContent = txt;
      dom.clock.classList.toggle('is-low', t <= 10 && S.phase !== 'won');
    }
  }

  /* ---------- flow ---------- */
  function setPhase(p) {
    S.phase = p;
    S.phaseT = 0;
  }

  function resetPlay() {
    var px = rand(-3.4, 3.4);
    S.p.x = px;
    S.p.y = rand(6.7, 7.9);
    S.p.vx = S.p.vy = 0;
    S.p.hold = 0;
    S.p.footwork = false;
    S.m.base = clamp(-px * 0.6 + rand(-1.5, 1.5), -4, 4);
    S.m.x = S.m.base;
    S.d.x = S.p.x + (S.m.x - S.p.x) * 0.35;
    S.d.y = S.p.y + 0.95;
    S.d.vx = S.d.vy = 0;
    S.ball.owner = 'mate';
    S.flight = null;
    S.charging = false;
    S.history.length = 0;
    setPhase('play');
  }

  function pass() {
    if (S.phase !== 'play' || S.flight) return;
    if (S.ball.owner === 'player') {
      // pass back to C, who drifts to a new spot
      S.charging = false;
      S.ball.owner = null;
      S.m.base = clamp(S.p.x * -0.5 + rand(-1.6, 1.6), -4.2, 4.2);
      launch('passback', S.p, 1.5, function () {
        return { x: S.m.x, y: S.m.y, z: 1.4 };
      });
      audio.bounce(0.14);
      return;
    }
    if (S.ball.owner !== 'mate') return;
    if (!S.open) {
      if (S.coveredWarned < 1) {
        S.coveredWarned++;
        comment('You’re marked. Lose your defender first, then call for it.', { force: true });
        audio.buzz();
        return;
      }
      if (Math.random() < Math.max(0.05, CFG.pass.interceptChance + eased('interceptChance'))) {
        S.ball.owner = null;
        launch('intercept', S.m, 1.4, function () {
          return { x: S.d.x, y: S.d.y, z: 1.6 };
        });
        audio.bounce(0.14);
        return;
      }
      comment('Risky pass… but it got through. The referee saw that.', { key: 'lucky' });
    }
    S.ball.owner = null;
    launch('pass', S.m, 1.4, function () {
      return { x: S.p.x, y: S.p.y, z: 1.5 };
    });
    audio.bounce(0.14);
  }

  function launch(type, from, z0, target, extra) {
    var t0 = target();
    var d = Math.hypot(t0.x - from.x, t0.y - from.y);
    var f = {
      type: type,
      from: { x: from.x, y: from.y, z: z0 },
      target: target,
      t: 0,
      dur: Math.max(0.28, d / CFG.pass.speed),
      arc: 0.35 + d * 0.05,
    };
    if (extra) for (var k in extra) f[k] = extra[k];
    S.flight = f;
  }

  function shootDown() {
    if (S.phase !== 'play') return;
    if (S.ball.owner === 'mate') return pass(); // forgiving: SHOOT without the ball calls for it
    if (S.ball.owner !== 'player' || S.charging) return;
    if (!inCircle(S.p)) {
      comment('Shots only count from inside the circle. That one’s an actual rule.', { force: true, ms: 2800 });
      audio.buzz();
      return;
    }
    S.charging = true;
    S.chargeT = 0;
    S.power = 0;
  }

  function shootUp() {
    if (!S.charging) return;
    S.charging = false;
    if (S.phase !== 'play' || S.ball.owner !== 'player') return;
    shoot(S.power);
  }

  function zoneFor(pt) {
    var d = Math.hypot(pt.x - RING.x, pt.y - RING.y);
    var target = 0.3 + 0.58 * clamp(d / CIRCLE_R, 0, 1);
    var half = CFG.shot.zoneHalfWidth + eased('zoneHalfWidth');
    var dd = dist(S.d, S.p);
    var toRing = { x: RING.x - S.p.x, y: RING.y - S.p.y };
    var toDef = { x: S.d.x - S.p.x, y: S.d.y - S.p.y };
    var pressured = dd < 1.4 && toRing.x * toDef.x + toRing.y * toDef.y > 0;
    if (pressured) half -= CFG.shot.defenderPressure;
    if (d < 1.8) half += 0.03;
    half = clamp(half, 0.06, 0.32);
    return { center: target, half: half, d: d, pressured: pressured };
  }

  function shoot(power) {
    var z = zoneFor(S.p);
    var err = Math.abs(power - z.center);
    var result = err <= z.half ? 'goal' : err <= z.half + CFG.shot.nearMiss ? 'rim' : power < z.center ? 'short' : 'long';
    var to;
    if (result === 'goal') to = { x: RING.x, y: RING.y, z: RING.z + 0.05 };
    else if (result === 'rim') to = { x: RING.x + (Math.random() < 0.5 ? -0.26 : 0.26), y: RING.y + 0.05, z: RING.z + 0.05 };
    else if (result === 'short') to = { x: S.p.x + (RING.x - S.p.x) * 0.72, y: S.p.y + (RING.y - S.p.y) * 0.72, z: 0.15 };
    else to = { x: RING.x + rand(-0.7, 0.7), y: -0.9, z: 0.1 };
    S.ball.owner = null;
    S.flight = {
      type: 'shot',
      result: result,
      longShot: z.d > 3.8,
      from: { x: S.p.x, y: S.p.y, z: 2.1 },
      target: function () {
        return to;
      },
      t: 0,
      dur: 0.6 + z.d * 0.07,
      arc: 1.0 + z.d * 0.24,
    };
    audio.whoosh();
  }

  function onLand(f) {
    var b = S.ball;
    switch (f.type) {
      case 'pass':
        b.owner = 'player';
        S.p.hold = 0;
        S.p.footwork = false;
        if (!S.everCaught) {
          S.everCaught = true;
        }
        audio.bounce(0.22);
        break;
      case 'passback':
        b.owner = 'mate';
        audio.bounce(0.16);
        break;
      case 'intercept':
        b.owner = 'def';
        turnover('INTERCEPTED');
        break;
      case 'shot':
        if (f.result === 'goal') {
          goal(f);
        } else if (f.result === 'rim') {
          audio.rim();
          var side = b.x < RING.x ? -1 : 1;
          S.flight = {
            type: 'loose',
            from: { x: b.x, y: b.y, z: b.z },
            target: (function (to) {
              return function () {
                return to;
              };
            })({ x: RING.x + side * rand(1.2, 2.4), y: rand(1.2, 2.6), z: 0.12 }),
            t: 0,
            dur: 0.55,
            arc: 0.8,
          };
          missed();
          return;
        } else {
          audio.bounce(0.2);
          missed();
          S.flight = null;
          setPhase('dead');
        }
        break;
      case 'loose':
        audio.bounce(0.2);
        setPhase('dead');
        break;
      case 'drop':
        audio.bounce(0.18);
        break;
    }
  }

  function missed() {
    var line = MISS_LINES[S.missIdx % MISS_LINES.length];
    if (comment(line)) S.missIdx++;
  }

  function goal(f) {
    S.home++;
    renderScore();
    flash(dom.home);
    S.ripple = 1;
    S.shake = fx.reduced() ? 0 : 0.35;
    S.banner = { text: 'GOAL', t: 0 };
    audio.swish();
    audio.cheer(1.5);
    fx.vibrate(25);
    // confetti from the ring's on-screen position
    var r = dom.canvas.getBoundingClientRect();
    fx.confetti(r.left + sx(RING.x), r.top + sy(RING.y, RING.z), { count: 55, power: 7 });
    // ball drops through the net
    S.flight = {
      type: 'drop',
      from: { x: RING.x, y: RING.y, z: RING.z },
      target: function () {
        return { x: RING.x, y: RING.y + 0.15, z: 0.12 };
      },
      t: 0,
      dur: 0.42,
      arc: 0,
    };
    fx.announce('Goal! ' + S.home + ' to ' + S.away + '.');
    var target = CFG.match.targetGoals;
    if (S.home >= target) {
      win();
      return;
    }
    var line = f.longShot && !S.said.personal ? ((S.said.personal = true), 'That was personal.') : GOAL_LINES[Math.min(S.home - 1, GOAL_LINES.length - 1)];
    comment(line, { force: true, ms: 2800 });
    setPhase('celebrate');
  }

  function turnover(text) {
    S.banner = { text: text, t: 0 };
    audio.whistle(0.3);
    fx.vibrate(40);
    setPhase('turnover');
    S.charging = false;
    var cap = CFG.match.opponentFinalScore;
    var lines;
    if (S.away < cap) {
      S.away++;
      renderScore();
      flash(dom.away);
      lines = text === 'HELD BALL'
        ? 'Three seconds! Even the referee has rules. Referee’s team scores.'
        : 'Intercepted. Referee’s team scores. The referee saw nothing wrong with that.';
      fx.announce('Turnover. Referee’s team scores. ' + S.home + ' to ' + S.away + '.');
    } else {
      lines = text === 'HELD BALL' ? 'Three seconds! Ball goes back… and they drop it. Lucky.' : 'Intercepted… and immediately fumbled. Your ball.';
    }
    comment(lines, { force: true, ms: 3000 });
  }

  function win() {
    setPhase('won');
    S.charging = false;
    audio.setAmbience(0, 0.25);
    renderClock();
    dom.clock.classList.remove('is-low');
    setHint();
    updateButtons();
    setTimeout(function () {
      if (opts.onWin) opts.onWin({ home: S.home, away: S.away });
    }, 1000 / fx.speed);
  }

  function timeUp() {
    S.time = 0;
    renderClock();
    setPhase('timeup');
    S.charging = false;
    S.flight = null;
    audio.finalWhistle();
    show(dom.ovTimeup);
    focusFirst(dom.ovTimeup);
  }

  /* ---------- update ---------- */
  function update(dt) {
    S.clock += dt;
    S.phaseT += dt;
    if (S.banner) {
      S.banner.t += dt;
      if (S.banner.t > 1.3) S.banner = null;
    }
    S.shake = Math.max(0, S.shake - dt);
    S.ripple = Math.max(0, S.ripple - dt * 1.1);

    var live = S.phase === 'play' || S.phase === 'celebrate' || S.phase === 'turnover' || S.phase === 'dead';
    if (!live) return;

    if (S.phase === 'play') {
      S.time -= dt;
      if (S.time <= 15 && S.time > 0 && S.home < CFG.match.targetGoals) comment('Fifteen seconds. No pressure. (Some pressure.)', { key: 'fifteen', force: true });
      if (S.time <= 0) return timeUp();
    }

    // input
    var kx = (S.keys.right ? 1 : 0) - (S.keys.left ? 1 : 0);
    var ky = (S.keys.down ? 1 : 0) - (S.keys.up ? 1 : 0);
    var ix = S.joy.x || kx;
    var iy = S.joy.y || ky;
    var mag = Math.hypot(ix, iy);
    if (mag > 1) {
      ix /= mag;
      iy /= mag;
      mag = 1;
    }
    S.input.x = ix;
    S.input.y = iy;

    // player
    var p = S.p;
    var holding = S.ball.owner === 'player';
    if (S.phase === 'play' && !holding) {
      var sp = CFG.player.speed;
      var k = Math.min(1, dt * 12);
      p.vx += (ix * sp - p.vx) * k;
      p.vy += (iy * sp - p.vy) * k;
    } else {
      p.vx = p.vy = 0;
    }
    p.x = clamp(p.x + p.vx * dt, -HALF_W + 0.4, HALF_W - 0.4);
    p.y = clamp(p.y + p.vy * dt, 0.65, THIRD + 0.5);

    if (S.phase === 'play' && holding) {
      if (mag > 0.6 && !p.footwork) {
        p.footwork = true;
        comment('Footwork! No running with the ball. Netball rules, not mine.', { key: 'footwork', force: true, ms: 3000 });
      }
      if (!S.charging) p.hold += dt;
      if (p.hold > CFG.possessionSeconds) {
        S.ball.owner = 'def';
        turnover('HELD BALL');
      }
    }
    if (S.charging) {
      S.chargeT += dt / CFG.shot.fillSeconds;
      var c = S.chargeT % 2;
      S.power = c < 1 ? c : 2 - c;
    }

    // history for the defender's delayed reaction
    S.history.push({ t: S.clock, x: p.x, y: p.y });
    while (S.history.length > 2 && S.history[0].t < S.clock - 1.2) S.history.shift();

    // teammate (C) drifts along the top of the third
    var m = S.m;
    if (S.ball.owner === 'mate' || (S.flight && S.flight.type === 'passback')) {
      var tx = m.base + Math.sin(S.clock * 0.6) * 1.4;
      m.x += clamp(tx - m.x, -2.6 * dt, 2.6 * dt);
    }

    // defender
    var d = S.d;
    var react = CFG.defender.reaction;
    var lag = p;
    for (var i = S.history.length - 1; i >= 0; i--) {
      if (S.history[i].t <= S.clock - react) {
        lag = S.history[i];
        break;
      }
    }
    var tgt;
    if (holding || (S.flight && S.flight.type === 'shot')) {
      var rx = RING.x - p.x;
      var ry = RING.y - p.y;
      var rl = Math.hypot(rx, ry) || 1;
      tgt = { x: p.x + (rx / rl) * 0.95, y: p.y + (ry / rl) * 0.95 };
      d.arms = true;
    } else if (S.ball.owner === 'def' || S.phase !== 'play') {
      tgt = { x: d.x, y: d.y };
      d.arms = false;
    } else {
      var mx = m.x - lag.x;
      var my = m.y - lag.y;
      var ml = Math.hypot(mx, my) || 1;
      var md = CFG.defender.markDistance;
      tgt = { x: lag.x + (mx / ml) * md, y: lag.y + (my / ml) * md };
      d.arms = false;
    }
    var dspeed = Math.max(1.8, CFG.defender.speed + eased('defenderSpeed'));
    var dx = tgt.x - d.x;
    var dy = tgt.y - d.y;
    var dl = Math.hypot(dx, dy);
    var desiredVx = dl > 0.02 ? (dx / dl) * Math.min(dspeed, dl * 6) : 0;
    var desiredVy = dl > 0.02 ? (dy / dl) * Math.min(dspeed, dl * 6) : 0;
    var dk = Math.min(1, dt * 8);
    d.vx += (desiredVx - d.vx) * dk;
    d.vy += (desiredVy - d.vy) * dk;
    d.x = clamp(d.x + d.vx * dt, -HALF_W + 0.4, HALF_W - 0.4);
    d.y = clamp(d.y + d.vy * dt, 0.65, THIRD + 0.5);
    // no overlapping
    var sep = dist(p, d);
    if (sep < 0.82 && sep > 0.0001) {
      var push = (0.82 - sep) / 2;
      var ux = (d.x - p.x) / sep;
      var uy = (d.y - p.y) / sep;
      d.x += ux * push;
      d.y += uy * push;
      if (!holding) {
        p.x -= ux * push;
        p.y -= uy * push;
      }
    }

    // is the passing lane open?
    if (S.ball.owner === 'mate') {
      var lane = laneGap(m, p, d);
      var wasOpen = S.open;
      S.open = lane > CFG.pass.openLane && sep > 0.7;
      if (S.open && !wasOpen && S.phase === 'play') {
        if (!S.firstOpenAt) S.firstOpenAt = S.clock;
        if (S.clock > 1.5 && Math.hypot(p.vx, p.vy) > 2) comment('Good movement.', { key: 'move' });
      }
    } else {
      S.open = false;
    }

    // ball
    var b = S.ball;
    var f = S.flight;
    if (f) {
      f.t += dt / f.dur;
      var to = f.target();
      var t = Math.min(1, f.t);
      b.x = f.from.x + (to.x - f.from.x) * t;
      b.y = f.from.y + (to.y - f.from.y) * t;
      b.z = f.from.z + (to.z - f.from.z) * t + 4 * f.arc * t * (1 - t);
      if (f.t >= 1) {
        S.flight = null;
        onLand(f);
      }
    } else if (b.owner === 'player') {
      b.x = p.x + 0.5;
      b.y = p.y;
      b.z = 0.9;
    } else if (b.owner === 'mate') {
      b.x = m.x + 0.3;
      b.y = m.y - 0.1;
      b.z = 1.3;
    } else if (b.owner === 'def') {
      b.x = d.x + 0.3;
      b.y = d.y - 0.1;
      b.z = 1.6;
    }

    // phase timers
    if (S.phase === 'celebrate' && S.phaseT > 1.6) resetPlay();
    else if (S.phase === 'turnover' && S.phaseT > 1.8) resetPlay();
    else if (S.phase === 'dead' && S.phaseT > 0.7) {
      // C collects the rebound; play on from where everyone stands
      b.owner = 'mate';
      S.p.hold = 0;
      setPhase('play');
    }

    // camera follows the player when the view is narrower than the court
    var maxCam = Math.max(0, HALF_W + 0.35 - view.halfView);
    var camTarget = clamp(p.x * 0.85, -maxCam, maxCam);
    view.camX += (camTarget - view.camX) * Math.min(1, dt * 4);
  }

  /* ---------- draw ---------- */
  function draw() {
    if (!ctx || !S) return;
    var s = view.s;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.fillStyle = COLORS.outside;
    ctx.fillRect(0, 0, view.w, view.h);

    ctx.save();
    if (S.shake > 0) {
      var a = S.shake * 16;
      ctx.translate(rand(-a, a), rand(-a, a));
    }

    // floor
    var x0 = sx(-HALF_W);
    var x1 = sx(HALF_W);
    var y0 = sy(0);
    var y1 = sy(THIRD + 1.2);
    var g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, COLORS.floor);
    g.addColorStop(1, COLORS.floor2);
    ctx.fillStyle = g;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // stadium light pool
    var lg = ctx.createRadialGradient(sx(0), sy(2), 0, sx(0), sy(2), 8 * s);
    lg.addColorStop(0, 'rgba(255, 244, 214, 0.13)');
    lg.addColorStop(1, 'rgba(255, 244, 214, 0)');
    ctx.fillStyle = lg;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // floor boards
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var bx = -HALF_W + 0.9; bx < HALF_W; bx += 0.9) {
      ctx.moveTo(sx(bx), y0);
      ctx.lineTo(sx(bx), y1);
    }
    ctx.stroke();

    // shooting circle fill
    var pIn = inCircle(S.p);
    ctx.beginPath();
    ctx.save();
    ctx.translate(sx(0), sy(0));
    ctx.scale(1, Y_K);
    ctx.arc(0, 0, CIRCLE_R * s, 0, Math.PI);
    ctx.restore();
    ctx.closePath();
    var glow = pIn && S.phase === 'play' ? (S.ball.owner === 'player' ? 0.16 + Math.sin(S.clock * 6) * 0.04 : 0.11) : 0.06;
    ctx.fillStyle = 'rgba(220, 190, 120, ' + glow + ')';
    ctx.fill();

    // court lines
    var lw = Math.max(1.5, 0.06 * s);
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(x0, y1);
    ctx.lineTo(x0, y0);
    ctx.lineTo(x1, y0);
    ctx.lineTo(x1, y1);
    ctx.moveTo(x0, sy(THIRD));
    ctx.lineTo(x1, sy(THIRD));
    ctx.stroke();
    ctx.beginPath();
    ctx.save();
    ctx.translate(sx(0), sy(0));
    ctx.scale(1, Y_K);
    ctx.arc(0, 0, CIRCLE_R * s, 0, Math.PI);
    ctx.restore();
    ctx.stroke();

    // passing lane
    if (S.phase === 'play' && S.ball.owner === 'mate' && !S.flight) {
      ctx.save();
      ctx.setLineDash([3, 6]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = S.open ? 'rgba(124, 201, 162, 0.7)' : 'rgba(227, 181, 95, 0.4)';
      ctx.beginPath();
      ctx.moveTo(sx(S.m.x), sy(S.m.y));
      ctx.lineTo(sx(S.p.x), sy(S.p.y));
      ctx.stroke();
      ctx.restore();
    }

    // post + ring (back)
    drawPost();

    // ball shadow (ground)
    drawShadow(S.ball.x, S.ball.y, BALL_R * 1.2, 0.35 * Math.max(0.15, 1 - S.ball.z / 6));

    // players, back to front
    var people = [
      { k: 'm', o: S.m },
      { k: 'd', o: S.d },
      { k: 'p', o: S.p },
    ].sort(function (a, b2) {
      return a.o.y - b2.o.y;
    });
    var ballNearRing = Math.abs(S.ball.y - RING.y) < 0.7 && Math.abs(S.ball.x - RING.x) < 0.7;
    var ballBehindNet = ballNearRing && S.ball.z < RING.z + 0.05 && S.ball.z > 0.4;
    if (ballBehindNet) drawBall();
    drawNet();
    for (var i = 0; i < people.length; i++) drawPerson(people[i].k, people[i].o);
    if (!ballBehindNet) drawBall();

    // shot meter
    if (S.phase === 'play' && S.ball.owner === 'player' && inCircle(S.p)) drawMeter();

    // banner
    if (S.banner) drawBanner();

    ctx.restore();
  }

  function drawShadow(x, y, r, alpha) {
    ctx.fillStyle = 'rgba(0, 0, 0, ' + alpha + ')';
    ctx.beginPath();
    ctx.ellipse(sx(x), sy(y) + 2, r * view.s * 1.15, r * view.s * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPost() {
    var s = view.s;
    var baseX = sx(0);
    var baseY = sy(0);
    var topY = sy(0, RING.z + 0.15);
    ctx.strokeStyle = '#cfd3da';
    ctx.lineWidth = Math.max(2.5, 0.09 * s);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(baseX, topY);
    ctx.lineTo(sx(RING.x), sy(RING.y - 0.12, RING.z + 0.05));
    ctx.stroke();
    // base pad
    ctx.fillStyle = '#c39a45';
    ctx.beginPath();
    ctx.ellipse(baseX, baseY, 0.35 * s, 0.15 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function ringGeom() {
    var s = view.s;
    var rx = Math.max(11, 0.36 * s);
    return { cx: sx(RING.x), cy: sy(RING.y, RING.z), rx: rx, ry: rx * 0.42 };
  }

  function drawNet() {
    var r = ringGeom();
    var depth = r.rx * 1.25;
    var sway = S.ripple;
    var n = 9;
    ctx.save();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(246, 239, 226, 0.75)';
    var bottomR = r.rx * 0.55;
    for (var i = 0; i <= n; i++) {
      var a = Math.PI * (i / n);
      var tx = r.cx + Math.cos(a) * r.rx;
      var ty = r.cy + Math.sin(a) * r.ry;
      var wob = Math.sin(S.clock * 26 + i) * sway * 5;
      var bx = r.cx + Math.cos(a) * bottomR + wob;
      var by = r.cy + depth + sway * 6 + Math.sin(a) * r.ry * 0.5;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo((tx + bx) / 2 + wob, (ty + by) / 2, bx, by);
      ctx.stroke();
    }
    // cross strands
    for (var j = 1; j <= 2; j++) {
      var k = j / 3;
      ctx.beginPath();
      ctx.ellipse(r.cx + Math.sin(S.clock * 20) * sway * 3, r.cy + depth * k + sway * 4 * k, r.rx - (r.rx - bottomR) * k, r.ry * (1 - k * 0.5), 0, 0, Math.PI);
      ctx.stroke();
    }
    // ring
    ctx.lineWidth = Math.max(2.5, r.rx * 0.18);
    ctx.strokeStyle = '#e8873a';
    ctx.beginPath();
    ctx.ellipse(r.cx, r.cy, r.rx, r.ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (S.phase === 'play' && S.ball.owner === 'player' && inCircle(S.p)) {
      ctx.strokeStyle = 'rgba(220, 190, 120, ' + (0.35 + Math.sin(S.clock * 6) * 0.2) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(r.cx, r.cy, r.rx + 6, r.ry + 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPerson(kind, o) {
    var s = view.s;
    var r = Math.max(11, P_R * s);
    var x = sx(o.x);
    var y = sy(o.y, 0.35);
    drawShadow(o.x, o.y, P_R, 0.3);

    // openness / possession rings for the player
    if (kind === 'p' && S.phase === 'play') {
      if (S.ball.owner === 'mate' && !S.flight) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = S.open ? COLORS.open : COLORS.covered;
        ctx.beginPath();
        ctx.arc(x, y, r + 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        if (S.open) label('OPEN', x, y + r + 16, COLORS.open, 9);
      } else if (S.ball.owner === 'player' && !S.charging) {
        var left = 1 - S.p.hold / CFG.possessionSeconds;
        ctx.lineWidth = 3;
        ctx.strokeStyle = left < 0.3 ? '#ec9a86' : 'rgba(246, 239, 226, 0.85)';
        ctx.beginPath();
        ctx.arc(x, y, r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, left));
        ctx.stroke();
      }
    }

    // defender's arms when guarding a shot
    if (kind === 'd' && o.arms) {
      ctx.strokeStyle = COLORS.them;
      ctx.lineWidth = Math.max(3, r * 0.32);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - r * 0.7, y - r * 0.2);
      ctx.lineTo(x - r * 1.3, y - r * 1.15);
      ctx.moveTo(x + r * 0.7, y - r * 0.2);
      ctx.lineTo(x + r * 1.3, y - r * 1.15);
      ctx.stroke();
      ctx.fillStyle = '#e9d9c6';
      ctx.beginPath();
      ctx.arc(x - r * 1.32, y - r * 1.2, r * 0.22, 0, Math.PI * 2);
      ctx.arc(x + r * 1.32, y - r * 1.2, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }

    var fill = kind === 'p' ? COLORS.me : kind === 'd' ? COLORS.them : COLORS.mate;
    var ring = kind === 'p' ? COLORS.meRing : kind === 'd' ? COLORS.themRing : '#a8d5bf';
    var text = kind === 'p' ? 'GS' : kind === 'd' ? 'GD' : 'C';
    var tcol = kind === 'p' ? COLORS.ink : '#f6efe2';
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = Math.max(2, r * 0.16);
    ctx.strokeStyle = ring;
    ctx.stroke();
    ctx.fillStyle = tcol;
    ctx.font = '700 ' + Math.round(r * 0.78) + 'px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 1);

    var nameSize = Math.max(9, Math.min(12, r * 0.62));
    var meterUp = S.phase === 'play' && S.ball.owner === 'player' && inCircle(S.p);
    if (kind === 'p' && !meterUp) label('CHOOTY BOLE', x, y - r - 10, '#f6efe2', nameSize);
    else if (kind === 'd') label('REF’S TEAM', x, y - r - (o.arms ? r * 1.2 : 0) - 10, 'rgba(241, 232, 214, 0.7)', nameSize - 1);
  }

  function label(t, x, y, col, size) {
    ctx.font = '700 ' + Math.round(size) + 'px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(7, 12, 23, 0.55)';
    ctx.strokeText(t, x, y);
    ctx.fillStyle = col;
    ctx.fillText(t, x, y);
  }

  function drawBall() {
    var b = S.ball;
    var s = view.s;
    var r = Math.max(5, BALL_R * s * (1 + b.z * 0.06));
    var x = sx(b.x);
    var y = sy(b.y, b.z);
    var g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, '#fffaf0');
    g.addColorStop(1, '#e1c27a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(19, 33, 58, 0.55)';
    ctx.lineWidth = Math.max(1, r * 0.14);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - r, y);
    ctx.quadraticCurveTo(x, y - r * 0.5, x + r, y);
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x + r * 0.5, y, x, y + r);
    ctx.stroke();
  }

  function drawMeter() {
    var z = zoneFor(S.p);
    var s = view.s;
    var h = Math.max(70, 2.2 * s);
    var w = 12;
    var px = sx(S.p.x);
    var side = px + 40 + w > view.w ? -1 : 1;
    var x = px + side * (Math.max(11, P_R * s) + 18) - (side < 0 ? w : 0);
    var y = clamp(sy(S.p.y, 0.35) - h / 2, 6, view.h - h - 6);
    ctx.save();
    ctx.globalAlpha = S.charging ? 1 : 0.65;
    ctx.fillStyle = 'rgba(5, 10, 20, 0.85)';
    roundRect(x - 3, y - 3, w + 6, h + 6, 6);
    ctx.fill();
    // zone
    var zTop = y + h * (1 - Math.min(1, z.center + z.half));
    var zBot = y + h * (1 - Math.max(0, z.center - z.half));
    ctx.fillStyle = '#7cc9a2';
    ctx.fillRect(x, zTop, w, zBot - zTop);
    // near-miss bands
    ctx.fillStyle = 'rgba(227, 181, 95, 0.55)';
    var nm = CFG.shot.nearMiss;
    ctx.fillRect(x, y + h * (1 - Math.min(1, z.center + z.half + nm)), w, h * nm);
    ctx.fillRect(x, zBot, w, h * nm);
    // power
    if (S.charging) {
      var py = y + h * (1 - S.power);
      ctx.fillStyle = '#f6efe2';
      ctx.fillRect(x - 5, py - 2, w + 10, 4);
    }
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBanner() {
    var b = S.banner;
    var t = b.t;
    var a = t < 0.15 ? t / 0.15 : t > 1 ? Math.max(0, 1 - (t - 1) / 0.3) : 1;
    var scale = 1 + (fx.reduced() ? 0 : Math.max(0, 0.25 - t) * 1.2);
    var size = Math.min(view.w / 6.5, 64) * scale;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = '700 ' + Math.round(size) + 'px Fraunces, Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var y = view.h * 0.46;
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(7, 12, 23, 0.6)';
    ctx.strokeText(b.text, view.w / 2, y);
    ctx.fillStyle = b.text === 'GOAL' ? '#f3d98b' : '#f6efe2';
    ctx.fillText(b.text, view.w / 2, y);
    ctx.restore();
  }

  /* ---------- loop ---------- */
  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - lastT) / 1000 || 0);
    lastT = now;
    update(dt);
    renderClock();
    setHint();
    updateButtons();
    draw();
  }

  /* ---------- overlays ---------- */
  function show(o) {
    o.hidden = false;
  }
  function hide(o) {
    o.hidden = true;
  }
  function focusFirst(o) {
    var b = o.querySelector('button');
    if (b) fx.focusSoft(b);
  }

  function pause() {
    if (S.phase !== 'play' && S.phase !== 'celebrate' && S.phase !== 'turnover' && S.phase !== 'dead') return;
    S.prevPhase = S.phase;
    S.phase = 'paused';
    S.charging = false;
    resetJoy();
    S.keys = {};
    audio.setAmbience(0.08, 0.4);
    show(dom.ovPause);
    focusFirst(dom.ovPause);
  }
  function resume() {
    if (S.phase !== 'paused') return;
    hide(dom.ovPause);
    S.phase = S.prevPhase || 'play';
    lastT = performance.now();
    audio.setAmbience(0.28, 0.6);
  }

  /* ---------- input ---------- */
  var KEYMAP = {
    ArrowUp: 'up',
    KeyW: 'up',
    ArrowDown: 'down',
    KeyS: 'down',
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
  };
  function onKeyDown(e) {
    if (!active) return;
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (S.phase === 'paused') resume();
      else pause();
      return;
    }
    if (S.phase !== 'play' && S.phase !== 'celebrate' && S.phase !== 'turnover' && S.phase !== 'dead') return;
    var dir = KEYMAP[e.code];
    if (dir) {
      S.keys[dir] = true;
      e.preventDefault();
      return;
    }
    if (e.code === 'Space' || e.code === 'KeyJ') {
      e.preventDefault();
      if (!e.repeat) shootDown();
      return;
    }
    if (e.code === 'KeyE' || e.code === 'KeyK') {
      e.preventDefault();
      if (!e.repeat) pass();
    }
  }
  function onKeyUp(e) {
    if (!active) return;
    var dir = KEYMAP[e.code];
    if (dir) S.keys[dir] = false;
    if (e.code === 'Space' || e.code === 'KeyJ') {
      if (S.phase === 'play') e.preventDefault();
      shootUp();
    }
  }

  // floating virtual joystick
  var joy = { id: null, ox: 0, oy: 0, cx: 0, cy: 0 };
  var JOY_R = 50;
  function resetJoy() {
    joy.id = null;
    S.joy.x = S.joy.y = 0;
    dom.joystick.classList.remove('is-active');
    dom.joystick.style.setProperty('--kx', '0px');
    dom.joystick.style.setProperty('--ky', '0px');
    dom.joystick.style.setProperty('--bx', '0px');
    dom.joystick.style.setProperty('--by', '0px');
  }
  function bindJoystick() {
    var j = dom.joystick;
    j.addEventListener('pointerdown', function (e) {
      if (joy.id !== null) return;
      e.preventDefault();
      joy.id = e.pointerId;
      try {
        j.setPointerCapture(e.pointerId);
      } catch (err) {}
      var r = j.getBoundingClientRect();
      joy.cx = r.left + r.width / 2;
      joy.cy = r.top + r.height / 2;
      // the base jumps under the thumb (kept inside the pad area)
      var bx = clamp(e.clientX - joy.cx, -r.width / 2 + 40, r.width / 2 - 40);
      var by = clamp(e.clientY - joy.cy, -r.height / 2 + 40, r.height / 2 - 40);
      joy.ox = joy.cx + bx;
      joy.oy = joy.cy + by;
      j.style.setProperty('--bx', bx + 'px');
      j.style.setProperty('--by', by + 'px');
      j.classList.add('is-active');
      moveJoy(e);
    });
    j.addEventListener('pointermove', function (e) {
      if (e.pointerId !== joy.id) return;
      moveJoy(e);
    });
    function endJoy(e) {
      if (e.pointerId !== joy.id) return;
      resetJoy();
    }
    j.addEventListener('pointerup', endJoy);
    j.addEventListener('pointercancel', endJoy);
    j.addEventListener('lostpointercapture', endJoy);
  }
  function moveJoy(e) {
    var dx = e.clientX - joy.ox;
    var dy = e.clientY - joy.oy;
    var l = Math.hypot(dx, dy);
    if (l > JOY_R) {
      dx = (dx / l) * JOY_R;
      dy = (dy / l) * JOY_R;
      l = JOY_R;
    }
    var bx = parseFloat(dom.joystick.style.getPropertyValue('--bx')) || 0;
    var by = parseFloat(dom.joystick.style.getPropertyValue('--by')) || 0;
    dom.joystick.style.setProperty('--kx', bx + dx + 'px');
    dom.joystick.style.setProperty('--ky', by + dy + 'px');
    var n = l / JOY_R;
    if (n < 0.14) {
      S.joy.x = S.joy.y = 0;
    } else {
      // gentle response curve so small nudges are precise
      var k = Math.min(1, (n - 0.14) / 0.8);
      S.joy.x = (dx / l) * k;
      S.joy.y = (dy / l) * k;
    }
  }

  function bindButtons() {
    dom.pass.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      dom.pass.classList.add('is-pressed');
      pass();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) {
      dom.pass.addEventListener(t, function () {
        dom.pass.classList.remove('is-pressed');
      });
    });
    dom.pass.addEventListener('click', function (e) {
      if (e.detail === 0) pass(); // keyboard activation
    });

    var shootPointer = null;
    dom.shoot.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      shootPointer = e.pointerId;
      try {
        dom.shoot.setPointerCapture(e.pointerId);
      } catch (err) {}
      dom.shoot.classList.add('is-pressed');
      shootDown();
    });
    function release(e) {
      if (e.pointerId !== shootPointer) return;
      shootPointer = null;
      dom.shoot.classList.remove('is-pressed');
      shootUp();
    }
    dom.shoot.addEventListener('pointerup', release);
    dom.shoot.addEventListener('pointercancel', release);
    dom.shoot.addEventListener('click', function (e) {
      if (e.detail !== 0) return; // keyboard: first press starts, second releases
      if (S.charging) shootUp();
      else shootDown();
    });
    [dom.shoot, dom.pass, dom.joystick, dom.canvas].forEach(function (n) {
      n.addEventListener('contextmenu', function (e) {
        e.preventDefault();
      });
    });

    // mouse on the court: click to call for the ball, hold to shoot
    var canvasPointer = null;
    dom.canvas.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;
      if (S.ball.owner === 'player' && inCircle(S.p)) {
        canvasPointer = e.pointerId;
        try {
          dom.canvas.setPointerCapture(e.pointerId);
        } catch (err) {}
        shootDown();
      } else {
        pass();
      }
    });
    dom.canvas.addEventListener('pointerup', function (e) {
      if (e.pointerId !== canvasPointer) return;
      canvasPointer = null;
      shootUp();
    });

    dom.pauseBtn.addEventListener('click', pause);
    dom.resumeBtn.addEventListener('click', resume);
    dom.restartBtn.addEventListener('click', function () {
      hide(dom.ovPause);
      prepare();
    });
    dom.startBtn.addEventListener('click', start);
    dom.extraBtn.addEventListener('click', extraTime);
    [dom.mercy1, dom.mercy2].forEach(function (b) {
      b.addEventListener('click', function () {
        hide(dom.ovPause);
        hide(dom.ovTimeup);
        mercy();
      });
    });
  }

  /* ---------- public flow ---------- */
  function prepare() {
    S = freshState();
    renderScore();
    lastClockText = '';
    renderClock();
    dom.period.textContent = 'Final match';
    resetPlay();
    setPhase('ready');
    show(dom.ovReady);
    hide(dom.ovPause);
    hide(dom.ovTimeup);
    dom.comment.classList.remove('is-shown');
    dom.readyTarget.textContent = CFG.match.targetGoals;
    if (!raf) {
      lastT = performance.now();
      raf = requestAnimationFrame(frame);
    }
    resize();
  }

  function start() {
    hide(dom.ovReady);
    audio.whistle(0.45);
    audio.setAmbience(0.28, 1.5);
    lastT = performance.now();
    setPhase('play');
    fx.focusSoft(dom.pass);
    setTimeout(function () {
      if (S && S.phase === 'play') comment('Referee’s watching. Show me something.', { key: 'start' });
    }, 900);
  }

  function extraTime() {
    hide(dom.ovTimeup);
    S.extra++;
    S.time = CFG.match.extraTimeSeconds;
    dom.period.textContent = S.extra > 1 ? 'Extra time ×' + S.extra : 'Extra time';
    resetPlay();
    audio.whistle(0.4);
    lastT = performance.now();
    comment('Extra time. The ring has been spoken to.', { force: true });
  }

  function mercy() {
    setPhase('won');
    S.flight = null;
    audio.setAmbience(0, 0.3);
    if (opts.onWin) opts.onWin({ home: CFG.match.targetGoals, away: S.away, mercy: true });
  }

  function stop() {
    active = false;
    cancelAnimationFrame(raf);
    raf = 0;
    if (S) S.keys = {};
    resetJoy();
  }

  function init(o) {
    opts = o || {};
    dom.wrap = document.getElementById('court-wrap');
    dom.canvas = document.getElementById('court');
    dom.comment = document.getElementById('commentary');
    dom.hint = document.getElementById('game-hint');
    dom.home = document.getElementById('sb-home');
    dom.away = document.getElementById('sb-away');
    dom.clock = document.getElementById('sb-clock');
    dom.period = document.getElementById('sb-period');
    dom.pass = document.getElementById('btn-pass');
    dom.shoot = document.getElementById('btn-shoot');
    dom.joystick = document.getElementById('joystick');
    dom.pauseBtn = document.getElementById('pause-btn');
    dom.ovReady = document.getElementById('ov-ready');
    dom.ovPause = document.getElementById('ov-pause');
    dom.ovTimeup = document.getElementById('ov-timeup');
    dom.startBtn = document.getElementById('start-match');
    dom.resumeBtn = document.getElementById('resume-match');
    dom.restartBtn = document.getElementById('restart-match');
    dom.extraBtn = document.getElementById('extra-time');
    dom.mercy1 = document.getElementById('mercy-btn');
    dom.mercy2 = document.getElementById('mercy-btn-2');
    dom.readyTarget = document.getElementById('ready-target');
    ctx = dom.canvas.getContext('2d');
    S = freshState();

    bindJoystick();
    bindButtons();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', function () {
      if (!active) return;
      S.keys = {};
      shootUp();
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && active) pause();
    });
    if (window.ResizeObserver) new ResizeObserver(resize).observe(dom.wrap);
    else window.addEventListener('resize', resize);
  }

  function enter() {
    active = true;
    prepare();
  }

  RFC.game = {
    init: init,
    enter: enter,
    leave: stop,
    pause: pause,
    // exposed for automated tests
    _state: function () {
      return S;
    },
    _debug: {
      pass: pass,
      shootDown: shootDown,
      shootUp: shootUp,
      zoneFor: function () {
        return zoneFor(S.p);
      },
      shoot: shoot,
      start: start,
    },
  };
})();
