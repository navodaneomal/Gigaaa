/*
 * Animation engine: one ticker, easing, tweens, waits, SVG helpers, particles.
 *
 * All time is "film time": it runs on requestAnimationFrame (so a hidden tab
 * pauses the film) and is scaled by PIGGY_TIMING.speed and the ?speed= test
 * parameter, so every tween, wait and walk cycle speeds up together.
 */
(function () {
  'use strict';
  var P = (window.PIGGY = window.PIGGY || {});
  var T = window.PIGGY_TIMING || {};
  var params = new URLSearchParams(location.search);
  var testSpeed = Math.max(0.1, parseFloat(params.get('speed')) || 1);
  var SPEED = (T.speed || 1) * testSpeed;
  var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var SVGNS = 'http://www.w3.org/2000/svg';

  function reduced() {
    return !!(motionQuery && motionQuery.matches) || params.has('reduced');
  }

  /* ---------- easing ---------- */
  var E = {
    linear: function (t) {
      return t;
    },
    inSine: function (t) {
      return 1 - Math.cos((t * Math.PI) / 2);
    },
    outSine: function (t) {
      return Math.sin((t * Math.PI) / 2);
    },
    inOutSine: function (t) {
      return -(Math.cos(Math.PI * t) - 1) / 2;
    },
    inQuad: function (t) {
      return t * t;
    },
    outQuad: function (t) {
      return 1 - (1 - t) * (1 - t);
    },
    inOutQuad: function (t) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    },
    inCubic: function (t) {
      return t * t * t;
    },
    outCubic: function (t) {
      return 1 - Math.pow(1 - t, 3);
    },
    inOutCubic: function (t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },
    outQuart: function (t) {
      return 1 - Math.pow(1 - t, 4);
    },
    outExpo: function (t) {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    },
    inBack: function (t) {
      var c1 = 1.70158;
      return (c1 + 1) * t * t * t - c1 * t * t;
    },
    outBack: function (t) {
      var c1 = 1.70158;
      var c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    outBackBig: function (t) {
      var c1 = 3;
      var c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    outElastic: function (t) {
      var c4 = (2 * Math.PI) / 3;
      return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },
    outBounce: function (t) {
      var n1 = 7.5625;
      var d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
      if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },
  };
  function easeFn(e) {
    if (typeof e === 'function') return e;
    return E[e] || E.inOutCubic;
  }

  /* ---------- ticker ---------- */
  var subs = [];
  var clock = 0; // film seconds
  var last = 0;
  var paused = false;
  var timeScale = 1; // slow motion: 0.25 = quarter speed

  function frame(ts) {
    requestAnimationFrame(frame);
    var raw = last ? Math.min(0.05, (ts - last) / 1000) : 0;
    last = ts;
    if (paused) return;
    var dt = raw * SPEED * timeScale;
    clock += dt;
    // iterate over a copy: callbacks may unsubscribe themselves
    var list = subs.slice();
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (s.dead) continue;
      try {
        if (s.fn(dt, clock) === false) s.dead = true;
      } catch (err) {
        s.dead = true;
        if (window.console) console.error(err);
      }
    }
    if (list.some(function (s) {
      return s.dead;
    })) {
      subs = subs.filter(function (s) {
        return !s.dead;
      });
    }
  }
  requestAnimationFrame(frame);

  // fn(dt, clock) runs every frame; return false to stop. Returns a stop function.
  function onFrame(fn) {
    var s = { fn: fn, dead: false };
    subs.push(s);
    return function () {
      s.dead = true;
    };
  }

  /* ---------- cancellation ---------- */
  // Every wait/tween belongs to the current "run". When a scene is skipped or
  // the film restarts, cancelAll() stops them so old scenes can't keep acting.
  var generation = 0;
  function cancelAll() {
    generation++;
  }
  function Cancelled() {
    this.name = 'Cancelled';
  }

  // Fire-and-forget calls must not log "uncaught (in promise)" when cancelled;
  // callers that await still receive the rejection.
  function quiet(p) {
    p.catch(function () {});
    return p;
  }

  function wait(ms) {
    var gen = generation;
    return quiet(new Promise(function (res, rej) {
      var t = 0;
      onFrame(function (dt) {
        if (gen !== generation) {
          rej(new Cancelled());
          return false;
        }
        t += dt * 1000;
        if (t >= ms) {
          res();
          return false;
        }
      });
    }));
  }

  /* ---------- tweens ---------- */
  var owners = new WeakMap(); // target -> {prop: tweenId}
  var tweenSeq = 0;

  /*
   * tween(target, {prop: value}, ms, ease, {delay}) → Promise
   * A newer tween on the same prop takes it over; the older one stops touching it.
   */
  function tween(target, to, ms, ease, opts) {
    opts = opts || {};
    var id = ++tweenSeq;
    var gen = generation;
    var fn = easeFn(ease);
    var own = owners.get(target);
    if (!own) {
      own = {};
      owners.set(target, own);
    }
    var keys = Object.keys(to);
    if (!opts.delay) keys.forEach(function (k) {
      own[k] = id;
    });
    var from = null;
    var t = -(opts.delay || 0);
    return quiet(new Promise(function (res, rej) {
      onFrame(function (dt) {
        if (gen !== generation) {
          rej(new Cancelled());
          return false;
        }
        t += dt * 1000;
        if (t < 0) return;
        if (!from) {
          from = {};
          keys.forEach(function (k) {
            own[k] = id;
            from[k] = target[k] == null ? 0 : target[k];
          });
        }
        var p = ms <= 0 ? 1 : Math.min(1, t / ms);
        var e = fn(p);
        var alive = false;
        for (var i = 0; i < keys.length; i++) {
          var k = keys[i];
          if (own[k] !== id) continue;
          alive = true;
          target[k] = from[k] + (to[k] - from[k]) * e;
        }
        if (p >= 1 || !alive) {
          res();
          return false;
        }
      });
    }));
  }

  function set(target, props) {
    var own = owners.get(target);
    Object.keys(props).forEach(function (k) {
      if (own) delete own[k];
      target[k] = props[k];
    });
  }

  /* ---------- small utils ---------- */
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }
  function rand(a, b) {
    return a + Math.random() * (b - a);
  }
  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function svg(tag, attrs, parent) {
    var el = document.createElementNS(SVGNS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (attrs[k] != null) el.setAttribute(k, attrs[k]);
      }
    }
    if (parent) parent.appendChild(el);
    return el;
  }
  // Parse an SVG markup string into a <g>.
  function svgFrag(markup, parent, attrs) {
    var g = svg('g', attrs, parent);
    // innerHTML on SVG elements parses in the SVG namespace in all modern browsers
    g.innerHTML = markup;
    return g;
  }

  /* ---------- particles (SVG, world space) ---------- */
  function particle(layer, opts) {
    // opts: {shape: el builder, x, y, vx, vy, g, life, spin, scale0, scale1, fade}
    var el = opts.el;
    layer.appendChild(el);
    var st = { x: opts.x, y: opts.y, vx: opts.vx || 0, vy: opts.vy || 0, r: opts.rot || 0, t: 0 };
    var life = opts.life || 900;
    onFrame(function (dt) {
      st.t += dt * 1000;
      var p = st.t / life;
      if (p >= 1) {
        el.remove();
        return false;
      }
      st.vy += (opts.g || 0) * dt;
      st.x += st.vx * dt;
      st.y += st.vy * dt;
      st.r += (opts.spin || 0) * dt;
      var s = lerp(opts.scale0 == null ? 1 : opts.scale0, opts.scale1 == null ? 1 : opts.scale1, p);
      el.setAttribute('transform', 'translate(' + st.x.toFixed(2) + ' ' + st.y.toFixed(2) + ') rotate(' + st.r.toFixed(1) + ') scale(' + s.toFixed(3) + ')');
      el.setAttribute('opacity', (opts.fade === false ? 1 : 1 - Math.pow(p, 2)).toFixed(3));
    });
  }

  var fx = {
    // soft dust puffs at a point (landing, running, poof)
    puff: function (layer, x, y, opts) {
      opts = opts || {};
      var n = reduced() ? 2 : opts.count || 6;
      for (var i = 0; i < n; i++) {
        var a = (opts.spread || Math.PI) * (i / Math.max(1, n - 1)) + (opts.angle == null ? Math.PI : opts.angle);
        var sp = rand(20, 55) * (opts.power || 1);
        particle(layer, {
          el: svg('circle', { r: rand(4, 8) * (opts.size || 1), fill: opts.color || '#f3ead9' }),
          x: x + rand(-4, 4),
          y: y + rand(-2, 2),
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp * 0.5 - 8,
          life: rand(500, 800),
          scale0: 0.6,
          scale1: 1.6,
        });
      }
    },
    // little stars/sparkles
    sparkle: function (layer, x, y, opts) {
      opts = opts || {};
      var n = reduced() ? 2 : opts.count || 8;
      for (var i = 0; i < n; i++) {
        var a = rand(0, Math.PI * 2);
        var sp = rand(30, 90) * (opts.power || 1);
        var star = svg('path', { d: 'M0-6L1.6-1.6 6 0 1.6 1.6 0 6-1.6 1.6-6 0-1.6-1.6Z', fill: opts.color || '#ffd75e' });
        particle(layer, { el: star, x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(500, 900), spin: rand(-200, 200), scale0: 1.2, scale1: 0.2 });
      }
    },
    // floating "z"
    zzz: function (layer, x, y) {
      var t = svg('text', { 'font-family': 'Nunito, sans-serif', 'font-weight': 900, 'font-size': 14, fill: '#cfd8ff', 'text-anchor': 'middle' });
      t.textContent = 'z';
      particle(layer, { el: t, x: x, y: y, vx: rand(8, 16), vy: -22, life: 2200, scale0: 0.6, scale1: 1.6, spin: rand(-10, 10) });
    },
    // sweat drop flying off
    sweat: function (layer, x, y, dir) {
      var d = svg('path', { d: 'M0-5C2-2 3 0 3 2a3 3 0 0 1-6 0c0-2 1-4 3-7Z', fill: '#9fd8ff' });
      particle(layer, { el: d, x: x, y: y, vx: (dir || 1) * rand(20, 40), vy: -rand(30, 50), g: 160, life: 700, scale0: 1, scale1: 0.8 });
    },
    // speed lines behind something moving
    speedLine: function (layer, x, y, dir) {
      var l = svg('rect', { x: -14, y: -1, width: 28, height: 2, rx: 1, fill: '#ffffff' });
      particle(layer, { el: l, x: x, y: y, vx: -(dir || 1) * 120, vy: 0, life: 300, scale0: 1, scale1: 0.4 });
    },
    // a "pop"/"bonk" impact ring
    impact: function (layer, x, y, opts) {
      opts = opts || {};
      var c = svg('circle', { r: 8, fill: 'none', stroke: opts.color || '#ffffff', 'stroke-width': 3 });
      particle(layer, { el: c, x: x, y: y, life: 380, scale0: 0.4, scale1: opts.size || 3 });
    },
  };

  /* ---------- confetti (canvas, screen space) ---------- */
  var cv = null;
  var c2d = null;
  var bits = [];
  var confettiRunning = false;
  var CONFETTI_COLORS = ['#ffd75e', '#ff8fab', '#7ae0c3', '#7fb7ff', '#ffffff', '#ffb35c'];

  function sizeCanvas() {
    if (!cv) return;
    var r = cv.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.max(1, Math.round(r.width * dpr));
    cv.height = Math.max(1, Math.round(r.height * dpr));
    c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // x, y in px relative to the stage. opts: {count, power, spread, direction, gravity}
  function confetti(x, y, opts) {
    if (!cv) {
      cv = document.getElementById('confetti');
      if (!cv) return;
      c2d = cv.getContext('2d');
      sizeCanvas();
      window.addEventListener('resize', sizeCanvas);
    }
    opts = opts || {};
    var count = reduced() ? Math.min(20, opts.count || 80) : opts.count || 80;
    var dir = opts.direction == null ? -Math.PI / 2 : opts.direction;
    for (var i = 0; i < count; i++) {
      var a = dir + (Math.random() - 0.5) * (opts.spread || 1.6);
      var v = (opts.power || 520) * (0.45 + Math.random() * 0.7);
      bits.push({
        x: x,
        y: y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        r: Math.random() * 6,
        vr: (Math.random() - 0.5) * 10,
        w: 5 + Math.random() * 6,
        h: 7 + Math.random() * 8,
        c: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
        life: 1,
        g: opts.gravity == null ? 620 : opts.gravity,
      });
    }
    if (!confettiRunning) {
      confettiRunning = true;
      onFrame(stepConfetti);
    }
  }
  function stepConfetti(dt) {
    var w = cv.width;
    var h = cv.height;
    c2d.clearRect(0, 0, w, h);
    for (var i = bits.length - 1; i >= 0; i--) {
      var b = bits[i];
      b.vx *= 1 - 1.2 * dt;
      b.vy += b.g * dt;
      b.vy *= 1 - 0.8 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.r += b.vr * dt;
      b.life -= dt * 0.35;
      if (b.life <= 0 || b.y > h + 40) {
        bits.splice(i, 1);
        continue;
      }
      c2d.save();
      c2d.globalAlpha = Math.min(1, b.life * 2);
      c2d.translate(b.x, b.y);
      c2d.rotate(b.r);
      c2d.scale(1, Math.cos(b.r * 1.7));
      c2d.fillStyle = b.c;
      c2d.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      c2d.restore();
    }
    if (!bits.length) {
      confettiRunning = false;
      c2d.clearRect(0, 0, w, h);
      return false;
    }
  }

  P.anim = {
    E: E,
    SPEED: SPEED,
    reduced: reduced,
    onFrame: onFrame,
    wait: wait,
    tween: tween,
    set: set,
    cancelAll: cancelAll,
    Cancelled: Cancelled,
    quiet: quiet,
    generation: function () {
      return generation;
    },
    isCancel: function (e) {
      return e instanceof Cancelled;
    },
    pause: function (v) {
      paused = !!v;
    },
    setTimeScale: function (s) {
      timeScale = s;
    },
    timeScale: function () {
      return timeScale;
    },
    clock: function () {
      return clock;
    },
    lerp: lerp,
    clamp: clamp,
    rand: rand,
    pick: pick,
    svg: svg,
    svgFrag: svgFrag,
    fx: fx,
    confetti: confetti,
    resizeConfetti: sizeCanvas,
  };
})();
