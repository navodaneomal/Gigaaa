/*
 * Shared helpers: timing, scripted sequences, typewriter text,
 * confetti, toasts and screen-reader announcements.
 */
(function () {
  'use strict';
  var RFC = (window.RFC = window.RFC || {});

  var params = new URLSearchParams(location.search);
  // ?speed=10 makes every scripted pause 10× shorter (handy for testing).
  var speed = Math.max(0.1, parseFloat(params.get('speed')) || 1);
  var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  function reduced() {
    return !!(motionQuery && motionQuery.matches);
  }

  function wait(ms) {
    return new Promise(function (res) {
      setTimeout(res, ms / speed);
    });
  }

  /*
   * A cancellable, skippable script. Tapping the root (or pressing a key)
   * fast-forwards the remaining pauses so impatient players aren't stuck.
   */
  function sequence(root) {
    var fast = false;
    var cancelled = false;
    function skip(e) {
      if (e && e.type === 'keydown' && e.key !== ' ' && e.key !== 'Enter') return;
      if (e && e.target && e.target.closest && e.target.closest('button, a, input')) return;
      fast = true;
    }
    if (root) {
      root.addEventListener('pointerdown', skip);
      root.addEventListener('keydown', skip);
    }
    var api = {
      wait: function (ms) {
        if (cancelled) return new Promise(function () {});
        var d = fast ? Math.min(ms, 60) : reduced() ? ms * 0.7 : ms;
        return wait(d).then(function () {
          if (cancelled) return new Promise(function () {});
        });
      },
      type: function (el, text, cps) {
        if (cancelled) return new Promise(function () {});
        return typewriter(el, text, cps, function () {
          return fast || cancelled;
        });
      },
      isFast: function () {
        return fast;
      },
      cancel: function () {
        cancelled = true;
        api.done();
      },
      done: function () {
        if (root) {
          root.removeEventListener('pointerdown', skip);
          root.removeEventListener('keydown', skip);
        }
      },
    };
    return api;
  }

  function typewriter(el, text, cps, shouldSkip) {
    cps = cps || 45;
    if (reduced() || speed > 4) {
      el.textContent = text;
      return Promise.resolve();
    }
    el.textContent = '';
    el.classList.add('is-typing');
    return new Promise(function (res) {
      var i = 0;
      var last = performance.now();
      var acc = 0;
      function step(now) {
        acc += ((now - last) / 1000) * cps;
        last = now;
        if (shouldSkip && shouldSkip()) i = text.length;
        else {
          var n = Math.floor(acc);
          if (n > 0) {
            i = Math.min(text.length, i + n);
            acc -= n;
          }
        }
        el.textContent = text.slice(0, i);
        if (i >= text.length) {
          el.classList.remove('is-typing');
          res();
        } else requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  /* ---------- Confetti / sparks ---------- */
  var canvas = null;
  var c2d = null;
  var parts = [];
  var running = false;
  var COLORS = ['#dcbe78', '#c39a45', '#f6efe2', '#7cc9a2', '#d39c94', '#f3d98b'];

  function ensureCanvas() {
    if (canvas) return;
    canvas = document.getElementById('fx-canvas');
    if (!canvas) return;
    c2d = canvas.getContext('2d');
    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);
  }
  function sizeCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // x/y in viewport pixels. opts: { count, spread, power, gravity }
  function confetti(x, y, opts) {
    if (reduced()) return;
    ensureCanvas();
    if (!canvas) return;
    opts = opts || {};
    var count = Math.min(opts.count || 70, 160);
    var power = opts.power || 9;
    var spread = opts.spread || Math.PI * 2;
    var dir = opts.direction == null ? -Math.PI / 2 : opts.direction;
    for (var i = 0; i < count; i++) {
      var a = dir + (Math.random() - 0.5) * spread;
      var v = power * (0.45 + Math.random() * 0.75);
      parts.push({
        x: x,
        y: y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        g: opts.gravity == null ? 0.22 : opts.gravity,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        w: 4 + Math.random() * 5,
        h: 6 + Math.random() * 7,
        c: COLORS[(Math.random() * COLORS.length) | 0],
        life: 1,
        decay: 0.006 + Math.random() * 0.008,
      });
    }
    if (!running) {
      running = true;
      requestAnimationFrame(tick);
    }
  }

  function tick() {
    c2d.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.vx *= 0.985;
      p.vy = p.vy * 0.985 + p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= p.decay;
      if (p.life <= 0 || p.y > window.innerHeight + 30) {
        parts.splice(i, 1);
        continue;
      }
      c2d.save();
      c2d.globalAlpha = Math.min(1, p.life * 1.5);
      c2d.translate(p.x, p.y);
      c2d.rotate(p.rot);
      c2d.scale(1, Math.cos(p.rot * 2));
      c2d.fillStyle = p.c;
      c2d.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      c2d.restore();
    }
    if (parts.length) requestAnimationFrame(tick);
    else {
      running = false;
      c2d.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  function confettiFrom(el, opts) {
    if (!el) return;
    var r = el.getBoundingClientRect();
    confetti(r.left + r.width / 2, r.top + r.height / 2, opts);
  }

  /* ---------- Toast & announcements ---------- */
  var toastTimer = null;
  function toast(msg, ms) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove('is-shown');
    }, ms || 3000);
  }

  function announce(msg) {
    var el = document.getElementById('announcer');
    if (!el) return;
    el.textContent = '';
    setTimeout(function () {
      el.textContent = msg;
    }, 30);
  }

  function vibrate(ms) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch (e) {}
  }

  // Animate an element from its old box to its new one (FLIP).
  function flip(el, first) {
    if (reduced() || !el.animate) return;
    var last = el.getBoundingClientRect();
    var dx = first.left - last.left;
    var dy = first.top - last.top;
    if (!dx && !dy) return;
    el.animate(
      [{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }],
      { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)' }
    );
  }

  // Move focus to a control only when the player is using a keyboard, so
  // touch users don't get focus rings on buttons they never tabbed to.
  var lastInput = 'pointer';
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ' || e.key.indexOf('Arrow') === 0) lastInput = 'key';
  }, true);
  window.addEventListener('pointerdown', function () {
    lastInput = 'pointer';
  }, true);
  function focusSoft(el) {
    if (el && lastInput === 'key') el.focus({ preventScroll: true });
  }

  function svgIcon(id, cls) {
    return '<svg class="' + (cls || 'icon') + '" aria-hidden="true"><use href="#' + id + '"/></svg>';
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  RFC.fx = {
    params: params,
    speed: speed,
    reduced: reduced,
    wait: wait,
    sequence: sequence,
    typewriter: typewriter,
    confetti: confetti,
    confettiFrom: confettiFrom,
    toast: toast,
    announce: announce,
    vibrate: vibrate,
    flip: flip,
    focusSoft: focusSoft,
    svgIcon: svgIcon,
    escapeHtml: escapeHtml,
  };
})();
